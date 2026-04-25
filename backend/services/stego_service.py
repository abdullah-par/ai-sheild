"""
Steganography detection service.
Uses statistical heuristics on pixel data (LSB chi-square approximation).
Replace with a trained ML model for production.
"""
import io
import math
import struct
from typing import Dict, Any, List

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False


def _entropy(data: bytes) -> float:
    """Shannon entropy of a byte sequence."""
    if not data:
        return 0.0
    freq = [0] * 256
    for b in data:
        freq[b] += 1
    n = len(data)
    return -sum((f / n) * math.log2(f / n) for f in freq if f)


def _lsb_chi_square(pixels: List[int]) -> float:
    """
    Approximate chi-square score for LSB randomness.
    Higher score = more anomalous = more likely stego.
    Returns a 0-100 normalised score.
    """
    if len(pixels) < 64:
        return 0.0

    # Count even/odd pixel values (LSB analysis)
    even = sum(1 for p in pixels if p % 2 == 0)
    odd  = len(pixels) - even
    expected = len(pixels) / 2
    chi = ((even - expected) ** 2 + (odd - expected) ** 2) / expected

    # Normalise to 0-100: chi > 50 is suspicious
    return min(chi * 2, 100)


def analyze_image_file(content: bytes, filename: str = "image.png") -> Dict[str, Any]:
    if not PIL_AVAILABLE:
        return _fallback_result(filename)

    try:
        img = Image.open(io.BytesIO(content)).convert("RGB")
    except Exception:
        return _fallback_result(filename)

    width, height = img.size
    pixels_flat   = list(img.getdata())   # list of (R, G, B) tuples
    r_channel     = [p[0] for p in pixels_flat]

    # Stats
    entropy_val   = _entropy(content[:4096])        # file-level entropy
    lsb_score     = _lsb_chi_square(r_channel[:2048])
    chi_passed    = lsb_score < 35
    chi_p_value   = round(max(0.0, 1 - lsb_score / 100), 3)
    entropy_status = "NORMAL" if entropy_val < 7.5 else "ABNORMAL"

    # Payload estimate (rough: LSB can hide ~1 bit per pixel)
    total_pixels      = width * height
    estimated_payload = int((lsb_score / 100) * total_pixels / 8) if lsb_score > 50 else 0

    # Verdict
    is_stego  = lsb_score >= 55
    verdict   = "STEGO_DETECTED" if is_stego else "SAFE"
    risk      = round(lsb_score * 0.95, 1)
    confidence = round(70 + lsb_score * 0.29, 1) if is_stego else round(95 - lsb_score * 0.2, 1)

    # EXIF anomalies check
    metadata_anomalies = []
    try:
        exif = img._getexif() or {}
        if len(exif) > 20:
            metadata_anomalies.append("Excessive EXIF fields")
    except Exception:
        pass

    return {
        "verdict":    verdict,
        "risk_score": risk,
        "confidence": min(confidence, 99.9),
        "file_info": {
            "format":     img.format or filename.split(".")[-1].upper(),
            "size_kb":    round(len(content) / 1024, 1),
            "dimensions": f"{width}x{height}",
            "color_mode": img.mode,
        },
        "analysis": {
            "lsb_anomaly_score":     round(lsb_score, 2),
            "chi_square_passed":     chi_passed,
            "chi_square_p_value":    chi_p_value,
            "entropy_score":         round(entropy_val, 2),
            "entropy_status":        entropy_status,
            "estimated_payload_bytes": estimated_payload,
            "metadata_anomalies":    metadata_anomalies,
        },
        "recommendations": (
            ["Do not open or forward this image",
             "Quarantine and submit to incident response team",
             "Inspect for embedded C2 instructions"]
            if is_stego else
            ["Image appears clean", "No hidden payload detected"]
        ),
    }


def _fallback_result(filename: str) -> Dict[str, Any]:
    """Used when Pillow is not installed or image cannot be read."""
    return {
        "verdict":    "SAFE",
        "risk_score": 0.0,
        "confidence": 50.0,
        "file_info":  {"format": "UNKNOWN", "size_kb": 0, "dimensions": "N/A", "color_mode": "N/A"},
        "analysis": {
            "lsb_anomaly_score":     0,
            "chi_square_passed":     True,
            "chi_square_p_value":    1.0,
            "entropy_score":         0,
            "entropy_status":        "NORMAL",
            "estimated_payload_bytes": 0,
            "metadata_anomalies":    [],
        },
        "recommendations": ["Could not read image — check file format"],
    }


def encode_text(content: bytes, text: str) -> bytes:
    if not PIL_AVAILABLE:
        raise Exception("Pillow is not installed")
    
    img = Image.open(io.BytesIO(content)).convert("RGB")
    new_img = img.copy()
    
    # Generate binary data
    datalist = [format(ord(i), '08b') for i in text]
    lendata = len(datalist)
    
    # Flatten pixels
    pix = list(new_img.getdata())
    imdata = iter(pix)
    
    modified_pixels = []
    
    for i in range(lendata):
        try:
            # Extract 3 pixels at a time (9 values)
            p1 = next(imdata)
            p2 = next(imdata)
            p3 = next(imdata)
        except StopIteration:
            raise Exception("Image too small to hold the text")
            
        current_pix = list(p1[:3] + p2[:3] + p3[:3])
        
        # Modify first 8 values based on data bits
        for j in range(0, 8):
            if datalist[i][j] == '0' and current_pix[j] % 2 != 0:
                current_pix[j] -= 1
            elif datalist[i][j] == '1' and current_pix[j] % 2 == 0:
                current_pix[j] -= 1
                
        # 9th value indicates stop (1) or continue (0)
        if i == lendata - 1:
            if current_pix[-1] % 2 == 0:
                current_pix[-1] -= 1
        else:
            if current_pix[-1] % 2 != 0:
                current_pix[-1] -= 1
                
        modified_pixels.append(tuple(current_pix[0:3]))
        modified_pixels.append(tuple(current_pix[3:6]))
        modified_pixels.append(tuple(current_pix[6:9]))
        
    # Append remaining pixels
    for p in imdata:
        modified_pixels.append(p)
        
    new_img.putdata(modified_pixels)
    
    out_io = io.BytesIO()
    # Force PNG to avoid lossy compression breaking LSB
    new_img.save(out_io, format="PNG")
    return out_io.getvalue()


def decode_text(content: bytes) -> str:
    if not PIL_AVAILABLE:
        raise Exception("Pillow is not installed")
        
    img = Image.open(io.BytesIO(content)).convert("RGB")
    data = ''
    imgdata = iter(img.getdata())
    
    while True:
        try:
            p1 = next(imgdata)
            p2 = next(imgdata)
            p3 = next(imgdata)
        except StopIteration:
            break
            
        pixels = list(p1[:3] + p2[:3] + p3[:3])
        binstr = ''
        
        for i in pixels[:8]:
            if i % 2 == 0:
                binstr += '0'
            else:
                binstr += '1'
                
        data += chr(int(binstr, 2))
        if pixels[-1] % 2 != 0:
            return data
            
    return data


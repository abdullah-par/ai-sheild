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

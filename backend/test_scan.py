import requests

BASE_URL = "http://127.0.0.1:8000/api/v1"

def test_anonymous_scan():
    print("[*] Testing Anonymous URL Scan...")
    res = requests.post(f"{BASE_URL}/phishing/scan-url", json={"url": "http://malicious-test.com"})
    if res.status_code == 200:
        print(f"[PASS] Anonymous scan successful: {res.json()['scan_id']}")
    else:
        print(f"[FAIL] Anonymous scan failed: {res.text}")

if __name__ == "__main__":
    test_anonymous_scan()

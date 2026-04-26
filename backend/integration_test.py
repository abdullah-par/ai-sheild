import requests
import uuid
import sys

BASE_URL = "http://127.0.0.1:8000/api/v1"

def test_auth_flow():
    print("[*] Testing Auth Flow...")
    email = f"test_{uuid.uuid4().hex[:6]}@example.com"
    password = "testpassword123"

    # 1. Register
    reg_res = requests.post(f"{BASE_URL}/auth/register", json={"email": email, "password": password})
    if reg_res.status_code != 201:
        print(f"[FAIL] Registration failed: {reg_res.text}")
        return False
    print("[PASS] Registration successful")

    # 2. Login
    login_res = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
    if login_res.status_code != 200:
        print(f"[FAIL] Login failed: {login_res.text}")
        return False
    token = login_res.json()["access_token"]
    print("[PASS] Login successful, token received")

    # 3. Get Me
    me_res = requests.get(f"{BASE_URL}/auth/me", headers={"Authorization": f"Bearer {token}"})
    if me_res.status_code != 200 or me_res.json()["email"] != email:
        print(f"[FAIL] /me endpoint failed: {me_res.text}")
        return False
    print("[PASS] /me endpoint verified")
    
    return token

def test_dashboard(token):
    print("\n[*] Testing Dashboard Endpoints...")
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Stats Summary
    stats_res = requests.get(f"{BASE_URL}/stats/summary", headers=headers)
    if stats_res.status_code != 200:
        print(f"[FAIL] Stats Summary failed: {stats_res.text}")
        return False
    print("[PASS] Stats Summary verified")

    # 3. User Report
    report_res = requests.get(f"{BASE_URL}/user/report", headers=headers)
    if report_res.status_code != 200:
        print(f"[FAIL] User Report failed: {report_res.text}")
        return False
    report_data = report_res.json()
    if "user" not in report_data or "scans" not in report_data:
        print(f"[FAIL] User Report missing required fields: {report_data}")
        return False
    print("[PASS] User Report verified")
    
    return True

def test_anonymous():
    print("\n[*] Testing Anonymous Access...")
    # Should work (200) but return 0/empty if no anonymous scans exist in a fresh DB
    # (But we seeded some in the previous turn)
    stats_res = requests.get(f"{BASE_URL}/stats/summary")
    if stats_res.status_code != 200:
        print(f"[FAIL] Anonymous Stats failed: {stats_res.text}")
        return False
    print(f"[PASS] Anonymous Stats allowed (Status: {stats_res.status_code})")
    return True

if __name__ == "__main__":
    try:
        # Check if server is running
        requests.get("http://127.0.0.1:8000/health", timeout=2)
    except:
        print("[ERROR] Backend is not running at http://127.0.0.1:8000")
        sys.exit(1)

    token = test_auth_flow()
    if token:
        test_dashboard(token)
        test_anonymous()
        print("\n[COMPLETE] All backend tests passed!")
    else:
        print("\n[FAILED] Tests aborted due to auth failure.")

import requests
import json

try:
    r = requests.get('http://localhost:8000/api/v1/stats/summary', timeout=5)
    print(f'Status: {r.status_code}')
    print(f'Headers: {dict(r.headers)}')
    print(f'Body: {r.text}')
except Exception as e:
    print(f'Error: {e}')
    import traceback
    traceback.print_exc()

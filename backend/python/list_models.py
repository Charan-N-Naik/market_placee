import requests
import os
from dotenv import load_dotenv

load_dotenv(override=True)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

url = f"https://generativelanguage.googleapis.com/v1beta/models?key={GEMINI_API_KEY}"
res = requests.get(url)
print(res.json())

import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
print(f"API Key prefix: {api_key[:10]}...")
genai.configure(api_key=api_key)

try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(m.name)
except Exception as e:
    print("Error listing models:", e)

print("--- Testing specific models ---")
for m_name in ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro', 'gemini-flash']:
    try:
        model = genai.GenerativeModel(m_name)
        res = model.generate_content("Say hello")
        print(f"SUCCESS {m_name}: {res.text.strip()}")
    except Exception as e:
        print(f"FAIL {m_name}: {e}")

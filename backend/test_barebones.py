import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=api_key)

models_to_test = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-3-flash-preview']

for m in models_to_test:
    print(f"Testing {m}...")
    try:
        model = genai.GenerativeModel(m)
        response = model.generate_content("Hi")
        print("Success:", response.text.strip())
    except Exception as e:
        print("Failed:", type(e).__name__)
        print(str(e))
    print("-" * 20)

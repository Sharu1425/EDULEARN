import requests
import json

BASE_URL = "http://localhost:5001"

def test_question_generation():
    print("Testing /db/questions endpoint...")
    try:
        response = requests.get(
            f"{BASE_URL}/db/questions",
            params={"topic": "Python", "difficulty": "Easy", "count": 2},
            timeout=30
        )
        questions = response.json()
        
        print(f"Received {len(questions)} questions.")
        
        for i, q in enumerate(questions):
            print(f"\nQuestion {i+1}: {q.get('question')[:50]}...")
            print(f"Options: {q.get('options')}")
            print(f"Answer (Text): '{q.get('answer')}'")
            print(f"Correct Answer (Index): {q.get('correct_answer')}")
            
            # Validation
            options = q.get('options', [])
            correct_idx = q.get('correct_answer', -1)
            correct_text = q.get('answer', '')
            
            if correct_idx == -1:
                print("[ERROR] correct_answer is -1")
            elif correct_idx >= len(options):
                print(f"[ERROR] correct_answer index {correct_idx} out of range")
            elif options[correct_idx] != correct_text:
                print(f"[ERROR] Index {correct_idx} points to '{options[correct_idx]}' but answer text is '{correct_text}'")
            else:
                print("[SUCCESS] Question metadata is consistent")
                
    except Exception as e:
        print(f"[FAILED] Test failed: {e}")

if __name__ == "__main__":
    test_question_generation()

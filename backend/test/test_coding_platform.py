"""
Test script to verify the coding platform setup
Run this to ensure HackerEarth integration and coding endpoints work correctly
"""
import asyncio
import os
from dotenv import load_dotenv
from services.hackerearth_execution_service import hackerearth_execution_service

load_dotenv()

async def test_hackerearth_connection():
    """Test basic HackerEarth API connection"""
    print("🧪 Testing HackerEarth API Connection...")
    print(f"API Secret configured: {'✅ Yes' if os.getenv('HACKEREARTH_CLIENT_SECRET') else '❌ No'}")
    
    if not os.getenv('HACKEREARTH_CLIENT_SECRET') or os.getenv('HACKEREARTH_CLIENT_SECRET') == 'your-hackerearth-client-secret':
        print("\n⚠️  WARNING: HackerEarth API secret not configured!")
        print("Please update HACKEREARTH_CLIENT_SECRET in your .env file")
        print("Get your key from: https://www.hackerearth.com/docs/wiki/developers/v4/")
        return False
    
    print("\n✅ HackerEarth configuration looks good!")
    return True

def test_python_execution():
    """Test Python code execution"""
    print("\n🐍 Testing Python Code Execution...")
    
    code = """
def solution(nums):
    return sum(nums)

# Test
result = solution([1, 2, 3, 4, 5])
print(result)
"""
    
    test_cases = [
        {"input": [1, 2, 3, 4, 5], "output": "15"},
        {"input": [10, 20, 30], "output": "60"},
    ]
    
    try:
        results = hackerearth_execution_service.run_tests("python", code, test_cases)
        
        print(f"\nTotal test cases: {len(results)}")
        passed = sum(1 for r in results if r.get('passed'))
        print(f"Passed: {passed}/{len(results)}")
        
        for i, result in enumerate(results):
            status = "✅ PASSED" if result.get('passed') else "❌ FAILED"
            print(f"\nTest {i+1}: {status}")
            print(f"  Input: {result.get('input')}")
            print(f"  Expected: {result.get('expected')}")
            print(f"  Output: {result.get('output')}")
            if result.get('error'):
                print(f"  Error: {result.get('error')}")
            print(f"  Time: {result.get('execution_time')}ms")
        
        return passed == len(results)
    
    except Exception as e:
        print(f"\n❌ Error during execution: {str(e)}")
        return False

def test_javascript_execution():
    """Test JavaScript code execution"""
    print("\n🟨 Testing JavaScript Code Execution...")
    
    code = """
function solution(nums) {
    return nums.reduce((a, b) => a + b, 0);
}

// Test
console.log(solution([1, 2, 3, 4, 5]));
"""
    
    test_cases = [
        {"input": [1, 2, 3, 4, 5], "output": "15"},
    ]
    
    try:
        results = hackerearth_execution_service.run_tests("javascript", code, test_cases)
        passed = sum(1 for r in results if r.get('passed'))
        print(f"Passed: {passed}/{len(results)}")
        return passed == len(results)
    
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

async def main():
    """Run all tests"""
    print("=" * 60)
    print("🚀 CODING PLATFORM TEST SUITE")
    print("=" * 60)
    
    # Test 1: Check configuration
    config_ok = await test_hackerearth_connection()
    
    if not config_ok:
        print("\n" + "=" * 60)
        print("❌ SETUP INCOMPLETE")
        print("=" * 60)
        print("\nPlease configure HackerEarth API key before testing execution.")
        return
    
    # Test 2: Python execution
    python_ok = test_python_execution()
    
    # Test 3: JavaScript execution
    js_ok = test_javascript_execution()
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    print(f"Configuration: {'✅ PASS' if config_ok else '❌ FAIL'}")
    print(f"Python Execution: {'✅ PASS' if python_ok else '❌ FAIL'}")
    print(f"JavaScript Execution: {'✅ PASS' if js_ok else '❌ FAIL'}")
    
    if config_ok and python_ok and js_ok:
        print("\n🎉 All tests passed! Your coding platform is ready!")
        print("\nNext steps:")
        print("1. Start the backend: python start_server.py")
        print("2. Start the frontend: cd frontend && npm run dev")
        print("3. Login as a student")
        print("4. Go to Assessment Choice → Coding Challenge")
        print("5. Generate a problem and start coding!")
    else:
        print("\n⚠️  Some tests failed. Please check the errors above.")
        print("\nTroubleshooting:")
        print("1. Verify HACKEREARTH_CLIENT_SECRET in .env file")
        print("2. Check your API subscription status")
        print("3. Ensure you have internet connectivity")
    
    print("=" * 60)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()

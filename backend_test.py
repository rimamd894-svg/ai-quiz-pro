import requests
import sys
import json
from datetime import datetime
import time

class AIQuizProTester:
    def __init__(self, base_url="https://quizmaster-54.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_user_email = f"test_user_{int(time.time())}@example.com"
        self.test_user_password = "TestPass123!"
        self.test_user_name = "Test User"

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "api/health",
            200
        )
        return success

    def test_user_registration(self):
        """Test user registration"""
        success, response = self.run_test(
            "User Registration",
            "POST",
            "api/auth/register",
            200,
            data={
                "email": self.test_user_email,
                "password": self.test_user_password,
                "full_name": self.test_user_name
            }
        )
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response.get('user', {}).get('user_id')
            print(f"   Token obtained: {self.token[:20]}...")
            return True
        return False

    def test_user_login(self):
        """Test user login"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "api/auth/login",
            200,
            data={
                "email": self.test_user_email,
                "password": self.test_user_password
            }
        )
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response.get('user', {}).get('user_id')
            print(f"   Login token: {self.token[:20]}...")
            return True
        return False

    def test_user_profile(self):
        """Test getting user profile"""
        success, response = self.run_test(
            "Get User Profile",
            "GET",
            "api/user/profile",
            200
        )
        return success

    def test_quiz_categories(self):
        """Test getting quiz categories"""
        success, response = self.run_test(
            "Get Quiz Categories",
            "GET",
            "api/quiz/categories",
            200
        )
        if success and 'categories' in response:
            print(f"   Categories found: {len(response['categories'])}")
            return True
        return False

    def test_quiz_generation(self):
        """Test AI quiz generation"""
        success, response = self.run_test(
            "Generate Quiz",
            "POST",
            "api/quiz/generate",
            200,
            data={
                "category": "General Knowledge",
                "difficulty": "Easy",
                "num_questions": 3
            }
        )
        if success and 'quiz_id' in response:
            self.quiz_id = response['quiz_id']
            self.quiz_questions = response.get('questions', [])
            print(f"   Quiz generated with ID: {self.quiz_id}")
            print(f"   Questions count: {len(self.quiz_questions)}")
            return True
        return False

    def test_quiz_submission(self):
        """Test quiz submission"""
        if not hasattr(self, 'quiz_id') or not hasattr(self, 'quiz_questions'):
            print("❌ No quiz available for submission test")
            return False

        # Create sample answers
        answers = []
        for i, question in enumerate(self.quiz_questions):
            answers.append({
                "question_id": question['id'],
                "selected_answer": 0,  # Always select first option
                "time_taken": 15.5
            })

        success, response = self.run_test(
            "Submit Quiz",
            "POST",
            "api/quiz/submit",
            200,
            data={
                "quiz_id": self.quiz_id,
                "answers": answers
            }
        )
        if success:
            print(f"   Score: {response.get('total_score', 0)}")
            print(f"   Correct: {response.get('correct_answers', 0)}/{response.get('total_questions', 0)}")
            return True
        return False

    def test_leaderboard(self):
        """Test leaderboard endpoint"""
        success, response = self.run_test(
            "Get Leaderboard",
            "GET",
            "api/leaderboard",
            200
        )
        if success and 'leaderboard' in response:
            print(f"   Leaderboard entries: {len(response['leaderboard'])}")
            return True
        return False

    def test_user_history(self):
        """Test user quiz history"""
        success, response = self.run_test(
            "Get User History",
            "GET",
            "api/user/history",
            200
        )
        if success and 'history' in response:
            print(f"   History entries: {len(response['history'])}")
            return True
        return False

    def test_app_stats(self):
        """Test app statistics"""
        success, response = self.run_test(
            "Get App Stats",
            "GET",
            "api/stats",
            200
        )
        if success:
            print(f"   Total users: {response.get('total_users', 0)}")
            print(f"   Total quizzes: {response.get('total_quizzes', 0)}")
            return True
        return False

    def test_duplicate_registration(self):
        """Test duplicate user registration (should fail)"""
        success, response = self.run_test(
            "Duplicate Registration (Should Fail)",
            "POST",
            "api/auth/register",
            400,  # Expecting 400 for duplicate email
            data={
                "email": self.test_user_email,
                "password": self.test_user_password,
                "full_name": "Another User"
            }
        )
        return success

    def test_invalid_login(self):
        """Test login with invalid credentials"""
        success, response = self.run_test(
            "Invalid Login (Should Fail)",
            "POST",
            "api/auth/login",
            401,  # Expecting 401 for invalid credentials
            data={
                "email": "nonexistent@example.com",
                "password": "wrongpassword"
            }
        )
        return success

def main():
    print("🚀 Starting AI Quiz Pro Backend API Tests")
    print("=" * 50)
    
    tester = AIQuizProTester()
    
    # Test sequence
    test_sequence = [
        ("Health Check", tester.test_health_check),
        ("User Registration", tester.test_user_registration),
        ("User Profile", tester.test_user_profile),
        ("Quiz Categories", tester.test_quiz_categories),
        ("Quiz Generation", tester.test_quiz_generation),
        ("Quiz Submission", tester.test_quiz_submission),
        ("Leaderboard", tester.test_leaderboard),
        ("User History", tester.test_user_history),
        ("App Stats", tester.test_app_stats),
        ("Duplicate Registration", tester.test_duplicate_registration),
        ("Invalid Login", tester.test_invalid_login),
    ]
    
    # Run all tests
    for test_name, test_func in test_sequence:
        try:
            test_func()
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")
            tester.tests_run += 1
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 FINAL RESULTS")
    print(f"Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Tests Failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed / tester.tests_run * 100):.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 ALL TESTS PASSED!")
        return 0
    else:
        print("⚠️  SOME TESTS FAILED")
        return 1

if __name__ == "__main__":
    sys.exit(main())
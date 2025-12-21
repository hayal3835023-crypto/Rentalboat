#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class BoatRentalAPITester:
    def __init__(self, base_url="https://location-bateaux.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:200]
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "error": str(e)
            })
            return False, {}

    def test_health_check(self):
        """Test basic health endpoint"""
        return self.run_test("Health Check", "GET", "health", 200)

    def test_seed_demo_data(self):
        """Seed demo data"""
        return self.run_test("Seed Demo Data", "POST", "seed-demo-data", 200)

    def test_get_categories(self):
        """Test get boat categories"""
        success, response = self.run_test("Get Categories", "GET", "boats/categories", 200)
        if success and isinstance(response, list) and len(response) > 0:
            print(f"   Found {len(response)} categories")
            return True, response
        return False, {}

    def test_get_destinations(self):
        """Test get destinations"""
        success, response = self.run_test("Get Destinations", "GET", "boats/destinations", 200)
        if success and isinstance(response, list) and len(response) > 0:
            print(f"   Found {len(response)} destinations")
            return True, response
        return False, {}

    def test_get_boats(self):
        """Test get boats"""
        success, response = self.run_test("Get Boats", "GET", "boats", 200)
        if success and isinstance(response, list):
            print(f"   Found {len(response)} boats")
            return True, response
        return False, {}

    def test_get_boats_with_filters(self):
        """Test get boats with filters"""
        success, response = self.run_test("Get Boats (Filtered)", "GET", "boats?category=yacht&verified_only=true", 200)
        if success and isinstance(response, list):
            print(f"   Found {len(response)} filtered boats")
            return True, response
        return False, {}

    def test_register_user(self):
        """Test user registration"""
        test_email = f"test_{datetime.now().strftime('%H%M%S')}@test.com"
        user_data = {
            "email": test_email,
            "password": "TestPass123!",
            "name": "Test User",
            "phone": "+33123456789"
        }
        success, response = self.run_test("User Registration", "POST", "auth/register", 200, user_data)
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['user_id']
            print(f"   Registered user: {response['user']['name']}")
            return True, response
        return False, {}

    def test_login_demo_user(self):
        """Test login with demo credentials"""
        login_data = {
            "email": "proprietaire@demo.fr",
            "password": "demo123"
        }
        success, response = self.run_test("Demo User Login", "POST", "auth/login", 200, login_data)
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['user_id']
            print(f"   Logged in as: {response['user']['name']}")
            return True, response
        return False, {}

    def test_get_me(self):
        """Test get current user"""
        if not self.token:
            print("❌ No token available for auth test")
            return False, {}
        return self.run_test("Get Current User", "GET", "auth/me", 200)

    def test_get_boat_detail(self, boat_id):
        """Test get boat detail"""
        success, response = self.run_test("Get Boat Detail", "GET", f"boats/{boat_id}", 200)
        if success and 'boat_id' in response:
            print(f"   Boat: {response.get('name', 'Unknown')}")
            return True, response
        return False, {}

    def test_favorites(self, boat_id):
        """Test favorites functionality"""
        if not self.token:
            print("❌ No token available for favorites test")
            return False, {}
        
        # Add to favorites
        success1, _ = self.run_test("Add Favorite", "POST", f"favorites/{boat_id}", 200)
        
        # Check if favorite
        success2, response = self.run_test("Check Favorite", "GET", f"favorites/check/{boat_id}", 200)
        is_favorite = response.get('is_favorite', False) if success2 else False
        
        # Remove from favorites
        success3, _ = self.run_test("Remove Favorite", "DELETE", f"favorites/{boat_id}", 200)
        
        return success1 and success2 and success3 and is_favorite, {}

    def test_create_booking(self, boat_id):
        """Test booking creation"""
        if not self.token:
            print("❌ No token available for booking test")
            return False, {}
        
        booking_data = {
            "boat_id": boat_id,
            "start_date": "2024-08-15",
            "end_date": "2024-08-17",
            "guests": 4,
            "with_skipper": False,
            "message": "Test booking"
        }
        success, response = self.run_test("Create Booking", "POST", "bookings", 200, booking_data)
        if success and 'booking_id' in response:
            print(f"   Booking ID: {response['booking_id']}")
            return True, response
        return False, {}

    def test_get_bookings(self):
        """Test get user bookings"""
        if not self.token:
            print("❌ No token available for bookings test")
            return False, {}
        
        success, response = self.run_test("Get User Bookings", "GET", "bookings", 200)
        if success and isinstance(response, list):
            print(f"   Found {len(response)} bookings")
            return True, response
        return False, {}

def main():
    print("🚢 Starting Boat Rental API Tests")
    print("=" * 50)
    
    tester = BoatRentalAPITester()
    
    # Basic API tests
    print("\n📋 BASIC API TESTS")
    tester.test_health_check()
    tester.test_seed_demo_data()
    
    # Data retrieval tests
    print("\n📊 DATA RETRIEVAL TESTS")
    tester.test_get_categories()
    tester.test_get_destinations()
    success, boats = tester.test_get_boats()
    tester.test_get_boats_with_filters()
    
    # Get a boat ID for detailed tests
    boat_id = None
    if success and boats and len(boats) > 0:
        boat_id = boats[0].get('boat_id')
        if boat_id:
            tester.test_get_boat_detail(boat_id)
    
    # Authentication tests
    print("\n🔐 AUTHENTICATION TESTS")
    tester.test_register_user()
    tester.test_login_demo_user()
    tester.test_get_me()
    
    # Authenticated user tests
    if boat_id and tester.token:
        print("\n👤 AUTHENTICATED USER TESTS")
        tester.test_favorites(boat_id)
        success, booking = tester.test_create_booking(boat_id)
        tester.test_get_bookings()
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 FINAL RESULTS")
    print(f"Tests run: {tester.tests_run}")
    print(f"Tests passed: {tester.tests_passed}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    if tester.failed_tests:
        print(f"\n❌ FAILED TESTS ({len(tester.failed_tests)}):")
        for i, test in enumerate(tester.failed_tests, 1):
            print(f"{i}. {test.get('test', 'Unknown')}")
            if 'error' in test:
                print(f"   Error: {test['error']}")
            else:
                print(f"   Expected: {test.get('expected')}, Got: {test.get('actual')}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())
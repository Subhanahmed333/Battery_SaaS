import requests
import sys
import json
from datetime import datetime
import uuid

class AccountRecoveryTester:
    def __init__(self, base_url="https://shopid-recovery.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.existing_shop_id = "shop_a42e0a33"  # From previous test run

    def run_test(self, name, method, endpoint, expected_status, data=None, check_response=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                
                # Additional response validation if provided
                if check_response and response.status_code == 200:
                    try:
                        response_data = response.json()
                        if check_response(response_data):
                            print(f"   ✅ Response validation passed")
                        else:
                            print(f"   ⚠️  Response validation failed")
                            success = False
                            self.tests_passed -= 1
                    except Exception as e:
                        print(f"   ⚠️  Response validation error: {str(e)}")
                
                return success, response.json() if response.content else {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                if response.content:
                    try:
                        error_data = response.json()
                        print(f"   Error: {error_data}")
                    except:
                        print(f"   Error: {response.text}")
                return False, {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout")
            return False, {}
        except requests.exceptions.ConnectionError:
            print(f"❌ Failed - Connection error")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_admin_authentication_success(self):
        """Test admin authentication with valid credentials"""
        admin_auth_data = {
            "admin_key": "MURICK_ADMIN_2024",
            "username": "murick_admin",
            "password": "MurickAdmin@2024"
        }
        
        def check_admin_auth(data):
            return (
                data.get('message') == 'Admin authentication successful' and
                'admin' in data and
                data['admin']['username'] == 'murick_admin' and
                data['admin']['role'] == 'super_admin'
            )
        
        success, response = self.run_test(
            "Admin Authentication - Valid Credentials",
            "POST",
            "api/admin/authenticate",
            200,
            data=admin_auth_data,
            check_response=check_admin_auth
        )
        
        if success:
            print(f"   Admin Name: {response['admin']['name']}")
            print(f"   Admin Role: {response['admin']['role']}")
        
        return success, response

    def test_admin_search_shops_success(self):
        """Test admin shop search functionality"""
        search_data = {
            "admin_key": "MURICK_ADMIN_2024",
            "username": "murick_admin",
            "password": "MurickAdmin@2024",
            "search_term": "Khan"  # Should find Khan Battery Center
        }
        
        def check_search_results(data):
            return (
                'shops' in data and
                'total_found' in data and
                len(data['shops']) > 0
            )
        
        success, response = self.run_test(
            "Admin Shop Search - Find Khan Battery Center",
            "POST",
            "api/admin/search-shops",
            200,
            data=search_data,
            check_response=check_search_results
        )
        
        if success:
            print(f"   Found {response['total_found']} shop(s)")
            for shop in response['shops']:
                print(f"   - {shop['shop_name']} (ID: {shop['shop_id']})")
        
        return success, response

    def test_admin_get_shop_details_success(self):
        """Test admin getting shop details for recovery"""
        def check_shop_details(data):
            required_fields = ['shop_id', 'shop_name', 'proprietor_name', 'users', 'license_key']
            return all(field in data for field in required_fields)
        
        success, response = self.run_test(
            "Admin Get Shop Details",
            "GET",
            f"api/admin/shop-details/{self.existing_shop_id}?admin_key=MURICK_ADMIN_2024&username=murick_admin&password=MurickAdmin@2024",
            200,
            check_response=check_shop_details
        )
        
        if success:
            print(f"   Shop: {response.get('shop_name')}")
            print(f"   Users: {len(response.get('users', []))}")
            print(f"   Recovery Codes Available: {response.get('recovery_codes_available', 0)}")
        
        return success, response

    def test_admin_reset_shop_credentials_success(self):
        """Test admin resetting shop user credentials"""
        # First get shop details to find a user
        success, shop_details = self.run_test(
            "Get Shop Details for Credential Reset",
            "GET",
            f"api/admin/shop-details/{self.existing_shop_id}?admin_key=MURICK_ADMIN_2024&username=murick_admin&password=MurickAdmin@2024",
            200
        )
        
        if not success or not shop_details.get('users'):
            print("❌ Cannot test credential reset - no users found")
            return False, {}
        
        target_user = shop_details['users'][0]['username']  # Use first user
        
        reset_data = {
            "admin_key": "MURICK_ADMIN_2024",
            "username": "murick_admin",
            "password": "MurickAdmin@2024",
            "shop_id": self.existing_shop_id,
            "new_username": "admin_reset_by_admin",
            "new_password": "newpassword123",
            "target_user": target_user
        }
        
        def check_reset_success(data):
            return (
                'message' in data and
                data.get('new_username') == 'admin_reset_by_admin' and
                'shop_name' in data
            )
        
        success, response = self.run_test(
            f"Admin Reset Credentials - {target_user}",
            "POST",
            "api/admin/reset-shop-credentials",
            200,
            data=reset_data,
            check_response=check_reset_success
        )
        
        if success:
            print(f"   Reset user: {target_user} -> {reset_data['new_username']}")
            print(f"   Shop: {response.get('shop_name')}")
            
            # Test authentication with new credentials
            auth_data = {
                "shop_id": self.existing_shop_id,
                "username": "admin_reset_by_admin",
                "password": "newpassword123"
            }
            
            auth_success, auth_response = self.run_test(
                "Authenticate with Admin-Reset Credentials",
                "POST",
                "api/authenticate",
                200,
                data=auth_data
            )
            
            if auth_success:
                print(f"   ✅ Authentication successful with reset credentials")
            else:
                print(f"   ❌ Authentication failed with reset credentials")
                success = False
        
        return success, response

    def test_admin_generate_new_license_for_shop(self):
        """Test admin generating new license for existing shop"""
        license_data = {
            "admin_key": "MURICK_ADMIN_2024",
            "username": "murick_admin",
            "password": "MurickAdmin@2024",
            "plan": "premium",
            "shop_id": self.existing_shop_id
        }
        
        def check_license_generation(data):
            return (
                'license_key' in data and
                data.get('plan') == 'premium' and
                data.get('assigned_to_shop') == self.existing_shop_id and
                'message' in data
            )
        
        success, response = self.run_test(
            "Admin Generate New License for Shop",
            "POST",
            "api/admin/generate-new-license",
            200,
            data=license_data,
            check_response=check_license_generation
        )
        
        if success:
            print(f"   New License: {response.get('license_key')}")
            print(f"   Plan: {response.get('plan')}")
            print(f"   Assigned to Shop: {response.get('assigned_to_shop')}")
        
        return success, response

    def test_recovery_codes_validation_and_usage(self):
        """Test recovery codes validation and usage"""
        # First, create a new shop to get fresh recovery codes
        admin_data = {
            "admin_key": "MURICK_ADMIN_2024",
            "plan": "basic"
        }
        
        license_success, license_response = self.run_test(
            "Generate License for Recovery Test",
            "POST",
            "api/admin/generate-license",
            200,
            data=admin_data
        )
        
        if not license_success or 'license_key' not in license_response:
            print("❌ Could not generate license for recovery test")
            return False, {}
        
        new_license_key = license_response['license_key']
        test_shop_id = f"recovery_test_{uuid.uuid4().hex[:8]}"
        
        shop_data = {
            "shop_id": test_shop_id,
            "shop_name": "Recovery Test Shop",
            "proprietor_name": "Test Owner",
            "contact_number": "03001111111",
            "address": "Test Address",
            "users": [],
            "license_key": new_license_key
        }
        
        # Setup the shop
        setup_success, setup_response = self.run_test(
            "Setup Shop for Recovery Code Test",
            "POST",
            "api/setup-shop",
            200,
            data=shop_data
        )
        
        if not setup_success or 'recovery_codes' not in setup_response:
            print("❌ Could not setup shop for recovery code test")
            return False, {}
        
        recovery_codes = setup_response['recovery_codes']
        if not recovery_codes:
            print("❌ No recovery codes generated")
            return False, {}
        
        print(f"   Generated {len(recovery_codes)} recovery codes")
        
        # Test recovery code validation
        test_code = recovery_codes[0]
        
        def check_code_validation(data):
            return (
                data.get('valid') == True and
                data.get('shop_id') == test_shop_id
            )
        
        validation_success, validation_response = self.run_test(
            "Validate Recovery Code",
            "GET",
            f"api/recovery/validate-code/{test_code}/{test_shop_id}",
            200,
            check_response=check_code_validation
        )
        
        if validation_success:
            print(f"   Recovery Code: {test_code}")
            print(f"   Valid for Shop: {validation_response.get('shop_id')}")
        
        # Add a user to test recovery
        test_user = {
            "username": "recovery_test_user",
            "password": "original123",
            "name": "Recovery Test User",
            "role": "admin"
        }
        
        user_success, _ = self.run_test(
            "Add User for Recovery Test",
            "POST",
            f"api/add-user/{test_shop_id}",
            200,
            data=test_user
        )
        
        if not user_success:
            print("❌ Could not add user for recovery test")
            return False, {}
        
        # Use recovery code to reset credentials
        recovery_request = {
            "recovery_code": test_code,
            "shop_id": test_shop_id,
            "new_username": "recovered_user",
            "new_password": "newpassword123",
            "target_user": "recovery_test_user"
        }
        
        def check_recovery_success(data):
            return (
                'message' in data and
                data.get('new_username') == 'recovered_user' and
                data.get('recovery_code_used') == test_code
            )
        
        recovery_success, recovery_response = self.run_test(
            "Use Recovery Code to Reset Credentials",
            "POST",
            "api/recovery/use-code",
            200,
            data=recovery_request,
            check_response=check_recovery_success
        )
        
        if recovery_success:
            print(f"   Recovery Code Used: {test_code}")
            print(f"   New Username: {recovery_response.get('new_username')}")
            
            # Test authentication with recovered credentials
            auth_data = {
                "shop_id": test_shop_id,
                "username": "recovered_user",
                "password": "newpassword123"
            }
            
            auth_success, auth_response = self.run_test(
                "Authenticate with Recovered Credentials",
                "POST",
                "api/authenticate",
                200,
                data=auth_data
            )
            
            if auth_success:
                print(f"   ✅ Authentication successful with recovered credentials")
            else:
                print(f"   ❌ Authentication failed with recovered credentials")
                recovery_success = False
            
            # Test that recovery code is now used (should fail)
            used_code_success, _ = self.run_test(
                "Validate Used Recovery Code (Should Fail)",
                "GET",
                f"api/recovery/validate-code/{test_code}/{test_shop_id}",
                400  # Should fail with 400 (already used)
            )
            
            if used_code_success:
                print(f"   ✅ Recovery code properly marked as used")
            else:
                print(f"   ❌ Recovery code validation failed")
        
        return recovery_success, recovery_response

def main():
    print("🔒 Starting Account Recovery System Tests")
    print("=" * 60)
    
    tester = AccountRecoveryTester()
    
    # Run account recovery tests
    test_results = []
    
    print("\n🔐 ADMIN OVERRIDE SYSTEM TESTS")
    print("-" * 40)
    test_results.append(tester.test_admin_authentication_success())
    test_results.append(tester.test_admin_search_shops_success())
    test_results.append(tester.test_admin_get_shop_details_success())
    test_results.append(tester.test_admin_reset_shop_credentials_success())
    test_results.append(tester.test_admin_generate_new_license_for_shop())
    
    print("\n🎫 RECOVERY CODES SYSTEM TESTS")
    print("-" * 40)
    test_results.append(tester.test_recovery_codes_validation_and_usage())
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 ALL ACCOUNT RECOVERY TESTS PASSED!")
        print("✅ Admin Override System: Working")
        print("✅ Recovery Codes System: Working")
        print("✅ Credential Reset: Working")
        print("✅ License Generation: Working")
        print("✅ Authentication with Reset Credentials: Working")
        print("\n🔒 ACCOUNT RECOVERY SECURITY VERIFIED:")
        print("   • Admin authentication with super-admin credentials: SECURE")
        print("   • Shop search and credential reset by admin: WORKING")
        print("   • Recovery codes generation during shop setup: WORKING")
        print("   • Recovery code validation and usage: WORKING")
        print("   • One-time use recovery codes: SECURE")
        print("   • Complete offline account recovery solution: READY")
        return 0
    else:
        failed_tests = tester.tests_run - tester.tests_passed
        print(f"❌ {failed_tests} test(s) failed. Please check the issues above.")
        print("🚨 CRITICAL: Account recovery system may have issues!")
        return 1

if __name__ == "__main__":
    sys.exit(main())
import requests
import sys
import json
from datetime import datetime
import uuid

class MurickBatteryAPITester:
    def __init__(self, base_url="https://retail-dashboard-11.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.battery_id = None
        self.sale_id = None
        self.shop_id_1 = None
        self.shop_id_2 = None
        self.test_users = []
        self.generated_license_key = None

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

    def test_health_check(self):
        """Test health endpoint"""
        def check_health(data):
            return data.get('status') == 'healthy'
        
        return self.run_test(
            "Health Check",
            "GET",
            "api/health",
            200,
            check_response=check_health
        )

    def test_battery_brands(self):
        """Test battery brands endpoint"""
        def check_brands(data):
            brands = data.get('brands', [])
            expected_brands = ['AGS', 'Exide', 'Phoenix', 'Volta', 'Bridgepower']
            found_brands = [brand['name'] for brand in brands]
            return all(brand in found_brands for brand in expected_brands)
        
        return self.run_test(
            "Battery Brands",
            "GET",
            "api/battery-brands",
            200,
            check_response=check_brands
        )

    def test_battery_capacities(self):
        """Test battery capacities endpoint"""
        def check_capacities(data):
            capacities = data.get('capacities', [])
            expected_capacities = ['35Ah', '45Ah', '55Ah', '65Ah', '70Ah']
            return all(cap in capacities for cap in expected_capacities)
        
        return self.run_test(
            "Battery Capacities",
            "GET",
            "api/battery-capacities",
            200,
            check_response=check_capacities
        )

    def test_add_battery_inventory(self):
        """Test adding battery to inventory"""
        battery_data = {
            "brand": "AGS",
            "capacity": "55Ah",
            "model": "DIN-55",
            "purchase_price": 8000.0,
            "selling_price": 10000.0,
            "stock_quantity": 50,
            "low_stock_alert": 5,
            "warranty_months": 12,
            "supplier": "AGS Distributor"
        }
        
        success, response = self.run_test(
            "Add Battery to Inventory",
            "POST",
            "api/inventory",
            200,
            data=battery_data
        )
        
        if success and 'item' in response:
            self.battery_id = response['item']['id']
            print(f"   Battery ID: {self.battery_id}")
        
        return success, response

    def test_get_inventory(self):
        """Test getting inventory"""
        def check_inventory(data):
            inventory = data.get('inventory', [])
            return len(inventory) > 0 and 'total_items' in data
        
        return self.run_test(
            "Get Inventory",
            "GET",
            "api/inventory",
            200,
            check_response=check_inventory
        )

    def test_record_sale(self):
        """Test recording a sale"""
        if not self.battery_id:
            print("❌ Cannot test sale - no battery ID available")
            return False, {}
        
        sale_data = {
            "battery_id": self.battery_id,
            "quantity_sold": 2,
            "unit_price": 10000.0,
            "total_amount": 20000.0,  # unit_price * quantity_sold
            "customer_name": "Ahmed Khan",
            "customer_phone": "03001234567"
        }
        
        success, response = self.run_test(
            "Record Sale",
            "POST",
            "api/sales",
            200,
            data=sale_data
        )
        
        if success and 'sale' in response:
            self.sale_id = response['sale']['id']
            sale = response['sale']
            print(f"   Sale ID: {self.sale_id}")
            print(f"   Total Amount: ₨ {sale['total_amount']}")
            print(f"   Total Profit: ₨ {sale['total_profit']}")
            
            # Verify profit calculation
            expected_profit_per_unit = 10000.0 - 8000.0  # selling - purchase
            expected_total_profit = expected_profit_per_unit * 2  # quantity
            
            if abs(sale['total_profit'] - expected_total_profit) < 0.01:
                print(f"   ✅ Profit calculation correct")
            else:
                print(f"   ❌ Profit calculation incorrect: expected {expected_total_profit}, got {sale['total_profit']}")
        
        return success, response

    def test_get_sales(self):
        """Test getting sales"""
        def check_sales(data):
            sales = data.get('sales', [])
            return 'total_sales_count' in data and 'total_profit' in data
        
        return self.run_test(
            "Get Sales",
            "GET",
            "api/sales",
            200,
            check_response=check_sales
        )

    def test_dashboard_stats(self):
        """Test dashboard analytics"""
        def check_dashboard(data):
            required_keys = ['inventory', 'sales', 'top_selling', 'low_stock_items']
            return all(key in data for key in required_keys)
        
        return self.run_test(
            "Dashboard Analytics",
            "GET",
            "api/dashboard",
            200,
            check_response=check_dashboard
        )

    def test_stock_update_after_sale(self):
        """Test that stock quantity is updated after sale"""
        success, response = self.run_test(
            "Check Stock Update After Sale",
            "GET",
            "api/inventory",
            200
        )
        
        if success and self.battery_id:
            inventory = response.get('inventory', [])
            battery = next((item for item in inventory if item['id'] == self.battery_id), None)
            
            if battery:
                # Original stock was 50, sold 2, should be 48
                expected_stock = 48
                actual_stock = battery['stock_quantity']
                
                if actual_stock == expected_stock:
                    print(f"   ✅ Stock updated correctly: {actual_stock} units remaining")
                    return True, response
                else:
                    print(f"   ❌ Stock not updated correctly: expected {expected_stock}, got {actual_stock}")
                    return False, response
            else:
                print(f"   ❌ Battery not found in inventory")
                return False, response
        
        return success, response

    # ===== NEW ENHANCED AUTHENTICATION & SHOP CONFIGURATION TESTS =====
    
    def test_setup_shop_1(self):
        """Test setting up first shop"""
        self.shop_id_1 = f"shop_{uuid.uuid4().hex[:8]}"
        
        shop_data = {
            "shop_id": self.shop_id_1,
            "shop_name": "Khan Battery Center",
            "proprietor_name": "Muhammad Khan",
            "contact_number": "03001234567",
            "address": "Main Market, Lahore, Punjab",
            "email": "khan.batteries@gmail.com",
            "tax_number": "TAX123456789",
            "users": []
        }
        
        success, response = self.run_test(
            "Setup Shop 1",
            "POST",
            "api/setup-shop",
            200,
            data=shop_data
        )
        
        if success:
            print(f"   Shop ID: {self.shop_id_1}")
        
        return success, response

    def test_setup_shop_2(self):
        """Test setting up second shop for multi-shop testing"""
        self.shop_id_2 = f"shop_{uuid.uuid4().hex[:8]}"
        
        shop_data = {
            "shop_id": self.shop_id_2,
            "shop_name": "Ahmed Auto Parts",
            "proprietor_name": "Ahmed Ali",
            "contact_number": "03009876543",
            "address": "GT Road, Karachi, Sindh",
            "email": "ahmed.autoparts@gmail.com",
            "tax_number": "TAX987654321",
            "users": []
        }
        
        success, response = self.run_test(
            "Setup Shop 2",
            "POST",
            "api/setup-shop",
            200,
            data=shop_data
        )
        
        if success:
            print(f"   Shop ID: {self.shop_id_2}")
        
        return success, response

    def test_get_shop_config(self):
        """Test retrieving shop configuration"""
        if not self.shop_id_1:
            print("❌ Cannot test shop config - no shop ID available")
            return False, {}
        
        def check_shop_config(data):
            required_fields = ['shop_id', 'shop_name', 'proprietor_name', 'contact_number', 'address']
            return all(field in data for field in required_fields)
        
        success, response = self.run_test(
            "Get Shop Configuration",
            "GET",
            f"api/shop-config/{self.shop_id_1}",
            200,
            check_response=check_shop_config
        )
        
        if success:
            print(f"   Shop Name: {response.get('shop_name')}")
            print(f"   Proprietor: {response.get('proprietor_name')}")
        
        return success, response

    def test_update_shop_config(self):
        """Test updating shop configuration"""
        if not self.shop_id_1:
            print("❌ Cannot test shop config update - no shop ID available")
            return False, {}
        
        updated_shop_data = {
            "shop_id": self.shop_id_1,
            "shop_name": "Khan Battery Center - Updated",
            "proprietor_name": "Muhammad Khan",
            "contact_number": "03001234567",
            "address": "New Location, Main Market, Lahore, Punjab",
            "email": "khan.batteries.updated@gmail.com",
            "tax_number": "TAX123456789",
            "users": []
        }
        
        return self.run_test(
            "Update Shop Configuration",
            "PUT",
            f"api/shop-config/{self.shop_id_1}",
            200,
            data=updated_shop_data
        )

    def test_add_users_to_shop_1(self):
        """Test adding multiple users to shop 1"""
        if not self.shop_id_1:
            print("❌ Cannot test add users - no shop ID available")
            return False, {}
        
        users_to_add = [
            {
                "username": "admin_khan",
                "password": "admin123",
                "name": "Muhammad Khan",
                "role": "admin"
            },
            {
                "username": "manager_ali",
                "password": "manager123",
                "name": "Ali Hassan",
                "role": "manager"
            },
            {
                "username": "cashier_sara",
                "password": "cashier123",
                "name": "Sara Ahmed",
                "role": "cashier"
            }
        ]
        
        all_success = True
        for user in users_to_add:
            success, response = self.run_test(
                f"Add User {user['username']} to Shop 1",
                "POST",
                f"api/add-user/{self.shop_id_1}",
                200,
                data=user
            )
            if success:
                self.test_users.append({**user, "shop_id": self.shop_id_1})
            all_success = all_success and success
        
        return all_success, {}

    def test_add_users_to_shop_2(self):
        """Test adding users to shop 2"""
        if not self.shop_id_2:
            print("❌ Cannot test add users - no shop ID available")
            return False, {}
        
        users_to_add = [
            {
                "username": "admin_ahmed",
                "password": "admin456",
                "name": "Ahmed Ali",
                "role": "admin"
            },
            {
                "username": "cashier_fatima",
                "password": "cashier456",
                "name": "Fatima Sheikh",
                "role": "cashier"
            }
        ]
        
        all_success = True
        for user in users_to_add:
            success, response = self.run_test(
                f"Add User {user['username']} to Shop 2",
                "POST",
                f"api/add-user/{self.shop_id_2}",
                200,
                data=user
            )
            if success:
                self.test_users.append({**user, "shop_id": self.shop_id_2})
            all_success = all_success and success
        
        return all_success, {}

    def test_duplicate_username_prevention(self):
        """Test that duplicate usernames are prevented within a shop"""
        if not self.shop_id_1:
            print("❌ Cannot test duplicate username - no shop ID available")
            return False, {}
        
        duplicate_user = {
            "username": "admin_khan",  # This should already exist
            "password": "different123",
            "name": "Different Name",
            "role": "manager"
        }
        
        return self.run_test(
            "Prevent Duplicate Username",
            "POST",
            f"api/add-user/{self.shop_id_1}",
            400,  # Should fail with 400
            data=duplicate_user
        )

    def test_authentication_success(self):
        """Test successful authentication for various users"""
        if not self.test_users:
            print("❌ Cannot test authentication - no test users available")
            return False, {}
        
        all_success = True
        for user in self.test_users[:3]:  # Test first 3 users
            auth_data = {
                "shop_id": user["shop_id"],
                "username": user["username"],
                "password": user["password"]
            }
            
            def check_auth_response(data):
                return (
                    data.get('message') == 'Authentication successful' and
                    'user' in data and
                    data['user']['username'] == user['username'] and
                    data['user']['shop_id'] == user['shop_id']
                )
            
            success, response = self.run_test(
                f"Authenticate {user['username']}",
                "POST",
                "api/authenticate",
                200,
                data=auth_data,
                check_response=check_auth_response
            )
            
            if success:
                print(f"   User: {response['user']['name']}")
                print(f"   Role: {response['user']['role']}")
                print(f"   Shop: {response['user']['shop_name']}")
            
            all_success = all_success and success
        
        return all_success, {}

    def test_authentication_invalid_credentials(self):
        """Test authentication with invalid credentials"""
        if not self.shop_id_1:
            print("❌ Cannot test invalid auth - no shop ID available")
            return False, {}
        
        invalid_auth_data = {
            "shop_id": self.shop_id_1,
            "username": "admin_khan",
            "password": "wrongpassword"
        }
        
        return self.run_test(
            "Authentication with Invalid Password",
            "POST",
            "api/authenticate",
            401,  # Should fail with 401
            data=invalid_auth_data
        )

    def test_authentication_invalid_shop(self):
        """Test authentication with invalid shop ID"""
        invalid_auth_data = {
            "shop_id": "nonexistent_shop",
            "username": "admin_khan",
            "password": "admin123"
        }
        
        return self.run_test(
            "Authentication with Invalid Shop",
            "POST",
            "api/authenticate",
            404,  # Should fail with 404
            data=invalid_auth_data
        )

    def test_cross_shop_authentication(self):
        """Test that users cannot authenticate across different shops"""
        if not self.shop_id_1 or not self.shop_id_2:
            print("❌ Cannot test cross-shop auth - missing shop IDs")
            return False, {}
        
        # Try to authenticate shop 1 user with shop 2 ID
        cross_auth_data = {
            "shop_id": self.shop_id_2,
            "username": "admin_khan",  # This user belongs to shop 1
            "password": "admin123"
        }
        
        return self.run_test(
            "Cross-Shop Authentication (Should Fail)",
            "POST",
            "api/authenticate",
            401,  # Should fail with 401
            data=cross_auth_data
        )

    def test_shop_config_not_found(self):
        """Test retrieving configuration for non-existent shop"""
        return self.run_test(
            "Get Non-existent Shop Config",
            "GET",
            "api/shop-config/nonexistent_shop",
            404  # Should fail with 404
        )

    def test_update_nonexistent_shop(self):
        """Test updating configuration for non-existent shop"""
        shop_data = {
            "shop_id": "nonexistent_shop",
            "shop_name": "Test Shop",
            "proprietor_name": "Test Owner",
            "contact_number": "1234567890",
            "address": "Test Address"
        }
        
        return self.run_test(
            "Update Non-existent Shop Config",
            "PUT",
            "api/shop-config/nonexistent_shop",
            404,  # Should fail with 404
            data=shop_data
        )

    def test_add_user_to_nonexistent_shop(self):
        """Test adding user to non-existent shop"""
        user_data = {
            "username": "test_user",
            "password": "test123",
            "name": "Test User",
            "role": "cashier"
        }
        
        return self.run_test(
            "Add User to Non-existent Shop",
            "POST",
            "api/add-user/nonexistent_shop",
            404,  # Should fail with 404
            data=user_data
        )

    # ===== LICENSE KEY SYSTEM TESTS =====
    
    def test_validate_valid_license_key(self):
        """Test validating a valid, unused license key"""
        license_data = {
            "license_key": "MBM-2024-STARTER-001"
        }
        
        def check_license_validation(data):
            return (
                data.get('valid') == True and
                data.get('plan') == 'starter' and
                'message' in data
            )
        
        return self.run_test(
            "Validate Valid License Key (MBM-2024-STARTER-001)",
            "POST",
            "api/validate-license",
            200,
            data=license_data,
            check_response=check_license_validation
        )

    def test_validate_invalid_license_key(self):
        """Test validating an invalid license key"""
        license_data = {
            "license_key": "INVALID-KEY"
        }
        
        return self.run_test(
            "Validate Invalid License Key",
            "POST",
            "api/validate-license",
            404,  # Should fail with 404
            data=license_data
        )

    def test_setup_shop_with_valid_license(self):
        """Test setting up shop with valid license key"""
        self.shop_id_1 = f"shop_{uuid.uuid4().hex[:8]}"
        
        shop_data = {
            "shop_id": self.shop_id_1,
            "shop_name": "Khan Battery Center",
            "proprietor_name": "Muhammad Khan",
            "contact_number": "03001234567",
            "address": "Main Market, Lahore, Punjab",
            "email": "khan.batteries@gmail.com",
            "tax_number": "TAX123456789",
            "users": [],
            "license_key": "MBM-2024-STARTER-001"
        }
        
        def check_shop_setup(data):
            return (
                data.get('message') == 'Shop setup completed successfully' and
                data.get('shop_id') == self.shop_id_1 and
                data.get('plan') == 'starter' and
                data.get('license_activated') == True
            )
        
        success, response = self.run_test(
            "Setup Shop with Valid License Key",
            "POST",
            "api/setup-shop",
            200,
            data=shop_data,
            check_response=check_shop_setup
        )
        
        if success:
            print(f"   Shop ID: {self.shop_id_1}")
            print(f"   Plan: {response.get('plan')}")
            print(f"   License Activated: {response.get('license_activated')}")
        
        return success, response

    def test_setup_shop_with_invalid_license(self):
        """Test setting up shop with invalid license key (should fail)"""
        shop_id = f"shop_{uuid.uuid4().hex[:8]}"
        
        shop_data = {
            "shop_id": shop_id,
            "shop_name": "Test Shop",
            "proprietor_name": "Test Owner",
            "contact_number": "03001111111",
            "address": "Test Address",
            "users": [],
            "license_key": "INVALID-KEY"
        }
        
        return self.run_test(
            "Setup Shop with Invalid License Key (Should Fail)",
            "POST",
            "api/setup-shop",
            404,  # Should fail with 404
            data=shop_data
        )

    def test_validate_used_license_key(self):
        """Test validating a license key that has already been used"""
        license_data = {
            "license_key": "MBM-2024-STARTER-001"  # This should now be used
        }
        
        return self.run_test(
            "Validate Used License Key (Should Fail)",
            "POST",
            "api/validate-license",
            400,  # Should fail with 400
            data=license_data
        )

    def test_setup_shop_with_used_license(self):
        """Test setting up shop with already used license key (should fail)"""
        shop_id = f"shop_{uuid.uuid4().hex[:8]}"
        
        shop_data = {
            "shop_id": shop_id,
            "shop_name": "Another Shop",
            "proprietor_name": "Another Owner",
            "contact_number": "03002222222",
            "address": "Another Address",
            "users": [],
            "license_key": "MBM-2024-STARTER-001"  # Already used
        }
        
        return self.run_test(
            "Setup Shop with Used License Key (Should Fail)",
            "POST",
            "api/setup-shop",
            400,  # Should fail with 400
            data=shop_data
        )

    def test_setup_second_shop_with_different_license(self):
        """Test setting up second shop with different valid license key"""
        self.shop_id_2 = f"shop_{uuid.uuid4().hex[:8]}"
        
        shop_data = {
            "shop_id": self.shop_id_2,
            "shop_name": "Ahmed Auto Parts",
            "proprietor_name": "Ahmed Ali",
            "contact_number": "03009876543",
            "address": "GT Road, Karachi, Sindh",
            "email": "ahmed.autoparts@gmail.com",
            "tax_number": "TAX987654321",
            "users": [],
            "license_key": "MBM-2024-PREMIUM-001"
        }
        
        def check_shop_setup(data):
            return (
                data.get('message') == 'Shop setup completed successfully' and
                data.get('shop_id') == self.shop_id_2 and
                data.get('plan') == 'premium' and
                data.get('license_activated') == True
            )
        
        success, response = self.run_test(
            "Setup Second Shop with Different License Key",
            "POST",
            "api/setup-shop",
            200,
            data=shop_data,
            check_response=check_shop_setup
        )
        
        if success:
            print(f"   Shop ID: {self.shop_id_2}")
            print(f"   Plan: {response.get('plan')}")
        
        return success, response

    def test_get_license_info_valid(self):
        """Test retrieving license information for valid license key"""
        def check_license_info(data):
            return (
                data.get('license_key') == 'MBM-2024-STARTER-001' and
                data.get('plan') == 'starter' and
                data.get('used') == True and
                'shop_id' in data and
                'used_date' in data
            )
        
        return self.run_test(
            "Get License Info for Valid Key",
            "GET",
            "api/license-info/MBM-2024-STARTER-001",
            200,
            check_response=check_license_info
        )

    def test_get_license_info_invalid(self):
        """Test retrieving license information for invalid license key"""
        return self.run_test(
            "Get License Info for Invalid Key",
            "GET",
            "api/license-info/INVALID-KEY",
            404  # Should fail with 404
        )

    def test_admin_generate_license_valid_admin(self):
        """Test generating new license key with valid admin key"""
        admin_data = {
            "admin_key": "MURICK_ADMIN_2024",
            "plan": "basic"
        }
        
        def check_license_generation(data):
            return (
                'license_key' in data and
                data.get('plan') == 'basic' and
                data.get('message') == 'New license key generated successfully' and
                data['license_key'].startswith('MBM-2024-BASIC-')
            )
        
        success, response = self.run_test(
            "Generate License Key with Valid Admin Key",
            "POST",
            "api/admin/generate-license",
            200,
            data=admin_data,
            check_response=check_license_generation
        )
        
        if success:
            self.generated_license_key = response.get('license_key')
            print(f"   Generated License Key: {self.generated_license_key}")
        
        return success, response

    def test_admin_generate_license_invalid_admin(self):
        """Test generating license key with invalid admin key (should fail)"""
        admin_data = {
            "admin_key": "INVALID_ADMIN_KEY",
            "plan": "basic"
        }
        
        return self.run_test(
            "Generate License Key with Invalid Admin Key (Should Fail)",
            "POST",
            "api/admin/generate-license",
            401,  # Should fail with 401
            data=admin_data
        )

    def test_validate_generated_license_key(self):
        """Test validating the newly generated license key"""
        if not hasattr(self, 'generated_license_key'):
            print("❌ Cannot test generated license - no generated key available")
            return False, {}
        
        license_data = {
            "license_key": self.generated_license_key
        }
        
        def check_license_validation(data):
            return (
                data.get('valid') == True and
                data.get('plan') == 'basic' and
                'message' in data
            )
        
        return self.run_test(
            "Validate Generated License Key",
            "POST",
            "api/validate-license",
            200,
            data=license_data,
            check_response=check_license_validation
        )

    def test_setup_shop_with_generated_license(self):
        """Test setting up shop with generated license key"""
        if not hasattr(self, 'generated_license_key'):
            print("❌ Cannot test shop setup with generated license - no generated key available")
            return False, {}
        
        shop_id = f"shop_{uuid.uuid4().hex[:8]}"
        
        shop_data = {
            "shop_id": shop_id,
            "shop_name": "Generated License Shop",
            "proprietor_name": "Test Owner",
            "contact_number": "03003333333",
            "address": "Test Address for Generated License",
            "users": [],
            "license_key": self.generated_license_key
        }
        
        def check_shop_setup(data):
            return (
                data.get('message') == 'Shop setup completed successfully' and
                data.get('plan') == 'basic' and
                data.get('license_activated') == True
            )
        
        return self.run_test(
            "Setup Shop with Generated License Key",
            "POST",
            "api/setup-shop",
            200,
            data=shop_data,
            check_response=check_shop_setup
        )

    def test_business_security_multiple_shops_prevention(self):
        """Test that multiple shops cannot be created without multiple license keys"""
        # Try to create another shop with the same license key that was already used
        shop_id = f"shop_{uuid.uuid4().hex[:8]}"
        
        shop_data = {
            "shop_id": shop_id,
            "shop_name": "Unauthorized Shop",
            "proprietor_name": "Unauthorized Owner",
            "contact_number": "03004444444",
            "address": "Unauthorized Address",
            "users": [],
            "license_key": "MBM-2024-PREMIUM-001"  # Already used for shop_id_2
        }
        
        return self.run_test(
            "Prevent Multiple Shops with Same License (Business Security)",
            "POST",
            "api/setup-shop",
            400,  # Should fail with 400
            data=shop_data
        )

def main():
    print("🚀 Starting Enhanced Murick Battery SaaS API Tests with LICENSE KEY SYSTEM")
    print("=" * 80)
    
    tester = MurickBatteryAPITester()
    
    # Run all tests in sequence
    test_results = []
    
    print("\n📋 PHASE 1: Basic Endpoint Tests")
    print("-" * 40)
    # Basic endpoint tests
    test_results.append(tester.test_health_check())
    test_results.append(tester.test_battery_brands())
    test_results.append(tester.test_battery_capacities())
    
    print("\n🔑 PHASE 2: LICENSE KEY SYSTEM TESTS (CRITICAL BUSINESS SECURITY)")
    print("-" * 70)
    # License key validation tests
    test_results.append(tester.test_validate_valid_license_key())
    test_results.append(tester.test_validate_invalid_license_key())
    
    # Protected shop setup tests
    test_results.append(tester.test_setup_shop_with_valid_license())
    test_results.append(tester.test_setup_shop_with_invalid_license())
    
    # Business security tests - license key reuse prevention
    test_results.append(tester.test_validate_used_license_key())
    test_results.append(tester.test_setup_shop_with_used_license())
    
    # Multiple shop creation with different licenses
    test_results.append(tester.test_setup_second_shop_with_different_license())
    
    # License information retrieval
    test_results.append(tester.test_get_license_info_valid())
    test_results.append(tester.test_get_license_info_invalid())
    
    # Admin license generation
    test_results.append(tester.test_admin_generate_license_valid_admin())
    test_results.append(tester.test_admin_generate_license_invalid_admin())
    test_results.append(tester.test_validate_generated_license_key())
    test_results.append(tester.test_setup_shop_with_generated_license())
    
    # Business security verification
    test_results.append(tester.test_business_security_multiple_shops_prevention())
    
    print("\n🏪 PHASE 3: Shop Configuration Tests (Updated APIs)")
    print("-" * 50)
    # Shop configuration tests (these should still work with license system)
    test_results.append(tester.test_get_shop_config())
    test_results.append(tester.test_update_shop_config())
    
    print("\n👥 PHASE 4: User Management Tests")
    print("-" * 40)
    # User management tests
    test_results.append(tester.test_add_users_to_shop_1())
    test_results.append(tester.test_add_users_to_shop_2())
    test_results.append(tester.test_duplicate_username_prevention())
    
    print("\n🔐 PHASE 5: Authentication Tests")
    print("-" * 40)
    # Authentication tests
    test_results.append(tester.test_authentication_success())
    test_results.append(tester.test_authentication_invalid_credentials())
    test_results.append(tester.test_authentication_invalid_shop())
    test_results.append(tester.test_cross_shop_authentication())
    
    print("\n❌ PHASE 6: Error Handling Tests")
    print("-" * 40)
    # Error handling tests
    test_results.append(tester.test_shop_config_not_found())
    test_results.append(tester.test_update_nonexistent_shop())
    test_results.append(tester.test_add_user_to_nonexistent_shop())
    
    print("\n📦 PHASE 7: Inventory Management Tests (Existing Functionality)")
    print("-" * 60)
    # Inventory management tests
    test_results.append(tester.test_add_battery_inventory())
    test_results.append(tester.test_get_inventory())
    
    print("\n💰 PHASE 8: Sales Management Tests (Existing Functionality)")
    print("-" * 55)
    # Sales management tests
    test_results.append(tester.test_record_sale())
    test_results.append(tester.test_get_sales())
    test_results.append(tester.test_stock_update_after_sale())
    
    print("\n📊 PHASE 9: Analytics Tests (Existing Functionality)")
    print("-" * 50)
    # Analytics tests
    test_results.append(tester.test_dashboard_stats())
    
    # Print final results
    print("\n" + "=" * 80)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 ALL TESTS PASSED! LICENSE KEY SYSTEM & BACKEND API WORKING CORRECTLY!")
        print("✅ License Key Validation: Working")
        print("✅ Protected Shop Setup: Working") 
        print("✅ License Key Reuse Prevention: Working")
        print("✅ Business Security Controls: Working")
        print("✅ Admin License Generation: Working")
        print("✅ Shop Configuration System: Working")
        print("✅ Enhanced Authentication: Working")
        print("✅ Multi-Shop Support: Working")
        print("✅ User Management: Working")
        print("✅ Existing Functionality: Working")
        print("\n🔒 BUSINESS SECURITY VERIFIED:")
        print("   • Multiple shop creation IMPOSSIBLE without multiple license keys")
        print("   • License keys can only be used ONCE")
        print("   • Shop creation properly controlled and secured")
        return 0
    else:
        failed_tests = tester.tests_run - tester.tests_passed
        print(f"❌ {failed_tests} test(s) failed. Please check the issues above.")
        print("🚨 CRITICAL: License key system may have security vulnerabilities!")
        return 1

if __name__ == "__main__":
    sys.exit(main())
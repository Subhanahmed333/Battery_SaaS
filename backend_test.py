import requests
import sys
import json
from datetime import datetime
import uuid

class MurickBatteryAPITester:
    def __init__(self, base_url="https://powerstock-offline.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.battery_id = None
        self.sale_id = None
        self.shop_id_1 = None
        self.shop_id_2 = None
        self.test_users = []

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

def main():
    print("🚀 Starting Murick Battery SaaS API Tests")
    print("=" * 50)
    
    tester = MurickBatteryAPITester()
    
    # Run all tests in sequence
    test_results = []
    
    # Basic endpoint tests
    test_results.append(tester.test_health_check())
    test_results.append(tester.test_battery_brands())
    test_results.append(tester.test_battery_capacities())
    
    # Inventory management tests
    test_results.append(tester.test_add_battery_inventory())
    test_results.append(tester.test_get_inventory())
    
    # Sales management tests
    test_results.append(tester.test_record_sale())
    test_results.append(tester.test_get_sales())
    test_results.append(tester.test_stock_update_after_sale())
    
    # Analytics tests
    test_results.append(tester.test_dashboard_stats())
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed! Backend API is working correctly.")
        return 0
    else:
        failed_tests = tester.tests_run - tester.tests_passed
        print(f"❌ {failed_tests} test(s) failed. Please check the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import uuid
from datetime import datetime
import json
from cryptography.fernet import Fernet, InvalidToken
from passlib.context import CryptContext

# Initialize FastAPI app
app = FastAPI(title="Murick Battery SaaS API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- START: NEW PERSISTENCE LOGIC ---

ENCRYPTION_KEY = b'wA3vA_3fPaughp3p4-b63tXyUkhn0C9Xk2l_pA9z3c0='
cipher_suite = Fernet(ENCRYPTION_KEY)

DATA_DIR = "data"
SHOPS_FILE = os.path.join(DATA_DIR, "shops.dat")  # Using .dat extension to hide that it's JSON
LICENSES_FILE = os.path.join(DATA_DIR, "licenses.dat")
RECOVERY_CODES_FILE = os.path.join(DATA_DIR, "recovery_codes.dat")

os.makedirs(DATA_DIR, exist_ok=True)

def load_from_encrypted_file(filename: str) -> dict:
    """Loads and decrypts data from a file, returning empty if it fails."""
    try:
        with open(filename, 'rb') as f:
            encrypted_data = f.read()
        decrypted_data = cipher_suite.decrypt(encrypted_data)
        return json.loads(decrypted_data)
    except (FileNotFoundError, InvalidToken, json.JSONDecodeError):
        return {}

def save_to_encrypted_file(data: dict, filename: str):
    """Serializes, encrypts, and saves data to a file."""
    json_data = json.dumps(data, default=str).encode('utf-8')
    encrypted_data = cipher_suite.encrypt(json_data)
    with open(filename, 'wb') as f:
        f.write(encrypted_data)

# Load persisted data from encrypted files at startup
shop_config_store = load_from_encrypted_file(SHOPS_FILE)
license_keys_store = load_from_encrypted_file(LICENSES_FILE)
recovery_codes_store = load_from_encrypted_file(RECOVERY_CODES_FILE)

# If licenses file is empty, populate with initial keys and save it
if not license_keys_store:
    license_keys_store = {
        "A7X1-ST1-001": {"used": False, "plan": "starter", "created_date": "2024-01-01"},
        "Q9P2-PR2-001": {"used": False, "plan": "premium", "created_date": "2024-01-01"},
        "Z4B8-BC3-001": {"used": False, "plan": "basic", "created_date": "2024-01-01"},
        "M3E5-EN4-001": {"used": False, "plan": "enterprise", "created_date": "2024-01-01"},
        "T1U6-UL5-001": {"used": False, "plan": "ultimate", "created_date": "2024-01-01"},
        "V2H9-ST1-002": {"used": False, "plan": "starter", "created_date": "2024-01-01"},
        "R8F1-PR2-002": {"used": False, "plan": "premium", "created_date": "2024-01-01"},
        "W5K3-BC3-002": {"used": False, "plan": "basic", "created_date": "2024-01-01"},
        "N7L4-EN4-002": {"used": False, "plan": "enterprise", "created_date": "2024-01-01"},
        "X3M2-UL5-002": {"used": False, "plan": "ultimate", "created_date": "2024-01-01"},
        "Y9A7-ST1-003": {"used": False, "plan": "starter", "created_date": "2024-01-01"},
        "H4D2-PR2-003": {"used": False, "plan": "premium", "created_date": "2024-01-01"},
        "J1C9-BC3-003": {"used": False, "plan": "basic", "created_date": "2024-01-01"},
        "F6Q8-EN4-003": {"used": False, "plan": "enterprise", "created_date": "2024-01-01"},
        "K2P5-UL5-003": {"used": False, "plan": "ultimate", "created_date": "2024-01-01"},
        "L8S3-ST1-004": {"used": False, "plan": "starter", "created_date": "2024-01-01"},
        "P1T6-PR2-004": {"used": False, "plan": "premium", "created_date": "2024-01-01"},
        "Q3B7-BC3-004": {"used": False, "plan": "basic", "created_date": "2024-01-01"},
    }
    save_to_encrypted_file(license_keys_store, LICENSES_FILE)

# --- END: NEW PERSISTENCE LOGIC ---


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

# In-memory storage for MVP (replace with Firebase/MongoDB later)
inventory_store = {}
sales_store = {}
user_store = {}

# Admin accounts are static and don't need to be saved to a file.
admin_accounts_store = {
    "MURICK_ADMIN_2024": {
        "username": "murick_admin", 
        "password": "MurickAdmin@2024", 
        "name": "Murick System Administrator",
        "role": "super_admin",
        "created_date": "2024-01-01"
    }
}

# Static data (doesn't change)
BATTERY_BRANDS = [
    {"id": "ags", "name": "AGS", "popular": True},
    {"id": "exide", "name": "Exide", "popular": True},
    {"id": "phoenix", "name": "Phoenix", "popular": True},
    {"id": "volta", "name": "Volta", "popular": True},
    {"id": "bridgepower", "name": "Bridgepower", "popular": True},
    {"id": "osaka", "name": "Osaka", "popular": False},
    {"id": "crown", "name": "Crown", "popular": False}
]
BATTERY_CAPACITIES = ["35Ah", "45Ah", "55Ah", "65Ah", "70Ah", "80Ah", "100Ah", "120Ah", "135Ah", "150Ah", "180Ah", "200Ah"]

# --- Pydantic Data Models ---
class BatteryItem(BaseModel):
    id: Optional[str] = None
    brand: str
    capacity: str
    model: str
    purchase_price: float
    selling_price: float
    stock_quantity: int
    low_stock_alert: int = 5
    warranty_months: int = 12
    supplier: Optional[str] = None
    date_added: Optional[datetime] = None

class SaleTransaction(BaseModel):
    id: Optional[str] = None
    battery_id: str
    quantity_sold: int
    unit_price: float
    total_amount: float
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    warranty_end_date: Optional[datetime] = None
    sale_date: Optional[datetime] = None
    profit_per_unit: float = 0
    total_profit: float = 0

class User(BaseModel):
    uid: str
    email: str
    name: str
    shop_name: str
    role: str = "owner"

class ShopConfig(BaseModel):
    shop_id: str
    shop_name: str
    proprietor_name: str
    contact_number: str
    address: str
    email: Optional[str] = None
    tax_number: Optional[str] = None
    users: List[dict] = []
    license_key: str
    created_date: Optional[datetime] = None

class LicenseValidation(BaseModel):
    license_key: str

class AuthRequest(BaseModel):
    shop_id: str
    username: str
    password: str

class AdminAuthRequest(BaseModel):
    admin_key: str
    username: str
    password: str

class ShopSearchRequest(BaseModel):
    admin_key: str
    username: str
    password: str
    search_term: str

class ShopRecoveryRequest(BaseModel):
    admin_key: str
    username: str
    password: str
    shop_id: str
    new_username: str
    new_password: str
    target_user: str

class RecoveryCodeRequest(BaseModel):
    recovery_code: str
    shop_id: str
    new_username: str
    new_password: str
    target_user: str

# API Endpoints

@app.get("/api/health")
async def health():
    return {"status": "healthy", "message": "Murick Battery SaaS API is running"}

# License Key Management
@app.post("/api/validate-license")
async def validate_license_key(license_data: LicenseValidation):
    license_key = license_data.license_key
    if license_key not in license_keys_store:
        raise HTTPException(status_code=404, detail="Invalid license key")
    license_info = license_keys_store[license_key]
    if license_info["used"]:
        raise HTTPException(status_code=400, detail="License key has already been used")
    return {"valid": True, "plan": license_info["plan"], "message": "License key is valid and available"}

# Shop Configuration Management
@app.post("/api/setup-shop")
async def setup_shop(shop_config: ShopConfig):
    # 1. Validate the license key
    license_key = shop_config.license_key
    if license_key not in license_keys_store:
        raise HTTPException(status_code=404, detail="Invalid license key")
    license_info = license_keys_store[license_key]
    if license_info["used"]:
        raise HTTPException(status_code=400, detail="License key has already been used")
    
    # 2. Mark license as used and save the encrypted file
    license_keys_store[license_key]["used"] = True
    license_keys_store[license_key]["used_date"] = datetime.now().isoformat()
    license_keys_store[license_key]["shop_id"] = shop_config.shop_id
    save_to_encrypted_file(license_keys_store, LICENSES_FILE)
    
    # 3. Generate recovery codes and save the encrypted file
    import secrets
    recovery_codes = []
    for i in range(5):
        code = f"REC-{secrets.token_hex(4).upper()}-{secrets.token_hex(4).upper()}"
        recovery_codes.append(code)
        recovery_codes_store[code] = {"shop_id": shop_config.shop_id, "used": False, "generated_date": datetime.now().isoformat()}
    save_to_encrypted_file(recovery_codes_store, RECOVERY_CODES_FILE)
    
    # 4. Prepare the shop data dictionary
    shop_config.created_date = datetime.now()
    shop_config_dict = shop_config.dict()
    shop_config_dict["recovery_codes"] = recovery_codes

    # 5. Hash the user passwords within the dictionary BEFORE saving
    if "users" in shop_config_dict and shop_config_dict["users"]:
        for user in shop_config_dict["users"]:
            if "password" in user and user["password"]: # Check that password is not empty
                user["password"] = get_password_hash(user["password"])
    
    # 6. Save the final, secured shop configuration to the encrypted file
    shop_config_store[shop_config.shop_id] = shop_config_dict
    save_to_encrypted_file(shop_config_store, SHOPS_FILE)
    
    return {
        "message": "Shop setup completed successfully", 
        "shop_id": shop_config.shop_id, 
        "plan": license_info["plan"], 
        "license_activated": True, 
        "recovery_codes": recovery_codes
    }
    
@app.get("/api/shop-config/{shop_id}")
async def get_shop_config(shop_id: str):
    if shop_id not in shop_config_store:
        raise HTTPException(status_code=404, detail="Shop not found")
    return shop_config_store[shop_id]

@app.put("/api/shop-config/{shop_id}")
async def update_shop_config(shop_id: str, shop_config: ShopConfig):
    if shop_id not in shop_config_store:
        raise HTTPException(status_code=404, detail="Shop not found")
    
    original_config = shop_config_store[shop_id]
    updated_data = shop_config.dict()
    
    # Ensure critical data is not overwritten
    updated_data["shop_id"] = shop_id
    updated_data["created_date"] = original_config.get("created_date")
    updated_data["license_key"] = original_config.get("license_key")
    # IMPORTANT: Also preserve user passwords if they are not being changed
    updated_data["users"] = original_config.get("users", []) 
    
    shop_config_store[shop_id] = updated_data
    save_to_encrypted_file(shop_config_store, SHOPS_FILE) # <-- CORRECTED
    return {"message": "Shop configuration updated successfully"}

@app.post("/api/authenticate")
async def authenticate_user(auth_request: AuthRequest):
    shop_id = auth_request.shop_id
    username = auth_request.username
    password = auth_request.password
    
    if shop_id not in shop_config_store:
        raise HTTPException(status_code=404, detail="Shop not found")
    
    shop_config = shop_config_store[shop_id]
    
    for user in shop_config.get("users", []):
        if user["username"] == username:
            # IMPORTANT: Use verify_password, not a simple == check
            if verify_password(password, user["password"]):
                return { "message": "Authentication successful", "user": {"username": user["username"], "name": user["name"]} }
            else:
                # Password was wrong for this user
                raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # User was not found
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.get("/api/license-info/{license_key}")
async def get_license_info(license_key: str):
    if license_key not in license_keys_store:
        raise HTTPException(status_code=404, detail="License key not found")
    
    license_info = license_keys_store[license_key]
    return {
        "license_key": license_key,
        "plan": license_info["plan"],
        "used": license_info["used"],
        "created_date": license_info["created_date"],
        "used_date": license_info.get("used_date"),
        "shop_id": license_info.get("shop_id")
    }

# Admin endpoint to generate new license keys (for business owners)
@app.post("/api/admin/generate-license")
async def generate_license_key(admin_data: dict):
    # In production, add proper admin authentication here
    admin_key = admin_data.get("admin_key")
    plan = admin_data.get("plan", "basic")
    
    # Simple admin key check (in production, use proper authentication)
    if admin_key != "MURICK_ADMIN_2024":
        raise HTTPException(status_code=401, detail="Unauthorized admin access")
    
    # Generate unique license key
    import secrets
    license_key = f"MBM-{datetime.now().year}-{plan.upper()}-{secrets.token_hex(3).upper()}"
    
    license_keys_store[license_key] = {
        "used": False,
        "plan": plan,
        "created_date": datetime.now().isoformat()
    }
    
    return {
        "license_key": license_key,
        "plan": plan,
        "message": "New license key generated successfully"
    }

@app.post("/api/admin/authenticate")
async def authenticate_admin(auth_request: AdminAuthRequest):
    admin_key = auth_request.admin_key
    username = auth_request.username
    password = auth_request.password
    if admin_key not in admin_accounts_store:
        raise HTTPException(status_code=401, detail="Invalid admin key")
    admin_account = admin_accounts_store[admin_key]
    if admin_account["username"] != username or admin_account["password"] != password:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    return {"message": "Admin authentication successful", "admin": {"username": admin_account["username"], "name": admin_account["name"], "role": admin_account["role"]}}

@app.post("/api/add-user/{shop_id}")
async def add_user_to_shop(shop_id: str, user_data: dict):
    if shop_id not in shop_config_store:
        raise HTTPException(status_code=404, detail="Shop not found")
    
    shop_config = shop_config_store[shop_id]
    
    # Check if username already exists
    for existing_user in shop_config.get("users", []):
        if existing_user["username"] == user_data["username"]:
            raise HTTPException(status_code=400, detail="Username already exists")
    
    if "users" not in shop_config:
        shop_config["users"] = []
    
    shop_config["users"].append(user_data)
    shop_config_store[shop_id] = shop_config
    
    return {"message": "User added successfully"}




# ===== ADMIN OVERRIDE SYSTEM FOR ACCOUNT RECOVERY =====

@app.post("/api/admin/authenticate")
async def authenticate_admin(auth_request: AdminAuthRequest):
    """Admin authentication for account recovery operations"""
    admin_key = auth_request.admin_key
    username = auth_request.username
    password = auth_request.password
    
    if admin_key not in admin_accounts_store:
        raise HTTPException(status_code=401, detail="Invalid admin key")
    
    admin_account = admin_accounts_store[admin_key]
    
    if admin_account["username"] != username or admin_account["password"] != password:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    
    return {
        "message": "Admin authentication successful",
        "admin": {
            "username": admin_account["username"],
            "name": admin_account["name"],
            "role": admin_account["role"]
        }
    }

@app.post("/api/admin/search-shops")
async def search_shops_for_recovery(search_request: ShopSearchRequest):
    try:
        await authenticate_admin(AdminAuthRequest(admin_key=search_request.admin_key, username=search_request.username, password=search_request.password))
    except HTTPException:
        raise HTTPException(status_code=401, detail="Admin authentication failed")
    
    search_term = search_request.search_term.lower()
    matching_shops = []
    
    for shop_id, shop_config in shop_config_store.items():
        searchable_text = f"{shop_config.get('shop_name', '')} {shop_config.get('proprietor_name', '')} {shop_config.get('contact_number', '')} {shop_config.get('address', '')}".lower()
        if search_term in searchable_text or search_term in shop_id.lower():
            matching_shops.append({
                "shop_id": shop_id,
                "shop_name": shop_config.get("shop_name"),
                "proprietor_name": shop_config.get("proprietor_name"),
                "contact_number": shop_config.get("contact_number"),
                "address": shop_config.get("address"),
                "email": shop_config.get("email"),
                "users_count": len(shop_config.get("users", [])),
                "created_date": shop_config.get("created_date")
            })
            
    return {"shops": matching_shops, "total_found": len(matching_shops)}

@app.get("/api/admin/shop-details/{shop_id}")
async def get_shop_details_for_recovery(shop_id: str, admin_key: str, username: str, password: str):
    """Admin endpoint to get complete shop details for recovery"""
    # First authenticate admin
    try:
        await authenticate_admin(AdminAuthRequest(
            admin_key=admin_key,
            username=username,
            password=password
        ))
    except HTTPException:
        raise HTTPException(status_code=401, detail="Admin authentication failed")
    
    if shop_id not in shop_config_store:
        raise HTTPException(status_code=404, detail="Shop not found")
    
    shop_config = shop_config_store[shop_id]
    
    # Return complete shop details for admin
    return {
        "shop_id": shop_id,
        "shop_name": shop_config.get("shop_name"),
        "proprietor_name": shop_config.get("proprietor_name"),
        "contact_number": shop_config.get("contact_number"),
        "address": shop_config.get("address"),
        "email": shop_config.get("email"),
        "license_key": shop_config.get("license_key"),
        "users": shop_config.get("users", []),
        "created_date": shop_config.get("created_date"),
        "recovery_codes_available": len([code for code in shop_config.get("recovery_codes", []) if not recovery_codes_store.get(code, {}).get("used", True)])
    }

@app.post("/api/admin/reset-shop-credentials")
async def reset_shop_credentials(recovery_request: ShopRecoveryRequest):
    # (Admin authentication logic remains the same)
    try:
        await authenticate_admin(AdminAuthRequest(
            admin_key=recovery_request.admin_key, username=recovery_request.username, password=recovery_request.password
        ))
    except HTTPException:
        raise HTTPException(status_code=401, detail="Admin authentication failed")

    shop_id = recovery_request.shop_id
    if shop_id not in shop_config_store:
        raise HTTPException(status_code=404, detail="Shop not found")
    
    shop_config = shop_config_store[shop_id]
    users = shop_config.get("users", [])
    user_found = False

    for i, user in enumerate(users):
        if user["username"] == recovery_request.target_user:
            users[i]["username"] = recovery_request.new_username
            # --- HASH THE NEW PASSWORD ---
            users[i]["password"] = get_password_hash(recovery_request.new_password) # <-- CORRECTED
            user_found = True
            break
            
    if not user_found:
        raise HTTPException(status_code=404, detail="User not found in shop")
    
    shop_config["users"] = users
    shop_config_store[shop_id] = shop_config
    save_to_encrypted_file(shop_config_store, SHOPS_FILE) # <-- CORRECTED
    
    return {"message": "Credentials reset successfully", "new_username": recovery_request.new_username}

@app.post("/api/admin/generate-new-license")
async def generate_new_license_for_shop(admin_data: dict):
    """Admin endpoint to generate new license for existing shop (in case of lost license)"""
    admin_key = admin_data.get("admin_key")
    username = admin_data.get("username")
    password = admin_data.get("password")
    plan = admin_data.get("plan", "basic")
    shop_id = admin_data.get("shop_id")
    
    # Authenticate admin
    try:
        await authenticate_admin(AdminAuthRequest(
            admin_key=admin_key,
            username=username,
            password=password
        ))
    except HTTPException:
        raise HTTPException(status_code=401, detail="Admin authentication failed")
    
    if shop_id and shop_id not in shop_config_store:
        raise HTTPException(status_code=404, detail="Shop not found")
    
    # Generate unique license key
    import secrets
    license_key = f"MBM-{datetime.now().year}-{plan.upper()}-{secrets.token_hex(3).upper()}"
    
    license_keys_store[license_key] = {
        "used": False,
        "plan": plan,
        "created_date": datetime.now().isoformat(),
        "generated_by_admin": True,
        "assigned_to_shop": shop_id if shop_id else None
    }
    
    return {
        "license_key": license_key,
        "plan": plan,
        "message": "New license key generated successfully by admin",
        "assigned_to_shop": shop_id
    }

# ===== RECOVERY CODES SYSTEM =====

@app.post("/api/recovery/use-code")
async def use_recovery_code(recovery_request: RecoveryCodeRequest):
    """Use recovery code to reset shop user credentials"""
    recovery_code = recovery_request.recovery_code
    shop_id = recovery_request.shop_id
    
    # Check if recovery code exists and is valid
    if recovery_code not in recovery_codes_store:
        raise HTTPException(status_code=404, detail="Invalid recovery code")
    
    code_info = recovery_codes_store[recovery_code]
    
    # Check if code is already used
    if code_info["used"]:
        raise HTTPException(status_code=400, detail="Recovery code has already been used")
    
    # Check if code belongs to the shop
    if code_info["shop_id"] != shop_id:
        raise HTTPException(status_code=400, detail="Recovery code does not belong to this shop")
    
    # Check if shop exists
    if shop_id not in shop_config_store:
        raise HTTPException(status_code=404, detail="Shop not found")
    
    shop_config = shop_config_store[recovery_request.shop_id]
    users = shop_config.get("users", [])
    user_found = False

    for i, user in enumerate(users):
        if user["username"] == recovery_request.target_user:
            users[i]["username"] = recovery_request.new_username
            # --- HASH THE NEW PASSWORD ---
            users[i]["password"] = get_password_hash(recovery_request.new_password) # <-- CORRECTED
            user_found = True
            break

    if not user_found:
        raise HTTPException(status_code=404, detail="User not found in shop")

    # Mark code as used and save encrypted
    recovery_codes_store[recovery_request.recovery_code]["used"] = True
    save_to_encrypted_file(recovery_codes_store, RECOVERY_CODES_FILE) # <-- CORRECTED

    # Update shop config and save encrypted
    shop_config["users"] = users
    shop_config_store[recovery_request.shop_id] = shop_config
    save_to_encrypted_file(shop_config_store, SHOPS_FILE) # <-- CORRECTED
    
    return {"message": "Credentials reset successfully", "new_username": recovery_request.new_username}

@app.get("/api/recovery/validate-code/{recovery_code}/{shop_id}")
async def validate_recovery_code(recovery_code: str, shop_id: str):
    """Validate if a recovery code is valid for a shop"""
    if recovery_code not in recovery_codes_store:
        raise HTTPException(status_code=404, detail="Invalid recovery code")
    
    code_info = recovery_codes_store[recovery_code]
    
    if code_info["used"]:
        raise HTTPException(status_code=400, detail="Recovery code has already been used")
    
    if code_info["shop_id"] != shop_id:
        raise HTTPException(status_code=400, detail="Recovery code does not belong to this shop")
    
    return {
        "valid": True,
        "shop_id": shop_id,
        "generated_date": code_info["generated_date"]
    }

# Battery Brands and Capacities
@app.get("/api/battery-brands")
async def get_battery_brands():
    return {"brands": BATTERY_BRANDS}

@app.get("/api/battery-capacities")
async def get_battery_capacities():
    return {"capacities": BATTERY_CAPACITIES}

# Inventory Management
@app.post("/api/inventory")
async def add_battery_item(item: BatteryItem):
    item.id = str(uuid.uuid4())
    item.date_added = datetime.now()
    inventory_store[item.id] = item.dict()
    return {"message": "Battery item added successfully", "item": item}

@app.get("/api/inventory")
async def get_inventory():
    inventory_list = list(inventory_store.values())
    # Calculate low stock items
    low_stock_items = [item for item in inventory_list if item["stock_quantity"] <= item["low_stock_alert"]]
    
    return {
        "inventory": inventory_list,
        "total_items": len(inventory_list),
        "low_stock_items": low_stock_items,
        "low_stock_count": len(low_stock_items)
    }

@app.put("/api/inventory/{item_id}")
async def update_battery_item(item_id: str, item: BatteryItem):
    if item_id not in inventory_store:
        raise HTTPException(status_code=404, detail="Battery item not found")
    
    item.id = item_id
    item.date_added = inventory_store[item_id]["date_added"]
    inventory_store[item_id] = item.dict()
    return {"message": "Battery item updated successfully", "item": item}

@app.delete("/api/inventory/{item_id}")
async def delete_battery_item(item_id: str):
    if item_id not in inventory_store:
        raise HTTPException(status_code=404, detail="Battery item not found")
    
    del inventory_store[item_id]
    return {"message": "Battery item deleted successfully"}

# Sales Management
@app.post("/api/sales")
async def record_sale(sale: SaleTransaction):
    # Check if battery exists and has enough stock
    if sale.battery_id not in inventory_store:
        raise HTTPException(status_code=404, detail="Battery item not found")
    
    battery = inventory_store[sale.battery_id]
    if battery["stock_quantity"] < sale.quantity_sold:
        raise HTTPException(status_code=400, detail="Insufficient stock")
    
    # Calculate profit
    purchase_price = battery["purchase_price"]
    sale.profit_per_unit = sale.unit_price - purchase_price
    sale.total_profit = sale.profit_per_unit * sale.quantity_sold
    
    # Create sale record
    sale.id = str(uuid.uuid4())
    sale.sale_date = datetime.now()
    sale.total_amount = sale.unit_price * sale.quantity_sold
    
    # Calculate warranty end date
    if battery["warranty_months"]:
        from dateutil.relativedelta import relativedelta
        sale.warranty_end_date = datetime.now() + relativedelta(months=battery["warranty_months"])
    
    # Update inventory stock
    inventory_store[sale.battery_id]["stock_quantity"] -= sale.quantity_sold
    
    # Store sale
    sales_store[sale.id] = sale.dict()
    
    return {"message": "Sale recorded successfully", "sale": sale}

@app.get("/api/sales")
async def get_sales():
    sales_list = list(sales_store.values())
    
    # Calculate totals
    total_sales = sum(sale["total_amount"] for sale in sales_list)
    total_profit = sum(sale["total_profit"] for sale in sales_list)
    
    return {
        "sales": sales_list,
        "total_sales_count": len(sales_list),
        "total_sales_amount": total_sales,
        "total_profit": total_profit
    }

# Dashboard Analytics
@app.get("/api/dashboard")
async def get_dashboard_stats():
    inventory_list = list(inventory_store.values())
    sales_list = list(sales_store.values())
    
    # Inventory stats
    total_inventory_items = len(inventory_list)
    total_stock_quantity = sum(item["stock_quantity"] for item in inventory_list)
    low_stock_items = [item for item in inventory_list if item["stock_quantity"] <= item["low_stock_alert"]]
    total_inventory_value = sum(item["stock_quantity"] * item["purchase_price"] for item in inventory_list)
    
    # Sales stats
    total_sales_count = len(sales_list)
    total_sales_amount = sum(sale["total_amount"] for sale in sales_list)
    total_profit = sum(sale["total_profit"] for sale in sales_list)
    
    # Top selling batteries
    battery_sales = {}
    for sale in sales_list:
        battery_id = sale["battery_id"]
        if battery_id in battery_sales:
            battery_sales[battery_id] += sale["quantity_sold"]
        else:
            battery_sales[battery_id] = sale["quantity_sold"]
    
    top_selling = []
    for battery_id, quantity in sorted(battery_sales.items(), key=lambda x: x[1], reverse=True)[:5]:
        if battery_id in inventory_store:
            battery = inventory_store[battery_id]
            top_selling.append({
                "battery": f"{battery['brand']} {battery['capacity']} {battery['model']}",
                "quantity_sold": quantity
            })
    
    return {
        "inventory": {
            "total_items": total_inventory_items,
            "total_stock": total_stock_quantity,
            "low_stock_count": len(low_stock_items),
            "inventory_value": total_inventory_value
        },
        "sales": {
            "total_sales": total_sales_count,
            "total_amount": total_sales_amount,
            "total_profit": total_profit,
            "average_sale": total_sales_amount / total_sales_count if total_sales_count > 0 else 0
        },
        "top_selling": top_selling,
        "low_stock_items": low_stock_items[:5]  # Show top 5 low stock items
    }

# User Management (Basic)
@app.post("/api/users")
async def create_user(user: User):
    user_store[user.uid] = user.dict()
    return {"message": "User created successfully", "user": user}

@app.get("/api/users/{uid}")
async def get_user(uid: str):
    if uid not in user_store:
        raise HTTPException(status_code=404, detail="User not found")
    return user_store[uid]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
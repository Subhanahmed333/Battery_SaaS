from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import uuid
from datetime import datetime
import json

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

# In-memory storage for MVP (replace with Firebase/MongoDB later)
inventory_store = {}
sales_store = {}
user_store = {}

# Pakistani Battery Brands with sample data
BATTERY_BRANDS = [
    {"id": "ags", "name": "AGS", "popular": True},
    {"id": "exide", "name": "Exide", "popular": True},
    {"id": "phoenix", "name": "Phoenix", "popular": True},
    {"id": "volta", "name": "Volta", "popular": True},
    {"id": "bridgepower", "name": "Bridgepower", "popular": True},
    {"id": "osaka", "name": "Osaka", "popular": False},
    {"id": "crown", "name": "Crown", "popular": False}
]

# Common battery capacities in Pakistan market
BATTERY_CAPACITIES = ["35Ah", "45Ah", "55Ah", "65Ah", "70Ah", "80Ah", "100Ah", "120Ah", "135Ah", "150Ah", "180Ah", "200Ah"]

# Data Models
class BatteryItem(BaseModel):
    id: Optional[str] = None
    brand: str
    capacity: str
    model: str
    purchase_price: float  # PKR
    selling_price: float   # PKR
    stock_quantity: int
    low_stock_alert: int = 5
    warranty_months: int = 12
    supplier: Optional[str] = None
    date_added: Optional[datetime] = None

class SaleTransaction(BaseModel):
    id: Optional[str] = None
    battery_id: str
    quantity_sold: int
    unit_price: float  # PKR
    total_amount: float  # PKR
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
    role: str = "owner"  # owner, manager, cashier

# API Endpoints

@app.get("/api/health")
async def health():
    return {"status": "healthy", "message": "Murick Battery SaaS API is running"}

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
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Plus, Package, ShoppingCart, BarChart3, AlertTriangle, Battery, Store, Menu, X, Home, TrendingUp } from 'lucide-react';
import './App.css';

// Import Shadcn components
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Badge } from './components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Alert, AlertDescription } from './components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table';

const API_BASE = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Firebase config (will be used later for authentication)
const firebaseConfig = {
  apiKey: "AIzaSyDkd2WLgg6RmJETR9njx_XqxND4kbcv3cQ",
  authDomain: "murick-battery-saas.firebaseapp.com",
  projectId: "murick-battery-saas",
  storageBucket: "murick-battery-saas.firebasestorage.app",
  messagingSenderId: "1034090209712",
  appId: "1:1034090209712:web:59ffe5ef35913361c37675",
  measurementId: "G-XW474C1K9E"
};

// Main App Component
function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [inventory, setInventory] = useState([]);
  const [sales, setSales] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [batteryBrands, setBatteryBrands] = useState([]);
  const [batteryCapacities, setBatteryCapacities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load all data
      const [inventoryRes, salesRes, dashboardRes, brandsRes, capacitiesRes] = await Promise.all([
        fetch(`${API_BASE}/api/inventory`),
        fetch(`${API_BASE}/api/sales`),
        fetch(`${API_BASE}/api/dashboard`),
        fetch(`${API_BASE}/api/battery-brands`),
        fetch(`${API_BASE}/api/battery-capacities`)
      ]);

      const inventoryData = await inventoryRes.json();
      const salesData = await salesRes.json();
      const dashboardData = await dashboardRes.json();
      const brandsData = await brandsRes.json();
      const capacitiesData = await capacitiesRes.json();

      setInventory(inventoryData.inventory || []);
      setSales(salesData.sales || []);
      setDashboardStats(dashboardData);
      setBatteryBrands(brandsData.brands || []);
      setBatteryCapacities(capacitiesData.capacities || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Navigation items
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'sales', label: 'Sales', icon: ShoppingCart },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Battery className="h-12 w-12 text-emerald-600 animate-pulse mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700">Loading Murick...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Battery className="h-8 w-8 text-emerald-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Murick</h1>
                <p className="text-sm text-gray-600">Battery Shop Management</p>
              </div>
            </div>
            
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>

            {/* Desktop navigation */}
            <nav className="hidden md:flex space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.id}
                    variant={currentView === item.id ? "default" : "ghost"}
                    onClick={() => setCurrentView(item.id)}
                    className="flex items-center space-x-2"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Button>
                );
              })}
            </nav>
          </div>

          {/* Mobile navigation */}
          {isMobileMenuOpen && (
            <nav className="md:hidden mt-4 pb-4 border-t pt-4">
              <div className="flex flex-col space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Button
                      key={item.id}
                      variant={currentView === item.id ? "default" : "ghost"}
                      onClick={() => {
                        setCurrentView(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex items-center justify-start space-x-2 w-full"
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Button>
                  );
                })}
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {currentView === 'dashboard' && (
          <DashboardView 
            stats={dashboardStats} 
            onNavigate={setCurrentView}
            onRefresh={loadData}
          />
        )}
        {currentView === 'inventory' && (
          <InventoryView 
            inventory={inventory}
            brands={batteryBrands}
            capacities={batteryCapacities}
            onRefresh={loadData}
          />
        )}
        {currentView === 'sales' && (
          <SalesView 
            sales={sales}
            inventory={inventory}
            onRefresh={loadData}
          />
        )}
        {currentView === 'analytics' && (
          <AnalyticsView stats={dashboardStats} />
        )}
      </main>
    </div>
  );
}

// Dashboard Component
function DashboardView({ stats, onNavigate, onRefresh }) {
  if (!stats) return <div>Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-800">Dashboard</h2>
        <Button onClick={onRefresh} variant="outline">
          <TrendingUp className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Total Inventory Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₨ {stats.inventory.inventory_value.toLocaleString()}</div>
            <p className="text-xs opacity-75 mt-1">{stats.inventory.total_items} unique items</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₨ {stats.sales.total_amount.toLocaleString()}</div>
            <p className="text-xs opacity-75 mt-1">{stats.sales.total_sales} transactions</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Total Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₨ {stats.sales.total_profit.toLocaleString()}</div>
            <p className="text-xs opacity-75 mt-1">Average: ₨ {Math.round(stats.sales.average_sale).toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Stock Alert</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inventory.low_stock_count}</div>
            <p className="text-xs opacity-75 mt-1">Items running low</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span>Low Stock Alerts</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.low_stock_items.length > 0 ? (
              <div className="space-y-2">
                {stats.low_stock_items.map((item, index) => (
                  <Alert key={index} className="border-orange-200">
                    <AlertDescription>
                      <strong>{item.brand} {item.capacity} {item.model}</strong> - Only {item.stock_quantity} left
                    </AlertDescription>
                  </Alert>
                ))}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onNavigate('inventory')}
                  className="w-full mt-2"
                >
                  View All Inventory
                </Button>
              </div>
            ) : (
              <p className="text-gray-500">All items are well stocked! ✅</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              <span>Top Selling Batteries</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.top_selling.length > 0 ? (
              <div className="space-y-3">
                {stats.top_selling.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.battery}</span>
                    <Badge variant="secondary">{item.quantity_sold} sold</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No sales data available yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Inventory Management Component
function InventoryView({ inventory, brands, capacities, onRefresh }) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-800">Inventory Management</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add Battery</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <AddBatteryForm 
              brands={brands}
              capacities={capacities}
              onSuccess={() => {
                setIsAddDialogOpen(false);
                onRefresh();
              }}
              editingItem={editingItem}
              onCancel={() => setEditingItem(null)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {inventory.map((item) => (
          <InventoryCard 
            key={item.id} 
            item={item}
            onEdit={(item) => {
              setEditingItem(item);
              setIsAddDialogOpen(true);
            }}
            onRefresh={onRefresh}
          />
        ))}
      </div>

      {inventory.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No inventory items yet</h3>
            <p className="text-gray-500 mb-4">Start by adding your first battery to inventory</p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Battery
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Individual Inventory Card Component
function InventoryCard({ item, onEdit, onRefresh }) {
  const isLowStock = item.stock_quantity <= item.low_stock_alert;
  const profitMargin = ((item.selling_price - item.purchase_price) / item.purchase_price * 100).toFixed(1);

  return (
    <Card className={`transition-all hover:shadow-lg ${isLowStock ? 'ring-2 ring-orange-200' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{item.brand} {item.capacity}</CardTitle>
          {isLowStock && <Badge variant="destructive">Low Stock</Badge>}
        </div>
        <CardDescription>{item.model}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <Label className="text-xs text-gray-500">Stock</Label>
            <p className="font-semibold">{item.stock_quantity} units</p>
          </div>
          <div>
            <Label className="text-xs text-gray-500">Selling Price</Label>
            <p className="font-semibold">₨ {item.selling_price.toLocaleString()}</p>
          </div>
          <div>
            <Label className="text-xs text-gray-500">Purchase Price</Label>
            <p className="font-semibold">₨ {item.purchase_price.toLocaleString()}</p>
          </div>
          <div>
            <Label className="text-xs text-gray-500">Profit Margin</Label>
            <p className="font-semibold text-emerald-600">{profitMargin}%</p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(item)} className="flex-1">
            Edit
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            Quick Sale
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Add/Edit Battery Form Component
function AddBatteryForm({ brands, capacities, onSuccess, editingItem, onCancel }) {
  const [formData, setFormData] = useState({
    brand: editingItem?.brand || '',
    capacity: editingItem?.capacity || '',
    model: editingItem?.model || '',
    purchase_price: editingItem?.purchase_price || '',
    selling_price: editingItem?.selling_price || '',
    stock_quantity: editingItem?.stock_quantity || '',
    low_stock_alert: editingItem?.low_stock_alert || 5,
    warranty_months: editingItem?.warranty_months || 12,
    supplier: editingItem?.supplier || ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingItem 
        ? `${API_BASE}/api/inventory/${editingItem.id}`
        : `${API_BASE}/api/inventory`;
      
      const method = editingItem ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          purchase_price: parseFloat(formData.purchase_price),
          selling_price: parseFloat(formData.selling_price),
          stock_quantity: parseInt(formData.stock_quantity),
          low_stock_alert: parseInt(formData.low_stock_alert),
          warranty_months: parseInt(formData.warranty_months)
        })
      });

      if (response.ok) {
        onSuccess();
        if (editingItem) onCancel();
      }
    } catch (error) {
      console.error('Error saving battery:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>{editingItem ? 'Edit Battery' : 'Add New Battery'}</DialogTitle>
        <DialogDescription>
          {editingItem ? 'Update battery information' : 'Add a new battery to your inventory'}
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Brand</Label>
          <Select value={formData.brand} onValueChange={(value) => setFormData({...formData, brand: value})}>
            <SelectTrigger>
              <SelectValue placeholder="Select brand" />
            </SelectTrigger>
            <SelectContent>
              {brands.map((brand) => (
                <SelectItem key={brand.id} value={brand.name}>{brand.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Capacity</Label>
          <Select value={formData.capacity} onValueChange={(value) => setFormData({...formData, capacity: value})}>
            <SelectTrigger>
              <SelectValue placeholder="Select capacity" />
            </SelectTrigger>
            <SelectContent>
              {capacities.map((capacity) => (
                <SelectItem key={capacity} value={capacity}>{capacity}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Model</Label>
        <Input 
          value={formData.model}
          onChange={(e) => setFormData({...formData, model: e.target.value})}
          placeholder="e.g., DIN-55"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Purchase Price (₨)</Label>
          <Input 
            type="number"
            value={formData.purchase_price}
            onChange={(e) => setFormData({...formData, purchase_price: e.target.value})}
            placeholder="8000"
            required
          />
        </div>

        <div>
          <Label>Selling Price (₨)</Label>
          <Input 
            type="number"
            value={formData.selling_price}
            onChange={(e) => setFormData({...formData, selling_price: e.target.value})}
            placeholder="10000"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Stock Quantity</Label>
          <Input 
            type="number"
            value={formData.stock_quantity}
            onChange={(e) => setFormData({...formData, stock_quantity: e.target.value})}
            placeholder="50"
            required
          />
        </div>

        <div>
          <Label>Low Stock Alert</Label>
          <Input 
            type="number"
            value={formData.low_stock_alert}
            onChange={(e) => setFormData({...formData, low_stock_alert: e.target.value})}
            placeholder="5"
          />
        </div>
      </div>

      <div>
        <Label>Supplier (Optional)</Label>
        <Input 
          value={formData.supplier}
          onChange={(e) => setFormData({...formData, supplier: e.target.value})}
          placeholder="Supplier name"
        />
      </div>

      <div className="flex space-x-2 pt-4">
        <Button type="submit" className="flex-1">
          {editingItem ? 'Update Battery' : 'Add Battery'}
        </Button>
        {editingItem && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

// Sales View Component
function SalesView({ sales, inventory, onRefresh }) {
  const [isAddSaleOpen, setIsAddSaleOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-800">Sales Management</h2>
        <Dialog open={isAddSaleOpen} onOpenChange={setIsAddSaleOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Record Sale</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <RecordSaleForm 
              inventory={inventory}
              onSuccess={() => {
                setIsAddSaleOpen(false);
                onRefresh();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Sales Table */}
      {sales.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Battery</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Profit</TableHead>
                  <TableHead>Customer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => {
                  const battery = inventory.find(item => item.id === sale.battery_id);
                  return (
                    <TableRow key={sale.id}>
                      <TableCell>{new Date(sale.sale_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {battery ? `${battery.brand} ${battery.capacity} ${battery.model}` : 'Unknown'}
                      </TableCell>
                      <TableCell>{sale.quantity_sold}</TableCell>
                      <TableCell>₨ {sale.unit_price.toLocaleString()}</TableCell>
                      <TableCell className="font-semibold">₨ {sale.total_amount.toLocaleString()}</TableCell>
                      <TableCell className="text-emerald-600 font-semibold">₨ {sale.total_profit.toLocaleString()}</TableCell>
                      <TableCell>{sale.customer_name || 'Walk-in'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No sales recorded yet</h3>
            <p className="text-gray-500 mb-4">Start by recording your first sale</p>
            <Button onClick={() => setIsAddSaleOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Record First Sale
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Record Sale Form Component
function RecordSaleForm({ inventory, onSuccess }) {
  const [formData, setFormData] = useState({
    battery_id: '',
    quantity_sold: 1,
    unit_price: '',
    customer_name: '',
    customer_phone: ''
  });

  const selectedBattery = inventory.find(item => item.id === formData.battery_id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`${API_BASE}/api/sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          quantity_sold: parseInt(formData.quantity_sold),
          unit_price: parseFloat(formData.unit_price)
        })
      });

      if (response.ok) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error recording sale:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Record New Sale</DialogTitle>
        <DialogDescription>
          Record a battery sale transaction
        </DialogDescription>
      </DialogHeader>

      <div>
        <Label>Select Battery</Label>
        <Select value={formData.battery_id} onValueChange={(value) => {
          const battery = inventory.find(item => item.id === value);
          setFormData({
            ...formData, 
            battery_id: value,
            unit_price: battery ? battery.selling_price : ''
          });
        }}>
          <SelectTrigger>
            <SelectValue placeholder="Choose battery" />
          </SelectTrigger>
          <SelectContent>
            {inventory.filter(item => item.stock_quantity > 0).map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.brand} {item.capacity} {item.model} (Stock: {item.stock_quantity})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedBattery && (
        <Alert className="bg-blue-50 border-blue-200">
          <AlertDescription>
            Available Stock: <strong>{selectedBattery.stock_quantity} units</strong> | 
            Suggested Price: <strong>₨ {selectedBattery.selling_price.toLocaleString()}</strong>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Quantity</Label>
          <Input 
            type="number"
            value={formData.quantity_sold}
            onChange={(e) => setFormData({...formData, quantity_sold: e.target.value})}
            min="1"
            max={selectedBattery?.stock_quantity || 1}
            required
          />
        </div>

        <div>
          <Label>Unit Price (₨)</Label>
          <Input 
            type="number"
            value={formData.unit_price}
            onChange={(e) => setFormData({...formData, unit_price: e.target.value})}
            placeholder="Selling price"
            required
          />
        </div>
      </div>

      <div>
        <Label>Customer Name (Optional)</Label>
        <Input 
          value={formData.customer_name}
          onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
          placeholder="Customer name"
        />
      </div>

      <div>
        <Label>Customer Phone (Optional)</Label>
        <Input 
          value={formData.customer_phone}
          onChange={(e) => setFormData({...formData, customer_phone: e.target.value})}
          placeholder="Phone number"
        />
      </div>

      {formData.unit_price && formData.quantity_sold && selectedBattery && (
        <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
          <div className="text-sm space-y-1">
            <p><strong>Total Amount:</strong> ₨ {(formData.unit_price * formData.quantity_sold).toLocaleString()}</p>
            <p><strong>Profit per unit:</strong> ₨ {(formData.unit_price - selectedBattery.purchase_price).toLocaleString()}</p>
            <p><strong>Total Profit:</strong> ₨ {((formData.unit_price - selectedBattery.purchase_price) * formData.quantity_sold).toLocaleString()}</p>
          </div>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={!formData.battery_id || !formData.unit_price}>
        Record Sale
      </Button>
    </form>
  );
}

// Analytics View Component
function AnalyticsView({ stats }) {
  if (!stats) return <div>Loading analytics...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-800">Analytics & Reports</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Inventory Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Total Items</span>
              <Badge variant="secondary">{stats.inventory.total_items}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Total Stock Units</span>
              <Badge variant="secondary">{stats.inventory.total_stock}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Inventory Value</span>
              <Badge>₨ {stats.inventory.inventory_value.toLocaleString()}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Low Stock Items</span>
              <Badge variant={stats.inventory.low_stock_count > 0 ? "destructive" : "secondary"}>
                {stats.inventory.low_stock_count}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Total Sales</span>
              <Badge variant="secondary">{stats.sales.total_sales}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Sales Revenue</span>
              <Badge>₨ {stats.sales.total_amount.toLocaleString()}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Total Profit</span>
              <Badge className="bg-emerald-600">₨ {stats.sales.total_profit.toLocaleString()}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Average Sale</span>
              <Badge variant="outline">₨ {Math.round(stats.sales.average_sale).toLocaleString()}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {stats.top_selling.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Batteries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.top_selling.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-semibold">
                      {index + 1}
                    </div>
                    <span className="font-medium">{item.battery}</span>
                  </div>
                  <Badge>{item.quantity_sold} sold</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default App;
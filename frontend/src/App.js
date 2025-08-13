import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Plus, Package, ShoppingCart, BarChart3, AlertTriangle, Battery, Store, Menu, X, Home, TrendingUp, Eye, EyeOff, Zap, DollarSign, Calendar, Filter, Search, User, LogOut, Sun, Moon, Printer, Download, FileText, Settings } from 'lucide-react';
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

// Import custom components
import { Receipt, generateReceiptData } from './components/Receipt';
import { exportInventoryToExcel, exportSalesToExcel, exportInventoryToPDF, exportSalesToPDF } from './utils/exportUtils';

// Offline Storage Manager
class OfflineStorage {
  static getInventory(shopId) {
    const data = localStorage.getItem(`murick_inventory_${shopId}`);
    return data ? JSON.parse(data) : [];
  }

  static saveInventory(shopId, inventory) {
    localStorage.setItem(`murick_inventory_${shopId}`, JSON.stringify(inventory));
  }

  static getSales(shopId) {
    const data = localStorage.getItem(`murick_sales_${shopId}`);
    return data ? JSON.parse(data) : [];
  }

  static saveSales(shopId, sales) {
    localStorage.setItem(`murick_sales_${shopId}`, JSON.stringify(sales));
  }

  static getUser() {
    const data = localStorage.getItem('murick_current_user');
    return data ? JSON.parse(data) : null;
  }

  static saveUser(user) {
    localStorage.setItem('murick_current_user', JSON.stringify(user));
  }

  static clearUser() {
    localStorage.removeItem('murick_current_user');
  }

  static getShopConfig(shopId) {
    const data = localStorage.getItem(`murick_shop_config_${shopId}`);
    return data ? JSON.parse(data) : null;
  }

  static saveShopConfig(shopId, config) {
    localStorage.setItem(`murick_shop_config_${shopId}`, JSON.stringify(config));
  }

  // REMOVED: getShops() and saveShops() methods for security
  // These methods created vulnerabilities by exposing all shops
}

// Shop Setup Component
function ShopSetupScreen({ onSetupComplete }) {
  const [step, setStep] = useState(1);
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseValid, setLicenseValid] = useState(false);
  const [shopData, setShopData] = useState({
    shop_name: '',
    proprietor_name: '',
    contact_number: '',
    address: '',
    email: ''
  });
  const [adminUser, setAdminUser] = useState({
    username: '',
    password: '',
    name: '',
    role: 'owner'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLicenseValidation = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/validate-license`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ license_key: licenseKey }),
      });

      if (response.ok) {
        const data = await response.json();
        setLicenseValid(true);
        setStep(2);
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Invalid license key');
      }
    } catch (err) {
      setError('Failed to validate license key. Please check your connection.');
    }
    
    setLoading(false);
  };

  const handleShopSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      // Generate unique shop ID with better format
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      const shopId = `SHOP-${random}-${timestamp.toString().slice(-6)}`;
      
      const completeShopData = {
        ...shopData,
        shop_id: shopId,
        license_key: licenseKey,
        users: [adminUser],
        created_date: new Date().toISOString()
      };

      // Submit to backend with license key validation
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/setup-shop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(completeShopData),
      });

      if (response.ok) {
        const data = await response.json();
        // Save shop configuration locally (no global shop list for security)
        OfflineStorage.saveShopConfig(shopId, completeShopData);

        // Show the shop ID to user in the next step
        setStep(4);
        setShopData({...shopData, shop_id: shopId});
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to setup shop');
      }
    } catch (err) {
      setError('Failed to setup shop. Please check your connection.');
    }
    
    setLoading(false);
  };

  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-amber-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Store className="h-10 w-10 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              License Activation
            </CardTitle>
            <CardDescription className="text-gray-600">Enter your license key to setup your shop</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <form onSubmit={handleLicenseValidation} className="space-y-4">
              <div>
                <Label>License Key</Label>
                <Input
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                  placeholder="MBM-2024-XXXXX-XXX"
                  className="border-blue-200 focus:border-blue-400"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Contact your Murick representative to get your license key.
                </p>
              </div>

              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <AlertDescription className="text-red-700">{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                disabled={loading}
              >
                {loading ? 'Validating...' : 'Validate License'}
              </Button>
            </form>

            <div className="text-center pt-4 border-t">
              <p className="text-xs text-gray-500">
                🔒 Each license key can only be used once to prevent unauthorized shop creation.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-amber-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 w-20 h-20 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Store className="h-10 w-10 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              Setup Your Shop
            </CardTitle>
            <CardDescription className="text-gray-600">Enter your shop details</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <form onSubmit={(e) => { e.preventDefault(); setStep(3); }} className="space-y-4">
              <div>
                <Label>Shop Name</Label>
                <Input
                  value={shopData.shop_name}
                  onChange={(e) => setShopData({...shopData, shop_name: e.target.value})}
                  placeholder="e.g., Khan Battery Shop"
                  className="border-orange-200 focus:border-orange-400"
                  required
                />
              </div>
              
              <div>
                <Label>Proprietor Name</Label>
                <Input
                  value={shopData.proprietor_name}
                  onChange={(e) => setShopData({...shopData, proprietor_name: e.target.value})}
                  placeholder="Your full name"
                  className="border-orange-200 focus:border-orange-400"
                  required
                />
              </div>
              
              <div>
                <Label>Contact Number</Label>
                <Input
                  value={shopData.contact_number}
                  onChange={(e) => setShopData({...shopData, contact_number: e.target.value})}
                  placeholder="03XX-XXXXXXX"
                  className="border-orange-200 focus:border-orange-400"
                  required
                />
              </div>
              
              <div>
                <Label>Shop Address</Label>
                <Input
                  value={shopData.address}
                  onChange={(e) => setShopData({...shopData, address: e.target.value})}
                  placeholder="Complete shop address"
                  className="border-orange-200 focus:border-orange-400"
                  required
                />
              </div>
              
              <div>
                <Label>Email (Optional)</Label>
                <Input
                  type="email"
                  value={shopData.email}
                  onChange={(e) => setShopData({...shopData, email: e.target.value})}
                  placeholder="shop@example.com"
                  className="border-orange-200 focus:border-orange-400"
                />
              </div>

              <Button type="submit" className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700">
                Next: Create Admin User
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 4) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-amber-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Store className="h-10 w-10 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              Shop Setup Complete!
            </CardTitle>
            <CardDescription className="text-gray-600">Your shop has been successfully configured</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">🔑 Important: Save Your Shop ID</h3>
              <div className="bg-white border-2 border-blue-300 rounded p-3 mb-3">
                <p className="text-xs text-blue-600 mb-1">Your Shop ID:</p>
                <p className="text-xl font-mono font-bold text-blue-800 break-all">{shopData.shop_id}</p>
              </div>
              <p className="text-sm text-blue-700">
                ⚠️ <strong>Write this down safely!</strong> You'll need this Shop ID along with your username and password to login.
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-2">Shop Details:</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Shop Name:</strong> {shopData.shop_name}</p>
                <p><strong>Proprietor:</strong> {shopData.proprietor_name}</p>
                <p><strong>Admin Username:</strong> {adminUser.username}</p>
              </div>
            </div>

            <Button 
              onClick={() => onSetupComplete(shopData.shop_id)}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            >
              Continue to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-amber-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 w-20 h-20 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg">
              <User className="h-10 w-10 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
            Create Admin Account
          </CardTitle>
          <CardDescription className="text-gray-600">Set up your login credentials</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <form onSubmit={handleShopSubmit} className="space-y-4">
            <div>
              <Label>Username</Label>
              <Input
                value={adminUser.username}
                onChange={(e) => setAdminUser({...adminUser, username: e.target.value})}
                placeholder="Choose a username"
                className="border-orange-200 focus:border-orange-400"
                required
              />
            </div>
            
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={adminUser.password}
                onChange={(e) => setAdminUser({...adminUser, password: e.target.value})}
                placeholder="Choose a strong password"
                className="border-orange-200 focus:border-orange-400"
                required
                minLength={6}
              />
            </div>
            
            <div>
              <Label>Your Name</Label>
              <Input
                value={adminUser.name}
                onChange={(e) => setAdminUser({...adminUser, name: e.target.value})}
                placeholder="Your display name"
                className="border-orange-200 focus:border-orange-400"
                required
              />
            </div>

            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            )}

            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-blue-700">
                <strong>Important:</strong> Remember these credentials - you'll use them to login to your shop.
              </AlertDescription>
            </Alert>

            <div className="flex space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setStep(1)}
                className="flex-1 border-orange-200"
              >
                Back
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700"
              >
                Complete Setup
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
  }
}

// REMOVED: ShopSelectionScreen component for security reasons
// This component exposed all shops to unauthorized users

// Battery data
const BATTERY_BRANDS = [
  { id: 'ags', name: 'AGS', popular: true },
  { id: 'exide', name: 'Exide', popular: true },
  { id: 'phoenix', name: 'Phoenix', popular: true },
  { id: 'volta', name: 'Volta', popular: true },
  { id: 'bridgepower', name: 'Bridgepower', popular: true },
  { id: 'osaka', name: 'Osaka', popular: false },
  { id: 'crown', name: 'Crown', popular: false }
];

const BATTERY_CAPACITIES = ["35Ah", "45Ah", "55Ah", "65Ah", "70Ah", "80Ah", "100Ah", "120Ah", "135Ah", "150Ah", "180Ah", "200Ah"];

// Secure Login Component - Requires Shop ID + Username + Password
function SecureLoginScreen({ onLogin, onSetupNew }) {
  const [shopId, setShopId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      // First check if shop exists locally
      const shopConfig = OfflineStorage.getShopConfig(shopId);
      
      if (!shopConfig) {
        setError('Shop not found. Please check your Shop ID or contact your administrator.');
        setLoading(false);
        return;
      }

      // Find user in shop's user list  
      const user = shopConfig.users?.find(u => u.username === username && u.password === password);
      
      if (user) {
        const userData = {
          ...user,
          shop_id: shopId,
          shop_name: shopConfig.shop_name
        };
        OfflineStorage.saveUser(userData);
        onLogin(userData);
      } else {
        setError('Invalid username or password!');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-amber-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/90 backdrop-blur-sm">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 w-20 h-20 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Battery className="h-10 w-10 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
            Murick Battery System
          </CardTitle>
          <CardDescription className="text-gray-600">Secure Shop Access</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label>Shop ID</Label>
              <Input
                type="text"
                value={shopId}
                onChange={(e) => setShopId(e.target.value)}
                placeholder="Enter your Shop ID"
                className="border-orange-200 focus:border-orange-400"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Contact your administrator if you don't have your Shop ID</p>
            </div>

            <div>
              <Label>Username</Label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="border-orange-200 focus:border-orange-400"
                required
              />
            </div>
            
            <div>
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="border-orange-200 focus:border-orange-400 pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login to Shop'}
            </Button>
          </form>

          <div className="text-center pt-4 border-t">
            <p className="text-sm text-gray-600 mb-2">Need to setup a new shop?</p>
            <Button 
              onClick={onSetupNew}
              variant="outline"
              className="w-full border-orange-200 hover:bg-orange-50"
            >
              <Plus className="h-4 w-4 mr-2" />
              Setup New Shop
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Main App Component
function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [inventory, setInventory] = useState([]);
  const [sales, setSales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [appState, setAppState] = useState('loading'); // loading, shop-select, shop-setup, login, main
  const [selectedShopId, setSelectedShopId] = useState(null);

  // Load offline data
  useEffect(() => {
    const savedUser = OfflineStorage.getUser();
    
    if (savedUser && savedUser.shop_id) {
      // User is logged in
      setUser(savedUser);
      setSelectedShopId(savedUser.shop_id);
      setInventory(OfflineStorage.getInventory(savedUser.shop_id));
      setSales(OfflineStorage.getSales(savedUser.shop_id));
      setAppState('main');
    } else {
      // Show secure login screen (no shop selection for security)
      setAppState('login');
    }
    
    setIsLoading(false);
  }, []);

  const handleShopSetup = (shopId) => {
    // After setup, go directly to login
    setAppState('login');
  };

  const handleLogin = (userData) => {
    setUser(userData);
    setSelectedShopId(userData.shop_id);
    setInventory(OfflineStorage.getInventory(userData.shop_id));
    setSales(OfflineStorage.getSales(userData.shop_id));
    setAppState('main');
  };

  const handleLogout = () => {
    OfflineStorage.clearUser();
    setUser(null);
    setSelectedShopId(null);
    setCurrentView('dashboard');
    setAppState('login'); // Go back to secure login
  };

  const refreshData = () => {
    if (user?.shop_id) {
      setInventory(OfflineStorage.getInventory(user.shop_id));
      setSales(OfflineStorage.getSales(user.shop_id));
    }
  };

  // Navigation items
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'inventory', label: 'Stock', icon: Package },
    { id: 'sales', label: 'Sales', icon: ShoppingCart },
    { id: 'analytics', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-amber-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Battery className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-700">Loading Murick...</h2>
        </div>
      </div>
    );
  }

  if (appState === 'shop-setup') {
    return <ShopSetupScreen onSetupComplete={handleShopSetup} />;
  }

  if (appState === 'login') {
    return <SecureLoginScreen onLogin={handleLogin} onSetupNew={() => setAppState('shop-setup')} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-amber-100">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm shadow-lg border-b border-orange-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                <Battery className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">Murick</h1>
                <p className="text-sm text-gray-600">{user.shop_name}</p>
              </div>
            </div>
            
            {/* User info and logout */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-700">{user.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user.role}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout} className="border-orange-200 hover:bg-orange-50">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
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
          </div>

          {/* Desktop navigation */}
          <nav className="hidden md:flex space-x-1 mt-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  variant={currentView === item.id ? "default" : "ghost"}
                  onClick={() => setCurrentView(item.id)}
                  className={`flex items-center space-x-2 ${
                    currentView === item.id 
                      ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white" 
                      : "hover:bg-orange-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Button>
              );
            })}
          </nav>

          {/* Mobile navigation */}
          {isMobileMenuOpen && (
            <nav className="md:hidden mt-4 pb-4 border-t border-orange-200 pt-4">
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
                      className={`flex items-center justify-start space-x-2 w-full ${
                        currentView === item.id 
                          ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white" 
                          : "hover:bg-orange-100"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Button>
                  );
                })}
                <Button variant="outline" onClick={handleLogout} className="flex items-center space-x-2 w-full mt-4 border-orange-200">
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </Button>
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {currentView === 'dashboard' && (
          <DashboardView 
            inventory={inventory}
            sales={sales}
            user={user}
            onNavigate={setCurrentView}
            onRefresh={refreshData}
          />
        )}
        {currentView === 'inventory' && (
          <InventoryView 
            inventory={inventory}
            onRefresh={refreshData}
            user={user}
          />
        )}
        {currentView === 'sales' && (
          <SalesView 
            sales={sales}
            inventory={inventory}
            onRefresh={refreshData}
            user={user}
          />
        )}
        {currentView === 'analytics' && (
          <AnalyticsView 
            inventory={inventory}
            sales={sales}
            user={user}
          />
        )}
        {currentView === 'settings' && (
          <SettingsView 
            user={user}
            onRefresh={refreshData}
          />
        )}
      </main>
    </div>
  );
}

// Dashboard Component
function DashboardView({ inventory, sales, user, onNavigate, onRefresh }) {
  // Calculate stats
  const totalInventoryValue = inventory.reduce((sum, item) => sum + (item.stock_quantity * item.purchase_price), 0);
  const totalSalesAmount = sales.reduce((sum, sale) => sum + sale.total_amount, 0);
  const totalProfit = sales.reduce((sum, sale) => sum + sale.total_profit, 0);
  const lowStockItems = inventory.filter(item => item.stock_quantity <= item.low_stock_alert);
  
  // Top selling batteries
  const batteryStats = {};
  sales.forEach(sale => {
    if (batteryStats[sale.battery_id]) {
      batteryStats[sale.battery_id] += sale.quantity_sold;
    } else {
      batteryStats[sale.battery_id] = sale.quantity_sold;
    }
  });

  const topSelling = Object.entries(batteryStats)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([batteryId, quantity]) => {
      const battery = inventory.find(item => item.id === batteryId);
      return battery ? {
        battery: `${battery.brand} ${battery.capacity} ${battery.model}`,
        quantity_sold: quantity
      } : null;
    })
    .filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
            Welcome, {user.name}!
          </h2>
          <p className="text-gray-600">Here's your shop overview</p>
        </div>
        <Button onClick={onRefresh} variant="outline" className="border-orange-200 hover:bg-orange-50">
          <TrendingUp className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Total Stock Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₨ {totalInventoryValue.toLocaleString()}</div>
            <p className="text-xs opacity-75 mt-1">{inventory.length} items</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₨ {totalSalesAmount.toLocaleString()}</div>
            <p className="text-xs opacity-75 mt-1">{sales.length} sales</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Total Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₨ {totalProfit.toLocaleString()}</div>
            <p className="text-xs opacity-75 mt-1">From all sales</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-amber-600 text-white border-0 shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Low Stock Alert</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockItems.length}</div>
            <p className="text-xs opacity-75 mt-1">Items need restock</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border-orange-200 shadow-lg hover:shadow-xl transition-all">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Plus className="h-5 w-5 text-orange-500" />
              <span>Quick Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={() => onNavigate('inventory')} 
              className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700"
            >
              <Package className="h-4 w-4 mr-2" />
              Add New Battery
            </Button>
            <Button 
              onClick={() => onNavigate('sales')} 
              variant="outline" 
              className="w-full border-orange-200 hover:bg-orange-50"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Make Sale
            </Button>
          </CardContent>
        </Card>

        <Card className="border-orange-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span>Stock Alerts</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockItems.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {lowStockItems.slice(0, 3).map((item, index) => (
                  <Alert key={index} className="border-orange-200 bg-orange-50">
                    <AlertDescription className="text-sm">
                      <strong>{item.brand} {item.capacity}</strong> - Only {item.stock_quantity} left
                    </AlertDescription>
                  </Alert>
                ))}
                {lowStockItems.length > 3 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => onNavigate('inventory')}
                    className="w-full mt-2 border-orange-200"
                  >
                    View All ({lowStockItems.length})
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500">All items well stocked! ✅</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-orange-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              <span>Top Sellers</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topSelling.length > 0 ? (
              <div className="space-y-3">
                {topSelling.slice(0, 3).map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">{item.battery}</span>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                      {item.quantity_sold} sold
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500">No sales yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Inventory Management Component
function InventoryView({ inventory, onRefresh, user }) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBrand, setFilterBrand] = useState('all');

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.capacity.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBrand = filterBrand === 'all' || item.brand === filterBrand;
    return matchesSearch && matchesBrand;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
            Stock Management
          </h2>
          <p className="text-gray-600">Manage your battery inventory</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Battery
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <AddBatteryForm 
              onSuccess={() => {
                setIsAddDialogOpen(false);
                onRefresh();
              }}
              editingItem={editingItem}
              onCancel={() => setEditingItem(null)}
              user={user}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search batteries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-orange-200 focus:border-orange-400"
          />
        </div>
        <Select value={filterBrand} onValueChange={setFilterBrand}>
          <SelectTrigger className="w-full md:w-48 border-orange-200">
            <SelectValue placeholder="Filter by brand" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brands</SelectItem>
            {BATTERY_BRANDS.map((brand) => (
              <SelectItem key={brand.id} value={brand.name}>{brand.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredInventory.map((item) => (
          <InventoryCard 
            key={item.id} 
            item={item}
            onEdit={(item) => {
              setEditingItem(item);
              setIsAddDialogOpen(true);
            }}
            onRefresh={onRefresh}
            user={user}
          />
        ))}
      </div>

      {filteredInventory.length === 0 && (
        <Card className="text-center py-12 border-orange-200">
          <CardContent>
            <Package className="h-12 w-12 text-orange-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              {inventory.length === 0 ? 'No batteries in stock' : 'No batteries match your search'}
            </h3>
            <p className="text-gray-500 mb-4">
              {inventory.length === 0 ? 'Start by adding your first battery' : 'Try changing your search or filter'}
            </p>
            {inventory.length === 0 && (
              <Button 
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-gradient-to-r from-orange-500 to-amber-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Battery
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Individual Inventory Card Component
function InventoryCard({ item, onEdit, onRefresh, user }) {
  const [isQuickSaleOpen, setIsQuickSaleOpen] = useState(false);
  const isLowStock = item.stock_quantity <= item.low_stock_alert;
  const profitMargin = ((item.selling_price - item.purchase_price) / item.purchase_price * 100).toFixed(1);

  return (
    <Card className={`transition-all hover:shadow-xl ${isLowStock ? 'ring-2 ring-orange-200 bg-orange-50/30' : 'border-orange-100'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
            {item.brand} {item.capacity}
          </CardTitle>
          {isLowStock && <Badge variant="destructive">Low Stock!</Badge>}
        </div>
        <CardDescription>{item.model}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <Label className="text-xs text-gray-500">Stock</Label>
            <p className="font-semibold text-orange-600">{item.stock_quantity} units</p>
          </div>
          <div>
            <Label className="text-xs text-gray-500">Sell Price</Label>
            <p className="font-semibold">₨ {item.selling_price.toLocaleString()}</p>
          </div>
          <div>
            <Label className="text-xs text-gray-500">Buy Price</Label>
            <p className="font-semibold">₨ {item.purchase_price.toLocaleString()}</p>
          </div>
          <div>
            <Label className="text-xs text-gray-500">Profit</Label>
            <p className="font-semibold text-emerald-600">{profitMargin}%</p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(item)} className="flex-1 border-orange-200">
            Edit
          </Button>
          <Dialog open={isQuickSaleOpen} onOpenChange={setIsQuickSaleOpen}>
            <DialogTrigger asChild>
              <Button 
                size="sm" 
                className="flex-1 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700"
                disabled={item.stock_quantity === 0}
              >
                <Zap className="h-3 w-3 mr-1" />
                Quick Sale
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <QuickSaleForm 
                battery={item}
                onSuccess={() => {
                  setIsQuickSaleOpen(false);
                  onRefresh();
                }}
                user={user}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}

// Quick Sale Form Component
function QuickSaleForm({ battery, onSuccess, user }) {
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Create sale record
    const saleId = Date.now().toString();
    const saleDate = new Date().toISOString();
    const totalAmount = battery.selling_price * quantity;
    const profitPerUnit = battery.selling_price - battery.purchase_price;
    const totalProfit = profitPerUnit * quantity;

    const newSale = {
      id: saleId,
      battery_id: battery.id,
      quantity_sold: quantity,
      unit_price: battery.selling_price,
      total_amount: totalAmount,
      total_profit: totalProfit,
      profit_per_unit: profitPerUnit,
      customer_name: customerName || 'Walk-in Customer',
      customer_phone: customerPhone,
      sale_date: saleDate,
      sold_by: user.name
    };

    // Update inventory
    const inventory = OfflineStorage.getInventory(user.shop_id);
    const updatedInventory = inventory.map(item => 
      item.id === battery.id 
        ? { ...item, stock_quantity: item.stock_quantity - quantity }
        : item
    );
    OfflineStorage.saveInventory(user.shop_id, updatedInventory);

    // Add sale
    const sales = OfflineStorage.getSales(user.shop_id);
    OfflineStorage.saveSales(user.shop_id, [...sales, newSale]);

    // Set up receipt data
    setCompletedSale(newSale);
    setShowReceipt(true);
  };

  const handleReceiptClose = () => {
    setShowReceipt(false);
    onSuccess();
  };

  const totalAmount = battery.selling_price * quantity;
  const totalProfit = (battery.selling_price - battery.purchase_price) * quantity;

  if (showReceipt && completedSale) {
    const shopConfig = OfflineStorage.getShopConfig(user.shop_id);
    return (
      <Receipt 
        sale={completedSale}
        battery={battery}
        shopConfig={shopConfig}
        onClose={handleReceiptClose}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
          Quick Sale
        </DialogTitle>
        <DialogDescription>
          Sell {battery.brand} {battery.capacity} {battery.model}
        </DialogDescription>
      </DialogHeader>

      <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
        <div className="text-sm space-y-1">
          <p><strong>Available Stock:</strong> {battery.stock_quantity} units</p>
          <p><strong>Price per unit:</strong> ₨ {battery.selling_price.toLocaleString()}</p>
        </div>
      </div>

      <div>
        <Label>How many to sell?</Label>
        <Input 
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
          min="1"
          max={battery.stock_quantity}
          className="border-orange-200"
          required
        />
      </div>

      <div>
        <Label>Customer Name (Optional)</Label>
        <Input 
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Enter customer name"
          className="border-orange-200"
        />
      </div>

      <div>
        <Label>Customer Phone (Optional)</Label>
        <Input 
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          placeholder="Enter phone number"
          className="border-orange-200"
        />
      </div>

      <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
        <div className="text-sm space-y-1">
          <p><strong>Total Amount:</strong> ₨ {totalAmount.toLocaleString()}</p>
          <p><strong>Total Profit:</strong> ₨ {totalProfit.toLocaleString()}</p>
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700"
        disabled={quantity > battery.stock_quantity || quantity < 1}
      >
        <DollarSign className="h-4 w-4 mr-2" />
        Complete Sale & Print Receipt
      </Button>
    </form>
  );
}

// Add/Edit Battery Form Component
function AddBatteryForm({ onSuccess, editingItem, onCancel, user }) {
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

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const batteryData = {
      ...formData,
      id: editingItem?.id || Date.now().toString(),
      purchase_price: parseFloat(formData.purchase_price),
      selling_price: parseFloat(formData.selling_price),
      stock_quantity: parseInt(formData.stock_quantity),
      low_stock_alert: parseInt(formData.low_stock_alert),
      warranty_months: parseInt(formData.warranty_months),
      date_added: editingItem?.date_added || new Date().toISOString()
    };

    const inventory = OfflineStorage.getInventory(user.shop_id);
    
    if (editingItem) {
      // Update existing
      const updatedInventory = inventory.map(item => 
        item.id === editingItem.id ? batteryData : item
      );
      OfflineStorage.saveInventory(user.shop_id, updatedInventory);
    } else {
      // Add new
      OfflineStorage.saveInventory(user.shop_id, [...inventory, batteryData]);
    }

    onSuccess();
    if (editingItem) onCancel();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
          {editingItem ? 'Edit Battery' : 'Add New Battery'}
        </DialogTitle>
        <DialogDescription>
          {editingItem ? 'Update battery details' : 'Add battery to your stock'}
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Brand</Label>
          <Select value={formData.brand} onValueChange={(value) => setFormData({...formData, brand: value})}>
            <SelectTrigger className="border-orange-200">
              <SelectValue placeholder="Select brand" />
            </SelectTrigger>
            <SelectContent>
              {BATTERY_BRANDS.map((brand) => (
                <SelectItem key={brand.id} value={brand.name}>{brand.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Capacity</Label>
          <Select value={formData.capacity} onValueChange={(value) => setFormData({...formData, capacity: value})}>
            <SelectTrigger className="border-orange-200">
              <SelectValue placeholder="Select capacity" />
            </SelectTrigger>
            <SelectContent>
              {BATTERY_CAPACITIES.map((capacity) => (
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
          className="border-orange-200"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Buy Price (₨)</Label>
          <Input 
            type="number"
            value={formData.purchase_price}
            onChange={(e) => setFormData({...formData, purchase_price: e.target.value})}
            placeholder="8000"
            className="border-orange-200"
            required
          />
        </div>

        <div>
          <Label>Sell Price (₨)</Label>
          <Input 
            type="number"
            value={formData.selling_price}
            onChange={(e) => setFormData({...formData, selling_price: e.target.value})}
            placeholder="10000"
            className="border-orange-200"
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
            className="border-orange-200"
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
            className="border-orange-200"
          />
        </div>
      </div>

      <div>
        <Label>Supplier (Optional)</Label>
        <Input 
          value={formData.supplier}
          onChange={(e) => setFormData({...formData, supplier: e.target.value})}
          placeholder="Supplier name"
          className="border-orange-200"
        />
      </div>

      <div className="flex space-x-2 pt-4">
        <Button 
          type="submit" 
          className="flex-1 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700"
        >
          {editingItem ? 'Update Battery' : 'Add Battery'}
        </Button>
        {editingItem && (
          <Button type="button" variant="outline" onClick={onCancel} className="border-orange-200">
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

// Sales View Component  
function SalesView({ sales, inventory, onRefresh, user }) {
  const [isAddSaleOpen, setIsAddSaleOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');

  const filteredSales = sales.filter(sale => {
    const battery = inventory.find(item => item.id === sale.battery_id);
    const batteryName = battery ? `${battery.brand} ${battery.capacity} ${battery.model}` : '';
    const matchesSearch = batteryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (sale.customer_name && sale.customer_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (dateFilter === 'all') return matchesSearch;
    
    const saleDate = new Date(sale.sale_date);
    const today = new Date();
    
    if (dateFilter === 'today') {
      return matchesSearch && saleDate.toDateString() === today.toDateString();
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      return matchesSearch && saleDate >= weekAgo;
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      return matchesSearch && saleDate >= monthAgo;
    }
    
    return matchesSearch;
  }).sort((a, b) => new Date(b.sale_date) - new Date(a.sale_date));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
            Sales Record
          </h2>
          <p className="text-gray-600">Track all your sales</p>
        </div>
        
        <Dialog open={isAddSaleOpen} onOpenChange={setIsAddSaleOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700">
              <Plus className="h-4 w-4 mr-2" />
              Record Sale
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <RecordSaleForm 
              inventory={inventory}
              onSuccess={() => {
                setIsAddSaleOpen(false);
                onRefresh();
              }}
              user={user}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search sales..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-orange-200 focus:border-orange-400"
          />
        </div>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-full md:w-48 border-orange-200">
            <SelectValue placeholder="Filter by date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sales Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Sales</p>
                <p className="text-xl font-bold">₨ {filteredSales.reduce((sum, sale) => sum + sale.total_amount, 0).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Profit</p>
                <p className="text-xl font-bold">₨ {filteredSales.reduce((sum, sale) => sum + sale.total_profit, 0).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Items Sold</p>
                <p className="text-xl font-bold">{filteredSales.reduce((sum, sale) => sum + sale.quantity_sold, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Table */}
      {filteredSales.length > 0 ? (
        <Card className="border-orange-200">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Battery</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Profit</TableHead>
                    <TableHead>Customer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => {
                    const battery = inventory.find(item => item.id === sale.battery_id);
                    return (
                      <TableRow key={sale.id}>
                        <TableCell className="text-sm">
                          {new Date(sale.sale_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-medium">
                          {battery ? `${battery.brand} ${battery.capacity} ${battery.model}` : 'Unknown'}
                        </TableCell>
                        <TableCell>{sale.quantity_sold}</TableCell>
                        <TableCell>₨ {sale.unit_price.toLocaleString()}</TableCell>
                        <TableCell className="font-semibold">₨ {sale.total_amount.toLocaleString()}</TableCell>
                        <TableCell className="text-emerald-600 font-semibold">₨ {sale.total_profit.toLocaleString()}</TableCell>
                        <TableCell className="text-sm">{sale.customer_name || 'Walk-in'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="text-center py-12 border-orange-200">
          <CardContent>
            <ShoppingCart className="h-12 w-12 text-orange-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              {sales.length === 0 ? 'No sales recorded yet' : 'No sales match your search'}
            </h3>
            <p className="text-gray-500 mb-4">
              {sales.length === 0 ? 'Start by recording your first sale' : 'Try changing your search or filter'}
            </p>
            {sales.length === 0 && (
              <Button 
                onClick={() => setIsAddSaleOpen(true)}
                className="bg-gradient-to-r from-orange-500 to-amber-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Record First Sale
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Record Sale Form Component
function RecordSaleForm({ inventory, onSuccess, user }) {
  const [formData, setFormData] = useState({
    battery_id: '',
    quantity_sold: 1,
    unit_price: '',
    customer_name: '',
    customer_phone: ''
  });
  const [showReceipt, setShowReceipt] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);
  const [selectedBatteryData, setSelectedBatteryData] = useState(null);

  const availableInventory = inventory.filter(item => item.stock_quantity > 0);
  const selectedBattery = availableInventory.find(item => item.id === formData.battery_id);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!selectedBattery) return;

    const saleId = Date.now().toString();
    const saleDate = new Date().toISOString();
    const totalAmount = parseFloat(formData.unit_price) * parseInt(formData.quantity_sold);
    const profitPerUnit = parseFloat(formData.unit_price) - selectedBattery.purchase_price;
    const totalProfit = profitPerUnit * parseInt(formData.quantity_sold);

    const newSale = {
      id: saleId,
      battery_id: formData.battery_id,
      quantity_sold: parseInt(formData.quantity_sold),
      unit_price: parseFloat(formData.unit_price),
      total_amount: totalAmount,
      total_profit: totalProfit,
      profit_per_unit: profitPerUnit,
      customer_name: formData.customer_name || 'Walk-in Customer',
      customer_phone: formData.customer_phone,
      sale_date: saleDate,
      sold_by: user.name
    };

    // Update inventory
    const currentInventory = OfflineStorage.getInventory(user.shop_id);
    const updatedInventory = currentInventory.map(item => 
      item.id === formData.battery_id 
        ? { ...item, stock_quantity: item.stock_quantity - parseInt(formData.quantity_sold) }
        : item
    );
    OfflineStorage.saveInventory(user.shop_id, updatedInventory);

    // Add sale
    const sales = OfflineStorage.getSales(user.shop_id);
    OfflineStorage.saveSales(user.shop_id, [...sales, newSale]);

    // Set up receipt data
    setCompletedSale(newSale);
    setSelectedBatteryData(selectedBattery);
    setShowReceipt(true);
  };

  const handleReceiptClose = () => {
    setShowReceipt(false);
    onSuccess();
  };

  const totalAmount = formData.unit_price && formData.quantity_sold 
    ? parseFloat(formData.unit_price) * parseInt(formData.quantity_sold) 
    : 0;
  const totalProfit = selectedBattery && formData.unit_price && formData.quantity_sold
    ? (parseFloat(formData.unit_price) - selectedBattery.purchase_price) * parseInt(formData.quantity_sold)
    : 0;

  if (showReceipt && completedSale && selectedBatteryData) {
    const shopConfig = OfflineStorage.getShopConfig(user.shop_id);
    return (
      <Receipt 
        sale={completedSale}
        battery={selectedBatteryData}
        shopConfig={shopConfig}
        onClose={handleReceiptClose}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
          Record New Sale
        </DialogTitle>
        <DialogDescription>
          Add a battery sale transaction
        </DialogDescription>
      </DialogHeader>

      <div>
        <Label>Select Battery</Label>
        <Select value={formData.battery_id} onValueChange={(value) => {
          const battery = availableInventory.find(item => item.id === value);
          setFormData({
            ...formData, 
            battery_id: value,
            unit_price: battery ? battery.selling_price.toString() : ''
          });
        }}>
          <SelectTrigger className="border-orange-200">
            <SelectValue placeholder="Choose battery" />
          </SelectTrigger>
          <SelectContent>
            {availableInventory.map((item) => (
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
            Available: <strong>{selectedBattery.stock_quantity} units</strong> | 
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
            className="border-orange-200"
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
            className="border-orange-200"
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
          className="border-orange-200"
        />
      </div>

      <div>
        <Label>Customer Phone (Optional)</Label>
        <Input 
          value={formData.customer_phone}
          onChange={(e) => setFormData({...formData, customer_phone: e.target.value})}
          placeholder="Phone number"
          className="border-orange-200"
        />
      </div>

      {totalAmount > 0 && (
        <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
          <div className="text-sm space-y-1">
            <p><strong>Total Amount:</strong> ₨ {totalAmount.toLocaleString()}</p>
            <p><strong>Total Profit:</strong> ₨ {totalProfit.toLocaleString()}</p>
          </div>
        </div>
      )}

      <Button 
        type="submit" 
        className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700" 
        disabled={!formData.battery_id || !formData.unit_price}
      >
        <DollarSign className="h-4 w-4 mr-2" />
        Record Sale & Print Receipt
      </Button>
    </form>
  );
}

// Analytics View Component
function AnalyticsView({ inventory, sales, user }) {
  const [timeFilter, setTimeFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ from: null, to: null });

  const shopConfig = OfflineStorage.getShopConfig(user.shop_id);

  // Export functions
  const handleExportInventoryToExcel = () => {
    exportInventoryToExcel(inventory, shopConfig);
  };

  const handleExportInventoryToPDF = () => {
    exportInventoryToPDF(inventory, shopConfig);
  };

  const handleExportSalesToExcel = () => {
    const exportDateRange = getDateRangeFromFilter(timeFilter);
    exportSalesToExcel(sales, inventory, shopConfig, exportDateRange);
  };

  const handleExportSalesToPDF = () => {
    const exportDateRange = getDateRangeFromFilter(timeFilter);
    exportSalesToPDF(sales, inventory, shopConfig, exportDateRange);
  };

  const getDateRangeFromFilter = (filter) => {
    if (filter === 'all') return null;
    
    const today = new Date();
    const ranges = {
      today: { from: new Date(today.toDateString()), to: today },
      week: { from: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000), to: today },
      month: { from: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), to: today }
    };
    
    return ranges[filter] || null;
  };

  // Filter sales based on time
  const filteredSales = sales.filter(sale => {
    if (timeFilter === 'all') return true;
    
    const saleDate = new Date(sale.sale_date);
    const today = new Date();
    
    if (timeFilter === 'today') {
      return saleDate.toDateString() === today.toDateString();
    } else if (timeFilter === 'week') {
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      return saleDate >= weekAgo;
    } else if (timeFilter === 'month') {
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      return saleDate >= monthAgo;
    }
    
    return true;
  });

  // Filter inventory based on brand
  const filteredInventory = brandFilter === 'all' 
    ? inventory 
    : inventory.filter(item => item.brand === brandFilter);

  // Calculate analytics
  const totalSales = filteredSales.reduce((sum, sale) => sum + sale.total_amount, 0);
  const totalProfit = filteredSales.reduce((sum, sale) => sum + sale.total_profit, 0);
  const totalInventoryValue = filteredInventory.reduce((sum, item) => sum + (item.stock_quantity * item.purchase_price), 0);
  const lowStockItems = filteredInventory.filter(item => item.stock_quantity <= item.low_stock_alert);

  // Top selling batteries
  const batteryStats = {};
  filteredSales.forEach(sale => {
    const battery = inventory.find(item => item.id === sale.battery_id);
    if (battery && (brandFilter === 'all' || battery.brand === brandFilter)) {
      const key = `${battery.brand} ${battery.capacity}`;
      if (batteryStats[key]) {
        batteryStats[key].quantity += sale.quantity_sold;
        batteryStats[key].revenue += sale.total_amount;
      } else {
        batteryStats[key] = {
          battery: key,
          quantity: sale.quantity_sold,
          revenue: sale.total_amount
        };
      }
    }
  });

  const topSelling = Object.values(batteryStats)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // Brand performance
  const brandStats = {};
  filteredSales.forEach(sale => {
    const battery = inventory.find(item => item.id === sale.battery_id);
    if (battery) {
      if (brandStats[battery.brand]) {
        brandStats[battery.brand].sales += sale.total_amount;
        brandStats[battery.brand].profit += sale.total_profit;
        brandStats[battery.brand].quantity += sale.quantity_sold;
      } else {
        brandStats[battery.brand] = {
          brand: battery.brand,
          sales: sale.total_amount,
          profit: sale.total_profit,
          quantity: sale.quantity_sold
        };
      }
    }
  });

  const topBrands = Object.values(brandStats)
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
            Business Reports
          </h2>
          <p className="text-gray-600">Analytics and insights</p>
        </div>
        
        {/* Export Buttons */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <Label className="text-sm font-medium">Inventory:</Label>
            <Button 
              onClick={handleExportInventoryToExcel} 
              size="sm" 
              variant="outline" 
              className="border-green-200 hover:bg-green-50"
            >
              <Download className="h-4 w-4 mr-1" />
              Excel
            </Button>
            <Button 
              onClick={handleExportInventoryToPDF} 
              size="sm" 
              variant="outline" 
              className="border-red-200 hover:bg-red-50"
            >
              <FileText className="h-4 w-4 mr-1" />
              PDF
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <Label className="text-sm font-medium">Sales:</Label>
            <Button 
              onClick={handleExportSalesToExcel} 
              size="sm" 
              variant="outline" 
              className="border-green-200 hover:bg-green-50"
            >
              <Download className="h-4 w-4 mr-1" />
              Excel
            </Button>
            <Button 
              onClick={handleExportSalesToPDF} 
              size="sm" 
              variant="outline" 
              className="border-red-200 hover:bg-red-50"
            >
              <FileText className="h-4 w-4 mr-1" />
              PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <Label>Time Period:</Label>
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-40 border-orange-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <Label>Brand:</Label>
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger className="w-40 border-orange-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              {BATTERY_BRANDS.map((brand) => (
                <SelectItem key={brand.id} value={brand.name}>{brand.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total Sales</p>
                <p className="text-2xl font-bold">₨ {totalSales.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total Profit</p>
                <p className="text-2xl font-bold">₨ {totalProfit.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Stock Value</p>
                <p className="text-2xl font-bold">₨ {totalInventoryValue.toLocaleString()}</p>
              </div>
              <Package className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-amber-600 text-white border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Low Stock</p>
                <p className="text-2xl font-bold">{lowStockItems.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Batteries */}
        <Card className="border-orange-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              <span>Top Selling Batteries</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topSelling.length > 0 ? (
              <div className="space-y-4">
                {topSelling.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{item.battery}</p>
                        <p className="text-sm text-gray-600">₨ {item.revenue.toLocaleString()} revenue</p>
                      </div>
                    </div>
                    <Badge className="bg-orange-100 text-orange-700">{item.quantity} sold</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No sales data for selected period</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Brand Performance */}
        <Card className="border-orange-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-orange-500" />
              <span>Brand Performance</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topBrands.length > 0 ? (
              <div className="space-y-4">
                {topBrands.map((brand, index) => (
                  <div key={index} className="p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{brand.brand}</span>
                      <Badge className="bg-orange-100 text-orange-700">{brand.quantity} units</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Sales</p>
                        <p className="font-semibold">₨ {brand.sales.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Profit</p>
                        <p className="font-semibold text-emerald-600">₨ {brand.profit.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No sales data for selected period</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="border-orange-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span>Low Stock Alert</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lowStockItems.map((item, index) => (
                <Alert key={index} className="border-orange-200 bg-orange-50">
                  <AlertDescription>
                    <div className="flex justify-between items-center">
                      <div>
                        <strong>{item.brand} {item.capacity} {item.model}</strong>
                        <p className="text-sm">Only {item.stock_quantity} left</p>
                      </div>
                      <Badge variant="destructive">Low!</Badge>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Settings View Component
function SettingsView({ user, onRefresh }) {
  const [shopConfig, setShopConfig] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    name: '',
    role: 'cashier'
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  // Load shop configuration
  useEffect(() => {
    if (user?.shop_id) {
      const config = OfflineStorage.getShopConfig(user.shop_id);
      setShopConfig(config);
      setEditData(config || {});
    }
  }, [user]);

  const handleSaveShopDetails = () => {
    if (user?.shop_id && editData) {
      const updatedConfig = {
        ...shopConfig,
        ...editData,
        shop_id: user.shop_id // Ensure shop_id doesn't change
      };
      OfflineStorage.saveShopConfig(user.shop_id, updatedConfig);
      setShopConfig(updatedConfig);
      setIsEditing(false);
      setMessage({ type: 'success', text: 'Shop details updated successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  const handleAddUser = () => {
    if (user?.shop_id && shopConfig) {
      // Check if username already exists
      const existingUser = shopConfig.users?.find(u => u.username === newUser.username);
      if (existingUser) {
        setMessage({ type: 'error', text: 'Username already exists!' });
        return;
      }

      const updatedConfig = {
        ...shopConfig,
        users: [...(shopConfig.users || []), newUser]
      };
      
      OfflineStorage.saveShopConfig(user.shop_id, updatedConfig);
      setShopConfig(updatedConfig);
      setNewUser({ username: '', password: '', name: '', role: 'cashier' });
      setIsAddUserOpen(false);
      setMessage({ type: 'success', text: 'User added successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  const handleRemoveUser = (username) => {
    if (user?.shop_id && shopConfig && username !== user.username) {
      const updatedConfig = {
        ...shopConfig,
        users: shopConfig.users?.filter(u => u.username !== username) || []
      };
      
      OfflineStorage.saveShopConfig(user.shop_id, updatedConfig);
      setShopConfig(updatedConfig);
      setMessage({ type: 'success', text: 'User removed successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  if (!shopConfig) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Loading shop configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Settings</h1>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-green-100 text-green-800">
            ✅ Licensed
          </Badge>
          <Badge variant="outline" className="bg-blue-100 text-blue-800">
            Shop ID: {user?.shop_id}
          </Badge>
        </div>
      </div>

      {message.text && (
        <Alert className={message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <AlertDescription className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Shop Details Section */}
      <Card className="border-orange-200 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <Store className="h-5 w-5 text-orange-500" />
              <span>Shop Details</span>
            </span>
            <Button
              variant={isEditing ? "outline" : "default"}
              size="sm"
              onClick={() => {
                if (isEditing) {
                  setEditData(shopConfig);
                }
                setIsEditing(!isEditing);
              }}
              className={!isEditing ? "bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700" : ""}
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Shop Name</Label>
                <Input
                  value={editData.shop_name || ''}
                  onChange={(e) => setEditData({...editData, shop_name: e.target.value})}
                  className="border-orange-200 focus:border-orange-400"
                />
              </div>
              <div>
                <Label>Proprietor Name</Label>
                <Input
                  value={editData.proprietor_name || ''}
                  onChange={(e) => setEditData({...editData, proprietor_name: e.target.value})}
                  className="border-orange-200 focus:border-orange-400"
                />
              </div>
              <div>
                <Label>Contact Number</Label>
                <Input
                  value={editData.contact_number || ''}
                  onChange={(e) => setEditData({...editData, contact_number: e.target.value})}
                  className="border-orange-200 focus:border-orange-400"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editData.email || ''}
                  onChange={(e) => setEditData({...editData, email: e.target.value})}
                  className="border-orange-200 focus:border-orange-400"
                />
              </div>
              <div className="md:col-span-2">
                <Label>Address</Label>
                <Input
                  value={editData.address || ''}
                  onChange={(e) => setEditData({...editData, address: e.target.value})}
                  className="border-orange-200 focus:border-orange-400"
                />
              </div>
              <div className="md:col-span-2">
                <Button
                  onClick={handleSaveShopDetails}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold text-gray-600">Shop Name:</p>
                <p className="text-gray-800">{shopConfig.shop_name}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-600">Proprietor:</p>
                <p className="text-gray-800">{shopConfig.proprietor_name}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-600">Contact:</p>
                <p className="text-gray-800">{shopConfig.contact_number}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-600">Email:</p>
                <p className="text-gray-800">{shopConfig.email || 'Not provided'}</p>
              </div>
              <div className="md:col-span-2">
                <p className="font-semibold text-gray-600">Address:</p>
                <p className="text-gray-800">{shopConfig.address}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Management Section */}
      <Card className="border-orange-200 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <User className="h-5 w-5 text-orange-500" />
              <span>User Management</span>
            </span>
            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                  <DialogDescription>Create a new user account for this shop</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Username</Label>
                    <Input
                      value={newUser.username}
                      onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                      placeholder="Enter username"
                      className="border-orange-200 focus:border-orange-400"
                    />
                  </div>
                  <div>
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                      placeholder="Enter password"
                      className="border-orange-200 focus:border-orange-400"
                    />
                  </div>
                  <div>
                    <Label>Full Name</Label>
                    <Input
                      value={newUser.name}
                      onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                      placeholder="Enter full name"
                      className="border-orange-200 focus:border-orange-400"
                    />
                  </div>
                  <div>
                    <Label>Role</Label>
                    <Select value={newUser.role} onValueChange={(value) => setNewUser({...newUser, role: value})}>
                      <SelectTrigger className="border-orange-200 focus:border-orange-400">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner">Owner</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="cashier">Cashier</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleAddUser}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                    disabled={!newUser.username || !newUser.password || !newUser.name}
                  >
                    Add User
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {shopConfig.users?.map((shopUser, index) => (
              <Card key={index} className="border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">{shopUser.name}</h4>
                        <p className="text-sm text-gray-600">@{shopUser.username}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={shopUser.username === user.username ? "default" : "secondary"}>
                        {shopUser.role}
                      </Badge>
                      {shopUser.username === user.username && (
                        <Badge variant="outline" className="bg-blue-100 text-blue-800">
                          Current User
                        </Badge>
                      )}
                      {shopUser.username !== user.username && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveUser(shopUser.username)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;
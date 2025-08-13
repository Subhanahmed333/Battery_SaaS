import React from 'react';

// Receipt Component
export function Receipt({ sale, battery, shopConfig, onPrint, onClose }) {
  const currentDate = new Date(sale.sale_date).toLocaleDateString('en-PK', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const currentTime = new Date(sale.sale_date).toLocaleTimeString('en-PK');

  const handlePrint = () => {
    window.print();
    if (onPrint) onPrint();
  };

  return (
    <>
      {/* Print Styles */}
      <style jsx>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .receipt-print, .receipt-print * {
            visibility: visible;
          }
          .receipt-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>

      <div className="receipt-print bg-white p-6 max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6 border-b-2 border-dashed border-gray-300 pb-4">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">{shopConfig.shop_name}</h1>
          <p className="text-sm text-gray-600">{shopConfig.proprietor_name}</p>
          <p className="text-sm text-gray-600">{shopConfig.contact_number}</p>
          <p className="text-sm text-gray-600 mb-2">{shopConfig.address}</p>
          {shopConfig.email && <p className="text-xs text-gray-500">{shopConfig.email}</p>}
        </div>

        {/* Sale Info */}
        <div className="mb-4 text-sm">
          <div className="flex justify-between mb-1">
            <span>Date:</span>
            <span>{currentDate}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span>Time:</span>
            <span>{currentTime}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span>Invoice #:</span>
            <span>#{sale.id.slice(-8).toUpperCase()}</span>
          </div>
          {sale.customer_name && sale.customer_name !== 'Walk-in Customer' && (
            <div className="flex justify-between mb-1">
              <span>Customer:</span>
              <span>{sale.customer_name}</span>
            </div>
          )}
          {sale.customer_phone && (
            <div className="flex justify-between mb-1">
              <span>Phone:</span>
              <span>{sale.customer_phone}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Served by:</span>
            <span>{sale.sold_by}</span>
          </div>
        </div>

        {/* Items */}
        <div className="border-t border-b border-dashed border-gray-300 py-3 mb-4">
          <div className="text-sm font-semibold mb-2">ITEMS PURCHASED</div>
          
          <div className="mb-3">
            <div className="font-medium text-gray-800">
              {battery.brand} {battery.capacity} {battery.model}
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span>Qty: {sale.quantity_sold} × ₨{sale.unit_price.toLocaleString()}</span>
              <span className="font-semibold">₨{sale.total_amount.toLocaleString()}</span>
            </div>
            {battery.warranty_months && (
              <div className="text-xs text-gray-600 mt-1">
                Warranty: {battery.warranty_months} months
              </div>
            )}
          </div>
        </div>

        {/* Totals */}
        <div className="text-sm mb-6">
          <div className="flex justify-between mb-1">
            <span>Subtotal:</span>
            <span>₨{sale.total_amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t border-gray-200 pt-2">
            <span>TOTAL:</span>
            <span>₨{sale.total_amount.toLocaleString()}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 border-t border-dashed border-gray-300 pt-4">
          <p className="mb-2">Thank you for your business!</p>
          <p className="mb-2">Please keep this receipt for warranty claims</p>
          <div className="mb-4">
            <p>Exchange policy: 7 days with receipt</p>
            <p>Warranty terms apply as per manufacturer</p>
          </div>
          <div className="font-semibold text-orange-600">
            Powered by Murick Battery Management System
          </div>
        </div>

        {/* Print/Close Buttons - Only show on screen */}
        <div className="print:hidden mt-6 flex space-x-3">
          <button
            onClick={handlePrint}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Print Receipt</span>
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}

// Utility function to generate receipt
export function generateReceiptData(sale, inventory, shopConfig, userData) {
  const battery = inventory.find(item => item.id === sale.battery_id);
  
  return {
    sale: {
      ...sale,
      sold_by: sale.sold_by || userData.name
    },
    battery: battery || {
      brand: 'Unknown',
      capacity: 'Unknown',
      model: 'Unknown',
      warranty_months: 0
    },
    shopConfig,
    userData
  };
}
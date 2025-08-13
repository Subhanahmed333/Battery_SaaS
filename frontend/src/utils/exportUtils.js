import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Excel Export Functions
export function exportInventoryToExcel(inventory, shopConfig, dateRange = null) {
  const worksheet = XLSX.utils.json_to_sheet(
    inventory.map(item => ({
      'Brand': item.brand,
      'Capacity': item.capacity,
      'Model': item.model,
      'Stock Quantity': item.stock_quantity,
      'Purchase Price (₨)': item.purchase_price,
      'Selling Price (₨)': item.selling_price,
      'Stock Value (₨)': item.stock_quantity * item.purchase_price,
      'Potential Revenue (₨)': item.stock_quantity * item.selling_price,
      'Profit per Unit (₨)': item.selling_price - item.purchase_price,
      'Low Stock Alert': item.low_stock_alert,
      'Warranty (Months)': item.warranty_months,
      'Supplier': item.supplier || 'N/A',
      'Date Added': new Date(item.date_added).toLocaleDateString('en-PK')
    }))
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory Report');

  // Add shop info as a separate sheet
  const shopInfoSheet = XLSX.utils.json_to_sheet([{
    'Shop Name': shopConfig.shop_name,
    'Proprietor': shopConfig.proprietor_name,
    'Contact': shopConfig.contact_number,
    'Address': shopConfig.address,
    'Export Date': new Date().toLocaleDateString('en-PK'),
    'Total Items': inventory.length,
    'Total Stock Value': inventory.reduce((sum, item) => sum + (item.stock_quantity * item.purchase_price), 0),
    'Total Potential Revenue': inventory.reduce((sum, item) => sum + (item.stock_quantity * item.selling_price), 0)
  }]);
  XLSX.utils.book_append_sheet(workbook, shopInfoSheet, 'Shop Info');

  const fileName = `${shopConfig.shop_name.replace(/\s+/g, '_')}_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

export function exportSalesToExcel(sales, inventory, shopConfig, dateRange = null) {
  let filteredSales = sales;
  
  if (dateRange && dateRange.from && dateRange.to) {
    filteredSales = sales.filter(sale => {
      const saleDate = new Date(sale.sale_date);
      return saleDate >= dateRange.from && saleDate <= dateRange.to;
    });
  }

  const worksheet = XLSX.utils.json_to_sheet(
    filteredSales.map(sale => {
      const battery = inventory.find(item => item.id === sale.battery_id);
      return {
        'Date': new Date(sale.sale_date).toLocaleDateString('en-PK'),
        'Time': new Date(sale.sale_date).toLocaleTimeString('en-PK'),
        'Invoice #': `#${sale.id.slice(-8).toUpperCase()}`,
        'Battery': battery ? `${battery.brand} ${battery.capacity} ${battery.model}` : 'Unknown',
        'Quantity': sale.quantity_sold,
        'Unit Price (₨)': sale.unit_price,
        'Total Amount (₨)': sale.total_amount,
        'Profit per Unit (₨)': sale.profit_per_unit,
        'Total Profit (₨)': sale.total_profit,
        'Customer Name': sale.customer_name || 'Walk-in Customer',
        'Customer Phone': sale.customer_phone || 'N/A',
        'Sold By': sale.sold_by || 'N/A'
      };
    })
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Report');

  // Add summary sheet
  const totalSales = filteredSales.reduce((sum, sale) => sum + sale.total_amount, 0);
  const totalProfit = filteredSales.reduce((sum, sale) => sum + sale.total_profit, 0);
  const totalItems = filteredSales.reduce((sum, sale) => sum + sale.quantity_sold, 0);

  const summarySheet = XLSX.utils.json_to_sheet([{
    'Shop Name': shopConfig.shop_name,
    'Proprietor': shopConfig.proprietor_name,
    'Export Date': new Date().toLocaleDateString('en-PK'),
    'Report Period': dateRange 
      ? `${dateRange.from.toLocaleDateString('en-PK')} to ${dateRange.to.toLocaleDateString('en-PK')}`
      : 'All Time',
    'Total Transactions': filteredSales.length,
    'Total Items Sold': totalItems,
    'Total Sales Amount (₨)': totalSales,
    'Total Profit (₨)': totalProfit,
    'Average Sale Amount (₨)': filteredSales.length > 0 ? Math.round(totalSales / filteredSales.length) : 0
  }]);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  const fileName = `${shopConfig.shop_name.replace(/\s+/g, '_')}_Sales_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

// PDF Export Functions
export function exportInventoryToPDF(inventory, shopConfig, dateRange = null) {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(shopConfig.shop_name, 20, 25);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(shopConfig.proprietor_name, 20, 35);
  doc.text(shopConfig.contact_number, 20, 42);
  doc.text(shopConfig.address, 20, 49);
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('INVENTORY REPORT', 20, 65);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on: ${new Date().toLocaleDateString('en-PK')}`, 20, 75);
  
  // Table
  const tableData = inventory.map(item => [
    item.brand,
    item.capacity,
    item.model,
    item.stock_quantity.toString(),
    `₨${item.purchase_price.toLocaleString()}`,
    `₨${item.selling_price.toLocaleString()}`,
    `₨${(item.stock_quantity * item.purchase_price).toLocaleString()}`,
    item.supplier || 'N/A'
  ]);

  doc.autoTable({
    head: [['Brand', 'Capacity', 'Model', 'Stock', 'Buy Price', 'Sell Price', 'Stock Value', 'Supplier']],
    body: tableData,
    startY: 85,
    theme: 'striped',
    headStyles: { fillColor: [255, 152, 0] },
    styles: { fontSize: 8 },
    columnStyles: {
      3: { halign: 'center' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' }
    }
  });

  // Summary
  const totalStockValue = inventory.reduce((sum, item) => sum + (item.stock_quantity * item.purchase_price), 0);
  const totalPotentialRevenue = inventory.reduce((sum, item) => sum + (item.stock_quantity * item.selling_price), 0);
  const lowStockCount = inventory.filter(item => item.stock_quantity <= item.low_stock_alert).length;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('SUMMARY', 20, doc.lastAutoTable.finalY + 20);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Items: ${inventory.length}`, 20, doc.lastAutoTable.finalY + 30);
  doc.text(`Total Stock Value: ₨${totalStockValue.toLocaleString()}`, 20, doc.lastAutoTable.finalY + 37);
  doc.text(`Potential Revenue: ₨${totalPotentialRevenue.toLocaleString()}`, 20, doc.lastAutoTable.finalY + 44);
  doc.text(`Low Stock Items: ${lowStockCount}`, 20, doc.lastAutoTable.finalY + 51);
  
  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Powered by Murick Battery Management System', 20, doc.internal.pageSize.height - 10);

  const fileName = `${shopConfig.shop_name.replace(/\s+/g, '_')}_Inventory_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

export function exportSalesToPDF(sales, inventory, shopConfig, dateRange = null) {
  let filteredSales = sales;
  
  if (dateRange && dateRange.from && dateRange.to) {
    filteredSales = sales.filter(sale => {
      const saleDate = new Date(sale.sale_date);
      return saleDate >= dateRange.from && saleDate <= dateRange.to;
    });
  }

  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(shopConfig.shop_name, 20, 25);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(shopConfig.proprietor_name, 20, 35);
  doc.text(shopConfig.contact_number, 20, 42);
  doc.text(shopConfig.address, 20, 49);
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('SALES REPORT', 20, 65);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on: ${new Date().toLocaleDateString('en-PK')}`, 20, 75);
  
  if (dateRange && dateRange.from && dateRange.to) {
    doc.text(`Period: ${dateRange.from.toLocaleDateString('en-PK')} to ${dateRange.to.toLocaleDateString('en-PK')}`, 20, 82);
  }
  
  // Table
  const tableData = filteredSales.map(sale => {
    const battery = inventory.find(item => item.id === sale.battery_id);
    return [
      new Date(sale.sale_date).toLocaleDateString('en-PK'),
      battery ? `${battery.brand} ${battery.capacity}` : 'Unknown',
      sale.quantity_sold.toString(),
      `₨${sale.unit_price.toLocaleString()}`,
      `₨${sale.total_amount.toLocaleString()}`,
      `₨${sale.total_profit.toLocaleString()}`,
      sale.customer_name || 'Walk-in'
    ];
  });

  doc.autoTable({
    head: [['Date', 'Battery', 'Qty', 'Price', 'Total', 'Profit', 'Customer']],
    body: tableData,
    startY: dateRange ? 90 : 85,
    theme: 'striped',
    headStyles: { fillColor: [255, 152, 0] },
    styles: { fontSize: 8 },
    columnStyles: {
      2: { halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' }
    }
  });

  // Summary
  const totalSales = filteredSales.reduce((sum, sale) => sum + sale.total_amount, 0);
  const totalProfit = filteredSales.reduce((sum, sale) => sum + sale.total_profit, 0);
  const totalItems = filteredSales.reduce((sum, sale) => sum + sale.quantity_sold, 0);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('SUMMARY', 20, doc.lastAutoTable.finalY + 20);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Transactions: ${filteredSales.length}`, 20, doc.lastAutoTable.finalY + 30);
  doc.text(`Total Items Sold: ${totalItems}`, 20, doc.lastAutoTable.finalY + 37);
  doc.text(`Total Sales: ₨${totalSales.toLocaleString()}`, 20, doc.lastAutoTable.finalY + 44);
  doc.text(`Total Profit: ₨${totalProfit.toLocaleString()}`, 20, doc.lastAutoTable.finalY + 51);
  doc.text(`Average Sale: ₨${filteredSales.length > 0 ? Math.round(totalSales / filteredSales.length).toLocaleString() : '0'}`, 20, doc.lastAutoTable.finalY + 58);
  
  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Powered by Murick Battery Management System', 20, doc.internal.pageSize.height - 10);

  const fileName = `${shopConfig.shop_name.replace(/\s+/g, '_')}_Sales_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
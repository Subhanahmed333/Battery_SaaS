// Import the necessary library for creating Excel files.
import * as XLSX from 'xlsx';

// Import the core library for creating PDF documents.
import jsPDF from 'jspdf';

// Import the autoTable plugin as a named export.
import autoTable from 'jspdf-autotable';


// ===================================================================================
//
//  PDF HELPER FUNCTIONS (No changes needed here)
//
// ===================================================================================
function addPdfHeader(doc, shopConfig, reportTitle, dateRange = null) {
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
  doc.text(reportTitle, 20, 65);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on: ${new Date().toLocaleDateString('en-PK')}`, 20, 75);
  let startY = 85;
  if (dateRange && dateRange.from && dateRange.to) {
    doc.text(`Period: ${dateRange.from.toLocaleDateString('en-PK')} to ${dateRange.to.toLocaleDateString('en-PK')}`, 20, 82);
    startY = 90;
  }
  return startY;
}

function addPdfFooter(doc) {
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Powered by Murick Battery Management System', 20, doc.internal.pageSize.height - 10);
}


// ===================================================================================
//
//  EXCEL EXPORT FUNCTIONS (No changes needed here, Excel handles symbols better)
//
// ===================================================================================
export function exportInventoryToExcel(inventory, shopConfig) {
  if (!inventory || inventory.length === 0) {
    alert("No inventory data to export.");
    return;
  }
  const worksheet = XLSX.utils.json_to_sheet(inventory.map(item => ({'Brand': item.brand,'Capacity': item.capacity,'Model': item.model,'Stock Quantity': item.stock_quantity,'Purchase Price (₨)': item.purchase_price,'Selling Price (₨)': item.selling_price,'Stock Value (₨)': item.stock_quantity * item.purchase_price,'Potential Revenue (₨)': item.stock_quantity * item.selling_price,'Profit per Unit (₨)': item.selling_price - item.purchase_price,'Low Stock Alert': item.low_stock_alert,'Warranty (Months)': item.warranty_months,'Supplier': item.supplier || 'N/A','Date Added': new Date(item.date_added).toLocaleDateString('en-PK')})));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory Report');
  const shopInfoSheet = XLSX.utils.json_to_sheet([{'Shop Name': shopConfig.shop_name,'Proprietor': shopConfig.proprietor_name,'Contact': shopConfig.contact_number,'Address': shopConfig.address,'Export Date': new Date().toLocaleDateString('en-PK'),'Total Unique Items': inventory.length,'Total Stock Value': inventory.reduce((sum, item) => sum + (item.stock_quantity * item.purchase_price), 0),'Total Potential Revenue': inventory.reduce((sum, item) => sum + (item.stock_quantity * item.selling_price), 0)}]);
  XLSX.utils.book_append_sheet(workbook, shopInfoSheet, 'Shop Info');
  const fileName = `${shopConfig.shop_name.replace(/\s+/g, '_')}_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

export function exportSalesToExcel(sales, inventory, shopConfig, dateRange = null) {
  if (!sales || sales.length === 0) {
    alert("No sales data available to export.");
    return;
  }
  let filteredSales = sales;
  if (dateRange && dateRange.from && dateRange.to) {
    filteredSales = sales.filter(sale => {
      const saleDate = new Date(sale.sale_date);
      return saleDate >= dateRange.from && saleDate <= dateRange.to;
    });
  }
  if (filteredSales.length === 0) {
    alert("No sales data found for the selected period.");
    return;
  }
  const worksheet = XLSX.utils.json_to_sheet(filteredSales.map(sale => {const battery = inventory.find(item => item.id === sale.battery_id);return {'Date': new Date(sale.sale_date).toLocaleDateString('en-PK'),'Time': new Date(sale.sale_date).toLocaleTimeString('en-PK'),'Invoice #': `#${sale.id.slice(-8).toUpperCase()}`,'Battery': battery ? `${battery.brand} ${battery.capacity} ${battery.model}` : 'Unknown','Quantity': sale.quantity_sold,'Unit Price (₨)': sale.unit_price,'Total Amount (₨)': sale.total_amount,'Profit per Unit (₨)': sale.profit_per_unit,'Total Profit (₨)': sale.total_profit,'Customer Name': sale.customer_name || 'Walk-in Customer','Customer Phone': sale.customer_phone || 'N/A','Sold By': sale.sold_by || 'N/A'};}));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Report');
  const totalSales = filteredSales.reduce((sum, sale) => sum + sale.total_amount, 0);
  const totalProfit = filteredSales.reduce((sum, sale) => sum + sale.total_profit, 0);
  const totalItems = filteredSales.reduce((sum, sale) => sum + sale.quantity_sold, 0);
  const summarySheet = XLSX.utils.json_to_sheet([{'Shop Name': shopConfig.shop_name,'Proprietor': shopConfig.proprietor_name,'Export Date': new Date().toLocaleDateString('en-PK'),'Report Period': dateRange ? `${dateRange.from.toLocaleDateString('en-PK')} to ${dateRange.to.toLocaleDateString('en-PK')}` : 'All Time','Total Transactions': filteredSales.length,'Total Items Sold': totalItems,'Total Sales Amount (₨)': totalSales,'Total Profit (₨)': totalProfit,'Average Sale Amount (₨)': filteredSales.length > 0 ? Math.round(totalSales / filteredSales.length) : 0}]);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  const fileName = `${shopConfig.shop_name.replace(/\s+/g, '_')}_Sales_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}


// ===================================================================================
//
//  PDF EXPORT FUNCTIONS (WITH FONT FIX)
//
// ===================================================================================

export function exportInventoryToPDF(inventory, shopConfig) {
  if (!inventory || inventory.length === 0) {
    alert("No inventory data to export.");
    return;
  }

  const doc = new jsPDF();
  const tableStartY = addPdfHeader(doc, shopConfig, 'INVENTORY REPORT');

  const tableData = inventory.map(item => [
    item.brand, item.capacity, item.model,
    item.stock_quantity.toString(),
    // FONT FIX: Changed '₨' to 'Rs '
    `Rs ${item.purchase_price.toLocaleString()}`,
    `Rs ${item.selling_price.toLocaleString()}`,
    `Rs ${(item.stock_quantity * item.purchase_price).toLocaleString()}`,
    item.supplier || 'N/A'
  ]);

  autoTable(doc, {
    head: [['Brand', 'Capacity', 'Model', 'Stock', 'Buy Price', 'Sell Price', 'Stock Value', 'Supplier']],
    body: tableData,
    startY: tableStartY,
    theme: 'striped',
    headStyles: { fillColor: [255, 152, 0] },
    styles: { fontSize: 8 },
    columnStyles: {
      3: { halign: 'center' }, 4: { halign: 'right' },
      5: { halign: 'right' }, 6: { halign: 'right' }
    }
  });

  const totalStockValue = inventory.reduce((sum, item) => sum + (item.stock_quantity * item.purchase_price), 0);
  const totalPotentialRevenue = inventory.reduce((sum, item) => sum + (item.stock_quantity * item.selling_price), 0);
  const lowStockCount = inventory.filter(item => item.stock_quantity <= item.low_stock_alert).length;

  const summaryY = doc.lastAutoTable.finalY + 20; 
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('SUMMARY', 20, summaryY);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Unique Items: ${inventory.length}`, 20, summaryY + 10);
  // FONT FIX: Changed '₨' to 'Rs '
  doc.text(`Total Stock Value: Rs ${totalStockValue.toLocaleString()}`, 20, summaryY + 17);
  doc.text(`Potential Revenue: Rs ${totalPotentialRevenue.toLocaleString()}`, 20, summaryY + 24);
  doc.text(`Low Stock Items: ${lowStockCount}`, 20, summaryY + 31);
  
  addPdfFooter(doc);
  const fileName = `${shopConfig.shop_name.replace(/\s+/g, '_')}_Inventory_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

export function exportSalesToPDF(sales, inventory, shopConfig, dateRange = null) {
  if (!sales || sales.length === 0) {
    alert("No sales data available to export.");
    return;
  }

  let filteredSales = sales;
  if (dateRange && dateRange.from && dateRange.to) {
    filteredSales = sales.filter(sale => {
      const saleDate = new Date(sale.sale_date);
      return saleDate >= dateRange.from && saleDate <= dateRange.to;
    });
  }

  if (filteredSales.length === 0) {
    alert("No sales data found for the selected period.");
    return;
  }

  const doc = new jsPDF();
  const tableStartY = addPdfHeader(doc, shopConfig, 'SALES REPORT', dateRange);

  const tableData = filteredSales.map(sale => {
    const battery = inventory.find(item => item.id === sale.battery_id);
    return [
      new Date(sale.sale_date).toLocaleDateString('en-PK'),
      battery ? `${battery.brand} ${battery.capacity}` : 'Unknown',
      sale.quantity_sold.toString(),
      // FONT FIX: Changed '₨' to 'Rs '
      `Rs ${sale.unit_price.toLocaleString()}`,
      `Rs ${sale.total_amount.toLocaleString()}`,
      `Rs ${sale.total_profit.toLocaleString()}`,
      sale.customer_name || 'Walk-in'
    ];
  });

  autoTable(doc, {
    head: [['Date', 'Battery', 'Qty', 'Price', 'Total', 'Profit', 'Customer']],
    body: tableData,
    startY: tableStartY,
    theme: 'striped',
    headStyles: { fillColor: [255, 152, 0] },
    styles: { fontSize: 8 },
    columnStyles: {
      2: { halign: 'center' }, 3: { halign: 'right' },
      4: { halign: 'right' }, 5: { halign: 'right' }
    }
  });

  const totalSales = filteredSales.reduce((sum, sale) => sum + sale.total_amount, 0);
  const totalProfit = filteredSales.reduce((sum, sale) => sum + sale.total_profit, 0);
  const totalItems = filteredSales.reduce((sum, sale) => sum + sale.quantity_sold, 0);

  const summaryY = doc.lastAutoTable.finalY + 20;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('SUMMARY', 20, summaryY);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Transactions: ${filteredSales.length}`, 20, summaryY + 10);
  doc.text(`Total Items Sold: ${totalItems}`, 20, summaryY + 17);
  // FONT FIX: Changed '₨' to 'Rs '
  doc.text(`Total Sales: Rs ${totalSales.toLocaleString()}`, 20, summaryY + 24);
  doc.text(`Total Profit: Rs ${totalProfit.toLocaleString()}`, 20, summaryY + 31);
  doc.text(`Average Sale: Rs ${filteredSales.length > 0 ? Math.round(totalSales / filteredSales.length).toLocaleString() : '0'}`, 20, summaryY + 38);
  
  addPdfFooter(doc);
  const fileName = `${shopConfig.shop_name.replace(/\s+/g, '_')}_Sales_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
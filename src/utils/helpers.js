import { STATUS_CONFIG, QC_STATUS_CONFIG, COLUMN_MAPPINGS } from './constants.js';

// Data processing helpers
export const getColumnValue = (row, columnKey, fallbackColumns = []) => {
  const allColumns = [columnKey, ...fallbackColumns];
  for (const col of allColumns) {
    if (row[col] !== undefined && row[col] !== null && row[col] !== '') {
      return row[col];
    }
  }
  return '';
};

export const normalizeSku = (sku) => {
  return sku?.toString().trim().toUpperCase() || '';
};

export const parseQuantity = (value) => {
  const parsed = parseInt(value);
  return isNaN(parsed) ? 0 : parsed;
};

// Status helpers
export const getStatusColor = (status) => {
  if (!status) return STATUS_CONFIG.colors.default;
  return STATUS_CONFIG.colors[status.toLowerCase()] || STATUS_CONFIG.colors.default;
};

export const getStatusClass = (status) => {
  if (!status) return STATUS_CONFIG.classes.default;
  return STATUS_CONFIG.classes[status.toLowerCase()] || STATUS_CONFIG.classes.default;
};

export const getQCStatusColor = (qcStatus) => {
  if (!qcStatus) return QC_STATUS_CONFIG.colors["not performed"];
  return QC_STATUS_CONFIG.colors[qcStatus.toLowerCase()] || QC_STATUS_CONFIG.colors["not performed"];
};

export const getQCStatusClass = (qcStatus) => {
  if (!qcStatus) return QC_STATUS_CONFIG.classes["not performed"];
  return QC_STATUS_CONFIG.classes[qcStatus.toLowerCase()] || QC_STATUS_CONFIG.classes["not performed"];
};

// Column mapping helpers
export const findColumnMapping = (fileType, columnKey) => {
  return COLUMN_MAPPINGS[fileType]?.[columnKey] || [];
};

export const detectColumns = (headers, fileType) => {
  const detected = {};
  const mappings = COLUMN_MAPPINGS[fileType];
  
  if (!mappings) return detected;
  
  Object.entries(mappings).forEach(([key, possibleNames]) => {
    for (const name of possibleNames) {
      if (headers.includes(name)) {
        detected[key] = name;
        break;
      }
    }
  });
  
  return detected;
};

// Validation helpers
export const validateRequiredFields = (data, requiredFields) => {
  const missing = requiredFields.filter(field => {
    const value = data[field];
    if (field === "qcDoneBy") {
      return !Array.isArray(value) || value.length === 0;
    }
    return !value || (typeof value === "string" && !value.trim());
  });
  
  return { isValid: missing.length === 0, missing };
};

export const validateFile = (file, allowedTypes, maxSize) => {
  const errors = [];
  
  if (!file) {
    errors.push("No file selected");
    return { isValid: false, errors };
  }
  
  const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
  if (!allowedTypes.includes(fileExtension)) {
    errors.push("Invalid file type");
  }
  
  if (file.size > maxSize) {
    errors.push("File too large");
  }
  
  return { isValid: errors.length === 0, errors };
};

// Calculation helpers
export const calculatePercentage = (numerator, denominator) => {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 100);
};

export const calculateSummaryStats = (grnData) => {
  const stats = {
    totalItems: grnData.length,
    totalOrderedQty: grnData.reduce((sum, item) => sum + (item["Ordered Qty"] || 0), 0),
    totalReceivedQty: grnData.reduce((sum, item) => sum + (item["Received Qty"] || 0), 0),
    totalPassedQCQty: grnData.reduce((sum, item) => sum + (item["Passed QC Qty"] || 0), 0),
    totalFailedQCQty: grnData.reduce((sum, item) => sum + (item["Failed QC Qty"] || 0), 0),
    items: {
      complete: grnData.filter((item) => 
        item.Status === "Received" && item["QC Status"] === "Passed"
      ).length,
      partialQC: grnData.filter((item) => 
        item["QC Status"] === "Partial"
      ).length,
      failedQC: grnData.filter((item) => 
        item["QC Status"] === "Failed"
      ).length,
      quantityIssues: {
        shortage: grnData.filter((item) => item.Status === "Shortage" || item.Status === "Shortage & QC Failed").length,
        excess: grnData.filter((item) => item.Status === "Excess" || item.Status === "Excess & QC Failed").length,
        notReceived: grnData.filter((item) => item.Status === "Not Received").length,
        notOrdered: grnData.filter((item) => item.Status === "Excess Receipt").length,
      }
    },
    quantities: {
      shortage: grnData.reduce((sum, item) => sum + (item["Shortage Qty"] || 0), 0),
      excess: grnData.reduce((sum, item) => sum + (item["Excess Qty"] || 0), 0),
      notReceived: grnData.filter(item => item.Status === "Not Received")
        .reduce((sum, item) => sum + (item["Ordered Qty"] || 0), 0),
      notOrdered: grnData.filter(item => item.Status === "Excess Receipt")
        .reduce((sum, item) => sum + (item["Received Qty"] || 0), 0),
      completeQC: grnData.filter((item) => 
        item.Status === "Received" && item["QC Status"] === "Passed"
      ).reduce((sum, item) => sum + (item["Passed QC Qty"] || 0), 0),
      partialQC: grnData.filter((item) => 
        item["QC Status"] === "Partial"
      ).reduce((sum, item) => sum + (item["Failed QC Qty"] || 0), 0),
      failedQC: grnData.filter((item) => 
        item["QC Status"] === "Failed"
      ).reduce((sum, item) => sum + (item["Failed QC Qty"] || 0), 0)
    }
  };

  // Calculate issue summary
  stats.items.withBothIssues = grnData.filter((item) => 
    item["QC Status"] !== "Passed" && 
    item["QC Status"] !== "Not Performed" && 
    ["Shortage", "Excess", "Not Received", "Excess Receipt", "Shortage & QC Failed", "Excess & QC Failed"].includes(item.Status)
  ).length;

  stats.items.onlyQCFailed = grnData.filter((item) => 
    item["QC Status"] !== "Passed" && 
    item["QC Status"] !== "Not Performed" && 
    !["Shortage", "Excess", "Not Received", "Excess Receipt", "Shortage & QC Failed", "Excess & QC Failed"].includes(item.Status)
  ).length;

  stats.items.onlyQuantityIssues = grnData.filter((item) => 
    (item["QC Status"] === "Passed" || item["QC Status"] === "Not Performed") && 
    ((item["Shortage Qty"] || 0) > 0 || (item["Excess Qty"] || 0) > 0 || (item["Not Ordered Qty"] || 0) > 0 || item.Status === "Not Received")
  ).length;

  stats.items.withIssues = 
    stats.items.onlyQCFailed + 
    stats.items.onlyQuantityIssues + 
    stats.items.withBothIssues;

  // Calculate percentages
  stats.qcPassRate = stats.totalReceivedQty > 0 
    ? ((stats.totalPassedQCQty / stats.totalReceivedQty) * 100).toFixed(1)
    : 0;

  stats.receiptAccuracy = stats.totalOrderedQty > 0
    ? ((stats.totalReceivedQty / stats.totalOrderedQty) * 100).toFixed(1)
    : 0;

  return stats;
};

// Export helpers
export const generateDocumentNumber = (brandName, replenishmentNumber) => {
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0].replace(/-/g, "");
  return `GRN-KNOT-${dateStr}-${brandName.replace(/\s+/g, "")}-${replenishmentNumber}`;
};

export const formatDateTime = () => {
  const now = new Date();
  return {
    date: now.toLocaleDateString("en-GB"),
    time: now.toLocaleTimeString(),
    iso: now.toISOString()
  };
};

// CSV helpers
export const escapeCSV = (value) => {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

export const convertToCSVString = (lines) => {
  return lines.map(line => 
    line.map(cell => escapeCSV(cell)).join(',')
  ).join('\n');
};

// Generate sample CSV data for testing
export const generateSampleCSVData = (fileType) => {
  // Updated sample structures to match real files, with only headers and empty rows
  const samples = {
    purchaseOrder: {
      // Matches the real PO file: includes metadata rows, blank lines, and the correct header row
      lines: [
        ',,,,,,,,,,,',
        ',,BLOCK POOL TECHNOLOGIES PRIVATE LIMITED,,,,,,PURCHASE ORDER,,,',
        ',,,,,,,,,,,',
        ',,,,,,,,,,,',
        ',,,,,,,,,,P.O. NUMBER,DATE',
        ',,,,,,,,,,XXXXXXXX,DD/MM/YYYY',
        ',,VENDOR,,,,,,,CUSTOMER,,',
        ',,NAME,,,BILLING DETAILS,,,,NAME,,',
        ',,Vendor Name,,,Vendor Company Name,,,,Customer Name,,',
        ',,COMPANY NAME,,,GST - XXXXXXXXXXXXXX,,,,COMPANY NAME,,',
        ',,Brand Name,,,"ADDRESS - ...",,,,Customer Company Name,,',
        ',,ADDRESS,,,EMAIL ID - ...,,,,BILLING ADDRESS,,',
        ',,,,,PAN - XXXXXXXXXX\t\t\t\t\t\t\t\t,,,,"...",,',
        ',,,,,,,,,,,',
        ',,PHONE,,,,,,,PHONE,,',
        ',,XXXXXXXXXX,,,,,,,XXXXXXXXXX,,',
        ',,EMAIL ADDRESS,,,,,,,EMAIL ADDRESS,,',
        ',,vendor@email.com,,,,,,,customer@email.com,,',
        ',,SHIP FROM,,,,,,,SHIP TO,,',
        ',,,,,,,,,,"...",,',
        ',,,,,,,,,,,',
        ',,,,,,,,,,,',
        ',,,,,,,,,,,',
        ',,Sno,Brand SKU Code,,Size,Colors,,Quantity,Unit Price,Amount,',
        ',,1,XXXXXXXX,,S,-,,10,500,5000,',
        ',,2,XXXXXXXX,,M,-,,15,600,9000,',
        ',,3,XXXXXXXX,,L,-,,8,550,4400,',
        ',,4,XXXXXXXX,,XL,-,,12,650,7800,',
        ',,5,XXXXXXXX,,S,-,,20,450,9000,',
      ]
    },
    putAway: {
      // Matches the real Putaway file: simple two-column header, no extra metadata
      lines: [
        'SKU,BIN',
        ',',
        ',',
        ',',
        ',',
        ',',
      ]
    },
    qcFail: {
      // Matches the real QC Fail file: two columns, no extra metadata
      lines: [
        'SKU,REMARK',
        ',',
        ',',
        ',',
        ',',
      ]
    }
  };

  const sample = samples[fileType];
  if (!sample) {
    throw new Error(`Unknown file type: ${fileType}`);
  }

  // Join lines with \r\n for Windows compatibility
  const csvContent = sample.lines.join('\r\n');

  return csvContent;
};

// Download sample CSV file
export const downloadSampleCSV = (fileType) => {
  const csvContent = generateSampleCSVData(fileType);
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sample-${fileType}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}; 
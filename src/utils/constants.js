// Company logo in base64 format
export const COMPANY_LOGO_BASE64 = "data:image/png;base64,..."; // Add your logo base64 here

// Test data templates for quick form filling
export const TEST_DATA_TEMPLATES = {
  // Template 1: Standard GRN with QC performed
  standard: {
    grnHeaderInfo: {
      poNumber: "PO-2024-001",
      brandName: "House of Koala",
      replenishmentNumber: "REP-2024-001",
      inwardDate: new Date().toISOString().split('T')[0], // Today's date
      warehouseNo: "WH-MUM-01",
      verifiedBy: "Noorul Sheikh",
      warehouseManagerName: "Shoeb Sheikh",
      qcPerformed: true,
      qcDoneBy: ["Abhishek", "LuvKush"]
    },
    previousValues: {
      warehouseNos: ["WH-MUM-01", "WH-DEL-02", "WH-BLR-03"],
      qcPersons: ["Abhishek", "LuvKush", "Sandeep", "Kuldeep", "Suraj", "Krish"],
      supervisors: ["Noorul Sheikh", "Preetam Yadav", "Rajesh Kumar"],
      warehouseManagers: ["Shoeb Sheikh", "Amit Patel", "Rahul Singh"]
    }
  },
  
  // Template 2: QC not performed
  noQC: {
    grnHeaderInfo: {
      poNumber: "PO-2024-002",
      brandName: "Bonkers Corner",
      replenishmentNumber: "REP-2024-002",
      inwardDate: new Date().toISOString().split('T')[0],
      warehouseNo: "WH-DEL-02",
      verifiedBy: "Preetam Yadav",
      warehouseManagerName: "Amit Patel",
      qcPerformed: false,
      qcDoneBy: []
    },
    previousValues: {
      warehouseNos: ["WH-MUM-01", "WH-DEL-02", "WH-BLR-03"],
      qcPersons: ["Abhishek", "LuvKush", "Sandeep", "Kuldeep", "Suraj", "Krish"],
      supervisors: ["Noorul Sheikh", "Preetam Yadav", "Rajesh Kumar"],
      warehouseManagers: ["Shoeb Sheikh", "Amit Patel", "Rahul Singh"]
    }
  },
  
  // Template 3: Different brand and warehouse
  alternative: {
    grnHeaderInfo: {
      poNumber: "PO-2024-003",
      brandName: "Rangita",
      replenishmentNumber: "REP-2024-003",
      inwardDate: new Date().toISOString().split('T')[0],
      warehouseNo: "WH-BLR-03",
      verifiedBy: "Rajesh Kumar",
      warehouseManagerName: "Rahul Singh",
      qcPerformed: true,
      qcDoneBy: ["Sandeep", "Kuldeep"]
    },
    previousValues: {
      warehouseNos: ["WH-MUM-01", "WH-DEL-02", "WH-BLR-03"],
      qcPersons: ["Abhishek", "LuvKush", "Sandeep", "Kuldeep", "Suraj", "Krish"],
      supervisors: ["Noorul Sheikh", "Preetam Yadav", "Rajesh Kumar"],
      warehouseManagers: ["Shoeb Sheikh", "Amit Patel", "Rahul Singh"]
    }
  },
  
  // Template 4: Minimal data (for testing validation)
  minimal: {
    grnHeaderInfo: {
      poNumber: "",
      brandName: "",
      replenishmentNumber: "REP-MIN-001",
      inwardDate: new Date().toISOString().split('T')[0],
      warehouseNo: "WH-MUM-01",
      verifiedBy: "Noorul Sheikh",
      warehouseManagerName: "Shoeb Sheikh",
      qcPerformed: false,
      qcDoneBy: []
    },
    previousValues: {
      warehouseNos: ["WH-MUM-01"],
      qcPersons: ["Abhishek"],
      supervisors: ["Noorul Sheikh"],
      warehouseManagers: ["Shoeb Sheikh"]
    }
  }
};

// Default values for dropdowns
export const DEFAULT_VALUES = {
  warehouseNos: ["WH-MUM-01"],
  qcPersons: ["Abhishek", "LuvKush", "Sandeep", "Kuldeep", "Suraj", "Krish"],
  supervisors: ["Noorul Sheikh", "Preetam Yadav"],
  warehouseManagers: ["Shoeb Sheikh"],
};

// Initial GRN header info
export const INITIAL_GRN_HEADER = {
  poNumber: "",
  brandName: "",
  replenishmentNumber: "",
  inwardDate: "",
  warehouseNo: "",
  qcDoneBy: "",
  verifiedBy: "",
  warehouseManagerName: "",
};

// Required fields for GRN generation
export const REQUIRED_FIELDS = [
  "replenishmentNumber",
  "inwardDate",
  "warehouseNo",
  "verifiedBy",
  "warehouseManagerName",
];

// Status configurations
export const STATUS_CONFIG = {
  colors: {
    complete: "text-green-600",
    received: "text-green-600",
    shortage: "text-orange-600",
    "shortage & qc failed": "text-orange-600",
    excess: "text-blue-600",
    "excess & qc failed": "text-blue-600",
    "not received": "text-red-600",
    "not ordered": "text-purple-600",
    "excess receipt": "text-purple-600",
    "qc failed receipt": "text-red-600",
    default: "text-gray-600"
  },
  classes: {
    complete: "status-complete",
    received: "status-complete",
    shortage: "status-shortage",
    "shortage & qc failed": "status-shortage-qc-failed",
    excess: "status-excess",
    "excess & qc failed": "status-excess-qc-failed",
    "not received": "status-not-received",
    "not ordered": "status-not-ordered",
    "excess receipt": "status-excess-receipt",
    "qc failed receipt": "status-qc-failed-receipt",
    default: "status-default"
  }
};

// QC Status configurations
export const QC_STATUS_CONFIG = {
  colors: {
    passed: "text-green-600",
    failed: "text-red-600",
    partial: "text-yellow-600",
    "not performed": "text-gray-600"
  },
  classes: {
    passed: "status-passed",
    failed: "status-failed",
    partial: "status-partial",
    "not performed": "status-not-performed"
  }
};

// Column mappings for different file types
export const COLUMN_MAPPINGS = {
  purchaseOrder: {
    skuCode: ["Brand SKU Code", "SKU Code", "SKU"],
    knotSku: ["KNOT SKU Code", "KNOT SKU"],
    size: ["Size"],
    color: ["Color", "Colour"],
    quantity: ["Quantity", "Qty", "Ordered Qty"],
    unitPrice: ["Unit Price", "Price"],
    amount: ["Amount", "Total"]
  },
  putAway: {
    skuCode: ["SKU ID", "SKU", "Brand SKU Code"],
    knotSku: ["KNOT SKU Code", "KNOT SKU"],
    bin: ["bin location", "Bin Location", "BIN LOCATION", "Location", "Storage Location"],
    quantity: ["Quantity", "Qty", "Put Away Qty"]
  },
  qcFail: {
    skuCode: ["SKU", "Brand SKU Code", "KNOT SKU Code"],
    knotSku: ["KNOT SKU Code", "KNOT SKU"],
    quantity: ["Quantity", "Failed Quantity", "1"],
    status: ["Status", "Failed"],
    remarks: ["Remarks", "QC Failed"]
  }
};

// File validation rules
export const FILE_VALIDATION = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['.csv', '.xlsx', '.xls'],
  requiredColumns: {
    purchaseOrder: ['Brand SKU Code', 'Quantity'],
    putAway: ['SKU', 'bin location'],
    qcFail: ['SKU']
  }
};

// UI Configuration
export const UI_CONFIG = {
  tablePageSize: 50,
  maxPreviewRows: 10,
  exportFormats: ['html', 'csv', 'pdf'],
  defaultSkuCodeType: 'BRAND'
};

// Error messages
export const ERROR_MESSAGES = {
  fileUpload: {
    invalidType: "Please upload a valid CSV or Excel file",
    tooLarge: "File size must be less than 10MB",
    required: "This file is required",
    processing: "Error processing file"
  },
  grnGeneration: {
    missingFields: "Please fill in all required fields",
    noData: "No data available for GRN generation",
    processing: "Error generating GRN"
  }
}; 
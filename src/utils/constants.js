// Company logo in base64 format
export const COMPANY_LOGO_BASE64 = "data:image/png;base64,..."; // Add your logo base64 here

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
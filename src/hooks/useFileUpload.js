import { useState, useCallback, useEffect } from 'react';
import Papa from 'papaparse';
import { validateFile, detectColumns, normalizeSku, parseQuantity } from '../utils/helpers.js';
import { FILE_VALIDATION, ERROR_MESSAGES } from '../utils/constants.js';

export const useFileUpload = () => {
  const [data, setData] = useState({
    purchaseOrder: [],
    putAway: [],
    qcFail: []
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  const [grnHeaderInfo, setGrnHeaderInfo] = useState({
    poNumber: "",
    brandName: "",
  });
  const [columnMapping, setColumnMapping] = useState({});
  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    fileType: "",
    processedData: [],
    rawData: [],
    detectedHeaders: null,
    onConfirm: null
  });
  const [skuCodeType, setSkuCodeType] = useState('BRAND');

  // Debug effect to monitor putAwayData changes
  useEffect(() => {
    console.log('putAwayData state changed:', data.putAway.length, 'rows');
    if (data.putAway.length > 0) {
      console.log('First putAwayData row:', data.putAway[0]);
    }
  }, [data.putAway]);

  const extractHeaderInfo = (results, fileType) => {
    if (fileType !== 'purchaseOrder') return { poNumber: "", brandName: "" };
    
    let poNumber = "", brandName = "";
    
    // Try to extract PO Number from J6 (row 5, column 9) if it exists
    if (results.data.length > 5 && results.data[5]?.[10]) {
      poNumber = results.data[5][10].toString().trim();
    }
    
    // Try to extract Brand Name from C11 (row 10, column 2) if it exists
    if (results.data.length > 10 && results.data[10]?.[2]) {
      brandName = results.data[10][2].toString().trim();
    }

    // If brand name is still empty, search for it in nearby cells
    if (!brandName) {
      for (let row = 6; row <= 12; row++) {
        if (results.data[row]) {
          for (let col = 0; col <= 5; col++) {
            const cellValue = results.data[row]?.[col]?.toString().trim() || "";
            if (cellValue && cellValue.length > 2 && cellValue.length < 50 && 
                isNaN(cellValue) && !cellValue.toLowerCase().includes("sno")) {
              brandName = cellValue;
              break;
            }
          }
          if (brandName) break;
        }
      }
    }
    
    // For simple files without metadata, provide default values
    if (!poNumber) {
      poNumber = "Sample PO";
    }
    if (!brandName) {
      brandName = "Sample Brand";
    }
    
    return { poNumber, brandName };
  };

  const findHeaderRow = (data, fileType) => {
    console.log('findHeaderRow: Searching for header row in data:', data);
    console.log('findHeaderRow: Data length:', data.length);
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      console.log(`findHeaderRow: Checking row ${i}:`, row);
      
      if (fileType === 'purchaseOrder') {
        if (row?.some(cell => {
          const cellStr = cell?.toString().toLowerCase();
          const hasSno = cellStr.includes("sno");
          console.log(`findHeaderRow: Cell "${cell}" -> "${cellStr}" -> hasSno: ${hasSno}`);
          return hasSno;
        })) {
          console.log(`findHeaderRow: Found purchaseOrder header row at index ${i}`);
          return i;
        }
      } else if (fileType === 'putAway') {
        const lowerCaseRow = row?.map(cell => cell?.toString().toLowerCase().trim());
        if (
          lowerCaseRow &&
          lowerCaseRow.includes('sku') &&
          (lowerCaseRow.includes('bin') || lowerCaseRow.includes('bin location'))
        ) {
          console.log(`findHeaderRow: Found putAway header row at index ${i}`);
          return i;
        }
      } else if (fileType === 'qcFail') {
        if (row?.some(cell => {
          const cellStr = cell?.toString().toLowerCase();
          const isQcFailHeader = cellStr === 'sku' && row.length >= 2 && row[1]?.toString().toLowerCase().includes('remark');
          console.log(`findHeaderRow: Cell "${cell}" -> "${cellStr}" -> isQcFailHeader: ${isQcFailHeader}`);
          return isQcFailHeader;
        })) {
          console.log(`findHeaderRow: Found qcFail header row at index ${i}`);
          return i;
        }
      }
    }
    
    console.log(`findHeaderRow: No header row found for fileType: ${fileType}`);
    return -1;
  };

  const processCSVData = (results, fileType) => {
    const { poNumber, brandName } = extractHeaderInfo(results, fileType);
    
    if (fileType === 'purchaseOrder') {
      setGrnHeaderInfo(prev => ({ ...prev, poNumber, brandName }));
    }

    const headerRowIndex = findHeaderRow(results.data, fileType);
    if (headerRowIndex === -1) {
      throw new Error("Could not find header row");
    }

    const headers = results.data[headerRowIndex].map(h => (h || "").toString().trim());
    const detectedColumns = detectColumns(headers, fileType);
    
    const processedData = results.data
      .slice(headerRowIndex + 1)
      .filter(row => row?.some(cell => cell?.toString().trim() !== ""))
      .map(row => {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = row[index]?.toString().trim() || "";
        });
        return obj;
      })
      .filter(obj => {
        if (fileType === 'purchaseOrder') {
          return obj["Sno"] && obj["Sno"] !== "";
        }
        // For putAway and qcFail, allow all rows after header
        return Object.values(obj).some(val => val && val !== "");
      });

    return {
      headers,
      data: processedData,
      detectedColumns,
      grnHeaderInfo: fileType === 'purchaseOrder' ? { poNumber, brandName } : null
    };
  };

  const handleFileUpload = useCallback((file, fileType) => {
    console.log(`Starting file upload for ${fileType}:`, file.name);
    setLoading(true);
    setErrors([]);

    const validation = validateFile(file, FILE_VALIDATION.allowedTypes, FILE_VALIDATION.maxSize);
    if (!validation.isValid) {
      console.error('File validation failed:', validation.errors);
      setErrors(validation.errors);
      setLoading(false);
      return;
    }

    console.log('File validation passed, starting Papa.parse...');
    Papa.parse(file, {
      header: false,
      dynamicTyping: false,
      skipEmptyLines: true,
      complete: (results) => {
        console.log(`Papa.parse completed for ${fileType}:`, results);
        console.log(`Papa.parse raw data for ${fileType}:`, results.data);
        console.log(`Papa.parse first 3 rows for ${fileType}:`, results.data.slice(0, 3));
        console.log(`Papa.parse data length:`, results.data.length);
        
        try {
          if (results.errors.length > 0) {
            console.error('Papa.parse errors:', results.errors);
            setErrors(results.errors.map(err => err.message));
            setLoading(false);
            return;
          }

          console.log('Processing CSV data...');
          const processed = processCSVData(results, fileType);
          console.log('CSV data processed:', processed);
          
          setPreviewModal({
            isOpen: true,
            fileType: fileType === 'purchaseOrder' ? "Purchase Order" : 
                      fileType === 'putAway' ? "Put Away" : "QC Fail",
            processedData: processed.data,
            rawData: results.data,
            detectedHeaders: {
              rowIndex: findHeaderRow(results.data, fileType),
              headers: processed.headers
            },
            skuCodeType,
            setSkuCodeType,
            noPO: fileType === 'putAway' && (!data.purchaseOrder || data.purchaseOrder.length === 0),
            onConfirm: (selectedData) => {
              if (selectedData && selectedData.skuCodeType) setSkuCodeType(selectedData.skuCodeType);
              processFileData(selectedData, fileType);
              setPreviewModal(prev => ({ ...prev, isOpen: false }));
            }
          });

          setLoading(false);
        } catch (error) {
          console.error(`Error processing ${fileType}:`, error);
          setErrors([`Error processing ${fileType}: ${error.message}`]);
          setLoading(false);
        }
      },
      error: (error) => {
        console.error('Papa.parse error:', error);
        setErrors([`File parsing error: ${error.message}`]);
        setLoading(false);
      },
    });
  }, [data.purchaseOrder, skuCodeType]);

  const processFileData = (selectedData, fileType) => {
    console.log(`Processing file data for ${fileType}:`, selectedData);
    
    // Handle the case where selectedData might be null (modal cancelled)
    if (!selectedData) {
      console.log('Modal was cancelled, no data to process');
      return;
    }

    const { headers, data: modalData, grnHeaderInfo: selectedHeaderInfo } = selectedData;
    console.log('Extracted data:', { 
      headers, 
      modalDataLength: modalData?.length, 
      selectedHeaderInfo,
      firstRow: modalData?.[0],
      isArray: Array.isArray(modalData),
      isObject: modalData?.[0] && typeof modalData[0] === 'object' && !Array.isArray(modalData[0])
    });
    
    // Update GRN header info if available
    if (selectedHeaderInfo) {
      setGrnHeaderInfo(prev => ({
        ...prev,
        poNumber: selectedHeaderInfo.poNumber?.value || prev.poNumber,
        brandName: selectedHeaderInfo.brandName?.value || prev.brandName,
        replenishmentNumber: selectedHeaderInfo.replenishmentNumber?.value || "",
        inwardDate: selectedHeaderInfo.inwardDate?.value || "",
        warehouseNo: selectedHeaderInfo.warehouseNo?.value || "",
        verifiedBy: selectedHeaderInfo.verifiedBy?.value || "",
        warehouseManagerName: selectedHeaderInfo.warehouseManagerName?.value || ""
      }));
    }
    
    const processedData = modalData
      .filter(row => {
        // Check if row has any non-empty values (row is already an object, not an array)
        return Object.values(row).some(value => value && value.toString().trim() !== "");
      })
      .map(row => {
        // Clean up the data by trimming strings (row is already an object)
        const cleanedRow = {};
        Object.keys(row).forEach(key => {
          const value = row[key];
          cleanedRow[key] = typeof value === 'string' ? value.trim() : value;
        });
        return cleanedRow;
      })
      .filter(obj => {
        if (fileType === 'purchaseOrder') {
          return obj["Sno"] && obj["Sno"] !== "";
        }
        // For putAway and qcFail, allow all rows after header
        return Object.values(obj).some(val => val && val !== "");
      });
    
    console.log(`Final processed data for ${fileType}:`, processedData.length, 'rows');
    setData(prev => ({ ...prev, [fileType]: processedData }));
  };

  const handlePurchaseOrderUpload = useCallback((file) => {
    handleFileUpload(file, 'purchaseOrder');
  }, [handleFileUpload]);

  const handlePutAwayUpload = useCallback((file) => {
    handleFileUpload(file, 'putAway');
  }, [handleFileUpload]);

  const handleQcFailUpload = useCallback((file) => {
    handleFileUpload(file, 'qcFail');
  }, [handleFileUpload]);

  const clearData = useCallback((fileType) => {
    if (fileType) {
      setData(prev => ({ ...prev, [fileType]: [] }));
    } else {
      setData({ purchaseOrder: [], putAway: [], qcFail: [] });
    }
    setErrors([]);
  }, []);

  const clearAllData = useCallback(() => {
    setData({ purchaseOrder: [], putAway: [], qcFail: [] });
    setGrnHeaderInfo({ poNumber: "", brandName: "" });
    setColumnMapping({});
    setErrors([]);
  }, []);

  return {
    data,
    loading,
    errors,
    grnHeaderInfo,
    setGrnHeaderInfo,
    columnMapping,
    setColumnMapping,
    previewModal,
    setPreviewModal,
    handlePurchaseOrderUpload,
    handlePutAwayUpload,
    handleQcFailUpload,
    clearData,
    clearAllData
  };
}; 
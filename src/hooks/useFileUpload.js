import { useState, useCallback, useEffect } from 'react';
import Papa from 'papaparse';

export const useFileUpload = () => {
  const [purchaseOrderData, setPurchaseOrderData] = useState([]);
  const [putAwayData, setPutAwayData] = useState([]);
  const [qcFailData, setQcFailData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  const [grnHeaderInfo, setGrnHeaderInfo] = useState({
    poNumber: "",
    brandName: "",
  });

  // Column mapping state
  const [columnMapping, setColumnMapping] = useState({});

  // Preview modal state
  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    fileType: "",
    processedData: [],
    rawData: [],
    detectedHeaders: null,
    onConfirm: null
  });

  // Debug effect to monitor putAwayData changes
  useEffect(() => {
    console.log('putAwayData state changed:', putAwayData.length, 'rows');
    if (putAwayData.length > 0) {
      console.log('First putAwayData row:', putAwayData[0]);
    }
  }, [putAwayData]);

  const handlePurchaseOrderUpload = useCallback((file) => {
    setLoading(true);
    setErrors([]);

    Papa.parse(file, {
      header: false,
      dynamicTyping: false,
      skipEmptyLines: false,
      complete: (results) => {
        try {
          if (results.errors.length > 0) {
            setErrors(results.errors.map((err) => err.message));
            setLoading(false);
            return;
          }

          // Extract PO Number from J6 (row 5, column 9)
          let poNumber = "";
          if (
            results.data.length > 5 &&
            results.data[5] &&
            results.data[5][10]
          ) {
            poNumber = results.data[5][10].toString().trim();
          }
          // Extract Brand Name from C9 (row 8, column 2) - with fallback search
          let brandName = "";
          if (
            results.data.length > 10 &&
            results.data[10] &&
            results.data[10][2]
          ) {
            brandName = results.data[10][2].toString().trim();
          }

          // If brand name is still empty, search for it in nearby cells
          if (!brandName || brandName === "") {
            for (let row = 6; row <= 12; row++) {
              if (results.data[row]) {
                for (let col = 0; col <= 5; col++) {
                  const cellValue =
                    results.data[row] && results.data[row][col]
                      ? results.data[row][col].toString().trim()
                      : "";
                  // Look for cells that might contain brand name (non-empty, not numbers, reasonable length)
                  if (
                    cellValue &&
                    cellValue.length > 2 &&
                    cellValue.length < 50 &&
                    isNaN(cellValue) &&
                    !cellValue.toLowerCase().includes("sno")
                  ) {
                    brandName = cellValue;
                    break;
                  }
                }
                if (brandName) break;
              }
            }
          }
          setGrnHeaderInfo((prev) => ({ ...prev, poNumber, brandName }));

          // Find header row automatically
          let headerRowIndex = -1;
          for (let i = 0; i < results.data.length; i++) {
            const row = results.data[i];
            if (
              row &&
              row.some(
                (cell) => cell && cell.toString().toLowerCase().includes("sno"),
              )
            ) {
              headerRowIndex = i;
              break;
            }
          }

          // Process the data first
          const processedData = results.data
            .slice(headerRowIndex + 1)
            .filter(
              (row) =>
                row &&
                row.some((cell) => cell && cell.toString().trim() !== ""),
            )
            .map((row) => {
              const obj = {};
              const headers = results.data[headerRowIndex].map(h => (h || "").toString().trim());
              headers.forEach((header, index) => {
                obj[header] = row[index] ? row[index].toString().trim() : "";
              });
              return obj;
            })
            .filter((obj) => obj["Sno"] && obj["Sno"] !== "");

          // Show preview modal for confirmation
          setPreviewModal({
            isOpen: true,
            fileType: "Purchase Order",
            processedData: processedData,
            rawData: results.data,
            detectedHeaders: headerRowIndex >= 0 ? {
              rowIndex: headerRowIndex,
              headers: results.data[headerRowIndex].map(h => (h || "").toString().trim())
            } : null,
            onConfirm: (selectedData) => {
              processPurchaseOrderData(selectedData, poNumber, brandName);
              setPreviewModal(prev => ({ ...prev, isOpen: false }));
            }
          });

          setLoading(false);
        } catch (error) {
          setErrors([`Error processing Purchase Order: ${error.message}`]);
          setLoading(false);
        }
      },
      error: (error) => {
        setErrors([`File parsing error: ${error.message}`]);
        setLoading(false);
      },
    });
  }, []);

  const processPurchaseOrderData = (selectedData, poNumber, brandName) => {
    const { headers, data, grnHeaderInfo } = selectedData;
    
    // Update GRN header info with selected values
    if (grnHeaderInfo) {
      setGrnHeaderInfo(prev => ({
        ...prev,
        poNumber: grnHeaderInfo.poNumber?.value || poNumber,
        brandName: grnHeaderInfo.brandName?.value || brandName,
        replenishmentNumber: grnHeaderInfo.replenishmentNumber?.value || "",
        inwardDate: grnHeaderInfo.inwardDate?.value || "",
        warehouseNo: grnHeaderInfo.warehouseNo?.value || "",
        verifiedBy: grnHeaderInfo.verifiedBy?.value || "",
        warehouseManagerName: grnHeaderInfo.warehouseManagerName?.value || ""
      }));
    }
    
    const processedData = data
      .filter(
        (row) =>
          row &&
          row.some((cell) => cell && cell.toString().trim() !== ""),
      )
      .map((row) => {
        const obj = {};
        headers.forEach((header, index) => {
          // Trim both header and value for each cell
          const trimmedHeader = header.trim();
          obj[trimmedHeader] = row[index] ? row[index].toString().trim() : "";
        });
        // Additionally, trim all string values in the object (in case of extra spaces in CSV)
        Object.keys(obj).forEach((key) => {
          if (typeof obj[key] === 'string') {
            obj[key] = obj[key].trim();
          }
        });
        return obj;
      })
      .filter((obj) => obj["Sno"] && obj["Sno"] !== "");
    
    setPurchaseOrderData(processedData);
  };

  const handlePutAwayUpload = useCallback((file) => {
    console.log('Starting Put Away upload for file:', file.name);
    console.log('File size:', file.size, 'bytes');
    console.log('File type:', file.type);
    console.log('File last modified:', new Date(file.lastModified));
    
    setLoading(true);
    setErrors([]);

    Papa.parse(file, {
      header: false,
      dynamicTyping: false,
      skipEmptyLines: true,
      complete: (results) => {
        console.log('Papa Parse completed. Total rows:', results.data.length);
        console.log('First few rows:', results.data.slice(0, 5));
        
        try {
          if (results.errors.length > 0) {
            console.error('Papa Parse errors:', results.errors);
            setErrors(results.errors.map((err) => err.message));
            setLoading(false);
            return;
          }
          
          // Find the first header row
          let headerRowIndex = -1;
          for (let i = 0; i < results.data.length; i++) {
            const row = results.data[i];
            if (row && row.length >= 2) {
              const firstCol = row[0] ? row[0].toString().trim() : "";
              const secondCol = row[1] ? row[1].toString().trim() : "";
              
              // Check if this looks like a header row
              if (firstCol.toLowerCase().includes('bin') && 
                  secondCol.toLowerCase().includes('sku')) {
                headerRowIndex = i;
                console.log('Found header row at index:', i, 'with columns:', row);
                break;
              }
            }
          }
          
          // Process the data first
          const processedData = results.data
            .slice(headerRowIndex + 1)
            .filter(row => {
              // Skip rows that look like headers
              if (row && row.length >= 2) {
                const firstCol = row[0] ? row[0].toString().trim() : "";
                const secondCol = row[1] ? row[1].toString().trim() : "";
                
                // Skip if this looks like a header row
                if (firstCol.toLowerCase().includes('bin') && 
                    secondCol.toLowerCase().includes('sku')) {
                  console.log('Skipping header-like row:', row);
                  return false;
                }
              }
              
              // Keep rows with actual data
              return row && row.some(cell => cell && cell.toString().trim() !== "");
            })
            .map((row) => {
              const obj = {};
              const headers = results.data[headerRowIndex].map(h => (h || "").toString().trim());
              headers.forEach((header, index) => {
                obj[header] = row[index] ? row[index].toString().trim() : "";
              });
              return obj;
            })
            .filter((row) => {
              // Check for SKU value
              const skuValue = row['SKU ID'] || row['SKU'];
              return skuValue && skuValue !== "";
            });
          
          // Show preview modal for confirmation
          setPreviewModal({
            isOpen: true,
            fileType: "Put Away",
            processedData: processedData,
            rawData: results.data,
            detectedHeaders: headerRowIndex >= 0 ? {
              rowIndex: headerRowIndex,
              headers: results.data[headerRowIndex].map(h => (h || "").toString().trim())
            } : null,
            onConfirm: (selectedData) => {
              processPutAwayData(selectedData);
              setPreviewModal(prev => ({ ...prev, isOpen: false }));
            }
          });

          setLoading(false);
        } catch (error) {
          console.error('Error processing Put Away sheet:', error);
          setErrors([`Error processing Put Away sheet: ${error.message}`]);
          setLoading(false);
        }
      },
      error: (error) => {
        console.error('Papa Parse error:', error);
        setErrors([`File parsing error: ${error.message}`]);
        setLoading(false);
      },
    });
  }, []);

  const processPutAwayData = (selectedData) => {
    const { headers, data } = selectedData;
    
    const cleanData = data
      .filter(row => {
        // Skip rows that look like headers
        if (row && row.length >= 2) {
          const firstCol = row[0] ? row[0].toString().trim() : "";
          const secondCol = row[1] ? row[1].toString().trim() : "";
          
          // Skip if this looks like a header row
          if (firstCol.toLowerCase().includes('bin') && 
              secondCol.toLowerCase().includes('sku')) {
            console.log('Skipping header-like row:', row);
            return false;
          }
        }
        
        // Keep rows with actual data
        return row && row.some(cell => cell && cell.toString().trim() !== "");
      })
      .map((row) => {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] ? row[index].toString().trim() : "";
        });
        return obj;
      })
      .filter((row) => {
        // Check for SKU value
        const skuValue = row['SKU ID'] || row['SKU'];
        return skuValue && skuValue !== "";
      });
    
    console.log('Put Away data loaded:', cleanData.length, 'rows');
    console.log('Sample row:', cleanData[0]);
    console.log('Setting putAwayData state with', cleanData.length, 'rows');
    
    setPutAwayData(cleanData);
    console.log('Put Away upload completed successfully');
  };

  const handleQCFailUpload = useCallback((file) => {
    setLoading(true);
    setErrors([]);

    Papa.parse(file, {
      header: true,
      dynamicTyping: false,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          if (results.errors.length > 0) {
            setErrors(results.errors.map((err) => err.message));
            setLoading(false);
            return;
          }
          const cleanData = results.data
            .map((row) => {
              const cleanRow = {};
              Object.keys(row).forEach((key) => {
                const cleanKey = key.trim();
                cleanRow[cleanKey] = row[key] ? row[key].toString().trim() : "";
              });
              return cleanRow;
            })
            .filter((row) => row.SKU && row.SKU !== "");
          setQcFailData(cleanData);
          setLoading(false);
        } catch (error) {
          setErrors([`Error processing QC Fail sheet: ${error.message}`]);
          setLoading(false);
        }
      },
      error: (error) => {
        setErrors([`File parsing error: ${error.message}`]);
        setLoading(false);
      },
    });
  }, []);

  const clearPurchaseOrder = useCallback(() => {
    setPurchaseOrderData([]);
    setGrnHeaderInfo((prev) => ({ ...prev, poNumber: "", brandName: "" }));
  }, []);

  const clearPutAway = useCallback(() => {
    setPutAwayData([]);
  }, []);

  const clearQCFail = useCallback(() => {
    setQcFailData([]);
  }, []);

  const closePreviewModal = useCallback(() => {
    setPreviewModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  const handleModalConfirm = (modalData) => {
    const { headers, data, grnHeaderInfo, columnMapping, skuCodeType } = modalData;
    
    // Update GRN header information if provided
    if (grnHeaderInfo) {
      setGrnHeaderInfo(prev => ({
        ...prev,
        poNumber: grnHeaderInfo.poNumber?.value || prev.poNumber,
        brandName: grnHeaderInfo.brandName?.value || prev.brandName
      }));
    }

    // Store the processed data and column mapping based on file type
    if (previewModal.fileType === "Purchase Order") {
      setPurchaseOrderData(data);
      setColumnMapping(columnMapping || {});
      // Update SKU code type if provided
      if (skuCodeType) {
        // We'll need to pass this back to the parent component
        // For now, we'll store it in the modal state
        setPreviewModal(prev => ({ ...prev, skuCodeType }));
      }
    } else if (previewModal.fileType === "Put Away") {
      setPutAwayData(data);
    }
    
    // Close the modal
    setPreviewModal(prev => ({ ...prev, isOpen: false }));
  };

  const setSkuCodeType = useCallback((newSkuCodeType) => {
    setPreviewModal(prev => ({ ...prev, skuCodeType: newSkuCodeType }));
  }, []);

  return {
    purchaseOrderData,
    putAwayData,
    qcFailData,
    loading,
    errors,
    grnHeaderInfo,
    columnMapping,
    skuCodeType: previewModal.skuCodeType || "KNOT",
    setSkuCodeType,
    previewModal,
    handlePurchaseOrderUpload,
    handlePutAwayUpload,
    handleQCFailUpload,
    clearPurchaseOrder,
    clearPutAway,
    clearQCFail,
    closePreviewModal,
    handleModalConfirm,
  };
}; 
import { useState, useCallback } from 'react';
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
          // Find header row
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
          if (headerRowIndex === -1) {
            setErrors([
              'Could not find header row with "Sno" in Purchase Order.',
            ]);
            setLoading(false);
            return;
          }
          const headers = results.data[headerRowIndex].map((h) =>
            (h || "").toString().trim(),
          );
          const dataRows = results.data.slice(headerRowIndex + 1);
          const processedData = dataRows
            .filter(
              (row) =>
                row &&
                row.some((cell) => cell && cell.toString().trim() !== ""),
            )
            .map((row) => {
              const obj = {};
              headers.forEach((header, index) => {
                obj[header] = row[index] ? row[index].toString().trim() : "";
              });
              return obj;
            })
            .filter((obj) => obj["Sno"] && obj["Sno"] !== "");
          setPurchaseOrderData(processedData);
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

  const handlePutAwayUpload = useCallback((file) => {
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
          setPutAwayData(cleanData);
          setLoading(false);
        } catch (error) {
          setErrors([`Error processing Put Away sheet: ${error.message}`]);
          setLoading(false);
        }
      },
      error: (error) => {
        setErrors([`File parsing error: ${error.message}`]);
        setLoading(false);
      },
    });
  }, []);

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

  return {
    purchaseOrderData,
    putAwayData,
    qcFailData,
    loading,
    errors,
    grnHeaderInfo,
    handlePurchaseOrderUpload,
    handlePutAwayUpload,
    handleQCFailUpload,
    clearPurchaseOrder,
    clearPutAway,
    clearQCFail,
  };
}; 
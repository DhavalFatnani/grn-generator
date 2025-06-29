import { useState, useCallback } from 'react';
import { 
  getColumnValue, 
  normalizeSku, 
  parseQuantity, 
  calculateSummaryStats,
  validateRequiredFields 
} from '../utils/helpers.js';
import { REQUIRED_FIELDS, ERROR_MESSAGES } from '../utils/constants.js';

export const useGRNGenerator = () => {
  const [grnData, setGrnData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);

  const generateGRN = useCallback(({
    purchaseOrderData = [],
    putAwayData = [],
    qcFailData = [],
    skuCodeType = 'BRAND',
    grnHeaderInfo = {},
    columnMapping = {},
    acknowledgeOnly = false,
  }) => {
    if (acknowledgeOnly) {
      // --- Acknowledge Only Mode ---
      // Merge SKUs from Put Away and QC Fail
      const putawayPivot = {};
      putAwayData.forEach(row => {
        const sku = (row["SKU"] || row["sku"] || '').trim();
        if (!sku) return;
        putawayPivot[sku] = (putawayPivot[sku] || 0) + 1;
      });
      const qcFailPivot = {};
      qcFailData.forEach(row => {
        const sku = (row["SKU"] || row["sku"] || '').trim();
        if (!sku) return;
        qcFailPivot[sku] = (qcFailPivot[sku] || 0) + 1;
      });
      // Union of all SKUs
      const allSKUs = Array.from(new Set([
        ...Object.keys(putawayPivot),
        ...Object.keys(qcFailPivot)
      ]));
      const grnRows = allSKUs.map((sku, idx) => {
        const receivedQty = putawayPivot[sku] || 0;
        const failedQCQty = qcFailPivot[sku] || 0;
        const passedQCQty = Math.max(0, receivedQty - failedQCQty);
        return {
          "S.No": idx + 1,
          "SKU": sku,
          "Bin": '',
          "Received Qty": receivedQty,
          "Failed QC Qty": failedQCQty,
          "Passed QC Qty": passedQCQty,
          "Remarks": failedQCQty > 0 ? 'QC Failed' : '',
        };
      });
      setGrnData(grnRows);
      setErrors([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrors([]);

    try {
      // Validate required fields
      const validation = validateRequiredFields(grnHeaderInfo, REQUIRED_FIELDS);
      if (!validation.isValid) {
        setErrors([ERROR_MESSAGES.grnGeneration.missingFields]);
        setLoading(false);
        return;
      }

      // Validate data arrays
      if (!putAwayData?.length) {
        setErrors(["Please upload a valid Put Away sheet"]);
        setLoading(false);
        return;
      }

      const qcFailDataArray = qcFailData || [];

      // Remove header rows from putAwayData and qcFailData
      const isHeaderRow = (row) => {
        const skuVal = (row["SKU"] || row["SKU ID"] || row["Brand SKU Code"] || row["KNOT SKU Code"] || "").toString().trim().toUpperCase();
        return ["SKU", "SKU ID", "BRAND SKU CODE", "KNOT SKU CODE"].includes(skuVal);
      };
      const filteredPutAwayData = putAwayData.filter(row => !isHeaderRow(row));
      const filteredQcFailData = qcFailDataArray.filter(row => !isHeaderRow(row));

      // 1. Pivot Putaway by SKU (case-insensitive, trimmed)
      const putawayPivot = {};
      const binPivot = {};
      const binListPivot = {};
      filteredPutAwayData.forEach(row => {
        const sku = (row["SKU ID"] || row["SKU"] || row["Brand SKU Code"] || row["KNOT SKU Code"] || "").toString().trim().toUpperCase();
        if (!sku) return;
        if (!putawayPivot[sku]) putawayPivot[sku] = 0;
        // If Quantity column exists, use it, else count as 1
        const qty = parseQuantity(row["Quantity"] || row["Put Away Quantity"] || 1);
        putawayPivot[sku] += qty;
        // Collect bin locations (prefer 'bin location', but support legacy fields)
        const bin = row["bin location"] || row["Bin Location"] || row["BIN LOCATION"] || row["BIN"] || row["Bin"] || row["Location"] || row["Storage Location"] || "";
        if (bin) {
          if (!binPivot[sku]) binPivot[sku] = new Set();
          binPivot[sku].add(bin);
          if (!binListPivot[sku]) binListPivot[sku] = [];
          // Add 'qty' number of bins for this row
          for (let i = 0; i < qty; i++) {
            binListPivot[sku].push(bin);
          }
        }
      });

      // 2. Pivot QC Fail by SKU
      const qcFailPivot = {};
      filteredQcFailData.forEach(row => {
        const sku = (row["SKU"] || row["SKU ID"] || row["Brand SKU Code"] || row["KNOT SKU Code"] || "").toString().trim().toUpperCase();
        if (!sku) return;
        if (!qcFailPivot[sku]) qcFailPivot[sku] = 0;
        const qty = parseQuantity(row["Quantity"] || row["Failed Quantity"] || 1);
        qcFailPivot[sku] += qty;
      });

      // 3. Pivot PO by SKU (for lookup) - Use user-selected skuCodeType
      const poPivot = {};
      const poPivotByKnot = {};
      if (purchaseOrderData && purchaseOrderData.length > 0) {
        purchaseOrderData.forEach(row => {
          const brandSku = (row["Brand SKU Code"] || "").toString().trim().toUpperCase();
          const knotSku = (row["KNOT SKU Code"] || "").toString().trim().toUpperCase();
          
          if (brandSku) {
            if (!poPivot[brandSku]) poPivot[brandSku] = { ...row, __qty: 0 };
            poPivot[brandSku].__qty += parseQuantity(row["Quantity"]);
          }
          
          if (knotSku) {
            if (!poPivotByKnot[knotSku]) poPivotByKnot[knotSku] = { ...row, __qty: 0 };
            poPivotByKnot[knotSku].__qty += parseQuantity(row["Quantity"]);
          }
        });
      }

      // 4. Union of all SKUs - use appropriate PO pivot based on user selection
      const allSkus = new Set([
        ...Object.keys(putawayPivot),
        ...Object.keys(qcFailPivot)
      ]);
      
      // Add PO SKUs based on user's skuCodeType selection
      if (skuCodeType === 'KNOT') {
        Object.keys(poPivotByKnot).forEach(sku => allSkus.add(sku));
      } else {
        Object.keys(poPivot).forEach(sku => allSkus.add(sku));
      }

      // 5. Build GRN rows
      const finalGrnData = Array.from(allSkus).map(sku => {
        // Determine which PO pivot to use based on user selection
        const poRow = skuCodeType === 'KNOT' ? poPivotByKnot[sku] : poPivot[sku];
        const orderedQty = poRow ? poRow.__qty : 0;
        const receivedQty = (putawayPivot[sku] || 0) + (qcFailPivot[sku] || 0);
        const failedQCQty = qcFailPivot[sku] || 0;
        const passedQCQty = Math.max(0, receivedQty - failedQCQty);
        const notOrderedQty = (!poRow || orderedQty === 0) ? receivedQty : 0;

        // Only calculate shortage/excess if PO exists
        const shortageQty = (poRow && orderedQty > 0) ? Math.max(0, orderedQty - receivedQty) : undefined;
        const excessQty = (poRow && orderedQty > 0) ? Math.max(0, receivedQty - orderedQty) : undefined;

        // Status logic
        let status = "Received";
        if (poRow && orderedQty > 0) {
          if (shortageQty > 0) status = "Shortage";
          if (excessQty > 0) status = "Excess";
          if (receivedQty === 0) status = "Not Received";
        } else if (receivedQty > 0) {
          status = "Excess Receipt";
        } else if (receivedQty === 0) {
          status = "Not Received";
        }

        // QC Status
        let qcStatus = "Not Performed";
        if (failedQCQty > 0) {
          if (failedQCQty === receivedQty) {
            qcStatus = "Failed";
          } else if (passedQCQty > 0) {
            qcStatus = "Partial";
          }
        } else if (receivedQty > 0) {
          qcStatus = "Passed";
        }

        // Remarks
        let remarks = "";
        if (shortageQty > 0) remarks += `Shortage: ${shortageQty} units. `;
        if (excessQty > 0) remarks += `Excess: ${excessQty} units. `;
        if (failedQCQty > 0) remarks += `QC Failed: ${failedQCQty} units. `;
        if (notOrderedQty > 0) remarks += `Not Ordered: ${notOrderedQty} units. `;
        if (receivedQty === 0) remarks += "Not Received. ";
        if (status === "Received") remarks += "All items received as per order. ";
        remarks = remarks.trim();

        // Use PO row for meta fields if available, else fallback to putAway/QCFail data
        let putAwayRow = filteredPutAwayData.find(row => {
          const rowSku = (row["SKU ID"] || row["SKU"] || row["Brand SKU Code"] || row["KNOT SKU Code"] || "").toString().trim().toUpperCase();
          return rowSku === sku;
        });
        let qcFailRow = filteredQcFailData.find(row => {
          const rowSku = (row["SKU"] || row["SKU ID"] || row["Brand SKU Code"] || row["KNOT SKU Code"] || "").toString().trim().toUpperCase();
          return rowSku === sku;
        });
        // Prefer putAwayRow, then qcFailRow
        const bestRow = putAwayRow || qcFailRow || {};
        // Brand SKU Code and KNOT SKU Code fallback logic
        let brandSkuCode, knotSkuCode;
        if (poRow) {
          brandSkuCode = poRow["Brand SKU Code"] || "";
          knotSkuCode = poRow["KNOT SKU Code"] || "";
        } else {
          if (skuCodeType === 'KNOT') {
            // If user selected KNOT code comparison, use the SKU as KNOT SKU
            knotSkuCode = sku;
            brandSkuCode = '';
          } else {
            // If user selected Brand code comparison, use the SKU as Brand SKU
            brandSkuCode = sku;
            knotSkuCode = '';
          }
        }

        // Bin summary: e.g., 'A1 (2), B2 (3)'
        let binSummary = '';
        if (binListPivot[sku] && binListPivot[sku].length > 0) {
          const binCounts = {};
          binListPivot[sku].forEach(b => { binCounts[b] = (binCounts[b] || 0) + 1; });
          binSummary = Object.entries(binCounts).map(([b, c]) => `${b} (${c})`).join(', ');
        }
        // Build row object
        let row;
        if (!poRow) {
          // No PO: Only show the selected SKU code type
          if (skuCodeType === 'KNOT') {
            row = {
              "S.No": "",
              "SKU Data": bestRow["SKU"] || bestRow["SKU ID"] || '',
              "KNOT SKU Code": knotSkuCode,
              "KNOT SKU": knotSkuCode,
              "Size": bestRow["Size"] || "",
              "Colors": bestRow["Colors"] || "",
              "Received Qty": receivedQty,
              "Passed QC Qty": passedQCQty,
              "Failed QC Qty": failedQCQty,
              "Not Ordered Qty": notOrderedQty,
              "Status": status,
              "QC Status": qcStatus,
              "Remarks": remarks,
              "Bin": binSummary,
              "BinLocations": binListPivot[sku] || [],
              "Unit Price": bestRow["Unit Price"] || "",
              "Amount": bestRow["Amount"] || ""
            };
          } else {
            row = {
              "S.No": "",
              "SKU Data": bestRow["SKU"] || bestRow["SKU ID"] || '',
              "Brand SKU Code": brandSkuCode,
              "Brand SKU": brandSkuCode,
              "Size": bestRow["Size"] || "",
              "Colors": bestRow["Colors"] || "",
              "Received Qty": receivedQty,
              "Passed QC Qty": passedQCQty,
              "Failed QC Qty": failedQCQty,
              "Not Ordered Qty": notOrderedQty,
              "Status": status,
              "QC Status": qcStatus,
              "Remarks": remarks,
              "Bin": binSummary,
              "BinLocations": binListPivot[sku] || [],
              "Unit Price": bestRow["Unit Price"] || "",
              "Amount": bestRow["Amount"] || ""
            };
          }
        } else {
          // With PO: show both columns as before
          row = {
            "S.No": poRow["Sno"] || poRow["S.No"] || "",
            "Brand SKU Code": brandSkuCode,
            "KNOT SKU Code": knotSkuCode,
            "Brand SKU": brandSkuCode,
            "KNOT SKU": knotSkuCode,
            "Size": poRow["Size"] || "",
            "Colors": poRow["Colors"] || "",
            "Received Qty": receivedQty,
            "Passed QC Qty": passedQCQty,
            "Failed QC Qty": failedQCQty,
            "Not Ordered Qty": notOrderedQty,
            "Status": status,
            "QC Status": qcStatus,
            "Remarks": remarks,
            "Bin": binSummary,
            "BinLocations": binListPivot[sku] || [],
            "Unit Price": poRow["Unit Price"] || "",
            "Amount": poRow["Amount"] || ""
          };
        }
        // Only add Ordered/Shortage/Excess if PO exists
        if (poRow) {
          row["Ordered Qty"] = orderedQty;
          row["Shortage Qty"] = shortageQty || 0;
          row["Excess Qty"] = excessQty || 0;
        }
        return row;
      });

      setGrnData(finalGrnData);
      setLoading(false);
    } catch (error) {
      setErrors([`Error generating GRN: ${error.message}`]);
      setLoading(false);
    }
  }, []);

  const clearGRNData = useCallback(() => {
    setGrnData([]);
    setErrors([]);
  }, []);

  return {
    grnData,
    loading,
    errors,
    generateGRN,
    clearGRNData
  };
}; 
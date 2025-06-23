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
    purchaseOrderData,
    putAwayData,
    qcFailData,
    skuCodeType = 'BRAND',
    grnHeaderInfo,
    columnMapping = {},
  }) => {
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
      if (!purchaseOrderData?.length) {
        setErrors(["Please upload a valid Purchase Order sheet"]);
      setLoading(false);
      return;
    }

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
        // Collect bin locations
        const bin = row["BIN"] || row["Bin"] || row["Bin Location"] || row["BIN LOCATION"] || "";
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

      // 3. Pivot PO by SKU (for lookup)
      const poPivot = {};
      purchaseOrderData.forEach(row => {
        const sku = (row["Brand SKU Code"] || row["KNOT SKU Code"] || row["SKU"] || row["SKU ID"] || "").toString().trim().toUpperCase();
        if (!sku) return;
        if (!poPivot[sku]) poPivot[sku] = { ...row, __qty: 0 };
        poPivot[sku].__qty += parseQuantity(row["Quantity"]);
      });

      // 4. Union of all SKUs
      const allSkus = new Set([
        ...Object.keys(poPivot),
        ...Object.keys(putawayPivot),
        ...Object.keys(qcFailPivot)
      ]);

      // 5. Build GRN rows
      const finalGrnData = Array.from(allSkus).map(sku => {
        const poRow = poPivot[sku];
        const orderedQty = poRow ? poRow.__qty : 0;
        const receivedQty = (putawayPivot[sku] || 0) + (qcFailPivot[sku] || 0);
        const failedQCQty = qcFailPivot[sku] || 0;
        const passedQCQty = Math.max(0, receivedQty - failedQCQty);
        const shortageQty = Math.max(0, orderedQty - receivedQty);
        const excessQty = Math.max(0, receivedQty - orderedQty);
        const notOrderedQty = orderedQty === 0 ? receivedQty : 0;

        // Status logic
        let status = "Received";
        if (shortageQty > 0) status = "Shortage";
        if (excessQty > 0) status = "Excess";
        if (receivedQty === 0) status = "Not Received";
        if (orderedQty === 0 && receivedQty > 0) status = "Excess Receipt";

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
        remarks = remarks.trim();

        // Use PO row for meta fields if available, else blank
        // Bin summary: e.g., 'A1 (2), B2 (3)'
        let binSummary = '';
        if (binListPivot[sku] && binListPivot[sku].length > 0) {
          const binCounts = {};
          binListPivot[sku].forEach(b => { binCounts[b] = (binCounts[b] || 0) + 1; });
          binSummary = Object.entries(binCounts).map(([b, c]) => `${b} (${c})`).join(', ');
        }
        return {
          "S.No": poRow ? poRow["Sno"] || poRow["S.No"] || "" : "",
          "Brand SKU Code": poRow ? poRow["Brand SKU Code"] || "" : sku,
          "KNOT SKU Code": poRow ? poRow["KNOT SKU Code"] || "" : "",
          "Brand SKU": poRow ? poRow["Brand SKU Code"] || "" : sku,
          "KNOT SKU": poRow ? poRow["KNOT SKU Code"] || "" : "",
          "Size": poRow ? poRow["Size"] || "" : "",
          "Colors": poRow ? poRow["Colors"] || "" : "",
          "Ordered Qty": orderedQty,
          "Received Qty": receivedQty,
          "Passed QC Qty": passedQCQty,
          "Failed QC Qty": failedQCQty,
          "Shortage Qty": shortageQty,
          "Excess Qty": excessQty,
          "Not Ordered Qty": notOrderedQty,
          "Status": status,
          "QC Status": qcStatus,
          "Remarks": remarks,
          "Bin": binSummary,
          "BinLocations": binListPivot[sku] || [],
          "Unit Price": poRow ? poRow["Unit Price"] || "" : "",
          "Amount": poRow ? poRow["Amount"] || "" : ""
        };
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
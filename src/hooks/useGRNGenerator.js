import { useState, useCallback } from 'react';
import _ from 'lodash';

export const useGRNGenerator = () => {
  const [grnData, setGrnData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);

  const generateGRN = useCallback(({
    purchaseOrderData,
    putAwayData,
    qcFailData,
    skuCodeType,
    grnHeaderInfo,
    columnMapping,
  }) => {
    setLoading(true);
    setErrors([]); // Clear any existing errors

    // Use column mapping if available, otherwise fall back to default column names
    const getColumnValue = (row, columnKey, fallbackColumns = []) => {
      if (columnMapping && columnMapping[columnKey]) {
        return row[columnMapping[columnKey]] || "";
      }
      // Fallback to default column names
      for (const fallback of fallbackColumns) {
        if (row[fallback] !== undefined) {
          return row[fallback];
        }
      }
      return "";
    };

    // Check if data arrays are defined and have content
    if (!purchaseOrderData || !Array.isArray(purchaseOrderData) || purchaseOrderData.length === 0) {
      setErrors(["Please upload a valid Purchase Order sheet"]);
      setLoading(false);
      return;
    }

    if (!putAwayData || !Array.isArray(putAwayData) || putAwayData.length === 0) {
      setErrors(["Please upload a valid Put Away sheet"]);
      setLoading(false);
      return;
    }

    // QC Fail data is optional, so we'll handle it as an empty array if not provided
    const qcFailDataArray = qcFailData && Array.isArray(qcFailData) ? qcFailData : [];

    // Create a comprehensive map to store consolidated GRN item data
    // Each item will be accessible by both its Knot SKU and Brand SKU
    const grnItems = {};

    // 1. Process Purchase Order Data
    purchaseOrderData.forEach((row) => {
      const knotSkuFromRow = getColumnValue(row, "knotSkuCode", ["KNOT SKU Code", "Product Name"]);
      const brandSkuFromRow = getColumnValue(row, "brandSkuCode", ["Brand SKU Code"]);

      const normalizedKnotSku = knotSkuFromRow ? knotSkuFromRow.toString().trim().toUpperCase() : null;
      const normalizedBrandSku = brandSkuFromRow ? brandSkuFromRow.toString().trim().toUpperCase() : null;

      if (!normalizedKnotSku && !normalizedBrandSku) {
        return; // Skip row if no SKU is found
      }

      const currentOrderedQty = parseInt(getColumnValue(row, "quantity", ["Quantity"])) || 0;

      let itemObject = null;
      // Try to find existing item by either SKU
      if (normalizedKnotSku && grnItems[normalizedKnotSku]) {
        itemObject = grnItems[normalizedKnotSku];
      } else if (normalizedBrandSku && grnItems[normalizedBrandSku]) {
        itemObject = grnItems[normalizedBrandSku];
      }

      if (itemObject) {
        // If item already exists, update ordered quantity
        itemObject.orderedQty += currentOrderedQty;
      } else {
        // Create new item if not found
        itemObject = {
          orderedQty: currentOrderedQty,
          receivedQty: 0,
          totalFailQty: 0,
          fails: [],
          brandSku: brandSkuFromRow,
          knotSku: knotSkuFromRow,
          size: getColumnValue(row, "size", ["Size"]),
          colors: getColumnValue(row, "colors", ["Colors"]),
          sno: getColumnValue(row, "sno", ["Sno", "S.No"]),
        };
      }

      // Map by both SKUs if present and distinct
      if (normalizedKnotSku) {
        grnItems[normalizedKnotSku] = itemObject;
      }
      if (normalizedBrandSku && normalizedBrandSku !== normalizedKnotSku) {
        grnItems[normalizedBrandSku] = itemObject;
      }
    });

    // 2. Process Put Away Data
    putAwayData.forEach((row) => {
      const putAwayKnotSku = getColumnValue(row, "knotSkuCode", ["SKU ID", "SKU", "KNOT SKU Code"]);
      const putAwayBrandSku = getColumnValue(row, "brandSkuCode", ["SKU ID", "SKU", "Brand SKU Code"]);
      const putAwayGenericSku = getColumnValue(row, "sku", ["SKU", "SKU ID"]); // Generic 'SKU' column

      const potentialSkusForLookup = [];

      // Prioritize based on user's skuCodeType preference if present in the row
      if (skuCodeType === "KNOT" && putAwayKnotSku) {
        potentialSkusForLookup.push(putAwayKnotSku.toString().trim().toUpperCase());
      } else if (skuCodeType === "BRAND" && putAwayBrandSku) {
        potentialSkusForLookup.push(putAwayBrandSku.toString().trim().toUpperCase());
      }

      // Add the other SKU type if present and not already added
      if (putAwayKnotSku && !potentialSkusForLookup.includes(putAwayKnotSku.toString().trim().toUpperCase())) {
        potentialSkusForLookup.push(putAwayKnotSku.toString().trim().toUpperCase());
      }
      if (putAwayBrandSku && !potentialSkusForLookup.includes(putAwayBrandSku.toString().trim().toUpperCase())) {
        potentialSkusForLookup.push(putAwayBrandSku.toString().trim().toUpperCase());
      }

      // Add generic SKU as a fallback
      if (putAwayGenericSku && !potentialSkusForLookup.includes(putAwayGenericSku.toString().trim().toUpperCase())) {
        potentialSkusForLookup.push(putAwayGenericSku.toString().trim().toUpperCase());
      }

      let itemObject = null;
      // Try to find matching item in grnItems by any of the potential SKUs
      for (const skuToMatch of potentialSkusForLookup) {
        if (grnItems[skuToMatch]) {
          itemObject = grnItems[skuToMatch];
          break; // Found a match, stop searching
        }
      }

      if (itemObject) {
        itemObject.receivedQty = (itemObject.receivedQty || 0) + 1; // Assuming 1 unit per row in put away for now
      }
      // If item in Put Away not found in PO, it's currently skipped. Could add validation.
    });

    // 3. Process QC Fail Data
    qcFailDataArray.forEach((row) => {
      const qcFailKnotSku = getColumnValue(row, "knotSkuCode", ["SKU", "KNOT SKU Code", "Brand SKU Code"]);
      const qcFailBrandSku = getColumnValue(row, "brandSkuCode", ["SKU", "Brand SKU Code", "KNOT SKU Code"]);
      const qcFailGenericSku = getColumnValue(row, "sku", ["SKU"]); // Generic 'SKU' column

      const potentialSkusForLookup = [];

      // Prioritize based on user's skuCodeType preference if present in the row
      if (skuCodeType === "KNOT" && qcFailKnotSku) {
        potentialSkusForLookup.push(qcFailKnotSku.toString().trim().toUpperCase());
      } else if (skuCodeType === "BRAND" && qcFailBrandSku) {
        potentialSkusForLookup.push(qcFailBrandSku.toString().trim().toUpperCase());
      }

      // Add the other SKU type if present and not already added
      if (qcFailKnotSku && !potentialSkusForLookup.includes(qcFailKnotSku.toString().trim().toUpperCase())) {
        potentialSkusForLookup.push(qcFailKnotSku.toString().trim().toUpperCase());
      }
      if (qcFailBrandSku && !potentialSkusForLookup.includes(qcFailBrandSku.toString().trim().toUpperCase())) {
        potentialSkusForLookup.push(qcFailBrandSku.toString().trim().toUpperCase());
      }

      // Add generic SKU as a fallback
      if (qcFailGenericSku && !potentialSkusForLookup.includes(qcFailGenericSku.toString().trim().toUpperCase())) {
        potentialSkusForLookup.push(qcFailGenericSku.toString().trim().toUpperCase());
      }

      const failQty = parseInt(getColumnValue(row, "quantity", ["Quantity", "Failed Quantity", "1"])) || 1;
      const status = getColumnValue(row, "status", ["Status", "Failed"]);
      const remarks = getColumnValue(row, "remarks", ["Remarks", "QC Failed"]);

      let itemObject = null;
      // Try to find matching item in grnItems by any of the potential SKUs
      for (const skuToMatch of potentialSkusForLookup) {
        if (grnItems[skuToMatch]) {
          itemObject = grnItems[skuToMatch];
          break; // Found a match, stop searching
        }
      }

      if (itemObject) {
        itemObject.totalFailQty = (itemObject.totalFailQty || 0) + failQty;
        itemObject.fails.push({
          qty: failQty,
          status: status,
          remarks: remarks
        });
      }
      // If item in QC Fail not found in PO, it's currently skipped.
    });

    // Add validation for logical inconsistencies
    const validationErrors = [];

    // Validate logical inconsistencies against the consolidated grnItems
    Object.values(grnItems).forEach((item) => {
      // Only validate if it's a unique item object (to avoid duplicate validation messages)
      // A simple way to check for unique item objects is to ensure the current item is mapped by its primary SKU
      // This might need refinement if primary SKU logic is complex. For now, let's assume direct lookup is fine.
      
      // If an item has both Knot and Brand SKUs, and they point to the same object,
      // we only want to validate it once. Let's pick one canonical SKU for validation purposes.
      const canonicalSku = item.knotSku || item.brandSku; // Use Knot if available, else Brand
      if (!canonicalSku || grnItems[canonicalSku] !== item) {
        return; // Skip if this is a duplicate reference or no canonical SKU
      }

      // Removed validation for QC fail quantity vs putaway quantity
      // The correct relationship is: Received = QC Fail Qty + Put Away Qty
      // This allows QC fail quantity to be greater than putaway quantity
    });

    // Check for validation errors before proceeding
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      setLoading(false);
      setGrnData([]); // Clear any existing GRN data
      return;
    }

    // Validate required fields (already handled, but kept for context)
    const requiredFields = [
      "replenishmentNumber",
      "inwardDate",
      "warehouseNo",
      "verifiedBy",
      "warehouseManagerName",
    ];
    
    // Only add qcDoneBy to required fields if QC has been performed
    if (grnHeaderInfo.qcPerformed) {
      requiredFields.push("qcDoneBy");
    }
    
    const missingFields = requiredFields.filter((field) => {
      const value = grnHeaderInfo[field];
      if (field === "qcDoneBy") {
        return !Array.isArray(value) || value.length === 0;
      }
      return !value || (typeof value === "string" && !value.trim());
    });

    if (missingFields.length > 0) {
      setErrors([`Please fill in all required fields: ${missingFields.join(", ")}`]);
      setLoading(false);
      setGrnData([]); // Clear any existing GRN data
      return;
    }

    try {
      const grn = [];
      // Iterate over the unique item objects in grnItems to build the final GRN
      const uniqueGrnItems = new Set(Object.values(grnItems));

      uniqueGrnItems.forEach((item) => {
        // Determine which SKU to display based on user preference or availability
        let displaySku = "";
        if (skuCodeType === "KNOT" && item.knotSku) {
          displaySku = item.knotSku;
        } else if (item.brandSku) {
          displaySku = item.brandSku;
        } else if (item.knotSku) { // Fallback if brandSku not preferred or available
          displaySku = item.knotSku;
        }

        const shortageOrExcess = item.receivedQty + item.totalFailQty - item.orderedQty;
        let status = "";

        if (item.orderedQty === 0 && item.receivedQty > 0) {
          status = "Excess Receipt";
        } else if (item.orderedQty > 0 && (item.receivedQty + item.totalFailQty === 0)) {
          status = "Not Received";
        } else if (item.orderedQty > (item.receivedQty + item.totalFailQty)) {
          status = "Shortage";
        } else if (item.orderedQty < (item.receivedQty + item.totalFailQty)) {
          status = "Excess";
        } else if (item.orderedQty === (item.receivedQty + item.totalFailQty)) {
          status = "Received";
        }

        if (item.totalFailQty > 0 && status === "Received") {
          status = "QC Failed Receipt"; // Specific status for items fully received but with QC fails
        } else if (item.totalFailQty > 0 && status === "Shortage") {
            status = "Shortage & QC Failed";
        } else if (item.totalFailQty > 0 && status === "Excess") {
            status = "Excess & QC Failed";
        }

        grn.push({
          "S.No": item.sno,
          "Brand SKU": item.brandSku || "",
          "KNOT SKU": item.knotSku || "",
          "Size": item.size || "",
          "Color": item.colors || "",
          "Ordered Qty": item.orderedQty,
          "Received Qty": item.receivedQty + item.totalFailQty, // Total received including QC fails
          "Passed QC Qty": Math.max(0, item.receivedQty - item.totalFailQty), // Received minus QC fails
          "Failed QC Qty": item.totalFailQty,
          "Shortage Qty": Math.max(0, item.orderedQty - (item.receivedQty + item.totalFailQty)),
          "Excess Qty": Math.max(0, (item.receivedQty + item.totalFailQty) - item.orderedQty),
          "QC Status": item.totalFailQty > 0 ? (item.totalFailQty === (item.receivedQty + item.totalFailQty) ? "Failed" : "Partial") : "Passed",
          "Status": status,
          "Remarks": (item.fails && item.fails.length > 0) ? 
            `QC Failed: ${item.fails.map(f => `${f.qty} ${f.status}`).join(", ")}` : 
            "All items received as ordered"
        });
      });

      setGrnData(grn);
    } catch (error) {
      console.error("Error generating GRN:", error);
      setErrors([`Error generating GRN: ${error.message}`]);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    grnData,
    loading,
    errors,
    generateGRN,
  };
}; 
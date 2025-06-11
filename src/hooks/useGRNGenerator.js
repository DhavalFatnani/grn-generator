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
  }) => {
    setLoading(true);
    setErrors([]); // Clear any existing errors

    if (purchaseOrderData.length === 0 || putAwayData.length === 0) {
      setErrors(["Please upload both Purchase Order and Put Away sheets"]);
      setLoading(false);
      return;
    }

    // Add validation for logical inconsistencies
    const validationErrors = [];
    
    // Create maps for validation
    const poMap = {};
    const receivedMap = {};
    const qcFailMap = {};

    // Build PO map
    purchaseOrderData.forEach((row) => {
      const sku = row[skuCodeType === "KNOT" ? "KNOT SKU Code" : "Brand SKU Code"];
      if (sku) {
        const normalizedSku = sku.toString().trim().toUpperCase();
        poMap[normalizedSku] = parseInt(row.Quantity) || 0;
      }
    });

    // Build received map
    putAwayData.forEach((row) => {
      const sku = row.SKU || "";
      if (sku) {
        const normalizedSku = sku.toString().trim().toUpperCase();
        receivedMap[normalizedSku] = (receivedMap[normalizedSku] || 0) + 1;
      }
    });

    // Build QC fail map
    qcFailData.forEach((row) => {
      const sku = row.SKU || row["Brand SKU Code"] || "";
      if (sku) {
        const normalizedSku = sku.toString().trim().toUpperCase();
        const failQty = parseInt(row.Quantity || row["Failed Quantity"] || "1") || 1;
        qcFailMap[normalizedSku] = (qcFailMap[normalizedSku] || 0) + failQty;
      }
    });

    // Validate logical inconsistencies
    Object.entries(qcFailMap).forEach(([sku, failInfo]) => {
      const failQty = failInfo.totalFailQty;
      const receivedFromPutAwayQty = receivedMap[sku] || 0; // Quantity received from Put Away sheet
      
      // A QC fail quantity cannot be greater than the quantity physically put away.
      // If an item was not physically put away (receivedFromPutAwayQty === 0), it cannot have a QC fail quantity > 0.
      if (failQty > receivedFromPutAwayQty) {
        validationErrors.push(
          `Logical inconsistency for SKU ${sku}: QC fail quantity (${failQty}) is greater than put away quantity (${receivedFromPutAwayQty}). QC failed items must be physically received to be failed.`
        );
      }
    });

    // Check for validation errors before proceeding
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      setLoading(false);
      setGrnData([]); // Clear any existing GRN data
      return;
    }

    // Validate required fields
    const requiredFields = [
      "replenishmentNumber",
      "inwardDate",
      "warehouseNo",
      "qcDoneBy",
      "verifiedBy",
      "warehouseManagerName",
    ];
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
      const skuColumn =
        skuCodeType === "KNOT" ? "KNOT SKU Code" : "Brand SKU Code";

      const poMap = {};
      purchaseOrderData.forEach((row) => {
        const sku = row[skuColumn];
        if (sku) {
          const normalizedSku = sku.toString().trim().toUpperCase();
          const currentOrderedQty = parseInt(row.Quantity) || 0;

          if (poMap[normalizedSku]) {
            // If SKU already exists, sum the quantities
            poMap[normalizedSku].orderedQty += currentOrderedQty;
          } else {
            // If new SKU, add it to the map with its details
            poMap[normalizedSku] = {
              orderedQty: currentOrderedQty,
              brandSku: row["Brand SKU Code"] || "",
              knotSku: row["KNOT SKU Code"] || row["Product Name"] || "",
              size: row.Size || "",
              colors: row.Colors || "",
              sno: row.Sno || "",
            };
          }
        }
      });

      // Create QC Fail map with quantity tracking
      const qcFailMap = {};
      console.log("QC Fail Data:", qcFailData); // Debug log
      qcFailData.forEach((row) => {
        // Try both SKU and Brand SKU Code fields for matching
        const sku = row.SKU || row["Brand SKU Code"] || "";
        if (sku) {
          // Normalize the SKU by trimming and converting to uppercase
          const normalizedSku = sku.toString().trim().toUpperCase();
          const failQty = parseInt(row.Quantity || row["Failed Quantity"] || "1") || 1;
          
          if (!qcFailMap[normalizedSku]) {
            qcFailMap[normalizedSku] = {
              totalFailQty: 0,
              fails: []
            };
          }
          
          qcFailMap[normalizedSku].totalFailQty += failQty;
          qcFailMap[normalizedSku].fails.push({
            qty: failQty,
            status: row.Status || "Failed",
            remarks: row.Remarks || "QC Failed"
          });
        }
      });
      console.log("QC Fail Map with Quantities:", qcFailMap); // Debug log

      const receivedCounts = _.countBy(putAwayData, (row) => {
        // Normalize SKU in put away data
        const sku = row.SKU || "";
        return sku.toString().trim().toUpperCase();
      });

      const grn = [];
      // Include all SKUs from PO, put away, and QC fail data
      const allSkus = new Set([
        ...Object.keys(poMap).map(sku => sku.toString().trim().toUpperCase()),
        ...Object.keys(receivedCounts),
        ...Object.keys(qcFailMap)
      ]);

      // Debug log for SKU matching
      console.log("All SKUs:", Array.from(allSkus));
      console.log("QC Fail SKUs with Quantities:", 
        Object.entries(qcFailMap).map(([sku, data]) => ({
          sku,
          totalFailQty: data.totalFailQty,
          failCount: data.fails.length
        }))
      );

      allSkus.forEach((sku) => {
        const normalizedSku = sku.toString().trim().toUpperCase();
        const poItem = poMap[sku] || poMap[normalizedSku];
        
        // Quantity from Put Away sheet
        const putAwayQty = receivedCounts[normalizedSku] || 0;

        // Quantity from QC Fail sheet
        const qcFailInfo = qcFailMap[normalizedSku];
        const totalFailQty = qcFailInfo?.totalFailQty || 0;

        // The actual received quantity for this SKU is the sum of quantities from Put Away and QC Fail.
        let receivedQty = putAwayQty + totalFailQty;

        const orderedQty = poItem?.orderedQty || 0;
        
        const passQty = Math.max(0, receivedQty - totalFailQty);
        
        // Determine QC status based on quantities
        let qcStatus = "Passed";
        if (totalFailQty > 0) {
          if (totalFailQty === receivedQty) {
            qcStatus = "Failed";
          } else {
            qcStatus = "Partial";
          }
        }

        // --- Status Assignment Logic (Overall Fulfillment Status) ---
        // This logic determines the primary status of the GRN item.
        let status = "Complete"; // Default status
        let remarks = "All items received as ordered"; // Default remarks

        // 1. Not Ordered: If item is not in PO, but was received (via put away or QC fail)
        if (!poItem) {
            if (receivedQty > 0 || totalFailQty > 0) { // Check if it was received at all
                status = "Not Ordered";
                remarks = "Item received/QC Failed but not in purchase order";
            }
        }
        // 2. Not Received: If item is in PO, but nothing was physically received (neither put away nor QC failed)
        else if (receivedQty === 0) {
            status = "Not Received";
            remarks = "Item ordered but not received";
        }
        // 3. QC Failed Receipt: If item was ordered, received units, but ALL received units failed QC
        else if (orderedQty > 0 && totalFailQty > 0 && passQty === 0) {
            status = "QC Failed Receipt";
            remarks = `All received units (${receivedQty}) failed QC.`;
        }
        // 4. Shortage: If ordered quantity is greater than total received quantity
        else if (orderedQty > receivedQty) {
            status = "Shortage";
            remarks = `Short by ${orderedQty - receivedQty} units`;
        }
        // 5. Excess: If total received quantity is greater than ordered quantity
        else if (receivedQty > orderedQty) {
            status = "Excess";
            remarks = `Excess of ${receivedQty - orderedQty} units`;
        }

        // --- Calculate shortageQty and excessQty for the GRN item ---
        // These quantities reflect quantity discrepancies based on receivedQty vs orderedQty
        let shortageQty = Math.max(0, orderedQty - receivedQty);
        let excessQty = Math.max(0, receivedQty - orderedQty);

        // Add QC status and quantity details to remarks
        if (qcFailInfo) {
          const failDetails = qcFailInfo.fails.map(f => 
            `${f.qty} ${f.status}` // Simplified to quantity and status of failure
          ).join(", ");
          
          let qcRemark = `QC: ${qcStatus}`;
          if (totalFailQty > 0) {
            qcRemark += ` (${passQty} passed, ${totalFailQty} failed)`;
            if (failDetails) {
              qcRemark += ` - Fails: ${failDetails}`;
            }
          }
          
          remarks = `${remarks} | ${qcRemark}`;
        }

        grn.push({
          "S.No": poItem?.sno || "N/A",
          "Brand SKU":
            poItem?.brandSku || (skuCodeType === "Brand" ? normalizedSku : "Unknown"),
          "KNOT SKU":
            poItem?.knotSku || (skuCodeType === "KNOT" ? normalizedSku : "Unknown"),
          Size: poItem?.size || "Unknown",
          Color: poItem?.colors || "Unknown",
          "Ordered Qty": orderedQty,
          "Received Qty": receivedQty,
          "Passed QC Qty": passQty,
          "Failed QC Qty": totalFailQty,
          "Shortage Qty": shortageQty,
          "Excess Qty": excessQty,
          "QC Status": qcStatus,
          Status: status,
          "GRN Date": new Date().toLocaleDateString("en-GB"),
          Remarks: remarks,
        });
      });

      grn.sort((a, b) => {
        const aNum = parseInt(a["S.No"]) || 999999;
        const bNum = parseInt(b["S.No"]) || 999999;
        return aNum - bNum;
      });

      setGrnData(grn);
      setErrors([]);
      setLoading(false);
    } catch (error) {
      setErrors([`Error generating GRN: ${error.message}`]);
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
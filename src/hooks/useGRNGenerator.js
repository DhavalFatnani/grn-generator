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
    Object.entries(qcFailMap).forEach(([sku, failQty]) => {
      const orderedQty = poMap[sku] || 0;
      const receivedQty = receivedMap[sku] || 0;
      
      // Case 1: QC fail quantity equals ordered quantity but there's a shortage
      if (failQty === orderedQty && receivedQty < orderedQty) {
        validationErrors.push(
          `Logical inconsistency for SKU ${sku}: QC fail quantity (${failQty}) equals ordered quantity but there's a shortage of ${orderedQty - receivedQty} units`
        );
      }

      // Case 2: QC fail quantity is greater than received quantity
      if (failQty > receivedQty) {
        validationErrors.push(
          `Logical inconsistency for SKU ${sku}: QC fail quantity (${failQty}) is greater than received quantity (${receivedQty})`
        );
      }

      // Case 3: QC fail quantity is greater than ordered quantity
      if (failQty > orderedQty) {
        validationErrors.push(
          `Logical inconsistency for SKU ${sku}: QC fail quantity (${failQty}) is greater than ordered quantity (${orderedQty})`
        );
      }

      // Case 4: Single unit ordered, shortage of 1, and QC fail of 1
      if (orderedQty === 1 && receivedQty === 0 && failQty === 1) {
        validationErrors.push(
          `Logical inconsistency for SKU ${sku}: Cannot have QC fail of 1 unit when ordered 1 and received 0`
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
          poMap[sku] = {
            orderedQty: parseInt(row.Quantity) || 0,
            brandSku: row["Brand SKU Code"] || "",
            knotSku: row["KNOT SKU Code"] || row["Product Name"] || "",
            size: row.Size || "",
            colors: row.Colors || "",
            unitPrice: row["Unit Price"] || "",
            sno: row.Sno || "",
          };
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
        const receivedQty = receivedCounts[normalizedSku] || 0;
        const orderedQty = poItem?.orderedQty || 0;
        
        // Get QC fail information for this SKU
        const qcFailInfo = qcFailMap[normalizedSku];
        const totalFailQty = qcFailInfo?.totalFailQty || 0;
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

        // Debug log for each SKU
        if (qcFailInfo) {
          console.log(`SKU ${normalizedSku}:`, {
            poItem: poItem ? "Found in PO" : "Not in PO",
            receivedQty,
            totalFailQty,
            passQty,
            qcStatus,
            failDetails: qcFailInfo.fails
          });
        }

        const shortageQty = Math.max(0, orderedQty - receivedQty);
        const excessQty = Math.max(0, receivedQty - orderedQty);
        let notOrdered = 0;

        let status = "Complete";
        let remarks = "All items received as ordered";

        // If item is only in QC fail data (not in PO or put away)
        if (!poItem && !receivedCounts[normalizedSku] && qcFailInfo) {
          status = "Not Ordered";
          remarks = "QC Failed item not found in PO or Put Away data";
        } else if (!poItem) {
          status = "Not Ordered";
          remarks = "Item received but not in purchase order";
          notOrdered += 1;
        } else if (receivedQty === 0) {
          status = "Not Received";
          remarks = "Item ordered but not received";
        } else if (shortageQty > 0) {
          status = "Shortage";
          remarks = `Short by ${shortageQty} units`;
        } else if (excessQty > 0) {
          status = "Excess";
          remarks = `Excess of ${excessQty + notOrdered} units`;
        }

        // Add QC status and quantity details to remarks
        if (qcFailInfo) {
          const failDetails = qcFailInfo.fails.map(f => 
            `${f.qty} unit(s) - ${f.status}: ${f.remarks}`
          ).join("; ");
          
          remarks = `${remarks} | QC Status: ${qcStatus} (${passQty} passed, ${totalFailQty} failed) - ${failDetails}`;
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
          "Unit Price": poItem?.unitPrice || "",
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
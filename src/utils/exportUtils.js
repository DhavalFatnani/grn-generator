// GRN Export Utilities - Object-Oriented and Functional Approach

class GRNExporter {
  constructor(grnData, grnHeaderInfo) {
    this.grnData = grnData;
    this.grnHeaderInfo = grnHeaderInfo;
    this.today = new Date();
    this.documentNumber = this.generateDocumentNumber();
  }

  // Generate document number
  generateDocumentNumber() {
    const dateStr = this.today.toISOString().split("T")[0].replace(/-/g, "");
    return `GRN-KNOT-${dateStr}-${this.grnHeaderInfo.brandName.replace(/\s+/g, "")}-${this.grnHeaderInfo.replenishmentNumber}`;
  }

  // Calculate summary statistics
  calculateSummaryStats() {
    const stats = {
      // Items counts
      totalItems: this.grnData.length,
      itemsWithIssues: 0,
      itemsWithShortage: 0,
      itemsWithExcess: 0,
      itemsNotOrdered: 0,
      
      // Quantities
      totalOrderedUnits: 0,
      totalReceivedUnits: 0,
      totalQcPassedUnits: 0,
      totalQcFailedUnits: 0,
      totalShortageUnits: 0,
      totalExcessUnits: 0,
      totalNotOrderedUnits: 0,
      
      // QC specific
      qcPassedAgainstPO: 0,
      qcPassedNotOrdered: 0,
      
      // Percentages
      completionRate: 0,
      receiptAccuracy: 0,
      qcPassRate: 0,
      
      // Averages
      avgShortagePerItem: 0,
      avgExcessPerItem: 0,
      
      // Overall status
      overallStatus: 'complete'
    };

    // Calculate quantities and counts
    this.grnData.forEach(item => {
      stats.totalOrderedUnits += item["Ordered Qty"] || 0;
      stats.totalReceivedUnits += item["Received Qty"] || 0;
      stats.totalQcPassedUnits += item["Passed QC Qty"] || 0;
      stats.totalQcFailedUnits += item["Failed QC Qty"] || 0;
      stats.totalShortageUnits += item["Shortage Qty"] || 0;
      stats.totalExcessUnits += item["Excess Qty"] || 0;
      stats.totalNotOrderedUnits += item["Not Ordered Qty"] || 0;

      // Count items with issues
      if ((item["Shortage Qty"] || 0) > 0 || (item["Excess Qty"] || 0) > 0 || (item["Not Ordered Qty"] || 0) > 0 || (item["Failed QC Qty"] || 0) > 0) {
        stats.itemsWithIssues++;
      }
      if ((item["Shortage Qty"] || 0) > 0) stats.itemsWithShortage++;
      if ((item["Excess Qty"] || 0) > 0) stats.itemsWithExcess++;
      if ((item["Not Ordered Qty"] || 0) > 0) stats.itemsNotOrdered++;
    });

    // Calculate QC specific counts
    this.grnData.forEach(item => {
      if ((item["Ordered Qty"] || 0) > 0 && (item["Passed QC Qty"] || 0) > 0) {
        // QC passed against PO should be the minimum of ordered qty and passed QC qty
        // but also consider that passed QC qty cannot exceed received qty
        const maxPossiblePassed = Math.min(item["Ordered Qty"], item["Received Qty"]);
        stats.qcPassedAgainstPO += Math.min(maxPossiblePassed, item["Passed QC Qty"]);
      }
      if ((item["Not Ordered Qty"] || 0) > 0 && (item["Passed QC Qty"] || 0) > 0) {
        // For not ordered items, passed QC is the minimum of not ordered qty and passed QC qty
        stats.qcPassedNotOrdered += Math.min(item["Not Ordered Qty"], item["Passed QC Qty"]);
      }
    });

  // Calculate percentages
    stats.completionRate = stats.totalItems > 0 ? Math.round((stats.totalItems - stats.itemsWithIssues) / stats.totalItems * 100) : 0;
    stats.receiptAccuracy = stats.totalOrderedUnits > 0 ? Math.round(stats.totalReceivedUnits / stats.totalOrderedUnits * 100) : 0;
    stats.qcPassRate = stats.totalReceivedUnits > 0 ? Math.round((stats.totalQcPassedUnits / stats.totalReceivedUnits) * 100) : 0;

    // Calculate averages
    stats.avgShortagePerItem = stats.itemsWithShortage > 0 ? Math.round(stats.totalShortageUnits / stats.itemsWithShortage) : 0;
    stats.avgExcessPerItem = stats.itemsWithExcess > 0 ? Math.round(stats.totalExcessUnits / stats.itemsWithExcess) : 0;

    // Determine overall status
    if (stats.totalQcFailedUnits > 0 && stats.totalReceivedUnits > 0) {
      stats.overallStatus = 'qc-failed-receipt';
    } else if (stats.totalNotOrderedUnits > 0) {
      stats.overallStatus = 'receipt-with-unordered-items';
    } else if (stats.totalShortageUnits > 0 || stats.totalExcessUnits > 0) {
      stats.overallStatus = 'discrepancy';
    } else if (stats.totalReceivedUnits < stats.totalOrderedUnits) {
      stats.overallStatus = 'partial';
    } else {
      stats.overallStatus = 'complete';
    }

    return stats;
  }

  // Utility methods for calculations
  sumColumn(columnName) {
    return this.grnData.reduce((sum, item) => sum + (parseInt(item[columnName]) || 0), 0);
  }

  sumColumnByStatus(columnName, status) {
    return this.grnData
      .filter(item => item.Status === status)
      .reduce((sum, item) => sum + (parseInt(item[columnName]) || 0), 0);
  }

  countByStatus(status) {
    return this.grnData.filter(item => item.Status === status).length;
  }

  countByQCStatus(qcStatus) {
    return this.grnData.filter(item => item["QC Status"] === qcStatus).length;
  }

  calculatePercentage(numerator, denominator) {
    if (denominator === 0) return 0;
    return Math.round((numerator / denominator) * 100);
  }

  // Generate CSV content
  generateCSV() {
    const summaryStats = this.calculateSummaryStats();
    
    // Create metadata section
    const metadata = [
      ["Goods Received Note (GRN)"],
      ["Document Number", this.documentNumber],
      ["Generated Date", this.today.toLocaleDateString("en-GB")],
      ["Generated Time", this.today.toLocaleTimeString()],
      [], // Empty row for spacing
      ["Order Information"],
      ["PO Number", this.grnHeaderInfo.poNumber],
      ["Vendor/Brand", this.grnHeaderInfo.brandName],
      ["Replenishment Number", this.grnHeaderInfo.replenishmentNumber],
      [], // Empty row for spacing
      ["Receipt Information"],
      ["Inward Date", this.grnHeaderInfo.inwardDate],
      ["Warehouse", this.grnHeaderInfo.warehouseNo],
      ["Receipt Accuracy", summaryStats.receiptAccuracy + "%"],
      [], // Empty row for spacing
      ["Summary Statistics"],
      ["Total Ordered Units", summaryStats.totalOrderedUnits],
      ["Total Received Units", summaryStats.totalReceivedUnits],
      ["Total Shortage Units", summaryStats.totalShortageUnits],
      ["Total Excess Units", summaryStats.totalExcessUnits],
      ["Total Not Ordered Units", summaryStats.totalNotOrderedUnits]
    ];
    
    // Add QC statistics if QC was performed
    if (this.grnHeaderInfo.qcPerformed) {
      metadata.push(
        ["Total QC Passed Units", summaryStats.totalQcPassedUnits],
        ["Total QC Failed Units", summaryStats.totalQcFailedUnits],
        ["QC Pass Rate", summaryStats.qcPassRate + "%"]
      );
    }
    
    metadata.push([], []); // Add two empty rows before data
    
    // Define headers based on QC status
    const headers = [
      "S.No", "Brand SKU", "KNOT SKU", "Size", "Color", 
      "Ordered Qty", "Received Qty"
    ];
    
    if (this.grnHeaderInfo.qcPerformed) {
      headers.push("Passed QC Qty", "Failed QC Qty");
    }
    
    headers.push("Shortage Qty", "Excess Qty");
    
    if (this.grnHeaderInfo.qcPerformed) {
      headers.push("QC Status");
    }
    
    headers.push("Status", "Remarks");

    // Helper function to generate remarks
    const generateRemarks = (item) => {
      const remarks = [];
      // Guard for missing grnHeaderInfo
      if (!this || !this.grnHeaderInfo) {
        remarks.push("Data incomplete");
        return remarks.join(" | ");
      }
      
      // Check for shortage - either by quantity or status
      if ((item["Shortage Qty"] || 0) > 0 || item.Status === "Shortage" || item.Status === "Shortage & QC Failed") {
        const shortageQty = item["Shortage Qty"] || 0;
        if (shortageQty > 0) {
          remarks.push("Short by " + shortageQty + " units");
        } else {
          remarks.push("Shortage detected");
        }
      }
      
      // Check for excess - either by quantity or status
      if ((item["Excess Qty"] || 0) > 0 || item.Status === "Excess" || item.Status === "Excess & QC Failed" || item.Status === "Excess Receipt") {
        const excessQty = item["Excess Qty"] || 0;
        if (excessQty > 0) {
          remarks.push("Excess by " + excessQty + " units");
        } else {
          remarks.push("Excess detected");
        }
      }
      
      // Check for not ordered items
      if ((item["Not Ordered Qty"] || 0) > 0 || item.Status === "Not Ordered") {
        const notOrderedQty = item["Not Ordered Qty"] || 0;
        if (notOrderedQty > 0) {
          remarks.push(notOrderedQty + " units not ordered");
        } else {
          remarks.push("Items not in purchase order");
        }
      }
      
      // Check for not received items
      if (item.Status === "Not Received") {
        remarks.push("Items not received");
      }
      
      // Check for QC issues
      if (this.grnHeaderInfo.qcPerformed) {
        const qcRemarks = [];
        if ((item["Passed QC Qty"] || 0) > 0) {
          qcRemarks.push(item["Passed QC Qty"] + " passed");
        }
        if ((item["Failed QC Qty"] || 0) > 0) {
          qcRemarks.push(item["Failed QC Qty"] + " failed");
        }
        if (qcRemarks.length > 0) {
          remarks.push("QC: " + ((item["Failed QC Qty"] || 0) > 0 ? "Failed" : "Passed") + " (" + qcRemarks.join(", ") + ")");
        }
      }
      
      // Only show "All items received as ordered" if there are no issues
      if (remarks.length === 0) {
        remarks.push("All items received as ordered");
      }
      
      return remarks.join(" | ");
    };

    const dataRows = this.grnData.map((item, index) => {
      const row = [
        index + 1,
        item["Brand SKU"] || "",
        item["KNOT SKU"] || "",
        item["Size"] || "",
        item["Color"] || "",
        item["Ordered Qty"] || 0,
        item["Received Qty"] || 0
      ];
      
      if (this.grnHeaderInfo.qcPerformed) {
        row.push(
          item["Passed QC Qty"] || 0,
          item["Failed QC Qty"] || 0
        );
      }
      
      row.push(
        item["Shortage Qty"] || 0,
        item["Excess Qty"] || 0
      );
      
      if (this.grnHeaderInfo.qcPerformed) {
        row.push(item["QC Status"] || "");
      }
      
      row.push(
        item.Status || "",
        generateRemarks(item)
      );
      
      return row;
    });

    // Combine metadata, headers, and data rows
    const csvData = [
      ...metadata,
      headers,
      ...dataRows
    ];

    return this.convertToCSVString(csvData);
  }

  calculateQCPassedOrdered() {
    let total = 0;
    this.grnData.forEach(item => {
      if ((item["Ordered Qty"] || 0) > 0 && (item["Passed QC Qty"] || 0) > 0) {
        total += Math.min(item["Ordered Qty"], item["Passed QC Qty"]);
      }
    });
    return total;
  }

  calculateQCPassedNotOrdered() {
    let total = 0;
    this.grnData.forEach(item => {
      if ((item["Not Ordered Qty"] || 0) > 0 && (item["Passed QC Qty"] || 0) > 0) {
        total += Math.min(item["Not Ordered Qty"], item["Passed QC Qty"]);
      }
    });
    return total;
  }

  calculateOnlyQCFailed(summaryStats) {
    // Count items that have QC issues but no quantity issues
    return this.grnData.filter((item) => 
        item["QC Status"] !== "Passed" && 
      item["QC Status"] !== "Not Performed" && 
      !["Shortage", "Excess", "Not Received", "Excess Receipt", "Shortage & QC Failed", "Excess & QC Failed"].includes(item.Status)
    ).length;
  }

  calculateOnlyQuantityIssues(summaryStats) {
    // Count items that have quantity issues but no QC issues
    return this.grnData.filter((item) => 
      (item["QC Status"] === "Passed" || item["QC Status"] === "Not Performed") && 
      ((item["Shortage Qty"] || 0) > 0 || (item["Excess Qty"] || 0) > 0 || (item["Not Ordered Qty"] || 0) > 0 || item.Status === "Not Received")
    ).length;
  }

  calculateWithBothIssues(summaryStats) {
    // Count items that have both QC issues and quantity issues
    return this.grnData.filter((item) => 
        item["QC Status"] !== "Passed" && 
      item["QC Status"] !== "Not Performed" && 
      ["Shortage", "Excess", "Not Received", "Excess Receipt", "Shortage & QC Failed", "Excess & QC Failed"].includes(item.Status)
    ).length;
  }

  getCSVHeaders() {
    const baseHeaders = [
      "S.No", "Brand SKU", "KNOT SKU", "Size", "Color", "Ordered Qty", "Received Qty"
    ];
    
    const qcHeaders = this.grnHeaderInfo.qcPerformed ? [
      "Passed QC Qty", "Failed QC Qty", "QC Status"
    ] : [];
    
    const remainingHeaders = [
      "Shortage Qty", "Excess Qty", "Status", "Remarks"
    ];
    
    return [...baseHeaders, ...qcHeaders, ...remainingHeaders];
  }

  formatCSVRow(row) {
    const baseRow = [
      row["S.No"], row["Brand SKU"], row["KNOT SKU"], row["Size"], row["Color"],
      row["Ordered Qty"], row["Received Qty"]
    ];
    
    const qcRow = this.grnHeaderInfo.qcPerformed ? [
      row["Passed QC Qty"] || "", row["Failed QC Qty"] || "", row["QC Status"]
    ] : [];
    
    const remainingRow = [
      row["Shortage Qty"] || "", row["Excess Qty"] || "",
      row["Status"], this.today.toLocaleDateString("en-GB"), row["Remarks"]
    ];
    
    return [...baseRow, ...qcRow, ...remainingRow];
  }

  convertToCSVString(lines) {
    const escapeCSV = (value) => {
      if (value === null || value === undefined) return "";
      const stringValue = String(value);
      if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
        return '"' + stringValue.replace(/"/g, '""') + '"';
      }
      return stringValue;
    };

    return lines.map(row => row.map(cell => escapeCSV(cell)).join(",")).join("\n");
  }

  // Generate HTML content
  generateHTML() {
    const summaryStats = this.calculateSummaryStats();
    return this.buildHTMLContent(summaryStats);
  }

  buildHTMLContent(summaryStats) {
    return `
      <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Goods Received Note - ${this.documentNumber}</title>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
          ${this.getHTMLStyles()}
        </style>
      </head>
      <body>
        <div class="page">
          ${this.buildHTMLHeader(summaryStats)}
          ${this.buildHTMLMainGrid(summaryStats)}
          ${this.buildHTMLExportActions()}
          ${this.buildHTMLTable()}
          ${this.buildHTMLFooter()}
        </div>
        <script>
          ${this.getHTMLScripts()}
        </script>
      </body>
      </html>
    `;
  }

  getHTMLStyles() {
    return `
    :root {
      --primary: #2563eb;
      --primary-light: #dbeafe;
      --primary-dark: #1e40af;
      --success: #059669;
      --success-light: #d1fae5;
      --warning: #d97706;
      --warning-light: #fef3c7;
      --danger: #dc2626;
      --danger-light: #fee2e2;
      --partial: #7c3aed;
      --partial-light: #ede9fe;
      --gray-50: #f8fafc;
      --gray-100: #f1f5f9;
      --gray-200: #e2e8f0;
      --gray-300: #cbd5e1;
      --gray-400: #94a3b8;
      --gray-500: #64748b;
      --gray-600: #475569;
      --gray-700: #334155;
      --gray-800: #1e293b;
      --gray-900: #0f172a;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
        font-family: 'Roboto', sans-serif;
      line-height: 1.5;
      color: var(--gray-800);
      background: var(--gray-50);
      margin: 0;
      padding: 0;
    }

    .page {
      padding: 2rem;
      max-width: 1600px;
      margin: 0 auto;
      background: white;
        box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
      border-radius: 8px;
    }

    .header {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 2rem;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid var(--primary-light);
      background: linear-gradient(to right, var(--primary-light), transparent);
      padding: 1.5rem;
      border-radius: 8px;
    }

    .header h1 {
      font-size: 28px;
      font-weight: 700;
      color: var(--primary-dark);
      margin-bottom: 0.5rem;
    }

    .header .doc-no {
      font-size: 16px;
      color: var(--gray-600);
      font-weight: 500;
    }

    .header .doc-date {
      font-size: 14px;
      color: var(--gray-500);
      margin-top: 0.25rem;
    }

    .status-badge {
      display: inline-block;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      margin-top: 0.5rem;
    }

    .status-complete { 
      background: var(--success-light); 
      color: var(--success);
      border: 1px solid var(--success);
    }
    
    .status-partial { 
      background: var(--partial-light); 
      color: var(--partial);
      border: 1px solid var(--partial);
    }
    
    .status-discrepancy { 
      background: var(--danger-light); 
      color: var(--danger);
      border: 1px solid var(--danger);
    }

      .status-qc-failed-receipt {
        background: var(--danger-light);
        color: var(--danger);
        border: 1px solid var(--danger);
      }

      .status-passed {
        background: var(--success-light);
        color: var(--success);
        border: 1px solid var(--success);
      }

      .status-failed {
        background: var(--danger-light);
        color: var(--danger);
        border: 1px solid var(--danger);
      }

      .status-receipt-with-unordered-items {
        background: var(--warning-light);
        color: var(--warning);
        border: 1px solid var(--warning);
      }

      .status-shortage {
        background: var(--warning-light);
        color: var(--warning);
        border: 1px solid var(--warning);
      }

      .status-excess {
        background: var(--success-light);
        color: var(--success);
        border: 1px solid var(--success);
      }

      .status-not-ordered {
        background: var(--gray-100);
        color: var(--gray-600);
        border: 1px solid var(--gray-300);
      }

      .status-not-received {
        background: var(--gray-100);
        color: var(--gray-600);
        border: 1px solid var(--gray-300);
    }

    .main-grid {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 2rem;
      margin-bottom: 2rem;
    }

    .info-sections {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .info-section {
      background: var(--gray-50);
      padding: 1.25rem;
      border-radius: 8px;
      border: 1px solid var(--gray-200);
      box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    }

    .info-section h3 {
      font-size: 16px;
      font-weight: 600;
      color: var(--primary-dark);
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--primary-light);
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.75rem;
      font-size: 14px;
    }

    .info-label {
      color: var(--gray-600);
      font-weight: 500;
    }

    .info-value {
      color: var(--gray-900);
      font-weight: 600;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 0.75rem;
    }

    .summary-card {
      background: white;
      padding: 1rem;
      border-radius: 8px;
      border: 1px solid var(--gray-200);
      text-align: center;
      box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.03);
      transition: all 0.2s ease;
      min-height: 120px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }

    .summary-card:hover {
      transform: translateY(-2px);
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.08);
    }

    .summary-value {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 0.25rem;
      color: var(--primary-dark);
    }

    .summary-label {
      font-size: 14px;
      color: var(--gray-600);
      margin-bottom: 0.1rem;
    }

    .summary-subtext {
      font-size: 12px;
      color: var(--gray-500);
      line-height: 1.4;
    }

    .summary-subtext strong {
      color: var(--gray-700);
    }

    .table-container {
      margin: 2rem 0;
      border: 1px solid var(--gray-200);
      border-radius: 8px;
      overflow: hidden;
        box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    th {
      background: var(--primary-light);
      color: var(--primary-dark);
      font-weight: 600;
      text-align: left;
      padding: 1rem;
      border-bottom: 2px solid var(--primary);
      white-space: nowrap;
    }

    td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--gray-200);
      color: var(--gray-700);
    }

    tr:last-child td {
      border-bottom: none;
    }

    tr:hover td {
      background: var(--gray-50);
    }

    .sku-cell {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      color: var(--gray-800);
    }

    .qty-cell {
      text-align: right;
      font-weight: 600;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

      .qc-failed {
        color: var(--danger);
      }

      .shortage {
        color: var(--warning);
      }

      .excess {
        color: var(--success);
    }

    .footer {
      margin-top: 2rem;
      text-align: center;
      padding-top: 1rem;
      border-top: 1px solid var(--primary-light);
    }

    .footer-text {
      font-size: 12px;
      color: var(--gray-500);
    }

      .export-actions {
      display: flex;
      gap: 1rem;
        justify-content: flex-end;
        margin: 1.5rem 0;
        padding: 0;
    }

      .export-btn {
        display: flex;
      align-items: center;
      gap: 0.5rem;
        padding: 0.75rem 1.25rem;
        border: none;
      border-radius: 6px;
      font-size: 14px;
        font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
        text-decoration: none;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

      .csv-btn {
      background: var(--primary);
      color: white;
    }

      .csv-btn:hover {
        background: #1d4ed8;
        transform: translateY(-1px);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
      }

      .pdf-btn {
        background: #dc2626;
        color: white;
      }

      .pdf-btn:hover {
        background: #b91c1c;
        transform: translateY(-1px);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
      }

      .btn-icon {
        font-size: 16px;
      }

      .btn-text {
        font-weight: 500;
    }

    @media print {
      body {
        background: white;
      }

      .page {
        padding: 0;
        max-width: none;
        box-shadow: none;
      }

        .export-actions {
        display: none;
      }

      .footer {
        border-top: none;
      }

      .summary-card:hover,
      tr:hover td {
        transform: none;
        box-shadow: none;
      }
    }

    @media (max-width: 1200px) {
      .main-grid {
        grid-template-columns: 1fr;
      }

      .summary-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 768px) {
      .page {
        padding: 1rem;
      }

      .header {
        grid-template-columns: 1fr;
        text-align: center;
      }

      .summary-grid {
        grid-template-columns: 1fr;
      }

      .table-container {
        margin: 1rem -1rem;
        border-radius: 0;
        border-left: none;
        border-right: none;
      }

      th, td {
        padding: 0.75rem;
      }
    }
    `;
  }

  buildHTMLHeader(summaryStats) {
    const statusClass = this.getStatusClass(summaryStats.overallStatus);
    const statusText = this.getStatusText(summaryStats.overallStatus);
    
    return `
    <div class="header">
      <div class="header-main">
        <h1>Goods Received Note</h1>
          <div class="doc-no">${this.documentNumber}</div>
          <div class="doc-date">Generated on ${this.getCurrentDateTime()}</div>
      </div>
      <div class="header-side">
          <div class="status-badge ${statusClass}">${statusText}</div>
      </div>
    </div>
    `;
  }

  buildHTMLMainGrid(summaryStats) {
    const qcSection = this.grnHeaderInfo.qcPerformed ? `
      <div class="info-section">
        <h3>Quality Control</h3>
        <div class="info-row">
          <span class="info-label">QC Done By:</span>
          <span class="info-value">${Array.isArray(this.grnHeaderInfo.qcDoneBy) ? this.grnHeaderInfo.qcDoneBy.join(", ") : this.grnHeaderInfo.qcDoneBy}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Verified By:</span>
          <span class="info-value">${this.grnHeaderInfo.verifiedBy}</span>
        </div>
        <div class="info-row">
          <span class="info-label">QC Pass Rate:</span>
          <span class="info-value">${summaryStats.qcPassRate}%</span>
        </div>
      </div>
    ` : `
      <div class="info-section">
        <h3>Quality Control</h3>
        <div class="info-row">
          <span class="info-label">QC Status:</span>
          <span class="info-value">Not Performed</span>
        </div>
      </div>
    `;

    return `
    <div class="main-grid">
      <div class="info-sections">
        <div class="info-section">
          <h3>Order Information</h3>
          <div class="info-row">
            <span class="info-label">Purchase Order No:</span>
              <span class="info-value">${this.grnHeaderInfo.poNumber}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Vendor Name:</span>
              <span class="info-value">${this.grnHeaderInfo.brandName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Replenishment No:</span>
              <span class="info-value">${this.grnHeaderInfo.replenishmentNumber}</span>
          </div>
        </div>

        <div class="info-section">
          <h3>Receipt Information</h3>
          <div class="info-row">
            <span class="info-label">Inward Date:</span>
              <span class="info-value">${this.grnHeaderInfo.inwardDate}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Receiving Warehouse:</span>
              <span class="info-value">${this.grnHeaderInfo.warehouseNo}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Receipt Accuracy:</span>
              <span class="info-value">${summaryStats.receiptAccuracy}%</span>
          </div>
        </div>

          ${qcSection}
      </div>

      <div class="summary-grid">
        <div class="summary-card">
            <div class="summary-value">${summaryStats.totalItems}</div>
          <div class="summary-label">Total Items</div>
          <div class="summary-subtext">
              <strong>${this.calculatePercentage(summaryStats.totalItems - summaryStats.itemsWithIssues, summaryStats.totalItems)}%</strong> Complete<br>
              <strong>${this.calculatePercentage(summaryStats.itemsWithIssues, summaryStats.totalItems)}%</strong> With Issues
          </div>
        </div>
        <div class="summary-card">
            <div class="summary-value">${summaryStats.totalOrderedUnits}</div>
          <div class="summary-label">Total Ordered Units</div>
          <div class="summary-subtext">
              <strong>${summaryStats.totalReceivedUnits}</strong> Received<br>
              <strong>${summaryStats.receiptAccuracy}%</strong> Accuracy
          </div>
        </div>
        <div class="summary-card">
            <div class="summary-value">${summaryStats.totalReceivedUnits}</div>
            <div class="summary-label">Received Units</div>
          <div class="summary-subtext">
              ${this.grnHeaderInfo.qcPerformed ? `
                <strong>${summaryStats.totalQcPassedUnits}</strong> QC Pass<br>
                <strong>${summaryStats.totalQcFailedUnits}</strong> QC Fail
              ` : ''}
          </div>
        </div>
          ${this.grnHeaderInfo.qcPerformed ? `
        <div class="summary-card">
              <div class="summary-value">${summaryStats.totalQcPassedUnits}</div>
              <div class="summary-label">QC Passed Units</div>
          <div class="summary-subtext">
                <strong>${summaryStats.qcPassedAgainstPO}</strong> Against PO<br>
                <strong>${summaryStats.qcPassedNotOrdered}</strong> Not Ordered<br>
                <strong>${summaryStats.qcPassRate}%</strong> Pass Rate
          </div>
        </div>
        <div class="summary-card">
              <div class="summary-value">${summaryStats.totalQcFailedUnits}</div>
              <div class="summary-label">QC Failed Units</div>
          <div class="summary-subtext">
                <strong>${summaryStats.totalQcFailedUnits}</strong> Units
          </div>
        </div>
          ` : ''}
        <div class="summary-card">
            <div class="summary-value">${summaryStats.totalShortageUnits}</div>
            <div class="summary-label">Total Shortage Units</div>
          <div class="summary-subtext">
              Across <strong>${this.countByStatus("Shortage")}</strong> Items<br>
              Avg. <strong>${this.countByStatus("Shortage") > 0 ? Math.round(summaryStats.totalShortageUnits / this.countByStatus("Shortage")) : 0}</strong> Units/Item
          </div>
        </div>
        <div class="summary-card">
            <div class="summary-value">${summaryStats.totalExcessUnits}</div>
            <div class="summary-label">Total Excess Units</div>
          <div class="summary-subtext">
              Across <strong>${this.countByStatus("Excess")}</strong> Items<br>
              Avg. <strong>${this.countByStatus("Excess") > 0 ? Math.round(summaryStats.totalExcessUnits / this.countByStatus("Excess")) : 0}</strong> Units/Item
          </div>
        </div>
        <div class="summary-card">
            <div class="summary-value">${summaryStats.totalNotOrderedUnits}</div>
            <div class="summary-label">Not Ordered Units</div>
          <div class="summary-subtext">
              Across <strong>${this.countByStatus("Excess Receipt")}</strong> Items
          </div>
        </div>
      </div>
    </div>
    `;
  }

  buildHTMLExportActions() {
    return `
      <div class="export-actions">
        <button type="button" class="export-btn csv-btn" onclick="downloadCsvFromData()">
          <span class="btn-icon">📊</span>
          <span class="btn-text">Download CSV</span>
        </button>
        <button type="button" class="export-btn pdf-btn" onclick="downloadPdfFromData()">
          <span class="btn-icon">📄</span>
          <span class="btn-text">Download PDF</span>
        </button>
      </div>
    `;
  }

  buildHTMLTable() {
    return `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>S.No</th>
            <th>Brand SKU</th>
            <th>KNOT SKU</th>
            <th>Size</th>
            <th>Color</th>
            <th>Ordered</th>
            <th>Received</th>
              ${this.grnHeaderInfo.qcPerformed ? `
            <th>Passed QC</th>
            <th>Failed QC</th>
              ` : ''}
            <th>Shortage</th>
            <th>Excess</th>
              ${this.grnHeaderInfo.qcPerformed ? `
            <th>QC Status</th>
              ` : ''}
            <th>Status</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
            ${this.grnData.map((item, index) => this.buildTableRow(item, index + 1)).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  buildTableRow(item, serialNo) {
    const qcStatusClass = this.getQCStatusClass(item);
    const qcStatusText = this.getQCStatusText(item);
    const statusClass = this.getStatusClass(item.Status);
    const statusText = this.getStatusText(item.Status);
    
    return `
      <tr>
        <td>${serialNo}</td>
        <td class="sku-cell">${item["Brand SKU"] || '-'}</td>
        <td class="sku-cell">${item["KNOT SKU"] || '-'}</td>
        <td>${item["Size"] || '-'}</td>
        <td>${item["Color"] || '0'}</td>
        <td class="qty-cell">${item["Ordered Qty"] || 0}</td>
        <td class="qty-cell">${item["Received Qty"] || 0}</td>
        ${this.grnHeaderInfo.qcPerformed ? `
          <td class="qty-cell">${item["Passed QC Qty"] || '-'}</td>
          <td class="qty-cell qc-failed">${item["Failed QC Qty"] || '-'}</td>
        ` : ''}
        <td class="qty-cell shortage">${item["Shortage Qty"] || '-'}</td>
        <td class="qty-cell excess">${item["Excess Qty"] || '-'}</td>
        ${this.grnHeaderInfo.qcPerformed ? `
          <td>
            <span class="status-badge ${qcStatusClass}">
              ${qcStatusText}
                </span>
              </td>
        ` : ''}
              <td>
          <span class="status-badge ${statusClass}">
            ${statusText}
                </span>
              </td>
        <td style="font-size: 12px; max-width: 250px;">${this.generateRemarks(item)}</td>
            </tr>
    `;
  }

  getQCStatusClass(item) {
    if (!this.grnHeaderInfo.qcPerformed) return 'status-passed';
    if ((item["Failed QC Qty"] || 0) > 0) return 'status-failed';
    if ((item["Passed QC Qty"] || 0) > 0) return 'status-passed';
    return 'status-passed';
  }

  getQCStatusText(item) {
    if (!this.grnHeaderInfo.qcPerformed) return 'Not Performed';
    if ((item["Failed QC Qty"] || 0) > 0) return 'Failed';
    if ((item["Passed QC Qty"] || 0) > 0) return 'Passed';
    return 'Not Performed';
  }

  generateRemarks(item) {
    const remarks = [];
    // Guard for missing grnHeaderInfo
    if (!this || !this.grnHeaderInfo) {
      remarks.push("Data incomplete");
      return remarks.join(" | ");
    }
    
    // Check for shortage - either by quantity or status
    if ((item["Shortage Qty"] || 0) > 0 || item.Status === "Shortage" || item.Status === "Shortage & QC Failed") {
      const shortageQty = item["Shortage Qty"] || 0;
      if (shortageQty > 0) {
        remarks.push("Short by " + shortageQty + " units");
      } else {
        remarks.push("Shortage detected");
      }
    }
    
    // Check for excess - either by quantity or status
    if ((item["Excess Qty"] || 0) > 0 || item.Status === "Excess" || item.Status === "Excess & QC Failed" || item.Status === "Excess Receipt") {
      const excessQty = item["Excess Qty"] || 0;
      if (excessQty > 0) {
        remarks.push("Excess by " + excessQty + " units");
      } else {
        remarks.push("Excess detected");
      }
    }
    
    // Check for not ordered items
    if ((item["Not Ordered Qty"] || 0) > 0 || item.Status === "Not Ordered") {
      const notOrderedQty = item["Not Ordered Qty"] || 0;
      if (notOrderedQty > 0) {
        remarks.push(notOrderedQty + " units not ordered");
      } else {
        remarks.push("Items not in purchase order");
      }
    }
    
    // Check for not received items
    if (item.Status === "Not Received") {
      remarks.push("Items not received");
    }
    
    // Check for QC issues
    if (this.grnHeaderInfo.qcPerformed) {
      const qcRemarks = [];
      if ((item["Passed QC Qty"] || 0) > 0) {
        qcRemarks.push(item["Passed QC Qty"] + " passed");
      }
      if ((item["Failed QC Qty"] || 0) > 0) {
        qcRemarks.push(item["Failed QC Qty"] + " failed");
      }
      if (qcRemarks.length > 0) {
        remarks.push("QC: " + ((item["Failed QC Qty"] || 0) > 0 ? "Failed" : "Passed") + " (" + qcRemarks.join(", ") + ")");
      }
    }
    
    // Only show "All items received as ordered" if there are no issues
    if (remarks.length === 0) {
      remarks.push("All items received as ordered");
    }
    
    return remarks.join(" | ");
  }

  buildHTMLFooter() {
    return `
    <div class="footer">
      <p class="footer-text">
        <strong>KNOT Inventory Management System</strong><br>
        This is a computer-generated document. For queries, contact the warehouse team.
      </p>
    </div>
    `;
  }

  getHTMLScripts() {
    return `
      // Store data for download functions
      const grnData = ${JSON.stringify(this.grnData)};
      const grnHeaderInfo = ${JSON.stringify(this.grnHeaderInfo)};
      const documentNumber = "${this.documentNumber}";

      // Helper functions for CSV generation
      function escapeCSV(value) {
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\\n')) {
          return '"' + stringValue.replace(/"/g, '""') + '"';
        }
        return stringValue;
      }

      function convertToCSV(data) {
        return data.map(row => 
          row.map(cell => escapeCSV(cell)).join(',')
        ).join('\\n');
      }

      function generateCSV() {
        const today = new Date();

        // Calculate summary statistics manually
        const summaryStats = {
          totalOrderedUnits: grnData.reduce((sum, item) => sum + (item["Ordered Qty"] || 0), 0),
          totalReceivedUnits: grnData.reduce((sum, item) => sum + (item["Received Qty"] || 0), 0),
          totalShortageUnits: grnData.reduce((sum, item) => sum + (item["Shortage Qty"] || 0), 0),
          totalExcessUnits: grnData.reduce((sum, item) => sum + (item["Excess Qty"] || 0), 0),
          totalNotOrderedUnits: grnData.reduce((sum, item) => sum + (item["Not Ordered Qty"] || 0), 0),
          totalQcPassedUnits: grnData.reduce((sum, item) => sum + (item["Passed QC Qty"] || 0), 0),
          totalQcFailedUnits: grnData.reduce((sum, item) => sum + (item["Failed QC Qty"] || 0), 0)
        };
        
        summaryStats.receiptAccuracy = summaryStats.totalOrderedUnits > 0 ? 
          Math.round(((summaryStats.totalOrderedUnits - summaryStats.totalShortageUnits) / summaryStats.totalOrderedUnits) * 100) : 0;
        
        summaryStats.qcPassRate = (summaryStats.totalQcPassedUnits + summaryStats.totalQcFailedUnits) > 0 ? 
          Math.round((summaryStats.totalQcPassedUnits / (summaryStats.totalQcPassedUnits + summaryStats.totalQcFailedUnits)) * 100) : 0;
        
        // Create metadata section
        const metadata = [
          ["Goods Received Note (GRN)"],
          ["Document Number", documentNumber],
          ["Generated Date", today.toLocaleDateString("en-GB")],
          ["Generated Time", today.toLocaleTimeString()],
          [], // Empty row for spacing
          ["Order Information"],
          ["PO Number", grnHeaderInfo.poNumber],
          ["Vendor/Brand", grnHeaderInfo.brandName],
          ["Replenishment Number", grnHeaderInfo.replenishmentNumber],
          [], // Empty row for spacing
          ["Receipt Information"],
          ["Inward Date", grnHeaderInfo.inwardDate],
          ["Warehouse", grnHeaderInfo.warehouseNo],
          ["Receipt Accuracy", summaryStats.receiptAccuracy + "%"],
          [], // Empty row for spacing
          ["Summary Statistics"],
          ["Total Ordered Units", summaryStats.totalOrderedUnits],
          ["Total Received Units", summaryStats.totalReceivedUnits],
          ["Total Shortage Units", summaryStats.totalShortageUnits],
          ["Total Excess Units", summaryStats.totalExcessUnits],
          ["Total Not Ordered Units", summaryStats.totalNotOrderedUnits]
        ];
        
        // Add QC statistics if QC was performed
        if (grnHeaderInfo.qcPerformed) {
          metadata.push(
            ["Total QC Passed Units", summaryStats.totalQcPassedUnits],
            ["Total QC Failed Units", summaryStats.totalQcFailedUnits],
            ["QC Pass Rate", summaryStats.qcPassRate + "%"]
          );
        }
        
        metadata.push([], []); // Add two empty rows before data
        
        // Define headers based on QC status
        const headers = [
          "S.No", "Brand SKU", "KNOT SKU", "Size", "Color", 
          "Ordered Qty", "Received Qty"
        ];
        
        if (grnHeaderInfo.qcPerformed) {
          headers.push("Passed QC Qty", "Failed QC Qty");
        }
        
        headers.push("Shortage Qty", "Excess Qty");
        
        if (grnHeaderInfo.qcPerformed) {
          headers.push("QC Status");
        }
        
        headers.push("Status", "Remarks");

        // Helper function to generate remarks
        function generateRemarks(item) {
          const remarks = [];
          // Guard for missing grnHeaderInfo
          if (!this || !this.grnHeaderInfo) {
            remarks.push("Data incomplete");
            return remarks.join(" | ");
          }
          
          // Check for shortage - either by quantity or status
          if ((item["Shortage Qty"] || 0) > 0 || item.Status === "Shortage" || item.Status === "Shortage & QC Failed") {
            const shortageQty = item["Shortage Qty"] || 0;
            if (shortageQty > 0) {
              remarks.push("Short by " + shortageQty + " units");
            } else {
              remarks.push("Shortage detected");
            }
          }
          
          // Check for excess - either by quantity or status
          if ((item["Excess Qty"] || 0) > 0 || item.Status === "Excess" || item.Status === "Excess & QC Failed" || item.Status === "Excess Receipt") {
            const excessQty = item["Excess Qty"] || 0;
            if (excessQty > 0) {
              remarks.push("Excess by " + excessQty + " units");
            } else {
              remarks.push("Excess detected");
            }
          }
          
          // Check for not ordered items
          if ((item["Not Ordered Qty"] || 0) > 0 || item.Status === "Not Ordered") {
            const notOrderedQty = item["Not Ordered Qty"] || 0;
            if (notOrderedQty > 0) {
              remarks.push(notOrderedQty + " units not ordered");
            } else {
              remarks.push("Items not in purchase order");
            }
          }
          
          // Check for not received items
          if (item.Status === "Not Received") {
            remarks.push("Items not received");
          }
          
          // Check for QC issues
          if (grnHeaderInfo.qcPerformed) {
            const qcRemarks = [];
            if ((item["Passed QC Qty"] || 0) > 0) {
              qcRemarks.push(item["Passed QC Qty"] + " passed");
            }
            if ((item["Failed QC Qty"] || 0) > 0) {
              qcRemarks.push(item["Failed QC Qty"] + " failed");
            }
            if (qcRemarks.length > 0) {
              remarks.push("QC: " + ((item["Failed QC Qty"] || 0) > 0 ? "Failed" : "Passed") + " (" + qcRemarks.join(", ") + ")");
            }
          }
          
          // Only show "All items received as ordered" if there are no issues
          if (remarks.length === 0) {
            remarks.push("All items received as ordered");
          }
          
          return remarks.join(" | ");
        }

        const dataRows = grnData.map((item, index) => {
          const row = [
            index + 1,
            item["Brand SKU"] || "",
            item["KNOT SKU"] || "",
            item["Size"] || "",
            item["Color"] || "",
            item["Ordered Qty"] || 0,
            item["Received Qty"] || 0
          ];
          
          if (grnHeaderInfo.qcPerformed) {
            row.push(
              item["Passed QC Qty"] || 0,
              item["Failed QC Qty"] || 0
            );
          }
          
          row.push(
            item["Shortage Qty"] || 0,
            item["Excess Qty"] || 0
          );
          
          if (grnHeaderInfo.qcPerformed) {
            row.push(item["QC Status"] || "");
          }
          
          row.push(
            item.Status || "",
            generateRemarks(item)
          );
          
          return row;
        });

        // Combine metadata, headers, and data rows
        const csvData = [
          ...metadata,
          headers,
          ...dataRows
        ];

        return convertToCSV(csvData);
      }

      function downloadCsvFromData() {
        try {
          const csvContent = generateCSV();

        // Create and trigger download
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = documentNumber + '.csv';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Error downloading CSV:", error);
        alert("Error downloading CSV. Please try again.");
      }
    }

      function downloadPdfFromData() {
        try {
          // Create a new window for printing
          const printWindow = window.open('', '_blank');
          
          const today = new Date();
          const dateStr = today.toISOString().split("T")[0].replace(/-/g, "");
          const grnDocNo = "GRN-KNOT-" + dateStr + "-" + grnHeaderInfo.brandName.replace(/\s+/g, "") + "-" + grnHeaderInfo.replenishmentNumber;

          // Calculate summary statistics manually
          const summaryStats = {
            totalOrderedUnits: grnData.reduce((sum, item) => sum + (item["Ordered Qty"] || 0), 0),
            totalReceivedUnits: grnData.reduce((sum, item) => sum + (item["Received Qty"] || 0), 0),
            totalShortageUnits: grnData.reduce((sum, item) => sum + (item["Shortage Qty"] || 0), 0),
            totalExcessUnits: grnData.reduce((sum, item) => sum + (item["Excess Qty"] || 0), 0),
            totalNotOrderedUnits: grnData.reduce((sum, item) => sum + (item["Not Ordered Qty"] || 0), 0),
            totalQcPassedUnits: grnData.reduce((sum, item) => sum + (item["Passed QC Qty"] || 0), 0),
            totalQcFailedUnits: grnData.reduce((sum, item) => sum + (item["Failed QC Qty"] || 0), 0)
          };
          
          summaryStats.receiptAccuracy = summaryStats.totalOrderedUnits > 0 ? 
            Math.round(((summaryStats.totalOrderedUnits - summaryStats.totalShortageUnits) / summaryStats.totalOrderedUnits) * 100) : 0;
          
          summaryStats.qcPassRate = (summaryStats.totalQcPassedUnits + summaryStats.totalQcFailedUnits) > 0 ? 
            Math.round((summaryStats.totalQcPassedUnits / (summaryStats.totalQcPassedUnits + summaryStats.totalQcFailedUnits)) * 100) : 0;

          // Build QC-related summary cards
          const qcSummaryCards = grnHeaderInfo.qcPerformed ? 
            '<div style="text-align: center; padding: 10px 8px; background: #f8f9fa; border-radius: 4px; border: 1px solid #dee2e6;">' +
              '<div style="font-size: 18px; font-weight: bold; color: #2563eb; margin-bottom: 3px;">' + summaryStats.totalQcPassedUnits + '</div>' +
              '<div style="font-size: 10px; color: #666; font-weight: 500;">QC Passed</div>' +
            '</div>' +
            '<div style="text-align: center; padding: 10px 8px; background: #f8f9fa; border-radius: 4px; border: 1px solid #dee2e6;">' +
              '<div style="font-size: 18px; font-weight: bold; color: #2563eb; margin-bottom: 3px;">' + summaryStats.totalQcFailedUnits + '</div>' +
              '<div style="font-size: 10px; color: #666; font-weight: 500;">QC Failed</div>' +
            '</div>' : '';

          const qcPassRateCard = grnHeaderInfo.qcPerformed ? 
            '<div style="text-align: center; padding: 10px 8px; background: #f8f9fa; border-radius: 4px; border: 1px solid #dee2e6;">' +
              '<div style="font-size: 18px; font-weight: bold; color: #2563eb; margin-bottom: 3px;">' + summaryStats.qcPassRate + '%</div>' +
              '<div style="font-size: 10px; color: #666; font-weight: 500;">QC Pass Rate</div>' +
            '</div>' : '';

          // Build table rows
          const tableRows = grnData.map((row, index) => {
            const qcCells = grnHeaderInfo.qcPerformed ? 
              '<td style="border: 1px solid #ddd; padding: 6px 4px; text-align: center; font-size: 10px; line-height: 1.2;">' + (row["Passed QC Qty"] || "-") + '</td>' +
              '<td style="border: 1px solid #ddd; padding: 6px 4px; text-align: center; font-size: 10px; line-height: 1.2;">' + (row["Failed QC Qty"] || "-") + '</td>' : '';

            const qcStatusCell = grnHeaderInfo.qcPerformed ? 
              '<td style="border: 1px solid #ddd; padding: 6px 4px; text-align: center; font-size: 10px; line-height: 1.2;">' +
                '<span style="padding: 2px 4px; border-radius: 3px; font-size: 8px; font-weight: bold; display: inline-block; text-align: center; min-width: 40px; background: ' + 
                (row["QC Status"] === 'Passed' ? '#d4edda' : row["QC Status"] === 'Failed' ? '#f8d7da' : '#fff3cd') + 
                '; color: ' + (row["QC Status"] === 'Passed' ? '#155724' : row["QC Status"] === 'Failed' ? '#721c24' : '#856404') + ';">' + 
                row["QC Status"] + '</span>' +
              '</td>' : '';

            const statusBgColor = row.Status === 'Complete' ? '#d4edda' : 
                                 row.Status === 'Shortage' ? '#f8d7da' : 
                                 row.Status === 'Excess' ? '#fff3cd' : 
                                 row.Status === 'Not Ordered' ? '#d1ecf1' : 
                                 row.Status === 'Not Received' ? '#e2e3e5' : '#f8d7da';

            const statusTextColor = row.Status === 'Complete' ? '#155724' : 
                                   row.Status === 'Shortage' ? '#721c24' : 
                                   row.Status === 'Excess' ? '#856404' : 
                                   row.Status === 'Not Ordered' ? '#0c5460' : 
                                   row.Status === 'Not Received' ? '#383d41' : '#721c24';

            return '<tr>' +
              '<td style="border: 1px solid #ddd; padding: 6px 4px; text-align: center; font-size: 10px; line-height: 1.2;">' + (index + 1) + '</td>' +
              '<td style="border: 1px solid #ddd; padding: 6px 4px; text-align: center; font-size: 10px; line-height: 1.2;">' + row["Brand SKU"] + '</td>' +
              '<td style="border: 1px solid #ddd; padding: 6px 4px; text-align: center; font-size: 10px; line-height: 1.2;">' + row["KNOT SKU"] + '</td>' +
              '<td style="border: 1px solid #ddd; padding: 6px 4px; text-align: center; font-size: 10px; line-height: 1.2;">' + row["Size"] + '</td>' +
              '<td style="border: 1px solid #ddd; padding: 6px 4px; text-align: center; font-size: 10px; line-height: 1.2;">' + row["Color"] + '</td>' +
              '<td style="border: 1px solid #ddd; padding: 6px 4px; text-align: center; font-size: 10px; line-height: 1.2;">' + row["Ordered Qty"] + '</td>' +
              '<td style="border: 1px solid #ddd; padding: 6px 4px; text-align: center; font-size: 10px; line-height: 1.2;">' + row["Received Qty"] + '</td>' +
              qcCells +
              '<td style="border: 1px solid #ddd; padding: 6px 4px; text-align: center; font-size: 10px; line-height: 1.2;">' + (row["Shortage Qty"] || "-") + '</td>' +
              '<td style="border: 1px solid #ddd; padding: 6px 4px; text-align: center; font-size: 10px; line-height: 1.2;">' + (row["Excess Qty"] || "-") + '</td>' +
              qcStatusCell +
              '<td style="border: 1px solid #ddd; padding: 6px 4px; text-align: center; font-size: 10px; line-height: 1.2;">' +
                '<span style="padding: 2px 4px; border-radius: 3px; font-size: 8px; font-weight: bold; display: inline-block; text-align: center; min-width: 40px; background: ' + statusBgColor + '; color: ' + statusTextColor + ';">' + row.Status + '</span>' +
              '</td>' +
            '</tr>';
          }).join('');

          // Create HTML content for printing
          const printContent = 
            '<!DOCTYPE html>' +
            '<html>' +
            '<head>' +
              '<title>Goods Received Note - ' + grnDocNo + '</title>' +
              '<style>' +
                '@media print { body { margin: 0; padding: 20px; } }' +
                'body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; }' +
                'table { width: 100%; border-collapse: collapse; font-size: 10px; }' +
                'th, td { border: 1px solid #ddd; padding: 6px 4px; text-align: center; }' +
                'th { background-color: #f2f2f2; font-weight: bold; }' +
                '.header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }' +
                '.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }' +
                '.info-card { background: #f8f9fa; padding: 12px; border-radius: 4px; border: 1px solid #e9ecef; }' +
                '.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 20px; }' +
                '.stat-card { text-align: center; padding: 10px 8px; background: #f8f9fa; border-radius: 4px; border: 1px solid #dee2e6; }' +
                '.footer { margin-top: 20px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #eee; padding-top: 10px; }' +
              '</style>' +
            '</head>' +
            '<body>' +
              '<div class="header">' +
                '<h1 style="margin: 0; color: #2563eb; font-size: 24px; font-weight: bold;">Goods Received Note</h1>' +
                '<div style="font-size: 14px; color: #666; margin-top: 5px; font-weight: 600;">' + grnDocNo + '</div>' +
                '<div style="font-size: 12px; color: #888; margin-top: 3px;">Generated on ' + today.toLocaleDateString("en-GB") + ' at ' + today.toLocaleTimeString() + '</div>' +
              '</div>' +

              '<div class="info-grid">' +
                '<div class="info-card">' +
                  '<h3 style="margin: 0 0 8px 0; color: #2563eb; font-size: 14px; font-weight: bold;">Order Information</h3>' +
                  '<div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px;">' +
                    '<span>PO Number:</span><span>' + grnHeaderInfo.poNumber + '</span>' +
                  '</div>' +
                  '<div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px;">' +
                    '<span>Vendor:</span><span>' + grnHeaderInfo.brandName + '</span>' +
                  '</div>' +
                  '<div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px;">' +
                    '<span>Replenishment:</span><span>' + grnHeaderInfo.replenishmentNumber + '</span>' +
                  '</div>' +
                '</div>' +
                '<div class="info-card">' +
                  '<h3 style="margin: 0 0 8px 0; color: #2563eb; font-size: 14px; font-weight: bold;">Receipt Information</h3>' +
                  '<div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px;">' +
                    '<span>Inward Date:</span><span>' + grnHeaderInfo.inwardDate + '</span>' +
                  '</div>' +
                  '<div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px;">' +
                    '<span>Warehouse:</span><span>' + grnHeaderInfo.warehouseNo + '</span>' +
                  '</div>' +
                  '<div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px;">' +
                    '<span>Receipt Accuracy:</span><span>' + summaryStats.receiptAccuracy + '%</span>' +
                  '</div>' +
                '</div>' +
              '</div>' +

              '<div class="stats-grid">' +
                '<div class="stat-card">' +
                  '<div style="font-size: 18px; font-weight: bold; color: #2563eb; margin-bottom: 3px;">' + summaryStats.totalOrderedUnits + '</div>' +
                  '<div style="font-size: 10px; color: #666; font-weight: 500;">Ordered Units</div>' +
                '</div>' +
                '<div class="stat-card">' +
                  '<div style="font-size: 18px; font-weight: bold; color: #2563eb; margin-bottom: 3px;">' + summaryStats.totalReceivedUnits + '</div>' +
                  '<div style="font-size: 10px; color: #666; font-weight: 500;">Received Units</div>' +
                '</div>' +
                qcSummaryCards +
                '<div class="stat-card">' +
                  '<div style="font-size: 18px; font-weight: bold; color: #2563eb; margin-bottom: 3px;">' + summaryStats.totalShortageUnits + '</div>' +
                  '<div style="font-size: 10px; color: #666; font-weight: 500;">Shortage</div>' +
                '</div>' +
                '<div class="stat-card">' +
                  '<div style="font-size: 18px; font-weight: bold; color: #2563eb; margin-bottom: 3px;">' + summaryStats.totalExcessUnits + '</div>' +
                  '<div style="font-size: 10px; color: #666; font-weight: 500;">Excess</div>' +
                '</div>' +
                '<div class="stat-card">' +
                  '<div style="font-size: 18px; font-weight: bold; color: #2563eb; margin-bottom: 3px;">' + summaryStats.totalNotOrderedUnits + '</div>' +
                  '<div style="font-size: 10px; color: #666; font-weight: 500;">Not Ordered</div>' +
                '</div>' +
                qcPassRateCard +
              '</div>' +

              '<div style="margin-top: 15px; overflow-x: auto;">' +
                '<table>' +
                  '<thead>' +
                    '<tr>' +
                      '<th>S.No</th>' +
                      '<th>Brand SKU</th>' +
                      '<th>KNOT SKU</th>' +
                      '<th>Size</th>' +
                      '<th>Color</th>' +
                      '<th>Ordered</th>' +
                      '<th>Received</th>' +
                      (grnHeaderInfo.qcPerformed ? '<th>Passed QC</th><th>Failed QC</th>' : '') +
                      '<th>Shortage</th>' +
                      '<th>Excess</th>' +
                      (grnHeaderInfo.qcPerformed ? '<th>QC Status</th>' : '') +
                      '<th>Status</th>' +
                    '</tr>' +
                  '</thead>' +
                  '<tbody>' +
                    tableRows +
                  '</tbody>' +
                '</table>' +
              '</div>' +

              '<div class="footer">' +
                '<strong>KNOT Inventory Management System</strong><br>' +
                'This is a computer-generated document. For queries, contact the warehouse team.' +
              '</div>' +
            '</body>' +
            '</html>';

          printWindow.document.write(printContent);
          printWindow.document.close();
          
          // Wait for content to load then print
          printWindow.onload = function() {
            printWindow.print();
            printWindow.close();
          };
          
        } catch (error) {
          console.error("Error downloading PDF:", error);
          alert("Error downloading PDF. Please try again.");
        }
      }
    `;
  }

  // Generate PDF content
  generatePDF() {
    const summaryStats = this.calculateSummaryStats();
    return this.buildPDFContent(summaryStats);
  }

  buildPDFContent(summaryStats) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>GRN - ${this.documentNumber}</title>
        <style>
          ${this.getPDFStyles()}
        </style>
      </head>
      <body>
        ${this.buildPDFHeader()}
        ${this.buildPDFInfo(summaryStats)}
        ${this.buildPDFSummary(summaryStats)}
        ${this.buildPDFTable()}
        ${this.buildPDFFooter()}
</body>
      </html>
    `;
  }

  getPDFStyles() {
    return `
      @page {
        size: A4;
        margin: 15mm 10mm;
      }
      
      body { 
        font-family: Arial, sans-serif; 
        margin: 0; 
        padding: 0;
        line-height: 1.3;
        font-size: 10px;
        color: #333;
      }
      
      .header { 
        text-align: center; 
        margin-bottom: 20px; 
        border-bottom: 2px solid #333; 
        padding-bottom: 15px; 
      }
      
      .header h1 { 
        margin: 0; 
        color: #2563eb; 
        font-size: 20px; 
        font-weight: bold;
      }
      
      .header .doc-no { 
        font-size: 12px; 
        color: #666; 
        margin-top: 5px; 
        font-weight: 600;
      }
      
      .header .date { 
        font-size: 10px; 
        color: #888; 
        margin-top: 3px; 
      }
      
      .info-grid { 
        display: grid; 
        grid-template-columns: 1fr 1fr; 
        gap: 15px; 
        margin-bottom: 20px; 
      }
      
      .info-section { 
        background: #f8f9fa; 
        padding: 12px; 
        border-radius: 4px; 
        border: 1px solid #e9ecef;
      }
      
      .info-section h3 { 
        margin: 0 0 8px 0; 
        color: #2563eb; 
        font-size: 12px; 
        font-weight: bold;
      }
      
      .info-row { 
        display: flex; 
        justify-content: space-between; 
        margin-bottom: 4px; 
        font-size: 10px; 
      }
      
      .summary-grid { 
        display: grid; 
        grid-template-columns: repeat(4, 1fr); 
        gap: 8px; 
        margin-bottom: 20px; 
      }
      
      .summary-card { 
        text-align: center; 
        padding: 10px 8px; 
        background: #f8f9fa; 
        border-radius: 4px; 
        border: 1px solid #dee2e6; 
      }
      
      .summary-value { 
        font-size: 16px; 
        font-weight: bold; 
        color: #2563eb; 
        margin-bottom: 3px; 
        line-height: 1.2;
      }
      
      .summary-label { 
        font-size: 9px; 
        color: #666; 
        font-weight: 500;
      }
      
      .table-container {
        margin-top: 15px;
        overflow-x: auto;
      }
      
      table { 
        width: 100%; 
        border-collapse: collapse; 
        font-size: 9px;
        table-layout: fixed;
      }
      
      th, td { 
        border: 1px solid #ddd; 
        padding: 6px 4px; 
        text-align: center; 
        vertical-align: middle;
        word-wrap: break-word;
        overflow: hidden;
      }
      
      th { 
        background-color: #f2f2f2; 
        font-weight: bold; 
        font-size: 9px;
        color: #333;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      td {
        font-size: 9px;
        line-height: 1.2;
      }
      
      .status-badge { 
        padding: 2px 4px; 
        border-radius: 3px; 
        font-size: 8px; 
        font-weight: bold; 
        display: inline-block;
        text-align: center;
        min-width: 40px;
      }
      
      .status-complete { background: #d4edda; color: #155724; }
      .status-shortage { background: #f8d7da; color: #721c24; }
      .status-excess { background: #fff3cd; color: #856404; }
      .status-not-ordered { background: #d1ecf1; color: #0c5460; }
      .status-not-received { background: #e2e3e5; color: #383d41; }
      .status-qc-failed-receipt { background: #f8d7da; color: #721c24; }
      .qc-passed { background: #d4edda; color: #155724; }
      .qc-failed { background: #f8d7da; color: #721c24; }
      .qc-partial { background: #fff3cd; color: #856404; }
      
      .footer {
        margin-top: 20px;
        text-align: center;
        font-size: 9px;
        color: #666;
        border-top: 1px solid #eee;
        padding-top: 10px;
      }
      
      @media print { 
        body { 
          margin: 0; 
          font-size: 9px;
        } 
        
        .summary-grid { 
          grid-template-columns: repeat(4, 1fr); 
          gap: 6px;
        }
        
        .summary-card {
          padding: 8px 6px;
        }
        
        .summary-value {
          font-size: 14px;
        }
        
        .summary-label {
          font-size: 8px;
        }
        
        table {
          font-size: 8px;
        }
        
        th, td {
          padding: 4px 2px;
        }
        
        .status-badge {
          font-size: 7px;
          padding: 1px 3px;
        }
      }
    `;
  }

  buildPDFHeader() {
    return `
      <div class="header">
        <h1>Goods Received Note</h1>
        <div class="doc-no">${this.documentNumber}</div>
        <div class="date">Generated on ${this.today.toLocaleDateString("en-GB")} at ${this.today.toLocaleTimeString()}</div>
      </div>
    `;
  }

  buildPDFInfo(summaryStats) {
    return `
      <div class="info-grid">
        <div class="info-section">
          <h3>Order Information</h3>
          <div class="info-row"><span>PO Number:</span><span>${this.grnHeaderInfo.poNumber}</span></div>
          <div class="info-row"><span>Vendor:</span><span>${this.grnHeaderInfo.brandName}</span></div>
          <div class="info-row"><span>Replenishment:</span><span>${this.grnHeaderInfo.replenishmentNumber}</span></div>
        </div>
        <div class="info-section">
          <h3>Receipt Information</h3>
          <div class="info-row"><span>Inward Date:</span><span>${this.grnHeaderInfo.inwardDate}</span></div>
          <div class="info-row"><span>Warehouse:</span><span>${this.grnHeaderInfo.warehouseNo}</span></div>
          <div class="info-row"><span>Receipt Accuracy:</span><span>${this.calculatePercentage(summaryStats.quantities.totalReceived, summaryStats.quantities.totalOrdered)}%</span></div>
        </div>
      </div>
    `;
  }

  buildPDFSummary(summaryStats) {
    return `
      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-value">${summaryStats.quantities.totalOrdered}</div>
          <div class="summary-label">Ordered Units</div>
        </div>
        <div class="summary-card">
          <div class="summary-value">${summaryStats.quantities.totalReceived}</div>
          <div class="summary-label">Received Units</div>
        </div>
        ${this.grnHeaderInfo.qcPerformed ? `
          <div class="summary-card">
            <div class="summary-value">${summaryStats.quantities.totalPassedQC}</div>
            <div class="summary-label">QC Passed</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${summaryStats.quantities.totalFailedQC}</div>
            <div class="summary-label">QC Failed</div>
          </div>
        ` : ''}
        <div class="summary-card">
          <div class="summary-value">${summaryStats.quantities.totalShortage}</div>
          <div class="summary-label">Shortage</div>
        </div>
        <div class="summary-card">
          <div class="summary-value">${summaryStats.quantities.totalExcess}</div>
          <div class="summary-label">Excess</div>
        </div>
        <div class="summary-card">
          <div class="summary-value">${summaryStats.quantities.totalNotOrderedUnits}</div>
          <div class="summary-label">Not Ordered</div>
        </div>
        ${this.grnHeaderInfo.qcPerformed ? `
          <div class="summary-card">
            <div class="summary-value">${this.calculatePercentage(summaryStats.quantities.totalPassedQC, summaryStats.quantities.totalReceived)}%</div>
            <div class="summary-label">QC Pass Rate</div>
          </div>
        ` : ''}
      </div>
    `;
  }

  buildPDFTable() {
    return `
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>S.No</th>
              <th>Brand SKU</th>
              <th>KNOT SKU</th>
              <th>Size</th>
              <th>Color</th>
              <th>Ordered</th>
              <th>Received</th>
              ${this.grnHeaderInfo.qcPerformed ? `
                <th>Passed QC</th>
                <th>Failed QC</th>
              ` : ''}
              <th>Shortage</th>
              <th>Excess</th>
              ${this.grnHeaderInfo.qcPerformed ? `
                <th>QC Status</th>
              ` : ''}
              <th>Status</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${this.grnData.map((item, index) => this.formatPDFRow(item, index + 1)).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  formatPDFRow(item, serialNo) {
    const qcStatusClass = this.getQCStatusClass(item);
    const qcStatusText = this.getQCStatusText(item);
    const statusClass = this.getStatusClass(item.Status);
    const statusText = this.getStatusText(item.Status);
    
    return `
      <tr>
        <td>${serialNo}</td>
        <td class="sku-cell">${item["Brand SKU"] || '-'}</td>
        <td class="sku-cell">${item["KNOT SKU"] || '-'}</td>
        <td>${item["Size"] || '-'}</td>
        <td>${item["Color"] || '0'}</td>
        <td class="qty-cell">${item["Ordered Qty"] || 0}</td>
        <td class="qty-cell">${item["Received Qty"] || 0}</td>
        ${this.grnHeaderInfo.qcPerformed ? `
          <td class="qty-cell">${item["Passed QC Qty"] || '-'}</td>
          <td class="qty-cell qc-failed">${item["Failed QC Qty"] || '-'}</td>
        ` : ''}
        <td class="qty-cell shortage">${item["Shortage Qty"] || '-'}</td>
        <td class="qty-cell excess">${item["Excess Qty"] || '-'}</td>
        ${this.grnHeaderInfo.qcPerformed ? `
          <td>
            <span class="status-badge ${qcStatusClass}">
              ${qcStatusText}
            </span>
          </td>
        ` : ''}
        <td>
          <span class="status-badge ${statusClass}">
            ${statusText}
          </span>
        </td>
        <td style="font-size: 12px; max-width: 250px;">${this.generateRemarks(item)}</td>
      </tr>
    `;
  }

  buildPDFFooter() {
    return `
      <div class="footer">
        <strong>KNOT Inventory Management System</strong><br>
        This is a computer-generated document. For queries, contact the warehouse team.
      </div>
    `;
  }

  getStatusClass(status) {
    const statusMap = {
      'Complete': 'status-complete',
      'Partial': 'status-partial',
      'Discrepancy': 'status-discrepancy',
      'QC Failed Receipt': 'status-qc-failed-receipt',
      'Receipt with Unordered Items': 'status-receipt-with-unordered-items',
      'Shortage': 'status-shortage',
      'Excess': 'status-excess',
      'Not Ordered': 'status-not-ordered',
      'Not Received': 'status-not-received',
      'complete': 'status-complete',
      'partial': 'status-partial',
      'discrepancy': 'status-discrepancy',
      'qc-failed-receipt': 'status-qc-failed-receipt',
      'receipt-with-unordered-items': 'status-receipt-with-unordered-items'
    };
    return statusMap[status] || 'status-complete';
  }

  getStatusText(status) {
    const statusMap = {
      'Complete': 'Complete',
      'Partial': 'Partial',
      'Discrepancy': 'Discrepancy',
      'QC Failed Receipt': 'QC Failed Receipt',
      'Receipt with Unordered Items': 'Receipt with Unordered Items',
      'Shortage': 'Shortage',
      'Excess': 'Excess',
      'Not Ordered': 'Not Ordered',
      'Not Received': 'Not Received',
      'complete': 'Complete',
      'partial': 'Partial',
      'discrepancy': 'Discrepancy',
      'qc-failed-receipt': 'QC Failed Receipt',
      'receipt-with-unordered-items': 'Receipt with Unordered Items'
    };
    return statusMap[status] || 'Complete';
  }

  getCurrentDateTime() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${day}/${month}/${year} at ${hours}:${minutes}:${seconds}`;
  }
}

// Utility functions for backward compatibility
function downloadHTML(grnData, grnHeaderInfo) {
  const exporter = new GRNExporter(grnData, grnHeaderInfo);
  const htmlContent = exporter.generateHTML();

        // Create and trigger download
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${exporter.documentNumber}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
        URL.revokeObjectURL(url);
}

function downloadCSV(grnData, grnHeaderInfo) {
  const exporter = new GRNExporter(grnData, grnHeaderInfo);
  const csvContent = exporter.generateCSV();
  
  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${exporter.documentNumber}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadPDF(grnData, grnHeaderInfo) {
  try {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    
    const exporter = new GRNExporter(grnData, grnHeaderInfo);
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0].replace(/-/g, "");
    const grnDocNo = "GRN-KNOT-" + dateStr + "-" + grnHeaderInfo.brandName.replace(/\s+/g, "") + "-" + grnHeaderInfo.replenishmentNumber;

    // Calculate summary statistics
    const summaryStats = exporter.calculateSummaryStats();

    // Build QC-related summary cards
    const qcSummaryCards = grnHeaderInfo.qcPerformed ? 
      '<div style="text-align: center; padding: 10px 8px; background: #f8f9fa; border-radius: 4px; border: 1px solid #dee2e6;">' +
        '<div style="font-size: 18px; font-weight: bold; color: #2563eb; margin-bottom: 3px;">' + summaryStats.totalQcPassedUnits + '</div>' +
        '<div style="font-size: 10px; color: #666; font-weight: 500;">QC Passed</div>' +
      '</div>' +
      '<div style="text-align: center; padding: 10px 8px; background: #f8f9fa; border-radius: 4px; border: 1px solid #dee2e6;">' +
        '<div style="font-size: 18px; font-weight: bold; color: #2563eb; margin-bottom: 3px;">' + summaryStats.totalQcFailedUnits + '</div>' +
        '<div style="font-size: 10px; color: #666; font-weight: 500;">QC Failed</div>' +
      '</div>' : '';

    const qcPassRateCard = grnHeaderInfo.qcPerformed ? 
      '<div style="text-align: center; padding: 10px 8px; background: #f8f9fa; border-radius: 4px; border: 1px solid #dee2e6;">' +
        '<div style="font-size: 18px; font-weight: bold; color: #2563eb; margin-bottom: 3px;">' + summaryStats.qcPassRate + '%</div>' +
        '<div style="font-size: 10px; color: #666; font-weight: 500;">QC Pass Rate</div>' +
      '</div>' : '';

    // Build table rows
    const tableRows = grnData.map((row, index) => {
      const qcCells = grnHeaderInfo.qcPerformed ? 
        '<td style="border: 1px solid #ddd; padding: 6px 4px; text-align: center; font-size: 10px; line-height: 1.2;">' + (row["Passed QC Qty"] || "-") + '</td>' +
        '<td style="border: 1px solid #ddd; padding: 6px 4px; text-align: center; font-size: 10px; line-height: 1.2;">' + (row["Failed QC Qty"] || "-") + '</td>' : '';

      const qcStatusCell = grnHeaderInfo.qcPerformed ? 
        '<td style="border: 1px solid #ddd; padding: 6px 4px; text-align: center; font-size: 10px; line-height: 1.2;">' +
          '<span style="padding: 2px 4px; border-radius: 3px; font-size: 8px; font-weight: bold; display: inline-block; text-align: center; min-width: 40px; background: ' + 
          (row["QC Status"] === 'Passed' ? '#d4edda' : row["QC Status"] === 'Failed' ? '#f8d7da' : '#fff3cd') + 
          '; color: ' + (row["QC Status"] === 'Passed' ? '#155724' : row["QC Status"] === 'Failed' ? '#721c24' : '#856404') + ';">' + 
          row["QC Status"] + '</span>' +
        '</td>' : '';

      const statusBgColor = row.Status === 'Complete' ? '#d4edda' : 
                           row.Status === 'Shortage' ? '#f8d7da' : 
                           row.Status === 'Excess' ? '#fff3cd' : 
                           row.Status === 'Not Ordered' ? '#d1ecf1' : 
                           row.Status === 'Not Received' ? '#e2e3e5' : '#f8d7da';

      const statusTextColor = row.Status === 'Complete' ? '#155724' : 
                             row.Status === 'Shortage' ? '#721c24' : 
                             row.Status === 'Excess' ? '#856404' : 
                             row.Status === 'Not Ordered' ? '#0c5460' : 
                             row.Status === 'Not Received' ? '#383d41' : '#721c24';

      return '<tr>' +
        '<td style="border: 1px solid #ddd; padding: 6px 4px; text-align: center; font-size: 10px; line-height: 1.2;">' + (index + 1) + '</td>' +
        '<td style="border: 1px solid #ddd; padding: 6px 4px; text-align: center; font-size: 10px; line-height: 1.2;">' + row["Brand SKU"] + '</td>' +
        '<td style="border: 1px solid #ddd; padding: 6px 4px; text-align: center; font-size: 10px; line-height: 1.2;">' + row["KNOT SKU"] + '</td>' +
        '<td style="border: 1px solid #ddd; padding: 6px 4px; text-align: center; font-size: 10px; line-height: 1.2;">' + row["Size"] + '</td>' +
        '<td style="border: 1px solid #ddd; padding: 6px 4px; text-align: center; font-size: 10px; line-height: 1.2;">' + row["Color"] + '</td>' +
        '<td style="border: 1px solid #ddd; padding: 6px 4px; text-align: center; font-size: 10px; line-height: 1.2;">' + row["Ordered Qty"] + '</td>' +
        '<td style="border: 1px solid #ddd; padding: 6px 4px; text-align: center; font-size: 10px; line-height: 1.2;">' + row["Received Qty"] + '</td>' +
        qcCells +
        '<td style="border: 1px solid #ddd; padding: 6px 4px; text-align: center; font-size: 10px; line-height: 1.2;">' + (row["Shortage Qty"] || "-") + '</td>' +
        '<td style="border: 1px solid #ddd; padding: 6px 4px; text-align: center; font-size: 10px; line-height: 1.2;">' + (row["Excess Qty"] || "-") + '</td>' +
        qcStatusCell +
        '<td style="border: 1px solid #ddd; padding: 6px 4px; text-align: center; font-size: 10px; line-height: 1.2;">' +
          '<span style="padding: 2px 4px; border-radius: 3px; font-size: 8px; font-weight: bold; display: inline-block; text-align: center; min-width: 40px; background: ' + statusBgColor + '; color: ' + statusTextColor + ';">' + row.Status + '</span>' +
        '</td>' +
      '</tr>';
    }).join('');

    // Create HTML content for printing
    const printContent = 
      '<!DOCTYPE html>' +
      '<html>' +
      '<head>' +
        '<title>Goods Received Note - ' + grnDocNo + '</title>' +
        '<style>' +
          '@media print { body { margin: 0; padding: 20px; } }' +
          'body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; }' +
          'table { width: 100%; border-collapse: collapse; font-size: 10px; }' +
          'th, td { border: 1px solid #ddd; padding: 6px 4px; text-align: center; }' +
          'th { background-color: #f2f2f2; font-weight: bold; }' +
          '.header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }' +
          '.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }' +
          '.info-card { background: #f8f9fa; padding: 12px; border-radius: 4px; border: 1px solid #e9ecef; }' +
          '.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 20px; }' +
          '.stat-card { text-align: center; padding: 10px 8px; background: #f8f9fa; border-radius: 4px; border: 1px solid #dee2e6; }' +
          '.footer { margin-top: 20px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #eee; padding-top: 10px; }' +
        '</style>' +
      '</head>' +
      '<body>' +
        '<div class="header">' +
          '<h1 style="margin: 0; color: #2563eb; font-size: 24px; font-weight: bold;">Goods Received Note</h1>' +
          '<div style="font-size: 14px; color: #666; margin-top: 5px; font-weight: 600;">' + grnDocNo + '</div>' +
          '<div style="font-size: 12px; color: #888; margin-top: 3px;">Generated on ' + today.toLocaleDateString("en-GB") + ' at ' + today.toLocaleTimeString() + '</div>' +
        '</div>' +

        '<div class="info-grid">' +
          '<div class="info-card">' +
            '<h3 style="margin: 0 0 8px 0; color: #2563eb; font-size: 14px; font-weight: bold;">Order Information</h3>' +
            '<div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px;">' +
              '<span>PO Number:</span><span>' + grnHeaderInfo.poNumber + '</span>' +
            '</div>' +
            '<div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px;">' +
              '<span>Vendor:</span><span>' + grnHeaderInfo.brandName + '</span>' +
            '</div>' +
            '<div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px;">' +
              '<span>Replenishment:</span><span>' + grnHeaderInfo.replenishmentNumber + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="info-card">' +
            '<h3 style="margin: 0 0 8px 0; color: #2563eb; font-size: 14px; font-weight: bold;">Receipt Information</h3>' +
            '<div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px;">' +
              '<span>Inward Date:</span><span>' + grnHeaderInfo.inwardDate + '</span>' +
            '</div>' +
            '<div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px;">' +
              '<span>Warehouse:</span><span>' + grnHeaderInfo.warehouseNo + '</span>' +
            '</div>' +
            '<div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px;">' +
              '<span>Receipt Accuracy:</span><span>' + summaryStats.receiptAccuracy + '%</span>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="stats-grid">' +
          '<div class="stat-card">' +
            '<div style="font-size: 18px; font-weight: bold; color: #2563eb; margin-bottom: 3px;">' + summaryStats.totalOrderedUnits + '</div>' +
            '<div style="font-size: 10px; color: #666; font-weight: 500;">Ordered Units</div>' +
          '</div>' +
          '<div class="stat-card">' +
            '<div style="font-size: 18px; font-weight: bold; color: #2563eb; margin-bottom: 3px;">' + summaryStats.totalReceivedUnits + '</div>' +
            '<div style="font-size: 10px; color: #666; font-weight: 500;">Received Units</div>' +
          '</div>' +
          qcSummaryCards +
          '<div class="stat-card">' +
            '<div style="font-size: 18px; font-weight: bold; color: #2563eb; margin-bottom: 3px;">' + summaryStats.totalShortageUnits + '</div>' +
            '<div style="font-size: 10px; color: #666; font-weight: 500;">Shortage</div>' +
          '</div>' +
          '<div class="stat-card">' +
            '<div style="font-size: 18px; font-weight: bold; color: #2563eb; margin-bottom: 3px;">' + summaryStats.totalExcessUnits + '</div>' +
            '<div style="font-size: 10px; color: #666; font-weight: 500;">Excess</div>' +
          '</div>' +
          '<div class="stat-card">' +
            '<div style="font-size: 18px; font-weight: bold; color: #2563eb; margin-bottom: 3px;">' + summaryStats.totalNotOrderedUnits + '</div>' +
            '<div style="font-size: 10px; color: #666; font-weight: 500;">Not Ordered</div>' +
          '</div>' +
          qcPassRateCard +
        '</div>' +

        '<div style="margin-top: 15px; overflow-x: auto;">' +
          '<table>' +
            '<thead>' +
              '<tr>' +
                '<th>S.No</th>' +
                '<th>Brand SKU</th>' +
                '<th>KNOT SKU</th>' +
                '<th>Size</th>' +
                '<th>Color</th>' +
                '<th>Ordered</th>' +
                '<th>Received</th>' +
                (grnHeaderInfo.qcPerformed ? '<th>Passed QC</th><th>Failed QC</th>' : '') +
                '<th>Shortage</th>' +
                '<th>Excess</th>' +
                (grnHeaderInfo.qcPerformed ? '<th>QC Status</th>' : '') +
                '<th>Status</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody>' +
              tableRows +
            '</tbody>' +
          '</table>' +
        '</div>' +

        '<div class="footer">' +
          '<strong>KNOT Inventory Management System</strong><br>' +
          'This is a computer-generated document. For queries, contact the warehouse team.' +
        '</div>' +
      '</body>' +
      '</html>';

    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = function() {
      printWindow.print();
      printWindow.close();
    };
    
  } catch (error) {
    console.error("Error downloading PDF:", error);
    alert("Error downloading PDF. Please try again.");
  }
}

// Export the class and utility functions
export { GRNExporter, downloadHTML, downloadCSV, downloadPDF }; 
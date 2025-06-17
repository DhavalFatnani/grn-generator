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
    const quantities = {
      totalOrdered: this.sumColumn("Ordered Qty"),
      totalReceived: this.sumColumn("Received Qty"),
      totalPassedQC: this.sumColumn("Passed QC Qty"),
      totalFailedQC: this.sumColumn("Failed QC Qty"),
      totalShortage: this.sumColumn("Shortage Qty"),
      totalExcess: this.sumColumn("Excess Qty"),
      totalNotOrderedUnits: this.sumColumnByStatus("Received Qty", "Not Ordered")
    };

    const items = {
      total: this.grnData.length,
      complete: this.countByStatus("Complete"),
      shortage: this.countByStatus("Shortage"),
      excess: this.countByStatus("Excess"),
      notOrdered: this.countByStatus("Not Ordered"),
      notReceived: this.countByStatus("Not Received"),
      qcFailedReceipt: this.countByStatus("QC Failed Receipt"),
      qcFailed: this.countByQCStatus("Failed"),
      qcPartial: this.countByQCStatus("Partial")
    };

    const percentages = {
      complete: this.calculatePercentage(items.complete, items.total),
      qcPassRate: this.calculatePercentage(quantities.totalPassedQC, quantities.totalReceived),
      receiptAccuracy: this.calculatePercentage(quantities.totalReceived, quantities.totalOrdered)
    };

    return { quantities, items, percentages };
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
    return denominator > 0 ? ((numerator / denominator) * 100).toFixed(1) : "0.0";
  }

  // Generate CSV content
  generateCSV() {
    const summaryStats = this.calculateSummaryStats();
    const csvLines = this.buildCSVLines(summaryStats);
    return this.convertToCSVString(csvLines);
  }

  buildCSVLines(summaryStats) {
    const lines = [
      ["GOODS RECEIVED NOTE"],
      ["Document Number", this.documentNumber],
      ["Generated Date", this.today.toLocaleDateString("en-GB")],
      ["Generated Time", this.today.toLocaleTimeString()],
      [""],
      ["ORDER OVERVIEW"],
      ["Total Items Ordered", summaryStats.items.total],
      ["Total Ordered Units", summaryStats.quantities.totalOrdered],
      [""],
      ["RECEIPT STATUS"],
      ["Total Received Units", summaryStats.quantities.totalReceived],
      ["Received - QC Pass", summaryStats.quantities.totalPassedQC],
      ["Received - QC Fail", summaryStats.quantities.totalFailedQC],
      ["Received - Not Ordered", summaryStats.quantities.totalNotOrderedUnits],
      ["Receipt Accuracy", summaryStats.percentages.receiptAccuracy + "%"],
      ["Complete Items", summaryStats.items.complete],
      [""],
    ];

    // Add QC section only if QC was performed
    if (this.grnHeaderInfo.qcPerformed) {
      lines.push(
        ["QUALITY CONTROL"],
        ["Total QC Passed Units", summaryStats.quantities.totalPassedQC],
        ["QC Passed - Against PO", this.calculateQCPassedOrdered()],
        ["QC Passed - Not Ordered", this.calculateQCPassedNotOrdered()],
        ["Total QC Failed Units", summaryStats.quantities.totalFailedQC],
        ["QC Pass Rate", summaryStats.percentages.qcPassRate + "%"],
        [""]
      );
    } else {
      lines.push(
        ["QUALITY CONTROL"],
        ["QC Status", "Not Performed"],
        [""]
      );
    }

    lines.push(
      ["ISSUES SUMMARY"],
      ["Total Shortage Units", summaryStats.quantities.totalShortage],
      ["Total Excess Units", summaryStats.quantities.totalExcess],
      ["Not Ordered Units", summaryStats.quantities.totalNotOrderedUnits]
    );

    // Add QC-related issues only if QC was performed
    if (this.grnHeaderInfo.qcPerformed) {
      lines.push(
        ["Items with QC Issues Only", this.calculateOnlyQCFailed(summaryStats)],
        ["Items with Quantity Issues Only", this.calculateOnlyQuantityIssues(summaryStats)],
        ["Items with Both QC and Quantity Issues", this.calculateWithBothIssues(summaryStats)]
      );
    }

    lines.push(
      [""],
      ["PERFORMANCE METRICS"],
      ["Complete Items Percentage", summaryStats.percentages.complete + "%"],
      [""],
      ["DETAILED ITEM DATA"],
      this.getCSVHeaders()
    );

    // Add data rows
    lines.push(...this.grnData.map(row => this.formatCSVRow(row)));
    return lines;
  }

  calculateQCPassedOrdered() {
    return this.grnData
      .filter(item => item.Status !== "Not Ordered" && (item["Passed QC Qty"] || 0) > 0)
      .reduce((sum, item) => sum + (parseInt(item["Passed QC Qty"]) || 0), 0);
  }

  calculateQCPassedNotOrdered() {
    return this.grnData
      .filter(item => item.Status === "Not Ordered" && (item["Passed QC Qty"] || 0) > 0)
      .reduce((sum, item) => sum + (parseInt(item["Passed QC Qty"]) || 0), 0);
  }

  calculateOnlyQCFailed(summaryStats) {
    return summaryStats.items.qcFailed + summaryStats.items.qcPartial - this.calculateWithBothIssues(summaryStats);
  }

  calculateOnlyQuantityIssues(summaryStats) {
    return summaryStats.items.shortage + summaryStats.items.excess + summaryStats.items.notReceived + summaryStats.items.notOrdered - this.calculateWithBothIssues(summaryStats);
  }

  calculateWithBothIssues(summaryStats) {
    return this.grnData.filter(item => 
      item["QC Status"] !== "Passed" && 
      ["Shortage", "Excess", "Not Received", "Not Ordered"].includes(item.Status)
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
      "Shortage Qty", "Excess Qty", "Status", "GRN Date", "Remarks"
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
      row["Status"], row["GRN Date"], row["Remarks"]
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
      <html>
      <head>
        <meta charset="UTF-8">
        <title>GRN - ${this.documentNumber}</title>
        <style>
          ${this.getHTMLStyles()}
        </style>
      </head>
      <body>
        ${this.buildHTMLHeader()}
        ${this.buildHTMLSummary(summaryStats)}
        ${this.buildHTMLTable()}
        ${this.buildHTMLFooter()}
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
        --primary-dark: #1d4ed8;
        --gray-50: #f9fafb;
        --gray-100: #f3f4f6;
        --gray-200: #e5e7eb;
        --gray-300: #d1d5db;
        --gray-400: #9ca3af;
        --gray-500: #6b7280;
        --gray-600: #4b5563;
        --gray-700: #374151;
        --gray-800: #1f2937;
        --gray-900: #111827;
        --danger: #dc2626;
        --success: #16a34a;
        --warning: #ca8a04;
      }

      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        line-height: 1.6;
        color: var(--gray-800);
        background: var(--gray-50);
      }

      .page {
        max-width: 1200px;
        margin: 2rem auto;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        overflow: hidden;
      }

      .header {
        background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
        color: white;
        padding: 2rem;
        text-align: center;
      }

      .header h1 {
        font-size: 2.5rem;
        font-weight: 700;
        margin-bottom: 0.5rem;
      }

      .header .subtitle {
        font-size: 1.1rem;
        opacity: 0.9;
        margin-bottom: 1rem;
      }

      .header-info {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-top: 1.5rem;
      }

      .info-item {
        background: rgba(255, 255, 255, 0.1);
        padding: 1rem;
        border-radius: 8px;
        backdrop-filter: blur(10px);
      }

      .info-label {
        font-size: 0.875rem;
        opacity: 0.8;
        margin-bottom: 0.25rem;
      }

      .info-value {
        font-size: 1.125rem;
        font-weight: 600;
      }

      .content {
        padding: 2rem;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
      }

      .summary-card {
        background: white;
        border: 1px solid var(--gray-200);
        border-radius: 12px;
        padding: 1.5rem;
        text-align: center;
        transition: all 0.3s ease;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      .summary-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .summary-value {
        font-size: 2rem;
        font-weight: 700;
        color: var(--primary);
        margin-bottom: 0.5rem;
        line-height: 1;
      }

      .summary-label {
        font-size: 0.875rem;
        color: var(--gray-600);
        font-weight: 500;
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

      .table-container {
        background: white;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        margin-top: 1.5rem;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.875rem;
      }

      th {
        background: var(--gray-50);
        padding: 1rem 0.75rem;
        text-align: left;
        font-weight: 600;
        color: var(--gray-700);
        border-bottom: 2px solid var(--gray-200);
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      td {
        padding: 0.875rem 0.75rem;
        border-bottom: 1px solid var(--gray-100);
        vertical-align: middle;
      }

      tr:hover td {
        background: var(--gray-50);
      }

      .sku-cell {
        font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace;
        font-size: 0.75rem;
        color: var(--gray-600);
      }

      .qty-cell {
        text-align: center;
        font-weight: 600;
        font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace;
      }

      .shortage {
        color: var(--danger);
      }

      .excess {
        color: var(--warning);
      }

      .qc-failed {
        color: var(--danger);
      }

      .status-badge {
        display: inline-flex;
        align-items: center;
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .status-complete {
        background: #d4edda;
        color: #155724;
      }

      .status-shortage {
        background: #fef2f2;
        color: #721c24;
      }

      .status-excess {
        background: #fefce8;
        color: #856404;
      }

      .status-not-ordered {
        background: #d1ecf1;
        color: #0c5460;
      }

      .status-not-received {
        background: #f8fafc;
        color: #334155;
      }

      .status-qc-failed-receipt {
        background: #fef2f2;
        color: #721c24;
      }

      .footer {
        background: var(--gray-50);
        padding: 2rem;
        text-align: center;
        border-top: 1px solid var(--gray-200);
      }

      .footer-text {
        color: var(--gray-600);
        font-size: 0.875rem;
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
    `;
  }

  buildHTMLHeader() {
    const qcSection = this.grnHeaderInfo.qcPerformed ? `
          <div class="info-item">
            <div class="info-label">QC Done By</div>
            <div class="info-value">${Array.isArray(this.grnHeaderInfo.qcDoneBy) ? this.grnHeaderInfo.qcDoneBy.join(", ") : this.grnHeaderInfo.qcDoneBy}</div>
          </div>
    ` : `
          <div class="info-item">
            <div class="info-label">QC Status</div>
            <div class="info-value">Not Performed</div>
          </div>
    `;

    return `
      <div class="header">
        <h1>Goods Received Note</h1>
        <div class="subtitle">${this.documentNumber}</div>
        <div class="header-info">
          <div class="info-item">
            <div class="info-label">PO Number</div>
            <div class="info-value">${this.grnHeaderInfo.poNumber}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Vendor</div>
            <div class="info-value">${this.grnHeaderInfo.brandName}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Replenishment</div>
            <div class="info-value">${this.grnHeaderInfo.replenishmentNumber}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Inward Date</div>
            <div class="info-value">${this.grnHeaderInfo.inwardDate}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Warehouse</div>
            <div class="info-value">${this.grnHeaderInfo.warehouseNo}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Warehouse Manager</div>
            <div class="info-value">${this.grnHeaderInfo.warehouseManagerName}</div>
          </div>
          ${qcSection}
          <div class="info-item">
            <div class="info-label">Verified By</div>
            <div class="info-value">${this.grnHeaderInfo.verifiedBy}</div>
          </div>
        </div>
      </div>
    `;
  }

  buildHTMLSummary(summaryStats) {
    const qcCards = this.grnHeaderInfo.qcPerformed ? `
          <div class="summary-card">
            <div class="summary-value">${summaryStats.quantities.totalPassedQC}</div>
            <div class="summary-label">QC Passed</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${summaryStats.quantities.totalFailedQC}</div>
            <div class="summary-label">QC Failed</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${summaryStats.percentages.qcPassRate}%</div>
            <div class="summary-label">QC Pass Rate</div>
          </div>
    ` : `
          <div class="summary-card">
            <div class="summary-value">-</div>
            <div class="summary-label">QC Status</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">Not Performed</div>
            <div class="summary-label">QC</div>
          </div>
    `;

    return `
      <div class="content">
        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-value">${summaryStats.items.total}</div>
            <div class="summary-label">Total Items</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${summaryStats.quantities.totalOrdered}</div>
            <div class="summary-label">Ordered Units</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${summaryStats.quantities.totalReceived}</div>
            <div class="summary-label">Received Units</div>
          </div>
          ${qcCards}
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
          <div class="summary-card">
            <div class="summary-value">${summaryStats.percentages.receiptAccuracy}%</div>
            <div class="summary-label">Receipt Accuracy</div>
          </div>
        </div>

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
      </div>
    `;
  }

  buildHTMLTable() {
    const qcHeaders = this.grnHeaderInfo.qcPerformed ? `
              <th>Passed QC</th>
              <th>Failed QC</th>
              <th>QC Status</th>
    ` : '';

    const qcCells = this.grnHeaderInfo.qcPerformed ? `
        <td class="qty-cell">${row["Passed QC Qty"] || "-"}</td>
        <td class="qty-cell qc-failed">${row["Failed QC Qty"] || "-"}</td>
        <td>
          <span class="status-badge status-${row["QC Status"].toLowerCase().replace(/\s+/g, "-")}">
            ${row["QC Status"]}
          </span>
        </td>
    ` : '';

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
              ${qcHeaders}
              <th>Shortage</th>
              <th>Excess</th>
              <th>Status</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${this.grnData.map(row => this.formatHTMLRow(row)).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  formatHTMLRow(row) {
    const qcCells = this.grnHeaderInfo.qcPerformed ? `
        <td class="qty-cell">${row["Passed QC Qty"] || "-"}</td>
        <td class="qty-cell qc-failed">${row["Failed QC Qty"] || "-"}</td>
        <td>
          <span class="status-badge status-${row["QC Status"].toLowerCase().replace(/\s+/g, "-")}">
            ${row["QC Status"]}
          </span>
        </td>
    ` : '';

    return `
      <tr>
        <td>${row["S.No"]}</td>
        <td class="sku-cell">${row["Brand SKU"]}</td>
        <td class="sku-cell">${row["KNOT SKU"]}</td>
        <td>${row["Size"]}</td>
        <td>${row["Color"]}</td>
        <td class="qty-cell">${row["Ordered Qty"]}</td>
        <td class="qty-cell">${row["Received Qty"]}</td>
        ${qcCells}
        <td class="qty-cell shortage">${row["Shortage Qty"] || "-"}</td>
        <td class="qty-cell excess">${row["Excess Qty"] || "-"}</td>
        <td>
          <span class="status-badge status-${row.Status.toLowerCase().replace(/\s+/g, "-")}">
            ${row.Status}
          </span>
        </td>
        <td style="font-size: 12px; max-width: 250px;">${row.Remarks}</td>
      </tr>
    `;
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
      const grnDataForDownload = ${JSON.stringify(this.grnData)};
      const grnHeaderInfoForDownload = ${JSON.stringify(this.grnHeaderInfo)};

      function downloadCsvFromData() {
        try {
          const exporter = new GRNExporter(grnDataForDownload, grnHeaderInfoForDownload);
          const csvContent = exporter.generateCSV();
          const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = exporter.documentNumber + ".csv";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        } catch (error) {
          console.error("Error downloading CSV:", error);
          alert("Error downloading CSV. Please try again.");
        }
      }

      function downloadPdfFromData() {
        try {
          const exporter = new GRNExporter(grnDataForDownload, grnHeaderInfoForDownload);
          const pdfContent = exporter.generatePDF();
          const pdfWindow = window.open("", "_blank");
          pdfWindow.document.write(pdfContent);
          pdfWindow.document.close();
          pdfWindow.onload = function() {
            pdfWindow.print();
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
      
      /* Column widths for better A4 fit */
      table th:nth-child(1), table td:nth-child(1) { width: 4%; } /* S.No */
      table th:nth-child(2), table td:nth-child(2) { width: 12%; } /* Brand SKU */
      table th:nth-child(3), table td:nth-child(3) { width: 12%; } /* KNOT SKU */
      table th:nth-child(4), table td:nth-child(4) { width: 6%; } /* Size */
      table th:nth-child(5), table td:nth-child(5) { width: 8%; } /* Color */
      table th:nth-child(6), table td:nth-child(6) { width: 8%; } /* Ordered */
      table th:nth-child(7), table td:nth-child(7) { width: 8%; } /* Received */
      table th:nth-child(8), table td:nth-child(8) { width: 8%; } /* Passed QC */
      table th:nth-child(9), table td:nth-child(9) { width: 8%; } /* Failed QC */
      table th:nth-child(10), table td:nth-child(10) { width: 8%; } /* Shortage */
      table th:nth-child(11), table td:nth-child(11) { width: 8%; } /* Excess */
      table th:nth-child(12), table td:nth-child(12) { width: 10%; } /* QC Status */
      table th:nth-child(13), table td:nth-child(13) { width: 10%; } /* Status */
      
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
      
      /* Print optimizations */
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
          <div class="info-row"><span>Receipt Accuracy:</span><span>${summaryStats.percentages.receiptAccuracy}%</span></div>
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
        <div class="summary-card">
          <div class="summary-value">${summaryStats.quantities.totalPassedQC}</div>
          <div class="summary-label">QC Passed</div>
        </div>
        <div class="summary-card">
          <div class="summary-value">${summaryStats.quantities.totalFailedQC}</div>
          <div class="summary-label">QC Failed</div>
        </div>
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
        <div class="summary-card">
          <div class="summary-value">${summaryStats.percentages.qcPassRate}%</div>
          <div class="summary-label">QC Pass Rate</div>
        </div>
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
              <th>Passed QC</th>
              <th>Failed QC</th>
              <th>Shortage</th>
              <th>Excess</th>
              <th>QC Status</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${this.grnData.map(row => this.formatPDFRow(row)).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  formatPDFRow(row) {
    return `
      <tr>
        <td>${row["S.No"]}</td>
        <td>${row["Brand SKU"]}</td>
        <td>${row["KNOT SKU"]}</td>
        <td>${row["Size"]}</td>
        <td>${row["Color"]}</td>
        <td>${row["Ordered Qty"]}</td>
        <td>${row["Received Qty"]}</td>
        <td>${row["Passed QC Qty"] || "-"}</td>
        <td>${row["Failed QC Qty"] || "-"}</td>
        <td>${row["Shortage Qty"] || "-"}</td>
        <td>${row["Excess Qty"] || "-"}</td>
        <td><span class="status-badge qc-${row["QC Status"].toLowerCase().replace(/\s+/g, "-")}">${row["QC Status"]}</span></td>
        <td><span class="status-badge status-${row.Status.toLowerCase().replace(/\s+/g, "-")}">${row.Status}</span></td>
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
}

// Utility functions for backward compatibility
function downloadHTML(grnData, grnHeaderInfo) {
  const exporter = new GRNExporter(grnData, grnHeaderInfo);
  return exporter.generateHTML();
}

function downloadCSV(grnData, grnHeaderInfo) {
  const exporter = new GRNExporter(grnData, grnHeaderInfo);
  return exporter.generateCSV();
}

function downloadPDF(grnData, grnHeaderInfo) {
  const exporter = new GRNExporter(grnData, grnHeaderInfo);
  return exporter.generatePDF();
}

// Export the class and utility functions
export { GRNExporter, downloadHTML, downloadCSV, downloadPDF }; 
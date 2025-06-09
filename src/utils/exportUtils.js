export const downloadCSV = (grnData, grnHeaderInfo) => {
  if (grnData.length === 0) return;

  const today = new Date();
  const dateStr = today.toISOString().split("T")[0].replace(/-/g, "");
  const grnDocNo = `GRN-KNOT-${dateStr}-${grnHeaderInfo.brandName.replace(/\s+/g, "")}-${grnHeaderInfo.replenishmentNumber}`;

  // Calculate comprehensive summary statistics
  const summaryStats = {
    items: {
      total: grnData.length,
      complete: grnData.filter(item => item.Status === "Complete").length,
      shortage: grnData.filter(item => item.Status === "Shortage").length,
      excess: grnData.filter(item => item.Status === "Excess").length,
      notOrdered: grnData.filter(item => item.Status === "Not Ordered").length,
      notReceived: grnData.filter(item => item.Status === "Not Received").length,
      qcFailed: grnData.filter(item => item["QC Status"] === "Failed").length,
      qcPartial: grnData.filter(item => item["QC Status"] === "Partial").length,
      withBothIssues: grnData.filter(item => 
        item["QC Status"] !== "Passed" && 
        ["Shortage", "Excess", "Not Received", "Not Ordered"].includes(item.Status)
      ).length
    },
    quantities: {
      totalOrdered: grnData.reduce((sum, item) => sum + (parseInt(item["Ordered Qty"]) || 0), 0),
      totalReceived: grnData.reduce((sum, item) => sum + (parseInt(item["Received Qty"]) || 0), 0),
      totalPassedQC: grnData.reduce((sum, item) => sum + (parseInt(item["Passed QC Qty"]) || 0), 0),
      totalFailedQC: grnData.reduce((sum, item) => sum + (parseInt(item["Failed QC Qty"]) || 0), 0),
      totalShortage: grnData.reduce((sum, item) => sum + (parseInt(item["Shortage Qty"]) || 0), 0),
      totalExcess: grnData.reduce((sum, item) => sum + (parseInt(item["Excess Qty"]) || 0), 0)
    }
  };

  // Calculate derived statistics
  summaryStats.items.onlyQCFailed = summaryStats.items.qcFailed + summaryStats.items.qcPartial - summaryStats.items.withBothIssues;
  summaryStats.items.onlyQuantityIssues = 
    summaryStats.items.shortage + 
    summaryStats.items.excess + 
    summaryStats.items.notReceived + 
    summaryStats.items.notOrdered - 
    summaryStats.items.withBothIssues;
  
  summaryStats.items.withIssues = 
    summaryStats.items.onlyQCFailed + 
    summaryStats.items.onlyQuantityIssues + 
    summaryStats.items.withBothIssues;

  // Calculate percentages
  summaryStats.percentages = {
    complete: ((summaryStats.items.complete / summaryStats.items.total) * 100).toFixed(1),
    qcPassRate: ((summaryStats.quantities.totalPassedQC / summaryStats.quantities.totalReceived) * 100).toFixed(1),
    receiptAccuracy: ((summaryStats.quantities.totalReceived / summaryStats.quantities.totalOrdered) * 100).toFixed(1)
  };

  // Determine GRN status
  let grnStatus = "Complete";
  if (summaryStats.items.shortage > 0 || summaryStats.items.notReceived > 0) {
    grnStatus = "Partial Receipt";
  }
  if (summaryStats.items.excess > 0 || summaryStats.items.notOrdered > 0) {
    grnStatus = grnStatus === "Partial Receipt" ? "Partial Receipt with Discrepancies" : "Complete with Discrepancies";
  }
  if (summaryStats.items.qcFailed > 0 || summaryStats.items.qcPartial > 0) {
    grnStatus += " (QC Issues)";
  }

  // Create comprehensive CSV with header info, summary, and detailed data
  const csvLines = [
    ["GOODS RECEIVED NOTE"],
    ["Document Number", grnDocNo],
    ["Generated Date", today.toLocaleDateString("en-GB")],
    ["Generated Time", today.toLocaleTimeString()],
    [""],
    ["ORDER INFORMATION"],
    ["Purchase Order No", grnHeaderInfo.poNumber],
    ["Vendor Name", grnHeaderInfo.brandName],
    ["Replenishment No", grnHeaderInfo.replenishmentNumber],
    [""],
    ["RECEIPT INFORMATION"],
    ["Inward Date", grnHeaderInfo.inwardDate],
    ["Receiving Warehouse", grnHeaderInfo.warehouseNo],
    ["GRN Status", grnStatus],
    [""],
    ["QUALITY CONTROL"],
    ["QC Done By", Array.isArray(grnHeaderInfo.qcDoneBy) ? grnHeaderInfo.qcDoneBy.join(", ") : grnHeaderInfo.qcDoneBy],
    ["Verified By", grnHeaderInfo.verifiedBy],
    ["Warehouse Manager", grnHeaderInfo.warehouseManagerName],
    [""],
    ["SUMMARY STATISTICS"],
    ["Total Items", summaryStats.items.total],
    ["Complete Items", summaryStats.items.complete],
    ["Items with Issues", summaryStats.items.withIssues],
    ["Items with QC Issues Only", summaryStats.items.onlyQCFailed],
    ["Items with Quantity Issues Only", summaryStats.items.onlyQuantityIssues],
    ["Items with Both QC and Quantity Issues", summaryStats.items.withBothIssues],
    ["QC Failed Items", summaryStats.items.qcFailed],
    ["QC Partial Items", summaryStats.items.qcPartial],
    ["Shortage Items", summaryStats.items.shortage],
    ["Excess Items", summaryStats.items.excess],
    ["Not Ordered Items", summaryStats.items.notOrdered],
    ["Not Received Items", summaryStats.items.notReceived],
    [""],
    ["QUANTITY STATISTICS"],
    ["Total Ordered Units", summaryStats.quantities.totalOrdered],
    ["Total Received Units", summaryStats.quantities.totalReceived],
    ["Total Passed QC Units", summaryStats.quantities.totalPassedQC],
    ["Total Failed QC Units", summaryStats.quantities.totalFailedQC],
    ["Total Shortage Units", summaryStats.quantities.totalShortage],
    ["Total Excess Units", summaryStats.quantities.totalExcess],
    [""],
    ["PERFORMANCE METRICS"],
    ["Receipt Accuracy", `${summaryStats.percentages.receiptAccuracy}%`],
    ["QC Pass Rate", `${summaryStats.percentages.qcPassRate}%`],
    ["Complete Items Percentage", `${summaryStats.percentages.complete}%`],
    [""],
    ["DETAILED ITEM DATA"],
    [
      "S.No",
      "Brand SKU",
      "KNOT SKU",
      "Size",
      "Color",
      "Ordered Qty",
      "Received Qty",
      "Passed QC Qty",
      "Failed QC Qty",
      "Shortage Qty",
      "Excess Qty",
      "Unit Price",
      "QC Status",
      "Status",
      "GRN Date",
      "Remarks"
    ]
  ];

  // Add detailed data rows
  grnData.forEach((row) => {
    csvLines.push([
      row["S.No"],
      row["Brand SKU"],
      row["KNOT SKU"],
      row["Size"],
      row["Color"],
      row["Ordered Qty"],
      row["Received Qty"],
      row["Passed QC Qty"] || "",
      row["Failed QC Qty"] || "",
      row["Shortage Qty"] || "",
      row["Excess Qty"] || "",
      row["Unit Price"],
      row["QC Status"],
      row["Status"],
      row["GRN Date"],
      row["Remarks"]
    ]);
  });

  // Helper function to properly escape CSV values
  const escapeCSV = (value) => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  // Convert to CSV string with proper escaping
  const csvContent = csvLines.map(row => 
    row.map(cell => escapeCSV(cell)).join(',')
  ).join('\n');

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${grnDocNo}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const downloadHTML = (grnData, grnHeaderInfo) => {
  if (grnData.length === 0) return;

  const today = new Date();
  const dateStr = today.toISOString().split("T")[0].replace(/-/g, "");
  const grnDocNo = `GRN-KNOT-${dateStr}-${grnHeaderInfo.brandName.replace(/\s+/g, "")}-${grnHeaderInfo.replenishmentNumber}`;

  // Calculate comprehensive summary statistics
  const summaryStats = {
    items: {
      total: grnData.length,
      complete: grnData.filter(item => item.Status === "Complete").length,
      shortage: grnData.filter(item => item.Status === "Shortage").length,
      excess: grnData.filter(item => item.Status === "Excess").length,
      notOrdered: grnData.filter(item => item.Status === "Not Ordered").length,
      notReceived: grnData.filter(item => item.Status === "Not Received").length,
      qcFailed: grnData.filter(item => item["QC Status"] === "Failed").length,
      qcPartial: grnData.filter(item => item["QC Status"] === "Partial").length,
      withBothIssues: grnData.filter(item => 
        item["QC Status"] !== "Passed" && 
        ["Shortage", "Excess", "Not Received", "Not Ordered"].includes(item.Status)
      ).length
    },
    quantities: {
      totalOrdered: grnData.reduce((sum, item) => sum + (parseInt(item["Ordered Qty"]) || 0), 0),
      totalReceived: grnData.reduce((sum, item) => sum + (parseInt(item["Received Qty"]) || 0), 0),
      totalPassedQC: grnData.reduce((sum, item) => sum + (parseInt(item["Passed QC Qty"]) || 0), 0),
      totalFailedQC: grnData.reduce((sum, item) => sum + (parseInt(item["Failed QC Qty"]) || 0), 0),
      totalShortage: grnData.reduce((sum, item) => sum + (parseInt(item["Shortage Qty"]) || 0), 0),
      totalExcess: grnData.reduce((sum, item) => sum + (parseInt(item["Excess Qty"]) || 0), 0)
    }
  };

  // Calculate derived statistics
  summaryStats.items.onlyQCFailed = summaryStats.items.qcFailed + summaryStats.items.qcPartial - summaryStats.items.withBothIssues;
  summaryStats.items.onlyQuantityIssues = 
    summaryStats.items.shortage + 
    summaryStats.items.excess + 
    summaryStats.items.notReceived + 
    summaryStats.items.notOrdered - 
    summaryStats.items.withBothIssues;
  
  summaryStats.items.withIssues = 
    summaryStats.items.onlyQCFailed + 
    summaryStats.items.onlyQuantityIssues + 
    summaryStats.items.withBothIssues;

  // Calculate percentages
  summaryStats.percentages = {
    complete: ((summaryStats.items.complete / summaryStats.items.total) * 100).toFixed(1),
    qcPassRate: ((summaryStats.quantities.totalPassedQC / summaryStats.quantities.totalReceived) * 100).toFixed(1),
    receiptAccuracy: ((summaryStats.quantities.totalReceived / summaryStats.quantities.totalOrdered) * 100).toFixed(1)
  };

  // Determine GRN status
  let grnStatus = "Complete";
  if (summaryStats.items.shortage > 0 || summaryStats.items.notReceived > 0) {
    grnStatus = "Partial Receipt";
  }
  if (summaryStats.items.excess > 0 || summaryStats.items.notOrdered > 0) {
    grnStatus = grnStatus === "Partial Receipt" ? "Partial Receipt with Discrepancies" : "Complete with Discrepancies";
  }
  if (summaryStats.items.qcFailed > 0 || summaryStats.items.qcPartial > 0) {
    grnStatus += " (QC Issues)";
  }

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Goods Received Note - ${grnDocNo}</title>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      /* Primary Colors */
      --primary: #2563eb;
      --primary-light: #dbeafe;
      --primary-dark: #1e40af;
      
      /* Status Colors */
      --success: #059669;
      --success-light: #d1fae5;
      --warning: #d97706;
      --warning-light: #fef3c7;
      --danger: #dc2626;
      --danger-light: #fee2e2;
      --partial: #7c3aed;
      --partial-light: #ede9fe;
      
      /* Neutral Colors */
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
      
      /* Accent Colors */
      --accent-blue: #0ea5e9;
      --accent-green: #10b981;
      --accent-purple: #8b5cf6;
      --accent-orange: #f97316;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Roboto', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
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
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
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
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.08);
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

    .shortage, .excess, .qc-failed, .qc-partial {
      color: var(--gray-800);
      background: transparent;
      padding: 0;
      border-radius: 0;
    }

    .table-container {
      margin: 2rem 0;
      border: 1px solid var(--gray-200);
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
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

    .signatures {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2rem;
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 2px solid var(--primary-light);
    }

    .signature-box {
      text-align: center;
      padding: 1.5rem;
      border-radius: 8px;
      background: var(--gray-50);
      border: 1px solid var(--gray-200);
    }

    .signature-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--primary-dark);
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--primary-light);
    }

    .signature-line {
      width: 80%;
      height: 2px;
      background: var(--gray-300);
      margin: 2.5rem auto 1rem;
    }

    .signature-name {
      font-size: 14px;
      font-weight: 500;
      color: var(--gray-800);
      padding: 0.5rem 1rem;
      background: white;
      border-radius: 4px;
      display: inline-block;
      border: 1px solid var(--gray-200);
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

    .footer-buttons {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin-bottom: 1rem;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      text-decoration: none;
      transition: all 0.2s ease;
    }

    .btn-primary {
      background: var(--primary);
      color: white;
    }

    .btn-primary:hover {
      background: var(--primary-dark);
    }

    .btn-secondary {
      background: var(--gray-100);
      color: var(--gray-700);
    }

    .btn-secondary:hover {
      background: var(--gray-200);
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

      .btn {
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

      .header-side {
        text-align: center;
      }

      .summary-grid {
        grid-template-columns: 1fr;
      }

      .signatures {
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
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="header-main">
        <h1>Goods Received Note</h1>
        <div class="doc-no">${grnDocNo}</div>
        <div class="doc-date">Generated on ${today.toLocaleDateString("en-GB")} at ${today.toLocaleTimeString()}</div>
      </div>
      <div class="header-side">
        <div class="status-badge status-${grnStatus.toLowerCase().replace(/\s+/g, "-")}">${grnStatus}</div>
      </div>
    </div>

    <div class="main-grid">
      <div class="info-sections">
        <div class="info-section">
          <h3>Order Information</h3>
          <div class="info-row">
            <span class="info-label">Purchase Order No:</span>
            <span class="info-value">${grnHeaderInfo.poNumber}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Vendor Name:</span>
            <span class="info-value">${grnHeaderInfo.brandName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Replenishment No:</span>
            <span class="info-value">${grnHeaderInfo.replenishmentNumber}</span>
          </div>
        </div>

        <div class="info-section">
          <h3>Receipt Information</h3>
          <div class="info-row">
            <span class="info-label">Inward Date:</span>
            <span class="info-value">${grnHeaderInfo.inwardDate}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Receiving Warehouse:</span>
            <span class="info-value">${grnHeaderInfo.warehouseNo}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Receipt Accuracy:</span>
            <span class="info-value">${summaryStats.percentages.receiptAccuracy}%</span>
          </div>
        </div>

        <div class="info-section">
          <h3>Quality Control</h3>
          <div class="info-row">
            <span class="info-label">QC Done By:</span>
            <span class="info-value">${grnHeaderInfo.qcDoneBy}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Verified By:</span>
            <span class="info-value">${grnHeaderInfo.verifiedBy}</span>
          </div>
          <div class="info-row">
            <span class="info-label">QC Pass Rate:</span>
            <span class="info-value">${summaryStats.percentages.qcPassRate}%</span>
          </div>
        </div>
      </div>

      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-value">${summaryStats.items.total}</div>
          <div class="summary-label">Total Items</div>
          <div class="summary-subtext">
            <strong>${summaryStats.percentages.complete}%</strong> Complete<br>
            <strong>${summaryStats.items.withIssues}</strong> With Issues
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-value">${summaryStats.quantities.totalOrdered}</div>
          <div class="summary-label">Total Ordered Units</div>
          <div class="summary-subtext">
            <strong>${summaryStats.quantities.totalReceived}</strong> Received<br>
            <strong>${summaryStats.percentages.receiptAccuracy}%</strong> Accuracy
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-value">${summaryStats.items.qcFailed + summaryStats.items.qcPartial}</div>
          <div class="summary-label">QC Failed Items</div>
          <div class="summary-subtext">
            <strong>${summaryStats.items.qcFailed}</strong> Failed<br>
            <strong>${summaryStats.items.qcPartial}</strong> Partial<br>
            <strong>${summaryStats.percentages.qcPassRate}%</strong> Pass Rate
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-value">${summaryStats.items.onlyQCFailed + summaryStats.items.onlyQuantityIssues + summaryStats.items.withBothIssues}</div>
          <div class="summary-label">Items with Issues</div>
          <div class="summary-subtext">
            <strong>${summaryStats.items.onlyQCFailed}</strong> QC Only<br>
            <strong>${summaryStats.items.onlyQuantityIssues}</strong> Quantity Only<br>
            <strong>${summaryStats.items.withBothIssues}</strong> Both Issues
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-value">${summaryStats.quantities.totalShortage}</div>
          <div class="summary-label">Total Shortage Units</div>
          <div class="summary-subtext">
            Across <strong>${summaryStats.items.shortage}</strong> Items<br>
            Avg. <strong>${Math.round(summaryStats.quantities.totalShortage / (summaryStats.items.shortage || 1))}</strong> Units/Item
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-value">${summaryStats.quantities.totalExcess}</div>
          <div class="summary-label">Total Excess Units</div>
          <div class="summary-subtext">
            Across <strong>${summaryStats.items.excess}</strong> Items<br>
            Avg. <strong>${Math.round(summaryStats.quantities.totalExcess / (summaryStats.items.excess || 1))}</strong> Units/Item
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-value">${summaryStats.items.notReceived}</div>
          <div class="summary-label">Not Received Items</div>
          <div class="summary-subtext">
            <strong>${summaryStats.items.notReceived}</strong> Items<br>
            <strong>${grnData.filter(item => item.Status === "Not Received").reduce((sum, item) => sum + (parseInt(item["Ordered Qty"]) || 0), 0)}</strong> Units
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-value">${summaryStats.items.notOrdered}</div>
          <div class="summary-label">Not Ordered Items</div>
          <div class="summary-subtext">
            <strong>${summaryStats.items.notOrdered}</strong> Items<br>
            <strong>${grnData.filter(item => item.Status === "Not Ordered").reduce((sum, item) => sum + (parseInt(item["Received Qty"]) || 0), 0)}</strong> Units
          </div>
        </div>
      </div>
    </div>

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
            <th>Unit Price</th>
            <th>QC Status</th>
            <th>Status</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${grnData.map(row => `
            <tr>
              <td>${row["S.No"]}</td>
              <td class="sku-cell">${row["Brand SKU"]}</td>
              <td class="sku-cell">${row["KNOT SKU"]}</td>
              <td>${row["Size"]}</td>
              <td>${row["Color"]}</td>
              <td class="qty-cell">${row["Ordered Qty"]}</td>
              <td class="qty-cell">${row["Received Qty"]}</td>
              <td class="qty-cell">${row["Passed QC Qty"] || "-"}</td>
              <td class="qty-cell qc-failed">${row["Failed QC Qty"] || "-"}</td>
              <td class="qty-cell shortage">${row["Shortage Qty"] || "-"}</td>
              <td class="qty-cell excess">${row["Excess Qty"] || "-"}</td>
              <td class="qty-cell">${row["Unit Price"]}</td>
              <td>
                <span class="status-badge status-${row["QC Status"].toLowerCase().replace(/\s+/g, "-")}">
                  ${row["QC Status"]}
                </span>
              </td>
              <td>
                <span class="status-badge status-${row.Status.toLowerCase().replace(/\s+/g, "-")}">
                  ${row.Status}
                </span>
              </td>
              <td style="font-size: 12px; max-width: 250px;">${row.Remarks}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>

    <div class="signatures">
      <div class="signature-box">
        <div class="signature-title">Quality Controller</div>
        <div class="signature-line"></div>
        <div class="signature-name">${grnHeaderInfo.qcDoneBy}</div>
      </div>
      <div class="signature-box">
        <div class="signature-title">Supervisor</div>
        <div class="signature-line"></div>
        <div class="signature-name">${grnHeaderInfo.verifiedBy}</div>
      </div>
      <div class="signature-box">
        <div class="signature-title">Warehouse Manager</div>
        <div class="signature-line"></div>
        <div class="signature-name">${grnHeaderInfo.warehouseManagerName}</div>
      </div>
    </div>

    <div class="footer">
      <div class="footer-buttons">
        <button onclick="window.print()" class="btn btn-primary">Print Document</button>
        <button type="button" class="btn btn-secondary" onclick="downloadCsvFromData()">Download CSV</button>
      </div>
      <p class="footer-text">
        <strong>KNOT Inventory Management System</strong><br>
        This is a computer-generated document. For queries, contact the warehouse team.
      </p>
    </div>
  </div>

  <script>
    // Store the data in a global variable
    const grnDataForDownload = ${JSON.stringify(grnData).replace(/`/g, '\\`')};
    const grnHeaderInfoForDownload = ${JSON.stringify(grnHeaderInfo).replace(/`/g, '\\`')};
    const grnDocNoForDownload = "${grnDocNo.replace(/`/g, '\\`')}";

    function downloadCsvFromData() {
      try {
        const today = new Date();
        const dateStr = today.toISOString().split("T")[0].replace(/-/g, "");
        const grnDocNo = "GRN-KNOT-" + dateStr + "-" + grnHeaderInfoForDownload.brandName.replace(/\\s+/g, "") + "-" + grnHeaderInfoForDownload.replenishmentNumber;

        // Calculate summary statistics
        const summaryStats = {
          items: {
            total: grnDataForDownload.length,
            complete: grnDataForDownload.filter(item => item.Status === "Complete").length,
            shortage: grnDataForDownload.filter(item => item.Status === "Shortage").length,
            excess: grnDataForDownload.filter(item => item.Status === "Excess").length,
            notOrdered: grnDataForDownload.filter(item => item.Status === "Not Ordered").length,
            notReceived: grnDataForDownload.filter(item => item.Status === "Not Received").length,
            qcFailed: grnDataForDownload.filter(item => item["QC Status"] === "Failed").length,
            qcPartial: grnDataForDownload.filter(item => item["QC Status"] === "Partial").length,
            withBothIssues: grnDataForDownload.filter(item => 
              item["QC Status"] !== "Passed" && 
              ["Shortage", "Excess", "Not Received", "Not Ordered"].includes(item.Status)
            ).length
          },
          quantities: {
            totalOrdered: grnDataForDownload.reduce((sum, item) => sum + (parseInt(item["Ordered Qty"]) || 0), 0),
            totalReceived: grnDataForDownload.reduce((sum, item) => sum + (parseInt(item["Received Qty"]) || 0), 0),
            totalPassedQC: grnDataForDownload.reduce((sum, item) => sum + (parseInt(item["Passed QC Qty"]) || 0), 0),
            totalFailedQC: grnDataForDownload.reduce((sum, item) => sum + (parseInt(item["Failed QC Qty"]) || 0), 0),
            totalShortage: grnDataForDownload.reduce((sum, item) => sum + (parseInt(item["Shortage Qty"]) || 0), 0),
            totalExcess: grnDataForDownload.reduce((sum, item) => sum + (parseInt(item["Excess Qty"]) || 0), 0)
          }
        };

        // Calculate derived statistics
        summaryStats.items.onlyQCFailed = summaryStats.items.qcFailed + summaryStats.items.qcPartial - summaryStats.items.withBothIssues;
        summaryStats.items.onlyQuantityIssues = 
          summaryStats.items.shortage + 
          summaryStats.items.excess + 
          summaryStats.items.notReceived + 
          summaryStats.items.notOrdered - 
          summaryStats.items.withBothIssues;
        
        summaryStats.items.withIssues = 
          summaryStats.items.onlyQCFailed + 
          summaryStats.items.onlyQuantityIssues + 
          summaryStats.items.withBothIssues;

        // Calculate percentages
        summaryStats.percentages = {
          complete: ((summaryStats.items.complete / summaryStats.items.total) * 100).toFixed(1),
          qcPassRate: ((summaryStats.quantities.totalPassedQC / summaryStats.quantities.totalReceived) * 100).toFixed(1),
          receiptAccuracy: ((summaryStats.quantities.totalReceived / summaryStats.quantities.totalOrdered) * 100).toFixed(1)
        };

        // Determine GRN status
        let grnStatus = "Complete";
        if (summaryStats.items.shortage > 0 || summaryStats.items.notReceived > 0) {
          grnStatus = "Partial Receipt";
        }
        if (summaryStats.items.excess > 0 || summaryStats.items.notOrdered > 0) {
          grnStatus = grnStatus === "Partial Receipt" ? "Partial Receipt with Discrepancies" : "Complete with Discrepancies";
        }
        if (summaryStats.items.qcFailed > 0 || summaryStats.items.qcPartial > 0) {
          grnStatus += " (QC Issues)";
        }

        // Create CSV content
        const csvLines = [
          ["GOODS RECEIVED NOTE"],
          ["Document Number", grnDocNo],
          ["Generated Date", today.toLocaleDateString("en-GB")],
          ["Generated Time", today.toLocaleTimeString()],
          [""],
          ["ORDER INFORMATION"],
          ["Purchase Order No", grnHeaderInfoForDownload.poNumber],
          ["Vendor Name", grnHeaderInfoForDownload.brandName],
          ["Replenishment No", grnHeaderInfoForDownload.replenishmentNumber],
          [""],
          ["RECEIPT INFORMATION"],
          ["Inward Date", grnHeaderInfoForDownload.inwardDate],
          ["Receiving Warehouse", grnHeaderInfoForDownload.warehouseNo],
          ["GRN Status", grnStatus],
          [""],
          ["QUALITY CONTROL"],
          ["QC Done By", Array.isArray(grnHeaderInfoForDownload.qcDoneBy) ? grnHeaderInfoForDownload.qcDoneBy.join(", ") : grnHeaderInfoForDownload.qcDoneBy],
          ["Verified By", grnHeaderInfoForDownload.verifiedBy],
          ["Warehouse Manager", grnHeaderInfoForDownload.warehouseManagerName],
          [""],
          ["SUMMARY STATISTICS"],
          ["Total Items", summaryStats.items.total],
          ["Complete Items", summaryStats.items.complete],
          ["Items with Issues", summaryStats.items.withIssues],
          ["Items with QC Issues Only", summaryStats.items.onlyQCFailed],
          ["Items with Quantity Issues Only", summaryStats.items.onlyQuantityIssues],
          ["Items with Both QC and Quantity Issues", summaryStats.items.withBothIssues],
          ["QC Failed Items", summaryStats.items.qcFailed],
          ["QC Partial Items", summaryStats.items.qcPartial],
          ["Shortage Items", summaryStats.items.shortage],
          ["Excess Items", summaryStats.items.excess],
          ["Not Ordered Items", summaryStats.items.notOrdered],
          ["Not Received Items", summaryStats.items.notReceived],
          [""],
          ["QUANTITY STATISTICS"],
          ["Total Ordered Units", summaryStats.quantities.totalOrdered],
          ["Total Received Units", summaryStats.quantities.totalReceived],
          ["Total Passed QC Units", summaryStats.quantities.totalPassedQC],
          ["Total Failed QC Units", summaryStats.quantities.totalFailedQC],
          ["Total Shortage Units", summaryStats.quantities.totalShortage],
          ["Total Excess Units", summaryStats.quantities.totalExcess],
          [""],
          ["PERFORMANCE METRICS"],
          ["Receipt Accuracy", summaryStats.percentages.receiptAccuracy + "%"],
          ["QC Pass Rate", summaryStats.percentages.qcPassRate + "%"],
          ["Complete Items Percentage", summaryStats.percentages.complete + "%"],
          [""],
          ["DETAILED ITEM DATA"],
          [
            "S.No",
            "Brand SKU",
            "KNOT SKU",
            "Size",
            "Color",
            "Ordered Qty",
            "Received Qty",
            "Passed QC Qty",
            "Failed QC Qty",
            "Shortage Qty",
            "Excess Qty",
            "Unit Price",
            "QC Status",
            "Status",
            "GRN Date",
            "Remarks"
          ]
        ];

        // Add detailed data rows
        grnDataForDownload.forEach((row) => {
          csvLines.push([
            row["S.No"],
            row["Brand SKU"],
            row["KNOT SKU"],
            row["Size"],
            row["Color"],
            row["Ordered Qty"],
            row["Received Qty"],
            row["Passed QC Qty"] || "",
            row["Failed QC Qty"] || "",
            row["Shortage Qty"] || "",
            row["Excess Qty"] || "",
            row["Unit Price"],
            row["QC Status"],
            row["Status"],
            row["GRN Date"],
            row["Remarks"]
          ]);
        });

        // Helper function to properly escape CSV values
        const escapeCSV = (value) => {
          if (value === null || value === undefined) return "";
          const stringValue = String(value);
          if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\\n")) {
            return '"' + stringValue.replace(/"/g, '""') + '"';
          }
          return stringValue;
        };

        // Convert to CSV string with proper escaping
        const csvContent = csvLines.map(row => 
          row.map(cell => escapeCSV(cell)).join(",")
        ).join("\\n");

        // Create and trigger download
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = grnDocNo + ".csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Error downloading CSV:", error);
        alert("Error downloading CSV. Please try again.");
      }
    }
  </script>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${grnDocNo}.html`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}; 
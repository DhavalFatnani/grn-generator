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
      qcFailedReceipt: grnData.filter(item => item.Status === "QC Failed Receipt").length,
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
      totalExcess: grnData.reduce((sum, item) => sum + (parseInt(item["Excess Qty"]) || 0), 0),
      totalNotOrderedUnits: grnData.filter(item => item.Status === "Not Ordered").reduce((sum, item) => sum + (parseInt(item["Received Qty"]) || 0), 0)
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

  // Calculate QC pass breakdown
  summaryStats.quantities.qcPassedOrdered = grnData.filter(item => 
    item.Status !== "Not Ordered" && (item["Passed QC Qty"] || 0) > 0
  ).reduce((sum, item) => sum + (parseInt(item["Passed QC Qty"]) || 0), 0);
  
  summaryStats.quantities.qcPassedNotOrdered = grnData.filter(item => 
    item.Status === "Not Ordered" && (item["Passed QC Qty"] || 0) > 0
  ).reduce((sum, item) => sum + (parseInt(item["Passed QC Qty"]) || 0), 0);

  // Calculate percentages
  summaryStats.percentages = {
    complete: ((summaryStats.items.complete / summaryStats.items.total) * 100).toFixed(1),
    qcPassRate: ((summaryStats.quantities.totalPassedQC / summaryStats.quantities.totalReceived) * 100).toFixed(1),
    receiptAccuracy: ((summaryStats.quantities.totalReceived / summaryStats.quantities.totalOrdered) * 100).toFixed(1)
  };

  // Determine GRN status based on the most severe status present
  let grnStatus = "Complete";
  if (grnData.some(item => item.Status === "Not Ordered")) {
    grnStatus = "Receipt with Unordered Items";
  } else if (grnData.some(item => item.Status === "Not Received")) {
    grnStatus = "Not Received";
  } else if (grnData.some(item => item.Status === "QC Failed Receipt")) {
    grnStatus = "QC Failed Receipt";
  } else if (grnData.some(item => item.Status === "Shortage" || item.Status === "Excess")) {
    grnStatus = "Partial Receipt with Discrepancies";
  } else if (grnData.some(item => item["QC Status"] === "Failed" || item["QC Status"] === "Partial")) {
    grnStatus = "Complete (QC Issues)";
  } else {
    grnStatus = "Complete";
  }

  // Create CSV content with storytelling flow
  const csvLines = [
    ["GOODS RECEIVED NOTE"],
    ["Document Number", grnDocNo],
    ["Generated Date", today.toLocaleDateString("en-GB")],
    ["Generated Time", today.toLocaleTimeString()],
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
    ["QUALITY CONTROL"],
    ["Total QC Passed Units", summaryStats.quantities.totalPassedQC],
    ["QC Passed - Against PO", summaryStats.quantities.qcPassedOrdered],
    ["QC Passed - Not Ordered", summaryStats.quantities.qcPassedNotOrdered],
    ["Total QC Failed Units", summaryStats.quantities.totalFailedQC],
    ["QC Pass Rate", summaryStats.percentages.qcPassRate + "%"],
    [""],
    ["ISSUES SUMMARY"],
    ["Total Shortage Units", summaryStats.quantities.totalShortage],
    ["Total Excess Units", summaryStats.quantities.totalExcess],
    ["Not Ordered Units", summaryStats.quantities.totalNotOrderedUnits],
    ["Items with QC Issues Only", summaryStats.items.onlyQCFailed],
    ["Items with Quantity Issues Only", summaryStats.items.onlyQuantityIssues],
    ["Items with Both QC and Quantity Issues", summaryStats.items.withBothIssues],
    [""],
    ["PERFORMANCE METRICS"],
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
      qcFailedReceipt: grnData.filter(item => item.Status === "QC Failed Receipt").length,
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
      totalExcess: grnData.reduce((sum, item) => sum + (parseInt(item["Excess Qty"]) || 0), 0),
      totalNotOrderedUnits: grnData.filter(item => item.Status === "Not Ordered").reduce((sum, item) => sum + (parseInt(item["Received Qty"]) || 0), 0)
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

  // Calculate QC pass breakdown
  summaryStats.quantities.qcPassedOrdered = grnData.filter(item => 
    item.Status !== "Not Ordered" && (item["Passed QC Qty"] || 0) > 0
  ).reduce((sum, item) => sum + (parseInt(item["Passed QC Qty"]) || 0), 0);
  
  summaryStats.quantities.qcPassedNotOrdered = grnData.filter(item => 
    item.Status === "Not Ordered" && (item["Passed QC Qty"] || 0) > 0
  ).reduce((sum, item) => sum + (parseInt(item["Passed QC Qty"]) || 0), 0);

  // Calculate percentages
  summaryStats.percentages = {
    complete: ((summaryStats.items.complete / summaryStats.items.total) * 100).toFixed(1),
    qcPassRate: ((summaryStats.quantities.totalPassedQC / summaryStats.quantities.totalReceived) * 100).toFixed(1),
    receiptAccuracy: ((summaryStats.quantities.totalReceived / summaryStats.quantities.totalOrdered) * 100).toFixed(1)
  };

  // Determine GRN status based on the most severe status present
  let grnStatus = "Complete";
  if (grnData.some(item => item.Status === "Not Ordered")) {
    grnStatus = "Receipt with Unordered Items";
  } else if (grnData.some(item => item.Status === "Not Received")) {
    grnStatus = "Not Received";
  } else if (grnData.some(item => item.Status === "QC Failed Receipt")) {
    grnStatus = "QC Failed Receipt";
  } else if (grnData.some(item => item.Status === "Shortage" || item.Status === "Excess")) {
    grnStatus = "Partial Receipt with Discrepancies";
  } else if (grnData.some(item => item["QC Status"] === "Failed" || item["QC Status"] === "Partial")) {
    grnStatus = "Complete (QC Issues)";
  } else {
    grnStatus = "Complete";
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
          <div class="summary-value">${summaryStats.quantities.totalReceived}</div>
          <div class="summary-label">Received Units</div>
          <div class="summary-subtext">
            <strong>${summaryStats.quantities.totalPassedQC}</strong> QC Pass<br>
            <strong>${summaryStats.quantities.totalFailedQC}</strong> QC Fail<br>
            <strong>${summaryStats.quantities.totalNotOrderedUnits}</strong> Not Ordered
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-value">${summaryStats.quantities.totalPassedQC}</div>
          <div class="summary-label">QC Passed Units</div>
          <div class="summary-subtext">
            <strong>${summaryStats.quantities.qcPassedOrdered}</strong> Against PO<br>
            <strong>${summaryStats.quantities.qcPassedNotOrdered}</strong> Not Ordered
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-value">${summaryStats.quantities.totalFailedQC}</div>
          <div class="summary-label">QC Failed Units</div>
          <div class="summary-subtext">
            <strong>${summaryStats.quantities.totalFailedQC}</strong> Units<br>
            <strong>${summaryStats.percentages.qcPassRate}%</strong> Pass Rate
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
          <div class="summary-value">${summaryStats.quantities.totalNotOrderedUnits}</div>
          <div class="summary-label">Not Ordered Units</div>
          <div class="summary-subtext">
            <strong>${summaryStats.quantities.totalNotOrderedUnits}</strong> Units<br>
            Across <strong>${summaryStats.items.notOrdered}</strong> Items
          </div>
        </div>
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

    <div class="footer">
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
            qcFailedReceipt: grnDataForDownload.filter(item => item.Status === "QC Failed Receipt").length,
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
            totalExcess: grnDataForDownload.reduce((sum, item) => sum + (parseInt(item["Excess Qty"]) || 0), 0),
            totalNotOrderedUnits: grnDataForDownload.filter(item => item.Status === "Not Ordered").reduce((sum, item) => sum + (parseInt(item["Received Qty"]) || 0), 0)
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

        // Calculate QC pass breakdown
        summaryStats.quantities.qcPassedOrdered = grnDataForDownload.filter(item => 
          item.Status !== "Not Ordered" && (item["Passed QC Qty"] || 0) > 0
        ).reduce((sum, item) => sum + (parseInt(item["Passed QC Qty"]) || 0), 0);
        
        summaryStats.quantities.qcPassedNotOrdered = grnDataForDownload.filter(item => 
          item.Status === "Not Ordered" && (item["Passed QC Qty"] || 0) > 0
        ).reduce((sum, item) => sum + (parseInt(item["Passed QC Qty"]) || 0), 0);

        // Calculate percentages
        summaryStats.percentages = {
          complete: ((summaryStats.items.complete / summaryStats.items.total) * 100).toFixed(1),
          qcPassRate: ((summaryStats.quantities.totalPassedQC / summaryStats.quantities.totalReceived) * 100).toFixed(1),
          receiptAccuracy: ((summaryStats.quantities.totalReceived / summaryStats.quantities.totalOrdered) * 100).toFixed(1)
        };

        // Determine GRN status
        let grnStatus = "Complete";
        if (grnDataForDownload.some(item => item.Status === "Not Ordered")) {
          grnStatus = "Receipt with Unordered Items";
        } else if (grnDataForDownload.some(item => item.Status === "Not Received")) {
          grnStatus = "Not Received";
        } else if (grnDataForDownload.some(item => item.Status === "QC Failed Receipt")) {
          grnStatus = "QC Failed Receipt";
        } else if (grnDataForDownload.some(item => item.Status === "Shortage" || item.Status === "Excess")) {
          grnStatus = "Partial Receipt with Discrepancies";
        } else if (grnDataForDownload.some(item => item["QC Status"] === "Failed" || item["QC Status"] === "Partial")) {
          grnStatus = "Complete (QC Issues)";
        } else {
          grnStatus = "Complete";
        }

        // Create CSV content
        const csvLines = [
          ["GOODS RECEIVED NOTE"],
          ["Document Number", grnDocNo],
          ["Generated Date", today.toLocaleDateString("en-GB")],
          ["Generated Time", today.toLocaleTimeString()],
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
          ["QUALITY CONTROL"],
          ["Total QC Passed Units", summaryStats.quantities.totalPassedQC],
          ["QC Passed - Against PO", summaryStats.quantities.qcPassedOrdered],
          ["QC Passed - Not Ordered", summaryStats.quantities.qcPassedNotOrdered],
          ["Total QC Failed Units", summaryStats.quantities.totalFailedQC],
          ["QC Pass Rate", summaryStats.percentages.qcPassRate + "%"],
          [""],
          ["ISSUES SUMMARY"],
          ["Total Shortage Units", summaryStats.quantities.totalShortage],
          ["Total Excess Units", summaryStats.quantities.totalExcess],
          ["Not Ordered Units", summaryStats.quantities.totalNotOrderedUnits],
          ["Items with QC Issues Only", summaryStats.items.onlyQCFailed],
          ["Items with Quantity Issues Only", summaryStats.items.onlyQuantityIssues],
          ["Items with Both QC and Quantity Issues", summaryStats.items.withBothIssues],
          [""],
          ["PERFORMANCE METRICS"],
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

    function downloadPdfFromData() {
      try {
        const today = new Date();
        const dateStr = today.toISOString().split("T")[0].replace(/-/g, "");
        const grnDocNo = "GRN-KNOT-" + dateStr + "-" + grnHeaderInfoForDownload.brandName.replace(/\\s+/g, "") + "-" + grnHeaderInfoForDownload.replenishmentNumber;

        // Calculate summary statistics for PDF
        const summaryStats = {
          quantities: {
            totalOrdered: grnDataForDownload.reduce((sum, item) => sum + (parseInt(item["Ordered Qty"]) || 0), 0),
            totalReceived: grnDataForDownload.reduce((sum, item) => sum + (parseInt(item["Received Qty"]) || 0), 0),
            totalPassedQC: grnDataForDownload.reduce((sum, item) => sum + (parseInt(item["Passed QC Qty"]) || 0), 0),
            totalFailedQC: grnDataForDownload.reduce((sum, item) => sum + (parseInt(item["Failed QC Qty"]) || 0), 0),
            totalShortage: grnDataForDownload.reduce((sum, item) => sum + (parseInt(item["Shortage Qty"]) || 0), 0),
            totalExcess: grnDataForDownload.reduce((sum, item) => sum + (parseInt(item["Excess Qty"]) || 0), 0),
            totalNotOrderedUnits: grnDataForDownload.filter(item => item.Status === "Not Ordered").reduce((sum, item) => sum + (parseInt(item["Received Qty"]) || 0), 0)
          }
        };

        // Calculate percentages
        const qcPassRate = ((summaryStats.quantities.totalPassedQC / summaryStats.quantities.totalReceived) * 100).toFixed(1);
        const receiptAccuracy = ((summaryStats.quantities.totalReceived / summaryStats.quantities.totalOrdered) * 100).toFixed(1);

        // Create simplified PDF content
        const pdfContent = \`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>GRN - \${grnDocNo}</title>
            <style>
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
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Goods Received Note</h1>
              <div class="doc-no">\${grnDocNo}</div>
              <div class="date">Generated on \${today.toLocaleDateString("en-GB")} at \${today.toLocaleTimeString()}</div>
            </div>

            <div class="info-grid">
              <div class="info-section">
                <h3>Order Information</h3>
                <div class="info-row"><span>PO Number:</span><span>\${grnHeaderInfoForDownload.poNumber}</span></div>
                <div class="info-row"><span>Vendor:</span><span>\${grnHeaderInfoForDownload.brandName}</span></div>
                <div class="info-row"><span>Replenishment:</span><span>\${grnHeaderInfoForDownload.replenishmentNumber}</span></div>
              </div>
              <div class="info-section">
                <h3>Receipt Information</h3>
                <div class="info-row"><span>Inward Date:</span><span>\${grnHeaderInfoForDownload.inwardDate}</span></div>
                <div class="info-row"><span>Warehouse:</span><span>\${grnHeaderInfoForDownload.warehouseNo}</span></div>
                <div class="info-row"><span>Receipt Accuracy:</span><span>\${receiptAccuracy}%</span></div>
              </div>
            </div>

            <div class="summary-grid">
              <div class="summary-card">
                <div class="summary-value">\${summaryStats.quantities.totalOrdered}</div>
                <div class="summary-label">Ordered Units</div>
              </div>
              <div class="summary-card">
                <div class="summary-value">\${summaryStats.quantities.totalReceived}</div>
                <div class="summary-label">Received Units</div>
              </div>
              <div class="summary-card">
                <div class="summary-value">\${summaryStats.quantities.totalPassedQC}</div>
                <div class="summary-label">QC Passed</div>
              </div>
              <div class="summary-card">
                <div class="summary-value">\${summaryStats.quantities.totalFailedQC}</div>
                <div class="summary-label">QC Failed</div>
              </div>
              <div class="summary-card">
                <div class="summary-value">\${summaryStats.quantities.totalShortage}</div>
                <div class="summary-label">Shortage</div>
              </div>
              <div class="summary-card">
                <div class="summary-value">\${summaryStats.quantities.totalExcess}</div>
                <div class="summary-label">Excess</div>
              </div>
              <div class="summary-card">
                <div class="summary-value">\${summaryStats.quantities.totalNotOrderedUnits}</div>
                <div class="summary-label">Not Ordered</div>
              </div>
              <div class="summary-card">
                <div class="summary-value">\${qcPassRate}%</div>
                <div class="summary-label">QC Pass Rate</div>
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
                    <th>QC Status</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  \${grnDataForDownload.map(row => \`
                    <tr>
                      <td>\${row["S.No"]}</td>
                      <td>\${row["Brand SKU"]}</td>
                      <td>\${row["KNOT SKU"]}</td>
                      <td>\${row["Size"]}</td>
                      <td>\${row["Color"]}</td>
                      <td>\${row["Ordered Qty"]}</td>
                      <td>\${row["Received Qty"]}</td>
                      <td>\${row["Passed QC Qty"] || "-"}</td>
                      <td>\${row["Failed QC Qty"] || "-"}</td>
                      <td>\${row["Shortage Qty"] || "-"}</td>
                      <td>\${row["Excess Qty"] || "-"}</td>
                      <td><span class="status-badge qc-\${row["QC Status"].toLowerCase().replace(/\\s+/g, "-")}">\${row["QC Status"]}</span></td>
                      <td><span class="status-badge status-\${row.Status.toLowerCase().replace(/\\s+/g, "-")}">\${row.Status}</span></td>
                    </tr>
                  \`).join("")}
                </tbody>
              </table>
            </div>

            <div class="footer">
              <strong>KNOT Inventory Management System</strong><br>
              This is a computer-generated document. For queries, contact the warehouse team.
            </div>
          </body>
          </html>
        \`;

        // Create a new window with the PDF content
        const pdfWindow = window.open("", "_blank");
        pdfWindow.document.write(pdfContent);
        pdfWindow.document.close();
        
        // Wait for content to load then print
        pdfWindow.onload = function() {
          pdfWindow.print();
        };
        
      } catch (error) {
        console.error("Error downloading PDF:", error);
        alert("Error downloading PDF. Please try again.");
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
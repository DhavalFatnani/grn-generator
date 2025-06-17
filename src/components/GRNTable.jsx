import React, { useState, useCallback, useRef } from 'react';

const getStatusColor = (status) => {
  const colors = {
    Complete: "text-green-600 bg-green-50 border-green-200",
    Shortage: "text-red-600 bg-red-50 border-red-200",
    Excess: "text-yellow-600 bg-yellow-50 border-yellow-200",
    "Not Ordered": "text-blue-600 bg-blue-50 border-blue-200",
    "Not Received": "text-gray-600 bg-gray-50 border-gray-200",
    "QC Failed Receipt": "text-purple-600 bg-purple-50 border-purple-200",
  };
  return colors[status] || "text-gray-600 bg-gray-50 border-gray-200";
};

export const GRNTable = ({
  grnData,
  summaryStats,
  getStatusColor,
  handleDownloadCSV,
  handleDownloadGRN,
  handleDownloadPDF,
  grnHeaderInfo,
  skuCodeType,
}) => {
  const [tooltip, setTooltip] = useState({ show: false, content: '', x: 0, y: 0 });
  const tableRef = useRef(null);
  const [activeFilters, setActiveFilters] = useState({
    status: null,
    qcStatus: null,
    issueType: null
  });

  // Check if QC is performed
  const qcPerformed = grnHeaderInfo?.qcPerformed;

  const handleMouseEnter = (e, content) => {
    const targetRect = e.currentTarget.getBoundingClientRect();
    const tableRect = tableRef.current.getBoundingClientRect();

    const tooltipX = (targetRect.left + targetRect.width / 2) - tableRect.left;
    const tooltipY = (targetRect.bottom + 30) - tableRect.top;

    setTooltip({
      show: true,
      content,
      x: tooltipX,
      y: tooltipY
    });
  };

  const handleMouseLeave = () => {
    setTooltip({ show: false, content: '', x: 0, y: 0 });
  };

  const handleFilterClick = useCallback((filterType, value) => {
    setActiveFilters(prev => {
      // If clicking the same filter, remove it
      if (prev[filterType] === value) {
        return { ...prev, [filterType]: null };
      }
      // Otherwise, set the new filter
      return { ...prev, [filterType]: value };
    });
  }, []);

  const getFilteredData = useCallback(() => {
    return grnData.filter(item => {
      // Apply status filter
      if (activeFilters.status) {
        if (activeFilters.status === 'Excess') {
          // Include both Excess and Excess Receipt items when Excess filter is active
          if (item.Status !== 'Excess' && item.Status !== 'Excess Receipt' && item.Status !== 'Excess & QC Failed') {
            return false;
          }
        } else if (activeFilters.status === 'Shortage') {
          // Show ALL items that have shortage, regardless of status
          if ((item["Shortage Qty"] || 0) <= 0) {
            return false;
          }
        } else if (item.Status !== activeFilters.status) {
          return false;
        }
      }
      // Apply QC status filter only if QC is performed
      if (qcPerformed && activeFilters.qcStatus && item["QC Status"] !== activeFilters.qcStatus) {
        return false;
      }
      // Apply issue type filter only if QC is performed
      if (qcPerformed && activeFilters.issueType) {
        switch (activeFilters.issueType) {
          case 'qcOnly':
            return item["QC Status"] !== "Passed" && 
                   !["Shortage", "Excess", "Not Received", "Excess Receipt", "Shortage & QC Failed", "Excess & QC Failed"].includes(item.Status);
          case 'qtyOnly':
            return item["QC Status"] === "Passed" && 
                   ["Shortage", "Excess", "Not Received", "Excess Receipt"].includes(item.Status);
          case 'bothIssues':
            return item["QC Status"] !== "Passed" && 
                   ["Shortage", "Excess", "Not Received", "Excess Receipt", "Shortage & QC Failed", "Excess & QC Failed"].includes(item.Status);
          default:
            return true;
        }
      }
      return true;
    });
  }, [grnData, activeFilters, qcPerformed]);

  const filteredData = getFilteredData();

  const getFilterButtonClass = (filterType, value) => {
    const isActive = activeFilters[filterType] === value;
    const baseClasses = 'transition-colors duration-200';
    
    if (isActive) {
      switch (filterType) {
        case 'status':
          switch (value) {
            case 'Shortage':
            case 'Shortage & QC Failed':
              return `${baseClasses} bg-red-50 text-red-700 border-2 border-red-200 hover:bg-red-100`;
            case 'Excess':
            case 'Excess & QC Failed':
              return `${baseClasses} bg-yellow-50 text-yellow-700 border-2 border-yellow-200 hover:bg-yellow-100`;
            case 'Not Received':
              return `${baseClasses} bg-gray-50 text-gray-700 border-2 border-gray-200 hover:bg-gray-100`;
            case 'Excess Receipt':
              return `${baseClasses} bg-blue-50 text-blue-700 border-2 border-blue-200 hover:bg-blue-100`;
            case 'QC Failed Receipt':
              return `${baseClasses} bg-purple-50 text-purple-700 border-2 border-purple-200 hover:bg-purple-100`;
            case 'Received':
              return `${baseClasses} bg-green-50 text-green-700 border-2 border-green-200 hover:bg-green-100`;
            default:
              return `${baseClasses} bg-blue-50 text-blue-700 border-2 border-blue-200 hover:bg-blue-100`;
          }
        case 'qcStatus':
          switch (value) {
            case 'Passed':
              return `${baseClasses} bg-green-50 text-green-700 border-2 border-green-200 hover:bg-green-100`;
            case 'Failed':
              return `${baseClasses} bg-red-50 text-red-700 border-2 border-red-200 hover:bg-red-100`;
            case 'Partial':
              return `${baseClasses} bg-yellow-50 text-yellow-700 border-2 border-yellow-200 hover:bg-yellow-100`;
            default:
              return `${baseClasses} bg-blue-50 text-blue-700 border-2 border-blue-200 hover:bg-blue-100`;
          }
        case 'issueType':
          switch (value) {
            case 'qcOnly':
              return `${baseClasses} bg-red-50 text-red-700 border-2 border-red-200 hover:bg-red-100`;
            case 'qtyOnly':
              return `${baseClasses} bg-yellow-50 text-yellow-700 border-2 border-yellow-200 hover:bg-yellow-100`;
            case 'bothIssues':
              return `${baseClasses} bg-orange-50 text-orange-700 border-2 border-orange-200 hover:bg-orange-100`;
            default:
              return `${baseClasses} bg-blue-50 text-blue-700 border-2 border-blue-200 hover:bg-blue-100`;
          }
        default:
          return `${baseClasses} bg-blue-50 text-blue-700 border-2 border-blue-200 hover:bg-blue-100`;
      }
    }
    
    return `${baseClasses} bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100`;
  };

  return (
    <div ref={tableRef} className="space-y-6 relative">
      {/* Filter Summary */}
      <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-800">Filters</h2>
            <div className="h-6 w-px bg-gray-200"></div>
            <div className="flex flex-wrap gap-2">
              {activeFilters.status && (
                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${getFilterButtonClass('status', activeFilters.status)}`}>
                  Status: {activeFilters.status}
                  <button
                    onClick={() => handleFilterClick('status', activeFilters.status)}
                    className="ml-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    ×
                  </button>
                </span>
              )}
              {qcPerformed && activeFilters.qcStatus && (
                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${getFilterButtonClass('qcStatus', activeFilters.qcStatus)}`}>
                  QC: {activeFilters.qcStatus}
                  <button
                    onClick={() => handleFilterClick('qcStatus', activeFilters.qcStatus)}
                    className="ml-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    ×
                  </button>
                </span>
              )}
              {qcPerformed && activeFilters.issueType && (
                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${getFilterButtonClass('issueType', activeFilters.issueType)}`}>
                  Issue: {activeFilters.issueType === 'qcOnly' ? 'QC Only' : 
                         activeFilters.issueType === 'qtyOnly' ? 'Quantity Only' : 'Both Issues'}
                  <button
                    onClick={() => handleFilterClick('issueType', activeFilters.issueType)}
                    className="ml-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadCSV}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>
            <button
              onClick={handleDownloadGRN}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export GRN
            </button>
            <button
              onClick={handleDownloadPDF}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* QC Summary Card - Only show if QC is performed */}
        {qcPerformed && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700">Quality Control</h3>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div 
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${getFilterButtonClass('qcStatus', 'Passed')}`}
                    onClick={() => handleFilterClick('qcStatus', 'Passed')}
                  >
                    <div className="text-sm text-gray-600">Passed QC</div>
                    <div className="text-xl font-semibold text-green-600 mt-1">{summaryStats.totalPassedQCQty}</div>
                    <div className="text-xs text-gray-500 mt-1">units</div>
                  </div>
                  <div 
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${getFilterButtonClass('qcStatus', 'Failed')}`}
                    onClick={() => handleFilterClick('qcStatus', 'Failed')}
                  >
                    <div className="text-sm text-gray-600">Failed QC</div>
                    <div className="text-xl font-semibold text-red-600 mt-1">{summaryStats.totalFailedQCQty}</div>
                    <div className="text-xs text-gray-500 mt-1">units</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div 
                    className={`text-center p-2 rounded-lg cursor-pointer transition-colors ${getFilterButtonClass('qcStatus', 'Passed')}`}
                    onClick={() => handleFilterClick('qcStatus', 'Passed')}
                  >
                    <div className="text-sm text-gray-600">Complete</div>
                    <div className="text-lg font-semibold text-green-600 mt-1">{summaryStats.quantities.completeQC}</div>
                    <div className="text-xs text-gray-500 mt-1">units</div>
                  </div>
                  <div 
                    className={`text-center p-2 rounded-lg cursor-pointer transition-colors ${getFilterButtonClass('qcStatus', 'Partial')}`}
                    onClick={() => handleFilterClick('qcStatus', 'Partial')}
                  >
                    <div className="text-sm text-gray-600">Partial</div>
                    <div className="text-lg font-semibold text-yellow-600 mt-1">{summaryStats.quantities.partialQC}</div>
                    <div className="text-xs text-gray-500 mt-1">units</div>
                  </div>
                  <div 
                    className={`text-center p-2 rounded-lg cursor-pointer transition-colors ${getFilterButtonClass('qcStatus', 'Failed')}`}
                    onClick={() => handleFilterClick('qcStatus', 'Failed')}
                  >
                    <div className="text-sm text-gray-600">Failed</div>
                    <div className="text-lg font-semibold text-red-600 mt-1">{summaryStats.quantities.failedQC}</div>
                    <div className="text-xs text-gray-500 mt-1">units</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quantity Issues Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700">Quantity Issues</h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div 
                className={`p-3 rounded-lg cursor-pointer transition-colors ${getFilterButtonClass('status', 'Shortage')}`}
                onClick={() => handleFilterClick('status', 'Shortage')}
                onMouseEnter={(e) => handleMouseEnter(e, 'Items where Ordered Quantity > Received Quantity.')}
                onMouseLeave={handleMouseLeave}
              >
                <div className="text-sm text-gray-600">Shortage</div>
                <div className="flex items-baseline justify-between mt-1">
                  <div className="text-xl font-semibold text-red-600">{summaryStats.quantities.shortage}</div>
                  <div className="text-xs text-gray-500">({summaryStats.items.quantityIssues.shortage} items)</div>
                </div>
              </div>
              <div 
                className={`p-3 rounded-lg cursor-pointer transition-colors ${getFilterButtonClass('status', 'Excess')}`}
                onClick={() => handleFilterClick('status', 'Excess')}
                onMouseEnter={(e) => handleMouseEnter(e, 'Items where Received Quantity > Ordered Quantity, including Not Ordered items.')}
                onMouseLeave={handleMouseLeave}
              >
                <div className="text-sm text-gray-600">Excess</div>
                <div className="flex items-baseline justify-between mt-1">
                  <div className="text-xl font-semibold text-yellow-600">
                    {summaryStats.quantities.excess}
                  </div>
                  <div className="text-xs text-gray-500">
                    ({summaryStats.items.quantityIssues.excess + summaryStats.items.quantityIssues.notOrdered} items)
                  </div>
                </div>
              </div>
              <div 
                className={`p-3 rounded-lg cursor-pointer transition-colors ${getFilterButtonClass('status', 'Not Received')}`}
                onClick={() => handleFilterClick('status', 'Not Received')}
                onMouseEnter={(e) => handleMouseEnter(e, 'Items that were ordered but not received.')}
                onMouseLeave={handleMouseLeave}
              >
                <div className="text-sm text-gray-600">Not Received</div>
                <div className="flex items-baseline justify-between mt-1">
                  <div className="text-xl font-semibold text-gray-600">
                    {grnData.filter(item => item.Status === "Not Received")
                      .reduce((sum, item) => sum + (parseInt(item["Ordered Qty"]) || 0), 0)}
                  </div>
                  <div className="text-xs text-gray-500">
                    ({summaryStats.items.quantityIssues.notReceived} items)
                  </div>
                </div>
              </div>
              <div 
                className={`p-3 rounded-lg cursor-pointer transition-colors ${getFilterButtonClass('status', 'Not Ordered')}`}
                onClick={() => handleFilterClick('status', 'Not Ordered')}
                onMouseEnter={(e) => handleMouseEnter(e, 'Items that were received but not in the purchase order.')}
                onMouseLeave={handleMouseLeave}
              >
                <div className="text-sm text-gray-600">Not Ordered</div>
                <div className="flex items-baseline justify-between mt-1">
                  <div className="text-xl font-semibold text-blue-600">
                    {summaryStats.quantities.notOrdered}
                  </div>
                  <div className="text-xs text-gray-500">
                    ({summaryStats.items.quantityIssues.notOrdered} items)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Issue Summary Card - Only show if QC is performed */}
        {qcPerformed && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700">Issue Summary</h3>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                <div
                  className={`p-3 rounded-lg cursor-pointer transition-colors flex items-center justify-between ${getFilterButtonClass('issueType', 'qcOnly')}`}
                  onClick={() => handleFilterClick('issueType', 'qcOnly')}
                  onMouseEnter={(e) => handleMouseEnter(e, 'Items with Failed or Partial QC Status, but no quantity discrepancies.')}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="text-sm text-gray-600">QC Only</div>
                  <div className="text-lg font-semibold text-red-600">{summaryStats.items.onlyQCFailed}</div>
                </div>
                <div
                  className={`p-3 rounded-lg cursor-pointer transition-colors flex items-center justify-between ${getFilterButtonClass('issueType', 'qtyOnly')}`}
                  onClick={() => handleFilterClick('issueType', 'qtyOnly')}
                  onMouseEnter={(e) => handleMouseEnter(e, 'Items with Shortage, Excess, Not Received, or Not Ordered status, but Passed QC.')}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="text-sm text-gray-600">Quantity Only</div>
                  <div className="text-lg font-semibold text-orange-600">{summaryStats.items.onlyQuantityIssues}</div>
                </div>
                <div
                  className={`p-3 rounded-lg cursor-pointer transition-colors flex items-center justify-between ${getFilterButtonClass('issueType', 'bothIssues')}`}
                  onClick={() => handleFilterClick('issueType', 'bothIssues')}
                  onMouseEnter={(e) => handleMouseEnter(e, 'Items with both QC issues (Failed/Partial) and quantity discrepancies.')}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="text-sm text-gray-600">Both Issues</div>
                  <div className="text-lg font-semibold text-gray-600">{summaryStats.items.withBothIssues}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Performance Metrics Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700">Performance Metrics</h3>
          </div>
          <div className="p-4 space-y-3">
            {qcPerformed && (
              <div 
                className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200 cursor-help"
                onMouseEnter={(e) => handleMouseEnter(e, 'Percentage of units that passed Quality Control out of total received units.')}
                onMouseLeave={handleMouseLeave}
              >
                <div className="text-sm font-medium text-gray-600">QC Pass Rate</div>
                <div className="text-lg font-bold text-green-600">{summaryStats.qcPassRate}%</div>
              </div>
            )}
            <div 
              className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-200 cursor-help"
              onMouseEnter={(e) => handleMouseEnter(e, 'Percentage of units received compared to total units ordered.')}
              onMouseLeave={handleMouseLeave}
            >
              <div className="text-sm font-medium text-gray-600">Receipt Accuracy</div>
              <div className="text-lg font-bold text-blue-600">{summaryStats.receiptAccuracy}%</div>
            </div>
            <div 
              className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200 cursor-help"
              onMouseEnter={(e) => handleMouseEnter(e, 'Percentage of items that are fully received and passed QC with no quantity issues.')}
              onMouseLeave={handleMouseLeave}
            >
              <div className="text-sm font-medium text-gray-600">Complete Items</div>
              <div className="text-lg font-bold text-gray-600">{summaryStats.items.complete}</div>
            </div>
          </div>
        </div>
      </div>

      {/* GRN Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto relative shadow-md sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">S.No</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Brand SKU</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">KNOT SKU</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Size</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Color</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Ordered</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Received</th>
              {qcPerformed && (
                <>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Passed QC</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Failed QC</th>
                </>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Shortage</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Excess</th>
              {qcPerformed && (
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">QC Status</th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Remarks</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData.length > 0 ? (
              filteredData.map((row, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row["S.No"]}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row["Brand SKU"]}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row["KNOT SKU"]}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row["Size"]}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row["Color"]}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{row["Ordered Qty"]}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{row["Received Qty"]}</td>
                  {qcPerformed && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">{row["Passed QC Qty"] || "-"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">{row["Failed QC Qty"] || "-"}</td>
                    </>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">{row["Shortage Qty"] || "-"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-yellow-600">{row["Excess Qty"] || "-"}</td>
                  {qcPerformed && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(row["QC Status"])}`}>
                        {row["QC Status"]}
                      </span>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(row.Status)}`}>
                      {row.Status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 overflow-hidden text-ellipsis">
                    {row.Remarks}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={qcPerformed ? "15" : "12"} className="px-6 py-4 text-center text-gray-500">
                  No data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Tooltip component - moved to be a direct child of tableRef div */}
      {tooltip.show && (
        <div
          className="absolute z-50 p-3 text-sm text-white bg-gray-900 rounded-lg shadow-xl transition-all duration-150 ease-out"
          style={{
            top: tooltip.y,
            left: tooltip.x,
            transform: `translateX(-50%) translateY(${tooltip.show ? '0px' : '30px'})`,
            opacity: tooltip.show ? 1 : 0,
            maxWidth: '300px',
            wordWrap: 'break-word',
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}; 
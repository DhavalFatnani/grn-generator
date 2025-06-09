import React, { useState } from 'react';

const getStatusColor = (status) => {
  const colors = {
    Complete: "text-green-600 bg-green-50 border-green-200",
    Shortage: "text-red-600 bg-red-50 border-red-200",
    Excess: "text-yellow-600 bg-yellow-50 border-yellow-200",
    "Not Ordered": "text-blue-600 bg-blue-50 border-blue-200",
    "Not Received": "text-gray-600 bg-gray-50 border-gray-200",
  };
  return colors[status] || "text-gray-600 bg-gray-50 border-gray-200";
};

export const GRNTable = ({
  grnData,
  summaryStats,
  getStatusColor,
  handleDownloadCSV,
  handleDownloadGRN,
  showQCStatus,
  grnHeaderInfo,
  skuCodeType,
}) => {
  const [tooltip, setTooltip] = useState({ show: false, content: '', x: 0, y: 0 });

  const handleMouseEnter = (e, content) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const tooltipX = rect.left + (rect.width / 2);
    const tooltipY = rect.bottom + 10;
    
    // Check if tooltip would go off screen
    const tooltipWidth = 250; // Approximate max width
    const tooltipHeight = 100; // Approximate max height
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let finalX = tooltipX;
    let finalY = tooltipY;

    // Adjust X position if tooltip would go off screen
    if (tooltipX + (tooltipWidth / 2) > windowWidth) {
      finalX = windowWidth - (tooltipWidth / 2) - 10;
    } else if (tooltipX - (tooltipWidth / 2) < 0) {
      finalX = (tooltipWidth / 2) + 10;
    }

    // Adjust Y position if tooltip would go off screen
    if (tooltipY + tooltipHeight > windowHeight) {
      finalY = rect.top - tooltipHeight - 10;
    }

    setTooltip({
      show: true,
      content,
      x: finalX,
      y: finalY
    });
  };

  const handleMouseLeave = () => {
    setTooltip({ show: false, content: '', x: 0, y: 0 });
  };

  return (
    <div className="space-y-6 relative">
      {/* Tooltip */}
      {tooltip.show && (
        <div
          className="fixed z-[9999] px-4 py-2 text-sm text-white bg-gray-900/95 rounded-lg shadow-xl max-w-xs pointer-events-none"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: 'translateX(-50%)',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div className="relative">
            {tooltip.content}
            <div className="absolute w-3 h-3 bg-gray-900/95 transform rotate-45 -top-1.5 left-1/2 -translate-x-1/2" 
                 style={{ backdropFilter: 'blur(4px)' }} />
          </div>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">GRN Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Items & Quantities Card */}
          <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-lg shadow-sm border border-blue-100">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-blue-700">Total Items & Quantities</h4>
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="space-y-2">
              <div 
                className="flex justify-between items-center cursor-help"
                onMouseEnter={(e) => handleMouseEnter(e, "Total number of unique SKUs in the purchase order")}
                onMouseLeave={handleMouseLeave}
              >
                <span className="text-sm text-gray-600">Total Items</span>
                <span className="text-lg font-semibold text-gray-800">{summaryStats.totalItems}</span>
              </div>
              <div 
                className="flex justify-between items-center cursor-help"
                onMouseEnter={(e) => handleMouseEnter(e, "Total quantity of items ordered across all SKUs")}
                onMouseLeave={handleMouseLeave}
              >
                <span className="text-sm text-gray-600">Ordered</span>
                <span className="text-lg font-semibold text-blue-600">{summaryStats.totalOrderedQty} units</span>
              </div>
              <div 
                className="flex justify-between items-center cursor-help"
                onMouseEnter={(e) => handleMouseEnter(e, "Total quantity of items actually received, including excess and excluding shortages")}
                onMouseLeave={handleMouseLeave}
              >
                <span className="text-sm text-gray-600">Received</span>
                <span className="text-lg font-semibold text-blue-600">{summaryStats.totalReceivedQty} units</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-blue-100">
              <div 
                className="flex justify-between items-center cursor-help"
                onMouseEnter={(e) => handleMouseEnter(e, "Percentage of ordered quantity that was actually received. Higher is better.")}
                onMouseLeave={handleMouseLeave}
              >
                <span className="text-sm text-gray-600">Receipt Accuracy</span>
                <span className={`text-sm font-medium ${summaryStats.receiptAccuracy >= 95 ? 'text-green-600' : summaryStats.receiptAccuracy >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {summaryStats.receiptAccuracy}%
                </span>
              </div>
            </div>
          </div>

          {/* QC Status Card */}
          <div className="bg-gradient-to-br from-purple-50 to-white p-4 rounded-lg shadow-sm border border-purple-100">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-purple-700">QC Status</h4>
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="space-y-2">
              <div 
                className="flex justify-between items-center cursor-help"
                onMouseEnter={(e) => handleMouseEnter(e, "Total quantity of items that passed quality control inspection")}
                onMouseLeave={handleMouseLeave}
              >
                <span className="text-sm text-gray-600">Passed QC</span>
                <span className="text-lg font-semibold text-green-600">{summaryStats.totalPassedQCQty} units</span>
              </div>
              <div 
                className="flex justify-between items-center cursor-help"
                onMouseEnter={(e) => handleMouseEnter(e, "Total quantity of items that failed quality control inspection")}
                onMouseLeave={handleMouseLeave}
              >
                <span className="text-sm text-gray-600">Failed QC</span>
                <span className="text-lg font-semibold text-red-600">{summaryStats.totalFailedQCQty} units</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <div 
                  className="text-center p-2 bg-green-50 rounded cursor-help"
                  onMouseEnter={(e) => handleMouseEnter(e, "Number of SKUs where all received quantities passed QC")}
                  onMouseLeave={handleMouseLeave}
                >
                  <span className="text-sm text-gray-600">Complete</span>
                  <p className="text-lg font-semibold text-green-600">{summaryStats.items.complete}</p>
                </div>
                <div 
                  className="text-center p-2 bg-yellow-50 rounded cursor-help"
                  onMouseEnter={(e) => handleMouseEnter(e, "Number of SKUs where some quantities passed and some failed QC")}
                  onMouseLeave={handleMouseLeave}
                >
                  <span className="text-sm text-gray-600">Partial</span>
                  <p className="text-lg font-semibold text-yellow-600">{summaryStats.items.partialQC}</p>
                </div>
                <div 
                  className="text-center p-2 bg-red-50 rounded cursor-help"
                  onMouseEnter={(e) => handleMouseEnter(e, "Number of SKUs where all received quantities failed QC")}
                  onMouseLeave={handleMouseLeave}
                >
                  <span className="text-sm text-gray-600">Failed</span>
                  <p className="text-lg font-semibold text-red-600">{summaryStats.items.failedQC}</p>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-purple-100">
              <div 
                className="flex justify-between items-center cursor-help"
                onMouseEnter={(e) => handleMouseEnter(e, "Percentage of received quantity that passed QC. Higher is better.")}
                onMouseLeave={handleMouseLeave}
              >
                <span className="text-sm text-gray-600">QC Pass Rate</span>
                <span className={`text-sm font-medium ${summaryStats.qcPassRate >= 95 ? 'text-green-600' : summaryStats.qcPassRate >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {summaryStats.qcPassRate}%
                </span>
              </div>
            </div>
          </div>

          {/* Quantity Issues Card */}
          <div className="bg-gradient-to-br from-orange-50 to-white p-4 rounded-lg shadow-sm border border-orange-100">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-orange-700">Quantity Issues</h4>
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div 
                  className="p-2 bg-red-50 rounded cursor-help"
                  onMouseEnter={(e) => handleMouseEnter(e, "Items where some quantity was received but less than ordered. Example: Ordered 100, received 80 = 20 units shortage.")}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="text-sm text-gray-600">Shortage</div>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-red-600">{summaryStats.quantities.shortage}</span>
                    <span className="text-sm text-gray-500">({summaryStats.items.quantityIssues.shortage})</span>
                  </div>
                </div>
                <div 
                  className="p-2 bg-yellow-50 rounded cursor-help"
                  onMouseEnter={(e) => handleMouseEnter(e, "Items where some quantity was received but more than ordered. Example: Ordered 100, received 120 = 20 units excess.")}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="text-sm text-gray-600">Excess</div>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-yellow-600">{summaryStats.quantities.excess}</span>
                    <span className="text-sm text-gray-500">({summaryStats.items.quantityIssues.excess})</span>
                  </div>
                </div>
                <div 
                  className="p-2 bg-blue-50 rounded cursor-help"
                  onMouseEnter={(e) => handleMouseEnter(e, "Items that were ordered but none were received at all. Example: Ordered 100, received 0 = 100 units not received.")}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="text-sm text-gray-600">Not Received</div>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-blue-600">{summaryStats.quantities.notReceived}</span>
                    <span className="text-sm text-gray-500">({summaryStats.items.quantityIssues.notReceived})</span>
                  </div>
                </div>
                <div 
                  className="p-2 bg-indigo-50 rounded cursor-help"
                  onMouseEnter={(e) => handleMouseEnter(e, "Total quantity of received items not in purchase order (units and affected SKUs)")}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="text-sm text-gray-600">Not Ordered</div>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-indigo-600">{summaryStats.quantities.notOrdered}</span>
                    <span className="text-sm text-gray-500">({summaryStats.items.quantityIssues.notOrdered})</span>
                  </div>
                </div>
              </div>
        </div>
          </div>

          {/* Issue Summary Card */}
          <div className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-700">Issue Summary</h4>
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div 
                  className="text-center p-2 bg-red-50 rounded cursor-help"
                  onMouseEnter={(e) => handleMouseEnter(e, "Number of SKUs that failed QC but have correct quantities")}
                  onMouseLeave={handleMouseLeave}
                >
                  <span className="text-sm text-gray-600">QC Only</span>
                  <p className="text-lg font-semibold text-red-600">{summaryStats.items.onlyQCFailed}</p>
                </div>
                <div 
                  className="text-center p-2 bg-yellow-50 rounded cursor-help"
                  onMouseEnter={(e) => handleMouseEnter(e, "Number of SKUs that passed QC but have quantity issues")}
                  onMouseLeave={handleMouseLeave}
                >
                  <span className="text-sm text-gray-600">Qty Only</span>
                  <p className="text-lg font-semibold text-yellow-600">{summaryStats.items.onlyQuantityIssues}</p>
                </div>
                <div 
                  className="text-center p-2 bg-orange-50 rounded cursor-help"
                  onMouseEnter={(e) => handleMouseEnter(e, "Number of SKUs that have both QC and quantity issues")}
                  onMouseLeave={handleMouseLeave}
                >
                  <span className="text-sm text-gray-600">Both</span>
                  <p className="text-lg font-semibold text-orange-600">{summaryStats.items.withBothIssues}</p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100">
                <div 
                  className="text-center cursor-help"
                  onMouseEnter={(e) => handleMouseEnter(e, "Total number of SKUs with any type of issue (QC or quantity)")}
                  onMouseLeave={handleMouseLeave}
                >
                  <p className="text-3xl font-bold text-gray-800">{summaryStats.items.withIssues}</p>
                  <p className="text-sm text-gray-600">Items with Issues</p>
                  <div className="mt-1">
                    <span className={`text-sm font-medium ${summaryStats.items.withIssues === 0 ? 'text-green-600' : summaryStats.items.withIssues < summaryStats.totalItems * 0.1 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {((summaryStats.items.withIssues / summaryStats.totalItems) * 100).toFixed(1)}% of total
                    </span>
                  </div>
                </div>
              </div>
        </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex space-x-4">
          <button
            onClick={handleDownloadCSV}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
          >
            Download CSV
          </button>
          <button
            onClick={handleDownloadGRN}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            Download GRN
          </button>
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                S.No
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Brand SKU
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                KNOT SKU
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Size
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Color
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Ordered
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Received
              </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Passed QC
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Failed QC
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Shortage
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Excess
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Unit Price
              </th>
              {showQCStatus && (
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  QC Status
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Remarks
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {grnData.map((row, index) => (
              <tr
                key={index}
                className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {row["S.No"]}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {row["Brand SKU"]}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {row["KNOT SKU"]}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {row["Size"]}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {row["Color"]}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                  {row["Ordered Qty"]}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                  {row["Received Qty"]}
                </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                    {row["Passed QC Qty"] || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">
                    {row["Failed QC Qty"] || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">
                  {row["Shortage Qty"] || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-yellow-600">
                  {row["Excess Qty"] || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {row["Unit Price"]}
                </td>
                {showQCStatus && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${
                        row["QC Status"] === "Passed"
                          ? "text-green-600 bg-green-50 border-green-200"
                            : row["QC Status"] === "Partial"
                            ? "text-yellow-600 bg-yellow-50 border-yellow-200"
                          : "text-red-600 bg-red-50 border-red-200"
                      }`}
                    >
                      {row["QC Status"]}
                    </span>
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusColor(row.Status)}`}
                  >
                    {row.Status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {row.Remarks}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}; 
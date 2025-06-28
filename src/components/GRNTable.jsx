import React, { useState, useCallback, useRef } from 'react';
import { getStatusColor, getQCStatusColor } from '../utils/helpers.js';
import DropdownFilter from './DropdownFilter';

const SummaryCard = ({ icon, label, value, color, highlight }) => (
  <div className={`flex flex-col items-center justify-center rounded-xl px-6 py-4 shadow-sm ${color} ${highlight ? 'ring-2 ring-red-200' : ''}`}
    style={{ minWidth: 120 }}>
    <div className="text-2xl mb-1">{icon}</div>
    <div className="text-2xl font-bold" style={{ lineHeight: 1 }}>{value}</div>
    <div className="text-xs text-gray-700 mt-1 text-center whitespace-nowrap">{label}</div>
  </div>
);

export const GRNTable = ({
  data = [],
  filteredData = [],
  grnHeaderInfo = {},
  activeFilters = { status: [], qcStatus: [], issueType: [] },
  search = '',
  onFilterChange,
  onSearchChange,
  onClearFilters,
  onDownloadFiltered,
  getStatusColor: customGetStatusColor,
}) => {
  const qcPerformed = grnHeaderInfo.qcPerformed;
  const [tooltip, setTooltip] = useState({ show: false, content: '', x: 0, y: 0 });
  const tableRef = useRef(null);
  const [expandedRow, setExpandedRow] = useState(null);

  const handleMouseEnter = (e, content) => {
    const targetRect = e.currentTarget.getBoundingClientRect();
    const tableRect = tableRef.current.getBoundingClientRect();
    setTooltip({
      show: true,
      content,
      x: (targetRect.left + targetRect.width / 2) - tableRect.left,
      y: (targetRect.bottom + 30) - tableRect.top
    });
  };

  const handleMouseLeave = () => {
    setTooltip({ show: false, content: '', x: 0, y: 0 });
  };

  // Summary bar logic
  const total = data.length;
  const totalReceived = data.reduce((acc, item) => acc + (item["Received Qty"] || 0), 0);
  const totalQCPassed = data.reduce((acc, item) => acc + (item["Passed QC Qty"] || 0), 0);
  const totalQCFailed = data.reduce((acc, item) => acc + (item["Failed QC Qty"] || 0), 0);
  const qcPassRate = totalReceived > 0 ? ((totalQCPassed / totalReceived) * 100).toFixed(1) : '0.0';
  const withIssues = data.filter(item => (
    ["Shortage", "Excess", "Not Received", "Excess Receipt", "Shortage & QC Failed", "Excess & QC Failed"].includes(item.Status) ||
    (qcPerformed && ["Failed", "Partial"].includes(item["QC Status"])))
  ).length;

  // Row highlight logic
  const getRowClass = (item, idx) => {
    let base = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50';
    if (item["QC Status"] === 'Failed') return base + ' ring-2 ring-red-200';
    if (item.Status === 'Shortage' || item.Status === 'Excess' || item.Status === 'Shortage & QC Failed' || item.Status === 'Excess & QC Failed') return base + ' bg-yellow-50';
    if (item.Status === 'Excess Receipt') return base + ' bg-blue-50';
    if (item.Status === 'Received') return base + ' bg-green-50';
    if (item.Status === 'Not Received') return base + ' bg-gray-100';
    return base;
  };

  const getFilterButtonClass = (filterType, value, isActive) => {
    const baseClasses = 'transition-colors duration-200 px-3 py-1.5 rounded-full text-sm font-medium';
    
    if (!isActive) {
      return `${baseClasses} bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100`;
    }

    const colorMap = {
      status: {
        'Shortage': 'bg-red-50 text-red-700 border-2 border-red-200 hover:bg-red-100',
        'Excess': 'bg-yellow-50 text-yellow-700 border-2 border-yellow-200 hover:bg-yellow-100',
        'Not Received': 'bg-gray-50 text-gray-700 border-2 border-gray-200 hover:bg-gray-100',
        'Excess Receipt': 'bg-blue-50 text-blue-700 border-2 border-blue-200 hover:bg-blue-100',
        'Received': 'bg-green-50 text-green-700 border-2 border-green-200 hover:bg-green-100'
      },
      qcStatus: {
        'Passed': 'bg-green-50 text-green-700 border-2 border-green-200 hover:bg-green-100',
        'Failed': 'bg-red-50 text-red-700 border-2 border-red-200 hover:bg-red-100',
        'Partial': 'bg-yellow-50 text-yellow-700 border-2 border-yellow-200 hover:bg-yellow-100'
      },
      issueType: {
        'qcOnly': 'bg-red-50 text-red-700 border-2 border-red-200 hover:bg-red-100',
        'qtyOnly': 'bg-yellow-50 text-yellow-700 border-2 border-yellow-200 hover:bg-yellow-100',
        'bothIssues': 'bg-orange-50 text-orange-700 border-2 border-orange-200 hover:bg-orange-100'
      }
    };

    return `${baseClasses} ${colorMap[filterType]?.[value] || 'bg-blue-50 text-blue-700 border-2 border-blue-200 hover:bg-blue-100'}`;
  };

  const renderFilterChip = (filterType, value, label) => {
    const isActive = activeFilters[filterType].includes(value);
    return (
      <button
        key={`${filterType}-${value}`}
        onClick={() => onFilterChange(filterType, value)}
        className={getFilterButtonClass(filterType, value, isActive)}
      >
        {label}
      </button>
    );
  };

  const renderActiveFilters = () => {
    const activeChips = [];
    
    if (activeFilters.status) {
      activeChips.push(
        <span key="status" className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${getFilterButtonClass('status', activeFilters.status, true)}`}>
          Status: {activeFilters.status}
          <button onClick={() => onFilterChange('status', activeFilters.status)} className="ml-2 text-gray-500 hover:text-gray-700">×</button>
        </span>
      );
    }
    
    if (activeFilters.qcStatus) {
      activeChips.push(
        <span key="qcStatus" className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${getFilterButtonClass('qcStatus', activeFilters.qcStatus, true)}`}>
          QC: {activeFilters.qcStatus}
          <button onClick={() => onFilterChange('qcStatus', activeFilters.qcStatus)} className="ml-2 text-gray-500 hover:text-gray-700">×</button>
        </span>
      );
    }
    
    if (activeFilters.issueType) {
      const issueLabels = { qcOnly: 'QC Only', qtyOnly: 'Quantity Only', bothIssues: 'Both Issues' };
      activeChips.push(
        <span key="issueType" className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${getFilterButtonClass('issueType', activeFilters.issueType, true)}`}>
          Issue: {issueLabels[activeFilters.issueType]}
          <button onClick={() => onFilterChange('issueType', activeFilters.issueType)} className="ml-2 text-gray-500 hover:text-gray-700">×</button>
        </span>
      );
    }
    
    return activeChips.length > 0 ? (
      <div className="flex flex-wrap gap-2 mb-2">{activeChips}</div>
    ) : null;
  };

  const isFiltered = search || Object.values(activeFilters).some(Boolean);
  const filterSummary = isFiltered ? (
    <div className="mb-2 px-4 py-2 rounded bg-blue-50 border border-blue-100 text-blue-800 text-sm font-medium sticky top-0 z-20 shadow-sm">
      Showing {filteredData.length} of {data.length} items
      {search && <span> (search: <span className="font-semibold">{search}</span>)</span>}
      {Object.entries(activeFilters).filter(([k, v]) => v).length > 0 && (
        <span> (filtered by: {Object.entries(activeFilters).filter(([k, v]) => v).map(([k, v]) => `${k}: ${v}`).join(', ')})</span>
      )}
    </div>
  ) : null;

  // Determine if PO columns should be shown
  const showPOColumns = filteredData.some(item => typeof item["Ordered Qty"] !== 'undefined');
  // Determine which SKU code type to show if no PO
  let showBrandSKU = true, showKnotSKU = true, showSize = true, showColors = true;
  let skuDataHeader = 'SKU';
  let showSkuData = false;
  if (!showPOColumns) {
    // If all rows have only Brand SKU, show only Brand; if only KNOT, show only KNOT
    const allHaveBrand = filteredData.every(item => item["Brand SKU"] && !item["KNOT SKU"]);
    const allHaveKnot = filteredData.every(item => item["KNOT SKU"] && !item["Brand SKU"]);
    showBrandSKU = allHaveBrand;
    showKnotSKU = allHaveKnot;
    showSize = false;
    showColors = false;
    // Show SKU data column and set header
    showSkuData = true;
    skuDataHeader = allHaveKnot ? 'Knot Code' : 'Brand Code';
  }

  return (
    <div ref={tableRef} className="space-y-6 relative">
      {/* Summary Cards */}
      {total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-6">
          <SummaryCard icon="📦" label="Total Items" value={total} color="bg-blue-50" />
          <SummaryCard icon="📥" label="Total Received" value={totalReceived} color="bg-green-50" />
          {qcPerformed && (
            <>
              <SummaryCard icon="✅" label="QC Passed" value={totalQCPassed} color="bg-yellow-50" />
              <SummaryCard icon="❌" label="QC Failed" value={totalQCFailed} color="bg-red-50" />
              <SummaryCard icon="📊" label="QC Pass Rate" value={`${qcPassRate}%`} color="bg-blue-50" />
            </>
          )}
          <SummaryCard icon="⚠️" label="With Issues" value={withIssues} color="bg-purple-50" highlight={withIssues > 0} />
          </div>
      )}
      {/* Modern Filter Bar */}
      <div className="sticky top-0 z-30 bg-white shadow-md border-b border-gray-200 mb-4 px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-lg">
        {/* Search Box */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-gray-400"><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
          <input
            type="text"
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 w-full md:w-64"
            placeholder="Search by SKU, Size, or Color..."
            value={search}
            onChange={e => onSearchChange(e.target.value)}
          />
          {search && (
            <button onClick={() => onSearchChange('')} className="text-gray-400 hover:text-gray-700 ml-1">×</button>
          )}
        </div>
        {/* Dropdowns */}
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          {/* Status Dropdown */}
          <DropdownFilter
            label="Status"
            options={["Shortage", "Excess", "Not Received", "Excess Receipt", "Received"]}
            selected={activeFilters.status}
            onSelect={(value) => onFilterChange('status', value)}
            countFn={val => data.filter(item => item.Status === val).length}
          />
          {/* QC Status Dropdown */}
          {qcPerformed && (
            <DropdownFilter
              label="QC Status"
              options={['Passed', 'Failed', 'Partial']}
              selected={activeFilters.qcStatus}
              onSelect={(value) => onFilterChange('qcStatus', value)}
            />
          )}
          {/* Issue Type Dropdown */}
          <DropdownFilter
            label="Issue Type"
            options={["qcOnly", "qtyOnly", "bothIssues"]}
            optionLabels={{ qcOnly: "QC Only", qtyOnly: "Quantity Only", bothIssues: "Both Issues" }}
            selected={activeFilters.issueType}
            onSelect={(value) => onFilterChange('issueType', value)}
            countFn={val => {
              const hasQCIssue = (item) => qcPerformed && item["QC Status"] !== "Passed" && item["QC Status"] !== "Not Performed";
              const hasQtyIssue = (item) => ["Shortage", "Excess", "Not Received", "Excess Receipt", "Shortage & QC Failed", "Excess & QC Failed"].includes(item.Status);

              if (val === "qcOnly") return data.filter(item => hasQCIssue(item) && !hasQtyIssue(item)).length;
              if (val === "qtyOnly") return data.filter(item => !hasQCIssue(item) && hasQtyIssue(item)).length;
              if (val === "bothIssues") return data.filter(item => hasQCIssue(item) && hasQtyIssue(item)).length;
              return 0;
            }}
          />
        </div>
        {/* Action Buttons */}
        <div className="flex items-center gap-3 ml-auto">
          {(search || activeFilters.status.length > 0 || activeFilters.qcStatus.length > 0 || activeFilters.issueType.length > 0) && (
            <>
              <button 
                onClick={onDownloadFiltered}
                className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 text-sm font-medium border border-blue-600 transition-colors"
              >
                Export View as CSV
              </button>
              <button 
                onClick={onClearFilters} 
                className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 text-sm font-medium border border-gray-300 transition-colors"
              >
                Clear All
              </button>
            </>
          )}
        </div>
          </div>
      {/* Active Filter Chips */}
      {(search || activeFilters.status.length > 0 || activeFilters.qcStatus.length > 0 || activeFilters.issueType.length > 0) && (
        <div className="flex flex-wrap gap-2 mb-4 px-4">
          {search && (
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 shadow-sm animate-fade-in">
              Search: {search}
              <button onClick={() => onSearchChange('')} className="ml-2 text-gray-500 hover:text-gray-700">×</button>
            </span>
          )}
          {activeFilters.status.map(val => (
            <span key={val} className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800 shadow-sm animate-fade-in">
              Status: {val}
              <button onClick={() => onFilterChange('status', val)} className="ml-2 text-gray-500 hover:text-gray-700">×</button>
            </span>
          ))}
          {activeFilters.qcStatus.map(val => (
            <span key={val} className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 shadow-sm animate-fade-in">
              QC: {val}
              <button onClick={() => onFilterChange('qcStatus', val)} className="ml-2 text-gray-500 hover:text-gray-700">×</button>
            </span>
          ))}
          {activeFilters.issueType.map(val => (
            <span key={val} className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-purple-100 text-purple-800 shadow-sm animate-fade-in">
              Issue: {val === 'qcOnly' ? 'QC Only' : val === 'qtyOnly' ? 'Quantity Only' : 'Both Issues'}
              <button onClick={() => onFilterChange('issueType', val)} className="ml-2 text-gray-500 hover:text-gray-700">×</button>
            </span>
          ))}
        </div>
      )}
      {filterSummary}
      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10 shadow">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S.No</th>
              {showSkuData && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{skuDataHeader}</th>
              )}
              {showBrandSKU && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand SKU</th>
              )}
              {showKnotSKU && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">KNOT SKU</th>
              )}
              {showSize && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
              )}
              {showColors && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Colors</th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bin</th>
              {showPOColumns && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ordered Qty</th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Received Qty</th>
              {qcPerformed && (
                <>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Passed QC Qty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Failed QC Qty</th>
                </>
              )}
              {showPOColumns && (
                <>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shortage Qty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Excess Qty</th>
                </>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              {qcPerformed && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">QC Status</th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredData.map((item, index) => (
              <React.Fragment key={index}>
                <tr className={getRowClass(item, index) + " hover:bg-blue-50 transition-colors duration-100"}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item["S.No"]}</td>
                  {showSkuData && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item["SKU Data"]}</td>
                  )}
                  {showBrandSKU && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 max-w-xs truncate" title={item["Brand SKU Code"] || item["Brand SKU"]}>{item["Brand SKU Code"] || item["Brand SKU"]}</td>
                  )}
                  {showKnotSKU && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 max-w-xs truncate" title={item["KNOT SKU Code"] || item["KNOT SKU"]}>{item["KNOT SKU Code"] || item["KNOT SKU"]}</td>
                  )}
                  {showSize && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item["Size"]}</td>
                  )}
                  {showColors && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item["Colors"]}</td>
                  )}
                  <td className={
                    (item["BinLocations"] && item["BinLocations"].length > 0)
                      ? "px-6 py-4 whitespace-nowrap text-sm text-blue-900 cursor-pointer underline"
                      : "px-6 py-4 whitespace-nowrap text-sm text-gray-400"
                  } 
                    onClick={() => {
                      if (item["BinLocations"] && item["BinLocations"].length > 0) {
                        setExpandedRow(expandedRow === index ? null : index);
                      }
                    }}
                  >
                    {item["BinLocations"] && item["BinLocations"].length > 0 ? (
                      <>
                        {item["Bin"]}
                        <span className="ml-2 text-xs text-blue-500">[{expandedRow === index ? 'Hide' : 'Show'}]</span>
                      </>
                    ) : (
                      "-"
                    )}
                  </td>
                  {showPOColumns && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item["Ordered Qty"]}</td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item["Received Qty"]}</td>
                  {qcPerformed && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item["Passed QC Qty"]}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item["Failed QC Qty"]}</td>
                    </>
                  )}
                  {showPOColumns && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item["Shortage Qty"]}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item["Excess Qty"]}</td>
                    </>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span 
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${customGetStatusColor ? customGetStatusColor(item.Status) : getStatusColor(item.Status)}`}
                      onMouseEnter={(e) => handleMouseEnter(e, item.Status)}
                      onMouseLeave={handleMouseLeave}
                    >
                      {item.Status}
                    </span>
                  </td>
                  {qcPerformed && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getQCStatusColor(item["QC Status"])}`}>{item["QC Status"]}</span>
                    </td>
                  )}
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate" title={item["Remarks"]}>{item["Remarks"]}</td>
                </tr>
                {expandedRow === index && item["BinLocations"] && item["BinLocations"].length > 0 && (
                  <tr className="bg-blue-50">
                    <td colSpan={qcPerformed ? 15 : 13} className="px-6 py-3 text-xs text-blue-900">
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="font-semibold">Bin Locations:</span>
                        {item["BinLocations"].map((bin, i) => (
                          <span key={i} className="inline-block bg-blue-100 text-blue-800 rounded px-2 py-1 text-xs font-mono border border-blue-200">{bin}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {/* Tooltip */}
      {tooltip.show && (
        <div
          className="absolute z-10 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translateX(-50%)'
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}; 
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

export const GRNTable = ({ data = [], getStatusColor: customGetStatusColor }) => {
  const [tooltip, setTooltip] = useState({ show: false, content: '', x: 0, y: 0 });
  const [activeFilters, setActiveFilters] = useState({
    status: [],
    qcStatus: [],
    issueType: []
  });
  const [search, setSearch] = useState('');
  const tableRef = useRef(null);

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

  const handleFilterClick = useCallback((filterType, value) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterType]: prev[filterType].includes(value) ? prev[filterType].filter((v) => v !== value) : [...prev[filterType], value]
    }));
  }, []);

  const handleClearAllFilters = () => {
    setActiveFilters({ status: [], qcStatus: [], issueType: [] });
    setSearch('');
  };

  const getFilteredData = useCallback(() => {
    return data.filter(item => {
      // Search filter
      if (search) {
        const brand = (item["Brand SKU Code"] || '').toString().toLowerCase();
        const knot = (item["KNOT SKU Code"] || '').toString().toLowerCase();
        if (!brand.includes(search.toLowerCase()) && !knot.includes(search.toLowerCase())) {
          return false;
        }
      }
      // Status filter
      if (activeFilters.status.length > 0) {
        if (!activeFilters.status.includes(item.Status)) {
          return false;
        }
      }
      // QC Status filter
      if (activeFilters.qcStatus.length > 0 && !activeFilters.qcStatus.includes(item["QC Status"])) {
        return false;
      }
      // Issue type filter
      if (activeFilters.issueType.length > 0) {
        const hasQCIssue = item["QC Status"] !== "Passed" && item["QC Status"] !== "Not Performed";
        const hasQtyIssue = ["Shortage", "Excess", "Not Received", "Excess Receipt", "Shortage & QC Failed", "Excess & QC Failed"].includes(item.Status);
        if (!activeFilters.issueType.includes('qcOnly') && !hasQCIssue) return false;
        if (!activeFilters.issueType.includes('qtyOnly') && !hasQtyIssue) return false;
        if (!activeFilters.issueType.includes('bothIssues') && (hasQCIssue && hasQtyIssue)) return false;
      }
      return true;
    });
  }, [data, activeFilters, search]);

  const filteredData = getFilteredData();

  // Summary bar logic
  const total = data.length;
  const filtered = filteredData.length;
  const totalReceived = data.reduce((acc, item) => acc + (item["Received Qty"] || 0), 0);
  const totalQCPassed = data.reduce((acc, item) => acc + (item["Passed QC Qty"] || 0), 0);
  const totalQCFailed = data.reduce((acc, item) => acc + (item["Failed QC Qty"] || 0), 0);
  const qcPassRate = totalReceived > 0 ? ((totalQCPassed / totalReceived) * 100).toFixed(1) : '0.0';
  const withIssues = data.filter(item => (
    ["Shortage", "Excess", "Not Received", "Excess Receipt", "Shortage & QC Failed", "Excess & QC Failed"].includes(item.Status) ||
    ["Failed", "Partial"].includes(item["QC Status"]))
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
        onClick={() => handleFilterClick(filterType, value)}
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
          <button onClick={() => handleFilterClick('status', activeFilters.status)} className="ml-2 text-gray-500 hover:text-gray-700">×</button>
        </span>
      );
    }
    
    if (activeFilters.qcStatus) {
      activeChips.push(
        <span key="qcStatus" className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${getFilterButtonClass('qcStatus', activeFilters.qcStatus, true)}`}>
          QC: {activeFilters.qcStatus}
          <button onClick={() => handleFilterClick('qcStatus', activeFilters.qcStatus)} className="ml-2 text-gray-500 hover:text-gray-700">×</button>
        </span>
      );
    }
    
    if (activeFilters.issueType) {
      const issueLabels = { qcOnly: 'QC Only', qtyOnly: 'Quantity Only', bothIssues: 'Both Issues' };
      activeChips.push(
        <span key="issueType" className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${getFilterButtonClass('issueType', activeFilters.issueType, true)}`}>
          Issue: {issueLabels[activeFilters.issueType]}
          <button onClick={() => handleFilterClick('issueType', activeFilters.issueType)} className="ml-2 text-gray-500 hover:text-gray-700">×</button>
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

  return (
    <div ref={tableRef} className="space-y-6 relative">
      {/* Summary Cards */}
      {total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-6">
          <SummaryCard icon="📦" label="Total Items" value={total} color="bg-blue-50" />
          <SummaryCard icon="📥" label="Total Received" value={totalReceived} color="bg-green-50" />
          <SummaryCard icon="✅" label="QC Passed" value={totalQCPassed} color="bg-yellow-50" />
          <SummaryCard icon="❌" label="QC Failed" value={totalQCFailed} color="bg-red-50" highlight={totalQCFailed > 0} />
          <SummaryCard icon="⚠️" label="With Issues" value={withIssues} color="bg-purple-50" highlight={withIssues > 0} />
          <SummaryCard icon="📊" label="QC Pass Rate" value={`${qcPassRate}%`} color="bg-blue-50" />
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
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-700 ml-1">×</button>
          )}
        </div>
        {/* Dropdowns */}
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          {/* Status Dropdown */}
          <DropdownFilter
            label="Status"
            options={["Shortage", "Excess", "Not Received", "Excess Receipt", "Received"]}
            selected={activeFilters.status}
            onChange={vals => setActiveFilters(f => ({ ...f, status: vals }))}
            countFn={val => data.filter(item => item.Status === val).length}
          />
          {/* QC Status Dropdown */}
          <DropdownFilter
            label="QC Status"
            options={["Passed", "Failed", "Partial", "Not Performed"]}
            selected={activeFilters.qcStatus}
            onChange={vals => setActiveFilters(f => ({ ...f, qcStatus: vals }))}
            countFn={val => data.filter(item => item["QC Status"] === val).length}
          />
          {/* Issue Type Dropdown */}
          <DropdownFilter
            label="Issue Type"
            options={["qcOnly", "qtyOnly", "bothIssues"]}
            optionLabels={{ qcOnly: "QC Only", qtyOnly: "Quantity Only", bothIssues: "Both Issues" }}
            selected={activeFilters.issueType}
            onChange={vals => setActiveFilters(f => ({ ...f, issueType: vals }))}
            countFn={val => {
              if (val === "qcOnly") return data.filter(item => item["QC Status"] !== "Passed" && item["QC Status"] !== "Not Performed" && !["Shortage", "Excess", "Not Received", "Excess Receipt", "Shortage & QC Failed", "Excess & QC Failed"].includes(item.Status)).length;
              if (val === "qtyOnly") return data.filter(item => (item["QC Status"] === "Passed" || item["QC Status"] === "Not Performed") && ((item["Shortage Qty"] || 0) > 0 || (item["Excess Qty"] || 0) > 0 || (item["Not Ordered Qty"] || 0) > 0 || item.Status === "Not Received")).length;
              if (val === "bothIssues") return data.filter(item => item["QC Status"] !== "Passed" && item["QC Status"] !== "Not Performed" && ["Shortage", "Excess", "Not Received", "Excess Receipt", "Shortage & QC Failed", "Excess & QC Failed"].includes(item.Status)).length;
              return 0;
            }}
          />
        </div>
        {/* Clear All Button */}
        {(search || activeFilters.status.length > 0 || activeFilters.qcStatus.length > 0 || activeFilters.issueType.length > 0) && (
          <button onClick={handleClearAllFilters} className="ml-auto px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 text-sm font-medium border border-gray-300 transition-colors">Clear All</button>
        )}
      </div>
      {/* Active Filter Chips */}
      {(search || activeFilters.status.length > 0 || activeFilters.qcStatus.length > 0 || activeFilters.issueType.length > 0) && (
        <div className="flex flex-wrap gap-2 mb-4 px-4">
          {search && (
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 shadow-sm animate-fade-in">
              Search: {search}
              <button onClick={() => setSearch('')} className="ml-2 text-gray-500 hover:text-gray-700">×</button>
            </span>
          )}
          {activeFilters.status.map(val => (
            <span key={val} className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800 shadow-sm animate-fade-in">
              Status: {val}
              <button onClick={() => setActiveFilters(f => ({ ...f, status: f.status.filter(v => v !== val) }))} className="ml-2 text-gray-500 hover:text-gray-700">×</button>
            </span>
          ))}
          {activeFilters.qcStatus.map(val => (
            <span key={val} className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 shadow-sm animate-fade-in">
              QC: {val}
              <button onClick={() => setActiveFilters(f => ({ ...f, qcStatus: f.qcStatus.filter(v => v !== val) }))} className="ml-2 text-gray-500 hover:text-gray-700">×</button>
            </span>
          ))}
          {activeFilters.issueType.map(val => (
            <span key={val} className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-purple-100 text-purple-800 shadow-sm animate-fade-in">
              Issue: {val === 'qcOnly' ? 'QC Only' : val === 'qtyOnly' ? 'Quantity Only' : 'Both Issues'}
              <button onClick={() => setActiveFilters(f => ({ ...f, issueType: f.issueType.filter(v => v !== val) }))} className="ml-2 text-gray-500 hover:text-gray-700">×</button>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand SKU</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">KNOT SKU</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Colors</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ordered Qty</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Received Qty</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Passed QC Qty</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Failed QC Qty</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">QC Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredData.map((item, index) => (
              <tr key={index} className={getRowClass(item, index) + " hover:bg-blue-50 transition-colors duration-100"}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item["S.No"]}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 max-w-xs truncate" title={item["Brand SKU Code"]}>{item["Brand SKU Code"]}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 max-w-xs truncate" title={item["KNOT SKU Code"]}>{item["KNOT SKU Code"]}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item["Size"]}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item["Colors"]}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item["Ordered Qty"]}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item["Received Qty"]}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item["Passed QC Qty"]}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item["Failed QC Qty"]}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span 
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${customGetStatusColor ? customGetStatusColor(item.Status) : getStatusColor(item.Status)}`}
                    onMouseEnter={(e) => handleMouseEnter(e, item.Status)}
                    onMouseLeave={handleMouseLeave}
                  >
                    {item.Status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getQCStatusColor(item["QC Status"])}`}>{item["QC Status"]}</span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate" title={item["Remarks"]}>{item["Remarks"]}</td>
              </tr>
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
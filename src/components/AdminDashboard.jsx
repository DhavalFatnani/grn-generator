import React, { useState, useEffect } from 'react';
import { getTeamMembers, addTeamMember, removeTeamMember, updateTeamMember, resetTeamMembers } from '../utils/supabaseTeamStorage';
import { clearAdminSession, getCurrentAdmin } from '../utils/supabaseAuth';
import { getGRNLogs, deleteGRNLog, clearAllGRNLogs, getGRNLogById } from '../utils/supabaseGRNStorage';
import { downloadCSV, downloadHTML, downloadPDF, generateExcelWorkbook } from '../utils/exportUtils';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';

const CATEGORY_LABELS = {
  warehouseNos: 'Warehouse Numbers',
  qcPersons: 'QC Persons',
  supervisors: 'Supervisors',
  warehouseManagers: 'Warehouse Managers'
};

const CATEGORY_ICONS = {
  warehouseNos: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  qcPersons: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  supervisors: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  warehouseManagers: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
};

export const AdminDashboard = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('team');
  const [teamMembers, setTeamMembers] = useState({ warehouseNos: [], qcPersons: [], supervisors: [], warehouseManagers: [] });
  const [editingItem, setEditingItem] = useState({ category: null, index: null, value: '' });
  const [newItem, setNewItem] = useState({ category: '', value: '' });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [grnLogs, setGrnLogs] = useState([]);
  const [filteredGrnLogs, setFilteredGrnLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    brand: '',
    createdBy: '',
    dateFrom: '',
    dateTo: '',
    minAccuracy: '',
    maxAccuracy: '',
    minItems: '',
    maxItems: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // Load team members and GRN logs
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const members = await getTeamMembers();
        setTeamMembers(members);
        const logs = await getGRNLogs();
        setGrnLogs(logs);
        setFilteredGrnLogs(logs);
      } catch (error) {
        console.error('Error loading data:', error);
        showMessage('error', 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Refresh GRN logs when tab changes
  useEffect(() => {
    if (activeTab === 'grn') {
      const loadLogs = async () => {
        try {
          const logs = await getGRNLogs();
          setGrnLogs(logs);
          setFilteredGrnLogs(logs);
        } catch (error) {
          console.error('Error loading GRN logs:', error);
        }
      };
      loadLogs();
    }
  }, [activeTab]);

  // Apply filters whenever filters or grnLogs change
  useEffect(() => {
    if (activeTab === 'grn') {
      let filtered = [...grnLogs];

      // Search filter (document number, brand name)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(log => 
          log.documentNumber?.toLowerCase().includes(searchLower) ||
          log.grnHeaderInfo?.brandName?.toLowerCase().includes(searchLower) ||
          log.grnHeaderInfo?.replenishmentNumber?.toLowerCase().includes(searchLower)
        );
      }

      // Brand filter
      if (filters.brand) {
        filtered = filtered.filter(log => 
          log.grnHeaderInfo?.brandName === filters.brand
        );
      }

      // Created by filter
      if (filters.createdBy) {
        filtered = filtered.filter(log => 
          log.createdBy === filters.createdBy
        );
      }

      // Date range filter
      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        filtered = filtered.filter(log => {
          const logDate = new Date(log.createdAt);
          return logDate >= fromDate;
        });
      }

      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999); // Include entire day
        filtered = filtered.filter(log => {
          const logDate = new Date(log.createdAt);
          return logDate <= toDate;
        });
      }

      // Accuracy range filter
      if (filters.minAccuracy) {
        const minAcc = parseInt(filters.minAccuracy);
        filtered = filtered.filter(log => 
          (log.summary?.receiptAccuracy || 0) >= minAcc
        );
      }

      if (filters.maxAccuracy) {
        const maxAcc = parseInt(filters.maxAccuracy);
        filtered = filtered.filter(log => 
          (log.summary?.receiptAccuracy || 0) <= maxAcc
        );
      }

      // Item count range filter
      if (filters.minItems) {
        const minItems = parseInt(filters.minItems);
        filtered = filtered.filter(log => 
          (log.itemCount || 0) >= minItems
        );
      }

      if (filters.maxItems) {
        const maxItems = parseInt(filters.maxItems);
        filtered = filtered.filter(log => 
          (log.itemCount || 0) <= maxItems
        );
      }

      setFilteredGrnLogs(filtered);
    }
  }, [filters, grnLogs, activeTab]);

  // Get unique values for filter dropdowns
  const uniqueBrands = [...new Set(grnLogs.map(log => log.grnHeaderInfo?.brandName).filter(Boolean))].sort();
  const uniqueCreators = [...new Set(grnLogs.map(log => log.createdBy).filter(Boolean))].sort();

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      brand: '',
      createdBy: '',
      dateFrom: '',
      dateTo: '',
      minAccuracy: '',
      maxAccuracy: '',
      minItems: '',
      maxItems: ''
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const handleAdd = async (category) => {
    const value = newItem.value.trim();
    if (!value) {
      showMessage('error', 'Please enter a value');
      return;
    }

    if (teamMembers[category].includes(value)) {
      showMessage('error', 'Item already exists');
      return;
    }

    const result = await addTeamMember(category, value);
    if (result.success) {
      const updated = await getTeamMembers();
      setTeamMembers(updated);
      setNewItem({ category: '', value: '' });
      showMessage('success', 'Item added successfully');
    } else {
      showMessage('error', result.error || 'Failed to save item');
    }
  };

  const handleDelete = async (category, value) => {
    if (window.confirm(`Are you sure you want to delete "${value}"?`)) {
      const result = await removeTeamMember(category, value);
      if (result.success) {
        const updated = await getTeamMembers();
        setTeamMembers(updated);
        showMessage('success', 'Item deleted successfully');
      } else {
        showMessage('error', result.error || 'Failed to delete item');
      }
    }
  };

  const handleEditStart = (category, value) => {
    setEditingItem({ category, index: teamMembers[category].indexOf(value), value });
  };

  const handleEditSave = async (category) => {
    const newValue = editingItem.value.trim();
    if (!newValue) {
      showMessage('error', 'Please enter a value');
      return;
    }

    const oldValue = teamMembers[category][editingItem.index];
    if (oldValue === newValue) {
      setEditingItem({ category: null, index: null, value: '' });
      return;
    }

    if (teamMembers[category].includes(newValue) && oldValue !== newValue) {
      showMessage('error', 'Item already exists');
      return;
    }

    const result = await updateTeamMember(category, oldValue, newValue);
    if (result.success) {
      const updated = await getTeamMembers();
      setTeamMembers(updated);
      setEditingItem({ category: null, index: null, value: '' });
      showMessage('success', 'Item updated successfully');
    } else {
      showMessage('error', result.error || 'Failed to update item');
    }
  };

  const handleEditCancel = () => {
    setEditingItem({ category: null, index: null, value: '' });
  };

  const handleReset = async () => {
    if (window.confirm('Are you sure you want to reset all team members? This will clear all data.')) {
      const result = await resetTeamMembers();
      if (result.success) {
        const updated = await getTeamMembers();
        setTeamMembers(updated);
        showMessage('success', 'Team members reset successfully');
      } else {
        showMessage('error', result.error || 'Failed to reset team members');
      }
    }
  };

  const handleLogout = () => {
    clearAdminSession();
    onLogout();
  };

  // GRN Management handlers
  const handleDeleteGRN = async (id) => {
    if (window.confirm('Are you sure you want to delete this GRN log?')) {
      const result = await deleteGRNLog(id);
      if (result.success) {
        const logs = await getGRNLogs();
        setGrnLogs(logs);
        showMessage('success', 'GRN log deleted successfully');
      } else {
        showMessage('error', result.error || 'Failed to delete GRN log');
      }
    }
  };

  const handleClearAllGRNs = async () => {
    if (window.confirm('Are you sure you want to delete ALL GRN logs? This action cannot be undone.')) {
      const result = await clearAllGRNLogs();
      if (result.success) {
        setGrnLogs([]);
        showMessage('success', 'All GRN logs cleared successfully');
      } else {
        showMessage('error', result.error || 'Failed to clear GRN logs');
      }
    }
  };

  const handleViewGRN = async (log) => {
    if (!log.fullData) {
      const fullLog = await getGRNLogById(log.id);
      if (fullLog) {
        setSelectedLog(fullLog);
      } else {
        showMessage('error', 'Failed to load GRN details');
      }
    } else {
      setSelectedLog(log);
    }
  };

  const handleCloseGRNDetails = () => {
    setSelectedLog(null);
  };

  const handleDownloadGRN = async (log, format) => {
    let grnData = log.fullData;
    let grnHeaderInfo = log.grnHeaderInfo;

    if (!grnData) {
      const fullLog = await getGRNLogById(log.id);
      if (!fullLog || !fullLog.fullData) {
        showMessage('error', 'Full GRN data not available for this log');
        return;
      }
      grnData = fullLog.fullData;
      grnHeaderInfo = fullLog.grnHeaderInfo;
    }

    try {
      if (format === 'csv') {
        downloadCSV(grnData, grnHeaderInfo, { 
          purchaseOrderData: [],
          putAwayData: [],
          qcFailData: []
        });
      } else if (format === 'html') {
        downloadHTML(grnData, grnHeaderInfo, {});
      } else if (format === 'pdf') {
        downloadPDF(grnData, grnHeaderInfo, {});
      }
      showMessage('success', `GRN downloaded as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error downloading GRN:', error);
      showMessage('error', 'Failed to download GRN');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDownloadAllGRNs = async () => {
    if (filteredGrnLogs.length === 0) {
      showMessage('error', 'No GRN logs to download');
      return;
    }

    try {
      showMessage('success', `Preparing ${filteredGrnLogs.length} GRN files for download...`);
      
      const zip = new JSZip();
      let processedCount = 0;
      let errorCount = 0;

      // Process each GRN log
      for (const log of filteredGrnLogs) {
        try {
          let grnData = log.fullData;
          let grnHeaderInfo = log.grnHeaderInfo;

          // Fetch full data if not available
          if (!grnData) {
            const fullLog = await getGRNLogById(log.id);
            if (!fullLog || !fullLog.fullData) {
              errorCount++;
              continue;
            }
            grnData = fullLog.fullData;
            grnHeaderInfo = fullLog.grnHeaderInfo;
          }

          // Get original source data from header info (persisted in Supabase JSONB field)
          // This data persists even after browser closes and is retrieved from database
          const sourceData = grnHeaderInfo?.sourceData || {};
          const purchaseOrderData = Array.isArray(sourceData.purchaseOrderData) ? sourceData.purchaseOrderData : [];
          const putAwayData = Array.isArray(sourceData.putAwayData) ? sourceData.putAwayData : [];
          const qcFailData = Array.isArray(sourceData.qcFailData) ? sourceData.qcFailData : [];

          // Log retrieved data for verification
          console.log(`Retrieved source data for GRN ${log.documentNumber}:`, {
            poRows: purchaseOrderData.length,
            putawayRows: putAwayData.length,
            qcFailRows: qcFailData.length,
            hasSourceData: !!grnHeaderInfo?.sourceData
          });

          // Ensure we have the same header info structure as main app (merge with defaults)
          const mergedHeaderInfo = {
            ...grnHeaderInfo,
            // Remove sourceData from headerInfo before passing to exporter
            // (sourceData is only used for generating sheets, not for header display)
            sourceData: undefined
          };

          // Generate Excel workbook with all sheets (exactly same as main app download)
          // isFilteredExport: false ensures PO, Putaway, QC Fail sheets are included if data exists
          // This matches the exact structure when downloading from main app
          const wb = generateExcelWorkbook(grnData, mergedHeaderInfo, {
            isFilteredExport: false, // Same as main app - includes all sheets
            purchaseOrderData: purchaseOrderData,
            putAwayData: putAwayData,
            qcFailData: qcFailData
          });

          if (!wb) {
            errorCount++;
            continue;
          }

          // Convert workbook to buffer
          const excelBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
          
          // Generate filename
          const dateStr = new Date(log.createdAt).toISOString().split('T')[0].replace(/-/g, '');
          const brandName = (grnHeaderInfo?.brandName || 'Unknown').replace(/\s+/g, '');
          const replenishmentNumber = grnHeaderInfo?.replenishmentNumber || 'N/A';
          const filename = `${log.documentNumber || `GRN-${dateStr}-${brandName}-${replenishmentNumber}`}.xlsx`;

          // Add to ZIP
          zip.file(filename, excelBuffer);
          processedCount++;
        } catch (error) {
          console.error(`Error processing GRN ${log.id}:`, error);
          errorCount++;
        }
      }

      if (processedCount === 0) {
        showMessage('error', 'No GRN files could be generated');
        return;
      }

      // Generate ZIP file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // Create download link
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      
      // Generate ZIP filename with filter info
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/:/g, '-');
      let zipFilename = `all-grns-${dateStr}-${timeStr}`;
      if (hasActiveFilters) {
        zipFilename += '-filtered';
      }
      zipFilename += '.zip';
      
      a.download = zipFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (errorCount > 0) {
        showMessage('warning', `Downloaded ${processedCount} GRN files. ${errorCount} files failed to process.`);
      } else {
        showMessage('success', `Successfully downloaded ${processedCount} GRN files as ZIP`);
      }
    } catch (error) {
      console.error('Error downloading all GRNs:', error);
      showMessage('error', 'Failed to download GRN files');
    }
  };

  const totalTeamMembers = Object.values(teamMembers).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 transition-all duration-300 flex-shrink-0 fixed lg:static h-screen z-50 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-full flex flex-col">
          {/* Logo/Header */}
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              {sidebarOpen && (
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-lg font-bold text-gray-900">Admin Portal</h1>
                    <p className="text-xs text-gray-700">GRN Generator</p>
                  </div>
                </div>
              )}
              {!sidebarOpen && (
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              )}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarOpen ? "M11 19l-7-7 7-7m8 14l-7-7 7-7" : "M13 5l7 7-7 7M5 5l7 7-7 7"} />
                </svg>
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 sm:p-4 space-y-2">
            <button
              onClick={() => setActiveTab('team')}
              className={`w-full flex items-center ${sidebarOpen ? 'justify-start px-4' : 'justify-center'} py-3 rounded-lg transition-all duration-200 ${
                activeTab === 'team'
                  ? 'bg-blue-50 text-blue-600 font-semibold'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {sidebarOpen && <span className="ml-3">Team Management</span>}
            </button>
            <button
              onClick={() => setActiveTab('grn')}
              className={`w-full flex items-center ${sidebarOpen ? 'justify-start px-4' : 'justify-center'} py-3 rounded-lg transition-all duration-200 ${
                activeTab === 'grn'
                  ? 'bg-blue-50 text-blue-600 font-semibold'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {sidebarOpen && <span className="ml-3">GRN Management</span>}
            </button>
          </nav>

          {/* User Info & Logout */}
          <div className="p-3 sm:p-4 border-t border-gray-200">
            {sidebarOpen && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-700 mb-1">Logged in as</p>
                <p className="text-sm font-semibold text-gray-900">{getCurrentAdmin() || 'Admin'}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center px-4 py-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {sidebarOpen && <span className="ml-2">Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden lg:ml-0">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="min-w-0">
                <h2 className="text-xl sm:text-xl sm:text-2xl font-bold text-gray-900">
                  {activeTab === 'team' ? 'Team Management' : 'GRN Management'}
                </h2>
                <p className="text-xs sm:text-sm text-gray-700 mt-1">
                  {activeTab === 'team' 
                    ? `Manage ${totalTeamMembers} team members across ${Object.keys(teamMembers).length} categories`
                    : `View and manage ${grnLogs.length} GRN logs`
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Message Toast */}
        {message.text && (
          <div className={`mx-4 sm:mx-6 mt-4 p-4 rounded-lg shadow-lg border-l-4 ${
            message.type === 'success' 
              ? 'bg-green-50 border-green-500 text-green-700'
              : 'bg-red-50 border-red-500 text-red-700'
          } flex items-center animate-slide-in`}>
            <svg className={`w-5 h-5 mr-3 ${message.type === 'success' ? 'text-green-500' : 'text-red-500'}`} fill="currentColor" viewBox="0 0 20 20">
              {message.type === 'success' ? (
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              )}
            </svg>
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {/* Content Area */}
        <div className="p-4 sm:p-6">
          {activeTab === 'team' ? (
            <div className="space-y-4 sm:space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.keys(CATEGORY_LABELS).map((category) => (
                  <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm text-gray-700 mb-1">{CATEGORY_LABELS[category]}</p>
                        <p className="text-2xl font-bold text-gray-900">{teamMembers[category].length}</p>
                      </div>
                      <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                        {CATEGORY_ICONS[category]}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Team Member Categories */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
                {Object.keys(CATEGORY_LABELS).map((category) => (
                  <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 sm:p-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 flex-shrink-0 rounded-lg flex items-center justify-center text-white">
                          {CATEGORY_ICONS[category]}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">{CATEGORY_LABELS[category]}</h3>
                          <p className="text-xs sm:text-sm text-gray-700">{teamMembers[category].length} members</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 sm:p-5">
                      {/* Add New Item */}
                      <div className="mb-4 flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={newItem.category === category ? newItem.value : ''}
                          onChange={(e) => setNewItem({ category, value: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleAdd(category);
                            }
                          }}
                          placeholder={`Add new ${CATEGORY_LABELS[category].toLowerCase()}`}
                          className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm sm:text-base"
                        />
                        <button
                          onClick={() => handleAdd(category)}
                          className="px-4 sm:px-5 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-sm hover:shadow-md text-sm sm:text-base"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>

                      {/* Items List */}
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {teamMembers[category].length === 0 ? (
                          <div className="text-center py-8 text-gray-700">
                            <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                            <p className="text-sm">No items yet</p>
                          </div>
                        ) : (
                          teamMembers[category].map((item, index) => (
                            <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group">
                              {editingItem.category === category && editingItem.index === index ? (
                                <>
                                  <input
                                    type="text"
                                    value={editingItem.value}
                                    onChange={(e) => setEditingItem({ ...editingItem, value: e.target.value })}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleEditSave(category);
                                      } else if (e.key === 'Escape') {
                                        handleEditCancel();
                                      }
                                    }}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleEditSave(category)}
                                    className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={handleEditCancel}
                                    className="p-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </>
                              ) : (
                                <>
                                  <span className="flex-1 text-gray-900 font-medium">{item}</span>
                                  <button
                                    onClick={() => handleEditStart(category, item)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleDelete(category, item)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reset Button */}
              <div className="flex justify-center">
                <button
                  onClick={handleReset}
                  className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                >
                  Reset All Team Members
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Filters Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm sm:text-base"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                      </svg>
                      <span className="font-medium">Filters</span>
                      {hasActiveFilters && (
                        <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                          {Object.values(filters).filter(v => v !== '').length}
                        </span>
                      )}
                    </button>
                    {hasActiveFilters && (
                      <button
                        onClick={clearFilters}
                        className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white hover:text-white transition-colors rounded-lg"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="text-xs sm:text-sm text-gray-600">
                      Showing {filteredGrnLogs.length} of {grnLogs.length} GRNs
                    </div>
                    {filteredGrnLogs.length > 0 && (
                      <button
                        onClick={handleDownloadAllGRNs}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                        title="Download all filtered GRN files as ZIP"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download All ({filteredGrnLogs.length}) as ZIP
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Search */}
                <div className="mb-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search by document number, brand, or replenishment number..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      className="block w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Advanced Filters */}
                {showFilters && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                    {/* Brand Filter */}
                    <div className="min-w-0">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Brand/Vendor
                      </label>
                      <select
                        value={filters.brand}
                        onChange={(e) => handleFilterChange('brand', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      >
                        <option value="">All Brands</option>
                        {uniqueBrands.map(brand => (
                          <option key={brand} value={brand}>{brand}</option>
                        ))}
                      </select>
                    </div>

                    {/* Created By Filter */}
                    <div className="min-w-0">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Created By
                      </label>
                      <select
                        value={filters.createdBy}
                        onChange={(e) => handleFilterChange('createdBy', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      >
                        <option value="">All Users</option>
                        {uniqueCreators.map(creator => (
                          <option key={creator} value={creator}>{creator}</option>
                        ))}
                      </select>
                    </div>

                    {/* Date From */}
                    <div className="min-w-0">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Date From
                      </label>
                      <input
                        type="date"
                        value={filters.dateFrom}
                        onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>

                    {/* Date To */}
                    <div className="min-w-0">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Date To
                      </label>
                      <input
                        type="date"
                        value={filters.dateTo}
                        onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>

                    {/* Min Accuracy */}
                    <div className="min-w-0">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Min Accuracy (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="0"
                        value={filters.minAccuracy}
                        onChange={(e) => handleFilterChange('minAccuracy', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>

                    {/* Max Accuracy */}
                    <div className="min-w-0">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Max Accuracy (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="100"
                        value={filters.maxAccuracy}
                        onChange={(e) => handleFilterChange('maxAccuracy', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>

                    {/* Min Items */}
                    <div className="min-w-0">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Min Items
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={filters.minItems}
                        onChange={(e) => handleFilterChange('minItems', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>

                    {/* Max Items */}
                    <div className="min-w-0">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Max Items
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Any"
                        value={filters.maxItems}
                        onChange={(e) => handleFilterChange('maxItems', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* GRN Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
                  <p className="text-xs sm:text-sm text-gray-700 mb-1">Total GRNs</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{filteredGrnLogs.length}</p>
                  {hasActiveFilters && (
                    <p className="text-xs text-gray-600 mt-1">
                      of {grnLogs.length} total
                    </p>
                  )}
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
                  <p className="text-xs sm:text-sm text-gray-700 mb-1">Total Items</p>
                  <p className="text-xl sm:text-xl sm:text-2xl font-bold text-gray-900">
                    {filteredGrnLogs.reduce((sum, log) => sum + (log.itemCount || 0), 0)}
                  </p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
                  <p className="text-xs sm:text-sm text-gray-700 mb-1">Total Received</p>
                  <p className="text-xl sm:text-xl sm:text-2xl font-bold text-gray-900">
                    {filteredGrnLogs.reduce((sum, log) => sum + (log.summary?.totalReceivedUnits || 0), 0)}
                  </p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
                  <p className="text-xs sm:text-sm text-gray-700 mb-1">Avg Accuracy</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {filteredGrnLogs.length > 0 
                      ? Math.round(filteredGrnLogs.reduce((sum, log) => sum + (log.summary?.receiptAccuracy || 0), 0) / filteredGrnLogs.length)
                      : 0}%
                  </p>
                </div>
              </div>

              {/* GRN Logs Table */}
              {loading ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-700">Loading GRN logs...</p>
                </div>
              ) : filteredGrnLogs.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                  {hasActiveFilters ? (
                    <>
                      <svg className="w-16 h-16 mx-auto mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                      </svg>
                      <p className="text-lg font-semibold text-gray-900 mb-2">No GRN logs match your filters</p>
                      <p className="text-sm text-gray-700 mb-4">
                        Try adjusting your filter criteria
                      </p>
                      <button
                        onClick={clearFilters}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                      >
                        Clear Filters
                      </button>
                    </>
                  ) : (
                    <>
                      <svg className="w-16 h-16 mx-auto mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-lg font-semibold text-gray-900 mb-2">No GRN logs found</p>
                      <p className="text-sm text-gray-500">
                        GRN logs will appear here when GRNs are generated in the main application
                      </p>
                    </>
                  )}
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden admin-dashboard">
                  <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-900">GRN Logs</h3>
                    {grnLogs.length > 0 && (
                      <button
                        onClick={handleClearAllGRNs}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <table className="w-full min-w-[800px]">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50">Document No.</th>
                          <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50">Brand</th>
                          <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50">Items</th>
                          <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50">Received</th>
                          <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50">Accuracy</th>
                          <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50">Created By</th>
                          <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50">Date</th>
                          <th className="px-4 sm:px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-transparent">
                        {filteredGrnLogs.map((log) => (
                          <tr key={log.id}>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-medium text-gray-900">{log.documentNumber}</span>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-700">{log.grnHeaderInfo?.brandName || 'N/A'}</span>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-700">{log.itemCount}</span>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-700">{log.summary?.totalReceivedUnits || 0}</span>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {log.summary?.receiptAccuracy || 0}%
                              </span>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-700">{log.createdBy || 'Unknown'}</span>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-700">{formatDate(log.createdAt)}</span>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleViewGRN(log)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="View Details"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDownloadGRN(log, 'csv')}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Download Excel"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteGRN(log.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* GRN Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-slide-up">
            <div className="p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900">GRN Details</h3>
                  <p className="text-sm text-gray-700 mt-1">{selectedLog.documentNumber}</p>
                </div>
                <button
                  onClick={handleCloseGRNDetails}
                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Header Information */}
              <div className="min-w-0">
                <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Header Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Brand/Vendor', value: selectedLog.grnHeaderInfo?.brandName || 'N/A' },
                    { label: 'Replenishment Number', value: selectedLog.grnHeaderInfo?.replenishmentNumber || 'N/A' },
                    { label: 'Warehouse', value: selectedLog.grnHeaderInfo?.warehouseNo || 'N/A' },
                    { label: 'Inward Date', value: selectedLog.grnHeaderInfo?.inwardDate || 'N/A' }
                  ].map((item, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-700 mb-1">{item.label}</p>
                      <p className="text-sm font-medium text-gray-900">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary Statistics */}
              {selectedLog.summary && (
                <div className="min-w-0">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Summary Statistics
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Total Ordered', value: selectedLog.summary.totalOrderedUnits },
                      { label: 'Total Received', value: selectedLog.summary.totalReceivedUnits },
                      { label: 'Receipt Accuracy', value: `${selectedLog.summary.receiptAccuracy}%` },
                      { label: 'Items Count', value: selectedLog.itemCount }
                    ].map((stat, idx) => (
                      <div key={idx} className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg">
                        <p className="text-xs text-gray-700 mb-1">{stat.label}</p>
                        <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Download Actions */}
              <div className="pt-4 border-t border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Download Options</h4>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleDownloadGRN(selectedLog, 'csv')}
                    className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    Download Excel
                  </button>
                  <button
                    onClick={() => handleDownloadGRN(selectedLog, 'html')}
                    className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    Download HTML
                  </button>
                  <button
                    onClick={() => handleDownloadGRN(selectedLog, 'pdf')}
                    className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    Download PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

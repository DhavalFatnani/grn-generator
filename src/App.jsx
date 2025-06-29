import React, { useState, useCallback, useEffect } from "react";
import "./App.css";
import { FileUploadBox } from "./components/FileUploadBox";
import { HeaderForm } from "./components/HeaderForm";
import { GRNTable } from "./components/GRNTable";
import { DataPreviewModal } from "./components/DataPreviewModal";
import { useFileUpload } from "./hooks/useFileUpload";
import { useGRNGenerator } from "./hooks/useGRNGenerator";
import { downloadCSV, downloadHTML, downloadPDF } from "./utils/exportUtils";
import { getStatusColor } from "./utils/helpers.js";
import { DEFAULT_VALUES, INITIAL_GRN_HEADER, TEST_DATA_TEMPLATES } from "./utils/constants.js";

const THEME_KEY = 'grnTheme';

// Theme Context
const ThemeContext = React.createContext();

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

const useTheme = () => React.useContext(ThemeContext);

const GRNGenerator = () => {
  // File upload state and handlers
  const {
    data,
    loading: fileLoading,
    errors: fileErrors,
    grnHeaderInfo: fileHeaderInfo,
    columnMapping,
    previewModal,
    setPreviewModal,
    handlePurchaseOrderUpload,
    handlePutAwayUpload,
    handleQcFailUpload,
    clearData,
    clearAllData,
  } = useFileUpload();

  const [grnHeaderInfo, setGrnHeaderInfo] = useState({
    ...INITIAL_GRN_HEADER,
    qcDoneBy: [],
    qcPerformed: false,
  });

  // Previous values for dropdowns
  const [previousValues, setPreviousValues] = useState(DEFAULT_VALUES);
  const [skuCodeType, setSkuCodeType] = useState("BRAND");

  // GRN generation hook
  const {
    grnData,
    loading: grnLoading,
    errors: grnErrors,
    generateGRN,
  } = useGRNGenerator();

  // Filter and Search State
  const [activeFilters, setActiveFilters] = useState({
    status: [],
    qcStatus: [],
    issueType: [],
  });
  const [search, setSearch] = useState('');

  // Test Mode State
  const [testMode, setTestMode] = useState(() => {
    // Persist test mode in localStorage
    return localStorage.getItem('grnTestMode') === 'true';
  });

  const { isDark, toggleTheme } = useTheme();

  const [acknowledgeOnly, setAcknowledgeOnly] = useState(false);

  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  // Keyboard shortcut: Ctrl+Shift+T (or Cmd+Shift+T)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;
      // Support Cmd+Shift+T and Cmd+Shift+Return (Enter) on Mac
      const isTestModeShortcut = ctrlOrCmd && e.shiftKey && (
        e.key.toLowerCase() === 't' || (isMac && (e.key === 'Enter' || e.key === 'Return'))
      );
      if (isTestModeShortcut) {
        setTestMode((prev) => {
          const next = !prev;
          localStorage.setItem('grnTestMode', next ? 'true' : 'false');
          return next;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Optionally, auto-fill test data when test mode is activated
  useEffect(() => {
    if (testMode) {
      // Load standard test template
      const template = TEST_DATA_TEMPLATES.standard;
      if (template) {
        setGrnHeaderInfo((prev) => ({ ...prev, ...template.grnHeaderInfo }));
        setPreviousValues(template.previousValues);
      }
    }
  }, [testMode]);

  // Update header info when file header info changes
  useEffect(() => {
      setGrnHeaderInfo((prev) => ({
        ...prev,
        ...fileHeaderInfo,
      }));
  }, [fileHeaderInfo]);

  const handleHeaderChange = useCallback((e) => {
    const { name, value } = e.target;
    setGrnHeaderInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  // Download handlers
  const getFilterSummaryForFilename = (filters, search) => {
    let parts = [];
    if (search) parts.push(`search-${search}`);
    if (filters.status && filters.status.length > 0) parts.push(`status-${filters.status.join("_")}`);
    if (filters.qcStatus && filters.qcStatus.length > 0) parts.push(`qc-${filters.qcStatus.join("_")}`);
    if (filters.issueType && filters.issueType.length > 0) parts.push(`issue-${filters.issueType.join("_")}`);
    return parts.length > 0 ? parts.join("_") : null;
  };

  const handleDownloadCSV = useCallback(() => {
    if (!grnData?.length || !grnHeaderInfo?.brandName || !grnHeaderInfo?.replenishmentNumber) {
      console.error('Missing required data for CSV download');
      return;
    }
    const mergedHeaderInfo = { ...INITIAL_GRN_HEADER, ...grnHeaderInfo };
    downloadCSV(grnData, mergedHeaderInfo, { filterSummary: null });
  }, [grnData, grnHeaderInfo]);

  const handleDownloadFilteredCSV = useCallback(() => {
    const filteredData = getFilteredData();
    if (!filteredData?.length || !grnHeaderInfo?.brandName || !grnHeaderInfo?.replenishmentNumber) {
      console.error('Missing required data for filtered CSV download');
      return;
    }
    const mergedHeaderInfo = { ...INITIAL_GRN_HEADER, ...grnHeaderInfo };
    const filterSummary = getFilterSummaryForFilename(activeFilters, search);
    downloadCSV(filteredData, mergedHeaderInfo, { isFilteredExport: true, filterSummary });
  }, [grnData, activeFilters, search, grnHeaderInfo]);

  const handleDownloadGRN = useCallback(() => {
    const filterSummary = getFilterSummaryForFilename(activeFilters, search);
    downloadHTML(grnData, grnHeaderInfo, { filterSummary });
  }, [grnData, grnHeaderInfo, activeFilters, search]);

  const handleDownloadPDF = useCallback(() => {
    if (!grnData?.length || !grnHeaderInfo?.brandName || !grnHeaderInfo?.replenishmentNumber) {
      console.error('Missing required data for PDF download');
      return;
    }
    const filterSummary = getFilterSummaryForFilename(activeFilters, search);
    downloadPDF(grnData, grnHeaderInfo, { filterSummary });
  }, [grnData, grnHeaderInfo, activeFilters, search]);

  // Filtering Logic
  const getFilteredData = useCallback(() => {
    const qcPerformed = grnHeaderInfo.qcPerformed;
    return grnData.filter(item => {
      // Search filter
      if (search) {
        const brand = (item["Brand SKU Code"] || '').toString().toLowerCase();
        const knot = (item["KNOT SKU Code"] || '').toString().toLowerCase();
        if (!brand.includes(search.toLowerCase()) && !knot.includes(search.toLowerCase())) {
          return false;
        }
      }
      // Status filter
      if (activeFilters.status.length > 0 && !activeFilters.status.includes(item.Status)) {
        return false;
      }
      // QC Status filter
      if (qcPerformed && activeFilters.qcStatus.length > 0 && !activeFilters.qcStatus.includes(item["QC Status"])) {
        return false;
      }
      // Issue type filter
      if (activeFilters.issueType.length > 0) {
        const hasQCIssue = qcPerformed && item["QC Status"] !== "Passed" && item["QC Status"] !== "Not Performed";
        const hasQtyIssue = ["Shortage", "Excess", "Not Received", "Excess Receipt", "Shortage & QC Failed", "Excess & QC Failed"].includes(item.Status);

        const issueConditions = {
          qcOnly: hasQCIssue && !hasQtyIssue,
          qtyOnly: !hasQCIssue && hasQtyIssue,
          bothIssues: hasQCIssue && hasQtyIssue,
        };

        if (!activeFilters.issueType.some(issue => issueConditions[issue])) {
          return false;
        }
      }
      return true;
    });
  }, [grnData, activeFilters, search, grnHeaderInfo.qcPerformed]);

  const filteredData = getFilteredData();

  useEffect(() => {
    console.log('activeFilters:', activeFilters);
    console.log('filteredData:', filteredData);
  }, [activeFilters, filteredData]);

  // Filter Handlers
  const handleFilterChange = useCallback((filterType, value) => {
    console.log('handleFilterChange', filterType, value);
    setActiveFilters(prev => ({
      ...prev,
      [filterType]: prev[filterType].includes(value)
        ? prev[filterType].filter(v => v !== value)
        : [...prev[filterType], value],
    }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setActiveFilters({ status: [], qcStatus: [], issueType: [] });
    setSearch('');
  }, []);

  // Generate GRN data
  const handleGenerateGRN = useCallback(() => {
    generateGRN({
      purchaseOrderData: acknowledgeOnly ? [] : data.purchaseOrder,
      putAwayData: data.putAway,
      qcFailData: data.qcFail,
      skuCodeType,
      grnHeaderInfo,
      columnMapping,
      acknowledgeOnly,
    });
  }, [data, grnHeaderInfo, columnMapping, generateGRN, skuCodeType, acknowledgeOnly]);

  // Clear all data
  const handleClearAll = useCallback(() => {
    clearAllData();
    setGrnHeaderInfo({
      ...INITIAL_GRN_HEADER,
      qcDoneBy: [],
      qcPerformed: false,
    });
  }, [clearAllData]);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showExportMenu && !event.target.closest('.sticky-export-bar')) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportMenu]);

  return (
    <div className="min-h-screen">
      {/* Integrated App Header */}
      <header className=" dark:from-gray-900 dark:via-gray-800 dark:to-gray-800 dark:border-gray-700/50 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center justify-center gap-4">
              {/* Logo with subtle background */}
              <div className="flex items-center justify-center w-10 h-10 bg-blue-500/10 rounded-lg dark:bg-blue-400/20 transition-colors duration-200">
                <img src="/logo.png" alt="KNOT Logo" className="w-6 h-6" />
              </div>
              
              {/* Title with better typography */}
              <div className="text-center">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400 mt-3 transition-colors duration-200">
                  GRN Generator
                </h1>
              </div>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? (
                <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
          </div>
        </div>
        
        {/* Subtle decorative element that flows into content */}
        <div className="h-1 bg-gradient-to-r from-transparent via-blue-200/30 to-transparent dark:via-gray-600/30 transition-colors duration-200"></div>
      </header>
      {/* Test Mode Banner */}
      {testMode && (
        <div className="fixed top-0 left-0 w-full z-50 bg-yellow-200 text-yellow-900 text-center py-2 font-semibold shadow animate-fade-in">
          Test Mode Active (toggle with Ctrl+Shift+T or Cmd+Shift+T/⏎)
        </div>
      )}
      <div className="py-8">
        {/* Main Card - single card for all content */}
        <div className="main-content w-full">
          {/* Upload Files Section */}
          <section className="px-8 py-10 border-b border-gray-100">
            <label className="checkbox-row mb-8 bg-[#f6f8fa] border border-gray-200 rounded-lg px-4 py-3" style={{ maxWidth: 420 }}>
              <input
                type="checkbox"
                checked={acknowledgeOnly}
                onChange={e => setAcknowledgeOnly(e.target.checked)}
                className="accent-blue-600"
              />
              <span>No Purchase Order (Acknowledge Only)</span>
            </label>
            <h2 className="text-2xl font-bold mb-6">Upload Files</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {!acknowledgeOnly && (
            <FileUploadBox
              title="Purchase Order"
              onFileUpload={handlePurchaseOrderUpload}
                onClear={() => clearData('purchaseOrder')}
                data={data.purchaseOrder}
                loading={fileLoading}
              required
                  sampleButtonSize="small"
            />
              )}
            <FileUploadBox
                title="Put Away"
              onFileUpload={handlePutAwayUpload}
                onClear={() => clearData('putAway')}
                data={data.putAway}
                loading={fileLoading}
              required
                sampleButtonSize="small"
            />
            <FileUploadBox
                title="QC Fail"
                onFileUpload={handleQcFailUpload}
                onClear={() => clearData('qcFail')}
                data={data.qcFail}
                loading={fileLoading}
              required={false}
                sampleButtonSize="small"
            />
          </div>
          </section>

          {/* File Upload Guidelines section (alt background, extra spacing) */}
          <section className="section-alt px-8 py-8 border-b border-gray-100 mt-14 mb-14">
            <h2 className="text-2xl font-bold mb-4">File Upload Guidelines</h2>
            <ul className="list-disc pl-6 text-base text-gray-700 space-y-1">
              <li><strong>Purchase Order:</strong> It should contain all metadata, vendor/brand info, and a table with columns like <em>Sno, Brand SKU Code, Size, Colors, Quantity, Unit Price, Amount</em>. Do not remove or edit header rows.</li>
              <li><strong>Put Away:</strong> Upload a CSV with columns <em>SKU</em> and <em>BIN</em>. Each row represents a single SKU that has been received and put away in its bin location. No extra metadata is needed.</li>
              <li><strong>QC Fail:</strong> Upload a CSV with columns <em>SKU</em> and <em>REMARK</em>. List only SKUs that failed QC, with a brief remark for each.</li>
              <li>All files must be in <strong>CSV</strong> format. Excel files should be saved/exported as CSV before uploading.</li>
              <li>Do not modify the structure or remove any columns from the original files.</li>
            </ul>
          </section>

          {/* Header Form */}
          <section className="px-8 py-10 border-b bg-white border-gray-100 mt-14 mb-14">
            <h2 className="text-2xl font-bold">GRN Header Information</h2>
            <p className="text-sm text-gray-600 mt-2 mb-6">
              Please verify and complete the following information. Fields marked with <span className="text-blue-500">*</span> are required.
            </p>
          <HeaderForm
            key={testMode ? 'test' : 'prod'}
            grnHeaderInfo={grnHeaderInfo}
            onHeaderChange={handleHeaderChange}
            previousValues={previousValues}
            setPreviousValues={setPreviousValues}
            testMode={testMode}
          />
          </section>

          {/* Generate Button */}
          <div className="flex justify-center mb-14 mt-8">
          <button
              className="btn"
            onClick={handleGenerateGRN}
              disabled={fileLoading || grnLoading || !data.putAway.length || (!acknowledgeOnly && !data.purchaseOrder.length)}
          >
              {grnLoading ? "Generating GRN..." : "Generate GRN"}
          </button>
        </div>

          {/* Error Display */}
          {(fileErrors.length > 0 || grnErrors.length > 0) && (
            <section className="mx-8 mb-10 p-4 rounded border bg-red-100 border-red-400 text-red-700">
              <h3 className="text-xl font-bold mb-2">Errors</h3>
              <ul className="list-disc list-inside space-y-1 text-base">
                {[...fileErrors, ...grnErrors].map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Modern Sticky Export Bar */}
          {grnData.length > 0 && (
            <div className="sticky-export-bar">
              <div className={`fab-menu ${showExportMenu ? 'show' : ''}`}>
                <button
                  type="button"
                  onClick={() => {
                    handleDownloadCSV();
                    setShowExportMenu(false);
                  }}
                  className="fab-menu-item"
                  aria-label="Download CSV"
                >
                  <span className="icon">📊</span>
                  Download CSV
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleDownloadGRN();
                    setShowExportMenu(false);
                  }}
                  className="fab-menu-item"
                  aria-label="Download GRN (HTML)"
                >
                  <span className="icon">🌐</span>
                  Download GRN (HTML)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleDownloadPDF();
                    setShowExportMenu(false);
                  }}
                  className="fab-menu-item"
                  aria-label="Download PDF"
                >
                  <span className="icon">📄</span>
                  Download PDF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGrnData([]);
                    setGrnHeaderInfo({});
                    setShowExportMenu(false);
                  }}
                  className="fab-menu-item danger"
                  aria-label="Clear All"
                >
                  <span className="icon">✖</span>
                  Clear All
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="fab-main"
                aria-label="Export Options"
                aria-expanded={showExportMenu}
              >
                ⬇
              </button>
            </div>
          )}

          {/* GRN Display Table (alt background, extra spacing) */}
        {grnData.length > 0 && (
            <section className="section-alt px-8 pb-10 mt-14 mb-8">
              <h2 className="text-2xl font-bold mb-6">GRN Table</h2>
            <GRNTable
              data={grnData}
              filteredData={filteredData}
              getStatusColor={getStatusColor}
              grnHeaderInfo={grnHeaderInfo}
              activeFilters={activeFilters}
              search={search}
              onFilterChange={handleFilterChange}
              onSearchChange={setSearch}
              onClearFilters={handleClearFilters}
              onDownloadFiltered={handleDownloadFilteredCSV}
            />
            </section>
          )}
          </div>
      </div>

      {/* Data Preview Modal */}
      {previewModal.isOpen && (
        <DataPreviewModal
          isOpen={previewModal.isOpen}
          onClose={() => setPreviewModal(prev => ({ ...prev, isOpen: false }))}
          onConfirm={previewModal.onConfirm}
          processedData={previewModal.processedData}
          fileType={previewModal.fileType}
          detectedHeaders={previewModal.detectedHeaders}
          rawData={previewModal.rawData}
          skuCodeType={skuCodeType}
          setSkuCodeType={setSkuCodeType}
          noPO={acknowledgeOnly || !data.purchaseOrder.length}
        />
      )}
    </div>
  );
};

// Main App wrapper with theme provider
const App = () => {
  return (
    <ThemeProvider>
      <GRNGenerator />
    </ThemeProvider>
  );
};

export default App; 

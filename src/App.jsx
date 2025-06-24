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

  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'light');

  useEffect(() => {
    document.body.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

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
  const handleDownloadCSV = useCallback(() => {
    if (!grnData?.length || !grnHeaderInfo?.brandName || !grnHeaderInfo?.replenishmentNumber) {
      console.error('Missing required data for CSV download');
      return;
    }
    const mergedHeaderInfo = { ...INITIAL_GRN_HEADER, ...grnHeaderInfo };
    downloadCSV(grnData, mergedHeaderInfo);
  }, [grnData, grnHeaderInfo]);

  const handleDownloadFilteredCSV = useCallback(() => {
    const filteredData = getFilteredData();
    if (!filteredData?.length || !grnHeaderInfo?.brandName || !grnHeaderInfo?.replenishmentNumber) {
      console.error('Missing required data for filtered CSV download');
      return;
    }
    const mergedHeaderInfo = { ...INITIAL_GRN_HEADER, ...grnHeaderInfo };
    downloadCSV(filteredData, mergedHeaderInfo, { isFilteredExport: true });
  }, [grnData, activeFilters, search, grnHeaderInfo]);

  const handleDownloadGRN = useCallback(() => {
    downloadHTML(grnData, grnHeaderInfo);
  }, [grnData, grnHeaderInfo]);

  const handleDownloadPDF = useCallback(() => {
    if (!grnData?.length || !grnHeaderInfo?.brandName || !grnHeaderInfo?.replenishmentNumber) {
      console.error('Missing required data for PDF download');
      return;
    }
    downloadPDF(grnData, grnHeaderInfo);
  }, [grnData, grnHeaderInfo]);

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

  // Filter Handlers
  const handleFilterChange = useCallback((filterType, value) => {
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
      purchaseOrderData: data.purchaseOrder,
      putAwayData: data.putAway,
      qcFailData: data.qcFail,
      skuCodeType,
      grnHeaderInfo,
      columnMapping,
    });
  }, [data, grnHeaderInfo, columnMapping, generateGRN, skuCodeType]);

  // Clear all data
  const handleClearAll = useCallback(() => {
    clearAllData();
    setGrnHeaderInfo({
      ...INITIAL_GRN_HEADER,
      qcDoneBy: [],
      qcPerformed: false,
    });
  }, [clearAllData]);

  return (
    <div className="min-h-screen">
      {/* Modern Professional Sticky Header */}
      <header className="sticky-header">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="KNOT Logo" style={{ height: 32, width: 32, borderRadius: 8 }} />
          <span className="logo">GRN Generator</span>
        </div>
        <div className="text-sm text-gray-500 font-medium">Professional Inventory Management</div>
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
            <h2 className="text-2xl font-bold mb-6">Upload Files</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FileUploadBox
                title="Purchase Order"
                onFileUpload={handlePurchaseOrderUpload}
                onClear={() => clearData('purchaseOrder')}
                data={data.purchaseOrder}
                loading={fileLoading}
                required
                sampleButtonSize="small"
              />
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
              disabled={fileLoading || grnLoading || !data.purchaseOrder.length || !data.putAway.length}
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

          {/* Modern Sticky Export Bar - floating and visually distinct */}
          {grnData.length > 0 && (
            <div className="sticky-export-bar animate-fade-in" style={{ zIndex: 300 }}>
              <button
                type="button"
                onClick={handleDownloadCSV}
                className="btn"
                aria-label="Download CSV"
              >
                Download CSV
              </button>
              <button
                type="button"
                onClick={handleDownloadGRN}
                className="btn secondary"
                aria-label="Download GRN (HTML)"
              >
                Download GRN (HTML)
              </button>
              <button
                type="button"
                onClick={handleDownloadPDF}
                className="btn secondary"
                aria-label="Download PDF"
              >
                Download PDF
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="btn secondary"
                aria-label="Clear All"
              >
                Clear All
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
        />
      )}
    </div>
  );
};

export default GRNGenerator; 

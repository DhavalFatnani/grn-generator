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
    <div className="min-h-screen bg-gray-50">
      {/* Test Mode Banner */}
      {testMode && (
        <div className="fixed top-0 left-0 w-full z-50 bg-yellow-200 text-yellow-900 text-center py-2 font-semibold shadow animate-fade-in">
          🧪 Test Mode Active (toggle with Ctrl+Shift+T or Cmd+Shift+T/⏎)
        </div>
      )}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">
            GRN Generator
          </h1>
          
          {/* File Upload Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              Upload Files
          </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FileUploadBox
              title="Purchase Order"
              onFileUpload={handlePurchaseOrderUpload}
                onClear={() => clearData('purchaseOrder')}
                data={data.purchaseOrder}
                loading={fileLoading}
              required
            />
            <FileUploadBox
                title="Put Away"
              onFileUpload={handlePutAwayUpload}
                onClear={() => clearData('putAway')}
                data={data.putAway}
                loading={fileLoading}
              required
            />
            <FileUploadBox
                title="QC Fail"
                onFileUpload={handleQcFailUpload}
                onClear={() => clearData('qcFail')}
                data={data.qcFail}
                loading={fileLoading}
              required={false}
            />
          </div>
        </div>

          {/* File Upload Guidelines section */}
          <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold text-blue-800 mb-2">File Upload Guidelines</h2>
            <ul className="list-disc pl-6 text-sm text-blue-900 space-y-1">
              <li><strong>Purchase Order:</strong> Upload the original PO file as downloaded from your ERP. It should contain all metadata, vendor/brand info, and a table with columns like <em>Sno, Brand SKU Code, Size, Colors, Quantity, Unit Price, Amount</em>. Do not remove or edit header rows.</li>
              <li><strong>Put Away:</strong> Upload a CSV with columns <em>SKU</em> and <em>BIN</em>. Each row represents a single SKU that has been received and put away in its bin location. No extra metadata is needed.</li>
              <li><strong>QC Fail:</strong> Upload a CSV with columns <em>SKU</em> and <em>REMARK</em>. List only SKUs that failed QC, with a brief remark for each.</li>
              <li>All files must be in <strong>CSV</strong> format. Excel files should be saved/exported as CSV before uploading.</li>
              <li>Do not modify the structure or remove any columns from the original files.</li>
            </ul>
          </div>

          {/* Header Form */}
          <HeaderForm
            key={testMode ? 'test' : 'prod'}
            grnHeaderInfo={grnHeaderInfo}
            onHeaderChange={handleHeaderChange}
            previousValues={previousValues}
            setPreviousValues={setPreviousValues}
            testMode={testMode}
          />

          {/* Generate Button */}
          <div className="flex justify-center mb-6 mt-8">
          <button
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded shadow transition-colors"
            onClick={handleGenerateGRN}
              disabled={fileLoading || grnLoading || !data.purchaseOrder.length || !data.putAway.length}
          >
              {grnLoading ? "Generating GRN..." : "Generate GRN"}
          </button>
        </div>

          {/* Error Display */}
          {(fileErrors.length > 0 || grnErrors.length > 0) && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              <h3 className="font-semibold mb-2">Errors:</h3>
              <ul className="list-disc list-inside space-y-1">
                {[...fileErrors, ...grnErrors].map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Modern Sticky Export Bar - must be a direct child of the main app container */}
          {grnData.length > 0 && (
            <div className="fixed bottom-0 left-0 w-full z-40 bg-white border-t border-gray-200 shadow-lg py-3 px-4 flex flex-col sm:flex-row sm:justify-center sm:items-center gap-3 sm:gap-6 animate-fade-in">
              <button
                type="button"
                onClick={handleDownloadCSV}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-5 rounded-full shadow transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-300"
                aria-label="Download CSV"
              >
                <span role="img" aria-label="CSV">📊</span> Download CSV
              </button>
              <button
                type="button"
                onClick={handleDownloadGRN}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-5 rounded-full shadow transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                aria-label="Download GRN (HTML)"
              >
                <span role="img" aria-label="HTML">🌐</span> Download GRN (HTML)
              </button>
              <button
                type="button"
                onClick={handleDownloadPDF}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-5 rounded-full shadow transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-300"
                aria-label="Download PDF"
              >
                <span role="img" aria-label="PDF">📄</span> Download PDF
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-5 rounded-full shadow transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
                aria-label="Clear All"
              >
                <span role="img" aria-label="Clear">🧹</span> Clear All
              </button>
          </div>
        )}

          {/* GRN Display Table */}
        {grnData.length > 0 && (
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

import React, { useState, useCallback } from "react";
import Papa from "papaparse";
import _ from "lodash";
import "./App.css";
import { FileUploadBox } from "./components/FileUploadBox";
import { HeaderForm } from "./components/HeaderForm";
import { SettingsPanel } from "./components/SettingsPanel";
import { GRNTable } from "./components/GRNTable";
import { useFileUpload } from "./hooks/useFileUpload";
import { useGRNGenerator } from "./hooks/useGRNGenerator";
import { downloadCSV, downloadHTML } from "./utils/exportUtils";

const GRNGenerator = () => {
  // File upload state and handlers
  const {
    purchaseOrderData,
    putAwayData,
    qcFailData,
    loading: fileLoading,
    errors: fileErrors,
    grnHeaderInfo: fileHeaderInfo,
    handlePurchaseOrderUpload,
    handlePutAwayUpload,
    handleQCFailUpload,
    clearPurchaseOrder,
    clearPutAway,
    clearQCFail,
  } = useFileUpload();

  // Local state for GRN generation
  const [skuCodeType, setSkuCodeType] = useState("KNOT");

  const [grnHeaderInfo, setGrnHeaderInfo] = useState({
    ...fileHeaderInfo,
    replenishmentNumber: "",
    inwardDate: "",
    warehouseNo: "",
    qcDoneBy: [],
    verifiedBy: "",
    warehouseManagerName: "",
  });

  // Previous values for dropdowns
  const [previousValues, setPreviousValues] = useState({
    warehouseNos: ["WH-MUM-01"],
    qcPersons: ["Abhishek", "LuvKush", "Sandeep", "Kuldeep", "Suraj", "Krish"],
    supervisors: ["Noorul Sheikh", "Preetam Yadav"],
    warehouseManagers: ["Shoeb Sheikh"],
  });

  // Settings state
  const [settings, setSettings] = useState({
    autoFillHeader: true,
    showQCStatus: true,
    defaultWarehouse: "",
    defaultManager: "",
  });

  // GRN generation hook
  const {
    grnData,
    loading: grnLoading,
    errors: grnErrors,
    generateGRN,
  } = useGRNGenerator();

  // Update header info when file header info changes
  React.useEffect(() => {
    if (settings.autoFillHeader) {
      setGrnHeaderInfo((prev) => ({
        ...prev,
        ...fileHeaderInfo,
      }));
    }
  }, [fileHeaderInfo, settings.autoFillHeader]);

  const handleHeaderChange = useCallback((e) => {
    const { name, value } = e.target;
    setGrnHeaderInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  // Download handlers
  const handleDownloadCSV = useCallback(() => {
    console.log('Download CSV clicked');
    console.log('GRN Data:', grnData);
    console.log('GRN Header Info:', grnHeaderInfo);
    if (!grnData || grnData.length === 0) {
      console.error('No GRN data available for download');
      return;
    }
    if (!grnHeaderInfo || !grnHeaderInfo.brandName || !grnHeaderInfo.replenishmentNumber) {
      console.error('Missing required header information for download');
      return;
    }
    downloadCSV(grnData, grnHeaderInfo);
  }, [grnData, grnHeaderInfo]);

  const handleDownloadGRN = useCallback(() => {
    downloadHTML(grnData, grnHeaderInfo);
  }, [grnData, grnHeaderInfo]);

  const getStatusColor = useCallback((status) => {
    switch (status.toLowerCase()) {
      case "complete":
        return "text-green-600";
      case "shortage":
        return "text-orange-600";
      case "excess":
        return "text-blue-600";
      case "not received":
        return "text-red-600";
      case "not ordered":
        return "text-purple-600";
      default:
        return "text-gray-600";
    }
  }, []);

  // Calculate summary statistics
  const summaryStats = {
    totalItems: grnData.length,
    totalOrderedQty: grnData.reduce((sum, item) => sum + item["Ordered Qty"], 0),
    totalReceivedQty: grnData.reduce((sum, item) => sum + item["Received Qty"], 0),
    totalPassedQCQty: grnData.reduce((sum, item) => sum + (item["Passed QC Qty"] || 0), 0),
    totalFailedQCQty: grnData.reduce((sum, item) => sum + (item["Failed QC Qty"] || 0), 0),
    items: {
      complete: grnData.filter((item) => 
        item.Status === "Complete" && item["QC Status"] === "Passed"
      ).length,
      partialQC: grnData.filter((item) => 
        item["QC Status"] === "Partial"
      ).length,
      failedQC: grnData.filter((item) => 
        item["QC Status"] === "Failed"
      ).length,
      quantityIssues: {
        shortage: grnData.filter((item) => item.Status === "Shortage").length,
        excess: grnData.filter((item) => item.Status === "Excess").length,
        notReceived: grnData.filter((item) => item.Status === "Not Received").length,
        notOrdered: grnData.filter((item) => item.Status === "Not Ordered").length,
      }
    },
    quantities: {
      shortage: grnData.reduce((sum, item) => sum + (item["Shortage Qty"] || 0), 0),
      excess: grnData.reduce((sum, item) => sum + (item["Excess Qty"] || 0), 0),
      notReceived: grnData.filter(item => item.Status === "Not Received")
        .reduce((sum, item) => sum + item["Ordered Qty"], 0),
      notOrdered: grnData.filter(item => item.Status === "Not Ordered")
        .reduce((sum, item) => sum + item["Received Qty"], 0),
      // QC quantity statistics
      completeQC: grnData.filter((item) => 
        item.Status === "Complete" && item["QC Status"] === "Passed"
      ).reduce((sum, item) => sum + (item["Passed QC Qty"] || 0), 0),
      partialQC: grnData.filter((item) => 
        item["QC Status"] === "Partial"
      ).reduce((sum, item) => sum + (item["Failed QC Qty"] || 0), 0),
      failedQC: grnData.filter((item) => 
        item["QC Status"] === "Failed"
      ).reduce((sum, item) => sum + (item["Failed QC Qty"] || 0), 0)
    }
  };

  // Calculate items with both QC and quantity issues
  summaryStats.items.withBothIssues = grnData.filter((item) => 
    item["QC Status"] !== "Passed" && 
    ["Shortage", "Excess", "Not Received", "Not Ordered"].includes(item.Status)
  ).length;

  // Calculate items that are only QC failed (no quantity issues)
  summaryStats.items.onlyQCFailed = 
    summaryStats.items.failedQC + 
    summaryStats.items.partialQC - 
    summaryStats.items.withBothIssues;

  // Calculate items that only have quantity issues (no QC issues)
  summaryStats.items.onlyQuantityIssues = 
    Object.values(summaryStats.items.quantityIssues).reduce((sum, count) => sum + count, 0) - 
    summaryStats.items.withBothIssues;

  // Calculate total items with any issues
  summaryStats.items.withIssues = 
    summaryStats.items.onlyQCFailed + 
    summaryStats.items.onlyQuantityIssues + 
    summaryStats.items.withBothIssues;

  // Calculate QC pass rate
  summaryStats.qcPassRate = summaryStats.totalReceivedQty > 0 
    ? ((summaryStats.totalPassedQCQty / summaryStats.totalReceivedQty) * 100).toFixed(1)
    : 0;

  // Calculate receipt accuracy
  summaryStats.receiptAccuracy = summaryStats.totalOrderedQty > 0
    ? ((summaryStats.totalReceivedQty / summaryStats.totalOrderedQty) * 100).toFixed(1)
    : 0;

  // Verify that all items are accounted for
  const totalAccounted = 
    summaryStats.items.complete + 
    summaryStats.items.withIssues;

  if (totalAccounted !== summaryStats.totalItems) {
    console.warn("Statistics mismatch:", {
      totalItems: summaryStats.totalItems,
      totalAccounted,
      difference: summaryStats.totalItems - totalAccounted,
      breakdown: {
        completeItems: summaryStats.items.complete,
        onlyQCFailed: summaryStats.items.onlyQCFailed,
        onlyQuantityIssues: summaryStats.items.onlyQuantityIssues,
        itemsWithBothIssues: summaryStats.items.withBothIssues
      }
    });
  }

  const handleGenerateGRN = useCallback(() => {
    generateGRN({
      purchaseOrderData,
      putAwayData,
      qcFailData,
      skuCodeType,
      grnHeaderInfo,
    });
  }, [generateGRN, purchaseOrderData, putAwayData, qcFailData, skuCodeType, grnHeaderInfo]);

  const allErrors = [...fileErrors, ...grnErrors];
  const isLoading = fileLoading || grnLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="container mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="text-center mb-6 flex flex-col items-center">
            <img src="/logo.png" alt="KNOT Logo" className="h-16 mb-4" />
            <h1 className="text-5xl font-extrabold text-gray-900 mb-3">
              KNOT GRN Generator
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Effortlessly generate Goods Receipt Notes
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            Upload Your Files
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FileUploadBox
              title="Purchase Order"
              onFileUpload={handlePurchaseOrderUpload}
              onClear={clearPurchaseOrder}
              data={purchaseOrderData}
              required
            />
            <FileUploadBox
              title="Put Away Data"
              onFileUpload={handlePutAwayUpload}
              onClear={clearPutAway}
              data={putAwayData}
              required
            />
            <FileUploadBox
              title="QC Fail Data (Optional)"
              onFileUpload={handleQCFailUpload}
              onClear={clearQCFail}
              data={qcFailData}
              required={false}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            GRN Header Information
          </h2>
          <HeaderForm
            grnHeaderInfo={grnHeaderInfo}
            handleHeaderChange={handleHeaderChange}
            previousValues={previousValues}
            setPreviousValues={setPreviousValues}
          />
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            Settings
          </h2>
          <SettingsPanel
            showSettings={true} /* Always visible */
            setShowSettings={() => {}} /* No-op for consistency */
            settings={settings}
            setSettings={setSettings}
            setSkuCodeType={setSkuCodeType}
            skuCodeType={skuCodeType}
            previousValues={previousValues}
            setPreviousValues={setPreviousValues}
          />
        </div>

        <div className="flex justify-center mb-8">
          <button
            onClick={handleGenerateGRN}
            disabled={isLoading || !purchaseOrderData || !putAwayData}
            className={`px-8 py-4 bg-green-600 text-white font-bold text-xl rounded-lg shadow-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition duration-300 ${
              (isLoading || !purchaseOrderData || !putAwayData) ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isLoading ? "Generating..." : "Generate GRN"}
          </button>
        </div>

        {allErrors.length > 0 && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-8" role="alert">
            <strong className="font-bold">Error! </strong>
            <span className="block sm:inline">
              {allErrors.map((error, index) => (
                <p key={index}>{error}</p>
              ))}
            </span>
          </div>
        )}

        {grnData.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Generated GRN</h2>
            <GRNTable
              grnData={grnData}
              summaryStats={summaryStats}
              getStatusColor={getStatusColor}
              handleDownloadCSV={handleDownloadCSV}
              handleDownloadGRN={handleDownloadGRN}
              showQCStatus={settings.showQCStatus}
              grnHeaderInfo={grnHeaderInfo}
              skuCodeType={skuCodeType}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default GRNGenerator; 

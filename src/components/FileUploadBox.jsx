import React from 'react';
import { downloadSampleCSV } from '../utils/helpers';

export const FileUploadBox = ({ title, onFileUpload, onClear, data = [], loading = false, required = false }) => {
  const fileId = `file-${title.replace(/\s+/g, "-").toLowerCase()}`;
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    console.log(`FileUploadBox ${title}: File selected:`, file);
    if (file) {
      console.log(`FileUploadBox ${title}: Calling onFileUpload with:`, file.name, file.size, file.type);
      onFileUpload(file);
      e.target.value = null; // Clear input for re-upload
    } else {
      console.log(`FileUploadBox ${title}: No file selected`);
    }
  };

  const handleDownloadSample = () => {
    // Map title to the correct file type format expected by generateSampleCSVData
    const titleToFileType = {
      'Purchase Order': 'purchaseOrder',
      'Put Away': 'putAway',
      'QC Fail': 'qcFail'
    };
    
    const fileType = titleToFileType[title];
    if (!fileType) {
      console.error(`Unknown title for sample file: ${title}`);
      return;
    }
    
    downloadSampleCSV(fileType);
  };

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
      <input
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFileChange}
        className="hidden"
        id={fileId}
        disabled={loading}
      />
      <label htmlFor={fileId} className="cursor-pointer">
        <div className="mx-auto h-12 w-12 text-gray-400 mb-4 text-6xl">
          {loading ? "⏳" : "📁"}
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {title}
          {required && <span className="text-red-500 ml-1">*</span>}
        </h3>
        
        {data.length > 0 ? (
          <div className="mt-2">
            <p className="text-sm text-green-600 mb-2">
              {data.length} rows loaded
            </p>
            <button
              onClick={onClear}
              className="text-sm text-red-600 hover:text-red-800"
              disabled={loading}
            >
              Clear
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-500">
              {loading ? "Processing..." : "Click to upload CSV/Excel file"}
            </p>
            <button
              onClick={handleDownloadSample}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
              disabled={loading}
            >
              Download Sample File
            </button>
          </div>
        )}
      </label>
    </div>
  );
}; 
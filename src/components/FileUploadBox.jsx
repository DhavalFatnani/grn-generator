import React from 'react';

export const FileUploadBox = ({ title, onFileUpload, onClear, data, required }) => {
  console.log(`FileUploadBox ${title} render - data length:`, data.length);
  
  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
      <input
        type="file"
        accept=".csv"
        onChange={(e) => {
          console.log(`File input changed for ${title}:`, e.target.files);
          if (e.target.files[0]) {
            console.log(`Selected file for ${title}:`, e.target.files[0].name, 'Size:', e.target.files[0].size);
            try {
              console.log(`Calling onFileUpload for ${title}`);
              onFileUpload(e.target.files[0]);
              console.log(`onFileUpload called successfully for ${title}`);
            } catch (error) {
              console.error(`Error in file upload handler for ${title}:`, error);
            }
            e.target.value = null; // Clear the input so same file can be uploaded again
          } else {
            console.log(`No file selected for ${title}`);
          }
        }}
        className="hidden"
        id={`file-${title.replace(/\s+/g, "-").toLowerCase()}`}
      />
      <label
        htmlFor={`file-${title.replace(/\s+/g, "-").toLowerCase()}`}
        className="cursor-pointer"
      >
        <div className="mx-auto h-12 w-12 text-gray-400 mb-4 text-6xl">📁</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {title}
          {required && <span className="text-red-500 ml-1">*</span>}
        </h3>
        {data.length > 0 && (
          <div className="mt-2">
            <p className="text-sm text-green-600 mb-2">
              {data.length} rows loaded
            </p>
            <button
              onClick={onClear}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Clear
            </button>
          </div>
        )}
        {data.length === 0 && (
          <p className="text-sm text-gray-500">
            Click to upload CSV file
          </p>
        )}
      </label>
    </div>
  );
}; 
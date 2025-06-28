import React, { useState, useEffect } from 'react';

export const DataPreviewModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  processedData, 
  fileType, 
  detectedHeaders, 
  sampleData,
  skuCodeType,
  setSkuCodeType,
  rawData,
  noPO
}) => {
  const [selectedHeaderRow, setSelectedHeaderRow] = useState(0);
  const [customHeaders, setCustomHeaders] = useState([]);
  const [previewData, setPreviewData] = useState([]);
  
  // GRN Header Information Selection - only fields that can be found in PO
  const [grnHeaderSelections, setGrnHeaderSelections] = useState({
    poNumber: { row: 5, col: 10, value: "" }, // Default J6 position
    brandName: { row: 10, col: 2, value: "" } // Default C11 position
  });

  // Column mapping for data processing
  const [columnMapping, setColumnMapping] = useState({
    sno: "",
    brandSkuCode: "",
    knotSkuCode: "",
    size: "",
    colors: "",
    quantity: "",
    unitPrice: "",
    amount: ""
  });

  // Cell selection mode
  const [selectionMode, setSelectionMode] = useState(null);
  const [hoveredCell, setHoveredCell] = useState(null);

  // SKU code type selection for no PO
  const [localSkuCodeType, setLocalSkuCodeType] = useState(skuCodeType || 'BRAND');
  useEffect(() => {
    if (isOpen && skuCodeType) setLocalSkuCodeType(skuCodeType);
  }, [isOpen, skuCodeType]);

  // Debug logging when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('DataPreviewModal: Modal opened with props', {
        isOpen,
        fileType,
        processedDataLength: processedData?.length,
        detectedHeaders,
        rawDataLength: rawData?.length,
        skuCodeType
      });
    }
  }, [isOpen, fileType, processedData, detectedHeaders, rawData, skuCodeType]);

  useEffect(() => {
    if (processedData && processedData.length > 0) {
      console.log('DataPreviewModal: Processing data for modal', {
        processedDataLength: processedData.length,
        firstRow: processedData[0],
        fileType
      });
      
      // Get headers from the first row of processed data
      const headers = Object.keys(processedData[0]);
      setCustomHeaders([{
        rowIndex: 0,
        headers: headers,
        matchCount: headers.length,
        preview: headers.slice(0, 5).join(' | ') + (headers.length > 5 ? '...' : '')
      }]);
      setSelectedHeaderRow(0);

      // Auto-map columns based on header content
      const autoMapping = {};
      headers.forEach((header) => {
        const headerLower = header.toLowerCase().trim();
        if (headerLower.includes('sno') || headerLower.includes('serial')) {
          autoMapping.sno = header;
        } else if (headerLower.includes('brand') && headerLower.includes('sku')) {
          autoMapping.brandSkuCode = header;
        } else if (headerLower.includes('knot') && headerLower.includes('sku')) {
          autoMapping.knotSkuCode = header;
        } else if (headerLower.includes('size')) {
          autoMapping.size = header;
        } else if (headerLower.includes('color')) {
          autoMapping.colors = header;
        } else if (headerLower.includes('quantity') || headerLower.includes('qty')) {
          autoMapping.quantity = header;
        } else if (headerLower.includes('unit') && headerLower.includes('price')) {
          autoMapping.unitPrice = header;
        } else if (headerLower.includes('amount') || headerLower.includes('total')) {
          autoMapping.amount = header;
        }
      });
      
      setColumnMapping(autoMapping);
      
      // Set preview data to first 10 rows
      setPreviewData(processedData.slice(0, 10));
      
      console.log('DataPreviewModal: Modal data initialized', {
        customHeadersLength: 1,
        headers,
        autoMapping,
        previewDataLength: Math.min(processedData.length, 10)
      });
    }
  }, [processedData]);

  const handleCellClick = (rowIndex, colIndex, cellValue, isMetadata = false) => {
    if (selectionMode) {
      if (selectionMode.startsWith('column_')) {
        // Column mapping selection - use processed data table
        const field = selectionMode.replace('column_', '');
        setColumnMapping(prev => ({
          ...prev,
          [field]: customHeaders[selectedHeaderRow]?.headers[colIndex] || ""
        }));
      } else {
        // GRN header selection - use metadata table
        setGrnHeaderSelections(prev => ({
          ...prev,
          [selectionMode]: {
            row: rowIndex,
            col: colIndex,
            value: cellValue ? cellValue.toString().trim() : ""
          }
        }));
      }
      setSelectionMode(null);
    }
  };

  const handleColumnHeaderClick = (colIndex) => {
    if (selectionMode && selectionMode.startsWith('column_')) {
      const field = selectionMode.replace('column_', '');
      setColumnMapping(prev => ({
        ...prev,
        [field]: customHeaders[selectedHeaderRow]?.headers[colIndex] || ""
      }));
      setSelectionMode(null);
    }
  };

  const handleHeaderSelection = (field) => {
    setSelectionMode(field);
  };

  const handleColumnSelection = (field) => {
    setSelectionMode(`column_${field}`);
  };

  const getCellClassName = (rowIndex, colIndex, cellValue, isMetadata = false) => {
    let className = "border border-gray-200 px-2 py-1 text-xs text-gray-800 cursor-pointer hover:bg-blue-50";
    
    if (isMetadata) {
      // Highlight selected cells for GRN headers in metadata table
      Object.entries(grnHeaderSelections).forEach(([field, selection]) => {
        if (selection.row === rowIndex && selection.col === colIndex) {
          className += " bg-green-100 border-green-500 font-medium";
        }
      });
    } else {
      // Highlight selected columns in processed data table
      if (customHeaders[selectedHeaderRow]) {
        const headerName = customHeaders[selectedHeaderRow].headers[colIndex];
        Object.values(columnMapping).forEach(mappedHeader => {
          if (mappedHeader === headerName) {
            className += " bg-yellow-100 border-yellow-500";
          }
        });
      }
    }
    
    // Highlight hovered cell
    if (hoveredCell && hoveredCell.row === rowIndex && hoveredCell.col === colIndex && hoveredCell.isMetadata === isMetadata) {
      className += " bg-blue-100 border-blue-400";
    }
    
    return className;
  };

  const getColumnLabel = (colIndex) => {
    let label = "";
    while (colIndex >= 0) {
      label = String.fromCharCode(65 + (colIndex % 26)) + label;
      colIndex = Math.floor(colIndex / 26) - 1;
    }
    return label;
  };

  const handleConfirm = () => {
    if (setSkuCodeType) setSkuCodeType(localSkuCodeType);
    console.log('handleConfirm called', {
      customHeadersLength: customHeaders.length,
      selectedHeaderRow,
      processedDataLength: processedData?.length,
      columnMapping,
      grnHeaderSelections,
      skuCodeType: localSkuCodeType
    });

    // Check if we have processed data and headers
    if (processedData && processedData.length > 0 && customHeaders.length > 0) {
      const selectedHeaderInfo = customHeaders[selectedHeaderRow];
      
      if (selectedHeaderInfo && selectedHeaderInfo.headers) {
        console.log('Confirming with data:', {
          headers: selectedHeaderInfo.headers,
          dataLength: processedData.length,
          grnHeaderInfo: grnHeaderSelections,
          columnMapping: columnMapping,
          skuCodeType: localSkuCodeType
        });

        onConfirm({
          headers: selectedHeaderInfo.headers,
          data: processedData,
          grnHeaderInfo: grnHeaderSelections,
          columnMapping: columnMapping,
          skuCodeType: localSkuCodeType
        });
      } else {
        console.error('No valid header info found');
      }
    } else {
      console.error('Cannot confirm: missing processed data or headers', {
        hasProcessedData: !!processedData,
        processedDataLength: processedData?.length,
        customHeadersLength: customHeaders.length
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-7xl w-full mx-4 max-h-[95vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">
            Configure {fileType} Data Mapping
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>
        </div>

        {fileType === "Purchase Order" && rawData && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">PO Metadata Selection</h3>
            <p className="text-sm text-gray-600 mb-3">
              Select the required metadata from the cells below by clicking "Pick Cell" and then clicking on the appropriate cell.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(grnHeaderSelections).map(([field, selection]) => (
                <div key={field} className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700 min-w-[140px]">
                    {field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                  </label>
                  <div className="flex-1 flex items-center space-x-2">
                    <input
                      type="text"
                      value={selection.value}
                      onChange={(e) => setGrnHeaderSelections(prev => ({
                        ...prev,
                        [field]: { ...prev[field], value: e.target.value }
                      }))}
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                      placeholder="Enter value or select from table"
                    />
                    <button
                      onClick={() => handleHeaderSelection(field)}
                      className={`px-3 py-1 text-xs rounded ${
                        selectionMode === field 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {selectionMode === field ? 'Selecting...' : 'Pick Cell'}
                    </button>
                    {selection.row >= 0 && (
                      <span className="text-xs text-gray-500">
                        {getColumnLabel(selection.col)}{selection.row + 1}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {selectionMode && !selectionMode.startsWith('column_') && (
              <div className="mt-3 p-2 bg-blue-100 text-blue-800 text-sm rounded">
                Click on any cell in the metadata table below to select it for "{selectionMode.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}"
              </div>
            )}
          </div>
        )}

        {fileType === "Purchase Order" && rawData && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">PO Metadata (Rows until data headers found)</h3>
            <div className="overflow-x-auto max-h-64">
              <table className="min-w-full border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 w-12">
                      Row
                    </th>
                    {rawData[0] && rawData[0].map((_, colIndex) => (
                      <th key={colIndex} className="border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 w-20">
                        {getColumnLabel(colIndex)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rawData.slice(0, detectedHeaders?.rowIndex || 15).map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b border-gray-200">
                      <td className="border border-gray-200 px-2 py-1 text-xs text-gray-600 font-medium bg-gray-50">
                        {rowIndex + 1}
                      </td>
                      {row && row.map((cell, colIndex) => (
                        <td
                          key={colIndex}
                          className={getCellClassName(rowIndex, colIndex, cell, true)}
                          onClick={() => handleCellClick(rowIndex, colIndex, cell, true)}
                          onMouseEnter={() => setHoveredCell({ row: rowIndex, col: colIndex, isMetadata: true })}
                          onMouseLeave={() => setHoveredCell(null)}
                        >
                          {cell ? cell.toString().trim() : ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {fileType === "Purchase Order" && customHeaders.length > 0 && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">Column Mapping</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(columnMapping).map(([field, mappedHeader]) => (
                <div key={field} className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700 min-w-[120px]">
                    {field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                  </label>
                  <div className="flex-1 flex items-center space-x-2">
                    <select
                      value={mappedHeader}
                      onChange={(e) => setColumnMapping(prev => ({
                        ...prev,
                        [field]: e.target.value
                      }))}
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                    >
                      <option value="">Select column...</option>
                      {customHeaders[selectedHeaderRow]?.headers.map((header, index) => (
                        <option key={index} value={header}>
                          {header} ({getColumnLabel(index)})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleColumnSelection(field)}
                      className={`px-3 py-1 text-xs rounded ${
                        selectionMode === `column_${field}` 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {selectionMode === `column_${field}` ? 'Selecting...' : 'Pick Column'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {selectionMode && selectionMode.startsWith('column_') && (
              <div className="mt-3 p-2 bg-blue-100 text-blue-800 text-sm rounded">
                Click on any <strong>column header</strong> in the processed data table below to select it for "{selectionMode.replace('column_', '').replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}"
              </div>
            )}
          </div>
        )}

        {fileType === "Purchase Order" && (
          <div className="mb-6 p-4 bg-green-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">SKU Code Configuration</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Which SKU Code to use for matching?
              </label>
              <div className="flex flex-col sm:flex-row sm:space-x-6 space-y-2 sm:space-y-0">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="KNOT"
                    checked={localSkuCodeType === "KNOT"}
                    onChange={(e) => setLocalSkuCodeType(e.target.value)}
                    className="mr-3"
                  />
                  <span className="text-sm">
                    KNOT SKU Code (W1-WBI-xxx format)
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="Brand"
                    checked={localSkuCodeType === "Brand"}
                    onChange={(e) => setLocalSkuCodeType(e.target.value)}
                    className="mr-3"
                  />
                  <span className="text-sm">
                    Brand SKU Code (MBTSSS0-xxx format)
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* SKU Code Type Prompt for Put Away with no PO */}
        {(fileType === 'putAway' || fileType === 'Put Away') && noPO && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <label className="block font-medium mb-2 text-blue-900">Is the SKU column in your file a KNOT code or a Brand code?</label>
            <div className="flex gap-6">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="skuCodeType"
                  value="KNOT"
                  checked={localSkuCodeType === 'KNOT'}
                  onChange={() => setLocalSkuCodeType('KNOT')}
                  className="form-radio text-blue-600"
                />
                <span className="ml-2">KNOT Code</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="skuCodeType"
                  value="BRAND"
                  checked={localSkuCodeType === 'BRAND'}
                  onChange={() => setLocalSkuCodeType('BRAND')}
                  className="form-radio text-blue-600"
                />
                <span className="ml-2">Brand Code</span>
              </label>
            </div>
          </div>
        )}

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Processed Data Preview (First 10 rows)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 w-12">
                    Row
                  </th>
                  {customHeaders[selectedHeaderRow]?.headers.map((header, index) => (
                    <th 
                      key={index} 
                      className={`border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 w-20 cursor-pointer hover:bg-blue-100 ${
                        selectionMode && selectionMode.startsWith('column_') ? 'bg-blue-50 border-blue-300' : ''
                      }`}
                      onClick={() => handleColumnHeaderClick(index)}
                    >
                      {header} ({getColumnLabel(index)})
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-gray-200">
                    <td className="border border-gray-200 px-2 py-1 text-xs text-gray-600 font-medium bg-gray-50">
                      {rowIndex + 1}
                    </td>
                    {customHeaders[selectedHeaderRow]?.headers.map((header, colIndex) => (
                      <td
                        key={colIndex}
                        className={getCellClassName(rowIndex, colIndex, row[header], false)}
                        onClick={() => handleCellClick(rowIndex, colIndex, row[header], false)}
                        onMouseEnter={() => setHoveredCell({ row: rowIndex, col: colIndex, isMetadata: false })}
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        {row[header] || ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!processedData || processedData.length === 0 || customHeaders.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirm Mapping
          </button>
        </div>
      </div>
    </div>
  );
}; 
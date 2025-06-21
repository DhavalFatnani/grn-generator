import React from 'react';
import { TEST_DATA_TEMPLATES } from '../utils/constants';

export const HeaderForm = ({ grnHeaderInfo, onHeaderChange, previousValues, setPreviousValues, testMode }) => {
  console.log("HeaderForm: grnHeaderInfo.qcDoneBy", grnHeaderInfo.qcDoneBy);

  const handleMultiSelectChange = (e) => {
    const { name, value } = e.target;
    console.log(`handleMultiSelectChange: name=${name}, value=${value}`);
    if (value && !grnHeaderInfo[name].includes(value)) {
      const newValues = [...grnHeaderInfo[name], value].sort();
      console.log("handleMultiSelectChange: newValues", newValues);
      onHeaderChange({ target: { name, value: newValues } });
    }
  };

  const handleMultiInputAdd = (e) => {
    if (e.key === 'Enter' || e.type === 'blur') {
      const value = e.target.value.trim();
      console.log(`handleMultiInputAdd: value=${value}`);
      if (value && !grnHeaderInfo.qcDoneBy.includes(value)) {
        const newValues = [...grnHeaderInfo.qcDoneBy, value].sort();
        console.log("handleMultiInputAdd: newValues", newValues);
        onHeaderChange({ target: { name: 'qcDoneBy', value: newValues } });
      }
      e.target.value = ''; // Clear input
    }
  };

  const handleRemoveTag = (personToRemove) => {
    console.log("handleRemoveTag: personToRemove", personToRemove);
    const newValues = grnHeaderInfo.qcDoneBy.filter(person => person !== personToRemove);
    console.log("handleRemoveTag: newValues", newValues);
    onHeaderChange({ target: { name: 'qcDoneBy', value: newValues } });
  };

  const handleSingleInputAndAddToPrevious = (e, previousValuesArrayName) => {
    const { name, value } = e.target;
    console.log(`handleSingleInputAndAddToPrevious: name=${name}, value=${value}`);
    
    // Immediately update grnHeaderInfo for the current input/select value
    onHeaderChange({ target: { name, value } }); 

    // Add to previousValues if new and not empty, and only if it's a direct input from the text field (not from select)
    if (e.type === 'blur' || e.key === 'Enter') { // Only add on blur or Enter for text inputs
      if (value.trim() && !previousValues[previousValuesArrayName].includes(value.trim())) {
        const newPreviousValues = [...previousValues[previousValuesArrayName], value.trim()].sort();
        console.log(`handleSingleInputAndAddToPrevious: Adding to previousValues for ${previousValuesArrayName}:`, newPreviousValues);
        setPreviousValues(prev => ({
          ...prev,
          [previousValuesArrayName]: newPreviousValues
        }));
      }
    }
  };

  const handleQCCheckboxChange = (e) => {
    const { checked } = e.target;
    console.log("QC checkbox changed:", checked);
    
    // If QC is not performed, clear the QC Done By field
    if (!checked) {
      onHeaderChange({ target: { name: 'qcDoneBy', value: [] } });
    }
    
    // Update the QC performed flag
    onHeaderChange({ target: { name: 'qcPerformed', value: checked } });
  };

  const handleTestDataTemplate = (templateName) => {
    const template = TEST_DATA_TEMPLATES[templateName];
    if (template) {
      console.log(`Loading test data template: ${templateName}`, template);
      
      // Update GRN header info
      Object.entries(template.grnHeaderInfo).forEach(([key, value]) => {
        onHeaderChange({ target: { name: key, value } });
      });
      
      // Update previous values
      setPreviousValues(template.previousValues);
    }
  };

  const handleClearForm = () => {
    console.log('Clearing form data');
    
    // Clear all GRN header fields
    const fieldsToClear = [
      'poNumber', 'brandName', 'replenishmentNumber', 'inwardDate', 
      'warehouseNo', 'verifiedBy', 'warehouseManagerName', 'qcPerformed', 'qcDoneBy'
    ];
    
    fieldsToClear.forEach(field => {
      const value = field === 'qcDoneBy' ? [] : field === 'qcPerformed' ? false : '';
      onHeaderChange({ target: { name: field, value } });
    });
    
    // Reset previous values to defaults
    setPreviousValues({
      warehouseNos: ["WH-MUM-01"],
      qcPersons: ["Abhishek", "LuvKush", "Sandeep", "Kuldeep", "Suraj", "Krish"],
      supervisors: ["Noorul Sheikh", "Preetam Yadav"],
      warehouseManagers: ["Shoeb Sheikh"],
    });
  };

  return (
    <div className="p-6 rounded-lg bg-white border border-gray-200 shadow-sm">
      {testMode && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-center">
            <span className="text-yellow-800 text-sm font-medium">🧪 Test Mode Active</span>
            <span className="text-yellow-600 text-sm ml-2">Using sample data for testing</span>
          </div>
        </div>
      )}
      
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold text-gray-800">GRN Header Information</h2>
          {testMode && (
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Quick Fill:</span>
                <select
                  onChange={(e) => handleTestDataTemplate(e.target.value)}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  defaultValue=""
                >
                  <option value="">Select Template</option>
                  <option value="standard">Standard GRN (QC Performed)</option>
                  <option value="noQC">No QC Performed</option>
                  <option value="alternative">Alternative Brand</option>
                  <option value="minimal">Minimal Data</option>
                </select>
              </div>
              <button
                onClick={handleClearForm}
                className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
              >
                Clear Form
              </button>
            </div>
          )}
        </div>
        <p className="text-sm text-gray-600">
          Please verify and complete the following information. Fields marked with <span className="text-blue-500">*</span> are required.
        </p>
      </div>

      {/* Required GRN Information */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Required GRN Information</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Replenishment Number <span className="text-blue-500">*</span>
            </label>
            <input
              type="text"
              value={grnHeaderInfo.replenishmentNumber}
              onChange={onHeaderChange}
              name="replenishmentNumber"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="e.g., REP-001"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Inward Date <span className="text-blue-500">*</span>
            </label>
            <div className="relative">
            <input
              type="date"
              value={grnHeaderInfo.inwardDate}
                onChange={onHeaderChange}
              name="inwardDate"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer"
              required
            />
            </div>
          </div>
        </div>
      </div>

      {/* Warehouse Information */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Warehouse Information</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Warehouse No <span className="text-blue-500">*</span>
            </label>
            <div className="space-y-2">
              <select
                value={grnHeaderInfo.warehouseNo}
                onChange={(e) => {
                  console.log("Select - WarehouseNo onChange:", e.target.value);
                  handleSingleInputAndAddToPrevious(e, 'warehouseNos');
                }}
                name="warehouseNo"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                required
              >
                <option value="">Select from existing...</option>
                {grnHeaderInfo.warehouseNo && !previousValues.warehouseNos.includes(grnHeaderInfo.warehouseNo) && (
                  <option value={grnHeaderInfo.warehouseNo}>
                    {grnHeaderInfo.warehouseNo} (New Entry)
                  </option>
                )}
                {previousValues.warehouseNos.map((warehouse) => (
                  <option key={warehouse} value={warehouse}>
                    {warehouse}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={grnHeaderInfo.warehouseNo}
                onChange={(e) => {
                  console.log("Input - WarehouseNo onChange:", e.target.value);
                  handleSingleInputAndAddToPrevious(e, 'warehouseNos');
                }}
                onBlur={(e) => {
                  console.log("Input - WarehouseNo onBlur:", e.target.value);
                  handleSingleInputAndAddToPrevious(e, 'warehouseNos');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    console.log("Input - WarehouseNo onKeyDown Enter:", e.target.value);
                    handleSingleInputAndAddToPrevious(e, 'warehouseNos');
                  }
                }}
                name="warehouseNo"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Or type new warehouse code"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Warehouse Manager Name <span className="text-blue-500">*</span>
            </label>
            <div className="space-y-2">
              <select
                value={grnHeaderInfo.warehouseManagerName}
                onChange={(e) => {
                  console.log("Select - WarehouseManager onChange:", e.target.value);
                  handleSingleInputAndAddToPrevious(e, 'warehouseManagers');
                }}
                name="warehouseManagerName"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                required
              >
                <option value="">Select from existing...</option>
                {grnHeaderInfo.warehouseManagerName && !previousValues.warehouseManagers.includes(grnHeaderInfo.warehouseManagerName) && (
                  <option value={grnHeaderInfo.warehouseManagerName}>
                    {grnHeaderInfo.warehouseManagerName} (New Entry)
                  </option>
                )}
                {previousValues.warehouseManagers.map((manager) => (
                  <option key={manager} value={manager}>
                    {manager}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={grnHeaderInfo.warehouseManagerName}
                onChange={(e) => {
                  console.log("Input - WarehouseManager onChange:", e.target.value);
                  handleSingleInputAndAddToPrevious(e, 'warehouseManagers');
                }}
                onBlur={(e) => {
                  console.log("Input - WarehouseManager onBlur:", e.target.value);
                  handleSingleInputAndAddToPrevious(e, 'warehouseManagers');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    console.log("Input - WarehouseManager onKeyDown Enter:", e.target.value);
                    handleSingleInputAndAddToPrevious(e, 'warehouseManagers');
                  }
                }}
                name="warehouseManagerName"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Or type new manager name"
              />
            </div>
          </div>
        </div>
      </div>

      {/* QC and Verification Information */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">QC and Verification Information</h3>
        
        {/* QC Performed Checkbox */}
        <div className="mb-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={grnHeaderInfo.qcPerformed || false}
              onChange={handleQCCheckboxChange}
              name="qcPerformed"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-700">
              Quality Control (QC) has been performed
            </span>
          </label>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* QC Done By - Only show if QC is performed */}
          {grnHeaderInfo.qcPerformed && (
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
                QC Done By
            </label>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2 p-2 min-h-[2.5rem] border border-gray-300 rounded-md bg-white">
                {Array.isArray(grnHeaderInfo.qcDoneBy) && grnHeaderInfo.qcDoneBy.map((person) => (
                  <span
                    key={person}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                  >
                    {person}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(person)}
                      className="ml-1.5 -mr-0.5 h-4 w-4 rounded-full inline-flex items-center justify-center text-blue-500 hover:text-blue-700 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <select
                value=""
                onChange={handleMultiSelectChange}
                name="qcDoneBy"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="">Add from existing...</option>
                {previousValues.qcPersons
                  .filter(person => !Array.isArray(grnHeaderInfo.qcDoneBy) || !grnHeaderInfo.qcDoneBy.includes(person))
                  .map((person) => (
                    <option key={person} value={person}>
                      {person}
                    </option>
                  ))}
              </select>
              <input
                type="text"
                onBlur={handleMultiInputAdd}
                onKeyDown={(e) => { if (e.key === 'Enter') handleMultiInputAdd(e); }}
                name="qcDoneByInput"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Type new QC person name and press Enter/Tab"
              />
            </div>
          </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Verified By <span className="text-blue-500">*</span>
            </label>
            <div className="space-y-2">
              <select
                value={grnHeaderInfo.verifiedBy}
                onChange={(e) => {
                  console.log("Select - VerifiedBy onChange:", e.target.value);
                  handleSingleInputAndAddToPrevious(e, 'supervisors');
                }}
                name="verifiedBy"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                required
              >
                <option value="">Select from existing...</option>
                {grnHeaderInfo.verifiedBy && !previousValues.supervisors.includes(grnHeaderInfo.verifiedBy) && (
                  <option value={grnHeaderInfo.verifiedBy}>
                    {grnHeaderInfo.verifiedBy} (New Entry)
                  </option>
                )}
                {previousValues.supervisors.map((supervisor) => (
                  <option key={supervisor} value={supervisor}>
                    {supervisor}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={grnHeaderInfo.verifiedBy}
                onChange={(e) => {
                  console.log("Input - VerifiedBy onChange:", e.target.value);
                  handleSingleInputAndAddToPrevious(e, 'supervisors');
                }}
                onBlur={(e) => {
                  console.log("Input - VerifiedBy onBlur:", e.target.value);
                  handleSingleInputAndAddToPrevious(e, 'supervisors');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    console.log("Input - VerifiedBy onKeyDown Enter:", e.target.value);
                    handleSingleInputAndAddToPrevious(e, 'supervisors');
                  }
                }}
                name="verifiedBy"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Or type new supervisor name"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 
import React from 'react';

export const SettingsPanel = ({
  showSettings,
  setShowSettings,
  settings,
  setSettings,
  previousValues,
  skuCodeType,
  setSkuCodeType,
}) => (
  <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <span className="h-5 w-5 text-blue-600 mr-2">⚙️</span>
        <h3 className="text-blue-800 font-medium">Configuration</h3>
      </div>
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="text-blue-600 text-sm hover:text-blue-800 font-medium"
      >
      </button>
    </div>
    {showSettings && (
      <div className="mt-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Which SKU Code to use for matching?
          </label>
          <div className="flex flex-col sm:flex-row sm:space-x-6 space-y-2 sm:space-y-0">
            <label className="flex items-center">
              <input
                type="radio"
                value="KNOT"
                checked={skuCodeType === "KNOT"}
                onChange={(e) => setSkuCodeType(e.target.value)}
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
                checked={skuCodeType === "Brand"}
                onChange={(e) => setSkuCodeType(e.target.value)}
                className="mr-3"
              />
              <span className="text-sm">
                Brand SKU Code (MBTSSS0-xxx format)
              </span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Display Settings
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.showQCStatus}
                onChange={(e) =>
                  setSettings({ ...settings, showQCStatus: e.target.checked })
                }
                className="mr-3"
              />
              <span className="text-sm">Show QC Status Column</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.autoFillHeader}
                onChange={(e) =>
                  setSettings({ ...settings, autoFillHeader: e.target.checked })
                }
                className="mr-3"
              />
              <span className="text-sm">Auto-fill Header Information</span>
            </label>
          </div>
        </div>
      </div>
    )}
  </div>
); 
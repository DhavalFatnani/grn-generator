// GRN Storage utilities for saving and retrieving GRN logs

const GRN_LOGS_KEY = 'grn_logs';
const MAX_LOGS = 1000; // Maximum number of GRN logs to store

// Get all GRN logs
export function getGRNLogs() {
  try {
    const stored = localStorage.getItem(GRN_LOGS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error reading GRN logs from storage:', error);
  }
  return [];
}

// Save a new GRN log
export function saveGRNLog(grnData, grnHeaderInfo, options = {}) {
  try {
    const logs = getGRNLogs();
    
    const newLog = {
      id: `grn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      documentNumber: generateDocumentNumber(grnHeaderInfo),
      grnHeaderInfo: { ...grnHeaderInfo },
      summary: calculateSummary(grnData),
      itemCount: grnData.length,
      createdAt: new Date().toISOString(),
      ...options
    };
    
    // Add to beginning of array (newest first)
    logs.unshift(newLog);
    
    // Limit to MAX_LOGS
    if (logs.length > MAX_LOGS) {
      logs.splice(MAX_LOGS);
    }
    
    localStorage.setItem(GRN_LOGS_KEY, JSON.stringify(logs));
    return newLog;
  } catch (error) {
    console.error('Error saving GRN log:', error);
    return null;
  }
}

// Get a specific GRN log by ID
export function getGRNLogById(id) {
  const logs = getGRNLogs();
  return logs.find(log => log.id === id);
}

// Delete a GRN log
export function deleteGRNLog(id) {
  try {
    const logs = getGRNLogs();
    const filtered = logs.filter(log => log.id !== id);
    localStorage.setItem(GRN_LOGS_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error deleting GRN log:', error);
    return false;
  }
}

// Clear all GRN logs
export function clearAllGRNLogs() {
  try {
    localStorage.removeItem(GRN_LOGS_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing GRN logs:', error);
    return false;
  }
}

// Generate document number (same format as in exportUtils)
function generateDocumentNumber(grnHeaderInfo) {
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0].replace(/-/g, "");
  return `GRN-KNOT-${dateStr}-${(grnHeaderInfo.brandName || '').replace(/\s+/g, "")}-${grnHeaderInfo.replenishmentNumber || ''}`;
}

// Calculate summary statistics
function calculateSummary(grnData) {
  if (!grnData || grnData.length === 0) {
    return {
      totalOrderedUnits: 0,
      totalReceivedUnits: 0,
      totalShortageUnits: 0,
      totalExcessUnits: 0,
      totalNotOrderedUnits: 0,
      totalQcPassedUnits: 0,
      totalQcFailedUnits: 0,
      receiptAccuracy: 0,
      qcPassRate: 0
    };
  }

  const summary = {
    totalOrderedUnits: 0,
    totalReceivedUnits: 0,
    totalShortageUnits: 0,
    totalExcessUnits: 0,
    totalNotOrderedUnits: 0,
    totalQcPassedUnits: 0,
    totalQcFailedUnits: 0
  };

  grnData.forEach(item => {
    summary.totalOrderedUnits += item["Ordered Qty"] || 0;
    summary.totalReceivedUnits += item["Received Qty"] || 0;
    summary.totalShortageUnits += item["Shortage Qty"] || 0;
    summary.totalExcessUnits += item["Excess Qty"] || 0;
    summary.totalNotOrderedUnits += item["Not Ordered Qty"] || 0;
    summary.totalQcPassedUnits += item["Passed QC Qty"] || 0;
    summary.totalQcFailedUnits += item["Failed QC Qty"] || 0;
  });

  summary.receiptAccuracy = summary.totalOrderedUnits > 0
    ? Math.round(((summary.totalOrderedUnits - summary.totalShortageUnits) / summary.totalOrderedUnits) * 100)
    : 0;

  summary.qcPassRate = (summary.totalQcPassedUnits + summary.totalQcFailedUnits) > 0
    ? Math.round((summary.totalQcPassedUnits / (summary.totalQcPassedUnits + summary.totalQcFailedUnits)) * 100)
    : 0;

  return summary;
}

// Export full GRN data for a log (if stored)
export function getGRNFullData(id) {
  try {
    const log = getGRNLogById(id);
    if (log && log.fullData) {
      return log.fullData;
    }
  } catch (error) {
    console.error('Error getting full GRN data:', error);
  }
  return null;
}

// Save full GRN data with a log (optional, for detailed view)
export function saveGRNLogWithData(grnData, grnHeaderInfo, options = {}) {
  const log = saveGRNLog(grnData, grnHeaderInfo, options);
  if (log) {
    try {
      const logs = getGRNLogs();
      const logIndex = logs.findIndex(l => l.id === log.id);
      if (logIndex !== -1) {
        logs[logIndex].fullData = grnData;
        localStorage.setItem(GRN_LOGS_KEY, JSON.stringify(logs));
      }
    } catch (error) {
      console.error('Error saving full GRN data:', error);
    }
  }
  return log;
}


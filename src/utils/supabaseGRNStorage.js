// Supabase-based GRN storage with user tracking

import { supabase, TABLES } from './supabase';
import { getCurrentAdmin } from './supabaseAuth';
import { GRNExporter } from './exportUtils';

// Save a new GRN log with user tracking
export async function saveGRNLog(grnData, grnHeaderInfo, options = {}) {
  try {
    const adminUsername = getCurrentAdmin() || 'anonymous';
    
    // Use GRNExporter to generate document number and calculate summary
    const exporter = new GRNExporter(grnData, grnHeaderInfo);
    const documentNumber = exporter.documentNumber;
    const summary = exporter.calculateSummaryStats();

    // Store original source data in header info for later use in exports
    // This ensures data persists in Supabase even after browser closes
    const sourceData = {
      purchaseOrderData: Array.isArray(options.purchaseOrderData) ? options.purchaseOrderData : [],
      putAwayData: Array.isArray(options.putAwayData) ? options.putAwayData : [],
      qcFailData: Array.isArray(options.qcFailData) ? options.qcFailData : []
    };

    const grnHeaderInfoWithSourceData = {
      ...grnHeaderInfo,
      sourceData: sourceData
    };

    // Log data sizes for debugging (can be removed in production)
    console.log('Saving GRN log with source data:', {
      poRows: sourceData.purchaseOrderData.length,
      putawayRows: sourceData.putAwayData.length,
      qcFailRows: sourceData.qcFailData.length
    });

    // Save GRN log
    const { data: logData, error: logError } = await supabase
      .from(TABLES.GRN_LOGS)
      .insert([
        {
          document_number: documentNumber,
          brand_name: grnHeaderInfo.brandName || '',
          replenishment_number: grnHeaderInfo.replenishmentNumber || '',
          warehouse_no: grnHeaderInfo.warehouseNo || '',
          inward_date: grnHeaderInfo.inwardDate || '',
          po_number: grnHeaderInfo.poNumber || '',
          created_by: adminUsername,
          item_count: grnData.length,
          total_ordered_units: summary.totalOrderedUnits,
          total_received_units: summary.totalReceivedUnits,
          total_shortage_units: summary.totalShortageUnits,
          total_excess_units: summary.totalExcessUnits,
          total_not_ordered_units: summary.totalNotOrderedUnits,
          total_qc_passed_units: summary.totalQcPassedUnits,
          total_qc_failed_units: summary.totalQcFailedUnits,
          receipt_accuracy: summary.receiptAccuracy,
          qc_pass_rate: summary.qcPassRate,
          qc_performed: grnHeaderInfo.qcPerformed || false,
          acknowledge_only: options.acknowledgeOnly || false,
          grn_header_info: grnHeaderInfoWithSourceData, // JSONB field stores nested sourceData
          summary: summary,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (logError) {
      console.error('Error saving GRN log:', logError);
      return { success: false, error: logError.message };
    }

    // Verify sourceData was saved correctly
    if (logData?.grn_header_info?.sourceData) {
      console.log('Source data verified in saved log:', {
        poRows: logData.grn_header_info.sourceData.purchaseOrderData?.length || 0,
        putawayRows: logData.grn_header_info.sourceData.putAwayData?.length || 0,
        qcFailRows: logData.grn_header_info.sourceData.qcFailData?.length || 0
      });
    }

    // Save full GRN data
    if (logData && logData.id) {
      const { error: dataError } = await supabase
        .from(TABLES.GRN_DATA)
        .insert([
          {
            grn_log_id: logData.id,
            grn_data: grnData,
            created_at: new Date().toISOString()
          }
        ]);

      if (dataError) {
        console.error('Error saving GRN data:', dataError);
        // Log is saved, but data failed - still return success but log the error
      }
    }

    return { success: true, data: logData };
  } catch (error) {
    console.error('Error saving GRN log:', error);
    return { success: false, error: error.message };
  }
}

// Get all GRN logs
export async function getGRNLogs(limit = 1000) {
  try {
    const { data, error } = await supabase
      .from(TABLES.GRN_LOGS)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching GRN logs:', error);
      return [];
    }

    // Transform to match expected format
    return data.map(log => ({
      id: log.id,
      documentNumber: log.document_number,
      timestamp: log.created_at,
      createdAt: log.created_at,
      createdBy: log.created_by,
      grnHeaderInfo: log.grn_header_info || {},
      summary: log.summary || {},
      itemCount: log.item_count || 0,
      fullData: null // Will be loaded separately if needed
    }));
  } catch (error) {
    console.error('Error getting GRN logs:', error);
    return [];
  }
}

// Get a specific GRN log by ID with full data
export async function getGRNLogById(id) {
  try {
    // Get log
    const { data: logData, error: logError } = await supabase
      .from(TABLES.GRN_LOGS)
      .select('*')
      .eq('id', id)
      .single();

    if (logError || !logData) {
      return null;
    }

    // Get full data
    const { data: dataRows, error: dataError } = await supabase
      .from(TABLES.GRN_DATA)
      .select('grn_data')
      .eq('grn_log_id', id)
      .single();

    const log = {
      id: logData.id,
      documentNumber: logData.document_number,
      timestamp: logData.created_at,
      createdAt: logData.created_at,
      createdBy: logData.created_by,
      grnHeaderInfo: logData.grn_header_info || {},
      summary: logData.summary || {},
      itemCount: logData.item_count || 0,
      grnData: dataRows?.grn_data || null, // Use grnData for consistency
      fullData: dataRows?.grn_data || null // Keep fullData for backward compatibility
    };

    return log;
  } catch (error) {
    console.error('Error getting GRN log:', error);
    return null;
  }
}

// Delete a GRN log
export async function deleteGRNLog(id) {
  try {
    // Delete associated data first
    await supabase
      .from(TABLES.GRN_DATA)
      .delete()
      .eq('grn_log_id', id);

    // Delete log
    const { error } = await supabase
      .from(TABLES.GRN_LOGS)
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting GRN log:', error);
    return { success: false, error: error.message };
  }
}

// Clear all GRN logs
export async function clearAllGRNLogs() {
  try {
    // Delete all data
    await supabase
      .from(TABLES.GRN_DATA)
      .delete()
      .neq('id', 0);

    // Delete all logs
    const { error } = await supabase
      .from(TABLES.GRN_LOGS)
      .delete()
      .neq('id', 0);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error clearing GRN logs:', error);
    return { success: false, error: error.message };
  }
}


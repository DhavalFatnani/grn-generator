import { readFileSync } from 'fs';
import Papa from 'papaparse';

function parseCSV(filePath, options = {}) {
  try {
    const fileContent = readFileSync(filePath, 'utf-8');
    const result = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      trimHeaders: true,
      trim: true,
      ...options
    });
    return result.data;
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error.message);
    return [];
  }
}

async function analyzeData() {
  try {
    console.log('Analyzing CSV data with correct structure...\n');
    
    // Parse Purchase Order data - skip the first 24 rows (headers and metadata)
    const poFileContent = readFileSync('/Users/KNOT/Downloads/Apps/GrnMaster/grn-generator/public/Purchase Order - For Brands - Bonkers Corner - 1 (31.05.2025).csv', 'utf-8');
    const poLines = poFileContent.split('\n');
    const poDataContent = poLines.slice(24).join('\n'); // Skip first 24 lines
    const poResult = Papa.parse(poDataContent, {
      header: true,
      skipEmptyLines: true,
      trimHeaders: true,
      trim: true
    });
    const poData = poResult.data;
    
    console.log('Purchase Order Analysis:');
    console.log(`Total rows: ${poData.length}`);
    
    // Count unique SKUs in PO
    const poSkus = new Set();
    let totalOrderedQty = 0;
    
    poData.forEach(row => {
      const sku = row['Brand SKU Code'];
      const qty = parseInt(row.Quantity) || 0;
      if (sku) {
        poSkus.add(sku.trim().toUpperCase());
        totalOrderedQty += qty;
      }
    });
    
    console.log(`Unique SKUs in PO: ${poSkus.size}`);
    console.log(`Total ordered quantity: ${totalOrderedQty}`);
    console.log('Sample PO SKUs:', Array.from(poSkus).slice(0, 5));
    
    // Parse Put Away data
    const putAwayData = parseCSV('/Users/KNOT/Downloads/Apps/GrnMaster/grn-generator/public/June Inwarding - New Warehouse - BONKER\'S CORNER Inv.csv');
    console.log('\nPut Away Analysis:');
    console.log(`Total rows: ${putAwayData.length}`);
    
    // Count unique SKUs in Put Away
    const putAwaySkus = new Set();
    let totalPutAwayQty = 0;
    
    putAwayData.forEach(row => {
      const sku = row['SKU ID'];
      if (sku) {
        putAwaySkus.add(sku.trim().toUpperCase());
        totalPutAwayQty += 1; // Each row represents 1 unit
      }
    });
    
    console.log(`Unique SKUs in Put Away: ${putAwaySkus.size}`);
    console.log(`Total put away quantity: ${totalPutAwayQty}`);
    console.log('Sample Put Away SKUs:', Array.from(putAwaySkus).slice(0, 5));
    
    // Find SKUs that are in PO but not in Put Away
    const notReceivedSkus = new Set();
    poSkus.forEach(sku => {
      if (!putAwaySkus.has(sku)) {
        notReceivedSkus.add(sku);
      }
    });
    
    // Find SKUs that are in Put Away but not in PO
    const notOrderedSkus = new Set();
    putAwaySkus.forEach(sku => {
      if (!poSkus.has(sku)) {
        notOrderedSkus.add(sku);
      }
    });
    
    console.log('\nDiscrepancy Analysis:');
    console.log(`SKUs in PO but not received: ${notReceivedSkus.size}`);
    console.log(`SKUs received but not ordered: ${notOrderedSkus.size}`);
    
    // Calculate quantities for not received items
    let notReceivedQty = 0;
    poData.forEach(row => {
      const sku = row['Brand SKU Code'];
      const qty = parseInt(row.Quantity) || 0;
      if (sku && notReceivedSkus.has(sku.trim().toUpperCase())) {
        notReceivedQty += qty;
      }
    });
    
    console.log(`Total quantity not received: ${notReceivedQty}`);
    console.log(`Total quantity not ordered: ${notOrderedSkus.size}`); // Each SKU appears once in put away
    
    // Check for SKU format differences
    console.log('\nSKU Format Analysis:');
    const poSkuFormats = new Set();
    const putAwaySkuFormats = new Set();
    
    poData.slice(0, 10).forEach(row => {
      const sku = row['Brand SKU Code'];
      if (sku) {
        poSkuFormats.add(sku.length);
      }
    });
    
    putAwayData.slice(0, 10).forEach(row => {
      const sku = row['SKU ID'];
      if (sku) {
        putAwaySkuFormats.add(sku.length);
      }
    });
    
    console.log('PO SKU lengths:', Array.from(poSkuFormats));
    console.log('Put Away SKU lengths:', Array.from(putAwaySkuFormats));
    
    // Show some examples of mismatched SKUs
    console.log('\nSample Not Received SKUs:', Array.from(notReceivedSkus).slice(0, 5));
    console.log('Sample Not Ordered SKUs:', Array.from(notOrderedSkus).slice(0, 5));
    
    // Check for exact matches between PO and Put Away SKUs
    const matchingSkus = new Set();
    poSkus.forEach(sku => {
      if (putAwaySkus.has(sku)) {
        matchingSkus.add(sku);
      }
    });
    
    console.log(`\nMatching SKUs between PO and Put Away: ${matchingSkus.size}`);
    console.log('Sample matching SKUs:', Array.from(matchingSkus).slice(0, 5));
    
    // Detailed analysis of some specific SKUs
    console.log('\nDetailed SKU Analysis:');
    const samplePoSkus = Array.from(poSkus).slice(0, 3);
    samplePoSkus.forEach(sku => {
      const poRow = poData.find(row => row['Brand SKU Code']?.trim().toUpperCase() === sku);
      const putAwayRows = putAwayData.filter(row => row['SKU ID']?.trim().toUpperCase() === sku);
      console.log(`\nSKU: ${sku}`);
      console.log(`  PO Quantity: ${poRow ? poRow.Quantity : 'Not found'}`);
      console.log(`  Put Away Count: ${putAwayRows.length}`);
      console.log(`  Put Away Bins: ${[...new Set(putAwayRows.map(r => r['BIN LOCATION']))].join(', ')}`);
    });
    
  } catch (error) {
    console.error('Error analyzing data:', error);
  }
}

analyzeData(); 
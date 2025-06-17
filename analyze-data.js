const fs = require('fs');
const csv = require('csv-parser');

// Function to parse CSV data
function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

async function analyzeData() {
  try {
    console.log('Analyzing CSV data...\n');
    
    // Parse Purchase Order data
    const poData = await parseCSV('/Users/KNOT/Downloads/Purchase Order - For Brands - Bonkers Corner - 1 (31.05.2025).csv');
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
    const putAwayData = await parseCSV('/Users/KNOT/Downloads/June Inwarding - New Warehouse - BONKER\'S CORNER Inv.csv');
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
    
  } catch (error) {
    console.error('Error analyzing data:', error);
  }
}

analyzeData(); 
import fs from 'fs';
import zlib from 'zlib';
import path from 'path';

async function buildMap() {
    console.log('Fetching Upstox instruments...');
    const res = await fetch('https://assets.upstox.com/market-quote/instruments/exchange/complete.csv.gz');
    const buf = await res.arrayBuffer();
    
    console.log('Unzipping...');
    const csvBuffer = zlib.gunzipSync(Buffer.from(buf));
    const csvString = csvBuffer.toString('utf-8');
    
    console.log('Parsing CSV...');
    const lines = csvString.split('\n');
    const instrumentMap = {};
    let count = 0;
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Split by comma and strip quotes
        const parts = line.split(',').map(p => p.replace(/^"|"$/g, ''));
        if (parts.length < 11) continue;
        
        const instrument_key = parts[0];
        const tradingsymbol = parts[2];
        const exchange = parts[11];
        
        if (exchange === 'NSE_EQ' || exchange === 'BSE_EQ' || exchange === 'NSE_INDEX' || exchange === 'BSE_INDEX') {
            if (!instrumentMap[tradingsymbol] || exchange === 'NSE_EQ' || exchange === 'NSE_INDEX') {
                instrumentMap[tradingsymbol] = instrument_key;
                count++;
            }
        }
    }
    
    const OUT_FILE = path.join(process.cwd(), 'frontend/src/data/upstoxInstrumentMap.json');
    fs.writeFileSync(OUT_FILE, JSON.stringify(instrumentMap, null, 2));
    console.log(`Successfully mapped ${count} instruments to ${OUT_FILE}`);
}

buildMap().catch(console.error);

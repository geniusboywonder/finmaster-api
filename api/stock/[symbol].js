// FinMaster Stock API - Yahoo Finance Integration
export default async function handler(req, res) {
  const { symbol } = req.query;
  
  // Enable CORS for all origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (!symbol) {
    return res.status(400).json({ 
      error: 'Symbol is required',
      usage: 'GET /api/stock/AAPL or /api/stock/JSE:STXRES'
    });
  }

  try {
    // Clean up symbol format for Yahoo Finance
    let cleanSymbol = symbol.toUpperCase();
    
    // Handle JSE stocks - add .JO suffix
    if (symbol.includes('JSE:')) {
      cleanSymbol = symbol.replace('JSE:', '') + '.JO';
    }
    
    console.log(`Fetching data for symbol: ${cleanSymbol}`);
    
    // Fetch from Yahoo Finance API
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(cleanSymbol)}`;
    
    const response = await fetch(yahooUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FinMaster/1.0)',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Yahoo Finance API returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Validate response structure
    if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
      throw new Error(`No data found for symbol: ${symbol}`);
    }
    
    const result = data.chart.result[0];
    
    // Check if we have valid data
    if (!result.meta || !result.indicators) {
      throw new Error(`Invalid data structure for symbol: ${symbol}`);
    }
    
    // Add metadata for better error tracking
    const responseData = {
      ...data,
      metadata: {
        requestedSymbol: symbol,
        cleanedSymbol: cleanSymbol,
        timestamp: new Date().toISOString(),
        source: 'Yahoo Finance',
        status: 'success'
      }
    };
    
    return res.status(200).json(responseData);
    
  } catch (error) {
    console.error('API Error for symbol', symbol, ':', error.message);
    
    return res.status(500).json({ 
      error: 'Failed to fetch stock data',
      symbol: symbol,
      details: error.message,
      timestamp: new Date().toISOString(),
      suggestions: [
        'Check if symbol exists (try AAPL, MSFT, GOOGL)',
        'For JSE stocks use format: JSE:STXRES',
        'Ensure symbol is correctly formatted'
      ]
    });
  }
}

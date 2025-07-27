// /api/health.js
// Simple health check endpoint to test CORS

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Test Yahoo Finance API connectivity
    const testResponse = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/AAPL', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const yahooStatus = testResponse.ok ? 'connected' : 'error';
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      yahooFinanceAPI: yahooStatus,
      cors: 'enabled',
      version: '1.0.0'
    });
    
  } catch (error) {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      yahooFinanceAPI: 'error',
      cors: 'enabled',
      version: '1.0.0',
      error: error.message
    });
  }
}

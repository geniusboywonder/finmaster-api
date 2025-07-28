export default async function handler(req, res) {
  // Set CORS headers for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.setHeader('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests for stock data
  if (req.method !== 'GET') {
    res.status(405).json({ 
      error: 'Method not allowed',
      message: 'Only GET requests are supported'
    });
    return;
  }

  const { symbol } = req.query;

  // Validate symbol parameter
  if (!symbol || typeof symbol !== 'string' || symbol.trim().length === 0) {
    res.status(400).json({
      error: 'Invalid symbol',
      message: 'Symbol parameter is required and must be a non-empty string'
    });
    return;
  }

  // Clean symbol without enforcing format
  const cleanSymbol = symbol.trim();

  try {
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(cleanSymbol)}`;
    console.log(`Fetching data for symbol: ${cleanSymbol}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(yahooUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.chart || !data.chart.result || !data.chart.result[0]) {
      res.status(404).json({
        error: 'Symbol not found',
        message: `No data available for symbol: ${cleanSymbol}`,
        symbol: cleanSymbol
      });
      return;
    }

    const result = data.chart.result[0];
    const meta = result.meta;

    if (!meta || typeof meta.regularMarketPrice === 'undefined') {
      res.status(404).json({
        error: 'No market data',
        message: `Market data not available for symbol: ${cleanSymbol}`,
        symbol: cleanSymbol
      });
      return;
    }

    const currentPrice = meta.regularMarketPrice;
    const previousClose = meta.previousClose || meta.chartPreviousClose;
    const dayChange = currentPrice && previousClose ? currentPrice - previousClose : 0;
    const dayChangePercent = previousClose ? (dayChange / previousClose) * 100 : 0;

    const stockData = {
      symbol: meta.symbol || cleanSymbol,
      currentPrice,
      previousClose,
      dayChange,
      dayChangePercent,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
      regularMarketVolume: meta.regularMarketVolume,
      currency: meta.currency || 'USD',
      exchangeName: meta.fullExchangeName || meta.exchangeName,
      marketState: meta.marketState,
      timestamp: new Date().toISOString(),
      chart: data.chart
    };

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    console.log(`Successfully fetched data for ${cleanSymbol}: $${currentPrice}`);
    res.status(200).json(stockData);

  } catch (error) {
    console.error(`Error fetching data for ${cleanSymbol}:`, error);

    if (error.name === 'AbortError') {
      res.status(408).json({
        error: 'Request timeout',
        message: 'Yahoo Finance API request timed out',
        symbol: cleanSymbol
      });
    } else if (error.message.includes('fetch')) {
      res.status(503).json({
        error: 'Service unavailable',
        message: 'Unable to connect to Yahoo Finance API',
        symbol: cleanSymbol
      });
    } else {
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
        symbol: cleanSymbol
      });
    }
  }
}

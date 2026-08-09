// Vercel Serverless Function Proxy for AI Chat requests
export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method Not Allowed' } });
  }

  try {
    const apiKey = process.env.VITE_NINEROUTER_API_KEY || process.env.NINEROUTER_API_KEY || 'sk-f040bde5ab80cf9c-nut82e-f2995b77';
    let baseUrl = process.env.VITE_NINEROUTER_BASE_URL || process.env.NINEROUTER_BASE_URL || 'https://openrouter.ai/api/v1/chat/completions';

    // If configured URL is localhost, fallback to OpenRouter HTTPS for production Vercel
    if (!baseUrl || baseUrl.includes('localhost')) {
      baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
    }

    const authHeader = req.headers.authorization || `Bearer ${apiKey}`;

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'HTTP-Referer': req.headers['http-referer'] || 'https://vercel.app',
        'X-Title': 'FitCoach AI',
        'Content-Type': 'application/json'
      },
      body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    console.error('API Proxy Error:', err);
    return res.status(500).json({ error: { message: err.message || 'Serverless Proxy Error' } });
  }
}

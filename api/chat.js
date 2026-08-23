export default async function handler(req, res) {
  // Handle CORS preflight if needed
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { messages, model, temperature, provider } = req.body || {};

    // Retrieve server-side hidden API Keys (fallback to VITE_ keys if testing locally)
    let apiKey = process.env.NINEROUTER_API_KEY || process.env.VITE_NINEROUTER_API_KEY;
    let baseUrl = process.env.NINEROUTER_BASE_URL || process.env.VITE_NINEROUTER_BASE_URL || 'https://r7nnd8p.abc-tunnel.us/v1/chat/completions';

    if (provider === 'xkiro' || (model && (model.includes('deepseek') || model.includes('xkiro')))) {
      apiKey = process.env.XKIRO_API_KEY || process.env.VITE_XKIRO_API_KEY || apiKey;
      baseUrl = process.env.XKIRO_BASE_URL || process.env.VITE_XKIRO_BASE_URL || 'https://api.xkiro.com/v1/chat/completions';
    }

    if (!apiKey) {
      return res.status(500).json({ error: 'Serverless Proxy Error: API Key is missing on Vercel environment variables.' });
    }

    const aiResponse = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'gemini/gemini-3.7-flash',
        messages: messages || [],
        temperature: temperature ?? 0.7
      })
    });

    const data = await aiResponse.json();
    return res.status(aiResponse.status).json(data);
  } catch (error) {
    console.error('Serverless proxy error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}

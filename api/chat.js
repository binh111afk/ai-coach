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

    let apiKey = '';
    let baseUrl = '';

    // Determine whether to call XKiro or 9Router
    const isXkiro = provider === 'xkiro' || (model && (model.includes('deepseek') || model.includes('xkiro')));

    if (isXkiro) {
      apiKey = process.env.XKIRO_API_KEY || process.env.VITE_XKIRO_API_KEY;
      baseUrl = process.env.XKIRO_BASE_URL || process.env.VITE_XKIRO_BASE_URL || 'https://api.xkiro.com/v1/chat/completions';
    }

    // Fallback to 9Router if not XKiro or if XKiro key is missing
    if (!apiKey) {
      apiKey = process.env.NINEROUTER_API_KEY || process.env.VITE_NINEROUTER_API_KEY;
      baseUrl = process.env.NINEROUTER_BASE_URL || process.env.VITE_NINEROUTER_BASE_URL || 'https://r7nnd8p.abc-tunnel.us/v1/chat/completions';
    }

    // If 9Router key was selected but missing, fallback to XKiro key if available
    if (!apiKey) {
      apiKey = process.env.XKIRO_API_KEY || process.env.VITE_XKIRO_API_KEY;
      baseUrl = process.env.XKIRO_BASE_URL || process.env.VITE_XKIRO_BASE_URL || 'https://api.xkiro.com/v1/chat/completions';
    }

    if (!apiKey) {
      console.error('[Vercel Serverless Proxy] Missing API keys');
      return res.status(500).json({ error: 'Serverless Proxy Error: Neither NINEROUTER_API_KEY nor XKIRO_API_KEY is configured on Vercel Environment Variables.' });
    }

    if (!baseUrl.includes('/chat/completions')) {
      baseUrl = baseUrl.replace(/\/+$/, '') + '/chat/completions';
    }

    const modelToUse = model || (isXkiro ? 'deepseek/deepseek-v4-pro' : 'gemini/gemini-3.7-flash');
    console.log(`[Vercel Serverless Proxy] Dispatching request to ${baseUrl} with model ${modelToUse}...`);

    const aiResponse = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: messages || [],
        temperature: temperature ?? 0.7
      })
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error(`[Vercel Serverless Proxy] AI Provider HTTP ${aiResponse.status}:`, errText);
      return res.status(aiResponse.status).json({ error: `AI Provider HTTP ${aiResponse.status}`, details: errText });
    }

    const data = await aiResponse.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('[Vercel Serverless Proxy] Internal Exception:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}

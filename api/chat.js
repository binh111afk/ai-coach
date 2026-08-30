export default async function handler(req, res) {
  // Handle CORS preflight if needed
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { messages, model, temperature, provider, apiKey: clientApiKey } = req.body || {};

    let apiKey = '';
    let baseUrl = '';

    // Client tự nhập API key (lưu local trên máy người dùng) → ưu tiên dùng key này
    if (clientApiKey && typeof clientApiKey === 'string' && clientApiKey.length > 10) {
      apiKey = clientApiKey;
    }

    const isGemini = provider === 'gemini' || (!provider && model && model.startsWith('gemini-') && !model.includes('/'));
    const isXkiro = provider === 'xkiro' || (!provider && model && (model.includes('deepseek') || model.includes('xkiro')));

    if (isGemini) {
      baseUrl = process.env.GEMINI_BASE_URL || process.env.VITE_GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
      if (!apiKey) {
        apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
      }
    } else if (isXkiro) {
      baseUrl = process.env.XKIRO_BASE_URL || process.env.VITE_XKIRO_BASE_URL || 'https://api.xkiro.com/v1/chat/completions';
      if (!apiKey) {
        apiKey = process.env.XKIRO_API_KEY || process.env.VITE_XKIRO_API_KEY;
      }
    } else {
      // Mặc định: XKiro (nguồn do app cung cấp)
      baseUrl = process.env.XKIRO_BASE_URL || process.env.VITE_XKIRO_BASE_URL || 'https://api.xkiro.com/v1/chat/completions';
      if (!apiKey) {
        apiKey = process.env.XKIRO_API_KEY || process.env.VITE_XKIRO_API_KEY;
      }
    }

    // Fallback chain giữa các provider (chỉ khi client không cung cấp key riêng)
    if (!apiKey && !clientApiKey) {
      // Gemini không có key server → quay về nguồn XKiro do app cung cấp
      apiKey = process.env.XKIRO_API_KEY || process.env.VITE_XKIRO_API_KEY;
      baseUrl = process.env.XKIRO_BASE_URL || process.env.VITE_XKIRO_BASE_URL || 'https://api.xkiro.com/v1/chat/completions';
    }

    if (!apiKey) {
      console.error('[Vercel Serverless Proxy] Missing API keys');
      return res.status(500).json({ error: 'Serverless Proxy Error: No API key configured. Vui lòng nhập API key của bạn trong Cài đặt / Onboarding, hoặc cấu hình env trên Vercel.' });
    }

    if (!baseUrl.includes('/chat/completions')) {
      baseUrl = baseUrl.replace(/\/+$/, '') + '/chat/completions';
    }

    const defaultModel = isGemini ? 'gemini-2.5-flash' : 'deepseek/deepseek-v4-pro';
    const modelToUse = model || defaultModel;
    console.log(`[Vercel Serverless Proxy] Dispatching request to ${baseUrl} (${provider || 'auto'}) with model ${modelToUse}...`);

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

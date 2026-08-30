// Serverless proxy: kiểm tra API key & liệt kê model khả dụng của provider.
// URL đích là hằng số tĩnh theo provider (không nhận URL từ client/env) — chống SSRF.
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { provider, apiKey: clientKey } = req.body || {};

    // Key do client tự nhập được ưu tiên; không có thì dùng key env của server
    let apiKey = (clientKey && typeof clientKey === 'string' && clientKey.length > 10) ? clientKey : '';
    if (!apiKey) {
      if (provider === 'gemini') apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
      else if (provider === 'xkiro') apiKey = process.env.XKIRO_API_KEY || process.env.VITE_XKIRO_API_KEY;
      else apiKey = process.env.NINEROUTER_API_KEY || process.env.VITE_NINEROUTER_API_KEY;
    }

    if (!apiKey) {
      return res.status(200).json({ ok: false, message: 'Chưa có API key để kiểm tra. Vui lòng nhập key trước.' });
    }

    // Chỉ cho phép gọi tới các host nhà cung cấp trong allowlist tĩnh
    const modelsUrl = PROVIDER_MODELS_URL[provider] || PROVIDER_MODELS_URL.ninerouter;

    // Gemini dùng endpoint native + header x-goog-api-key; các router OpenAI-compatible dùng Bearer
    const headers = provider === 'gemini'
      ? { 'x-goog-api-key': apiKey }
      : { 'Authorization': `Bearer ${apiKey}` };

    const r = await fetch(modelsUrl, { headers });
    if (!r.ok) {
      const detail = (await r.text()).slice(0, 300);
      const message = (r.status === 401 || r.status === 403)
        ? 'API key không hợp lệ hoặc không có quyền truy cập.'
        : `Không kết nối được nhà cung cấp (HTTP ${r.status}).`;
      return res.status(200).json({ ok: false, message, detail });
    }

    const data = await r.json();
    const models = parseModelsResponse(data, provider);

    return res.status(200).json({ ok: true, count: models.length, models });
  } catch (error) {
    return res.status(200).json({ ok: false, message: 'Không kết nối được nhà cung cấp. Vui lòng kiểm tra mạng rồi thử lại.' });
  }
}

// Bảng URL tĩnh (literal) — endpoint liệt kê model của từng nhà cung cấp
const PROVIDER_MODELS_URL = {
  // Endpoint native ListModels (theo tài liệu ai.google.dev) — hỗ trợ header x-goog-api-key
  gemini: 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000',
  xkiro: 'https://api.xkiro.com/v1/models',
  ninerouter: 'https://r7nnd8p.abc-tunnel.us/v1/models'
};

// Parse 2 định dạng: OpenAI-compat ({data:[{id}]}) và Gemini native ({models:[{name, supportedGenerationMethods}]})
function parseModelsResponse(data, provider) {
  let models = [];
  if (Array.isArray(data?.data)) {
    models = data.data.map(m => m.id).filter(Boolean).map(id => String(id).replace(/^models\//, ''));
  } else if (Array.isArray(data?.models)) {
    models = data.models
      .filter(m => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes('generateContent'))
      .map(m => m.name).filter(Boolean).map(id => String(id).replace(/^models\//, ''));
  }
  if (provider === 'gemini') {
    const exclude = /embedding|aqa|imagen|veo|tts|audio|live|gemma|learnlm|robotics/i;
    models = models.filter(id => /^gemini/i.test(id) && !exclude.test(id));
  }
  return [...new Set(models)].sort();
}

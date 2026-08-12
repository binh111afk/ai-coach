const apiKey = "sk-f040bde5ab80cf9c-nut82e-f2995b77";
const baseUrl = "https://r7nnd8p.abc-tunnel.us/v1/chat/completions";

const modelsToTest = [
  "Tencent-Hunyuan/Hy3",
  "tencent-hunyuan/hy3",
  "tencent/hunyuan-hy3",
  "tencent/hunyuan",
  "openrouter/tencent/hunyuan-hy3:free",
  "openrouter/tencent/hunyuan:free",
  "oc/hunyuan-hy3-free",
  "oc/hunyuan-free"
];

async function check(m) {
  try {
    const res = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ model: m, messages: [{ role: "user", content: "Hi" }], max_tokens: 20 })
    });
    const text = await res.text();
    return { model: m, status: res.status, ok: res.ok, snippet: text.slice(0, 150).replace(/\n/g, ' ') };
  } catch (e) {
    return { model: m, status: 'ERR', ok: false, snippet: e.message };
  }
}

async function run() {
  const out = [];
  for (const m of modelsToTest) {
    out.push(await check(m));
  }
  console.table(out);
}

run();

const modelscopeKey = "ms-fc2cfe61-4490-4e07-8e04-333e9c17362d";
const ninerouterKey = "";

const modelscopeUrl = "https://api-inference.modelscope.cn/v1/chat/completions";
const ninerouterUrl = "http://localhost:20128/v1/chat/completions";
const llm7Url = "https://api.llm7.io/v1/chat/completions";

const testModels = [
  "alims-intl/qwen3.5-plus",
  "alims-intl/qwen-3.5-plus",
  "qwen3.5-plus"
];

async function checkModelScope(m) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(modelscopeUrl, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${modelscopeKey}` },
      body: JSON.stringify({ model: m, messages: [{ role: "user", content: "Hi" }], max_tokens: 20 })
    });
    clearTimeout(timer);
    const text = await res.text();
    return { provider: "ModelScope", model: m, status: res.status, ok: res.ok, snippet: text.slice(0, 120).replace(/\n/g, ' ') };
  } catch (e) {
    return { provider: "ModelScope", model: m, status: "ERR", ok: false, snippet: e.message };
  }
}

async function check9Router(m) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(ninerouterUrl, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ninerouterKey}` },
      body: JSON.stringify({ model: m, messages: [{ role: "user", content: "Hi" }], max_tokens: 20 })
    });
    clearTimeout(timer);
    const text = await res.text();
    return { provider: "9Router", model: m, status: res.status, ok: res.ok, snippet: text.slice(0, 120).replace(/\n/g, ' ') };
  } catch (e) {
    return { provider: "9Router", model: m, status: "ERR", ok: false, snippet: e.message };
  }
}

async function checkLLM7(m) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(llm7Url, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", "Authorization": "Bearer unused" },
      body: JSON.stringify({ model: m, messages: [{ role: "user", content: "Hi" }], max_tokens: 20 })
    });
    clearTimeout(timer);
    const text = await res.text();
    return { provider: "LLM7", model: m, status: res.status, ok: res.ok, snippet: text.slice(0, 120).replace(/\n/g, ' ') };
  } catch (e) {
    return { provider: "LLM7", model: m, status: "ERR", ok: false, snippet: e.message };
  }
}

async function run() {
  console.log("Testing alims-intl/qwen3.5-plus...");
  const out = [];
  for (const m of testModels) {
    out.push(await checkModelScope(m));
    out.push(await check9Router(m));
    out.push(await checkLLM7(m));
  }
  console.table(out);
}

run();

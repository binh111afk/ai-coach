const ninerouterKey = "sk-f040bde5ab80cf9c-nut82e-f2995b77";
const ninerouterUrl = "https://r7nnd8p.abc-tunnel.us/v1/chat/completions";
const llm7Url = "https://api.llm7.io/v1/chat/completions";

const modelVariants = [
  "tokenrouter/qwen/qwen3.8-max",
  "qwen/qwen3.8-max",
  "qwen3.8-max",
  "qwen/qwen-3.8-max"
];

async function check9Router(m) {
  try {
    const res = await fetch(ninerouterUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ninerouterKey}` },
      body: JSON.stringify({ model: m, messages: [{ role: "user", content: "Hi" }], max_tokens: 20 })
    });
    const text = await res.text();
    return { provider: "9Router", model: m, status: res.status, ok: res.ok, snippet: text.slice(0, 150).replace(/\n/g, ' ') };
  } catch (e) {
    return { provider: "9Router", model: m, status: 'ERR', ok: false, snippet: e.message };
  }
}

async function checkLLM7(m) {
  try {
    const res = await fetch(llm7Url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer unused" },
      body: JSON.stringify({ model: m, messages: [{ role: "user", content: "Hi" }], max_tokens: 20 })
    });
    const text = await res.text();
    return { provider: "LLM7", model: m, status: res.status, ok: res.ok, snippet: text.slice(0, 150).replace(/\n/g, ' ') };
  } catch (e) {
    return { provider: "LLM7", model: m, status: 'ERR', ok: false, snippet: e.message };
  }
}

async function run() {
  console.log("Testing tokenrouter/qwen/qwen3.8-max on 9Router & LLM7...");
  const out = [];
  for (const m of modelVariants) {
    out.push(await check9Router(m));
    out.push(await checkLLM7(m));
  }
  console.table(out);
}

run();

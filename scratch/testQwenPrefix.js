const ninerouterKey = "sk-f040bde5ab80cf9c-nut82e-f2995b77";
const ninerouterUrl = "http://localhost:20128/v1/chat/completions";

const testModels = [
  "modelscope/Qwen/Qwen2.5-72B-Instruct",
  "modelscope/Qwen2.5-72B-Instruct",
  "modelscope/qwen-2.5-72b-instruct",
  "model-scope/Qwen/Qwen2.5-72B-Instruct",
  "dashscope/Qwen/Qwen2.5-72B-Instruct",
  "alibabacloud/Qwen/Qwen2.5-72B-Instruct"
];

async function check(m) {
  try {
    const res = await fetch(ninerouterUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ninerouterKey}` },
      body: JSON.stringify({ model: m, messages: [{ role: "user", content: "Hi" }], max_tokens: 15 })
    });
    const text = await res.text();
    return { model: m, status: res.status, ok: res.ok, preview: text.slice(0, 100).replace(/\n/g, ' ') };
  } catch (e) {
    return { model: m, status: 'ERR', ok: false, preview: e.message };
  }
}

async function run() {
  const out = [];
  for (const m of testModels) {
    out.push(await check(m));
  }
  console.table(out);
}

run();

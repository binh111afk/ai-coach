const ninerouterKey = "sk-f040bde5ab80cf9c-nut82e-f2995b77";
const ninerouterUrl = "http://localhost:20128/v1/chat/completions";

const qwenModels9Router = [
  "ms/Qwen/Qwen2.5-72B-Instruct",
  "oc/qwen-2.5-72b-instruct-free",
  "openrouter/qwen/qwen-2.5-72b-instruct:free",
  "qwen/qwen-2.5-72b-instruct"
];

async function check(m) {
  try {
    const res = await fetch(ninerouterUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ninerouterKey}`
      },
      body: JSON.stringify({
        model: m,
        messages: [{ role: "user", content: "Chào bạn! Hãy giới thiệu bạn là AI model nào bằng 1 câu ngắn." }],
        max_tokens: 50
      })
    });
    const status = res.status;
    const text = await res.text();
    let preview = "";
    if (res.ok) {
      try {
        const json = JSON.parse(text);
        preview = json.choices?.[0]?.message?.content || text.slice(0, 100);
      } catch {
        preview = text.slice(0, 100);
      }
    } else {
      try {
        const json = JSON.parse(text);
        preview = json.error?.message || text.slice(0, 120);
      } catch {
        preview = text.slice(0, 120);
      }
    }
    return { model: m, status, ok: res.ok, preview: preview.replace(/\n/g, ' ') };
  } catch (e) {
    return { model: m, status: 'ERR', ok: false, preview: e.message };
  }
}

async function run() {
  console.log("Testing Qwen models through local 9Router proxy (http://localhost:20128)...");
  const out = [];
  for (const m of qwenModels9Router) {
    console.log(`Calling 9Router with model ${m}...`);
    const r = await check(m);
    console.log(`-> ${r.model}: Status=${r.status}, OK=${r.ok}, Preview=${r.preview}`);
    out.push(r);
  }
  console.table(out);
}

run();

const apiKey = process.env.MODELSCOPE_API_KEY || "";
const baseUrl = "https://api-inference.modelscope.cn/v1/chat/completions";

const qwenModels = [
  "Qwen/Qwen2.5-72B-Instruct",
  "Qwen/Qwen2.5-Coder-32B-Instruct",
  "Qwen/Qwen2.5-14B-Instruct",
  "Qwen/Qwen2.5-7B-Instruct",
  "qwen/qwen-2.5-72b-instruct"
];

async function check(m) {
  try {
    const res = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: m,
        messages: [{ role: "user", content: "Chào bạn! Cho tôi biết bạn là AI model nào bằng 1 câu ngắn gọn." }],
        max_tokens: 60
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
  console.log("Testing Qwen models on ModelScope with newly updated SDK Token...");
  const out = [];
  for (const m of qwenModels) {
    console.log(`Calling ${m}...`);
    const r = await check(m);
    console.log(`-> ${r.model}: Status=${r.status}, OK=${r.ok}, Preview=${r.preview}`);
    out.push(r);
  }
  console.table(out);
}

run();

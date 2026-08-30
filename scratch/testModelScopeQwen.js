const apiKey = process.env.MODELSCOPE_API_KEY || "";
const baseUrl = "https://api-inference.modelscope.cn/v1/chat/completions";

const freeQwenModels = [
  "Qwen/Qwen2.5-7B-Instruct",
  "Qwen/Qwen2.5-14B-Instruct",
  "Qwen/Qwen2.5-Coder-7B-Instruct",
  "Qwen/Qwen2.5-Coder-32B-Instruct",
  "Qwen/Qwen2-7B-Instruct",
  "qwen/Qwen2.5-7B-Instruct"
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
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 15
      })
    });
    const text = await res.text();
    return { model: m, status: res.status, ok: res.ok, preview: text.slice(0, 120).replace(/\n/g, ' ') };
  } catch (e) {
    return { model: m, status: 'ERR', ok: false, preview: e.message };
  }
}

async function run() {
  console.log("Testing ModelScope free Qwen models...");
  const out = [];
  for (const m of freeQwenModels) {
    out.push(await check(m));
  }
  console.table(out);
}

run();

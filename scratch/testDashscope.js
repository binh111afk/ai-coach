const apiKey = "ms-fc2cfe61-4490-4e07-8e04-333e9c17362d";

const endpoints = [
  "https://api-inference.modelscope.cn/v1/chat/completions",
  "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
];

const models = [
  "Qwen/Qwen2.5-72B-Instruct",
  "Qwen/Qwen2.5-Coder-32B-Instruct",
  "qwen-plus"
];

async function check(url, model) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 15
      })
    });
    clearTimeout(timer);
    const status = res.status;
    const text = await res.text();
    let preview = "";
    if (res.ok) {
      try {
        const json = JSON.parse(text);
        preview = json.choices?.[0]?.message?.content || text.slice(0, 80);
      } catch {
        preview = text.slice(0, 80);
      }
    } else {
      preview = text.slice(0, 100);
    }
    return { provider: url.includes('dashscope') ? 'DashScope' : 'ModelScope', model, status, ok: res.ok, preview: preview.replace(/\n/g, ' ') };
  } catch (e) {
    return { provider: url.includes('dashscope') ? 'DashScope' : 'ModelScope', model, status: 'ERR', ok: false, preview: e.message };
  }
}

async function run() {
  console.log("Testing Alibaba DashScope & ModelScope endpoints...");
  const out = [];
  for (const url of endpoints) {
    for (const m of models) {
      console.log(`Checking ${url} -> ${m}...`);
      const r = await check(url, m);
      console.log(`-> Status=${r.status}, OK=${r.ok}, Preview=${r.preview}`);
      out.push(r);
    }
  }
  console.table(out);
}

run();

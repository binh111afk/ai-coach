const ninerouterKey = "";
const ninerouterUrl = "http://localhost:20128/v1/chat/completions";

const modelsToTest = [
  "oc/Qwen/Qwen3.5-27B",
  "oc/Qwen/Qwen3-Coder-30B-A3B-Instruct",
  "oc/Qwen/Qwen3-Next-80B-A3B-Instruct",
  "oc/Tencent-Hunyuan/Hy3",
  "oc/MiniMax/MiniMax-M3"
];

async function check(m) {
  try {
    const res = await fetch(ninerouterUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ninerouterKey}` },
      body: JSON.stringify({
        model: m,
        messages: [{ role: "user", content: "Chào bạn, hãy giới thiệu 1 câu ngắn." }],
        max_tokens: 40
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
      preview = text.slice(0, 120);
    }
    return { model: m, status, ok: res.ok, preview: preview.replace(/\n/g, ' ') };
  } catch (e) {
    return { model: m, status: 'ERR', ok: false, preview: e.message };
  }
}

async function run() {
  console.log("Testing live Qwen / Hunyuan / MiniMax models on 9Router...");
  const out = [];
  for (const m of modelsToTest) {
    console.log(`Calling ${m}...`);
    out.push(await check(m));
  }
  console.table(out);
}

run();

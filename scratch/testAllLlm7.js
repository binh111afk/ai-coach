const baseUrl = "https://api.llm7.io/v1/chat/completions";

const modelsToTest = [
  "gpt-5.5",
  "deepseek-v4-flash:0731",
  "deepseek-v4-pro",
  "claude-fable-5",
  "claude-opus-4-8",
  "claude-opus-5",
  "claude-sonnet-5",
  "seed-2.0-mini",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-low",
  "gemini-omni-flash",
  "L3-8B-Lunaris-v1-Turbo",
  "Inkling",
  "Inkling-Small",
  "kling-v3.0-pro",
  "kling-v3.0-turbo",
  "minimax-m2.7",
  "codestral-latest",
  "mistral-Nemo-Instruct-2407",
  "mistral-Small-24B-Instruct-2501",
  "kimi-k2.6",
  "kimi-k2.7-code",
  "kimi-k3",
  "gpt-5.4",
  "gpt-5.4-mini",
  "gpt-5.6-sol",
  "gpt-5.6-terra",
  "gpt-image-2",
  "gpt-oss:20b",
  "seedance-2.0",
  "seedance-2.0-fast",
  "seedance-2.0-mini",
  "XiaomiMiMo/MiMo-V2.5",
  "XiaomiMiMo/MiMo-V2.5-Pro",
  "glm-5.2"
];

async function checkModel(m) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(baseUrl, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer unused"
      },
      body: JSON.stringify({
        model: m,
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
      try {
        const json = JSON.parse(text);
        preview = json.error?.message || text.slice(0, 80);
      } catch {
        preview = text.slice(0, 80);
      }
    }
    return { model: m, status, ok: res.ok, preview: preview.replace(/\n/g, ' ') };
  } catch (e) {
    return { model: m, status: "ERR", ok: false, preview: e.message };
  }
}

async function run() {
  console.log(`Testing ${modelsToTest.length} LLM7 models...`);
  const results = [];
  for (const m of modelsToTest) {
    const r = await checkModel(m);
    console.log(`[${r.ok ? 'SUCCESS' : 'FAILED'}] ${m} -> Status: ${r.status}`);
    results.push(r);
  }

  console.log("\n================ SUMMARY TABLE ================");
  console.table(results);
}

run();

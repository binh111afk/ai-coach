const apiKey = "ms-fc2cfe61-4490-4e07-8e04-333e9c17362d";

async function checkApiKeyQuota() {
  console.log("Testing API Key directly against DashScope & ModelScope endpoints for quota info...");

  const endpoints = [
    { name: "ModelScope Inference API", url: "https://api-inference.modelscope.cn/v1/chat/completions", model: "alims-intl/qwen3.5-plus" },
    { name: "Alibaba DashScope Compatible API", url: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", model: "qwen-plus" }
  ];

  for (const ep of endpoints) {
    console.log(`\n--- Calling ${ep.name} ---`);
    try {
      const res = await fetch(ep.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: ep.model,
          messages: [{ role: "user", content: "Hi" }],
          max_tokens: 10
        })
      });

      console.log(`Status Code: ${res.status}`);
      console.log("Response Headers:");
      res.headers.forEach((v, k) => {
        if (/rate|quota|limit|token|request|usage|credit/i.test(k)) {
          console.log(`  ${k}: ${v}`);
        }
      });

      const bodyText = await res.text();
      console.log("Response Body:", bodyText.slice(0, 200));
    } catch (e) {
      console.log("Error:", e.message);
    }
  }
}

checkApiKeyQuota();

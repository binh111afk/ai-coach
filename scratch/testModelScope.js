const apiKey = "ms-cae5876f-c3d4-4e58-80d0-030cfeaf1a28";
const baseUrl = "https://api-inference.modelscope.cn/v1/chat/completions";

async function testHeader(headerName) {
  console.log(`\nTesting header: ${headerName}`);
  try {
    const headers = { "Content-Type": "application/json" };
    if (headerName === 'Authorization') {
      headers["Authorization"] = `Bearer ${apiKey}`;
    } else {
      headers["X-ModelScope-Token"] = apiKey;
    }

    const res = await fetch(baseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "Qwen/Qwen2.5-72B-Instruct",
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 20
      })
    });
    const status = res.status;
    const text = await res.text();
    console.log(`Status ${status}:`, text);
  } catch (e) {
    console.log(`Error:`, e.message);
  }
}

async function run() {
  await testHeader('Authorization');
  await testHeader('X-ModelScope-Token');
}

run();

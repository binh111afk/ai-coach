const baseUrl = "https://api.llm7.io/v1/chat/completions";

async function testChat(modelId) {
  console.log(`\nTesting LLM7 model: ${modelId}`);
  try {
    const res = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer unused"
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: "user", content: "Chào bạn, hãy giới thiệu 1 câu ngắn." }],
        max_tokens: 50
      })
    });
    console.log(`Status Code: ${res.status}`);
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
      preview = text.slice(0, 150);
    }
    console.log("Response:", preview.replace(/\n/g, ' '));
  } catch (e) {
    console.log("Error:", e.message);
  }
}

async function run() {
  await testChat("default");
  await testChat("fast");
  await testChat("Inkling");
}

run();

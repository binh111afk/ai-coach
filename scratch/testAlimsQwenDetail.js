const ninerouterKey = "";
const ninerouterUrl = "http://localhost:20128/v1/chat/completions";

async function testQwen35Plus() {
  console.log("Testing alims-intl/qwen3.5-plus via 9Router with Vietnamese prompt...");
  try {
    const res = await fetch(ninerouterUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ninerouterKey}`
      },
      body: JSON.stringify({
        model: "alims-intl/qwen3.5-plus",
        messages: [{ role: "user", content: "Chào bạn, hãy giới thiệu 1 câu ngắn gọn về bản thân bạn." }],
        max_tokens: 100
      })
    });
    console.log("Status Code:", res.status);
    const data = await res.json();
    console.log("Response Text:\n", data.choices?.[0]?.message?.content);
  } catch (e) {
    console.log("Error:", e.message);
  }
}

testQwen35Plus();

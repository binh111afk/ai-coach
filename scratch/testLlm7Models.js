async function testMiniMaxM27() {
  console.log("Testing minimax-m2.7 on LLM7.io...");
  try {
    const res = await fetch("https://api.llm7.io/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer unused" },
      body: JSON.stringify({
        model: "minimax-m2.7",
        messages: [{ role: "user", content: "Chào bạn, hãy giới thiệu bản thân bạn là AI model tên gì." }],
        max_tokens: 100
      })
    });
    console.log("Status Code:", res.status);
    const data = await res.json();
    console.log("MiniMax M2.7 Output:\n", data.choices?.[0]?.message?.content);
  } catch (e) {
    console.log("Error:", e.message);
  }
}

testMiniMaxM27();

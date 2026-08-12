async function checkLlm7Headers() {
  console.log("Checking HTTP response headers from LLM7.io...");
  try {
    const res = await fetch("https://api.llm7.io/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer unused"
      },
      body: JSON.stringify({
        model: "default",
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 5
      })
    });

    console.log("Status:", res.status);
    console.log("\n--- All Response Headers ---");
    res.headers.forEach((value, name) => {
      console.log(`${name}: ${value}`);
    });
  } catch (e) {
    console.log("Error:", e.message);
  }
}

checkLlm7Headers();

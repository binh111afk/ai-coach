async function testLlm7() {
  console.log("Fetching LLM7.io models list...");
  try {
    const res = await fetch("https://api.llm7.io/v1/models");
    console.log("Status Code:", res.status);
    const data = await res.json();
    console.log("LLM7 Models:", JSON.stringify(data, null, 2).slice(0, 800));
  } catch (e) {
    console.log("Fetch Error:", e.message);
  }
}

testLlm7();

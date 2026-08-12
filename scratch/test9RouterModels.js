async function get9RouterModels() {
  try {
    const res = await fetch("http://localhost:20128/v1/models", {
      headers: { "Authorization": "Bearer sk-f040bde5ab80cf9c-nut82e-f2995b77" }
    });
    const data = await res.json();
    console.log("9Router Available Models:", (data.data || []).map(m => m.id));
  } catch (e) {
    console.log("Error:", e.message);
  }
}

get9RouterModels();

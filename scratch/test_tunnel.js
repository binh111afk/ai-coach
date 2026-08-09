const url = 'https://r7nnd8p.abc-tunnel.us/v1/chat/completions';
const apiKey = 'sk-f040bde5ab80cf9c-nut82e-f2995b77';

async function testTunnel() {
  console.log('Connecting to Tunnel:', url);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gemini/gemini-3.6-flash',
        messages: [{ role: 'user', content: 'Xin chào, bạn có thể trả lời tôi không?' }]
      })
    });
    console.log('Status:', res.status, res.statusText);
    const text = await res.text();
    console.log('Response body:', text);
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

testTunnel();

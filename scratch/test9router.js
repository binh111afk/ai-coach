async function test9router() {
  const url = 'https://r7nnd8p.abc-tunnel.us/v1/chat/completions';
  const apiKey = '';
  const model = 'deepseek/deepseek-v4-pro';

  console.log(`Testing 9router at ${url} with model ${model}...`);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: 'hello' }]
      })
    });

    console.log(`Status: ${res.status} ${res.statusText}`);
    const text = await res.text();
    console.log(`Response: ${text.slice(0, 500)}`);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test9router();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read API Key from .env
const envPath = path.resolve(__dirname, '../.env');
let apiKey = 'sk-f040bde5ab80cf9c-nut82e-f2995b77';
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/VITE_NINEROUTER_API_KEY=(.+)/);
  if (match) apiKey = match[1].trim();
}

const endpoint = 'http://localhost:20128/v1/chat/completions';

const modelsToTest = [
  'oc/longcat-2.0-free',
  'oc/laguna-s-2.1-free',
  'oc/north-mini-code-free',
  'oc/nemotron-3-ultra-free',
  'oc/ling-3.0-flash-free',
  'oc/mimo-v2.5-free'
];

console.log(`[TEST] Testing ${modelsToTest.length} new requested OpenCode models...`);
console.log(`API Key: ${apiKey.substring(0, 10)}...\n`);

async function runTest() {
  const results = [];

  for (const model of modelsToTest) {
    try {
      console.log(`Testing model: "${model}"...`);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: 'Say "Hello, working!" in Vietnamese' }],
          stream: false
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim() || '';
        console.log(`✅ [200 OK] ${model} -> Response: "${content.substring(0, 80)}"`);
        results.push({ model, status: 'WORKING', response: content });
      } else {
        const text = await response.text();
        console.log(`❌ [${response.status}] ${model} -> ${text.substring(0, 100)}`);
        results.push({ model, status: 'FAILED', error: text });
      }
    } catch (err) {
      console.log(`❌ [ERROR] ${model} -> ${err.message}`);
      results.push({ model, status: 'ERROR', error: err.message });
    }
  }

  console.log('\n================ SUMMARY ================');
  const working = results.filter(r => r.status === 'WORKING');
  console.log(`🎉 Total Working Models: ${working.length} / ${results.length}`);
  working.forEach(w => console.log(` - ${w.model}: "${w.response.substring(0, 60)}"`));
}

runTest();

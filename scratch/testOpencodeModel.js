import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read API Key from .env
const envPath = path.resolve(__dirname, '../.env');
let apiKey = '';
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/VITE_NINEROUTER_API_KEY=(.+)/);
  if (match) apiKey = match[1].trim();
}

const modelName = 'oc/deepseek-v4-flash-free';

console.log(`[TEST] Calling 9Router model "${modelName}"...`);
console.log(`API Key: ${apiKey.substring(0, 10)}...`);

async function testModel() {
  const endpoints = [
    'http://localhost:20128/v1/chat/completions',
    'https://api.9router.com/v1/chat/completions',
    'https://9router.com/v1/chat/completions'
  ];

  for (const url of endpoints) {
    try {
      console.log(`\nTrying endpoint: ${url}`);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: 'user', content: 'Xin chào! Hãy giới thiệu bản thân bạn và trả lời bằng tiếng Việt ngắn gọn.' }
          ],
          stream: false
        })
      });

      console.log(`Status Code: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.log('Response Body Text:', text);

      try {
        const data = JSON.parse(text);
        if (response.ok && data.choices && data.choices[0]) {
          console.log('\n✅ SUCCESS! Model Response Text:\n', data.choices[0].message.content);
          return;
        }
      } catch (e) {
        // Not JSON
      }
    } catch (err) {
      console.log(`❌ Error connecting to ${url}: ${err.message}`);
    }
  }
}

testModel();

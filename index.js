require('dotenv').config();
const { App, ExpressReceiver } = require('@slack/bolt');
const axios = require('axios');
const express = require("express");

const PORT = process.env.PORT

// Tạo ExpressReceiver với endpoint /slack/events
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  endpoints: '/slack/events'
});

// Khởi tạo Slack Bolt App với receiver
const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver
});

// Tạo route riêng cho API test (ví dụ, /translate)
receiver.app.use(express.json());
receiver.app.post('/translate', async (req, res) => {
  const { text, targetLang } = req.body;
  if (!text || !targetLang) {
    return res.status(400).json({ error: "Missing text or targetLang" });
  }
  try {
    console.log(`🔍 Dịch: "${text}" → ${targetLang}`);
    const response = await axios.post(
      "https://translate.api.cloud.yandex.net/translate/v2/translate",
      {
        folder_id: process.env.YANDEX_FOLDER_ID,
        texts: [text],
        targetLanguageCode: targetLang
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Api-Key ${process.env.YANDEX_API_KEY}`
        }
      }
    );
    const translatedText = response.data.translations[0].text;
    console.log(`✅ Kết quả: "${translatedText}"`);
    return res.json({ translatedText });
  } catch (error) {
    console.error("❌ Lỗi dịch:", error.response?.data || error.message);
    return res.status(500).json({ error: "Translation error" });
  }
});

// Xử lý sự kiện tin nhắn từ Slack
slackApp.event('message', async ({ event, client }) => {
  console.log("📩 Nhận tin nhắn từ Slack:", event.text);
  const text = event.text;
  if (!text) return;

  let translations = [];

  if (/[\u3040-\u30FF\u4E00-\u9FAF]/.test(text)) {  
      translations.push({ lang: "en", flag: "🇬🇧" });
      translations.push({ lang: "vi", flag: "🇻🇳" });
  } else if (/[a-zA-Z]/.test(text)) {
      translations.push({ lang: "ja", flag: "🇯🇵" });
      translations.push({ lang: "vi", flag: "🇻🇳" });
  } else if (/[àáạãảâầấậẫẩăằắặẵẳèéẹẽẻêềếệễểìíịĩỉòóọõỏôồốộỗổơờớợỡởùúụũủưừứựữửỳýỵỹỷđ]/i.test(text)) { 
      translations.push({ lang: "ja", flag: "🇯🇵" });
      translations.push({ lang: "en", flag: "🇬🇧" });
  } else {
      return;
  }

  let translatedTexts = await Promise.all(
      translations.map(async ({ lang, flag }) => {
          const translatedText = await translateText(text, lang);
          return `${flag} ${translatedText}`;
      })
  );

  console.log("📤 Gửi phản hồi vào Slack:", translatedTexts);
  await client.chat.postMessage({
      channel: event.channel,
      thread_ts: event.ts,
      text: translatedTexts.join("\n")
  });
});

// Hàm dịch thuật dùng Yandex API
async function translateText(text, targetLang) {
  try {
    const response = await axios.post(
      "https://translate.api.cloud.yandex.net/translate/v2/translate",
      {
        folder_id: process.env.YANDEX_FOLDER_ID,
        texts: [text],
        targetLanguageCode: targetLang
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Api-Key ${process.env.YANDEX_API_KEY}`
        }
      }
    );
    return response.data.translations[0].text;
  } catch (error) {
    console.error("❌ Lỗi dịch:", error.response?.data || error.message);
    return "Lỗi dịch thuật!";
  }
}

// Route kiểm tra server hoạt động
receiver.app.get("/", (req, res) => {
  res.send("✅ Slack Bot is running!");
});

// Khởi chạy ứng dụng
(async () => {
  await slackApp.start(PORT);
  console.log(`🚀 Slack Bot & API running on port ${PORT}!`);
})();

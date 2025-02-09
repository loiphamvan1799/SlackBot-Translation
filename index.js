require('dotenv').config();
const { App } = require('@slack/bolt');
const axios = require('axios');
const express = require("express");

const app = express();
app.use(express.json());

const slackApp = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET
});

// 📌 API test dịch thuật bằng Postman
app.post('/translate', async (req, res) => {
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

// 📌 Log kiểm tra bot có nhận tin nhắn không
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

// 📌 Chạy server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});

// 📌 Hàm dịch thuật
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

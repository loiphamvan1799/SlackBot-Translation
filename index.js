require('dotenv').config();
const { App } = require('@slack/bolt');
const axios = require('axios');

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET
});

const PORT = process.env.PORT || 3000;

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
        console.error("Lỗi dịch:", error.response?.data || error.message);
        return "Lỗi dịch thuật!";
    }
}

// Xử lý tin nhắn
app.event('message', async ({ event, client }) => {
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

    await client.chat.postMessage({
        channel: event.channel,
        thread_ts: event.ts,
        text: translatedTexts.join("\n")
    });
});

app.listen(PORT, () => {
    console.log("⚡ Slack Bot is running!");
})();

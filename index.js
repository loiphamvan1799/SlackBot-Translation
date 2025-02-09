require('dotenv').config();
const { App, ExpressReceiver } = require('@slack/bolt');
const axios = require('axios');

// Sử dụng ExpressReceiver để tích hợp thêm route API nếu cần
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  endpoints: '/slack/events'
});

const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver
});

const botReplies = {};

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
    console.error("Error:", error.response?.data || error.message);
    return "Error!";
  }
}

slackApp.event('message', async ({ event, client }) => {
  if (event.subtype && event.subtype === 'bot_message') return;

  if (event.subtype === 'message_changed') {
    console.log("📩 Edit msg:", event.message.text);
    const editedText = event.message.text;
    const originalTs = event.previous_message.ts;
    if (botReplies[originalTs]) {
      let translations = [];
      if (/[\u3040-\u30FF\u4E00-\u9FAF]/.test(editedText)) {
        translations.push({ lang: "en", flag: "🇬🇧" });
        translations.push({ lang: "vi", flag: "🇻🇳" });
      } else if (/[a-zA-Z]/.test(editedText)) {
        translations.push({ lang: "ja", flag: "🇯🇵" });
        translations.push({ lang: "vi", flag: "🇻🇳" });
      } else if (/[àáạãảâầấậẫẩăằắặẵẳèéẹẽẻêềếệễểìíịĩỉòóọõỏôồốộỗổơờớợỡởùúụũủưừứựữửỳýỵỹỷđ]/i.test(editedText)) {
        translations.push({ lang: "ja", flag: "🇯🇵" });
        translations.push({ lang: "en", flag: "🇬🇧" });
      } else {
        return;
      }
      let translatedTexts = await Promise.all(
        translations.map(async ({ lang, flag }) => {
          const translatedText = await translateText(editedText, lang);
          return `${flag} ${translatedText}`;
        })
      );
      await client.chat.update({
        channel: event.channel,
        ts: botReplies[originalTs],
        text: translatedTexts.join("\n")
      });
    }
    return;
  }

  console.log("📩 Received msg from Slack:", event.text);
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

  const result = await client.chat.postMessage({
    channel: event.channel,
    thread_ts: event.ts,
    text: translatedTexts.join("\n")
  });
  botReplies[event.ts] = result.ts;
});

receiver.app.post("/slack/events", async (req, res) => {
  if (req.body.type === "url_verification") {
    console.log("🔍 Slack challenge received!");
    return res.json({ challenge: req.body.challenge });
  }
  res.sendStatus(200);
});

receiver.app.get("/", (req, res) => {
  res.send("✅ Slack Bot is running!");
});

(async () => {
  await slackApp.start(process.env.PORT);
  console.log(`🚀 Slack Bot & API running on port ${process.env.PORT || 3000}!`);
})();

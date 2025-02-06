require("dotenv").config();
const { App } = require("@slack/bolt");
const axios = require("axios");
const express = require("express");

// Khởi tạo Slack bot
const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

// Hàm phát hiện ngôn ngữ
async function detectLanguage(text) {
  try {
    const res = await axios.post(`${process.env.LIBRETRANSLATE_API}/detect`, {
      q: text,
    });
    return res.data[0]?.language || "unknown";
  } catch (error) {
    console.error("Lỗi phát hiện ngôn ngữ:", error);
    return "unknown";
  }
}

// Hàm dịch văn bản
async function translate(text, targetLang) {
  try {
    const res = await axios.post(`${process.env.LIBRETRANSLATE_API}/translate`, {
      q: text,
      source: "auto",
      target: targetLang,
    });
    return res.data.translatedText || text;
  } catch (error) {
    console.error("Lỗi dịch văn bản:", error);
    return text;
  }
}

// Lắng nghe tin nhắn trong kênh Slack
slackApp.message(async ({ message, say }) => {
  if (message.subtype === "bot_message") return; // Bỏ qua tin nhắn từ bot

  const text = message.text;
  const lang = await detectLanguage(text);

  if (lang === "ja") {
    const viText = await translate(text, "vi");
    const enText = await translate(text, "en");
    await say(`🇻🇳 ${viText}\n🇬🇧 ${enText}`);
  } else if (lang === "vi") {
    const jaText = await translate(text, "ja");
    const enText = await translate(text, "en");
    await say(`🇯🇵 ${jaText}\n🇬🇧 ${enText}`);
  } else if (lang === "en") {
    const jaText = await translate(text, "ja");
    const viText = await translate(text, "vi");
    await say(`🇯🇵 ${jaText}\n🇻🇳 ${viText}`);
  }
});

// Khởi chạy Slack bot
(async () => {
  await slackApp.start();
  console.log("⚡ Bot Slack đã chạy!");
})();


// ⚠️ Thêm server Express để Render không tự động đóng ứng dụng
const app = express();
const PORT = process.env.PORT || 3000;

app.post('/slack/events', (req, res) => {
    const { challenge } = req.body;
    if (challenge) {
      return res.status(200).send({ challenge });
    }
    // Tiếp tục xử lý các yêu cầu khác...
  });

app.get("/", (req, res) => {
  res.send("Slack Bot đang chạy!");
});

app.listen(PORT, () => console.log(`🌍 Server listening on port ${PORT}`));

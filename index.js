require("dotenv").config();
const { App } = require("@slack/bolt");
const axios = require("axios");

// Khởi tạo Slack bot
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

// Hàm phát hiện ngôn ngữ
async function detectLanguage(text) {
  try {
    const res = await axios.post(`${process.env.LIBRETRANSLATE_API}`, {
      q: text,
      source: "auto",
      target: "en",
    });
    return res.data.detected || "unknown";
  } catch (error) {
    console.error("Lỗi phát hiện ngôn ngữ:", error);
    return "unknown";
  }
}

// Hàm dịch văn bản
async function translate(text, targetLang) {
  try {
    const res = await axios.post(`${process.env.LIBRETRANSLATE_API}`, {
      q: text,
      source: "auto",
      target: targetLang,
    });
    return res.data.translatedText;
  } catch (error) {
    console.error("Lỗi dịch văn bản:", error);
    return text;
  }
}

// Lắng nghe tin nhắn trong kênh Slack
app.message(async ({ message, say }) => {
  if (message.subtype === "bot_message") return; // Bỏ qua tin nhắn từ bot

  const text = message.text;
  const lang = await detectLanguage(text);

  if (lang === "ja") {
    const viText = await translate(text, "vi");
    const enText = await translate(text, "en");
    await say(`📢 Dịch từ **Tiếng Nhật**:\n🇻🇳 Tiếng Việt: ${viText}\n🇬🇧 Tiếng Anh: ${enText}`);
  } else if (lang === "vi") {
    const jaText = await translate(text, "ja");
    const enText = await translate(text, "en");
    await say(`📢 Dịch từ **Tiếng Việt**:\n🇯🇵 Tiếng Nhật: ${jaText}\n🇬🇧 Tiếng Anh: ${enText}`);
  } else if (lang === "en") {
    const jaText = await translate(text, "ja");
    const viText = await translate(text, "vi");
    await say(`📢 Dịch từ **Tiếng Anh**:\n🇯🇵 Tiếng Nhật: ${jaText}\n🇻🇳 Tiếng Việt: ${viText}`);
  }
});

// Khởi chạy bot
(async () => {
  console.log("⚡ Bot Slack đã chạy!");
})();

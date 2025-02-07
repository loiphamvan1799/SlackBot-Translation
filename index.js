require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware xử lý JSON
app.use(express.json());

// ✅ Route xử lý dịch ngôn ngữ (Test bằng Postman hoặc Slack)
app.post("/translate", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Thiếu dữ liệu văn bản cần dịch" });
    }

    // 🟢 Phát hiện ngôn ngữ gốc
    const detectRes = await axios.post(`${process.env.LIBRETRANSLATE_API}/detect`, { q: text });
    const lang = detectRes.data[0]?.language || "unknown";

    let translations = {};
    if (lang === "ja") {
      translations = {
        vi: await translate(text, "vi"),
        en: await translate(text, "en"),
      };
    } else if (lang === "vi") {
      translations = {
        ja: await translate(text, "ja"),
        en: await translate(text, "en"),
      };
    } else if (lang === "en") {
      translations = {
        ja: await translate(text, "ja"),
        vi: await translate(text, "vi"),
      };
    } else {
      return res.status(400).json({ error: "Không xác định được ngôn ngữ" });
    }

    res.json({
      detected_language: lang,
      translations,
    });
  } catch (error) {
    console.error("Lỗi dịch văn bản:", error);
    res.status(500).json({ error: "Lỗi hệ thống" });
  }
});

// 🟢 Hàm dịch văn bản
async function translate(text, targetLang) {
  try {
    const res = await axios.post(`${process.env.LIBRETRANSLATE_API}/translate`, {
      q: text,
      source: "auto",
      target: targetLang,
    });
    return res.data.translatedText || text;
  } catch (error) {
    console.error(`Lỗi dịch sang ${targetLang}:`, error);
    return text;
  }
}

// ✅ Xử lý challenge từ Slack khi thêm Event Subscriptions
app.post("/slack/events", async (req, res) => {
  if (req.body.type === "url_verification") {
    return res.json({ challenge: req.body.challenge });
  }
  res.status(200).send("OK");
});

// Khởi động server
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy trên cổng ${PORT}`);
});

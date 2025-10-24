// telegram.js
const axios = require("axios");
const config = require("./config");
const logger = require("./logger");

async function sendTelegramMessage(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    logger.error("Telegram not configured: missing token or chat ID");
    return;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    await axios.post(url, {
      chat_id: chatId,
      text: message,
      parse_mode: "Markdown",
    });
    logger.info("Telegram notification sent successfully.");
  } catch (error) {
    logger.error(
      `Error sending Telegram message: ${error.message}, ${JSON.stringify(
        error.response?.data || {}
      )}`
    );
  }
}

module.exports = { sendTelegramMessage };

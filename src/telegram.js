// telegram.js
const axios = require("axios");
const config = require("./config");
const logger = require("./logger");

async function sendTelegramMessage(message) {
   if (!config.telegram.botToken || !config.telegram.chatId) return;

  const url = `https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`;
  try {
    await axios.post(url, {
      chat_id: config.telegram.chatId,
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
   console.error(
      `Error sending Telegram message: ${error.message}, ${JSON.stringify(
        error.response?.data || {}
      )}`
    );
  }
}

module.exports = { sendTelegramMessage };

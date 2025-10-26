const axios = require("axios");
const config = require("./config");
const logger = require("./logger");



async function sendTelegramMessage(message) {
  const botToken = config.telegram.botToken;
  const chatIds = Array.isArray(config.telegram.chatId)
    ? config.telegram.chatId
    : [config.telegram.chatId]; // ✅ supports single or multiple

  if (!botToken || !chatIds.length) {
    logger.warn("Telegram bot token or chat IDs not configured — skipping notification.");
    return;
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  for (const id of chatIds) {
    try {
      await axios.post(url, {
        chat_id: id,
        text: message,
        parse_mode: "Markdown",
        disable_web_page_preview: false,
      });
      logger.info(`✅ Telegram notification sent to chat ID: ${id}`);
    } catch (error) {
      logger.error(
        `❌ Error sending Telegram message to ${id}: ${error.message}, ${JSON.stringify(
          error.response?.data || {}
        )}`
      );
    }
  }
}

module.exports = { sendTelegramMessage };

const { startBot } = require('./src/bot');
const express = require("express");

const app = express();
const PORT = process.env.PORT || 10000;

app.get("/ping", (req, res) => {
  res.send("Bot is running...");
});

app.listen(PORT, async () => { 
  console.log(`Server listening on port ${PORT}`);
  try {
    await startBot();
    console.log("✅ Bot started successfully!");
  } catch (error) {
    console.error("❌ Error starting bot:", error);
  }
});

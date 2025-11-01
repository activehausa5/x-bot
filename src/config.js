require("dotenv").config();

// ✅ Parse multiple X accounts (if available)
let xAccounts = [];
try {
  if (process.env.X_ACCOUNTS) {
    // Expecting valid JSON array string in .env
    xAccounts = JSON.parse(process.env.X_ACCOUNTS);
    console.log(`✅ Loaded ${xAccounts.length} X accounts for rotation`);
  } else {
    console.warn("⚠️ No X_ACCOUNTS found, using single main account.");
  }
} catch (err) {
  console.error("❌ Error parsing X_ACCOUNTS JSON:", err.message);
}

module.exports = {
  xApi: {
    apiKey: process.env.X_API_KEY || "",
    apiSecret: process.env.X_API_SECRET || "",
    accessToken: process.env.X_ACCESS_TOKEN || "",
    accessSecret: process.env.X_ACCESS_TOKEN_SECRET || "",
    bearerToken: process.env.X_BEARER_TOKEN || "",
  },

  // ✅ Added this for multi-account rotation
  xAccounts,
telegram: {
  botToken: process.env.TELEGRAM_BOT_TOKEN,
  chatId: process.env.TELEGRAM_CHAT_ID
    ? process.env.TELEGRAM_CHAT_ID.split(",").map(id => id.trim())
    : [],
},
  bot: {
    keywords: (() => {
      const keywords = process.env.KEYWORDS
        ? process.env.KEYWORDS.split(",")
            .map((k) => k.trim())
            .filter((k) => k)
        : [];
      if (keywords.length === 0) {
        console.error("Error: No valid keywords in .env, using defaults");
        return ["Trust wallet","Metamask","Coinbase","Coinbase wallet","Blockchain wallet","Phantom wallet"
];
      }
      console.log(`Loaded keywords: ${keywords.join(", ")}`);
      return keywords;
    })(),


    // responseTexts: [
    //           "I recently encountered a similar issue with Trust Wallet, but I was able to resolve it by contacting Trust Wallet's online support. I reached out to them through this link: at (trustdesk.assistance@gmail.com) I suggest that you also consider reaching out to them for assist",
    //           "I will advise you to send their direct support a message for guidance at (trustdesk.assistance@gmail.com)",
    //           "I faced this problem for a while, but it was fixed, and my wallet was restored after I complained to the live support at (trustdesk.assistance@gmail.com)",
    //           "Are you having the same problem with your wallet that I did about an hour ago? 🙁🙁 Kindly get in touch with the active support staff at (trustdesk.assistance@gmail.com), they were really helpful",
    //           "Omg😞 I thought I'm the only one having the same issues, but someone advise me to contact them at { trustdesk.assistance@gmail.com} they'll assist you too",
    //           "Hey, if you didn't write to the active support team, your complains won't be notice, i wrote to 3 forms, but this was the one that responded immediately to me.( trustdesk.assistance@gmail.com)",
    //           "I experienced same problem but it was rectified immediately after I wrote to their Live support at (trustdesk.assistance@gmail.com) their official platform below. I’ll advise you to contact them too.",
    //         ],
     // ✅ Keyword-specific response texts
    responseTextsByKeyword: {
      trustwallet: [
              "I recently encountered a similar issue with Trust Wallet, but I was able to resolve it by contacting Trust Wallet's online support. I reached out to them through this link: at (trustdesk.assistance@gmail.com) I suggest that you also consider reaching out to them for assist",
              "I will advise you to send their direct support a message for guidance at (trustdesk.assistance@gmail.com)",
              "I faced this problem for a while, but it was fixed, and my wallet was restored after I complained to the live support at (trustdesk.assistance@gmail.com)",
              "Are you having the same problem with your wallet that I did about an hour ago? 🙁🙁 Kindly get in touch with the active support staff at (trustdesk.assistance@gmail.com), they were really helpful",
              "Omg😞 I thought I'm the only one having the same issues, but someone advise me to contact them at { trustdesk.assistance@gmail.com} they'll assist you too",
              "Hey, if you didn't write to the active support team, your complains won't be notice, i wrote to 3 forms, but this was the one that responded immediately to me.( trustdesk.assistance@gmail.com)",
              "I experienced same problem but it was rectified immediately after I wrote to their Live support at (trustdesk.assistance@gmail.com) their official platform below. I’ll advise you to contact them too.",
            ],

      metamask: [
        "I recently encountered a similar issue with Trust Wallet, but I was able to resolve it by contacting Trust Wallet's online support. I reached out to them through this link: at (metamaskdesk.assistanceteam@gmail.com) I suggest that you also consider reaching out to them for assist",
        "I will advise you to send their direct support a message for guidance at ( metamaskdesk.assistanceteam@gmail.com)",
        "I faced this problem for a while, but it was fixed, and my wallet was restored after I complained to the live support at (metamaskdesk.assistanceteam@gmail.com)",
        "I experienced same problem but it was rectified immediately after I wrote to their Live support at ( metamaskdesk.assistanceteam@gmail.com) their official platform below. I’ll advise you to contact them too.",
        "I experienced same problem but it was rectified immediately after I wrote to their Live support at ( metamaskdesk.assistanceteam@gmail.com) their official platform below. I’ll advise you to contact them also",
      ],

      coinbase: [
        "I recently encountered a similar issue with Trust Wallet, but I was able to resolve it by contacting Trust Wallet's online support. I reached out to them through this link: at ( coinbaselive.assisttance@gmail.com) I suggest that you also consider reaching out to them for assist",
        "I will advise you to send their direct support a message for guidance at ( coinbaselive.assisttance@gmail.com)",
        "I faced this problem for a while, but it was fixed, and my wallet was restored after I complained to the live support at ( coinbaselive.assisttance@gmail.com)",
        "Omg😞 I thought I'm the only one having the same issues, but someone advise me to contact them at { coinbaselive.assisttance@gmail.com} they'll assist you too",
        "Hey, if you didn't write to the active support team, your complains won't be notice, i wrote to 3 forms, but this was the one that responded immediately to me.( coinbaselive.assisttance@gmail.com)",

      ],

      blockchain: [
        "I had a similar problem with Blockchain Wallet, and it was fixed after contacting support via email (blockchaindesk.assistance@gmail.com).",
        "I recently encountered a similar issue with Trust Wallet, but I was able to resolve it by contacting Trust Wallet's online support. I reached out to them through this link: at (blockchaindesk.assistance@gmail.com) I suggest that you also consider reaching out to them for assist",
        "I will advise you to send their direct support a message for guidance at (blockchaindesk.assistance@gmail.com)",
        "Hey, if you didn't write to the active support team, your complains won't be notice, i wrote to 3 forms, but this was the one that responded immediately to me.(blockchaindesk.assistance@gmail.com)",
        "I faced the same issue with Blockchain Wallet and resolved it after contacting their official support at (blockchaindesk.assistance@gmail.com).",


      ],
    },
    // checkInterval: parseInt(process.env.CHECK_INTERVAL, 10) || 600000,
    // rateLimitRequests: parseInt(process.env.RATE_LIMIT_REQUESTS, 10) || 50,
    // rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW, 10) || 900000,
    // commentsPerPost: parseInt(process.env.COMMENTS_PER_POST, 10) || 5,
    // dailyPostLimit: parseInt(process.env.DAILY_POST_LIMIT, 10) || 1666,
    checkInterval: parseInt(process.env.CHECK_INTERVAL, 10) || 1200000, // 20 minutes (1200000 ms)
rateLimitRequests: parseInt(process.env.RATE_LIMIT_REQUESTS, 10) || 25,
rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW, 10) || 900000, // 15 minutes
commentsPerPost: parseInt(process.env.COMMENTS_PER_POST, 10) || 2,
dailyPostLimit: parseInt(process.env.DAILY_POST_LIMIT, 10) || 600, // balanced for 25-min cycles

  },
};

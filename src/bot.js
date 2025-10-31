const { TwitterApi } = require("twitter-api-v2");
const config = require("./config");
const logger = require("./logger");
// const { getRandomItem } = require("./utils");
// const { getRandomItem, getResponseByKeyword } = require("./utils");
const { getRandomItem, getResponseByKeyword } = require("./utils");
const fs = require("fs").promises;
const { sendTelegramMessage } = require("./telegram");

// Main search client
const searchClient = new TwitterApi(config.xApi.bearerToken);

// Default single account (for backward compatibility)
const defaultPostClient = new TwitterApi({
  appKey: config.xApi.apiKey,
  appSecret: config.xApi.apiSecret,
  accessToken: config.xApi.accessToken,
  accessSecret: config.xApi.accessSecret,
});

// ✅ Multiple accounts setup (rotation)
let accountIndex = 0;
const postClients = config.xAccounts.length
  ? config.xAccounts.map(
      (acc) =>
        new TwitterApi({
          appKey: acc.apiKey,
          appSecret: acc.apiSecret,
          accessToken: acc.accessToken,
          accessSecret: acc.accessSecret,
        })
    )
  : [defaultPostClient];

/////////New added
// ✅ Cache usernames on startup (saves 1000s of API calls!)
const accountUsernames = [];
(async () => {
  for (const client of postClients) {
    try {
      const user = await client.v1.verifyCredentials();
      accountUsernames.push(user.screen_name);
      logger.info(`Loaded account: @${user.screen_name}`);
    } catch (err) {
      logger.warn(`Could not verify account: ${err.message}`);
      accountUsernames.push("unknown");
    }
  }
})();
////// 



function getNextClient() {
  const client = postClients[accountIndex];
  accountIndex = (accountIndex + 1) % postClients.length;
  return client;
}


// ///////////////////////////////////

// 🆕 Added: Helper — detect hashtag-only tweets
function hasOnlyHashtags(text) {
  const cleaned = text.replace(/#\w+/g, "").trim();
  return cleaned.length === 0;
}

// 🆕 Added: Helper — detect if tweet indicates an issue or problem
// function isIssueTweet(text) {
//   const issuePatterns = [
//     /can't\s+(open|access|login|withdraw)/i,
//     /not\s+(working|opening|responding|showing)/i,
//     /(error|issue|problem|bug|fail(ed)?|scam)/i,
//     /(stuck|lost|frozen|hacked)/i,
//     /(transaction|balance).*not.*(showing|working|loading)/i,
//     /need\s+help/i,
//     /support\s+(please|needed)/i,
//   ];
//   return issuePatterns.some((pattern) => pattern.test(text));
// }
function isIssueTweet(text) {
  const issuePatterns = [
    // existing general problem patterns
    /can't\s+(open|access|login|withdraw|sell|buy|swap|transfer)/i,
    /not\s+(working|opening|responding|showing)/i,
    /(error|issue|problem|bug|fail(ed)?|scam)/i,
    /(stuck|lost|frozen|hacked)/i,
    /(transaction|balance).*not.*(showing|working|loading)/i,
    /need\s+help/i,
    /support\s+(please|needed)/i,

    // token / token symbol mentions (e.g. $ABC, token, tokens)
    /\$[A-Za-z]{2,6}\b/,                          // $TOKEN style
    /\b(token|tokens|tokenomics|tokenized)\b/i,

    // balances, missing tokens, not received, transfer issues
    /\b(not\s+received|not\s+credited|not\s+added|missing\s+token|token\s+missing)\b/i,
    /\b(received|credited).{0,40}\b(not|missing|zero)\b/i,
    /\b(transfer(ed)?|sent)\b.{0,60}\b(not\s+received|no(t)?\s+arrived|failed|lost)\b/i,

    // approvals / allowance problems
    /\b(approve|approval|allowance|allowances)\b/i,
    /(infinite|unlimited)\s+(approve|approval|allowance)/i,
    /\b(revok(e|ed)?|revoke(d)?)\b.*\b(approval|allowance)?/i,

    // tx / transaction status and short form "tx"
    /\b(tx|transaction)\b.*\b(failed|reverted|pending|stuck|dropped|error)\b/i,
    /\b(pending|stuck|dropped|dropped from mempool|dropped from network)\b/i,
    /\b(tx)\b.{0,20}\b(pending|reverted|failed)\b/i,

    // contract / contract address / token contract mentions (0x...)
    /\b0x[a-fA-F0-9]{40}\b/,                       // Ethereum-style address / contract
    /\b(contract|contract\s+address)\b/i,
    /\b(interact(ed)?\s+with|called)\b.*\b(contract)\b/i,

    // wallets & connectors
    /\b(meta-?mask|trust\s?wallet|coinbase\s?wallet|rainbow|ledger|trezor|walletconnect|wallet\s+connect|argent)\b/i,
    /\b(hot\s+wallet|cold\s+wallet|hardware\s+wallet)\b/i,

    // DEX / swap / liquidity related
    /\b(swap|swap failed|swap error|swap failed|swap reverted)\b/i,
    /\b(uniswap|pancakeswap|sushiswap|1inch|kyber|dex)\b/i,
    /\b(liquidity|liquidity\s+pool|lp\s+tokens)\b/i,
    /\b(honeypot|rugpull|rug pull|scam token|fake token)\b/i,

    // gas / fees / nonce / out of gas
    /\b(gas\s+(fee|price|limit)|out\s+of\s+gas|gas\s+too\s+low)\b/i,
    /\b(nonce|nonce\s+too\s+low|nonce\s+too\s+high)\b/i,

    // wallet security / seed phrase / private key / phishing
    /\b(seed\s+phrase|mnemonic|private\s+key|secret\s+key|backup\s+phrase)\b/i,
    /\b(phish(ing)?|phishy|fake\s+site|scam\s+site|malicious)\b/i,

    // common exchange / withdraw / deposit failure flavors
    /\b(withdraw|deposit)\b.{0,40}\b(failed|not\s+processed|not\s+credited|pending|stuck)\b/i,
    /\b(insufficient\s+balance|insufficient\s+funds|not\s+enough\s+gas)\b/i,

    // "can't approve", "can't swap", "can't sign"
    /can't\s+(approve|sign|swap|connect|confirm)/i,

    // "reverted by" or "VM Exception" or revert messages
    /\b(revert(ed)?|revert reason|VM\s+exception|execution\s+reverted)\b/i,

    // suspicious / blocked / delisted / removed
    /\b(delist(ed)?|removed|blocked|blacklist(ed)?|flagged)\b/i,

    // generic troubleshooting words often used with wallet/token issues
    /\b(troubleshoot|help\s+with|how\s+to\s+fix|bug\s+report)\b/i,
  ];

  return issuePatterns.some((pattern) => pattern.test(text));
}



/////////
// 🧠 Smart exclusion patterns (to skip tweets that look like our replies)
const exclusionPatterns = [
  // 🚫 Spam / Scam detection
  /\b[\w._%+-]+\(?(at|@)\)?[\w.-]+\.[a-z]{2,}\b/i,  // catches "support (at) gmail.com"
  /support@/i,                     // any email like support@
  /gmail\.com/i,                   // generic emails (common scam)
  /https?:\/\/\S+/i,               // any links
  /contact.*team/i,                // "contact team"
  /official support/i,             // fake or misleading "official support"
  /wallet.*help/i,                 // "wallet help"
  /rectifyteam/i,                  // scam term seen in your example
  /help(?:desk|center)/i,          // fake helpdesk phrases
  /technical support/i,            // often scammy wording

  // ✅ Positive or resolved posts (no need to reply)
  /thanks.*official support/i,     // only skip thank-you posts
  /resolved after/i,
  /got my account back/i,
  /thanks.*support/i,
  /thank.*team/i,
  /issue (?:was|is|has been) (resolved|solved|fixed)/i,
  /problem (?:was|is|has been) (resolved|solved|fixed)/i,
  /thanks for resolving/i,
  /team responded/i,
  /app (?:now )?working fine/i,
  /everything.?fine now/i,
  /no longer.*issue/i,
  /fixed after/i,
];



/////// 


////////////////////////////////////// 

// For Search Query////
// 🧠 Smart exclusion terms — skip tweets that look resolved or spammy
const exclusionTerms = [
  '"thanks support"',
  '"issue resolved"',
  '"problem fixed"',
  '"issue was solved"',
  '"thanks for resolving"',
  '"got my account back"',
  '"team responded"',
  '"resolved after"',
  '"app working fine"',
  'https',
  't.co'
];
// ///////////
// Bot configuration values
const commentsPerPost = config.bot.commentsPerPost || 3;
const dailyPostLimit = config.bot.dailyPostLimit || 600;
const maxTweetsPerCycle = 5; // Max tweets per cycle
let dailyPosts = 0;
let totalQuotaUsed = 0;
let lastReset = Date.now();
let processedTweetIds = new Set();

// Load processed tweet data
async function loadProcessedData() {
  try {
    const data = await fs.readFile("processed_data.json", "utf8");
    const { processedIds } = JSON.parse(data);
    processedTweetIds = new Set(processedIds);
    logger.info(`Loaded processed data: ${processedIds.length} IDs`);
  } catch (error) {
    if (error.code !== "ENOENT")
      logger.error(`Error loading processed data: ${error.message}`);
  }
}

// Save processed tweet data
async function saveProcessedData() {
  try {
    await fs.writeFile(
      "processed_data.json",
      JSON.stringify({ processedIds: [...processedTweetIds] })
    );
    logger.info("Saved processed data");
  } catch (error) {
    logger.error(`Error saving processed data: ${error.message}`);
  }
}

// Main function
async function checkAndReply() {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  // Reset daily limits every 24 hours
  if (Date.now() - lastReset >= 24 * 60 * 60 * 1000) {
    dailyPosts = 0;
    totalQuotaUsed = 0;
    lastReset = Date.now();
    processedTweetIds.clear();
    await saveProcessedData();
    logger.info("Daily reset: cleared processed IDs and daily posts");
  }

  if (dailyPosts >= dailyPostLimit) {
    logger.info("Daily post limit reached, skipping cycle");
    return;
  }

  try {
    logger.info("Checking for new posts...");

  //   // Build keyword query
  //   const query = config.bot.keywords
  //     .map((k) => (k.includes(" ") ? `"${k}"` : k))
  //     .join(" OR ");
  //   // const encodedQuery = encodeURI(query);
  // logger.info(`Raw query: ${query}`);
  //   // logger.info(`Encoded query: ${encodedQuery}`);
  //   if (!query || query.trim() === "") {
  //     logger.error("Error: Empty query, skipping cycle");
  //     return;
  //   }
////////
    // Build keyword query (include keywords)
const keywordQuery = config.bot.keywords
  .map((k) => (k.includes(" ") ? `"${k}"` : k))
  .join(" OR ");

// Build exclusion query (exclude phrases)
const exclusionQuery = exclusionTerms.map((t) => `-${t}`).join(" ");

// ✅ Combine all parts + exclude retweets
const query = `${keywordQuery} ${exclusionQuery} -is:retweet`.trim();

logger.info(`Raw query: ${query}`);

if (!query || query.trim() === "") {
  logger.error("Error: Empty query, skipping cycle");
  return;
}

// ////////////
const endTime = new Date(now.getTime() - 15 * 1000).toISOString(); 
const startTime = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
    const params = {
      // query: encodedQuery,
      query: query,
      "tweet.fields": "id,text,created_at",
      max_results: 10,
      start_time: startTime,
      end_time: endTime,
      sort_order: "recency", // ensures newest first
    };
    logger.info(`API params: ${JSON.stringify(params, null, 2)}`);
    let response;
    try {
      response = await searchClient.v2.search(params);
       const tweets = response.data || [];
    totalQuotaUsed++; // search uses 1 unit
   logger.info(`📦 Found ${tweets.length} new tweets`);
    // await sendTelegramMessage(`📦 Found ${tweets.length} new tweets`);
    } catch (error) {
     logger.error(
           `Search API error: ${error.message}, Code: ${
             error.code || "N/A"
           }, Details: ${JSON.stringify(error.data || {}, null, 2)}`
         );
      if (error.code === 429) {
        logger.info("Rate limit hit during search, waiting for next cycle...");
        return;
      }
      throw error;
    }

    let tweetCount = 0;
    let repliesThisCycle = 0;
    const delayBetweenPosts = 40000; // 40 seconds delay

    for await (const tweet of response) {
      if (processedTweetIds.has(tweet.id)) continue;
      if (dailyPosts >= dailyPostLimit || tweetCount >= maxTweetsPerCycle)
        break;


       ///////////////

// 🆕 Skip tweets that contain only hashtags
      if (hasOnlyHashtags(tweet.text)) {
        logger.info(`Skipped hashtag-only tweet: ${tweet.id}`);
        continue;
      }

      // 🆕 Skip tweets that don't indicate an issue/problem
      if (!isIssueTweet(tweet.text)) {
        logger.info(`Skipped non-issue tweet: ${tweet.id}`);
        continue;
      }


// ////////

// 🛑 Skip tweets that match exclusion patterns
const textLower = tweet.text.toLowerCase();
const isExcluded = exclusionPatterns.some((pattern) => pattern.test(textLower));
if (isExcluded) {
  console.log(`⏩ Skipped (exclusion matched): ${tweet.text}`);
  continue; // Skip this tweet and move to next
}
///////     /////// // 
      ////////////// 


      

      const tweetTime = new Date(tweet.created_at).getTime();
      const tweetDate = tweet.created_at.split("T")[0];
      if (tweetDate !== today) continue;
      const nowTime = Date.now();

      const ageMinutes = (nowTime - tweetTime) / (1000 * 60);
      if (ageMinutes < 1 || ageMinutes > 60) continue;

      logger.info(`Found tweet (ID: ${tweet.id}): ${tweet.text}`);

  /////////////
      const tweetUrl = `https://x.com/i/web/status/${tweet.id}`;
    const tweetMsg = `🔍 *Found Tweet!*\n\n` +
  `🆔 \`${tweet.id}\`\n` +
  `🕓 *Created:* ${new Date(tweet.created_at).toLocaleString()}\n` +
  `💬 *Text:* ${tweet.text.slice(0, 400)}\n\n` +
  `[🔗 View Tweet](${tweetUrl})`;

   await sendTelegramMessage(tweetMsg);
/////////


      // const availableResponses = [...config.bot.responseTexts];
      let atLeastOneCommentPosted = false;

      for (let i = 0; i < commentsPerPost; i++) {
        if (dailyPosts >= dailyPostLimit || repliesThisCycle >= 35) break;
        // if (availableResponses.length === 0) break;

        // const replyText = getRandomItem(availableResponses);
        // availableResponses.splice(availableResponses.indexOf(replyText), 1);

         // Determine response based on keyword in tweet text
              const replyText = getResponseByKeyword(
                tweet.text,
                config.bot.responseTextsByKeyword
              );

        const currentClient = getNextClient(); // ✅ Rotate between accounts

        try {
          await currentClient.v2.tweet(replyText, {
            reply: { in_reply_to_tweet_id: tweet.id },
          });
           totalQuotaUsed++;
           dailyPosts++;
          repliesThisCycle++;
          atLeastOneCommentPosted = true;

          logger.info(
            `✅ Comment ${i + 1} posted to tweet ${tweet.id} using account #${
              accountIndex === 0 ? postClients.length : accountIndex
            }`
          );
         //////////////
  // const user = await currentClient.v1.verifyCredentials();
  const username = accountUsernames[accountIndex] || "unknown";

const commentDetails =
  `💬 *Comment Posted!*\n\n` +
  `🧾 *Tweet ID:* \`${tweet.id}\`\n` +
  `👤 *Account:* @${username}\n` + // ✅ fixed missing backslash before "n"
  `🕓 *Time:* ${new Date().toLocaleString()}\n` +
  `💭 *Comment:* ${replyText.slice(0, 200)}\n\n` +
  `📊 *Cycle Replies:* ${repliesThisCycle}\n` +
  `🔋 *Quota Used:* ${totalQuotaUsed} / ~15000\n\n` + // ✅ moved quota to its own line
  `[🔗 View Tweet](https://x.com/i/web/status/${tweet.id})`;


await sendTelegramMessage(commentDetails);
////////////
 await new Promise((r) => setTimeout(r, delayBetweenPosts));
          
        } catch (error) {
          // logger.error(
          //   `❌ Error posting comment ${i + 1}: ${error.message}, Code: ${
          //     error.code || "N/A"
          //   }`
          // );
   logger.error(
            `Error posting comment ${i + 1} to ${tweet.id}: ${
              error.message
            }, Code: ${error.code || "N/A"}, Details: ${JSON.stringify(
              error.data || {},
              null,
              2
            )}`
          );

          if (error.code === 429) {
            logger.info("Rate limit hit — waiting until next cycle...");
            return;
          }
        }
      }

      if (atLeastOneCommentPosted) {
        processedTweetIds.add(tweet.id);
        tweetCount++;
      }
    }

    if (repliesThisCycle > 0) await saveProcessedData();

    logger.info(
      `Cycle complete: ${repliesThisCycle} comments made, ${tweetCount} tweets processed`
    );
    // await sendTelegramMessage( `Cycle complete: ${repliesThisCycle} comments made, ${tweetCount} tweets processed`)
    
 await sendTelegramMessage(
  `✅ *Cycle Complete!*\n\n` +
  `💬 *Comments Made:* ${repliesThisCycle}\n` +
  `🧾 *Tweets Processed:* ${tweetCount}\n` +
  `📉 *Quota Used:* ${totalQuotaUsed} / ~15000\n` +
  `🕓 *Time:* ${new Date().toLocaleString()}`
)  
  } catch (error) {
    logger.error(
         `Error in checkAndReply: ${error.message}, Code: ${
           error.code || "N/A"
         }, Details: ${JSON.stringify(error.data || {}, null, 2)}`
       );
    logger.error(
  `Error in checkAndReply: ${error.message}\nSTACK: ${error.stack}`
);

  }

  setTimeout(checkAndReply, config.bot.checkInterval || 1500000);
}

async function safeCheckAndReply() {
  try {
    await checkAndReply();
  } catch (error) {
    logger.error(`checkAndReply crashed: ${error.message}`);
  } finally {
    const delay = config.bot.checkInterval || 1500000; // 25 minutes (1,500,000 ms)
    logger.info(`Next cycle scheduled in ${delay / 1000 / 60} minutes`);
    setTimeout(safeCheckAndReply, delay);
  }
}


// Start bot
async function startBot() {
  logger.info("Starting X comment bot...");
  try {
    const username = accountUsernames[accountIndex] || "unknown";
    logger.info(`Bot is configured to reply as: @${username}`);
  } catch (error) {
    logger.error(`Error fetching bot profile: ${error.message}\nSTACK: ${error.stack}`);
    logger.info("Continuing despite profile verification failure...");
  }

  await loadProcessedData();
  // checkAndReply();
   safeCheckAndReply();
}

module.exports = { startBot };

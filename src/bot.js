const { TwitterApi } = require("twitter-api-v2");
const config = require("./config");
const logger = require("./logger");
const { getRandomItem } = require("./utils");
const fs = require("fs").promises;

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

function getNextClient() {
  const client = postClients[accountIndex];
  accountIndex = (accountIndex + 1) % postClients.length;
  return client;
}

// Bot configuration values
const commentsPerPost = config.bot.commentsPerPost || 9;
const dailyPostLimit = config.bot.dailyPostLimit || 1666;
const maxTweetsPerCycle = 5; // Max tweets per cycle
let dailyPosts = 0;
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

    // Build keyword query
    const query = config.bot.keywords
      .map((k) => (k.includes(" ") ? `"${k}"` : k))
      .join(" OR ");
    // const encodedQuery = encodeURI(query);
  logger.info(`Raw query: ${query}`);
    // logger.info(`Encoded query: ${encodedQuery}`);
    if (!query || query.trim() === "") {
      logger.error("Error: Empty query, skipping cycle");
      return;
    }

const endTime = new Date(now.getTime() - 5 * 1000).toISOString(); // 5 seconds ago
const startTime = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
    const params = {
      // query: encodedQuery,
      query: query,
      "tweet.fields": "id,text,created_at",
      max_results: 10,
      start_time: startTime,
      end_time: endTime,
    };
    logger.info(`API params: ${JSON.stringify(params, null, 2)}`);
    let response;
    try {
      response = await searchClient.v2.search(params);
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
    const delayBetweenPosts = 30000; // 30 seconds delay

    for await (const tweet of response) {
      if (processedTweetIds.has(tweet.id)) continue;
      if (dailyPosts >= dailyPostLimit || tweetCount >= maxTweetsPerCycle)
        break;

      const tweetTime = new Date(tweet.created_at).getTime();
      const tweetDate = tweet.created_at.split("T")[0];
      if (tweetDate !== today) continue;
      const nowTime = Date.now();

      const ageMinutes = (nowTime - tweetTime) / (1000 * 60);
      if (ageMinutes < 1 || ageMinutes > 60) continue;

      logger.info(`Found tweet (ID: ${tweet.id}): ${tweet.text}`);

      const availableResponses = [...config.bot.responseTexts];
      let atLeastOneCommentPosted = false;

      for (let i = 0; i < commentsPerPost; i++) {
        if (dailyPosts >= dailyPostLimit || repliesThisCycle >= 35) break;
        if (availableResponses.length === 0) break;

        const replyText = getRandomItem(availableResponses);
        availableResponses.splice(availableResponses.indexOf(replyText), 1);

        const currentClient = getNextClient(); // ✅ Rotate between accounts

        try {
          await currentClient.v2.tweet(replyText, {
            reply: { in_reply_to_tweet_id: tweet.id },
          });

          logger.info(
            `✅ Comment ${i + 1} posted to tweet ${tweet.id} using account #${
              accountIndex === 0 ? postClients.length : accountIndex
            }`
          );

          dailyPosts++;
          repliesThisCycle++;
          atLeastOneCommentPosted = true;
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
  } catch (error) {
    logger.error(
         `Error in checkAndReply: ${error.message}, Code: ${
           error.code || "N/A"
         }, Details: ${JSON.stringify(error.data || {}, null, 2)}`
       );
  }

  setTimeout(checkAndReply, config.bot.checkInterval || 600000);
}

// Start bot
async function startBot() {
  logger.info("Starting X comment bot...");
  try {
    const user = await defaultPostClient.v1.verifyCredentials();
    logger.info(`Bot is configured to reply as: @${user.screen_name}`);
  } catch (error) {
    logger.error(`Error fetching bot profile: ${error.message}`);
    logger.info("Continuing despite profile verification failure...");
  }

  await loadProcessedData();
  checkAndReply();
}

module.exports = { startBot };

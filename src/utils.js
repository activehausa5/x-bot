// function getRandomItem(array) {
//   return array[Math.floor(Math.random() * array.length)];
// }

// // Returns a response based on the keyword found in the tweet text
// function getResponseByKeyword(tweetText, responseTextsByKeyword) {
//   const textLower = tweetText.toLowerCase();

//   // Iterate through each keyword mapping
//   for (const [keyword, responses] of Object.entries(responseTextsByKeyword)) {
//     if (textLower.includes(keyword)) {
//       // Return a random response for the matched keyword
//       return getRandomItem(responses);
//     }
//   }

//   // Fallback if no keyword matches
//   return "Please contact the wallet's official support for help.";
// }

// module.exports = { getRandomItem, getResponseByKeyword };

// // module.exports = { getRandomItem };





function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// ✅ Define flexible keyword patterns (with variations)
// const keywordPatterns = {
//   "trust wallet": ["trust wallet", "trustwallet", "trustwalletapp"],
//   "metamask": ["metamask", "metamaskapp"],
//   "coinbase": ["coinbase", "coinbase wallet", "coinbasewallet", "coinbaseapp"],
//   "blockchain": ["blockchain", "blockchain wallet", "blockchain.com"],
//   "phantom": ["phantom", "phantom wallet", "phantomapp"]
// };
const keywordPatterns = {
  "trustwallet": [
    "trustwallet",
    "trust wallet",
    "trustwalletapp",
    "trustwallet.com",
    "trustwalet",
    "trustwllt"
  ],
  // "metamask": [
  //   "metamask",
  //   "meta mask",
  //   "metamaskapp",
  //   "metamask.io",
  //   "metmask"
  // ],
  // "coinbase": [
  //   "coinbase",
  //   "coinbase wallet",
  //   "coinbasewallet",
  //   "coinbaseapp",
  //   "coinbase.com",
  //   "coin base"
  // ],
  "phantom": [
    "phantom",
    "phantom wallet",
    "phantomwallet",
    "phantom.app",
    "phantomcrypto",
    "phantom wallet app"
  ]
};



// ✅ Smart keyword-based response picker (improved matching)
function getResponseByKeyword(tweetText, responseTextsByKeyword) {
  if (!tweetText || !responseTextsByKeyword) return "Please contact the wallet’s official support for help.";

  // Normalize: lowercase + remove punctuation + collapse spaces
  const textNormalized = tweetText
    .toLowerCase()
    .replace(/[#.,!?:;'"()]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  for (const [keyword, variations] of Object.entries(keywordPatterns)) {
    // Check if any variation appears in normalized text
    for (const variation of variations) {
      const normalizedVariation = variation.toLowerCase().replace(/\s+/g, " ").trim();
      if (textNormalized.includes(normalizedVariation)) {
        const responses = responseTextsByKeyword[keyword];
        if (responses && responses.length > 0) {
          return getRandomItem(responses);
        }
      }
    }
  }

  // Fallback if no keyword matches
  return "Please contact the wallet’s official support for help.";
}

module.exports = { getRandomItem, getResponseByKeyword };


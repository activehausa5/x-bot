function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Returns a response based on the keyword found in the tweet text
function getResponseByKeyword(tweetText, responseTextsByKeyword) {
  const textLower = tweetText.toLowerCase();

  // Iterate through each keyword mapping
  for (const [keyword, responses] of Object.entries(responseTextsByKeyword)) {
    if (textLower.includes(keyword)) {
      // Return a random response for the matched keyword
      return getRandomItem(responses);
    }
  }

  // Fallback if no keyword matches
  return "Please contact the wallet's official support for help.";
}

module.exports = { getRandomItem, getResponseByKeyword };

// module.exports = { getRandomItem };

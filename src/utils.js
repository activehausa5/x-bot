function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// async function retry(operation, maxAttempts = 3, initialDelay = 1000) {
//   let lastError;
//   for (let attempt = 1; attempt <= maxAttempts; attempt++) {
//     try {
//       return await operation();
//     } catch (error) {
//       lastError = error;
//       if (error.code === 429) {
//         const retryAfter = error.headers && error.headers['x-rate-limit-reset']
//           ? (parseInt(error.headers['x-rate-limit-reset']) * 1000 - Date.now()) + 1000
//           : 15 * 60 * 1000; // Default to 15 minutes
//         console.log(`Rate limit hit, waiting ${retryAfter / 1000} seconds...`);
//         await new Promise(resolve => setTimeout(resolve, retryAfter));
//       } else {
//         const delay = initialDelay * Math.pow(2, attempt - 1);
//         console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
//         await new Promise(resolve => setTimeout(resolve, delay));
//       }
//     }
//   }
//   throw lastError;
// }

module.exports = { getRandomItem };
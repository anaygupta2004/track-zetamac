let scoreSent = false; // Global flag to control score submission

const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    // Check for changes that indicate a new game has started
    const timeLeftElement = document.querySelector('.left');
    if (timeLeftElement && !timeLeftElement.textContent.includes('Seconds left: 0')) {
      // Reset the flag when the game restarts and "Seconds left" is not 0
      scoreSent = false;
    } else if (timeLeftElement && timeLeftElement.textContent.includes('Seconds left: 0')) {
      // Attempt to extract and send score when the game ends
      extractAndSendScore();
    }
  });
});

const gameElement = document.getElementById('game');
if (gameElement) {
  observer.observe(gameElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

function extractAndSendScore() {
  // Ensure we don't send the score multiple times per session
  if (scoreSent) return;

  const scoreElement = document.querySelector('.correct');
  if (scoreElement) {
    const scoreText = scoreElement.textContent || '';
    const scoreMatch = scoreText.match(/Score: (\d+)/);
    if (scoreMatch && scoreMatch[1]) {
      scoreSent = true; // Set flag to prevent multiple submissions
      const score = parseInt(scoreMatch[1], 10);
      console.log('Detected score:', score);
      chrome.runtime.sendMessage({action: "storeScore", score: score}, function(response) {
        console.log("Response from background:", response);
      });
    }
  }
}


/*
function appendScoreWithID(score) {
  new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({action: "getOAuthToken"}, (response) => {
      if (response.token) {
        resolve(response.token);
      } else if (response.error) {
        reject('Failed to get OAuth token: ' + response.error);
      } else {
        reject('No response token or error received.');
      }
    });
  })
  .then((token) => { // Fixed this line to properly handle the promise resolution
    chrome.runtime.sendMessage({
      action: "appendScoreWithID",
      score: score,
      sheetId: "a7220a92"
    }, (response) => {
      // Handle the response here
      console.log('Append score response:', response);
    });
  })
  .catch(error => console.error("Error appending score with ID:", error));
}
*/

async function getSheetIdFromCurrentUrl() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url) {
        const url = new URL(tabs[0].url);
        const key = url.searchParams.get('key');
        resolve(key); // Resolves with the key or null if not found
      } else {
        resolve(null); // No active tab or URL found
      }
    });
  });
}


// Utility function to get the stored Spreadsheet ID
function getSpreadsheetId() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['spreadsheetId'], (result) => {
      if (result.spreadsheetId) {
        resolve(result.spreadsheetId);
      } else {
        reject('Spreadsheet ID not found.');
      }
    });
  });
}

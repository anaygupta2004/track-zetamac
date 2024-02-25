const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'characterData' || mutation.type === 'childList') {
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
  const timeLeftElement = document.querySelector('.left');
  if (timeLeftElement && timeLeftElement.textContent.includes('Seconds left: 0')) {
    const scoreElement = document.querySelector('.correct');
    if (scoreElement) {
      const scoreText = scoreElement.textContent || '';
      const scoreMatch = scoreText.match(/Score: (\d+)/);
      if (scoreMatch && scoreMatch[1]) {
        const score = parseInt(scoreMatch[1], 10);
        console.log('Detected score:', score);
        storeScore(score);
      }
    }
  }
}

function storeScore(newScore) {
  chrome.storage.local.get(['scores'], function (result) {
    let scores = result.scores || [];
    if (!scores.includes(newScore)) {
      scores.push(newScore);
      console.log(newScore);
      // Directly append the score using the background script
      appendScoreWithID(newScore);
      chrome.storage.local.set({ scores: scores }, function () {
        console.log('Score has been stored successfully.');
      });
    }
  });
}

function appendScoreWithID(score) {
  new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({action: "getOAuthToken"}, (response) => {
      if (response.token) {
        resolve(response.token);
      } else if (response.error) {
        reject('Failed to get OAuth token: ' + response.error);
      }
    });
  })
  .then(token => {
    return getSheetIdFromCurrentUrl();
  })
  .then(sheetId => {
    chrome.runtime.sendMessage({
      action: "appendScoreWithID",
      score: score,
      sheetId: sheetId
    });
  })
  .catch(error => console.error("Error appending score with ID:", error));
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

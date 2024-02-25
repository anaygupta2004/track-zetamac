chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason === "install") {
    chrome.identity.getAuthToken({ 'interactive': true }, function(token) {

      fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          properties: {
            title: "Track Your Zetamac" 
          },
          sheets: [
            {
              properties: {
                title: "a7220a92"
              }
            }
          ]
        })
      })
      .then(response => response.json())
      .then(data => {
        const spreadsheetId = data.spreadsheetId;
        console.log('Created new spreadsheet with ID:', spreadsheetId);

        chrome.storage.local.set({spreadsheetId: data.spreadsheetId}, function() {
          console.log('Spreadsheet ID saved to local storage.');
        });
      
        const updateRequest = {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: 0, 
                  startRowIndex: 0,
                  endRowIndex: 1,
                  startColumnIndex: 0,
                  endColumnIndex: 2
                },
                cell: {
                  userEnteredValue: {

                  }
                },
                fields: "userEnteredValue"
              }
            }
          ],
          valueInputOption: "USER_ENTERED",
          data: [
            {
              range: "a7220a92!A1:B1",
              majorDimension: "ROWS",
              values: [
                ["date", "score"] // Row values to set
              ]
            }
          ]
        };

        return fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            data: updateRequest.data,
            valueInputOption: updateRequest.valueInputOption
          })
        });
      })
      .then(response => response.json())
      .then(result => {
        console.log('Column names set successfully:', result);
      })
      .catch(error => {
        console.error('Error setting column names:', error);
      });
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getOAuthToken") {
    chrome.identity.getAuthToken({interactive: true}, token => {
      if (chrome.runtime.lastError) {
        console.error("Error in getAuthToken:", chrome.runtime.lastError);
        sendResponse({error: chrome.runtime.lastError.message});
      } else {
        sendResponse({token: token}); 
      }
    });
    return true; 
  }

});

async function appendScoreWithID(score) {
  chrome.identity.getAuthToken({ interactive: true }, async (token) => {
    if (chrome.runtime.lastError) {
      console.error('Error obtaining token:', chrome.runtime.lastError);
      return;
    }

    const spreadsheetId = await getSpreadsheetId();
    const sheetName = await getSheetIdFromCurrentUrl();
    const range = `${sheetName}!A:A`; 

    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    .then(response => response.json())
    .then(data => {
      const numRows = data.values ? data.values.length : 0;
      const firstEmptyRow = numRows + 1; // Sheets rows are 1-indexed
      // Constructing the range for the first empty row
      const fillRange = `${sheetName}!A${firstEmptyRow}:B${firstEmptyRow}`;

      // Preparing data to append: date and score
      const now = new Date();
      const dateString = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
      const values = [[dateString, score]];

      // Appending the score to the first empty row
      fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${fillRange}:append?valueInputOption=USER_ENTERED`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: values,
          range: fillRange,
          majorDimension: "ROWS"
        }),
      })
      .then(response => response.json())
      .then(data => console.log('Score appended:', data))
      .catch(error => console.error('Error appending score:', error));
    })
    .catch(error => console.error('Error finding first empty row:', error));
  });
}

async function getSheetIdFromCurrentUrl() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url) {
        const url = new URL(tabs[0].url);
        console.log("url")
        const key = url.searchParams.get('key');
        resolve(key); // Resolves with the key or null if not found
      } else {
        resolve(null); // No active tab or URL found
      }
    });
  });
}

function storeScore(newScore) {
  chrome.storage.local.get(['scores'], function(result) {
    let scores = result.scores || [];
    if (!scores.includes(newScore)) {
      scores.push(newScore);
      console.log(newScore);
      console.log("before append");
      appendScoreWithID(newScore)
        .then(() => {
          console.log("after append");
          chrome.storage.local.set({ scores: scores }, function() {
            console.log('Score has been stored successfully.');
          });
        })
        .catch((error) => {
          console.error('Error appending score:', error);
        });
    }
  });
}

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === "storeScore") {
    try {
      // Since storeScore is async, we call it with await
      await storeScore(request.score);
      sendResponse({status: "Score stored successfully"});
    } catch (error) {
      console.error('Error storing score:', error);
      sendResponse({status: "Error storing score", error: error.toString()});
    }
    return true; // Indicates that you will respond asynchronously
  }
});

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
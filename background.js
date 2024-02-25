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
    addSheetIdToStorage("a7220a92");
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

    checkIfSheetIdExists(sheetName, function(exists) {
      if (!exists) {
        console.log("The sheetId exists in storage.");
        addNewSheetAndUpdateColumns(spreadsheetId, sheetName, token, score);
        addSheetIdToStorage(sheetName);
      } else {
        appendScoreToSheet(spreadsheetId, sheetName, score, token);
      }
    });
  });
}

function getSheetIdFromCurrentUrl() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({active: true, currentWindow: true}, tabs => {
      if (tabs.length === 0) {
        reject('No active tab found');
        return;
      }
      const url = new URL(tabs[0].url);
      const key = url.searchParams.get('key');
      if (key) {
        resolve(key);
      } else {
        reject('Key parameter not found in URL');
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

async function addNewSheetAndUpdateColumns(spreadsheetId, sheetName, accessToken, score) {
  // First, add the new sheet
  let url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
  let requestBody = {
      requests: [
          {
              addSheet: {
                  properties: {
                      title: sheetName,
                  }
              }
          }
      ]
  };

  let response = await fetch(url, {
      method: 'POST',
      headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
      throw new Error('Failed to add new sheet');
  }

  const addSheetResponse = await response.json();
  console.log('Added new sheet:', addSheetResponse);

  // Update the first row with column names "Date" and "Score"
  url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:B1?valueInputOption=USER_ENTERED`;
  requestBody = {
      range: `${sheetName}!A1:B1`,
      values: [
          ["date", "score"] // Set the first row's values
      ],
      majorDimension: "ROWS"
  };

  response = await fetch(url, {
      method: 'PUT',
      headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
      throw new Error('Failed to update column names');
  }

  const updateColumnsResponse = await response.json();
  console.log('Updated column names:', updateColumnsResponse);

  // Append the current date and score to the next row
  const now = new Date();
  const dateString = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A2:B2:append?valueInputOption=USER_ENTERED`;
  const appendRequestBody = {
      range: `${sheetName}!A2:B2`,
      values: [
          [dateString, score.toString()] // Append the date and score
      ],
      majorDimension: "ROWS"
  };

  response = await fetch(appendUrl, {
      method: 'POST',
      headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
      },
      body: JSON.stringify(appendRequestBody)
  });

  if (!response.ok) {
      throw new Error('Failed to append date and score');
  }

  const appendResponse = await response.json();
  console.log('Date and score appended:', appendResponse);

  return {
      addSheetResponse,
      updateColumnsResponse,
      appendResponse
  };
}


function checkIfSheetIdExists(sheetIdToCheck, callback) {
  chrome.storage.local.get(['sheetIdList'], function(result) {
    let sheetIdList = result.sheetIdList || [];
    // Check if the sheetId exists in the retrieved list
    const exists = sheetIdList.includes(sheetIdToCheck);
    console.log(`Sheet ID exists: ${exists}`);
    // Optionally, use a callback to return the result
    if (typeof callback === 'function') {
      callback(exists);
    }
  });
}

function addSheetIdToStorage(newSheetId) {
  // Use chrome.storage.local or chrome.storage.sync based on your needs
  chrome.storage.local.get(['sheetIdList'], function(result) {
    let sheetIdList = result.sheetIdList || [];
    if (!sheetIdList.includes(newSheetId)) {
      sheetIdList.push(newSheetId);
      
      // Save the updated list back to storage
      chrome.storage.local.set({sheetIdList: sheetIdList}, function() {
        console.log('Sheet ID list updated:', sheetIdList);
      });
    }
  });
}


async function appendScoreToSheet(spreadsheetId, sheetName, score, token) {
  // Prepare the date string for appending
  const now = new Date();
  const dateString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Define the range to append the data. Note: The actual range used will be the first empty row in this column range.
  const range = `${sheetName}!A:B`; // This specifies to append data in columns A and B of the specified sheet.

  // URL for the Google Sheets API append operation
  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  // Prepare the request body with the data to append
  const requestBody = {
    values: [
      [dateString, score] // The data to append
    ],
    // The range is specified here for completeness in the request body, but it's primarily determined by the URL.
    range: range,
    majorDimension: "ROWS"
  };

  // Execute the fetch request to append the data
  try {
    const response = await fetch(appendUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Failed to append data: ${data.error ? data.error.message : 'Unknown error'}`);
    }

    console.log('Score appended:', data);
  } catch (error) {
    console.error('Error appending score:', error);
  }
}

function extractAndSendScore() {
    const scoreElement = document.querySelector('.correct');
    if (scoreElement) {
      const scoreText = scoreElement.textContent || '';
      const scoreMatch = scoreText.match(/Score: (\d+)/);
      if (scoreMatch && scoreMatch[1]) {
        const score = parseInt(scoreMatch[1], 10); 
        console.log('Detected score:', score); 

        chrome.runtime.sendMessage({score: score});
        storeScore(store);
      }
    }
  }

  function storeScore(newScore) {
    chrome.storage.local.get(['scores'], function(result) {
        let scores = result.scores || [];
        scores.push(newScore);
        console.log(newScore)
        chrome.storage.local.set({scores: scores}, function() {
            console.log('Score has been stored successfully.');
        });
    });
}

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
      characterData: true 
    });
  }
  
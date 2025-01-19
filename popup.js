document.getElementById('extractButton').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
  
    // Send message to content script to extract comments
    chrome.tabs.sendMessage(tab.id, { action: "extractComments" }, (response) => {
      if (response && response.comments) {
        displayComments(response.comments);
      }
    });
  });
  
  function displayComments(comments) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = comments.map(comment => `
      <div class="comment">
        <div class="header">
          <span class="name">${comment.name}</span>
          <span class="meta">${comment.date}</span>
        </div>
        <div class="content">${comment.comment}</div>
        <div class="stats">
          ${comment.likes} likes · Profile ID: ${comment.profileId}
          ${comment.imageUrls ? `<br>Images: ${comment.imageUrls}` : ''}
        </div>
      </div>
    `).join('');
  }
  
  
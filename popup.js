let allComments = [];
let currentFilter = 'all';
let currentSort = { column: 'likes', direction: 'desc' };

document.getElementById('extractButton').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  document.getElementById('extractButton').textContent = 'Extracting...';
  
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js']
  });

  chrome.tabs.sendMessage(tab.id, { action: "extractComments" }, (response) => {
    if (response && response.comments) {
      allComments = response.comments;
      document.getElementById('controlPanel').classList.remove('hidden');
      document.getElementById('stats').classList.remove('hidden');
      document.getElementById('extractButton').textContent = 'Extract Comments';
      updateStats();
      displayComments();
    }
  });
});

document.getElementById('reportButton').addEventListener('click', () => {
  window.open('https://codexafrica.com/report', '_blank');
});

document.getElementById('printTable').addEventListener('click', () => {
  window.print();
});

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('filter-active'));
    btn.classList.add('filter-active');
    currentFilter = btn.dataset.filter;
    displayComments();
  });
});

document.querySelectorAll('.sort-header').forEach(header => {
  header.addEventListener('click', () => {
    const column = header.dataset.sort;
    if (currentSort.column === column) {
      currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      currentSort.column = column;
      currentSort.direction = 'desc';
    }
    displayComments();
  });
});

document.getElementById('exportCsv').addEventListener('click', () => {
  const filteredComments = getFilteredComments();
  
  // Create HTML table with styling
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { 
          background: #1877f2; 
          color: white; 
          padding: 20px;
          margin-bottom: 20px;
          border-radius: 8px;
        }
        .logo { height: 40px; margin-right: 10px; }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-top: 20px;
          background: white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        th, td { 
          padding: 12px; 
          text-align: left; 
          border-bottom: 1px solid #eee;
        }
        th { 
          background: #f8f9fa;
          font-weight: bold;
        }
        tr:hover { background: #f8f9fa; }
        .stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 20px;
        }
        .stat-card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .stat-value {
          font-size: 24px;
          font-weight: bold;
          color: #1877f2;
        }
        .stat-label {
          color: #666;
          margin-top: 5px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="https://codexafrica.com/logo.png" alt="CodeX Africa" class="logo">
        <h1>Facebook Comments Analysis</h1>
        <p>Generated on: ${new Date().toLocaleString()}</p>
      </div>
      
      <div class="stats">
        <div class="stat-card">
          <div class="stat-value">${filteredComments.length}</div>
          <div class="stat-label">Total Comments</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${filteredComments.reduce((sum, c) => sum + c.likes, 0)}</div>
          <div class="stat-label">Total Likes</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${(filteredComments.reduce((sum, c) => sum + c.likes, 0) / filteredComments.length || 0).toFixed(1)}</div>
          <div class="stat-label">Average Likes</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Profile ID</th>
            <th>Date</th>
            <th>Likes</th>
            <th>Comment</th>
            <th>Images</th>
          </tr>
        </thead>
        <tbody>
          ${filteredComments.map(c => `
            <tr>
              <td><a href="https://facebook.com/${c.profileId}" target="_blank">${c.name}</a></td>
              <td>${c.profileId}</td>
              <td>${c.date}</td>
              <td>${c.likes}</td>
              <td>${c.comment}</td>
              <td>${c.imageUrls ? `<img src="${c.imageUrls}" alt="Comment image" style="max-width: 100px;">` : '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;

  // Create and download HTML file
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `facebook_comments_${new Date().toISOString().split('T')[0]}.html`;
  a.click();
  window.URL.revokeObjectURL(url);
});

// Add progress bar to popup
document.body.insertAdjacentHTML('afterbegin', `
  <div id="progressBar" class="hidden fixed top-0 left-0 w-full h-1 bg-gray-200">
    <div class="h-full bg-blue-600 transition-all duration-300" style="width: 0%"></div>
  </div>
`);

// Listen for progress updates
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'progress') {
    const progressBar = document.getElementById('progressBar');
    const progressFill = progressBar.querySelector('div');
    progressBar.classList.remove('hidden');
    progressFill.style.width = `${message.value}%`;
    
    if (message.value >= 100) {
      setTimeout(() => {
        progressBar.classList.add('hidden');
      }, 1000);
    }
  }
});

function getFilteredComments() {
  let comments = [...allComments];
  
  comments.sort((a, b) => {
    const multiplier = currentSort.direction === 'asc' ? 1 : -1;
    if (currentSort.column === 'likes') {
      return (a.likes - b.likes) * multiplier;
    }
    return (String(a[currentSort.column]).localeCompare(String(b[currentSort.column]))) * multiplier;
  });

  if (currentFilter === 'top10') {
    comments = comments.slice(0, 10);
  } else if (currentFilter === 'top5') {
    comments = comments.slice(0, 5);
  }

  return comments;
}

function updateStats() {
  const totalComments = allComments.length;
  const totalLikes = allComments.reduce((sum, comment) => sum + comment.likes, 0);
  const avgLikes = totalComments > 0 ? (totalLikes / totalComments).toFixed(1) : 0;

  document.getElementById('totalComments').textContent = totalComments;
  document.getElementById('totalLikes').textContent = totalLikes;
  document.getElementById('avgLikes').textContent = avgLikes;
}

function displayComments() {
  const tbody = document.getElementById('commentsBody');
  const comments = getFilteredComments();
  
  tbody.innerHTML = comments.map(comment => `
    <tr class="hover:bg-gray-50">
      <td class="font-medium">
        <a href="https://facebook.com/${comment.profileId}" target="_blank" class="text-blue-600 hover:underline">
          ${comment.name}
        </a>
      </td>
      <td class="text-gray-500">${comment.profileId}</td>
      <td class="text-gray-500">${comment.date}</td>
      <td class="font-medium">${comment.likes}</td>
      <td class="max-w-md break-words">${comment.comment}</td>
      <td>
        ${comment.imageUrls ? comment.imageUrls.split(', ').map(url => `
          <img src="${url}" alt="Comment image" class="image-preview mb-2" onclick="window.open('${url}', '_blank')" />
        `).join('') : '-'}
      </td>
    </tr>
  `).join('');
}


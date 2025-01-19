// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "extractComments") {
      const comments = extractComments();
      sendResponse({ comments });
    }
    return true;
  });
  
  function extractComments() {
    function formatDate(date) {
      return date.toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).replace(/\//g, '/');
    }
  
    function extractProfileId(href) {
      if (!href) return '';
      const match = href.match(/\/profile\.php\?id=(\d+)|facebook\.com\/(\d+)/);
      return match ? (match[1] || match[2]) : '';
    }
  
    const comments = [];
    const commentElements = document.querySelectorAll('[role="article"]');
    
    commentElements.forEach((comment, index) => {
      try {
        const authorElement = comment.querySelector('a[role="link"]');
        const nameElement = authorElement?.textContent || '';
        const profileId = extractProfileId(authorElement?.href || '');
        const commentText = comment.querySelector('[dir="auto"]')?.textContent || '';
        
        // Extract likes
        const likesElement = comment.querySelector('[aria-label*="reactions"]');
        const likes = likesElement ? parseInt(likesElement.textContent) : 0;
        
        // Extract images
        const images = Array.from(comment.querySelectorAll('img'))
          .map(img => img.src)
          .filter(src => src.includes('fbcdn.net'));
  
        comments.push({
          index: index + 1,
          name: nameElement,
          profileId: profileId,
          date: formatDate(new Date()),
          likes: likes || 0,
          comment: commentText,
          imageUrls: images.join(', ')
        });
      } catch (error) {
        console.error('Error processing comment:', error);
      }
    });
  
    return comments;
  }
  
  
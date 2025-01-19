chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "extractComments") {
      let progress = 0;
      chrome.runtime.sendMessage({ type: 'progress', value: progress });
      
      autoScroll().then(() => {
        const comments = extractComments();
        sendResponse({ comments });
      });
      return true;
    }
  });
  
  async function autoScroll() {
    return new Promise((resolve) => {
      const totalHeight = document.body.scrollHeight;
      let lastHeight = 0;
      let unchangedCount = 0;
      const maxUnchanged = 5; // Number of attempts before considering all loaded
      
      const scroll = setInterval(() => {
        window.scrollTo(0, document.body.scrollHeight);
        
        // Calculate and send progress
        const currentHeight = document.body.scrollHeight;
        const progress = Math.min(((currentHeight / totalHeight) * 100), 100);
        chrome.runtime.sendMessage({ type: 'progress', value: Math.round(progress) });
        
        // Check if we've reached the bottom
        if (currentHeight === lastHeight) {
          unchangedCount++;
          if (unchangedCount >= maxUnchanged) {
            clearInterval(scroll);
            window.scrollTo(0, 0);
            resolve();
          }
        } else {
          unchangedCount = 0;
          lastHeight = currentHeight;
        }
      }, 1000);
    });
  }
  
  function extractComments() {
    function formatDate(dateStr) {
      if (!dateStr) return '';
      
      // Handle relative dates
      const relativeMap = {
        'Just now': new Date(),
        'min': 'minutes',
        'mins': 'minutes',
        'hr': 'hours',
        'hrs': 'hours',
        'd': 'days',
        'w': 'weeks',
        'm': 'months',
        'y': 'years'
      };
      
      let date;
      if (dateStr.includes('Just now')) {
        date = new Date();
      } else {
        // Try parsing as relative time
        const parts = dateStr.split(' ');
        if (parts.length === 2) {
          const num = parseInt(parts[0]);
          const unit = parts[1];
          
          if (!isNaN(num) && relativeMap[unit]) {
            date = new Date();
            const unitMs = {
              minutes: 60 * 1000,
              hours: 60 * 60 * 1000,
              days: 24 * 60 * 60 * 1000,
              weeks: 7 * 24 * 60 * 60 * 1000,
              months: 30 * 24 * 60 * 60 * 1000,
              years: 365 * 24 * 60 * 60 * 1000
            };
            date.setTime(date.getTime() - (num * unitMs[relativeMap[unit]]));
          }
        } else {
          // Try parsing as absolute date
          date = new Date(dateStr);
        }
      }
      
      if (date && !isNaN(date)) {
        return date.toLocaleString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }).replace(/\//g, '/');
      }
      
      return dateStr; // Return original if parsing fails
    }
  
    function extractProfileId(href) {
      if (!href) return '';
      const match = href.match(/\/profile\.php\?id=(\d+)|facebook\.com\/(\d+)/);
      return match ? (match[1] || match[2]) : '';
    }
  
    const comments = [];
    // Target only top-level comments
    const commentElements = Array.from(document.querySelectorAll('[role="article"]')).filter(el => {
      // Check if this is a top-level comment by verifying it's not nested
      return !el.closest('[role="article"] [role="article"]');
    });
    
    commentElements.forEach((comment, index) => {
      try {
        // Get the first link that contains the commenter's name
        const authorElement = comment.querySelector('a[role="link"]:not([href*="photo"]):not([href*="video"])');
        const nameElement = authorElement?.textContent?.trim() || '';
        const profileId = extractProfileId(authorElement?.href || '');
        
        // Get timestamp more accurately
        const timestampElement = comment.querySelector('a[href*="/comment/"]');
        const timestamp = timestampElement?.textContent || '';
        
        // Get comment text more accurately - exclude nested comments
        const commentText = Array.from(comment.querySelectorAll('[dir="auto"]'))
          .filter(el => !el.closest('[role="article"] [role="article"]')) // Exclude nested comments
          .map(el => el.textContent)
          .filter(text => text && text !== nameElement && text !== timestamp)
          .join(' ')
          .trim();
        
        // Extract likes
        const likesElement = comment.querySelector('[aria-label*="reactions"]');
        const likes = likesElement ? parseInt(likesElement.textContent) : 0;
        
        // Extract images
        const images = Array.from(comment.querySelectorAll('img[src*="fbcdn"]'))
          .map(img => img.src)
          .filter(Boolean);
  
        comments.push({
          index: index + 1,
          name: nameElement,
          profileId: profileId,
          date: formatDate(timestamp),
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
  
  
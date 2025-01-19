// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//     if (request.action === "extractComments") {
//       let progress = 0;
//       chrome.runtime.sendMessage({ type: 'progress', value: progress });
      
//       autoScroll().then(() => {
//         const comments = extractComments();
//         sendResponse({ comments });
//       });
//       return true;
//     }
//   });
  
//   async function autoScroll() {
//   return new Promise((resolve) => {
//     let lastScrollHeight = 0;
//     let scrollAttempts = 0;
//     const maxScrollAttempts = 1000; // Adjust this value if needed

//     function scroll() {
//       const scrollHeight = document.documentElement.scrollHeight;
//       window.scrollTo(0, scrollHeight);

//       const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
//       const progress = (currentScrollTop / scrollHeight) * 100;

//       chrome.runtime.sendMessage({ type: 'progress', value: Math.round(progress) });

//       if (scrollHeight > lastScrollHeight) {
//         lastScrollHeight = scrollHeight;
//         scrollAttempts = 0;
//       } else {
//         scrollAttempts++;
//       }

//       if (scrollAttempts >= maxScrollAttempts) {
//         console.log("Reached the end of comments or maximum scroll attempts");
//         resolve();
//       } else {
//         setTimeout(scroll, 2000); // Adjust the delay if needed
//       }
//     }

//     scroll();
//   });
// }
  
//   function extractComments() {
//     function formatDate(dateStr) {
//       if (!dateStr) return '';
      
//       // Handle relative dates
//       const relativeMap = {
//         'Just now': new Date(),
//         'min': 'minutes',
//         'mins': 'minutes',
//         'hr': 'hours',
//         'hrs': 'hours',
//         'd': 'days',
//         'w': 'weeks',
//         'm': 'months',
//         'y': 'years'
//       };
      
//       let date;
//       if (dateStr.includes('Just now')) {
//         date = new Date();
//       } else {
//         // Try parsing as relative time
//         const parts = dateStr.split(' ');
//         if (parts.length === 2) {
//           const num = parseInt(parts[0]);
//           const unit = parts[1];
          
//           if (!isNaN(num) && relativeMap[unit]) {
//             date = new Date();
//             const unitMs = {
//               minutes: 60 * 1000,
//               hours: 60 * 60 * 1000,
//               days: 24 * 60 * 60 * 1000,
//               weeks: 7 * 24 * 60 * 60 * 1000,
//               months: 30 * 24 * 60 * 60 * 1000,
//               years: 365 * 24 * 60 * 60 * 1000
//             };
//             date.setTime(date.getTime() - (num * unitMs[relativeMap[unit]]));
//           }
//         } else {
//           // Try parsing as absolute date
//           date = new Date(dateStr);
//         }
//       }
      
//       if (date && !isNaN(date)) {
//         return date.toLocaleString('en-GB', {
//           day: '2-digit',
//           month: '2-digit',
//           year: '2-digit',
//           hour: '2-digit',
//           minute: '2-digit',
//           second: '2-digit'
//         }).replace(/\//g, '/');
//       }
      
//       return dateStr; // Return original if parsing fails
//     }
  
//     function extractProfileId(href) {
//       if (!href) return '';
//       const match = href.match(/\/profile\.php\?id=(\d+)|facebook\.com\/(\d+)/);
//       return match ? (match[1] || match[2]) : '';
//     }
  
//     const comments = [];
//     const commentElements = document.querySelectorAll('[role="article"]');
  
//     commentElements.forEach((comment, index) => {
//       try {
//         // Get the first link that contains the commenter's name
//         const authorElement = comment.querySelector('a[role="link"]:not([href*="photo"]):not([href*="video"])');
//         const nameElement = authorElement?.textContent?.trim() || '';
//         const profileId = extractProfileId(authorElement?.href || '');
        
//         // Get timestamp more accurately
//         const timestampElement = comment.querySelector('a[href*="/comment/"]');
//         const timestamp = timestampElement?.textContent || '';
        
//         // Get comment text more accurately - exclude nested comments
//         const commentText = Array.from(comment.querySelectorAll('[dir="auto"]'))
//           .filter(el => !el.closest('[role="article"] [role="article"]')) // Exclude nested comments
//           .map(el => el.textContent)
//           .filter(text => text && text !== nameElement && text !== timestamp)
//           .join(' ')
//           .trim();
        
//         // Extract likes
//         const likesElement = comment.querySelector('[aria-label*="reactions"]');
//         const likes = likesElement ? parseInt(likesElement.textContent) : 0;
        
//         // Extract images
//         const images = Array.from(comment.querySelectorAll('img[src*="fbcdn"]'))
//           .map(img => img.src)
//           .filter(Boolean);
  
//         // Get the full name
//         const fullNameElement = comment.querySelector('a[role="link"] > span');
//         const fullName = fullNameElement ? fullNameElement.textContent.trim() : '';

//         comments.push({
//           index: index + 1,
//           name: nameElement,
//           fullName: fullName, 
//           profileId: profileId,
//           date: formatDate(timestamp),
//           likes: likes || 0,
//           comment: commentText,
//           imageUrls: images.join(', ')
//         });

//         // Send progress updates for every 100 comments
//         if (index % 100 === 0) {
//           chrome.runtime.sendMessage({ 
//             type: 'extractionProgress', 
//             value: Math.round((index / commentElements.length) * 100) 
//           });
//         }
//       } catch (error) {
//         console.error('Error processing comment:', error);
//       }
//     });

//     return comments;
//   }

// Updated content.js
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
        let lastScrollHeight = 0;
        let scrollAttempts = 0;
        const maxScrollAttempts = 1000;

        function scroll() {
            const scrollHeight = document.documentElement.scrollHeight;
            window.scrollTo(0, scrollHeight);

            const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const progress = (currentScrollTop / scrollHeight) * 100;

            chrome.runtime.sendMessage({ type: 'progress', value: Math.round(progress) });

            if (scrollHeight > lastScrollHeight) {
                lastScrollHeight = scrollHeight;
                scrollAttempts = 0;
            } else {
                scrollAttempts++;
            }

            if (scrollAttempts >= maxScrollAttempts) {
                console.log("Reached the end of comments or maximum scroll attempts");
                resolve();
            } else {
                setTimeout(scroll, 2000);
            }
        }

        scroll();
    });
}

function extractComments() {
    function formatDate(dateStr) {
        // Parsing logic for dates
        // Simplified for clarity
        const date = new Date(dateStr);
        return !isNaN(date) ? date.toLocaleString() : dateStr;
    }

    const comments = [];
    const commentElements = document.querySelectorAll('[role="article"]');

    commentElements.forEach((comment, index) => {
        try {
            const authorElement = comment.querySelector('a[role="link"]:not([href*="photo"]):not([href*="video"])');
            const nameElement = authorElement?.textContent?.trim() || '';

            const profileId = authorElement?.href?.match(/facebook.com\/(\d+)/)?.[1] || '';
            const timestampElement = comment.querySelector('a[href*="/comment/"]');
            const timestamp = timestampElement?.textContent || '';
            const commentText = Array.from(comment.querySelectorAll('[dir="auto"]'))
                .map(el => el.textContent.trim())
                .join(' ');

            const likesElement = comment.querySelector('[aria-label*="reactions"]');
            const likes = parseInt(likesElement?.textContent) || 0;

            const images = Array.from(comment.querySelectorAll('img[src*="fbcdn"]'))
                .map(img => img.src);

            comments.push({
                index: index + 1,
                name: nameElement,
                profileId,
                date: formatDate(timestamp),
                likes,
                comment: commentText,
                imageUrls: images.join(', '),
            });

            if (index % 50 === 0) {
                chrome.runtime.sendMessage({ 
                    type: 'extractionProgress', 
                    value: Math.round((index / commentElements.length) * 100),
                });
            }
        } catch (error) {
            console.error('Error extracting comment:', error);
        }
    });

    return comments;
}

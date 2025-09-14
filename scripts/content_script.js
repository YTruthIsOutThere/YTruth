// scripts/content_script.js

// 1. Fetch the local database
const databaseUrl = chrome.runtime.getURL('data/bias_database.json');
fetch(databaseUrl)
  .then(response => response.json())
  .then(data => {
    scanPage(data.channels);
  });

// 2. Function to scan the page
function scanPage(channelData) {
  // Find all video elements. This selector might need tuning!
  const videoElements = document.querySelectorAll('ytd-video-renderer, ytd-rich-item-renderer');

  videoElements.forEach(videoEl => {
    // 3. Extract the channel name - This is the trickiest part, requires inspecting YouTube's HTML
    const channelNameElement = videoEl.querySelector('#channel-name a, #byline a');
    if (!channelNameElement) return;
    const channelName = channelNameElement.textContent.trim();

    // 4. Check our database
    const channelInfo = channelData[channelName];
    if (channelInfo) {
      // 5. Create and inject the label
      injectLabel(videoEl, channelInfo);
    }
  });
}

// 6. Function to create the label
function injectLabel(videoElement, channelInfo) {
  const label = document.createElement('span');
  label.className = 'contextscope-label';
  label.textContent = `${channelInfo.bias} · ${channelInfo.factuality}`;
  label.style.marginLeft = '8px';
  label.style.padding = '2px 6px';
  label.style.borderRadius = '4px';
  label.style.fontSize = '0.8em';
  label.style.backgroundColor = getColorForBias(channelInfo.bias); // You'd write this function

  // Find a good place to insert the label, often near the title
  const titleElement = videoElement.querySelector('#video-title');
  if (titleElement) {
    titleElement.parentNode.appendChild(label);
  }
}

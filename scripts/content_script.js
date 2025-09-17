// scripts/content_script.js

// Function to find video elements.
function findVideos() {
  return document.querySelectorAll('ytd-video-renderer, ytd-rich-item-renderer');
}

// Function to inject a label onto a video element.
function injectLabel(videoElement, analysis) {
  if (!videoElement) return;
  const titleElement = videoElement.querySelector('#video-title');
  if (!titleElement || videoElement.querySelector('.contextscope-label')) {
    return;
  }

  const label = document.createElement('span');
  label.className = `contextscope-label label-${analysis.class}`;
  label.textContent = analysis.text;
  label.title = analysis.tooltip;

  const parent = titleElement.parentElement;
  if (parent) {
    parent.appendChild(label);
  }
}

// Main processing function for the page.
function processPage() {
  const videos = findVideos();
  videos.forEach(video => {
    const videoData = {
      id: video.querySelector('a#video-title')?.href.match(/v=([^&]+)/)?.[1],
      channel: video.querySelector('#channel-name a, #byline a')?.textContent.trim(),
      title: video.querySelector('#video-title')?.textContent.trim(),
      element: video
    };

    if (videoData.id && videoData.channel) {
      // Send a message to the background script to start analysis
      chrome.runtime.sendMessage({ type: 'analyze_video', videoData }, (response) => {
        if (response && response.analysis) {
          injectLabel(video, response.analysis);
        }
      });
    }
  });
}

// Use a MutationObserver to watch for new content.
const observer = new MutationObserver(processPage);
observer.observe(document.body, { childList: true, subtree: true });

// Initial run on page load.
processPage();

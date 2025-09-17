// Function to find video elements on the page.
function findVideos() {
  return document.querySelectorAll('ytd-video-renderer, ytd-rich-item-renderer');
}

// Function to get the correct color for the label based on politicalness score
function getColorForPoliticalness(score) {
    // Fades from green (low politicalness) to red (high politicalness)
    const normalizedScore = Math.min(1, Math.max(0, score));
    const red = Math.floor(normalizedScore * 255);
    const green = Math.floor((1 - normalizedScore) * 255);
    return `rgb(${red}, ${green}, 0)`;
}

// Function to inject a label onto a video element.
function injectLabel(videoElement, analysis) {
    if (!videoElement) return;
    const titleElement = videoElement.querySelector('#video-title');
    if (!titleElement || videoElement.querySelector('.contextscope-label')) {
        return;
    }

    const label = document.createElement('span');
    label.className = `contextscope-label`;
    label.textContent = `Pol: ${(analysis.politicalness * 100).toFixed(0)}%`;
    label.title = analysis.tooltip;
    
    // Use a color gradient based on the politicalness score
    label.style.backgroundColor = getColorForPoliticalness(analysis.politicalness);

    const parent = titleElement.parentElement;
    if (parent) {
        parent.appendChild(label);
    }
}

// Main processing function for the page.
function processPage() {
    const videos = findVideos();
    videos.forEach(video => {
        const channelNameElement = video.querySelector('#channel-name a, #byline a');
        if (!channelNameElement) return;
        const channelName = channelNameElement.textContent.trim();

        const videoData = {
            id: video.querySelector('a#video-title')?.href.match(/v=([^&]+)/)?.[1],
            channel: channelName,
            title: video.querySelector('#video-title')?.textContent.trim(),
            element: video
        };

        if (videoData.id && videoData.channel) {
            // Send a message to the background script for analysis.
            chrome.runtime.sendMessage({ type: 'analyze_video', videoData }, (response) => {
                if (response && response.analysis) {
                    injectLabel(video, response.analysis);
                }
            });
        }
    });
}

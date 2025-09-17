// scripts/content.js
console.log("YTruth content script loaded!");


// Function to create and inject the initial "Analyze" button or reload symbol
function createInitialIndicator(videoElement) {
    let indicator = videoElement.querySelector('.ytruth-indicator');
    if (indicator) return;

    indicator = document.createElement('span');
    indicator.className = 'ytruth-indicator';
    indicator.textContent = '🔍';
    indicator.title = 'Click to analyze';

    indicator.addEventListener('click', (event) => {
        event.stopPropagation();
        const videoData = getVideoData(videoElement);
        if (videoData) {
            console.log("Requesting analysis for:", videoData.title);
            chrome.runtime.sendMessage({
                type: 'analyze_video',
                videoData: videoData
            });
            indicator.textContent = '⏳';
        }
    });

    const videoTitleElement = videoElement.querySelector('a#video-title');
    if (videoTitleElement) {
        videoTitleElement.after(indicator);
    }
}

// Helper function to extract video data
function getVideoData(videoElement) {
    const videoLinkElement = videoElement.querySelector('a#video-title');
    const channelNameElement = videoElement.querySelector('#channel-name a');

    if (!videoLinkElement || !channelNameElement) {
        return null;
    }

    const videoId = videoLinkElement.href.split('=')[1];
    const channelName = channelNameElement.textContent;
    const videoTitle = videoLinkElement.textContent;

    if (videoId && channelName && videoTitle) {
        return {
            id: videoId,
            channel: channelName,
            title: videoTitle
        };
    }
    return null;
}



// Function to update the indicator with analysis results
function updateIndicator(videoElement, analysis) {
    let indicator = videoElement.querySelector('.ytruth-indicator');
    if (!indicator) {
        indicator = document.createElement('span');
        indicator.className = 'ytruth-indicator';
        const videoTitleElement = videoElement.querySelector('#video-title');
        if (videoTitleElement) {
            videoTitleElement.after(indicator);
        }
    }

    indicator.textContent = analysis.text;
    indicator.title = analysis.tooltip;
    indicator.style.backgroundColor = getIndicatorColor(analysis.political_leaning);
}

// Simple logic to determine a color based on political leaning
function getIndicatorColor(leaning) {
    if (leaning === 'Left') return '#3498db';
    if (leaning === 'Right') return '#e74c3c';
    if (leaning === 'Non-Political') return '#2ecc71';
    return '#bdc3c7'; // Default for unknown
}

// Helper function to extract video data
function getVideoData(videoElement) {
    const videoId = videoElement.querySelector('#video-title').href.split('=')[1];
    const channelName = videoElement.querySelector('#channel-name a').textContent;
    const videoTitle = videoElement.querySelector('#video-title').textContent;

    if (videoId && channelName && videoTitle) {
        return {
            id: videoId,
            channel: channelName,
            title: videoTitle
        };
    }
    return null;
}

// --- Main logic: find and process videos ---
function processVideos() {
    console.log("Processing videos...");
    const videoElements = document.querySelectorAll('ytd-rich-grid-media, ytd-compact-video-renderer, ytd-video-renderer');
    videoElements.forEach(videoElement => {
        // Here, we'll assume the background script sends a message
        // with the analysis. For now, we'll just add the initial indicator.
        createInitialIndicator(videoElement);
    });
}

// Use a MutationObserver to detect when new videos are added to the page.
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.addedNodes) {
            processVideos();
        }
    });
});

// Start observing the main YouTube content area.
const mainContent = document.querySelector('ytd-rich-grid-renderer');
if (mainContent) {
    observer.observe(mainContent, { childList: true, subtree: true });
}

// Initial run to catch videos already loaded on the page.
processVideos();

// Listen for a message from the background script with the analysis result.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'analysis_result') {
        const videoElements = document.querySelectorAll('ytd-rich-grid-media, ytd-compact-video-renderer, ytd-video-renderer');
        videoElements.forEach(videoElement => {
            const videoId = videoElement.querySelector('#video-title').href.split('=')[1];
            if (videoId === request.videoId) {
                updateIndicator(videoElement, request.analysis);
            }
        });
    }
});


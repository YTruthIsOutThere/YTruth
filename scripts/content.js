// scripts/content.js
console.log("YTruth content script loaded!");

// Function to create and inject the initial "Analyze" button or reload symbol
function createInitialIndicator(videoElement) {
    let indicator = videoElement.querySelector('.ytruth-indicator');
    if (indicator) return; // Indicator already exists

    indicator = document.createElement('span');
    indicator.className = 'ytruth-indicator';
    indicator.textContent = '🔍'; // Magnifying glass emoji
    indicator.title = 'Click to analyze';

    indicator.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent navigating to the video
        const videoData = getVideoData(videoElement);
        if (videoData) {
            console.log("Requesting analysis for:", videoData.title);
            chrome.runtime.sendMessage({
                type: 'analyze_video',
                videoData: videoData
            });
            indicator.textContent = '⏳'; // Change to hourglass while loading
        }
    });

    const videoTitleElement = videoElement.querySelector('#video-title');
    if (videoTitleElement) {
        videoTitleElement.after(indicator);
    }
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

// Start observing a more general target that works on all pages.
const mainContent = document.querySelector('ytd-page-manager') || document.body;
if (mainContent) {
    observer.observe(mainContent, { childList: true, subtree: true });
    console.log("MutationObserver is active.");
} else {
    console.error("Could not find a valid target for MutationObserver.");
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

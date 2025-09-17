// scripts/content.js
console.log("YTruth content script loaded!");

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
        if (mutation.addedNodes.length > 0) { // Check for added nodes before processing
            processVideos();
        }
    });
});

// Start observing a more general target that works on all pages.
// The document.body is the most reliable target for dynamic content.
const mainContent = document.body;
if (mainContent) {
    observer.observe(mainContent, { childList: true, subtree: true });
    console.log("MutationObserver is active.");
} else {
    console.error("Could not find a valid target for MutationObserver.");
}

// Initial run to catch videos already loaded on the page.
processVideos();

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
    const titleElement = videoElement.querySelector('#video-title');
    if (!titleElement) {
        console.error("No #video-title found in videoElement");
        return null;
    }

    // Find the nearest link containing the title
    let titleLink = titleElement.closest('a[href*="watch?v="]');
    if (!titleLink) {
        titleLink = videoElement.querySelector('a[href*="watch?v="]');
    }
    if (!titleLink || !titleLink.href) {
        console.error("No valid title link found");
        return null;
    }

    // Extract video ID safely
    let videoId;
    try {
        const url = new URL(titleLink.href);
        videoId = url.searchParams.get('v');
    } catch (error) {
        console.error("Error parsing video URL:", error);
        return null;
    }

    // Extract channel name
    const channelElement = videoElement.querySelector('#channel-name a');
    const channelName = channelElement ? channelElement.textContent.trim() : null;

    // Extract title
    const videoTitle = titleElement.textContent.trim();

    if (videoId && channelName && videoTitle) {
        return { id: videoId, channel: channelName, title: videoTitle };
    }

    console.error("Missing video data:", { videoId, channelName, videoTitle });
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

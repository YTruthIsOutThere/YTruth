// scripts/content.js
console.log("YTruth content script loaded!");


// Function to create and inject the initial "Analyze" button or reload symbol
function createInitialIndicator(videoElement) {
    // Check if an indicator already exists for this video element
    if (videoElement.querySelector('.ytruth-indicator')) {
        return;
    }

    const indicator = document.createElement('span');
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

    // Find the video title link element within the current video element
    const videoTitleLink = videoElement.querySelector('a#video-title');
    if (videoTitleLink) {
        // Insert the indicator right after the video title link
        videoTitleLink.after(indicator);
    } else {
        // Fallback: If a direct link isn't found, try to find a general title container
        // This part might need further refinement based on specific YouTube layout changes.
        console.warn("Could not find video title link for indicator insertion in:", videoElement);
    }
}

// Function to update the indicator with analysis results
function updateIndicator(videoElement, analysis) {
    let indicator = videoElement.querySelector('.ytruth-indicator');
    if (!indicator) {
        // If indicator doesn't exist, create it (should have been created by createInitialIndicator)
        // This is a fallback in case the initial creation failed.
        indicator = document.createElement('span');
        indicator.className = 'ytruth-indicator';
        const videoTitleLink = videoElement.querySelector('a#video-title');
        if (videoTitleLink) {
            videoTitleLink.after(indicator);
        } else {
            console.error("Cannot update indicator: video title link not found.");
            return;
        }
    }

    indicator.textContent = analysis.text;
    indicator.title = analysis.tooltip;
    // Apply styles directly or use specific classes if defined in CSS
    indicator.style.backgroundColor = getIndicatorColor(analysis.political_leaning);
}

// Simple logic to determine a color based on political leaning
function getIndicatorColor(leaning) {
    if (leaning === 'Left') return '#3498db'; // Blue
    if (leaning === 'Right') return '#e74c3c'; // Red
    if (leaning === 'Non-Political') return '#2ecc71'; // Green
    // Default for unknown or other categories
    return '#bdc3c7'; // Grey
}

// Helper function to extract video data
function getVideoData(videoElement) {
    // Ensure we are targeting the correct element for the video link and title
    const videoLinkElement = videoElement.querySelector('a#video-title');
    // Find the channel name element - this selector might also need adjustment if YouTube changes its layout
    const channelNameElement = videoElement.querySelector('#channel-name a, .ytd-channel-name a'); // Added a fallback for channel name selector

    if (!videoLinkElement || !channelNameElement) {
        // If essential elements are not found, return null
        // console.warn("Missing video link or channel name element in:", videoElement);
        return null;
    }

    // Extracting video ID from the href attribute of the link
    const href = videoLinkElement.getAttribute('href');
    let videoId = null;
    if (href && href.includes('v=')) {
        const parts = href.split('v=');
        if (parts.length > 1) {
            videoId = parts[1].split('&')[0]; // Get the video ID, ignoring any other parameters
        }
    }

    const channelName = channelNameElement.textContent.trim();
    const videoTitle = videoLinkElement.textContent.trim();

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
    // Selectors for different types of video containers on YouTube
    const videoElements = document.querySelectorAll('ytd-rich-grid-media, ytd-compact-video-renderer, ytd-video-renderer');
    videoElements.forEach(videoElement => {
        // Call createInitialIndicator for each potential video element found
        createInitialIndicator(videoElement);
    });
}

// Use a MutationObserver to detect when new videos are added to the page.
// This is crucial for infinite scrolling or dynamic content loading.
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.addedNodes) {
            mutation.addedNodes.forEach(node => {
                // Check if the added node is a video element or contains video elements
                if (node.nodeType === Node.ELEMENT_NODE) {
                    if (node.matches('ytd-rich-grid-media, ytd-compact-video-renderer, ytd-video-renderer')) {
                        createInitialIndicator(node);
                    } else {
                        // If a new node contains video elements, process them
                        const videoElementsInside = node.querySelectorAll('ytd-rich-grid-media, ytd-compact-video-renderer, ytd-video-renderer');
                        videoElementsInside.forEach(createInitialIndicator);
                    }
                }
            });
        }
    });
});

// Start observing the main YouTube content area for dynamic changes.
// This selector targets the main content area where video grids/lists are rendered.
const targetNode = document.querySelector('ytd-browse'); // A more general target for the main YouTube page content
if (targetNode) {
    observer.observe(targetNode, { childList: true, subtree: true });
} else {
    console.warn("Could not find target node for MutationObserver. Icons might not appear on dynamically loaded content.");
}


// Initial run to catch videos already loaded on the page when the script first executes.
processVideos();

// Listen for a message from the background script with the analysis result.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'analysis_result') {
        // Find the specific video element that matches the videoId from the analysis result
        const videoElements = document.querySelectorAll('ytd-rich-grid-media, ytd-compact-video-renderer, ytd-video-renderer');
        videoElements.forEach(videoElement => {
            const videoData = getVideoData(videoElement);
            if (videoData && videoData.id === request.videoId) {
                updateIndicator(videoElement, request.analysis);
            }
        });
    }
});

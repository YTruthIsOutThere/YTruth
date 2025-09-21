// scripts/content.js
console.log("YTruth content script loaded!");

// --- Helper functions ---
function getVideoData(videoElement) {
    const titleElement = videoElement.querySelector('#video-title');
    if (!titleElement) {
        console.warn("YTruth : No #video-title found in videoElement. Skipping.");
        return null;
    }

    const titleLink = titleElement.closest('a[href*="watch?v="]') || 
                   videoElement.querySelector('a[href*="watch?v="]');
    if (!titleLink || !titleLink.href) {
        console.warn("YTruth : No valid title link found. Skipping.");
        return null;
    }

    let videoId;
    try {
        const url = new URL(titleLink.href);
        videoId = url.searchParams.get('v');
    } catch (error) {
        console.error("YTruth : Error parsing video URL:", error);
        return null;
    }

    const channelElement = videoElement.querySelector('#channel-name a, yt-formatted-string#channel-name a');
    const channelName = channelElement ? channelElement.textContent.trim() : null;
    const videoTitle = titleElement.textContent.trim();
    
    // Add an explicit check for valid data before returning
    if (!videoId || !channelName || !videoTitle) {
        console.warn("YTruth : Missing video data after extraction:", { videoId, channelName, videoTitle });
        return null;
    }

    return { id: videoId, channel: channelName, title: videoTitle };
}

function getIndicatorColor(leaning) {
    if (leaning === 'Left') return '#3498db';
    if (leaning === 'Right') return '#e74c3c';
    if (leaning === 'Non-Political') return '#2ecc71';
    return '#bdc3c7';
}

function createInitialIndicator(videoElement) {
    let indicator = videoElement.querySelector('.ytruth-indicator');
    if (indicator) return; // Indicator already exists

    const videoData = getVideoData(videoElement);
    if (!videoData) {
      console.warn("YTruth : Could not create indicator due to missing video data.");
      return;
    }

    indicator = document.createElement('span');
    indicator.className = 'ytruth-indicator';
    indicator.textContent = '🔍'; // Magnifying glass emoji
    indicator.title = 'Click to analyze';

    indicator.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent navigating to the video
        if (videoData) {
            console.log("YTruth : Requesting analysis for:", videoData.title);
            // Change indicator text to show loading state
            indicator.textContent = '⏳';
            indicator.style.backgroundColor = '#f1c40f'; // A yellow-ish color for loading
            indicator.title = 'Loading analysis...';

            chrome.runtime.sendMessage({
                type: 'analyze_video',
                videoData: videoData
            });
        }
    });

    const videoTitleElement = videoElement.querySelector('#video-title');
    if (videoTitleElement) {
        videoTitleElement.after(indicator);
        console.log(`YTruth : Indicator created for video: "${videoData.title}"`);
    } else {
        console.warn(`YTruth : Could not find title element to attach indicator for video with ID: ${videoData.id}`);
    }
}

function updateIndicator(videoElement, analysis) {
    let indicator = videoElement.querySelector('.ytruth-indicator');
    if (!indicator) {
        console.warn("YTruth : Attempted to update a non-existent indicator. Creating a new one.");
        indicator = document.createElement('span');
        indicator.className = 'ytruth-indicator';
        const videoTitleElement = videoElement.querySelector('#video-title');
        if (videoTitleElement) {
            videoTitleElement.after(indicator);
        } else {
            console.error("YTruth : Could not create indicator during update. Missing title element.");
            return;
        }
    }

    indicator.textContent = analysis.text;
    indicator.title = analysis.tooltip;
    indicator.style.backgroundColor = getIndicatorColor(analysis.political_leaning);
}

// --- Main processing logic ---
function processVideos() {
    console.log("YTruth : Processing videos...");
    const videoElements = document.querySelectorAll(
        'ytd-rich-grid-media, ytd-compact-video-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-playlist-video-renderer'
    );
    
    console.log(`YTruth : Found ${videoElements.length} potential video elements.`);
    
    videoElements.forEach(videoElement => {
        // Only process elements that don't have an indicator yet
        if (!videoElement.querySelector('.ytruth-indicator')) {
            createInitialIndicator(videoElement);
        }
    });
}

// --- Setup MutationObserver ---
function initObserver() {
    const observer = new MutationObserver((mutations) => {
        // A check to reduce unnecessary processing
        if (mutations.some(m => m.addedNodes.length > 0 && m.target.tagName !== 'SPAN')) {
             processVideos();
        }
    });

    // Use a more reliable, top-level target
    const observeTarget = document.body;
    
    if (observeTarget) {
        observer.observe(observeTarget, { 
            childList: true, 
            subtree: true 
        });
        console.log("YTruth : MutationObserver is active, observing document.body.");
    } else {
        console.error("YTruth : Could not find a valid target for MutationObserver.");
    }
}

// --- Initialize ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initObserver);
} else {
    initObserver();
}

// Initial processing
processVideos();

// Listen for analysis results
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'analysis_result') {
        const videoElements = document.querySelectorAll(
            'ytd-rich-grid-media, ytd-compact-video-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-playlist-video-renderer'
        );
        
        videoElements.forEach(videoElement => {
            const videoData = getVideoData(videoElement);
            if (videoData && videoData.id === request.videoId) {
                updateIndicator(videoElement, request.analysis);
            }
        });
    }
});
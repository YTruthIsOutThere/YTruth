// scripts/content.js
console.log("YTruth content script loaded!");

// --- Helper functions ---
function getVideoData(videoElement) {
    // Attempt to find the new title element
    const titleLink = videoElement.querySelector('a.yt-lockup-metadata-view-model__title');
    if (!titleLink) {
        // Fallback to the old method if the new one fails
        console.error("YTruth : No new title link found, falling back to old selectors.");
        const oldTitleElement = videoElement.querySelector('#video-title');
        if (!oldTitleElement) {
             console.error("YTruth : No #video-title found in videoElement");
             return null;
        }
        const oldTitleLink = oldTitleElement.closest('a[href*="watch?v="]') ||
                             videoElement.querySelector('a[href*="watch?v="]');
        if (!oldTitleLink || !oldTitleLink.href) {
            console.error("YTruth : No valid old title link found");
            return null;
        }

        // Return data using old selectors
        let videoId;
        try {
            const url = new URL(oldTitleLink.href);
            videoId = url.searchParams.get('v');
        } catch (error) {
            console.error("YTruth : Error parsing video URL:", error);
            return null;
        }

        const channelElement = videoElement.querySelector('#channel-name a, yt-formatted-string#channel-name a');
        const channelName = channelElement ? channelElement.textContent.trim() : null;
        const videoTitle = oldTitleElement.textContent.trim();
        
        if (videoId && channelName && videoTitle) {
            return { id: videoId, channel: channelName, title: videoTitle };
        }
         console.error("YTruth : Missing video data from old selectors:", { videoId, channelName, videoTitle });
         return null;
    }

    const videoTitle = titleLink.textContent.trim();
    let videoId;
    try {
        const url = new URL(titleLink.href);
        videoId = url.searchParams.get('v');
    } catch (error) {
        console.error("YTruth : Error parsing video URL:", error);
        return null;
    }

    // Attempt to find the channel name. This selector may also need to be updated.
    const channelElement = videoElement.querySelector('#channel-name a, yt-formatted-string#channel-name a, yt-lockup-byline-view-model__byline a');
    const channelName = channelElement ? channelElement.textContent.trim() : null;

    if (videoId && channelName && videoTitle) {
        return { id: videoId, channel: channelName, title: videoTitle };
    }

    console.error("YTruth : Missing video data from new selectors:", { videoId, channelName, videoTitle });
    return null;
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
    if (!videoData) return;

    indicator = document.createElement('span');
    indicator.className = 'ytruth-indicator';
    indicator.textContent = '🔍'; // Magnifying glass emoji
    indicator.title = 'Click to analyze';

    indicator.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent navigating to the video
        if (videoData) {
            console.log("YTruth : Requesting analysis for:", videoData.title);
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
        console.log(`YTruth : Indicator created for video: "${videoData.title}"`);
    } else {
        console.warn(`YTruth : Could not find title element to attach indicator for video with ID: ${videoData.id}`);
    }
}

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

// --- Main processing logic ---
function processVideos() {
    console.log("YTruth : Processing videos...");
    const videoElements = document.querySelectorAll(
        'ytd-rich-grid-media, ytd-compact-video-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-playlist-video-renderer, yt-lockup-view-model'
    );
    
    console.log(`YTruth : Found ${videoElements.length} video elements.`);
    
    videoElements.forEach(videoElement => {
        if (!videoElement.querySelector('.ytruth-indicator')) {
            createInitialIndicator(videoElement);
        }
    });
}

// --- Setup MutationObserver ---
function initObserver() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length > 0) {
                processVideos();
            }
        });
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
            'ytd-rich-grid-media, ytd-compact-video-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-playlist-video-renderer, yt-lockup-view-model'
        );
        
        videoElements.forEach(videoElement => {
            const videoData = getVideoData(videoElement);
            if (videoData && videoData.id === request.videoId) {
                updateIndicator(videoElement, request.analysis);
            }
        });
    }
});

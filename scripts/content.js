// scripts/content.js
console.log("YTruth content script loaded!");

// --- Helper functions ---
function getVideoData(videoElement) {
    const titleElement = videoElement.querySelector('#video-title');
    if (!titleElement) {
        console.error("No #video-title found in videoElement");
        return null;
    }

    let titleLink = titleElement.closest('a[href*="watch?v="]') || 
                   videoElement.querySelector('a[href*="watch?v="]');
    if (!titleLink || !titleLink.href) {
        console.error("No valid title link found");
        return null;
    }

    let videoId;
    try {
        const url = new URL(titleLink.href);
        videoId = url.searchParams.get('v');
    } catch (error) {
        console.error("Error parsing video URL:", error);
        return null;
    }

    const channelElement = videoElement.querySelector('#channel-name a, yt-formatted-string#channel-name a');
    const channelName = channelElement ? channelElement.textContent.trim() : null;
    const videoTitle = titleElement.textContent.trim();

    if (videoId && channelName && videoTitle) {
        return { id: videoId, channel: channelName, title: videoTitle };
    }

    console.error("Missing video data:", { videoId, channelName, videoTitle });
    return null;
}

function getIndicatorColor(leaning) {
    if (leaning === 'Left') return '#3498db';
    if (leaning === 'Right') return '#e74c3c';
    if (leaning === 'Non-Political') return '#2ecc71';
    return '#bdc3c7';
}

function createInitialIndicator(videoElement) {
    const videoData = getVideoData(videoElement);
    if (!videoData) return;

    const indicator = document.createElement('span');
    indicator.className = 'ytruth-indicator';
    indicator.textContent = '...';
    indicator.style.backgroundColor = '#bdc3c7';

    const videoTitleElement = videoElement.querySelector('#video-title');
    if (videoTitleElement) {
        videoTitleElement.after(indicator);
    }

    // Send message to background script for analysis
    chrome.runtime.sendMessage({
        type: 'analyze_video',
        videoData: videoData
    });
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
    console.log("Processing videos...");
    const videoElements = document.querySelectorAll(
        'ytd-rich-grid-media, ytd-compact-video-renderer, ytd-video-renderer, ytd-grid-video-renderer'
    );
    
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

    // Try multiple possible containers
    const observeTarget = document.querySelector('ytd-page-manager') || 
                         document.querySelector('ytd-app') || 
                         document.body;
    
    if (observeTarget) {
        observer.observe(observeTarget, { 
            childList: true, 
            subtree: true 
        });
        console.log("MutationObserver is active.");
    } else {
        console.error("Could not find a valid target for MutationObserver.");
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
            'ytd-rich-grid-media, ytd-compact-video-renderer, ytd-video-renderer, ytd-grid-video-renderer'
        );
        
        videoElements.forEach(videoElement => {
            const videoData = getVideoData(videoElement);
            if (videoData && videoData.id === request.videoId) {
                updateIndicator(videoElement, request.analysis);
            }
        });
    }
});

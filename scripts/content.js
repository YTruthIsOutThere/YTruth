// scripts/content.js
console.log("YTruth content script loaded!");

// --- Helper functions ---
function getVideoData(videoElement) {
    const titleLink = videoElement.querySelector('a.yt-lockup-metadata-view-model__title');
    if (titleLink) {
        const videoTitle = titleLink.textContent.trim();
        let videoId;
        try {
            const url = new URL(titleLink.href, window.location.origin);
            videoId = url.searchParams.get('v');
        } catch (error) {
            console.error("YTruth : Error parsing video URL:", error);
            return null;
        }

        const channelElement = videoElement.querySelector('a.yt-lockup-byline-view-model__byline');
        const channelName = channelElement ? channelElement.textContent.trim() : null;

        if (videoId && channelName && videoTitle) {
            return { id: videoId, channel: channelName, title: videoTitle };
        }
        console.error("YTruth : Missing video data from new selectors:", { videoId, channelName, videoTitle });
        return null;
    }

    // Fallback to old selectors if new ones are not found
    const oldTitleElement = videoElement.querySelector('#video-title');
    if (!oldTitleElement) {
        return null;
    }

    let oldTitleLink = oldTitleElement.closest('a[href*="watch?v="]');
    if (!oldTitleLink) {
        return null;
    }

    let videoId;
    try {
        const url = new URL(oldTitleLink.href, window.location.origin);
        videoId = url.searchParams.get('v');
    } catch (error) {
        return null;
    }

    const channelElement = videoElement.querySelector('#channel-name a, yt-formatted-string#channel-name a');
    const channelName = channelElement ? channelElement.textContent.trim() : null;
    const videoTitle = oldTitleElement.textContent.trim();
    
    if (videoId && channelName && videoTitle) {
        return { id: videoId, channel: channelName, title: videoTitle };
    }
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
    if (indicator) return;

    const videoData = getVideoData(videoElement);
    if (!videoData) return;

    indicator = document.createElement('span');
    indicator.className = 'ytruth-indicator';
    indicator.textContent = '🔍';
    indicator.title = 'Click to analyze';

    indicator.addEventListener('click', (event) => {
        event.stopPropagation();
        if (videoData) {
            chrome.runtime.sendMessage({
                type: 'analyze_video',
                videoData: videoData
            });
            indicator.textContent = '⏳';
            indicator.classList.add('ytruth-indicator-loading');
        }
    });

    const thumbnailContainer = videoElement.querySelector('yt-thumbnail-view-model');
    if (thumbnailContainer) {
        thumbnailContainer.appendChild(indicator);
    }
}

function createMainVideoIndicator() {
    const player = document.getElementById('movie_player');
    if (!player) return;

    if (player.querySelector('.ytruth-indicator')) return;

    const indicator = document.createElement('span');
    indicator.className = 'ytruth-indicator ytruth-main-video-overlay';
    indicator.textContent = '🔍';
    indicator.title = 'Click to analyze main video';

    indicator.addEventListener('click', (event) => {
        event.stopPropagation();
        const urlParams = new URLSearchParams(window.location.search);
        const videoId = urlParams.get('v');
        if (videoId) {
            const videoData = {
                id: videoId,
                channel: 'Unknown Channel', // This needs to be scraped
                title: 'Unknown Title' // This needs to be scraped
            };

            chrome.runtime.sendMessage({
                type: 'analyze_video',
                videoData: videoData
            });
            indicator.textContent = '⏳';
            indicator.classList.add('ytruth-indicator-loading');
        }
    });

    player.appendChild(indicator);
}

function updateIndicator(videoElement, analysis) {
    let indicator = videoElement.querySelector('.ytruth-indicator');
    if (!indicator) {
        indicator = document.createElement('span');
        indicator.className = 'ytruth-indicator';
        const thumbnailContainer = videoElement.querySelector('yt-thumbnail-view-model');
        if (thumbnailContainer) {
            thumbnailContainer.appendChild(indicator);
        }
    }

    indicator.classList.remove('ytruth-indicator-loading');
    indicator.textContent = analysis.text;
    indicator.title = analysis.tooltip;
    indicator.style.backgroundColor = getIndicatorColor(analysis.political_leaning);
}

// --- Main processing logic ---
function processVideos() {
    const videoElements = document.querySelectorAll(
        'ytd-rich-grid-media, ytd-compact-video-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-playlist-video-renderer, yt-lockup-view-model'
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
                createMainVideoIndicator();
            }
        });
    });

    const observeTarget = document.body;
    
    if (observeTarget) {
        observer.observe(observeTarget, { 
            childList: true, 
            subtree: true 
        });
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
createMainVideoIndicator();

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
// scripts/background.js

let channelDatabase = {};
let videoDatabase = {};

// GitHub Raw URL for the databases.
const channelDbUrl = 'https://raw.githubusercontent.com/YTruthIsOutThere/YTruth/main/data/bias_database.json';
const videoDbUrl = 'https://raw.githubusercontent.com/YTruthIsOutThere/YTruth/main/data/video_database.json';

// Fetch databases on service worker start.
async function fetchDatabases() {
    try {
        const channelRes = await fetch(channelDbUrl);
        const videoRes = await fetch(videoDbUrl);
        
        const channelData = await channelRes.json();
        const videoData = await videoRes.json();
        
        channelDatabase = channelData.channels;
        videoDatabase = videoData.videos;
        
        console.log("Databases fetched successfully from GitHub.");
    } catch (error) {
        console.error("Failed to fetch databases from GitHub:", error);
    }
}

// Call the function immediately on startup.
fetchDatabases();

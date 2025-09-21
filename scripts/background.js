// scripts/background.js

console.log("YTruth background.js script loaded.");

// --- 1. Database and API Setup ---

// GitHub Raw URL for the databases. REPLACE WITH YOURS.
const channelDbUrl = 'https://raw.githubusercontent.com/YTruthIsOutThere/YTruth/main/data/bias_database.json';
const videoDbUrl = 'https://raw.githubusercontent.com/YTruthIsOutThere/YTruth/main/data/video_database.json';


let channelDatabase = {};
let videoDatabase = {};
let dbFetchAttempted = false;

async function fetchDatabases() {
    if (dbFetchAttempted) return;
    dbFetchAttempted = true;

    try {
        console.log("YTruth : Attempting to fetch databases...");
        // Fetch channel database
        const channelRes = await fetch(channelDbUrl);
        if (!channelRes.ok) {
            console.warn(`YTruth : Failed to fetch channel DB. HTTP status: ${channelRes.status}`);
            // Do not throw, allow code to continue with an empty database
        } else {
            channelDatabase = (await channelRes.json()).channels || {};
        }

        // Fetch video database
        const videoRes = await fetch(videoDbUrl);
        if (!videoRes.ok) {
            console.warn(`YTruth : Failed to fetch video DB. HTTP status: ${videoRes.status}`);
            // Do not throw, allow code to continue with an empty database
        } else {
            videoDatabase = (await videoRes.json()).videos || {};
        }

        console.log("YTruth : Databases fetched. Channels:", Object.keys(channelDatabase).length, "Videos:", Object.keys(videoDatabase).length);
    } catch (error) {
        console.error("YTruth : An unexpected error occurred while fetching databases:", error);
        channelDatabase = {};
        videoDatabase = {};
    }
}

// Call on startup and on messages
fetchDatabases();

// --- 2. IndexedDB Setup for Caching ---

let db;
const request = indexedDB.open("YTruthDB", 1);

request.onupgradeneeded = (event) => {
  db = event.target.result;
  db.createObjectStore("analyses", { keyPath: "id" });
};

request.onsuccess = (event) => {
  db = event.target.result;
  console.log("YTruth : IndexedDB opened successfully.");
};

request.onerror = (event) => {
  console.error("YTruth : Failed to open IndexedDB:", event.target.error);
};

// Functions to save and retrieve data from IndexedDB
async function getAnalysisFromDB(videoId) {
  return new Promise((resolve, reject) => {
    if (!db) {
      console.warn("YTruth : IndexedDB not available, skipping cache read.");
      return resolve(null);
    }
    const transaction = db.transaction(["analyses"], "readonly");
    const store = transaction.objectStore("analyses");
    const getRequest = store.get(videoId);

    getRequest.onsuccess = () => {
      const result = getRequest.result;
      // Check if data is fresh (within a week)
      if (result && (Date.now() - result.timestamp < 7 * 24 * 60 * 60 * 1000)) {
        console.log(`YTruth : Found valid cached analysis for video: ${videoId}`);
        resolve(result.data);
      } else {
        if (result) {
            console.log(`YTruth : Cached analysis for video: ${videoId} is expired.`)
        }
        resolve(null);
      }
    };
    getRequest.onerror = (event) => {
      console.error("YTruth : IndexedDB get error:", event.target.error);
      reject(event.target.error);
    };
  });
}

async function saveAnalysisToDB(videoId, analysis) {
  return new Promise((resolve, reject) => {
    if (!db) {
        console.warn("YTruth : IndexedDB not available, skipping cache save.");
        return resolve(false);
    }
    const transaction = db.transaction(["analyses"], "readwrite");
    const store = transaction.objectStore("analyses");
    
    store.put({ id: videoId, data: analysis, timestamp: Date.now() });

    transaction.oncomplete = () => {
      console.log(`YTruth : Analysis for video: ${videoId} saved to cache.`);
      resolve(true);
    };
    transaction.onerror = (event) => {
      console.error("YTruth : IndexedDB save error:", event.target.error);
      reject(event.target.error);
    };
  });
}


// --- 3. AI Analysis Function ---

async function getAIAnalysis(videoData) {
  const VERCEL_URL = "https://ytruth-epr6esvk7-ytruthisouttheres-projects.vercel.app";
  
    try {
        console.log("YTruth : Requesting AI analysis for video:", videoData.id);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout
        
        const response = await fetch(`${VERCEL_URL}/api/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ videoData }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`AI API error: ${response.status} - ${response.statusText}`);
        }
        const result = await response.json();
        console.log("YTruth : AI response received successfully.");
        const aiLabels = result.labels || [];
    
        const factuality = aiLabels.includes("High") ? "High" : aiLabels.includes("Mixed") ? "Mixed" : "Low";
        const politicalness = aiLabels.includes("Political") ? "Political" : "Non-Political";
        const editorial_bias = aiLabels.includes("News") ? "News" : aiLabels.includes("Opinion/Commentary") ? "Opinion/Commentary" : aiLabels.includes("Educational/Instructional") ? "Educational/Instructional" : aiLabels.includes("Conspiracy/Pseudoscience") ? "Conspiracy/Pseudoscience" : "Entertainment";
        
        const analysis = {
          text: `${politicalness.charAt(0)} · ${factuality.charAt(0)} · ${editorial_bias.charAt(0)}`,
          tooltip: `Political: ${politicalness}\nFactuality: ${factuality}\nBias: ${editorial_bias}`,
          political_leaning: politicalness
        };

        return analysis;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error("YTruth : AI analysis request timed out.");
        } else {
            console.error("YTruth : AI analysis failed:", error);
        }
        return { 
            text: 'AI Failed', 
            tooltip: 'AI analysis could not be completed.',
            political_leaning: "Non-Political"
        };
    }
}

// --- 4. Main Message Listener ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'analyze_video') {
        fetchDatabases(); // Ensure DBs are fetched

        const { videoData } = request;
        const { id, channel } = videoData;

        (async () => {
            console.log(`YTruth : Starting analysis for video: "${videoData.title}"`);
            // Tier 1: Check the static video database from GitHub
            if (videoDatabase[id]) {
                const analysis = videoDatabase[id];
                console.log("YTruth : Found analysis in video database.");
                chrome.tabs.sendMessage(sender.tab.id, {
                    type: "analysis_result",
                    videoId: id,
                    analysis: analysis
                });
                return;
            }

            // Tier 2: Check the client-side cache (IndexedDB)
            const cachedAnalysis = await getAnalysisFromDB(id);
            if (cachedAnalysis) {
                console.log("YTruth : Found analysis in IndexedDB cache.");
                chrome.tabs.sendMessage(sender.tab.id, {
                    type: "analysis_result",
                    videoId: id,
                    analysis: cachedAnalysis
                });
                return;
            }

            // Tier 3: Check the channel-level database from GitHub
            if (channelDatabase[channel]) {
                const data = channelDatabase[channel];
                console.log("YTruth : Found analysis in channel database.");
                const analysis = {
                    text: `${data.political_leaning.charAt(0)} · ${data.factuality.charAt(0)}`,
                    tooltip: `Political Leaning: ${data.political_leaning}, Factuality: ${data.factuality}`,
                    political_leaning: data.political_leaning
                };
                chrome.tabs.sendMessage(sender.tab.id, {
                    type: "analysis_result",
                    videoId: id,
                    analysis: analysis
                });
                return;
            }

            // Tier 4: If all else fails, use the AI API
            console.log("YTruth : No static or cached analysis found, calling AI API.");
            const aiAnalysis = await getAIAnalysis(videoData);
            await saveAnalysisToDB(id, aiAnalysis);
            
            chrome.tabs.sendMessage(sender.tab.id, {
                type: "analysis_result",
                videoId: id,
                analysis: aiAnalysis
            });
            
        })();
        return true;
    }
});
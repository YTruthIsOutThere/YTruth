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
        console.log("Fetching databases...");
        // Fetch channel database
        const channelRes = await fetch(channelDbUrl);
        if (!channelRes.ok) {
            throw new Error(`HTTP error! status: ${channelRes.status} for channel DB`);
        }
        channelDatabase = (await channelRes.json()).channels || {};

        // Fetch video database
        const videoRes = await fetch(videoDbUrl);
        if (!videoRes.ok) {
            throw new Error(`HTTP error! status: ${videoRes.status} for video DB`);
        }
        videoDatabase = (await videoRes.json()).videos || {};

        console.log("Databases fetched successfully:", Object.keys(channelDatabase).length, "channels;", Object.keys(videoDatabase).length, "videos.");
    } catch (error) {
        console.error("Failed to fetch databases:", error);
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
};

// Functions to save and retrieve data from IndexedDB
async function getAnalysisFromDB(videoId) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["analyses"], "readonly");
    const store = transaction.objectStore("analyses");
    const getRequest = store.get(videoId);

    getRequest.onsuccess = () => {
      const result = getRequest.result;
      if (result && (Date.now() - result.timestamp < 7 * 24 * 60 * 60 * 1000)) {
        resolve(result.data);
      } else {
        resolve(null);
      }
    };
    getRequest.onerror = (event) => {
      console.error("IndexedDB get error:", event.target.error);
      reject(event.target.error);
    };
  });
}

async function saveAnalysisToDB(videoId, analysis) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["analyses"], "readwrite");
    const store = transaction.objectStore("analyses");
    
    store.put({ id: videoId, data: analysis, timestamp: Date.now() });

    transaction.oncomplete = () => {
      resolve(true);
    };
    transaction.onerror = (event) => {
      console.error("IndexedDB save error:", event.target.error);
      reject(event.target.error);
    };
  });
}


// --- 3. AI Analysis Function ---

async function getAIAnalysis(videoData) {
  const VERCEL_URL = "https://ytruth-epr6esvk7-ytruthisouttheres-projects.vercel.app";
  
    try {
            console.log("Requesting AI analysis for video:", videoData.id);
            const response = await fetch(`${VERCEL_URL}/api/analyze`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ videoData })
            });
            if (!response.ok) {
                throw new Error(`AI API error: ${response.status}`);
            }
            const result = await response.json();
            console.log("AI response:", result);
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
        console.error("AI analysis failed:", error);
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
            // Tier 1: Check the static video database from GitHub
            if (videoDatabase[id]) {
                const analysis = videoDatabase[id];
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

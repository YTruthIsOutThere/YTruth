// scripts/background.js

// --- 1. Database and API Setup ---

// GitHub Raw URL for the databases. REPLACE WITH YOURS.
const channelDbUrl = 'https://raw.githubusercontent.com/YTruthIsOutThere/YTruth/main/data/bias_database.json';
const videoDbUrl = 'https://raw.githubusercontent.com/YTruthIsOutThere/YTruth/main/data/video_database.json';


// IMPORTANT: Do not hard-code your token here.
// Instead, load it from a separate, untracked file or environment variable.
const HUGGING_FACE_TOKEN = "YOUR_HF_TOKEN"; 

let channelDatabase = {};
let videoDatabase = {};

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
  const { title, channel } = videoData;
  const prompt = `Classify the YouTube video "${title}" by "${channel}" based on its primary intent, factuality, and whether it is political in nature.
  Provide a single JSON object with the following keys and values:
  - factuality: ["High", "Mixed", "Low"]
  - politicalness: ["Political", "Non-Political"]
  - editorial_bias: ["News", "Opinion/Commentary", "Educational/Instructional", "Conspiracy/Pseudoscience", "Entertainment"]
  
  Example: {"factuality": "High", "politicalness": "Political", "editorial_bias": "News"}`;

  try {
    const response = await fetch("https://api-inference.huggingface.co/models/facebook/bart-large-mnli", {
      headers: { Authorization: `Bearer ${HUGGING_FACE_TOKEN}` },
      method: "POST",
      body: JSON.stringify({
        inputs: prompt,
        parameters: { 
          candidate_labels: ["High", "Mixed", "Low", "Political", "Non-Political", "News", "Opinion/Commentary", "Educational/Instructional", "Conspiracy/Pseudoscience", "Entertainment"]
        }
      })
    });
    
    const result = await response.json();
    const aiLabels = result.labels; 
    
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
        const { videoData } = request;
        const { id, channel } = videoData;

        (async () => {
            // Tier 1: Check the static video database from GitHub
            if (videoDatabase[id]) {
                const analysis = videoDatabase[id];
                sendResponse({ analysis });
                return;
            }

            // Tier 2: Check the client-side cache (IndexedDB)
            const cachedAnalysis = await getAnalysisFromDB(id);
            if (cachedAnalysis) {
                sendResponse({ analysis: cachedAnalysis });
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
                sendResponse({ analysis });
                return;
            }

            // Tier 4: If all else fails, use the AI API
            const aiAnalysis = await getAIAnalysis(videoData);
            await saveAnalysisToDB(id, aiAnalysis);
            sendResponse({ analysis: aiAnalysis });
        })();
        return true;
    }
});

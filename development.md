# Strategic Approach for YTruth: Identifying Echo Chambers & Factuality in YouTube Feeds

Based on your clarified objectives, here's a comprehensive approach to build YTruth that focuses on real-time analysis of YouTube recommendations without accessing history data, with emphasis on factuality and editorial bias over simple left-right spectrum analysis.

## Core Architecture

### 1. Data Collection & Analysis Pipeline

**Client-Side Processing (Browser Extension):**
```javascript
// Content script to extract recommendation data
function extractVideoData() {
  const videos = [];
  document.querySelectorAll('ytd-video-renderer, ytd-rich-item-renderer').forEach(el => {
    const video = {
      id: el.querySelector('a#video-title')?.href.match(/v=([^&]+)/)?.[1],
      channel: el.querySelector('#channel-name a, #byline a')?.textContent.trim(),
      title: el.querySelector('#video-title')?.textContent.trim(),
      metadata: {} // To be populated by analysis
    };
    if (video.id && video.channel) videos.push(video);
  });
  return videos;
}
```

### 2. Multi-Tier Analysis System

#### Tier 1: Pre-Curated Database (Immediate)
- **Source**: Media Bias/Fact Check, Wikipedia, known fact-checking organizations
- **Format**:
```json
{
  "channels": {
    "CNN": {
      "factuality": "high",
      "editorial_bias": "news",
      "methods": "fact-checking",
      "sources": ["MBFC", "Wikipedia"],
      "last_updated": "2023-11-15"
    },
    "Natural News": {
      "factuality": "low",
      "editorial_bias": "conspiracy/pseudoscience",
      "methods": "cherry-picking, misinformation",
      "sources": ["MBFC", "ScienceFeedback"],
      "last_updated": "2023-11-15"
    }
  }
}
```

#### Tier 2: Network Analysis (Near Real-Time)
- Analyze recommendation patterns between channels
- Identify clusters of channels that frequently recommend each other
- Detect echo chambers based on interconnection density

```python
# Pseudocode for network analysis
def analyze_echo_chamber(video_list):
    channel_network = build_network_from_recommendations(video_list)
    clusters = detect_communities(channel_network)
    
    for cluster in clusters:
        bubble_score = calculate_echo_chamber_score(cluster)
        factuality_score = average_factuality(cluster)
        
    return {
        "echo_chamber_score": bubble_score,
        "average_factuality": factuality_score,
        "cluster_topics": extract_common_topics(cluster)
    }
```

#### Tier 3: On-Demand AI Analysis (When Needed)
- For channels/videos without pre-existing data
- Use free-tier AI APIs with smart caching

### 3. Implementing Free AI Analysis

**Using Hugging Face Inference API (Free Tier):**
```javascript
async function analyzeVideoWithAI(videoTitle, channelName) {
  // Check cache first
  const cached = checkAnalysisCache(videoTitle + channelName);
  if (cached) return cached;
  
  try {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/facebook/bart-large-mnli",
      {
        headers: { Authorization: "Bearer YOUR_HF_TOKEN" },
        method: "POST",
        body: JSON.stringify({
          inputs: `Video: ${videoTitle} by ${channelName}`,
          parameters: {
            candidate_labels: [
              "factual news", "opinion", "conspiracy theory", 
              "entertainment", "educational", "misinformation",
              "political commentary", "scientific", "pseudoscience"
            ]
          }
        })
      }
    );
    
    const result = await response.json();
    cacheAnalysis(videoTitle + channelName, result);
    return result;
  } catch (error) {
    console.error("AI analysis failed:", error);
    return null;
  }
}
```

**Alternative Free AI Options:**
1. **Cohere API** (free tier available)
2. **OpenRouter** (routes to various models including free ones)
3. **Local models** (using Transformers.js for client-side analysis)

### 4. Echo Chamber Detection Algorithm

```javascript
function calculateEchoChamberScore(recommendedVideos) {
  const channels = recommendedVideos.map(v => v.channel);
  const uniqueChannels = new Set(channels);
  
  // Calculate homogeneity score
  const channelCount = {};
  channels.forEach(channel => {
    channelCount[channel] = (channelCount[channel] || 0) + 1;
  });
  
  const entropy = calculateEntropy(Object.values(channelCount));
  const homogeneity = 1 - (entropy / Math.log(uniqueChannels.size));
  
  return {
    score: homogeneity,
    unique_channels: uniqueChannels.size,
    dominant_channels: Object.entries(channelCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
  };
}
```

### 5. User Interface Implementation

**Inline Display of Analysis:**
```css
.truth-label {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.8em;
  margin-left: 8px;
  display: inline-block;
}

.label-factual {
  background-color: #4CAF50;
  color: white;
}

.label-opinion {
  background-color: #FF9800;
  color: black;
}

.label-misinformation {
  background-color: #F44336;
  color: white;
}

.echo-chamber-warning {
  border: 1px solid #FF5252;
  padding: 8px;
  margin: 10px 0;
  border-radius: 4px;
  background-color: #FFEBEE;
}
```

**Content Script to Inject Labels:**
```javascript
function injectLabels(videos, analyses) {
  videos.forEach((video, index) => {
    const analysis = analyses[index];
    if (!analysis) return;
    
    const titleElement = video.element.querySelector('#video-title');
    if (!titleElement) return;
    
    const label = document.createElement('span');
    label.className = `truth-label label-${getLabelClass(analysis)}`;
    label.textContent = getLabelText(analysis);
    label.title = getTooltipText(analysis);
    
    titleElement.parentNode.appendChild(label);
  });
}
```

### 6. Sustainable AI Usage Strategy

**To manage free tier limits:**
1. **Client-side caching** using IndexedDB
2. **Batch processing** of requests during low-usage periods
3. **Priority system** - only analyze videos with sufficient views/engagement
4. **Fallback to network analysis** when AI quotas are exhausted
5. **Community-sourced analysis** where users can contribute labels

**Implementation of caching:**
```javascript
// Simple client-side cache implementation
const analysisCache = {
  async get(key) {
    const cached = localStorage.getItem(`analysis_${key}`);
    return cached ? JSON.parse(cached) : null;
  },
  
  async set(key, value, ttl = 24 * 60 * 60 * 1000) {
    const item = {
      value: value,
      expiry: Date.now() + ttl
    };
    localStorage.setItem(`analysis_${key}`, JSON.stringify(item));
  }
};
```

### 7. Data Sources for Initial Database

1. **Media Bias/Fact Check** (manual import)
2. **Wikipedia** (infobox data for media organizations)
3. **NewsGuard** (if partnership possible)
4. **IFFY** (misinformation tracking organizations)
5. **Academic datasets** on media reliability

### 8. Deployment Strategy

**Phase 1:** Basic extension with pre-curated database (2-4 weeks)
**Phase 2:** Add network analysis for echo chamber detection (2-3 weeks)
**Phase 3:** Integrate free-tier AI analysis with caching (3-4 weeks)
**Phase 4:** Community features for crowd-sourced labeling (ongoing)

This approach allows you to start with a functional product quickly while building toward more sophisticated analysis capabilities, all while respecting user privacy and managing costs effectively.

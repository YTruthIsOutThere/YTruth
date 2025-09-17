// This file runs on the server, not the user's browser.
import fetch from 'node-fetch';

export default async function handler(request, response) {
  // Get the token from a secure environment variable.
  const HUGGING_FACE_TOKEN = process.env.HUGGING_FACE_TOKEN;
  
  // Get the data from the extension's request body.
  const { videoData } = await request.json();
  const { title, channel } = videoData;
  
  // Check if the token is available.
  if (!HUGGING_FACE_TOKEN) {
    return response.status(500).json({ error: 'Server token is not configured.' });
  }

  const prompt = `Classify the YouTube video "${title}" by "${channel}" based on its primary intent, factuality, and whether it is political in nature.
  Provide a single JSON object with the following keys and values:
  - factuality: ["High", "Mixed", "Low"]
  - politicalness: ["Political", "Non-Political"]
  - editorial_bias: ["News", "Opinion/Commentary", "Educational/Instructional", "Conspiracy/Pseudoscience", "Entertainment"]
  
  Example: {"factuality": "High", "politicalness": "Political", "editorial_bias": "News"}`;

  try {
    const hfResponse = await fetch("https://api-inference.huggingface.co/models/facebook/bart-large-mnli", {
      headers: { Authorization: `Bearer ${HUGGING_FACE_TOKEN}` },
      method: "POST",
      body: JSON.stringify({
        inputs: prompt,
        parameters: { 
          candidate_labels: ["High", "Mixed", "Low", "Political", "Non-Political", "News", "Opinion/Commentary", "Educational/Instructional", "Conspiracy/Pseudoscience", "Entertainment"]
        }
      })
    });
    
    const result = await hfResponse.json();
    response.status(200).json(result);

  } catch (error) {
    console.error("AI analysis failed:", error);
    response.status(500).json({ error: "AI analysis could not be completed." });
  }
}

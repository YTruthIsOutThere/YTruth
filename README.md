# YTruth Browser Extension

![YTruth Logo](https://raw.githubusercontent.com/YTruthIsOutThere/YTruth/main/images/logo.svg)
![YTruth Logo MoreCrazy](https://raw.githubusercontent.com/YTruthIsOutThere/YTruth/main/images/logo-morecrazy.svg)
![YTruth Logo Teh Truth Eye](https://raw.githubusercontent.com/YTruthIsOutThere/YTruth/main/images/logo-thetrutheye.svg)
![YTruth Logo Speechbubble](https://raw.githubusercontent.com/YTruthIsOutThere/YTruth/main/images/logo-speechbubble.svg)
![YTruth Logo Praise](https://raw.githubusercontent.com/YTruthIsOutThere/YTruth/main/images/logo-christian.svg)

## A transparent, community-powered browser extension that reveals the editorial bias and factuality of YouTube channels directly on your recommendation feed. Browse with context.

#### *Note this plugin does not focus on left-right bias, as the horseshoe hypothesis is bs anyway.*

The aims are:
Showing echochambers and opinionbubbles based on the current recommended vidoes in the feed/website, not accessing past history data.
This means showing the factuality and editorial bias and other categories, not focussing on left-right biases.
Showing the factuality and editorial bias and other categories of specific videos as tags or keynotes under each recommendet video for a quick overview of the contents of the video. 
Preferably these information are harvested by short AI/LLM analysis, eventhough this is probably not feasable for now.


## 🧭 The Plan & Philosophy

YTruth is built on principles of transparency, privacy, and community. We believe in providing tools to understand media diets, not in preaching or creating division.

## Our phased development plan is designed to be sustainable and community-focused:

Phase 1: The Free Core (Current State)
    The extension works entirely locally on your machine. It uses a manually and community-curated database of channels (bias_database.json) to add simple labels (e.g., Left · High, Right · Mixed) next to videos. No data is ever sent to any server. This is completely free and open-source.

Phase 2: Smarter Inference & A Community Fund
    We will enhance the core to make intelligent guesses about unknown channels by analyzing their "network" of recommended channels. We will also introduce an optional community-funded AI analysis feature for edge cases. This will be managed with extreme transparency—a public dashboard will show funds and usage, and the feature will be enabled only when community credits are available.

Phase 3: A Self-Sustaining Public Good
    The goal is for the project to be sustained by its community. The database itself, grown through millions of user interactions and contributions, will become a valuable public resource for understanding the digital media landscape.

## 🚀 How It Works

Local Analysis: When you load YouTube, the YTruth extension loads a database of channel ratings into your browser's memory.

Real-Time Overlay: It scans the page for video recommendations and instantly matches the channel names against its database.

Simple Labels: For each known channel, it injects a small, color-coded label (e.g., Left · High) right next to the video title.

Your Data Stays Yours: All of this happens on your device. Your browsing history and YouTube data never leave your computer.

## 📦 Installation (Firefox Developer Mode)

Since YTruth is in active development, you need to install it manually. This is easy!

Download the Code: Click the green "Code" button on this GitHub page and select "Download ZIP". Extract the folder somewhere safe on your computer.

Open Firefox Add-ons Manager: Type about:addons into your Firefox address bar and press Enter.

Enable Debugging: Click the gear icon and select "Debug Add-ons".

Load Temporary Add-on: Click "Load Temporary Add-on...".

Select the Manifest: Navigate to the extracted ytruth-extension folder and select the manifest.json file.

You're Done! The extension is now active. Navigate to YouTube to see it in action. You may need to refresh the page.

## 🔍 The Data - Our Core

The truth is, bias is hard to quantify. We don't claim to have the final answer. Instead, we rely on a transparent methodology:

Primary Source: Our seed data is sourced from Media Bias/Fact Check (MBFC) (https://mediabiasfactcheck.com/), a widely-referenced organization that uses transparent methodology to rate media sources.

Community Powered: Our data/bias_database.json file is open for anyone to view and improve. If you find a channel is misrated or missing, you can contribute.

Our Promise: We will never assign a rating without a citable source or a clear, logical inference that we document.

## 🤝 How to Contribute

This project is nothing without its community. Here's how you can help:

Add a Channel to the Database: The easiest way to contribute!

Fork this repository.

Edit the data/bias_database.json file. Find a channel's rating on MBFC or another reliable bias-checking site.

Add a new entry in the correct format. Please include the source URL.

Submit a Pull Request. Your contribution will be reviewed and merged.

Improve the Code: Are the labels not showing up on a new YouTube layout? Is the code inefficient? Submit a PR with your fix!

Spread the Word: Share YTruth with others who are interested in media literacy and navigating information spaces wisely.


## 🤝 Current Folder Outline

      contextscope-extension/
      ├── images/ (for icons)
      ├── scripts/
      │   └── content_script.js
      ├── data/
      │   └── bias_database.json   <-- This is the heart
      ├── styles/
      │   └── overlay.css
      ├── manifest.json
      └── README.md


## 🗺️ Roadmap & Future Features

v0.1: Basic functionality with a seed database of ~100 channels (Current Goal)

v0.2: Implement "Network Inference" to automatically classify unknown channels based on their recommendations.

v0.3: Design and implement a simple UI for the community to submit channel ratings from within the extension.

v0.4: Create a public API/endpoint to serve the aggregated, anonymized database statistics.

v1.0: Publish on Firefox Add-ons and Chrome Web Store.

## ⚠️ Limitations & Disclaimer

YTruth is a tool for context, not a truth machine. It is provided "as is" for educational and informational purposes.

The bias and factuality ratings are based on third-party analyses and community consensus, not on our own original research.

A rating is a general guide for the channel's overall content, not a verdict on every single video.

The presence of a label does not constitute an endorsement or condemnation of the channel's views.

## 📜 License

This project is licensed under the MIT License. This means you are free to use, modify, and distribute the code, but it comes with no warranty. See the LICENSE file for details.

## 🙋 FAQ

Q: Will this slow down YouTube?
A: Negligibly. The script only runs when you load YouTube and is designed to be very efficient.

Q: Why can't I see any labels?
A: You are probably watching videos from channels not yet in our database. This is where we need your help! Contribute by adding them.

Q: Is this project politically biased?
A: We strive for neutrality. Our goal is to accurately reflect the consensus of established media rating organizations, not to impose our own views. Our database and methodology are completely public and open for audit.


__ 

Note that this was all written by AI in a few minutes and should be taken with a grain of salt

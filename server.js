const express = require("express");
const axios = require("axios");
const app = express();

const BASE = "https://api.consumet.org/anime";
const PROVIDERS = ["zoro", "gogoanime", "animepahe"]; // multi-provider fallback

// Simple in-memory cache
const cache = new Map();

// 🔹 Helper: fetch streams from providers
async function fetchStreams(epId, mode = "sub") {
  const cacheKey = `${epId}-${mode}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  let streams = [];

  for (let provider of PROVIDERS) {
    try {
      const r = await axios.get(`${BASE}/${provider}/watch/${epId}`);
      const sources = r.data.sources;

      if (!sources || !sources.length) continue;

      const serverStreams = sources.map(s => ({
        provider,
        url: `http://localhost:3000/proxy?url=${encodeURIComponent(s.url)}`,
        qualities: s.quality ? [{ label: s.quality, url: `http://localhost:3000/proxy?url=${encodeURIComponent(s.url)}` }] : undefined
      }));

      // Filter by dub/sub if possible
      const filtered = serverStreams.filter(s => mode === "dub" ? s.url.includes("-dub") : !s.url.includes("-dub"));
      streams = streams.concat(filtered.length ? filtered : serverStreams);
    } catch (err) {
      console.warn(`Provider ${provider} failed:`, err.message);
    }
  }

  if (!streams.length) throw new Error("No streams found");
  cache.set(cacheKey, streams);
  setTimeout(() => cache.delete(cacheKey), 60000); // 1 min cache

  return streams;
}

// 🔹 Endpoint: get streams for an episode
app.get("/stream/:id", async (req, res) => {
  try {
    const mode = req.query.mode || "sub";
    const streams = await fetchStreams(req.params.id, mode);
    res.json({ streams });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Endpoint: get episode info by number
app.get("/episode/:num", async (req, res) => {
  try {
    const epNum = req.params.num;
    const mode = req.query.mode || "sub";

    // Example: fetch from one provider (Zoro) for episode mapping
    const search = await axios.get(`${BASE}/zoro`);
    const epData = search.data.episodes.find(e => e.number == epNum);
    if (!epData) return res.status(404).json({ error: "Episode not found" });

    res.json({ id: epData.id, number: epNum });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔥 Advanced proxy endpoint
app.get("/proxy", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).send("Missing URL");

    const response = await axios.get(url, {
      responseType: "stream",
      headers: {
        "Referer": "https://vidstreaming.io/",
        "Origin": "https://vidstreaming.io",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      }
    });

    res.setHeader("Content-Type", response.headers["content-type"]);
    response.data.pipe(res);
  } catch (err) {
    res.status(500).send("Proxy error");
  }
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));

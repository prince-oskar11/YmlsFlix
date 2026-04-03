const express = require("express");
const axios = require("axios");

const app = express();

// 🔹 Providers
const PROVIDERS = [
  "zoro",
  "gogoanime",
  "animepahe"
];

const BASE = "https://api.consumet.org/anime";

// 🔹 Cache
const cache = new Map();
const CACHE_TIME = 60 * 1000;

// 🔥 MULTI-PROVIDER STREAM
app.get("/stream/:id", async (req, res) => {
  const id = req.params.id;

  try {
    // ✅ cache
    if (cache.has(id)) {
      return res.json(cache.get(id));
    }

    // 🔄 try providers one by one
    for (const provider of PROVIDERS) {
      try {
        const r = await axios.get(`${BASE}/${provider}/watch/${id}`);
        const sources = r.data.sources;

        if (!sources || sources.length === 0) continue;

        const stream =
          sources.find(s => s.url.includes(".m3u8"))?.url ||
          sources[0].url;

        const data = {
          stream: `/proxy?url=${encodeURIComponent(stream)}`,
          provider
        };

        // cache it
        cache.set(id, data);
        setTimeout(() => cache.delete(id), CACHE_TIME);

        console.log(`✅ ${provider} worked`);
        return res.json(data);

      } catch (err) {
        console.log(`❌ ${provider} failed`);
      }
    }

    throw new Error("No providers worked");

  } catch (e) {
    res.status(500).json({ error: "No stream found" });
  }
});


// 🔥 ADVANCED PROXY (handles m3u8 + ts segments)
app.get("/proxy", async (req, res) => {
  try {
    const url = req.query.url;

    if (!url) return res.status(400).send("Missing URL");

    const response = await axios.get(url, {
      responseType: "arraybuffer",
      headers: {
        "Referer": "https://vidstreaming.io/",
        "Origin": "https://vidstreaming.io",
        "User-Agent": "Mozilla/5.0"
      }
    });

    const contentType = response.headers["content-type"];

    // 🔥 If m3u8 → rewrite URLs
    if (contentType.includes("application/vnd.apple.mpegurl")) {
      let body = response.data.toString();

      // rewrite segment URLs to go through proxy
      body = body.replace(
        /(https?:\/\/[^\s]+)/g,
        (match) => `/proxy?url=${encodeURIComponent(match)}`
      );

      res.setHeader("Content-Type", contentType);
      return res.send(body);
    }

    // 🔥 Video chunks (.ts)
    res.setHeader("Content-Type", contentType);
    res.send(response.data);

  } catch (err) {
    console.log("Proxy error:", err.message);
    res.status(500).send("Proxy failed");
  }
});


// 🚀 Start server
app.listen(3000, () => {
  console.log("🔥 Server running on http://localhost:3000");
});

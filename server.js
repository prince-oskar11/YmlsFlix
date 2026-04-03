const express = require("express");
const axios = require("axios");
const cors = require("cors");
const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;
const CACHE_TIME = 60000; // 1 min cache
const cache = new Map();

// Multi-provider base URLs
const PROVIDERS = [
  { name: "Zoro", base: "https://api.consumet.org/anime/zoro" },
  { name: "Gogo", base: "https://api.consumet.org/anime/gogoanime" },
  { name: "AnimePahe", base: "https://api.consumet.org/anime/animepahe" }
];

// 🔹 Stream endpoint
app.get("/stream/:id", async (req, res) => {
  const id = req.params.id;

  if (cache.has(id)) return res.json(cache.get(id));

  try {
    const results = [];

    for (let p of PROVIDERS) {
      try {
        const r = await axios.get(`${p.base}/watch/${id}`);
        const sources = r.data.sources;
        if (!sources || !sources.length) continue;

        const stream = sources.find(s => s.url.includes(".m3u8"))?.url || sources[0].url;

        results.push({
          provider: p.name,
          url: `http://localhost:${PORT}/proxy?url=${encodeURIComponent(stream)}`
        });
      } catch {}
    }

    if (!results.length) return res.status(404).json({ error: "No streams found" });

    cache.set(id, { streams: results });
    setTimeout(() => cache.delete(id), CACHE_TIME);

    res.json({ streams: results });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch streams" });
  }
});

// 🔥 Proxy endpoint
app.get("/proxy", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).send("Missing URL");

    const response = await axios.get(url, {
      responseType: "stream",
      headers: {
        "Referer": "https://vidstreaming.io/",
        "Origin": "https://vidstreaming.io"
      }
    });

    res.setHeader("Content-Type", response.headers["content-type"]);
    response.data.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).send("Proxy error");
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

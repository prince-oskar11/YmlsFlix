const express = require("express");
const axios = require("axios");
const app = express();

const BASE = "https://api.consumet.org/anime/zoro";

// 🔹 Get direct stream
app.get("/stream/:id", async (req, res) => {
  try {
    const r = await axios.get(`${BASE}/watch/${req.params.id}`);
    const sources = r.data.sources;

    const stream =
      sources.find(s => s.url.includes(".m3u8"))?.url ||
      sources[0].url;

    res.json({
      stream: `http://localhost:3000/proxy?url=${encodeURIComponent(stream)}`
    });

  } catch (e) {
    res.status(500).json({ error: "stream failed" });
  }
});

// 🔥 PROXY endpoint (KEY PART)
app.get("/proxy", async (req, res) => {
  try {
    const url = req.query.url;

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
    res.status(500).send("Proxy error");
  }
});

app.listen(3000, () => console.log("Server running"));

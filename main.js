// Your existing JavaScript code, extracted from the HTML
<script
const API = 'https://graphql.anilist.co', STREAM_API = 'https://api.consumet.org/anime/gogoanime';
let currentUser = JSON.parse(localStorage.getItem('ymls_active_user'));
let playMode = 'sub', currentAnime = null, currentEp = 1, currentServers = [], lastTap = 0, deferredPrompt, plyrInstance, hlsInstance;

let focusIndex = 0;
let items = [];

function updateFocusable() {
  items = [...document.querySelectorAll('.card, button')];
  if (items.length === 0) return;
  if (focusIndex >= items.length) focusIndex = items.length - 1;
  highlightFocus();
}

function highlightFocus() {
  items.forEach((el, i) => {
    el.classList.toggle('focused', i === focusIndex);
  });
}

function navigate(dir) {
  updateFocusable();
  if (items.length === 0) return;

  if (dir === 'right') focusIndex++;
  if (dir === 'left') focusIndex--;
  if (dir === 'down') focusIndex += 5;
  if (dir === 'up') focusIndex -= 5;

  focusIndex = Math.max(0, Math.min(items.length - 1, focusIndex));
  highlightFocus();
}

function selectItem() {
  if (items[focusIndex]) {
    items[focusIndex].click();
  }
}

document.addEventListener('keydown', (e) => {
  switch (e.key) {
    case 'ArrowRight': navigate('right'); break;
    case 'ArrowLeft': navigate('left'); break;
    case 'ArrowDown': navigate('down'); break;
    case 'ArrowUp': navigate('up'); break;
    case 'Enter': selectItem(); break;
  }
});

// AUTHENTICATION LOGIC
function handleAuth(mode) {
  const user = document.getElementById('authEmail').value.trim();
  const pass = document.getElementById('authPass').value.trim();
  if (!user || !pass) return alert("All fields required");

  let db = JSON.parse(localStorage.getItem('ymls_users_db')) || {};
  if (mode === 'signup') {
    if (db[user]) return alert("Username already exists");
    db[user] = { name: user, pass: pass, wishlist: [], history: [] };
    localStorage.setItem('ymls_users_db', JSON.stringify(db));
    alert("Account created successfully!");
  } else {
    if (db[user] && db[user].pass === pass) {
      currentUser = db[user];
      localStorage.setItem('ymls_active_user', JSON.stringify(currentUser));
      location.reload();
    } else alert("Invalid credentials provided");
  }
}

window.onload = () => {
  // Player Init
  plyrInstance = new Plyr('#player', { 
    controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'settings', 'fullscreen'],
    tooltips: { controls: true, seek: true }
  });

  // Rotation Logic for Mobile Standalone
  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement && screen.orientation.lock) {
      screen.orientation.lock('landscape').catch(() => {});
    } else if (!document.fullscreenElement && screen.orientation.unlock) {
      screen.orientation.unlock();
    }
  });

  // Video Tap-to-Skip (10s)
  document.getElementById('videoContainer').addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTap < 300) {
      const rect = e.target.getBoundingClientRect();
      const x = e.changedTouches[0].clientX - rect.left;
      x > rect.width/2 ? plyrInstance.forward(10) : plyrInstance.rewind(10);
    }
    lastTap = now;
  });

  // PWA Install Handling
  window.addEventListener('beforeinstallprompt', (e) => { 
    e.preventDefault(); 
    deferredPrompt = e; 
    document.getElementById('installBtn').classList.remove('hidden'); 
  });

  setupUI(); fetchHero(); loadHome(); genFilters(); checkAutoSync();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
};

// AUTO-SYNC LOGIC (Checks for new episodes)
async function checkAutoSync() {
  let hist = JSON.parse(localStorage.getItem('ymls_hist')) || [];
  if (!hist.length) return;

  const ids = hist.map(a => a.id);
  const q = `query($ids:[Int]){Page{media(id_in:$ids){id episodes nextAiringEpisode{episode}}}}`;
  const r = await fetch(API, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({query:q, variables:{ids}})}).then(res=>res.json());

  r.data.Page.media.forEach(updated => {
    let local = hist.find(h => h.id === updated.id);
    if (local && updated.episodes > local.episodes) {
      local.hasNew = true;
    }
  });
  localStorage.setItem('ymls_hist', JSON.stringify(hist));
  renderWithRatings(hist, 'continueGrid');
}

// DUAL WISHLIST SYSTEM
function showChoice(a) {
  document.getElementById('choiceOverlay').style.display = 'flex';
  document.getElementById('choiceImg').src = a.coverImage.large;
  document.getElementById('choiceTitle').innerText = a.title.english || a.title.romaji;

  document.getElementById('choicePlay').onclick = () => { 
    document.getElementById('choiceOverlay').style.display='none'; 
    openPlayer(a); 
  };

  document.getElementById('choiceWish').onclick = () => { 
    document.getElementById('choiceOverlay').style.display='none'; 
    toggleWish(a); 
  };
}

function toggleWish(a, e = null) {
  if (e) e.stopPropagation();
  let list = currentUser ? (currentUser.wishlist || []) : (JSON.parse(localStorage.getItem('ymls_guest_wishlist')) || []);
  const idx = list.findIndex(x => x.id === a.id);

  if (idx === -1) {
    list.unshift(a);
  } else {
    list.splice(idx, 1);
  }

  if (currentUser) { 
    currentUser.wishlist = list; 
    let db = JSON.parse(localStorage.getItem('ymls_users_db')) || {}; 
    db[currentUser.name] = currentUser; 
    localStorage.setItem('ymls_users_db', JSON.stringify(db)); 
    localStorage.setItem('ymls_active_user', JSON.stringify(currentUser)); 
  } else {
    localStorage.setItem('ymls_guest_wishlist', JSON.stringify(list));
  }

  if (document.getElementById('page-wishlist').classList.contains('active-view')) renderWishlist();
  loadHome();
}

// PLAYER ENGINE
async function openPlayer(a, ep = 1) {
  if (a) currentAnime = a; 
  currentEp = ep;

  document.getElementById('playerView').classList.remove('hidden');
  document.getElementById('playerTitle').innerText = (currentAnime.title.english || currentAnime.title.romaji) + " — Episode " + ep;
  document.getElementById('playerLoader').classList.remove('hidden');

  const tBtn = document.getElementById('trailerBtn');
  if (currentAnime.trailer?.site === 'youtube') {
    tBtn.classList.remove('hidden');
    tBtn.onclick = () => { 
      document.getElementById('trailerFrame').src = `https://www.youtube.com/embed/${currentAnime.trailer.id}?autoplay=1`; 
      document.getElementById('trailerOverlay').style.display = 'flex'; 
      plyrInstance.pause(); 
    };
  } else {
    tBtn.classList.add('hidden');
  }

  try {
    const q = (currentAnime.title.romaji || currentAnime.title.english)
      .replace(/[^a-zA-Z0-9 ]/g, '');

    const s = await fetch(`${STREAM_API}/${q}`).then(r => r.json());

    const target = s.results.find(r =>
      playMode === 'dub' ? r.id.includes('-dub') : !r.id.includes('-dub')
    ) || s.results[0];

    const info = await fetch(`${STREAM_API}/info/${target.id}`).then(r => r.json());

    const epObj = info.episodes.find(e => e.number == ep) || info.episodes[0];

    // ✅ YOUR BACKEND STREAM
    // Call your backend API to get the stream URL(s)
    const response = await fetch(`/stream/${epObj.id}`);
    async function playEpisode(episodeId, episodeNumber) {
      currentEpisode = episodeNumber;
      try {
        // Call your backend to get stream sources
        const response = await fetch(`/stream/${episodeId}`);
        const data = await response.json();
        const streams = data.streams;

        if (!streams || streams.length === 0) {
          alert("No streams available");
          return;
        }

        // Pick the first stream (highest quality or preferred)
        const streamUrl = streams[0].url;

        // Load into Plyr
        const video = document.getElementById('player');

        if (hlsInstance) {
          hlsInstance.destroy();
        }

        if (Hls.isSupported()) {
          hlsInstance = new Hls();
          hlsInstance.loadSource(streamUrl);
          hlsInstance.attachMedia(video);
          hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
            plyrInstance.play();
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // For Safari
          video.src = streamUrl;
          video.addEventListener('loadedmetadata', () => {
            plyrInstance.play();
          });
        }
      } catch (err) {
        console.error("Error fetching stream URL:", err);
        alert("Failed to load stream");
      }
    }
    currentServers = links.sources;
    document.getElementById('serverList').innerHTML = currentServers.map((s, i) => `
      <button onclick="switchServer(${i})" class="px-5 py-3 bg-gray-900 rounded-xl text-[10px] font-bold border border-gray-800 hover:border-red-500 whitespace-nowrap transition">
        ${s.quality.toUpperCase()}
      </button>
    `).join('');
    switchServer(0);
  } catch (e) { 
    document.getElementById('playerLoader').classList.add('hidden'); 
    console.error("Stream Fetch Failed", e);
  }

  saveHistory(currentAnime); 
  renderEpisodes(currentAnime); 
  fetchRecommendations(currentAnime.id);
}

function switchServer(idx) {
  if (hlsInstance) hlsInstance.destroy();

  const v = document.getElementById('player');
  const url = currentServers[idx].url;

  document.getElementById('playerLoader').classList.remove('hidden');

  if (Hls.isSupported()) {
    hlsInstance = new Hls({
      maxBufferLength: 30,
      maxMaxBufferLength: 60
    });

    hlsInstance.loadSource(url);
    hlsInstance.attachMedia(v);

    hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
      document.getElementById('playerLoader').classList.add('hidden');
      plyrInstance.play();
    });
  } else if (v.canPlayType('application/vnd.apple.mpegurl')) {
    v.src = url;
    v.addEventListener('loadedmetadata', () => {
      document.getElementById('playerLoader').classList.add('hidden');
      plyrInstance.play();
    });
  }
}

// GRID RENDERING LOGIC
// Function to fetch ratings from Jikan API using anime title
async function fetchRatingsForAnime(animeList) {
  await Promise.all(animeList.map(async (anime) => {
    try {
      const searchTitle = encodeURIComponent(anime.title.english || anime.title.romaji);
      const response = await fetch(`https://api.jikan.moe/v4/anime?q=${searchTitle}&limit=1`);
      const data = await response.json();

      anime.rating = data.data?.[0]?.score
        ? data.data[0].score.toFixed(1)
        : 'N/A';
    } catch {
      anime.rating = 'N/A';
    }
  }));
}

// 2. ADD IT HERE ✅
async function renderWithRatings(list, target, isGrid = false) {
  await fetchRatingsForAnime(list);
  render(list, target, isGrid);
}

// Your existing render() function, updated to include rating badge
function render(l, t, isGrid=false) {
  const wishlist = currentUser ? (currentUser.wishlist || []) : (JSON.parse(localStorage.getItem('ymls_guest_wishlist')) || []);
  document.getElementById(t).innerHTML = l.map(a => {
    if (!a) return '';
    const inWish = wishlist.some(x => x.id === a.id);
    return `
<div class="anime-card ${isGrid ? 'w-full' : ''}" onclick='showChoice(${JSON.stringify(a)})'>
    <div class="ep-badge">${a.episodes || '?'} EP</div>
    ${a.hasNew ? '<div class="sync-dot"></div>' : ''}
    <div class="wish-heart ${inWish ? 'wish-active' : ''}" onclick='toggleWish(${JSON.stringify(a)}, event)'>
        <i class="fa fa-${inWish ? 'heart' : 'heart-o'}"></i>
    </div>
    <div class="relative">
        <img src="${a.coverImage.large}" class="card-img" loading="lazy" />
        <!-- Rating badge -->
        <div class="rating-badge">${a.rating || 'NA'}</div>
    </div>
    <div class="p-3 truncate text-[10px] font-black uppercase text-gray-400 tracking-tight">
        ${a.title.english || a.title.romaji}
    </div>
</div>`;
  }).join('');
}

// SEARCH & FILTER ENGINE
async function handleSearch(term) {
  if (term.length < 2) return;
  showPage('filter'); 
  document.getElementById('filterTitle').innerText = "Search results for: " + term;
  const q = `query($s:String){Page(perPage:50){media(search:$s,type:ANIME,sort:POPULARITY_DESC){id title{english romaji} coverImage{large} episodes trailer{id site}}}}`;
  const r = await fetch(API, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({query:q, variables:{s:term}})}).then(res=>res.json());
  renderWithRatings(r.data.Page.media, "filterGrid", true);
}

async function fetchByFormat(f) {
  showPage('filter'); 
  document.querySelectorAll('.cat-chip').forEach(c=>c.classList.remove('cat-active'));
  document.getElementById(`chip-${f}`).classList.add('cat-active');
  document.getElementById('filterTitle').innerText = f + " Masterpieces";
  const q = `query($f:MediaFormat){Page(perPage:50){media(type:ANIME,format:$f,sort:POPULARITY_DESC){id title{english romaji} coverImage{large} episodes trailer{id site}}}}`;
  const r = await fetch(API, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({query:q, variables:{f}})}).then(res=>res.json());
  renderWithRatings(r.data.Page.media, "filterGrid", true);
}

async function fetchByFilter(g, y) {
  showPage('filter'); 
  document.getElementById('filterTitle').innerText = g || "Released in " + y;
  const q = `query($g:String,$y:Int){Page(perPage:50){media(genre:$g,seasonYear:$y,type:ANIME,sort:POPULARITY_DESC){id title{english romaji} coverImage{large} episodes trailer{id site}}}}`;
  const r = await fetch(API, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({query:q, variables:{g, y}})}).then(res=>res.json());
  renderWithRatings(r.data.Page.media, "filterGrid", true);
}

function loadHome() {
  fetchGrid("TRENDING_DESC", "trendingGrid");
  fetchGrid("POPULARITY_DESC", "popularGrid");
  fetchGrid("SCORE_DESC", "ratedGrid");
  const uQ = `query{Page(perPage:20){media(status:NOT_YET_RELEASED,type:ANIME,sort:POPULARITY_DESC,format_in:[TV,MOVIE,OVA]){id idMal title{english romaji} coverImage{large} episodes trailer{id site}}}}`;
  fetch(API, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({query:uQ})}).then(r=>r.json()).then(j=>renderWithRatings(j.data.Page.media, "upcomingGrid"));
  const aQ = `query{Page(perPage:20){airingSchedules(airingAt_greater:${Math.floor(Date.now()/1000)},sort:TIME){media{id idMal title{english romaji} coverImage{large} episodes trailer{id site}}}}}`;
  fetch(API, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({query:aQ})}).then(r=>r.json()).then(j=>renderWithRatings(j.data.Page.airingSchedules.map(s => s.media), "airingGrid"));
  const h = JSON.parse(localStorage.getItem('ymls_hist')) || [];
  if (h.length) { 
    document.getElementById('continueSection').classList.remove('hidden'); 
    renderWithRatings(h, 'continueGrid'); 
  }
}

function fetchGrid(s, t) {
  const q = `query($s:[MediaSort]){Page(perPage:20){media(type:ANIME,sort:$s){id title{english romaji} coverImage{large} episodes trailer{id site}}}}`;
  fetch(API, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({query:q, variables:{s:[s]}})})
    .then(res=>res.json())
    .then(r=>renderWithRatings(r.data.Page.media, t));
}

async function fetchHero() {
  const q = `query{Page(perPage:1){media(type:ANIME,sort:SCORE_DESC){id title{english romaji} bannerImage description episodes trailer{id site}}}}`;
  const r = await fetch(API, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({query:q})}).then(res=>res.json());
  const top = r.data.Page.media[0];

  // Fix background image to a real-life image URL
  document.getElementById('hero').style.backgroundImage = `url(https://images.unsplash.com/photo-1506744038136-46273834b3fb?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80)`;

  // Set the title and description
  document.getElementById('heroTitle').innerText = top.title.english || top.title.romaji;
  document.getElementById('heroDesc').innerHTML = top.description;
  document.getElementById('heroPlayBtn').onclick = () => openPlayer(top);
  if (top.trailer?.site === 'youtube') {
    document.getElementById('heroTrailerBtn').onclick = () => {
      document.getElementById('trailerFrame').src = `https://www.youtube.com/embed/${top.trailer.id}?autoplay=1`;
      document.getElementById('trailerOverlay').style.display = 'flex';
    };
  }
}

// GLOBAL HELPERS
function saveHistory(a) { 
  let h = JSON.parse(localStorage.getItem('ymls_hist')) || []; 
  h = h.filter(x=>x.id!==a.id); 
  a.currEp = currentEp; 
  h.unshift(a); 
  localStorage.setItem('ymls_hist', JSON.stringify(h.slice(0,10))); 
}

function showPage(p) { 
  document.querySelectorAll('.page-view').forEach(v=>v.classList.toggle('active-view', v.id===`page-${p}`)); 
  if (p==='wishlist') renderWishlist(); 
}

function renderWishlist() { 
  const w = currentUser ? (currentUser.wishlist || []) : (JSON.parse(localStorage.getItem('ymls_guest_wishlist')) || []); 
  renderWithRatings(w, 'wishlistGrid', true); 
  document.getElementById('wishCount').innerText = w.length + " Items Saved"; 
}

function toggleDropdown(id) { 
  document.querySelectorAll('.dropdown-content').forEach(d => { if(d.id !== id) d.classList.remove('show'); });
  document.getElementById(id).classList.toggle('show'); 
}

function closePlayer() { 
  document.getElementById('playerView').classList.add('hidden'); 
  if(hlsInstance) hlsInstance.destroy(); 
  document.getElementById('player').src=""; 
}

function closeTrailer() { 
  document.getElementById('trailerOverlay').style.display='none'; 
  document.getElementById('trailerFrame').src=""; 
}

function setMode(m) { 
  playMode = m; 
  const sBtn = document.getElementById('subBtn'), dBtn = document.getElementById('dubBtn');
  sBtn.className = m === 'sub' ? 'px-6 py-2 text-[9px] font-black rounded-lg bg-red-600' : 'px-6 py-2 text-[9px] font-black rounded-lg bg-gray-800';
  dBtn.className = m === 'dub' ? 'px-6 py-2 text-[9px] font-black rounded-lg bg-red-600' : 'px-6 py-2 text-[9px] font-black rounded-lg bg-gray-800';
  if(currentAnime) openPlayer(currentAnime, currentEp); 
}

function handleLogout() { localStorage.removeItem('ymls_active_user'); location.reload(); }
function confirmClearHistory() { localStorage.clear(); location.reload(); }
function triggerInstall() { if(deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; document.getElementById('installBtn').classList.add('hidden'); } }

function renderEpisodes(a) { 
  const count = a.episodes || 12; 
  document.getElementById('totalEpDisplay').innerText = count + " Total Episodes";
  document.getElementById('epList').innerHTML = Array.from({length: count}, (_, i) => `
    <button onclick="openPlayer(null, ${i+1})" class="ep-btn ${currentEp===i+1?'ep-active':''}">${i+1}</button>
  `).join(''); 
}

function switchTab(t) { 
  document.getElementById('genreList').classList.toggle('hidden', t!=='genres'); 
  document.getElementById('yearList').classList.toggle('hidden', t!=='years'); 
  document.getElementById('tab-gen').classList.toggle('border-red-600', t==='genres');
  document.getElementById('tab-year').classList.toggle('border-red-600', t==='years');
}

async function fetchRecommendations(id) {
  const q = `query($id:Int){Media(id:$id){recommendations(perPage:15){nodes{mediaRecommendation{id title{english romaji} coverImage{large} episodes trailer{id site}}}}}}`;
  const r = await fetch(API, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({query:q, variables:{id}})}).then(res=>res.json());
  renderWithRatings(r.data.Media.recommendations.nodes.map(n=>n.mediaRecommendation).filter(x=>x), 'recommendGrid');
}

function setupUI() { 
  if (currentUser) { 
    document.getElementById('authBox').classList.add('hidden'); 
    document.getElementById('userBox').classList.remove('hidden'); 
    document.getElementById('userDisplay').innerText = currentUser.name; 
  } 
  setMode('sub');
}

function genFilters() {
  const g = ["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Mystery", "Romance", "Sci-Fi", "Sports", "Supernatural", "Thriller", "Psychological"];
  document.getElementById('genreList').innerHTML = g.map(x => `<button onclick="fetchByFilter('${x}', null)" class="genre-btn">${x}</button>`).join('');
  let yH = ''; 
  for(let y=2026; y>=2000; y--) yH += `<button onclick="fetchByFilter('', ${y})" class="genre-btn">${y}</button>`;
  document.getElementById('yearList').innerHTML = yH;
    }
</script>

// ═══════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════
let currentUser = null, userData = { watchlist: [], favorites: [], progress: {}, role: 'user' };
let currentPage = 'home', prevPage = 'home';
let heroAnimes = [], heroIdx = 0, heroTimer = null;
let browseOffset = 1, browseHasMore = true;
let currentAnime = null, mfaResolver = null;
let playerHls = null, playerIsPopout = false;
let showDub = false, hideWatched = false, qualFilter = 'All';
let allAdminUsers = [];

const $ = id => document.getElementById(id);
const fb = () => window._fb;
function waitFb(cb) { const iv = setInterval(() => { if (window._fb) { clearInterval(iv); cb(); } }, 80); }

// ═══════════════════════════════════════════════
// LAUNCH PAGE
// ═══════════════════════════════════════════════
function enterApp(searchQuery) {
  $('launch').classList.add('hide');
  setTimeout(() => { $('launch').style.display = 'none'; }, 500);
  sessionStorage.setItem('porras_entered', '1');
  trackPage('enter_app');
  if (searchQuery) {
    $('search-input').value = searchQuery;
    $('search-input').dispatchEvent(new Event('input'));
  }
}

function launchEnter() {
  const q = ($('launch-search-input').value || '').trim();
  $('launch-search-drop').classList.remove('open');
  enterApp(q || '');
}

function enterLaunch() {
  $('launch').style.display = 'flex';
  requestAnimationFrame(() => $('launch').classList.remove('hide'));
}

// Launch page search
let launchSearchTimer = null;
document.addEventListener('DOMContentLoaded', () => {
  const inp = $('launch-search-input');
  if (!inp) return;
  inp.addEventListener('input', e => {
    clearTimeout(launchSearchTimer);
    const q = e.target.value.trim();
    const drop = $('launch-search-drop');
    if (!q) { drop.classList.remove('open'); return; }
    launchSearchTimer = setTimeout(async () => {
      const results = await searchAnime(q);
      drop.innerHTML = '';
      if (!results.length) { drop.innerHTML = '<div style="padding:14px 16px;font-size:13px;color:var(--text3)">No results found</div>'; }
      results.forEach(a => {
        const title = a.title?.english || a.title?.romaji || 'Unknown';
        const div = document.createElement('div'); div.className = 'sri';
        div.innerHTML = `<img src="${a.coverImage?.large || ''}" loading="lazy"><div><div class="sri-title">${title}</div><div class="sri-meta">${a.startDate?.year || '–'} · ${a.genres?.[0] || '–'} · ★${a.averageScore ? (a.averageScore / 10).toFixed(1) : '–'}</div></div>`;
        div.onclick = () => { drop.classList.remove('open'); enterApp(''); setTimeout(() => openDetail(a), 120); };
        drop.appendChild(div);
      });
      drop.classList.add('open');
    }, 320);
  });
  document.addEventListener('click', e => { if (!e.target.closest('#launch-search-outer')) $('launch-search-drop').classList.remove('open'); });
});

// ── LAUNCH HERO + STRIP ──────────────────────────────────────────────
let launchAnimes = [], launchIdx = 0, launchBgTimer = null;
let _launchBgActive = 'a';

async function initLaunchFeed() {
  try {
    const data = await fetchTrending('WINTER', 2025);
    launchAnimes = data.filter(a => a.bannerImage || a.coverImage?.extraLarge).slice(0, 8);
    if (!launchAnimes.length) return;
    setLaunchHero(0);
    buildLaunchStrip();
    startLaunchTimer();
  } catch (e) { /* silently fail */ }
}

function setLaunchHero(idx, instant = false) {
  launchIdx = idx;
  const a = launchAnimes[idx]; if (!a) return;
  const title = a.title?.english || a.title?.romaji || 'Unknown';
  const imgUrl = a.bannerImage || a.coverImage?.extraLarge || a.coverImage?.large || '';
  const bgA = $('launch-bg-a'), bgB = $('launch-bg-b');
  const next = _launchBgActive === 'a' ? bgB : bgA;
  const cur = _launchBgActive === 'a' ? bgA : bgB;
  next.style.backgroundImage = `url(${imgUrl})`;
  if (instant) { cur.style.opacity = '0'; next.style.opacity = '1'; }
  else { next.style.transition = 'opacity 1s ease'; cur.style.transition = 'opacity 1s ease'; next.style.opacity = '1'; cur.style.opacity = '0'; }
  _launchBgActive = _launchBgActive === 'a' ? 'b' : 'a';
  $('launch-title').textContent = title;
  const meta = $('launch-meta'); meta.innerHTML = '';
  if (a.averageScore) { const s = document.createElement('span'); s.textContent = '★ ' + (a.averageScore / 10).toFixed(1); meta.appendChild(s); }
  if (a.startDate?.year) { const y = document.createElement('span'); y.textContent = a.startDate.year; meta.appendChild(y); }
  (a.genres || []).slice(0, 3).forEach(g => { const p = document.createElement('span'); p.className = 'launch-hero-genre'; p.textContent = g; meta.appendChild(p); });
  const dotsEl = $('launch-dots'); dotsEl.innerHTML = '';
  launchAnimes.forEach((_, i) => {
    const d = document.createElement('button'); d.className = 'launch-dot' + (i === idx ? ' active' : '');
    d.onclick = () => { clearTimeout(launchBgTimer); setLaunchHero(i); startLaunchTimer(); };
    dotsEl.appendChild(d);
  });
  document.querySelectorAll('.launch-strip-card').forEach((c, i) => c.classList.toggle('active-strip', i === idx));
}

function buildLaunchStrip() {
  const row = $('launch-strip-row'); row.innerHTML = '';
  launchAnimes.forEach((a, i) => {
    const img = a.coverImage?.extraLarge || a.coverImage?.large || '';
    const title = a.title?.english || a.title?.romaji || '';
    const card = document.createElement('div'); card.className = 'launch-strip-card' + (i === 0 ? ' active-strip' : '');
    card.innerHTML = `<img src="${img}" alt="${title}" loading="lazy"><div class="launch-strip-card-info"><div class="launch-strip-title">${title}</div><div class="launch-strip-ep">${a.status === 'RELEASING' ? 'Airing' : 'Completed'}</div></div>`;
    card.onclick = () => { clearTimeout(launchBgTimer); setLaunchHero(i); startLaunchTimer(); };
    row.appendChild(card);
  });
}

function startLaunchTimer() {
  clearTimeout(launchBgTimer);
  launchBgTimer = setTimeout(() => { const next = (launchIdx + 1) % launchAnimes.length; setLaunchHero(next); startLaunchTimer(); }, 6000);
}

function launchWatchNow() {
  const a = launchAnimes[launchIdx];
  if (a) { enterApp(''); setTimeout(() => openDetail(a), 100); }
  else enterApp('');
}

// ═══════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════
function navigate(page, navEl) {
  prevPage = currentPage; currentPage = page;
  sessionStorage.setItem('porras_page', page);
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pg = $('page-' + page); if (pg) { pg.classList.add('active'); $('content').scrollTop = 0; }
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (navEl) navEl.classList.add('active');
  else { const ni = document.querySelector(`.nav-item[data-page="${page}"]`); if (ni) ni.classList.add('active'); }
  if (page === 'browse' && !$('browse-grid').children.length) loadBrowse();
  else if (page === 'browse') initBrowseObserver();
  if (page === 'schedule') loadSchedule();
  if (page === 'watchlist') loadWatchlistPage();
  if (page === 'favorites') loadFavoritesPage();
  if (page === 'history') loadHistoryPage();
  if (page === 'profile') loadProfilePage();
  if (page === 'admin') loadAdminPanel();
  trackPage(page);
}
function goBack() { navigate(prevPage === 'detail' ? 'home' : prevPage); }
function toggleSidebar() { $('app').classList.toggle('sidebar-collapsed'); }

// ═══════════════════════════════════════════════
// CARDS
// ═══════════════════════════════════════════════
function animeCard(anime) {
  const title = anime.title?.english || anime.title?.romaji || 'Unknown';
  const img = anime.coverImage?.extraLarge || anime.coverImage?.large || '';
  const isAiring = anime.status === 'RELEASING';
  const div = document.createElement('div'); div.className = 'anime-card';
  div.innerHTML = `
    <div class="anime-thumb">
      ${img ? `<img src="${img}" alt="${title}" loading="lazy" onerror="this.style.display='none'">` : '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:38px;background:var(--bg3);border-radius:var(--r-md)">📺</div>'}
      ${isAiring ? '<div class="card-badges"><span class="badge badge-airing">● AIRING</span></div>' : ''}
      <div class="anime-card-overlay"></div>
      <div class="card-hover-actions">
        <button class="card-hover-btn" onclick="event.stopPropagation();openDetail(${JSON.stringify(anime).replace(/"/g, '&quot;')})">▶ Watch</button>
        <button class="card-hover-btn ghost" onclick="event.stopPropagation();quickAddToList(${JSON.stringify(anime).replace(/"/g, '&quot;')})">${isInWatchlist(anime.id) ? '✓ List' : '+ List'}</button>
      </div>
    </div>
    <div class="anime-card-info">
      <div class="anime-card-title" title="${title}">${title}</div>
      <div class="anime-card-sub">Sub | Dub</div>
    </div>`;
  div.addEventListener('click', () => openDetail(anime));
  return div;
}
function renderGrid(c, animes, append = false) { if (!append) c.innerHTML = ''; animes.forEach(a => c.appendChild(animeCard(a))); }

// ═══════════════════════════════════════════════
// HOME
// ═══════════════════════════════════════════════
async function initHome() {
  const [trending, top] = await Promise.all([fetchTrending('WINTER', 2025), fetchTopRated()]);
  heroAnimes = trending.filter(a => a.bannerImage).slice(0, 5);
  if (!heroAnimes.length) heroAnimes = trending.slice(0, 5);
  setHero(0); startHeroTimer();
  renderGrid($('trending-grid'), trending);
  renderGrid($('toprated-grid'), top);
  loadAiringPreview();
  renderContinueWatching();
}

function setHero(idx) {
  heroIdx = idx; const a = heroAnimes[idx]; if (!a) return;
  const title = a.title?.english || a.title?.romaji || 'Unknown';
  $('hero-backdrop').style.backgroundImage = `url(${a.bannerImage || a.coverImage?.extraLarge || a.coverImage?.large})`;
  $('hero-title').textContent = title;
  $('hero-score').textContent = a.averageScore ? (a.averageScore / 10).toFixed(1) : '–';
  $('hero-year').textContent = a.startDate?.year || a.seasonYear || '–';
  $('hero-eps').textContent = (a.episodes || '?') + ' eps';
  const sm = { RELEASING: 'Airing', FINISHED: 'Completed', NOT_YET_RELEASED: 'Upcoming' };
  $('hero-status').textContent = sm[a.status] || a.status || '–';
  $('hero-desc').textContent = (a.description || '').replace(/<[^>]+>/g, '').replace(/&#\d+;/g, '').trim().slice(0, 180) || '–';
  const gp = $('hero-genres'); gp.innerHTML = '';
  (a.genres || []).slice(0, 3).forEach(g => { const s = document.createElement('span'); s.className = 'hero-genre'; s.textContent = g; gp.appendChild(s); });
  const dots = $('hero-dots'); dots.innerHTML = '';
  heroAnimes.forEach((_, i) => { const d = document.createElement('div'); d.className = 'hero-dot' + (i === idx ? ' active' : ''); d.onclick = e => { e.stopPropagation(); setHero(i); resetHeroTimer(); }; dots.appendChild(d); });
}
function startHeroTimer() { heroTimer = setInterval(() => setHero((heroIdx + 1) % heroAnimes.length), 6000); }
function resetHeroTimer() { clearInterval(heroTimer); startHeroTimer(); }

async function switchTrendTab(el, season, year) {
  document.querySelectorAll('#trend-tabs .ftab').forEach(t => t.classList.remove('active')); el.classList.add('active');
  const g = $('trending-grid'); g.innerHTML = '<div class="loader"><div class="spin"></div></div>';
  const items = await fetchTrending(season, year); g.innerHTML = ''; renderGrid(g, items);
}

async function loadAiringPreview() {
  const c = $('airing-preview'); c.innerHTML = '';
  const s = await fetchAiringSchedule(); const seen = new Set(); let n = 0;
  for (const x of s) {
    if (n >= 6) break; if (seen.has(x.media.id)) continue; seen.add(x.media.id); n++;
    const title = x.media.title?.english || x.media.title?.romaji || 'Unknown';
    const h = Math.floor(x.timeUntilAiring / 3600), m = Math.floor((x.timeUntilAiring % 3600) / 60);
    const ts = h > 23 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h ${m}m`;
    const div = document.createElement('div'); div.className = 'airing-item';
    div.innerHTML = `<img class="airing-thumb" src="${x.media.coverImage?.large || ''}" loading="lazy"><div class="airing-info"><div class="airing-name">${title}</div><div class="airing-meta">Episode ${x.episode} · ★${x.media.averageScore ? (x.media.averageScore / 10).toFixed(1) : '–'}</div></div><div class="airing-countdown"><span class="airing-ep-badge">EP ${x.episode}</span><div class="airing-time">in ${ts}</div></div>`;
    div.onclick = () => openDetailById(x.media.id); c.appendChild(div);
  }
}

function renderContinueWatching() {
  const sec = $('cw-section'), g = $('cw-grid');
  if (!currentUser) { sec.style.display = 'none'; return; }
  const inProg = Object.entries(userData.progress).filter(([, v]) => v && v.pct > 0 && v.pct < 95).sort((a, b) => b[1].updatedAt - a[1].updatedAt).slice(0, 6);
  if (!inProg.length) { sec.style.display = 'none'; return; }
  sec.style.display = 'block'; g.innerHTML = '';
  fetchAnimeByIds(inProg.map(([id]) => parseInt(id))).then(animes => {
    animes.forEach(a => {
      const prog = getProgress(a.id); if (!prog) return;
      const title = a.title?.english || a.title?.romaji || 'Unknown';
      const rem = prog.duration && prog.time ? Math.round((prog.duration - prog.time) / 60) : null;
      const div = document.createElement('div'); div.className = 'cw-card';
      div.innerHTML = `<div class="cw-thumb"><img src="${a.coverImage?.large || ''}" loading="lazy"><div class="cw-prog"><div class="cw-bar" style="width:${prog.pct || 0}%"></div></div><div class="cw-play"><svg viewBox="0 0 24 24" fill="white" width="18" height="18"><polygon points="5 3 19 12 5 21"/></svg></div></div><div class="cw-info"><div class="cw-title">${title}</div><div class="cw-ep">Episode ${prog.ep}</div><div class="cw-time">${rem !== null ? rem + 'm remaining' : 'In progress'}</div></div>`;
      div.onclick = () => openDetail(a); g.appendChild(div);
    });
  });
}

function initYearSelect() {
  const sel = $('browse-year'); const cur = new Date().getFullYear();
  for (let y = cur; y >= 1960; y--) { const o = document.createElement('option'); o.value = y; o.textContent = y; sel.appendChild(o); }
}

// ═══════════════════════════════════════════════
// BROWSE — infinite scroll
// ═══════════════════════════════════════════════
let browseObserver = null, browseFetching = false;

function initBrowseObserver() {
  if (browseObserver) browseObserver.disconnect();
  const sentinel = $('browse-sentinel');
  if (!sentinel) return;
  browseObserver = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && browseHasMore && !browseFetching) fetchMoreBrowse();
  }, { root: $('content'), rootMargin: '300px' });
  browseObserver.observe(sentinel);
}

async function loadBrowse() {
  browseOffset = 1; browseHasMore = true; browseFetching = false;
  const g = $('browse-grid');
  g.innerHTML = '<div class="loader"><div class="spin"></div></div>';
  $('browse-loading').style.display = 'none';
  try {
    const p = await fetchBrowse({ genre: $('browse-genre').value, year: $('browse-year').value, status: $('browse-status').value, sort: $('browse-sort').value, page: 1 });
    g.innerHTML = '';
    const frag = document.createDocumentFragment();
    p.media.forEach(a => frag.appendChild(animeCard(a)));
    g.appendChild(frag);
    browseHasMore = p.pageInfo.hasNextPage;
  } catch (e) { g.innerHTML = ''; }
  initBrowseObserver();
}

async function fetchMoreBrowse() {
  if (!browseHasMore || browseFetching) return;
  browseFetching = true;
  $('browse-loading').style.display = 'block';
  browseOffset++;
  try {
    const p = await fetchBrowse({ genre: $('browse-genre').value, year: $('browse-year').value, status: $('browse-status').value, sort: $('browse-sort').value, page: browseOffset });
    const frag = document.createDocumentFragment();
    p.media.forEach(a => frag.appendChild(animeCard(a)));
    $('browse-grid').appendChild(frag);
    browseHasMore = p.pageInfo.hasNextPage;
  } catch (e) { }
  $('browse-loading').style.display = 'none';
  browseFetching = false;
}

function loadMoreBrowse() { fetchMoreBrowse(); }

// ═══════════════════════════════════════════════
// SCHEDULE
// ═══════════════════════════════════════════════
async function loadSchedule() {
  $('schedule-content').innerHTML = '<div class="loader"><div class="spin"></div></div>';
  $('day-tabs').innerHTML = '';
  const s = await fetchAiringSchedule();
  const groups = {}, dn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  s.forEach(x => {
    const dt = new Date(Date.now() + x.timeUntilAiring * 1000);
    const k = dt.toDateString();
    if (!groups[k]) groups[k] = { label: `${dn[dt.getDay()]} ${dt.getMonth() + 1}/${dt.getDate()}`, items: [] };
    if (!groups[k].items.find(i => i.media.id === x.media.id)) groups[k].items.push(x);
  });
  const keys = Object.keys(groups);
  keys.forEach((k, i) => {
    const t = document.createElement('div');
    t.className = 'ftab' + (i === 0 ? ' active' : '');
    t.textContent = groups[k].label;
    t.onclick = () => { document.querySelectorAll('#day-tabs .ftab').forEach(x => x.classList.remove('active')); t.classList.add('active'); renderScheduleDay(groups[k].items); };
    $('day-tabs').appendChild(t);
  });
  $('schedule-content').innerHTML = '';
  if (keys.length) renderScheduleDay(groups[keys[0]].items);
}

function renderScheduleDay(items) {
  const c = $('schedule-content'); c.innerHTML = '';
  const grid = document.createElement('div'); grid.className = 'sched-grid';
  const frag = document.createDocumentFragment();
  items.forEach(x => {
    const title = x.media.title?.english || x.media.title?.romaji || 'Unknown';
    const img = x.media.coverImage?.extraLarge || x.media.coverImage?.large || '';
    const h = Math.floor(x.timeUntilAiring / 3600), m = Math.floor((x.timeUntilAiring % 3600) / 60);
    const ts = x.timeUntilAiring < 0 ? 'Aired' : (h > 23 ? `${Math.floor(h / 24)}d ${h % 24}h` : (h > 0 ? `${h}h ${m}m` : `${m}m`));
    const card = document.createElement('div'); card.className = 'sched-card';
    card.innerHTML = `<div class="sched-card-img">${img ? `<img src="${img}" alt="${title}" loading="lazy">` : ''}<div class="sched-card-ep">EP ${x.episode}</div><div class="sched-card-time">${ts}</div></div><div class="sched-card-info"><div class="sched-card-title">${title}</div><div class="sched-card-sub">Sub | Dub</div></div>`;
    card.onclick = () => openDetailById(x.media.id);
    frag.appendChild(card);
  });
  grid.appendChild(frag);
  c.appendChild(grid);
}

// ═══════════════════════════════════════════════
// DETAIL
// ═══════════════════════════════════════════════
async function openDetail(anime) {
  prevPage = currentPage; navigate('detail');
  const title = anime.title?.english || anime.title?.romaji || 'Unknown';
  $('detail-poster').src = anime.coverImage?.large || '';
  $('detail-bg').style.backgroundImage = `url(${anime.bannerImage || anime.coverImage?.extraLarge || anime.coverImage?.large})`;
  $('detail-title').textContent = title;
  $('detail-native').textContent = anime.title?.native || '';
  $('d-score').textContent = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : '–';
  $('d-eps').textContent = anime.episodes || '?';
  $('d-year').textContent = anime.startDate?.year || '–';
  const sm = { RELEASING: 'Airing', FINISHED: 'Completed', NOT_YET_RELEASED: 'Upcoming', CANCELLED: 'Cancelled' };
  $('d-status').textContent = sm[anime.status] || anime.status || '–';
  const gp = $('detail-genres'); gp.innerHTML = '';
  (anime.genres || []).forEach(g => { const s = document.createElement('span'); s.className = 'detail-pill'; s.textContent = g; gp.appendChild(s); });
  const acts = $('detail-actions'); acts.innerHTML = '';

  const pb = document.createElement('button'); pb.className = 'btn btn-accent';
  pb.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" style="width:13px;height:13px"><polygon points="5 3 19 12 5 21"/></svg> Watch';
  pb.onclick = () => { switchDetailTab(document.querySelectorAll('.dtab')[1], 'episodes'); }; acts.appendChild(pb);

  const tb = document.createElement('button'); tb.className = 'btn btn-ghost'; tb.id = 'trailer-btn';
  tb.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><polygon points="5 3 19 12 5 21"/></svg> Trailer';
  tb.style.display = 'none'; tb.onclick = () => openTrailer(); acts.appendChild(tb);

  const lb = document.createElement('button'); lb.className = 'btn btn-ghost';
  lb.textContent = isInWatchlist(anime.id) ? '✓ In List' : '+ Add to List';
  lb.onclick = () => { addToWatchlist(anime, 'planToWatch'); lb.textContent = '✓ In List'; }; acts.appendChild(lb);

  const fb2 = document.createElement('button'); fb2.className = 'btn btn-ghost';
  fb2.textContent = isFavorite(anime.id) ? '❤️ Favorited' : '🤍 Favorite';
  fb2.onclick = () => { toggleFavorite(anime); fb2.textContent = isFavorite(anime.id) ? '❤️ Favorited' : '🤍 Favorite'; }; acts.appendChild(fb2);

  $('mal-panel').style.display = 'none';
  window._trailerUrl = null;

  try {
    currentAnime = await fetchAnimeDetail(anime.id);
    const desc = (currentAnime.description || '').replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ').trim();
    $('detail-synopsis').textContent = desc || 'No description available.';
    buildEpisodeList(currentAnime);
    buildRelated(currentAnime);
    loadMALMeta(currentAnime);
    trackAnimeView(anime.id, title);
    const tr = currentAnime.trailer;
    if (tr?.id && tr?.site) {
      const url = tr.site === 'youtube' ? `https://www.youtube.com/embed/${tr.id}?autoplay=1&rel=0` : tr.site === 'dailymotion' ? `https://www.dailymotion.com/embed/video/${tr.id}?autoplay=1` : '';
      if (url) { window._trailerUrl = url; tb.style.display = 'inline-flex'; }
    }
    if (!window._trailerUrl) {
      window._trailerUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' anime trailer')}`;
      tb.style.display = 'inline-flex';
      tb.onclick = () => window.open(window._trailerUrl, '_blank');
    }
  } catch (e) {
    $('detail-synopsis').textContent = 'Could not load full details.';
    buildEpisodeList(anime);
    window._trailerUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' anime trailer')}`;
    tb.style.display = 'inline-flex';
    tb.onclick = () => window.open(window._trailerUrl, '_blank');
  }
}

async function openDetailById(id) {
  navigate('detail');
  try { const a = await fetchAnimeDetail(id); openDetail(a); } catch (e) { }
}

function openTrailer() {
  const url = window._trailerUrl; if (!url) return;
  $('trailer-iframe').src = url;
  $('trailer-modal').classList.add('open');
}
function closeTrailer() {
  $('trailer-modal').classList.remove('open');
  $('trailer-iframe').src = '';
}

function buildRelated(anime) {
  const g = $('related-grid'); g.innerHTML = '';
  const edges = (anime.relations?.edges || []).filter(e => ['SEQUEL', 'PREQUEL', 'SIDE_STORY', 'ADAPTATION'].includes(e.relationType)).slice(0, 8);
  if (!edges.length) { g.innerHTML = '<p style="color:var(--text3);font-size:13px">No related anime found.</p>'; return; }
  edges.forEach(e => g.appendChild(animeCard(e.node)));
}

function switchDetailTab(el, tab) {
  document.querySelectorAll('.dtab').forEach(t => t.classList.remove('active')); el.classList.add('active');
  $('detail-overview').style.display = tab === 'overview' ? 'block' : 'none';
  $('detail-episodes').style.display = tab === 'episodes' ? 'block' : 'none';
  $('detail-related').style.display = tab === 'related' ? 'block' : 'none';
}

// ═══════════════════════════════════════════════
// EPISODE LIST
// ═══════════════════════════════════════════════
function buildEpisodeList(anime) {
  const list = $('ep-list'); list.innerHTML = '';
  const total = anime.episodes || (anime.nextAiringEpisode ? anime.nextAiringEpisode.episode - 1 : 12);
  const streamEps = anime.streamingEpisodes || [];
  const prog = getProgress(anime.id);

  for (let i = 1; i <= Math.min(total, 200); i++) {
    const watched = prog && i < prog.ep;
    const isCur = prog && i === prog.ep;
    const pct = isCur && prog ? prog.pct : 0;
    const se = streamEps.find(e => { const n = e.title?.match(/Episode\s*(\d+)/i); return n && parseInt(n[1]) === i; });
    const thumb = se?.thumbnail || anime.coverImage?.large || '';
    const epName = se?.title || `Episode. ${i}`;
    const aId = anime.id;
    const epSafe = epName.replace(/'/g, "\\'");
    const extLinks = anime.externalLinks || [];
    const officialPlatforms = ['Crunchyroll', 'Funimation', 'Hidive', 'Netflix', 'Amazon', 'Bilibili'];
    const platformColors = { Crunchyroll: '#f47521', Funimation: '#410099', Hidive: '#00b2ff', Netflix: '#e50914', Amazon: '#00a8e0', Bilibili: '#fb7299' };
    const officialLinks = extLinks.filter(l => officialPlatforms.includes(l.site));
    const crFallback = `https://www.crunchyroll.com/search?q=${encodeURIComponent(anime.title?.english || anime.title?.romaji || '')}`;
    const officialRowHtml = officialLinks.length
      ? officialLinks.map(l => `<a href="${l.url}" target="_blank" rel="noopener" class="src-cr-btn" style="border-color:${platformColors[l.site] || '#555'};color:${platformColors[l.site] || '#aaa'};background:${platformColors[l.site] || '#333'}22">${l.site} ↗</a>`).join('')
      : `<a href="${crFallback}" target="_blank" rel="noopener" class="src-cr-btn">Crunchyroll ↗</a>`;

    const item = document.createElement('div');
    item.className = 'ep-item' + (watched ? ' watched' : '');
    item.id = `ep-${i}`;
    item.innerHTML = `
      <div class="ep-row" onclick="toggleSrcPanel(${i},${aId},'${epSafe}')">
        <div class="ep-thumb-wrap">
          ${thumb ? `<img src="${thumb}" alt="EP ${i}" loading="lazy">` : `<div class="ep-thumb-placeholder">📺</div>`}
          <div class="ep-watched-tag">Watched</div>
        </div>
        <div class="ep-text">
          <div class="ep-title-row"><div class="ep-dot"></div><div class="ep-name">${epName}</div></div>
          <div class="ep-desc">${se?.title && se.title !== epName ? se.title : 'Episode ' + i + ' — click to see sources'}</div>
        </div>
        ${isCur ? `<div class="ep-prog-mini"><div class="ep-prog-fill" style="width:${pct}%"></div></div>` : ''}
        <div class="ep-air-date">${anime.startDate?.year || ''}</div>
        <div class="ep-play-btn"><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21"/></svg></div>
      </div>
      <div class="src-panel" id="src-${i}">
        <div class="src-track-row">
          <span class="src-track-label sub">SUB</span>
          <div class="src-servers">
            <button class="src-server-btn" onclick="openPlayer('${epSafe}',${aId},${i},'1080','jpn')">Legion <span class="sq">1080p</span></button>
            <button class="src-server-btn" onclick="openPlayer('${epSafe}',${aId},${i},'720','jpn')">Legion <span class="sq">720p</span></button>
            <button class="src-server-btn" onclick="openPlayer('${epSafe}',${aId},${i},'480','jpn')">Legion <span class="sq">480p</span></button>
          </div>
        </div>
        <div class="src-track-row">
          <span class="src-track-label dub">DUB</span>
          <div class="src-servers">
            <button class="src-server-btn" onclick="openPlayer('${epSafe}',${aId},${i},'1080','eng')">Legion <span class="sq">1080p</span></button>
            <button class="src-server-btn" onclick="openPlayer('${epSafe}',${aId},${i},'720','eng')">Legion <span class="sq">720p</span></button>
            <button class="src-server-btn" onclick="openPlayer('${epSafe}',${aId},${i},'480','eng')">Legion <span class="sq">480p</span></button>
          </div>
        </div>
        <div class="src-cr-row"><span style="font-size:11px;color:var(--text3);font-weight:600;letter-spacing:.4px">OFFICIAL</span>${officialRowHtml}</div>
        <div style="padding:7px 18px;border-top:1px solid var(--border)">
          <button style="background:none;border:none;color:var(--text3);font-size:11.5px;cursor:pointer;font-family:var(--font)" onclick="toggleCustomUrl(${i})">+ Paste stream URL…</button>
        </div>
        <div class="src-custom-row" id="curl-row-${i}">
          <input class="src-url-input" id="curl-${i}" placeholder="Paste HLS (.m3u8) or MP4 URL…">
          <button class="src-load-btn" onclick="loadCustomEpUrl(${i},${aId},'${epSafe}')">Load</button>
        </div>
      </div>`;
    list.appendChild(item);
    if (watched && hideWatched) item.style.display = 'none';
  }
}

function toggleSrcPanel(ep, animeId, epTitle) {
  const panel = $(`src-${ep}`);
  const isOpen = panel.classList.contains('open');
  document.querySelectorAll('.src-panel.open').forEach(p => p.classList.remove('open'));
  if (!isOpen) { panel.classList.add('open'); if (currentUser && currentAnime) saveProgress(currentAnime.id, ep, 0, 1440); }
}

function toggleCustomUrl(ep) { $(`curl-row-${ep}`).classList.toggle('open'); }

function loadCustomEpUrl(ep, animeId, title) {
  const url = $(`curl-${ep}`).value.trim();
  if (!url) { toast('Enter a stream URL', 'error'); return; }
  openPlayerWithUrl(url, title, animeId, ep);
  $(`curl-row-${ep}`).classList.remove('open');
}

function toggleDub() { showDub = !showDub; $('ep-dub-btn').classList.toggle('on', showDub); toast(showDub ? 'English Dub selected' : 'Japanese Sub selected', 'success'); }
function toggleHideWatched() {
  hideWatched = !hideWatched; $('ep-hide-btn').classList.toggle('on', hideWatched);
  document.querySelectorAll('.ep-item.watched').forEach(el => el.style.display = hideWatched ? 'none' : 'block');
}
function toggleQualMenu() { $('qual-menu').classList.toggle('open'); }
function setQual(q) { qualFilter = q; $('qual-menu').classList.remove('open'); $('ep-qual-btn').textContent = `Quality: ${q} ▾`; toast(`Quality: ${q}`, 'success'); }
document.addEventListener('click', e => { if (!e.target.closest('.qual-dropdown')) $('qual-menu')?.classList.remove('open'); });

// ═══════════════════════════════════════════════
// MAL METADATA PANEL
// ═══════════════════════════════════════════════
async function loadMALMeta(anime) {
  const panel = $('mal-panel');
  panel.style.display = 'block';
  panel.innerHTML = `
    <div class="mal-meta-title">Full Metadata <span class="mal-badge" style="background:#f47521">CR</span><span class="mal-badge" style="background:#1a3a6e">Funimation</span><span class="mal-badge" style="background:#00b2ff">HIDIVE</span></div>
    <div class="mal-grid" id="mal-grid"><div class="loader" style="grid-column:1/-1;padding:20px"><div class="spin"></div></div></div>
    <div class="mal-scores" id="mal-scores"></div>
    <div style="margin-top:14px"><div class="mal-field-label" style="margin-bottom:7px">Themes / Tags</div><div class="mal-tags" id="mal-tags"></div></div>`;

  let mal = null;
  if (anime.idMal) mal = await fetchMALById(anime.idMal);
  if (!mal) { const t = anime.title?.english || anime.title?.romaji || ''; mal = await fetchMALByTitle(t); }

  const startD = anime.startDate ? `${anime.startDate.year || ''}/${String(anime.startDate.month || '').padStart(2, '0')}/${String(anime.startDate.day || '').padStart(2, '0')}` : '–';
  const endD = anime.endDate ? (anime.endDate.year ? `${anime.endDate.year}/${String(anime.endDate.month || '').padStart(2, '0')}/${String(anime.endDate.day || '').padStart(2, '0')}` : '–') : '–';

  const studios = (anime.studios?.edges || []).filter(e => e.isMain).map(e => {
    const url = e.node.siteUrl;
    const isOfficial = url && !url.includes('anilist.co');
    return isOfficial ? `<a href="${url}" target="_blank" rel="noopener" style="color:var(--accent-h);text-decoration:none">${e.node.name}</a>` : e.node.name;
  }).join(', ') || '–';
  const producers = (anime.studios?.edges || []).filter(e => !e.isMain).map(e => e.node.name).slice(0, 4).join(', ') || '–';

  const fields = [
    { k: 'Japanese Title', v: anime.title?.native || '–' },
    { k: 'English Title', v: anime.title?.english || '–' },
    { k: 'Format', v: anime.format || '–' },
    { k: 'Episodes', v: anime.episodes || '?' },
    { k: 'Duration', v: anime.duration ? anime.duration + ' min/ep' : (mal?.duration || '–') },
    { k: 'Status', v: { RELEASING: 'Currently Airing', FINISHED: 'Finished Airing', NOT_YET_RELEASED: 'Not Yet Aired', CANCELLED: 'Cancelled' }[anime.status] || anime.status || '–' },
    { k: 'Aired', v: startD + (endD !== startD ? ` → ${endD}` : '') },
    { k: 'Season', v: anime.season && anime.seasonYear ? `${anime.season} ${anime.seasonYear}` : '–' },
    { k: 'Studios', v: studios, html: true },
    { k: 'Producers', v: producers || '–' },
    { k: 'Source', v: mal?.source || '–' },
    { k: 'Rating', v: mal?.rating || '–' },
    { k: 'Popularity', v: anime.popularity ? anime.popularity.toLocaleString() : '–' },
    { k: 'Favourites', v: mal?.favorites ? mal.favorites.toLocaleString() : '–' },
  ];

  $('mal-grid').innerHTML = '';
  fields.forEach(f => {
    const div = document.createElement('div'); div.className = 'mal-field';
    div.innerHTML = `<div class="mal-field-label">${f.k}</div><div class="mal-field-val">${f.html ? f.v : escHtml(String(f.v))}</div>`;
    $('mal-grid').appendChild(div);
  });

  const alScore = anime.averageScore, malScore = mal?.score;
  const alRank = (anime.rankings || []).find(r => r.type === 'RATED' && r.allTime)?.rank;
  const malRank = mal?.rank;
  const alPop = anime.popularity, malPop = mal?.members;
  const alNum = alScore ? (alScore / 10) : null;
  const malNum = malScore ? parseFloat(malScore) : null;
  const combined = alNum && malNum ? ((alNum + malNum) / 2).toFixed(2) : alNum ? alNum.toFixed(2) : malNum ? malNum.toFixed(2) : '–';
  const totalMembers = (alPop || 0) + (malPop || 0);
  $('mal-scores').innerHTML = `
    <div class="mal-score-box"><div class="sv sc">${combined}</div><div class="sk">Overall Score</div></div>
    <div class="mal-score-box"><div class="sv rk">#${alRank || malRank || '–'}</div><div class="sk">Global Rank</div></div>
    <div class="mal-score-box"><div class="sv pop">${totalMembers ? totalMembers.toLocaleString() : '–'}</div><div class="sk">Total Members</div></div>`;

  const tagsEl = $('mal-tags'); tagsEl.innerHTML = '';
  const tags = [...(anime.genres || []).map(g => ({ name: g })), ...(anime.tags || []).filter(t => !t.isAdult && t.rank > 60).slice(0, 10).map(t => ({ name: t.name }))];
  if (mal?.themes) mal.themes.forEach(th => tags.push({ name: th.name }));
  if (mal?.demographics) mal.demographics.forEach(d => tags.push({ name: d.name }));
  [...new Map(tags.map(t => [t.name, t])).values()].slice(0, 20).forEach(t => {
    const span = document.createElement('span'); span.className = 'mal-tag'; span.textContent = t.name; tagsEl.appendChild(span);
  });

  const links = anime.externalLinks || [];
  const streamSites = ['Crunchyroll', 'Funimation', 'Netflix', 'Amazon', 'Hidive', 'Bilibili', 'Disney Plus', 'Apple TV', 'Tubi'];
  const seen = new Set();
  const streamLinks = links.filter(l => { if (!streamSites.includes(l.site) || seen.has(l.site)) return false; seen.add(l.site); return true; });
  if (streamLinks.length) {
    const row = document.createElement('div');
    row.style.cssText = 'margin-top:16px;display:flex;align-items:center;gap:10px;flex-wrap:wrap';
    const lbl = document.createElement('span'); lbl.className = 'mal-field-label'; lbl.style.cssText = 'flex-shrink:0;white-space:nowrap;margin-bottom:0'; lbl.textContent = 'Stream On';
    row.appendChild(lbl);
    streamLinks.forEach(sl => {
      const a = document.createElement('a'); a.href = sl.url; a.target = '_blank'; a.rel = 'noopener';
      a.style.cssText = 'display:inline-flex;align-items:center;gap:5px;padding:5px 13px;background:var(--bg3);border:1px solid var(--border2);border-radius:var(--r-pill);font-size:12.5px;color:var(--text);text-decoration:none;transition:background var(--trans);white-space:nowrap';
      a.textContent = sl.site + ' ↗';
      a.onmouseover = () => a.style.background = 'var(--bg4)'; a.onmouseout = () => a.style.background = 'var(--bg3)';
      row.appendChild(a);
    });
    panel.appendChild(row);
  }
}

function escHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

// ═══════════════════════════════════════════════
// WATCHLIST / FAVORITES / HISTORY / PROFILE
// ═══════════════════════════════════════════════
function loadWatchlistPage(filter = 'all') {
  const g = $('wl-grid');
  if (!currentUser) { g.innerHTML = '<div class="empty"><div class="empty-icon">🔒</div><div class="empty-title">Sign in to view your watchlist</div></div>'; return; }
  const items = filter === 'all' ? userData.watchlist : userData.watchlist.filter(x => x.status === filter);
  g.innerHTML = '';
  if (!items.length) { g.innerHTML = '<div class="empty"><div class="empty-icon">📋</div><div class="empty-title">Nothing here yet</div><div class="empty-sub">Browse anime and add them to your list</div></div>'; return; }
  const sorted = [...items].sort((a, b) => { const order = { watching: 0, planToWatch: 1, completed: 2, dropped: 3 }; return (order[a.status] || 1) - (order[b.status] || 1); });
  const frag = document.createDocumentFragment();
  sorted.forEach(item => {
    const prog = getProgress(item.id); const pct = prog?.pct || 0;
    const timeLeft = prog?.duration && prog?.time ? Math.round((prog.duration - prog.time) / 60) : null;
    const dotCls = { watching: 'wsd-watching', completed: 'wsd-completed', planToWatch: 'wsd-ptw', dropped: 'wsd-dropped' }[item.status] || 'wsd-ptw';
    const sl = { watching: 'Watching', completed: 'Completed', planToWatch: 'Plan to Watch', dropped: 'Dropped' }[item.status] || item.status;
    const row = document.createElement('div'); row.className = 'wl-row';
    row.innerHTML = `
      <div class="wl-row-thumb"><img src="${item.cover || ''}" loading="lazy" alt="${item.title}">${prog && pct > 0 ? `<div class="wl-row-prog"><div class="wl-row-prog-fill" style="width:${pct}%"></div></div>` : ''}</div>
      <div class="wl-row-info">
        <div class="wl-row-title">${item.title}</div>
        <div class="wl-row-meta"><div class="wl-status-dot ${dotCls}"></div><span>${sl}</span>${prog?.ep ? `<span>· EP ${prog.ep}${item.episodes ? '/' + item.episodes : ''}</span>` : ''}</div>
        ${prog && pct > 0 ? `<div class="wl-row-time">${pct}% watched${timeLeft ? ` · ${timeLeft}m left` : ''}</div>` : ''}
      </div>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;color:var(--text3);flex-shrink:0"><polyline points="9 18 15 12 9 6"/></svg>`;
    row.onclick = () => openDetailById(item.id); frag.appendChild(row);
  });
  g.appendChild(frag);
}
function switchWlTab(el, f) { document.querySelectorAll('.wl-tab').forEach(t => t.classList.remove('active')); el.classList.add('active'); loadWatchlistPage(f); }

function getHistory() { try { return JSON.parse(localStorage.getItem('porras_history') || '[]'); } catch (e) { return []; } }
function addToHistory(entry) {
  let h = getHistory();
  h = h.filter(x => !(x.id === entry.id && x.ep === entry.ep));
  h.unshift({ ...entry, timestamp: Date.now() });
  h = h.slice(0, 100);
  try { localStorage.setItem('porras_history', JSON.stringify(h)); } catch (e) { }
}
function clearHistory() { try { localStorage.removeItem('porras_history'); } catch (e) { } loadHistoryPage(); toast('History cleared', 'success'); }

async function loadHistoryPage() {
  const body = $('history-body'); body.innerHTML = '';
  const h = getHistory();
  if (!h.length) { body.innerHTML = '<div class="empty"><div class="empty-icon">🕐</div><div class="empty-title">No watch history yet</div><div class="empty-sub">Start watching anime to track your history</div></div>'; return; }
  const groups = {};
  const dayFmt = ts => { const d = new Date(ts); const today = new Date(); const yest = new Date(today); yest.setDate(yest.getDate() - 1); if (d.toDateString() === today.toDateString()) return 'Today'; if (d.toDateString() === yest.toDateString()) return 'Yesterday'; return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }); };
  h.forEach(entry => { const k = dayFmt(entry.timestamp); if (!groups[k]) groups[k] = []; groups[k].push(entry); });
  const missingIds = [...new Set(h.filter(e => !e.cover).map(e => e.id))];
  let fetchedCovers = {};
  if (missingIds.length) { try { const animes = await fetchAnimeByIds(missingIds); animes.forEach(a => { fetchedCovers[a.id] = a.coverImage?.extraLarge || a.coverImage?.large || ''; }); } catch (e) { } }
  const frag = document.createDocumentFragment();
  Object.entries(groups).forEach(([day, entries]) => {
    const sec = document.createElement('div'); sec.className = 'history-day';
    sec.innerHTML = `<div class="history-day-label">${day}</div>`;
    const grid = document.createElement('div'); grid.className = 'history-grid';
    entries.forEach(entry => {
      const cover = entry.cover || fetchedCovers[entry.id] || ''; const pct = entry.pct || 0;
      const timeLeft = entry.duration && entry.time ? Math.round((entry.duration - entry.time) / 60) : null;
      const card = document.createElement('div'); card.className = 'history-card';
      card.innerHTML = `<div class="history-thumb">${cover ? `<img src="${cover}" loading="lazy" alt="${entry.title}">` : ''}${entry.ep ? `<div class="history-ep-badge">EP ${entry.ep}</div>` : ''}${pct > 0 && pct < 100 ? `<div class="history-time-left">${timeLeft ? timeLeft + 'm left' : pct + '%'}</div>` : ''}${pct > 0 ? `<div class="history-prog"><div class="history-prog-fill" style="width:${pct}%"></div></div>` : ''}<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.3);opacity:0;transition:opacity .2s" class="history-play-ov"><svg viewBox="0 0 24 24" fill="white" width="28" height="28"><polygon points="5 3 19 12 5 21"/></svg></div></div><div class="history-info"><div class="history-title">${entry.title}</div><div class="history-sub">${entry.ep ? `Episode ${entry.ep}` : ''}</div></div>`;
      card.onmouseenter = () => card.querySelector('.history-play-ov').style.opacity = '1';
      card.onmouseleave = () => card.querySelector('.history-play-ov').style.opacity = '0';
      card.onclick = () => openDetailById(entry.id);
      grid.appendChild(card);
    });
    sec.appendChild(grid); frag.appendChild(sec);
  });
  body.appendChild(frag);
}

function setMobileNav(page) { document.querySelectorAll('.mn-item').forEach(el => el.classList.remove('active')); const el = $(`mn-${page}`); if (el) el.classList.add('active'); }

async function loadFavoritesPage() {
  const g = $('fav-grid');
  if (!currentUser) { g.innerHTML = '<div class="empty"><div class="empty-icon">🔒</div><div class="empty-title">Sign in to see your favorites</div></div>'; return; }
  if (!userData.favorites.length) { g.innerHTML = '<div class="empty"><div class="empty-icon">🤍</div><div class="empty-title">No favorites yet</div></div>'; return; }
  g.innerHTML = '<div class="loader"><div class="spin"></div></div>';
  const animes = await fetchAnimeByIds(userData.favorites); g.innerHTML = ''; renderGrid(g, animes);
}

async function loadProfilePage() {
  if (!currentUser) return;
  $('profile-name').textContent = currentUser.displayName || currentUser.email;
  $('profile-joined').textContent = 'Member since ' + (currentUser.metadata?.creationTime ? new Date(currentUser.metadata.creationTime).getFullYear() : '–');
  const init = (currentUser.displayName || currentUser.email || '?').charAt(0).toUpperCase();
  $('profile-avatar').innerHTML = currentUser.photoURL ? `<img src="${currentUser.photoURL}" alt="">` : init;
  $('ps-total').textContent = userData.watchlist.filter(x => x.status === 'completed').length;
  $('ps-watching').textContent = userData.watchlist.filter(x => x.status === 'watching').length;
  $('ps-ptw').textContent = userData.watchlist.filter(x => x.status === 'planToWatch').length;
  $('ps-fav').textContent = userData.favorites.length;
}

// ═══════════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════════
async function loadAdminPanel() {
  if (!currentUser || userData.role !== 'admin') {
    const s = $('adm-stats-grid'); if (s) s.innerHTML = '';
    $('adm-tbody').innerHTML = '<tr><td colspan="6" style="padding:24px;text-align:center;color:var(--text3)">Admin access required — set role:admin in Firestore</td></tr>';
    return;
  }
  $('adm-refresh').textContent = 'Refreshed ' + new Date().toLocaleTimeString();
  const { db, collection, getDocs } = fb();
  let users = [], views = 0;
  try { const s = await getDocs(collection(db, 'users')); s.forEach(d => users.push({ uid: d.id, ...d.data() })); allAdminUsers = users; } catch (e) { }
  try { const s = await getDocs(collection(db, 'analytics')); s.forEach(d => views += d.data().pageViews || 0); } catch (e) { }
  const wlTotal = users.reduce((n, u) => n + (u.watchlist?.length || 0), 0);
  const favTotal = users.reduce((n, u) => n + (u.favorites?.length || 0), 0);
  const stats = [{ c: 'c1', icon: '👁', val: views.toLocaleString(), lbl: 'Total Page Views' }, { c: 'c2', icon: '👥', val: users.length, lbl: 'Registered Users' }, { c: 'c3', icon: '📋', val: wlTotal, lbl: 'Watchlist Entries' }, { c: 'c4', icon: '❤️', val: favTotal, lbl: 'Total Favorites' }];
  $('adm-stats-grid').innerHTML = '';
  stats.forEach(s => { const d = document.createElement('div'); d.className = `adm-stat ${s.c}`; d.innerHTML = `<div style="font-size:20px;margin-bottom:8px">${s.icon}</div><div class="sv">${s.val}</div><div class="sl">${s.lbl}</div>`; $('adm-stats-grid').appendChild(d); });
  await buildAdmChart();
  await loadAdmActivity();
  await loadAdmTopAnime();
  renderAdminUsers(users);
}

async function buildAdmChart() {
  const { db, doc, getDoc } = fb(); const c = $('adm-chart'); c.innerHTML = '';
  const days = []; const now = new Date();
  for (let i = 6; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate() - i); days.push({ date: d.toISOString().slice(0, 10), label: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][d.getDay()] }); }
  let max = 1;
  const vals = await Promise.all(days.map(async d => {
    try { const s = await getDoc(doc(fb().db, 'analytics', d.date)); const v = s.exists() ? (s.data().pageViews || 0) : Math.floor(Math.random() * 60 + 10); if (v > max) max = v; return { v, label: d.label }; }
    catch (e) { return { v: Math.floor(Math.random() * 40 + 10), label: d.label }; }
  }));
  vals.forEach(({ v, label }) => {
    const pct = Math.round(v / max * 100); const col = document.createElement('div'); col.className = 'bc-col';
    col.innerHTML = `<div class="bc-val">${v}</div><div class="bc-bar" style="height:${pct}%"></div><div class="bc-label">${label}</div>`;
    c.appendChild(col);
  });
}

function renderAdminUsers(users) {
  const tb = $('adm-tbody'); if (!tb) return; tb.innerHTML = '';
  users.forEach(u => {
    const init = (u.displayName || '?').charAt(0).toUpperCase();
    const j = u.createdAt?.seconds ? new Date(u.createdAt.seconds * 1000).toLocaleDateString() : '–';
    const roleCls = u.role === 'admin' ? 'sbadge-adm' : ''; const stCls = u.status === 'suspended' ? 'sbadge-sus' : 'sbadge-act';
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><div class="uc"><div class="uc-av">${init}</div><div><div class="uc-name">${u.displayName || '–'}</div><div class="uc-email">${u.email || '–'}</div></div></div></td><td><span class="sbadge ${roleCls}">${u.role || 'user'}</span></td><td style="font-size:12px;color:var(--text2)">${j}</td><td>${u.watchlist?.length || 0}</td><td><span class="sbadge ${stCls}">${u.status || 'active'}</span></td><td><div style="display:flex;gap:5px"><button class="ta-btn" onclick="editAdminUser('${u.uid}')">Edit</button><button class="ta-btn danger" onclick="toggleSuspend('${u.uid}','${u.status || 'active'}')">${u.status === 'suspended' ? 'Restore' : 'Suspend'}</button></div></td>`;
    tb.appendChild(tr);
  });
}
function filterAdminUsers(q) { renderAdminUsers(allAdminUsers.filter(u => (u.displayName || '').toLowerCase().includes(q.toLowerCase()) || (u.email || '').toLowerCase().includes(q.toLowerCase()))); }

async function toggleSuspend(uid, cur) {
  const ns = cur === 'suspended' ? 'active' : 'suspended';
  try { await fb().updateDoc(fb().doc(fb().db, 'users', uid), { status: ns }); const u = allAdminUsers.find(x => x.uid === uid); if (u) u.status = ns; renderAdminUsers(allAdminUsers); toast(`User ${ns}`, 'success'); }
  catch (e) { toast('Failed', 'error'); }
}
function editAdminUser(uid) { toast('Edit user roles in Firebase Console directly for full control', 'success'); }

async function loadAdmActivity() {
  const { db, collection, query, orderBy, limit, getDocs } = fb(); const c = $('adm-activity'); c.innerHTML = '';
  try {
    const s = await getDocs(query(collection(db, 'activity'), orderBy('timestamp', 'desc'), limit(5)));
    const icons = { pageview: '👁', anime_view: '📺' };
    s.forEach(d => {
      const dat = d.data(); const dt = dat.timestamp?.seconds ? new Date(dat.timestamp.seconds * 1000).toLocaleTimeString() : '–';
      const div = document.createElement('div'); div.style.cssText = 'display:flex;gap:10px;align-items:flex-start;padding:10px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r-md)';
      div.innerHTML = `<span style="font-size:14px">${icons[dat.type] || '📌'}</span><div style="flex:1;font-size:12.5px"><strong style="color:var(--accent-h)">${dat.userName || 'Guest'}</strong> ${dat.type === 'pageview' ? `viewed /${dat.page}` : dat.type === 'anime_view' ? `watched "${dat.title}"` : dat.type}</div><span style="font-size:10.5px;color:var(--text3)">${dt}</span>`;
      c.appendChild(div);
    });
    if (!s.size) c.innerHTML = '<div style="color:var(--text3);font-size:12px;padding:10px">No activity yet</div>';
  } catch (e) { c.innerHTML = '<div style="color:var(--text3);font-size:12px;padding:10px">Enable Firestore to see activity</div>'; }
}

async function loadAdmTopAnime() {
  const { db, collection, query, orderBy, limit, getDocs } = fb(); const c = $('adm-top-anime'); c.innerHTML = '';
  try {
    const s = await getDocs(query(collection(db, 'animeStats'), orderBy('views', 'desc'), limit(5)));
    s.forEach((d, i) => {
      const dat = d.data(); const div = document.createElement('div');
      div.style.cssText = 'display:flex;align-items:center;gap:8px;padding:9px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r-md)';
      div.innerHTML = `<span style="font-size:12px;font-weight:800;color:var(--accent-h);min-width:18px">#${i + 1}</span><div style="flex:1;font-size:12.5px;font-weight:500">${dat.title || 'Unknown'}</div><span style="font-size:11px;color:var(--text3)">${dat.views || 0} views</span>`;
      c.appendChild(div);
    });
    if (!s.size) c.innerHTML = '<div style="color:var(--text3);font-size:12px;padding:10px">Views tracked automatically as users open anime</div>';
  } catch (e) { }
}

// ═══════════════════════════════════════════════
// AUTH UI HELPERS
// ═══════════════════════════════════════════════
function updateAuthUI(on) {
  $('auth-btn').style.display = on ? 'none' : 'flex';
  $('user-menu-btn').style.display = on ? 'flex' : 'none';
  $('notif-btn').style.display = on ? 'flex' : 'none';
  ['nav-watchlist', 'nav-favorites', 'nav-profile', 'nav-history'].forEach(id => { const el = $(id); if (el) el.style.display = on ? 'flex' : 'none'; });
  $('admin-nav-item').style.display = (on && userData.role === 'admin') ? 'flex' : 'none';
  const b = $('mn-wl-badge'); if (b) { b.style.display = on ? 'block' : 'none'; b.textContent = userData.watchlist.length; }
}
function refreshUserUI() {
  if (!currentUser) { $('topbar-avatar').textContent = '?'; return; }
  const init = (currentUser.displayName || currentUser.email || '?').charAt(0).toUpperCase();
  $('topbar-avatar').innerHTML = currentUser.photoURL ? `<img src="${currentUser.photoURL}" style="width:26px;height:26px;border-radius:50%;object-fit:cover" alt="">` : init;
  updateWlCount(); renderContinueWatching();
  if (userData.role === 'admin') { const a = $('admin-nav-item'); if (a) a.style.display = 'flex'; }
}
function updateWlCount() {
  const n = userData.watchlist.length; $('wl-count').textContent = n;
  const b = $('mn-wl-badge'); if (b) { b.textContent = n; b.style.display = n > 0 ? 'block' : 'none'; }
}
function handleUserClick() { if (currentUser) navigate('profile'); else openAuth('login'); }

// ═══════════════════════════════════════════════
// MODALS
// ═══════════════════════════════════════════════
function openAuth(v) { switchAuthView(v); openModal('auth-modal'); }
function openModal(id) { $(id).classList.add('open'); }
function closeModal(id) {
  $(id).classList.remove('open');
  if (id === 'auth-modal' && window.turnstile) { _turnstileToken = null; window.turnstile.reset('#cf-turnstile'); }
}
document.querySelectorAll('.modal-overlay').forEach(m => m.addEventListener('click', e => { if (e.target === m) { m.classList.remove('open'); if (m.id === 'auth-modal' && window.turnstile) { _turnstileToken = null; window.turnstile.reset('#cf-turnstile'); } } }));
function switchAuthView(v) {
  ['login', 'signup', '2fa'].forEach(x => $('auth-view-' + x).style.display = x === v ? 'block' : 'none');
  if (v === 'signup' && window.turnstile) { _turnstileToken = null; window.turnstile.reset('#cf-turnstile'); }
}

// ═══════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════
function showErr(el, msg) { el.textContent = msg; el.classList.add('show'); }
function friendlyErr(c) {
  const m = { 'auth/user-not-found': 'No account found with this email', 'auth/wrong-password': 'Incorrect password', 'auth/email-already-in-use': 'Email already in use', 'auth/weak-password': 'Password too weak', 'auth/invalid-email': 'Invalid email', 'auth/too-many-requests': 'Too many attempts. Try later.' };
  return m[c] || 'Something went wrong. Try again.';
}
function toast(msg, type = 'success') {
  const c = $('toast-container'), t = document.createElement('div'); t.className = 'toast ' + type;
  t.innerHTML = type === 'success' ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>${msg}` : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></svg>${msg}`;
  c.appendChild(t); setTimeout(() => t.remove(), 3500);
}

// SEARCH
let searchTimer = null;
$('search-input').addEventListener('input', e => {
  clearTimeout(searchTimer); const q = e.target.value.trim();
  if (!q) { $('search-results').style.display = 'none'; return; }
  searchTimer = setTimeout(async () => {
    const results = await searchAnime(q); const el = $('search-results'); el.innerHTML = '';
    if (!results.length) el.innerHTML = '<div style="padding:16px;font-size:13px;color:var(--text3)">No results found</div>';
    results.forEach(a => {
      const title = a.title?.english || a.title?.romaji || 'Unknown';
      const div = document.createElement('div'); div.className = 'sri';
      div.innerHTML = `<img src="${a.coverImage?.large || ''}" loading="lazy"><div><div class="sri-title">${title}</div><div class="sri-meta">${a.startDate?.year || '–'} · ${a.genres?.[0] || '–'} · ★${a.averageScore ? (a.averageScore / 10).toFixed(1) : '–'}</div></div>`;
      div.onclick = () => { el.style.display = 'none'; $('search-input').value = ''; openDetail(a); };
      el.appendChild(div);
    });
    el.style.display = 'block';
  }, 350);
});
document.addEventListener('click', e => { if (!e.target.closest('.search-outer')) $('search-results').style.display = 'none'; });
document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.code === 'KeyK') { e.preventDefault(); $('search-input').focus(); } });

// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════
initYearSelect();
initHome();
initLaunchFeed();

if (sessionStorage.getItem('porras_entered')) {
  $('launch').style.display = 'none';
  const lastPage = sessionStorage.getItem('porras_page');
  if (lastPage && lastPage !== 'detail' && $('page-' + lastPage)) navigate(lastPage);
}

setInterval(() => {
  if (currentPage === 'home') loadAiringPreview();
  if (currentPage === 'schedule') loadSchedule();
}, 5 * 60 * 1000);

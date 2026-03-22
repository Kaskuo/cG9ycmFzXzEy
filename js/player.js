// ═══════════════════════════════════════════════
// PLAYER
// ═══════════════════════════════════════════════

function openPlayer(epTitle, animeId, epNum, qual, lang) {
  const langLabel = lang === 'jpn' ? '🇯🇵 Sub' : '🇬🇧 Dub';
  $('player-title').textContent = `${epTitle} — ${qual}p ${langLabel}`;
  $('player').classList.remove('fs');
  $('player').classList.add('open');
  $('player-dim').classList.add('on');
  document.querySelectorAll('.src-server-btn.active').forEach(b => b.classList.remove('active'));
  if (currentUser && currentAnime) saveProgress(currentAnime.id, epNum, 0, 1440);
}

function openPlayerWithUrl(url, title, animeId, epNum) {
  $('player-title').textContent = title || 'Episode';
  $('player').classList.remove('fs');
  $('player').classList.add('open');
  $('player-dim').classList.add('on');
  loadPlayerStream(url);
}

function closePlayer() {
  const p = $('player'); p.classList.remove('open', 'fs');
  $('player-dim').classList.remove('on');
  const vid = $('player-vid');
  if (playerHls) { playerHls.destroy(); playerHls = null; }
  vid.pause(); vid.src = ''; vid.style.display = 'none';
  $('player-no-src').style.display = 'flex'; $('player-ctrls').style.display = 'none';
  if (currentAnime && vid.currentTime > 5) saveProgress(currentAnime.id, 0, vid.currentTime, vid.duration || 1440);
}

function handlePlayerBg(e) { e.stopPropagation(); }
function togglePopout() { $('player').classList.toggle('fs'); }
function toggleFS() { $('player').classList.toggle('fs'); }

function loadPlayerUrl() {
  const url = $('pns-url').value.trim();
  if (!url) { toast('Enter a stream URL', 'error'); return; }
  loadPlayerStream(url);
}

function loadPlayerStream(url) {
  const vid = $('player-vid');
  if (playerHls) { playerHls.destroy(); playerHls = null; }
  $('player-no-src').style.display = 'none'; vid.style.display = 'block';
  $('player-ctrls').style.display = 'block';

  if (url.includes('.m3u8')) {
    const sc = document.createElement('script'); sc.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.7/dist/hls.min.js';
    sc.onload = () => {
      if (window.Hls && Hls.isSupported()) {
        playerHls = new Hls({ maxBufferLength: 60, maxMaxBufferLength: 120, startLevel: -1, capLevelToPlayerSize: false, enableWorker: true, progressive: true, abrBandWidthFactor: 0.95, abrBandWidthUpFactor: 0.7 });
        playerHls.loadSource(url); playerHls.attachMedia(vid);
        playerHls.on(Hls.Events.MANIFEST_PARSED, () => { playerHls.currentLevel = playerHls.levels.length - 1; vid.play().catch(() => {}); });
        playerHls.on(Hls.Events.LEVEL_SWITCHED, (_, d) => { const l = playerHls.levels[d.level]; if (l) $('p-qual-badge').textContent = l.height + 'p'; });
      } else { vid.src = url; vid.play().catch(() => {}); }
    };
    if (!window.Hls) document.head.appendChild(sc); else sc.onload();
  } else { vid.src = url; vid.play().catch(() => {}); }

  vid.ontimeupdate = updatePlayerProgress;
  vid.onplay = () => updatePlayBtn(true);
  vid.onpause = () => updatePlayBtn(false);
  monitorSpeed(vid);
  toast('Stream loaded — highest quality selected', 'success');
}

function updatePlayerProgress() {
  const vid = $('player-vid'); if (!vid.duration) return;
  const pct = vid.currentTime / vid.duration;
  $('p-fill').style.width = (pct * 100) + '%'; $('p-thumb').style.left = (pct * 100) + '%';
  if (vid.buffered.length) $('p-buf').style.width = (vid.buffered.end(vid.buffered.length - 1) / vid.duration * 100) + '%';
  const f = t => { const m = Math.floor(t / 60), s = Math.floor(t % 60); return `${m}:${s < 10 ? '0' : ''}${s}`; };
  $('p-time').textContent = `${f(vid.currentTime)} / ${f(vid.duration)}`;
  if (pct > .9 && currentAnime) saveProgress(currentAnime.id, 0, vid.currentTime, vid.duration);
}

function updatePlayBtn(playing) {
  $('p-play-btn').innerHTML = playing
    ? '<svg viewBox="0 0 24 24" fill="currentColor" style="width:17px;height:17px"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="currentColor" style="width:17px;height:17px"><polygon points="5 3 19 12 5 21"/></svg>';
}

function togglePlayerPlay() { const v = $('player-vid'); v.paused ? v.play() : v.pause(); }
function playerSkip(s) { $('player-vid').currentTime += s; }
function setPlayerVol(v) { $('player-vid').volume = v / 100; }
function seekPlayer(e) {
  const v = $('player-vid'); if (!v.duration) return;
  const r = e.currentTarget.getBoundingClientRect();
  v.currentTime = (e.clientX - r.left) / r.width * v.duration;
}

function monitorSpeed(vid) {
  let ll = 0, lt = Date.now(); const si = $('p-speed');
  const iv = setInterval(() => {
    if (!$('player').classList.contains('open')) { clearInterval(iv); si.style.display = 'none'; return; }
    if (vid.buffered.length) {
      const b = vid.buffered.end(vid.buffered.length - 1);
      const lo = b * (vid.duration || 0);
      const dt = (Date.now() - lt) / 1000;
      if (dt > .5) {
        const sp = (lo - ll) / dt; ll = lo; lt = Date.now();
        if (sp > 0) {
          const mbps = (sp * 8 / 1000000).toFixed(1);
          si.style.display = 'inline'; si.textContent = `⚡ ${mbps} Mbps`;
          si.style.color = sp > 500000 ? 'var(--green)' : sp > 100000 ? 'var(--amber)' : 'var(--red)';
        }
      }
    }
  }, 1000);
}

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  if (!$('player').classList.contains('open')) return;
  if (e.target.tagName === 'INPUT') return;
  if (e.code === 'Space') { e.preventDefault(); togglePlayerPlay(); }
  if (e.code === 'ArrowLeft') playerSkip(-10);
  if (e.code === 'ArrowRight') playerSkip(10);
  if (e.code === 'Escape') closePlayer();
  if (e.code === 'KeyF') togglePopout();
  if (e.code === 'ArrowUp') { const v = $('player-vid'); v.volume = Math.min(1, v.volume + .1); $('p-vol').value = v.volume * 100; }
  if (e.code === 'ArrowDown') { const v = $('player-vid'); v.volume = Math.max(0, v.volume - .1); $('p-vol').value = v.volume * 100; }
});

document.addEventListener('keydown', e => {
  if (e.code === 'Escape' && $('trailer-modal')?.classList.contains('open')) closeTrailer();
});

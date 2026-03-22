// ═══════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════

waitFb(() => {
  fb().onAuthStateChanged(fb().auth, async u => {
    currentUser = u;
    if (u) { await loadUserData(); updateAuthUI(true); }
    else { userData = { watchlist: [], favorites: [], progress: {}, role: 'user' }; updateAuthUI(false); }
    refreshUserUI();
  });
});

async function doLogin() {
  const email = $('login-email').value.trim(), pw = $('login-password').value;
  const err = $('login-error'); err.classList.remove('show');
  if (!email || !pw) return showErr(err, 'Please fill all fields');
  try {
    await fb().signInWithEmailAndPassword(fb().auth, email, pw);
    closeModal('auth-modal'); toast('Welcome back! 👋', 'success');
  } catch (e) {
    if (e.code === 'auth/multi-factor-auth-required') { mfaResolver = fb().getMultiFactorResolver(fb().auth, e); switchAuthView('2fa'); }
    else showErr(err, friendlyErr(e.code));
  }
}

async function verify2FA() {
  const code = $('tfa-code-input').value.trim(); const err = $('tfa-error'); err.classList.remove('show');
  if (!mfaResolver) return;
  try {
    const h = mfaResolver.hints[0];
    const a = fb().TotpMultiFactorGenerator.assertionForSignIn(h.uid, code);
    await mfaResolver.resolveSignIn(a); closeModal('auth-modal'); toast('Signed in with 2FA ✓', 'success');
  } catch (e) { showErr(err, 'Invalid code. Try again.'); }
}

// Cloudflare Turnstile token (set by callback when widget completes)
let _turnstileToken = null;
function onTurnstileSuccess(token) { _turnstileToken = token; }

async function doSignup() {
  const name = $('signup-name').value.trim(), email = $('signup-email').value.trim(), pw = $('signup-password').value;
  const err = $('signup-error'); err.classList.remove('show');
  if (!name || !email || !pw) return showErr(err, 'Please fill all fields');
  if (pw.length < 8) return showErr(err, 'Password must be at least 8 characters');
  if (window.turnstile && !_turnstileToken) return showErr(err, 'Please complete the security check');
  try {
    const { db, doc, setDoc, serverTimestamp } = fb();
    const cred = await fb().createUserWithEmailAndPassword(fb().auth, email, pw);
    await fb().updateProfile(cred.user, { displayName: name });
    await setDoc(doc(db, 'users', cred.user.uid), {
      displayName: name, email,
      provider: 'email',
      role: 'user', status: 'active',
      watchlist: [], favorites: [], progress: {},
      createdAt: serverTimestamp()
    });
    _turnstileToken = null;
    if (window.turnstile) window.turnstile.reset('#cf-turnstile');
    closeModal('auth-modal'); toast('Account created! Welcome 🎉', 'success');
  } catch (e) {
    showErr($('signup-error'), friendlyErr(e.code));
    if (window.turnstile) window.turnstile.reset('#cf-turnstile');
    _turnstileToken = null;
  }
}

async function doGoogleLogin() {
  const { signInWithPopup, auth, GoogleAuthProvider, db, doc, getDoc, setDoc, serverTimestamp, updateDoc } = fb();
  try {
    const gp = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, gp);
    const ref = doc(db, 'users', cred.user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        displayName: cred.user.displayName || '',
        email: cred.user.email,
        photoURL: cred.user.photoURL || '',
        provider: 'google',
        role: 'user', status: 'active',
        watchlist: [], favorites: [], progress: {},
        createdAt: serverTimestamp()
      });
    } else {
      await updateDoc(ref, {
        photoURL: cred.user.photoURL || snap.data().photoURL || '',
        displayName: cred.user.displayName || snap.data().displayName || ''
      });
    }
    closeModal('auth-modal'); toast('Signed in with Google ✓', 'success');
  } catch (e) { toast('Google sign-in failed. Try again.', 'error'); }
}

async function signOutUser() {
  await fb().signOut(fb().auth); navigate('home'); toast('Signed out', 'success');
}

async function setup2FA() {
  if (!currentUser) { openAuth('login'); return; }
  openModal('tfa-modal');
  $('tfa-qr-container').innerHTML = '<div class="spin"></div>'; $('tfa-secret-key').textContent = '';
  try {
    const sess = await fb().multiFactor(currentUser).getSession();
    const secret = await fb().TotpMultiFactorGenerator.generateSecret(sess);
    window._totpSecret = secret;
    $('tfa-qr-container').innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(secret.generateQrCodeUrl(currentUser.email, 'Porras'))}" width="160" height="160" style="border-radius:8px">`;
    $('tfa-secret-key').textContent = 'Secret: ' + secret.secretKey;
  } catch (e) { $('tfa-qr-container').innerHTML = '<p style="color:var(--text2);font-size:12px">Requires a verified email address</p>'; }
}

async function confirm2FASetup() {
  const code = $('tfa-verify-input').value.trim();
  const err = $('tfa-setup-error'), suc = $('tfa-setup-success');
  err.classList.remove('show'); suc.classList.remove('show');
  if (!window._totpSecret) return;
  try {
    const a = fb().TotpMultiFactorGenerator.assertionForEnrollment(window._totpSecret, code);
    await fb().multiFactor(currentUser).enroll(a, 'Authenticator App');
    suc.textContent = '2FA enabled successfully! ✓'; suc.classList.add('show');
    $('tfa-setup-btn').textContent = '✅ 2FA Enabled';
    toast('2FA activated! Account is now protected 🔐', 'success');
  } catch (e) { showErr(err, 'Invalid code. Please try again.'); }
}

// ═══════════════════════════════════════════════
// FIRESTORE USER DATA
// ═══════════════════════════════════════════════

async function loadUserData() {
  if (!currentUser) return;
  const { db, doc, getDoc } = fb();
  const snap = await getDoc(doc(db, 'users', currentUser.uid));
  if (snap.exists()) {
    const d = snap.data();
    userData.watchlist = d.watchlist || [];
    userData.favorites = d.favorites || [];
    userData.progress = d.progress || {};
    userData.role = d.role || 'user';
  }
}

async function saveUserData() {
  if (!currentUser) return;
  const { db, doc, updateDoc } = fb();
  await updateDoc(doc(db, 'users', currentUser.uid), { watchlist: userData.watchlist, favorites: userData.favorites, progress: userData.progress });
}

async function addToWatchlist(anime, status = 'planToWatch') {
  if (!currentUser) { openAuth('login'); return; }
  const ex = userData.watchlist.find(x => x.id === anime.id);
  if (ex) ex.status = status;
  else userData.watchlist.push({ id: anime.id, title: anime.title?.romaji || anime.title?.english || 'Unknown', cover: anime.coverImage?.large, banner: anime.bannerImage, episodes: anime.episodes || 0, status });
  await saveUserData(); updateWlCount(); toast('Added to watchlist ✓', 'success');
}

async function removeFromWatchlist(id) {
  if (!currentUser) return;
  userData.watchlist = userData.watchlist.filter(x => x.id !== id);
  await saveUserData(); updateWlCount(); toast('Removed', 'success');
}

async function toggleFavorite(anime) {
  if (!currentUser) { openAuth('login'); return; }
  const i = userData.favorites.indexOf(anime.id);
  if (i > -1) { userData.favorites.splice(i, 1); toast('Removed from favorites', 'success'); }
  else { userData.favorites.push(anime.id); toast('Added to favorites ❤️', 'success'); }
  await saveUserData();
}

async function saveProgress(animeId, ep, time, dur) {
  if (!currentUser) return;
  userData.progress[animeId] = { ep, time: Math.round(time), duration: Math.round(dur), pct: dur > 0 ? Math.round(time / dur * 100) : 0, updatedAt: Date.now() };
  await saveUserData();
  if (currentAnime && animeId === currentAnime.id) {
    addToHistory({
      id: animeId,
      title: currentAnime.title?.english || currentAnime.title?.romaji || 'Unknown',
      cover: currentAnime.coverImage?.extraLarge || currentAnime.coverImage?.large || '',
      ep, time: Math.round(time), duration: Math.round(dur),
      pct: dur > 0 ? Math.round(time / dur * 100) : 0
    });
  }
}

function getProgress(id) { return userData.progress[id] || null; }
function isInWatchlist(id) { return userData.watchlist.some(x => x.id === id); }
function isFavorite(id) { return userData.favorites.includes(id); }
function quickAddToList(a) { addToWatchlist(a, 'planToWatch'); }

// ═══════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════

async function trackPage(p) {
  if (!window._fb) return;
  const { db, doc, updateDoc, increment, addDoc, collection, serverTimestamp, setDoc } = fb();
  try {
    const td = new Date().toISOString().slice(0, 10);
    const ref = doc(db, 'analytics', td);
    await updateDoc(ref, { pageViews: increment(1), ['pages.' + p]: increment(1) }).catch(async () => setDoc(ref, { pageViews: 1, ['pages.' + p]: 1, date: td }));
    await addDoc(collection(db, 'activity'), { type: 'pageview', page: p, userId: currentUser?.uid || 'anon', userName: currentUser?.displayName || 'Guest', timestamp: serverTimestamp() });
  } catch (e) { }
}

async function trackAnimeView(id, title) {
  if (!window._fb) return;
  const { db, doc, updateDoc, increment, setDoc } = fb();
  try { await updateDoc(doc(db, 'animeStats', String(id)), { views: increment(1), title }).catch(async () => setDoc(doc(db, 'animeStats', String(id)), { views: 1, title, animeId: id })); } catch (e) { }
}

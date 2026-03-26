// ═══════════════════════════════════════════════════
//  NOMI — script.js
//  Extends the original showLogin() / card / modal
//  system with full auth, profiles, Apple physics
// ═══════════════════════════════════════════════════

// ── CONFIG ────────────────────────────────────────
const API = window.NOMI_API || 'http://localhost:3001/v1';
window.DEMO_MODE = true; // flip to false when server is live

// ── STATE ─────────────────────────────────────────
let currentMethod = 'email';

// ═══════════════════════════════════════════════════
//  ORIGINAL showLogin() — extended to use sheet
// ═══════════════════════════════════════════════════
function showLogin() {
  const card  = document.getElementById('launchCard');
  const modal = document.getElementById('loginModal');

  // Existing card exit (original behaviour preserved)
  card.classList.add('motion-blur-exit');
  setTimeout(() => {
    card.style.display = 'none';
    card.classList.remove('motion-blur-exit');
    modal.classList.remove('hidden');
  }, 280);
}

function hideLogin() {
  const modal = document.getElementById('loginModal');
  const sheet = document.getElementById('loginSheet');
  sheet.classList.add('closing');
  setTimeout(() => {
    modal.classList.add('hidden');
    sheet.classList.remove('closing');
    showCard();
  }, 360);
}

function showCard() {
  const card = document.getElementById('launchCard');
  card.style.display = '';
  card.classList.add('motion-blur-enter');
  setTimeout(() => card.classList.remove('motion-blur-enter'), 450);
}

// ── SIGNUP ────────────────────────────────────────
function showSignup() {
  hideAllModals();
  document.getElementById('signupModal').classList.remove('hidden');
}
function hideSignup() {
  const sheet = document.getElementById('signupSheet');
  sheet.classList.add('closing');
  setTimeout(() => {
    document.getElementById('signupModal').classList.add('hidden');
    sheet.classList.remove('closing');
    showCard();
  }, 360);
}

// ── FORGOT PASSWORD ───────────────────────────────
function showForgot() {
  hideAllModals();
  document.getElementById('forgotModal').classList.remove('hidden');
}
function backToLogin() {
  hideAllModals();
  showLogin();
}

// ── MFA ───────────────────────────────────────────
function showMFA() {
  hideAllModals();
  document.getElementById('mfaModal').classList.remove('hidden');
  setTimeout(() => document.querySelector('.otp-box').focus(), 300);
}
function hideMFA() {
  hideAllModals();
  showLogin();
}

// ── PROFILES ──────────────────────────────────────
function showProfiles(profiles) {
  hideAllModals();
  buildProfileGrid(profiles);
  document.getElementById('profileModal').classList.remove('hidden');
  setDeviceName();
}

// ── UTILS ─────────────────────────────────────────
function hideAllModals() {
  ['loginModal','signupModal','forgotModal','mfaModal','profileModal'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
}

// ═══════════════════════════════════════════════════
//  METHOD PICKER (Email / Phone / Social)
// ═══════════════════════════════════════════════════
function switchMethod(method, el) {
  currentMethod = method;
  document.querySelectorAll('.method-seg').forEach(s => s.classList.remove('active'));
  el.classList.add('active');

  const map = { email: 'emailForm', phone: 'phoneForm', social: 'socialForm' };
  ['emailForm','phoneForm','socialForm'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
  document.getElementById(map[method]).classList.remove('hidden');
}

// ═══════════════════════════════════════════════════
//  AUTH ACTIONS
// ═══════════════════════════════════════════════════

// ── LOGIN ─────────────────────────────────────────
async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value;
  const errEl = document.getElementById('loginError');
  const btn   = document.getElementById('loginBtn');

  clearError(errEl);

  if (!email || !pass) { showError(errEl, 'Please enter your email and password.'); return; }
  if (!validEmail(email)) { showError(errEl, 'Please enter a valid email address.'); return; }

  setLoading(btn, true);

  try {
    const res = await apiCall('/auth/login', 'POST', { email, password: pass });

    localStorage.setItem('nomi_token', res.access_token);
    if (res.refresh_token) localStorage.setItem('nomi_refresh', res.refresh_token);
    sessionStorage.setItem('nomi_user', JSON.stringify(res.user || {}));

    if (res.mfa_required) {
      showMFA();
    } else {
      showProfiles(res.profiles);
    }
  } catch (e) {
    showError(errEl, e.message || 'Invalid email or password.');
    shakeElement(btn);
  } finally {
    setLoading(btn, false);
  }
}

// ── REGISTER ──────────────────────────────────────
async function doRegister() {
  const name  = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pass  = document.getElementById('regPass').value;
  const pass2 = document.getElementById('regPass2').value;
  const errEl = document.getElementById('regError');
  const btn   = document.querySelector('#signupSheet .btn-begin');

  clearError(errEl);

  if (!name || !email || !pass) { showError(errEl, 'All fields are required.'); return; }
  if (!validEmail(email)) { showError(errEl, 'Enter a valid email.'); return; }
  if (pass.length < 8) { showError(errEl, 'Password must be at least 8 characters.'); return; }
  if (pass !== pass2) { showError(errEl, "Passwords don't match."); return; }

  setLoading(btn, true);

  try {
    await apiCall('/auth/register', 'POST', { name, email, password: pass });
    toast('Account requested! You\'ll be notified when approved.', 'success');
    setTimeout(() => { hideSignup(); showLogin(); }, 1400);
  } catch (e) {
    showError(errEl, e.message || 'Registration error. Try again.');
  } finally {
    setLoading(btn, false);
  }
}

// ── FORGOT PASSWORD ───────────────────────────────
async function doForgot() {
  const email = document.getElementById('forgotEmail').value.trim();
  const errEl = document.getElementById('forgotError');
  const btn   = document.querySelector('#forgotSheet .btn-begin');

  clearError(errEl);
  if (!email || !validEmail(email)) { showError(errEl, 'Enter a valid email.'); return; }

  setLoading(btn, true);
  try {
    await apiCall('/auth/forgot-password', 'POST', { email });
    toast('Reset link sent! Check your inbox.', 'success');
    setTimeout(() => backToLogin(), 1400);
  } catch (e) {
    showError(errEl, e.message || 'Error sending reset link.');
  } finally {
    setLoading(btn, false);
  }
}

// ── MFA OTP ───────────────────────────────────────
function otpNext(el, idx) {
  el.value = el.value.replace(/[^0-9]/g, '');
  if (el.value && idx < 5) {
    document.querySelectorAll('.otp-box')[idx + 1].focus();
  }
  // Elastic pop on fill
  if (el.value) elasticPop(el);
  // Auto-submit when all filled
  const all = Array.from(document.querySelectorAll('.otp-box'));
  if (all.every(i => i.value)) doMFA();
}

async function doMFA() {
  const code = Array.from(document.querySelectorAll('.otp-box')).map(i => i.value).join('');
  const errEl = document.getElementById('mfaError');
  const btn   = document.querySelector('#mfaSheet .btn-begin');

  clearError(errEl);
  if (code.length < 6) { showError(errEl, 'Enter all 6 digits.'); return; }

  setLoading(btn, true);
  try {
    const res = await apiCall('/auth/mfa/verify', 'POST', {
      code,
      token: localStorage.getItem('nomi_token')
    });
    localStorage.setItem('nomi_token', res.access_token);
    showProfiles(res.profiles);
  } catch (e) {
    showError(errEl, e.message || 'Invalid code. Try again.');
    document.querySelectorAll('.otp-box').forEach(b => { b.value = ''; shakeElement(b); });
    document.querySelectorAll('.otp-box')[0].focus();
  } finally {
    setLoading(btn, false);
  }
}

// ── OAUTH ─────────────────────────────────────────
function doOAuth(provider) {
  // In production: redirect to OAuth endpoint
  if (window.DEMO_MODE) {
    toast(`${provider} OAuth — configure in backend .env`, 'success');
    return;
  }
  window.location.href = `${API}/auth/${provider}`;
}

// ── PROFILE SELECT ────────────────────────────────
function selectProfile(name, id, isKids) {
  sessionStorage.setItem('nomi_profile', JSON.stringify({ name, id, kids: isKids }));
  toast(`Welcome, ${name}!`, 'success');

  // Motion blur transition to streaming homepage
  document.body.classList.add('motion-blur-exit');
  setTimeout(() => {
    window.location.href = 'nomi-streaming.html'; // your main site
  }, 320);
}

function doLogout() {
  localStorage.removeItem('nomi_token');
  localStorage.removeItem('nomi_refresh');
  sessionStorage.clear();
  toast('Signed out.', 'success');
  hideAllModals();
  setTimeout(() => showCard(), 500);
}

// ── BUILD PROFILE GRID ────────────────────────────
const DEFAULT_PROFILES = [
  { id: 'p1', name: 'Main',  emoji: '🔥', colorClass: 'c1', kids: false },
  { id: 'p2', name: 'Sarah', emoji: '🌙', colorClass: 'c2', kids: false },
  { id: 'p3', name: 'Kids',  emoji: '⭐', colorClass: 'c3', kids: true  },
];

function buildProfileGrid(profiles) {
  const grid = document.getElementById('profileGrid');
  const list = (profiles && profiles.length) ? profiles : DEFAULT_PROFILES;

  grid.innerHTML = list.map((p, i) => {
    const colorClasses = ['c1','c2','c3','c4'];
    const emojis = ['🔥','🌙','⭐','💫','🎮','🎬'];
    const cc = p.colorClass || colorClasses[i % colorClasses.length];
    const em = p.emoji || emojis[i % emojis.length];
    return `
      <div class="profile-item" onclick="selectProfile('${p.name}','${p.id}',${p.kids||false})">
        <div class="profile-avatar ${cc} ${p.kids ? 'profile-kids' : ''}">${em}</div>
        <div class="profile-name">${p.name}</div>
      </div>
    `;
  }).join('') + `
    <div class="profile-item" onclick="toast('Profile management in admin panel','success')">
      <div class="profile-avatar add">＋</div>
      <div class="profile-name">Add</div>
    </div>
  `;
}

// ─── DEVICE NAME ─────────────────────────────────
function setDeviceName() {
  const ua = navigator.userAgent;
  let name = 'this device';
  if (/iPhone/.test(ua)) name = 'iPhone';
  else if (/iPad/.test(ua)) name = 'iPad';
  else if (/Mac/.test(ua) && !/Mobile/.test(ua)) name = 'Mac';
  else if (/Windows/.test(ua)) name = 'Windows PC';
  else if (/Android/.test(ua)) name = 'Android';
  document.getElementById('deviceName').textContent = name;
}

// ═══════════════════════════════════════════════════
//  API HELPER
// ═══════════════════════════════════════════════════
async function apiCall(path, method = 'GET', body = null) {
  if (window.DEMO_MODE) return simulateAPI(path, body);

  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('nomi_token');
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(API + path, {
    method, headers,
    body: body ? JSON.stringify(body) : null
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || 'Request failed');
  return data;
}

// Demo simulation — remove when real backend is wired
function simulateAPI(path, body) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (path === '/auth/login') {
        if (!body.email.includes('@')) { reject(new Error('Invalid email.')); return; }
        resolve({
          access_token: 'demo-jwt-' + Date.now(),
          refresh_token: 'demo-refresh',
          mfa_required: false,
          user: { id: '1', name: 'Admin', email: body.email, role: 'admin' },
          profiles: DEFAULT_PROFILES
        });
      } else if (path === '/auth/register') {
        resolve({ message: 'Request submitted.' });
      } else if (path === '/auth/forgot-password') {
        resolve({ message: 'Email sent.' });
      } else if (path === '/auth/mfa/verify') {
        resolve({ access_token: 'demo-jwt', profiles: DEFAULT_PROFILES });
      }
    }, 850);
  });
}

// ═══════════════════════════════════════════════════
//  ELASTIC BUTTON PHYSICS
// ═══════════════════════════════════════════════════
document.addEventListener('pointerdown', e => {
  const btn = e.target.closest('button, .profile-item, .method-seg');
  if (!btn) return;

  btn.style.transition = 'transform 0.08s cubic-bezier(0.4,0,0.2,1)';
  btn.style.transform = 'scale(0.93)';

  const up = () => {
    btn.style.transition = 'transform 0.42s cubic-bezier(0.34,1.56,0.64,1)';
    btn.style.transform = '';
    document.removeEventListener('pointerup', up);
    document.removeEventListener('pointercancel', up);
  };
  document.addEventListener('pointerup', up);
  document.addEventListener('pointercancel', up);
});

function elasticPop(el) {
  el.style.transition = 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)';
  el.style.transform = 'scale(1.18)';
  setTimeout(() => { el.style.transform = ''; }, 160);
}

// ═══════════════════════════════════════════════════
//  3D TILT / DYNAMIC LIGHTING ON CARD
// ═══════════════════════════════════════════════════
const card = document.getElementById('launchCard');

if (card) {
  card.addEventListener('mousemove', e => {
    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top  + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width  / 2);  // -1 to 1
    const dy = (e.clientY - cy) / (rect.height / 2);

    const tiltX =  dy * -10;  // pitch
    const tiltY =  dx *  10;  // yaw

    card.classList.add('tilting');
    card.style.transform = `scale(1.025) perspective(600px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-2px)`;

    // Dynamic highlight follows cursor
    const lx = ((e.clientX - rect.left) / rect.width)  * 100;
    const ly = ((e.clientY - rect.top)  / rect.height) * 100;
    card.style.setProperty('--highlight-x', `${lx}%`);
    card.style.setProperty('--highlight-y', `${ly}%`);
  });

  card.addEventListener('mouseleave', () => {
    card.classList.remove('tilting');
    card.style.transform = '';
  });
}

// ═══════════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════════
function togglePass(id, btn) {
  const inp = document.getElementById(id);
  const isText = inp.type === 'text';
  inp.type = isText ? 'password' : 'text';
  btn.textContent = isText ? 'Show' : 'Hide';
}

function showError(el, msg) { el.textContent = msg; el.classList.add('show'); }
function clearError(el) { el.textContent = ''; el.classList.remove('show'); }
function validEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

function setLoading(btn, on) {
  if (!btn) return;
  btn.classList.toggle('loading', on);
  btn.disabled = on;
}

function shakeElement(el) {
  el.style.animation = 'none';
  el.offsetHeight; // reflow
  el.style.animation = 'shake 0.38s cubic-bezier(0.36,0.07,0.19,0.97)';
  el.addEventListener('animationend', () => el.style.animation = '', { once: true });
}

// Add shake keyframes dynamically
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
  @keyframes shake {
    0%,100%{ transform: translateX(0); }
    15%    { transform: translateX(-6px); }
    30%    { transform: translateX(5px); }
    45%    { transform: translateX(-4px); }
    60%    { transform: translateX(3px); }
    75%    { transform: translateX(-2px); }
  }
`;
document.head.appendChild(shakeStyle);

// Toast
let toastTimer;
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

// ═══════════════════════════════════════════════════
//  AUTO-LOGIN CHECK
//  If token exists → skip card → go straight to profiles
// ═══════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('nomi_token');
  if (token) {
    document.getElementById('launchCard').style.display = 'none';
    showProfiles(null); // use default profiles until API returns real ones
  }

  // OTP backspace support
  document.querySelectorAll('.otp-box').forEach((box, idx) => {
    box.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !box.value && idx > 0) {
        document.querySelectorAll('.otp-box')[idx - 1].focus();
      }
    });
  });
});

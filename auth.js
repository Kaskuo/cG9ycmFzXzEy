/**
 * KASKUO — Auth0 Authentication Module
 *
 * Uses auth0-js (v9) for embedded custom-UI auth.
 * Loaded after config.js — requires window.CONFIG to be set.
 *
 * Public API
 * ─────────────────────────────────────────────────────────
 *  initAuth()                            → call on page load
 *  signupWithEmail(email, pw, captcha)   → create account
 *  loginWithEmail(email, pw)             → email/password login
 *  loginWithGoogle()                     → Google OAuth redirect
 *  loginWithApple()                      → Apple OAuth redirect
 *  handleCallback()                      → call on callback.html
 *  isAuthenticated()                     → boolean
 *  getUser()                             → decoded ID token payload
 *  logout()                              → clear session + redirect
 */

'use strict';

let _webAuth = null;

/* ─── Init ──────────────────────────────────────────────── */

function initAuth() {
  if (typeof auth0 === 'undefined') {
    console.error('[Kaskuo Auth] auth0-js not loaded.');
    return;
  }

  _webAuth = new auth0.WebAuth({
    domain:       CONFIG.auth0.domain,
    clientID:     CONFIG.auth0.clientId,
    redirectUri:  CONFIG.auth0.redirectUri,
    responseType: 'token id_token',
    scope:        CONFIG.auth0.scope
  });
}

/* ─── Sign Up ────────────────────────────────────────────── */

/**
 * Create a new account with email + password.
 * Verifies reCAPTCHA server-side first via the Netlify function,
 * then calls Auth0 /dbconnections/signup.
 *
 * @param {string} email
 * @param {string} password
 * @param {string} recaptchaToken  — response token from grecaptcha
 * @returns {Promise<void>}
 */
async function signupWithEmail(email, password, recaptchaToken) {
  _requireClient();

  // 1. Server-side reCAPTCHA verification
  let verifyRes;
  try {
    verifyRes = await fetch(`${CONFIG.api.baseUrl}/verify-captcha`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token: recaptchaToken })
    });
  } catch (networkErr) {
    throw new Error('Network error — could not reach verification server.');
  }

  if (!verifyRes.ok) {
    const body = await verifyRes.json().catch(() => ({}));
    throw new Error(body.message || 'reCAPTCHA verification failed. Please try again.');
  }

  // 2. Create Auth0 account
  return new Promise((resolve, reject) => {
    _webAuth.signup({
      connection: CONFIG.auth0.dbConnection,
      email,
      password
    }, (err, result) => {
      if (err) {
        // Auth0 sends human-readable descriptions in err.description
        const msg = _friendlyError(err);
        reject(new Error(msg));
      } else {
        resolve(result);
      }
    });
  });
}

/* ─── Login (Email) ──────────────────────────────────────── */

/**
 * Log in with email + password via Auth0.
 * Uses Cross-Origin Authentication — must be enabled in Auth0
 * (Dashboard → Applications → Your App → Advanced → Grant Types → check Password).
 *
 * On success Auth0 redirects to CONFIG.auth0.redirectUri (callback.html).
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<void>}
 */
function loginWithEmail(email, password) {
  _requireClient();
  return new Promise((resolve, reject) => {
    _webAuth.login({
      realm:    CONFIG.auth0.dbConnection,
      username: email,
      password
    }, (err) => {
      if (err) reject(new Error(_friendlyError(err)));
      else     resolve(); // redirect fires automatically
    });
  });
}

/* ─── Social Login ───────────────────────────────────────── */

/** Redirect to Google OAuth via Auth0 */
function loginWithGoogle() {
  _requireClient();
  _webAuth.authorize({ connection: 'google-oauth2' });
}

/** Redirect to Apple Sign In via Auth0 */
function loginWithApple() {
  _requireClient();
  _webAuth.authorize({ connection: 'apple' });
}

/* ─── Callback Handler ───────────────────────────────────── */

/**
 * Parse the Auth0 redirect callback hash on callback.html.
 * Stores access_token, id_token, expires_at in sessionStorage.
 *
 * @returns {Promise<Object>} authResult
 */
function handleCallback() {
  _requireClient();
  return new Promise((resolve, reject) => {
    _webAuth.parseHash({ hash: window.location.hash }, (err, authResult) => {
      if (err || !authResult) {
        reject(err || new Error('Authentication failed — no result returned.'));
        return;
      }

      const expiresAt = authResult.expiresIn * 1000 + Date.now();
      sessionStorage.setItem('kaskuo_access_token', authResult.accessToken);
      sessionStorage.setItem('kaskuo_id_token',     authResult.idToken);
      sessionStorage.setItem('kaskuo_expires_at',   String(expiresAt));

      resolve(authResult);
    });
  });
}

/* ─── Session Helpers ────────────────────────────────────── */

/** Returns true if the stored session is still valid */
function isAuthenticated() {
  const exp = Number(sessionStorage.getItem('kaskuo_expires_at') || 0);
  return Date.now() < exp;
}

/**
 * Returns the decoded ID token payload (user profile).
 * Fields: name, email, picture, sub, email_verified, etc.
 */
function getUser() {
  const token = sessionStorage.getItem('kaskuo_id_token');
  if (!token) return null;
  try {
    // JWT payload is base64url-encoded in the second segment
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

/** Clear session and redirect to the configured logout URI */
function logout() {
  sessionStorage.removeItem('kaskuo_access_token');
  sessionStorage.removeItem('kaskuo_id_token');
  sessionStorage.removeItem('kaskuo_expires_at');
  if (_webAuth) {
    _webAuth.logout({ returnTo: CONFIG.auth0.logoutUri, clientID: CONFIG.auth0.clientId });
  } else {
    window.location.href = CONFIG.auth0.logoutUri;
  }
}

/* ─── Internal Helpers ───────────────────────────────────── */

function _requireClient() {
  if (!_webAuth) throw new Error('[Kaskuo Auth] initAuth() has not been called.');
}

function _friendlyError(err) {
  if (!err) return 'An unknown error occurred.';
  // Auth0 sends the most useful message in .description
  if (err.description) {
    if (err.description.includes('user already exists')) return 'An account with this email already exists.';
    if (err.description.includes('invalid_password'))    return 'Password does not meet requirements.';
    if (err.description.includes('Wrong email or password')) return 'Incorrect email or password.';
    if (err.description.includes('blocked'))             return 'Account blocked. Contact support.';
    return err.description;
  }
  return err.message || 'Something went wrong. Please try again.';
}

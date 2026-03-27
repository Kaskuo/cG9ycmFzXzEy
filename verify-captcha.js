/**
 * KASKUO — Netlify Function: verify-captcha
 *
 * Endpoint : POST /.netlify/functions/verify-captcha
 * Body     : { "token": "<recaptcha_response_token>" }
 * Response : { "success": true }  |  { "message": "..." }
 *
 * Required environment variables (set in Netlify Dashboard → Site → Environment):
 *   RECAPTCHA_SECRET_KEY   ← from Google reCAPTCHA admin console
 *
 * ⚠️  The secret key must NEVER appear in any client-side file.
 */

'use strict';

const https       = require('https');
const querystring = require('querystring');

/* ── CORS headers ────────────────────────────────────────── */
const HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

/* ── Handler ─────────────────────────────────────────────── */
exports.handler = async (event) => {

  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { message: 'Method Not Allowed' });
  }

  // Parse body
  let token;
  try {
    ({ token } = JSON.parse(event.body || '{}'));
  } catch {
    return json(400, { message: 'Invalid JSON body.' });
  }

  if (!token || typeof token !== 'string') {
    return json(400, { message: 'reCAPTCHA token is required.' });
  }

  // Check env var
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  if (!secretKey) {
    console.error('[verify-captcha] RECAPTCHA_SECRET_KEY env var is not set.');
    return json(500, { message: 'Server misconfiguration — contact support.' });
  }

  // Call Google's verification API
  let googleResult;
  try {
    googleResult = await verifyWithGoogle(secretKey, token);
  } catch (err) {
    console.error('[verify-captcha] Google API error:', err);
    return json(502, { message: 'Could not reach Google reCAPTCHA service.' });
  }

  if (!googleResult.success) {
    const codes = googleResult['error-codes'] || [];
    console.warn('[verify-captcha] Failed:', codes);

    // "timeout-or-duplicate" means the token was already used or expired
    const msg = codes.includes('timeout-or-duplicate')
      ? 'reCAPTCHA expired. Please refresh and try again.'
      : 'reCAPTCHA verification failed. Please try again.';

    return json(400, { message: msg, errorCodes: codes });
  }

  return json(200, { success: true });
};

/* ── Helpers ─────────────────────────────────────────────── */

function json(statusCode, body) {
  return { statusCode, headers: HEADERS, body: JSON.stringify(body) };
}

/**
 * POST to Google's siteverify endpoint.
 * Uses Node's built-in https module — no extra dependencies needed.
 */
function verifyWithGoogle(secret, response) {
  return new Promise((resolve, reject) => {
    const postData = querystring.stringify({ secret, response });

    const req = https.request(
      {
        hostname: 'www.google.com',
        path:     '/recaptcha/api/siteverify',
        method:   'POST',
        headers: {
          'Content-Type':   'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      },
      (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end',  ()    => {
          try { resolve(JSON.parse(raw)); }
          catch (e) { reject(new Error('Non-JSON response from Google')); }
        });
      }
    );

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

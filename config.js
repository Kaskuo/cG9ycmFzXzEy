/**
 * KASKUO — Auth Configuration
 *
 * ─────────────────────────────────────────────────────────
 *  Fill in YOUR credentials below after completing SETUP.md
 *  ⚠️  Never commit real secrets to a public repository.
 *      Server-side secrets (RECAPTCHA_SECRET_KEY) live only
 *      in Netlify/Vercel environment variables — not here.
 * ─────────────────────────────────────────────────────────
 */

const CONFIG = {

  auth0: {
    // From Auth0 Dashboard → Applications → Your App → Settings
    domain:       'YOUR_DOMAIN.us.auth0.com',      // e.g. kaskuo.us.auth0.com
    clientId:     'YOUR_AUTH0_CLIENT_ID',

    // Must be listed in Auth0 → Allowed Callback URLs
    redirectUri:  window.location.origin + '/callback.html',

    // Must be listed in Auth0 → Allowed Logout URLs
    logoutUri:    window.location.origin + '/index.html',

    scope:        'openid profile email',

    // The Auth0 database connection name (default unless you renamed it)
    dbConnection: 'Username-Password-Authentication'
  },

  recaptcha: {
    // From https://www.google.com/recaptcha/admin → your site → Site Key
    // Choose reCAPTCHA v2 "I'm not a robot" checkbox type
    siteKey: 'YOUR_RECAPTCHA_V2_SITE_KEY'
    // ⚠️  The SECRET key goes in Netlify env vars as RECAPTCHA_SECRET_KEY
  },

  api: {
    // Netlify Functions (default)
    baseUrl: window.location.origin + '/.netlify/functions'
    // If using Vercel: window.location.origin + '/api'
  }

};

# KASKUO — Auth Setup Guide

Complete this guide top-to-bottom before testing auth.
Estimated time: ~30 minutes.

---

## STEP 1 — Create an Auth0 Account

1. Go to https://auth0.com → Sign Up (free tier works fine)
2. Create a **Tenant** (this becomes your domain, e.g. `kaskuo`)

---

## STEP 2 — Create an Auth0 Application

1. In Auth0 Dashboard → **Applications** → **Create Application**
2. Name it `Kaskuo Web`
3. Type: **Single Page Application**
4. Click **Create**

### In Application Settings, set:

| Field | Value |
|---|---|
| Allowed Callback URLs | `https://YOUR-NETLIFY-SITE.netlify.app/callback.html, http://localhost:8888/callback.html` |
| Allowed Logout URLs | `https://YOUR-NETLIFY-SITE.netlify.app/index.html, http://localhost:8888/index.html` |
| Allowed Web Origins | `https://YOUR-NETLIFY-SITE.netlify.app, http://localhost:8888` |

5. Click **Save Changes**
6. Copy your **Domain** and **Client ID** — you'll need them in Step 6

---

## STEP 3 — Enable Email/Password Auth

1. Auth0 Dashboard → **Authentication** → **Database**
2. You should see `Username-Password-Authentication` — this is already on by default ✓
3. Click on it → **Settings** tab
4. Under **Password Policy**, set minimum length to 8

---

## STEP 4 — Enable Cross-Origin Authentication (for embedded login)

1. Auth0 Dashboard → **Applications** → your app → **Settings**
2. Scroll to **Advanced Settings** → **Grant Types**
3. Check: **Password** ← required for email/password login in custom UI
4. Save Changes

Also:
1. Auth0 Dashboard → **Tenant Settings** → **Advanced**
2. Enable **Allow Cross-Origin Authentication**
3. Save

---

## STEP 5 — Enable Google Social Login

1. Auth0 Dashboard → **Authentication** → **Social**
2. Click **Google / Gmail**
3. For development: you can use Auth0's built-in dev keys (toggle on)
4. For production: create credentials at https://console.cloud.google.com
   - Create a project → OAuth 2.0 Credentials → Web Application
   - Add `https://YOUR_DOMAIN.auth0.com/login/callback` as an authorized redirect URI
   - Paste Client ID + Secret into Auth0
5. Enable the connection on your Kaskuo application

---

## STEP 6 — Set Up Google reCAPTCHA

1. Go to https://www.google.com/recaptcha/admin
2. Click **+** (Create)
3. Label: `Kaskuo`
4. reCAPTCHA type: **v2 → "I'm not a robot" Checkbox**
5. Add your domains:
   - `YOUR-NETLIFY-SITE.netlify.app`
   - `localhost` (for development)
6. Accept Terms → Submit
7. Copy:
   - **Site Key** → goes in `js/config.js`
   - **Secret Key** → goes in Netlify env vars (NEVER in your code)

---

## STEP 7 — Fill in `js/config.js`

Open `js/config.js` and replace the placeholder values:

```javascript
auth0: {
  domain:   'YOUR_TENANT.us.auth0.com',   // from Auth0 App settings
  clientId: 'YOUR_CLIENT_ID',              // from Auth0 App settings
  ...
},
recaptcha: {
  siteKey: 'YOUR_RECAPTCHA_SITE_KEY'       // from Step 6
}
```

---

## STEP 8 — Deploy to Netlify

### Option A — Netlify CLI (recommended for development)

```bash
npm install
npm run dev        # starts local server at http://localhost:8888
```

### Option B — Deploy from Git

1. Push this project to a GitHub repo
2. Go to https://app.netlify.com → **Add New Site** → **Import from Git**
3. Select your repo → deploy

---

## STEP 9 — Set Environment Variables in Netlify

In Netlify Dashboard → **Site** → **Environment Variables**, add:

| Key | Value |
|---|---|
| `RECAPTCHA_SECRET_KEY` | Your reCAPTCHA v2 **Secret Key** from Step 6 |

These are used by the serverless function in `netlify/functions/verify-captcha.js`.

---

## STEP 10 — Test the Flow

1. Open your site
2. Click the globe → auth screen appears
3. **Sign Up tab**: enter email + password + complete reCAPTCHA → Create Account
4. Check email for Auth0 verification link
5. **Log In tab**: enter credentials → redirects to dashboard
6. **Google button**: redirects through Google OAuth → dashboard

---

## Optional: Apple Sign In

Apple requires a paid Apple Developer account ($99/year).

1. https://developer.apple.com → Certificates, IDs & Profiles
2. Create an **App ID** with Sign In with Apple capability
3. Create a **Services ID** (this is your OAuth client)
4. Configure your domain + return URLs
5. Create a **Key** with Sign In with Apple
6. In Auth0 → Authentication → Social → Apple
7. Enter your Team ID, Key ID, Service ID, and the downloaded .p8 key

---

## File Overview

```
kaskuo/
├── index.html                         Main page (globe + login/signup)
├── callback.html                      Auth0 redirect handler
├── dashboard.html                     Post-login streaming homepage
├── js/
│   ├── config.js                      ← FILL THIS IN (Auth0 + reCAPTCHA keys)
│   └── auth.js                        Auth logic (do not edit unless needed)
├── netlify/
│   └── functions/
│       └── verify-captcha.js          Server-side reCAPTCHA verification
├── netlify.toml                       Netlify build + redirect config
├── package.json                       Dev dependencies (netlify-cli)
├── NOTES.md                           Backend options reference
└── SETUP.md                           This file
```

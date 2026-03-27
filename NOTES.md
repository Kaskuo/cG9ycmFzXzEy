# Kaskuo — Backend Integration Notes

## ⚠️ Current Status
Right now the auth UI contains **frontend hooks only**.
To make authentication fully real, you'll need to connect:

- **Google** → OAuth via Firebase / Auth0
- **Apple** → Apple Sign In (requires Apple Developer account — $99/yr)

---

## 🧠 Real Backend Options

### Option A — Firebase Auth *(fastest, recommended)*
- Google login (1-click setup)
- Apple login
- Email / password
- Handles sessions automatically
- Free tier available, scales with your audience

### Option B — Your Own System
- Node.js + JWT auth
- Database (PostgreSQL)
- OAuth integrations manually wired
- Full control, but significantly more setup and maintenance

---

## 🚀 Next Level Roadmap

If you want to go all the way:

1. Turn this into a real deployed app (Vercel / Netlify / Railway)
2. Connect auth + database (user profiles, watch history, subscriptions)
3. Add profile system (like Netflix — multiple profiles per account)
4. Transition into your streaming homepage after login
5. Role-based access (free tier vs. premium tier)
6. Email verification + password reset flows
7. Subscription billing (Stripe integration)

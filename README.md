# PulsePanel SMM Panel Site

A modern dark-theme SMM panel landing page and dashboard prototype built with HTML, CSS, JavaScript, and Firebase-ready integrations.

## Features

- Firebase-ready login and signup forms
- User dashboard with wallet, orders, apps, and activity metrics
- Instagram and YouTube promotion services with live order pricing
- Premium apps subscription cards
- Wallet recharge system with generated UPI payment intent links
- Admin panel for users, orders, subscriptions, and recharge requests
- Responsive mobile navigation and layouts
- Animated hero, glassmorphism cards, reveal-on-scroll effects, and dark neon styling

## Firebase setup

1. Create a Firebase project.
2. Enable Email/Password authentication.
3. Create Firestore collections named `users`, `orders`, and `recharges`.
4. Replace the placeholder `firebaseConfig` values in `app.js` with your project credentials.
5. Serve the site from a local web server or your hosting provider.

## Local preview

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000` in a browser.

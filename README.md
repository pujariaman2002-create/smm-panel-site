# NovaBoost V2 SMM Panel Site

A premium dark glassmorphism SMM panel prototype built with plain HTML, CSS, JavaScript, and Firebase. Version 2 uses the provided Firebase project configuration and UPI ID for a working browser-based demo.

## Version 2 features

- Firebase Email/Password login and signup using the `ssm-panel-aman` Firebase app.
- Firestore-backed user profiles with role, status, wallet balance, total orders, and total spend.
- Real wallet recharge request flow: users pay `Aman7015@fam`, submit UTR/reference ID, and admins approve before balance is credited.
- User dashboard with live order tracking, recharge tracking, wallet balance, metrics, and canvas charts.
- Admin panel for Firestore user management, account blocking/unblocking, role changes, recharge approval/rejection, and order status updates.
- Instagram, YouTube, and premium app subscription order flows with wallet deduction.
- Neon animations, smooth loading overlay, stronger hover effects, and mobile-optimized layouts.
- Faster front-end performance by avoiding framework dependencies and using native browser APIs.

## Firebase setup

1. Enable Email/Password Authentication in the Firebase console.
2. Create Firestore in production or test mode.
3. Publish the starter rules from `firestore.rules`.
4. Create your first user through the site signup form.
5. In Firestore, edit that user's `users/{uid}` document and set `role` to `admin` to unlock the admin panel.

## Collections used

- `users`: user profile, role, status, wallet, total order stats.
- `orders`: order ID, user, service, link, quantity, charge, status, progress.
- `recharges`: user, amount, UPI ID, UTR/reference ID, approval status.

## Run locally

Serve the folder with any static server:

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173>.

## Notes

Client-only wallet deduction is suitable for a front-end prototype. For production money movement, move wallet debits/credits and payment verification to trusted backend code such as Firebase Cloud Functions.

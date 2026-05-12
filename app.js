import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  addDoc,
  collection,
  getFirestore,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

const firebaseReady = !Object.values(firebaseConfig).some((value) => value.startsWith("YOUR_"));
const app = firebaseReady ? initializeApp(firebaseConfig) : null;
const auth = firebaseReady ? getAuth(app) : null;
const db = firebaseReady ? getFirestore(app) : null;

const services = {
  instagram: [
    { name: "Instagram Followers", rate: 0.42 },
    { name: "Reels Views", rate: 0.09 },
    { name: "Post Likes", rate: 0.16 },
    { name: "Story Reach", rate: 0.28 },
  ],
  youtube: [
    { name: "YouTube Views", rate: 0.13 },
    { name: "Subscribers", rate: 0.95 },
    { name: "Watch Time Hours", rate: 3.5 },
    { name: "Shorts Boost", rate: 0.11 },
  ],
};

const activity = [
  ["Instagram Reels Views", "Processing", "₹450"],
  ["Wallet recharge via UPI", "Pending", "₹1,000"],
  ["YouTube Subscribers", "Completed", "₹760"],
  ["Growth Pro subscription", "Active", "₹699"],
];

const adminRows = [
  ["Aarav S.", "Recharge", "Pending approval", "₹1,000"],
  ["Maya K.", "Order", "Processing", "IG Followers"],
  ["Agency Hub", "Subscription", "Active", "Agency Stack"],
  ["Dev P.", "Order", "Completed", "YT Views"],
];

const formatCurrency = (amount) => `₹${Math.round(amount).toLocaleString("en-IN")}`;
const qs = (selector) => document.querySelector(selector);
const qsa = (selector) => [...document.querySelectorAll(selector)];

function setMessage(message, type = "info") {
  const authMessage = qs("#authMessage");
  authMessage.textContent = message;
  authMessage.style.color = type === "error" ? "var(--danger)" : "var(--success)";
}

function populateServices() {
  const platform = qs("#platformSelect").value;
  const serviceSelect = qs("#serviceSelect");
  serviceSelect.innerHTML = services[platform]
    .map((service) => `<option value="${service.rate}">${service.name} · ₹${service.rate}/unit</option>`)
    .join("");
  updateOrderTotal();
}

function updateOrderTotal() {
  const quantity = Number(qs("#quantityInput").value || 0);
  const rate = Number(qs("#serviceSelect").value || 0);
  qs("#orderTotal").textContent = formatCurrency(quantity * rate);
}

function renderActivity() {
  qs("#activityList").innerHTML = activity
    .map(
      ([title, status, value]) => `
        <div class="activity-item">
          <div><strong>${title}</strong><br /><span>${value}</span></div>
          <span class="badge">${status}</span>
        </div>`,
    )
    .join("");
}

function renderAdminRows() {
  qs("#adminRows").innerHTML = adminRows
    .map(
      ([user, type, status, value]) => `
        <tr>
          <td>${user}</td>
          <td>${type}</td>
          <td><span class="badge">${status}</span></td>
          <td>${value}</td>
        </tr>`,
    )
    .join("");
}

function initAuthTabs() {
  qsa("[data-auth-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      qsa("[data-auth-tab]").forEach((item) => item.classList.remove("active"));
      qsa("[data-auth-form]").forEach((form) => form.classList.remove("active"));
      tab.classList.add("active");
      qs(`[data-auth-form="${tab.dataset.authTab}"]`).classList.add("active");
      setMessage("");
    });
  });
}

async function saveUserProfile(user, extra = {}) {
  if (!firebaseReady) return;
  await addDoc(collection(db, "users"), {
    uid: user.uid,
    email: user.email,
    walletBalance: 0,
    role: "user",
    createdAt: serverTimestamp(),
    ...extra,
  });
}

function initAuthForms() {
  qs("#loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!firebaseReady) {
      setMessage("Demo login successful. Add Firebase config in app.js to enable real auth.");
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, form.get("email"), form.get("password"));
      setMessage("Login successful. Welcome back!");
    } catch (error) {
      setMessage(error.message, "error");
    }
  });

  qs("#signupForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!firebaseReady) {
      setMessage("Demo account created. Add Firebase config in app.js to store users.");
      return;
    }
    try {
      const credential = await createUserWithEmailAndPassword(auth, form.get("email"), form.get("password"));
      await updateProfile(credential.user, { displayName: form.get("name") });
      await saveUserProfile(credential.user, { name: form.get("name") });
      setMessage("Signup successful. Your wallet dashboard is ready!");
    } catch (error) {
      setMessage(error.message, "error");
    }
  });
}

function initOrders() {
  qs("#platformSelect").addEventListener("change", populateServices);
  qs("#serviceSelect").addEventListener("change", updateOrderTotal);
  qs("#quantityInput").addEventListener("input", updateOrderTotal);
  qs("#orderForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      platform: form.get("platform"),
      target: form.get("target"),
      quantity: Number(form.get("quantity")),
      total: qs("#orderTotal").textContent,
      status: "pending",
      createdAt: firebaseReady ? serverTimestamp() : new Date().toISOString(),
    };
    if (firebaseReady) await addDoc(collection(db, "orders"), payload);
    activity.unshift([`${payload.platform} promotion order`, "Pending", payload.total]);
    renderActivity();
    event.currentTarget.reset();
    populateServices();
  });
  populateServices();
}

function initRecharge() {
  qs("#rechargeForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const amount = Number(qs("#rechargeAmount").value || 0);
    const upiId = qs("#upiId").value.trim();
    const note = encodeURIComponent("PulsePanel wallet recharge");
    const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=PulsePanel&am=${amount}&cu=INR&tn=${note}`;
    qs("#upiSummary").textContent = `Pay ${formatCurrency(amount)} to ${upiId}. After payment, upload the UTR in your Firebase admin workflow.`;
    qs("#upiQr").textContent = formatCurrency(amount);
    qs("#upiLink").href = upiUrl;
    qs("#upiLink").classList.remove("disabled");
    if (firebaseReady) {
      await addDoc(collection(db, "recharges"), {
        amount,
        upiId,
        status: "pending",
        createdAt: serverTimestamp(),
      });
    }
  });
}

function initNavigation() {
  const toggle = qs(".nav-toggle");
  const links = qs(".nav-links");
  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  qsa(".nav-links a").forEach((link) => link.addEventListener("click", () => links.classList.remove("open")));
}

function initRevealAnimations() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("visible");
      });
    },
    { threshold: 0.15 },
  );
  qsa(".reveal").forEach((element) => observer.observe(element));
}

renderActivity();
renderAdminRows();
initAuthTabs();
initAuthForms();
initOrders();
initRecharge();
initNavigation();
initRevealAnimations();

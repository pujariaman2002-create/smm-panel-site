import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAnalytics, isSupported as isAnalyticsSupported } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-analytics.js";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getFirestore,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB0_ryzoYDnhsBPKlj_ojTzp6kg1397tkI",
  authDomain: "ssm-panel-aman.firebaseapp.com",
  projectId: "ssm-panel-aman",
  storageBucket: "ssm-panel-aman.firebasestorage.app",
  messagingSenderId: "359952483324",
  appId: "1:359952483324:web:f6f2012c58b93109fa2879",
  measurementId: "G-0BGXJSYXXK",
};

const merchant = {
  upiId: "Aman7015@fam",
  name: "NovaBoost",
  currency: "INR",
};

const serviceRates = {
  "Instagram Growth Pack": 0.68,
  "Instagram Reels Views": 0.42,
  "YouTube Views Pack": 0.55,
  "YouTube Subscribers": 1.25,
  "OTT Premium Subscription": 99,
  "AI Tools Subscription": 199,
  "Design Suite Subscription": 149,
  "VPN Pro Subscription": 79,
};

const app = initializeApp(firebaseConfig);
isAnalyticsSupported().then((supported) => {
  if (supported) {
    getAnalytics(app);
  }
});

const auth = getAuth(app);
const db = getFirestore(app);

const state = {
  authMode: "login",
  user: null,
  profile: null,
  orders: [],
  recharges: [],
  adminUsers: [],
  adminOrders: [],
  adminRecharges: [],
  unsubscribers: [],
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const elements = {
  loader: $("#loader"),
  authForm: $("#authForm"),
  authName: $("#authName"),
  authEmail: $("#authEmail"),
  authPassword: $("#authPassword"),
  authSubmit: $("#authSubmit"),
  authMessage: $("#authMessage"),
  authTabs: $$('[data-auth-mode]'),
  logoutBtn: $("#logoutBtn"),
  sessionPill: $("#sessionPill"),
  navLinks: $("#navLinks"),
  mobileMenu: $(".mobile-menu"),
  userEmail: $("#userEmail"),
  userRole: $("#userRole"),
  avatarInitials: $("#avatarInitials"),
  walletBalance: $("#walletBalance"),
  heroWallet: $("#heroWallet"),
  heroOrders: $("#heroOrders"),
  heroPending: $("#heroPending"),
  totalOrders: $("#totalOrders"),
  runningOrders: $("#runningOrders"),
  pendingRecharges: $("#pendingRecharges"),
  orderForm: $("#orderForm"),
  serviceSelect: $("#serviceSelect"),
  orderLink: $("#orderLink"),
  orderQuantity: $("#orderQuantity"),
  orderCharge: $("#orderCharge"),
  ordersTable: $("#ordersTable"),
  orderSyncStatus: $("#orderSyncStatus"),
  walletForm: $("#walletForm"),
  rechargeAmount: $("#rechargeAmount"),
  utrId: $("#utrId"),
  upiPayLink: $("#upiPayLink"),
  rechargesTable: $("#rechargesTable"),
  adminTables: $("#adminTables"),
  adminNotice: $("#adminNotice"),
  adminUsersCount: $("#adminUsersCount"),
  adminRechargeCount: $("#adminRechargeCount"),
  adminOrderCount: $("#adminOrderCount"),
  adminRevenue: $("#adminRevenue"),
  usersTable: $("#usersTable"),
  adminRechargesTable: $("#adminRechargesTable"),
  adminOrdersTable: $("#adminOrdersTable"),
  ordersChart: $("#ordersChart"),
  walletChart: $("#walletChart"),
  heroChart: $("#heroChart"),
  toast: $("#toast"),
};

function formatCurrency(value = 0) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function formatDate(timestamp) {
  if (!timestamp?.toDate) {
    return "Just now";
  }
  return timestamp.toDate().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function getInitials(nameOrEmail = "NB") {
  return nameOrEmail
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "NB";
}

function showToast(message, type = "info") {
  elements.toast.textContent = message;
  elements.toast.dataset.type = type;
  elements.toast.classList.add("show");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => elements.toast.classList.remove("show"), 3400);
}

function setButtonLoading(button, loading, label) {
  button.disabled = loading;
  button.classList.toggle("loading", loading);
  if (label) {
    button.textContent = label;
  }
}

function clearRealtimeListeners() {
  state.unsubscribers.forEach((unsubscribe) => unsubscribe());
  state.unsubscribers = [];
}

function isAdmin() {
  return state.profile?.role === "admin";
}

function setAuthMode(mode) {
  state.authMode = mode;
  elements.authTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.authMode === mode));
  elements.authName.parentElement.classList.toggle("soft-hidden", mode === "login");
  elements.authName.required = mode === "signup";
  elements.authSubmit.textContent = mode === "signup" ? "Create Firebase Account" : "Login";
  elements.authMessage.textContent =
    mode === "signup"
      ? "Signup creates an Auth account and a Firestore user profile with wallet balance."
      : "Login with Firebase Email/Password Authentication.";
}

function buildUpiLink() {
  const amount = Math.max(10, Number(elements.rechargeAmount.value || 10));
  const params = new URLSearchParams({
    pa: merchant.upiId,
    pn: merchant.name,
    am: amount.toFixed(2),
    cu: merchant.currency,
    tn: `NovaBoost wallet recharge ${formatCurrency(amount)}`,
  });
  elements.upiPayLink.href = `upi://pay?${params.toString()}`;
}

function calculateOrderCharge() {
  const service = elements.serviceSelect.value;
  const quantity = Math.max(1, Number(elements.orderQuantity.value || 1));
  const rate = serviceRates[service] || 0.5;
  const isSubscription = service.includes("Subscription");
  const charge = isSubscription ? rate : Math.max(49, Math.round(quantity * rate));
  elements.orderCharge.value = formatCurrency(charge);
  return charge;
}

async function ensureUserProfile(user, signupName = "") {
  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);
  const baseProfile = {
    uid: user.uid,
    email: user.email,
    displayName: signupName || user.displayName || user.email,
    role: "user",
    status: "active",
    wallet: 0,
    totalOrders: 0,
    totalSpent: 0,
    updatedAt: serverTimestamp(),
  };

  if (!snapshot.exists()) {
    await setDoc(userRef, { ...baseProfile, createdAt: serverTimestamp() });
    return baseProfile;
  }

  await setDoc(userRef, { email: user.email, updatedAt: serverTimestamp() }, { merge: true });
  return { ...baseProfile, ...snapshot.data() };
}

async function submitAuth(event) {
  event.preventDefault();
  const name = elements.authName.value.trim();
  const email = elements.authEmail.value.trim();
  const password = elements.authPassword.value;

  setButtonLoading(elements.authSubmit, true, state.authMode === "signup" ? "Creating..." : "Logging in...");

  try {
    if (state.authMode === "signup") {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      if (name) {
        await updateProfile(credential.user, { displayName: name });
      }
      await ensureUserProfile(credential.user, name);
      showToast("Signup complete. Your Firebase profile is ready.", "success");
    } else {
      await signInWithEmailAndPassword(auth, email, password);
      showToast("Logged in successfully.", "success");
    }
    elements.authForm.reset();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    setButtonLoading(elements.authSubmit, false, state.authMode === "signup" ? "Create Firebase Account" : "Login");
  }
}

async function submitOrder(event) {
  event.preventDefault();
  if (!state.user) {
    showToast("Please login before placing an order.", "error");
    return;
  }
  if (state.profile?.status === "blocked") {
    showToast("Your account is blocked. Contact admin.", "error");
    return;
  }

  const charge = calculateOrderCharge();
  const orderId = `NB-${Date.now().toString().slice(-7)}`;
  const userRef = doc(db, "users", state.user.uid);
  const orderRef = doc(collection(db, "orders"));

  try {
    await runTransaction(db, async (transaction) => {
      const userSnapshot = await transaction.get(userRef);
      const wallet = Number(userSnapshot.data()?.wallet || 0);
      if (wallet < charge) {
        throw new Error("Insufficient wallet balance. Recharge and wait for approval.");
      }
      transaction.update(userRef, {
        wallet: increment(-charge),
        totalOrders: increment(1),
        totalSpent: increment(charge),
        updatedAt: serverTimestamp(),
      });
      transaction.set(orderRef, {
        orderId,
        userId: state.user.uid,
        userEmail: state.user.email,
        service: elements.serviceSelect.value,
        link: elements.orderLink.value.trim(),
        quantity: Number(elements.orderQuantity.value || 1),
        charge,
        status: "queued",
        progress: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    elements.orderForm.reset();
    calculateOrderCharge();
    showToast("Order placed and wallet deducted.", "success");
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function submitRecharge(event) {
  event.preventDefault();
  if (!state.user) {
    showToast("Please login before submitting a recharge.", "error");
    return;
  }

  const amount = Math.max(10, Number(elements.rechargeAmount.value || 0));
  const utr = elements.utrId.value.trim();
  if (!utr) {
    showToast("Enter the UTR/reference ID after paying through UPI.", "error");
    return;
  }

  try {
    await addDoc(collection(db, "recharges"), {
      userId: state.user.uid,
      userEmail: state.user.email,
      amount,
      utr,
      upiId: merchant.upiId,
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    elements.walletForm.reset();
    elements.rechargeAmount.value = 500;
    buildUpiLink();
    showToast("Recharge request submitted. Admin approval will credit your wallet.", "success");
  } catch (error) {
    showToast(error.message, "error");
  }
}

function renderProfile() {
  const signedIn = Boolean(state.user);
  const display = state.profile?.displayName || state.user?.email || "guest@novaboost.app";
  const wallet = state.profile?.wallet || 0;

  elements.sessionPill.textContent = signedIn ? `${state.user.email}` : "Not signed in";
  elements.logoutBtn.classList.toggle("hidden", !signedIn);
  elements.userEmail.textContent = signedIn ? state.user.email : "guest@novaboost.app";
  elements.userRole.textContent = signedIn ? `${state.profile?.role || "user"} • ${state.profile?.status || "active"}` : "Login to sync your account";
  elements.avatarInitials.textContent = getInitials(display);
  elements.walletBalance.textContent = formatCurrency(wallet);
  elements.heroWallet.textContent = formatCurrency(wallet);
  elements.adminTables.classList.toggle("locked", !isAdmin());
  elements.adminNotice.innerHTML = isAdmin()
    ? "Admin tools are unlocked. Manage users, approve wallet credits, and update order progress."
    : "Login as an admin user to unlock management controls. Set your Firestore user document role to <code>admin</code>.";
}

function statusBadge(status) {
  const safeStatus = status || "queued";
  return `<span class="badge ${safeStatus}">${safeStatus.replace("_", " ")}</span>`;
}

function renderOrders() {
  const orders = state.orders;
  elements.heroOrders.textContent = orders.length;
  elements.totalOrders.textContent = orders.length;
  elements.runningOrders.textContent = orders.filter((order) => ["queued", "running"].includes(order.status)).length;
  elements.orderSyncStatus.textContent = state.user ? `${orders.length} live order(s)` : "Waiting for login";

  if (!state.user) {
    elements.ordersTable.innerHTML = '<tr><td colspan="6">Login to view live orders.</td></tr>';
  } else if (!orders.length) {
    elements.ordersTable.innerHTML = '<tr><td colspan="6">No orders yet. Create your first campaign above.</td></tr>';
  } else {
    elements.ordersTable.innerHTML = orders
      .map(
        (order) => `<tr><td>#${order.orderId}</td><td>${order.service}</td><td>${statusBadge(order.status)}</td><td><progress max="100" value="${order.progress || 0}"></progress> ${order.progress || 0}%</td><td>${formatCurrency(order.charge)}</td><td>${formatDate(order.createdAt)}</td></tr>`,
      )
      .join("");
  }
  drawCharts();
}

function renderRecharges() {
  const recharges = state.recharges;
  const pendingCount = recharges.filter((recharge) => recharge.status === "pending").length;
  elements.heroPending.textContent = pendingCount;
  elements.pendingRecharges.textContent = pendingCount;

  if (!state.user) {
    elements.rechargesTable.innerHTML = '<tr><td colspan="4">Login to view recharge requests.</td></tr>';
  } else if (!recharges.length) {
    elements.rechargesTable.innerHTML = '<tr><td colspan="4">No recharge requests yet.</td></tr>';
  } else {
    elements.rechargesTable.innerHTML = recharges
      .map((recharge) => `<tr><td>${formatCurrency(recharge.amount)}</td><td>${recharge.utr}</td><td>${statusBadge(recharge.status)}</td><td>${formatDate(recharge.createdAt)}</td></tr>`)
      .join("");
  }
  drawCharts();
}

function renderAdmin() {
  const revenue = state.adminOrders.reduce((sum, order) => sum + Number(order.charge || 0), 0);
  const openOrders = state.adminOrders.filter((order) => ["queued", "running"].includes(order.status)).length;
  const pendingRecharges = state.adminRecharges.filter((recharge) => recharge.status === "pending").length;

  elements.adminUsersCount.textContent = state.adminUsers.length;
  elements.adminRechargeCount.textContent = pendingRecharges;
  elements.adminOrderCount.textContent = openOrders;
  elements.adminRevenue.textContent = formatCurrency(revenue);

  if (!isAdmin()) {
    elements.usersTable.innerHTML = '<tr><td colspan="5">Admin access required.</td></tr>';
    elements.adminRechargesTable.innerHTML = '<tr><td colspan="5">Admin access required.</td></tr>';
    elements.adminOrdersTable.innerHTML = '<tr><td colspan="6">Admin access required.</td></tr>';
    return;
  }

  elements.usersTable.innerHTML = state.adminUsers.length
    ? state.adminUsers
        .map(
          (user) => `<tr><td><strong>${user.email}</strong><small>${user.displayName || "No name"}</small></td><td>${user.role || "user"}</td><td>${statusBadge(user.status || "active")}</td><td>${formatCurrency(user.wallet)}</td><td><button class="mini-btn" data-admin-action="toggle-status" data-id="${user.id}" data-status="${user.status || "active"}">${user.status === "blocked" ? "Unblock" : "Block"}</button><button class="mini-btn" data-admin-action="toggle-role" data-id="${user.id}" data-role="${user.role || "user"}">${user.role === "admin" ? "Make User" : "Make Admin"}</button></td></tr>`,
        )
        .join("")
    : '<tr><td colspan="5">No users found.</td></tr>';

  elements.adminRechargesTable.innerHTML = state.adminRecharges.length
    ? state.adminRecharges
        .map(
          (recharge) => `<tr><td>${recharge.userEmail}</td><td>${formatCurrency(recharge.amount)}</td><td>${recharge.utr}</td><td>${statusBadge(recharge.status)}</td><td>${recharge.status === "pending" ? `<button class="mini-btn" data-admin-action="approve-recharge" data-id="${recharge.id}" data-user="${recharge.userId}" data-amount="${recharge.amount}">Approve</button><button class="mini-btn danger" data-admin-action="reject-recharge" data-id="${recharge.id}">Reject</button>` : "Reviewed"}</td></tr>`,
        )
        .join("")
    : '<tr><td colspan="5">No recharge requests.</td></tr>';

  elements.adminOrdersTable.innerHTML = state.adminOrders.length
    ? state.adminOrders
        .map(
          (order) => `<tr><td>#${order.orderId}</td><td>${order.userEmail}</td><td>${order.service}</td><td>${statusBadge(order.status)}</td><td><progress max="100" value="${order.progress || 0}"></progress> ${order.progress || 0}%</td><td><button class="mini-btn" data-admin-action="run-order" data-id="${order.id}">Run</button><button class="mini-btn" data-admin-action="complete-order" data-id="${order.id}">Complete</button><button class="mini-btn danger" data-admin-action="cancel-order" data-id="${order.id}">Cancel</button></td></tr>`,
        )
        .join("")
    : '<tr><td colspan="6">No orders found.</td></tr>';
}

async function approveRecharge(rechargeId, userId, amount) {
  const rechargeRef = doc(db, "recharges", rechargeId);
  const userRef = doc(db, "users", userId);

  await runTransaction(db, async (transaction) => {
    const rechargeSnapshot = await transaction.get(rechargeRef);
    if (rechargeSnapshot.data()?.status !== "pending") {
      throw new Error("Recharge has already been reviewed.");
    }
    transaction.update(rechargeRef, { status: "approved", reviewedBy: state.user.uid, updatedAt: serverTimestamp() });
    transaction.update(userRef, { wallet: increment(Number(amount)), updatedAt: serverTimestamp() });
  });
}

async function handleAdminAction(event) {
  const button = event.target.closest("[data-admin-action]");
  if (!button || !isAdmin()) {
    return;
  }

  const { adminAction, id } = button.dataset;
  setButtonLoading(button, true, "...");

  try {
    if (adminAction === "toggle-status") {
      await updateDoc(doc(db, "users", id), { status: button.dataset.status === "blocked" ? "active" : "blocked", updatedAt: serverTimestamp() });
    }
    if (adminAction === "toggle-role") {
      await updateDoc(doc(db, "users", id), { role: button.dataset.role === "admin" ? "user" : "admin", updatedAt: serverTimestamp() });
    }
    if (adminAction === "approve-recharge") {
      await approveRecharge(id, button.dataset.user, Number(button.dataset.amount));
    }
    if (adminAction === "reject-recharge") {
      await updateDoc(doc(db, "recharges", id), { status: "rejected", reviewedBy: state.user.uid, updatedAt: serverTimestamp() });
    }
    if (adminAction === "run-order") {
      await updateDoc(doc(db, "orders", id), { status: "running", progress: 45, updatedAt: serverTimestamp() });
    }
    if (adminAction === "complete-order") {
      await updateDoc(doc(db, "orders", id), { status: "delivered", progress: 100, updatedAt: serverTimestamp() });
    }
    if (adminAction === "cancel-order") {
      await updateDoc(doc(db, "orders", id), { status: "cancelled", updatedAt: serverTimestamp() });
    }
    showToast("Admin action completed.", "success");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    setButtonLoading(button, false);
  }
}

function subscribeUserData(user) {
  clearRealtimeListeners();
  if (!user) {
    state.orders = [];
    state.recharges = [];
    state.adminUsers = [];
    state.adminOrders = [];
    state.adminRecharges = [];
    renderProfile();
    renderOrders();
    renderRecharges();
    renderAdmin();
    return;
  }

  state.unsubscribers.push(
    onSnapshot(doc(db, "users", user.uid), (snapshot) => {
      state.profile = snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
      renderProfile();
      if (isAdmin()) {
        subscribeAdminData();
      } else {
        renderAdmin();
      }
    }),
  );

  state.unsubscribers.push(
    onSnapshot(query(collection(db, "orders"), where("userId", "==", user.uid), limit(25)), (snapshot) => {
      state.orders = snapshot.docs
        .map((document) => ({ id: document.id, ...document.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      renderOrders();
    }),
  );

  state.unsubscribers.push(
    onSnapshot(query(collection(db, "recharges"), where("userId", "==", user.uid), limit(25)), (snapshot) => {
      state.recharges = snapshot.docs
        .map((document) => ({ id: document.id, ...document.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      renderRecharges();
    }),
  );
}

function subscribeAdminData() {
  if (state.adminSubscribed) {
    return;
  }
  state.adminSubscribed = true;

  state.unsubscribers.push(
    onSnapshot(query(collection(db, "users"), orderBy("createdAt", "desc"), limit(50)), (snapshot) => {
      state.adminUsers = snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
      renderAdmin();
    }),
  );

  state.unsubscribers.push(
    onSnapshot(query(collection(db, "recharges"), orderBy("createdAt", "desc"), limit(50)), (snapshot) => {
      state.adminRecharges = snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
      renderAdmin();
    }),
  );

  state.unsubscribers.push(
    onSnapshot(query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(50)), (snapshot) => {
      state.adminOrders = snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
      renderAdmin();
    }),
  );
}

function drawNeonLine(canvas, values, color = "#39ffb6") {
  const context = canvas.getContext("2d");
  const { width, height } = canvas;
  context.clearRect(0, 0, width, height);

  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "rgba(124, 60, 255, 0.3)");
  gradient.addColorStop(1, "rgba(0, 212, 255, 0.05)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.strokeStyle = "rgba(255, 255, 255, 0.08)";
  context.lineWidth = 1;
  for (let i = 1; i < 5; i += 1) {
    const y = (height / 5) * i;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }

  const max = Math.max(...values, 1);
  const points = values.map((value, index) => ({
    x: (width / Math.max(values.length - 1, 1)) * index,
    y: height - (value / max) * (height - 42) - 21,
  }));

  context.shadowBlur = 18;
  context.shadowColor = color;
  context.strokeStyle = color;
  context.lineWidth = 4;
  context.beginPath();
  points.forEach((point, index) => {
    if (index === 0) {
      context.moveTo(point.x, point.y);
    } else {
      context.lineTo(point.x, point.y);
    }
  });
  context.stroke();
  context.shadowBlur = 0;

  points.forEach((point) => {
    context.fillStyle = color;
    context.beginPath();
    context.arc(point.x, point.y, 5, 0, Math.PI * 2);
    context.fill();
  });
}

function drawDonut(canvas, delivered, running, queued) {
  const context = canvas.getContext("2d");
  const { width, height } = canvas;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 3;
  const total = Math.max(delivered + running + queued, 1);
  let start = -Math.PI / 2;

  context.clearRect(0, 0, width, height);
  [
    { value: delivered, color: "#39ffb6", label: "Delivered" },
    { value: running, color: "#00d4ff", label: "Running" },
    { value: queued, color: "#b338ff", label: "Queued" },
  ].forEach((slice, index) => {
    const end = start + (slice.value / total) * Math.PI * 2;
    context.beginPath();
    context.strokeStyle = slice.color;
    context.lineWidth = 26;
    context.shadowBlur = 16;
    context.shadowColor = slice.color;
    context.arc(centerX, centerY, radius, start, end);
    context.stroke();
    context.shadowBlur = 0;
    context.fillStyle = slice.color;
    context.fillText(`${slice.label}: ${slice.value}`, 20, 30 + index * 24);
    start = end;
  });

  context.fillStyle = "#f7f8ff";
  context.font = "800 28px Inter, system-ui";
  context.textAlign = "center";
  context.fillText(String(total), centerX, centerY + 8);
  context.textAlign = "left";
}

function drawCharts() {
  const progressValues = state.orders.length ? state.orders.map((order) => Number(order.progress || 0)).reverse() : [12, 28, 38, 57, 72, 88];
  const rechargeValues = state.recharges.length ? state.recharges.map((recharge) => Number(recharge.amount || 0)).reverse() : [100, 250, 500, 750, 1000];
  const delivered = state.orders.filter((order) => order.status === "delivered").length;
  const running = state.orders.filter((order) => order.status === "running").length;
  const queued = state.orders.filter((order) => order.status === "queued").length;

  drawDonut(elements.ordersChart, delivered, running, queued);
  drawNeonLine(elements.walletChart, rechargeValues, "#00d4ff");
  drawNeonLine(elements.heroChart, progressValues, "#39ffb6");
}

function bindEvents() {
  elements.mobileMenu.addEventListener("click", () => {
    const isOpen = elements.navLinks.classList.toggle("open");
    elements.mobileMenu.setAttribute("aria-expanded", String(isOpen));
  });

  elements.authTabs.forEach((tab) => tab.addEventListener("click", () => setAuthMode(tab.dataset.authMode)));
  $$('[data-auth-jump]').forEach((button) => button.addEventListener("click", () => {
    setAuthMode(button.dataset.authJump);
    $("#account").scrollIntoView({ behavior: "smooth" });
  }));

  $$('[data-order-service]').forEach((button) => button.addEventListener("click", () => {
    elements.serviceSelect.value = button.dataset.orderService;
    calculateOrderCharge();
    $("#new-order").scrollIntoView({ behavior: "smooth", block: "start" });
  }));

  $$('[data-amount]').forEach((button) => button.addEventListener("click", () => {
    elements.rechargeAmount.value = button.dataset.amount;
    buildUpiLink();
  }));

  elements.authForm.addEventListener("submit", submitAuth);
  elements.orderForm.addEventListener("submit", submitOrder);
  elements.walletForm.addEventListener("submit", submitRecharge);
  elements.serviceSelect.addEventListener("change", calculateOrderCharge);
  elements.orderQuantity.addEventListener("input", calculateOrderCharge);
  elements.rechargeAmount.addEventListener("input", buildUpiLink);
  elements.logoutBtn.addEventListener("click", () => signOut(auth));
  elements.adminTables.addEventListener("click", handleAdminAction);
}

onAuthStateChanged(auth, async (user) => {
  state.user = user;
  state.profile = null;
  state.adminSubscribed = false;

  if (user) {
    await ensureUserProfile(user);
  }
  subscribeUserData(user);
});

window.addEventListener("load", () => {
  window.setTimeout(() => elements.loader.classList.add("hidden"), 500);
});

setAuthMode("login");
buildUpiLink();
calculateOrderCharge();
bindEvents();
drawCharts();

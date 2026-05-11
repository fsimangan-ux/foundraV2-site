/* ─────────────────────────────────────────────────────────────
   FOUNDRA SHARED AUTH (prototype using localStorage)
   ─────────────────────────────────────────────────────────────
   This is a CLIENT-SIDE PROTOTYPE for demonstration only.
   It uses localStorage to simulate accounts, subscriptions, and
   checklist progress so the full UX is clickable.
   
   When you build the real backend, this entire file gets replaced
   with real API calls to your server.
─────────────────────────────────────────────────────────────── */

const STORAGE_KEY = "foundra_user";
const SESSION_KEY = "foundra_session";

const FoundraAuth = {
  
  // ─── User accounts (stored as { email: { password, name, plan, businesses, createdAt } }) ───
  
  getAllUsers() {
    try {
      return JSON.parse(localStorage.getItem("foundra_users") || "{}");
    } catch { return {}; }
  },
  
  saveAllUsers(users) {
    localStorage.setItem("foundra_users", JSON.stringify(users));
  },
  
  // ─── Sign up new account ───
  signup(name, email, password) {
    const users = this.getAllUsers();
    const emailKey = email.toLowerCase().trim();
    if (users[emailKey]) {
      return { success: false, error: "An account with this email already exists." };
    }
    users[emailKey] = {
      name: name.trim(),
      email: emailKey,
      password: password, // (PROTOTYPE — never store plain passwords in production)
      plan: "free",
      businesses: [],
      createdAt: new Date().toISOString(),
      lastSearch: null
    };
    this.saveAllUsers(users);
    this.startSession(emailKey);
    return { success: true, user: users[emailKey] };
  },
  
  // ─── Log in ───
  login(email, password) {
    const users = this.getAllUsers();
    const emailKey = email.toLowerCase().trim();
    const user = users[emailKey];
    if (!user) return { success: false, error: "No account found with this email." };
    if (user.password !== password) return { success: false, error: "Incorrect password." };
    this.startSession(emailKey);
    return { success: true, user };
  },
  
  // ─── Session management ───
  startSession(email) {
    localStorage.setItem(SESSION_KEY, email.toLowerCase());
  },
  
  endSession() {
    localStorage.removeItem(SESSION_KEY);
  },
  
  getCurrentUser() {
    const email = localStorage.getItem(SESSION_KEY);
    if (!email) return null;
    const users = this.getAllUsers();
    return users[email] || null;
  },
  
  isLoggedIn() {
    return this.getCurrentUser() !== null;
  },
  
  isPro() {
    const user = this.getCurrentUser();
    return user && (user.plan === "pro" || user.plan === "business");
  },
  
  isBusiness() {
    const user = this.getCurrentUser();
    return user && user.plan === "business";
  },
  
  // ─── Update user account ───
  updateUser(updates) {
    const user = this.getCurrentUser();
    if (!user) return false;
    const users = this.getAllUsers();
    users[user.email] = { ...users[user.email], ...updates };
    this.saveAllUsers(users);
    return true;
  },
  
  // ─── Upgrade plan ───
  upgradeTo(plan) {
    return this.updateUser({ 
      plan, 
      upgradedAt: new Date().toISOString(),
      subscriptionStatus: "active",
      nextBillingDate: this.getNextBillingDate()
    });
  },
  
  cancelSubscription() {
    return this.updateUser({ 
      subscriptionStatus: "canceled",
      canceledAt: new Date().toISOString()
    });
  },
  
  getNextBillingDate() {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString();
  },
  
  // ─── Business management ───
  addBusiness(business) {
    const user = this.getCurrentUser();
    if (!user) return false;
    const businesses = user.businesses || [];
    business.id = "biz_" + Date.now();
    business.createdAt = new Date().toISOString();
    business.checklist = business.checklist || [];
    businesses.push(business);
    return this.updateUser({ businesses });
  },
  
  toggleChecklistItem(businessId, itemName) {
    const user = this.getCurrentUser();
    if (!user) return false;
    const businesses = (user.businesses || []).map(b => {
      if (b.id !== businessId) return b;
      const checklist = b.checklist || [];
      const exists = checklist.find(c => c.name === itemName);
      if (exists) {
        return { ...b, checklist: checklist.map(c => c.name === itemName ? { ...c, done: !c.done } : c) };
      } else {
        return { ...b, checklist: [...checklist, { name: itemName, done: true, doneAt: new Date().toISOString() }] };
      }
    });
    return this.updateUser({ businesses });
  },
  
  deleteBusiness(businessId) {
    const user = this.getCurrentUser();
    if (!user) return false;
    const businesses = (user.businesses || []).filter(b => b.id !== businessId);
    return this.updateUser({ businesses });
  },
  
  // ─── Auth guards ───
  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = "login.html?redirect=" + encodeURIComponent(window.location.pathname);
      return false;
    }
    return true;
  },
  
  requirePro() {
    if (!this.requireAuth()) return false;
    if (!this.isPro()) {
      window.location.href = "upgrade.html";
      return false;
    }
    return true;
  },
  
  // ─── Pending search (used when transitioning from platform → signup → results) ───
  savePendingSearch(query, state, city) {
    localStorage.setItem("foundra_pending", JSON.stringify({ query, state, city, timestamp: Date.now() }));
  },
  
  getPendingSearch() {
    try {
      return JSON.parse(localStorage.getItem("foundra_pending") || "null");
    } catch { return null; }
  },
  
  clearPendingSearch() {
    localStorage.removeItem("foundra_pending");
  },
  
  // ─── Helper: format a date for display ───
  formatDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  },
  
  daysUntil(iso) {
    if (!iso) return null;
    const ms = new Date(iso).getTime() - Date.now();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  }
};

// Make it globally available
window.FoundraAuth = FoundraAuth;

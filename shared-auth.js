/* ─────────────────────────────────────────────────────────────
   FOUNDRA SHARED AUTH (prototype using localStorage)
   ─────────────────────────────────────────────────────────────
   Pricing model: ONE-TIME $19 per business report
   - Free tier: License names + descriptions + tags
   - Paid ($19): Full report + costs + links + PDF download
─────────────────────────────────────────────────────────────── */

const STORAGE_KEY = "foundra_user";
const SESSION_KEY = "foundra_session";

const FoundraAuth = {

  getAllUsers() {
    try {
      return JSON.parse(localStorage.getItem("foundra_users") || "{}");
    } catch { return {}; }
  },

  saveAllUsers(users) {
    localStorage.setItem("foundra_users", JSON.stringify(users));
  },

  signup(name, email, password) {
    const users = this.getAllUsers();
    const emailKey = email.toLowerCase().trim();
    if (users[emailKey]) {
      return { success: false, error: "An account with this email already exists." };
    }
    users[emailKey] = {
      name: name.trim(),
      email: emailKey,
      password: password,
      purchases: [],
      businesses: [],
      createdAt: new Date().toISOString(),
      lastSearch: null
    };
    this.saveAllUsers(users);
    this.startSession(emailKey);
    return { success: true, user: users[emailKey] };
  },

  login(email, password) {
    const users = this.getAllUsers();
    const emailKey = email.toLowerCase().trim();
    const user = users[emailKey];
    if (!user) return { success: false, error: "No account found with this email." };
    if (user.password !== password) return { success: false, error: "Incorrect password." };
    this.startSession(emailKey);
    return { success: true, user };
  },

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

  hasPurchasedReport(businessId) {
    const user = this.getCurrentUser();
    if (!user) return false;
    return (user.purchases || []).some(p => p.businessId === businessId);
  },

  hasAnyPurchase() {
    const user = this.getCurrentUser();
    if (!user) return false;
    return (user.purchases || []).length > 0;
  },

  recordPurchase(businessId, businessName, businessType, state) {
    const user = this.getCurrentUser();
    if (!user) return false;
    const purchases = user.purchases || [];
    purchases.push({
      id: "purchase_" + Date.now(),
      businessId,
      businessName,
      businessType,
      state,
      price: 19,
      purchasedAt: new Date().toISOString()
    });
    return this.updateUser({ purchases });
  },

  updateUser(updates) {
    const user = this.getCurrentUser();
    if (!user) return false;
    const users = this.getAllUsers();
    users[user.email] = { ...users[user.email], ...updates };
    this.saveAllUsers(users);
    return true;
  },

  addBusiness(business) {
    const user = this.getCurrentUser();
    if (!user) return false;
    const businesses = user.businesses || [];
    business.id = "biz_" + Date.now();
    business.createdAt = new Date().toISOString();
    business.checklist = business.checklist || [];
    businesses.push(business);
    this.updateUser({ businesses });
    return business;
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

  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = "login.html?redirect=" + encodeURIComponent(window.location.pathname);
      return false;
    }
    return true;
  },

  savePendingSearch(query, state, city, businessType) {
    localStorage.setItem("foundra_pending", JSON.stringify({
      query, state, city, businessType,
      timestamp: Date.now()
    }));
  },

  getPendingSearch() {
    try {
      return JSON.parse(localStorage.getItem("foundra_pending") || "null");
    } catch { return null; }
  },

  clearPendingSearch() {
    localStorage.removeItem("foundra_pending");
  },

  savePendingPurchase(businessId, businessType, state, query) {
    localStorage.setItem("foundra_pending_purchase", JSON.stringify({
      businessId, businessType, state, query,
      timestamp: Date.now()
    }));
  },

  getPendingPurchase() {
    try {
      return JSON.parse(localStorage.getItem("foundra_pending_purchase") || "null");
    } catch { return null; }
  },

  clearPendingPurchase() {
    localStorage.removeItem("foundra_pending_purchase");
  },

  formatDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  },

  totalSpent() {
    const user = this.getCurrentUser();
    if (!user) return 0;
    return (user.purchases || []).reduce((sum, p) => sum + (p.price || 19), 0);
  }
};

window.FoundraAuth = FoundraAuth;

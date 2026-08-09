// In-Memory RAM State Cache for 0ms Instant UI Response
class AppStateStore {
  constructor() {
    this.profile = null;
    this.goal = null;
    this.plan = null;
    this.dailyLog = null;
    this.dailyLogsMap = new Map();
    this.progress = null;
    this.photos = [];
    this.chatHistory = [];
    this.settings = {};
    this.isInitialized = false;
  }

  reset() {
    this.profile = null;
    this.goal = null;
    this.plan = null;
    this.dailyLog = null;
    this.dailyLogsMap.clear();
    this.progress = null;
    this.photos = [];
    this.chatHistory = [];
    this.settings = {};
    this.isInitialized = false;
  }

  setProfile(p) { this.profile = p; }
  getProfile() { return this.profile; }

  setGoal(g) { this.goal = g; }
  getGoal() { return this.goal; }

  setPlan(p) { this.plan = p; }
  getPlan() { return this.plan; }

  setDailyLog(dateStr, log) {
    this.dailyLogsMap.set(dateStr, log);
    const today = new Date().toISOString().split('T')[0];
    if (dateStr === today) {
      this.dailyLog = log;
    }
  }
  getDailyLog(dateStr) {
    return this.dailyLogsMap.get(dateStr) || null;
  }

  setProgress(p) { this.progress = p; }
  getProgress() { return this.progress; }

  setPhotos(list) { this.photos = list; }
  getPhotos() { return this.photos || []; }

  setChatHistory(list) { this.chatHistory = list; }
  getChatHistory() { return this.chatHistory || []; }

  setSetting(key, val) { this.settings[key] = val; }
  getSetting(key) { return this.settings[key]; }
}

export const appState = new AppStateStore();

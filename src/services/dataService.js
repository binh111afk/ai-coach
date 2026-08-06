import { dbManager } from './db.js';
import { calculateBMR, calculateTDEE, calculateTargetCalories, calculateMacros, calculateWaterTarget, getLevelInfo, BADGES } from './gamificationService.js';
import { CONFIG } from '../config.js';

export const DataService = {
  // Helper date string YYYY-MM-DD
  getTodayString() {
    return new Date().toISOString().split('T')[0];
  },

  // ---------------- USER PROFILE & GOAL ----------------
  async getUserProfile() {
    let user = await dbManager.get('user', 'current_user');
    if (!user) {
      // Default initial profile
      user = {
        id: 'current_user',
        name: 'Chiến Binh Fitness',
        email: 'user@fitness.app',
        gender: 'male',
        age: 25,
        height: 170,
        currentWeight: 70,
        activityLevel: 'moderate',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
        foodAllergies: '',
        isOnboarded: false
      };
      await dbManager.put('user', user);
    }
    return user;
  },

  async saveUserProfile(profile) {
    const updated = { ...profile, id: 'current_user' };
    await dbManager.put('user', updated);
    return updated;
  },

  async getUserGoal() {
    let goal = await dbManager.get('goals', 'current_goal');
    if (!goal) {
      const profile = await this.getUserProfile();
      const bmr = calculateBMR(profile.gender, profile.currentWeight, profile.height, profile.age);
      const tdee = calculateTDEE(bmr, profile.activityLevel);
      const targetCalObj = calculateTargetCalories(tdee, profile.currentWeight, profile.currentWeight - 5, 60);
      const macros = calculateMacros(targetCalObj.targetCalories);
      const water = calculateWaterTarget(profile.currentWeight, profile.activityLevel);

      goal = {
        id: 'current_goal',
        startWeight: profile.currentWeight,
        targetWeight: profile.currentWeight - 5,
        startDate: this.getTodayString(),
        targetDate: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
        dailyCalorieTarget: targetCalObj.targetCalories,
        macroTarget: macros,
        waterTarget: water,
        bmr,
        tdee
      };
      await dbManager.put('goals', goal);
    }
    return goal;
  },

  async saveUserGoal(goal) {
    const updated = { ...goal, id: 'current_goal' };
    await dbManager.put('goals', updated);
    return updated;
  },

  // ---------------- USER PLAN (7-DAY MEAL BUDGET & WORKOUT ROUTINE) ----------------
  async getUserPlan() {
    let plan = await dbManager.get('goals', 'current_plan');
    if (!plan) {
      const today = this.getTodayString();
      const weeklyMealPlan = generate7DayMealPlan(100000, today);
      const workoutType = 'home';
      const homeEquipment = 'Thảm yoga, Dây kháng lực, Tạ đơn 5kg';
      const weeklyWorkoutRoutine = generate7DayWorkoutRoutine(workoutType, homeEquipment);

      plan = {
        id: 'current_plan',
        dailyBudgetVnd: 100000,
        workoutType,
        homeEquipment,
        createdAt: today,
        weeklyMealPlan,
        weeklyWorkoutRoutine
      };
      await dbManager.put('goals', plan);
    }
    return plan;
  },

  async saveUserPlan(plan) {
    const updated = { ...plan, id: 'current_plan' };
    await dbManager.put('goals', updated);
    return updated;
  },

  // ---------------- DAILY LOGS ----------------
  async getDailyLog(dateStr = this.getTodayString()) {
    let log = await dbManager.get('daily_logs', dateStr);
    if (!log) {
      const goal = await this.getUserGoal();
      log = {
        date: dateStr,
        weight: null,
        meals: [],
        workouts: [],
        waterIntake: 0,
        checklist: [
          { id: 'task_protein', task: `Nạp đủ ${goal.macroTarget?.protein || 120}g Protein`, done: false },
          { id: 'task_water', task: `Uống đủ ${((goal.waterTarget || 2500) / 1000).toFixed(1)}L nước`, done: false },
          { id: 'task_workout', task: 'Tập luyện 30 phút hoặc 8000 bước chân', done: false },
          { id: 'task_photo', task: 'Chụp 1 ảnh tiến trình cơ thể', done: false }
        ],
        xpEarned: 0,
        isRestDay: false
      };
      await dbManager.put('daily_logs', log);
    }
    return log;
  },

  async saveDailyLog(log) {
    await dbManager.put('daily_logs', log);
    await this.reevaluateDailyXP(log.date);
    return log;
  },

  async addMealLog(dateStr, meal) {
    const log = await this.getDailyLog(dateStr);
    const newMeal = {
      id: 'meal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ...meal
    };
    log.meals.push(newMeal);
    await this.saveDailyLog(log);
    return log;
  },

  async removeMealLog(dateStr, mealId) {
    const log = await this.getDailyLog(dateStr);
    log.meals = log.meals.filter(m => m.id !== mealId);
    await this.saveDailyLog(log);
    return log;
  },

  async addWorkoutLog(dateStr, workout) {
    const log = await this.getDailyLog(dateStr);
    const newWorkout = {
      id: 'workout_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ...workout
    };
    log.workouts.push(newWorkout);
    log.isRestDay = false; // Marking active workout
    await this.saveDailyLog(log);
    return log;
  },

  async removeWorkoutLog(dateStr, workoutId) {
    const log = await this.getDailyLog(dateStr);
    log.workouts = log.workouts.filter(w => w.id !== workoutId);
    await this.saveDailyLog(log);
    return log;
  },

  async toggleRestDay(dateStr) {
    const log = await this.getDailyLog(dateStr);
    log.isRestDay = !log.isRestDay;
    await this.saveDailyLog(log);
    return log;
  },

  async addWaterIntake(dateStr, amountMl) {
    const log = await this.getDailyLog(dateStr);
    log.waterIntake = Math.max(0, (log.waterIntake || 0) + amountMl);
    
    // Auto tick water checklist task if completed
    const goal = await this.getUserGoal();
    if (log.waterIntake >= (goal.waterTarget || 2500)) {
      const waterTask = log.checklist.find(t => t.id === 'task_water');
      if (waterTask) waterTask.done = true;
    }
    
    await this.saveDailyLog(log);
    return log;
  },

  async resetWaterIntake(dateStr = this.getTodayString()) {
    const log = await this.getDailyLog(dateStr);
    log.waterIntake = 0;
    const waterTask = log.checklist.find(t => t.id === 'task_water');
    if (waterTask) waterTask.done = false;
    await this.saveDailyLog(log);
    return log;
  },

  async toggleChecklistItem(dateStr, taskId) {
    const log = await this.getDailyLog(dateStr);
    const item = log.checklist.find(t => t.id === taskId);
    if (item) {
      item.done = !item.done;
      await this.saveDailyLog(log);
    }
    return log;
  },

  async addChecklistItem(dateStr, taskText) {
    const log = await this.getDailyLog(dateStr);
    const newItem = {
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      task: taskText,
      done: false
    };
    log.checklist.push(newItem);
    await this.saveDailyLog(log);
    return log;
  },

  async deleteChecklistItem(dateStr, taskId) {
    const log = await this.getDailyLog(dateStr);
    log.checklist = log.checklist.filter(t => t.id !== taskId);
    await this.saveDailyLog(log);
    return log;
  },

  async addChecklistItem(dateStr, taskTitle) {
    const log = await this.getDailyLog(dateStr);
    log.checklist.push({
      id: 'custom_' + Date.now(),
      task: taskTitle,
      done: false
    });
    await this.saveDailyLog(log);
    return log;
  },

  async updateWeightLog(dateStr, weightKg) {
    const log = await this.getDailyLog(dateStr);
    log.weight = parseFloat(weightKg);
    await this.saveDailyLog(log);

    // Also update user currentWeight
    const profile = await this.getUserProfile();
    profile.currentWeight = parseFloat(weightKg);
    await this.saveUserProfile(profile);

    return log;
  },

  // ---------------- GAMIFICATION & XP ----------------
  async getUserProgress() {
    let progress = await dbManager.get('user_progress', 'current_progress');
    if (!progress) {
      progress = {
        id: 'current_progress',
        level: 1,
        totalXp: 0,
        currentStreak: 1,
        longestStreak: 1,
        lastLoggedDate: this.getTodayString(),
        badges: ['first_step']
      };
      await dbManager.put('user_progress', progress);
    }
    return progress;
  },

  async reevaluateDailyXP(dateStr) {
    const log = await dbManager.get('daily_logs', dateStr);
    const goal = await this.getUserGoal();
    if (!log || !goal) return;

    let earnedXP = 0;
    const totalMealCal = log.meals.reduce((sum, m) => sum + (m.calories || 0), 0);
    const totalProtein = log.meals.reduce((sum, m) => sum + (m.protein || 0), 0);
    const calTarget = goal.dailyCalorieTarget || 2000;
    const proteinTarget = goal.macroTarget?.protein || 120;

    // 1. Hit calorie target within +/- 15%
    if (totalMealCal > 0 && Math.abs(totalMealCal - calTarget) <= calTarget * 0.15) {
      earnedXP += CONFIG.XP_RULES.MEAL_TARGET;
    }
    // 2. Protein target hit
    if (totalProtein >= proteinTarget) {
      earnedXP += CONFIG.XP_RULES.PROTEIN_TARGET;
    }
    // 3. Water target hit
    if ((log.waterIntake || 0) >= (goal.waterTarget || 2500)) {
      earnedXP += CONFIG.XP_RULES.WATER_TARGET;
    }
    // 4. Workout or active rest day
    if (log.workouts.length > 0 || log.isRestDay) {
      earnedXP += CONFIG.XP_RULES.WORKOUT_COMPLETE;
    }
    // 5. Checklist completion
    const doneTasks = log.checklist.filter(t => t.done).length;
    if (log.checklist.length > 0 && doneTasks === log.checklist.length) {
      earnedXP += CONFIG.XP_RULES.CHECKLIST_FULL;
    }

    const xpDiff = earnedXP - (log.xpEarned || 0);
    log.xpEarned = earnedXP;
    await dbManager.put('daily_logs', log);

    if (xpDiff !== 0) {
      const progress = await this.getUserProgress();
      progress.totalXp = Math.max(0, (progress.totalXp || 0) + xpDiff);
      const levelInfo = getLevelInfo(progress.totalXp);
      progress.level = levelInfo.currentLevel.level;

      // Unlock badges
      if (progress.level >= 5 && !progress.badges.includes('level_5')) progress.badges.push('level_5');
      if (progress.level >= 10 && !progress.badges.includes('level_10')) progress.badges.push('level_10');
      if ((log.waterIntake || 0) >= 3000 && !progress.badges.includes('hydration_hero')) progress.badges.push('hydration_hero');
      if (totalProtein >= 140 && !progress.badges.includes('protein_king')) progress.badges.push('protein_king');

      await dbManager.put('user_progress', progress);
    }
  },

  // ---------------- PHOTO VAULT ----------------
  async getPhotos() {
    const photos = await dbManager.getAll('photos');
    // Clear legacy demo photos if present
    const realPhotos = photos.filter(p => !p.id.startsWith('photo_demo_'));
    if (realPhotos.length !== photos.length) {
      for (const p of photos) {
        if (p.id.startsWith('photo_demo_')) {
          await dbManager.delete('photos', p.id);
        }
      }
    }
    return realPhotos.sort((a, b) => new Date(a.date) - new Date(b.date));
  },

  async addPhoto(photoDataUrl, weight = null, note = '') {
    const today = this.getTodayString();
    const photoItem = {
      id: 'photo_' + Date.now(),
      date: today,
      weight: weight || (await this.getUserProfile()).currentWeight,
      photoDataUrl,
      note,
      createdAt: new Date().toISOString()
    };
    await dbManager.put('photos', photoItem);

    // Auto mark photo task in checklist
    const log = await this.getDailyLog(today);
    const photoTask = log.checklist.find(t => t.id === 'task_photo');
    if (photoTask) {
      photoTask.done = true;
      await this.saveDailyLog(log);
    }

    // Badge check
    const allPhotos = await this.getPhotos();
    if (allPhotos.length >= 3) {
      const progress = await this.getUserProgress();
      if (!progress.badges.includes('vault_keeper')) {
        progress.badges.push('vault_keeper');
        await dbManager.put('user_progress', progress);
      }
    }

    return photoItem;
  },

  async deletePhoto(id) {
    await dbManager.delete('photos', id);
  },

  // ---------------- CHAT SESSIONS & HISTORY ----------------
  currentSessionId: null,

  async getCurrentSessionId() {
    if (!this.currentSessionId) {
      const stored = await this.getSetting('current_chat_session');
      this.currentSessionId = stored || 'session_default';
    }
    return this.currentSessionId;
  },

  async setCurrentSessionId(sessionId) {
    this.currentSessionId = sessionId;
    await this.saveSetting('current_chat_session', sessionId);
  },

  async createNewSession() {
    const newSessionId = 'session_' + Date.now();
    await this.setCurrentSessionId(newSessionId);
    return newSessionId;
  },

  async getChatSessions() {
    const msgs = await dbManager.getAll('chat_history');
    if (msgs.length === 0) return [];

    const sessionsMap = {};
    msgs.forEach(m => {
      const sId = m.sessionId || 'session_default';
      if (!sessionsMap[sId]) {
        sessionsMap[sId] = {
          id: sId,
          title: '',
          updatedAt: m.timestamp,
          messages: []
        };
      }
      sessionsMap[sId].messages.push(m);
      if (m.timestamp > sessionsMap[sId].updatedAt) {
        sessionsMap[sId].updatedAt = m.timestamp;
      }
    });

    const sessions = Object.values(sessionsMap).map(s => {
      const firstUserMsg = s.messages.find(m => m.role === 'user');
      let title = firstUserMsg ? firstUserMsg.content.replace(/!\[.*?\]\(.*?\)/g, '[Hình ảnh]').replace(/📄.*?\*\*/g, '[PDF]').trim() : 'Đoạn trò chuyện AI';
      if (title.length > 32) title = title.substring(0, 29) + '...';
      return {
        id: s.id,
        title: title || 'Phiên trò chuyện',
        updatedAt: s.updatedAt,
        messageCount: s.messages.length
      };
    });

    return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  },

  async getChatHistory(targetSessionId) {
    const sId = targetSessionId || await this.getCurrentSessionId();
    const msgs = await dbManager.getAll('chat_history');
    const filtered = msgs.filter(m => (m.sessionId || 'session_default') === sId);
    return filtered.sort((a, b) => a.timestamp - b.timestamp);
  },

  async addChatMessage(msg) {
    const activeSessionId = await this.getCurrentSessionId();
    const item = {
      timestamp: Date.now(),
      sessionId: activeSessionId,
      status: 'none', // 'none', 'pending', 'approved', 'rejected'
      ...msg
    };
    const id = await dbManager.put('chat_history', item);
    item.id = id;
    return item;
  },

  async deleteChatSession(targetSessionId) {
    const msgs = await dbManager.getAll('chat_history');
    const toDelete = msgs.filter(m => (m.sessionId || 'session_default') === targetSessionId);
    for (const m of toDelete) {
      await dbManager.delete('chat_history', m.id);
    }
  },

  async updateChatMessageStatus(id, status) {
    const msg = await dbManager.get('chat_history', id);
    if (msg) {
      msg.status = status;
      await dbManager.put('chat_history', msg);
    }
    return msg;
  },

  // ---------------- APPROVAL FLOW EXECUTION ----------------
  /**
   * Applies a proposed change approved by the user
   */
  async applyProposedChange(proposedChange) {
    if (!proposedChange || !proposedChange.type) return false;

    try {
      switch (proposedChange.type) {
        case 'UPDATE_GOAL': {
          const goal = await this.getUserGoal();
          const { dailyCalorieTarget, waterTarget, macroTarget, targetWeight, targetDate } = proposedChange.payload;
          if (dailyCalorieTarget) goal.dailyCalorieTarget = parseInt(dailyCalorieTarget);
          if (waterTarget) goal.waterTarget = parseInt(waterTarget);
          if (macroTarget) goal.macroTarget = { ...goal.macroTarget, ...macroTarget };
          if (targetWeight) goal.targetWeight = parseFloat(targetWeight);
          if (targetDate) goal.targetDate = targetDate;
          await this.saveUserGoal(goal);
          break;
        }
        case 'LOG_MEAL': {
          const { date, meal } = proposedChange.payload;
          await this.addMealLog(date || this.getTodayString(), meal);
          break;
        }
        case 'LOG_WORKOUT': {
          const { date, workout } = proposedChange.payload;
          await this.addWorkoutLog(date || this.getTodayString(), workout);
          break;
        }
        case 'UPDATE_WATER_GOAL': {
          const goal = await this.getUserGoal();
          goal.waterTarget = parseInt(proposedChange.payload.waterTarget);
          await this.saveUserGoal(goal);
          break;
        }
        case 'GENERATE_CHECKLIST': {
          const { date, checklistItems } = proposedChange.payload;
          const log = await this.getDailyLog(date || this.getTodayString());
          checklistItems.forEach(item => {
            log.checklist.push({
              id: 'ai_' + Date.now() + '_' + Math.random().toString(36).substr(2, 3),
              task: item,
              done: false
            });
          });
          await this.saveDailyLog(log);
          break;
        }
        default:
          console.warn('Unknown proposed change type:', proposedChange.type);
      }
      return true;
    } catch (err) {
      console.error('Error applying proposed change:', err);
      return false;
    }
  },

  // ---------------- SETTINGS & MODEL ----------------
  async getSetting(key) {
    try {
      const item = await dbManager.get('settings', key);
      return item ? item.value : null;
    } catch (e) {
      console.warn('[DataService] getSetting error (store may not exist yet):', e);
      return null;
    }
  },

  async saveSetting(key, value) {
    await dbManager.put('settings', { key, value });
  },

  async getNinerouterApiKey() {
    return CONFIG.NINEROUTER_API_KEY || '';
  },

  async getSelectedModel() {
    const model = await this.getSetting('ninerouter_model');
    return model || CONFIG.DEFAULT_MODEL;
  }
};

export function generate7DayMealPlan(budgetVnd = 100000, startDateStr = new Date().toISOString().split('T')[0], foodAllergiesStr = '') {
  const weekly = {};
  const startDate = new Date(startDateStr);
  const allergies = (foodAllergiesStr || '').toLowerCase();

  const isAllergic = (dishName) => {
    if (!allergies) return false;
    const dish = dishName.toLowerCase();
    return (allergies.includes('hải sản') && (dish.includes('tôm') || dish.includes('mực') || dish.includes('cá') || dish.includes('cua'))) ||
           (allergies.includes('trứng') && dish.includes('trứng')) ||
           (allergies.includes('sữa') && (dish.includes('sữa') || dish.includes('phô mai'))) ||
           (allergies.includes('đậu') && (dish.includes('đậu') || dish.includes('đậu phụ')));
  };

  const sanitizeMeal = (meal) => {
    if (isAllergic(meal.name)) {
      return {
        ...meal,
        name: meal.name.replace(/tôm|mực|cá ngừ|cá hồi|cá thu|chả cá|cua/gi, 'ức gà nạc')
                       .replace(/trứng ốp la|trứng chần|trứng cút|trứng/gi, 'thịt bò áp chảo')
                       .replace(/sữa chua|sữa đậu nành|sữa/gi, 'nước ép táo tươi')
                       .replace(/đậu phụ|đậu nành/gi, 'thịt nạc luộc')
      };
    }
    return meal;
  };

  const mealVariants = [
    {
      breakfast: sanitizeMeal({ name: "2 trứng ốp la + 1 lát bánh mì đen", costVnd: Math.round(budgetVnd * 0.25), calories: 380, protein: 18, carb: 40, fat: 14 }),
      lunch: sanitizeMeal({ name: "150g ức gà áp chảo + 1 bát cơm lứt + rau luộc", costVnd: Math.round(budgetVnd * 0.45), calories: 480, protein: 42, carb: 50, fat: 8 }),
      dinner: sanitizeMeal({ name: "150g cá thu nướng / thịt nạc + canh rau mồng tơi", costVnd: Math.round(budgetVnd * 0.25), calories: 420, protein: 36, carb: 20, fat: 12 }),
      snack: sanitizeMeal({ name: "1 quả chuối tiêu + 1 hũ sữa chua không đường", costVnd: Math.round(budgetVnd * 0.05), calories: 150, protein: 6, carb: 30, fat: 1 })
    },
    {
      breakfast: sanitizeMeal({ name: "1 bát phở gà nạc kho gừng", costVnd: Math.round(budgetVnd * 0.30), calories: 420, protein: 28, carb: 45, fat: 10 }),
      lunch: sanitizeMeal({ name: "150g thăn bò xào cần tây + 1 bát cơm lứt", costVnd: Math.round(budgetVnd * 0.40), calories: 510, protein: 40, carb: 48, fat: 14 }),
      dinner: sanitizeMeal({ name: "150g tôm hấp sả + canh bí đao thịt nạc", costVnd: Math.round(budgetVnd * 0.25), calories: 390, protein: 38, carb: 18, fat: 8 }),
      snack: sanitizeMeal({ name: "1 ly sinh tố bơ / dâu tây ít đường", costVnd: Math.round(budgetVnd * 0.05), calories: 160, protein: 4, carb: 22, fat: 6 })
    },
    {
      breakfast: sanitizeMeal({ name: "Bún chả cá nướng nhẹ dầu", costVnd: Math.round(budgetVnd * 0.25), calories: 390, protein: 24, carb: 42, fat: 11 }),
      lunch: sanitizeMeal({ name: "200g cá hồi / cá diêu hồng hấp + đĩa rau củ luộc", costVnd: Math.round(budgetVnd * 0.45), calories: 490, protein: 44, carb: 30, fat: 16 }),
      dinner: sanitizeMeal({ name: "150g ức gà luộc + canh chua nấm thịt băm", costVnd: Math.round(budgetVnd * 0.25), calories: 400, protein: 40, carb: 15, fat: 9 }),
      snack: sanitizeMeal({ name: "1 nắm hạt hạnh nhân (25g)", costVnd: Math.round(budgetVnd * 0.05), calories: 160, protein: 6, carb: 6, fat: 14 })
    },
    {
      breakfast: sanitizeMeal({ name: "Cháo yến mạch thịt băm + trứng chần", costVnd: Math.round(budgetVnd * 0.25), calories: 360, protein: 22, carb: 38, fat: 9 }),
      lunch: sanitizeMeal({ name: "150g thịt lợn thăn luộc + cơm khoai lang", costVnd: Math.round(budgetVnd * 0.40), calories: 470, protein: 38, carb: 45, fat: 11 }),
      dinner: sanitizeMeal({ name: "150g mực xào ớt chuông + canh cải béc xanh", costVnd: Math.round(budgetVnd * 0.30), calories: 380, protein: 35, carb: 20, fat: 7 }),
      snack: sanitizeMeal({ name: "1 quả táo đỏ / lê tươi", costVnd: Math.round(budgetVnd * 0.05), calories: 95, protein: 1, carb: 25, fat: 0 })
    },
    {
      breakfast: sanitizeMeal({ name: "2 bánh bao nhân thịt nạc trứng cút", costVnd: Math.round(budgetVnd * 0.25), calories: 400, protein: 20, carb: 50, fat: 12 }),
      lunch: sanitizeMeal({ name: "150g đùi gà bỏ da nướng + cơm lứt & bông cải xanh", costVnd: Math.round(budgetVnd * 0.40), calories: 520, protein: 45, carb: 45, fat: 14 }),
      dinner: sanitizeMeal({ name: "150g thịt nạc ram mặn nhẹ + canh cua rau đét", costVnd: Math.round(budgetVnd * 0.30), calories: 410, protein: 34, carb: 22, fat: 13 }),
      snack: sanitizeMeal({ name: "1 ly sữa đậu nành không đường", costVnd: Math.round(budgetVnd * 0.05), calories: 110, protein: 8, carb: 10, fat: 4 })
    },
    {
      breakfast: sanitizeMeal({ name: "Omelette 2 trứng + nấm & cà chua", costVnd: Math.round(budgetVnd * 0.25), calories: 340, protein: 19, carb: 15, fat: 16 }),
      lunch: sanitizeMeal({ name: "150g bò lúc lắc sốt tiêu + 1 bát cơm lứt", costVnd: Math.round(budgetVnd * 0.45), calories: 530, protein: 42, carb: 48, fat: 17 }),
      dinner: sanitizeMeal({ name: "150g cá ngừ sốt cà chua + canh măng chua", costVnd: Math.round(budgetVnd * 0.25), calories: 390, protein: 37, carb: 18, fat: 9 }),
      snack: sanitizeMeal({ name: "1 hũ sữa chua nếp cẩm ít đường", costVnd: Math.round(budgetVnd * 0.05), calories: 140, protein: 5, carb: 24, fat: 3 })
    },
    {
      breakfast: sanitizeMeal({ name: "Mì chùm ngây xào thịt bò nạc", costVnd: Math.round(budgetVnd * 0.30), calories: 440, protein: 29, carb: 48, fat: 13 }),
      lunch: sanitizeMeal({ name: "200g tôm rim nhạt + canh bầu nấu tôm", costVnd: Math.round(budgetVnd * 0.40), calories: 460, protein: 45, carb: 25, fat: 7 }),
      dinner: sanitizeMeal({ name: "150g ức gà áp chảo sốt chanh dây + salad củ quả", costVnd: Math.round(budgetVnd * 0.25), calories: 410, protein: 41, carb: 18, fat: 10 }),
      snack: sanitizeMeal({ name: "1 quả chuối tiêu + 5 hạt óc chó", costVnd: Math.round(budgetVnd * 0.05), calories: 170, protein: 4, carb: 24, fat: 8 })
    }
  ];

  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = new Intl.DateTimeFormat('vi-VN', { weekday: 'long' }).format(d);

    weekly[dateStr] = {
      date: dateStr,
      dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
      formattedDate: new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d),
      ...mealVariants[i % 7]
    };
  }

  return weekly;
}

export function generate7DayWorkoutRoutine(workoutType = 'home', homeEquipment = 'Dây kháng lực, Tạ đơn') {
  const equipStr = homeEquipment ? ` (Dụng cụ: ${homeEquipment})` : '';

  if (workoutType === 'gym') {
    return [
      { day: "Thứ 2", title: "Chest & Triceps (Ngực & Tay Sau Phòng Gym)", duration: 55, estBurn: 400, type: "Resistive", youtubeUrl: "https://www.youtube.com/embed/gC_L9qAHVJ8", instructions: "1. Bench Press đòn tạ: 4 sets x 10 reps.\n2. Incline Dumbbell Press: 3 sets x 12 reps.\n3. Cable Flyes ép ngực dây cáp: 3 sets x 15 reps.\n4. Triceps Pushdown cáp tay sau: 4 sets x 12 reps." },
      { day: "Thứ 3", title: "Back & Biceps (Lưng Xô & Tay Trước Phòng Gym)", duration: 55, estBurn: 420, type: "Resistive", youtubeUrl: "https://www.youtube.com/embed/c8N-g6l7xWg", instructions: "1. Lat Pulldown kéo xô: 4 sets x 10 reps.\n2. Barbell Bent-over Row: 4 sets x 10 reps.\n3. Cable Seated Row: 3 sets x 12 reps.\n4. Barbell Biceps Curl: 4 sets x 12 reps." },
      { day: "Thứ 4", title: "Legs & Abs (Gánh Tạ Đùi, Mông, Bụng)", duration: 60, estBurn: 480, type: "Resistive", youtubeUrl: "https://www.youtube.com/embed/X0xtbQJbETo", instructions: "1. Barbell Squat gánh tạ: 4 sets x 10 reps.\n2. Leg Press đạp đùi: 4 sets x 12 reps.\n3. Romanian Deadlift đùi sau: 3 sets x 10 reps.\n4. Cable Crunch gập bụng dây cáp: 4 sets x 15 reps." },
      { day: "Thứ 5", title: "Cardio Máy Elliptical / Chạy Thảm Gym", duration: 35, estBurn: 320, type: "HIIT", youtubeUrl: "https://www.youtube.com/embed/ml6cT4AZdqI", instructions: "1. Khởi động 5 phút đi bộ.\n2. Chạy dốc tốc độ 8-10 km/h: 25 phút.\n3. Dãn cơ đùi & hít thở." },
      { day: "Thứ 6", title: "Shoulders & Arms (Vai & Tay Phòng Gym)", duration: 50, estBurn: 380, type: "Resistive", youtubeUrl: "https://www.youtube.com/embed/gC_L9qAHVJ8", instructions: "1. Dumbbell Shoulder Press đẩy vai: 4 sets x 10 reps.\n2. Lateral Raises nâng vai ngang: 4 sets x 15 reps.\n3. Cable Face Pulls vai sau: 3 sets x 15 reps.\n4. Hammer Curls tay trước: 3 sets x 12 reps." },
      { day: "Thứ 7", title: "Full Body Functional Gym Routine", duration: 45, estBurn: 390, type: "Resistive", youtubeUrl: "https://www.youtube.com/embed/kv6HkipXC8I", instructions: "1. Kettlebell Swings: 4 sets x 20 reps.\n2. Dumbbell Lunges: 3 sets x 12 reps.\n3. Plank nâng tạ: 3 sets x 10 reps." },
      { day: "Chủ Nhật", title: "Nghỉ Ngơi & Sauna Phục Hồi", duration: 0, estBurn: 0, type: "Rest", youtubeUrl: "https://www.youtube.com/embed/v7AYKMP6rOE", instructions: "Nghỉ ngơi hoàn toàn chuẩn bị thể lực cho tuần tập luyện đỉnh cao mới!" }
    ];
  } else if (workoutType === 'outdoor') {
    return [
      { day: "Thứ 2", title: "Chạy Bộ Outdoor & Đi Bộ Nhịp Điệu", duration: 45, estBurn: 360, type: "Cardio", youtubeUrl: "https://www.youtube.com/embed/kv6HkipXC8I", instructions: "1. Đi bộ khởi động 5 phút.\n2. Chạy bộ 35 phút duy trì nhịp tim zone 2.\n3. Đi bộ hạ nhiệt & dãn cơ chân." },
      { day: "Thứ 3", title: "Calisthenics Công Viên (Xà Đơn, Xà Kép)", duration: 40, estBurn: 330, type: "Resistive", youtubeUrl: "https://www.youtube.com/embed/gC_L9qAHVJ8", instructions: "1. Hít xà đơn công viên: 4 sets x 8 reps.\n2. Chống đẩy xà kép Dips: 4 sets x 10 reps.\n3. Chống đẩy nghiêng trên ghế đá: 3 sets x 15 reps." },
      { day: "Thứ 4", title: "Chạy Bứt Tốc Sprint HIIT Outdoor", duration: 30, estBurn: 340, type: "HIIT", youtubeUrl: "https://www.youtube.com/embed/ml6cT4AZdqI", instructions: "1. Khởi động khớp cổ chân 5 phút.\n2. Chạy nước rút 100m x 8 hiệp (nghỉ 45s giữa mỗi hiệp).\n3. Tả lỏng và dãn cơ đùi." },
      { day: "Thứ 5", title: "Nghỉ Phục Hồi & Tản Bộ Công Viên", duration: 30, estBurn: 150, type: "Rest", youtubeUrl: "https://www.youtube.com/embed/v7AYKMP6rOE", instructions: "Tản bộ nhẹ nhàng dưới bóng cây và hít thở không khí tự nhiên." },
      { day: "Thứ 6", title: "Calisthenics Đùi Mông & Core Outdoor", duration: 45, estBurn: 350, type: "Resistive", youtubeUrl: "https://www.youtube.com/embed/X0xtbQJbETo", instructions: "1. Jump Squat bật nhảy: 4 sets x 15 reps.\n2. Walking Lunges bước đi: 3 sets x 20 bước.\n3. Plank cỏ công viên: 4 sets x 60 giây." },
      { day: "Thứ 7", title: "Đạp Xe Thể Thao Outdoor 10km", duration: 60, estBurn: 420, type: "Cardio", youtubeUrl: "https://www.youtube.com/embed/kv6HkipXC8I", instructions: "Đạp xe ngắm cảnh 15-20 km/h trong 60 phút." },
      { day: "Chủ Nhật", title: "Nghỉ Ngơi Phục Hồi", duration: 0, estBurn: 0, type: "Rest", youtubeUrl: "https://www.youtube.com/embed/v7AYKMP6rOE", instructions: "Nghỉ ngơi hoàn toàn." }
    ];
  } else {
    // Home workout tailored to homeEquipment
    return [
      { day: "Thứ 2", title: `Upper Body Tại Nhà${equipStr}`, duration: 45, estBurn: 320, type: "Resistive", youtubeUrl: "https://www.youtube.com/embed/gC_L9qAHVJ8", instructions: `1. Khởi động 5 phút với ${homeEquipment.includes('Thảm') ? 'thảm yoga' : 'vận động tự do'}.\n2. Chống đẩy (Push-ups): 4 sets x 12 reps.\n3. Đẩy tạ đơn / kéo dây kháng lực: 4 sets x 15 reps.\n4. Gập bụng & Plank 60 giây.` },
      { day: "Thứ 3", title: `Cardio HIIT Đốt Mỡ Tại Nhà${equipStr}`, duration: 30, estBurn: 280, type: "HIIT", youtubeUrl: "https://www.youtube.com/embed/ml6cT4AZdqI", instructions: "1. Jumping Jacks 3 phút.\n2. Burpees: 45s tập, 15s nghỉ x 4 vòng.\n3. Mountain Climbers: 45s x 4 vòng.\n4. High Knees nâng cao đùi: 45s x 4 vòng." },
      { day: "Thứ 4", title: `Lower Body (Squat, Đùi, Mông) Tại Nhà${equipStr}`, duration: 45, estBurn: 350, type: "Resistive", youtubeUrl: "https://www.youtube.com/embed/X0xtbQJbETo", instructions: `1. Goblet Squat với tạ/chai nước: 4 sets x 15 reps.\n2. Lunges bước gập gối: 3 sets x 12 reps.\n3. Glute Bridge trên ${homeEquipment.includes('Thảm') ? 'thảm' : 'sàn'}: 4 sets x 15 reps.` },
      { day: "Thứ 5", title: "Nghỉ Phục Hồi & Yoga Dãn Cơ Tại Nhà", duration: 25, estBurn: 120, type: "Rest", youtubeUrl: "https://www.youtube.com/embed/v7AYKMP6rOE", instructions: "1. Hít thở sâu bụng 5 phút.\n2. Tư thế Em bé (Child's Pose) 2 phút.\n3. Dãn cơ đùi & lưng." },
      { day: "Thứ 6", title: `Pull & Lưng Xô Tay Trước Tại Nhà${equipStr}`, duration: 45, estBurn: 330, type: "Resistive", youtubeUrl: "https://www.youtube.com/embed/c8N-g6l7xWg", instructions: `1. Kéo dây kháng lực / Hít xà: 4 sets x 12 reps.\n2. Biceps Curls cuốn tay trước: 4 sets x 12 reps.\n3. Bent-over Row gập người nâng tạ: 3 sets x 15 reps.` },
      { day: "Thứ 7", title: "Chạy Nhảy Dây & Cardio Nhà", duration: 35, estBurn: 300, type: "Cardio", youtubeUrl: "https://www.youtube.com/embed/kv6HkipXC8I", instructions: "1. Nhảy dây 500 cái hoặc nhảy tự do 20 phút.\n2. Đi bộ hạ nhiệt 5 phút." },
      { day: "Chủ Nhật", title: "Nghỉ Ngơi Phục Hồi", duration: 0, estBurn: 0, type: "Rest", youtubeUrl: "https://www.youtube.com/embed/v7AYKMP6rOE", instructions: "Nghỉ ngơi hoàn toàn." }
    ];
  }
}




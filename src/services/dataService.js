import { dbManager } from './db.js';
import { appState } from './appState.js';
import { calculateBMR, calculateTDEE, calculateTargetCalories, calculateMacros, calculateWaterTarget, getLevelInfo, BADGES, checkAndUnlockBadges } from './gamificationService.js';
import { CONFIG } from '../config.js';

async function compressImageBase64(dataUrl, maxWidth = 800, quality = 0.75) {
  if (!dataUrl || typeof window === 'undefined' || !dataUrl.startsWith('data:image')) return dataUrl;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (img.width <= maxWidth) {
        resolve(dataUrl);
        return;
      }
      const scale = maxWidth / img.width;
      const canvas = document.createElement('canvas');
      canvas.width = maxWidth;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export const DataService = {
  // Helper date string YYYY-MM-DD (local time)
  getTodayString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Helper to parse YYYY-MM-DD string to local midnight Date object (avoids UTC offset shifts)
   */
  parseLocalDate(str) {
    if (!str) return new Date();
    const parts = str.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  },

  /**
   * Calculates current journey day (1-based) accurately using local calendar dates
   */
  calculateCurrentJourneyDay(startDateStr) {
    if (!startDateStr) return 1;
    const start = this.parseLocalDate(startDateStr);
    const today = this.parseLocalDate(this.getTodayString());
    const diffTime = today.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));
    return Math.max(1, diffDays + 1);
  },

  /**
   * Formats a journey day index back to YYYY-MM-DD string without UTC shift
   */
  getDateStrForJourneyDay(startDateStr, journeyDay = 1) {
    if (!startDateStr) return this.getTodayString();
    const start = this.parseLocalDate(startDateStr);
    start.setDate(start.getDate() + (journeyDay - 1));
    const yyyy = start.getFullYear();
    const mm = String(start.getMonth() + 1).padStart(2, '0');
    const dd = String(start.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  },

  /**
   * Evaluates and updates user consecutive streak based on login/activity date.
   */
  async checkAndUpdateStreak(progress) {
    if (!progress) return progress;
    const todayStr = this.getTodayString();

    if (!progress.lastLoggedDate) {
      progress.lastLoggedDate = todayStr;
      progress.currentStreak = 1;
      progress.longestStreak = Math.max(progress.longestStreak || 1, 1);
      await dbManager.put('user_progress', progress);
      return progress;
    }

    if (progress.lastLoggedDate === todayStr) {
      return progress;
    }

    // Parse YYYY-MM-DD string to local midnight Date object for accurate calendar day diff
    const parseLocalDate = (str) => {
      const parts = str.split('-').map(Number);
      return new Date(parts[0], parts[1] - 1, parts[2]);
    };

    const lastDate = parseLocalDate(progress.lastLoggedDate);
    const todayDate = parseLocalDate(todayStr);
    const diffTime = todayDate.getTime() - lastDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

    let updated = false;

    if (diffDays === 1) {
      // Consecutive day visit/activity!
      progress.currentStreak = (progress.currentStreak || 0) + 1;
      progress.longestStreak = Math.max(progress.longestStreak || 1, progress.currentStreak);
      progress.lastLoggedDate = todayStr;
      updated = true;
    } else if (diffDays > 1) {
      // Check if yesterday had actual logs before resetting streak
      const yesterday = new Date(todayDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const yyyy = yesterday.getFullYear();
      const mm = String(yesterday.getMonth() + 1).padStart(2, '0');
      const dd = String(yesterday.getDate()).padStart(2, '0');
      const yesterdayStr = `${yyyy}-${mm}-${dd}`;

      const yesterdayLog = await dbManager.get('daily_logs', yesterdayStr);
      const hasYesterdayActivity = yesterdayLog && (
        (yesterdayLog.meals && yesterdayLog.meals.length > 0) ||
        (yesterdayLog.workouts && yesterdayLog.workouts.length > 0) ||
        (yesterdayLog.waterIntake && yesterdayLog.waterIntake > 0) ||
        (yesterdayLog.checklist && yesterdayLog.checklist.some(t => t.done))
      );

      if (hasYesterdayActivity) {
        progress.currentStreak = (progress.currentStreak || 0) + 1;
        progress.longestStreak = Math.max(progress.longestStreak || 1, progress.currentStreak);
        progress.lastLoggedDate = todayStr;
      } else {
        // Reset streak to 1
        progress.currentStreak = 1;
        progress.lastLoggedDate = todayStr;
      }
      updated = true;
    } else if (diffDays < 0) {
      // Date moved backwards (e.g. system clock change or UTC edge case), sync date
      progress.lastLoggedDate = todayStr;
      updated = true;
    }

    if (updated) {
      await dbManager.put('user_progress', progress);
    }

    return progress;
  },

  async preloadAllData() {
    const today = this.getTodayString();
    const [profile, goal, plan, progress, dailyLog, photos] = await Promise.all([
      this.getUserProfile(true),
      this.getUserGoal(true),
      this.getUserPlan(true),
      this.getUserProgress(true),
      this.getDailyLog(today, true),
      this.getPhotos(true)
    ]);
    appState.setProfile(profile);
    appState.setGoal(goal);
    appState.setPlan(plan);
    appState.setProgress(progress);
    appState.setDailyLog(today, dailyLog);
    appState.setPhotos(photos);
    appState.isInitialized = true;
  },

  // ---------------- USER PROFILE & GOAL ----------------
  async getUserProfile(bypassCache = false) {
    if (!bypassCache && appState.getProfile()) {
      return appState.getProfile();
    }
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
    appState.setProfile(user);
    return user;
  },

  async saveUserProfile(profile) {
    if (profile.avatar && profile.avatar.startsWith('data:image')) {
      profile.avatar = await compressImageBase64(profile.avatar, 400, 0.7);
    }
    const updated = { ...profile, id: 'current_user' };
    appState.setProfile(updated);
    await dbManager.put('user', updated);
    return updated;
  },

  async getUserGoal(bypassCache = false) {
    if (!bypassCache && appState.getGoal()) {
      return appState.getGoal();
    }
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
        totalJourneyDays: 60,
        targetDays: 60,
        dailyCalorieTarget: targetCalObj.targetCalories,
        macroTarget: macros,
        waterTarget: water,
        bmr,
        tdee
      };
      await dbManager.put('goals', goal);
    } else {
      // Auto-migrate legacy goals missing totalJourneyDays
      if (!goal.totalJourneyDays && !goal.targetDays) {
        if (goal.targetDate && goal.startDate) {
          const start = new Date(goal.startDate).getTime();
          const target = new Date(goal.targetDate).getTime();
          const diff = Math.max(10, Math.round((target - start) / 86400000));
          goal.totalJourneyDays = diff;
          goal.targetDays = diff;
        } else {
          goal.totalJourneyDays = 60;
          goal.targetDays = 60;
        }
        await dbManager.put('goals', goal);
      }
    }
    appState.setGoal(goal);
    return goal;
  },

  async saveUserGoal(goal) {
    const updated = { ...goal, id: 'current_goal' };
    appState.setGoal(updated);
    await dbManager.put('goals', updated);
    return updated;
  },

  // ---------------- USER PLAN (7-DAY MEAL BUDGET & WORKOUT ROUTINE) ----------------
  async getUserPlan(bypassCache = false) {
    if (!bypassCache && appState.getPlan()) {
      return appState.getPlan();
    }
    let plan = await dbManager.get('goals', 'current_plan');
    const profile = await this.getUserProfile();
    const allergies = profile.foodAllergies || '';

    if (!plan) {
      const today = this.getTodayString();
      const weeklyMealPlan = generate7DayMealPlan(100000, today, allergies);
      const workoutType = 'home';
      const homeEquipment = 'Thảm yoga, Dây kháng lực, Tạ đơn 5kg';
      const weeklyWorkoutRoutine = generate7DayWorkoutRoutine(workoutType, homeEquipment);
      const goal = await this.getUserGoal();
      const totalDays = goal.totalJourneyDays || goal.targetDays || 60;
      const journeyPhases = generateFullJourneyPhases(totalDays, 100000, workoutType, homeEquipment, allergies);

      plan = {
        id: 'current_plan',
        dailyBudgetVnd: 100000,
        workoutType,
        homeEquipment,
        createdAt: today,
        weeklyMealPlan,
        weeklyWorkoutRoutine,
        journeyPhases
      };
      await dbManager.put('goals', plan);
    } else if (allergies) {
      // Auto-sanitize existing plan if profile has foodAllergies
      let modified = false;
      if (plan.journeyPhases && plan.journeyPhases.length > 0) {
        plan.journeyPhases = plan.journeyPhases.map(phase => {
          const sanitizedMealPlan = {};
          Object.entries(phase.weeklyMealPlan || {}).forEach(([dayKey, dayData]) => {
            if (!dayData) return;
            sanitizedMealPlan[dayKey] = {
              ...dayData,
              breakfast: dayData.breakfast ? sanitizeMealItem(dayData.breakfast, allergies) : null,
              lunch: dayData.lunch ? sanitizeMealItem(dayData.lunch, allergies) : null,
              dinner: dayData.dinner ? sanitizeMealItem(dayData.dinner, allergies) : null,
              snack: dayData.snack ? sanitizeMealItem(dayData.snack, allergies) : null,
            };
          });
          return { ...phase, weeklyMealPlan: sanitizedMealPlan };
        });
        modified = true;
      }
      if (plan.weeklyMealPlan) {
        const sanitizedMealPlan = {};
        Object.entries(plan.weeklyMealPlan).forEach(([dayKey, dayData]) => {
          if (!dayData) return;
          sanitizedMealPlan[dayKey] = {
            ...dayData,
            breakfast: dayData.breakfast ? sanitizeMealItem(dayData.breakfast, allergies) : null,
            lunch: dayData.lunch ? sanitizeMealItem(dayData.lunch, allergies) : null,
            dinner: dayData.dinner ? sanitizeMealItem(dayData.dinner, allergies) : null,
            snack: dayData.snack ? sanitizeMealItem(dayData.snack, allergies) : null,
          };
        });
        plan.weeklyMealPlan = sanitizedMealPlan;
        modified = true;
      }
      if (modified) {
        await dbManager.put('goals', plan);
      }
    }
    appState.setPlan(plan);
    return plan;
  },

  async saveUserPlan(plan) {
    const updated = { ...plan, id: 'current_plan' };
    appState.setPlan(updated);
    await dbManager.put('goals', updated);
    return updated;
  },

  // ---------------- DAILY LOGS ----------------
  async getDailyLog(dateStr = this.getTodayString(), bypassCache = false) {
    if (!bypassCache && appState.getDailyLog(dateStr)) {
      return appState.getDailyLog(dateStr);
    }
    let log = await dbManager.get('daily_logs', dateStr);
    if (!log) {
      const goal = await this.getUserGoal();
      const plan = await this.getUserPlan();

      // Calculate current journeyDay (1-based) from startDate
      let journeyDay = 1;
      if (goal.startDate) {
        const start = new Date(goal.startDate);
        const current = new Date(dateStr);
        journeyDay = Math.max(1, Math.floor((current - start) / 86400000) + 1);
      }

      // Pull dailyChecklist from the matching journey phase
      let checklist = null;
      if (plan.journeyPhases && plan.journeyPhases.length > 0) {
        const totalDays = goal.totalJourneyDays || goal.targetDays || 60;
        const { phase } = getPlanForJourneyDay(plan, Math.min(journeyDay, totalDays));
        if (phase && Array.isArray(phase.dailyChecklist) && phase.dailyChecklist.length > 0) {
          // Clone with done: false so each day starts fresh
          checklist = phase.dailyChecklist.map(item => ({
            ...item,
            id: item.id + '_' + dateStr, // unique per day so past days don't conflict
            done: false
          }));
        }
      }

      // Fallback: build default checklist from goal targets
      if (!checklist || checklist.length === 0) {
        const allergyNote = plan.foodAllergies ? ` (né: ${plan.foodAllergies})` : '';
        checklist = [
          { id: `task_water_${dateStr}`,   task: `💧 Uống đủ ${((goal.waterTarget || 2500) / 1000).toFixed(1)}L nước`, done: false },
          { id: `task_calo_${dateStr}`,    task: `🍽️ Ăn đủ ${goal.dailyCalorieTarget || 1800} kcal${allergyNote}`, done: false },
          { id: `task_protein_${dateStr}`, task: `💪 Nạp đủ ${goal.macroTarget?.protein || 120}g Protein`, done: false },
          { id: `task_workout_${dateStr}`, task: `🏋️ Tập luyện theo lịch AI hôm nay`, done: false },
          { id: `task_log_${dateStr}`,     task: `📝 Ghi nhật ký bữa ăn vào AI Coach`, done: false },
          { id: `task_photo_${dateStr}`,   task: `📸 Chụp ảnh tiến trình cơ thể`, done: false },
          { id: `task_sleep_${dateStr}`,   task: `😴 Ngủ đủ 7–8 tiếng tối nay`, done: false }
        ];
      }

      log = {
        date: dateStr,
        weight: null,
        meals: [],
        workouts: [],
        waterIntake: 0,
        checklist,
        xpEarned: 0,
        isRestDay: false
      };
      await dbManager.put('daily_logs', log);
    }
    appState.setDailyLog(dateStr, log);
    return log;
  },

  async saveDailyLog(log) {
    appState.setDailyLog(log.date, log);
    await dbManager.put('daily_logs', log);
    const newBadges = await this.reevaluateDailyXP(log.date);
    if (newBadges && newBadges.length > 0) {
      window.dispatchEvent(new CustomEvent('achievement:unlocked', { detail: { badgeIds: newBadges } }));
    }
    return log;
  },

  async getAllDailyLogs() {
    const logs = await dbManager.getAll('daily_logs');
    return logs.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  },

  async addMealLog(dateStr, meal) {
    const log = await this.getDailyLog(dateStr);
    const newMeal = {
      id: 'meal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ...meal
    };
    if (meal && meal.type) {
      log.meals = log.meals.filter(m => !m.type || m.type.toLowerCase() !== meal.type.toLowerCase());
    }
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
  async getUserProgress(bypassCache = false) {
    if (!bypassCache && appState.getProgress()) {
      const cached = appState.getProgress();
      // Even with cache, check if date rolled over to next day
      if (cached.lastLoggedDate !== this.getTodayString()) {
        await this.checkAndUpdateStreak(cached);
      }
      // Ensure level and badges are sanitized even in cached state
      const goal = await this.getUserGoal();
      const levelInfo = getLevelInfo(cached.totalXp || 0, goal?.journeyLevels);
      cached.level = levelInfo.currentLevel.level;
      if (cached.badges && Array.isArray(cached.badges)) {
        cached.badges = cached.badges.filter(b => {
          if (b === 'level_3' && cached.level < 3) return false;
          if (b === 'level_5' && cached.level < 5) return false;
          if (b === 'level_7' && cached.level < 7) return false;
          if (b === 'level_10' && cached.level < 10) return false;
          return true;
        });
      }
      return cached;
    }
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
    } else {
      // Auto-evaluate streak on consecutive date visits/activities
      await this.checkAndUpdateStreak(progress);
    }

    const goal = await this.getUserGoal();
    const levelInfo = getLevelInfo(progress.totalXp || 0, goal?.journeyLevels);
    progress.level = levelInfo.currentLevel.level;

    if (progress.badges && Array.isArray(progress.badges)) {
      progress.badges = progress.badges.filter(b => {
        if (b === 'level_3' && progress.level < 3) return false;
        if (b === 'level_5' && progress.level < 5) return false;
        if (b === 'level_7' && progress.level < 7) return false;
        if (b === 'level_10' && progress.level < 10) return false;
        return true;
      });
    }

    appState.setProgress(progress);
    return progress;
  },

  async reevaluateDailyXP(dateStr) {
    const log = await dbManager.get('daily_logs', dateStr);
    const goal = await this.getUserGoal();
    if (!log || !goal) return [];

    let earnedXP = 0;
    const totalMealCal = log.meals.reduce((sum, m) => sum + (m.calories || 0), 0);
    const totalProtein = log.meals.reduce((sum, m) => sum + (m.protein || 0), 0);
    const totalCarb    = log.meals.reduce((sum, m) => sum + (m.carb    || 0), 0);
    const totalFat     = log.meals.reduce((sum, m) => sum + (m.fat     || 0), 0);
    const calTarget     = goal.dailyCalorieTarget || 2000;
    const proteinTarget = goal.macroTarget?.protein || 120;
    const carbTarget    = goal.macroTarget?.carb    || 160;
    const fatTarget     = goal.macroTarget?.fat     || 50;
    const waterTarget   = goal.waterTarget || 2500;
    const waterIntake   = log.waterIntake || 0;

    const calHit     = totalMealCal > 0 && Math.abs(totalMealCal - calTarget) <= calTarget * 0.15;
    const proteinHit = totalProtein >= proteinTarget;
    const waterHit   = (log.waterIntake || 0) >= waterTarget;
    const workoutHit = log.workouts.length > 0 || log.isRestDay;
    const doneTasks  = log.checklist.filter(t => t.done).length;
    const checklistHit = log.checklist.length > 0 && doneTasks === log.checklist.length;
    const macroDayComplete = proteinHit && totalCarb >= carbTarget && totalFat >= fatTarget;

    // Award XP
    if (calHit)       earnedXP += CONFIG.XP_RULES.MEAL_TARGET;
    if (proteinHit)   earnedXP += CONFIG.XP_RULES.PROTEIN_TARGET;
    if (waterHit)     earnedXP += CONFIG.XP_RULES.WATER_TARGET;
    if (workoutHit)   earnedXP += CONFIG.XP_RULES.WORKOUT_COMPLETE;
    if (checklistHit) earnedXP += CONFIG.XP_RULES.CHECKLIST_FULL;

    const xpDiff = earnedXP - (log.xpEarned || 0);
    log.xpEarned = earnedXP;
    await dbManager.put('daily_logs', log);

    const progress = await this.getUserProgress(true);
    if (xpDiff !== 0) {
      progress.totalXp = Math.max(0, (progress.totalXp || 0) + xpDiff);
      const levelInfo = getLevelInfo(progress.totalXp, goal?.journeyLevels);
      progress.level = levelInfo.currentLevel.level;
    }

    // Gather cumulative stats for badge check
    const allLogs = await dbManager.getAll('daily_logs');
    const allPhotos = await this.getPhotos();

    const totalWorkoutDays     = allLogs.filter(l => l.workouts?.length > 0).length;
    const totalRestDays        = allLogs.filter(l => l.isRestDay).length;
    const totalCardioSessions  = allLogs.reduce((sum, l) => sum + (l.workouts || []).filter(w => /chạy|cardio|bơi|đạp xe|aerobic/i.test(w.type || '')).length, 0);
    const maxCaloBurned        = allLogs.reduce((max, l) => Math.max(max, (l.workouts || []).reduce((s, w) => s + (w.caloriesBurned || 0), 0)), 0);

    // Streak counters (count consecutive days ending today)
    const sortedDates = allLogs.map(l => l.date).sort();
    let hydrationStreakDays = 0, calorieStreakDays = 0, checklistStreakDays = 0, proteinDays = 0;
    for (const l of allLogs) {
      if ((l.waterIntake || 0) >= (goal.waterTarget || 2500)) hydrationStreakDays++;
      if (l.meals?.reduce((s, m) => s + (m.calories || 0), 0) > 0 &&
          Math.abs(l.meals.reduce((s, m) => s + (m.calories || 0), 0) - calTarget) <= calTarget * 0.15) calorieStreakDays++;
      if (l.checklist?.length > 0 && l.checklist.every(t => t.done)) checklistStreakDays++;
      if (l.meals?.reduce((s, m) => s + (m.protein || 0), 0) >= proteinTarget) proteinDays++;
    }

    const stats = {
      totalXp:            progress.totalXp,
      level:              progress.level,
      currentStreak:      progress.currentStreak,
      totalWorkoutDays,
      totalRestDays,
      totalCardioSessions,
      maxCaloBurned,
      hydrationStreakDays,
      proteinDays,
      calorieStreakDays,
      checklistStreakDays,
      totalPhotos:        allPhotos.length,
      hasLoggedMeal:      (log.meals?.length || 0) > 0,
      hasLoggedWorkout:   (log.workouts?.length || 0) > 0,
      hasLoggedPhoto:     allPhotos.length > 0,
      hasUsedAiCoach:     progress.hasUsedAiCoach || false,
      macroDayComplete,
    };

    const newBadges = checkAndUnlockBadges(progress, stats);
    if (newBadges.length > 0) {
      progress.badges = [...(progress.badges || []), ...newBadges];
    }

    await dbManager.put('user_progress', progress);
    return newBadges;
  },

  /**
   * Award XP for sending an AI Coach message
   * Returns array of newly unlocked badge IDs
   */
  async awardAiCoachXp() {
    const goal = await this.getUserGoal();
    const progress = await this.getUserProgress(true);
    // +5 XP per message (capped to prevent farming)
    progress.totalXp = (progress.totalXp || 0) + 5;
    progress.hasUsedAiCoach = true;
    const levelInfo = getLevelInfo(progress.totalXp, goal?.journeyLevels);
    progress.level = levelInfo.currentLevel.level;

    const allPhotos = await this.getPhotos();
    const stats = {
      totalXp: progress.totalXp,
      level: progress.level,
      currentStreak: progress.currentStreak,
      hasUsedAiCoach: true,
      totalPhotos: allPhotos.length,
    };

    const newBadges = checkAndUnlockBadges(progress, stats);
    if (newBadges.length > 0) progress.badges = [...(progress.badges || []), ...newBadges];

    await dbManager.put('user_progress', progress);
    if (newBadges.length > 0) {
      window.dispatchEvent(new CustomEvent('achievement:unlocked', { detail: { badgeIds: newBadges } }));
    }
    return newBadges;
  },

  // ---------------- PHOTO VAULT ----------------
  async getPhotos(bypassCache = false) {
    if (!bypassCache && appState.getPhotos() && appState.getPhotos().length > 0) {
      return appState.getPhotos();
    }
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
    realPhotos.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Ensure every photo has an explicit journeyDay property (1, 2, 3...)
    realPhotos.forEach((p, idx) => {
      if (!p.journeyDay) {
        p.journeyDay = idx + 1;
      }
    });

    appState.setPhotos(realPhotos);
    return realPhotos;
  },

  async addPhoto(photoDataUrl, weight = null, note = '', customDate = null, journeyDay = null) {
    const today = customDate || this.getTodayString();
    const compressedUrl = await compressImageBase64(photoDataUrl, 800, 0.75);
    const existingPhotos = await this.getPhotos();
    let photoItem = null;

    const targetDay = journeyDay ? Number(journeyDay) : 1;

    // Check if a photo for this journey day already exists (or index match)
    const existing = existingPhotos.find((p, idx) => 
      (p.journeyDay && Number(p.journeyDay) === targetDay) || (idx + 1) === targetDay
    );

    if (existing) {
      existing.photoDataUrl = compressedUrl;
      existing.url = compressedUrl;
      if (weight) existing.weight = weight;
      if (note) existing.note = note;
      if (customDate) existing.date = customDate;
      existing.journeyDay = targetDay;
      existing.updatedAt = new Date().toISOString();
      photoItem = existing;
      await dbManager.put('photos', photoItem);
    } else {
      photoItem = {
        id: 'photo_' + Date.now(),
        date: today,
        weight: weight || (await this.getUserProfile()).currentWeight,
        photoDataUrl: compressedUrl,
        url: compressedUrl,
        note,
        journeyDay: targetDay,
        createdAt: new Date().toISOString()
      };
      await dbManager.put('photos', photoItem);
    }

    // Auto mark photo task in checklist
    const log = await this.getDailyLog(today);
    const photoTask = log.checklist.find(t => t.id === 'task_photo');
    if (photoTask) {
      photoTask.done = true;
      await this.saveDailyLog(log);
    }

    // Badge check via central checkAndUnlockBadges
    const allPhotos = await this.getPhotos();
    const progress = await this.getUserProgress();
    const stats = {
      totalXp: progress.totalXp,
      level: progress.level,
      currentStreak: progress.currentStreak,
      totalPhotos: allPhotos.length,
      hasLoggedPhoto: true,
    };
    const newBadges = checkAndUnlockBadges(progress, stats);
    if (newBadges.length > 0) {
      progress.badges = [...(progress.badges || []), ...newBadges];
      await dbManager.put('user_progress', progress);
    }
    // Also award photo XP (+15)
    progress.totalXp = (progress.totalXp || 0) + 15;
    const levelInfo = getLevelInfo(progress.totalXp);
    progress.level = levelInfo.currentLevel.level;
    await dbManager.put('user_progress', progress);

    if (newBadges.length > 0) {
      window.dispatchEvent(new CustomEvent('achievement:unlocked', { detail: { badgeIds: newBadges } }));
    }
    return { photoItem, newBadges };
  },

  async updatePhotoTag(photoIdOrJourneyDay, journeyDay, note = '') {
    const photos = await this.getPhotos();
    let target = photos.find(p => p.id === photoIdOrJourneyDay || p.journeyDay === journeyDay);
    if (target) {
      if (journeyDay) target.journeyDay = journeyDay;
      if (note) target.note = note;
      await dbManager.put('photos', target);
      return target;
    }
    return null;
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

  getDeletedChatSessions() {
    try {
      return JSON.parse(localStorage.getItem('deleted_chat_sessions') || '[]');
    } catch {
      return [];
    }
  },

  getSessionTitle(sessionId) {
    try {
      const titlesMap = JSON.parse(localStorage.getItem('ai_chat_session_titles') || '{}');
      return titlesMap[sessionId] || null;
    } catch {
      return null;
    }
  },

  saveSessionTitle(sessionId, title) {
    try {
      const titlesMap = JSON.parse(localStorage.getItem('ai_chat_session_titles') || '{}');
      titlesMap[sessionId] = title;
      localStorage.setItem('ai_chat_session_titles', JSON.stringify(titlesMap));
    } catch {}
  },

  async getChatSessions() {
    const deletedSessions = this.getDeletedChatSessions();
    const msgs = await dbManager.getAll('chat_history');
    const validMsgs = msgs.filter(m => !deletedSessions.includes(m.sessionId || 'session_default'));
    if (validMsgs.length === 0) return [];

    const sessionsMap = {};
    validMsgs.forEach(m => {
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
      const aiTitle = this.getSessionTitle(s.id);
      if (aiTitle) {
        return {
          id: s.id,
          title: aiTitle,
          updatedAt: s.updatedAt,
          messageCount: s.messages.length
        };
      }
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
    const deletedSessions = this.getDeletedChatSessions();
    if (deletedSessions.includes(sId)) return [];

    const msgs = await dbManager.getAll('chat_history');
    const filtered = msgs.filter(m => (m.sessionId || 'session_default') === sId);

    // Deduplicate messages by explicit id or key combination
    const uniqueMsgsMap = new Map();
    filtered.forEach(m => {
      const dedupKey = m.id || `${m.role}_${m.timestamp}_${(m.content || '').substring(0, 30)}`;
      if (!uniqueMsgsMap.has(dedupKey)) {
        uniqueMsgsMap.set(dedupKey, m);
      }
    });
    const uniqueList = Array.from(uniqueMsgsMap.values());
    return uniqueList.sort((a, b) => a.timestamp - b.timestamp);
  },

  async addChatMessage(msg) {
    const activeSessionId = await this.getCurrentSessionId();
    const generatedId = msg.id || ('msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
    const item = {
      id: generatedId,
      timestamp: Date.now(),
      sessionId: activeSessionId,
      status: 'none', // 'none', 'pending', 'approved', 'rejected'
      ...msg
    };
    await dbManager.put('chat_history', item);
    return item;
  },

  async deleteChatSession(targetSessionId) {
    // 1. Blacklist session ID so Cloud sync won't resurrect it
    let deletedSessions = this.getDeletedChatSessions();
    if (!deletedSessions.includes(targetSessionId)) {
      deletedSessions.push(targetSessionId);
      localStorage.setItem('deleted_chat_sessions', JSON.stringify(deletedSessions));
    }

    // 2. Delete messages locally and from Cloud Firestore
    const msgs = await dbManager.getAll('chat_history');
    const toDelete = msgs.filter(m => (m.sessionId || 'session_default') === targetSessionId);
    for (const m of toDelete) {
      if (m.id) {
        await dbManager.delete('chat_history', m.id);
      }
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
        case 'LOG_PROGRESS_PHOTO':
        case 'UPLOAD_PHOTO': {
          let { photoUrl, photoDataUrl, journeyDay, note, weight, date } = proposedChange.payload || {};
          const profile = await this.getUserProfile();

          // Failsafe: search recent chat history for uploaded image attachments if photoUrl missing
          if (!photoUrl && !photoDataUrl) {
            const history = await this.getChatHistory();
            for (let i = history.length - 1; i >= 0; i--) {
              const msg = history[i];
              if (msg.attachments && msg.attachments.length > 0) {
                const imgAtt = msg.attachments.find(a => a.dataUrl || a.url);
                if (imgAtt) {
                  photoUrl = imgAtt.dataUrl || imgAtt.url;
                  break;
                }
              }
            }
          }

          const imgUrl = photoUrl || photoDataUrl || profile.avatar || 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80';
          const dayNote = note || (journeyDay ? `Ảnh tiến trình Ngày ${journeyDay}` : 'Ảnh tiến trình do AI Coach ghi nhận');
          await this.addPhoto(imgUrl, weight || profile.currentWeight, dayNote, date, journeyDay);
          break;
        }
        case 'UPDATE_PHOTO_TAG':
        case 'UPDATE_PHOTO': {
          let { photoId, journeyDay, note, weight, photoUrl } = proposedChange.payload || {};
          const res = await this.updatePhotoTag(photoId, journeyDay, note);
          if (!res) {
            // Failsafe: search recent chat history if photoUrl missing
            if (!photoUrl) {
              const history = await this.getChatHistory();
              for (let i = history.length - 1; i >= 0; i--) {
                const msg = history[i];
                if (msg.attachments && msg.attachments.length > 0) {
                  const imgAtt = msg.attachments.find(a => a.dataUrl || a.url);
                  if (imgAtt) {
                    photoUrl = imgAtt.dataUrl || imgAtt.url;
                    break;
                  }
                }
              }
            }
            const profile = await this.getUserProfile();
            const imgUrl = photoUrl || profile.avatar || 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80';
            await this.addPhoto(imgUrl, weight || profile.currentWeight, note || `Ảnh tiến trình Ngày ${journeyDay || 1}`, null, journeyDay);
          }
          break;
        }
        case 'COMPARE_PHOTOS': {
          console.log('[DataService] Photo comparison action approved:', proposedChange.payload);
          break;
        }
        case 'UPDATE_DAILY_SCHEDULE': {
          const plan = await this.getUserPlan();
          const { dailySchedule, phaseIndex } = proposedChange.payload || {};
          if (Array.isArray(dailySchedule) && dailySchedule.length > 0) {
            if (typeof phaseIndex === 'number' && plan.journeyPhases?.[phaseIndex]) {
              plan.journeyPhases[phaseIndex].dailySchedule = dailySchedule;
            } else {
              plan.dailySchedule = dailySchedule;
              if (plan.journeyPhases && plan.journeyPhases.length > 0) {
                plan.journeyPhases.forEach(p => { p.dailySchedule = dailySchedule; });
              }
            }
            await this.saveUserPlan(plan);
          }
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
  },

  async setSelectedModel(model) {
    await this.saveSetting('ninerouter_model', model);
  }
};

export function getMealRecipeDetails(meal) {
  if (!meal || !meal.name) return null;
  const name = meal.name.toLowerCase();
  const totalCost = meal.costVnd || 30000;

  // Direct eat check (fruits, yogurt, nuts, ready drinks)
  const isDirectEat = /chuối|táo|lê|sữa chua|hạnh nhân|óc chó|sữa đậu nành|sinh tố|bánh bao/i.test(name);

  let videoEmbedUrl = 'https://www.youtube.com/embed/gq3zY7y25n0';
  let ingredients = [];
  let instructions = [];

  if (name.includes('ức gà áp chảo')) {
    videoEmbedUrl = 'https://www.youtube.com/embed/gq3zY7y25n0';
    ingredients = [
      { name: 'Ức gà tươi sạch', amount: '150g', estPriceVnd: Math.round(totalCost * 0.55) },
      { name: 'Gạo lứt dẻo', amount: '80g - 1 bát cơm', estPriceVnd: Math.round(totalCost * 0.20) },
      { name: 'Rau cải ngọt / Bông cải xanh', amount: '150g', estPriceVnd: Math.round(totalCost * 0.15) },
      { name: 'Dầu olive, tỏi & gia vị', amount: 'Vừa đủ', estPriceVnd: Math.round(totalCost * 0.10) }
    ];
    instructions = [
      '1. Ức gà rửa sạch, thái miếng vừa ăn, ướp với chút muối tiêu, tỏi băm và 1 thìa dầu olive trong 10 phút.',
      '2. Nấu dẻo 1 bát cơm lứt bằng nồi cơm điện.',
      '3. Đun nóng chảo chống dính, áp chảo ức gà mỗi mặt 5-6 phút ở lửa vừa đến khi chín vàng thơm.',
      '4. Luộc rau cải trong nước sôi 2-3 phút cho giòn ngọt.',
      '5. Bày ra đĩa gồm cơm lứt, ức gà áp chảo và rau luộc.'
    ];
  } else if (name.includes('trứng ốp la')) {
    videoEmbedUrl = 'https://www.youtube.com/embed/l592H8fKqE4';
    ingredients = [
      { name: 'Trứng gà tươi', amount: '2 quả', estPriceVnd: Math.round(totalCost * 0.50) },
      { name: 'Bánh mì đen nguyên cám', amount: '1 lát - 40g', estPriceVnd: Math.round(totalCost * 0.35) },
      { name: 'Dầu ăn / bơ lạt & gia vị', amount: 'Vừa đủ', estPriceVnd: Math.round(totalCost * 0.15) }
    ];
    instructions = [
      '1. Đun nóng chảo chống dính với chút dầu ăn hoặc bơ lạt.',
      '2. Đập 2 quả trứng gà vào chảo, rắc chút muối tiêu, chiên 2-3 phút ở lửa nhỏ cho lòng trắng chín tới.',
      '3. Nướng nhẹ lát bánh mì đen cho giòn nóng.',
      '4. Bày trứng ra đĩa ăn kèm bánh mì đen.'
    ];
  } else if (name.includes('cá thu') || name.includes('thịt nạc')) {
    videoEmbedUrl = 'https://www.youtube.com/embed/rG_Z9L51N4E';
    ingredients = [
      { name: 'Cá thu tươi / thịt thăn nạc', amount: '150g', estPriceVnd: Math.round(totalCost * 0.65) },
      { name: 'Rau mồng tơi & mướp hương', amount: '150g', estPriceVnd: Math.round(totalCost * 0.25) },
      { name: 'Gia vị tỏi ớt nêm nếm', amount: 'Vừa đủ', estPriceVnd: Math.round(totalCost * 0.10) }
    ];
    instructions = [
      '1. Cá/Thịt ướp chút muối, tiêu và ớt băm trong 10 phút.',
      '2. Nướng cá thu trong nồi chiên không dầu ở 180°C trong 12-15 phút.',
      '3. Nấu canh rau mồng tơi mướp hương thanh mát.',
      '4. Thưởng thức cá nướng kèm canh mồng tơi nóng hổi.'
    ];
  } else if (name.includes('phở gà')) {
    videoEmbedUrl = 'https://www.youtube.com/embed/a7gXmE-D4uE';
    ingredients = [
      { name: 'Thịt lườn gà xé', amount: '120g', estPriceVnd: Math.round(totalCost * 0.50) },
      { name: 'Bánh phở tươi / phở khô', amount: '150g', estPriceVnd: Math.round(totalCost * 0.30) },
      { name: 'Gừng, hành tây & nước dùng', amount: 'Vừa đủ', estPriceVnd: Math.round(totalCost * 0.20) }
    ];
    instructions = [
      '1. Nấu nước dùng gà thanh ngọt với gừng và hành tây nướng.',
      '2. Chần bánh phở qua nước sôi rồi cho ra bát.',
      '3. Xếp thịt gà xé và rắc hành lá thái nhỏ lên trên.',
      '4. Chan nước dùng nóng hổi và dùng nóng kèm chanh ớt.'
    ];
  } else if (name.includes('bò xào cần tây')) {
    videoEmbedUrl = 'https://www.youtube.com/embed/2_8r5zX7h3A';
    ingredients = [
      { name: 'Thịt thăn bò tươi', amount: '150g', estPriceVnd: Math.round(totalCost * 0.70) },
      { name: 'Cần tây tươi & tỏi băm', amount: '100g', estPriceVnd: Math.round(totalCost * 0.15) },
      { name: 'Cơm lứt dẻo', amount: '1 bát (150g)', estPriceVnd: Math.round(totalCost * 0.15) }
    ];
    instructions = [
      '1. Thịt bò thái mỏng, ướp tỏi băm, muối tiêu và dầu hàu trong 10 phút.',
      '2. Xào bò ở lửa lớn trong 2 phút cho vừa chín tới rồi cho ra đĩa.',
      '3. Cho cần tây vào xào nhanh 1 phút rồi đảo đều cùng thịt bò.',
      '4. Ăn nóng cùng 1 bát cơm lứt dẻo thơm.'
    ];
  } else if (name.includes('tôm hấp') || name.includes('bí đao')) {
    videoEmbedUrl = 'https://www.youtube.com/embed/v7AYKMP6rOE';
    ingredients = [
      { name: 'Tôm thẻ tươi', amount: '150g', estPriceVnd: Math.round(totalCost * 0.60) },
      { name: 'Bí đao & sả tươi', amount: '200g', estPriceVnd: Math.round(totalCost * 0.30) },
      { name: 'Gia vị nêm nếm', amount: 'Vừa đủ', estPriceVnd: Math.round(totalCost * 0.10) }
    ];
    instructions = [
      '1. Xếp sả đập dập đáy nồi, cho tôm lên trên hấp chín 6-8 phút.',
      '2. Nấu canh bí đao thanh mát nêm gia vị vừa ăn.',
      '3. Thưởng thức tôm hấp sả kèm canh bí đao.'
    ];
  } else if (isDirectEat) {
    ingredients = [
      { name: meal.name.split('+')[0] || meal.name, amount: '1 khẩu phần', estPriceVnd: Math.round(totalCost * 0.60) },
      { name: meal.name.split('+')[1] || 'Món ăn kèm', amount: '1 khẩu phần', estPriceVnd: Math.round(totalCost * 0.40) }
    ];
    instructions = [];
  } else {
    ingredients = [
      { name: meal.name.split('+')[0] || meal.name, amount: '1 khẩu phần', estPriceVnd: Math.round(totalCost * 0.70) },
      { name: 'Rau củ / Gia vị đi kèm', amount: 'Vừa đủ', estPriceVnd: Math.round(totalCost * 0.30) }
    ];
    instructions = [
      '1. Sơ chế các nguyên liệu sạch sẽ và nêm ướp gia vị vừa ăn.',
      '2. Chế biến chín tới (luộc, hấp, nướng hoặc xào nhẹ ít dầu).',
      '3. Bày ra đĩa và thưởng thức khi còn nóng.'
    ];
  }

  return {
    ...meal,
    isDirectEat: meal.isDirectEat !== undefined ? meal.isDirectEat : isDirectEat,
    ingredients: meal.ingredients && meal.ingredients.length > 0 ? meal.ingredients : ingredients,
    instructions: meal.instructions && meal.instructions.length > 0 ? meal.instructions : instructions,
    youtubeEmbedUrl: meal.youtubeEmbedUrl || videoEmbedUrl,
    youtubeSearchQuery: `Cách làm ${meal.name} người Việt`
  };
}

export function isDishAllergic(dishName, foodAllergiesStr = '') {
  if (!foodAllergiesStr || !dishName) return false;
  const allergies = foodAllergiesStr.toLowerCase();
  const dish = dishName.toLowerCase();

  const isSeafoodAllergy = allergies.includes('hải sản') ||
                           allergies.includes('sống dưới nước') ||
                           allergies.includes('dưới nước') ||
                           allergies.includes('thủy sản') ||
                           allergies.includes('tôm') ||
                           allergies.includes('cá') ||
                           allergies.includes('mực') ||
                           allergies.includes('cua');

  if (isSeafoodAllergy && (
    dish.includes('tôm') || dish.includes('mực') || dish.includes('cá') ||
    dish.includes('cua') || dish.includes('hàu') || dish.includes('ốc') ||
    dish.includes('sò') || dish.includes('nghêu') || dish.includes('lươn') || dish.includes('ngao')
  )) {
    return true;
  }

  if (allergies.includes('trứng') && dish.includes('trứng')) return true;
  if ((allergies.includes('sữa') || allergies.includes('lactose')) && (dish.includes('sữa') || dish.includes('phô mai'))) return true;
  if (allergies.includes('đậu') && (dish.includes('đậu') || dish.includes('đậu phụ') || dish.includes('đậu nành'))) return true;
  if ((allergies.includes('heo') || allergies.includes('lợn')) && (dish.includes('heo') || dish.includes('lợn'))) return true;
  if (allergies.includes('bò') && dish.includes('bò')) return true;

  return false;
}

export function sanitizeMealItem(meal, foodAllergiesStr = '') {
  if (!meal || !meal.name) return meal;
  if (!isDishAllergic(meal.name, foodAllergiesStr)) return getMealRecipeDetails(meal);

  let processed = { ...meal };
  processed.name = meal.name
    .replace(/150g tôm hấp sả \+ canh bí đao thịt nạc/gi, '150g ức gà áp chảo + canh bí đao thịt nạc')
    .replace(/200g tôm rim nhạt \+ canh bầu nấu tôm/gi, '200g thịt thăn lợn luộc + canh bầu nấu thịt băm')
    .replace(/150g cá thu nướng \/ thịt nạc \+ canh rau mồng tơi/gi, '150g ức gà nạc áp chảo + canh rau mồng tơi thịt băm')
    .replace(/150g cá ngừ sốt cà chua \+ canh măng chua/gi, '150g thịt thăn bò xào cần tây + canh măng chua')
    .replace(/200g cá hồi \/ cá diêu hồng hấp \+ đĩa rau củ luộc/gi, '200g ức gà nướng mật ong + đĩa rau củ luộc')
    .replace(/bún chả cá nướng nhẹ dầu/gi, 'Bún ức gà xé nướng nhẹ dầu')
    .replace(/150g mực xào ớt chuông \+ canh cải béc xanh/gi, '150g thịt bò xào ớt chuông + canh cải béc xanh')
    .replace(/canh cua rau đét/gi, 'canh thịt băm rau đét')
    .replace(/tôm hấp sả|tôm rim nhạt|tôm/gi, 'ức gà áp chảo')
    .replace(/mực xào ớt chuông|mực/gi, 'thịt thăn bò xào cần tây')
    .replace(/cá ngừ|cá hồi|cá thu nướng|cá thu|cá diêu hồng|bún chả cá|chả cá|cá/gi, 'ức gà nạc')
    .replace(/cua|canh cua/gi, 'thịt heo nạc luộc')
    .replace(/trứng ốp la|trứng chần|trứng cút|trứng/gi, 'thịt bò áp chảo')
    .replace(/sữa chua nếp cẩm|sữa chua|sữa đậu nành|sữa/gi, 'nước ép táo tươi')
    .replace(/đậu phụ|đậu nành/gi, 'thịt nạc luộc');

  return getMealRecipeDetails(processed);
}

export function generate7DayMealPlan(budgetVnd = 100000, startDateStr = new Date().toISOString().split('T')[0], foodAllergiesStr = '', variantOffset = 0) {
  const weekly = {};
  const startDate = new Date(startDateStr);
  const allergies = (foodAllergiesStr || '').toLowerCase();

  const sanitizeMeal = (meal) => sanitizeMealItem(meal, allergies);

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
      ...mealVariants[(i + variantOffset) % 7]
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

/**
 * Generate full journey phases (local fallback, no AI).
 * Each phase = 28 days (4 weeks). Max 4 phases.
 * Phase content varies by shifting the meal/workout variant offset.
 */
export function generateFullJourneyPhases(totalDays = 60, budgetVnd = 100000, workoutType = 'home', homeEquipment = 'Thảm yoga, Dây kháng lực, Tạ đơn 5kg', foodAllergiesStr = '', preferredWorkoutTimes = []) {
  const PHASE_DAYS = 28; // 4 weeks per phase
  const numPhases = Math.min(4, Math.ceil(totalDays / PHASE_DAYS));
  const today = new Date().toISOString().split('T')[0];

  const phaseLabels = [
    'Phase 1 - Thích Nghi (Tuần 1-4)',
    'Phase 2 - Tăng Tiến (Tuần 5-8)',
    'Phase 3 - Đỉnh Cao (Tuần 9-12)',
    'Phase 4 - Duy Trì & Biến Thể (Tuần 13+)'
  ];

  // Workout type variants per phase to add variety
  const workoutVariants = [
    workoutType,
    workoutType,
    workoutType === 'home' ? 'outdoor' : workoutType,
    workoutType
  ];

  const phases = [];
  for (let p = 0; p < numPhases; p++) {
    const startDay = p * PHASE_DAYS + 1;
    const endDay = Math.min((p + 1) * PHASE_DAYS, totalDays);
    // Shift meal variants per phase so content differs
    const mealOffset = p * 2; // shift by 2 variants per phase
    const wType = workoutVariants[p];
    const weeklyMealPlan = generate7DayMealPlan(budgetVnd, today, '', mealOffset);
    const weeklyWorkoutRoutine = generate7DayWorkoutRoutine(wType, homeEquipment);
    const firstMealDay = Object.values(weeklyMealPlan)[0];
    const firstWorkoutDay = weeklyWorkoutRoutine[0];

    phases.push({
      phaseIndex: p,
      phaseLabel: phaseLabels[p] || `Phase ${p + 1}`,
      startDay,
      endDay,
      weeklyMealPlan,
      weeklyWorkoutRoutine,
      dailySchedule: generateDailySchedule(firstMealDay, firstWorkoutDay, preferredWorkoutTimes)
    });
  }

  return phases;
}

/**
 * Dynamic 24-Hour Daily Schedule Generator.
 * Constructs a structured daily routine based on active day's meals, workout, and user's preferred workout times.
 */
export function generateDailySchedule(dayMealPlan, workoutItem, preferredWorkoutTimes = []) {
  const bf = dayMealPlan?.breakfast || { name: 'Thực đơn sáng', calories: 350, protein: 20, carb: 40, fat: 10 };
  const lu = dayMealPlan?.lunch || { name: 'Thực đơn trưa', calories: 500, protein: 35, carb: 55, fat: 12 };
  const sn = dayMealPlan?.snack || { name: 'Bữa phụ tăng năng lượng', calories: 150, protein: 6, carb: 20, fat: 4 };
  const dn = dayMealPlan?.dinner || { name: 'Thực đơn tối', calories: 420, protein: 30, carb: 35, fat: 11 };

  const isRest = workoutItem?.type === 'Rest';
  const workoutTitle = workoutItem?.title || 'Tập luyện thể hình';
  const workoutDuration = workoutItem?.duration || 45;
  const estBurn = workoutItem?.estBurn || 300;

  // Resolve workout time slot based on user's preferredWorkoutTimes if set
  let workoutTime = '17:30';
  if (Array.isArray(preferredWorkoutTimes) && preferredWorkoutTimes.length > 0) {
    const firstPref = preferredWorkoutTimes[0];
    const match = firstPref.match(/(\d{2}:\d{2})/);
    if (match) {
      workoutTime = match[1];
    }
  }

  const items = [
    {
      time: '06:30',
      activity: 'Thức Dậy & Uống Nước Ấm Khởi Động',
      category: 'habit',
      icon: 'sun',
      desc: 'Uống 300 - 500ml nước ấm để kích hoạt hệ tiêu hóa, thực hiện 5 phút dãn cơ nhẹ nhàng.'
    },
    {
      time: '07:30',
      activity: `Bữa Sáng Dinh Dưỡng: ${bf.name}`,
      category: 'meal',
      icon: 'coffee',
      desc: `${bf.calories || 350} kcal | Protein: ${bf.protein || 20}g, Carb: ${bf.carb || 40}g, Fat: ${bf.fat || 10}g`
    },
    {
      time: '09:30',
      activity: 'Bổ Sung Nước & Giải Tỏa Căng Thẳng',
      category: 'habit',
      icon: 'droplet',
      desc: 'Uống thêm 500ml nước lọc. Đứng dậy đi lại 5 phút giải tỏa mệt mỏi.'
    },
    {
      time: '12:00',
      activity: `Bữa Trưa Năng Lượng: ${lu.name}`,
      category: 'meal',
      icon: 'utensils',
      desc: `${lu.calories || 500} kcal | Protein: ${lu.protein || 35}g, Carb: ${lu.carb || 55}g, Fat: ${lu.fat || 12}g`
    },
    {
      time: '15:30',
      activity: `Bữa Phụ Nhẹ: ${sn.name}`,
      category: 'meal',
      icon: 'apple',
      desc: `${sn.calories || 150} kcal | Protein: ${sn.protein || 6}g, Carb: ${sn.carb || 20}g, Fat: ${sn.fat || 4}g`
    },
    {
      time: workoutTime,
      activity: isRest ? `Phục Hồi: ${workoutTitle}` : `Tập Luyện (${workoutTime}): ${workoutTitle}`,
      category: 'workout',
      icon: 'dumbbell',
      desc: isRest
        ? 'Ngày nghỉ phục hồi cơ bắp. Thực hiện dãn cơ nhẹ hoặc đi bộ thư giãn.'
        : `Thời lượng ${workoutDuration} phút | Ước tính đốt ${estBurn} kcal. Tập đúng khung giờ bạn chọn.`
    },
    {
      time: '19:00',
      activity: `Bữa Tối Phục Hồi: ${dn.name}`,
      category: 'meal',
      icon: 'utensils',
      desc: `${dn.calories || 420} kcal | Protein: ${dn.protein || 30}g, Carb: ${dn.carb || 35}g, Fat: ${dn.fat || 11}g`
    },
    {
      time: '22:30',
      activity: 'Thư Giãn & Đi Ngủ Phục Hồi',
      category: 'habit',
      icon: 'moon',
      desc: 'Hạn chế thiết bị điện tử, đi ngủ đúng giờ để đảm bảo 7 - 8 tiếng ngủ ngon giúp phục hồi cơ thể.'
    }
  ];

  return items.sort((a, b) => a.time.localeCompare(b.time));
}

export function normalizeWorkoutRoutine(routine) {
  if (Array.isArray(routine)) return routine;
  if (routine && typeof routine === 'object') {
    return Object.values(routine);
  }
  return [];
}

/**
 * Given a plan and a journeyDay (1-based), return the correct meal plan entry and workout for that day.
 * Uses journeyPhases if available, otherwise falls back to weeklyMealPlan.
 */
export function getPlanForJourneyDay(plan, journeyDay = 1) {
  let mealEntry = null;
  let workout = null;
  let phase = null;

  // Modern path: journeyPhases array
  if (plan.journeyPhases && plan.journeyPhases.length > 0) {
    // Find the matching phase, or use the last phase for overflow
    phase = plan.journeyPhases.find(p => journeyDay >= p.startDay && journeyDay <= p.endDay);
    if (!phase) phase = plan.journeyPhases[plan.journeyPhases.length - 1];

    // dayIndex within the 7-day weekly template (0–6)
    const dayIndex = (journeyDay - 1) % 7;

    // Meal: pick from the phase's weeklyMealPlan by position
    const mealKeys = Object.keys(phase.weeklyMealPlan || {}).sort();
    mealEntry = phase.weeklyMealPlan ? phase.weeklyMealPlan[mealKeys[dayIndex]] : null;

    // Workout: pick from weeklyWorkoutRoutine by dayIndex
    const workoutRoutine = normalizeWorkoutRoutine(phase.weeklyWorkoutRoutine);
    workout = workoutRoutine[dayIndex] || null;
  } else {
    // Legacy fallback: weeklyMealPlan keyed by date, weeklyWorkoutRoutine array
    const dayIndex = (journeyDay - 1) % 7;
    const mealKeys = Object.keys(plan.weeklyMealPlan || {}).sort();
    mealEntry = plan.weeklyMealPlan?.[mealKeys[dayIndex]] || null;
    const workoutRoutine = normalizeWorkoutRoutine(plan.weeklyWorkoutRoutine);
    workout = workoutRoutine[dayIndex] || null;
  }

  // Always generate dailySchedule from actual mealEntry & workout for the selected day
  // so the schedule meals stay in sync with the meal plan panel below.
  // We use phase.dailySchedule only to pull the preferred workout time if set.
  const preferredTimes = plan?.preferredWorkoutTimes || [];
  const dailySchedule = generateDailySchedule(mealEntry, workout, preferredTimes);

  return { mealEntry, workout, phase, dailySchedule };
}

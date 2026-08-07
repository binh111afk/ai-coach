// Gamification & Health Math Engine

export const ACTIVITY_MULTIPLIERS = {
  sedentary: { label: "Ít vận động (làm việc văn phòng)", factor: 1.2 },
  light: { label: "Vận động nhẹ (tập 1-3 buổi/tuần)", factor: 1.375 },
  moderate: { label: "Vận động vừa (tập 3-5 buổi/tuần)", factor: 1.55 },
  active: { label: "Vận động nhiều (tập 6-7 buổi/tuần)", factor: 1.725 },
  very_active: { label: "Vận động rất cao (VĐV/Lao động nặng)", factor: 1.9 }
};

/**
 * BADGE DEFINITIONS
 * Each badge has: id, name, icon (lucide), description, secret (optional)
 */
export const BADGES = [
  // ── Khởi đầu ──
  {
    id: 'first_step',
    name: 'Bước Chân Đầu Tiên',
    icon: 'footprints',
    description: 'Hoàn thành hồ sơ và bắt đầu hành trình'
  },
  {
    id: 'first_meal',
    name: 'Bữa Ăn Đầu Tiên',
    icon: 'utensils',
    description: 'Ghi nhận bữa ăn đầu tiên vào nhật ký'
  },
  {
    id: 'first_workout',
    name: 'Bài Tập Đầu Tiên',
    icon: 'dumbbell',
    description: 'Hoàn thành buổi tập luyện đầu tiên'
  },
  {
    id: 'first_photo',
    name: 'Selfie Tiến Trình',
    icon: 'camera',
    description: 'Upload ảnh tiến trình đầu tiên'
  },

  // ── Dinh dưỡng & Nước ──
  {
    id: 'hydration_hero',
    name: 'Thánh Uống Nước',
    icon: 'droplet',
    description: 'Uống đủ chỉ tiêu nước 3 ngày liên tiếp'
  },
  {
    id: 'hydration_master',
    name: 'Bậc Thầy Nước',
    icon: 'waves',
    description: 'Uống đủ nước 7 ngày liên tiếp'
  },
  {
    id: 'protein_king',
    name: 'Vua Nạp Đạm',
    icon: 'beef',
    description: 'Đạt chỉ tiêu Protein 5 ngày tích lũy'
  },
  {
    id: 'calorie_sniper',
    name: 'Bắn Tỉa Calo',
    icon: 'crosshair',
    description: 'Đạt chính xác chỉ tiêu Calo trong 3 ngày liên tiếp'
  },
  {
    id: 'macro_balance',
    name: 'Cân Bằng Macro',
    icon: 'pie-chart',
    description: 'Đạt đủ cả 3 mục tiêu Macro trong 1 ngày'
  },

  // ── Tập luyện ──
  {
    id: 'burn_master',
    name: 'Thiêu Rụi Calo',
    icon: 'zap',
    description: 'Tiêu hao trên 500 kcal vận động trong 1 ngày'
  },
  {
    id: 'workout_warrior',
    name: 'Chiến Binh Tập Gym',
    icon: 'swords',
    description: 'Tập luyện 10 ngày tích lũy'
  },
  {
    id: 'cardio_king',
    name: 'Vua Cardio',
    icon: 'activity',
    description: 'Hoàn thành 5 buổi chạy bộ/cardio'
  },
  {
    id: 'rest_day_pro',
    name: 'Nghỉ Đúng Cách',
    icon: 'moon',
    description: 'Đánh dấu ngày nghỉ phục hồi đúng cách 3 lần'
  },

  // ── Streak & Kỷ luật ──
  {
    id: 'iron_will',
    name: 'Ý Chí Thép',
    icon: 'flame',
    description: 'Duy trì Streak 7 ngày liên tiếp'
  },
  {
    id: 'streak_15',
    name: 'Ngọn Lửa Bất Diệt',
    icon: 'flame',
    description: 'Duy trì Streak 15 ngày liên tiếp'
  },
  {
    id: 'streak_30',
    name: 'Huyền Thoại Kỷ Luật',
    icon: 'trophy',
    description: 'Duy trì Streak 30 ngày liên tiếp'
  },
  {
    id: 'checklist_master',
    name: 'Hoàn Hảo Tuyệt Đối',
    icon: 'check-circle-2',
    description: 'Hoàn thành 100% checklist trong 3 ngày liên tiếp'
  },

  // ── Ảnh & Tiến trình ──
  {
    id: 'vault_keeper',
    name: 'Nhật Ký Ảnh',
    icon: 'gallery-horizontal',
    description: 'Upload 3 ảnh tiến trình'
  },
  {
    id: 'vault_master',
    name: 'Người Lưu Trữ',
    icon: 'image',
    description: 'Upload 10 ảnh tiến trình'
  },

  // ── Level milestones ──
  {
    id: 'level_3',
    name: 'Học Viên Kỷ Luật',
    icon: 'graduation-cap',
    description: 'Đạt Level 3'
  },
  {
    id: 'level_5',
    name: 'Chiến Binh Kỷ Luật',
    icon: 'shield-check',
    description: 'Đạt Level 5'
  },
  {
    id: 'level_7',
    name: 'Bậc Thầy Dinh Dưỡng',
    icon: 'star',
    description: 'Đạt Level 7'
  },
  {
    id: 'level_10',
    name: 'Huyền Thoại Fitness',
    icon: 'crown',
    description: 'Đạt Level 10'
  },

  // ── XP Milestones ──
  {
    id: 'xp_500',
    name: 'Nửa Nghìn XP',
    icon: 'medal',
    description: 'Tích lũy 500 XP'
  },
  {
    id: 'xp_1000',
    name: 'Nghìn XP Sấm Sét',
    icon: 'bolt',
    description: 'Tích lũy 1.000 XP'
  },
  {
    id: 'xp_2500',
    name: 'Hành Trình Vĩ Đại',
    icon: 'mountain-snow',
    description: 'Tích lũy 2.500 XP'
  },

  // ── AI Coach ──
  {
    id: 'ai_chat_first',
    name: 'Nhà Khoa Học AI',
    icon: 'brain',
    description: 'Gửi tin nhắn đầu tiên cho AI Coach'
  }
];

/**
 * LEVEL SYSTEM
 * XP thresholds for each level with titles
 */
export const LEVELS = [
  { level: 1,  name: "Tân Binh Fitness",         minXp: 0,    icon: "sprout",          color: "#94a3b8" },
  { level: 2,  name: "Người Khởi Đầu",            minXp: 120,  icon: "dumbbell",        color: "#60a5fa" },
  { level: 3,  name: "Học Viên Kỷ Luật",          minXp: 300,  icon: "graduation-cap",  color: "#34d399" },
  { level: 4,  name: "Năng Lượng Bứt Phá",        minXp: 550,  icon: "zap",             color: "#a3e635" },
  { level: 5,  name: "Chiến Binh Kỷ Luật",        minXp: 900,  icon: "shield-check",    color: "#f59e0b" },
  { level: 6,  name: "Chuyên Gia Đốt Mỡ",         minXp: 1350, icon: "flame",           color: "#fb923c" },
  { level: 7,  name: "Bậc Thầy Dinh Dưỡng",       minXp: 1900, icon: "apple",           color: "#f87171" },
  { level: 8,  name: "Vận Động Viên Bền Bỉ",      minXp: 2600, icon: "trophy",          color: "#c084fc" },
  { level: 9,  name: "Iron Body",                  minXp: 3500, icon: "medal",           color: "#e879f9" },
  { level: 10, name: "Huyền Thoại Fitness",        minXp: 4500, icon: "crown",           color: "#fbbf24" }
];

/**
 * XP REWARDS TABLE — complete guide for users
 */
export const XP_REWARDS = [
  { action: "Đạt chỉ tiêu Calo mục tiêu (±15%)",   xp: 30,  icon: "target"       },
  { action: "Đạt chỉ tiêu Protein hàng ngày",       xp: 20,  icon: "beef"         },
  { action: "Uống đủ nước theo chỉ tiêu",           xp: 20,  icon: "droplet"      },
  { action: "Hoàn thành tập luyện / ngày nghỉ",     xp: 25,  icon: "dumbbell"     },
  { action: "Hoàn thành 100% Checklist",            xp: 30,  icon: "check-circle" },
  { action: "Thưởng Streak mỗi ngày liên tiếp",    xp: 10,  icon: "flame"        },
  { action: "Gửi tin nhắn AI Coach",                xp: 5,   icon: "brain"        },
  { action: "Upload ảnh tiến trình",                xp: 15,  icon: "camera"       },
];

/**
 * Check which badges should be unlocked based on current progress + stats
 * Returns array of newly unlocked badge IDs
 */
export function checkAndUnlockBadges(progress, stats = {}) {
  const {
    totalXp = 0,
    level = 1,
    currentStreak = 0,
    badges = [],
    totalMealDays = 0,
    totalWorkoutDays = 0,
    totalRestDays = 0,
    hydrationStreakDays = 0,
    proteinDays = 0,
    calorieStreakDays = 0,
    checklistStreakDays = 0,
    totalPhotos = 0,
    totalCardioSessions = 0,
    maxCaloBurned = 0,
    hasLoggedMeal = false,
    hasLoggedWorkout = false,
    hasLoggedPhoto = false,
    hasUsedAiCoach = false,
    macroDayComplete = false,
  } = { ...progress, ...stats };

  const newBadges = [];

  const tryUnlock = (id) => {
    if (!badges.includes(id) && !newBadges.includes(id)) {
      newBadges.push(id);
    }
  };

  // Starter
  if (hasLoggedMeal)    tryUnlock('first_meal');
  if (hasLoggedWorkout) tryUnlock('first_workout');
  if (hasLoggedPhoto)   tryUnlock('first_photo');

  // Nutrition
  if (hydrationStreakDays >= 3)  tryUnlock('hydration_hero');
  if (hydrationStreakDays >= 7)  tryUnlock('hydration_master');
  if (proteinDays >= 5)          tryUnlock('protein_king');
  if (calorieStreakDays >= 3)    tryUnlock('calorie_sniper');
  if (macroDayComplete)          tryUnlock('macro_balance');

  // Workout
  if (maxCaloBurned >= 500)      tryUnlock('burn_master');
  if (totalWorkoutDays >= 10)    tryUnlock('workout_warrior');
  if (totalCardioSessions >= 5)  tryUnlock('cardio_king');
  if (totalRestDays >= 3)        tryUnlock('rest_day_pro');

  // Streak
  if (currentStreak >= 7)  tryUnlock('iron_will');
  if (currentStreak >= 15) tryUnlock('streak_15');
  if (currentStreak >= 30) tryUnlock('streak_30');
  if (checklistStreakDays >= 3) tryUnlock('checklist_master');

  // Photos
  if (totalPhotos >= 1)  tryUnlock('first_photo');
  if (totalPhotos >= 3)  tryUnlock('vault_keeper');
  if (totalPhotos >= 10) tryUnlock('vault_master');

  // Level milestones
  if (level >= 3)  tryUnlock('level_3');
  if (level >= 5)  tryUnlock('level_5');
  if (level >= 7)  tryUnlock('level_7');
  if (level >= 10) tryUnlock('level_10');

  // XP milestones
  if (totalXp >= 500)  tryUnlock('xp_500');
  if (totalXp >= 1000) tryUnlock('xp_1000');
  if (totalXp >= 2500) tryUnlock('xp_2500');

  // AI Coach
  if (hasUsedAiCoach) tryUnlock('ai_chat_first');

  return newBadges;
}

// ── Math helpers (unchanged) ──

export function calculateBMR(gender, weightKg, heightCm, age) {
  if (!weightKg || !heightCm || !age) return 1600;
  const w = parseFloat(weightKg);
  const h = parseFloat(heightCm);
  const a = parseInt(age);
  if (gender === 'female') return Math.round((10 * w) + (6.25 * h) - (5 * a) - 161);
  return Math.round((10 * w) + (6.25 * h) - (5 * a) + 5);
}

export function calculateTDEE(bmr, activityLevel) {
  const mult = ACTIVITY_MULTIPLIERS[activityLevel]?.factor || 1.375;
  return Math.round(bmr * mult);
}

export function calculateTargetCalories(tdee, currentWeight, targetWeight, days = 60) {
  const diffKg = parseFloat(currentWeight) - parseFloat(targetWeight);
  if (diffKg === 0) return { targetCalories: tdee, deficit: 0, isSafe: true, warning: null };

  const totalCalorieDiff = diffKg * 7700;
  let dailyAdjustment = Math.round(totalCalorieDiff / days);
  let isSafe = true;
  let warning = null;

  if (diffKg > 0) {
    if (dailyAdjustment > 1000) { dailyAdjustment = 1000; isSafe = false; warning = "Mục tiêu giảm cân quá nhanh! Đã điều chỉnh thâm hụt tối đa 1000 kcal/ngày."; }
    let target = tdee - dailyAdjustment;
    if (target < 1200) { target = 1200; isSafe = false; warning = "Mức calo tối thiểu an toàn là 1200 kcal/ngày."; }
    return { targetCalories: target, deficit: -dailyAdjustment, isSafe, warning };
  } else {
    if (Math.abs(dailyAdjustment) > 700) { dailyAdjustment = 500; isSafe = false; warning = "Khuyên dùng dư thừa 300-500 kcal/ngày."; }
    return { targetCalories: tdee + Math.abs(dailyAdjustment), deficit: Math.abs(dailyAdjustment), isSafe, warning };
  }
}

export function calculateMacros(targetCalories) {
  return {
    protein: Math.round((targetCalories * 0.30) / 4),
    carb:    Math.round((targetCalories * 0.40) / 4),
    fat:     Math.round((targetCalories * 0.30) / 9)
  };
}

export function calculateWaterTarget(weightKg, activityLevel = 'moderate') {
  const baseMl = parseFloat(weightKg || 70) * 35;
  const bonus = (activityLevel === 'active' || activityLevel === 'very_active') ? 500 : 0;
  return Math.round(baseMl + bonus);
}

export function getLevelInfo(totalXp = 0) {
  let currentLevel = LEVELS[0];
  let nextLevel = LEVELS[1];
  for (let i = 0; i < LEVELS.length; i++) {
    if (totalXp >= LEVELS[i].minXp) {
      currentLevel = LEVELS[i];
      nextLevel = LEVELS[i + 1] || null;
    }
  }
  const xpInCurrentLevel = totalXp - currentLevel.minXp;
  const xpNeededForNext = nextLevel ? nextLevel.minXp - currentLevel.minXp : 1000;
  const progressPercent = Math.min(100, Math.round((xpInCurrentLevel / xpNeededForNext) * 100));
  return { currentLevel, nextLevel, totalXp, xpInCurrentLevel, xpNeededForNext, progressPercent };
}

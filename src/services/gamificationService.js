// Gamification & Health Math Engine

export const ACTIVITY_MULTIPLIERS = {
  sedentary: { label: "Ít vận động (làm việc văn phòng)", factor: 1.2 },
  light: { label: "Vận động nhẹ (tập 1-3 buổi/tuần)", factor: 1.375 },
  moderate: { label: "Vận động vừa (tập 3-5 buổi/tuần)", factor: 1.55 },
  active: { label: "Vận động nhiều (tập 6-7 buổi/tuần)", factor: 1.725 },
  very_active: { label: "Vận động rất cao (VĐV/Lao động nặng)", factor: 1.9 }
};

export const BADGES = [
  { id: 'first_step', name: 'Bước Chân Đầu Tiên', icon: 'footprints', description: 'Hoàn thành ngày đăng ký đầu tiên' },
  { id: 'hydration_hero', name: 'Thánh Uống Nước', icon: 'droplet', description: 'Uống đủ chỉ tiêu nước 3 ngày liên tiếp' },
  { id: 'protein_king', name: 'Vua Nạp Đạm', icon: 'beef', description: 'Đạt chỉ tiêu Protein 5 ngày' },
  { id: 'iron_will', name: 'Ý Chí Thép', icon: 'flame', description: 'Đạt Streak 7 ngày liên tiếp' },
  { id: 'burn_master', name: 'Thiêu Rụi Calo', icon: 'zap', description: 'Tiêu hao trên 500 kcal vận động trong 1 ngày' },
  { id: 'vault_keeper', name: 'Nhật Ký Ảnh', icon: 'camera', description: 'Upload ít nhất 3 ảnh tiến trình' },
  { id: 'level_5', name: 'Chiến Binh Kỷ Luật', icon: 'shield-check', description: 'Đạt Level 5' },
  { id: 'level_10', name: 'Huyền Thoại Fitness', icon: 'crown', description: 'Đạt Level 10' }
];

export const LEVELS = [
  { level: 1, name: "Tân Binh Fitness", minXp: 0, icon: "seedling" },
  { level: 2, name: "Người Khởi Đầu", minXp: 100, icon: "sprout" },
  { level: 3, name: "Học Viên Kỷ Luật", minXp: 250, icon: "dumbbell" },
  { level: 4, name: "Năng Lượng Bứt Phá", minXp: 450, icon: "zap" },
  { level: 5, name: "Chiến Binh Kỷ Luật", minXp: 700, icon: "shield-check" },
  { level: 6, name: "Chuyên Gia Đốt Mỡ", minXp: 1000, icon: "flame" },
  { level: 7, name: "Bậc Thầy Dinh Dưỡng", minXp: 1400, icon: "apple" },
  { level: 8, name: "Vận Động Viên Bền Bỉ", minXp: 1900, icon: "trophy" },
  { level: 9, name: "Iron Body", minXp: 2500, icon: "medal" },
  { level: 10, name: "Huyền Thoại Fitness", minXp: 3200, icon: "crown" }
];

/**
 * Calculates BMR using Mifflin-St Jeor formula
 */
export function calculateBMR(gender, weightKg, heightCm, age) {
  if (!weightKg || !heightCm || !age) return 1600;
  const w = parseFloat(weightKg);
  const h = parseFloat(heightCm);
  const a = parseInt(age);

  if (gender === 'female') {
    return Math.round((10 * w) + (6.25 * h) - (5 * a) - 161);
  }
  // Default to male
  return Math.round((10 * w) + (6.25 * h) - (5 * a) + 5);
}

/**
 * Calculates TDEE
 */
export function calculateTDEE(bmr, activityLevel) {
  const mult = ACTIVITY_MULTIPLIERS[activityLevel]?.factor || 1.375;
  return Math.round(bmr * mult);
}

/**
 * Calculates Target Daily Calories with Deficit/Surplus Safeguards
 */
export function calculateTargetCalories(tdee, currentWeight, targetWeight, days = 60) {
  const diffKg = parseFloat(currentWeight) - parseFloat(targetWeight);
  
  if (diffKg === 0) return { targetCalories: tdee, deficit: 0, isSafe: true, warning: null };
  
  // Safe loss rate ~0.5kg/week = 3500 kcal deficit per week = 500 kcal/day deficit
  // Total calorie difference: 1kg fat ~= 7700 kcal
  const totalCalorieDiff = diffKg * 7700;
  let dailyAdjustment = Math.round(totalCalorieDiff / days);

  // Safeguard limits
  let isSafe = true;
  let warning = null;

  if (diffKg > 0) { // Weight Loss
    if (dailyAdjustment > 1000) {
      dailyAdjustment = 1000;
      isSafe = false;
      warning = "Mục tiêu giảm cân quá nhanh! Đã điều chỉnh thâm hụt tối đa 1000 kcal/ngày để an toàn sức khỏe.";
    }
    let target = tdee - dailyAdjustment;
    // BMR floor safeguard
    if (target < 1200) {
      target = 1200;
      isSafe = false;
      warning = "Mức calo tối thiểu an toàn là 1200 kcal/ngày để tránh suy nhược.";
    }
    return { targetCalories: target, deficit: -dailyAdjustment, isSafe, warning };
  } else { // Weight Gain
    if (Math.abs(dailyAdjustment) > 700) {
      dailyAdjustment = 500;
      isSafe = false;
      warning = "Mục tiêu tăng cân hợp lý khuyên dùng dư thừa 300-500 kcal/ngày.";
    }
    return { targetCalories: tdee + Math.abs(dailyAdjustment), deficit: Math.abs(dailyAdjustment), isSafe, warning };
  }
}

/**
 * Calculates Macro Distribution
 */
export function calculateMacros(targetCalories) {
  // Protein: 30%, Carb: 40%, Fat: 30%
  // Protein = 4 kcal/g, Carb = 4 kcal/g, Fat = 9 kcal/g
  const proteinGrams = Math.round((targetCalories * 0.30) / 4);
  const carbGrams = Math.round((targetCalories * 0.40) / 4);
  const fatGrams = Math.round((targetCalories * 0.30) / 9);

  return { protein: proteinGrams, carb: carbGrams, fat: fatGrams };
}

/**
 * Calculates Water Target in ml
 */
export function calculateWaterTarget(weightKg, activityLevel = 'moderate') {
  const baseMl = parseFloat(weightKg || 70) * 35; // 35ml per kg
  const bonus = activityLevel === 'active' || activityLevel === 'very_active' ? 500 : 0;
  return Math.round(baseMl + bonus);
}

/**
 * Evaluates Level from total XP
 */
export function getLevelInfo(totalXp = 0) {
  let currentLevel = LEVELS[0];
  let nextLevel = LEVELS[1];

  for (let i = 0; i < LEVELS.length; i++) {
    if (totalXp >= LEVELS[i].minXp) {
      currentLevel = LEVELS[i];
      nextLevel = LEVELS[i + 1] || null;
    }
  }

  const currentLevelMin = currentLevel.minXp;
  const nextLevelMin = nextLevel ? nextLevel.minXp : currentLevelMin + 1000;
  const xpInCurrentLevel = totalXp - currentLevelMin;
  const xpNeededForNext = nextLevelMin - currentLevelMin;
  const progressPercent = Math.min(100, Math.round((xpInCurrentLevel / xpNeededForNext) * 100));

  return {
    currentLevel,
    nextLevel,
    totalXp,
    xpInCurrentLevel,
    xpNeededForNext,
    progressPercent
  };
}

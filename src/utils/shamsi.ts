// Shamsi (Solar Hijri) Date Utility in TypeScript

export const PERSIAN_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند"
];

export const PERSIAN_WEEKDAYS = [
  "یکشنبه", // 0 (Sunday)
  "دوشنبه", // 1 (Monday)
  "سه‌شنبه", // 2 (Tuesday)
  "چهارشنبه", // 3 (Wednesday)
  "پنج‌شنبه", // 4 (Thursday)
  "جمعه", // 5 (Friday)
  "شنبه" // 6 (Saturday)
];

// Conversions based on the high-precision Jalaali mathematical algorithm

export function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_days_in_month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const j_days_in_month = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];

  let gy_calc = gy - 1600;
  let gm_calc = gm - 1;
  let gd_calc = gd - 1;

  let g_day_no = 365 * gy_calc + Math.floor((gy_calc + 3) / 4) - Math.floor((gy_calc + 99) / 100) + Math.floor((gy_calc + 399) / 400);

  for (let i = 0; i < gm_calc; ++i) g_day_no += g_days_in_month[i];
  if (gm_calc > 1 && ((gy_calc % 4 === 0 && gy_calc % 100 !== 0) || gy_calc % 400 === 0)) ++g_day_no;

  g_day_no += gd_calc;

  let j_day_no = g_day_no - 79;

  let j_np = Math.floor(j_day_no / 12053);
  j_day_no = j_day_no % 12053;

  let jy = 979 + 33 * j_np + 4 * Math.floor(j_day_no / 1461);

  j_day_no %= 1461;

  if (j_day_no >= 366) {
    jy += Math.floor((j_day_no - 1) / 365);
    j_day_no = (j_day_no - 1) % 365;
  }

  let i = 0;
  for (i = 0; i < 11 && j_day_no >= j_days_in_month[i]; ++i) {
    j_day_no -= j_days_in_month[i];
  }
  let jm = i + 1;
  let jd = j_day_no + 1;

  return [jy, jm, jd];
}

export function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  const g_days_in_month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const j_days_in_month = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];

  let jy_calc = jy - 979;
  let jm_calc = jm - 1;
  let jd_calc = jd - 1;

  let j_day_no = 365 * jy_calc + Math.floor(jy_calc / 33) * 8 + Math.floor(((jy_calc % 33) + 3) / 4);
  for (let i = 0; i < jm_calc; ++i) j_day_no += j_days_in_month[i];

  j_day_no += jd_calc;

  let g_day_no = j_day_no + 79;

  let gy = 1600 + 400 * Math.floor(g_day_no / 146097);
  g_day_no = g_day_no % 146097;

  let leap = true;
  if (g_day_no >= 36525) {
    g_day_no--;
    gy += 100 * Math.floor(g_day_no / 36524);
    g_day_no = g_day_no % 36524;

    if (g_day_no >= 365) {
      g_day_no++;
    } else {
      leap = false;
    }
  }

  gy += 4 * Math.floor(g_day_no / 1461);
  g_day_no = g_day_no % 1461;

  if (g_day_no >= 366) {
    leap = false;
    g_day_no--;
    gy += Math.floor(g_day_no / 365);
    g_day_no = g_day_no % 365;
  }

  let i = 0;
  for (i = 0; g_day_no >= g_days_in_month[i] + (i === 1 && leap ? 1 : 0); i++) {
    g_day_no -= g_days_in_month[i] + (i === 1 && leap ? 1 : 0);
  }
  let gm = i + 1;
  let gd = g_day_no + 1;

  return [gy, gm, gd];
}

// Convert Date object to Persian Solar date string
export function formatDateToShamsiString(date: Date): string {
  const gy = date.getFullYear();
  const gm = date.getMonth() + 1;
  const gd = date.getDate();
  const [jy, jm, jd] = gregorianToJalali(gy, gm, gd);
  return `${jd} ${PERSIAN_MONTHS[jm - 1]} ${jy}`;
}

// Get current date string in format YYYY/MM/DD
export function getCurrentJalaliDateString(): string {
  const now = new Date();
  const gy = now.getFullYear();
  const gm = now.getMonth() + 1;
  const gd = now.getDate();
  const [jy, jm, jd] = gregorianToJalali(gy, gm, gd);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${jy}/${pad(jm)}/${pad(jd)}`;
}

// Get current time string in format HH:MM
export function getCurrentJalaliTimeString(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

// Format raw string (YYYY-MM-DD) to Shamsi string
export function formatStringDateToShamsi(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      // It might be already a Shamsi string, let's keep it
      return dateStr;
    }
    return formatDateToShamsiString(d);
  } catch (e) {
    return dateStr;
  }
}

// Get standard weekday from Shamsi date
export function getShamsiWeekday(jy: number, jm: number, jd: number): string {
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
  const dayIndex = new Date(gy, gm - 1, gd).getDay();
  return PERSIAN_WEEKDAYS[dayIndex];
}

// Get standard weekday from Shamsi date string YYYY/MM/DD
export function getShamsiWeekdayFromString(dateStr: string): string {
  try {
    const parts = dateStr.split("/");
    if (parts.length !== 3) return "";
    const jy = parseInt(parts[0]);
    const jm = parseInt(parts[1]);
    const jd = parseInt(parts[2]);
    return getShamsiWeekday(jy, jm, jd);
  } catch (e) {
    return "";
  }
}

// Helper to determine if a Shamsi day is weekend in Iran (Thursday/Friday)
export function isShamsiWeekend(jy: number, jm: number, jd: number): boolean {
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
  const dayIndex = new Date(gy, gm - 1, gd).getDay();
  // 4: Thursday, 5: Friday
  return dayIndex === 4 || dayIndex === 5;
}

// Convert numbers to beautiful Persian digits
export function toPersianDigits(num: number | string): string {
  const id = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().replace(/[0-9]/g, function (w) {
    return id[+w];
  });
}

// Convert Persian digits back to English
export function toEnglishDigits(str: string): string {
  const id: Record<string, string> = {
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
    '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9'
  };
  return str.replace(/[۰-۹]/g, function (w) {
    return id[w];
  });
}

// Format currency to Toman with Persian digits
export function formatToman(priceInToman: number): string {
  return toPersianDigits(priceInToman.toLocaleString()) + " تومان";
}

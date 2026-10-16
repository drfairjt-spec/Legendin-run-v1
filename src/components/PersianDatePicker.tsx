import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { PERSIAN_MONTHS, PERSIAN_WEEKDAYS, jalaliToGregorian, gregorianToJalali, isShamsiWeekend, toPersianDigits } from "../utils/shamsi";

interface PersianDatePickerProps {
  value: string; // "JY/JM/JD" e.g., "1405/04/12"
  onChange: (newValue: string, isWeekend: boolean) => void;
}

export default function PersianDatePicker({ value, onChange }: PersianDatePickerProps) {
  // Parse initial state or fallback to current Shamsi date
  const parseValue = (val: string) => {
    const parts = val.split("/");
    if (parts.length === 3) {
      return {
        year: parseInt(parts[0]),
        month: parseInt(parts[1]),
        day: parseInt(parts[2])
      };
    }
    // Fallback: 2026-06-29 -> 1405/04/08
    const today = new Date();
    const [jy, jm, jd] = gregorianToJalali(today.getFullYear(), today.getMonth() + 1, today.getDate());
    return { year: jy, month: jm, day: jd };
  };

  const currentParsed = parseValue(value);
  const [year, setYear] = useState(currentParsed.year);
  const [month, setMonth] = useState(currentParsed.month);
  const [selectedDay, setSelectedDay] = useState(currentParsed.day);

  // When value prop changes, update local state
  useEffect(() => {
    const parsed = parseValue(value);
    setYear(parsed.year);
    setMonth(parsed.month);
    setSelectedDay(parsed.day);
  }, [value]);

  // Determine number of days in the Persian month
  const getDaysInMonth = (y: number, m: number) => {
    if (m >= 1 && m <= 6) return 31;
    if (m >= 7 && m <= 11) return 30;
    // Esfand (12) leap year logic (approximate: leap years occur every 4 or 33 years, 1403 was a leap year, next is 1407)
    const isLeap = (y - 1399) % 4 === 0; 
    return isLeap ? 30 : 29;
  };

  // Find the weekday index (0-6) of the 1st day of the Persian month
  // This helps us pad the calendar grid so Saturday is the first day of the week in Iranian view!
  // In Iran, week starts on Saturday (شنبه). Let's order the headers as:
  // Saturday (شنبه), Sunday (یک‌شنبه), Monday (دوشنبه), Tuesday (سه‌شنبه), Wednesday (چهارشنبه), Thursday (پنج‌شنبه), Friday (جمعه)
  const IR_WEEKDAYS_ORDER = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"];
  
  const getFirstDayOffset = (y: number, m: number) => {
    // Get gregorian date of JY/JM/01
    const [gy, gm, gd] = jalaliToGregorian(y, m, 1);
    const date = new Date(gy, gm - 1, gd);
    const day = date.getDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
    // Map day to IR order
    // standard: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    // IR order: 0=Sat, 1=Sun, 2=Mon, 3=Tue, 4=Wed, 5=Thu, 6=Fri
    const standardToIr = [1, 2, 3, 4, 5, 6, 0];
    return standardToIr[day];
  };

  const daysInMonth = getDaysInMonth(year, month);
  const offset = getFirstDayOffset(year, month);

  const handleDaySelect = (dayNum: number) => {
    setSelectedDay(dayNum);
    const formattedMonth = month.toString().padStart(2, "0");
    const formattedDay = dayNum.toString().padStart(2, "0");
    const dateStr = `${year}/${formattedMonth}/${formattedDay}`;
    const isW = isShamsiWeekend(year, month, dayNum);
    onChange(dateStr, isW);
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(prev => prev + 1);
    } else {
      setMonth(prev => prev + 1);
    }
  };

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(prev => prev - 1);
    } else {
      setMonth(prev => prev - 1);
    }
  };

  // Generate numbers for the grid
  const dayCells = [];
  // Padded cells
  for (let i = 0; i < offset; i++) {
    dayCells.push(null);
  }
  // Month days
  for (let i = 1; i <= daysInMonth; i++) {
    dayCells.push(i);
  }

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 space-y-4 shadow-md max-w-sm w-full mx-auto font-sans" dir="rtl">
      {/* Date Picker Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all"
        >
          <ChevronRight className="w-4 h-4" /> {/* Reversed direction for RTL view */}
        </button>

        <div className="text-center">
          <span className="font-bold text-sm tracking-wide text-indigo-400">
            {PERSIAN_MONTHS[month - 1]} {toPersianDigits(year)}
          </span>
        </div>

        <button
          type="button"
          onClick={handleNextMonth}
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all"
        >
          <ChevronLeft className="w-4 h-4" /> {/* Reversed direction for RTL view */}
        </button>
      </div>

      {/* Weekday Labels (Iran order starts with Saturday) */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400">
        {IR_WEEKDAYS_ORDER.map((wd, idx) => (
          <div key={idx} className={idx === 6 ? "text-rose-400" : ""}>
            {wd}
          </div>
        ))}
      </div>

      {/* Calendar Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {dayCells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="h-8"></div>;
          }

          const isSelected = selectedDay === day;
          const isWeekend = idx % 7 === 6 || idx % 7 === 5; // Friday or Thursday is weekend in IR order

          return (
            <button
              type="button"
              key={`day-${day}`}
              onClick={() => handleDaySelect(day)}
              className={`h-8 w-8 text-xs font-semibold rounded-lg flex items-center justify-center transition-all ${
                isSelected
                  ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400/20"
                  : isWeekend
                  ? "text-rose-400 hover:bg-slate-800"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              {toPersianDigits(day)}
            </button>
          );
        })}
      </div>

      {/* Footnote showing current selected date */}
      <div className="bg-slate-850 p-2 rounded-xl text-[10px] text-slate-400 flex items-center justify-center gap-1.5 font-sans">
        <CalendarIcon className="w-3.5 h-3.5 text-indigo-400" />
        تاریخ انتخابی: <span className="text-white font-bold">{toPersianDigits(selectedDay)} {PERSIAN_MONTHS[month - 1]} {toPersianDigits(year)}</span>
      </div>
    </div>
  );
}

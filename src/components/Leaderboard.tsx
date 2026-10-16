import React from "react";
import { User } from "../types";
import { Award, Star, TrendingUp, Sparkles, Trophy, CheckCircle, Target, ArrowUpRight } from "lucide-react";
import { toPersianDigits } from "../utils/shamsi";

interface LeaderboardProps {
  allUsers: User[];
  onSelectArtist: (artist: User) => void;
  onChangeTab: (tab: string) => void;
}

export default function Leaderboard({ allUsers = [], onSelectArtist, onChangeTab }: LeaderboardProps) {
  
  // Calculate profile strength
  const calculateProfileStrength = (user: User): number => {
    let score = 20; 
    if (user.avatar && !user.avatar.includes("default")) score += 15;
    if (user.bio && user.bio.length > 10) score += 15;
    if (user.skills && user.skills.length > 0) score += 15;
    if (user.portfolio && user.portfolio.length >= 3) score += 15;
    if (user.certifications && user.certifications.length > 0) score += 10;
    if (user.phone) score += 10;
    return Math.min(score, 100);
  };

  // Rank artists by star rating + profile strength
  const topArtists = (allUsers || [])
    .filter(u => u.role === "artist")
    .map(u => {
      const strength = calculateProfileStrength(u);
      const rating = u.rating || 4.0;
      const score = strength * 0.55 + rating * 20 * 0.45;
      return { ...u, strength, score };
    })
    .sort((a, b) => b.score - a.score);

  const getRankMedal = (index: number) => {
    switch (index) {
      case 0:
        return (
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center border border-amber-300">
            <Trophy className="w-4 h-4 text-amber-600" />
          </div>
        );
      case 1:
        return (
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-300">
            <Trophy className="w-4 h-4 text-slate-500" />
          </div>
        );
      case 2:
        return (
          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center border border-orange-300">
            <Trophy className="w-4 h-4 text-orange-600" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-xs font-extrabold text-slate-500 border border-slate-200">
            {toPersianDigits(index + 1)}
          </div>
        );
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 text-right" dir="rtl">
      
      {/* Intro Header */}
      <div className="bg-white border border-slate-100 rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <Award className="w-5 h-5 text-[#0284c7] shrink-0" />
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-slate-950 break-words">باشگاه نخبگان زیبایی و تالار مشاهیر</h2>
            <p className="text-[9.5px] sm:text-[10.5px] text-slate-500 break-words">جایگاه هنرمندان ممیزی‌شده با بیشترین میزان رضایت مشتری و تکمیل رزومه کاری.</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-[#0284c7]/10 text-[#0284c7] px-2.5 py-1 rounded-xl text-[11px] font-bold self-start md:self-auto shrink-0">
          <TrendingUp className="w-3.5 h-3.5 shrink-0" />
          <span>بروزرسانی هفتگی بر اساس پایش رضایت</span>
        </div>
      </div>

      {/* Gamification Badges Explainer */}
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="bg-white border border-indigo-100 rounded-xl p-3 space-y-1.5 text-right">
          <div className="flex items-center gap-1.5 text-indigo-700">
            <CheckCircle className="w-3.5 h-3.5" />
            <h4 className="text-[11px] font-bold">نشان طلایی «تأییدشده»</h4>
          </div>
          <p className="text-[9.5px] text-slate-500 leading-relaxed">
            مخصوص هنرمندان ممیزی شده توسط لجند با سابقه کارنامه طلایی و بیش از ۷ سال فعالیت مستمر بدون ثبت شکایت کیفی.
          </p>
        </div>

        <div className="bg-white border border-emerald-100 rounded-xl p-3 space-y-1.5 text-right">
          <div className="flex items-center gap-1.5 text-emerald-700">
            <Sparkles className="w-3.5 h-3.5" />
            <h4 className="text-[11px] font-bold">نشان سبز «استعداد نوظهور»</h4>
          </div>
          <p className="text-[9.5px] text-slate-500 leading-relaxed">
            اعطا شده به متخصصین خلاقی که رزومه‌ای عالی، کارهای نوآورانه و نمره قدرت پرونده بالاتر از ۸۰ درصد کسب کرده‌اند.
          </p>
        </div>

        <div className="bg-white border border-amber-100 rounded-xl p-3 space-y-1.5 text-right">
          <div className="flex items-center gap-1.5 text-amber-700">
            <Target className="w-3.5 h-3.5" />
            <h4 className="text-[11px] font-bold">نشان ستاره «برترین امتیاز»</h4>
          </div>
          <p className="text-[9.5px] text-slate-500 leading-relaxed">
            مختص معدود هنرمندانی که میانگین بازخورد رضایت مراجعین آن‌ها پس از دریافت خدمت همواره بالاتر از ۴.۹ باقی مانده باشد.
          </p>
        </div>
      </div>

      {/* Leaderboard list */}
      <div className="bg-white border border-slate-100 rounded-2xl p-3 sm:p-4 shadow-sm space-y-3 min-w-0">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider break-words">رتبه‌بندی صدرنشینان این هفته</h3>

        <div className="divide-y divide-slate-100">
          {topArtists.map((artist, idx) => {
            const isTopThree = idx < 3;
            const rowBg = isTopThree ? "bg-slate-50/50 hover:bg-slate-100/50" : "hover:bg-slate-50/30";

            return (
              <div 
                key={artist.id} 
                className={`flex flex-col sm:flex-row sm:items-center justify-between py-3 px-2.5 sm:px-3 rounded-xl transition-all ${rowBg} gap-2.5 min-w-0`}
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  {/* Rank indicator */}
                  <div className="shrink-0">
                    {getRankMedal(idx)}
                  </div>

                  {/* Profile Image */}
                  <img
                    src={artist.avatar}
                    alt={artist.name}
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover border border-slate-150 shrink-0"
                  />

                  {/* Text Details */}
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-900 flex flex-wrap items-center gap-1.5 break-words">
                      <span className="truncate max-w-full">{artist.name}</span>
                      {artist.rating && artist.rating >= 4.9 && (
                        <span className="bg-amber-100 text-amber-800 text-[8px] font-extrabold px-1.5 py-0.2 rounded shrink-0">برتر</span>
                      )}
                    </h4>
                    <p className="text-[10px] text-slate-500 truncate">{artist.title}</p>
                    <p className="text-[9px] text-slate-400 font-bold mt-0.5 truncate">{artist.city} • {toPersianDigits(artist.yearsOfExperience || 1)} سال سابقه ممیزی</p>
                  </div>
                </div>

                {/* Score Stats & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100/60">
                  {/* Rating display */}
                  <div className="text-right sm:text-left shrink-0">
                    <div className="flex items-center gap-0.5 text-amber-600 justify-start sm:justify-end">
                      <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400 shrink-0" />
                      <span className="text-xs font-extrabold">{toPersianDigits(artist.rating || 4.5)}</span>
                    </div>
                    <span className="text-[9px] text-slate-400 font-bold block mt-0.5">قدرت رزومه: {toPersianDigits(artist.strength)}٪</span>
                  </div>

                  {/* Quick Profile View Button */}
                  <button
                    onClick={() => {
                      onSelectArtist(artist);
                      onChangeTab("profile");
                    }}
                    className="bg-slate-100 hover:bg-[#0284c7] hover:text-white text-slate-600 px-3 py-2 sm:p-2 rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 text-xs sm:text-transparent shrink-0"
                    title="مشاهده مشخصات و آلبوم نمونه‌کار"
                  >
                    <span className="sm:hidden font-bold">مشاهده رزومه</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

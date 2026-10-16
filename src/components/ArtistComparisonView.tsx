import React, { useState, useMemo } from "react";
import { User } from "../types";
import { toPersianDigits } from "../utils/shamsi";
import { Scale, Users, Star, Award, ShieldCheck, Mail, MapPin, Sparkles, Send, Check } from "lucide-react";
import ArtistComparisonChart from "./ArtistComparisonChart";

interface ArtistComparisonViewProps {
  currentUser: User;
  artists: User[];
  calculateProfileStrength: (user: User) => number;
  onSendHiringOffer: (artist: User) => void;
  initialArtistAId?: string;
  initialArtistBId?: string;
}

export default function ArtistComparisonView({
  currentUser,
  artists,
  calculateProfileStrength,
  onSendHiringOffer,
  initialArtistAId,
  initialArtistBId
}: ArtistComparisonViewProps) {
  // Setup selectors for comparison
  const [selectedAId, setSelectedAId] = useState<string>(initialArtistAId || artists[0]?.id || "");
  const [selectedBId, setSelectedBId] = useState<string>(
    initialArtistBId || (artists[1]?.id ? artists[1].id : artists[0]?.id || "")
  );

  const artistA = useMemo(() => {
    return artists.find((a) => a.id === selectedAId) || artists[0];
  }, [artists, selectedAId]);

  const artistB = useMemo(() => {
    const found = artists.find((a) => a.id === selectedBId);
    if (found && found.id !== artistA?.id) return found;
    // Fallback to the first non-selected-A artist
    const fallback = artists.find((a) => a.id !== artistA?.id);
    return fallback || artists[1] || artists[0];
  }, [artists, selectedBId, artistA]);

  // Sync state if selection duplicates
  React.useEffect(() => {
    if (artistA && artistB && artistA.id === artistB.id) {
      // Pick a different fallback for B
      const alternate = artists.find((a) => a.id !== artistA.id);
      if (alternate) {
        setSelectedBId(alternate.id);
      }
    }
  }, [selectedAId, artists]);

  // Comparative highlights generator
  const comparisonSummary = useMemo(() => {
    if (!artistA || !artistB) return null;

    const ratingA = artistA.rating || 4.0;
    const ratingB = artistB.rating || 4.0;
    const expA = artistA.yearsOfExperience || 0;
    const expB = artistB.yearsOfExperience || 0;
    const strengthA = calculateProfileStrength(artistA);
    const strengthB = calculateProfileStrength(artistB);
    const skillsA = artistA.skills?.length || 0;
    const skillsB = artistB.skills?.length || 0;

    return {
      betterRating: ratingA !== ratingB ? (ratingA > ratingB ? artistA : artistB) : null,
      betterExperience: expA !== expB ? (expA > expB ? artistA : artistB) : null,
      betterStrength: strengthA !== strengthB ? (strengthA > strengthB ? artistA : artistB) : null,
      moreSkills: skillsA !== skillsB ? (skillsA > skillsB ? artistA : artistB) : null
    };
  }, [artistA, artistB, calculateProfileStrength]);

  if (!artistA || !artistB) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-6 text-center">
        <p className="text-xs text-slate-400 font-bold">جهت انجام مقایسه حداقل دو هنرمند باید در لیست فعال باشند.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm space-y-6 text-right" dir="rtl">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4.5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-[#0284c7]" />
            <h3 className="text-base font-bold text-slate-950">ابزار مقایسه تخصصی آرتیست‌ها (Comparison Dashboard)</h3>
          </div>
          <p className="text-[11px] text-slate-500">
            دو هنرمند برتر را به صورت همزمان مقایسه کنید، تعامل مهارتی آن‌ها را در موتور D3 بسنجید و بهترین تصمیم استخدامی را اتخاذ نمایید.
          </p>
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-2">
          {/* Artist A selector */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-slate-400">هنرمند اول (سبز):</span>
            <select
              value={selectedAId}
              onChange={(e) => setSelectedAId(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-bold px-2.5 py-1.5 rounded-xl text-slate-700 outline-none cursor-pointer"
            >
              {artists.map((a) => (
                <option key={a.id} value={a.id} disabled={a.id === selectedBId}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Icon Divider */}
          <span className="text-slate-300 font-mono text-xs">VS</span>

          {/* Artist B selector */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-slate-400">هنرمند دوم (سرمه‌ای):</span>
            <select
              value={selectedBId}
              onChange={(e) => setSelectedBId(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-bold px-2.5 py-1.5 rounded-xl text-slate-700 outline-none cursor-pointer"
            >
              {artists.map((a) => (
                <option key={a.id} value={a.id} disabled={a.id === selectedAId}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid: Info comparison + D3 radar chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left column: Side-by-Side Profiles */}
        <div className="lg:col-span-7 grid grid-cols-2 gap-4">
          
          {/* Artist A Card */}
          <div className="bg-slate-50/50 border border-[#0284c7]/20 rounded-2xl p-4 space-y-4">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="relative">
                <img
                  src={artistA.avatar}
                  alt={artistA.name}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-[#0284c7]"
                />
                <span className="absolute -bottom-1 -right-1 bg-[#0284c7] text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                  هنرمند اول
                </span>
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-900">{artistA.name}</h4>
                <p className="text-[10px] text-[#0284c7] font-bold leading-tight mt-0.5">{artistA.title}</p>
                <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mt-1 font-bold">
                  <MapPin className="w-3 h-3 shrink-0" /> {artistA.city}
                </div>
              </div>
            </div>

            {/* Quick stats list */}
            <div className="space-y-2 pt-1 border-t border-slate-150">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">سابقه کاری:</span>
                <span className="font-extrabold text-slate-800">{toPersianDigits(artistA.yearsOfExperience || 0)} سال</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">میانگین امتیاز:</span>
                <span className="font-extrabold text-amber-600 flex items-center gap-0.5">
                  ⭐ {toPersianDigits(artistA.rating || 4.5)}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">اعتبار پروفایل:</span>
                <span className="font-extrabold text-slate-800">{toPersianDigits(calculateProfileStrength(artistA))}٪</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">وضعیت همکاری:</span>
                {artistA.openForHiring ? (
                  <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[9px] font-bold">آماده به کار</span>
                ) : (
                  <span className="text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded text-[9px] font-bold">مشغول به کار</span>
                )}
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold">درباره هنرمند:</span>
              <p className="text-[10px] text-slate-600 leading-relaxed line-clamp-3 bg-white p-2 rounded-lg border border-slate-100 h-14 overflow-hidden">
                {artistA.bio}
              </p>
            </div>

            {/* Skills */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold">مهارت‌ها:</span>
              <div className="flex flex-wrap gap-1">
                {artistA.skills?.map((s, idx) => (
                  <span key={idx} className="bg-white border border-slate-150 text-slate-600 text-[9px] px-1.5 py-0.5 rounded">
                    {s.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Action Offer Button */}
            {currentUser.role === "manager" && (
              <button
                onClick={() => onSendHiringOffer(artistA)}
                className="w-full bg-[#0284c7] hover:bg-[#0369a1] text-white text-[10px] font-extrabold py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                جذب {artistA.name.split(" ")[0]}
              </button>
            )}
          </div>

          {/* Artist B Card */}
          <div className="bg-slate-50/50 border border-slate-250 rounded-2xl p-4 space-y-4">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="relative">
                <img
                  src={artistB.avatar}
                  alt={artistB.name}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-900"
                />
                <span className="absolute -bottom-1 -right-1 bg-slate-900 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                  هنرمند دوم
                </span>
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-900">{artistB.name}</h4>
                <p className="text-[10px] text-slate-600 font-bold leading-tight mt-0.5">{artistB.title}</p>
                <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mt-1 font-bold">
                  <MapPin className="w-3 h-3 shrink-0" /> {artistB.city}
                </div>
              </div>
            </div>

            {/* Quick stats list */}
            <div className="space-y-2 pt-1 border-t border-slate-150">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">سابقه کاری:</span>
                <span className="font-extrabold text-slate-800">{toPersianDigits(artistB.yearsOfExperience || 0)} سال</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">میانگین امتیاز:</span>
                <span className="font-extrabold text-amber-600 flex items-center gap-0.5">
                  ⭐ {toPersianDigits(artistB.rating || 4.5)}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">اعتبار پروفایل:</span>
                <span className="font-extrabold text-slate-800">{toPersianDigits(calculateProfileStrength(artistB))}٪</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">وضعیت همکاری:</span>
                {artistB.openForHiring ? (
                  <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[9px] font-bold">آماده به کار</span>
                ) : (
                  <span className="text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded text-[9px] font-bold">مشغول به کار</span>
                )}
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold">درباره هنرمند:</span>
              <p className="text-[10px] text-slate-600 leading-relaxed line-clamp-3 bg-white p-2 rounded-lg border border-slate-100 h-14 overflow-hidden">
                {artistB.bio}
              </p>
            </div>

            {/* Skills */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold">مهارت‌ها:</span>
              <div className="flex flex-wrap gap-1">
                {artistB.skills?.map((s, idx) => (
                  <span key={idx} className="bg-white border border-slate-150 text-slate-600 text-[9px] px-1.5 py-0.5 rounded">
                    {s.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Action Offer Button */}
            {currentUser.role === "manager" && (
              <button
                onClick={() => onSendHiringOffer(artistB)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-extrabold py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                جذب {artistB.name.split(" ")[0]}
              </button>
            )}
          </div>

        </div>

        {/* Right column: D3 Radar Chart Panel + Comparison Summary */}
        <div className="lg:col-span-5 space-y-4">
          <ArtistComparisonChart
            artistA={artistA}
            artistB={artistB}
            calculateProfileStrength={calculateProfileStrength}
          />

          {/* Winner Analytics / Badges panel */}
          {comparisonSummary && (
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4.5 space-y-3">
              <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                تحلیل مزیتی و نقاط قوت (Head-to-Head Winners)
              </h4>
              
              <div className="space-y-2.5 pt-1.5">
                {/* 1. Rating Winner */}
                {comparisonSummary.betterRating && (
                  <div className="flex justify-between items-center bg-white border border-slate-150 rounded-xl px-3 py-2 text-xs">
                    <span className="text-slate-500">بالاترین امتیاز رضایت مراجعین:</span>
                    <span className="font-extrabold text-[#0284c7] flex items-center gap-1 bg-[#0284c7]/10 px-2.5 py-1 rounded-lg text-[10px]">
                      <Star className="w-3 h-3 fill-amber-400 stroke-amber-400" />
                      {comparisonSummary.betterRating.name}
                    </span>
                  </div>
                )}

                {/* 2. Experience Winner */}
                {comparisonSummary.betterExperience && (
                  <div className="flex justify-between items-center bg-white border border-slate-150 rounded-xl px-3 py-2 text-xs">
                    <span className="text-slate-500">سابقه و تجربه کارگاه ممیزی شده:</span>
                    <span className="font-extrabold text-[#0284c7] flex items-center gap-1 bg-[#0284c7]/10 px-2.5 py-1 rounded-lg text-[10px]">
                      <Award className="w-3 h-3 text-[#0284c7]" />
                      {comparisonSummary.betterExperience.name}
                    </span>
                  </div>
                )}

                {/* 3. Strength Winner */}
                {comparisonSummary.betterStrength && (
                  <div className="flex justify-between items-center bg-white border border-slate-150 rounded-xl px-3 py-2 text-xs">
                    <span className="text-slate-500">اعتبار رزومه و قدرت پروفایل:</span>
                    <span className="font-extrabold text-[#0284c7] flex items-center gap-1 bg-[#0284c7]/10 px-2.5 py-1 rounded-lg text-[10px]">
                      <ShieldCheck className="w-3 h-3 text-[#0284c7]" />
                      {comparisonSummary.betterStrength.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

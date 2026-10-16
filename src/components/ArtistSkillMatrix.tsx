import React, { useState, useMemo } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend
} from "recharts";
import { User } from "../types";
import { toPersianDigits } from "../utils/shamsi";
import { Award, ShieldAlert, Sparkles, HelpCircle } from "lucide-react";

interface ArtistSkillMatrixProps {
  currentUser: User;
  artists: User[];
  selectedArtistId?: string;
}

// Fixed skill profiles across 6 core beauty categories for seed artists
const ARTIST_METRICS_DATABASE: Record<string, {
  hairColor: number;
  hairCut: number;
  makeup: number;
  nails: number;
  skinCare: number;
  lashes: number;
}> = {
  "a1": { hairColor: 98, hairCut: 92, makeup: 40, nails: 25, skinCare: 30, lashes: 60 },
  "a2": { hairColor: 65, hairCut: 96, makeup: 50, nails: 15, skinCare: 45, lashes: 20 },
  "a3": { hairColor: 30, hairCut: 45, makeup: 99, nails: 35, skinCare: 70, lashes: 92 },
  "a4": { hairColor: 15, hairCut: 20, makeup: 30, nails: 100, skinCare: 25, lashes: 40 },
  "a5": { hairColor: 10, hairCut: 15, makeup: 55, nails: 30, skinCare: 95, lashes: 50 },
  "a6": { hairColor: 85, hairCut: 75, makeup: 65, nails: 40, skinCare: 55, lashes: 50 }
};

const CATEGORIES_TRANSLATIONS = [
  { key: "hairColor", label: "رنگ و لایت تخصصی" },
  { key: "hairCut", label: "کوپ و استایل مو" },
  { key: "makeup", label: "میکاپ و کانتورینگ" },
  { key: "nails", label: "کاشت و دیزاین ناخن" },
  { key: "skinCare", label: "پاکسازی و سلامت پوست" },
  { key: "lashes", label: "اکستنشن مژه و ابرو" }
];

export default function ArtistSkillMatrix({ currentUser, artists = [], selectedArtistId: propSelectedArtistId }: ArtistSkillMatrixProps) {
  // Try to find the active logged-in artist ID, default to prop, or current user, or first artist
  const defaultArtistId = propSelectedArtistId || (currentUser.role === "artist" ? currentUser.id : artists[0]?.id || "a1");
  const [selectedArtistId, setSelectedArtistId] = useState<string>(defaultArtistId);
  const [compareArtistId, setCompareArtistId] = useState<string>("");

  // Sync if prop selectedArtistId changes
  React.useEffect(() => {
    if (propSelectedArtistId) {
      setSelectedArtistId(propSelectedArtistId);
    }
  }, [propSelectedArtistId]);

  const currentArtist = useMemo(() => {
    return artists.find(a => a.id === selectedArtistId) || artists[0] || currentUser;
  }, [selectedArtistId, artists, currentUser]);

  const compareArtist = useMemo(() => {
    if (!compareArtistId) return null;
    return artists.find(a => a.id === compareArtistId) || null;
  }, [compareArtistId, artists]);

  // Construct Radar Chart Data
  const chartData = useMemo(() => {
    const mainMetrics = ARTIST_METRICS_DATABASE[currentArtist.id] || { hairColor: 65, hairCut: 70, makeup: 60, nails: 50, skinCare: 55, lashes: 60 };
    const compMetrics = compareArtist ? (ARTIST_METRICS_DATABASE[compareArtist.id] || { hairColor: 50, hairCut: 50, makeup: 50, nails: 50, skinCare: 50, lashes: 50 }) : null;

    return CATEGORIES_TRANSLATIONS.map(cat => {
      const result: any = {
        subject: cat.label,
        [currentArtist.name]: mainMetrics[cat.key as keyof typeof mainMetrics]
      };
      if (compMetrics && compareArtist) {
        result[compareArtist.name] = compMetrics[cat.key as keyof typeof compMetrics];
      }
      return result;
    });
  }, [currentArtist, compareArtist]);

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-5 text-right" dir="rtl">
      
      {/* Header and Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <Award className="w-5 h-5 text-[#0284c7]" />
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">ماتریس مهارتی و ارزیابی چندبعدی</h3>
          </div>
          <p className="text-[10px] text-slate-500">
            نمودار راداری ارزیابی شایستگی‌های فنی در ۶ لاین زیبایی بر اساس نمرات فنی پلتفرم لجند.
          </p>
        </div>

        {/* Dynamic Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {!propSelectedArtistId && (
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-bold text-slate-400">آرتیست:</span>
              <select
                value={selectedArtistId}
                onChange={(e) => setSelectedArtistId(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-[10px] font-bold px-2.5 py-1.5 rounded-lg text-slate-700 outline-none cursor-pointer"
              >
                {artists.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1">
            <span className="text-[9px] font-bold text-slate-400">مقایسه با:</span>
            <select
              value={compareArtistId}
              onChange={(e) => setCompareArtistId(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-[10px] font-bold px-2.5 py-1.5 rounded-lg text-slate-700 outline-none cursor-pointer"
            >
              <option value="">— انتخاب همکار —</option>
              {(artists || []).filter(a => a?.id !== currentArtist?.id).map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-12 gap-5 items-center">
        {/* Radar Chart Panel */}
        <div className="md:col-span-7 flex justify-center items-center h-64 relative select-none">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
              <PolarGrid stroke="#f1f5f9" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: "#64748b", fontSize: 8.5, fontWeight: 700 }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={{ fill: "#94a3b8", fontSize: 7, fontFamily: "monospace" }}
              />
              
              {/* Target artist radar area */}
              <Radar
                name={currentArtist.name}
                dataKey={currentArtist.name}
                stroke="#0284c7"
                fill="#0284c7"
                fillOpacity={0.3}
              />

              {/* Compare artist radar area */}
              {compareArtist && (
                <Radar
                  name={compareArtist.name}
                  dataKey={compareArtist.name}
                  stroke="#4f46e5"
                  fill="#818cf8"
                  fillOpacity={0.2}
                />
              )}
              
              <Legend verticalAlign="bottom" height={24} iconType="circle" wrapperStyle={{ fontSize: 9.5, fontWeight: "bold" }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Detailed Stats Panel */}
        <div className="md:col-span-5 space-y-3">
          <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl space-y-2.5">
            <h4 className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              خلاصه وضعیت شایستگی فنی {currentArtist.name}
            </h4>
            
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500">شاخص رضایت مراجعین:</span>
                <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                  ⭐️ {toPersianDigits(currentArtist.rating || 4.7)}
                </span>
              </div>
              
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500">سطح فنی ممیزی پلتفرم:</span>
                <span className="font-bold text-[#0284c7] bg-[#0284c7]/10 px-2 py-0.5 rounded">
                  {currentArtist.title.split("در")[0] || "متخصص ارشد"}
                </span>
              </div>
            </div>
          </div>

          <div className="border border-slate-100 p-3 rounded-xl text-right flex gap-2">
            <HelpCircle className="w-4 h-4 text-[#0284c7] shrink-0 mt-0.5" />
            <p className="text-[9.5px] text-slate-400 leading-normal">
              نمرات مهارت‌های فنی به صورت فصلی بر اساس کارگاه‌های ارزیابی لجند و بازخورد مشتریان واقعی به‌روزرسانی می‌شود.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}

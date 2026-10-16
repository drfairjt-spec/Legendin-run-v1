import React from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip
} from "recharts";
import { User, Skill } from "../types";
import { toPersianDigits } from "../utils/shamsi";
import { Sparkles, HelpCircle, TrendingUp, Award, Zap } from "lucide-react";

interface ArtistSkillRadarProps {
  profileUser: User;
  canEditProfile: boolean;
  onUpdateSkills: (updatedSkills: Skill[]) => void;
}

export default function ArtistSkillRadar({
  profileUser,
  canEditProfile,
  onUpdateSkills
}: ArtistSkillRadarProps) {
  const skills = profileUser.skills || [];

  // Generate Recharts-compatible data
  const chartData = React.useMemo(() => {
    return skills.map(skill => {
      const currentLevel = skill.level !== undefined ? skill.level : 80;
      return {
        subject: skill.name,
        "سطح تسلط فعلی": currentLevel,
        "حداقل انتظار بازار": 70,
        "استاندارد طلایی": 95
      };
    });
  }, [skills]);

  const handleLevelChange = (index: number, newLevel: number) => {
    const updated = skills.map((s, idx) =>
      idx === index ? { ...s, level: newLevel } : s
    );
    onUpdateSkills(updated);
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-5 text-right" dir="rtl">
      
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">نمودار راداری پیشرفت و توسعه مهارت‌ها</h3>
          </div>
          <p className="text-[10px] text-slate-400 font-bold leading-normal">
            تحلیل چندبعدی سطح تسلط بر روی تخصص‌های ثبت‌شده در مقایسه با استانداردهای پلتفرم.
          </p>
        </div>
        <div className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-extrabold px-2.5 py-1.5 rounded-xl self-start sm:self-auto flex items-center gap-1">
          <Zap className="w-3.5 h-3.5" />
          <span>پویا و تعاملی</span>
        </div>
      </div>

      {skills.length < 3 ? (
        // Empty state / Guide to add more skills
        <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
            <HelpCircle className="w-5 h-5 text-slate-400" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-extrabold text-slate-700">ترسیم نمودار راداری مهارت‌ها</h4>
            <p className="text-[10.5px] text-slate-400 font-bold leading-normal max-w-sm mx-auto">
              برای ترسیم و نمایش دقیق ابعاد مهارتی بر روی نمودار راداری، لطفا حداقل <span className="text-indigo-600 font-extrabold">۳ مهارت یا تخصص اصلی</span> در بخش بالا ثبت کنید.
            </p>
          </div>
          {skills.length > 0 && (
            <div className="pt-2 border-t border-slate-200/60 max-w-xs mx-auto text-right space-y-2">
              <p className="text-[9.5px] text-slate-500 font-extrabold text-center">ویرایش سطح تسلط مهارت‌های فعلی:</p>
              {skills.map((skill, sIdx) => (
                <div key={sIdx} className="space-y-1 bg-white p-2 rounded-lg border border-slate-150">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-600 font-bold">{skill.name}</span>
                    <span className="font-mono text-[#0284c7] font-extrabold">{toPersianDigits(skill.level !== undefined ? skill.level : 80)}٪</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={skill.level !== undefined ? skill.level : 80}
                    onChange={(e) => handleLevelChange(sIdx, parseInt(e.target.value))}
                    className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#0284c7]"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-12 gap-5 items-center">
          
          {/* Radar Chart Visualizer */}
          <div className="md:col-span-7 flex justify-center items-center h-64 relative select-none">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: "#475569", fontSize: 8.5, fontWeight: 700 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ fill: "#94a3b8", fontSize: 7, fontFamily: "monospace" }}
                />
                
                {/* Platform Target Benchmark */}
                <Radar
                  name="استاندارد طلایی (۹۵٪)"
                  dataKey="استاندارد طلایی"
                  stroke="#d97706"
                  fill="#fef3c7"
                  fillOpacity={0.05}
                  strokeDasharray="3 3"
                />

                {/* Market Minimum Expectation */}
                <Radar
                  name="حداقل انتظار بازار (۷۰٪)"
                  dataKey="حداقل انتظار بازار"
                  stroke="#f43f5e"
                  fill="#ffe4e6"
                  fillOpacity={0.02}
                  strokeDasharray="4 4"
                />

                {/* Artist Current Proficiency */}
                <Radar
                  name="سطح تسلط فعلی آرتیست"
                  dataKey="سطح تسلط فعلی"
                  stroke="#4f46e5"
                  fill="#818cf8"
                  fillOpacity={0.25}
                />
                
                <Tooltip 
                  formatter={(value: any) => [`${toPersianDigits(value)}٪`, ""]}
                  contentStyle={{ direction: "rtl", textAlign: "right", borderRadius: "12px", fontSize: "10.5px", fontWeight: "bold" }}
                />
                <Legend verticalAlign="bottom" height={24} iconType="circle" wrapperStyle={{ fontSize: 9, fontWeight: "bold" }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Interactive Control Panel & Benchmarks */}
          <div className="md:col-span-5 space-y-4">
            
            {/* Sliders for self-editing or manager auditing */}
            <div className="bg-slate-50 border border-slate-150 rounded-xl p-3.5 space-y-3.5">
              <h4 className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                {canEditProfile ? "تنظیم سطح تسلط تخصصی" : "جزئیات امتیاز مهارت‌ها"}
              </h4>

              <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                {skills.map((skill, sIdx) => {
                  const currentLvl = skill.level !== undefined ? skill.level : 80;
                  return (
                    <div key={sIdx} className="space-y-1">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-600 font-bold truncate max-w-[120px]" title={skill.name}>
                          {skill.name}
                        </span>
                        <span className="font-mono text-indigo-600 font-extrabold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                          {toPersianDigits(currentLvl)}٪
                        </span>
                      </div>
                      {canEditProfile ? (
                        <input
                          type="range"
                          min="10"
                          max="100"
                          step="5"
                          value={currentLvl}
                          onChange={(e) => handleLevelChange(sIdx, parseInt(e.target.value))}
                          className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                      ) : (
                        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-600 transition-all duration-300"
                            style={{ width: `${currentLvl}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Platform audit notice */}
            <div className="border border-slate-100 bg-white p-3 rounded-xl flex gap-2">
              <Award className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[9.5px] text-slate-400 leading-normal font-medium">
                ارتقای مستمر سطح تسلط به افزایش اعتماد مراجعین و در نتیجه رشد تعداد نوبت‌ها و درآمد کلی سالن منجر می‌شود.
              </p>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}

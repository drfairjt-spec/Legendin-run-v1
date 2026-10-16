import React, { useState, useMemo } from "react";
import { User, Service } from "../types";
import { Search, MapPin, Star, Sparkles, Clock, ChevronLeft, Filter, Users, Briefcase, Award } from "lucide-react";
import { seedServices } from "../data";

interface SalonDiscoveryViewProps {
  currentUser: User;
  allUsers: User[];
  onSelectSalon: (salonManager: User, highlightedArtistId?: string, highlightedServiceCategory?: string) => void;
}

const CATEGORIES = [
  "همه خدمات",
  "رنگ و لایت مو",
  "استایل و کوتاهی",
  "میکاپ و گریم",
  "خدمات ناخن",
  "پوست و فیشیال",
  "مژه و ابرو"
];

export const SalonDiscoveryView: React.FC<SalonDiscoveryViewProps> = ({
  allUsers,
  onSelectSalon
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("همه خدمات");

  // Get all salon managers
  const salons = useMemo(() => {
    return allUsers.filter(u => u.role === "manager");
  }, [allUsers]);

  // Get all artists
  const artists = useMemo(() => {
    return allUsers.filter(u => u.role === "artist");
  }, [allUsers]);

  // Filter salons matching search and category
  const filteredSalons = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return salons.filter(salon => {
      // Find artists belonging to this salon
      const salonArtists = artists.filter(a =>
        a.managerId === salon.id ||
        (salon.salonName && a.salonName && (a.salonName.includes(salon.salonName) || salon.salonName.includes(a.salonName)))
      );

      // Check category filter
      if (selectedCategory !== "همه خدمات") {
        const matchesCategory = salonArtists.some(artist =>
          artist.skills?.some(s => s.category.includes(selectedCategory) || s.name.includes(selectedCategory)) ||
          artist.title?.includes(selectedCategory)
        );
        if (!matchesCategory) return false;
      }

      // If search query is empty, return true
      if (!q) return true;

      // 1. Check salon name / city / description
      const matchesSalon =
        (salon.salonName && salon.salonName.toLowerCase().includes(q)) ||
        salon.name.toLowerCase().includes(q) ||
        (salon.city && salon.city.toLowerCase().includes(q)) ||
        (salon.salonLocation && salon.salonLocation.toLowerCase().includes(q)) ||
        (salon.salonDescription && salon.salonDescription.toLowerCase().includes(q));

      if (matchesSalon) return true;

      // 2. Check artist names or specialties inside this salon
      const matchingArtist = salonArtists.find(a =>
        a.name.toLowerCase().includes(q) ||
        (a.title && a.title.toLowerCase().includes(q)) ||
        a.skills?.some(s => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q))
      );

      if (matchingArtist) return true;

      // 3. Check services matching this query
      const matchingService = seedServices.find(s =>
        s.name.toLowerCase().includes(q)
      );

      if (matchingService) {
        // Check if any artist in this salon provides a skill matching this service
        return salonArtists.some(a =>
          a.skills?.some(sk => sk.name.includes(matchingService.name) || matchingService.name.includes(sk.name))
        );
      }

      return false;
    });
  }, [salons, artists, searchQuery, selectedCategory]);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-10 font-sans text-gray-800">
      {/* Hero Section & Search Bar */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-8 sm:p-12 shadow-2xl border border-gray-800">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-[#0284c7]/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-gray-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>کشف برترین سالن‌ها و آرتیست‌های زیبایی</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            رزرو آنلاین و رزومه زنده <span className="text-[#38bdf8]">مراکز زیبایی لوکس</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-300 font-medium leading-relaxed">
            نام سالن، نام آرتیست مورد نظر یا تخصص (مثل بالیاژ، فیشیال، کاشت ناخن) را جستجو کنید و مستقیماً وارد پروفایل سالن شوید.
          </p>

          {/* Search Box */}
          <div className="relative mt-4">
            <div className="flex items-center bg-white rounded-2xl shadow-2xl p-2 sm:p-2.5 border border-gray-200 focus-within:ring-4 focus-within:ring-[#0284c7]/30 transition-all">
              <Search className="w-5 h-5 text-gray-400 mr-3 shrink-0" />
              <input
                type="text"
                placeholder="جستجو بر اساس نام سالن، نام آرتیست، خدمت یا تخصص..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-gray-900 text-xs sm:text-sm font-semibold px-2 py-2 focus:outline-none placeholder:text-gray-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-xs text-gray-400 hover:text-gray-600 px-2 font-bold transition-colors cursor-pointer"
                >
                  پاک کردن
                </button>
              )}
            </div>
          </div>

          {/* Quick Examples */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <span className="text-[11px] text-gray-400 font-medium">جستجوهای پرطرفدار:</span>
            {["بالیاژ", "فیشیال پوست", "کاشت ناخن", "خانه زیبایی لجند", "میکاپ عروس"].map((tag) => (
              <button
                key={tag}
                onClick={() => setSearchQuery(tag)}
                className="text-[11px] font-bold px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-gray-200 transition-all cursor-pointer border border-white/5"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#0284c7]" />
            <span>دسته‌بندی خدمات سالن‌ها</span>
          </h2>
          <span className="text-xs font-bold text-gray-500">
            {filteredSalons.length} مرکز فعال پیدا شد
          </span>
        </div>

        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 no-scrollbar">
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                  active
                    ? "bg-[#0284c7] text-white shadow-md shadow-[#0284c7]/20 scale-[1.02]"
                    : "bg-gray-100 hover:bg-gray-200/80 text-gray-700 border border-gray-200/60"
                }`}
              >
                <span>{cat}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Salons Grid */}
      {filteredSalons.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-3xl p-12 text-center space-y-4 max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-gray-200/60 flex items-center justify-center mx-auto text-gray-400">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-gray-800">هیچ سالنی با این مشخصات یافت نشد</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            لطفاً کلمات کلیدی دیگری را امتحان کنید یا دسته‌بندی را روی حالت «همه خدمات» قرار دهید.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("همه خدمات");
            }}
            className="px-5 py-2.5 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
          >
            مشاهده تمام سالن‌ها
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {filteredSalons.map((salon) => {
            // Find artists for this salon
            const salonArtists = artists.filter(a =>
              a.managerId === salon.id ||
              (salon.salonName && a.salonName && (a.salonName.includes(salon.salonName) || salon.salonName.includes(a.salonName)))
            );

            // Independent salon rating
            const salonRating = salon.rating || 4.85;
            const reviewsCount = salon.reviews?.length || 12;

            return (
              <div
                key={salon.id}
                onClick={() => onSelectSalon(salon)}
                className="group bg-white rounded-3xl border border-gray-200/80 hover:border-[#0284c7]/40 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between cursor-pointer"
              >
                <div>
                  {/* Cover Banner */}
                  <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-gray-100">
                    <img
                      src={salon.coverImage}
                      alt={salon.salonName || salon.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Hiring Badge Requirement 5 */}
                    {salon.openForHiring && (
                      <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-emerald-500/90 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-[11px] font-black shadow-lg border border-emerald-400/40 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                        <span>🟢 در حال جذب نیرو (Hiring Now)</span>
                      </div>
                    )}

                    {/* Independent Salon Rating Requirement 4 */}
                    <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-bold border border-white/10 shadow-md">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span>{salonRating}</span>
                      <span className="text-[10px] text-gray-300">({reviewsCount} نظر سالن)</span>
                    </div>

                    {/* Avatar Logo & Salon Name */}
                    <div className="absolute bottom-4 right-4 left-4 flex items-end gap-3.5 z-10">
                      <img
                        src={salon.avatar}
                        alt="Salon Logo"
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 border-white shadow-xl object-cover bg-white shrink-0"
                      />
                      <div className="text-white overflow-hidden pb-1">
                        <h3 className="text-base sm:text-lg font-black tracking-tight leading-snug truncate">
                          {salon.salonName || salon.name}
                        </h3>
                        <p className="text-xs text-gray-200 font-medium flex items-center gap-1.5 mt-0.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                          <span>{salon.salonLocation || salon.city || "تهران"}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 sm:p-6 space-y-4">
                    <p className="text-xs sm:text-sm text-gray-600 font-normal leading-relaxed line-clamp-2">
                      {salon.salonDescription || salon.bio || "ارائه خدمات تخصصی زیبایی با مجرب‌ترین کادر آرایشی و محیطی لوکس."}
                    </p>

                    {/* Team Preview Highlights */}
                    <div className="pt-2 border-t border-gray-100">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-2.5 font-bold">
                        <span className="flex items-center gap-1.5 text-gray-700">
                          <Users className="w-4 h-4 text-[#0284c7]" />
                          <span>تیم آرتیست‌های سالن ({salonArtists.length} نفر)</span>
                        </span>
                      </div>

                      {salonArtists.length > 0 ? (
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div className="flex -space-x-2 space-x-reverse overflow-hidden">
                            {salonArtists.slice(0, 4).map((artist) => (
                              <img
                                key={artist.id}
                                src={artist.avatar}
                                alt={artist.name}
                                title={artist.name}
                                className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover shadow-sm"
                              />
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-1.5 overflow-hidden">
                            {Array.from(new Set(salonArtists.flatMap(a => a.skills?.map(s => s.category) || [a.title || "تخصصی"]))).slice(0, 3).map((cat, idx) => (
                              <span
                                key={idx}
                                className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-1 rounded-lg"
                              >
                                {cat}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">در حال تکمیل کادر تخصصی سالن...</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer / CTA - STRICTLY ONLY ONE ACTION BUTTON Requirement 1 */}
                <div className="px-5 sm:px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-semibold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span>پذیرش آنلاین فعال</span>
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectSalon(salon);
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#0284c7] group-hover:bg-[#0369a1] text-white text-xs font-extrabold rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    <span>مشاهده پروفایل سالن</span>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

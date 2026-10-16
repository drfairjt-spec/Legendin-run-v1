import React, { useMemo } from "react";
import { User } from "../types";
import { 
  MapPin, Star, Clock, Phone, Mail, Globe, Instagram, Send, 
  Sparkles, Users, Award, Scissors, ChevronLeft, CheckCircle2, 
  Briefcase, Image as ImageIcon, ShieldCheck 
} from "lucide-react";

interface SalonProfileHubProps {
  salonManager: User;
  allUsers: User[];
  onSelectArtist: (artist: User) => void;
}

export const SalonProfileHub: React.FC<SalonProfileHubProps> = ({
  salonManager,
  allUsers,
  onSelectArtist
}) => {
  // Find all artists belonging to this salon
  const salonArtists = useMemo(() => {
    return allUsers.filter(u => {
      if (u.role !== "artist") return false;
      if (u.managerId === salonManager.id) return true;
      if (salonManager.salonName && u.salonName && (u.salonName.includes(salonManager.salonName) || salonManager.salonName.includes(u.salonName))) {
        return true;
      }
      return false;
    });
  }, [allUsers, salonManager]);

  // Independent salon rating Requirement 4
  const salonRating = salonManager.rating || 4.85;
  const reviewsCount = salonManager.reviews?.length || 15;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-10 font-sans text-gray-800">
      {/* Cover Banner & Header */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-lg overflow-hidden">
        <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-gray-900">
          <img
            src={salonManager.coverImage}
            alt={salonManager.salonName || salonManager.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

          {/* Hiring Banner Requirement 5 */}
          {salonManager.openForHiring && (
            <div className="absolute top-5 right-5 z-10 flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-2xl text-xs font-black shadow-xl border border-emerald-300/40 animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
              <span>🟢 در حال جذب نیرو (We're Hiring - Join Our Team)</span>
            </div>
          )}

          {/* Independent Salon Rating Requirement 4 */}
          <div className="absolute top-5 left-5 z-10 flex items-center gap-2 bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-2xl text-sm font-black border border-white/15 shadow-xl">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>{salonRating}</span>
            <span className="text-xs text-gray-300 font-normal">({reviewsCount} نظر اختصاصی سالن)</span>
          </div>

          {/* Logo & Main Title */}
          <div className="absolute bottom-6 right-6 left-6 flex flex-col sm:flex-row sm:items-end gap-5 z-10">
            <img
              src={salonManager.avatar}
              alt="Salon Logo"
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl border-4 border-white shadow-2xl object-cover bg-white shrink-0"
            />
            <div className="text-white space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-[#0284c7]/80 backdrop-blur-md text-white text-[11px] font-bold">
                  مرکز زیبایی تایید شده
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {salonManager.salonName || salonManager.name}
              </h1>
              <p className="text-xs sm:text-sm text-gray-200 flex items-center gap-2 font-medium">
                <MapPin className="w-4 h-4 text-amber-300 shrink-0" />
                <span>{salonManager.salonLocation || salonManager.city || "تهران"}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Salon Hub Overview Navigation & Quick Stats */}
        <div className="p-6 sm:p-8 bg-gray-50/50 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2 md:col-span-2">
            <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#0284c7]" />
              <span>درباره سالن و امکانات</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed font-normal">
              {salonManager.salonDescription || salonManager.bio || "محیطی لوکس و آرام همراه با کادری کارآزموده در زمینه خدمات تخصصی مو، پوست و ناخن."}
            </p>
          </div>

          {/* Social Media Links & Contact */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-3">
            <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider">راه‌های ارتباطی و شبکه‌ها</h3>
            <div className="space-y-2 text-xs text-gray-600 font-medium">
              {salonManager.contactAllowed !== false && salonManager.phone && (
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-[#0284c7] shrink-0" />
                  <span className="dir-ltr font-mono">{salonManager.phone}</span>
                </div>
              )}
              {salonManager.socialLinks?.instagram && (
                <div className="flex items-center gap-2.5">
                  <Instagram className="w-4 h-4 text-pink-600 shrink-0" />
                  <span className="dir-ltr font-mono">{salonManager.socialLinks.instagram}</span>
                </div>
              )}
              {salonManager.socialLinks?.website && (
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="dir-ltr font-mono">{salonManager.socialLinks.website}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Working Hours & Salon Gallery Requirement 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Working Hours */}
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-gray-200/80 shadow-sm space-y-4">
          <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#0284c7]" />
            <span>ساعات کاری سالن</span>
          </h2>
          <div className="space-y-3 pt-2 divide-y divide-gray-100">
            {(salonManager.workingHoursSchedule || [
              { day: "شنبه تا چهارشنبه", hours: "۱۰:۰۰ الی ۲۰:۰۰" },
              { day: "پنجشنبه", hours: "۱۰:۰۰ الی ۱۸:۰۰" },
              { day: "جمعه", hours: "تعطیل با هماهنگی قبلی" }
            ]).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between pt-2.5 text-xs font-bold">
                <span className="text-gray-700">{item.day}</span>
                <span className="text-[#0284c7] bg-[#0284c7]/10 px-3 py-1 rounded-lg font-mono">
                  {item.hours}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Salon Interior Gallery */}
        <div className="lg:col-span-2 bg-white p-6 sm:p-7 rounded-3xl border border-gray-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-[#0284c7]" />
              <span>گالری تصاویر و محیط سالن</span>
            </h2>
            <span className="text-xs font-bold text-gray-400">
              {salonManager.portfolio?.length || 0} تصویر ثبت شده
            </span>
          </div>

          {salonManager.portfolio && salonManager.portfolio.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-1">
              {salonManager.portfolio.map((img) => (
                <div key={img.id} className="group relative rounded-2xl overflow-hidden bg-gray-100 aspect-video border border-gray-200 shadow-xs">
                  <img src={img.imageUrl} alt={img.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end text-white">
                    <span className="text-xs font-bold truncate">{img.title}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-2xl p-8 text-center text-xs text-gray-400 font-medium border border-dashed border-gray-200">
              تصاویری از محیط داخلی سالن هنوز بارگذاری نشده است.
            </div>
          )}
        </div>
      </div>

      {/* Artists Section Requirement 3 */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2.5">
              <Users className="w-6 h-6 text-[#0284c7]" />
              <span>تیم آرتیست‌های متخصص سالن</span>
            </h2>
            <p className="text-xs text-gray-500 font-medium mt-1">
              برای مشاهده رزومه کامل، نمونه‌کارها و رزرو آنلاین نوبت، روی پروفایل آرتیست مورد نظر کلیک کنید.
            </p>
          </div>
          <span className="px-4 py-1.5 rounded-full bg-gray-100 text-gray-700 text-xs font-extrabold self-start sm:self-auto">
            {salonArtists.length} آرتیست فعال
          </span>
        </div>

        {salonArtists.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-10 text-center space-y-3">
            <Users className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-sm font-bold text-gray-600">در حال حاضر آرتیستی به این سالن تخصصی متصل نشده است.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {salonArtists.map((artist) => {
              // Independent artist rating Requirement 4
              const artistRating = artist.rating || 4.90;

              return (
                <div
                  key={artist.id}
                  onClick={() => onSelectArtist(artist)}
                  className="group bg-gray-50/70 hover:bg-white rounded-3xl border border-gray-200 hover:border-[#0284c7]/40 p-5 sm:p-6 shadow-xs hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Header: Photo, Name, Specialty, Independent Rating */}
                    <div className="flex items-start gap-4">
                      <img
                        src={artist.avatar}
                        alt={artist.name}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-white shadow-md bg-white shrink-0 group-hover:scale-105 transition-transform"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-base font-extrabold text-gray-900 truncate group-hover:text-[#0284c7] transition-colors">
                            {artist.name}
                          </h3>
                          {/* Independent Artist Rating */}
                          <div className="flex items-center gap-1 bg-amber-50 text-amber-800 px-2.5 py-1 rounded-xl text-xs font-black border border-amber-200/60 shrink-0">
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            <span>{artistRating}</span>
                          </div>
                        </div>
                        <p className="text-xs font-bold text-[#0284c7] mt-1 truncate">
                          {artist.title || "آرتیست ارشد زیبایی"}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500 font-semibold">
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                            <span>{artist.yearsOfExperience || 5} سال تجربه</span>
                          </span>
                          <span>•</span>
                          <span>امتیاز مستقل آرتیست</span>
                        </div>
                      </div>
                    </div>

                    {/* Services Preview */}
                    {artist.skills && artist.skills.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-gray-200/60">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                          خدمات و تخصص‌ها:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {artist.skills.map((skill, sIdx) => (
                            <span
                              key={sIdx}
                              className="bg-white text-gray-700 text-xs font-bold px-3 py-1 rounded-xl border border-gray-200 shadow-3xs"
                            >
                              {skill.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Portfolio Preview Thumbnails Requirement 3 */}
                    {artist.portfolio && artist.portfolio.length > 0 && (
                      <div className="space-y-1.5 pt-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                          نمونه کارهای آرتیست:
                        </span>
                        <div className="grid grid-cols-3 gap-2">
                          {artist.portfolio.slice(0, 3).map((item) => (
                            <div key={item.id} className="relative aspect-square rounded-xl overflow-hidden bg-gray-200 border border-gray-200">
                              <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="mt-5 pt-3 border-t border-gray-200/60 flex items-center justify-end">
                    <span className="text-xs font-extrabold text-[#0284c7] group-hover:translate-x-1 transition-transform flex items-center gap-1">
                      <span>مشاهده رزومه و انتخاب خدمات آرتیست</span>
                      <ChevronLeft className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

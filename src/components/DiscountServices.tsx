import React, { useMemo } from "react";
import { Sparkles, Calendar, Clock, Scissors, Check, ShieldAlert, ArrowLeft, Star, Percent } from "lucide-react";
import { DiscountedSlot, User } from "../types";
import { formatToman, toPersianDigits, jalaliToGregorian } from "../utils/shamsi";

interface DiscountServicesProps {
  slots: DiscountedSlot[];
  artists: User[];
  currentUserId: string;
  onClaim: (slotId: string) => void;
  onSelectArtist: (artist: User) => void;
  triggerToast: (msg: string) => void;
}

export default function DiscountServices({
  slots = [],
  artists = [],
  currentUserId,
  onClaim,
  onSelectArtist,
  triggerToast,
}: DiscountServicesProps) {
  // Check if a slot is expired (date/time has passed)
  const isSlotExpired = (slot: DiscountedSlot): boolean => {
    try {
      const dateParts = slot.date.split("/");
      if (dateParts.length !== 3) return true;
      const jy = parseInt(dateParts[0], 10);
      const jm = parseInt(dateParts[1], 10);
      const jd = parseInt(dateParts[2], 10);
      const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);

      let hours = 12;
      let minutes = 0;
      if (slot.time) {
        const timeParts = slot.time.split(":");
        if (timeParts.length === 2) {
          hours = parseInt(timeParts[0], 10);
          minutes = parseInt(timeParts[1], 10);
        }
      }

      const slotDate = new Date(gy, gm - 1, gd, hours, minutes);
      return slotDate.getTime() < Date.now();
    } catch {
      return true;
    }
  };

  // Filter available slots that are NOT expired
  const activeSlots = useMemo(() => {
    return (slots || []).filter((slot) => slot.status === "available" && !isSlotExpired(slot));
  }, [slots]);

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Tab Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#4A5533] via-[#2D3321] to-slate-950 border border-slate-800 rounded-3xl p-6 md:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#0284c7]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#a1b878]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#0284c7]/30 text-[#b5cb8c] border border-[#0284c7]/40 rounded-full text-[10px] font-black tracking-wider animate-pulse">
            <Percent className="w-3.5 h-3.5 text-amber-400" />
            فرصت‌های استثنایی و لحظه آخری
          </span>
          <h2 className="text-xl md:text-2xl font-black text-white leading-tight">
            نوبت‌های فوق‌العاده با تخفیف‌های ویژه (Discount Services)
          </h2>
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-medium">
            این نوبت‌ها به دلیل جابه‌جایی یا لغو ناگهانی سایر مراجعین، با تخفیف‌های استثنایی آزاد شده‌اند. با رزرو این نوبت‌های لحظه آخری، هم در هزینه‌های خود صرفه‌جویی کنید و هم به تداوم درآمد آرتیست محبوب خود کمک نمایید!
          </p>
          <div className="flex flex-wrap gap-4 pt-1 text-[11px] text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#a1b878]" />
              <span>۲۰٪ تخفیف گارانتی‌شده لحظه‌آخری</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#a1b878]" />
              <span>تضمین همان کیفیت خدمات عادی</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#a1b878]" />
              <span>رزرو فوری و خودکار بدون پیش‌پرداخت</span>
            </div>
          </div>
        </div>
      </div>

      {/* Available Slots List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900">نوبت‌های تخفیف‌دار فعال</h3>
            <p className="text-[10px] text-slate-400 font-bold">برای رزرو فوری، یکی از نوبت‌های زیر را انتخاب کنید</p>
          </div>
          <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full font-black">
            {toPersianDigits(activeSlots.length)} نوبت موجود
          </span>
        </div>

        {activeSlots.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center shadow-xs">
            <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100/60">
              <Sparkles className="w-6 h-6 text-slate-300" />
            </div>
            <h4 className="text-xs font-black text-slate-700">در حال حاضر نوبت تخفیف‌داری فعال نیست</h4>
            <p className="text-[10px] text-slate-400 font-bold max-w-sm mx-auto mt-2 leading-relaxed">
              با لغو نوبت توسط کاربران دیگر، نوبت‌های خالی شده بلافاصله با تخفیف‌های لحظه آخری در این قسمت قرار خواهند گرفت. باز هم سر بزنید!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeSlots.map((slot) => {
              // Find the artist info
              const artist = artists.find((a) => a.id === slot.artistId);
              
              return (
                <div
                  key={slot.id}
                  className="bg-white border border-slate-100 hover:border-[#0284c7]/30 hover:shadow-md transition-all rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-4 relative overflow-hidden group"
                >
                  {/* Accent Line */}
                  <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-[#0284c7] to-[#a1b878]" />

                  <div className="flex gap-4.5">
                    {/* Artist Avatar */}
                    {artist && (
                      <img
                        src={artist.avatar}
                        alt={slot.artistName}
                        onClick={() => onSelectArtist(artist)}
                        className="w-12 h-12 rounded-2xl object-cover border border-slate-100 shrink-0 cursor-pointer hover:scale-105 transition-transform"
                      />
                    )}
                    
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs font-black text-slate-800">
                          {slot.artistName}
                        </h4>
                        {slot.salonName && (
                          <span className="text-[9.5px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-md">
                            سالن: {slot.salonName}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold">
                        <Scissors className="w-3.5 h-3.5 text-[#0284c7]" />
                        <span>خدمت تخصصی:</span>
                        <span className="text-slate-800 font-extrabold">{slot.serviceType}</span>
                      </div>

                      <div className="flex flex-wrap gap-2.5 pt-1">
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{toPersianDigits(slot.date)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>ساعت {toPersianDigits(slot.time)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Discount Badge */}
                    <div className="shrink-0 bg-rose-50 border border-rose-100 rounded-2xl px-2.5 py-1.5 text-center flex flex-col justify-center">
                      <span className="text-[10px] text-rose-500 font-black leading-none">تخفیف ویژه</span>
                      <span className="text-base font-black text-rose-600 mt-1 leading-none">
                        ٪{toPersianDigits(slot.discountPercent)}
                      </span>
                    </div>
                  </div>

                  {/* Pricing and Action */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-3">
                    <div className="text-right">
                      {slot.originalPrice !== undefined && slot.discountedPrice !== undefined ? (
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-slate-400 line-through block font-bold leading-none">
                            {formatToman(slot.originalPrice)}
                          </span>
                          <span className="text-xs font-black text-[#0284c7] flex items-center gap-1 leading-none mt-1">
                            <span>قیمت لحظه آخری:</span>
                            <span className="text-sm font-extrabold">{formatToman(slot.discountedPrice)}</span>
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500">قیمت نهایی پس از تماس مشخص می‌شود</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onClaim(slot.id)}
                      className="px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white text-[11px] font-black rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5 hover:scale-[1.02] active:scale-95"
                    >
                      <span>رزرو فوری این نوبت</span>
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Safety Policy Info Section */}
      <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-slate-800">
          <ShieldAlert className="w-5 h-5 text-[#0284c7]" />
          <h4 className="text-xs font-black">قوانین و ضمانت کیفیت نوبت‌های تخفیف‌دار</h4>
        </div>
        <ul className="list-disc list-inside text-[10px] md:text-[11px] text-slate-500 space-y-2 leading-relaxed font-bold pr-1">
          <li>تمامی نوبت‌های تخفیف‌دار از لحاظ کیفیت مواد اولیه، مهارت آرتیست و مدت زمان خدمت، کاملاً هم‌سطح نوبت‌های عادی و استاندارد سالن خواهند بود.</li>
          <li>پلتفرم لجندین بر نحوه اجرای این تعهدات به صورت خودکار نظارت دارد و پورسانت این نوبت‌ها برای سالن با نرخ حمایتی محاسبه می‌گردد.</li>
          <li>به محض زدن دکمه «رزرو فوری»، درخواست رزرو جدیدی با قیمت تخفیف‌دار برای آرتیست صادر می‌شود که تایید یا عدم تایید نهایی آن مشابه نوبت‌های عادی از طریق اعلان‌های شما اطلاع‌رسانی خواهد شد.</li>
        </ul>
      </div>
    </div>
  );
}

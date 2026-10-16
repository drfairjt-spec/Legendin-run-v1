import React, { useMemo } from "react";
import { User, Transaction } from "../types";
import { toPersianDigits, formatToman } from "../utils/shamsi";
import { calculateEmployeeBalance } from "../utils/employeeBalance";
import { 
  TrendingUp, TrendingDown, DollarSign, FileText, Calendar, 
  Briefcase, CheckCircle, ShieldCheck, AlertCircle
} from "lucide-react";

interface MyEarningsProps {
  currentUser: User;
  transactions: Transaction[];
  onUpdateTransactions?: (updated: Transaction[]) => void;
}

export default function MyEarnings({ 
  currentUser, 
  transactions = [] 
}: MyEarningsProps) {

  // Run the standard calculations for the artist
  const balanceSummary = useMemo(() => {
    return calculateEmployeeBalance(currentUser, transactions);
  }, [currentUser, transactions]);

  // Filter and sort transactions related specifically to this artist
  const personalTransactions = useMemo(() => {
    return (transactions || [])
      .filter(t => t.relatedStaffId === currentUser.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [currentUser.id, transactions]);

  const contract = currentUser.contract;

  // Visual styling for net balance card
  let balanceBg = "bg-slate-50 border-slate-200/80 text-slate-700";
  let balanceBadge = "بستانکار / بدهکار نیستید";
  let balanceValueText = "۰ تومان";

  if (balanceSummary.netBalance > 0) {
    balanceBg = "bg-emerald-50/70 border-emerald-100 text-emerald-800";
    balanceBadge = "طلب شما از سالن (بستانکار)";
    balanceValueText = formatToman(balanceSummary.netBalance);
  } else if (balanceSummary.netBalance < 0) {
    balanceBg = "bg-rose-50/70 border-rose-100 text-rose-800";
    balanceBadge = "بدهی شما به سالن (بدهکار)";
    balanceValueText = formatToman(Math.abs(balanceSummary.netBalance));
  } else if (balanceSummary.contractType === "نامشخص") {
    balanceBadge = "فاقد قرارداد فعال";
  }

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      
      {/* Title section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-3xs">
        <div>
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#0284c7]" />
            حسابداری و تراز مالی من
          </h2>
          <p className="text-[10px] text-slate-400 font-bold mt-1.5 leading-relaxed">
            مشاهده زنده کارکرد خدمات، پرداختی‌های سالن، مانده تصفیه‌نشده و جزئیات قرارداد رسمی پرسنلی شما
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-black text-[#0284c7] bg-[#0284c7]/5 border border-[#0284c7]/10 px-3 py-1.5 rounded-xl self-start md:self-auto">
          <ShieldCheck className="w-4 h-4" />
          پنل امن و اختصاصی پرسنل
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        
        {/* Card 1: Monthly Generated Income */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-3xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-[#0284c7]/10 text-[#0284c7] flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-black block mb-1">کل کارکرد من (خدمات)</span>
            <span className="text-xs font-extrabold text-slate-800">
              {toPersianDigits(balanceSummary.totalGeneratedIncome.toLocaleString())} تومان
            </span>
          </div>
        </div>

        {/* Card 2: Paid Out (Salary or advances) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-3xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center shrink-0">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-black block mb-1">دریافتی کل (حقوق و مساعده)</span>
            <span className="text-xs font-extrabold text-slate-800">
              {toPersianDigits(balanceSummary.totalPaidOut.toLocaleString())} تومان
            </span>
          </div>
        </div>

        {/* Card 3: Net Balance */}
        <div className={`border rounded-2xl p-5 shadow-3xs flex items-center gap-4 transition-all ${balanceBg}`}>
          <div className="w-11 h-11 rounded-xl bg-white/90 border border-slate-100 flex items-center justify-center shrink-0 shadow-3xs">
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="text-right">
            <span className="text-[9.5px] font-black block mb-1">{balanceBadge}</span>
            <span className="text-xs font-extrabold">{toPersianDigits(balanceValueText)}</span>
          </div>
        </div>

      </div>

      {/* Contract & Ledger Area */}
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Ledger: Personal transaction list */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-3xs space-y-4">
          <div>
            <h3 className="text-xs font-black text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              دفتر معین تراکنش‌های من
            </h3>
            <p className="text-[9.5px] text-slate-400 font-bold mt-1">لیست تمام سرفصل‌های واریزی، کارکرد و پورسانت‌های متصل به شناسه شما</p>
          </div>

          <div className="overflow-hidden border border-slate-100 rounded-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[9.5px] font-black">
                    <th className="p-3">تاریخ</th>
                    <th className="p-3">دسته تراکنش</th>
                    <th className="p-3">توضیحات تراکنش</th>
                    <th className="p-3 text-center">نوع</th>
                    <th className="p-3 text-left">مبلغ (تومان)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {personalTransactions.length > 0 ? (
                    personalTransactions.map((t) => {
                      const isIncome = t.direction === "income";
                      return (
                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 font-semibold text-slate-500 whitespace-nowrap">{toPersianDigits(t.date)}</td>
                          <td className="p-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9.5px] font-bold ${
                              t.category === "حقوق پرسنل" 
                                ? "bg-violet-50 text-violet-700 border border-violet-100" 
                                : t.category === "درآمد نوبت تخفیف‌دار"
                                ? "bg-[#0284c7]/10 text-[#0284c7] border border-[#0284c7]/20"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            }`}>
                              {t.category}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600 font-bold min-w-[150px]">{t.description || "—"}</td>
                          <td className="p-3 text-center whitespace-nowrap">
                            <span className={`text-[10px] font-black ${isIncome ? 'text-emerald-600' : 'text-rose-500'}`}>
                              {isIncome ? "درآمد برای شما" : "هزینه / پرداختی سالن"}
                            </span>
                          </td>
                          <td className={`p-3 text-left font-black whitespace-nowrap ${isIncome ? 'text-emerald-700' : 'text-slate-800'}`}>
                            {toPersianDigits(t.amount.toLocaleString())} ت
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 font-bold text-xs">
                        هیچ تراکنش مالی مرتبطی برای شما ثبت نشده است.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar: Contract summary and rules */}
        <div className="lg:col-span-1 space-y-4">
          
          {/* Active Contract panel */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-3xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-[#0284c7]">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-800">قرارداد همکاری فعال</h4>
                <p className="text-[9px] text-slate-400 font-bold mt-0.5">مشخصات توافق‌نامه رسمی شما با مدیریت سالن</p>
              </div>
            </div>

            {contract ? (
              <div className="space-y-3.5 text-xs text-slate-600 font-bold">
                <div className="flex justify-between items-center bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                  <span className="text-slate-400 text-[10px] font-black">نوع استخدام:</span>
                  <span className="text-[#0284c7] font-extrabold">{contract.contractType}</span>
                </div>
                
                <div className="flex justify-between items-center bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                  <span className="text-slate-400 text-[10px] font-black">جزئیات توافق / مبلغ:</span>
                  <span className="text-slate-800 font-extrabold">{toPersianDigits(contract.amount)}</span>
                </div>

                <div className="flex justify-between items-center bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                  <span className="text-slate-400 text-[10px] font-black">تاریخ شروع قرارداد:</span>
                  <span className="text-slate-700 font-extrabold flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {toPersianDigits(contract.startDate)}
                  </span>
                </div>

                {contract.endDate && (
                  <div className="flex justify-between items-center bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] font-black">تاریخ پایان قرارداد:</span>
                    <span className="text-slate-700 font-extrabold flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {toPersianDigits(contract.endDate)}
                    </span>
                  </div>
                )}

                {contract.guaranteeType && (
                  <div className="flex justify-between items-center bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] font-black">سند ضمانت پرسنلی:</span>
                    <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md text-[9.5px] font-extrabold">
                      {contract.guaranteeType}
                    </span>
                  </div>
                )}

                <div className="bg-emerald-50 text-emerald-800 text-[10px] p-2.5 rounded-xl border border-emerald-100 flex items-start gap-1.5 font-bold leading-relaxed">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>این قرارداد به طور الکترونیک ثبت شده و هرگونه تسویه و تراز تکیه بر فرمول محاسبه خودکار لجندین دارد.</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <AlertCircle className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                <p className="text-[10px] text-slate-400 font-black">هیچ قرارداد رسمی ثبت نشده است.</p>
                <p className="text-[8.5px] text-slate-400 font-bold mt-1">تراز بر اساس توافق اولیه شفاهی یا موقت محاسبه می‌شود.</p>
              </div>
            )}
          </div>

          {/* Guidelines info card */}
          <div className="bg-gradient-to-br from-[#0284c7]/5 to-slate-50 border border-[#0284c7]/15 rounded-2xl p-4.5 space-y-2.5 text-right">
            <h5 className="text-[10px] font-black text-[#0369a1] uppercase tracking-wider">راهنمای تسویه حساب</h5>
            <p className="text-[9.5px] text-slate-500 font-bold leading-relaxed">
              تراز مالی شما به صورت آنلاین و در لحظه محاسبه می‌شود. هرگونه نوبت ثبت شده جدید از مشتریان که وضعیت نهایی آن پرداخت شده باشد، مستقیماً به عنوان درآمد خدمات به کیف پول مجازی لجندین متصل به حساب شما اضافه می‌شود.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}

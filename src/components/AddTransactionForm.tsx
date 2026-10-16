import React, { useState } from "react";
import { User, Transaction, TransactionDirection, TransactionCategory } from "../types";
import { PERSIAN_MONTHS, getCurrentJalaliDateString, toPersianDigits } from "../utils/shamsi";
import { X, Calendar, DollarSign, User as UserIcon, FileText, Check } from "lucide-react";

interface AddTransactionFormProps {
  artists: User[];
  salonId: string;
  onClose: () => void;
  onSubmit: (tx: Omit<Transaction, "id">) => void;
}

export default function AddTransactionForm({ artists, salonId, onClose, onSubmit }: AddTransactionFormProps) {
  const [direction, setDirection] = useState<TransactionDirection>("cost");
  const [category, setCategory] = useState<TransactionCategory>("خرید و مایحتاج");
  const [amount, setAmount] = useState<string>("");
  
  // Date states - default to current shamsi date
  const todayStr = getCurrentJalaliDateString(); // "YYYY/MM/DD"
  const [year, setYear] = useState<string>(todayStr.split("/")[0] || "1405");
  const [month, setMonth] = useState<string>(todayStr.split("/")[1] || "04");
  const [day, setDay] = useState<string>(todayStr.split("/")[2] || "08");

  const [relatedStaffId, setRelatedStaffId] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [receiptUrl, setReceiptUrl] = useState<string>("");
  const [receiptName, setReceiptName] = useState<string>("");

  const handleDirectionChange = (dir: TransactionDirection) => {
    setDirection(dir);
    // Set default category for each direction
    if (dir === "income") {
      setCategory("درآمد خدمات");
    } else {
      setCategory("خرید و مایحتاج");
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Keep only numeric digits
    const cleanVal = e.target.value.replace(/[^\d]/g, "");
    setAmount(cleanVal);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReceiptName(file.name);
      // Generate a mock attachment URL
      setReceiptUrl(`/receipts/${file.name}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseInt(amount, 10);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("لطفاً مبلغ معتبری وارد نمایید.");
      return;
    }

    const formattedMonth = month.padStart(2, "0");
    const formattedDay = day.padStart(2, "0");
    const fullDate = `${year}/${formattedMonth}/${formattedDay}`;

    const newTx: Omit<Transaction, "id"> = {
      salonId,
      direction,
      category,
      amount: parsedAmount,
      date: fullDate,
      description: description.trim() || undefined,
      receiptUrl: receiptUrl || undefined,
      relatedStaffId: relatedStaffId || undefined,
      createdAt: fullDate
    };

    onSubmit(newTx);
    onClose();
  };

  // Categories filtered by direction
  const costCategories: TransactionCategory[] = [
    "اجاره سالن",
    "خرید و مایحتاج",
    "قبوض",
    "حقوق پرسنل",
    "سایر هزینه"
  ];

  const incomeCategories: TransactionCategory[] = [
    "درآمد خدمات",
    "درآمد نوبت تخفیف‌دار",
    "سایر درآمد"
  ];

  const activeCategories = direction === "income" ? incomeCategories : costCategories;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-sans" dir="rtl">
      <div className="bg-white rounded-3xl w-full max-w-lg border border-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-50 flex items-center justify-between bg-[#0284c7]/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#0284c7]/15 flex items-center justify-center text-[#0284c7]">
              <DollarSign className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-black text-slate-900">ثبت تراکنش مالی جدید</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Direction Toggle */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500">نوع تراکنش</label>
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-100">
              <button
                type="button"
                onClick={() => handleDirectionChange("income")}
                className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
                  direction === "income"
                    ? "bg-[#0284c7] text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                درآمد (+)
              </button>
              <button
                type="button"
                onClick={() => handleDirectionChange("cost")}
                className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
                  direction === "cost"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                هزینه (-)
              </button>
            </div>
          </div>

          {/* Amount and Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Amount */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500">مبلغ تراکنش (تومان)</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={amount ? parseInt(amount, 10).toLocaleString() : ""}
                  onChange={handleAmountChange}
                  placeholder="مثال: ۱,۲۰۰,۰۰۰"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7] text-left font-black"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold pointer-events-none">
                  تومان
                </span>
              </div>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500">دسته‌بندی</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TransactionCategory)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7] font-bold"
              >
                {activeCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> تاریخ ثبت (شمسی)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {/* Year */}
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-700 font-bold focus:outline-none"
              >
                <option value="1404">۱۴۰۴</option>
                <option value="1405">۱۴۰۵</option>
                <option value="1406">۱۴۰۶</option>
              </select>

              {/* Month */}
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-700 font-bold focus:outline-none"
              >
                {PERSIAN_MONTHS.map((m, idx) => {
                  const mVal = (idx + 1).toString().padStart(2, "0");
                  return (
                    <option key={mVal} value={mVal}>
                      {m}
                    </option>
                  );
                })}
              </select>

              {/* Day */}
              <select
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-700 font-bold focus:outline-none"
              >
                {Array.from({ length: 31 }, (_, i) => {
                  const dVal = (i + 1).toString().padStart(2, "0");
                  return (
                    <option key={dVal} value={dVal}>
                      {toPersianDigits(i + 1)}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Related Staff linkage */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
              <UserIcon className="w-3.5 h-3.5 text-slate-400" /> پرسنل مرتبط (اختیاری)
            </label>
            <select
              value={relatedStaffId}
              onChange={(e) => setRelatedStaffId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7] font-bold"
            >
              <option value="">هیچ کدام (هزینه/درآمد کل سالن)</option>
              {artists.map((art) => (
                <option key={art.id} value={art.id}>
                  {art.name} ({art.contract?.contractType ? `قرارداد ${art.contract.contractType}` : "بدون قرارداد رسمی"})
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" /> توضیحات
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="شرح جزئیات تراکنش..."
              rows={2}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7]"
            />
          </div>

          {/* Mock Receipt Upload */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500">پیوست فیش یا فاکتور</label>
            <div className="flex items-center gap-3">
              <label className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-colors border border-slate-200">
                انتخاب فایل
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <span className="text-[10px] text-slate-500 truncate max-w-[250px] font-bold">
                {receiptName || "فایلی انتخاب نشده است"}
              </span>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="submit"
              className="flex-1 py-3 bg-[#0284c7] hover:bg-[#5C6B43] text-white text-xs font-black rounded-2xl transition-all cursor-pointer text-center shadow-lg shadow-[#0284c7]/20"
            >
              ثبت نهایی تراکنش
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition-all cursor-pointer"
            >
              انصراف
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

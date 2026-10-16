import React, { useState } from "react";
import { X, AlertTriangle, HelpCircle, CheckSquare, Square } from "lucide-react";
import { ClientRequest, CancellationReasonCategory, CancellationDetails } from "../types";
import { calculateCancellationFee } from "../utils/cancellationPolicy";
import { formatToman, getCurrentJalaliDateString, toPersianDigits } from "../utils/shamsi";

interface CancelReservationModalProps {
  request: ClientRequest;
  onClose: () => void;
  onConfirm: (requestId: string, cancellation: CancellationDetails) => void;
}

export default function CancelReservationModal({
  request,
  onClose,
  onConfirm,
}: CancelReservationModalProps) {
  const [selectedReason, setSelectedReason] = useState<CancellationReasonCategory | "">("");
  const [reasonNote, setReasonNote] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);

  const feeInfo = calculateCancellationFee(request);

  const reasons: CancellationReasonCategory[] = [
    "تغییر برنامه",
    "پیدا کردن گزینه بهتر",
    "مشکل مالی",
    "مشکل در زمان‌بندی",
    "نارضایتی از پاسخ‌گویی متخصص",
    "سایر",
  ];

  const handleConfirm = () => {
    if (!selectedReason) return;
    if (selectedReason === "سایر" && !reasonNote.trim()) return;
    if (!acknowledged) return;

    const cancellation: CancellationDetails = {
      reasonCategory: selectedReason,
      reasonNote: selectedReason === "سایر" ? reasonNote : undefined,
      cancelledAt: getCurrentJalaliDateString(),
      feeAcknowledged: true,
      feeApplied: feeInfo.feeApplied,
      feeAmount: feeInfo.feeAmount,
    };

    onConfirm(request.id, cancellation);
  };

  const isConfirmDisabled =
    !selectedReason ||
    (selectedReason === "سایر" && !reasonNote.trim()) ||
    !acknowledged;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="bg-white border border-slate-100 rounded-3xl p-6 w-full max-w-md shadow-2xl relative animate-fade-in text-right"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-50 rounded-xl text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-black text-slate-950">لغو نوبت رزرو</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info of request */}
        <div className="my-4 p-3 bg-slate-50 rounded-2xl border border-slate-100/80 space-y-1">
          <div className="text-[11px] text-slate-500 font-bold">
            نوبت رزرو شده برای: <span className="text-slate-800 font-extrabold">{request.targetName}</span>
          </div>
          <div className="text-[11px] text-slate-500 font-bold">
            خدمت: <span className="text-slate-800 font-extrabold">{request.serviceType}</span>
          </div>
          <div className="text-[11px] text-slate-500 font-bold">
            زمان: <span className="text-slate-800 font-extrabold">{toPersianDigits(request.preferredDate)} ساعت {toPersianDigits(request.preferredTime)}</span>
          </div>
          {request.price !== undefined && (
            <div className="text-[11px] text-slate-500 font-bold">
              هزینه خدمات: <span className="text-[#0284c7] font-black">{formatToman(request.price)}</span>
            </div>
          )}
        </div>

        {/* Warning Banner / Fee info */}
        <div className="mb-4">
          <div className="p-4 bg-amber-50/80 border border-amber-200/60 rounded-2xl text-amber-900 text-[11px] leading-relaxed font-bold space-y-1.5">
            <p className="flex items-center gap-1.5 text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>توجه: بسته به فاصله زمانی تا نوبت، لغو این رزرو ممکن است مشمول جریمه لغو شود.</span>
            </p>
            {feeInfo.feeApplied ? (
              <p className="text-rose-700 bg-rose-50/50 p-2 rounded-lg border border-rose-100/50 mt-1">
                ⚠️ لغو نوبت کمتر از ۲۴ ساعت مانده به زمان رزرو انجام می‌شود. طبق سیاست سالن، شما مشمول{" "}
                <span className="font-extrabold">۳۰٪ جریمه لغو نوبت</span>{" "}
                {feeInfo.feeAmount !== undefined ? (
                  <>به مبلغ <span className="font-extrabold text-rose-800">{formatToman(feeInfo.feeAmount)}</span></>
                ) : (
                  <>خواهید بود (مبلغ جریمه توسط سالن مشخص می‌شود)</>
                )}
                .
              </p>
            ) : (
              <p className="text-emerald-700 bg-emerald-50/50 p-2 rounded-lg border border-emerald-100/50 mt-1">
                ✓ لغو نوبت بیش از ۲۴ ساعت قبل از زمان رزرو انجام می‌شود. لغو رزرو رایگان است و مشمول جریمه نخواهد شد.
              </p>
            )}
          </div>
        </div>

        {/* Reason Selector */}
        <div className="space-y-3 mb-4">
          <label className="block text-xs font-black text-slate-700 flex items-center gap-1">
            <HelpCircle className="w-4 h-4 text-slate-400" />
            <span>لطفاً علت لغو نوبت خود را مشخص کنید:</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-right">
            {reasons.map((reason) => (
              <label
                key={reason}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-[11px] font-bold cursor-pointer transition-all ${
                  selectedReason === reason
                    ? "bg-[#0284c7]/5 border-[#0284c7] text-[#0284c7]"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="cancellationReason"
                  value={reason}
                  checked={selectedReason === reason}
                  onChange={() => {
                    setSelectedReason(reason);
                    if (reason !== "سایر") setReasonNote("");
                  }}
                  className="sr-only"
                />
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                  selectedReason === reason
                    ? "border-[#0284c7] bg-[#0284c7]"
                    : "border-slate-300 bg-white"
                }`}>
                  {selectedReason === reason && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
                <span>{reason}</span>
              </label>
            ))}
          </div>

          {selectedReason === "سایر" && (
            <div className="space-y-1.5 animate-fade-in">
              <label className="block text-[11px] font-black text-slate-600">
                لطفاً دلیل خود را شرح دهید: <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={reasonNote}
                onChange={(e) => setReasonNote(e.target.value)}
                placeholder="توضیحات خود را در مورد علت لغو بنویسید..."
                rows={2}
                className="w-full text-xs text-slate-800 placeholder-slate-400 bg-slate-50 border border-slate-200/80 rounded-xl p-3 focus:outline-none focus:border-[#0284c7] focus:bg-white transition-all resize-none"
              />
            </div>
          )}
        </div>

        {/* Checkbox Acknowledgment */}
        <button
          type="button"
          onClick={() => setAcknowledged(!acknowledged)}
          className="flex items-start gap-2.5 w-full text-right p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/70 border border-slate-200/50 transition-colors cursor-pointer mb-5"
        >
          {acknowledged ? (
            <CheckSquare className="w-4 h-4 text-[#0284c7] shrink-0 mt-0.5" />
          ) : (
            <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          )}
          <span className="text-[10px] md:text-[11px] text-slate-600 font-bold leading-relaxed">
            من متوجه سیاست لغو نوبت و جریمه‌های احتمالی مربوط به آن شده‌ام و لغو این نوبت را تایید می‌نمایم.
          </span>
        </button>

        {/* Actions */}
        <div className="flex gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:hover:bg-rose-600 text-white text-xs font-black rounded-xl transition-all shadow-xs cursor-pointer text-center"
          >
            تایید لغو نوبت
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl transition-all cursor-pointer text-center"
          >
            انصراف
          </button>
        </div>
      </div>
    </div>
  );
}

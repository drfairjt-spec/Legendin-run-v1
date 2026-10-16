import React, { useState } from "react";
import { User, HiringOffer, ClientRequest, LeaveRequest, JobApplication, StaffContract, CancellationDetails, DiscountedSlot, ColleagueMessage, MessageReply } from "../types";
import { Inbox, ArrowUpRight, ArrowDownLeft, Check, X, Clock, HelpCircle, Phone, Calendar, UserCheck, DollarSign, ChevronRight, ChevronLeft, CalendarDays, FileText, CalendarRange, Mail, Send, Eye, Lock } from "lucide-react";
import { toPersianDigits, PERSIAN_MONTHS, jalaliToGregorian, isShamsiWeekend, formatToman } from "../utils/shamsi";
import CancelReservationModal from "./CancelReservationModal";

interface RequestsInboxProps {
  currentUser: User;
  hiringOffers: HiringOffer[];
  onUpdateHiringOffers: (offers: HiringOffer[]) => void;
  clientRequests: ClientRequest[];
  onUpdateClientRequests: (requests: ClientRequest[]) => void;
  
  // New features for Salon Operations & Contracts
  leaveRequests?: LeaveRequest[];
  onUpdateLeaveRequests?: (requests: LeaveRequest[]) => void;
  jobApplications?: JobApplication[];
  onUpdateJobApplications?: (apps: JobApplication[]) => void;
  allUsers?: User[];
  onUpdateUsersList?: (users: User[]) => void;
  onAddDiscountedSlot?: (newSlot: DiscountedSlot) => void;

  colleagueMessages?: ColleagueMessage[];
  onUpdateColleagueMessages?: React.Dispatch<React.SetStateAction<ColleagueMessage[]>>;
}

interface ScheduleCalendarViewProps {
  incomingRequests: ClientRequest[];
  onUpdateStatus: (requestId: string, newStatus: "accepted" | "declined") => void;
  getStatusPill: (status: "pending" | "accepted" | "declined" | "logged" | "cancelled") => React.ReactNode;
  currentUser?: User;
  leaveRequests?: LeaveRequest[];
  onUpdateLeaveRequests?: (list: LeaveRequest[]) => void;
}

function ScheduleCalendarView({ incomingRequests, onUpdateStatus, getStatusPill, currentUser, leaveRequests = [], onUpdateLeaveRequests }: ScheduleCalendarViewProps) {
  const [year, setYear] = useState(1405);
  const [month, setMonth] = useState(4); // default Tir
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const [showAddLeaveForm, setShowAddLeaveForm] = useState(false);
  const [leaveType, setLeaveType] = useState<"fullday" | "hours">("fullday");
  const [startHour, setStartHour] = useState("14:00");
  const [endHour, setEndHour] = useState("18:00");
  const [leaveNote, setLeaveNote] = useState("");

  const getDaysInMonth = (y: number, m: number) => {
    if (m >= 1 && m <= 6) return 31;
    if (m >= 7 && m <= 11) return 30;
    const isLeap = (y - 1399) % 4 === 0;
    return isLeap ? 30 : 29;
  };

  const getFirstDayOffset = (y: number, m: number) => {
    const [gy, gm, gd] = jalaliToGregorian(y, m, 1);
    const date = new Date(gy, gm - 1, gd);
    const day = date.getDay(); // 0 is Sunday, ..., 6 is Saturday
    const standardToIr = [1, 2, 3, 4, 5, 6, 0];
    return standardToIr[day];
  };

  const IR_WEEKDAYS_ORDER = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"];
  const daysInMonth = getDaysInMonth(year, month);
  const offset = getFirstDayOffset(year, month);

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(prev => prev - 1);
    } else {
      setMonth(prev => prev - 1);
    }
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(prev => prev + 1);
    } else {
      setMonth(prev => prev + 1);
    }
    setSelectedDay(null);
  };

  const dayCells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) {
    dayCells.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    dayCells.push(i);
  }

  const pad = (n: number) => n.toString().padStart(2, "0");
  const getSelectedDateString = (dayNum: number) => `${year}/${pad(month)}/${pad(dayNum)}`;

  // Find requests for selected day
  const selectedDateStr = selectedDay ? getSelectedDateString(selectedDay) : "";
  const selectedDayRequests = incomingRequests.filter(r => r.preferredDate === selectedDateStr);

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4.5 space-y-4 shadow-xs text-right font-sans" dir="rtl">
      {/* Calendar Navigation Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="p-1.5 hover:bg-slate-50 rounded-xl text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div className="text-center">
          <span className="font-extrabold text-sm text-[#0284c7] tracking-wide">
            {PERSIAN_MONTHS[month - 1]} {toPersianDigits(year)}
          </span>
        </div>

        <button
          type="button"
          onClick={handleNextMonth}
          className="p-1.5 hover:bg-slate-50 rounded-xl text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Weekday Labels (Saturday first) */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400">
        {IR_WEEKDAYS_ORDER.map((wd, idx) => (
          <div key={idx} className={idx === 6 ? "text-rose-500" : ""}>
            {wd}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {dayCells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="h-11"></div>;
          }

          const dateStr = `${year}/${pad(month)}/${pad(day)}`;
          const dayReqs = incomingRequests.filter(r => r.preferredDate === dateStr);
          const accepted = dayReqs.filter(r => r.status === "accepted");
          const pending = dayReqs.filter(r => r.status === "pending");
          const dayLeaves = leaveRequests.filter(l => l.staffId === currentUser?.id && l.startDate <= dateStr && l.endDate >= dateStr);

          const isSelected = selectedDay === day;
          const isWeekend = idx % 7 === 6 || idx % 7 === 5; // Friday or Thursday weekend
          const hasLeave = dayLeaves.length > 0;

          return (
            <button
              type="button"
              key={`day-${day}`}
              onClick={() => setSelectedDay(day)}
              className={`h-11 rounded-xl flex flex-col items-center justify-between py-1 transition-all border relative cursor-pointer ${
                isSelected
                  ? "bg-[#0284c7]/10 border-[#0284c7] text-[#0284c7] font-black ring-1 ring-[#0284c7]/25 shadow-2xs"
                  : hasLeave
                  ? "bg-purple-50/70 border-purple-200 text-purple-700 hover:bg-purple-100/70 font-bold"
                  : isWeekend
                  ? "border-transparent text-rose-500 bg-slate-50/50 hover:bg-slate-50"
                  : "border-transparent text-slate-700 bg-slate-50/20 hover:bg-slate-50"
              }`}
            >
              <span className="text-xs font-semibold flex items-center gap-0.5">
                {toPersianDigits(day)}
                {hasLeave && <span className="w-1.5 h-1.5 rounded-full bg-purple-600 inline-block" title="دارای ثبت مرخصی یا عدم حضور"></span>}
              </span>
              
              {/* Count Indicator */}
              {(dayReqs.length > 0 || hasLeave) && (
                <div className="flex gap-0.5 justify-center items-center scale-90 mb-0.5">
                  {accepted.length > 0 && (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex items-center justify-center text-[7px] text-white font-bold" title={`${accepted.length} نوبت تایید شده`}>
                      {toPersianDigits(accepted.length)}
                    </span>
                  )}
                  {pending.length > 0 && (
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 flex items-center justify-center text-[7px] text-white font-bold animate-pulse" title={`${pending.length} نوبت معلق`}>
                      {toPersianDigits(pending.length)}
                    </span>
                  )}
                  {hasLeave && (
                    <span className="px-1 py-0.2 rounded bg-purple-600 text-[7px] text-white font-bold" title="مرخصی/ساعت عدم حضور">
                      مرخصی
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Day Agenda View */}
      <div className="border-t border-slate-100 pt-3 mt-1.5 space-y-3">
        {selectedDay ? (
          <>
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5 text-[#0284c7]" />
                برنامه کاری روز {toPersianDigits(selectedDay)} {PERSIAN_MONTHS[month - 1]} :
              </h4>
              <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                {toPersianDigits(selectedDayRequests.length)} نوبت ثبت شده
              </span>
            </div>

            {selectedDayRequests.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {selectedDayRequests.map((req) => (
                  <div key={req.id} className="bg-slate-50 border border-slate-150 p-3 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="text-xs font-black text-slate-900">{req.clientName}</h5>
                        <p className="text-[9px] text-slate-500 font-bold flex items-center gap-1 mt-0.5" dir="ltr">
                          <span>{req.clientPhone}</span> <Phone className="w-2.5 h-2.5 text-slate-400" />
                        </p>
                      </div>
                      {getStatusPill(req.status)}
                    </div>

                    <div className="bg-white p-2 rounded-lg text-xs text-slate-700 border border-slate-100 space-y-1">
                      <p className="font-bold text-[#0284c7]">خدمات: {req.serviceType}</p>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" /> ساعت حضور: <span className="font-bold text-slate-800">{toPersianDigits(req.preferredTime)}</span>
                      </p>
                      {req.note && (
                        <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-100">توضیحات: {req.note}</p>
                      )}
                    </div>

                    {req.status === "pending" && (
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(req.id, "accepted")}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[9.5px] font-bold py-1 rounded-lg transition-all cursor-pointer"
                        >
                          تایید نوبت
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(req.id, "declined")}
                          className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[9.5px] font-bold py-1 rounded-lg transition-all cursor-pointer"
                        >
                          رد درخواست
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-[10px] text-slate-400 font-bold">هیچ رزرو نوبتی برای این روز ثبت نشده است. روز آزاد کاری شماست! 🌸</p>
              </div>
            )}

            {/* ARTIST TIME OFF & WORKING HOURS IN THIS DATE */}
            {currentUser && (
              <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-3 space-y-2 mt-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-[11px] font-black text-purple-900 flex items-center gap-1.5">
                    <span>🏖️ وضعیت مرخصی و ساعات عدم حضور شما:</span>
                  </h5>
                  <button
                    type="button"
                    onClick={() => setShowAddLeaveForm(!showAddLeaveForm)}
                    className="text-[10px] bg-purple-600 hover:bg-purple-700 text-white font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-2xs"
                  >
                    {showAddLeaveForm ? "انصراف" : "+ ثبت مرخصی / ساعت عدم حضور"}
                  </button>
                </div>

                {/* Display Existing Leaves for selected day */}
                {(() => {
                  const dayLeaves = leaveRequests.filter(l => l.staffId === currentUser.id && l.startDate <= selectedDateStr && l.endDate >= selectedDateStr);
                  if (dayLeaves.length === 0) {
                    return <p className="text-[10px] text-purple-600/80 font-medium">هیچ مرخصی یا عدم حضوری برای این تاریخ ثبت نکرده‌اید (آماده پذیرش مراجعین).</p>;
                  }
                  return (
                    <div className="space-y-1.5 pt-1">
                      {dayLeaves.map(l => (
                        <div key={l.id} className="bg-white border border-purple-200 p-2 rounded-lg flex items-center justify-between text-[11px]">
                          <div>
                            <span className="font-extrabold text-purple-900">{l.note || "مرخصی ثبت شده"}</span>
                            <span className={`mr-2 text-[9px] px-1.5 py-0.5 rounded font-bold ${l.status === 'accepted' || l.status === 'logged' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                              {l.status === 'accepted' || l.status === 'logged' ? 'تایید شده / فعال' : 'در انتظار تایید مدیر'}
                            </span>
                          </div>
                          {onUpdateLeaveRequests && (
                            <button
                              type="button"
                              onClick={async () => {
                                onUpdateLeaveRequests(leaveRequests.filter(item => item.id !== l.id));
                                try { await fetch(`/api/leave-requests/${l.id}`, { method: 'DELETE' }); } catch (e) { /* ignore */ }
                              }}
                              className="text-rose-500 hover:text-rose-700 font-bold text-[10px] cursor-pointer bg-rose-50 px-2 py-0.5 rounded"
                            >
                              حذف
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Form to Register Leave / Hours Off */}
                {showAddLeaveForm && (
                  <div className="bg-white border border-purple-200 p-3 rounded-xl space-y-3 pt-2">
                    <p className="text-[10.5px] font-extrabold text-slate-800">تعیین وضعیت حضور در تاریخ {toPersianDigits(selectedDateStr)}:</p>
                    <div className="flex items-center gap-4 text-xs font-bold text-slate-700">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="leaveType"
                          checked={leaveType === "fullday"}
                          onChange={() => setLeaveType("fullday")}
                          className="accent-purple-600"
                        />
                        <span>کل روز تعطیل (مرخصی کامل)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="leaveType"
                          checked={leaveType === "hours"}
                          onChange={() => setLeaveType("hours")}
                          className="accent-purple-600"
                        />
                        <span>ساعات خاص عدم حضور</span>
                      </label>
                    </div>

                    {leaveType === "hours" && (
                      <div className="flex items-center gap-2 text-xs bg-purple-50/50 p-2 rounded-lg">
                        <span className="font-bold text-slate-700">از ساعت:</span>
                        <select value={startHour} onChange={e => setStartHour(e.target.value)} className="bg-white border rounded px-2 py-1 font-bold">
                          {["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"].map(h => <option key={h} value={h}>{toPersianDigits(h)}</option>)}
                        </select>
                        <span className="font-bold text-slate-700">تا ساعت:</span>
                        <select value={endHour} onChange={e => setEndHour(e.target.value)} className="bg-white border rounded px-2 py-1 font-bold">
                          {["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"].map(h => <option key={h} value={h}>{toPersianDigits(h)}</option>)}
                        </select>
                      </div>
                    )}

                    <div>
                      <input
                        type="text"
                        placeholder="علت یا توضیحات (مثلاً کار شخصی یا استراحت)..."
                        value={leaveNote}
                        onChange={e => setLeaveNote(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        if (!onUpdateLeaveRequests || !selectedDay) return;
                        const noteText = leaveType === "fullday"
                          ? `مرخصی کامل روز (${leaveNote.trim() || "تعطیل"})`
                          : `عدم حضور از ساعت ${toPersianDigits(startHour)} تا ${toPersianDigits(endHour)} (${leaveNote.trim() || "مرخصی ساعتی"})`;
                        
                        const newLeave: LeaveRequest = {
                          id: `leave-${Date.now()}`,
                          staffId: currentUser.id,
                          startDate: selectedDateStr,
                          endDate: selectedDateStr,
                          requiresApproval: currentUser.contract?.contractType === "حقوق ثابت",
                          status: currentUser.contract?.contractType === "حقوق ثابت" ? "pending" : "logged",
                          note: noteText
                        };

                        const updatedList = [newLeave, ...leaveRequests];
                        onUpdateLeaveRequests(updatedList);
                        setShowAddLeaveForm(false);
                        setLeaveNote("");

                        try {
                          await fetch("/api/leave-requests", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              id: newLeave.id,
                              staff_id: newLeave.staffId,
                              start_date: newLeave.startDate,
                              end_date: newLeave.endDate,
                              requires_approval: newLeave.requiresApproval,
                              status: newLeave.status,
                              note: newLeave.note
                            })
                          });
                        } catch (e) { /* ignore */ }

                        alert("وضعیت حضور شما با موفقیت در تقویم ثبت شد و برای مدیر سالن و مراجعین شفاف‌سازی گردید. ✅");
                      }}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-2 rounded-lg text-xs shadow-md transition-all cursor-pointer"
                    >
                      ثبت در تقویم و اطلاع‌رسانی به سالن
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="p-5 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <p className="text-[10.5px] text-slate-500 font-bold">📅 جهت مشاهده جزئیات برنامه کاری و تایید سریع نوبت‌ها، روی یکی از روزهای تقویم بالا کلیک کنید.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RequestsInbox({
  currentUser,
  hiringOffers = [],
  onUpdateHiringOffers,
  clientRequests = [],
  onUpdateClientRequests,
  leaveRequests = [],
  onUpdateLeaveRequests,
  jobApplications = [],
  onUpdateJobApplications,
  allUsers = [],
  onUpdateUsersList,
  onAddDiscountedSlot,
  colleagueMessages = [],
  onUpdateColleagueMessages
}: RequestsInboxProps) {
  // Cancellation Modal state
  const [cancellingRequest, setCancellingRequest] = useState<ClientRequest | null>(null);

  // Colleague message reply states
  const [replyMessageId, setReplyMessageId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");

  // CALENDAR & PLANNING STATES
  const [calYear, setCalYear] = useState(1405);
  const [calMonth, setCalMonth] = useState(4); // default to Tir
  const [selectedCalDay, setSelectedCalDay] = useState<number | null>(null);
  
  // View mode toggles
  const [managerViewMode, setManagerViewMode] = useState<"list" | "calendar">("calendar");
  const [artistViewMode, setArtistViewMode] = useState<"list" | "calendar">("calendar");

  // Manager sub-tabs
  const [activeManagerTab, setActiveManagerTab] = useState<"bookings" | "hiring" | "applications" | "leaves" | "colleague_messages">("bookings");

  // Interactive contract creation state
  const [signingAppId, setSigningAppId] = useState<string | null>(null);
  const [contractType, setContractType] = useState<"درصدی" | "اجاره‌ای" | "حقوق ثابت">("درصدی");
  const [contractAmount, setContractAmount] = useState("");
  const [guaranteeType, setGuaranteeType] = useState<"سفته" | "چک">("سفته");
  const [declineConfirmId, setDeclineConfirmId] = useState<string | null>(null);

  // Saturday-starting Shamsi Calendar Helpers
  const getDaysInMonth = (y: number, m: number) => {
    if (m >= 1 && m <= 6) return 31;
    if (m >= 7 && m <= 11) return 30;
    const isLeap = (y - 1399) % 4 === 0;
    return isLeap ? 30 : 29;
  };

  const getFirstDayOffset = (y: number, m: number) => {
    const [gy, gm, gd] = jalaliToGregorian(y, m, 1);
    const date = new Date(gy, gm - 1, gd);
    const day = date.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const standardToIr = [1, 2, 3, 4, 5, 6, 0];
    return standardToIr[day];
  };

  const IR_WEEKDAYS_ORDER = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"];

  // FILTER DATA PER ROLE
  // --- Salon Manager ---
  const managerIncomingRequests = (clientRequests || []).filter(
    r => r.targetType === "salon" && (r.targetId === currentUser.id || r.targetId === "m1" || r.targetId === "m2" || r.targetId === "m3" || r.targetId === "m4" || r.targetId === "m5")
  );
  const managerOutgoingOffers = (hiringOffers || []).filter(o => o.managerId === currentUser.id);

  // --- Artist ---
  const artistIncomingOffers = (hiringOffers || []).filter(o => o.artistId === currentUser.id);
  const artistIncomingRequests = (clientRequests || []).filter(r => r.targetId === currentUser.id && r.targetType === "artist");

  // --- Client ---
  const clientOutgoingRequests = (clientRequests || []).filter(r => r.clientId === currentUser.id);

  // ACTION HANDLERS
  const handleUpdateOfferStatus = (offerId: string, newStatus: "accepted" | "declined") => {
    const updated = hiringOffers.map(o => {
      if (o.id === offerId) {
        return { ...o, status: newStatus };
      }
      return o;
    });
    onUpdateHiringOffers(updated);
    alert(`پیشنهاد همکاری با موفقیت ${newStatus === "accepted" ? "پذیرفته" : "رد"} شد.`);
  };

  const handleUpdateClientRequestStatus = (requestId: string, newStatus: "accepted" | "declined") => {
    const updated = clientRequests.map(r => {
      if (r.id === requestId) {
        return { ...r, status: newStatus };
      }
      return r;
    });
    onUpdateClientRequests(updated);
    alert(`درخواست نوبت مراجع با موفقیت ${newStatus === "accepted" ? "پذیرفته" : "رد"} شد.`);
  };

  const handleCancelClientRequest = (requestId: string, cancellation: CancellationDetails) => {
    const originalRequest = clientRequests.find(r => r.id === requestId);
    if (!originalRequest) return;

    const originalStatus = originalRequest.status;

    const updated = clientRequests.map(r =>
      r.id === requestId ? { ...r, status: "cancelled" as const, cancellation } : r
    );
    onUpdateClientRequests(updated);

    // If the cancelled request was previously accepted, publish as a Discounted Slot
    if (originalStatus === "accepted" && onAddDiscountedSlot) {
      const originalPrice = originalRequest.price || 1200000; // default 1,200,000 Toman if undefined
      const discountPercent = 20; // 20% discount
      const discountedPrice = Math.round(originalPrice * (1 - discountPercent / 100));

      const newSlot: DiscountedSlot = {
        id: `slot-${Date.now()}`,
        originalRequestId: requestId,
        artistId: originalRequest.targetId,
        artistName: originalRequest.targetName,
        salonName: originalRequest.targetType === "salon" ? originalRequest.targetName : "خانه زیبایی لجند",
        serviceType: originalRequest.serviceType,
        date: originalRequest.preferredDate,
        time: originalRequest.preferredTime,
        originalPrice,
        discountedPrice,
        discountPercent,
        appCommissionPercent: 20, // 20% recovery commission for platform
        status: "available",
        createdAt: originalRequest.createdAt,
      };

      onAddDiscountedSlot(newSlot);
    }

    setCancellingRequest(null);
  };

  // JOB APPLICATIONS (Hiring Artists with Contracts)
  const handleApproveApplication = (app: JobApplication) => {
    setSigningAppId(app.id);
    setContractAmount(
      contractType === "حقوق ثابت" ? "۱۵,۰۰۰,۰۰۰ تومان ثابت ماهانه" : 
      contractType === "درصدی" ? "۴۵٪ پورسانت از خدمات" : "۵,۰۰۰,۰۰۰ تومان اجاره ماهانه صندلی"
    );
  };

  const handleConfirmHire = (app: JobApplication) => {
    if (!contractAmount.trim()) {
      alert("لطفا جزئیات یا رقم قرارداد را مشخص کنید.");
      return;
    }

    const contract: StaffContract = {
      contractType,
      startDate: "1405/04/12",
      amount: contractAmount,
      guaranteeType,
    };

    // Promote in allUsers list
    const applicant = allUsers.find(u => u.id === app.applicantId);
    if (applicant) {
      const updatedApplicant: User = {
        ...applicant,
        role: "artist",
        contract
      };
      if (onUpdateUsersList) {
        const updatedList = allUsers.map(u => u.id === applicant.id ? updatedApplicant : u);
        onUpdateUsersList(updatedList);
      }
    }

    // Update job application status
    if (onUpdateJobApplications) {
      const updatedApps = jobApplications.map(ja => ja.id === app.id ? { ...ja, status: "accepted" as const } : ja);
      onUpdateJobApplications(updatedApps);
    }

    setSigningAppId(null);
    alert(`تبریک! آرتیست گرامی ${app.applicantName} با موفقیت استخدام شد و قرارداد وی فعال گردید.`);
  };

  const handleDeclineApplication = (appId: string) => {
    if (onUpdateJobApplications) {
      const updatedApps = jobApplications.map(ja => ja.id === appId ? { ...ja, status: "declined" as const } : ja);
      onUpdateJobApplications(updatedApps);
    }
    setDeclineConfirmId(null);
  };

  // LEAVE REQUEST APPROVALS
  const handleUpdateLeaveStatus = (leaveId: string, status: "accepted" | "declined") => {
    if (onUpdateLeaveRequests) {
      const updated = leaveRequests.map(lr => lr.id === leaveId ? { ...lr, status } : lr);
      onUpdateLeaveRequests(updated);
      alert(`درخواست مرخصی با موفقیت ${status === "accepted" ? "تایید" : "رد"} شد.`);
    }
  };

  const getStatusPill = (status: "pending" | "accepted" | "declined" | "logged" | "cancelled") => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2.5 py-1 rounded-full">
            <Clock className="w-3 h-3" /> در انتظار بررسی
          </span>
        );
      case "accepted":
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2.5 py-1 rounded-full">
            <Check className="w-3 h-3" /> پذیرفته شده
          </span>
        );
      case "declined":
        return (
          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold px-2.5 py-1 rounded-full">
            <X className="w-3 h-3" /> رد شده
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-bold px-2.5 py-1 rounded-full">
            <X className="w-3 h-3" /> لغو شده
          </span>
        );
      case "logged":
        return (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2.5 py-1 rounded-full">
            <FileText className="w-3 h-3" /> ثبت مکانیزه
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* Box Header */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-2.5">
        <Inbox className="w-5 h-5 text-[#0284c7]" />
        <div>
          <h2 className="text-base font-bold text-slate-950">صندوق ورودی و خروجی درخواست‌ها</h2>
          <p className="text-[11px] text-slate-500">لیست کلیه پیشنهادهای همکاری پرسنلی، درخواست‌های مرخصی و نوبت‌های مراجعین شما.</p>
        </div>
      </div>

      {/* VIEW FOR SALON MANAGER */}
      {currentUser.role === "manager" && (
        <div className="space-y-6">
          {/* Manager Tabs */}
          <div className="flex border border-slate-150 bg-white p-1.5 rounded-2xl gap-1.5 shadow-2xs">
            <button
              onClick={() => setActiveManagerTab("bookings")}
              className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeManagerTab === "bookings"
                  ? "bg-[#0284c7] text-white shadow-xs font-extrabold"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>نوبت‌های مراجعین ({toPersianDigits(managerIncomingRequests.length)})</span>
            </button>
            <button
              onClick={() => setActiveManagerTab("hiring")}
              className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeManagerTab === "hiring"
                  ? "bg-[#0284c7] text-white shadow-xs font-extrabold"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>پیشنهادهای استخدام سالن ({toPersianDigits(managerOutgoingOffers.length)})</span>
            </button>
            <button
              onClick={() => setActiveManagerTab("applications")}
              className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeManagerTab === "applications"
                  ? "bg-[#0284c7] text-white shadow-xs font-extrabold"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>درخواست‌های همکاری آرتیست‌ها ({toPersianDigits(jobApplications.length)})</span>
            </button>
            <button
              onClick={() => setActiveManagerTab("leaves")}
              className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeManagerTab === "leaves"
                  ? "bg-[#0284c7] text-white shadow-xs font-extrabold"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <CalendarRange className="w-4 h-4" />
              <span>مرخصی پرسنل ({toPersianDigits(leaveRequests.length)})</span>
            </button>
            <button
              onClick={() => setActiveManagerTab("colleague_messages")}
              className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeManagerTab === "colleague_messages"
                  ? "bg-[#0284c7] text-white shadow-xs font-extrabold"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <Mail className="w-4 h-4" />
              <span>
                {currentUser?.email === "fair.blizz@gmail.com"
                  ? `پایش مکاتبات سالن‌ها (${toPersianDigits(colleagueMessages.length)})`
                  : `مکاتبات بین‌سالنی (${toPersianDigits(colleagueMessages.filter(m => m.senderId === currentUser.id || m.receiverId === currentUser.id).length)})`}
              </span>
            </button>
          </div>

          {/* Tab 1: Bookings (Grid of calendar and list) */}
          {activeManagerTab === "bookings" && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                    <ArrowDownLeft className="w-4 h-4 text-emerald-600 animate-pulse" />
                    درخواست‌های نوبت ورودی از طرف مشتریان ({toPersianDigits(managerIncomingRequests.length)})
                  </h3>
                  
                  <div className="flex bg-slate-100 p-0.5 rounded-lg gap-0.5">
                    <button
                      type="button"
                      onClick={() => setManagerViewMode("calendar")}
                      className={`px-3 py-1 rounded-md text-[10px] font-black transition-all cursor-pointer ${
                        managerViewMode === "calendar" ? "bg-[#0284c7] text-white shadow-2xs" : "text-slate-500"
                      }`}
                    >
                      📅 تقویم نوبت‌ها
                    </button>
                    <button
                      type="button"
                      onClick={() => setManagerViewMode("list")}
                      className={`px-3 py-1 rounded-md text-[10px] font-black transition-all cursor-pointer ${
                        managerViewMode === "list" ? "bg-[#0284c7] text-white shadow-2xs" : "text-slate-500"
                      }`}
                    >
                      📥 لیست صندوق
                    </button>
                  </div>
                </div>

                {managerViewMode === "calendar" ? (
                  <ScheduleCalendarView
                    incomingRequests={managerIncomingRequests}
                    onUpdateStatus={handleUpdateClientRequestStatus}
                    getStatusPill={getStatusPill}
                    currentUser={currentUser || undefined}
                    leaveRequests={leaveRequests}
                    onUpdateLeaveRequests={onUpdateLeaveRequests}
                  />
                ) : (
                  <div className="space-y-3">
                    {managerIncomingRequests.length > 0 ? (
                      managerIncomingRequests.map((req) => (
                        <div key={req.id} className="bg-white border border-slate-100 rounded-2xl p-4.5 shadow-2xs space-y-3.5">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-xs font-bold text-slate-900">{req.clientName}</h4>
                              <p className="text-[9px] text-slate-400 font-bold flex items-center gap-1 mt-0.5" dir="ltr">
                                <span>{req.clientPhone}</span> <Phone className="w-3 h-3 text-slate-400" />
                              </p>
                            </div>
                            {getStatusPill(req.status)}
                          </div>

                          <div className="bg-slate-50 p-2.5 rounded-lg text-xs text-slate-700 space-y-1">
                            <p className="font-bold text-[#0284c7]">خدمات درخواستی: {req.serviceType}</p>
                            <p className="flex items-center gap-1 text-[10px] text-slate-500">
                              <Calendar className="w-3 h-3" /> تاریخ {toPersianDigits(req.preferredDate)} در ساعت {toPersianDigits(req.preferredTime)}
                            </p>
                          </div>

                          {req.status === "pending" && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUpdateClientRequestStatus(req.id, "accepted")}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold py-1.5 rounded-lg transition-all"
                              >
                                تایید نوبت
                              </button>
                              <button
                                onClick={() => handleUpdateClientRequestStatus(req.id, "declined")}
                                className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold py-1.5 rounded-lg transition-all"
                              >
                                رد درخواست
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center bg-white rounded-2xl border border-slate-100">
                        <p className="text-[11px] text-slate-400 font-bold">هیچ درخواست نوبت مشتری یافت نشد.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Informative Help Panel */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4 shadow-sm self-start">
                <h3 className="text-xs font-black text-slate-700">💡 راهنمای مدیریت نوبت‌های سالن</h3>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  از طریق تقویم کاری یا لیست هوشمند بالا، می‌توانید نوبت‌های ورودی مراجعین سالن را پایش و در شیفت مربوطه تایید یا رد نمایید. نوبت‌های پذیرفته شده به صورت خودکار به لود کاری و پرونده آرتیست‌های لاین افزوده شده و در محاسبات سود و زیان مالی کل سالن لحاظ خواهد گردید.
                </p>
              </div>
            </div>
          )}

          {/* Tab 2: Hiring Offers Sent */}
          {activeManagerTab === "hiring" && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <ArrowUpRight className="w-4 h-4 text-indigo-600" />
                پیشنهادهای استخدامی ارسالی شما به آرتیست‌ها ({toPersianDigits(managerOutgoingOffers.length)})
              </h3>

              <div className="grid md:grid-cols-2 gap-4">
                {managerOutgoingOffers.length > 0 ? (
                  managerOutgoingOffers.map((offer) => (
                    <div key={offer.id} className="bg-white border border-slate-100 rounded-2xl p-4.5 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900">گیرنده: {offer.artistName}</h4>
                        {getStatusPill(offer.status)}
                      </div>
                      <p className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg leading-relaxed">{offer.message}</p>
                      {offer.offerAmount && (
                        <div className="text-[10px] text-indigo-600 font-bold">مبلغ پیشنهادی: {offer.offerAmount}</div>
                      )}
                      <div className="text-[9px] text-slate-400 font-bold">ثبت شده در: {toPersianDigits(offer.createdAt)}</div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center bg-white rounded-2xl border border-slate-100 col-span-2">
                    <p className="text-[11px] text-slate-400 font-bold">تاکنون پیشنهاد استخدام فعالی ارسال نکرده‌اید.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Artist Job Applications (Hiring Artists & Creating Contracts) */}
          {activeManagerTab === "applications" && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <UserCheck className="w-4 h-4 text-[#0284c7]" />
                درخواست‌های پیوستن همکاران زیبایی به سالن شما ({toPersianDigits(jobApplications.length)})
              </h3>

              <div className="grid md:grid-cols-2 gap-4">
                {jobApplications.length > 0 ? (
                  jobApplications.map((app) => {
                    const applicantUser = allUsers.find(u => u.id === app.applicantId);
                    return (
                      <div key={app.id} className="bg-white border border-slate-100 rounded-2xl p-4.5 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">{app.applicantName}</h4>
                            <p className="text-[9px] text-slate-400 font-bold">{applicantUser?.title || "متخصص زیبایی"}</p>
                          </div>
                          {getStatusPill(app.status)}
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded-lg text-xs text-slate-700 leading-relaxed">
                          <p className="font-bold pb-1 text-[#0284c7]">پیام درخواست:</p>
                          <p className="italic text-slate-600">« {app.message} »</p>
                        </div>

                        {app.status === "pending" && signingAppId !== app.id && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApproveApplication(app)}
                              className="flex-1 bg-[#0284c7] hover:bg-[#0369a1] text-white text-[10px] font-black py-1.5 rounded-lg transition-all cursor-pointer"
                            >
                              بررسی و استخدام رسمی
                            </button>
                            {declineConfirmId === app.id ? (
                              <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-100 p-1 px-2 rounded-lg text-[9.5px]">
                                <span className="font-bold text-rose-700">رد شود؟</span>
                                <button
                                  onClick={() => handleDeclineApplication(app.id)}
                                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-2 py-0.5 rounded-md cursor-pointer text-[9px]"
                                >
                                  بله
                                </button>
                                <button
                                  onClick={() => setDeclineConfirmId(null)}
                                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-2 py-0.5 rounded-md cursor-pointer text-[9px]"
                                >
                                  خیر
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeclineConfirmId(app.id)}
                                className="bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                              >
                                رد درخواست
                              </button>
                            )}
                          </div>
                        )}

                        {/* Interactive Contract Builder inline modal */}
                        {signingAppId === app.id && (
                          <div className="p-3 border border-[#0284c7]/20 bg-slate-50/50 rounded-xl space-y-3 mt-3">
                            <h5 className="text-[11px] font-black text-slate-800 flex items-center gap-1 border-b border-slate-200 pb-1.5">
                              <FileText className="w-3.5 h-3.5 text-[#0284c7]" /> تنظیم قرارداد رسمی پرسنلی
                            </h5>

                            <div>
                              <label className="block text-[10px] text-slate-400 font-bold mb-1">نوع مدل همکاری پرسنل:</label>
                              <div className="flex gap-2 bg-white p-1 border border-slate-200 rounded-lg">
                                {(["درصدی", "اجاره‌ای", "حقوق ثابت"] as const).map((t) => (
                                  <button
                                    key={t}
                                    type="button"
                                    onClick={() => {
                                      setContractType(t);
                                      setContractAmount(
                                        t === "حقوق ثابت" ? "۱۵,۰۰۰,۰۰۰ تومان ثابت ماهانه" : 
                                        t === "درصدی" ? "۴۵٪ پورسانت از خدمات" : "۵,۰۰۰,۰۰۰ تومان اجاره ماهانه صندلی"
                                      );
                                    }}
                                    className={`flex-1 text-[9.5px] font-bold py-1 rounded-md transition-all ${
                                      contractType === t ? "bg-[#0284c7] text-white shadow-3xs" : "text-slate-500"
                                    }`}
                                  >
                                    {t}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] text-slate-400 font-bold mb-1">مبلغ، سهم یا درصد توافقی قرارداد:</label>
                              <input
                                type="text"
                                required
                                value={contractAmount}
                                onChange={(e) => setContractAmount(e.target.value)}
                                className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg text-slate-800 focus:outline-none focus:border-[#0284c7]"
                                placeholder="مثلا: ۴۵٪ پورسانت از کل فاکتورها"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] text-slate-400 font-bold mb-1">تضمین حسن انجام کار (قراردادی):</label>
                              <select
                                value={guaranteeType}
                                onChange={(e) => setGuaranteeType(e.target.value as any)}
                                className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg text-slate-800 outline-none"
                              >
                                <option value="سفته">سفته حسن انجام کار</option>
                                <option value="چک">چک معتبر بانکی</option>
                              </select>
                            </div>

                            <div className="flex gap-2 pt-1.5">
                              <button
                                onClick={() => handleConfirmHire(app)}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black py-1.5 rounded-lg transition-all"
                              >
                                ثبت قرارداد و اتمام استخدام
                              </button>
                              <button
                                onClick={() => setSigningAppId(null)}
                                className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all"
                              >
                                لغو
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center bg-white rounded-2xl border border-slate-100 col-span-2">
                    <p className="text-[11px] text-slate-400 font-bold">هیچ درخواست همکاری دریافتی ثبت نشده است.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 4: Staff Leave Requests */}
          {activeManagerTab === "leaves" && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <CalendarRange className="w-4 h-4 text-[#0284c7]" />
                درخواست‌های ثبت مرخصی و تعطیلات کادر سالن ({toPersianDigits(leaveRequests.length)})
              </h3>

              <div className="grid md:grid-cols-2 gap-4">
                {leaveRequests.length > 0 ? (
                  leaveRequests.map((lr) => {
                    const staff = allUsers.find(u => u.id === lr.staffId);
                    return (
                      <div key={lr.id} className="bg-white border border-slate-100 rounded-2xl p-4.5 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">{staff?.name || "پرسنل سالن"}</h4>
                            <p className="text-[9px] text-slate-400 font-bold">{staff?.title || "لاین ناخن"}</p>
                          </div>
                          {getStatusPill(lr.status)}
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded-lg text-xs text-slate-700 space-y-1">
                          <p className="font-bold text-[#0284c7]">دوره مرخصی:</p>
                          <p className="text-[10px] text-slate-600">
                            از تاریخ <span className="font-bold text-slate-800">{toPersianDigits(lr.startDate)}</span> تا <span className="font-bold text-slate-800">{toPersianDigits(lr.endDate)}</span>
                          </p>
                          {lr.note && (
                            <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-150">توضیح پرسنل: {lr.note}</p>
                          )}
                          <p className="text-[9.5px] text-indigo-600 font-bold pt-1">
                            {lr.requiresApproval ? "⚠️ نیاز به تایید مدیریت (قرارداد حقوق ثابت)" : "✓ ثبت مکانیزه موجه (کادر غیرثابت)"}
                          </p>
                        </div>

                        {lr.status === "pending" && lr.requiresApproval && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdateLeaveStatus(lr.id, "accepted")}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold py-1.5 rounded-lg transition-all cursor-pointer"
                            >
                              موافقت با مرخصی
                            </button>
                            <button
                              onClick={() => handleUpdateLeaveStatus(lr.id, "declined")}
                              className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold py-1.5 rounded-lg transition-all cursor-pointer"
                            >
                              مخالفت با مرخصی
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center bg-white rounded-2xl border border-slate-100 col-span-2">
                    <p className="text-[11px] text-slate-400 font-bold">هیچ مرخصی ثبتی یافت نشد.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeManagerTab === "colleague_messages" && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-[#0284c7]/5 via-white to-slate-50 border border-[#0284c7]/15 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="space-y-1 text-right">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <Mail className="text-[#0284c7] w-4.5 h-4.5" />
                      {currentUser?.email === "fair.blizz@gmail.com"
                        ? "سامانه ممیزی و پایش مکاتبات بین‌سالنی (سوپر ادمین)"
                        : "سامانه مکاتبات امن بین‌سالنی (ایمیل داخلی)"}
                    </h3>
                    <p className="text-[10.5px] text-slate-500">
                      {currentUser?.email === "fair.blizz@gmail.com"
                        ? "به عنوان سوپر ادمین ارشد لجندین، شما دسترسی نامحدود به پایش، ممیزی و ثبت رسمی لاگ‌های مکاتبات سالن‌ها دارید."
                        : "مجرای تبادل نظر، درخواست پرسنل کمکی، تهاتر ابزار زیبایی و تعاملات همکارانه میان سالن‌های لجندین."}
                    </p>
                  </div>

                  {currentUser?.email === "fair.blizz@gmail.com" && (
                    <button
                      onClick={() => {
                        const formattedLog = colleagueMessages.map((m, index) => (
                          `[Audit ID: ${m.id}] Sender: ${m.senderName} (${m.senderSalonName}) -> Receiver: ${m.receiverName} (${m.receiverSalonName}) | Subject: "${m.subject}" | Body: "${m.body}" | Date: ${m.createdAt}\n` +
                          (m.replies.length > 0 ? m.replies.map((r, ri) => `   └ Reply [${ri+1}]: ${r.senderName} (${r.senderSalonName}): "${r.body}" at ${r.createdAt}\n`).join("") : "   └ No replies\n")
                        )).join("\n");
                        console.log("========== SALON MESSAGES AUDIT LOG DUMP ==========");
                        console.log(formattedLog);
                        console.log("==================================================");
                        alert("تمامی پیام‌های بین‌سالنی جهت ممیزی حاکمیتی در کنسول توسعه با موفقیت لاگ (Log) شدند! ممیزی رسمی آرشیو گردید. 📁🔍");
                      }}
                      className="px-4 py-2.5 bg-slate-950 hover:bg-slate-800 text-white text-[11px] font-black rounded-xl transition-all shadow-md flex items-center gap-2 shrink-0 cursor-pointer"
                    >
                      <Lock className="w-4 h-4 text-emerald-400" />
                      ثبت رسمی و لاگ جامع ممیزی
                    </button>
                  )}
                </div>

                {/* Show messages list */}
                {(() => {
                  const isSuperAdmin = currentUser?.email === "fair.blizz@gmail.com";
                  const visibleMessages = isSuperAdmin
                    ? colleagueMessages
                    : colleagueMessages.filter(
                        (m) => m.senderId === currentUser.id || m.receiverId === currentUser.id
                      );

                  if (visibleMessages.length === 0) {
                    return (
                      <div className="p-8 text-center bg-white border border-slate-100 rounded-xl">
                        <Mail className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs text-slate-400 font-bold">هیچ مکاتبه و پیام همکارانه فعالی یافت نشد.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4 text-right">
                      {visibleMessages.map((msg) => {
                        const isSender = msg.senderId === currentUser.id;
                        const isMsgRead = msg.isRead || isSender;

                        const handleReplySubmit = (e: React.FormEvent) => {
                          e.preventDefault();
                          if (!replyBody.trim()) return;

                          const newReply: MessageReply = {
                            id: "reply-" + Math.random().toString(36).substr(2, 9),
                            senderId: currentUser.id,
                            senderName: currentUser.name,
                            senderSalonName: currentUser.salonName || "سالن همکار",
                            body: replyBody.trim(),
                            createdAt: "همین الان"
                          };

                          onUpdateColleagueMessages(prev =>
                            prev.map(m =>
                              m.id === msg.id
                                ? { ...m, isRead: isSender ? m.isRead : true, replies: [...m.replies, newReply] }
                                : m
                            )
                          );

                          setReplyBody("");
                          setReplyMessageId(null);
                        };

                        const markAsRead = () => {
                          if (!isSender && !msg.isRead) {
                            onUpdateColleagueMessages(prev =>
                              prev.map(m => (m.id === msg.id ? { ...m, isRead: true } : m))
                            );
                          }
                        };

                        return (
                          <div
                            key={msg.id}
                            onFocus={markAsRead}
                            onClick={markAsRead}
                            className={`border rounded-2xl p-4.5 transition-all text-right ${
                              isMsgRead
                                ? "bg-white border-slate-100 hover:border-slate-200"
                                : "bg-gradient-to-r from-[#0284c7]/5 via-white to-white border-[#0284c7]/30 shadow-xs"
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-50 pb-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap justify-end sm:justify-start">
                                  <span className="bg-slate-100 text-slate-700 text-[10px] font-black px-2 py-0.5 rounded-md">
                                    موضوع: {msg.subject}
                                  </span>
                                  {!isMsgRead && (
                                    <span className="bg-rose-500 text-white text-[8.5px] font-extrabold px-1.5 py-0.5 rounded-md animate-pulse">
                                      پیام جدید
                                    </span>
                                  )}
                                  {isSuperAdmin && (
                                    <span className="bg-indigo-50 text-indigo-700 text-[8.5px] font-extrabold px-1.5 py-0.5 rounded-md border border-indigo-100">
                                      آرشیو سوپر ادمین
                                    </span>
                                  )}
                                </div>

                                <div className="text-[10px] text-slate-400 font-bold flex items-center gap-2 mt-1 justify-end sm:justify-start" dir="rtl">
                                  <span>از طرف: <strong className="text-slate-700">{msg.senderSalonName}</strong> ({msg.senderName})</span>
                                  <span className="text-slate-300">←</span>
                                  <span>به مقصد: <strong className="text-slate-700">{msg.receiverSalonName}</strong> ({msg.receiverName})</span>
                                </div>
                              </div>

                              <span className="text-[9px] text-slate-400 font-bold self-end sm:self-start">
                                تاریخ: {toPersianDigits(msg.createdAt)}
                              </span>
                            </div>

                            {/* Message Body */}
                            <div className="py-3 text-xs text-slate-600 leading-relaxed font-semibold whitespace-pre-line bg-slate-50/50 p-3 rounded-xl mt-2 border border-slate-50">
                              {msg.body}
                            </div>

                            {/* Replies Timeline */}
                            {msg.replies.length > 0 && (
                              <div className="mt-4 pt-3 border-t border-dashed border-slate-150 space-y-3.5 pl-3">
                                <p className="text-[10px] text-[#0284c7] font-black flex items-center gap-1">
                                  <Inbox className="w-3.5 h-3.5" />
                                  تاریخچه مکالمات همکاران ({toPersianDigits(msg.replies.length)} پاسخ):
                                </p>
                                <div className="space-y-3">
                                  {msg.replies.map((reply) => {
                                    const isReplySender = reply.senderId === currentUser.id;
                                    return (
                                      <div
                                        key={reply.id}
                                        className={`p-3 rounded-xl max-w-[85%] text-right space-y-1 ${
                                          isReplySender
                                            ? "bg-[#0284c7]/5 border border-[#0284c7]/10 mr-auto"
                                            : "bg-slate-100 border border-slate-150 ml-auto"
                                        }`}
                                      >
                                        <div className="flex items-center justify-between gap-2 border-b border-slate-200/50 pb-1">
                                          <span className="text-[9px] font-bold text-slate-600">
                                            {reply.senderSalonName} ({reply.senderName})
                                          </span>
                                          <span className="text-[8px] text-slate-400 font-bold">
                                            {toPersianDigits(reply.createdAt)}
                                          </span>
                                        </div>
                                        <p className="text-[11px] text-slate-700 font-medium whitespace-pre-line leading-relaxed">
                                          {reply.body}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Reply Input or Actions */}
                            <div className="mt-3.5 flex justify-end">
                              {replyMessageId === msg.id ? (
                                <form onSubmit={handleReplySubmit} className="w-full space-y-2 mt-2">
                                  <textarea
                                    required
                                    rows={3}
                                    placeholder="پاسخ خود را در قالب ایمیل همکارانه بنویسید..."
                                    value={replyBody}
                                    onChange={(e) => setReplyBody(e.target.value)}
                                    className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-[#0284c7] focus:bg-white transition-all font-medium"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      type="submit"
                                      className="bg-[#0284c7] hover:bg-[#0369a1] text-white text-[10px] font-black px-4 py-2 rounded-lg shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                                    >
                                      <Send className="w-3 h-3" />
                                      ارسال پاسخ
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setReplyMessageId(null);
                                        setReplyBody("");
                                      }}
                                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold px-3 py-2 rounded-lg transition-all cursor-pointer"
                                    >
                                      انصراف
                                    </button>
                                  </div>
                                </form>
                              ) : (
                                <button
                                  onClick={() => setReplyMessageId(msg.id)}
                                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-[#0284c7] hover:text-white text-slate-700 text-[10px] font-black rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                  ارسال پاسخ همکارانه
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW FOR ARTISTS */}
      {currentUser.role === "artist" && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Incoming: Recruiter Hiring Offers */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <ArrowDownLeft className="w-4 h-4 text-purple-600" />
              پیشنهادهای همکاری و استخدام مدیران سالن ({toPersianDigits(artistIncomingOffers.length)})
            </h3>

            <div className="space-y-3">
              {artistIncomingOffers.length > 0 ? (
                artistIncomingOffers.map((offer) => (
                  <div key={offer.id} className="bg-white border border-slate-100 rounded-2xl p-4.5 shadow-2xs space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{offer.managerName}</h4>
                        <p className="text-[10px] text-slate-400 font-bold">{offer.salonName}</p>
                      </div>
                      {getStatusPill(offer.status)}
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-lg text-xs text-slate-700 leading-relaxed space-y-1">
                      <p>{offer.message}</p>
                      {offer.offerAmount && (
                        <p className="text-[10px] text-indigo-600 font-bold pt-1.5 border-t border-slate-150">بسته پیشنهادی: {offer.offerAmount}</p>
                      )}
                    </div>

                    {offer.status === "pending" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateOfferStatus(offer.id, "accepted")}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold py-1.5 rounded-lg transition-all"
                        >
                          پذیرش و همکاری
                        </button>
                        <button
                          onClick={() => handleUpdateOfferStatus(offer.id, "declined")}
                          className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold py-1.5 rounded-lg transition-all"
                        >
                          رد پیشنهاد
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-100">
                  <p className="text-[11px] text-slate-400 font-bold">هیچ پیشنهاد همکاری از طرف مدیران سالن‌ها دریافت نشده است.</p>
                </div>
              )}
            </div>
          </div>

          {/* Incoming: Client Service Bookings */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <h3 className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                <ArrowDownLeft className="w-4 h-4 text-emerald-600 animate-pulse" />
                درخواست‌های نوبت ورودی مشتریان ({toPersianDigits(artistIncomingRequests.length)})
              </h3>

              <div className="flex bg-slate-100 p-0.5 rounded-lg gap-0.5">
                <button
                  type="button"
                  onClick={() => setArtistViewMode("calendar")}
                  className={`px-3 py-1 rounded-md text-[10px] font-black transition-all cursor-pointer ${
                    artistViewMode === "calendar" ? "bg-[#0284c7] text-white shadow-2xs" : "text-slate-500"
                  }`}
                >
                  📅 تقویم کاری
                </button>
                <button
                  type="button"
                  onClick={() => setArtistViewMode("list")}
                  className={`px-3 py-1 rounded-md text-[10px] font-black transition-all cursor-pointer ${
                    artistViewMode === "list" ? "bg-[#0284c7] text-white shadow-2xs" : "text-slate-500"
                  }`}
                >
                  📥 لیست صندوق
                </button>
              </div>
            </div>

            {artistViewMode === "calendar" ? (
              <ScheduleCalendarView
                incomingRequests={artistIncomingRequests}
                onUpdateStatus={handleUpdateClientRequestStatus}
                getStatusPill={getStatusPill}
                currentUser={currentUser || undefined}
                leaveRequests={leaveRequests}
                onUpdateLeaveRequests={onUpdateLeaveRequests}
              />
            ) : (
              <div className="space-y-3">
                {artistIncomingRequests.length > 0 ? (
                  artistIncomingRequests.map((req) => (
                    <div key={req.id} className="bg-white border border-slate-100 rounded-2xl p-4.5 shadow-2xs space-y-3.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{req.clientName}</h4>
                          <p className="text-[9px] text-slate-400 font-bold flex items-center gap-0.5" dir="ltr">
                            <span>{req.clientPhone}</span> <Phone className="w-3 h-3 text-slate-400" />
                          </p>
                        </div>
                        {getStatusPill(req.status)}
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-lg text-xs text-slate-700 space-y-1">
                        <p className="font-bold text-[#0284c7]">خدمات درخواستی: {req.serviceType}</p>
                        <p className="flex items-center gap-1 text-[10px] text-slate-500">
                          <Calendar className="w-3 h-3" /> تاریخ {toPersianDigits(req.preferredDate)} در ساعت {toPersianDigits(req.preferredTime)}
                        </p>
                      </div>

                      {req.status === "pending" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateClientRequestStatus(req.id, "accepted")}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold py-1.5 rounded-lg transition-all"
                          >
                            تایید نوبت
                          </button>
                          <button
                            onClick={() => handleUpdateClientRequestStatus(req.id, "declined")}
                            className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold py-1.5 rounded-lg transition-all"
                          >
                            رد درخواست
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center bg-white rounded-2xl border border-slate-100">
                    <p className="text-[11px] text-slate-400 font-bold">هیچ درخواست رزرو نوبت دریافت نکردید.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW FOR CLIENTS */}
      {currentUser.role === "client" && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <ArrowUpRight className="w-4 h-4 text-[#0284c7]" />
            درخواست‌های نوبت ارسالی شما به متخصصین زیبایی و سالن‌ها ({toPersianDigits(clientOutgoingRequests.length)})
          </h3>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientOutgoingRequests.length > 0 ? (
              clientOutgoingRequests.map((req) => (
                <div key={req.id} className="bg-white border border-slate-100 rounded-2xl p-4.5 shadow-sm space-y-3.5 flex flex-col justify-between">
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-900">گیرنده: {req.targetName}</h4>
                      {getStatusPill(req.status)}
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl text-xs text-slate-700 space-y-1">
                      <p className="font-bold text-[#0284c7]">سرویس: {req.serviceType}</p>
                      <p className="flex items-center gap-1 text-[10px] text-slate-500">
                        <Calendar className="w-3.5 h-3.5" /> تاریخ {toPersianDigits(req.preferredDate)} ساعت {toPersianDigits(req.preferredTime)}
                      </p>
                      {req.price !== undefined && (
                        <p className="text-[10px] text-slate-500 font-bold mt-1">
                          مبلغ: <span className="text-[#0284c7] font-black">{formatToman(req.price)}</span>
                        </p>
                      )}
                    </div>

                    {req.status === "cancelled" && req.cancellation && (
                      <div className="p-2.5 bg-rose-50/40 rounded-xl border border-rose-100 text-[10px] text-rose-800 space-y-1 font-bold">
                        <p>علت لغو: {req.cancellation.reasonCategory}</p>
                        {req.cancellation.reasonNote && (
                          <p className="text-slate-500">توضیح: {req.cancellation.reasonNote}</p>
                        )}
                        {req.cancellation.feeApplied && req.cancellation.feeAmount !== undefined && (
                          <p className="text-rose-600 font-black">جریمه لغو اعمال شده: {formatToman(req.cancellation.feeAmount)}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {(req.status === "pending" || req.status === "accepted") && (
                    <button
                      type="button"
                      onClick={() => setCancellingRequest(req)}
                      className="w-full mt-2.5 py-2 bg-rose-50 hover:bg-rose-100/80 text-rose-700 text-[10px] font-black rounded-xl transition-all cursor-pointer text-center border border-rose-100/50"
                    >
                      لغو نوبت
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-3 p-12 text-center bg-white rounded-2xl border border-slate-100">
                <p className="text-xs text-slate-400 font-bold">شما هیچ درخواست نوبتی ارسال نکرده‌اید.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Render Cancellation Reason & Confirmation Modal */}
      {cancellingRequest && (
        <CancelReservationModal
          request={cancellingRequest}
          onClose={() => setCancellingRequest(null)}
          onConfirm={handleCancelClientRequest}
        />
      )}

    </div>
  );
}

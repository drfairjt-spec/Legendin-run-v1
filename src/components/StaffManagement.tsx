import React, { useState, useMemo } from "react";
import { User, Transaction, LeaveRequest, ClientRequest, Service, StaffContract } from "../types";
import { toPersianDigits, formatToman } from "../utils/shamsi";
import { calculateEmployeeBalance } from "../utils/employeeBalance";
import { seedServices } from "../data";
import { 
  Users, UserPlus, Briefcase, DollarSign, Calendar, ShieldAlert,
  Check, X, FileText, Settings, Sparkles, Phone, Mail, Award, Eye,
  Clock, Plus, Trash2, Edit2, CheckCircle2, ChevronDown, ListFilter, TrendingUp, RefreshCw,
  BookOpen, Video, GraduationCap, PenTool
} from "lucide-react";

interface StaffManagementProps {
  currentUser: User;
  allUsers: User[];
  onUpdateUsers: (updatedList: User[]) => void;
  transactions: Transaction[];
  onUpdateTransactions: (updatedList: Transaction[]) => void;
  leaveRequests: LeaveRequest[];
  onUpdateLeaveRequests: (updatedList: LeaveRequest[]) => void;
  clientRequests: ClientRequest[];
}

export default function StaffManagement({
  currentUser,
  allUsers = [],
  onUpdateUsers,
  transactions = [],
  onUpdateTransactions,
  leaveRequests = [],
  onUpdateLeaveRequests,
  clientRequests = []
}: StaffManagementProps) {
  // Local state managers
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterRole, setFilterRole] = useState<"all" | "artist" | "service-staff">("all");
  const [filterContract, setFilterContract] = useState<"all" | "درصدی" | "اجاره‌ای" | "حقوق ثابت">("all");

  // Form State for creating new staff
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffPhone, setNewStaffPhone] = useState("");
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffTitle, setNewStaffTitle] = useState("");
  const [newStaffBio, setNewStaffBio] = useState("");
  const [newStaffExp, setNewStaffExp] = useState(3);
  const [newStaffRole, setNewStaffRole] = useState<"artist" | "service-staff">("artist");
  const [contractType, setContractType] = useState<"درصدی" | "اجاره‌ای" | "حقوق ثابت">("درصدی");
  const [contractAmount, setContractAmount] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  // Modals / Dialog States
  const [paymentStaff, setPaymentStaff] = useState<User | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDesc, setPaymentDesc] = useState("");

  const [leaveStaff, setLeaveStaff] = useState<User | null>(null);
  const [leaveStart, setLeaveStart] = useState("1405/04/20");
  const [leaveEnd, setLeaveEnd] = useState("1405/04/22");
  const [leaveNote, setLeaveNote] = useState("");

  const [serviceStaff, setServiceStaff] = useState<User | null>(null);
  const [serviceChecklist, setServiceChecklist] = useState<string[]>([]);

  // Cert auditing states
  const [activeTab, setActiveTab] = useState<"directory" | "auditing" | "training">("directory");
  const [auditLightboxUrl, setAuditLightboxUrl] = useState<string | null>(null);

  // --- Training/Academy States ---
  interface TrainingCourse {
    id: string;
    title: string;
    description: string;
    instructorId: string;
    instructorName: string;
    salonName: string;
    isOnline: boolean;
    googleMeetUrl?: string;
    enrolledArtistIds: string[];
    status: "active" | "completed";
    createdAt: string;
    completedAt?: string;
    managerSignature?: string;
    graduatedArtistIds?: string[];
  }

  const [courses, setCourses] = useState<TrainingCourse[]>(() => {
    const saved = localStorage.getItem("salon_training_courses");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    const seedCourses: TrainingCourse[] = [
      {
        id: "course-1",
        title: "تکنیک آمبره و بالیاژ پیشرفته ۱۴۰۵",
        description: "آموزش گام‌به‌گام جدیدترین تکنیک‌های دکلره، دسته‌بندی مو، پوش‌دادن و فید بی‌نظیر ریشه‌ها به همراه فرمول‌های کاربردی رنگ‌ساژ سالن.",
        instructorId: currentUser.id,
        instructorName: currentUser.name,
        salonName: currentUser.salonName || "خانه زیبایی لجند",
        isOnline: true,
        googleMeetUrl: "https://meet.google.com/abc-defg-hij",
        enrolledArtistIds: [],
        status: "active",
        createdAt: "1405/03/15"
      },
      {
        id: "course-2",
        title: "کارگاه تخصصی کاشت ناخن ژورنالی (حضوری)",
        description: "آموزش صفر تا صد صدف‌سازی، فرم‌دهی مِـندِرِل و ژل‌ سیستم‌های پیشرفته برای آرتیست‌های ناخن لاین تخصصی.",
        instructorId: currentUser.id,
        instructorName: currentUser.name,
        salonName: currentUser.salonName || "خانه زیبایی لجند",
        isOnline: false,
        enrolledArtistIds: [],
        status: "active",
        createdAt: "1405/03/20"
      }
    ];
    return seedCourses;
  });

  const saveCourses = (updatedCourses: TrainingCourse[]) => {
    setCourses(updatedCourses);
    localStorage.setItem("salon_training_courses", JSON.stringify(updatedCourses));
  };

  // Form states for adding course
  const [showAddCourseForm, setShowAddCourseForm] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newCourseDesc, setNewCourseDesc] = useState("");
  const [newCourseIsOnline, setNewCourseIsOnline] = useState(false);
  const [newCourseMeetUrl, setNewCourseMeetUrl] = useState("https://meet.google.com/abc-defg-hij");
  const [newCourseSelectedArtists, setNewCourseSelectedArtists] = useState<string[]>([]);

  // Form states for graduating/certifying
  const [graduatingCourse, setGraduatingCourse] = useState<TrainingCourse | null>(null);
  const [graduatingSelectedArtists, setGraduatingSelectedArtists] = useState<string[]>([]);
  const [managerSignatureText, setManagerSignatureText] = useState(`تایید شده و به امضای دیجیتال سرکار خانم ${currentUser.name} (مدیریت سالن ${currentUser.salonName || "خانه زیبایی لجند"})`);

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseTitle.trim()) return;

    const newCourse: TrainingCourse = {
      id: "course-" + Date.now(),
      title: newCourseTitle,
      description: newCourseDesc,
      instructorId: currentUser.id,
      instructorName: currentUser.name,
      salonName: currentUser.salonName || "خانه زیبایی لجند",
      isOnline: newCourseIsOnline,
      googleMeetUrl: newCourseIsOnline ? newCourseMeetUrl : undefined,
      enrolledArtistIds: newCourseSelectedArtists,
      status: "active",
      createdAt: "1405/04/02"
    };

    const updated = [newCourse, ...courses];
    saveCourses(updated);

    // Reset form states
    setNewCourseTitle("");
    setNewCourseDesc("");
    setNewCourseIsOnline(false);
    setNewCourseMeetUrl("https://meet.google.com/abc-defg-hij");
    setNewCourseSelectedArtists([]);
    setShowAddCourseForm(false);

    alert(`دوره آموزشی "${newCourse.title}" با موفقیت تعریف شد.`);
  };

  const handleCompleteCourse = (courseId: string, artistIds: string[], signature: string) => {
    if (artistIds.length === 0) {
      alert("لطفاً حداقل یک هنرجو را جهت صدور مدرک انتخاب کنید.");
      return;
    }

    const updatedCourses = courses.map(c => {
      if (c.id === courseId) {
        return {
          ...c,
          status: "completed" as const,
          completedAt: "1405/04/02",
          managerSignature: signature,
          graduatedArtistIds: artistIds
        };
      }
      return c;
    });
    saveCourses(updatedCourses);

    const targetCourse = courses.find(c => c.id === courseId);
    if (targetCourse) {
      const updatedUsers = allUsers.map(u => {
        if (artistIds.includes(u.id)) {
          const currentCerts = u.uploadedCertificates || [];
          const newCertId = "cert-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
          
          const formattedTitle = `گواهی‌نامه دوره تخصصی: ${targetCourse.title}`;
          
          const newCertObj = {
            id: newCertId,
            title: formattedTitle,
            documentUrl: `https://images.unsplash.com/photo-1589330694653-ded6df03f754?auto=format&fit=crop&w=800&q=80`, 
            status: "approved" as const, 
            uploadedAt: "1405/04/02",
            // custom fields can be inferred or shown in UI
            issuerSignature: signature
          };

          const currentTextCerts = u.certifications || [];
          const updatedTextCerts = currentTextCerts.includes(formattedTitle)
            ? currentTextCerts
            : [...currentTextCerts, formattedTitle];

          return {
            ...u,
            uploadedCertificates: [...currentCerts, newCertObj],
            certifications: updatedTextCerts,
            isVerified: true 
          };
        }
        return u;
      });

      onUpdateUsers(updatedUsers);
    }

    alert("دوره آموزشی با موفقیت خاتمه یافت و گواهی‌نامه‌های الکترونیکی با مهر و امضای دیجیتال مدیریت برای هنرجویان صادر شد.");
    setGraduatingCourse(null);
    setGraduatingSelectedArtists([]);
  };

  // Toggle selection for new course
  const toggleArtistForCourse = (id: string) => {
    setNewCourseSelectedArtists(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Toggle selection for graduating artists
  const toggleArtistForGraduation = (id: string) => {
    setGraduatingSelectedArtists(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };


  const handleUpdateCertificateStatus = (artistId: string, certId: string, status: "approved" | "rejected") => {
    const updatedUsers = allUsers.map(u => {
      if (u.id === artistId) {
        const certs = u.uploadedCertificates || [];
        const updatedCerts = certs.map(c => c.id === certId ? { ...c, status } : c);
        
        let textCerts = u.certifications || [];
        const targetCert = certs.find(c => c.id === certId);
        if (status === "approved" && targetCert && !textCerts.includes(targetCert.title)) {
          textCerts = [...textCerts, targetCert.title];
        }

        const hasApprovedCert = updatedCerts.some(c => c.status === "approved");

        return {
          ...u,
          uploadedCertificates: updatedCerts,
          certifications: textCerts,
          isVerified: hasApprovedCert ? true : u.isVerified
        };
      }
      return u;
    });

    onUpdateUsers(updatedUsers);
  };

  const handleToggleArtistVerification = (artistId: string) => {
    const updatedUsers = allUsers.map(u => {
      if (u.id === artistId) {
        return {
          ...u,
          isVerified: !u.isVerified
        };
      }
      return u;
    });
    onUpdateUsers(updatedUsers);
  };

  // Get only the bookable services (child items) from seedServices
  const bookableServices = useMemo(() => {
    return seedServices.filter(s => s.parentServiceId !== undefined);
  }, []);

  // Filter staff belonging to this manager's salon
  const salonStaff = useMemo(() => {
    const managerSalonName = currentUser.salonName || "خانه زیبایی لجند";
    return (allUsers || []).filter(u => {
      // Must be an artist or service-staff
      const isStaffRole = u.role === "artist" || u.role === "service-staff";
      if (!isStaffRole) return false;

      // Associate if salonName matches, or they have a contract with this salon
      const isMine = u.salonName === managerSalonName || u.salonName?.includes(managerSalonName) || u.contract !== undefined;
      return isMine;
    });
  }, [allUsers, currentUser.salonName]);

  const pendingCertificatesCount = useMemo(() => {
    return salonStaff.reduce((acc, user) => {
      if (user.role === "artist" && user.uploadedCertificates) {
        const pendingForUser = user.uploadedCertificates.filter(c => c.status === "pending").length;
        return acc + pendingForUser;
      }
      return acc;
    }, 0);
  }, [salonStaff]);

  // Apply filters
  const filteredStaff = useMemo(() => {
    return salonStaff.filter(s => {
      const matchRole = filterRole === "all" || s.role === filterRole;
      const matchContract = filterContract === "all" || s.contract?.contractType === filterContract;
      return matchRole && matchContract;
    });
  }, [salonStaff, filterRole, filterContract]);

  // Staff Statistics summary
  const staffStats = useMemo(() => {
    const total = salonStaff.length;
    const fixed = salonStaff.filter(s => s.contract?.contractType === "حقوق ثابت").length;
    const commission = salonStaff.filter(s => s.contract?.contractType === "درصدی").length;
    const rental = salonStaff.filter(s => s.contract?.contractType === "اجاره‌ای").length;

    // Find top earning employee based on generated income
    let topEarner: { name: string; amount: number } | null = null;
    salonStaff.forEach(s => {
      const balanceSummary = calculateEmployeeBalance(s, transactions);
      if (!topEarner || balanceSummary.totalGeneratedIncome > topEarner.amount) {
        topEarner = { name: s.name, amount: balanceSummary.totalGeneratedIncome };
      }
    });

    return { total, fixed, commission, rental, topEarner };
  }, [salonStaff, transactions]);

  // Handle adding new artist/staff
  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffPhone.trim() || !newStaffTitle.trim()) {
      alert("لطفاً اطلاعات اجباری (نام، شماره تماس و تخصص) را وارد کنید.");
      return;
    }

    // Create a mock contract object
    const newContract: StaffContract = {
      contractType,
      startDate: "1405/04/01",
      amount: contractAmount.trim() || (contractType === "درصدی" ? "۴۰٪" : "۱۰,۰۰۰,۰۰۰ تومان")
    };

    // Create a random profile avatar
    const randomAvatars = [
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=150&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop"
    ];
    const avatar = randomAvatars[Math.floor(Math.random() * randomAvatars.length)];

    const newStaffUser: User = {
      id: "staff-" + Math.random().toString(36).substring(2, 9),
      name: newStaffName,
      phone: newStaffPhone,
      email: newStaffEmail || `${newStaffName.replace(/\s+/g, "").toLowerCase()}@legendin.ir`,
      role: newStaffRole,
      avatar,
      title: newStaffTitle,
      city: currentUser.city || "تهران",
      bio: newStaffBio || `همکار متخصص و مجرب در لاین زیبایی ${newStaffTitle}`,
      yearsOfExperience: Number(newStaffExp),
      salonName: currentUser.salonName || "خانه زیبایی لجند",
      openForHiring: false,
      acceptingRequests: true,
      assignedServiceIds: selectedServices,
      contract: newContract
    };

    onUpdateUsers([newStaffUser, ...allUsers]);

    // Reset Form Fields
    setNewStaffName("");
    setNewStaffPhone("");
    setNewStaffEmail("");
    setNewStaffTitle("");
    setNewStaffBio("");
    setNewStaffExp(3);
    setNewStaffRole("artist");
    setContractType("درصدی");
    setContractAmount("");
    setSelectedServices([]);
    setShowAddForm(false);

    alert(`پرسنل جدید (${newStaffName}) با موفقیت تعریف شد و قرارداد همکاری ثبت گردید! ✨`);
  };

  // Handle payouts / settlements
  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentStaff) return;
    const amountNum = parseInt(paymentAmount.replace(/[^\d]/g, ""), 10);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("لطفاً مبلغ معتبری برای تسویه حساب وارد کنید.");
      return;
    }

    const newTx: Transaction = {
      id: `tx-payout-${Date.now()}`,
      salonId: "salon-1",
      direction: "cost",
      category: "حقوق پرسنل",
      amount: amountNum,
      date: "1405/04/12",
      description: paymentDesc.trim() || `تسویه حساب ماهانه با ${paymentStaff.name} بابت کارکرد لاین زیبایی`,
      relatedStaffId: paymentStaff.id,
      createdAt: new Date().toISOString()
    };

    onUpdateTransactions([newTx, ...transactions]);
    setPaymentStaff(null);
    setPaymentAmount("");
    setPaymentDesc("");
    alert(`تراکنش مالی تسویه حساب به مبلغ ${formatToman(amountNum)} تومان برای (${paymentStaff.name}) با موفقیت ثبت شد. 💳`);
  };

  // Handle direct leave recording
  const handleAddLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveStaff) return;

    const newLeave: LeaveRequest = {
      id: `leave-${Date.now()}`,
      staffId: leaveStaff.id,
      startDate: leaveStart,
      endDate: leaveEnd,
      requiresApproval: leaveStaff.contract?.contractType === "حقوق ثابت",
      status: leaveStaff.contract?.contractType === "حقوق ثابت" ? "accepted" : "logged",
      note: leaveNote.trim() || "ثبت مرخصی توسط مدیریت سالن"
    };

    onUpdateLeaveRequests([newLeave, ...leaveRequests]);
    setLeaveStaff(null);
    setLeaveNote("");
    alert(`مرخصی پرسنل (${leaveStaff.name}) در تقویم کاری سالن با موفقیت ثبت شد. 📅`);
  };

  // Save modified assigned services
  const handleSaveServices = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceStaff) return;

    const updatedUsers = allUsers.map(u => {
      if (u.id === serviceStaff.id) {
        return {
          ...u,
          assignedServiceIds: serviceChecklist
        };
      }
      return u;
    });

    onUpdateUsers(updatedUsers);
    setServiceStaff(null);
    setServiceChecklist([]);
    alert(`لاین‌های خدماتی تخصیص داده شده به (${serviceStaff.name}) با موفقیت به‌روزرسانی شد. ✂️`);
  };

  // Handle termination of collaboration
  const handleTerminateContract = (staff: User) => {
    if (confirm(`آیا از پایان دادن به قرارداد همکاری با (${staff.name}) و لغو دسترسی‌های سالنی وی اطمینان دارید؟`)) {
      const updatedUsers = allUsers.map(u => {
        if (u.id === staff.id) {
          // Remove contract and association
          const { contract, salonName, ...rest } = u;
          return {
            ...rest,
            role: "artist" as const, // keep as default artist without salon
            openForHiring: true // open back up to the market
          };
        }
        return u;
      });
      onUpdateUsers(updatedUsers);
      alert(`قرارداد همکاری با (${staff.name}) خاتمه یافت و پرونده پرسنلی وی آرشیو شد.`);
    }
  };

  // Toggle bookable service checklist
  const toggleServiceInChecklist = (serviceId: string) => {
    setServiceChecklist(prev => 
      prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId]
    );
  };

  return (
    <div className="space-y-6 text-right animate-fade-in" dir="rtl">
      
      {/* 1. Header Banner & Dynamic Stats Bento */}
      <div className="bg-gradient-to-l from-[#0284c7] to-[#0369a1] rounded-2xl p-5 text-white shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="space-y-1">
            <h2 className="text-base font-black flex items-center gap-2">
              <Users className="w-5 h-5" />
              مدیریت و مانیتورینگ پرسنل سالن
            </h2>
            <p className="text-[10.5px] text-white/80">
              تعریف پرسنل جدید، تخصیص خدمات، مانیتورینگ عملکرد، تسویه حساب‌های مالی و مدیریت مرخصی‌های فعالان سالن {currentUser.salonName || "خانه زیبایی لجند"}.
            </p>
          </div>
          {activeTab === "directory" && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2.5 bg-white text-[#0284c7] hover:bg-slate-50 text-xs font-black rounded-xl transition-all shadow-xs flex items-center gap-1.5 self-start sm:self-center cursor-pointer"
            >
              {showAddForm ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              {showAddForm ? "بستن فرم تعریف" : "تعریف آرتیست / پرسنل جدید"}
            </button>
          )}
        </div>
 
        {/* Bento stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/5 space-y-1">
            <p className="text-[9.5px] text-white/70 font-bold">کل پرسنل فعال:</p>
            <p className="text-lg font-black">{toPersianDigits(staffStats.total)} <span className="text-[10px] font-bold">نفر</span></p>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/5 space-y-1">
            <p className="text-[9.5px] text-white/70 font-bold">همکاری درصدی / اجاره‌ای:</p>
            <p className="text-lg font-black">{toPersianDigits(staffStats.commission)} <span className="text-[10.5px] text-white/50">درصدی</span> / {toPersianDigits(staffStats.rental)} <span className="text-[10.5px] text-white/50">اجاره</span></p>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/5 space-y-1">
            <p className="text-[9.5px] text-white/70 font-bold">پرسنل حقوق ثابت:</p>
            <p className="text-lg font-black">{toPersianDigits(staffStats.fixed)} <span className="text-[10px] font-bold">نفر</span></p>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/5 space-y-1">
            <p className="text-[9.5px] text-white/70 font-bold">برترین درآمدزا:</p>
            <p className="text-xs font-black truncate">{staffStats.topEarner ? `${staffStats.topEarner.name} (${formatToman(staffStats.topEarner.amount)})` : "ثبت نشده"}</p>
          </div>
        </div>
      </div>

      {/* Segmented Tab Selectors */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60 shadow-inner">
        <button
          onClick={() => setActiveTab("directory")}
          className={`flex-1 py-3 text-center text-xs font-black transition-all rounded-xl flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "directory"
              ? "bg-white text-slate-900 shadow-sm font-black"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>پرونده‌ها و مدیریت پرسنل فعال</span>
        </button>
        <button
          onClick={() => setActiveTab("auditing")}
          className={`flex-1 py-3 text-center text-xs font-black transition-all rounded-xl flex items-center justify-center gap-2 cursor-pointer relative ${
            activeTab === "auditing"
              ? "bg-white text-slate-900 shadow-sm font-black"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Award className="w-4 h-4" />
          <span>ممیزی مدارک و تایید صلاحیت آرتیست‌ها</span>
          {pendingCertificatesCount > 0 && (
            <span className="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md animate-pulse shrink-0">
              {toPersianDigits(pendingCertificatesCount)} جدید
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("training")}
          className={`flex-1 py-3 text-center text-xs font-black transition-all rounded-xl flex items-center justify-center gap-2 cursor-pointer relative ${
            activeTab === "training"
              ? "bg-white text-slate-900 shadow-sm font-black"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>آکادمی و دوره‌های آموزشی سالن</span>
          {courses.filter(c => c.status === "active").length > 0 && (
            <span className="bg-[#0284c7] text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shrink-0">
              {toPersianDigits(courses.filter(c => c.status === "active").length)} فعال
            </span>
          )}
        </button>
      </div>

      {activeTab === "directory" && (
        <>
          {/* 2. Collapsible Form: Add New Artist/Staff */}
          {showAddForm && (
        <form onSubmit={handleAddStaff} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 animate-slide-down">
          <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
            <UserPlus className="text-[#0284c7] w-4.5 h-4.5" />
            ثبت اطلاعات و قرارداد استخدام پرسنل جدید سالن
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-600">نام و نام خانوادگی پرسنل:</label>
              <input
                type="text"
                required
                placeholder="مثلاً: شیوا امینی"
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-[#0284c7] focus:bg-white transition-all font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-600">شماره موبایل همراه:</label>
              <input
                type="text"
                required
                placeholder="مثلاً: ۰۹۱۲۰۰۰۰۰۰۰"
                value={newStaffPhone}
                onChange={(e) => setNewStaffPhone(e.target.value)}
                className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-[#0284c7] focus:bg-white transition-all font-bold text-left"
                dir="ltr"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-600">ایمیل آدرس (اختیاری):</label>
              <input
                type="email"
                placeholder="مثلاً: shiva@example.com"
                value={newStaffEmail}
                onChange={(e) => setNewStaffEmail(e.target.value)}
                className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-[#0284c7] focus:bg-white transition-all font-semibold text-left"
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-600">عنوان تخصصی و لاین:</label>
              <input
                type="text"
                required
                placeholder="مثلاً: متخصص کاشت مژه و اکستنشن والیوم"
                value={newStaffTitle}
                onChange={(e) => setNewStaffTitle(e.target.value)}
                className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-[#0284c7] focus:bg-white transition-all font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-600">نقش پرسنلی در سیستم:</label>
              <select
                value={newStaffRole}
                onChange={(e) => setNewStaffRole(e.target.value as any)}
                className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-[#0284c7] focus:bg-white transition-all font-bold"
              >
                <option value="artist">آرتیست تخصصی سالن (خدمات‌دهنده)</option>
                <option value="service-staff">پرسنل عمومی سالن / پشتیبانی</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-600">سابقه کار مفید (به سال):</label>
              <input
                type="number"
                min="0"
                max="40"
                value={newStaffExp}
                onChange={(e) => setNewStaffExp(Number(e.target.value))}
                className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-[#0284c7] focus:bg-white transition-all font-bold text-center"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-600">بیوگرافی و شرح مهارت‌ها:</label>
            <textarea
              rows={2}
              placeholder="توضیحات کوتاهی در مورد مهارت‌ها، افتخارات، یا سوابق کاری پرسنل جهت درج در رزومه سالنی..."
              value={newStaffBio}
              onChange={(e) => setNewStaffBio(e.target.value)}
              className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-[#0284c7] focus:bg-white transition-all resize-none font-medium"
            />
          </div>

          {/* Setup Contract Details */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
            <h4 className="text-[11.5px] font-black text-slate-800 flex items-center gap-1">
              <FileText className="w-4 h-4 text-slate-500" />
              جزئیات قرارداد همکاری سالنی (قرارداد رسمی)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10.5px] font-black text-slate-600">نوع مدل تسویه حساب و قرارداد:</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["درصدی", "اجاره‌ای", "حقوق ثابت"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setContractType(type)}
                      className={`py-2 text-center text-[10.5px] font-black rounded-lg border transition-all cursor-pointer ${
                        contractType === type
                          ? "bg-[#0284c7] text-white border-[#0284c7]"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10.5px] font-black text-slate-600">
                  {contractType === "درصدی" && "میزان پورسانت آرتیست (مثلاً: ۴۰٪ یا ۵۰٪):"}
                  {contractType === "اجاره‌ای" && "مبلغ اجاره‌بهای ماهانه صندلی / لاین:"}
                  {contractType === "حقوق ثابت" && "حقوق ثابت خالص ماهانه (تومان):"}
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    contractType === "درصدی" ? "مثلاً: ۴۵٪ پورسانت" :
                    contractType === "اجاره‌ای" ? "مثلاً: ۶,۰۰۰,۰۰۰ تومان" : "مثلاً: ۱۲,۰۰۰,۰۰۰ تومان"
                  }
                  value={contractAmount}
                  onChange={(e) => setContractAmount(e.target.value)}
                  className="w-full text-xs text-slate-800 bg-white border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-[#0284c7] transition-all font-bold"
                />
              </div>
            </div>
          </div>

          {/* Service assignment inside creation */}
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-600 flex items-center gap-1">
              <Settings className="w-4 h-4 text-slate-400" />
              تخصیص نوبت‌ها و لاین‌های خدماتی فعال پرسنل (لاین‌های زیبایی):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-100 max-h-44 overflow-y-auto">
              {bookableServices.map(service => {
                const isSelected = selectedServices.includes(service.id);
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedServices(prev => prev.filter(id => id !== service.id));
                      } else {
                        setSelectedServices(prev => [...prev, service.id]);
                      }
                    }}
                    className={`p-2.5 rounded-lg text-right border text-[10.5px] transition-all flex items-center justify-between gap-1.5 cursor-pointer ${
                      isSelected
                        ? "bg-[#0284c7]/5 border-[#0284c7] text-[#0284c7] font-black"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="truncate">{service.name}</span>
                    {isSelected ? <Check className="w-3.5 h-3.5 shrink-0" /> : <Plus className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-black py-3 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            تایید نهایی و استخدام پرسنل زیبایی
          </button>
        </form>
      )}

      {/* 3. Filters & List Wrapper */}
      <div className="space-y-4">
        
        {/* Filter bar */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ListFilter className="w-4.5 h-4.5 text-[#0284c7]" />
            <h4 className="text-xs font-black text-slate-800">فیلتر و پایش همکاران سالن:</h4>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {/* Filter by role */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 px-2.5 rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold">سمت:</span>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as any)}
                className="text-[10.5px] font-black text-slate-700 bg-transparent border-none outline-none focus:ring-0"
              >
                <option value="all">همه پرسنل</option>
                <option value="artist">آرتیست متخصص</option>
                <option value="service-staff">پشتیبانی و خدمات</option>
              </select>
            </div>

            {/* Filter by contract */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 px-2.5 rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold">نوع تسویه:</span>
              <select
                value={filterContract}
                onChange={(e) => setFilterContract(e.target.value as any)}
                className="text-[10.5px] font-black text-slate-700 bg-transparent border-none outline-none focus:ring-0"
              >
                <option value="all">همه مدل‌ها</option>
                <option value="درصدی">تسویه درصدی</option>
                <option value="اجاره‌ای">صندلی اجاره‌ای</option>
                <option value="حقوق ثابت">حقوق ثابت خالص</option>
              </select>
            </div>
          </div>
        </div>

        {/* Directory List of Staff */}
        {filteredStaff.length === 0 ? (
          <div className="bg-white border border-slate-200/60 rounded-2xl p-10 text-center space-y-4">
            <Users className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-400 font-bold leading-relaxed max-w-xs mx-auto">
              هیچ پرسنل یا آرتیستی با فیلترهای مشخص شده در این سالن یافت نشد. می‌توانید از کلید بالا جهت اضافه کردن اولین پرسنل استفاده کنید.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {filteredStaff.map((staff) => {
              // Calculate live metrics
              const totalBookings = (clientRequests || []).filter(r => r.targetId === staff.id && r.status !== "cancelled").length;
              const pendingLeave = (leaveRequests || []).filter(l => l.staffId === staff.id && l.status === "pending").length;
              const approvedLeave = (leaveRequests || []).filter(l => l.staffId === staff.id && (l.status === "accepted" || l.status === "logged")).length;
              const balanceSummary = calculateEmployeeBalance(staff, transactions);

              return (
                <div key={staff.id} className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden hover:shadow-md transition-all flex flex-col lg:flex-row text-right">
                  
                  {/* Left Column (Meta details & Basic Profile) */}
                  <div className="p-5 lg:w-72 bg-slate-50/50 border-b lg:border-b-0 lg:border-l border-slate-100 flex flex-col justify-between space-y-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={staff.avatar}
                        alt={staff.name}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-inner shrink-0"
                      />
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-slate-900">{staff.name}</h4>
                        <span className="inline-block px-2.5 py-0.5 bg-[#0284c7]/10 text-[#0284c7] text-[8.5px] font-black rounded-md">
                          {staff.role === "artist" ? "آرتیست متخصص" : "خدمات و پشتیبانی"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 text-[10.5px] text-slate-500 font-bold">
                      <p className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        تلفن: <span className="text-slate-800 font-black">{toPersianDigits(staff.phone)}</span>
                      </p>
                      <p className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        ایمیل: <span className="text-slate-800 font-black truncate max-w-44 text-left" dir="ltr">{staff.email}</span>
                      </p>
                      <p className="flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                        تخصص: <span className="text-slate-800 font-black">{staff.title}</span>
                      </p>
                      <p className="flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-slate-400" />
                        سابقه کار: <span className="text-slate-800 font-black">{toPersianDigits(staff.yearsOfExperience || 0)} سال</span>
                      </p>
                    </div>

                    <div className="bg-white border border-slate-100 p-2.5 rounded-xl space-y-1.5">
                      <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                        <span>نوع تسویه حساب:</span>
                        <span className="text-[#0284c7] font-black">{staff.contract?.contractType || "درصدی"}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-600 font-black">
                        <span>شرط معین:</span>
                        <span>{staff.contract?.amount || "۴۰٪"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column (Live performance & Interactive utilities) */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-5">
                    
                    {/* Live Performance / Monitoring Widgets */}
                    <div className="space-y-3">
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                        شاخص‌های عملکرد و مانیتورینگ زنده پرسنل
                      </h5>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                        
                        {/* Bookings Performance */}
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1.5">
                          <p className="text-[9.5px] text-slate-400 font-bold">تعداد کل نوبت‌های کاری:</p>
                          <p className="text-sm font-black text-slate-800">{toPersianDigits(totalBookings)} نوبت فعال</p>
                          <div className="flex items-center gap-1 text-[8.5px] text-slate-400 font-medium">
                            <Clock className="w-3 h-3 text-slate-300" />
                            <span>رزرو شده از طریق جامعه لجندین</span>
                          </div>
                        </div>

                        {/* Leave attendance */}
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1.5">
                          <p className="text-[9.5px] text-slate-400 font-bold">مرخصی‌ها و حضور غیاب:</p>
                          <p className="text-sm font-black text-slate-800">{toPersianDigits(approvedLeave)} روز ثبت شده</p>
                          <div className="flex items-center gap-1 text-[8.5px] text-slate-400 font-medium">
                            <Calendar className="w-3 h-3 text-slate-300" />
                            <span>{toPersianDigits(pendingLeave)} درخواست در انتظار تایید</span>
                          </div>
                        </div>

                        {/* Financial Ledger Balance */}
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1.5">
                          <p className="text-[9.5px] text-slate-400 font-bold">تراز نهایی معین پرسنل:</p>
                          <p className={`text-sm font-black ${
                            balanceSummary.netBalance > 0 ? "text-emerald-600" : 
                            balanceSummary.netBalance < 0 ? "text-rose-600" : "text-slate-600"
                          }`}>
                            {balanceSummary.netBalance > 0 ? `${formatToman(balanceSummary.netBalance)} + طلبکار` :
                             balanceSummary.netBalance < 0 ? `${formatToman(Math.abs(balanceSummary.netBalance))} - بدهکار` : "تسویه کامل"}
                          </p>
                          <div className="flex items-center gap-1 text-[8.5px] text-slate-400 font-medium">
                            <DollarSign className="w-3 h-3 text-slate-300" />
                            <span>درآمد تولیدی: {formatToman(balanceSummary.totalGeneratedIncome)}</span>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Assigned services tags display */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-slate-400 font-black">لاین‌ها و خدمات تخصیصی این آرتیست:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {staff.assignedServiceIds && staff.assignedServiceIds.length > 0 ? (
                          staff.assignedServiceIds.map(serviceId => {
                            const foundSvc = bookableServices.find(s => s.id === serviceId);
                            return (
                              <span key={serviceId} className="px-2 py-1 bg-slate-100 text-slate-700 text-[9.5px] font-bold rounded-lg border border-slate-200">
                                {foundSvc ? foundSvc.name : serviceId}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-[10px] text-slate-400 font-bold">هیچ لاین خدماتی تخصیص داده نشده است.</span>
                        )}
                      </div>
                    </div>

                    {/* Interactive manager utilities */}
                    <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          setPaymentStaff(staff);
                          setPaymentAmount("");
                          setPaymentDesc("");
                        }}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10.5px] font-black rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        ثبت تسویه حساب / واریز حقوق
                      </button>

                      <button
                        onClick={() => {
                          setLeaveStaff(staff);
                          setLeaveStart("1405/04/20");
                          setLeaveEnd("1405/04/22");
                          setLeaveNote("");
                        }}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10.5px] font-black rounded-xl transition-all cursor-pointer flex items-center gap-1 border border-slate-200"
                      >
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        ثبت مرخصی مستقیم
                      </button>

                      <button
                        onClick={() => {
                          setServiceStaff(staff);
                          setServiceChecklist(staff.assignedServiceIds || []);
                        }}
                        className="px-3 py-2 bg-[#0284c7]/10 hover:bg-[#0284c7]/20 text-[#0284c7] text-[10.5px] font-black rounded-xl transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        تغییر خدمات / لاین‌ها
                      </button>

                      <button
                        onClick={() => handleTerminateContract(staff)}
                        className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10.5px] font-black rounded-xl transition-all cursor-pointer flex items-center gap-1 border border-rose-150 mr-auto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        خاتمه قرارداد همکاری
                      </button>
                    </div>

                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>
        </>
      )}

      {activeTab === "auditing" && (
        /* --- Auditing Tab Content --- */
        <div className="space-y-6 animate-fade-in text-right" dir="rtl">
          {/* Auditing Header / Quick Tips */}
          <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Award className="w-5 h-5 text-amber-500" />
                ممیزی مدارک رسمی و گواهی‌نامه‌های آموزشی همکاران سالن
              </h4>
              <p className="text-[10.5px] text-slate-500 leading-relaxed">
                در این بخش می‌توانید مدارک ارسالی، دستاوردها و تخصص‌های معتبر آپلود شده توسط آرتیست‌ها را بررسی و تأیید نمایید. با تایید مدارک، نشان اعتبار به پروفایل عمومی آرتیست افزوده می‌شود.
              </p>
            </div>
            <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200/50 p-3 rounded-xl shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[11px] font-black text-amber-800">
                {toPersianDigits(pendingCertificatesCount)} مدرک در انتظار بررسی سالن
              </span>
            </div>
          </div>

          {/* Artist Audit Grid */}
          {salonStaff.filter(u => u.role === "artist").length === 0 ? (
            <div className="bg-white border border-slate-200/60 rounded-2xl p-12 text-center space-y-3">
              <Award className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-400 font-bold">هیچ آرتیستی متعلق به این سالن در سیستم یافت نشد.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {salonStaff.filter(u => u.role === "artist").map((artist) => {
                const certs = artist.uploadedCertificates || [];
                
                return (
                  <div key={artist.id} className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4 hover:shadow-sm transition-all text-right">
                    
                    {/* Header Area: Artist Meta + Verification Toggle */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={artist.avatar} 
                          alt={artist.name} 
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-inner shrink-0"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-black text-slate-900">{artist.name}</h4>
                            {artist.isVerified ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black rounded-md border border-blue-150">
                                <Check className="w-3 h-3 shrink-0" />
                                تایید شده (Verified)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 text-slate-400 text-[9px] font-bold rounded-md border border-slate-200">
                                احراز نشده
                              </span>
                            )}
                          </div>
                          <p className="text-[10.5px] text-slate-500 font-bold">{artist.title}</p>
                        </div>
                      </div>

                      {/* Manual Verification Badge Toggle */}
                      <button
                        onClick={() => handleToggleArtistVerification(artist.id)}
                        className={`px-3.5 py-2 text-[11px] font-black rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                          artist.isVerified
                            ? "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                            : "bg-[#0284c7] hover:bg-[#0369a1] text-white border-[#0284c7] shadow-sm"
                        }`}
                      >
                        <Award className="w-4 h-4" />
                        {artist.isVerified ? "سلب نشان تایید صلاحیت" : "اعطای مستقیم نشان تایید (Verified)"}
                      </button>
                    </div>

                    {/* Certs List for this specific artist */}
                    <div className="space-y-3">
                      <h5 className="text-[11px] font-black text-slate-700 flex items-center gap-1">
                        <FileText className="w-4 h-4 text-slate-400" />
                        مدارک، سرتیفیکیت‌ها و افتخارات ارسالی:
                      </h5>

                      {certs.length === 0 ? (
                        <p className="text-[10.5px] text-slate-400 font-medium bg-slate-50/50 p-4 rounded-xl border border-dashed border-slate-200 text-center">
                          هیچ مدرک مکتوبی توسط این آرتیست بارگذاری نشده است. مدارک جدید به محض آپلود توسط آرتیست در اینجا نمایان می‌شوند.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {certs.map((cert) => (
                            <div key={cert.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-150 flex flex-col justify-between gap-3 hover:bg-slate-100/50 transition-all">
                              
                              {/* Title and Badge */}
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1 text-right">
                                  <p className="text-xs font-black text-slate-800 leading-relaxed">{cert.title}</p>
                                  <p className="text-[9px] text-slate-400 font-medium">تاریخ بارگذاری: {toPersianDigits(cert.uploadedAt)}</p>
                                </div>
                                
                                {/* Status badge */}
                                {cert.status === "pending" && (
                                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[8.5px] font-black rounded-md shrink-0 border border-amber-200/40 animate-pulse">
                                    در انتظار بررسی
                                  </span>
                                )}
                                {cert.status === "approved" && (
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[8.5px] font-black rounded-md shrink-0 border border-emerald-200/40">
                                    تایید شده
                                  </span>
                                )}
                                {cert.status === "rejected" && (
                                  <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[8.5px] font-black rounded-md shrink-0 border border-rose-200/40">
                                    مردود شده
                                  </span>
                                )}
                              </div>

                              {/* Document view and actions */}
                              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                                {/* Preview button */}
                                <button
                                  type="button"
                                  onClick={() => setAuditLightboxUrl(cert.documentUrl)}
                                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-[10px] font-black rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                                  مشاهده مدرک ارسالی
                                </button>

                                {/* Pending Review Buttons */}
                                {cert.status === "pending" && (
                                  <div className="flex gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateCertificateStatus(artist.id, cert.id, "approved")}
                                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      تایید مدرک
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateCertificateStatus(artist.id, cert.id, "rejected")}
                                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                      عدم تایید
                                    </button>
                                  </div>
                                )}
                              </div>

                            </div>
                          ))}
                        </div>
                      )}

                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "training" && (
        <div className="space-y-6 animate-fade-in text-right" dir="rtl">
          {/* Training Header & Actions */}
          <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <BookOpen className="w-5 h-5 text-[#0284c7]" />
                سیستم ارتقای تخصص و آکادمی مهارت همکاران سالن {currentUser.salonName || "خانه زیبایی لجند"}
              </h4>
              <p className="text-[10.5px] text-slate-500 leading-relaxed">
                مدیریت دوره‌های آموزشی فعال، تدریس سرفصل‌های تخصصی، برگزاری کلاس‌های آنلاین گوگل‌میت و صدور مکتوب گواهی‌نامه صلاحیت با تاییدیه و امضای رسمی مدیریت.
              </p>
            </div>
            <button
              onClick={() => setShowAddCourseForm(!showAddCourseForm)}
              className="px-4 py-2.5 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-black rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              {showAddCourseForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showAddCourseForm ? "بستن فرم تعریف دوره" : "تعریف سرفصل آموزشی جدید"}
            </button>
          </div>

          {/* Form to define a new Subject/Course */}
          {showAddCourseForm && (
            <form onSubmit={handleCreateCourse} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 animate-slide-down">
              <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
                <GraduationCap className="text-[#0284c7] w-4.5 h-4.5" />
                راه‌اندازی کارگاه یا دوره آموزشی تخصصی جدید
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-600">عنوان دوره / سرفصل آموزشی:</label>
                  <input
                    type="text"
                    required
                    placeholder="مثلاً: تکنیک بالیاژ روسی و ترکیب رنگ‌های سرد"
                    value={newCourseTitle}
                    onChange={(e) => setNewCourseTitle(e.target.value)}
                    className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-[#0284c7] focus:bg-white transition-all font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-600">نوع برگزاری کلاس:</label>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setNewCourseIsOnline(false)}
                      className={`py-2 px-3 text-[11px] font-black rounded-xl border transition-all cursor-pointer text-center ${
                        !newCourseIsOnline
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      حضوری در سالن زیبایی
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewCourseIsOnline(true)}
                      className={`py-2 px-3 text-[11px] font-black rounded-xl border transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                        newCourseIsOnline
                          ? "bg-[#0284c7] text-white border-[#0284c7]"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <Video className="w-3.5 h-3.5" />
                      آنلاین (Google Meet)
                    </button>
                  </div>
                </div>
              </div>

              {newCourseIsOnline && (
                <div className="bg-blue-50/50 border border-blue-150 p-4 rounded-xl space-y-1.5 animate-slide-down">
                  <label className="text-[11px] font-black text-blue-800 flex items-center gap-1">
                    <Video className="w-4 h-4 text-blue-600 animate-pulse" />
                    لینک اختصاصی ویدیوکنفرانس کلاس آنلاین (گوگل میت):
                  </label>
                  <p className="text-[9px] text-blue-600/80 font-bold">این لینک در زمان شروع کلاس جهت هدایت و ورود آنلاین مدرس (Salon Teacher) و آرتیست‌ها استفاده خواهد شد.</p>
                  <input
                    type="url"
                    required={newCourseIsOnline}
                    placeholder="https://meet.google.com/abc-defg-hij"
                    value={newCourseMeetUrl}
                    onChange={(e) => setNewCourseMeetUrl(e.target.value)}
                    className="w-full text-xs text-slate-800 bg-white border border-blue-200 rounded-xl p-3 focus:outline-none focus:border-[#0284c7] transition-all font-mono"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-600">توضیحات و اهداف مهارتی دوره آموزشی:</label>
                <textarea
                  rows={2}
                  placeholder="مواردی از قبیل متدهای تدریس، ابزار مورد نیاز هنرجویان و استانداردهای لازم برای دریافت نمره قبولی..."
                  value={newCourseDesc}
                  onChange={(e) => setNewCourseDesc(e.target.value)}
                  className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-[#0284c7] focus:bg-white transition-all font-bold"
                />
              </div>

              {/* Select enrolled artists from this salon */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-600 block">انتخاب هنرجویان از بین آرتیست‌ها و پرسنل فعال سالن شما:</label>
                {salonStaff.length === 0 ? (
                  <p className="text-[10px] text-slate-400 font-bold py-2">هیچ پرسنل فعالی در سالن شما جهت ثبت‌نام یافت نشد.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {salonStaff.map(artist => {
                      const isSelected = newCourseSelectedArtists.includes(artist.id);
                      return (
                        <button
                          type="button"
                          key={artist.id}
                          onClick={() => toggleArtistForCourse(artist.id)}
                          className={`p-2.5 rounded-xl border text-right flex items-center gap-2 transition-all cursor-pointer ${
                            isSelected
                              ? "bg-sky-50 border-sky-300 text-sky-900 shadow-xs"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <img src={artist.avatar} className="w-6 h-6 rounded-md object-cover" alt="" />
                          <div className="truncate text-right">
                            <p className="text-[10.5px] font-black leading-none">{artist.name}</p>
                            <p className="text-[8.5px] text-slate-400 font-bold truncate mt-0.5">{artist.title}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCourseForm(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl cursor-pointer shadow-xs"
                >
                  ثبت و راه‌اندازی دوره مهارتی
                </button>
              </div>
            </form>
          )}

          {/* Active Courses and Complete Certification issuing Section */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-emerald-600" />
              لیست کلاس‌ها و وضعیت دوره‌های آموزشی سالن
            </h4>

            {courses.length === 0 ? (
              <div className="bg-white border border-slate-200/60 rounded-2xl p-12 text-center space-y-3">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-400 font-bold">هیچ دوره آموزشی یا سرفصل فعالی در حال حاضر ثبت نشده است.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {courses.map((course) => {
                  const isActive = course.status === "active";
                  return (
                    <div 
                      key={course.id} 
                      className={`bg-white border rounded-2xl p-5 shadow-xs transition-all text-right flex flex-col justify-between gap-4 ${
                        isActive ? "border-slate-200/80 hover:shadow-sm" : "border-slate-150 bg-slate-50/50"
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Header Badge */}
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-md ${
                            isActive 
                              ? "bg-amber-100 text-amber-800 border border-amber-200/40" 
                              : "bg-emerald-100 text-emerald-800 border border-emerald-200/40"
                          }`}>
                            {isActive ? "کلاس در حال برگزاری" : "پایان‌یافته و تایید صلاحیت شده"}
                          </span>
                          
                          <span className="text-[9.5px] font-bold text-slate-400">
                            {course.isOnline ? "آموزش آنلاین" : "آموزش حضوری"} • {toPersianDigits(course.createdAt)}
                          </span>
                        </div>

                        {/* Title & Desc */}
                        <div className="space-y-1">
                          <h5 className="text-xs font-black text-slate-900">{course.title}</h5>
                          <p className="text-[10.5px] text-slate-500 leading-relaxed font-medium">{course.description}</p>
                        </div>

                        {/* Enrolled artists list inside card */}
                        <div className="bg-slate-50/70 border border-slate-100 p-3 rounded-xl space-y-2">
                          <p className="text-[9.5px] font-black text-slate-600">هنرجویان ثبت‌نام شده در این کارگاه:</p>
                          {course.enrolledArtistIds.length === 0 ? (
                            <p className="text-[9.5px] text-slate-400 font-bold">هنوز هیچ آرتیستی ثبت‌نام نشده است.</p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {course.enrolledArtistIds.map(artistId => {
                                const art = allUsers.find(u => u.id === artistId);
                                if (!art) return null;
                                return (
                                  <div key={artistId} className="inline-flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-1 rounded-lg">
                                    <img src={art.avatar} className="w-4 h-4 rounded-md object-cover" alt="" />
                                    <span className="text-[9.5px] font-black text-slate-800">{art.name}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* If course has been completed and certified by manager, show details */}
                        {!isActive && (
                          <div className="p-3 bg-emerald-50/50 border border-emerald-150 rounded-xl space-y-1.5">
                            <p className="text-[9.5px] font-black text-emerald-800 flex items-center gap-1">
                              <PenTool className="w-3.5 h-3.5 text-emerald-600" />
                              امضای تایید نهایی مدرس و مدیریت سالن:
                            </p>
                            <p className="text-[10px] text-emerald-700 font-black italic">{course.managerSignature}</p>
                            {course.completedAt && (
                              <p className="text-[9px] text-slate-400 font-medium">تاریخ اتمام و صدور: {toPersianDigits(course.completedAt)}</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        {/* Google Meet redirection action (Register / teacher online class) */}
                        {course.isOnline && course.googleMeetUrl ? (
                          <a
                            href={course.googleMeetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10.5px] font-black rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Video className="w-4 h-4" />
                            <span>ورود به کلاس آنلاین (Google Meet)</span>
                          </a>
                        ) : (
                          <span className="text-[9.5px] text-slate-400 font-bold">برگزاری حضوری در سالن</span>
                        )}

                        {/* Finish course and give signature */}
                        {isActive && (
                          <button
                            onClick={() => {
                              setGraduatingCourse(course);
                              setGraduatingSelectedArtists(course.enrolledArtistIds);
                            }}
                            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[10.5px] font-black rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <GraduationCap className="w-3.5 h-3.5" />
                            اتمام کلاس و صدور مدرک
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Issue Certificate Form Panel */}
          {graduatingCourse && (
            <div className="bg-white border-2 border-slate-900 rounded-2xl p-5 shadow-lg space-y-4 animate-slide-down">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <PenTool className="text-emerald-600 w-5 h-5" />
                  بررسی نهایی، درج امضا و تایید رسمی گواهی‌نامه کارگاه آموزشی
                </h3>
                <button
                  type="button"
                  onClick={() => setGraduatingCourse(null)}
                  className="text-slate-400 hover:text-slate-600 font-black text-xs cursor-pointer"
                >
                  انصراف ×
                </button>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl text-xs space-y-1 font-bold text-slate-700">
                <p>دوره منتخب: <strong className="text-slate-900">{graduatingCourse.title}</strong></p>
                <p>مدرس دوره: <strong className="text-slate-900">{graduatingCourse.instructorName}</strong> ({graduatingCourse.salonName})</p>
              </div>

              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-700 block">انتخاب هنرجویان واجد شرایط قبولی و دریافت گواهی‌نامه:</label>
                {salonStaff.length === 0 ? (
                  <p className="text-[10px] text-slate-400 font-bold">هیچ پرسنلی در سالن موجود نیست.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {salonStaff.map(artist => {
                      const isGraduating = graduatingSelectedArtists.includes(artist.id);
                      return (
                        <button
                          type="button"
                          key={artist.id}
                          onClick={() => toggleArtistForGraduation(artist.id)}
                          className={`p-2 rounded-xl border text-right flex items-center gap-2 transition-all cursor-pointer ${
                            isGraduating
                              ? "bg-emerald-50 border-emerald-300 text-emerald-900 shadow-xs"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                            isGraduating ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 bg-white"
                          }`}>
                            {isGraduating && <Check className="w-2.5 h-2.5" />}
                          </span>
                          <img src={artist.avatar} className="w-6 h-6 rounded-md object-cover" alt="" />
                          <div className="truncate text-right">
                            <p className="text-[10.5px] font-black leading-none">{artist.name}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Manager Digital Signature Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-700">امضا دیجیتال و متن مهر تایید مدیریت سالن:</label>
                <input
                  type="text"
                  required
                  placeholder="متن گواهی تایید و امضای شما، مثلا: تایید شده و به امضای دیجیتال سرکار خانم مریم قاسمی (مدیریت سالن لاوین)"
                  value={managerSignatureText}
                  onChange={(e) => setManagerSignatureText(e.target.value)}
                  className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all font-bold"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setGraduatingCourse(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl cursor-pointer"
                >
                  انصراف و ادامه برگزاری کلاس
                </button>
                <button
                  type="button"
                  onClick={() => handleCompleteCourse(graduatingCourse.id, graduatingSelectedArtists, managerSignatureText)}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl cursor-pointer shadow-xs"
                >
                  ثبت اتمام دوره و صدور نهایی گواهی‌نامه‌ها
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. MODAL: Payment / Settlement Transaction */}
      {paymentStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-slate-100 overflow-hidden text-right" dir="rtl">
            <div className="bg-gradient-to-l from-emerald-600 to-emerald-700 p-4 text-white flex items-center justify-between">
              <h3 className="text-sm font-black flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                ثبت سند مالی و تسویه حساب با پرسنل
              </h3>
              <button
                onClick={() => setPaymentStaff(null)}
                className="text-white hover:text-white/80 font-bold text-xs cursor-pointer"
              >
                بستن ×
              </button>
            </div>

            <form onSubmit={handleAddPayment} className="p-5 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs font-bold text-slate-700 space-y-1">
                <p>دریافت‌کننده وجه: <strong className="text-slate-900">{paymentStaff.name}</strong> ({paymentStaff.title})</p>
                <p>مدل همکاری مکتوب: <strong className="text-slate-900">{paymentStaff.contract?.contractType}</strong> ({paymentStaff.contract?.amount})</p>
                <p>طلب فعلی آرتیست بر اساس فاکتورها: <strong className="text-slate-900">{formatToman(calculateEmployeeBalance(paymentStaff, transactions).netBalance)} تومان</strong></p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-700">مبلغ واریزی / تسویه (تومان):</label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً: ۴,۵۰۰,۰۰۰"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-700">شرح بابت سند مالی:</label>
                <textarea
                  rows={3}
                  placeholder="مثلاً: پرداخت پورسانت آذر ماه لاین رنگ موی تخصصی روسی..."
                  value={paymentDesc}
                  onChange={(e) => setPaymentDesc(e.target.value)}
                  className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all resize-none font-medium"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black py-3 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  تایید و ثبت سند در حسابداری
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentStaff(null)}
                  className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL: Direct Leave Recording */}
      {leaveStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-slate-100 overflow-hidden text-right" dir="rtl">
            <div className="bg-gradient-to-l from-slate-700 to-slate-800 p-4 text-white flex items-center justify-between">
              <h3 className="text-sm font-black flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                ثبت مرخصی مستقیم برای پرسنل سالن
              </h3>
              <button
                onClick={() => setLeaveStaff(null)}
                className="text-white hover:text-white/80 font-bold text-xs cursor-pointer"
              >
                بستن ×
              </button>
            </div>

            <form onSubmit={handleAddLeave} className="p-5 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs font-bold text-slate-700">
                ثبت ایام عدم حضور یا مرخصی استعلاجی/استحقاقی برای: <strong className="text-slate-900">{leaveStaff.name}</strong>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-700">شروع مرخصی (شمسی):</label>
                  <input
                    type="text"
                    required
                    value={leaveStart}
                    onChange={(e) => setLeaveStart(e.target.value)}
                    className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-slate-500 font-bold text-center"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-700">پایان مرخصی (شمسی):</label>
                  <input
                    type="text"
                    required
                    value={leaveEnd}
                    onChange={(e) => setLeaveEnd(e.target.value)}
                    className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-slate-500 font-bold text-center"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-700">توضیحات و علت عدم حضور:</label>
                <textarea
                  rows={2}
                  placeholder="مثلاً: شرکت در سمینار تخصصی یا دلایل شخصی..."
                  value={leaveNote}
                  onChange={(e) => setLeaveNote(e.target.value)}
                  className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-slate-500 transition-all resize-none font-medium"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-slate-800 hover:bg-slate-900 text-white text-xs font-black py-3 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  ثبت رسمی مرخصی
                </button>
                <button
                  type="button"
                  onClick={() => setLeaveStaff(null)}
                  className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: Edit Assigned Services */}
      {serviceStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl border border-slate-100 overflow-hidden text-right" dir="rtl">
            <div className="bg-gradient-to-l from-[#0284c7] to-[#0369a1] p-4 text-white flex items-center justify-between">
              <h3 className="text-sm font-black flex items-center gap-2">
                <Settings className="w-5 h-5 animate-spin-slow" />
                تغییر لاین‌ها و لاین‌های خدماتی تخصیصی به پرسنل
              </h3>
              <button
                onClick={() => setServiceStaff(null)}
                className="text-white hover:text-white/80 font-bold text-xs cursor-pointer"
              >
                بستن ×
              </button>
            </div>

            <form onSubmit={handleSaveServices} className="p-5 space-y-4">
              <div className="bg-[#0284c7]/5 p-3 rounded-xl border border-[#0284c7]/15 text-xs font-bold text-[#0284c7]">
                تغییر و تخصیص لاین‌های مجاز پذیرش نوبت برای: <strong className="text-slate-800 font-black">{serviceStaff.name}</strong> ({serviceStaff.title})
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-700">لاین‌های خدماتی فعال را علامت بزنید:</label>
                <div className="grid grid-cols-2 gap-2.5 max-h-60 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-150">
                  {bookableServices.map(service => {
                    const isChecked = serviceChecklist.includes(service.id);
                    return (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => toggleServiceInChecklist(service.id)}
                        className={`p-3 rounded-lg text-right border text-[10.5px] transition-all flex items-center justify-between gap-1.5 cursor-pointer ${
                          isChecked
                            ? "bg-[#0284c7]/5 border-[#0284c7] text-[#0284c7] font-black shadow-3xs"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span className="truncate">{service.name}</span>
                        {isChecked ? (
                          <span className="w-4 h-4 rounded-full bg-[#0284c7] text-white flex items-center justify-center text-[9px] font-black">✓</span>
                        ) : (
                          <span className="w-4 h-4 rounded-full border border-slate-300 bg-white" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-black py-3 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  ذخیره و به‌روزرسانی لاین‌ها
                </button>
                <button
                  type="button"
                  onClick={() => setServiceStaff(null)}
                  className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. AUDIT LIGHTBOX MODAL */}
      {auditLightboxUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in" dir="rtl">
          <div className="relative bg-white/5 rounded-2xl max-w-4xl w-full p-2 border border-white/10 flex flex-col items-center">
            <button
              onClick={() => setAuditLightboxUrl(null)}
              className="absolute top-4 right-4 z-50 px-3.5 py-1.5 bg-slate-900/90 text-white rounded-lg hover:bg-slate-800 text-xs font-black border border-white/15 cursor-pointer shadow-lg"
            >
              بستن تصویر ×
            </button>
            <img
              src={auditLightboxUrl}
              alt="مدارک ممیزی"
              referrerPolicy="no-referrer"
              className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}

    </div>
  );
}

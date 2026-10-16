import React, { useState, useEffect } from "react";
import { User, Post, HiringOffer, ClientRequest, LeaveRequest, JobApplication, Transaction, DiscountedSlot, ColleagueMessage } from "./types";
import { seedUsers, seedPosts } from "./data";
import CommunityFeed from "./components/CommunityFeed";
import HiringMarketplace from "./components/HiringMarketplace";
import RequestsInbox from "./components/RequestsInbox";
import Leaderboard from "./components/Leaderboard";
import UserProfile from "./components/UserProfile";
import AuthPage from "./components/AuthPage";
import AIAssistant from "./components/AIAssistant";
import DiscountServices from "./components/DiscountServices";
import FinanceDashboard from "./components/FinanceDashboard";
import StaffManagement from "./components/StaffManagement";
import MyEarnings from "./components/MyEarnings";
import ArtistHomeFeed from "./components/ArtistHomeFeed";
import { SalonDiscoveryView } from "./components/SalonDiscoveryView";
import { 
  Sparkles, Users, Award, MessageSquare, Search, Inbox, UserCircle, 
  Briefcase, Star, Settings, RefreshCw, Bell, LogOut, MapPin, Check, LogIn,
  AlertTriangle, Percent, DollarSign
} from "lucide-react";
import { toPersianDigits, formatToman } from "./utils/shamsi";
import { calculateEmployeeBalance } from "./utils/employeeBalance";

function safeLoadArray<T>(key: string, fallback: T[]): T[] {
  try {
    const saved = localStorage.getItem(key);
    if (!saved || saved === "null" || saved === "undefined") return fallback;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  // Central State for all users in memory
  const [allUsers, setAllUsers] = useState<User[]>(() => safeLoadArray("legendin_users", seedUsers));

  // Real logged-in user state. Loaded from localStorage or defaulted to null
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUserId = localStorage.getItem("legendin_logged_in_user_id");
    if (savedUserId) {
      const found = allUsers.find(u => u.id === savedUserId);
      if (found) return found;
    }
    return null; // Prompt login by default if no session is active
  });

  // Guest & Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authActionWarning, setAuthActionWarning] = useState<string | null>(null);

  const guestUser: User = {
    id: "guest",
    name: "کاربر مهمان",
    role: "client",
    phone: "",
    email: "guest@legendin.ir",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=800&auto=format&fit=crop",
    title: "مهمان لجندین",
    city: "تهران",
    bio: "در حال بررسی بازار کار زیبایی لجندین...",
    skills: [],
    certifications: [],
    portfolio: [],
    reviews: [],
    openForHiring: false,
    acceptingRequests: false
  };

  const isGuest = currentUser === null;
  const effectiveUser = currentUser || guestUser;

  const GuestViewPlaceholder = ({ title, description, icon: Icon }: { title: string, description: string, icon: any }) => (
    <div className="bg-white border border-slate-200/85 rounded-2xl p-8 md:p-12 text-center max-w-xl mx-auto my-8 space-y-6 shadow-xs animate-fade-in">
      <div className="w-16 h-16 rounded-full bg-[#0284c7]/10 text-[#0284c7] flex items-center justify-center mx-auto shadow-inner">
        <Icon className="w-8 h-8" />
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-black text-slate-800">{title}</h3>
        <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto font-bold">{description}</p>
      </div>
      <button
        onClick={() => {
          setAuthActionWarning(`برای استفاده از این بخش ابتدا باید وارد حساب خود شوید.`);
          setIsAuthModalOpen(true);
        }}
        className="bg-[#0284c7] hover:bg-[#0369a1] text-white font-black px-6 py-2.5 rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
      >
        <LogIn className="w-4 h-4" />
        ورود یا عضویت سریع
      </button>
    </div>
  );

  // Track the user whose profile is currently being inspected in the profile tab
  const [profileUser, setProfileUser] = useState<User>(() => {
    const savedUserId = localStorage.getItem("legendin_logged_in_user_id");
    if (savedUserId) {
      const found = allUsers.find(u => u.id === savedUserId);
      if (found) return found;
    }
    return allUsers.find(u => u.role === "manager") || allUsers[0];
  });

  // Navigation tab
  const [activeTab, setActiveTab] = useState<"feed" | "hiring" | "leaderboard" | "inbox" | "profile" | "assistant" | "discount" | "finance" | "staff" | "community">("feed");

  // In-memory posts state
  const [posts, setPosts] = useState<Post[]>(() => safeLoadArray("legendin_posts", seedPosts));

  // In-memory hiring offers (Manager -> Artist)
  const [hiringOffers, setHiringOffers] = useState<HiringOffer[]>(() => safeLoadArray("legendin_offers", [
    {
      id: "offer-default-1",
      managerId: "m1",
      managerName: "مریم رادمنش",
      salonName: "خانه زیبایی لجند",
      artistId: "a3",
      artistName: "غزل نیکو",
      message: "سلام غزل عزیز، کارهای دیزاین ناخن شما واقعاً بی نظیره. تمایل دارید به صورت پاره‌وقت با لاین جدید زعفرانیه ما همکاری کنید؟",
      offerAmount: "۱۰ میلیون تومان ثابت + ۴۰٪ درصد پورسانت مراجعین",
      status: "pending",
      createdAt: "1405/04/08"
    }
  ]));

  // In-memory client requests (Client -> Artist/Salon)
  const [clientRequests, setClientRequests] = useState<ClientRequest[]>(() => safeLoadArray("legendin_client_requests", [
    {
      id: "req-default-1",
      clientId: "c1",
      clientName: "الناز افشار",
      clientPhone: "۰۹۱۲۰۰۰۰۰۰۳",
      targetId: "a1",
      targetName: "سرنا ونس (موسوی)",
      targetType: "artist",
      serviceType: "بالیاژ روسی طلایی",
      preferredDate: "1405/04/14",
      preferredTime: "11:30",
      note: "موهام تا شونه‌مه و دکلره پایه ۹ داره، برای احیا و رنگساژ جدید مزاحمتون میشم.",
      status: "pending",
      createdAt: "1405/04/09"
    }
  ]));

  // In-memory transactions state (Manager -> Financial Accounting Ledger)
  const [transactions, setTransactions] = useState<Transaction[]>(() => safeLoadArray("legendin_transactions", [
    { id: "t1", salonId: "salon-1", direction: "cost", category: "اجاره سالن", amount: 45000000, date: "1405/04/01", description: "اجاره بهای ماهانه شعبه ولیعصر", createdAt: "1405/04/01" },
    { id: "t2", salonId: "salon-1", direction: "cost", category: "خرید و مایحتاج", amount: 12500000, date: "1405/04/03", description: "خرید رنگ موی لورآل و اکسیدان", createdAt: "1405/04/03" },
    { id: "t3", salonId: "salon-1", direction: "cost", category: "قبوض", amount: 2800000, date: "1405/04/05", description: "قبوض آب و برق و اینترنت", createdAt: "1405/04/05" },
    { id: "t4", salonId: "salon-1", direction: "cost", category: "حقوق پرسنل", amount: 18000000, date: "1405/04/07", description: "حقوق ثابت پرسنل پذیرش و خدمات", createdAt: "1405/04/07" }
  ]));

  // In-memory staff leave requests state
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() => safeLoadArray("legendin_leave_requests", [
    { id: "lr1", staffId: "a3", startDate: "1405/04/20", endDate: "1405/04/22", requiresApproval: false, status: "logged", note: "سفر خانوادگی" },
    { id: "lr2", staffId: "a1", startDate: "1405/04/25", endDate: "1405/04/28", requiresApproval: true, status: "pending", note: "درمان دندان‌پزشکی" }
  ]));

  // In-memory job applications state (Artists wishing to join a salon)
  const [jobApplications, setJobApplications] = useState<JobApplication[]>(() => safeLoadArray("legendin_job_applications", [
    { id: "ja1", applicantId: "a2", applicantName: "رها شایان", salonId: "salon-1", message: "سلام، من مربی بین‌المللی فیشیال پوست هستم و تمایل دارم لاین پوست سالن شما رو به صورت درصدی راه بندازم.", status: "pending", createdAt: "1405/04/10" }
  ]));

  // In-memory discounted slots for vacant slot recovery (Cancellations)
  const [discountedSlots, setDiscountedSlots] = useState<DiscountedSlot[]>(() => safeLoadArray("legendin_discounted_slots", [
    {
      id: "slot-default-1",
      originalRequestId: "req-default-1",
      artistId: "a1",
      artistName: "سرنا ونس (موسوی)",
      salonName: "سالن مجلل لجند",
      serviceType: "بالیاژ روسی طلایی",
      date: "1405/04/16",
      time: "15:00",
      originalPrice: 1500000,
      discountedPrice: 1200000,
      discountPercent: 20,
      appCommissionPercent: 20,
      status: "available",
      createdAt: "1405/04/10"
    }
  ]));

  // In-memory colleague messages (Manager <-> Manager)
  const [colleagueMessages, setColleagueMessages] = useState<ColleagueMessage[]>(() => safeLoadArray("legendin_colleague_messages", [
    {
      id: "msg-default-1",
      senderId: "m2",
      senderName: "سارا حسینی",
      senderSalonName: "عمارت زیبایی ونوس",
      receiverId: "m1",
      receiverName: "مریم رادمنش",
      receiverSalonName: "خانه زیبایی لجند",
      subject: "امکان همکاری در تامین تجهیزات کاشت ناخن روسی",
      body: "سلام مریم عزیز، امیدوارم وقتت بخیر باشه. در رابطه با لاین ناخن جدیدت در زعفرانیه، ما یک پارت عمده دستگاه‌های وارداتی یووی و ابزار استریل آلمانی با قیمت بسیار مناسب وارد کردیم. خواستم بپرسم تمایل دارید نمونه کارها رو بفرستم خدمتتون؟",
      createdAt: "1405/04/11",
      isRead: false,
      replies: [
        {
          id: "reply-1",
          senderId: "m1",
          senderName: "مریم رادمنش",
          body: "سلام سارای عزیز، بله حتماً! خوشحال میشم کاتالوگ و قیمت‌ها رو واسم بفرستی.",
          createdAt: "1405/04/11"
        }
      ]
    }
  ]));

  // LOAD DATA FROM SQL DATABASE ATTACHED TO REPO
  useEffect(() => {
    async function loadSqlData() {
      try {
        const [usersRes, postsRes, offersRes, reqsRes, txsRes, leavesRes, slotsRes] = await Promise.all([
          fetch("/api/users").then(r => r.json()),
          fetch("/api/posts").then(r => r.json()),
          fetch("/api/hiring-offers").then(r => r.json()),
          fetch("/api/client-requests").then(r => r.json()),
          fetch("/api/transactions").then(r => r.json()),
          fetch("/api/leave-requests").then(r => r.json()),
          fetch("/api/discounted-slots").then(r => r.json())
        ]);
        if (Array.isArray(usersRes) && usersRes.length > 0) setAllUsers(usersRes);
        if (Array.isArray(postsRes) && postsRes.length > 0) setPosts(postsRes);
        if (Array.isArray(offersRes)) setHiringOffers(offersRes);
        if (Array.isArray(reqsRes)) setClientRequests(reqsRes);
        if (Array.isArray(txsRes)) setTransactions(txsRes);
        if (Array.isArray(leavesRes)) setLeaveRequests(leavesRes);
        if (Array.isArray(slotsRes)) setDiscountedSlots(slotsRes);
      } catch (err) {
        console.error("Failed to load SQL database data:", err);
      }
    }
    loadSqlData();
  }, []);

  // PERSIST STATE TO LOCALSTORAGE
  useEffect(() => {
    localStorage.setItem("legendin_colleague_messages", JSON.stringify(colleagueMessages));
  }, [colleagueMessages]);

  useEffect(() => {
    localStorage.setItem("legendin_users", JSON.stringify(allUsers));
  }, [allUsers]);

  useEffect(() => {
    localStorage.setItem("legendin_posts", JSON.stringify(posts));
  }, [posts]);

  useEffect(() => {
    localStorage.setItem("legendin_offers", JSON.stringify(hiringOffers));
  }, [hiringOffers]);

  useEffect(() => {
    localStorage.setItem("legendin_client_requests", JSON.stringify(clientRequests));
  }, [clientRequests]);

  useEffect(() => {
    localStorage.setItem("legendin_transactions", JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem("legendin_leave_requests", JSON.stringify(leaveRequests));
  }, [leaveRequests]);

  useEffect(() => {
    localStorage.setItem("legendin_job_applications", JSON.stringify(jobApplications));
  }, [jobApplications]);

  useEffect(() => {
    localStorage.setItem("legendin_discounted_slots", JSON.stringify(discountedSlots));
  }, [discountedSlots]);

  // Synchronize when the currentUser gets edited (e.g. updating profile details)
  const handleUpdateCurrentUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    setProfileUser(updatedUser);
    const updatedUsersList = allUsers.map(u => u.id === updatedUser.id ? updatedUser : u);
    setAllUsers(updatedUsersList);
  };

  const handleUpdateUsersList = (updatedList: User[]) => {
    setAllUsers(updatedList);
    if (currentUser) {
      const freshCurrentUser = updatedList.find(u => u.id === currentUser.id);
      if (freshCurrentUser) {
        setCurrentUser(freshCurrentUser);
      }
    }
    const freshProfileUser = updatedList.find(u => u.id === profileUser.id);
    if (freshProfileUser) {
      setProfileUser(freshProfileUser);
    }
  };

  // Helper to count pending inbox messages for badge notifications
  const getPendingInboxCount = () => {
    if (!currentUser) return 0;
    if (currentUser.role === "manager") {
      return (clientRequests || []).filter(
        r => r.targetType === "salon" && r.status === "pending"
      ).length;
    } else if (currentUser.role === "artist") {
      const incomingOffers = (hiringOffers || []).filter(o => o.artistId === currentUser.id && o.status === "pending").length;
      const incomingRequests = (clientRequests || []).filter(r => r.targetId === currentUser.id && r.targetType === "artist" && r.status === "pending").length;
      return incomingOffers + incomingRequests;
    } else {
      // Clients don't have incoming pending, but we can show their total requests
      return (clientRequests || []).filter(r => r.clientId === currentUser.id).length;
    }
  };

  const pendingCount = getPendingInboxCount();

  // Artist specific sidebar stats calculation
  const artistBalance = React.useMemo(() => {
    if (currentUser?.role === "artist") {
      return calculateEmployeeBalance(currentUser, transactions);
    }
    return null;
  }, [currentUser, transactions]);

  // LOGIN & REGISTER HANDLERS
  const getDefaultTabForRole = (role: string): any => {
    if (role === "artist") return "inbox"; // بوکینگ و نوبت‌های من — an artist's main job is servicing, not reading posts
    return "feed"; // client and manager behavior is unchanged
  };

  const handleLoginSuccess = (user: User) => {
    localStorage.setItem("legendin_logged_in_user_id", user.id);
    setCurrentUser(user);
    setProfileUser(user);
    setActiveTab(getDefaultTabForRole(user.role));
  };

  const handleRegisterSuccess = (updatedUsersList: User[], loggedInUser: User) => {
    setAllUsers(updatedUsersList);
    localStorage.setItem("legendin_logged_in_user_id", loggedInUser.id);
    setCurrentUser(loggedInUser);
    setProfileUser(loggedInUser);
    setActiveTab(getDefaultTabForRole(loggedInUser.role));
  };

  // State for beautiful, iframe-safe custom confirmation modal
  const [appConfirm, setAppConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
  } | null>(null);

  const handleLogout = () => {
    setAppConfirm({
      isOpen: true,
      title: "خروج از حساب کاربری",
      message: "آیا برای خروج از حساب کاربری خود در لجندین مطمئن هستید؟",
      onConfirm: () => {
        localStorage.removeItem("legendin_logged_in_user_id");
        setCurrentUser(null);
        setAppConfirm(null);
      },
      confirmText: "خروج از حساب",
      cancelText: "انصراف",
      isDanger: true
    });
  };

  // RESET ALL SIMULATION DATA TO ORIGINAL SEED STATES
  const handleResetData = () => {
    setAppConfirm({
      isOpen: true,
      title: "بازنشانی اطلاعات برنامه",
      message: "آیا تمایل دارید تمام وضعیت‌ها و فعالیت‌های ذخیره شده را پاک کرده و برنامه را به حالت اولیه بازگردانید؟ این کار اطلاعات محلی شما را بازنشانی می‌کند.",
      onConfirm: () => {
        localStorage.removeItem("legendin_users");
        localStorage.removeItem("legendin_logged_in_user_id");
        localStorage.removeItem("legendin_posts");
        localStorage.removeItem("legendin_offers");
        localStorage.removeItem("legendin_client_requests");
        localStorage.removeItem("legendin_transactions");
        localStorage.removeItem("legendin_leave_requests");
        localStorage.removeItem("legendin_job_applications");
        window.location.reload();
      },
      confirmText: "بله، پاکسازی کامل",
      cancelText: "انصراف",
      isDanger: true
    });
  };

  // 1. HEADER & GUEST REDIRECTS FOR GUEST USER STATE - RENDER RESPONSIVE INTERFACE DIRECTLY
  return (
    <div className="min-h-screen bg-[#F7F5F0] flex flex-col font-sans selection:bg-[#0284c7]/25 text-slate-800 antialiased text-right" dir="rtl">
      
      {/* ========================================================= */}
      {/* RESPONSIVE HEADER (Unified Desktop & Mobile Header) */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3.5 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          
          {/* Right section: Branding & Logo */}
          <div 
            onClick={() => {
              if (isGuest) {
                setActiveTab("feed");
              } else if (currentUser) {
                setActiveTab(getDefaultTabForRole(currentUser.role));
              }
            }}
            className="flex items-center gap-3 cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all"
            title="بازگشت به صفحه اصلی"
          >
            <div className="w-9 h-9 rounded-xl bg-[#0284c7] flex items-center justify-center shadow-md">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                لجندین <span className="text-[#0284c7] text-[9.5px] bg-[#0284c7]/10 px-2 py-0.5 rounded-md font-extrabold">شبکه بازار کار زیبایی</span>
              </h1>
              <p className="text-[9px] text-slate-400 font-bold hidden sm:block mt-0.5">بزرگترین مجتمع فوق‌تخصصی اشتراک رزومه و استخدام آرتیست‌های زیبایی</p>
            </div>
          </div>

          {/* Left section: Logged-in User Profile / Guest login & Log out */}
          <div className="flex items-center gap-3">
            
            {/* Quick Reset Data Button (Helper for reviewers) - restricted to Super Admin only */}
            {currentUser?.email === "fair.blizz@gmail.com" && (
              <button
                onClick={handleResetData}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer text-xs flex items-center gap-1 animate-pulse border border-[#0284c7]/25 bg-[#0284c7]/5"
                title="پاکسازی و بازنشانی به داده‌های اولیه (ویژه مدیر کل)"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#0284c7]" />
                <span className="hidden md:inline text-[9px] font-bold text-[#0284c7]">بازنشانی دیتابیس (مدیر کل)</span>
              </button>
            )}

            {isGuest ? (
              <button
                onClick={() => {
                  setAuthActionWarning(null);
                  setIsAuthModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-black shadow-md transition-all cursor-pointer active:scale-95"
              >
                <LogIn className="w-4 h-4" />
                <span>ورود / عضویت</span>
              </button>
            ) : (
              <>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/60 rounded-xl p-1 px-2.5">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    onClick={() => {
                      setProfileUser(currentUser);
                      setActiveTab("profile");
                    }}
                    className="w-7 h-7 rounded-full object-cover border border-slate-200 cursor-pointer active:scale-95 transition-transform"
                  />
                  <div className="text-right hidden sm:block">
                    <h4 className="text-[10.5px] font-black text-slate-800 leading-tight">{currentUser.name}</h4>
                    <p className="text-[8.5px] text-[#0284c7] font-bold">
                      {currentUser.role === "manager" ? "مدیر سالن" : currentUser.role === "artist" ? "آرتیست زیبایی" : "مشتری عادی"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-150 bg-rose-50/50 hover:bg-rose-550/10 hover:border-rose-300 text-rose-700 text-[10.5px] font-black transition-all cursor-pointer active:scale-95"
                  title="خروج از حساب کاربری"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">خروج</span>
                </button>
              </>
            )}
          </div>

        </div>
      </header>

      {/* ========================================================= */}
      {/* DESKTOP NAVIGATION BAR (Hidden on Mobile) */}
      {/* ========================================================= */}
      {!isGuest && (
        <nav className="hidden lg:block bg-white border-b border-slate-200 py-1 shadow-2xs">
          <div className="max-w-4xl mx-auto flex items-center justify-center gap-1 px-4">
            {currentUser?.role === "artist" ? (
              <>
                <button
                  onClick={() => setActiveTab("inbox")}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap relative cursor-pointer ${
                    activeTab === "inbox"
                      ? "bg-[#0284c7]/10 text-[#0284c7]"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Inbox className="w-4 h-4" />
                  رزرو و نوبت‌های من
                  {pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[8.5px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-bold">
                      {toPersianDigits(pendingCount)}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab("finance")}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === "finance"
                      ? "bg-[#0284c7]/10 text-[#0284c7]"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <DollarSign className="w-4 h-4 text-[#0284c7]" />
                  حسابداری من
                </button>

                <button
                  onClick={() => setActiveTab("discount")}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap relative cursor-pointer ${
                    activeTab === "discount"
                      ? "bg-[#0284c7]/10 text-[#0284c7]"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Percent className="w-4 h-4 text-[#0284c7]" />
                  خدمات تخفیف‌دار
                </button>

                <button
                  onClick={() => setActiveTab("feed")}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === "feed"
                      ? "bg-[#0284c7]/10 text-[#0284c7]"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  انجمن و برترین‌ها
                </button>

                <button
                  onClick={() => setActiveTab("assistant")}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === "assistant"
                      ? "bg-[#0284c7]/10 text-[#0284c7]"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-[#0284c7]" />
                  دستیار هوشمند
                </button>

                <button
                  onClick={() => {
                    setProfileUser(currentUser!);
                    setActiveTab("profile");
                  }}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === "profile" && profileUser.id === effectiveUser.id
                      ? "bg-[#0284c7]/10 text-[#0284c7]"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <UserCircle className="w-4 h-4" />
                  پروفایل من
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setActiveTab("feed")}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === "feed"
                      ? "bg-[#0284c7]/10 text-[#0284c7]"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  {currentUser?.role === "client" ? "سالن‌ها و آرتیست‌ها (Home)" : "انجمن زیبایی (Home)"}
                </button>

                {(currentUser?.role !== "client" || currentUser?.isVip) && (
                  <button
                    onClick={() => setActiveTab("hiring")}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      activeTab === "hiring"
                        ? "bg-[#0284c7]/10 text-[#0284c7]"
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <Search className="w-4 h-4" />
                    دایرکتوری استخدام آرتیست‌ها
                  </button>
                )}

                {currentUser?.role === "client" ? (
                  <button
                    onClick={() => setActiveTab("community")}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      activeTab === "community"
                        ? "bg-[#0284c7]/10 text-[#0284c7]"
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    انجمن گفتگو (Forum)
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveTab("leaderboard")}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      activeTab === "leaderboard"
                        ? "bg-[#0284c7]/10 text-[#0284c7]"
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <Award className="w-4 h-4" />
                    برترین‌های هفته
                  </button>
                )}

                <button
                  onClick={() => setActiveTab("assistant")}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === "assistant"
                      ? "bg-[#0284c7]/10 text-[#0284c7]"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-[#0284c7]" />
                  دستیار هوشمند لجندین
                </button>

                {(currentUser?.role !== "client" || currentUser?.isLoyalClient || currentUser?.isVip) && (
                  <button
                    onClick={() => setActiveTab("inbox")}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap relative cursor-pointer ${
                      activeTab === "inbox"
                        ? "bg-[#0284c7]/10 text-[#0284c7]"
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <Inbox className="w-4 h-4" />
                    صندوق درخواست‌ها
                    {pendingCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[8.5px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-bold">
                        {toPersianDigits(pendingCount)}
                      </span>
                    )}
                  </button>
                )}

                <button
                  onClick={() => setActiveTab("discount")}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap relative cursor-pointer ${
                    activeTab === "discount"
                      ? "bg-[#0284c7]/10 text-[#0284c7]"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Percent className="w-4 h-4 text-[#0284c7]" />
                  خدمات تخفیف‌دار (Discount)
                </button>

                {currentUser?.role === "manager" && (
                  <button
                    onClick={() => setActiveTab("staff")}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      activeTab === "staff"
                        ? "bg-[#0284c7]/10 text-[#0284c7]"
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <Users className="w-4 h-4 text-[#0284c7]" />
                    مدیریت پرسنل (Staff)
                  </button>
                )}

                {currentUser?.role === "manager" && (
                  <button
                    onClick={() => setActiveTab("finance")}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      activeTab === "finance"
                        ? "bg-[#0284c7]/10 text-[#0284c7]"
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <DollarSign className="w-4 h-4 text-[#0284c7]" />
                    بخش مالی (حسابداری)
                  </button>
                )}

                <button
                  onClick={() => {
                    if (isGuest) {
                      setProfileUser(guestUser);
                      setActiveTab("profile");
                    } else {
                      setProfileUser(currentUser!);
                      setActiveTab("profile");
                    }
                  }}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === "profile" && profileUser.id === effectiveUser.id
                      ? "bg-[#0284c7]/10 text-[#0284c7]"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <UserCircle className="w-4 h-4" />
                  رزومه و پروفایل من
                </button>
              </>
            )}
          </div>
        </nav>
      )}

      {/* ========================================================= */}
      {/* MAIN LAYOUT WRAPPER */}
      {/* ========================================================= */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 pt-6 pb-24 lg:pb-12">
        
        {/* Beautiful Promo/Advertising Hero Banner for Guest Users on the Feed Tab */}
        {activeTab === "feed" && isGuest && (
          <div className="mb-5 relative overflow-hidden bg-gradient-to-br from-[#2D3321] via-[#1E2314] to-slate-950 border border-slate-800 rounded-2xl p-4 md:p-5 text-white shadow-lg flex items-center justify-between gap-4 animate-fade-in">
            {/* Background absolute decor circles */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#0284c7]/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-60 h-60 bg-[#a1b878]/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="space-y-2 relative z-10 w-full text-right" dir="rtl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#0284c7]/30 text-[#b5cb8c] border border-[#0284c7]/40 rounded-full text-[8.5px] font-black tracking-wider animate-pulse">
                  <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                  جامعه فوق‌تخصصی لجندین
                </span>
                <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">• پلتفرم تخصصی صنعت زیبایی کشور</span>
              </div>
              
              <h2 className="text-xs md:text-sm font-black text-white leading-tight tracking-tight">
                آینده شغلی خود در صنعت زیبایی را با <span className="text-[#a1b878]">لجندین</span> رقم بزنید!
              </h2>
              
              <p className="text-[10px] md:text-[11px] text-slate-300 leading-relaxed font-medium">
                بزرگترین جامعه آرتیست‌ها و سالن‌های زیبایی. رزومه هوشمند آنلاین بسازید، نمونه‌کارهای خود را متمایز کنید و بدون دغدغه قراردادهای استخدام و تسویه حساب را ثبت کنید.
              </p>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-4 gap-6">
          
          {/* SIDEBAR: Personal Card info (Desktop Only) */}
          <aside className="lg:col-span-1 space-y-5 text-right hidden lg:block">
            
            {isGuest ? (
              <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200/80 rounded-2xl p-5 shadow-xs text-center space-y-4">
                <div className="w-12 h-12 rounded-xl bg-[#0284c7]/10 flex items-center justify-center mx-auto text-[#0284c7]">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-black text-slate-800">خوش آمدید به لجندین</h3>
                  <p className="text-[9.5px] text-[#0284c7] font-extrabold leading-normal">شبکه اشتراک رزومه و استخدام آرتیست‌های زیبایی</p>
                </div>
                <p className="text-[10px] text-slate-500 font-bold leading-relaxed">برای ثبت پیشنهادهای کاریابی، ثبت نوبت و انتشار رزومه شخصی به ما بپیوندید.</p>
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="w-full py-2.5 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-[11px] font-black shadow-md transition-all cursor-pointer active:scale-95"
                >
                  ورود / عضویت سریع
                </button>
              </div>
            ) : (
              /* Short Profile Widget */
              <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
                <div className="h-16 bg-[#0284c7]/20 relative">
                  {currentUser && currentUser.coverImage && (
                    <img src={currentUser.coverImage} alt="Cover" className="w-full h-full object-cover opacity-30" />
                  )}
                </div>
                
                <div className="p-4 relative flex flex-col items-center text-center">
                  <img
                    src={currentUser?.avatar}
                    alt={currentUser?.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm -mt-10 mb-2.5 cursor-pointer hover:opacity-90"
                    onClick={() => {
                      if (currentUser) {
                        setProfileUser(currentUser);
                        setActiveTab("profile");
                      }
                    }}
                  />
                  
                  <h3 className="text-sm font-black text-slate-900 hover:text-[#0284c7] cursor-pointer" onClick={() => {
                    if (currentUser) {
                      setProfileUser(currentUser);
                      setActiveTab("profile");
                    }
                  }}>{currentUser?.name}</h3>
                  <p className="text-[9.5px] text-slate-400 font-bold mt-0.5">{currentUser?.title}</p>
                  <p className="text-[10px] text-slate-500 mt-1 flex items-center justify-center gap-1 font-bold">
                    <MapPin className="w-3 h-3 text-[#0284c7]" />
                    {currentUser?.city}
                  </p>

                  <div className="w-full border-t border-slate-100 mt-4 pt-3.5 space-y-2 text-right text-xs">
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                      <span>درخواست‌های معلق:</span>
                      <span className="text-[#0284c7]">{toPersianDigits(pendingCount)} مورد</span>
                    </div>
                    
                    {currentUser && currentUser.role === "artist" && artistBalance ? (
                      <>
                        <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                          <span>امتیاز رضایت مشتری:</span>
                          <span className="text-amber-600 flex items-center gap-0.5 font-bold">
                            <Star className="w-3 h-3 fill-amber-400 stroke-amber-400" />
                            {toPersianDigits(currentUser.rating || 5)} از ۵
                          </span>
                        </div>
                        
                        <div className="border-t border-dashed border-slate-100 my-2 pt-2 space-y-1.5">
                          <div className="flex justify-between items-center text-[9.5px] font-bold">
                            <span className="text-slate-400">کل کارکرد من:</span>
                            <span className="text-slate-700">{toPersianDigits(artistBalance.totalGeneratedIncome.toLocaleString())} ت</span>
                          </div>
                          <div className="flex justify-between items-center text-[9.5px] font-bold">
                            <span className="text-slate-400">دریافتی کل:</span>
                            <span className="text-slate-700">{toPersianDigits(artistBalance.totalPaidOut.toLocaleString())} ت</span>
                          </div>
                          <div className="flex justify-between items-center text-[9.5px] font-black">
                            <span className="text-slate-400">مانده معین من:</span>
                            <span className={artistBalance.netBalance > 0 ? "text-emerald-600 font-black" : artistBalance.netBalance < 0 ? "text-rose-500 font-black" : "text-slate-500 font-black"}>
                              {artistBalance.netBalance > 0 
                                ? `بستانکار: ${formatToman(artistBalance.netBalance)}` 
                                : artistBalance.netBalance < 0 
                                ? `بدهکار: ${formatToman(Math.abs(artistBalance.netBalance))}` 
                                : "۰ ت"}
                            </span>
                          </div>
                        </div>
                      </>
                    ) : currentUser && currentUser.role === "artist" && currentUser.rating && (
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                        <span>امتیاز رضایت مشتری:</span>
                        <span className="text-amber-600 flex items-center gap-0.5 font-bold">
                          <Star className="w-3 h-3 fill-amber-400 stroke-amber-400" />
                          {toPersianDigits(currentUser.rating)} از ۵
                        </span>
                      </div>
                    )}

                    {currentUser && currentUser.role === "manager" && currentUser.salonName && (
                      <div className="bg-slate-50 rounded-lg p-2 mt-2 border border-slate-100">
                        <p className="text-[8.5px] text-[#0284c7] font-black">مدیر فنی مجموعه:</p>
                        <p className="text-[9.5px] text-slate-700 font-bold truncate mt-0.5">{currentUser.salonName}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* AI Assistant Promo Sidebar Card */}
            <div className="bg-gradient-to-br from-emerald-500/5 via-white to-slate-50/50 border border-[#0284c7]/20 rounded-2xl p-4.5 shadow-xs text-right space-y-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-[#0284c7]/10 rounded-lg text-[#0284c7]">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                </span>
                <span className="text-[10.5px] font-black text-[#0369a1]">دستیار هوشمند لجندین</span>
              </div>
              <p className="text-[9.5px] text-slate-500 leading-relaxed font-semibold">
                {currentUser?.role === "manager" 
                  ? "تحلیل خودکار نوبت‌ها، لود کاری آرتیست‌ها و برآورد زنده سود مالی کل سالن!"
                  : "به دنبال مدل خاص ناخن زیر ۲ میلیون تومان هستید؟ بهترین آرتیست‌ها و ترندها را بیابید!"}
              </p>
              <button
                onClick={() => setActiveTab("assistant")}
                className="w-full py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white text-[9.5px] font-black rounded-lg transition-all active:scale-95 cursor-pointer shadow-3xs"
              >
                شروع گفتگو با مشاور AI ⚡
              </button>
            </div>

            {/* Quick Community Stats Widget */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-xs space-y-3.5">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">جامعه آماری بازار کار</h4>
              
              <div className="space-y-2.5 text-xs text-slate-600 font-bold">
                <div className="flex justify-between">
                  <span>آرتیست‌های عضو:</span>
                  <span className="text-slate-900">{toPersianDigits((allUsers || []).filter(u => u.role === "artist").length)} نفر</span>
                </div>
                <div className="flex justify-between">
                  <span>مدیران سالن‌ها:</span>
                  <span className="text-slate-900">{toPersianDigits((allUsers || []).filter(u => u.role === "manager").length)} نفر</span>
                </div>
                <div className="flex justify-between">
                  <span>کل پست‌های انجمن زیبایی:</span>
                  <span className="text-slate-900">{toPersianDigits((posts || []).length)} پست</span>
                </div>
              </div>
            </div>
          </aside>

          {/* MAIN TAB CONTENT AREA */}
          <section className="lg:col-span-3 space-y-6">
            {activeTab === "feed" && (
              currentUser?.role === "artist" ? (
                <ArtistHomeFeed
                  currentUser={effectiveUser}
                  posts={posts}
                  onUpdatePosts={setPosts}
                  allUsers={allUsers}
                  onSelectUser={(user) => {
                    setProfileUser(user);
                    setActiveTab("profile");
                  }}
                  colleagueMessages={colleagueMessages}
                  onUpdateColleagueMessages={setColleagueMessages}
                  onChangeTab={setActiveTab}
                />
              ) : currentUser?.role === "client" ? (
                <SalonDiscoveryView
                  currentUser={effectiveUser}
                  allUsers={allUsers}
                  onSelectSalon={(salonManager) => {
                    setProfileUser(salonManager);
                    setActiveTab("profile");
                  }}
                />
              ) : (
                <CommunityFeed
                  currentUser={effectiveUser}
                  posts={posts}
                  onUpdatePosts={setPosts}
                  allUsers={allUsers}
                  onSelectUser={(user) => {
                    setProfileUser(user);
                    setActiveTab("profile");
                  }}
                  colleagueMessages={colleagueMessages}
                  onUpdateColleagueMessages={setColleagueMessages}
                />
              )
            )}

            {activeTab === "community" && (
              <CommunityFeed
                currentUser={effectiveUser}
                posts={posts}
                onUpdatePosts={setPosts}
                allUsers={allUsers}
                onSelectUser={(user) => {
                  setProfileUser(user);
                  setActiveTab("profile");
                }}
                colleagueMessages={colleagueMessages}
                onUpdateColleagueMessages={setColleagueMessages}
              />
            )}

            {activeTab === "hiring" && (
              currentUser?.role === "client" && !currentUser?.isVip ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center max-w-xl mx-auto my-8 space-y-6 shadow-sm animate-fade-in">
                  <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-inner border border-amber-200">
                    <Award className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-base font-black text-slate-900">بخش استخدام و فرصت‌های شغلی</h3>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium max-w-md mx-auto">
                      تب «بازار استخدام و فرصت‌ها» برای مشتریان عادی غیرفعال و مخفی است. این بخش اکنون مختص آرتیست‌ها، مدیران سالن و مشتریان دارای اشتراک ویژه VIP است.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                    <button
                      onClick={() => {
                        if (currentUser) {
                          handleUpdateCurrentUser({ ...currentUser, isVip: true });
                          alert("تبریک! حساب شما به سطح VIP ارتقا یافت و دسترسی به بخش استخدام فعال شد! ✨");
                        }
                      }}
                      className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black px-6 py-3 rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-4 h-4" />
                      خرید اشتراک ماهانه VIP و فعال‌سازی
                    </button>
                    <button
                      onClick={() => setActiveTab("leaderboard")}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-6 py-3 rounded-xl text-xs transition-all cursor-pointer"
                    >
                      کاوش آرتیست‌ها و رزرو نوبت
                    </button>
                  </div>
                </div>
              ) : (
                <HiringMarketplace
                  currentUser={effectiveUser}
                  allUsers={allUsers}
                  onUpdateUsers={handleUpdateUsersList}
                  hiringOffers={hiringOffers}
                  onAddHiringOffer={(newOffer) => setHiringOffers([newOffer, ...hiringOffers])}
                  clientRequests={clientRequests}
                  onAddClientRequest={(newReq) => setClientRequests([newReq, ...clientRequests])}
                  onAddJobApplication={(newApp) => setJobApplications([newApp, ...jobApplications])}
                />
              )
            )}

            {activeTab === "leaderboard" && (
              <Leaderboard
                allUsers={allUsers}
                onSelectArtist={(artist) => {
                  setProfileUser(artist);
                  setActiveTab("profile");
                }}
                onChangeTab={(tab) => setActiveTab(tab as any)}
              />
            )}

            {activeTab === "assistant" && (
              currentUser?.role === "client" && !currentUser?.isVip ? (
                <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-[#1e2418] border border-amber-500/30 rounded-3xl p-10 text-center max-w-xl mx-auto my-8 space-y-6 shadow-xl animate-fade-in text-white">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center mx-auto shadow-lg">
                    <Sparkles className="w-8 h-8 animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <span className="bg-amber-400/10 text-amber-300 border border-amber-400/30 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                      پرمیوم لجندین (VIP Only)
                    </span>
                    <h3 className="text-base font-black text-white mt-2">محدودسازی مشاور هوشمند (AI Agent)</h3>
                    <p className="text-xs text-slate-300 leading-relaxed font-medium max-w-md mx-auto">
                      دسترسی به مشاور هوشمند AI برای مشتریان عادی قفل شده و مختص اعضای VIP و مدیران/آرتیست‌ها است. برای دریافت تحلیل چهره، پیشنهاد استایل مو و مشاوره تخصصی زیبایی، حساب خود را ارتقا دهید.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (currentUser) {
                        handleUpdateCurrentUser({ ...currentUser, isVip: true });
                        alert("تبریک! حساب کاربری شما به سطح VIP ارتقا یافت و دسترسی به مشاور هوشمند AI بلافاصله باز شد! ✨");
                      }
                    }}
                    className="w-full sm:w-auto bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black px-8 py-3.5 rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 mx-auto"
                  >
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    خرید اشتراک ماهانه VIP (ارتقای فوری)
                  </button>
                </div>
              ) : (
                <AIAssistant
                  currentUser={effectiveUser}
                  allUsers={allUsers}
                  clientRequests={clientRequests}
                />
              )
            )}

            {activeTab === "inbox" && (
              isGuest ? (
                <GuestViewPlaceholder 
                  title="صندوق درخواست‌ها و پیام‌ها" 
                  description="برای ارسال پیام، مدیریت درخواست‌های نوبت‌دهی سالن و پیشنهادهای کاریابی، لطفاً ابتدا وارد حساب کاربری خود شوید."
                  icon={Inbox}
                />
              ) : currentUser?.role === "client" && !currentUser?.isLoyalClient && !currentUser?.isVip ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center max-w-xl mx-auto my-8 space-y-6 shadow-sm animate-fade-in">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner border border-emerald-200">
                    <Inbox className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-base font-black text-slate-900">صندوق پیام‌ها و درخواست‌ها قفل است</h3>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium max-w-md mx-auto">
                      سیستم وفاداری مشتری: به محض اینکه توسط یک آرتیست یا مدیر سالن به عنوان «مشتری وفادار» علامت‌گذاری شوید، این بخش برای شما فعال و باز خواهد شد. همچنین اعضای VIP همیشه به این بخش دسترسی دارند.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (currentUser) {
                        handleUpdateCurrentUser({ ...currentUser, isVip: true });
                        alert("تبریک! حساب کاربری شما به سطح VIP ارتقا یافت و دسترسی به صندوق پیام‌ها فعال شد! ✨");
                      }
                    }}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-6 py-3 rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
                  >
                    <Sparkles className="w-4 h-4" />
                    ارتقا به VIP جهت بازگشایی فوری
                  </button>
                </div>
              ) : (
                <RequestsInbox
                  currentUser={effectiveUser}
                  hiringOffers={hiringOffers}
                  onUpdateHiringOffers={setHiringOffers}
                  clientRequests={clientRequests}
                  onUpdateClientRequests={setClientRequests}
                  leaveRequests={leaveRequests}
                  onUpdateLeaveRequests={setLeaveRequests}
                  jobApplications={jobApplications}
                  onUpdateJobApplications={setJobApplications}
                  allUsers={allUsers}
                  onUpdateUsersList={handleUpdateUsersList}
                  onAddDiscountedSlot={(newSlot) => setDiscountedSlots([newSlot, ...discountedSlots])}
                  colleagueMessages={colleagueMessages}
                  onUpdateColleagueMessages={setColleagueMessages}
                />
              )
            )}

            {activeTab === "discount" && (
              <DiscountServices
                slots={discountedSlots}
                artists={(allUsers || []).filter(u => u.role === "artist")}
                currentUserId={effectiveUser.id}
                onSelectArtist={(artist) => {
                  setProfileUser(artist);
                  setActiveTab("profile");
                }}
                triggerToast={(msg) => alert(msg)}
                onClaim={(slotId) => {
                  const targetSlot = discountedSlots.find(s => s.id === slotId);
                  if (!targetSlot) return;

                  // Update slot status to claimed
                  setDiscountedSlots(prev => prev.map(s => s.id === slotId ? { ...s, status: "claimed", claimedByClientId: effectiveUser.id } : s));

                  // Create new request
                  const newRequest: ClientRequest = {
                    id: `req-discount-${Date.now()}`,
                    clientId: effectiveUser.id,
                    clientName: effectiveUser.name,
                    clientPhone: effectiveUser.phone,
                    targetId: targetSlot.artistId,
                    targetName: targetSlot.artistName,
                    targetType: "artist",
                    serviceType: targetSlot.serviceType,
                    preferredDate: targetSlot.date,
                    preferredTime: targetSlot.time,
                    note: "این نوبت از بخش خدمات تخفیف‌دار رزرو شده است.",
                    status: "pending",
                    createdAt: "1405/04/10",
                    price: targetSlot.discountedPrice
                  };

                  setClientRequests(prev => [newRequest, ...prev]);
                  alert("درخواست رزرو نوبت تخفیف‌دار با موفقیت ثبت شد و برای تایید به متخصص مربوطه ارسال گردید.");
                }}
              />
            )}

            {activeTab === "profile" && (
              (isGuest && profileUser.id === "guest") ? (
                <GuestViewPlaceholder 
                  title="رزومه و پروفایل من" 
                  description="جهت ایجاد رزومه حرفه‌ای، ثبت مهارت‌ها، درج گواهی‌نامه‌ها و دریافت پیشنهادات استخدامی ابتدا باید حساب کاربری بسازید."
                  icon={UserCircle}
                />
              ) : (
                <UserProfile
                  currentUser={effectiveUser}
                  profileUser={profileUser}
                  onUpdateCurrentUser={handleUpdateCurrentUser}
                  onUpdateUsersList={handleUpdateUsersList}
                  allUsers={allUsers}
                  posts={posts}
                  onUpdatePosts={setPosts}
                  transactions={transactions}
                  onUpdateTransactions={setTransactions}
                  hiringOffers={hiringOffers}
                  onUpdateHiringOffers={setHiringOffers}
                  clientRequests={clientRequests}
                  onUpdateClientRequests={setClientRequests}
                  leaveRequests={leaveRequests}
                  onUpdateLeaveRequests={setLeaveRequests}
                  jobApplications={jobApplications}
                  onUpdateJobApplications={setJobApplications}
                  onAddDiscountedSlot={(newSlot) => setDiscountedSlots([newSlot, ...discountedSlots])}
                  onSelectUser={(user) => {
                    setProfileUser(user);
                    setActiveTab("profile");
                  }}
                />
              )
            )}

            {activeTab === "staff" && (
              currentUser?.role === "manager" ? (
                <StaffManagement
                  currentUser={effectiveUser}
                  allUsers={allUsers}
                  onUpdateUsers={handleUpdateUsersList}
                  transactions={transactions}
                  onUpdateTransactions={setTransactions}
                  leaveRequests={leaveRequests}
                  onUpdateLeaveRequests={setLeaveRequests}
                  clientRequests={clientRequests}
                />
              ) : (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                  <p className="text-sm font-bold text-slate-500">شما دسترسی به این بخش را ندارید.</p>
                </div>
              )
            )}

            {activeTab === "finance" && (
              currentUser?.role === "manager" ? (
                <FinanceDashboard
                  salonId="salon-1"
                  transactions={transactions}
                  onUpdateTransactions={setTransactions}
                  allUsers={allUsers}
                />
              ) : currentUser?.role === "artist" ? (
                <MyEarnings
                  currentUser={currentUser}
                  transactions={transactions}
                  onUpdateTransactions={setTransactions}
                />
              ) : (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                  <p className="text-sm font-bold text-slate-500">شما دسترسی به بخش حسابداری سالن را ندارید.</p>
                </div>
              )
            )}
          </section>

        </div>
      </main>

      {/* ========================================================= */}
      {/* MOBILE BOTTOM NAVIGATION TAB BAR (Visible only on Mobile) */}
      {/* ========================================================= */}
      {!isGuest && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1.5 flex items-center justify-around shadow-lg">
          {currentUser?.role === "artist" ? (
            <>
              {/* 1. Inbox (رزرو و نوبت‌های من) */}
              <button
                onClick={() => setActiveTab("inbox")}
                className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all relative cursor-pointer ${
                  activeTab === "inbox" ? "text-[#0284c7] font-black scale-105" : "text-slate-400 hover:text-slate-700"
                }`}
              >
                <Inbox className="w-5 h-5" />
                <span className="text-[8px] font-black">نوبت‌ها</span>
                {pendingCount > 0 && (
                  <span className="absolute top-0.5 right-2 bg-rose-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {toPersianDigits(pendingCount)}
                  </span>
                )}
              </button>

              {/* 2. My Earnings (حسابداری من) */}
              <button
                onClick={() => setActiveTab("finance")}
                className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all relative cursor-pointer ${
                  activeTab === "finance" ? "text-[#0284c7] font-black scale-105" : "text-slate-400 hover:text-slate-700"
                }`}
              >
                <DollarSign className="w-5 h-5 text-[#0284c7]" />
                <span className="text-[8px] font-black">حسابداری</span>
              </button>

              {/* 3. Discount (خدمات تخفیف‌دار) */}
              <button
                onClick={() => setActiveTab("discount")}
                className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all relative cursor-pointer ${
                  activeTab === "discount" ? "text-[#0284c7] font-black scale-105" : "text-slate-400 hover:text-slate-700"
                }`}
              >
                <Percent className="w-5 h-5" />
                <span className="text-[8px] font-black">تخفیف</span>
              </button>

              {/* 4. Home Feed (انجمن و برترین‌ها) */}
              <button
                onClick={() => setActiveTab("feed")}
                className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer ${
                  activeTab === "feed" ? "text-[#0284c7] font-black scale-105" : "text-slate-400 hover:text-slate-700"
                }`}
              >
                <MessageSquare className="w-5 h-5" />
                <span className="text-[8px] font-black">انجمن</span>
              </button>

              {/* 5. AI Assistant (دستیار هوشمند) */}
              <button
                onClick={() => setActiveTab("assistant")}
                className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer ${
                  activeTab === "assistant" ? "text-[#0284c7] font-black scale-105" : "text-slate-400 hover:text-slate-700"
                }`}
              >
                <Sparkles className="w-5 h-5 text-[#0284c7]" />
                <span className="text-[8px] font-black">دستیار</span>
              </button>

              {/* 6. Profile (پروفایل من) */}
              <button
                onClick={() => {
                  setProfileUser(currentUser!);
                  setActiveTab("profile");
                }}
                className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer ${
                  activeTab === "profile" && profileUser.id === effectiveUser.id ? "text-[#0284c7] font-black scale-105" : "text-slate-400 hover:text-slate-700"
                }`}
              >
                <UserCircle className="w-5 h-5" />
                <span className="text-[8px] font-black">پروفایل</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab("feed")}
                className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer ${
                  activeTab === "feed" ? "text-[#0284c7] font-black scale-105" : "text-slate-400 hover:text-slate-700"
                }`}
              >
                <MessageSquare className="w-5 h-5" />
                <span className="text-[8px] font-black">{currentUser?.role === "client" ? "سالن‌ها" : "انجمن زیبایی"}</span>
              </button>

              {(currentUser?.role !== "client" || currentUser?.isVip) && (
                <button
                  onClick={() => setActiveTab("hiring")}
                  className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer ${
                    activeTab === "hiring" ? "text-[#0284c7] font-black scale-105" : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  <Search className="w-5 h-5" />
                  <span className="text-[8px] font-black">استخدام</span>
                </button>
              )}

              {currentUser?.role === "client" ? (
                <button
                  onClick={() => setActiveTab("community")}
                  className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer ${
                    activeTab === "community" ? "text-[#0284c7] font-black scale-105" : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  <MessageSquare className="w-5 h-5" />
                  <span className="text-[8px] font-black">انجمن</span>
                </button>
              ) : (
                <button
                  onClick={() => setActiveTab("leaderboard")}
                  className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer ${
                    activeTab === "leaderboard" ? "text-[#0284c7] font-black scale-105" : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  <Award className="w-5 h-5" />
                  <span className="text-[8px] font-black">برترین‌ها</span>
                </button>
              )}

              <button
                onClick={() => setActiveTab("assistant")}
                className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer ${
                  activeTab === "assistant" ? "text-[#0284c7] font-black scale-105" : "text-slate-400 hover:text-slate-700"
                }`}
              >
                <Sparkles className="w-5 h-5 text-[#0284c7]" />
                <span className="text-[8px] font-black">دستیار</span>
              </button>

              {currentUser?.role !== "manager" && (currentUser?.role !== "client" || currentUser?.isLoyalClient || currentUser?.isVip) && (
                <button
                  onClick={() => setActiveTab("inbox")}
                  className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all relative cursor-pointer ${
                    activeTab === "inbox" ? "text-[#0284c7] font-black scale-105" : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  <Inbox className="w-5 h-5" />
                  <span className="text-[8px] font-black">صندوق</span>
                  {pendingCount > 0 && (
                    <span className="absolute top-0.5 right-2 bg-rose-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                      {toPersianDigits(pendingCount)}
                    </span>
                  )}
                </button>
              )}

              {currentUser?.role !== "manager" && (
                <button
                  onClick={() => setActiveTab("discount")}
                  className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all relative cursor-pointer ${
                    activeTab === "discount" ? "text-[#0284c7] font-black scale-105" : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  <Percent className="w-5 h-5" />
                  <span className="text-[8px] font-black">تخفیف</span>
                </button>
              )}

              {currentUser?.role === "manager" && (
                <button
                  onClick={() => setActiveTab("staff")}
                  className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all relative cursor-pointer ${
                    activeTab === "staff" ? "text-[#0284c7] font-black scale-105" : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  <Users className="w-5 h-5 text-[#0284c7]" />
                  <span className="text-[8px] font-black">پرسنل</span>
                </button>
              )}

              {currentUser?.role === "manager" && (
                <button
                  onClick={() => setActiveTab("finance")}
                  className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all relative cursor-pointer ${
                    activeTab === "finance" ? "text-[#0284c7] font-black scale-105" : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  <DollarSign className="w-5 h-5 text-[#0284c7]" />
                  <span className="text-[8px] font-black">بخش مالی</span>
                </button>
              )}

              <button
                onClick={() => {
                  if (isGuest) {
                    setProfileUser(guestUser);
                    setActiveTab("profile");
                  } else {
                    setProfileUser(currentUser!);
                    setActiveTab("profile");
                  }
                }}
                className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer ${
                  activeTab === "profile" && profileUser.id === effectiveUser.id ? "text-[#0284c7] font-black scale-105" : "text-slate-400 hover:text-slate-700"
                }`}
              >
                <UserCircle className="w-5 h-5" />
                <span className="text-[8px] font-black">پروفایل من</span>
              </button>
            </>
          )}
        </nav>
      )}

      {/* ========================================================= */}
      {/* BEAUTIFUL AUTHENTICATION MODAL (Popup AuthPage) */}
      {/* ========================================================= */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs animate-fade-in text-right" dir="rtl">
          <div className="relative bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="space-y-0.5 text-right">
                <h3 className="text-xs font-black text-slate-800">ورود و عضویت در لجندین</h3>
                {authActionWarning ? (
                  <p className="text-[10px] text-amber-600 font-extrabold flex items-center gap-1 mt-1 justify-end">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    {authActionWarning}
                  </p>
                ) : (
                  <p className="text-[10.5px] text-slate-400 font-bold mt-1">برای دسترسی به تمام امکانات وارد حساب خود شوید.</p>
                )}
              </div>
              <button
                onClick={() => {
                  setIsAuthModalOpen(false);
                  setAuthActionWarning(null);
                }}
                className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all cursor-pointer text-sm font-black"
              >
                ✕
              </button>
            </div>

            {/* Modal Body / Auth Scrollable area */}
            <div className="flex-1 overflow-y-auto p-2">
              <AuthPage 
                allUsers={allUsers}
                onLoginSuccess={(user) => {
                  handleLoginSuccess(user);
                  setIsAuthModalOpen(false);
                  setAuthActionWarning(null);
                }}
                onRegisterSuccess={(updatedUsersList, loggedInUser) => {
                  handleRegisterSuccess(updatedUsersList, loggedInUser);
                  setIsAuthModalOpen(false);
                  setAuthActionWarning(null);
                }}
              />
            </div>

          </div>
        </div>
      )}

      {/* Beautiful, iframe-safe Custom App Confirmation Modal */}
      {appConfirm && appConfirm.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs animate-fade-in text-right" dir="rtl">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 p-6 space-y-5 animate-scale-up">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${appConfirm.isDanger ? 'bg-rose-50 text-rose-600' : 'bg-[#0284c7]/10 text-[#0284c7]'}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-black text-slate-800">{appConfirm.title}</h3>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {appConfirm.message}
            </p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={appConfirm.onConfirm}
                className={`flex-1 py-2.5 rounded-xl text-[11px] font-black transition-all cursor-pointer shadow-sm active:scale-95 ${
                  appConfirm.isDanger 
                    ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                    : 'bg-[#0284c7] hover:bg-[#0369a1] text-white'
                }`}
              >
                {appConfirm.confirmText || "تایید"}
              </button>
              <button
                onClick={() => setAppConfirm(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold py-2.5 rounded-xl transition-all cursor-pointer active:scale-95"
              >
                {appConfirm.cancelText || "انصراف"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

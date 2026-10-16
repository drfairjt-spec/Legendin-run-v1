import React, { useState } from "react";
import { User, UserRole, Skill } from "../types";
import { 
  LogIn, UserPlus, Phone, Lock, User as UserIcon, MapPin, 
  Briefcase, Sparkles, Building, ChevronRight, CheckCircle2, AlertCircle
} from "lucide-react";

interface AuthPageProps {
  allUsers: User[];
  onLoginSuccess: (user: User) => void;
  onRegisterSuccess: (updatedUsersList: User[], loggedInUser: User) => void;
}

export default function AuthPage({ allUsers, onLoginSuccess, onRegisterSuccess }: AuthPageProps) {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Login Form States
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Registration Form States
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regCity, setRegCity] = useState("تهران");
  const [regPassword, setRegPassword] = useState("");
  const [regRole, setRegRole] = useState<UserRole>("artist");

  // Manager-specific registration states
  const [salonName, setSalonName] = useState("");
  const [salonLocation, setSalonLocation] = useState("");

  // Artist-specific registration states
  const [artistTitle, setArtistTitle] = useState("");
  const [artistCategory, setArtistCategory] = useState("رنگ مو");
  const [artistSkillName, setArtistSkillName] = useState("");

  // Demo Accounts for Quick One-Click Login
  const demoAccounts = [
    {
      name: "مریم رادمنش",
      role: "مدیر سالن",
      phone: "09121111111",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=80&auto=format&fit=crop",
      desc: "مدیریت خانه زیبایی لجند"
    },
    {
      name: "سرنا ونس (موسوی)",
      role: "آرتیست زیبایی",
      phone: "09126666666",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=80&auto=format&fit=crop",
      desc: "مستر رنگ و لایت فانتزی"
    },
    {
      name: "غزل نیکو",
      role: "آرتیست ناخن",
      phone: "09128888888",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=80&auto=format&fit=crop",
      desc: "مدرس ناخن و کاشت مینیاتوری"
    },
    {
      name: "الناز افشار",
      role: "مشتری",
      phone: "09120000003",
      avatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=80&auto=format&fit=crop",
      desc: "بلاگر مد و سبک زندگی"
    }
  ];

  const handleDemoClick = (phone: string) => {
    setLoginPhone(phone);
    setLoginPassword("123456"); // Any dummy password for demo accounts
    setErrorMsg("");
    
    // Auto submit or highlight
    const found = allUsers.find(u => u.phone === phone);
    if (found) {
      setSuccessMsg(`حساب دمو ${found.name} انتخاب شد.`);
      setTimeout(() => {
        onLoginSuccess(found);
      }, 500);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!loginPhone.trim()) {
      setErrorMsg("لطفاً شماره موبایل را وارد نمایید.");
      return;
    }

    // Clean phone number format (trim, standardize digits if necessary)
    const normalizedPhone = loginPhone.trim();

    // Match with user phone
    const matchedUser = allUsers.find(
      u => u.phone === normalizedPhone || u.phone.replace(/^0/, "") === normalizedPhone.replace(/^0/, "")
    );

    if (!matchedUser) {
      setErrorMsg("کاربری با این شماره موبایل در سیستم یافت نشد. می‌توانید ثبت‌نام کنید.");
      return;
    }

    // For simplicity, any non-empty password is accepted for testing, but let's encourage at least 4 chars
    if (loginPassword.length < 4) {
      setErrorMsg("رمز عبور باید حداقل ۴ کاراکتر باشد.");
      return;
    }

    setSuccessMsg(`خوش آمدید، ${matchedUser.name}! در حال ورود...`);
    setTimeout(() => {
      onLoginSuccess(matchedUser);
    }, 800);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!regName.trim() || !regPhone.trim() || !regPassword.trim()) {
      setErrorMsg("لطفاً تمامی فیلدهای اجباری ستاره‌دار (*) را پر کنید.");
      return;
    }

    // Check if phone already registered
    const exists = allUsers.some(
      u => u.phone === regPhone.trim() || u.phone.replace(/^0/, "") === regPhone.trim().replace(/^0/, "")
    );

    if (exists) {
      setErrorMsg("این شماره موبایل قبلاً ثبت شده است. لطفاً وارد حساب خود شوید.");
      return;
    }

    // Prepare custom attributes based on Role
    let title = "کاربر لجندین";
    let bioText = "عضو جدید جامعه متخصصین زیبایی کشور.";
    let skills: Skill[] = [];

    if (regRole === "manager") {
      if (!salonName.trim()) {
        setErrorMsg("لطفاً نام سالن زیبایی خود را وارد نمایید.");
        return;
      }
      title = `مدیریت سالن ${salonName}`;
      bioText = `مدیر و کارآفرین سالن زیبایی ${salonName} در شهر ${regCity}. آماده همکاری با آرتیست‌های خلاق و برتر کشور.`;
    } else if (regRole === "artist") {
      const actualTitle = artistTitle.trim() || "آرتیست تخصصی زیبایی";
      title = actualTitle;
      const mainSkill = artistSkillName.trim() || `تخصص لاین ${artistCategory}`;
      skills = [{ name: mainSkill, category: artistCategory }];
      bioText = `متخصص حرفه‌ای لاین ${artistCategory} در شهر ${regCity}. علاقه مند به همکاری با بهترین سالن‌های آرایشی و ارائه خدمات نوین.`;
    } else {
      title = "مشتری عادی لجندین";
      bioText = `مراجع گران‌قدر علاقه مند به دریافت خدمات زیبایی باکیفیت و باپرستیژ در شهر ${regCity}.`;
    }

    // Beautiful stock avatar photos based on role/random
    const randomSeed = Math.floor(Math.random() * 100);
    const mockAvatars = [
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=150&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=150&auto=format&fit=crop"
    ];
    const chosenAvatar = mockAvatars[randomSeed % mockAvatars.length];

    const newUser: User = {
      id: "user-" + Date.now(),
      name: regName.trim(),
      role: regRole,
      phone: regPhone.trim(),
      email: `${Date.now()}@legendin.ir`,
      avatar: chosenAvatar,
      coverImage: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=800&auto=format&fit=crop",
      title,
      city: regCity,
      bio: bioText,
      
      // Role specific fields
      salonName: regRole === "manager" ? salonName.trim() : undefined,
      salonLocation: regRole === "manager" ? (salonLocation.trim() || regCity) : undefined,
      salonDescription: regRole === "manager" ? `مجموعه زیبایی تخصصی مدیریت شده توسط ${regName}` : undefined,
      
      skills: regRole === "artist" ? skills : [],
      certifications: regRole === "artist" ? [`مدرک معتبر فنی و حرفه ای لاین ${artistCategory}`] : [],
      portfolio: [],
      reviews: [],
      rating: regRole === "artist" ? 5.0 : undefined,
      openForHiring: regRole !== "client",
      acceptingRequests: true
    };

    const updatedList = [newUser, ...allUsers];
    setSuccessMsg("ثبت‌نام شما با موفقیت انجام شد! در حال ورود به پنل...");
    
    setTimeout(() => {
      onRegisterSuccess(updatedList, newUser);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#F7F5F0] flex flex-col justify-between text-right" dir="rtl">
      
      {/* Visual Landing Banner Header */}
      <header className="bg-white border-b border-slate-200/80 px-4 py-4.5 shadow-3xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#0284c7] flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                لجندین <span className="text-[#0284c7] text-[10px] bg-[#0284c7]/10 px-2 py-0.5 rounded-md font-bold">بستر بازار کار زیبایی</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">بزرگترین شبکه تعاملی، کاریابی و استخدام متخصصین سالن‌های زیبایی</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-bold">
            <span>نسخه نهایی پلتفرم</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
        </div>
      </header>

      {/* Main Grid View */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-center gap-8 lg:gap-12">
        
        {/* Left Column: Brand Pitch / Features (Visible on larger screens) */}
        <div className="flex-1 space-y-6 text-right max-w-md hidden md:block">
          <div className="space-y-2">
            <span className="text-xs bg-[#0284c7]/10 text-[#0284c7] px-3 py-1.5 rounded-full font-extrabold tracking-wide">جامعه متخصصین زیبایی ایران</span>
            <h2 className="text-2xl font-black text-slate-800 leading-tight">شبکه اجتماعی لجندین چیست؟</h2>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              لجندین اولین پلتفرم دوطرفه مجهز به ابزار راداری تخصص‌هاست که مستقیماً آرتیست‌های خلاق را به برترین کارفرمایان سالن‌های لوکس متصل می‌کند.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs">
              <div className="p-2 bg-[#0284c7]/10 rounded-xl text-[#0284c7]">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">صندوق پیشنهادات و استخدام مستقیم</h4>
                <p className="text-[10px] text-slate-400 font-medium mt-1">مدیران سالن‌ها می‌توانند با بررسی رزومه‌ها به آرتیست‌ها آفر کاری مستقیم ارسال کنند.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs">
              <div className="p-2 bg-[#0284c7]/10 rounded-xl text-[#0284c7]">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">ماتریکس ارزیابی مهارت‌های فنی</h4>
                <p className="text-[10px] text-slate-400 font-medium mt-1">نمودارهای راداری اختصاصی برای سنجش عادلانه ابعاد تخصصی و رضایت‌مندی مراجعین.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs">
              <div className="p-2 bg-[#0284c7]/10 rounded-xl text-[#0284c7]">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">خوراک تعاملی همکاران (Feed)</h4>
                <p className="text-[10px] text-slate-400 font-medium mt-1">به اشتراک‌گذاری روزانه تصاویر، نمونه کارهای جدید، فرصت‌های فورس‌ماژور و تجربیات همکاران.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Authentication Form Card */}
        <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl shadow-lg overflow-hidden flex flex-col shrink-0">
          
          {/* Tab selectors */}
          <div className="flex border-b border-slate-100 bg-slate-50/50">
            <button
              onClick={() => {
                setActiveTab("login");
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className={`flex-1 text-center py-4 text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === "login"
                  ? "bg-white text-[#0284c7] border-b-2 border-[#0284c7]"
                  : "text-slate-400 hover:text-slate-700 hover:bg-slate-50/80"
              }`}
            >
              <LogIn className="w-4 h-4" />
              ورود به سیستم
            </button>
            <button
              onClick={() => {
                setActiveTab("register");
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className={`flex-1 text-center py-4 text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === "register"
                  ? "bg-white text-[#0284c7] border-b-2 border-[#0284c7]"
                  : "text-slate-400 hover:text-slate-700 hover:bg-slate-50/80"
              }`}
            >
              <UserPlus className="w-4 h-4" />
              عضویت آرتیست / سالن جدید
            </button>
          </div>

          <div className="p-6 space-y-4 flex-1">
            
            {/* Feedback Notifications */}
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-2xl text-[11px] font-bold flex items-center gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3.5 rounded-2xl text-[11px] font-bold flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* LOGIN PANEL */}
            {activeTab === "login" && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="text-center pb-2">
                  <h3 className="text-sm font-black text-slate-800">خوش آمدید! وارد لجندین شوید</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">با شماره موبایل دمو یا شماره ثبت‌نامی خود لاگین کنید.</p>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] text-slate-500 font-extrabold mr-1">شماره موبایل دمو یا ثبت‌نامی *</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="مثال: 09121111111"
                      value={loginPhone}
                      onChange={(e) => setLoginPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0284c7] outline-none text-xs rounded-xl p-3 pl-10 text-slate-800 font-bold tracking-wider"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] text-slate-500 font-extrabold mr-1">رمز عبور امنیتی *</label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      placeholder="حداقل ۴ کاراکتر (مثال: ۱۲۳۴۵۶)"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0284c7] outline-none text-xs rounded-xl p-3 pl-10 text-slate-800 font-bold tracking-wider"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#0284c7] hover:bg-[#0369a1] text-white py-3 rounded-xl text-xs font-black shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <LogIn className="w-4 h-4" />
                  ورود امن به سیستم بازار کار
                </button>
              </form>
            )}

            {/* REGISTER PANEL */}
            {activeTab === "register" && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                
                {/* Role Switcher in registration */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] text-slate-500 font-extrabold mr-1">نوع کاربری خود را انتخاب کنید *</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setRegRole("artist")}
                      className={`py-2 rounded-xl text-[10px] font-black border text-center cursor-pointer transition-all ${
                        regRole === "artist"
                          ? "bg-[#0284c7]/10 border-[#0284c7] text-[#0284c7] font-black"
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      🎨 متخصص
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegRole("manager")}
                      className={`py-2 rounded-xl text-[10px] font-black border text-center cursor-pointer transition-all ${
                        regRole === "manager"
                          ? "bg-[#0284c7]/10 border-[#0284c7] text-[#0284c7] font-black"
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      🏢 سالن‌دار
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegRole("client")}
                      className={`py-2 rounded-xl text-[10px] font-black border text-center cursor-pointer transition-all ${
                        regRole === "client"
                          ? "bg-[#0284c7]/10 border-[#0284c7] text-[#0284c7] font-black"
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      🛍️ مشتری
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] text-slate-500 font-extrabold mr-1">نام و نام خانوادگی *</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="مثال: الناز راد"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0284c7] outline-none text-xs rounded-xl p-2.5 pl-9 text-slate-800 font-bold"
                    />
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] text-slate-500 font-extrabold mr-1">شماره موبایل *</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="مثال: 09121234567"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0284c7] outline-none text-xs rounded-xl p-2.5 pl-9 text-slate-800 font-bold tracking-wider"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[10px] text-slate-500 font-extrabold mr-1">شهر محل فعالیت *</label>
                    <div className="relative">
                      <select
                        value={regCity}
                        onChange={(e) => setRegCity(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0284c7] outline-none text-xs rounded-xl p-2.5 text-slate-800 font-bold"
                      >
                        <option value="تهران">تهران</option>
                        <option value="اصفهان">اصفهان</option>
                        <option value="شیراز">شیراز</option>
                        <option value="مشهد">مشهد</option>
                        <option value="تبریز">تبریز</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] text-slate-500 font-extrabold mr-1">رمز عبور دلخواه *</label>
                    <div className="relative">
                      <input
                        type="password"
                        required
                        placeholder="حداقل ۴ حرف"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0284c7] outline-none text-xs rounded-xl p-2.5 pl-9 text-slate-800 font-bold"
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                  </div>
                </div>

                {/* ROLE-SPECIFIC ADDITIONAL FIELDS */}
                {regRole === "manager" && (
                  <div className="p-3 bg-slate-50 border border-slate-150 rounded-2xl space-y-2.5 animate-fade-in">
                    <span className="text-[9px] text-[#0284c7] font-black block">🏢 اطلاعات تکمیلی سالن‌دار:</span>
                    
                    <div className="space-y-1">
                      <label className="block text-[9px] text-slate-400 font-extrabold">نام تجاری سالن زیبایی *</label>
                      <input
                        type="text"
                        placeholder="مثال: سالن زیبایی شیک‌رخ"
                        value={salonName}
                        onChange={(e) => setSalonName(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-[#0284c7] outline-none text-xs rounded-lg p-2 text-slate-800 font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[9px] text-slate-400 font-extrabold">آدرس پستی سالن</label>
                      <input
                        type="text"
                        placeholder="مثال: جردن، خیابان گلفام، پلاک ۱۰"
                        value={salonLocation}
                        onChange={(e) => setSalonLocation(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-[#0284c7] outline-none text-xs rounded-lg p-2 text-slate-800 font-medium"
                      />
                    </div>
                  </div>
                )}

                {regRole === "artist" && (
                  <div className="p-3 bg-slate-50 border border-slate-150 rounded-2xl space-y-2.5 animate-fade-in">
                    <span className="text-[9px] text-[#0284c7] font-black block">🎨 اطلاعات تخصصی آرتیست:</span>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="block text-[9px] text-slate-400 font-extrabold">عنوان تخصص شما *</label>
                        <input
                          type="text"
                          placeholder="مثال: مستر هیرکات"
                          value={artistTitle}
                          onChange={(e) => setArtistTitle(e.target.value)}
                          className="w-full bg-white border border-slate-200 focus:border-[#0284c7] outline-none text-xs rounded-lg p-2 text-slate-800 font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[9px] text-slate-400 font-extrabold">لاین اصلی فعالیت</label>
                        <select
                          value={artistCategory}
                          onChange={(e) => setArtistCategory(e.target.value)}
                          className="w-full bg-white border border-slate-200 focus:border-[#0284c7] outline-none text-xs rounded-lg p-2 text-slate-800 font-bold"
                        >
                          <option value="رنگ مو">رنگ مو</option>
                          <option value="ناخن">لاین ناخن</option>
                          <option value="میکاپ">میکاپ</option>
                          <option value="پوست">پوست و فیشیال</option>
                          <option value="مژه">مژه و ابرو</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[9px] text-slate-400 font-extrabold">اولین مهارت شاخص و کلیدی شما *</label>
                      <input
                        type="text"
                        placeholder="مثال: تکنیک ایرتاچ روسی"
                        value={artistSkillName}
                        onChange={(e) => setArtistSkillName(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-[#0284c7] outline-none text-xs rounded-lg p-2 text-slate-800 font-bold"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-[#0284c7] hover:bg-[#0369a1] text-white py-2.5 rounded-xl text-xs font-black shadow-md transition-all active:scale-98 cursor-pointer mt-3"
                >
                  تکمیل ثبت‌نام و ورود به پنل کاربری
                </button>
              </form>
            )}

          </div>

          {/* DEMO ACCOUNTS DRAWER / ACCORDION */}
          <div className="bg-slate-50 border-t border-slate-100 p-4.5">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide block mb-3 text-center">
              🔐 ورود سریع آزمایشی (فقط با یک کلیک)
            </span>
            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.map((demo) => (
                <button
                  key={demo.phone}
                  type="button"
                  onClick={() => handleDemoClick(demo.phone)}
                  className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl p-2 transition-all cursor-pointer text-right group"
                >
                  <img
                    src={demo.avatar}
                    alt={demo.name}
                    className="w-7 h-7 rounded-full object-cover border border-slate-100 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h5 className="text-[9.5px] font-black text-slate-800 truncate group-hover:text-[#0284c7]">{demo.name}</h5>
                    <p className="text-[8px] text-[#0284c7] font-extrabold truncate">{demo.role}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

        </div>

      </main>

      {/* Decorative footer details */}
      <footer className="bg-white border-t border-slate-150 py-4 px-4 text-center">
        <p className="text-[10px] text-slate-400 font-bold">لجندین، شبکه کاریابی سالن‌های زیبایی کشور. طراحی شده بر پایه استاندارد مدرن و پرسونای بازار.</p>
      </footer>

    </div>
  );
}

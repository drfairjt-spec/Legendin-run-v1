import { User, Post, Skill, Service } from "./types";

export const seedServices: Service[] = [
  // Top-level lines (parent services)
  { id: "s_hair_color", name: "لاین رنگ و لایت مو", durationMinutes: 0, price: 0, currency: "تومان" },
  { id: "s_nails", name: "لاین تخصصی ناخن", durationMinutes: 0, price: 0, currency: "تومان" },
  { id: "s_makeup", name: "لاین میکاپ و گریم", durationMinutes: 0, price: 0, currency: "تومان" },
  { id: "s_skincare", name: "لاین پاکسازی و فیشیال پوست", durationMinutes: 0, price: 0, currency: "تومان" },

  // Bookable services under lines
  { id: "s1", parentServiceId: "s_hair_color", name: "بالیاژ روسی طلایی", durationMinutes: 180, price: 2500000, currency: "تومان" },
  { id: "s2", parentServiceId: "s_hair_color", name: "کراتین و احیای مو", durationMinutes: 120, price: 1800000, currency: "تومان" },
  { id: "s3", parentServiceId: "s_nails", name: "کاشت ناخن ژل", durationMinutes: 90, price: 800000, currency: "تومان" },
  { id: "s4", parentServiceId: "s_nails", name: "ژلیش ناخن طبیعی", durationMinutes: 45, price: 400000, currency: "تومان" },
  { id: "s5", parentServiceId: "s_nails", name: "لمینت ناخن", durationMinutes: 60, price: 700000, currency: "تومان" },
  { id: "s6", parentServiceId: "s_makeup", name: "میکاپ تخصصی عروس", durationMinutes: 240, price: 5000000, currency: "تومان" },
  { id: "s7", parentServiceId: "s_makeup", name: "کانتورینگ و فیس‌لیفت", durationMinutes: 90, price: 1500000, currency: "تومان" },
  { id: "s8", parentServiceId: "s_skincare", name: "پاکسازی پوست و هیدرودرمی", durationMinutes: 75, price: 1200000, currency: "تومان" }
];

export const SKILLS_LIST: Skill[] = [
  { name: "بالیاژ و رنگ فانتزی", category: "رنگ مو" },
  { name: "کراتین و احیای مو", category: "سلامت مو" },
  { name: "کوپ ژورنالی و شینیون", category: "استایل مو" },
  { name: "کاشت ناخن پودر و ژل", category: "ناخن" },
  { name: "طراحی و مینیاتور ناخن", category: "ناخن" },
  { name: "میکاپ و گریم عروس", category: "میکاپ" },
  { name: "کانتورینگ و فیس‌لیفت", category: "میکاپ" },
  { name: "پاکسازی پوست و هیدرودرمی", category: "پوست" },
  { name: "میکروبلیدینگ و فیبروز", category: "تاتو و ابرو" },
  { name: "اکستنشن مژه کلاسیک و والیوم", category: "مژه" }
];

export const seedUsers: User[] = [
  // --- SUPER ADMIN ---
  {
    id: "admin",
    name: "مدیر کل سیستم (Super Admin)",
    role: "manager",
    phone: "09000000000",
    email: "fair.blizz@gmail.com",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&auto=format&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=800&auto=format&fit=crop",
    title: "مدیر ارشد و طراح سیستم لجندین",
    city: "تهران",
    bio: "مدیر ارشد پلتفرم لجندین. دسترسی کامل به ابزارها، قابلیت بازنشانی و مانیتورینگ جامع داده‌ها.",
    salonName: "دفتر مرکزی لجندین",
    salonLocation: "تهران، الهیه، برج نگین",
    salonDescription: "تیم پشتیبانی، توسعه و نظارت فنی پلتفرم لجندین کشور.",
    openForHiring: false,
    acceptingRequests: true
  },
  // --- SALON MANAGERS (5) ---
  {
    id: "m1",
    name: "مریم رادمنش",
    role: "manager",
    phone: "09121111111",
    email: "maryam@legend.com",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=150&auto=format&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=800&auto=format&fit=crop",
    title: "مدیر ارشد و موسس خانه زیبایی لجند",
    city: "تهران",
    bio: "با بیش از ۱۵ سال سابقه مدیریت سالن‌های لوکس در الهیه و جردن. تمرکز ما در خانه زیبایی لجند، ارائه بالاترین سطح خدمات با استفاده از مجرب‌ترین آرتیست‌های ایران است.",
    salonName: "خانه زیبایی لجند (شعب جردن و زعفرانیه)",
    salonLocation: "تهران، جردن، خیابان طاهری، پلاک ۲۴",
    salonDescription: "بزرگترین مجتمع فوق‌تخصصی زیبایی در شمال تهران مجهز به پیشرفته‌ترین ابزارهای روز دنیا.",
    jobDescription: "خانه زیبایی لجند جهت تکمیل کادر تخصصی شعب جردن و زعفرانیه از آرتیست‌های حرفه‌ای و دارای مشتری دعوت به همکاری می‌نماید. محیط کاری فوق‌العاده شیک، با پرستیژ بالا و سیستم تبلیغات گسترده سالن.",
    jobOpenings: [
      {
        id: "job-m1-1",
        title: "متخصص رنگ و لایت (هیرکالریست)",
        department: "رنگ مو",
        contractType: "درصدی",
        description: "انجام کلیه خدمات بالیاژ، آمبره، سامبره و دکلره تخصصی بدون آسیب با مواد درجه یک اروپایی.",
        requirements: ["حداقل ۳ سال سابقه کار حرفه‌ای", "دارای نمونه کارهای ژورنالی و قوی", "مسلط به ترکیب رنگ و تکنیک‌های روز دنیا"],
        benefits: ["تسویه منظم هفتگی (۶۰٪ سهم آرتیست)", "ارجاع مشتری ثابت از پذیرش سالن", "استفاده از دستیار سالن"]
      },
      {
        id: "job-m1-2",
        title: "ناخن‌کار مسلط به طراحی ژورنالی و ژل‌تراپی",
        department: "ناخن",
        contractType: "اجاره صندلی",
        description: "کاشت، ترمیم، لمینت و دیزاین حرفه‌ای ناخن در لاین تخصصی VIP ناخن.",
        requirements: ["تخصص کامل در کاشت ژل و روسی", "سرعت عمل بالا و ظرافت کاری"],
        benefits: ["میز کار اختصاصی در بهترین نقطه سالن", "امکان جذب مشتریان حضوری سالن"]
      }
    ],
    openForHiring: true,
    acceptingRequests: true,
    rating: 4.85,
    contactAllowed: true,
    socialLinks: { instagram: "@LegendBeautyHouse", telegram: "@legendin_support", website: "https://legendbeauty.ir" },
    workingHoursSchedule: [
      { day: "شنبه تا چهارشنبه", hours: "۱۰:۰۰ الی ۲۰:۰۰" },
      { day: "پنجشنبه", hours: "۱۰:۰۰ الی ۱۸:۰۰" },
      { day: "جمعه", hours: "تعطیل (فقط با هماهنگی VIP)" }
    ],
    reviews: [
      { id: "srev1", reviewerName: "فرشته کریمی", reviewerAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=100&auto=format&fit=crop", rating: 5, comment: "محیط بسیار شیک، آرام و کادر فوق‌العاده حرفه‌ای. پذیرایی عالی بود.", date: "1405/04/01" },
      { id: "srev2", reviewerName: "مهسا دادور", reviewerAvatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=100&auto=format&fit=crop", rating: 5, comment: "نظم در نوبت‌دهی و بهداشت سالن بی‌نظیر است.", date: "1405/04/10" }
    ],
    portfolio: [
      { id: "sp1", imageUrl: "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=600&auto=format&fit=crop", title: "سالن اصلی VIP", description: "فضای استراحت و پذیرایی اختصاصی" },
      { id: "sp2", imageUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=600&auto=format&fit=crop", title: "لاین تخصصی رنگ مو", description: "تهویه مطبوع مدرن و صندلی‌های ارگونومیک" }
    ]
  },
  {
    id: "m2",
    name: "سارا خسروی",
    role: "manager",
    phone: "09122222222",
    email: "sara@royal.com",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=150&auto=format&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=800&auto=format&fit=crop",
    title: "مدیریت سالن مجلل رویال پالاس",
    city: "شیراز",
    bio: "ماموریت ما پیوند هنر، علم زیبایی و آرامش مراجعین گران‌قدر است. همیشه آماده همکاری با استعدادهای درجه یک کشور هستیم.",
    salonName: "سالن مجلل رویال پالاس",
    salonLocation: "شیراز، قدوسی غربی، مجتمع ارم",
    salonDescription: "فضایی رویایی و آرام‌بخش همراه با کادری کارآزموده در زمینه گریم تخصصی عروس و رنگ مو.",
    jobDescription: "سالن رویال پالاس شیراز در راستای توسعه دپارتمان‌های زیبایی، از متخصصین با‌اخلاق و خلاق دعوت به همکاری می‌نماید. سالنی با قدمت، برند معتبر در جنوب کشور و تضمین درآمد پایدار.",
    jobOpenings: [
      {
        id: "job-m2-1",
        title: "متخصص شینیون و بافت موی عروس",
        department: "استایل مو",
        contractType: "درصدی",
        description: "اجرای جدیدترین شینیون‌های خطی، حرارتی و بافت‌های ژورنالی عروس و همراه.",
        requirements: ["تسلط به شینیون‌های مدرن اروپایی و کلاسیک", "خوش‌قولی، نظم و روحیه‌ی کار تیمی"],
        benefits: ["قرارداد رسمی درصدی (۶۵٪ آرتیست)", "تضمین مشتری عروس از پکیج‌های سالن"]
      }
    ],
    openForHiring: true,
    acceptingRequests: true,
    rating: 4.92,
    contactAllowed: true,
    socialLinks: { instagram: "@RoyalPalaceShiraz", website: "https://royalpalace.ir" },
    workingHoursSchedule: [
      { day: "شنبه تا پنجشنبه", hours: "۰۹:۳۰ الی ۲۱:۰۰" },
      { day: "جمعه", hours: "۱۱:۰۰ الی ۱۶:۰۰" }
    ],
    reviews: [
      { id: "srev3", reviewerName: "پریسا نجفی", reviewerAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=100&auto=format&fit=crop", rating: 5, comment: "بهترین عمارت عروس در شیراز. کادر پذیرش بسیار خوش‌برخورد بودند.", date: "1405/03/28" }
    ],
    portfolio: [
      { id: "sp3", imageUrl: "https://images.unsplash.com/photo-1632345031435-8797b2d58045?q=80&w=600&auto=format&fit=crop", title: "عمارت عروس", description: "اتاق میکاپ خصوصی عروس با نورپردازی طبیعی" }
    ]
  },
  {
    id: "m3",
    name: "رکسانا بهرامی",
    role: "manager",
    phone: "09123333333",
    email: "roxana@glow.com",
    avatar: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?q=80&w=150&auto=format&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=800&auto=format&fit=crop",
    title: "موسس هلدینگ زیبایی و اسپا گلو-ناین",
    city: "اصفهان",
    bio: "مدیر جوان و خلاق که معتقد است محیط کار پویا و صمیمی، کلید خلق شاهکارهای متمایز آرایشی است. دنبال ناخن‌کار و مژه‌کار حرفه‌ای جهت پیوستن به لاین جدید شعبه اصفهان هستیم.",
    salonName: "اسپا و عمارت زیبایی گلو-ناین (Glow9)",
    salonLocation: "اصفهان، خیابان مرداویج، چهارراه فرایبرگ",
    salonDescription: "اولین عمارت اسپا مدرن با استانداردهای بین‌المللی ارگانیک و لاین اختصاصی مراقبت ناخن.",
    openForHiring: false,
    acceptingRequests: true,
    rating: 4.78,
    contactAllowed: true,
    socialLinks: { instagram: "@Glow9_Spa" },
    workingHoursSchedule: [
      { day: "همه روزه", hours: "۱۰:۰۰ الی ۱۹:۳۰" }
    ],
    reviews: []
  },
  {
    id: "m4",
    name: "کامران کیانی",
    role: "manager",
    phone: "09124444444",
    email: "kamran@gentle.com",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=800&auto=format&fit=crop",
    title: "موسس و مدیر باربرشاپ و کلینیک آقایان جنتلمن",
    city: "تهران",
    bio: "طراح سبک‌های نوین موی آقایان و مدیر برتر سالن‌های زنجیره‌ای لوکس گریم و فیشیال تخصصی داماد.",
    salonName: "مجموعه تخصصی داماد جنتلمن",
    salonLocation: "تهران، الهیه، خیابان فرشته، مرکز تجاری مریم",
    salonDescription: "ارائه خدمات فوق‌تخصصی مو، ریش و گریم سینمایی داماد در محیطی لوکس و مدرن.",
    jobDescription: "کلینیک و باربرشاپ لوکس جنتلمن واقع در الهیه، جهت کادر خدمات VIP آقایان و داماد از متخصصین مو و پاکسازی پوست دعوت به عمل می‌آورد.",
    jobOpenings: [
      {
        id: "job-m4-1",
        title: "هیر کات‌کار و استایلیست تخصصی آقایان",
        department: "استایل مو",
        contractType: "حقوق ثابت",
        description: "کوتاهی مدرن، فید، گریم و استایل تخصصی داماد با جدیدترین متدهای دنیا.",
        requirements: ["آراستگی ظاهری و اخلاق حرفه‌ای", "سابقه کار در سالن‌های درجه یک"],
        benefits: ["حقوق ثابت تضمینی + پورسانت پاداش", "محیط آرام و مشتریان VIP"]
      }
    ],
    openForHiring: true,
    acceptingRequests: false,
    rating: 4.90,
    contactAllowed: true,
    socialLinks: { instagram: "@GentlemanBarber" },
    workingHoursSchedule: [
      { day: "شنبه تا جمعه", hours: "۱۱:۰۰ الی ۲۲:۰۰" }
    ],
    reviews: []
  },
  {
    id: "m5",
    name: "شیوا افشار",
    role: "manager",
    phone: "09125555555",
    email: "shiva@afshar.com",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=800&auto=format&fit=crop",
    title: "مدیر آتلیه تخصصی رنگ موی شیک‌لند",
    city: "مشهد",
    bio: "متعهد به ترویج استانداردهای مدرن سلامت ساقه مو. در آتلیه شیک‌لند روی تکنیک‌های نوین تمرکز داریم.",
    salonName: "آتلیه تخصصی شیک‌لند",
    salonLocation: "مشهد، بلوار سجاد، بزرگمهر شمالی",
    salonDescription: "کانون تخصصی رنگ، لایت و احیای فوق پیشرفته مو با کادر بین‌المللی.",
    openForHiring: false,
    acceptingRequests: false,
    rating: 4.70,
    contactAllowed: true,
    workingHoursSchedule: [
      { day: "شنبه تا پنجشنبه", hours: "۰۹:۰۰ الی ۱۸:۰۰" }
    ],
    reviews: []
  },

  // --- ARTISTS (6) ---
  {
    id: "a1",
    name: "سرنا ونس (موسوی)",
    role: "artist",
    phone: "09126666666",
    email: "serena@gmail.com",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?q=80&w=800&auto=format&fit=crop",
    title: "مستر دایرکتور لاین رنگ و لایت فانتزی و آمبره",
    city: "تهران",
    bio: "دارای مدرک پلاتینیوم لورآل فرانسه. متخصص تکنیک‌های فوق مدرن هیرتاچ، آمبره معکوس و تراپی‌های احیای ساقه موهای آسیب‌دیده با ۸ سال تجربه مستمر.",
    salonName: "خانه زیبایی لجند (شعب جردن و زعفرانیه)",
    managerId: "m1",
    yearsOfExperience: 8,
    certifications: ["مدرک پلاتینیوم L'Oréal Professionnel پاریس", "گواهی‌نامه تکنیک AirTouch از آکادمی ولادیمیر سارباش", "مدرک مربی‌گری سازمان فنی و حرفه‌ای کشور"],
    skills: [
      { name: "بالیاژ و رنگ فانتزی", category: "رنگ مو" },
      { name: "کراتین و احیای مو", category: "سلامت مو" },
      { name: "کوپ ژورنالی و شینیون", category: "استایل مو" }
    ],
    rating: 4.95,
    reviews: [
      { id: "rev1", reviewerName: "بهاره کیانی", reviewerAvatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=100&auto=format&fit=crop", rating: 5, comment: "بهترین و دقیق‌ترین کار رنگ مو در کل تهران! بدون هیچ آسیبی موهامو بلوند روشن کردن.", date: "1405/03/12" },
      { id: "rev2", reviewerName: "نسیم رفیعی", reviewerAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100&auto=format&fit=crop", rating: 5, comment: "بسیار بااخلاق و حرفه‌ای. کاملا به درخواست مشتری گوش میدن و فوق‌العاده با وسواس کار میکنن.", date: "1405/04/02" }
    ],
    portfolio: [
      { id: "p1_1", imageUrl: "https://images.unsplash.com/photo-1562322140-8baeececf3df?q=80&w=400&auto=format&fit=crop", title: "بالیاژ روسی کاراملی صدفی", description: "رنگساژ خنثی بر روی پایه ۹ دکلره بدون آسیب" },
      { id: "p1_2", imageUrl: "https://images.unsplash.com/photo-1620331311520-246422fd82f9?q=80&w=400&auto=format&fit=crop", title: "آمبره بلوند استخوانی متالیک", description: "ترکیب سایه‌های نقره‌ای و بژ روی ساقه ضخیم" },
      { id: "p1_3", imageUrl: "https://images.unsplash.com/photo-1519699047748-de8e457a634e?q=80&w=400&auto=format&fit=crop", title: "کوپ فانتزی شگ لیر", description: "استایل حجم‌دار شگ با تکنیک روتین پوینت‌کات" },
      { id: "p1_4", imageUrl: "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?q=80&w=400&auto=format&fit=crop", title: "سامبره عسلی تیره گرم", description: "ایده‌آل برای خانم‌های با تناژ پوست گندمی" },
      { id: "p1_5", imageUrl: "https://images.unsplash.com/photo-1605497746444-1ae0245a1980?q=80&w=400&auto=format&fit=crop", title: "احیای مو به روش پلکس تراپی اولاپلکس", description: "درمان فیبرهای کراتینی آسیب دیده در اثر اتوکشی مکرر" }
    ],
    acceptingRequests: true,
    openForHiring: true,
    isVerified: false,
    uploadedCertificates: [
      {
        id: "cert-1",
        title: "مدرک پلاتینیوم L'Oréal Professionnel پاریس",
        documentUrl: "https://images.unsplash.com/photo-1589330694653-ded6df03f754?q=80&w=600&auto=format&fit=crop",
        status: "pending",
        uploadedAt: "1405/04/01"
      },
      {
        id: "cert-2",
        title: "گواهی‌نامه تکنیک AirTouch از آکادمی ولادیمیر سارباش",
        documentUrl: "https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?q=80&w=600&auto=format&fit=crop",
        status: "approved",
        uploadedAt: "1405/03/25"
      }
    ]
  },
  {
    id: "a2",
    name: "یاسمن طاهری",
    role: "artist",
    phone: "09127777777",
    email: "yasaman@gmail.com",
    avatar: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?q=80&w=150&auto=format&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?q=80&w=800&auto=format&fit=crop",
    title: "میکاپ‌آرتیست تخصصی عروس و کانتورینگ سینمایی",
    city: "تهران",
    bio: "فارغ‌التحصیل آکادمی بین‌المللی گریم سامر خوزامی در بیروت. متخصص گریم هالیوودی و نچرال عروس، قرینه‌سازی تخصصی اعضای چهره و کانتورینگ متناسب با فرم صورت.",
    salonName: "خانه زیبایی لجند (شعب جردن و زعفرانیه)",
    managerId: "m1",
    yearsOfExperience: 6,
    certifications: ["دیپلم بین‌المللی کانتورینگ از آکادمی Samer Khouzami بیروت", "تاییدیه گریم استودیویی از تلویزیون ملی"],
    skills: [
      { name: "میکاپ و گریم عروس", category: "میکاپ" },
      { name: "کانتورینگ و فیس‌لیفت", category: "میکاپ" }
    ],
    rating: 4.88,
    reviews: [
      { id: "rev3", reviewerName: "شیوا علیزاده", reviewerAvatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=100&auto=format&fit=crop", rating: 5, comment: "آرایش شب عروسی من رو انجام دادن. خیلی نچرال و بادوام بود، تا آخر شب اصلا تکون نخورد.", date: "1405/02/20" }
    ],
    portfolio: [
      { id: "p2_1", imageUrl: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?q=80&w=400&auto=format&fit=crop", title: "میکاپ مات نود با مژه دست‌ساز", description: "کانتورینگ فرم صورت بیضی با تکنیک سایه‌روشن پودری" },
      { id: "p2_2", imageUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=400&auto=format&fit=crop", title: "گریم عروس با تناژ هلویی شاین", description: "هایلایت استخوان گونه و تصحیح زاویه فک" },
      { id: "p2_3", imageUrl: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?q=80&w=400&auto=format&fit=crop", title: "اسموكى كلاسیک برنز", description: "خط چشم ضدآب گربه‌ای و آرایش لب نچرال" }
    ],
    acceptingRequests: true,
    openForHiring: false
  },
  {
    id: "a3",
    name: "غزل نیکو",
    role: "artist",
    phone: "09128888888",
    email: "ghazal@gmail.com",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1501719183311-dfb37f9991d8?q=80&w=800&auto=format&fit=crop",
    title: "مستر دیزاینر و مدرس بین‌المللی ناخن",
    city: "اصفهان",
    bio: "دارنده رتبه اول مسابقات دیزاین ناخن استانبول ۲۰۲۴. متخصص کاشت ناخن ژل، تکنیک پیشرفته پلی‌ژل و دیزاین‌های مینیاتوری مینی‌مال با قلم مو.",
    salonName: "سالن مجلل رویال پالاس",
    managerId: "m2",
    yearsOfExperience: 5,
    certifications: ["مدال طلای فستیوال ناخن NailMaster استانبول ۲۰۲۴", "مدرک آکادمی روسی نیلزآرت مسکو"],
    skills: [
      { name: "کاشت ناخن پودر و ژل", category: "ناخن" },
      { name: "طراحی و مینیاتور ناخن", category: "ناخن" }
    ],
    rating: 4.98,
    reviews: [
      { id: "rev4", reviewerName: "رویا معتمدی", reviewerAvatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=100&auto=format&fit=crop", rating: 5, comment: "هنرمند واقعی! طرحی که با قلم روی ناخنم کشید از عکسش هم قشنگ‌تر شد. ماندگاری کارهای ژل‌شون حرف نداره.", date: "1405/03/29" }
    ],
    portfolio: [
      { id: "p3_1", imageUrl: "https://images.unsplash.com/photo-1604654894610-df490651e56c?q=80&w=400&auto=format&fit=crop", title: "کاشت ساید روسی با لاک‌ژل مغناطیسی", description: "اصلاح فرم صدف ناخن با پلی‌ژل بدون سوهان‌کشی خشن" },
      { id: "p3_2", imageUrl: "https://images.unsplash.com/photo-1632345031435-8797b2d58045?q=80&w=400&auto=format&fit=crop", title: "مینیاتور ظریف شکوفه‌های گیلاس با قلم", description: "طراحی ژورنالی دست‌ساز بر روی کاشت شفاف لمینت" },
      { id: "p3_3", imageUrl: "https://images.unsplash.com/photo-1604654894611-6973b376cbde?q=80&w=400&auto=format&fit=crop", title: "کاشت فرنچ کلاسیک با بیبی بومر", description: "محوشدگی ملایم صورتی و شیری بسیار طبیعی و شیک" }
    ],
    acceptingRequests: true,
    openForHiring: true,
    isVerified: false,
    uploadedCertificates: [
      {
        id: "cert-3",
        title: "مدال طلای فستیوال ناخن NailMaster استانبول ۲۰۲۴",
        documentUrl: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=600&auto=format&fit=crop",
        status: "pending",
        uploadedAt: "1405/04/03"
      }
    ]
  },
  {
    id: "a4",
    name: "الهام حسینی",
    role: "artist",
    phone: "09129999999",
    email: "elham@gmail.com",
    avatar: "https://images.unsplash.com/photo-1554151228-14d9def656e4?q=80&w=150&auto=format&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?q=80&w=800&auto=format&fit=crop",
    title: "تراپیست و کارشناس ارشد پاکسازی و فیشیال پوست",
    city: "شیراز",
    bio: "متخصص فیشیال تخصصی با دستگاه‌های هیدرودرمی، جوانسازی میکرونیدلینگ و اسیدتراپی اصولی برای رفع لک و جوش. دانش آموخته مراقبت‌های پوستی از جهاد دانشگاهی علوم پزشکی.",
    salonName: "سالن مجلل رویال پالاس",
    managerId: "m2",
    yearsOfExperience: 4,
    certifications: ["گواهینامه کار با دستگاه‌های جوانسازی پوست از بیوتک ایتالیا", "تاییدیه اسیدتراپی تخصصی تالگو فرانسه"],
    skills: [
      { name: "پاکسازی پوست و هیدرودرمی", category: "پوست" }
    ],
    rating: 4.75,
    reviews: [],
    portfolio: [
      { id: "p4_1", imageUrl: "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?q=80&w=400&auto=format&fit=crop", title: "پاکسازی عمیق منافذ با درمااف", description: "خروج کمدون‌ها و تغذیه با سرم ویتامین سی خالص" },
      { id: "p4_2", imageUrl: "https://images.unsplash.com/photo-1519699047748-de8e457a634e?q=80&w=400&auto=format&fit=crop", title: "پیلینگ شیمیایی ملایم رفع جای جوش", description: "روشن‌سازی پوست بعد از یک جلسه اسیدتراپی آلفاهیدروکسی اسید" }
    ],
    acceptingRequests: true,
    openForHiring: true
  },
  {
    id: "a5",
    name: "آرشام ناصری",
    role: "artist",
    phone: "09120000001",
    email: "arsham@gmail.com",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=800&auto=format&fit=crop",
    title: "استایلیست ارشد و کات‌کار خلاق موی ژورنالی",
    city: "تهران",
    bio: "دارای مدرک پیکس کات از آکادمی ساسون لندن. ابداع‌کننده روش‌های کوتاهی ارگونومیک جهت فرم‌دهی ماندگار به موهای لخت و فر بدون نیاز به سشوار روزانه.",
    salonName: "مجموعه تخصصی داماد جنتلمن",
    managerId: "m4",
    yearsOfExperience: 10,
    certifications: ["Sassoon Academy London - Advanced Pixie Cut", "مقام سوم مسابقات بین‌المللی پیرایش دبی ۲۰۱۹"],
    skills: [
      { name: "کوپ ژورنالی و شینیون", category: "استایل مو" }
    ],
    rating: 4.91,
    reviews: [
      { id: "rev5", reviewerName: "روشنک پناهی", reviewerAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=100&auto=format&fit=crop", rating: 5, comment: "واقعا کار قیچی آرشام تکه! بعد شستشو موهام خودش خوش‌حالت می‌ایسته و اصلا احتیاجی به اتو و سشوار نیست.", date: "1405/04/11" }
    ],
    portfolio: [
      { id: "p5_1", imageUrl: "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?q=80&w=400&auto=format&fit=crop", title: "کوتاهی پیکسی نامتقارن", description: "تکنیک آندرکات روی موی پرپشت تیره" }
    ],
    acceptingRequests: false,
    openForHiring: true
  },
  {
    id: "a6",
    name: "رعنا کیمیایی",
    role: "artist",
    phone: "09120000002",
    email: "rana@gmail.com",
    avatar: "https://images.unsplash.com/photo-1594744803329-e58b31de215f?q=80&w=150&auto=format&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1582233479366-6d38bc390a08?q=80&w=800&auto=format&fit=crop",
    title: "متخصص میکروبلیدینگ مگاوالیوم و طراحی ابرو",
    city: "مشهد",
    bio: "دارای رتبه مستر گرند آکادمی فی اروپا (Phibrows). اجرای متدهای نچرال نانوبروز و شیدینگ لب با پیگمنت‌های کاملا گیاهی و بدون تغییر رنگ.",
    salonName: "اسپا و عمارت زیبایی گلو-ناین (Glow9)",
    managerId: "m3",
    yearsOfExperience: 7,
    certifications: ["Phibrows Royal Artist Certificate", "گواهی ایمنی بهداشت محیط از وزارت بهداشت"],
    skills: [
      { name: "میکروبلیدینگ و فیبروز", category: "تاتو و ابرو" },
      { name: "اکستنشن مژه کلاسیک و والیوم", category: "مژه" }
    ],
    rating: 4.86,
    reviews: [],
    portfolio: [],
    acceptingRequests: true,
    openForHiring: true
  },

  // --- CLIENTS (4) ---
  {
    id: "c1",
    name: "الناز افشار",
    role: "client",
    phone: "09120000003",
    avatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=150&auto=format&fit=crop",
    title: "بلاگر تخصصی سبک زندگی و مد",
    city: "تهران",
    bio: "علاقه‌مند به متدهای روز میکاپ نچرال و طرح‌های مینی‌مال ناخن. مراجع همیشگی سالن‌های لوکس جردن."
  },
  {
    id: "c2",
    name: "نیلوفر خسروی",
    role: "client",
    phone: "09120000004",
    avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=150&auto=format&fit=crop",
    title: "طراح گرافیک ارشد",
    city: "اصفهان",
    bio: "عاشق کارهای هنری مینیاتوری هستم و همیشه دنبال ناخن‌کارهای خلاق با قلم‌مو می‌گردم."
  },
  {
    id: "c3",
    name: "مهسا کریمی",
    role: "client",
    phone: "09120000005",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=150&auto=format&fit=crop",
    title: "مترجم زبان فرانسوی",
    city: "شیراز",
    bio: "به سلامت و ارگانیک بودن مواد آرایشی، به‌خصوص رنگ مو اهمیت زیادی میدم."
  },
  {
    id: "c4",
    name: "پرستو صالحی",
    role: "client",
    phone: "09120000006",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop",
    title: "مدیر فروش برند پوشاک",
    city: "تهران",
    bio: "به خاطر جلسات مکرر نیاز به استایل و کوپ مرتب هفتگی دارم."
  }
];

export const seedPosts: Post[] = [
  {
    id: "post1",
    authorId: "a1",
    authorName: "سرنا ونس (موسوی)",
    authorRole: "artist",
    authorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop",
    content: "امروز میخوام یک تکنیک کلیدی برای حفظ شادابی موها بعد از دکلره‌های سنگین معرفی کنم. اولاپلکس شماره ۳ واقعا معجزه میکنه، به شرطی که هفته‌ای ۲ بار به مدت ۲۰ دقیقه روی موی نمدار بمونه. نمونه زیر کار جدید بالیاژ کاراملی من در خانه زیبایی لجند هست، چطور شده؟ 😍👇",
    image: "https://images.unsplash.com/photo-1562322140-8baeececf3df?q=80&w=600&auto=format&fit=crop",
    tag: "تجربه",
    createdAt: "امروز، ۱۲:۳۰",
    likesCount: 34,
    likedBy: ["c1", "m1", "a3"],
    comments: [
      {
        id: "c1_1",
        authorId: "m1",
        authorName: "مریم رادمنش",
        authorRole: "manager",
        authorAvatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=150&auto=format&fit=crop",
        content: "رنگساژش واقعا خیره‌کننده‌ست سرنا جان! افتخار می‌کنیم که شما سرپرست لاین رنگ لجند هستی. پرستیژ کار عالیه.",
        createdAt: "امروز، ۱۲:۴۵",
        likesCount: 12,
        likedBy: ["a1"]
      },
      {
        id: "c1_2",
        authorId: "c1",
        authorName: "الناز افشار",
        authorRole: "client",
        authorAvatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=150&auto=format&fit=crop",
        content: "وای من حتما باید برای هفته آینده باهاتون نوبت فیکس کنم! موهام شدیدا کدر شده.",
        createdAt: "امروز، ۱۳:۱۰",
        likesCount: 3,
        likedBy: ["a1"]
      }
    ]
  },
  {
    id: "post2",
    authorId: "m1",
    authorName: "مریم رادمنش",
    authorRole: "manager",
    authorAvatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=150&auto=format&fit=crop",
    content: "مژده به هنرمندان عرصه زیبایی! شعبه جدید خانه زیبایی لجند در زعفرانیه تهران به زودی افتتاح خواهد شد. ما به دنبال استخدام صمیمی‌ترین و حرفه‌ای‌ترین متخصصین در لاین‌های کاشت مژه مگاوالیوم، کانتورینگ صورت و طراحی ناخن هستیم. حقوق ثابت فوق‌العاده + پورسانت بی‌نظیر و مزایای رفاهی. اگر آماده‌اید جایگاه شغلی خود را دگرگون کنید، پروفایل خود را برای ما ارسال کنید یا زیر همین پست کامنت بگذارید. 🤝✨",
    image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=600&auto=format&fit=crop",
    tag: "استخدام",
    createdAt: "دیروز، ۱۰:۱۵",
    likesCount: 52,
    likedBy: ["a3", "a4", "a6", "c4"],
    comments: [
      {
        id: "c2_1",
        authorId: "a3",
        authorName: "غزل نیکو",
        authorRole: "artist",
        authorAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop",
        content: "مریم خانم عزیز، رزومه و آلبوم کارهای کاشت ژل خودم رو ارسال کردم. خیلی خوشحال میشم در مجموعه وزین شما همکاری داشته باشم.",
        createdAt: "دیروز، ۱۱:۰۰",
        likesCount: 8,
        likedBy: ["m1"]
      },
      {
        id: "c2_2",
        authorId: "a6",
        authorName: "رعنا کیمیایی",
        authorRole: "artist",
        authorAvatar: "https://images.unsplash.com/photo-1594744803329-e58b31de215f?q=80&w=150&auto=format&fit=crop",
        content: "شرایط بسیار ایده آلیه. من هم درخواست ثبت کردم برای لاین مژه و فیبروز ابرو.",
        createdAt: "دیروز، ۱۱:۳۰",
        likesCount: 4,
        likedBy: ["m1"]
      }
    ]
  },
  {
    id: "post3",
    authorId: "a3",
    authorName: "غزل نیکو",
    authorRole: "artist",
    authorAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop",
    content: "طراحی ظریف با دست روی کاشت قالب لمینت، کاری که دیروز روی ناخن‌های مشتری عزیزم نیلوفر جان انجام دادم. استفاده از طرح‌های مینیمال گل‌های بهاری این روزها ترند خیلی محبوبی شده. نظرتون چیه؟ هنر دست هم ارزش متمایزی داره 🌸💅",
    image: "https://images.unsplash.com/photo-1632345031435-8797b2d58045?q=80&w=600&auto=format&fit=crop",
    tag: "ترند",
    createdAt: "۲ روز پیش",
    likesCount: 41,
    likedBy: ["c2", "m3", "a1"],
    comments: [
      {
        id: "c3_1",
        authorId: "c2",
        authorName: "نیلوفر خسروی",
        authorRole: "client",
        authorAvatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=150&auto=format&fit=crop",
        content: "واقعا شاهکار کردی غزل جان! هرکی ناخن‌هامو میبینه اسم طراحشو میپرسه. خسته نباشی مهربونم ❤️",
        createdAt: "۲ روز پیش",
        likesCount: 5,
        likedBy: ["a3"]
      }
    ]
  },
  {
    id: "post4",
    authorId: "m3",
    authorName: "رکسانا بهرامی",
    authorRole: "manager",
    authorAvatar: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?q=80&w=150&auto=format&fit=crop",
    content: "امروز در مجموعه گلو-ناین میزبان یک پنل تخصصی گفتگو در رابطه با 'روانشناسی تعامل با مراجعین در صنعت زیبایی' بودیم. معتقدم مهارت فنی نیمی از راه است، اما نیمه دیگر، توانایی ما در درک حس خوب و آرامش بخشیدن به فردی است که روی صندلی ما می‌نشیند. مراجعین فقط برای تغییر ظاهر نمی‌آیند، آن‌ها برای تجربه حس ارزشمندی می‌آیند. تفکر شما چیست؟",
    tag: "آموزش",
    createdAt: "۳ روز پیش",
    likesCount: 29,
    likedBy: ["m1", "m2", "a2", "a5"],
    comments: [
      {
        id: "c4_1",
        authorId: "a2",
        authorName: "یاسمن طاهری",
        authorRole: "artist",
        authorAvatar: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?q=80&w=150&auto=format&fit=crop",
        content: "صد درصد موافقم! خیلی اوقات مراجعین خسته از کار روزانه به سالن میان و یک رفتار گرم و محترمانه از طرف آرتیست می‌تونه حال کل روزشون رو خوب کنه.",
        createdAt: "۳ روز پیش",
        likesCount: 7,
        likedBy: ["m3"]
      }
    ]
  },
  {
    id: "post5",
    authorId: "c1",
    authorName: "الناز افشار",
    authorRole: "client",
    authorAvatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=150&auto=format&fit=crop",
    content: "امروز می‌خواستم یک تجربه صمیمانه رو باهاتون به اشتراک بذارم. برای اولین بار رفتم پیش یاسمن طاهری عزیز برای گریم ملایم برای عکاسی. برخورد فوق‌العاده صمیمانه، استفاده از متریال باکیفیت و بدون بو و کانتورینگ بسیار عالی از نکات مثبتشون بود. به نظرم یک آرتیست نمونه اونه که روی خواست مشتری پافشاری نکنه و مشورت بده. قطعاً پیشنهادشون می‌کنم! 🌟",
    tag: "تجربه",
    createdAt: "۴ روز پیش",
    likesCount: 19,
    likedBy: ["a2", "c2", "m2"],
    comments: [
      {
        id: "c5_1",
        authorId: "a2",
        authorName: "یاسمن طاهری",
        authorRole: "artist",
        authorAvatar: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?q=80&w=150&auto=format&fit=crop",
        content: "ممنون از لطف و محبت شما الناز عزیزم! میزبانی از شما باعث افتخار بزرگ من بود. 🥰❤️",
        createdAt: "۴ روز پیش",
        likesCount: 2,
        likedBy: ["c1"]
      }
    ]
  },
  {
    id: "post6",
    authorId: "a5",
    authorName: "آرشام ناصری",
    authorRole: "artist",
    authorAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop",
    content: "کوتاهی پیکسی ژورنالی خلاق با زوایای تند، مناسب برای کسانی که دوست دارند استایل‌های جسورانه داشته باشند و فرم استخوان فک به خوبی نمایان بشه. استفاده از واکس موی ارگانیک برای فینیش نهایی. نظر شما در مورد کارهای پیکسی مدرن چیه؟ 💇‍♂️🔥",
    image: "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?q=80&w=600&auto=format&fit=crop",
    tag: "ترند",
    createdAt: "۵ روز پیش",
    likesCount: 26,
    likedBy: ["a1", "c4", "m4"],
    comments: []
  },
  {
    id: "post7",
    authorId: "m4",
    authorName: "کامران کیانی",
    authorRole: "manager",
    authorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop",
    content: "در مجموعه تخصصی داماد جنتلمن، ما به دنبال ایجاد یک استاندارد جدید در خدمات مردانه هستیم. گریم داماد دیگر یک روتین ساده نیست، بلکه یک هنر تلفیقی برای همخوانی در عکاسی ۴K است. همکارانی که در لاین فیشیال و زاویه‌سازی ریش تخصص دارند، رزومه‌اشان را ارسال کنند. آماده ارتقای کیفیت تیم خود هستیم.",
    tag: "استخدام",
    createdAt: "۶ روز پیش",
    likesCount: 31,
    likedBy: ["a5", "m1"],
    comments: []
  },
  {
    id: "post8",
    authorId: "a4",
    authorName: "الهام حسینی",
    authorRole: "artist",
    authorAvatar: "https://images.unsplash.com/photo-1554151228-14d9def656e4?q=80&w=150&auto=format&fit=crop",
    content: "چرا فیشیال پوست باید به طور منظم هر ۲۸ روز یکبار تکرار بشه؟ چرخه بازسازی سلول‌های اپیدرم پوست انسان به طور متوسط ۲۸ روز طول می‌کشه. با برداشتن سلول‌های مرده در انتهای این چرخه، به سلول‌های جوان اجازه تنفس و بازسازی می‌دیم. پس فیشیال فقط یک کار لوکس نیست، بلکه علم سلامت پوست هست. 🧖‍♀️✨",
    tag: "آموزش",
    createdAt: "۱ هفته پیش",
    likesCount: 22,
    likedBy: ["c3", "m2", "a2"],
    comments: []
  }
];

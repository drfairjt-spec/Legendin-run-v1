export type UserRole = "client" | "artist" | "manager" | "service-staff";

export interface Skill {
  name: string;
  category: string; // e.g. "رنگ مو", "ناخن", "میکاپ", "پوست"
  level?: number; // 0-100 progress percentage
}

export interface PortfolioItem {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
}

export interface Review {
  id: string;
  reviewerName: string;
  reviewerAvatar: string;
  rating: number; // 1-5
  comment: string;
  date: string; // Shamsi format, e.g. "1405/04/10"
}

export interface WorkingHours {
  day: "شنبه" | "یکشنبه" | "دوشنبه" | "سه‌شنبه" | "چهارشنبه" | "پنجشنبه" | "جمعه";
  isOpen: boolean;
  openTime?: string; // "HH:MM"
  closeTime?: string;
}

export interface Holiday {
  id: string;
  title: string; // Farsi label, e.g. "تعطیل رسمی" or "تعطیلی اختصاصی سالن"
  date: string; // Shamsi date string, same format already used elsewhere in the project
  type: "official" | "salonSpecific";
}

export interface Amenity {
  id: string;
  label: string; // Farsi, e.g. "پارکینگ", "فضای استراحت", "فضای اسموک", "کافی بار"
  available: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: string; // Shamsi, same convention as Post.createdAt
  isPinned?: boolean;
}

export interface Salon {
  id: string;
  managerId: string; // links to User.id where role === "manager"
  province: string;
  city: string;
  address: string;
  lat?: number;
  lng?: number;
  workingHours: WorkingHours[];
  holidays: Holiday[];
  amenities: Amenity[];
  announcements: Announcement[];
}

export interface Service {
  id: string;
  parentServiceId?: string; // null/undefined = top-level line, e.g. "لاین ناخن"
  name: string; // Farsi, e.g. "مانیکور", "کاشت", "کاور", "لاک‌ژل"
  durationMinutes: number;
  price: number;
  currency: "تومان"; // keep Farsi currency label, matching existing offerAmount strings in data.ts
}

export interface StaffContract {
  contractType: "درصدی" | "اجاره‌ای" | "حقوق ثابت";
  startDate: string; // Shamsi
  endDate?: string;
  amount: string; // Farsi-formatted, matching the existing offerAmount convention in HiringOffer
  contractFileUrl?: string;
  guaranteeType?: "سفته" | "چک";
  guaranteeFileUrl?: string;
}

export interface LeaveRequest {
  id: string;
  staffId: string;
  startDate: string;
  endDate: string;
  requiresApproval: boolean; // true only when contract.contractType === "حقوق ثابت"
  status: "pending" | "accepted" | "declined" | "logged"; // "logged" = auto-recorded for درصدی/اجاره‌ای, no approval needed
  note?: string;
}

export type TransactionDirection = "income" | "cost";

export type TransactionCategory =
  // cost categories
  | "اجاره سالن"
  | "خرید و مایحتاج"
  | "قبوض"
  | "حقوق پرسنل"
  | "سایر هزینه"
  // income categories
  | "درآمد خدمات"        // normal completed bookings
  | "درآمد نوبت تخفیف‌دار" // claimed DiscountedSlot bookings, see prior upgrade doc
  | "سایر درآمد";

export interface Transaction {
  id: string;
  salonId: string;
  direction: TransactionDirection;
  category: TransactionCategory;
  amount: number; // Toman, always positive — direction determines sign in calculations
  date: string; // Shamsi
  description?: string;
  receiptUrl?: string;
  relatedStaffId?: string; // links to User.id of the artist/service-staff this transaction is about
  relatedRequestId?: string; // optional link back to the ClientRequest that generated this income
  createdAt: string;
}

export interface Discount {
  id: string;
  salonId: string;
  code?: string; // present only for client-specific codes
  scope: "عمومی" | "اختصاصی"; // general vs targeted
  targetClientId?: string;
  serviceId?: string; // optional: restrict discount to one Service
  percentOff?: number;
  amountOff?: number;
  validFrom: string;
  validTo?: string;
  createdByStaffId?: string; // supports "discount by non-fixed staff for a specific service" rule
}

export interface JobApplication {
  id: string;
  applicantId: string; // artist or service-staff applying
  applicantName: string;
  applicantPhone?: string;
  positionTitle?: string;
  resumeSummary?: string;
  resumeFileUrl?: string;
  resumeFileName?: string;
  resumeFileSize?: string;
  salonId: string;
  message: string;
  status: "pending" | "accepted" | "declined"; // reuse the exact same status union already used by HiringOffer/ClientRequest
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  phone: string;
  email?: string;
  avatar: string;
  coverImage?: string;
  title: string; // e.g. "متخصص میکاپ عروس", "مدیر سالن لاوین"
  city: string; // e.g. "تهران", "اصفهان", "شیراز"
  bio: string;
  
  // Role-specific Rich Profile Data
  yearsOfExperience?: number;
  certifications?: string[];
  skills?: Skill[];
  portfolio?: PortfolioItem[];
  reviews?: Review[];
  rating?: number;
  resumeText?: string;
  isVerified?: boolean;
  uploadedCertificates?: {
    id: string;
    title: string;
    documentUrl: string;
    status: "pending" | "approved" | "rejected";
    uploadedAt: string;
  }[];
  
  // Toggles for availability
  acceptingRequests?: boolean; // پذیرش درخواست مشتری
  openForHiring?: boolean; // آماده به کار (for artists) or در حال استخدام (for managers)
  
  // For Salon Managers / Salons
  salonName?: string;
  salonLocation?: string;
  salonDescription?: string;
  jobDescription?: string;
  jobOpenings?: {
    id: string;
    title: string;
    department: string;
    contractType: "درصدی" | "اجاره صندلی" | "حقوق ثابت";
    description: string;
    requirements: string[];
    benefits: string[];
  }[];
  managerId?: string; // Links artist to salon manager ID
  workingHoursSchedule?: { day: string; hours: string }[];
  socialLinks?: { instagram?: string; telegram?: string; website?: string };
  contactAllowed?: boolean;

  // Priority 2: assigned bookable services
  assignedServiceIds?: string[]; // can reference either parent or child Service.id

  // Priority 3: contract data
  contract?: StaffContract;

  // VIP & Loyalty status for Client role
  isVip?: boolean;
  isLoyalClient?: boolean;
  loyalToStaffIds?: string[];
}

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorRole: UserRole;
  content: string;
  createdAt: string; // Shamsi or friendly time
  likesCount: number;
  likedBy: string[]; // User IDs who liked the comment
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorRole: UserRole;
  content: string;
  image?: string;
  tag?: string; // e.g. "آموزش", "تجربه", "استخدام", "ترند"
  createdAt: string; // Shamsi time
  likesCount: number;
  likedBy: string[]; // User IDs who liked the post
  comments: Comment[];
}

export interface HiringOffer {
  id: string;
  managerId: string;
  managerName: string;
  salonName: string;
  artistId: string;
  artistName: string;
  message: string;
  offerAmount?: string; // e.g., "۱۰,۰۰۰,۰۰۰ تومان"
  status: "pending" | "accepted" | "declined";
  createdAt: string; // Shamsi date
}

export type CancellationReasonCategory =
  | "تغییر برنامه"
  | "پیدا کردن گزینه بهتر"
  | "مشکل مالی"
  | "مشکل در زمان‌بندی"
  | "نارضایتی از پاسخ‌گویی متخصص"
  | "سایر";

export interface CancellationDetails {
  reasonCategory: CancellationReasonCategory;
  reasonNote?: string; // required only when reasonCategory === "سایر"
  cancelledAt: string; // Shamsi, same convention as createdAt fields elsewhere
  feeAcknowledged: boolean; // client must explicitly confirm they saw the fee warning
  feeApplied: boolean;
  feeAmount?: number; // computed at cancellation time, see TASK-17
}

export interface ClientRequest {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  targetId: string; // Artist or Salon ID
  targetName: string;
  targetType: "artist" | "salon";
  serviceType: string;
  preferredDate: string; // Shamsi, e.g. "1405/04/12"
  preferredTime: string; // HH:MM
  note: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  createdAt: string; // Shamsi date

  // Priority 2: Service catalog reference
  serviceId?: string;
  price?: number; // Toman, optional — undefined means "no fee can be calculated, show generic warning only"
  cancellation?: CancellationDetails;
}

export interface DiscountedSlot {
  id: string;
  originalRequestId: string; // ClientRequest.id that was cancelled
  artistId: string;
  artistName: string;
  salonName?: string;
  serviceType: string; // mirrors ClientRequest.serviceType
  date: string; // copied from the cancelled request's preferredDate
  time: string; // copied from preferredTime
  originalPrice?: number;
  discountedPrice?: number;
  discountPercent: number; // see pricing rule below
  appCommissionPercent: number; // platform cut on this recovered booking
  status: "available" | "claimed" | "expired";
  createdAt: string;
  claimedByClientId?: string;
}

export interface ProfileStrengthItem {
  label: string;
  points: number;
  completed: boolean;
}

export interface ProfileStrength {
  percentage: number;
  checklist: ProfileStrengthItem[];
}

export interface MessageReply {
  id: string;
  senderId: string;
  senderName: string;
  senderSalonName?: string;
  body: string;
  createdAt: string;
}

export interface ColleagueMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderSalonName: string;
  receiverId: string;
  receiverName: string;
  receiverSalonName: string;
  subject: string;
  body: string;
  createdAt: string;
  isRead: boolean;
  replies: MessageReply[];
}


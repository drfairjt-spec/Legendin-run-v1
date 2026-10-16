import React, { useState } from "react";
import { User, Skill, PortfolioItem, Review, Post, Comment, UserRole, Transaction, HiringOffer, ClientRequest, LeaveRequest, JobApplication, DiscountedSlot } from "../types";
import { Award, Star, CheckCircle2, ShieldCheck, Sparkles, Plus, Image, Trash2, Calendar, Phone, Mail, ToggleLeft, ToggleRight, MapPin, Briefcase, MessageSquare, Heart, Send, Tag, AlertCircle, DollarSign, Inbox, Settings, Upload, Pencil, Search } from "lucide-react";
import { toPersianDigits, formatToman } from "../utils/shamsi";
import ArtistSkillMatrix from "./ArtistSkillMatrix";
import ArtistSkillRadar from "./ArtistSkillRadar";
import FinanceDashboard from "./FinanceDashboard";
import RequestsInbox from "./RequestsInbox";
import { SalonProfileHub } from "./SalonProfileHub";

const PRESET_POST_IMAGES = [
  "https://images.unsplash.com/photo-1562322140-8baeececf3df?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1632345031435-8797b2d58045?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=600&auto=format&fit=crop"
];

const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1621574539437-4b7cb63120b8?q=80&w=200&auto=format&fit=crop"
];

const PRESET_COVERS = [
  "https://images.unsplash.com/photo-1562322140-8baeececf3df?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1632345031435-8797b2d58045?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=1000&auto=format&fit=crop"
];

const TAG_TRANSLATIONS: Record<string, string> = {
  "تجربه": "تجربه و نمونه کار",
  "استخدام": "فرصت شغلی و استخدام",
  "ترند": "ترندهای زیبایی",
  "آموزش": "نکته آموزشی"
};

const TAG_COLORS: Record<string, string> = {
  "تجربه": "bg-indigo-50 text-indigo-700 border-indigo-100",
  "استخدام": "bg-amber-50 text-amber-700 border-amber-100",
  "ترند": "bg-emerald-50 text-emerald-700 border-emerald-100",
  "آموزش": "bg-purple-50 text-purple-700 border-purple-100"
};

const getRoleBadge = (role?: UserRole | string) => {
  switch (role) {
    case "manager":
      return { label: "مدیریت سالن", color: "bg-purple-50 text-purple-700 border-purple-100" };
    case "artist":
      return { label: "آرتیست زیبایی", color: "bg-emerald-50 text-emerald-700 border-emerald-100" };
    case "client":
      return { label: "مشتری عادی", color: "bg-blue-50 text-blue-700 border-blue-100" };
    default:
      return { label: "عضو جامعه", color: "bg-slate-50 text-slate-700 border-slate-100" };
  }
};

interface UserProfileProps {
  currentUser: User;
  profileUser: User; // The user whose profile is being viewed (can be the currentUser or someone else)
  onUpdateCurrentUser: (updated: User) => void;
  onUpdateUsersList: (updatedUsers: User[]) => void;
  allUsers: User[];
  posts: Post[];
  onUpdatePosts: (updatedPosts: Post[]) => void;
  transactions: Transaction[];
  onUpdateTransactions: (updated: Transaction[]) => void;
  hiringOffers?: HiringOffer[];
  onUpdateHiringOffers?: (offers: HiringOffer[]) => void;
  clientRequests?: ClientRequest[];
  onUpdateClientRequests?: (requests: ClientRequest[]) => void;
  leaveRequests?: LeaveRequest[];
  onUpdateLeaveRequests?: (requests: LeaveRequest[]) => void;
  jobApplications?: JobApplication[];
  onUpdateJobApplications?: (apps: JobApplication[]) => void;
  onAddDiscountedSlot?: (newSlot: DiscountedSlot) => void;
  onSelectUser?: (user: User) => void;
}

export default function UserProfile({
  currentUser,
  profileUser,
  onUpdateCurrentUser,
  onUpdateUsersList,
  allUsers = [],
  posts = [],
  onUpdatePosts,
  transactions = [],
  onUpdateTransactions,
  hiringOffers = [],
  onUpdateHiringOffers = () => {},
  clientRequests = [],
  onUpdateClientRequests = () => {},
  leaveRequests = [],
  onUpdateLeaveRequests = () => {},
  jobApplications = [],
  onUpdateJobApplications = () => {},
  onAddDiscountedSlot = () => {},
  onSelectUser
}: UserProfileProps) {
  const isOwnProfile = currentUser.id === profileUser.id;
  const canEditProfile = isOwnProfile || (currentUser.role === "manager" && profileUser.role === "artist");
  const [viewingPublicSalon, setViewingPublicSalon] = useState(false);

  const handleImageBrowse = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("لطفاً فقط فایل‌های تصویری انتخاب کنید.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        callback(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Local editing states (only used if isOwnProfile)
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioText, setBioText] = useState(profileUser.bio || "");
  
  // Full Profile Edit States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(profileUser.name);
  const [editTitle, setEditTitle] = useState(profileUser.title);
  const [editPhone, setEditPhone] = useState(profileUser.phone);
  const [editEmail, setEditEmail] = useState(profileUser.email || "");
  const [editCity, setEditCity] = useState(profileUser.city);
  const [editExp, setEditExp] = useState(profileUser.yearsOfExperience || 0);
  const [editAvatar, setEditAvatar] = useState(profileUser.avatar);
  const [editCover, setEditCover] = useState(profileUser.coverImage || "");
  const [editSalonName, setEditSalonName] = useState(profileUser.salonName || "");
  const [editSalonLocation, setEditSalonLocation] = useState(profileUser.salonLocation || "");
  const [editSalonDesc, setEditSalonDesc] = useState(profileUser.salonDescription || "");

  // Sync edit fields when profileUser or edit mode changes
  React.useEffect(() => {
    setEditName(profileUser.name);
    setEditTitle(profileUser.title);
    setEditPhone(profileUser.phone);
    setEditEmail(profileUser.email || "");
    setEditCity(profileUser.city);
    setEditExp(profileUser.yearsOfExperience || 0);
    setEditAvatar(profileUser.avatar);
    setEditCover(profileUser.coverImage || "");
    setEditSalonName(profileUser.salonName || "");
    setEditSalonLocation(profileUser.salonLocation || "");
    setEditSalonDesc(profileUser.salonDescription || "");
  }, [profileUser.id, isEditingProfile]);

  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillCategory, setNewSkillCategory] = useState("رنگ مو");
  
  const [newPortfolioTitle, setNewPortfolioTitle] = useState("");
  const [newPortfolioDesc, setNewPortfolioDesc] = useState("");
  const [newPortfolioImg, setNewPortfolioImg] = useState("");
  const [showAddPortfolio, setShowAddPortfolio] = useState(false);

  const [newCert, setNewCert] = useState("");
  const [newUploadCertTitle, setNewUploadCertTitle] = useState("");
  const [newUploadCertImg, setNewUploadCertImg] = useState("");
  const [showUploadCertForm, setShowUploadCertForm] = useState(false);
  const [selectedDocUrlForLightbox, setSelectedDocUrlForLightbox] = useState<string | null>(null);

  // Forum local states inside Profile
  const [profileNewPostText, setProfileNewPostText] = useState("");
  const [profileSelectedTag, setProfileSelectedTag] = useState("تجربه");
  const [profilePostImageUrl, setProfilePostImageUrl] = useState("");
  const [profileShowImageSelector, setProfileShowImageSelector] = useState(false);
  const [profileCommentInputs, setProfileCommentInputs] = useState<Record<string, string>>({});
  const [profileTab, setProfileTab] = useState<"resume" | "posts" | "finance" | "inbox">("resume");
  const [postIdToDelete, setPostIdToDelete] = useState<string | null>(null);
  const [isTerminatingContract, setIsTerminatingContract] = useState(false);

  // Calculate profile strength & construct checklist
  const getProfileStrengthDetails = (user: User) => {
    const checklist = [
      { key: "avatar", label: "عکس پرسنلی رزومه", points: 15, completed: !!(user.avatar && !user.avatar.includes("default")) },
      { key: "bio", label: "درباره من و بیوگرافی تفصیلی", points: 15, completed: !!(user.bio && user.bio.trim().length > 10) },
      { key: "skills", label: "ثبت حداقل ۳ تخصص اصلی", points: 15, completed: !!(user.skills && user.skills.length >= 3) },
      { key: "portfolio", label: "افزودن حداقل ۳ نمونه‌کار در آلبوم", points: 15, completed: !!(user.portfolio && user.portfolio.length >= 3) },
      { key: "experience", label: "تعیین دقیق میزان سابقه کار", points: 15, completed: !!(user.yearsOfExperience !== undefined && user.yearsOfExperience > 0) },
      { key: "certs", label: "بارگذاری مدارک و گواهینامه‌ها", points: 10, completed: !!(user.certifications && user.certifications.length > 0) },
      { key: "phone", label: "ثبت و احراز شماره تماس", points: 15, completed: !!user.phone }
    ];

    const completedPoints = checklist.reduce((sum, item) => sum + (item.completed ? item.points : 0), 0);
    return {
      percentage: Math.min(completedPoints, 100),
      checklist
    };
  };

  const { percentage, checklist } = getProfileStrengthDetails(profileUser);

  // Profile Save Actions
  const handleSaveBio = () => {
    const updated = { ...profileUser, bio: bioText };
    updateUserAcrossState(updated);
    setIsEditingBio(false);
  };

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;

    const newSkill: Skill = { name: newSkillName.trim(), category: newSkillCategory };
    const currentSkills = profileUser.skills || [];
    
    // Avoid duplicates
    if (currentSkills.some(s => s.name === newSkill.name)) return;

    const updated = { ...profileUser, skills: [...currentSkills, newSkill] };
    updateUserAcrossState(updated);
    setNewSkillName("");
  };

  const handleRemoveSkill = (skillName: string) => {
    const currentSkills = profileUser.skills || [];
    const updated = { ...profileUser, skills: currentSkills.filter(s => s.name !== skillName) };
    updateUserAcrossState(updated);
  };

  const handleAddPortfolioItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPortfolioTitle.trim()) return;

    const defaultImg = newPortfolioImg || "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=400&auto=format&fit=crop";
    const newItem: PortfolioItem = {
      id: "port-" + Math.random().toString(36).substr(2, 9),
      imageUrl: defaultImg,
      title: newPortfolioTitle.trim(),
      description: newPortfolioDesc.trim()
    };

    const currentPortfolio = profileUser.portfolio || [];
    const updated = { ...profileUser, portfolio: [...currentPortfolio, newItem] };
    updateUserAcrossState(updated);
    
    setNewPortfolioTitle("");
    setNewPortfolioDesc("");
    setNewPortfolioImg("");
    setShowAddPortfolio(false);
  };

  const handleRemovePortfolioItem = (itemId: string) => {
    const currentPortfolio = profileUser.portfolio || [];
    const updated = { ...profileUser, portfolio: currentPortfolio.filter(item => item.id !== itemId) };
    updateUserAcrossState(updated);
  };

  const handleAddCertification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCert.trim()) return;

    const currentCerts = profileUser.certifications || [];
    if (currentCerts.includes(newCert.trim())) return;

    const updated = { ...profileUser, certifications: [...currentCerts, newCert.trim()] };
    updateUserAcrossState(updated);
    setNewCert("");
  };

  const handleRemoveCertification = (certName: string) => {
    const currentCerts = profileUser.certifications || [];
    const updated = { ...profileUser, certifications: currentCerts.filter(c => c !== certName) };
    updateUserAcrossState(updated);
  };

  const handleAddUploadedCertificate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUploadCertTitle.trim() || !newUploadCertImg.trim()) {
      alert("لطفاً عنوان مدرک و تصویر یا فایل سند آن را بارگذاری کنید.");
      return;
    }

    const currentUploaded = profileUser.uploadedCertificates || [];
    const newDoc = {
      id: "uploaded-cert-" + Math.random().toString(36).substr(2, 9),
      title: newUploadCertTitle.trim(),
      documentUrl: newUploadCertImg.trim(),
      status: "pending" as const,
      uploadedAt: "1405/04/12"
    };

    const updated = {
      ...profileUser,
      uploadedCertificates: [...currentUploaded, newDoc]
    };
    updateUserAcrossState(updated);
    setNewUploadCertTitle("");
    setNewUploadCertImg("");
    setShowUploadCertForm(false);
    alert("مدرک آموزشی شما با موفقیت بارگذاری شد و در صف تایید مدیریت سالن قرار گرفت! ✨");
  };

  const handleRemoveUploadedCertificate = (id: string) => {
    if (confirm("آیا از حذف این سند گواهینامه اطمینان دارید؟")) {
      const currentUploaded = profileUser.uploadedCertificates || [];
      const updated = {
        ...profileUser,
        uploadedCertificates: currentUploaded.filter(c => c.id !== id)
      };
      updateUserAcrossState(updated);
    }
  };

  // Helper to sync state both for currentUser (if own profile) and main users database
  const updateUserAcrossState = (updated: User) => {
    if (isOwnProfile) {
      onUpdateCurrentUser(updated);
    }
    const updatedList = allUsers.map(u => (u.id === updated.id ? updated : u));
    onUpdateUsersList(updatedList);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      alert("نام و نام خانوادگی نمی‌تواند خالی باشد.");
      return;
    }
    if (!editTitle.trim()) {
      alert("عنوان تخصصی نمی‌تواند خالی باشد.");
      return;
    }

    const updated: User = {
      ...profileUser,
      name: editName.trim(),
      title: editTitle.trim(),
      phone: editPhone.trim(),
      email: editEmail.trim() || undefined,
      city: editCity.trim(),
      yearsOfExperience: profileUser.role === "client" ? undefined : Number(editExp),
      avatar: editAvatar.trim(),
      coverImage: editCover.trim() || undefined,
      salonName: profileUser.role === "manager" ? editSalonName.trim() || undefined : profileUser.salonName,
      salonLocation: profileUser.role === "manager" ? editSalonLocation.trim() || undefined : profileUser.salonLocation,
      salonDescription: profileUser.role === "manager" ? editSalonDesc.trim() || undefined : profileUser.salonDescription,
    };

    updateUserAcrossState(updated);
    setIsEditingProfile(false);
  };

  const toggleAvailability = (key: "acceptingRequests" | "openForHiring") => {
    const updated = { 
      ...profileUser, 
      [key]: !profileUser[key] 
    };
    updateUserAcrossState(updated);
  };

  const profilePosts = React.useMemo(() => {
    return (posts || []).filter(p => p?.authorId === profileUser?.id);
  }, [posts, profileUser?.id]);

  const handleProfileCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.id === "guest") {
      alert("کاربر گرامی، برای انتشار پست جدید ابتدا باید وارد حساب کاربری خود شوید یا ثبت‌نام کنید.");
      return;
    }
    if (!profileNewPostText.trim()) return;

    const newPost: Post = {
      id: "post-" + Math.random().toString(36).substr(2, 9),
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      authorAvatar: currentUser.avatar,
      content: profileNewPostText,
      image: profilePostImageUrl || undefined,
      tag: profileSelectedTag,
      createdAt: "همین الان",
      likesCount: 0,
      likedBy: [],
      comments: []
    };

    onUpdatePosts([newPost, ...posts]);
    setProfileNewPostText("");
    setProfilePostImageUrl("");
    setProfileShowImageSelector(false);
  };

  const handleProfileLikePost = (postId: string) => {
    if (currentUser.id === "guest") {
      alert("کاربر گرامی، برای لایک کردن پست‌ها ابتدا باید وارد حساب کاربری خود شوید یا ثبت‌نام کنید.");
      return;
    }
    const updated = posts.map(p => {
      if (p.id === postId) {
        const likedList = p.likedBy || [];
        const isLiked = likedList.includes(currentUser.id);
        const likedBy = isLiked 
          ? likedList.filter(id => id !== currentUser.id)
          : [...likedList, currentUser.id];
        return {
          ...p,
          likedBy,
          likesCount: likedBy.length
        };
      }
      return p;
    });
    onUpdatePosts(updated);
  };

  const handleProfileDeletePost = (postId: string) => {
    const updated = (posts || []).filter(p => p.id !== postId);
    onUpdatePosts(updated);
    setPostIdToDelete(null);
  };

  const handleProfileAddComment = (postId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.id === "guest") {
      alert("کاربر گرامی، برای ثبت نظر ابتدا باید وارد حساب کاربری خود شوید یا ثبت‌نام کنید.");
      return;
    }
    const text = profileCommentInputs[postId] || "";
    if (!text.trim()) return;

    const updated = posts.map(p => {
      if (p.id === postId) {
        const newComment: Comment = {
          id: "comment-" + Math.random().toString(36).substr(2, 9),
          authorId: currentUser.id,
          authorName: currentUser.name,
          authorAvatar: currentUser.avatar,
          authorRole: currentUser.role,
          content: text,
          createdAt: "همین الان",
          likesCount: 0,
          likedBy: []
        };
        return {
          ...p,
          comments: [...p.comments, newComment]
        };
      }
      return p;
    });

    onUpdatePosts(updated);
    setProfileCommentInputs({ ...profileCommentInputs, [postId]: "" });
  };

  if (profileUser.role === "manager" && (!isOwnProfile || viewingPublicSalon)) {
    return (
      <div className="space-y-4 text-right" dir="rtl">
        {isOwnProfile && viewingPublicSalon && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-bold shadow-sm">
            <span>شما در حال مشاهده پیش‌نمایش صفحه عمومی سالن خود (آنطور که مشتریان می‌بینند) هستید.</span>
            <button
              onClick={() => setViewingPublicSalon(false)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl cursor-pointer shrink-0 shadow-sm"
            >
              بازگشت به پنل مدیریت سالن
            </button>
          </div>
        )}
        <SalonProfileHub
          salonManager={profileUser}
          allUsers={allUsers}
          onSelectArtist={(artist) => {
            if (onSelectUser) onSelectUser(artist);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* Profile Cover & Header Banner */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="h-44 bg-slate-100 relative">
          <img
            src={profileUser.coverImage || "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=1200&auto=format&fit=crop"}
            alt="Cover"
            className="w-full h-full object-cover opacity-85"
          />
          {canEditProfile && (
            <div className="absolute top-3.5 left-3.5 pointer-events-none">
              <span className="pointer-events-auto bg-slate-900/70 text-white text-[10px] font-bold px-3 py-1.5 rounded-full backdrop-blur-xs shadow-xs">
                {isOwnProfile ? "پروفایل کاربری اختصاصی شما" : "پنل مدیریت مشخصات همکار"}
              </span>
            </div>
          )}
        </div>

        {/* Profile Stats Overview */}
        <div className="p-5.5 relative">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 -mt-16 md:-mt-20">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-4.5 text-center md:text-right">
              <div className="relative inline-block shrink-0 z-10">
                <img
                  src={profileUser.avatar}
                  alt={profileUser.name}
                  className="w-28 h-28 rounded-2xl object-cover border-4 border-white shadow-md"
                />
                {canEditProfile && (
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    title="ویرایش مشخصات پروفایل"
                    className="absolute -bottom-1 -right-1 w-7 h-7 bg-slate-900/45 hover:bg-[#0284c7]/90 text-white rounded-full backdrop-blur-xs transition-all shadow-sm flex items-center justify-center cursor-pointer border border-white/40 hover:scale-110 active:scale-95"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="space-y-1.5 pb-2">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <h2 className="text-lg font-bold text-slate-950">{profileUser.name}</h2>
                  {profileUser.role === "artist" && (
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-bold px-2 py-0.5 rounded-full">
                      هنرمند زیبایی ممیزی شده
                    </span>
                  )}
                  {profileUser.role === "manager" && (
                    <span className="bg-purple-50 text-purple-700 border border-purple-100 text-[9px] font-bold px-2 py-0.5 rounded-full">
                      مدیر و کارفرمای سالن
                    </span>
                  )}
                  {profileUser.role === "client" && (
                    <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[9px] font-bold px-2 py-0.5 rounded-full">
                      عضو فعال انجمن زیبایی
                    </span>
                  )}
                  {profileUser.isLoyalClient && (
                    <span className="bg-emerald-500 text-white shadow-xs text-[9px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 inline" /> مشتری وفادار تاییدشده
                    </span>
                  )}
                  {profileUser.isVip && (
                    <span className="bg-amber-500 text-white shadow-xs text-[9px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Award className="w-3 h-3 inline" /> اشتراک ویژه VIP
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-700 font-medium">{profileUser.title}</p>
                
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-[10px] text-slate-400 font-bold">
                  <span className="flex items-center gap-0.5"><MapPin className="w-3.5 h-3.5 shrink-0" /> {profileUser.city}</span>
                  {profileUser.yearsOfExperience !== undefined && (
                    <span>سابقه: {toPersianDigits(profileUser.yearsOfExperience)} سال کار تخصصی</span>
                  )}
                  {profileUser.rating && (
                    <span className="flex items-center gap-0.5 text-amber-600">
                      <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400 shrink-0" /> {toPersianDigits(profileUser.rating)} رضایت
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Toggle Settings for Profile */}
            {canEditProfile && profileUser.role !== "client" && (
              <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 space-y-2 text-xs font-bold self-stretch md:self-auto min-w-[200px]">
                <p className="text-[10px] text-slate-400 pb-1.5 border-b border-slate-200">تنظیمات در دسترس پلتفرم:</p>
                
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-600">پذیرش درخواست نوبت مشتری:</span>
                  <button 
                    onClick={() => toggleAvailability("acceptingRequests")}
                    className="text-slate-700 focus:outline-none"
                  >
                    {profileUser.acceptingRequests ? (
                      <ToggleRight className="w-8 h-8 text-[#0284c7] shrink-0" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-300 shrink-0" />
                    )}
                  </button>
                </div>

                {profileUser.role === "artist" && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-600">آماده به کار برای سالن‌ها:</span>
                    <button 
                      onClick={() => toggleAvailability("openForHiring")}
                      className="text-slate-700 focus:outline-none"
                    >
                      {profileUser.openForHiring ? (
                        <ToggleRight className="w-8 h-8 text-[#0284c7] shrink-0" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-slate-300 shrink-0" />
                      )}
                    </button>
                  </div>
                )}

                {profileUser.role === "manager" && (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-600">در حال استخدام پرسنل:</span>
                      <button 
                        onClick={() => toggleAvailability("openForHiring")}
                        className="text-slate-700 focus:outline-none"
                      >
                        {profileUser.openForHiring ? (
                          <ToggleRight className="w-8 h-8 text-[#0284c7] shrink-0" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-slate-300 shrink-0" />
                        )}
                      </button>
                    </div>
                    <div className="pt-2 border-t border-slate-200">
                      <button
                        onClick={() => setViewingPublicSalon(true)}
                        className="w-full py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                      >
                        مشاهده صفحه عمومی سالن
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Artist / Salon Manager viewing a Client Profile: Add to Loyal Clients button */}
            {!isOwnProfile && profileUser.role === "client" && (currentUser.role === "artist" || currentUser.role === "manager") && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 self-stretch md:self-auto flex flex-col justify-center gap-2 min-w-[240px]">
                <p className="text-[10px] text-slate-500 font-extrabold pb-1 border-b border-slate-200">سیستم وفاداری مشتریان سالن:</p>
                {profileUser.isLoyalClient ? (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-2xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>مشتری وفادار تاییدشده سالن</span>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      const updated = {
                        ...profileUser,
                        isLoyalClient: true,
                        loyalToStaffIds: [...(profileUser.loyalToStaffIds || []), currentUser.id]
                      };
                      updateUserAcrossState(updated);
                      alert(`مشتری عزیز (${profileUser.name}) با موفقیت به عنوان مشتری وفادار تاییدشده در سالن شما علامت‌گذاری شد و تب صندوق پیام‌های او فعال گردید! ✨`);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2.5 rounded-xl text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer w-full"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ افزودن به مشتریان وفادار</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Golden VIP Upgrade Banner for regular Clients */}
      {isOwnProfile && profileUser.role === "client" && !profileUser.isVip && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 rounded-2xl p-5 text-slate-950 shadow-md border border-amber-300 flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3.5 text-right">
            <div className="w-12 h-12 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
              <Award className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-950 flex items-center gap-1.5">
                ارتقا به عضویت ویژه (VIP لجندین)
                <span className="bg-slate-950 text-amber-300 text-[9px] font-black px-2 py-0.5 rounded-md">پرمیوم</span>
              </h3>
              <p className="text-xs text-slate-800 font-bold mt-1">
                دسترسی نامحدود به مشاور هوشمند AI، دایرکتوری استخدام آرتیست‌ها و صندوق پیام‌های مستقیم.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const updated = { ...profileUser, isVip: true };
              updateUserAcrossState(updated);
              alert("تبریک! حساب کاربری شما با موفقیت به سطح ویژه (VIP) ارتقا یافت. اکنون به مشاور هوشمند AI، بازار استخدام و صندوق پیام‌ها دسترسی کامل دارید! ✨");
            }}
            className="bg-slate-950 hover:bg-slate-900 text-amber-300 font-black px-6 py-3 rounded-xl text-xs shadow-lg transition-all active:scale-95 whitespace-nowrap cursor-pointer flex items-center gap-2 shrink-0"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            خرید اشتراک ماهانه VIP (فعال‌سازی فوری)
          </button>
        </div>
      )}

      {/* Profile Inner Navigation Tabs */}
      <div className="flex border border-slate-150 bg-white p-1.5 rounded-2xl gap-1.5 shadow-2xs my-4">
        <button
          onClick={() => setProfileTab("resume")}
          className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            profileTab === "resume"
              ? "bg-[#0284c7] text-white shadow-xs font-extrabold"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <Award className="w-4 h-4" />
          <span>رزومه و جزئیات فنی رزومه</span>
        </button>
        <button
          onClick={() => setProfileTab("posts")}
          className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            profileTab === "posts"
              ? "bg-[#0284c7] text-white shadow-xs font-extrabold"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>پست‌ها و مطالب منتشر شده در انجمن زیبایی ({toPersianDigits(profilePosts.length)})</span>
        </button>
        {profileUser.role === "manager" && isOwnProfile && (
          <>
            {/* Desktop only: Salon Finance Section */}
            <button
              id="desktop-finance-tab-btn"
              onClick={() => setProfileTab("finance")}
              className={`hidden lg:flex flex-1 text-center py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer items-center justify-center gap-1.5 ${
                profileTab === "finance"
                  ? "bg-[#0284c7] text-white shadow-xs font-extrabold"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>بخش مالی سالن (حسابداری)</span>
            </button>
            
            {/* Mobile only: Salon Inbox/Requests section */}
            <button
              id="mobile-inbox-tab-btn"
              onClick={() => setProfileTab("inbox")}
              className={`lg:hidden flex flex-1 text-center py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer items-center justify-center gap-1.5 ${
                profileTab === "inbox"
                  ? "bg-[#0284c7] text-white shadow-xs font-extrabold"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <Inbox className="w-4 h-4" />
              <span>صندوق</span>
            </button>
          </>
        )}
      </div>

      {profileTab === "finance" && (
        <FinanceDashboard
          salonId="salon-1"
          transactions={transactions}
          onUpdateTransactions={onUpdateTransactions}
          allUsers={allUsers}
        />
      )}

      {profileTab === "inbox" && (
        <RequestsInbox
          currentUser={currentUser}
          hiringOffers={hiringOffers}
          onUpdateHiringOffers={onUpdateHiringOffers}
          clientRequests={clientRequests}
          onUpdateClientRequests={onUpdateClientRequests}
          leaveRequests={leaveRequests}
          onUpdateLeaveRequests={onUpdateLeaveRequests}
          jobApplications={jobApplications}
          onUpdateJobApplications={onUpdateJobApplications}
          allUsers={allUsers}
          onUpdateUsersList={onUpdateUsersList}
          onAddDiscountedSlot={onAddDiscountedSlot}
        />
      )}

      {/* Grid Layout - Details & Profile Strength */}
      <div className={`grid lg:grid-cols-3 gap-6 ${(profileTab === "finance" || profileTab === "inbox") ? "hidden" : ""}`}>
        
        {/* RIGHT COLUMN: Profile details, Bio, Skills */}
        <div className="lg:col-span-2 space-y-6">
          {profileTab === "resume" ? (
            <>
              {/* Bio / About */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">درباره من و اهداف حرفه‌ای</h3>
                  {canEditProfile && (
                    <button
                      onClick={() => setIsEditingBio(!isEditingBio)}
                      className="text-xs text-[#0284c7] hover:underline font-bold"
                    >
                      {isEditingBio ? "لغو" : "ویرایش بیو"}
                    </button>
                  )}
                </div>

                {isEditingBio ? (
                  <div className="space-y-3">
                    <textarea
                      value={bioText}
                      onChange={(e) => setBioText(e.target.value)}
                      rows={4}
                      className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-olive-300 resize-none"
                      placeholder="رزومه، تجارب و افتخارات کاری خود را بنویسید..."
                    />
                    <button
                      onClick={handleSaveBio}
                      className="bg-[#0284c7] hover:bg-[#0369a1] text-white text-[10px] font-bold px-4 py-2 rounded-lg transition-all cursor-pointer"
                    >
                      ذخیره بیوگرافی
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                    {profileUser.bio || "بیوگرافی کاری هنوز ثبت نشده است."}
                  </p>
                )}
              </div>

              {/* Client VIP Status & Global Unlock Capability Card */}
              {profileUser.role === "client" && (
                <div className={`rounded-2xl p-6 shadow-md border transition-all ${
                  profileUser.isVip 
                    ? "bg-gradient-to-br from-amber-500/15 via-yellow-500/10 to-white border-amber-400" 
                    : "bg-white border-slate-200"
                }`}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-150/80 pb-4 mb-4">
                    <div className="flex items-center gap-3.5">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
                        profileUser.isVip ? "bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950" : "bg-slate-100 text-slate-500"
                      }`}>
                        <Sparkles className={`w-6 h-6 ${profileUser.isVip ? "animate-pulse" : ""}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-black text-slate-900">وضعیت اشتراک ویژه (VIP لجندین)</h3>
                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                            profileUser.isVip ? "bg-amber-500 text-white shadow-2xs" : "bg-slate-200 text-slate-700"
                          }`}>
                            {profileUser.isVip ? "عضو ویژه VIP فعال ✨" : "مشتری عادی (نیازمند ارتقا)"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 font-medium">
                          {profileUser.isVip 
                            ? "تمامی دسترسی‌های پرمیوم پلتفرم برای حساب کاربری شما در سراسر برنامه آزاد است."
                            : "با خرید اشتراک VIP، وضعیت isVip شما فعال شده و دسترسی‌های زیر به‌صورت فوری آزاد می‌شود."}
                        </p>
                      </div>
                    </div>

                    {isOwnProfile && !profileUser.isVip && (
                      <button
                        onClick={() => {
                          const updated = { ...profileUser, isVip: true };
                          updateUserAcrossState(updated);
                          alert("تبریک! وضعیت isVip حساب شما فعال شد. دسترسی‌های «صندوق پیام (Inbox)»، «بازار استخدام (Hiring)» و «دستیار هوشمند (AIAssistant)» هم‌اکنون در کل برنامه برای شما آزاد گردید! ✨");
                        }}
                        className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black px-6 py-3 rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-2 shrink-0 w-full sm:w-auto justify-center"
                      >
                        <Sparkles className="w-4 h-4" />
                        خرید اشتراک VIP و آزادسازی دسترسی‌ها
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-extrabold text-slate-700">دسترسی‌های خودکار مرتبط با اشتراک VIP در کل برنامه:</p>
                    <div className="grid sm:grid-cols-3 gap-3">
                      <div className={`p-3.5 rounded-xl border flex flex-col gap-1.5 ${
                        profileUser.isVip ? "bg-amber-50/60 border-amber-200 text-slate-900" : "bg-slate-50 border-slate-200 text-slate-500"
                      }`}>
                        <div className="flex items-center justify-between font-black text-xs">
                          <span className="flex items-center gap-1.5">
                            <Inbox className="w-4 h-4 text-emerald-600" />
                            صندوق پیام (Inbox)
                          </span>
                          <span className={`text-[9px] px-2 py-0.5 rounded-md font-extrabold ${
                            profileUser.isVip ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600"
                          }`}>
                            {profileUser.isVip ? "آزاد و فعال" : "قفل"}
                          </span>
                        </div>
                        <p className="text-[10.5px] leading-relaxed">ارتباط مستقیم با آرتیست‌ها، پیگیری نوبت‌ها و دریافت پیام‌های اختصاصی سالن.</p>
                      </div>

                      <div className={`p-3.5 rounded-xl border flex flex-col gap-1.5 ${
                        profileUser.isVip ? "bg-amber-50/60 border-amber-200 text-slate-900" : "bg-slate-50 border-slate-200 text-slate-500"
                      }`}>
                        <div className="flex items-center justify-between font-black text-xs">
                          <span className="flex items-center gap-1.5">
                            <Search className="w-4 h-4 text-blue-600" />
                            بازار استخدام (Hiring)
                          </span>
                          <span className={`text-[9px] px-2 py-0.5 rounded-md font-extrabold ${
                            profileUser.isVip ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600"
                          }`}>
                            {profileUser.isVip ? "آزاد و فعال" : "قفل"}
                          </span>
                        </div>
                        <p className="text-[10.5px] leading-relaxed">مشاهده دایرکتوری آرتیست‌ها، فرصت‌های شغلی و ارسال درخواست همکاری.</p>
                      </div>

                      <div className={`p-3.5 rounded-xl border flex flex-col gap-1.5 ${
                        profileUser.isVip ? "bg-amber-50/60 border-amber-200 text-slate-900" : "bg-slate-50 border-slate-200 text-slate-500"
                      }`}>
                        <div className="flex items-center justify-between font-black text-xs">
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            دستیار هوشمند (AIAssistant)
                          </span>
                          <span className={`text-[9px] px-2 py-0.5 rounded-md font-extrabold ${
                            profileUser.isVip ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600"
                          }`}>
                            {profileUser.isVip ? "آزاد و فعال" : "قفل"}
                          </span>
                        </div>
                        <p className="text-[10.5px] leading-relaxed">تحلیل چهره با هوش مصنوعی، دریافت مشاوره استایل و پیشنهادات تخصصی زیبایی.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Contract & Staff Management Section (Visible to Salon Manager viewing an Artist's profile) */}
              {currentUser.role === "manager" && profileUser.role === "artist" && (
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-150 pb-2">
                    <ShieldCheck className="w-5 h-5 text-[#0284c7]" />
                    <h3 className="text-xs font-black text-slate-800">پنل مدیریت رسمی پرسنلی (ویژه کارفرما)</h3>
                  </div>

                  {profileUser.contract ? (
                    <div className="bg-emerald-50/50 border border-emerald-200 p-4 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-emerald-800">وضعیت پرسنلی: استخدام فعال مجموعه</span>
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full">فعال</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs text-slate-700">
                        <p><strong>نوع قرارداد:</strong> {profileUser.contract.contractType}</p>
                        <p><strong>شرایط مالی:</strong> {profileUser.contract.amount}</p>
                        <p><strong>تضمین ثبت شده:</strong> {profileUser.contract.guaranteeType === "سفته" ? "سفته حسن انجام کار" : "چک معتبر بانکی"}</p>
                        <p><strong>تاریخ شروع:</strong> {toPersianDigits(profileUser.contract.startDate)}</p>
                      </div>

                      <div className="border-t border-slate-200/50 pt-3 flex justify-between items-center gap-4">
                        <p className="text-[10px] text-slate-500 leading-normal">در صورت لغو قرارداد یا عدم پایبندی به شرایط کتبی، می‌توانید همکاری را از این بخش قطع نمایید.</p>
                        {isTerminatingContract ? (
                          <div className="flex flex-col gap-2 bg-rose-50 border border-rose-200 p-3 rounded-xl">
                            <span className="text-[11px] font-black text-rose-800">آیا از قطع همکاری و لغو رسمی قرارداد اطمینان دارید؟</span>
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => {
                                  const updatedUser = { ...profileUser, contract: undefined };
                                  updateUserAcrossState(updatedUser);
                                  setIsTerminatingContract(false);
                                }}
                                className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black px-3 py-1.5 rounded-lg cursor-pointer"
                              >
                                بله، قطع همکاری
                              </button>
                              <button
                                onClick={() => setIsTerminatingContract(false)}
                                className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                              >
                                انصراف
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setIsTerminatingContract(true)}
                            className="bg-rose-600 hover:bg-rose-700 text-white text-[10.5px] font-black px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap"
                          >
                            قطع همکاری و تسویه حساب
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2 text-center">
                      <p className="text-xs text-slate-500 font-bold">این آرتیست در حال حاضر قرارداد فعالی با سالن شما ندارد.</p>
                      <p className="text-[10px] text-slate-400">می‌توانید با ارسال پیشنهاد همکاری از بخش استخدام، او را به پیوستن به مجموعه دعوت کنید.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Technical Radar Chart Matrix for Artists */}
              {profileUser.role === "artist" && (
                <ArtistSkillMatrix
                  currentUser={currentUser}
                  artists={(allUsers || []).filter(u => u.role === "artist")}
                  selectedArtistId={profileUser.id}
                />
              )}

              {/* Specialities / Skills */}
              {profileUser.role !== "client" && (profileUser.role === "artist" || isOwnProfile) && (
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">مهارت‌ها و لاین‌های فوق‌تخصصی</h3>
                  
                  {/* Skills Chips list */}
                  <div className="flex flex-wrap gap-2">
                    {profileUser.skills && profileUser.skills.length > 0 ? (
                      profileUser.skills.map((skill, idx) => (
                        <span 
                          key={idx} 
                          className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded-lg"
                        >
                          <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                          {skill.name} ({skill.category})
                          {canEditProfile && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSkill(skill.name)}
                              className="text-rose-500 hover:text-rose-700 mr-1.5 font-bold cursor-pointer"
                              title="حذف مهارت"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 font-bold">هیچ مهارتی ثبت نشده است.</p>
                    )}
                  </div>

                  {/* Add skill form */}
                  {canEditProfile && (
                    <form onSubmit={handleAddSkill} className="flex gap-2 items-center pt-3 border-t border-slate-100">
                      <input
                        type="text"
                        required
                        placeholder="عنوان مهارت (مثال: آمبره روسی)"
                        value={newSkillName}
                        onChange={(e) => setNewSkillName(e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:border-olive-300"
                      />
                      <select
                        value={newSkillCategory}
                        onChange={(e) => setNewSkillCategory(e.target.value)}
                        className="bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none cursor-pointer font-bold"
                      >
                        <option value="رنگ مو">رنگ مو</option>
                        <option value="ناخن">لاین ناخن</option>
                        <option value="میکاپ">میکاپ</option>
                        <option value="پوست">پوست و فیشیال</option>
                        <option value="مژه">مژه و ابرو</option>
                      </select>
                      <button
                        type="submit"
                        className="bg-[#0284c7] hover:bg-[#0369a1] text-white p-2 rounded-xl transition-all shadow-sm cursor-pointer shrink-0"
                        title="افزودن تخصص"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Dynamic Skills Radar Chart Visualizer */}
              {profileUser.role === "artist" && (
                <ArtistSkillRadar
                  profileUser={profileUser}
                  canEditProfile={canEditProfile}
                  onUpdateSkills={(updatedSkills) => {
                    updateUserAcrossState({
                      ...profileUser,
                      skills: updatedSkills
                    });
                  }}
                />
              )}

              {/* Portfolio Item Gallery */}
              {profileUser.role !== "client" && (profileUser.role === "artist" || isOwnProfile) && (
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">آلبوم تصاویر کارهای عملی و نمونه‌کارها</h3>
                    {canEditProfile && (
                      <button
                        onClick={() => setShowAddPortfolio(!showAddPortfolio)}
                        className="text-xs bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold px-3 py-1 rounded-lg transition-all"
                      >
                        {showAddPortfolio ? "بستن فرم" : "افزودن نمونه‌کار"}
                      </button>
                    )}
                  </div>

                  {/* Add Portfolio Form */}
                  {canEditProfile && showAddPortfolio && (
                    <form onSubmit={handleAddPortfolioItem} className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-3">
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-slate-400 font-bold mb-1">عنوان اثر:</label>
                          <input
                            type="text"
                            required
                            placeholder="مثال: فرنچ لمینت ناخن"
                            value={newPortfolioTitle}
                            onChange={(e) => setNewPortfolioTitle(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-700 outline-none focus:border-olive-300"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 font-bold mb-1">تصویر نمونه‌کار:</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="آدرس عکس یا انتخاب فایل..."
                              value={newPortfolioImg}
                              onChange={(e) => setNewPortfolioImg(e.target.value)}
                              className="flex-1 bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-700 outline-none focus:border-olive-300"
                            />
                            <label className="bg-[#0284c7]/10 hover:bg-[#0284c7]/20 text-[#0284c7] text-xs font-bold px-3 py-2 rounded-lg cursor-pointer flex items-center justify-center gap-1 transition-all shrink-0">
                              <Upload className="w-3.5 h-3.5" />
                              <span>فایل</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageBrowse(e, setNewPortfolioImg)}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold mb-1">توضیحات کوتاه یا تکنیک به کار رفته:</label>
                        <input
                          type="text"
                          placeholder="مثال: استفاده از تاپ شاین کریستالی با تکنیک روسی بدون سوهان زبر"
                          value={newPortfolioDesc}
                          onChange={(e) => setNewPortfolioDesc(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-700 outline-none focus:border-olive-300"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold py-2 rounded-xl transition-all cursor-pointer"
                      >
                        انتشار در آلبوم
                      </button>
                    </form>
                  )}

                  {/* Photo grid */}
                  <div className="grid sm:grid-cols-3 gap-4">
                    {profileUser.portfolio && profileUser.portfolio.length > 0 ? (
                      profileUser.portfolio.map((item) => (
                        <div 
                          key={item.id} 
                          className="group/item relative bg-slate-50 border border-slate-100 rounded-xl overflow-hidden shadow-2xs"
                        >
                          <img 
                            src={item.imageUrl} 
                            alt={item.title} 
                            className="w-full aspect-square object-cover group-hover:scale-105 transition-all duration-300" 
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-slate-900/80 p-2.5 text-white transform translate-y-2 group-hover/item:translate-y-0 transition-transform">
                            <h4 className="text-[10px] font-bold truncate">{item.title}</h4>
                            <p className="text-[8px] text-slate-300 truncate mt-0.5">{item.description}</p>
                          </div>

                          {canEditProfile && (
                            <button
                              type="button"
                              onClick={() => handleRemovePortfolioItem(item.id)}
                              className="absolute top-2 right-2 bg-rose-600/95 hover:bg-rose-700 text-white p-1 rounded-lg shadow-sm transition-all"
                              title="حذف نمونه‌کار"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="col-span-3 text-center p-8 border-2 border-dashed border-slate-150 rounded-xl">
                        <p className="text-xs text-slate-400 font-bold">آلبوم تصاویر هنوز خالی است.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Certifications list */}
              {profileUser.role !== "client" && (profileUser.role === "artist" || isOwnProfile) && (
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                    <div className="space-y-0.5">
                      <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">گواهینامه‌ها، مدارک و افتخارات</h3>
                      <p className="text-[10px] text-slate-400 font-bold">مهارت‌ها، تخصص‌ها و گواهی‌نامه‌های احراز شده شما</p>
                    </div>
                    {canEditProfile && (
                      <button
                        onClick={() => setShowUploadCertForm(!showUploadCertForm)}
                        className="text-[10.5px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold px-3 py-1.5 rounded-xl border border-indigo-100 transition-all flex items-center gap-1 cursor-pointer"
                      >
                        {showUploadCertForm ? "بستن فرم آپلود" : "آپلود سند تصویری مدرک"}
                      </button>
                    )}
                  </div>
                  
                  {/* Standard Text Certifications */}
                  <div className="space-y-3">
                    <h4 className="text-[10.5px] font-black text-slate-500">لیست گواهینامه‌ها و سوابق:</h4>
                    <ul className="grid sm:grid-cols-2 gap-2">
                      {profileUser.certifications && profileUser.certifications.length > 0 ? (
                        profileUser.certifications.map((cert, idx) => (
                          <li 
                            key={idx} 
                            className="bg-slate-50/75 border border-slate-150 rounded-xl p-3 flex items-center justify-between text-[11px] text-slate-700"
                          >
                            <span className="flex items-center gap-1.5 font-bold text-slate-800">
                              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                              <span className="truncate">{cert}</span>
                            </span>
                            {canEditProfile && (
                              <button
                                type="button"
                                onClick={() => handleRemoveCertification(cert)}
                                className="text-rose-500 hover:text-rose-700 font-bold text-[10px] cursor-pointer"
                              >
                                حذف
                              </button>
                            )}
                          </li>
                        ))
                      ) : (
                        <p className="text-[10.5px] text-slate-400 font-bold col-span-2">هیچ سابقه متنی ثبت نشده است.</p>
                      )}
                    </ul>

                    {canEditProfile && (
                      <form onSubmit={handleAddCertification} className="flex gap-2 items-center pt-1.5">
                        <input
                          type="text"
                          required
                          placeholder="عنوان مدرک جدید (مثال: دیپلم پلاتینیوم لورآل)"
                          value={newCert}
                          onChange={(e) => setNewCert(e.target.value)}
                          className="flex-1 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:border-[#0284c7]"
                        />
                        <button
                          type="submit"
                          className="bg-[#0284c7] hover:bg-[#0369a1] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                        >
                          ثبت سابقه
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Upload Certificate Document Form */}
                  {canEditProfile && showUploadCertForm && (
                    <form onSubmit={handleAddUploadedCertificate} className="p-4 bg-indigo-50/40 border border-indigo-100 rounded-xl space-y-3.5 animate-slide-down">
                      <h4 className="text-[11px] font-black text-indigo-900 flex items-center gap-1.5">
                        <Upload className="w-4 h-4 text-indigo-600" />
                        آپلود فایل تصویری گواهینامه برای تایید پلتفرم
                      </h4>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="block text-[10px] text-indigo-950 font-bold">عنوان گواهینامه آموزشی:</label>
                          <input
                            type="text"
                            required
                            placeholder="مثال: سرتیفیکیت مستر ناخن فنی حرفه‌ای"
                            value={newUploadCertTitle}
                            onChange={(e) => setNewUploadCertTitle(e.target.value)}
                            className="w-full bg-white border border-indigo-200/80 rounded-lg p-2 text-xs text-slate-700 outline-none focus:border-indigo-500 font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] text-indigo-950 font-bold">انتخاب تصویر سند مدرک:</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="آدرس عکس یا آپلود فایل..."
                              value={newUploadCertImg}
                              onChange={(e) => setNewUploadCertImg(e.target.value)}
                              className="flex-1 bg-white border border-indigo-200/80 rounded-lg p-2 text-xs text-slate-700 outline-none focus:border-indigo-500 text-left font-bold"
                              dir="ltr"
                            />
                            <label className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-2 rounded-lg cursor-pointer flex items-center justify-center gap-1 transition-all shrink-0">
                              <Upload className="w-3.5 h-3.5" />
                              <span>انتخاب فایل</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageBrowse(e, setNewUploadCertImg)}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer shadow-xs"
                      >
                        ارسال برای تایید مدیریت سالن
                      </button>
                    </form>
                  )}

                  {/* Uploaded Documents Grid with Status Badge */}
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <h4 className="text-[10.5px] font-black text-slate-500">مدارک و گواهینامه‌های تصویری (احراز صلاحیت):</h4>
                    
                    {profileUser.uploadedCertificates && profileUser.uploadedCertificates.length > 0 ? (
                      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                        {profileUser.uploadedCertificates.map((doc) => (
                          <div 
                            key={doc.id} 
                            className="border border-slate-150 rounded-xl overflow-hidden bg-white hover:shadow-xs transition-all relative flex flex-col justify-between"
                          >
                            <div className="h-28 bg-slate-50 relative group cursor-pointer" onClick={() => setSelectedDocUrlForLightbox(doc.documentUrl)}>
                              <img 
                                src={doc.documentUrl} 
                                alt={doc.title} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" 
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-[10px] text-white font-black bg-slate-900/80 px-2.5 py-1 rounded-lg">مشاهده سند بزرگتر</span>
                              </div>
                            </div>

                            <div className="p-2.5 space-y-2">
                              <h5 className="text-[10.5px] font-black text-slate-800 line-clamp-1" title={doc.title}>
                                {doc.title}
                              </h5>
                              <div className="flex items-center justify-between gap-1.5 text-[9px] font-bold">
                                <span>ثبت: {doc.uploadedAt}</span>
                                
                                {doc.status === "pending" && (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 flex items-center gap-0.5">
                                    <AlertCircle className="w-3 h-3 text-amber-600" />
                                    در انتظار بررسی
                                  </span>
                                )}
                                {doc.status === "approved" && (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-150 flex items-center gap-0.5">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    تایید شده
                                  </span>
                                )}
                                {doc.status === "rejected" && (
                                  <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-150 flex items-center gap-0.5">
                                    <AlertCircle className="w-3 h-3 text-rose-600" />
                                    رد شده
                                  </span>
                                )}
                              </div>
                            </div>

                            {canEditProfile && (
                              <button
                                type="button"
                                onClick={() => handleRemoveUploadedCertificate(doc.id)}
                                className="absolute top-1.5 right-1.5 bg-slate-900/70 hover:bg-rose-600 text-white p-1 rounded-lg shadow-sm transition-all"
                                title="حذف سند"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center p-6 border-2 border-dashed border-slate-100 bg-slate-50/50 rounded-xl">
                        <p className="text-[10px] text-slate-400 font-bold leading-normal">
                          هیچ مدرک گواهی‌نامه تصویری آپلود نشده است. {canEditProfile && "با استفاده از دکمه بالا می‌توانید اولین تصویر گواهینامه خود را جهت تایید مدیریت سالن ارسال کنید."}
                        </p>
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* User Reviews */}
              {profileUser.role === "artist" && (
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">بازخورد و نظرات مراجعین ممیزی شده</h3>
                  
                  <div className="space-y-3.5">
                    {profileUser.reviews && profileUser.reviews.length > 0 ? (
                      profileUser.reviews.map((rev) => (
                        <div key={rev.id} className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <img src={rev.reviewerAvatar} alt={rev.reviewerName} className="w-8 h-8 rounded-full object-cover border border-slate-150" />
                              <div>
                                <h4 className="text-xs font-bold text-slate-800">{rev.reviewerName}</h4>
                                <p className="text-[9px] text-slate-400 font-bold">{rev.date}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-0.5 text-amber-500">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`w-3.5 h-3.5 ${i < rev.rating ? "fill-amber-400 stroke-amber-400" : "stroke-slate-300"}`} 
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed italic pr-1 border-r-2 border-slate-200">« {rev.comment} »</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 text-center font-bold py-4">هیچ بازخوردی برای این همکار ثبت نشده است.</p>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Write Post Form if own profile */}
              {isOwnProfile && (
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4 animate-fade-in">
                  <div className="flex gap-3.5">
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      className="w-11 h-11 rounded-full object-cover border border-slate-100 shrink-0"
                    />
                    <form onSubmit={handleProfileCreatePost} className="flex-1 space-y-4">
                      <textarea
                        value={profileNewPostText}
                        onChange={(e) => setProfileNewPostText(e.target.value)}
                        placeholder="یک مطلب، تجربه یا فرصت شغلی جدید بنویسید که مستقیماً در تالار همگانی انجمن زیبایی درج شود..."
                        rows={3}
                        className="w-full text-xs text-slate-800 placeholder-slate-400 bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 focus:outline-none focus:border-[#0284c7] focus:bg-white transition-all resize-none"
                      />

                      {profilePostImageUrl && (
                        <div className="relative rounded-xl overflow-hidden border border-slate-200 aspect-[2/1] max-h-48">
                          <img src={profilePostImageUrl} alt="Attachment" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setProfilePostImageUrl("")}
                            className="absolute top-2.5 right-2.5 bg-slate-900/80 text-white hover:bg-slate-900 px-2.5 py-1 rounded-full transition-all text-[10px]"
                          >
                            حذف تصویر
                          </button>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                            <Tag className="w-3.5 h-3.5 text-slate-400" />
                            <select
                              value={profileSelectedTag}
                              onChange={(e) => setProfileSelectedTag(e.target.value)}
                              className="bg-transparent text-[11px] text-slate-600 font-bold outline-none cursor-pointer"
                            >
                              <option value="تجربه">تجربه و نمونه کار</option>
                              <option value="ترند">ترند روز</option>
                              <option value="آموزش">آموزش</option>
                              <option value="استخدام">استخدام</option>
                            </select>
                          </div>

                          <button
                            type="button"
                            onClick={() => setProfileShowImageSelector(!profileShowImageSelector)}
                            className="flex items-center gap-1 text-slate-500 hover:text-[#0284c7] hover:bg-slate-50 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all cursor-pointer"
                          >
                            <Image className="w-3.5 h-3.5" />
                            افزودن تصویر پیش‌فرض
                          </button>

                          <label className="flex items-center gap-1 text-slate-500 hover:text-[#0284c7] hover:bg-slate-50 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all cursor-pointer">
                            <Upload className="w-3.5 h-3.5" />
                            <span>بارگذاری تصویر دلخواه</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageBrowse(e, setProfilePostImageUrl)}
                              className="hidden"
                            />
                          </label>
                        </div>

                        <button
                          type="submit"
                          disabled={!profileNewPostText.trim()}
                          className="bg-[#0284c7] hover:bg-[#0369a1] disabled:opacity-50 text-white text-[11px] font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          انتشار در تالار گفتگو
                        </button>
                      </div>

                      {profileShowImageSelector && (
                        <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-2">
                          <p className="text-[10px] text-slate-400 font-bold">انتخاب یکی از طرح‌های ممیزی شده پیش‌فرض:</p>
                          <div className="grid grid-cols-4 gap-2">
                            {PRESET_POST_IMAGES.map((url, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => {
                                  setProfilePostImageUrl(url);
                                  setProfileShowImageSelector(false);
                                }}
                                className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-[#0284c7] transition-all"
                              >
                                <img src={url} alt={`Preset ${i}`} className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </form>
                  </div>
                </div>
              )}

              {/* Profile Posts List */}
              <div className="space-y-5">
                {profilePosts.length > 0 ? (
                  profilePosts.map((post) => {
                    const badge = getRoleBadge(post.authorRole);
                    const isLikedByMe = post.likedBy.includes(currentUser.id);

                    return (
                      <div key={post.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4 animate-fade-in">
                        {/* Post Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img
                              src={post.authorAvatar}
                              alt={post.authorName}
                              className="w-11 h-11 rounded-full object-cover border border-slate-100"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-slate-900">{post.authorName}</h4>
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${badge.color}`}>
                                  {badge.label}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5">{post.createdAt}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {post.tag && (
                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${TAG_COLORS[post.tag] || "bg-slate-50 text-slate-600"}`}>
                                {TAG_TRANSLATIONS[post.tag] || post.tag}
                              </span>
                            )}
                            {post.authorId === currentUser.id && (
                              postIdToDelete === post.id ? (
                                <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-100 p-1 px-2 rounded-xl text-[10px]">
                                  <span className="font-bold text-rose-700">حذف شود؟</span>
                                  <button
                                    onClick={() => handleProfileDeletePost(post.id)}
                                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-2 py-0.5 rounded-md cursor-pointer text-[9px]"
                                  >
                                    بله
                                  </button>
                                  <button
                                    onClick={() => setPostIdToDelete(null)}
                                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-2 py-0.5 rounded-md cursor-pointer text-[9px]"
                                  >
                                    خیر
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setPostIdToDelete(post.id)}
                                  className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
                                  title="حذف این پست"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )
                            )}
                          </div>
                        </div>

                        {/* Post Content */}
                        <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{post.content}</p>

                        {/* Post Image */}
                        {post.image && (
                          <div className="rounded-xl overflow-hidden border border-slate-150 max-h-80 bg-slate-50">
                            <img src={post.image} alt="Post content" className="w-full h-full object-cover" />
                          </div>
                        )}

                        {/* Interaction Bar */}
                        <div className="flex items-center gap-4.5 pt-3 border-t border-slate-100 text-xs font-bold text-slate-500">
                          <button
                            onClick={() => handleProfileLikePost(post.id)}
                            className={`flex items-center gap-1.5 transition-all hover:scale-105 cursor-pointer ${
                              isLikedByMe ? "text-rose-600 font-extrabold" : "hover:text-slate-700"
                            }`}
                          >
                            <Heart className={`w-4.5 h-4.5 ${isLikedByMe ? "fill-rose-600 text-rose-600" : ""}`} />
                            <span>{toPersianDigits(post.likesCount)} پسند</span>
                          </button>

                          <div className="flex items-center gap-1.5">
                            <MessageSquare className="w-4.5 h-4.5" />
                            <span>{toPersianDigits(post.comments.length)} دیدگاه</span>
                          </div>
                        </div>

                        {/* Comments Block */}
                        <div className="bg-slate-50/55 rounded-xl p-3.5 space-y-3.5">
                          {post.comments.length > 0 && (
                            <div className="space-y-3">
                              {post.comments.map((comment) => (
                                <div key={comment.id} className="text-xs space-y-1.5 bg-white p-2.5 rounded-lg border border-slate-100">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <img
                                        src={comment.authorAvatar}
                                        alt={comment.authorName}
                                        className="w-5.5 h-5.5 rounded-full object-cover border border-slate-100"
                                      />
                                      <span className="font-bold text-slate-900">{comment.authorName}</span>
                                      <span className="text-[8px] text-slate-400 bg-slate-50 border px-1 rounded-full font-normal">
                                        {comment.authorRole === "manager" ? "مدیر" : comment.authorRole === "artist" ? "آرتیست" : "مشتری"}
                                      </span>
                                    </div>
                                    <span className="text-[9px] text-slate-400">{comment.createdAt}</span>
                                  </div>
                                  <p className="text-slate-600 pr-1 border-r border-slate-200 leading-relaxed font-normal">{comment.content}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add Comment Input Form */}
                          <form
                            onSubmit={(e) => handleProfileAddComment(post.id, e)}
                            className="flex gap-2"
                          >
                            <input
                              type="text"
                              required
                              value={profileCommentInputs[post.id] || ""}
                              onChange={(e) =>
                                setProfileCommentInputs({
                                  ...profileCommentInputs,
                                  [post.id]: e.target.value
                                })
                              }
                              placeholder="نظر کارشناسی یا بازخورد خود را بنویسید..."
                              className="flex-1 text-xs text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#0284c7]"
                            />
                            <button
                              type="submit"
                              disabled={!(profileCommentInputs[post.id] || "").trim()}
                              className="bg-[#0284c7] hover:bg-[#0369a1] disabled:opacity-50 text-white px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer"
                            >
                              ثبت
                            </button>
                          </form>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="bg-white border border-slate-100 rounded-2xl p-10 text-center space-y-3.5">
                    <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-slate-400">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-700">هیچ مطلبی منتشر نشده است</h4>
                      <p className="text-[10px] text-slate-400 font-bold mt-1.5 max-w-sm mx-auto leading-normal">
                        {isOwnProfile
                          ? "شما هنوز هیچ پست یا نمونه‌کاری را در تالار گفتگو به اشتراک نگذاشته‌اید. اولین مطلب خود را بنویسید!"
                          : "این همکار ارزشمند هنوز هیچ پستی در انجمن زیبایی ارسال نکرده است."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* LEFT COLUMN: Profile Strength Meter & Contact Info */}
        <div className="space-y-6">
          
          {/* Strength meter checklist */}
          {canEditProfile && (
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                  {isOwnProfile ? "قدرت و اعتبار رزومه شما" : `قدرت و اعتبار رزومه ${profileUser.name}`}
                </h3>
              </div>

              {/* Progress visual */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>تکمیل کل فیلدها</span>
                  <span className="text-emerald-700 font-extrabold">{toPersianDigits(percentage)}٪</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-500" 
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                {percentage === 100 ? (
                  <p className="text-[10px] text-emerald-600 font-bold text-center">
                    {isOwnProfile ? "تبریک! رزومه شما با بالاترین اعتبار فعال شد. 🎉" : "تبریک! رزومه همکار با بالاترین اعتبار فعال شده است."}
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-400 font-bold leading-normal">
                    {isOwnProfile 
                      ? "با تکمیل موارد باقیمانده، شانس خود را در دریافت درخواست نوبت و استخدام تا ۴ برابر افزایش دهید."
                      : "با تکمیل فیلدهای باقیمانده، به بهبود رتبه‌بندی و تکمیل رزومه این همکار کمک کنید."}
                  </p>
                )}
              </div>

              {/* Checklist details */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                {checklist.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className={`flex items-center gap-1.5 ${item.completed ? "text-slate-600 font-medium" : "text-slate-400"}`}>
                      {item.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <span className="w-4 h-4 rounded-full border-2 border-slate-200 block shrink-0" />
                      )}
                      {item.label}
                    </span>
                    {!item.completed && (
                      <span className="text-[9.5px] text-slate-400 font-bold bg-slate-50 border border-slate-200 px-1.5 py-0.2 rounded">
                        +{toPersianDigits(item.points)} امتیاز
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contact and credentials info card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">اطلاعات ارتباطی و موقعیت</h3>
            
            <div className="space-y-3 text-xs text-slate-700">
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[9px] font-bold">شماره تلفن تماس:</span>
                  <span className="font-bold font-mono" dir="ltr">{profileUser.phone || "ثبت نشده"}</span>
                </div>
              </div>

              {profileUser.email && (
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-slate-400 block text-[9px] font-bold">پست الکترونیکی:</span>
                    <span>{profileUser.email}</span>
                  </div>
                </div>
              )}

              {profileUser.salonName && (
                <div className="flex items-center gap-2.5 border-t border-slate-100 pt-3 mt-3">
                  <Award className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-slate-400 block text-[9px] font-bold">نام سالن تحت مدیریت:</span>
                    <span className="font-bold text-[#0284c7]">{profileUser.salonName}</span>
                    {profileUser.salonLocation && (
                      <p className="text-[10px] text-slate-500 font-normal mt-1 leading-normal">{profileUser.salonLocation}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Full Edit Profile Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-3xl shrink-0">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#0284c7]" />
                <h3 className="text-sm font-black text-slate-800">ویرایش مشخصات و اطلاعات کاربری</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="text-slate-400 hover:text-slate-700 font-extrabold text-lg focus:outline-none cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveProfile} className="p-6 space-y-6 overflow-y-auto">
              
              {/* Profile Image & Cover Section */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">تصویر پروفایل و کاور</h4>
                
                {/* Avatar choice */}
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <img
                      src={editAvatar}
                      alt="Avatar Preview"
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-[#0284c7] shadow-sm shrink-0"
                    />
                    <div className="flex-1 space-y-1">
                      <label className="block text-[11px] text-slate-500 font-bold">تصویر پروفایل:</label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={editAvatar}
                          onChange={(e) => setEditAvatar(e.target.value)}
                          className="flex-1 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#0284c7]"
                          placeholder="آدرس اینترنتی عکس یا انتخاب از دستگاه..."
                        />
                        <label className="bg-[#0284c7]/10 hover:bg-[#0284c7]/20 text-[#0284c7] text-xs font-bold px-3.5 py-2 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-all shrink-0">
                          <Upload className="w-3.5 h-3.5" />
                          <span>انتخاب فایل</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageBrowse(e, setEditAvatar)}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Preset Avatars Grid */}
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold mb-2">انتخاب سریع از آلبوم آواتارهای حرفه‌ای ممیزی شده:</span>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                      {PRESET_AVATARS.map((url, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setEditAvatar(url)}
                          className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                            editAvatar === url ? "border-[#0284c7] scale-105 shadow-xs" : "border-transparent hover:border-slate-300"
                          }`}
                        >
                          <img src={url} alt={`Preset Avatar ${i}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Cover choice */}
                <div className="space-y-3 pt-3">
                  <div className="flex flex-col gap-2">
                    <div className="w-full h-24 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 relative">
                      <img
                        src={editCover || "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=1200&auto=format&fit=crop"}
                        alt="Cover Preview"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-2 right-2 bg-slate-900/60 text-white text-[9px] font-bold px-2 py-1 rounded">پیش‌نمایش هدر</span>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] text-slate-500 font-bold">تصویر پس‌زمینه هدر (کاور):</label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={editCover}
                          onChange={(e) => setEditCover(e.target.value)}
                          className="flex-1 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#0284c7]"
                          placeholder="آدرس اینترنتی عکس یا انتخاب از دستگاه..."
                        />
                        <label className="bg-[#0284c7]/10 hover:bg-[#0284c7]/20 text-[#0284c7] text-xs font-bold px-3.5 py-2 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-all shrink-0">
                          <Upload className="w-3.5 h-3.5" />
                          <span>انتخاب فایل</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageBrowse(e, setEditCover)}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Preset Covers Grid */}
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold mb-2">انتخاب سریع از تصاویر پس‌زمینه سالن:</span>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {PRESET_COVERS.map((url, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setEditCover(url)}
                          className={`aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                            editCover === url ? "border-[#0284c7] scale-105 shadow-xs" : "border-transparent hover:border-slate-300"
                          }`}
                        >
                          <img src={url} alt={`Preset Cover ${i}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

              {/* Personal details */}
              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">مشخصات عمومی و تماس</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] text-slate-500 font-bold mb-1.5">نام و نام خانوادگی:</label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#0284c7] font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 font-bold mb-1.5">عنوان تخصص و لاین اصلی:</label>
                    <input
                      type="text"
                      required
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#0284c7] font-bold"
                      placeholder="مثال: متخصص لاین ناخن یا میکاپ آرتیست ارشد"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 font-bold mb-1.5">شماره همراه تماس:</label>
                    <input
                      type="text"
                      required
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#0284c7] font-mono font-bold"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 font-bold mb-1.5">پست الکترونیکی (ایمیل):</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#0284c7]"
                      placeholder="نمونه: info@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 font-bold mb-1.5">شهر محل سکونت / فعالیت:</label>
                    <input
                      type="text"
                      required
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#0284c7]"
                    />
                  </div>

                  {profileUser.role !== "client" && (
                    <div>
                      <label className="block text-[11px] text-slate-500 font-bold mb-1.5">سابقه کار مفید (سال):</label>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={editExp}
                        onChange={(e) => setEditExp(Number(e.target.value))}
                        className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#0284c7] font-bold"
                      />
                    </div>
                  )}

                </div>
              </div>

              {/* Salon Details for Manager role */}
              {profileUser.role === "manager" && (
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">مشخصات سالن زیبایی تحت مدیریت</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] text-slate-500 font-bold mb-1.5">نام سالن زیبایی:</label>
                      <input
                        type="text"
                        value={editSalonName}
                        onChange={(e) => setEditSalonName(e.target.value)}
                        className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#0284c7] font-bold"
                        placeholder="مثال: سالن زیبایی لاوین"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-500 font-bold mb-1.5">آدرس دقیق یا موقعیت سالن:</label>
                      <input
                        type="text"
                        value={editSalonLocation}
                        onChange={(e) => setEditSalonLocation(e.target.value)}
                        className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#0284c7]"
                        placeholder="مثال: تهران، خیابان فرشته، پلاک ۱۲"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 font-bold mb-1.5">توضیحات کوتاه یا معرفی خدمات سالن:</label>
                    <textarea
                      value={editSalonDesc}
                      onChange={(e) => setEditSalonDesc(e.target.value)}
                      rows={3}
                      className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-[#0284c7] resize-none"
                      placeholder="لاین‌ها و خدمات اصلی سالن را به صورت خلاصه بنویسید..."
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-5 py-3 rounded-xl transition-all cursor-pointer"
                >
                  انصراف و بستن
                </button>
                <button
                  type="submit"
                  className="bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-extrabold px-6 py-3 rounded-xl transition-all shadow-md cursor-pointer"
                >
                  ذخیره تغییرات پروفایل
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Lightbox for uploaded certificates */}
      {selectedDocUrlForLightbox && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setSelectedDocUrlForLightbox(null)}>
          <div className="relative max-w-4xl w-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedDocUrlForLightbox(null)}
              className="absolute -top-12 left-0 text-white hover:text-slate-300 flex items-center gap-1 text-xs font-bold bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 cursor-pointer"
            >
              بستن تصویر ×
            </button>
            <img
              src={selectedDocUrlForLightbox}
              alt="Certificate document"
              className="max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/15"
            />
          </div>
        </div>
      )}

    </div>
  );
}

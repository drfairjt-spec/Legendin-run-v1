import React, { useState } from "react";
import { Post, Comment, User, UserRole, ColleagueMessage } from "../types";
import { MessageSquare, Heart, Send, Tag, Image, Sparkles, AlertCircle, Compass, Scissors, Layers, MapPin, Briefcase, Award, ShieldCheck, Star, Users, Phone, Calendar, ArrowLeft, Mail, Upload } from "lucide-react";
import { toPersianDigits } from "../utils/shamsi";

interface CommunityFeedProps {
  currentUser: User;
  posts: Post[];
  onUpdatePosts: (updatedPosts: Post[]) => void;
  allUsers: User[];
  onSelectUser?: (user: User) => void;
  colleagueMessages: ColleagueMessage[];
  onUpdateColleagueMessages: React.Dispatch<React.SetStateAction<ColleagueMessage[]>>;
}

const PRESET_POST_IMAGES = [
  "https://images.unsplash.com/photo-1562322140-8baeececf3df?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1632345031435-8797b2d58045?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=600&auto=format&fit=crop"
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

// Beauty skill categories for the Skills sub-tab
const BEAUTY_CATEGORIES = [
  { id: "رنگ مو", title: "لاین رنگ و لایت", icon: Layers, desc: "بالیاژ، آمبره، هیرتاچ و لایت فانتزی" },
  { id: "سلامت مو", title: "لاین سلامت و کراتین", icon: ShieldCheck, desc: "پلکس‌تراپی، کراتین احیا و هیدراتاسیون" },
  { id: "ناخن", title: "لاین تخصصی ناخن", icon: Sparkles, desc: "کاشت پودر و ژل، دیزاین مینیاتوری مینی‌مال" },
  { id: "میکاپ", title: "لاین میکاپ و گریم", icon: Star, desc: "گریم فوق‌تخصصی عروس و کانتورینگ سینمایی" },
  { id: "پوست", title: "لاین پاکسازی پوست", icon: Compass, desc: "فیشیال تخصصی، هیدرودرمی و اسیدتراپی" },
  { id: "تاتو و ابرو", title: "میکروبلیدینگ و ابرو", icon: Scissors, desc: "متدهای نچرال نانوبروز، فیبروز و تاتو ایمن" }
];

export default function CommunityFeed({ currentUser, posts = [], onUpdatePosts, allUsers = [], onSelectUser, colleagueMessages = [], onUpdateColleagueMessages }: CommunityFeedProps) {
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

  const [subTab, setSubTab] = useState<"all" | "salons" | "skills">("all");

  React.useEffect(() => {
    if (currentUser?.role === "client") {
      setSubTab("all");
    }
  }, [currentUser?.role]);
  const [selectedSkillCategory, setSelectedSkillCategory] = useState<string>("رنگ مو");

  // Message compose modal states
  const [activeMessageRecipient, setActiveMessageRecipient] = useState<User | null>(null);
  const [msgSubject, setMsgSubject] = useState("");
  const [msgBody, setMsgBody] = useState("");

  const [newPostText, setNewPostText] = useState("");
  const [selectedTag, setSelectedTag] = useState("تجربه");
  const [postImageUrl, setPostImageUrl] = useState("");
  const [showImageSelector, setShowImageSelector] = useState(false);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  const toggleComments = (postId: string) => {
    setExpandedComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  // Calculate profile strength for embedded leaderboard ranking
  const calculateProfileStrength = (user: User): number => {
    let score = 20; 
    if (user.avatar && !user.avatar.includes("default")) score += 15;
    if (user.bio && user.bio.length > 10) score += 15;
    if (user.skills && user.skills.length > 0) score += 15;
    if (user.portfolio && user.portfolio.length >= 3) score += 15;
    if (user.certifications && user.certifications.length > 0) score += 10;
    if (user.phone) score += 10;
    return Math.min(score, 100);
  };

  // Rank artists by star rating + profile strength
  const topArtists = React.useMemo(() => {
    return (allUsers || [])
      .filter(u => u.role === "artist")
      .map(u => {
        const strength = calculateProfileStrength(u);
        const rating = u.rating || 4.0;
        const score = strength * 0.55 + rating * 20 * 0.45;
        return { ...u, strength, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5); // top 5
  }, [allUsers]);

  // Salon managers list for the "Salons Legendin" tab
  const salonsList = React.useMemo(() => {
    return (allUsers || []).filter(u => u.role === "manager" && u.salonName);
  }, [allUsers]);

  // Handle Quick Job Apply notification
  const [showToast, setShowToast] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 3500);
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.id === "guest") {
      alert("کاربر گرامی، برای انتشار پست جدید ابتدا باید وارد حساب کاربری خود شوید یا ثبت‌نام کنید.");
      return;
    }
    if (!newPostText.trim()) return;

    const newPost: Post = {
      id: "post-" + Math.random().toString(36).substr(2, 9),
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      authorAvatar: currentUser.avatar,
      content: newPostText,
      image: postImageUrl || undefined,
      tag: selectedTag,
      createdAt: "همین الان",
      likesCount: 0,
      likedBy: [],
      comments: []
    };

    onUpdatePosts([newPost, ...posts]);
    setNewPostText("");
    setPostImageUrl("");
    setShowImageSelector(false);
    triggerToast("پست شما با موفقیت در خوراک همگانی منتشر شد! ✨");
  };

  const handleSendColleagueMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMessageRecipient) return;
    if (!msgSubject.trim() || !msgBody.trim()) {
      alert("لطفاً موضوع و متن پیام را وارد کنید.");
      return;
    }

    const newMessage: ColleagueMessage = {
      id: "msg-" + Math.random().toString(36).substr(2, 9),
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderSalonName: currentUser.salonName || "سالن همکار",
      receiverId: activeMessageRecipient.id,
      receiverName: activeMessageRecipient.name,
      receiverSalonName: activeMessageRecipient.salonName || "سالن همکار",
      subject: msgSubject.trim(),
      body: msgBody.trim(),
      createdAt: "1405/04/12",
      isRead: false,
      replies: []
    };

    onUpdateColleagueMessages(prev => [newMessage, ...prev]);
    setActiveMessageRecipient(null);
    setMsgSubject("");
    setMsgBody("");
    triggerToast(`پیام داخلی شما با موفقیت برای مدیریت سالن (${activeMessageRecipient.name}) ارسال شد! 📬`);
  };

  const handleLikePost = (postId: string) => {
    if (currentUser.id === "guest") {
      alert("کاربر گرامی، برای لایک کردن پست‌ها ابتدا باید وارد حساب کاربری خود شوید یا ثبت‌نام کنید.");
      return;
    }
    const updated = (posts || []).map(p => {
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

  const handleAddComment = (postId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.id === "guest") {
      alert("کاربر گرامی، برای ثبت نظر ابتدا باید وارد حساب کاربری خود شوید یا ثبت‌نام کنید.");
      return;
    }
    const text = commentInputs[postId] || "";
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
    setCommentInputs({ ...commentInputs, [postId]: "" });
  };

  const handleLikeComment = (postId: string, commentId: string) => {
    if (currentUser.id === "guest") {
      alert("کاربر گرامی، برای لایک کردن دیدگاه‌ها ابتدا باید وارد حساب کاربری خود شوید یا ثبت‌نام کنید.");
      return;
    }
    const updated = (posts || []).map(p => {
      if (p.id === postId) {
        const comments = (p.comments || []).map(c => {
          if (c.id === commentId) {
            const likedList = c.likedBy || [];
            const isLiked = likedList.includes(currentUser.id);
            const likedBy = isLiked 
              ? likedList.filter(id => id !== currentUser.id)
              : [...likedList, currentUser.id];
            return {
              ...c,
              likedBy,
              likesCount: likedBy.length
            };
          }
          return c;
        });
        return { ...p, comments };
      }
      return p;
    });
    onUpdatePosts(updated);
  };

  const getRoleBadge = (role?: UserRole | string) => {
    switch (role) {
      case "manager":
        return { label: "مدیر سالن", color: "text-purple-700 bg-purple-50 border-purple-100" };
      case "artist":
        return { label: "آرتیست متخصص", color: "text-emerald-700 bg-emerald-50 border-emerald-100" };
      case "client":
      default:
        return { label: "عضو جامعه", color: "text-blue-700 bg-blue-50 border-blue-100" };
    }
  };

  // Filter artists that have a skill belonging to the selected category
  const artistsBySkillCategory = React.useMemo(() => {
    return (allUsers || []).filter(u => {
      if (u.role !== "artist") return false;
      return u.skills?.some(s => s.category === selectedSkillCategory);
    });
  }, [allUsers, selectedSkillCategory]);

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-6 left-6 right-6 md:left-auto md:w-96 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-3 animate-bounce">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
          <p className="text-xs font-bold leading-relaxed">{showToast}</p>
        </div>
      )}

      {/* Sub Category Selector */}
      {currentUser?.role !== "client" && (
        <div className="flex flex-wrap sm:flex-nowrap border border-slate-100 bg-white p-1 sm:p-1.5 rounded-2xl gap-1 sm:gap-1.5 shadow-xs">
          {[
            { id: "all" as const, label: "انجمن زیبایی", icon: Compass },
            { id: "salons" as const, label: "سالن‌ها", icon: Briefcase },
            { id: "skills" as const, label: "آرتیست‌ها", icon: Scissors },
          ].map((item) => {
          const IconComponent = item.icon;
          const active = subTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setSubTab(item.id)}
              className={`flex-1 min-w-[90px] text-center py-2.5 sm:py-3 px-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 truncate ${
                active
                  ? "bg-[#0284c7] text-white shadow-xs font-extrabold"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <IconComponent className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
        </div>
      )}

      {/* ----------------- SUB-TAB 1: ALL SECTION ----------------- */}
      {subTab === "all" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Right Column: Forum Feed (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Create Post Card */}
            {currentUser.id !== "guest" && (
              <div className="bg-white border border-slate-100 rounded-2xl p-3.5 sm:p-5 shadow-sm min-w-0">
                <div className="flex gap-2.5 sm:gap-3.5 items-start min-w-0">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-9 h-9 sm:w-11 sm:h-11 rounded-full object-cover border border-slate-100 shrink-0"
                  />
                  <form onSubmit={handleCreatePost} className="flex-1 min-w-0 space-y-4">
                    <textarea
                      value={newPostText}
                      onChange={(e) => setNewPostText(e.target.value)}
                      placeholder={`${currentUser.name} عزیز، یک نمونه کار، فرصت شغلی یا تجربه جدید به اشتراک بگذارید...`}
                      rows={3}
                      className="w-full text-xs sm:text-sm text-slate-800 placeholder-slate-400 bg-slate-50 border border-slate-200/80 rounded-xl p-3 sm:p-3.5 focus:outline-none focus:border-olive-300 focus:bg-white transition-all resize-none break-words"
                    />

                    {/* Attached Image Preview */}
                    {postImageUrl && (
                      <div className="relative rounded-xl overflow-hidden border border-slate-200 aspect-[2/1] max-h-48 group">
                        <img src={postImageUrl} alt="Attachment" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setPostImageUrl("")}
                          className="absolute top-2.5 right-2.5 bg-slate-900/80 text-white hover:bg-slate-900 p-1.5 rounded-full transition-all text-xs cursor-pointer"
                        >
                          حذف عکس
                        </button>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        
                        {/* Topic Selector */}
                        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 shrink-0">
                          <Tag className="w-3.5 h-3.5 text-slate-400" />
                          <select
                            value={selectedTag}
                            onChange={(e) => setSelectedTag(e.target.value)}
                            className="bg-transparent text-xs text-slate-600 font-bold outline-none cursor-pointer max-w-[110px] sm:max-w-none"
                          >
                            <option value="تجربه">تجربه و نمونه کار</option>
                            <option value="ترند">ترند روز</option>
                            <option value="آموزش">آموزش</option>
                            <option value="استخدام">استخدام</option>
                          </select>
                        </div>

                        {/* Image Attach Button */}
                        <button
                          type="button"
                          onClick={() => setShowImageSelector(!showImageSelector)}
                          className="flex items-center gap-1 text-slate-500 hover:text-[#0284c7] hover:bg-slate-50 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shrink-0"
                        >
                          <Image className="w-4 h-4 shrink-0" />
                          <span>تصویر پیش‌فرض</span>
                        </button>

                        <label className="flex items-center gap-1 text-slate-500 hover:text-[#0284c7] hover:bg-slate-50 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shrink-0">
                          <Upload className="w-4 h-4 shrink-0" />
                          <span>بارگذاری تصویر</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageBrowse(e, setPostImageUrl)}
                            className="hidden"
                          />
                        </label>

                      </div>

                      <button
                        type="submit"
                        disabled={!newPostText.trim()}
                        className="bg-[#0284c7] hover:bg-[#0369a1] disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer w-full sm:w-auto shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" />
                        انتشار پست
                      </button>
                    </div>

                    {/* Quick Image Selector */}
                    {showImageSelector && (
                      <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-2">
                        <p className="text-[10px] text-slate-400 font-bold">انتخاب یکی از پروژه‌های زیبایی پیش‌فرض:</p>
                        <div className="grid grid-cols-4 gap-2">
                          {PRESET_POST_IMAGES.map((url, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setPostImageUrl(url);
                                setShowImageSelector(false);
                              }}
                              className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-[#0284c7] transition-all cursor-pointer"
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

            {/* Posts List */}
            <div className="space-y-3.5 sm:space-y-4">
              {posts.map((post) => {
                const badge = getRoleBadge(post.authorRole);
                const isLikedByMe = post.likedBy.includes(currentUser.id);
                const isExpanded = expandedComments[post.id];

                return (
                  <div key={post.id} className="bg-white border border-slate-100 rounded-2xl p-3 sm:p-4 shadow-sm space-y-3 animate-fade-in min-w-0">
                    
                    {/* Post Header */}
                    <div className="flex flex-wrap items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                        <img
                          src={post.authorAvatar}
                          alt={post.authorName}
                          onClick={() => {
                            const author = allUsers.find(u => u.id === post.authorId);
                            if (author && onSelectUser) onSelectUser(author);
                          }}
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border border-slate-100 cursor-pointer hover:ring-2 hover:ring-[#0284c7]/25 transition-all shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
                            <h4 
                              onClick={() => {
                                const author = allUsers.find(u => u.id === post.authorId);
                                if (author && onSelectUser) onSelectUser(author);
                              }}
                              className="text-xs sm:text-[13px] font-bold text-slate-900 cursor-pointer hover:text-[#0284c7] transition-colors truncate max-w-full"
                            >
                              {post.authorName}
                            </h4>
                            <span className={`text-[8px] sm:text-[8.5px] px-1.5 py-0.5 rounded-full font-bold border shrink-0 ${badge.color}`}>
                              {badge.label}
                            </span>
                          </div>
                          <p className="text-[9px] sm:text-[9.5px] text-slate-400 mt-0.5">{post.createdAt}</p>
                        </div>
                      </div>

                      {post.tag && (
                        <span className={`text-[9px] sm:text-[9.5px] font-bold px-2 py-0.5 rounded-lg border shrink-0 ${TAG_COLORS[post.tag] || "bg-slate-50 text-slate-600"}`}>
                          {TAG_TRANSLATIONS[post.tag] || post.tag}
                        </span>
                      )}
                    </div>

                    {/* Post Content */}
                    <p className="text-xs sm:text-[12.5px] text-slate-700 leading-relaxed whitespace-pre-line break-words">{post.content}</p>

                    {/* Post Image */}
                    {post.image && (
                      <div className="rounded-xl overflow-hidden border border-slate-100 max-h-72">
                        <img src={post.image} alt="Post Attachment" className="w-full h-full object-cover" />
                      </div>
                    )}

                    {/* Like & Comments Summary Stats */}
                    <div className="flex items-center justify-between text-[10.5px] text-slate-400 font-bold border-y border-slate-50 py-2 px-1">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" />
                        {toPersianDigits(post.likesCount)} پسند
                      </span>
                      <span>
                        {toPersianDigits(post.comments.length)} دیدگاه
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs font-bold text-slate-600 px-1">
                      <button
                        onClick={() => handleLikePost(post.id)}
                        className={`flex items-center gap-1.5 py-1 px-2.5 rounded-lg transition-all cursor-pointer ${
                          isLikedByMe 
                            ? "text-rose-600 bg-rose-50" 
                            : "hover:text-rose-600 hover:bg-slate-50"
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${isLikedByMe ? "fill-rose-600" : ""}`} />
                        {isLikedByMe ? "پسندیدم" : "پسندیدن"}
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleComments(post.id)}
                        className={`flex items-center gap-1.5 py-1 px-2.5 rounded-lg transition-all cursor-pointer ${
                          isExpanded ? "text-[#0284c7] bg-[#0284c7]/5" : "text-slate-500 hover:text-[#0284c7] hover:bg-slate-50"
                        }`}
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>{isExpanded ? "بستن دیدگاه‌ها" : "دیدگاه‌ها"}</span>
                      </button>
                    </div>

                    {/* Threaded Comments Section */}
                    <div className="bg-slate-50/50 rounded-xl p-3.5 space-y-4 border border-slate-100/50">
                      {post.comments.length > 0 ? (
                        <div className="space-y-3.5">
                          {(isExpanded ? post.comments : post.comments.slice(0, 1)).map((comment) => {
                            const cBadge = getRoleBadge(comment.authorRole);
                            const isCommentLikedByMe = comment.likedBy.includes(currentUser.id);

                            return (
                              <div key={comment.id} className="flex gap-2.5 text-right items-start group">
                                <img
                                  src={comment.authorAvatar}
                                  alt={comment.authorName}
                                  onClick={() => {
                                    const author = allUsers.find(u => u.id === comment.authorId);
                                    if (author && onSelectUser) onSelectUser(author);
                                  }}
                                  className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-100 mt-1 cursor-pointer hover:ring-2 hover:ring-[#0284c7]/25 transition-all"
                                />
                                <div className="flex-1 min-w-0 bg-white border border-slate-100 rounded-2xl p-3 shadow-2xs">
                                  <div className="flex flex-wrap items-center justify-between gap-1 sm:gap-2">
                                    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap min-w-0">
                                      <span 
                                        onClick={() => {
                                          const author = allUsers.find(u => u.id === comment.authorId);
                                          if (author && onSelectUser) onSelectUser(author);
                                        }}
                                        className="text-[11px] sm:text-xs font-bold text-slate-800 cursor-pointer hover:text-[#0284c7] transition-colors truncate max-w-full"
                                      >
                                        {comment.authorName}
                                      </span>
                                      <span className={`text-[8px] px-1.5 py-0.2 rounded-full font-extrabold border shrink-0 ${cBadge.color}`}>
                                        {cBadge.label}
                                      </span>
                                    </div>
                                    <span className="text-[8.5px] sm:text-[9px] text-slate-400 font-bold shrink-0">{comment.createdAt}</span>
                                  </div>
                                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed break-words">{comment.content}</p>
                                  
                                  {/* Comment like count & button */}
                                  <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-50 justify-between">
                                    <span className="text-[9px] text-slate-400 font-bold flex items-center gap-0.5">
                                      <Heart className="w-2.5 h-2.5 text-rose-500 fill-rose-500/20" />
                                      {toPersianDigits(comment.likesCount)} پسند
                                    </span>
                                    
                                    <button
                                      onClick={() => handleLikeComment(post.id, comment.id)}
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                                        isCommentLikedByMe 
                                          ? "text-rose-600 bg-rose-50" 
                                          : "text-slate-400 hover:text-rose-600 hover:bg-slate-100"
                                      }`}
                                    >
                                      {isCommentLikedByMe ? "پسندیده شد" : "پسندیدن"}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {post.comments.length > 1 && (
                            <button
                              type="button"
                              onClick={() => toggleComments(post.id)}
                              className="w-full text-center py-2 text-[10.5px] font-black text-[#0284c7] hover:text-[#0369a1] bg-white border border-slate-100 rounded-xl transition-all hover:bg-slate-50 cursor-pointer flex items-center justify-center gap-1.5 mt-2 shadow-3xs"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              {isExpanded ? (
                                "بستن دیدگاه‌های اضافی"
                              ) : (
                                `مشاهده تمام دیدگاه‌ها (نمایش ${toPersianDigits(post.comments.length - 1)} دیدگاه دیگر)`
                              )}
                            </button>
                          )}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 text-center font-bold">اولین نفری باشید که دیدگاهی ثبت می‌کند...</p>
                      )}

                      {/* Add Comment Input Form */}
                      <form 
                        onSubmit={(e) => handleAddComment(post.id, e)}
                        className="flex gap-2 items-center border-t border-slate-200/50 pt-3"
                      >
                        <input
                          type="text"
                          value={commentInputs[post.id] || ""}
                          onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                          placeholder="دیدگاه خود را بنویسید..."
                          className="flex-1 bg-white border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs text-slate-700 outline-none focus:border-olive-300 transition-colors"
                        />
                        <button
                          type="submit"
                          disabled={!(commentInputs[post.id] || "").trim()}
                          className="p-2 bg-[#0284c7] hover:bg-[#0369a1] disabled:opacity-50 text-white rounded-xl transition-all shadow-sm shrink-0 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5 transform -rotate-45" />
                        </button>
                      </form>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

          {/* Left Column: Embedded Leaderboard / Legendin Hall of Fame (1/3 width) */}
          <div className="lg:col-span-1 space-y-6 min-w-0">
            {currentUser.role !== "manager" && (
              <div className="bg-white border border-slate-100 rounded-2xl p-3.5 sm:p-5 shadow-sm space-y-4 min-w-0">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Award className="w-5 h-5 text-[#0284c7] shrink-0" />
                  <div>
                    <h3 className="text-xs font-black text-slate-900">صدرنشینان هفته لجندین</h3>
                    <p className="text-[9px] text-slate-400 font-bold">آرتیست‌های برتر تایید شده جامعه</p>
                  </div>
                </div>

                <div className="divide-y divide-slate-50">
                  {topArtists.map((artist, idx) => {
                    return (
                      <div 
                        key={artist.id} 
                        className="flex items-center justify-between py-3 gap-1 group transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Rank Badge */}
                          <div className={`w-5.5 h-5.5 rounded-full flex items-center justify-center text-[9px] font-black border shrink-0 ${
                            idx === 0 ? "bg-amber-50 text-amber-600 border-amber-200" :
                            idx === 1 ? "bg-slate-50 text-slate-500 border-slate-200" :
                            idx === 2 ? "bg-orange-50 text-orange-600 border-orange-200" :
                            "bg-slate-50/50 text-slate-400 border-slate-100"
                          }`}>
                            {toPersianDigits(idx + 1)}
                          </div>

                          {/* Avatar */}
                          <img
                            src={artist.avatar}
                            alt={artist.name}
                            onClick={() => {
                              if (onSelectUser) onSelectUser(artist);
                            }}
                            className="w-8 h-8 rounded-xl object-cover border border-slate-100 shrink-0 cursor-pointer hover:ring-2 hover:ring-[#0284c7]/25 transition-all"
                          />

                          {/* Name and Specialty */}
                          <div className="min-w-0">
                            <h4 
                              onClick={() => {
                                if (onSelectUser) onSelectUser(artist);
                              }}
                              className="text-[11px] font-black text-slate-800 hover:text-[#0284c7] cursor-pointer truncate transition-colors"
                            >
                              {artist.name}
                            </h4>
                            <p className="text-[8.5px] text-slate-400 truncate font-bold mt-0.5">{artist.title}</p>
                          </div>
                        </div>

                        {/* Score or view action */}
                        <div className="flex items-center gap-1.5 shrink-0 text-left">
                          <div className="flex items-center gap-0.5 text-amber-500 justify-end">
                            <Star className="w-2.5 h-2.5 fill-amber-400 stroke-amber-400" />
                            <span className="text-[9.5px] font-black text-slate-700">{toPersianDigits(artist.rating || 4.5)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-slate-100 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      // Trigger custom tab change via onSelectUser if they want, but we can also just let them use the navigation or callback
                      if (onSelectUser && topArtists.length > 0) {
                        onSelectUser(topArtists[0]);
                      }
                    }}
                    className="text-[9.5px] font-extrabold text-[#0284c7] hover:text-[#0369a1] flex items-center justify-center gap-1 mx-auto transition-colors cursor-pointer"
                  >
                    <span>مشاهده جزئیات رتبه‌بندی مشاهیر</span>
                    <ArrowLeft className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* A small elegant card for the community rules / values */}
            <div className="bg-gradient-to-br from-[#0284c7]/5 to-slate-50 border border-[#0284c7]/15 rounded-2xl p-4 shadow-3xs space-y-2.5">
              <h4 className="text-[10px] font-black text-[#0369a1] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                تایید کیفیت و ممیزی هنرمندان
              </h4>
              <p className="text-[9px] text-slate-500 leading-relaxed font-semibold">
                تمامی اعضای تالار صدرنشینان لجندین، پیشتر سابقه ممیزی کارهای فیزیکی، مهارت‌ها و نظرات مراجعین واقعی خود را تکمیل نموده‌اند.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- SUB-TAB 2: SALONS LEGENDIN ----------------- */}
      {subTab === "salons" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-2">
            <h3 className="text-sm font-extrabold text-slate-950 flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#0284c7]" />
              تالار سالن‌های مجلل عضو لجندین (Legendin Elite Salons)
            </h3>
            <p className="text-[11px] text-slate-500">
              با برترین عمارت‌های زیبایی، سالن‌های فوق‌تخصصی و سالن‌های زنجیره‌ای لوکس کشور آشنا شوید و آگهی‌های شغلی فعال آن‌ها را رصد کنید.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {(salonsList || [])
              .filter((manager) => currentUser.role !== "manager" || manager.id !== currentUser.id)
              .map((manager) => (
                <div key={manager.id} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col">
                  {/* Cover Image Banner */}
                  <div className="h-24 bg-[#0284c7]/10 relative">
                    {manager.coverImage ? (
                      <img src={manager.coverImage} alt="Salon Cover" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[#0284c7]/20" />
                    )}
                    {manager.openForHiring && (
                      <span className="absolute top-2.5 right-2.5 bg-emerald-600 text-white text-[8px] font-black px-2.5 py-1 rounded-full shadow-xs uppercase tracking-wider">
                        در حال جذب نیرو
                      </span>
                    )}
                  </div>

                  {/* Profile Meta Body */}
                  <div className="p-3.5 sm:p-4 flex-1 flex flex-col space-y-3.5 text-right relative min-w-0">
                    {/* Floating Salon Logo Avatar */}
                    <img
                      src={manager.avatar}
                      alt={manager.salonName}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border-2 border-white shadow-md absolute -top-6 sm:-top-8 right-3.5 sm:right-4 shrink-0"
                    />

                    <div className="pt-5 min-w-0">
                      <h4 className="text-xs sm:text-[13px] font-black text-slate-900 break-words">{manager.salonName}</h4>
                      <p className="text-[9.5px] sm:text-[10px] text-slate-400 font-bold mt-0.5 flex flex-wrap items-center gap-1 break-words">
                        <Users className="w-3.5 h-3.5 text-[#0284c7] shrink-0" />
                        <span>با مدیریت: {manager.name} ({manager.title})</span>
                      </p>
                    </div>

                    <p className="text-xs sm:text-[10.5px] text-slate-600 leading-relaxed flex-1 break-words">
                      {manager.salonDescription || manager.bio}
                    </p>

                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 space-y-1.5 min-w-0">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold break-words">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="break-words">{manager.salonLocation || "تهران"}</span>
                      </div>
                    </div>

                    {/* Actions Bar inside Salon Card */}
                    <div className="pt-2 border-t border-slate-100">
                      {currentUser.role === "manager" ? (
                        <button
                          onClick={() => {
                            if (currentUser.id === "guest") {
                              alert("لطفاً ابتدا وارد حساب کاربری خود شوید.");
                              return;
                            }
                            setActiveMessageRecipient(manager);
                          }}
                          className="w-full bg-[#0284c7] hover:bg-[#0369a1] text-white text-[10px] sm:text-[10.5px] font-black py-2.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer text-center break-words"
                        >
                          <Mail className="w-3.5 h-3.5 shrink-0" />
                          <span>مکاتبه مستقیم با سالن</span>
                        </button>
                      ) : (
                        <div className="flex flex-wrap sm:flex-nowrap gap-2">
                          <button
                            onClick={() => triggerToast(`درخواست استخدام و سابقه کاری شما به صورت زنده برای مدیریت سالن (${manager.name}) ارسال شد! 📬`)}
                            className="flex-1 min-w-[140px] bg-[#0284c7] hover:bg-[#0369a1] text-white text-[10px] sm:text-[10.5px] font-bold py-2.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1 shadow-2xs cursor-pointer text-center break-words"
                          >
                            <Briefcase className="w-3.5 h-3.5 shrink-0" />
                            <span>ارسال رزومه سریع</span>
                          </button>
                          <button
                            onClick={() => triggerToast(`شماره تماس موقت جهت هماهنگی با مدیریت سالن: ${manager.phone}`)}
                            className="bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10.5px] px-3.5 py-2.5 rounded-xl border border-slate-200 transition-all flex items-center justify-center cursor-pointer shrink-0"
                          >
                            <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ----------------- SUB-TAB 3: ARTIST SKILLS ----------------- */}
      {subTab === "skills" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-2">
            <h3 className="text-sm font-extrabold text-slate-950 flex items-center gap-2">
              <Scissors className="w-4 h-4 text-[#0284c7]" />
              اطلس تخصص‌های زیبایی (Beauty Skill Atlas)
            </h3>
            <p className="text-[11px] text-slate-500">
              یک تخصص فنی را انتخاب کرده و برترین آرتیست‌های تایید شده که دارای مدال‌ها و مهارت‌های معتبر در آن لاین کاری هستند را فوراً ارزیابی نمایید.
            </p>
          </div>

          {/* Grid Category Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {BEAUTY_CATEGORIES.map((cat) => {
              const IconComp = cat.icon;
              const isSelected = selectedSkillCategory === cat.id;
              // Count artists with this category
              const count = (allUsers || []).filter(u => u.role === "artist" && u.skills?.some(s => s.category === cat.id)).length;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedSkillCategory(cat.id)}
                  className={`p-4 rounded-2xl border text-right transition-all cursor-pointer relative overflow-hidden group ${
                    isSelected
                      ? "bg-[#0284c7] border-[#0284c7] text-white shadow-md"
                      : "bg-white border-slate-150 text-slate-800 hover:border-[#0284c7] hover:shadow-xs"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-xl ${isSelected ? "bg-white/20 text-white" : "bg-slate-50 text-[#0284c7] group-hover:bg-[#0284c7]/10"}`}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${isSelected ? "bg-white/30 text-white" : "bg-slate-100 text-slate-500"}`}>
                      {toPersianDigits(count)} نفر
                    </span>
                  </div>
                  <h4 className="text-xs font-black">{cat.title}</h4>
                  <p className={`text-[9px] leading-tight mt-1 line-clamp-1 ${isSelected ? "text-white/80" : "text-slate-400"}`}>
                    {cat.desc}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Result Artists Title */}
          <div className="pt-2">
            <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-100 pb-2.5 mb-4">
              <span className="text-xs font-black text-slate-800 break-words">
                متخصصین لاین "{selectedSkillCategory}" ({toPersianDigits(artistsBySkillCategory.length)} آرتیست فعال)
              </span>
              <span className="text-[10px] text-[#0284c7] font-bold shrink-0">تایید شده توسط ائتلاف Legendin</span>
            </div>

            {/* List of matching specialists */}
            {artistsBySkillCategory.length > 0 ? (
              <div className="space-y-4">
                {artistsBySkillCategory.map((artist) => (
                  <div key={artist.id} className="bg-white border border-slate-100 rounded-2xl p-3.5 sm:p-4.5 shadow-xs flex flex-col sm:flex-row items-center sm:items-start gap-3.5 sm:gap-4 hover:shadow-xs transition-all text-center sm:text-right min-w-0">
                    
                    {/* Left: Avatar */}
                    <img
                      src={artist.avatar}
                      alt={artist.name}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border-2 border-slate-100 shrink-0 shadow-2xs"
                    />

                    {/* Middle info */}
                    <div className="flex-1 space-y-1.5 min-w-0 w-full">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-[13px] font-black text-slate-900 break-words">{artist.name}</h4>
                          <p className="text-[10px] text-[#0284c7] font-bold break-words">{artist.title}</p>
                        </div>
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1">
                          <span className="text-amber-500 text-xs shrink-0">⭐</span>
                          <span className="text-xs font-black text-slate-800">{toPersianDigits(artist.rating || 4.5)}</span>
                          <span className="text-slate-300">|</span>
                          <span className="text-[10px] sm:text-[10.5px] font-bold text-slate-500">{toPersianDigits(artist.yearsOfExperience || 0)} سال سابقه</span>
                        </div>
                      </div>

                      <p className="text-xs sm:text-[10.5px] text-slate-600 leading-relaxed line-clamp-2 break-words">
                        {artist.bio}
                      </p>

                      <div className="flex flex-wrap justify-center sm:justify-start gap-1 pt-1">
                        {artist.skills?.map((sk, sIdx) => (
                          <span key={sIdx} className="bg-slate-50 border border-slate-150 text-slate-600 text-[8.5px] font-bold px-2 py-0.5 rounded-lg break-words">
                            {sk.name}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Right Button actions */}
                    <div className="flex sm:flex-col gap-2 shrink-0 w-full sm:w-auto pt-2 sm:pt-0">
                      <button
                        onClick={() => triggerToast(`یک سیگنال همکاری فوری از طرف شما برای آرتیست ${artist.name} فرستاده شد! 🚀`)}
                        className="flex-1 sm:w-28 bg-slate-950 hover:bg-slate-800 text-white text-[10px] font-bold py-2 px-3 rounded-xl transition-all text-center cursor-pointer break-words"
                      >
                        مذاکره مستقیم
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-150 rounded-2xl p-8 text-center">
                <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-bold">هیچ آرتیست ثبت شده‌ای در این لاین فعلاً فعال نیست.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compose Colleague Message Modal */}
      {activeMessageRecipient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-slate-100 overflow-hidden text-right" dir="rtl">
            <div className="bg-gradient-to-l from-[#0284c7] to-[#0369a1] p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 animate-pulse" />
                <h3 className="text-sm font-black">ارسال پیام مستقیم بین‌سالنی (مکاتبه همکار)</h3>
              </div>
              <button
                onClick={() => setActiveMessageRecipient(null)}
                className="text-white/80 hover:text-white font-bold text-xs"
              >
                بستن ×
              </button>
            </div>

            <form onSubmit={handleSendColleagueMessage} className="p-5 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                <p className="text-[10px] text-slate-400 font-bold">گیرنده:</p>
                <p className="text-xs font-black text-slate-800">
                  {activeMessageRecipient.salonName} <span className="text-[10px] text-slate-500 font-bold">(به مدیریت: {activeMessageRecipient.name})</span>
                </p>
                <p className="text-[10px] text-slate-400 font-bold mt-1">فرستنده:</p>
                <p className="text-xs font-black text-slate-800">
                  {currentUser.salonName} <span className="text-[10px] text-slate-500 font-bold">(به مدیریت: {currentUser.name})</span>
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-700">موضوع مکاتبه:</label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً: هماهنگی جهت انتقال پرسنل یا تهاتر ابزار..."
                  value={msgSubject}
                  onChange={(e) => setMsgSubject(e.target.value)}
                  className="w-full text-xs text-slate-800 placeholder-slate-400 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-[#0284c7] focus:bg-white transition-all font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-700">متن پیام (مانند ایمیل داخلی):</label>
                <textarea
                  required
                  rows={5}
                  placeholder="پیام خود را با جزئیات وارد کنید..."
                  value={msgBody}
                  onChange={(e) => setMsgBody(e.target.value)}
                  className="w-full text-xs text-slate-800 placeholder-slate-400 bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 focus:outline-none focus:border-[#0284c7] focus:bg-white transition-all resize-none font-medium"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-black py-3 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  ارسال نهایی پیام
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMessageRecipient(null)}
                  className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

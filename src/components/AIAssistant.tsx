import React, { useState, useRef, useEffect } from "react";
import { 
  Sparkles, 
  Send, 
  Trash2, 
  Bot, 
  User as UserIcon, 
  DollarSign, 
  TrendingUp, 
  UserCheck, 
  Compass, 
  HelpCircle, 
  Loader2, 
  ArrowLeft,
  Scissors
} from "lucide-react";
import { User, ClientRequest } from "../types";
import { toPersianDigits } from "../utils/shamsi";
import Markdown from "react-markdown";

interface AIAssistantProps {
  currentUser: User;
  allUsers: User[];
  clientRequests: ClientRequest[];
  transactions?: any[];
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function AIAssistant({ currentUser, allUsers, clientRequests, transactions = [] }: AIAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isManager = currentUser.role === "manager";
  const userName = currentUser.name || "کاربر مهمان";

  // Predefined prompts for dynamic layout
  const clientSuggestions = [
    { text: "مدل خاص ناخن تا رنج قیمت ۲ میلیون تومن؟ 💅", query: "مدل خاص ناخن تا رنج قیمت ۲ میلیون تومن چی پیشنهاد میدی؟" },
    { text: "ناخن‌کاران مجرب و برتر تهران کیا هستن؟ 👩‍🎨", query: "آرتیست‌های متخصص و مجرب ناخن در شهر تهران رو بر اساس امتیاز معرفی کن" },
    { text: "جدیدترین ترندهای دیزاین ناخن و میکاپ چیه؟ ✨", query: "جدیدترین ترندهای کاشت ناخن، ژلیش و میکاپ چیست؟" },
    { text: "راهنمایی جهت نحوه رزرو نوبت از آرتیست‌ها 📅", query: "چطور می‌تونم از دایرکتوری استخدام آرتیست‌ها یک نوبت رزرو ثبت کنم؟" }
  ];

  const managerSuggestions = [
    { text: "تحلیل مالی سالن و گزارش درآمد کل 📈", query: "یک گزارش مالی و برآورد درآمد کل سالن بر اساس نوبت‌های تایید شده و معلق ارائه بده." },
    { text: "بررسی لود کاری و عملکرد نوبت‌دهی آرتیست‌ها 👥", query: "وضعیت نوبت‌ها و لود کاری کدام آرتیست‌ها در حال حاضر بیشتر است؟" },
    { text: "پیشنهاد جذب و استخدام آرتیست‌های برتر 🤝", query: "با توجه به دایرکتوری آرتیست‌های آماده به کار، چه افرادی رو برای سالن پیشنهاد می‌کنی؟" },
    { text: "چگونه راندمان کاری سالن زیبایی خود را ارتقا دهم؟ 💡", query: "راهکارهای عملی برای افزایش درآمد سالن و بهبود رضایت مشتریان چیست؟" }
  ];

  const currentSuggestions = isManager ? managerSuggestions : clientSuggestions;

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeText = isManager
        ? `سلام جناب/سرکار خانم **${userName}**، مدیر محترم مجموعه. 💼\n\nمن دستیار هوشمند مدیریتی شما در **لجندین** هستم. آماده‌ام تا گزارش‌های مالی سالن، لود کاری آرتیست‌ها، وضعیت رزروهای ثبت شده و تحلیل‌های آماری ارزشمندی را در اختیارتان بگذارم.\n\nچه گزارشی برای شما آماده کنم؟`
        : `سلام **${userName}** عزیز! به بخش مشاوره هوشمند و زیبایی **لجندین** خوش آمدید. 🌸\n\nمن اینجام تا به شما در پیدا کردن بهترین خدمات و مدل‌ها کمک کنم. مثلاً می‌توانید درباره **مدل‌های خاص ناخن تا رنج ۲ میلیون تومان**، آرتیست‌های متخصص و ترندهای جدید آرایشی از من بپرسید!\n\nچطور می‌توانم کمکتان کنم؟`;

      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: welcomeText,
          timestamp: new Date()
        }
      ]);
    }
  }, [isManager, userName]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      role: "user",
      content: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      // Build previous message payload for Gemini
      const chatHistory = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chatHistory,
          role: currentUser.role,
          userName: currentUser.name,
          allUsers,
          clientRequests,
          transactions
        })
      });

      if (!response.ok) {
        throw new Error("خطا در پاسخ سرور");
      }

      const data = await response.json();
      
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          role: "assistant",
          content: data.content,
          timestamp: new Date()
        }
      ]);
    } catch (error) {
      console.error("AI Assistant Error:", error);
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          role: "assistant",
          content: "متأسفانه در اتصال به مرکز هوش مصنوعی خطایی رخ داد. لطفا چند لحظه دیگر دوباره تلاش فرمایید.",
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setIsConfirmingClear(false);
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-xs flex flex-col h-[70vh] md:h-[75vh] text-right font-sans" dir="rtl">
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-[#0284c7] to-[#0369a1] p-4.5 text-white flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white ring-2 ring-white/10 shadow-inner">
            {isManager ? <TrendingUp className="w-5 h-5 animate-pulse" /> : <Sparkles className="w-5 h-5 animate-pulse" />}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] bg-emerald-500/30 text-emerald-300 font-extrabold px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                برخط • هوش مصنوعی
              </span>
            </div>
            <h2 className="text-sm font-black tracking-wide mt-0.5">
              {isManager ? "دستیار تحلیلی و مدیریتی لجندین" : "مشاور هوشمند زیبایی و استایل"}
            </h2>
          </div>
        </div>

        {messages.length > 1 && (
          isConfirmingClear ? (
            <div className="flex items-center gap-1.5 bg-white/10 p-1 px-2 rounded-xl text-[10px] text-white">
              <span className="font-bold">پاک شود؟</span>
              <button
                type="button"
                onClick={handleClearChat}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-2 py-0.5 rounded-md cursor-pointer text-[9px]"
              >
                بله
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmingClear(false)}
                className="bg-white/20 hover:bg-white/30 text-white font-bold px-2 py-0.5 rounded-md cursor-pointer text-[9px]"
              >
                خیر
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsConfirmingClear(true)}
              className="p-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 hover:text-white rounded-xl transition-all cursor-pointer"
              title="پاک کردن گفتگو"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )
        )}
      </div>

      {/* Messages Scroll View */}
      <div className="flex-1 overflow-y-auto p-4.5 space-y-4 bg-slate-50/60 scrollbar-thin scrollbar-thumb-slate-200">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div 
              key={msg.id} 
              className={`flex gap-3 max-w-[85%] md:max-w-[75%] ${isUser ? "mr-auto flex-row-reverse text-left" : "ml-auto"}`}
            >
              {/* Avatar Icon */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-2xs ${
                isUser 
                  ? "bg-[#0284c7] text-white" 
                  : isManager 
                  ? "bg-amber-100 text-amber-700 border border-amber-200" 
                  : "bg-emerald-100 text-emerald-700 border border-emerald-200"
              }`}>
                {isUser ? (
                  <UserIcon className="w-4 h-4" />
                ) : isManager ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </div>

              {/* Message Content Bubble */}
              <div className={`rounded-2xl px-4 py-3 text-right text-xs leading-relaxed ${
                isUser 
                  ? "bg-[#0284c7] text-white rounded-tl-none shadow-xs" 
                  : "bg-white text-slate-800 border border-slate-150/80 rounded-tr-none shadow-2xs"
              }`}>
                {isUser ? (
                  <p className="whitespace-pre-line font-medium">{msg.content}</p>
                ) : (
                  <div className="markdown-body space-y-2">
                    <Markdown>{msg.content}</Markdown>
                  </div>
                )}
                
                {/* Time Indicator */}
                <p className={`text-[8.5px] mt-2 ${isUser ? "text-white/60 text-left" : "text-slate-400 text-right"} font-mono font-bold`}>
                  {msg.timestamp.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}

        {/* Loading Bubble */}
        {isLoading && (
          <div className="flex gap-3 max-w-[60%] ml-auto">
            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center shrink-0 border border-slate-300">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-white border border-slate-150 rounded-2xl rounded-tr-none px-4 py-3 flex items-center gap-2 shadow-2xs">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-75"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-150"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-300"></span>
              </span>
              <span className="text-[10.5px] text-slate-400 font-bold">لجندین در حال تحلیل و پاسخ...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Presets */}
      {messages.length <= 2 && (
        <div className="px-4.5 py-3 border-t border-slate-100 bg-slate-50/30 shrink-0">
          <p className="text-[9.5px] text-slate-400 font-black mb-2 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-[#0284c7]" /> سوالات پیشنهادی و سریع:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {currentSuggestions.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(item.query)}
                disabled={isLoading}
                className="text-[9.5px] font-extrabold bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-3xs disabled:opacity-50"
              >
                {item.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message Input Box */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(input);
        }}
        className="p-3 border-t border-slate-100 bg-white flex gap-2 items-center shrink-0"
      >
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            input.trim() && !isLoading
              ? "bg-[#0284c7] hover:bg-[#0369a1] text-white cursor-pointer active:scale-95"
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          }`}
        >
          <Send className="w-4 h-4 rotate-180" />
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isManager ? "از من بپرسید... مثلا: گزارش درآمد نوبت‌های تایید شده" : "سوالی داری؟ مثلا: مدل کاشت ناخن تا رنج قیمت ۲ میلیون تومن..."}
          className="flex-1 bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-xs text-slate-800 placeholder-slate-400 border border-slate-200 focus:border-[#0284c7] rounded-xl px-4 py-3 text-right outline-none transition-all font-semibold"
          disabled={isLoading}
        />
      </form>
    </div>
  );
}

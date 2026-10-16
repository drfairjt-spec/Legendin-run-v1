import React, { useState, useMemo } from "react";
import { User, Transaction, TransactionCategory, TransactionDirection } from "../types";
import { jalaliToGregorian, toPersianDigits, formatToman } from "../utils/shamsi";
import { calculateEmployeeBalance, EmployeeBalanceSummary } from "../utils/employeeBalance";
import AddTransactionForm from "./AddTransactionForm";
import { 
  TrendingUp, TrendingDown, DollarSign, BarChart2, Plus, Users, 
  Calendar, ArrowLeft, X, Filter, ArrowUpDown, ChevronDown, FileText, CheckCircle
} from "lucide-react";
import { 
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend 
} from "recharts";

interface FinanceDashboardProps {
  salonId: string;
  transactions: Transaction[];
  onUpdateTransactions: (updated: Transaction[]) => void;
  allUsers: User[];
}

// Converts a Shamsi YYYY/MM/DD string to a Gregorian Date object for precise age/range comparison
function shamsiToGregorianDate(shamsiStr: string): Date {
  try {
    const parts = shamsiStr.split("/");
    if (parts.length !== 3) return new Date();
    const jy = parseInt(parts[0], 10);
    const jm = parseInt(parts[1], 10);
    const jd = parseInt(parts[2], 10);
    const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
    return new Date(gy, gm - 1, gd);
  } catch {
    return new Date();
  }
}

export default function FinanceDashboard({
  salonId = "salon-1",
  transactions = [],
  onUpdateTransactions,
  allUsers = []
}: FinanceDashboardProps) {
  const [period, setPeriod] = useState<"week" | "month" | "all">("month");
  const [showAddForm, setShowAddForm] = useState(false);
  const [detailStaff, setDetailStaff] = useState<User | null>(null);
  const [localTransactions, setLocalTransactions] = useState<Transaction[]>(transactions);

  // Sync local state with props when transactions change
  React.useEffect(() => {
    setLocalTransactions(transactions);
  }, [transactions]);

  // Fetch transactions from secure API on mount
  React.useEffect(() => {
    async function fetchTransactions() {
      try {
        const token = localStorage.getItem("legendin_jwt_token");
        if (!token) return;

        const response = await fetch("/api/transactions", {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            setLocalTransactions(data);
            onUpdateTransactions(data);
          }
        }
      } catch (err) {
        console.error("Failed to fetch transactions from API:", err);
      }
    }

    fetchTransactions();
  }, [onUpdateTransactions]);

  // Sorting / Filtering states for Employee table
  const [contractFilter, setContractFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc" | "none">("desc"); // desc = highest netBalance (owed to staff) first

  // Reference date (latest transaction date in system or today)
  const referenceDate = useMemo(() => {
    if (transactions.length === 0) return new Date();
    const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date));
    return shamsiToGregorianDate(sorted[0].date);
  }, [transactions]);

  // Filter transactions based on selected period
  const filteredTransactions = useMemo(() => {
    return (transactions || []).filter(t => {
      if (period === "all") return true;
      const tDate = shamsiToGregorianDate(t.date);
      const diffMs = referenceDate.getTime() - tDate.getTime();
      const diffDays = diffMs / (1000 * 3600 * 24);
      
      if (period === "week") {
        return diffDays >= 0 && diffDays <= 7;
      }
      if (period === "month") {
        return diffDays >= 0 && diffDays <= 30;
      }
      return true;
    });
  }, [transactions, period, referenceDate]);

  // Compute stats: total income, total cost, net balance, transaction count
  const stats = useMemo(() => {
    let totalIncome = 0;
    let totalCost = 0;
    
    filteredTransactions.forEach(t => {
      if (t.direction === "income") {
        totalIncome += t.amount;
      } else {
        totalCost += t.amount;
      }
    });

    const netProfit = totalIncome - totalCost;
    
    return {
      totalIncome,
      totalCost,
      netProfit,
      count: filteredTransactions.length
    };
  }, [filteredTransactions]);

  // Trend Chart Data (Grouped by Date)
  const trendChartData = useMemo(() => {
    const groups: Record<string, { date: string; income: number; cost: number }> = {};
    
    filteredTransactions.forEach(t => {
      const dateLabel = t.date; // Use raw Shamsi date string as label
      if (!groups[dateLabel]) {
        groups[dateLabel] = { date: dateLabel, income: 0, cost: 0 };
      }
      if (t.direction === "income") {
        groups[dateLabel].income += t.amount;
      } else {
        groups[dateLabel].cost += t.amount;
      }
    });

    // Convert to sorted array
    return Object.values(groups).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredTransactions]);

  // Cost by Category Breakdown
  const costBreakdownData = useMemo(() => {
    const categories: Record<string, number> = {
      "اجاره سالن": 0,
      "خرید و مایحتاج": 0,
      "قبوض": 0,
      "حقوق پرسنل": 0,
      "سایر هزینه": 0
    };

    filteredTransactions.forEach(t => {
      if (t.direction === "cost" && t.category in categories) {
        categories[t.category] += t.amount;
      } else if (t.direction === "cost") {
        categories["سایر هزینه"] += t.amount;
      }
    });

    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [filteredTransactions]);

  // Income by Category Breakdown
  const incomeBreakdownData = useMemo(() => {
    const categories: Record<string, number> = {
      "درآمد خدمات": 0,
      "درآمد نوبت تخفیف‌دار": 0,
      "سایر درآمد": 0
    };

    filteredTransactions.forEach(t => {
      if (t.direction === "income" && t.category in categories) {
        categories[t.category] += t.amount;
      } else if (t.direction === "income") {
        categories["سایر درآمد"] += t.amount;
      }
    });

    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [filteredTransactions]);

  // Get active salon staff (artists & service staff)
  const salonStaff = useMemo(() => {
    return (allUsers || []).filter(u => u.role === "artist");
  }, [allUsers]);

  // Calculate balances for each employee
  const employeeBalances = useMemo(() => {
    let summaries = salonStaff.map(staff => calculateEmployeeBalance(staff, transactions));
    
    // Filter by contract type if selected
    if (contractFilter !== "all") {
      summaries = summaries.filter(s => s.contractType === contractFilter);
    }

    // Sort summaries by netBalance
    if (sortOrder === "desc") {
      // Highest positive balance (salon owes staff most) first
      summaries.sort((a, b) => b.netBalance - a.netBalance);
    } else if (sortOrder === "asc") {
      // Negative balance (staff owes salon most) first
      summaries.sort((a, b) => a.netBalance - b.netBalance);
    }

    return summaries;
  }, [salonStaff, transactions, contractFilter, sortOrder]);

  // Handle adding a new transaction
  const handleAddTransaction = (newTx: Omit<Transaction, "id">) => {
    const txWithId: Transaction = {
      ...newTx,
      id: `tx-manual-${Date.now()}`
    };
    onUpdateTransactions([txWithId, ...transactions]);
    alert("تراکنش جدید با موفقیت ثبت و به دفتر معین سالن اضافه شد.");
  };

  // Detailed ledger filtered for selected employee
  const detailStaffLedger = useMemo(() => {
    if (!detailStaff) return [];
    return transactions
      .filter(t => t.relatedStaffId === detailStaff.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, detailStaff]);

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* Upper Panel: Filters & Add Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-xs">
        {/* Segmented Period Selection */}
        <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100 w-fit">
          <button
            onClick={() => setPeriod("week")}
            className={`py-1.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              period === "week"
                ? "bg-white text-[#0284c7] shadow-sm font-black"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            این هفته
          </button>
          <button
            onClick={() => setPeriod("month")}
            className={`py-1.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              period === "month"
                ? "bg-white text-[#0284c7] shadow-sm font-black"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            این ماه
          </button>
          <button
            onClick={() => setPeriod("all")}
            className={`py-1.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              period === "all"
                ? "bg-white text-[#0284c7] shadow-sm font-black"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            همه زمان‌ها
          </button>
        </div>

        {/* Action Button */}
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-[#0284c7] hover:bg-[#5C6B43] text-white text-xs font-black rounded-2xl transition-all shadow-md shadow-[#0284c7]/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          ثبت تراکنش جدید
        </button>
      </div>

      {/* KPI Stats Cards (4 in a row) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Income */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full -mr-4 -mt-4" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-slate-400">مجموع درآمد بازه</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-sm font-black text-slate-800 mb-1">{formatToman(stats.totalIncome)}</p>
          <span className="text-[9px] text-emerald-600 font-bold">ورودی‌های قطعی و خدمات</span>
        </div>

        {/* Total Cost */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/5 rounded-full -mr-4 -mt-4" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-slate-400">مجموع هزینه بازه</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-sm font-black text-slate-800 mb-1">{formatToman(stats.totalCost)}</p>
          <span className="text-[9px] text-rose-600 font-bold">حقوق، اجاره، قبوض و ملزومات</span>
        </div>

        {/* Net Balance / Profit */}
        <div className={`bg-white border rounded-3xl p-5 shadow-xs relative overflow-hidden ${
          stats.netProfit >= 0 ? "border-emerald-100" : "border-rose-100"
        }`}>
          <div className={`absolute top-0 right-0 w-16 h-16 rounded-full -mr-4 -mt-4 ${
            stats.netProfit >= 0 ? "bg-emerald-500/5" : "bg-rose-500/5"
          }`} />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-slate-400">سود خالص سالن</span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              stats.netProfit >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
            }`}>
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-sm font-black mb-1 ${
            stats.netProfit >= 0 ? "text-emerald-600" : "text-rose-600"
          }`}>{formatToman(stats.netProfit)}</p>
          <span className={`text-[9px] font-bold ${
            stats.netProfit >= 0 ? "text-emerald-600" : "text-rose-500"
          }`}>
            {stats.netProfit >= 0 ? "موازنه مثبت مالی" : "موازنه منفی مالی"}
          </span>
        </div>

        {/* Transaction Count */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-[#0284c7]/5 rounded-full -mr-4 -mt-4" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-slate-400">تعداد تراکنش‌ها</span>
            <div className="w-7 h-7 rounded-lg bg-[#0284c7]/10 flex items-center justify-center text-[#0284c7]">
              <BarChart2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-sm font-black text-slate-800 mb-1">{toPersianDigits(stats.count)} تراکنش</p>
          <span className="text-[9px] text-slate-400 font-bold">سند ثبت شده در معین</span>
        </div>
      </div>

      {/* Visual Analytics / Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Line Chart: Income vs Cost trend over time */}
        <div className="lg:col-span-8 bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#0284c7]" /> روند زمانی درآمد و هزینه‌ها
            </h4>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
              {trendChartData.length > 0 ? "نمودار زمانی خطی" : "داده کافی جهت نمایش وجود ندارد"}
            </span>
          </div>

          <div className="h-[260px] w-full" aria-label="نمودار روند درآمد و هزینه در طول زمان">
            {trendChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(val) => toPersianDigits(val.substring(5))} // Show MM/DD only
                    tick={{ fontSize: 10, fill: "#64748b", fontWeight: "bold" }}
                    stroke="#cbd5e1"
                  />
                  <YAxis 
                    tickFormatter={(val) => toPersianDigits(val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val.toLocaleString())}
                    tick={{ fontSize: 10, fill: "#64748b", fontWeight: "bold" }}
                    stroke="#cbd5e1"
                  />
                  <Tooltip 
                    contentStyle={{ direction: "rtl", borderRadius: "16px", border: "1px solid #f1f5f9", fontFamily: "sans-serif", fontSize: "11px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)" }}
                    formatter={(value: any, name: any) => {
                      const label = name === "income" ? "درآمد" : "هزینه";
                      return [formatToman(value as number), label];
                    }}
                    labelFormatter={(label) => `تاریخ: ${toPersianDigits(label)}`}
                  />
                  <Legend 
                    verticalAlign="top" 
                    height={36} 
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span className="text-[10px] font-bold text-slate-600">
                        {value === "income" ? "کل درآمد" : "کل هزینه"}
                      </span>
                    )}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="income" 
                    name="income" 
                    stroke="#10b981" 
                    strokeWidth={2.5} 
                    dot={{ r: 3, strokeWidth: 1, fill: "#10b981" }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cost" 
                    name="cost" 
                    stroke="#f43f5e" 
                    strokeWidth={2} 
                    strokeDasharray="4 4"
                    dot={{ r: 2, strokeWidth: 1, fill: "#f43f5e" }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-1 text-xs">
                <p>تراکنشی در این بازه زمانی ثبت نشده است.</p>
              </div>
            )}
          </div>
        </div>

        {/* Categorical Breakdown Bar Charts */}
        <div className="lg:col-span-4 bg-white border border-slate-100 rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 mb-1">
              <TrendingDown className="w-4 h-4 text-rose-500" /> تفکیک هزینه‌ها بر اساس دسته
            </h4>
            <p className="text-[10px] text-slate-400 font-bold">بیشترین سرفصل هزینه‌های سالن</p>
          </div>

          <div className="h-[180px] w-full" aria-label="نمودار میله‌ای افقی تفکیک هزینه‌ها">
            {costBreakdownData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={costBreakdownData} 
                  layout="vertical" 
                  margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis 
                    type="number" 
                    tickFormatter={(val) => toPersianDigits(val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val.toLocaleString())}
                    tick={{ fontSize: 9, fill: "#64748b" }}
                    stroke="#cbd5e1"
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    tick={{ fontSize: 9, fill: "#475569", fontWeight: "bold" }}
                    stroke="#cbd5e1"
                  />
                  <Tooltip 
                    contentStyle={{ direction: "rtl", borderRadius: "12px", border: "1px solid #f1f5f9", fontSize: "10px" }}
                    formatter={(value: any) => [formatToman(value), "هزینه"]}
                  />
                  <Bar dataKey="value" fill="#f43f5e" radius={[0, 4, 4, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                هیچ هزینه‌ای ثبت نشده است.
              </div>
            )}
          </div>

          {/* Income categories visual summary */}
          <div className="border-t border-slate-50 pt-3">
            <span className="text-[9px] text-slate-400 font-black block mb-2">خلاصه ورودی‌ها به تفکیک دسته:</span>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              {incomeBreakdownData.map((item) => (
                <div key={item.name} className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <span className="text-slate-500 font-bold block truncate">{item.name}</span>
                  <span className="text-[#0284c7] font-black">{toPersianDigits(item.value.toLocaleString())} ت</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Employee Balances Ledger Section (Accountant core) */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-4">
        
        {/* Table Header Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-50 pb-4">
          <div>
            <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#0284c7]" /> تراز معین پرسنل (حسابداری کارمندان)
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-1">مدیریت مبالغ تسویه‌نشده، درصدی، اجاره‌ای و حقوق ثابت</p>
          </div>

          {/* Filter & Sort Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            
            {/* Filter by Contract Type */}
            <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={contractFilter}
                onChange={(e) => setContractFilter(e.target.value)}
                className="bg-transparent text-[11px] font-bold text-slate-600 focus:outline-none border-none cursor-pointer"
              >
                <option value="all">همه قراردادها</option>
                <option value="درصدی">درصدی</option>
                <option value="اجاره‌ای">اجاره‌ای</option>
                <option value="حقوق ثابت">حقوق ثابت</option>
                <option value="نامشخص">بدون قرارداد</option>
              </select>
            </div>

            {/* Sort Balance */}
            <button
              onClick={() => {
                if (sortOrder === "desc") setSortOrder("asc");
                else if (sortOrder === "asc") setSortOrder("none");
                else setSortOrder("desc");
              }}
              className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-100 text-[11px] font-bold text-slate-600 transition-colors cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              طلب/بدهی: {
                sortOrder === "desc" ? "بیشترین طلب" : sortOrder === "asc" ? "بیشترین بدهی" : "پیش‌فرض"
              }
            </button>

          </div>
        </div>

        {/* Balances Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-50 text-[10px] font-black uppercase tracking-wider">
                <th className="pb-3 pt-1 font-black">پرسنل</th>
                <th className="pb-3 pt-1 font-black">نوع قرارداد</th>
                <th className="pb-3 pt-1 font-black text-center">کارکرد (درآمد ایجادشده)</th>
                <th className="pb-3 pt-1 font-black text-center">پرداختی به پرسنل</th>
                <th className="pb-3 pt-1 font-black text-center">مانده حساب (تراز سالن)</th>
                <th className="pb-3 pt-1 font-black text-center">آخرین فعالیت مالی</th>
                <th className="pb-3 pt-1 font-black text-center">جزئیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {employeeBalances.length > 0 ? (
                employeeBalances.map((item) => {
                  const staffUser = salonStaff.find(u => u.id === item.staffId);
                  
                  // Style colors based on netBalance (positive = owes artist, negative = artist owes salon)
                  let balanceColor = "text-slate-600 bg-slate-50 border-slate-100";
                  let balanceText = "تسویه شده";
                  
                  if (item.netBalance > 0) {
                    balanceColor = "text-emerald-700 bg-emerald-50 border-emerald-100/50";
                    balanceText = `بستانکار: ${formatToman(item.netBalance)}`;
                  } else if (item.netBalance < 0) {
                    balanceColor = "text-rose-700 bg-rose-50 border-rose-100/50";
                    balanceText = `بدهکار: ${formatToman(Math.abs(item.netBalance))}`;
                  } else if (item.contractType === "نامشخص") {
                    balanceText = "نامشخص (فاقد قرارداد)";
                  }

                  return (
                    <tr key={item.staffId} className="hover:bg-slate-50/50 transition-colors">
                      {/* Staff Name */}
                      <td className="py-3.5 flex items-center gap-2.5">
                        <img 
                          src={staffUser?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150"} 
                          alt={item.staffName}
                          className="w-8 h-8 rounded-full border border-slate-100 object-cover"
                        />
                        <div>
                          <p className="font-black text-slate-800 text-[11px]">{item.staffName}</p>
                          <p className="text-[9px] text-slate-400 font-bold">{staffUser?.title || "متخصص زیبایی"}</p>
                        </div>
                      </td>

                      {/* Contract Type */}
                      <td className="py-3.5">
                        <span className={`inline-flex items-center text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                          item.contractType === "درصدی"
                            ? "bg-amber-50 text-amber-700 border border-amber-100"
                            : item.contractType === "اجاره‌ای"
                            ? "bg-purple-50 text-purple-700 border border-purple-100"
                            : item.contractType === "حقوق ثابت"
                            ? "bg-blue-50 text-blue-700 border border-blue-100"
                            : "bg-slate-50 text-slate-400 border border-slate-100"
                        }`}>
                          {item.contractType}
                        </span>
                      </td>

                      {/* Generated Income */}
                      <td className="py-3.5 text-center font-bold text-slate-700">
                        {item.totalGeneratedIncome > 0 
                          ? toPersianDigits(item.totalGeneratedIncome.toLocaleString()) + " ت" 
                          : "۰"
                        }
                      </td>

                      {/* Paid Out */}
                      <td className="py-3.5 text-center font-bold text-slate-700">
                        {item.totalPaidOut > 0 
                          ? toPersianDigits(item.totalPaidOut.toLocaleString()) + " ت" 
                          : "۰"
                        }
                      </td>

                      {/* Net Balance */}
                      <td className="py-3.5 text-center">
                        <span className={`inline-flex items-center text-[10px] font-black px-3 py-1 rounded-xl border ${balanceColor}`}>
                          {balanceText}
                        </span>
                      </td>

                      {/* Last Activity */}
                      <td className="py-3.5 text-center text-[10px] text-slate-500 font-bold">
                        {item.lastTransactionDate ? toPersianDigits(item.lastTransactionDate) : "بدون تراکنش"}
                      </td>

                      {/* Ledger Action */}
                      <td className="py-3.5 text-center">
                        <button
                          onClick={() => {
                            if (staffUser) setDetailStaff(staffUser);
                          }}
                          className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-[10px] font-black rounded-lg border border-slate-100 transition-colors cursor-pointer"
                        >
                          دفتر معین
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-bold text-xs">
                    هیچ همکاری در سیستم یافت نشد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Manual Entry Form Modal */}
      {showAddForm && (
        <AddTransactionForm
          artists={salonStaff}
          salonId={salonId}
          onClose={() => setShowAddForm(false)}
          onSubmit={handleAddTransaction}
        />
      )}

      {/* Drill-down Employee Ledger Modal */}
      {detailStaff && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-sans" dir="rtl">
          <div className="bg-white rounded-3xl w-full max-w-2xl border border-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-50 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <img 
                  src={detailStaff.avatar} 
                  alt={detailStaff.name} 
                  className="w-10 h-10 rounded-full object-cover border border-slate-100"
                />
                <div>
                  <h3 className="text-xs font-black text-slate-800">ریز تراکنش‌ها: {detailStaff.name}</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                    نوع قرارداد: <span className="text-[#0284c7]">{detailStaff.contract?.contractType || "نامشخص"}</span> 
                    {detailStaff.contract?.amount && ` | مبلغ مبنا: ${toPersianDigits(detailStaff.contract.amount)}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailStaff(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Ledger Content */}
            <div className="p-6 max-h-[350px] overflow-y-auto space-y-3">
              {detailStaffLedger.length > 0 ? (
                detailStaffLedger.map((t) => (
                  <div 
                    key={t.id} 
                    className={`p-3.5 border rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-2 transition-all ${
                      t.direction === "income" 
                        ? "bg-emerald-50/20 border-emerald-100/50" 
                        : "bg-rose-50/20 border-rose-100/50"
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex text-[9px] font-black px-2 py-0.5 rounded-full ${
                          t.direction === "income" 
                            ? "bg-emerald-100 text-emerald-800" 
                            : "bg-rose-100 text-rose-800"
                        }`}>
                          {t.direction === "income" ? "درآمد برای سالن" : "پرداختی/هزینه"}
                        </span>
                        <span className="text-[10px] font-black text-slate-700">{t.category}</span>
                      </div>
                      
                      {t.description && (
                        <p className="text-[10px] text-slate-500 font-bold">{t.description}</p>
                      )}
                      
                      <div className="flex items-center gap-3 text-[9px] text-slate-400 font-bold">
                        <span>تاریخ: {toPersianDigits(t.date)}</span>
                        {t.receiptUrl && (
                          <a 
                            href={t.receiptUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-[#0284c7] hover:underline flex items-center gap-0.5"
                          >
                            <FileText className="w-3 h-3" /> مشاهده فیش
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="text-left">
                      <span className={`text-xs font-black ${
                        t.direction === "income" ? "text-emerald-600" : "text-rose-600"
                      }`}>
                        {t.direction === "income" ? "+" : "-"} {formatToman(t.amount)}
                      </span>
                    </div>

                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-400 font-bold text-xs flex flex-col items-center justify-center gap-1">
                  <CheckCircle className="w-8 h-8 text-slate-200" />
                  هیچ تراکنش ثبتی برای این پرسنل وجود ندارد.
                </div>
              )}
            </div>

            {/* Modal Footer Summary */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-bold">مجموع مانده معین مراجع:</span>
              {(() => {
                const bal = calculateEmployeeBalance(detailStaff, transactions);
                let balColor = "text-slate-700 font-black";
                let text = "تسویه";
                if (bal.netBalance > 0) {
                  balColor = "text-emerald-600 font-black";
                  text = `بستانکار (طلبکار از سالن): ${formatToman(bal.netBalance)}`;
                } else if (bal.netBalance < 0) {
                  balColor = "text-rose-600 font-black";
                  text = `بدهکار (بدهکار به سالن): ${formatToman(Math.abs(bal.netBalance))}`;
                }
                return <span className={balColor}>{text}</span>;
              })()}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

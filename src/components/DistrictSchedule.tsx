import { useState, useMemo } from "react";
import { Match, Medal, Participant } from "../types";
import { TEAM_NAMES } from "../initialData";
import { calculateMedals } from "../utils/calcMedals";
import { 
  Trophy, 
  Clock, 
  MapPin, 
  Calendar, 
  AlertCircle, 
  TrendingUp, 
  Users, 
  Search, 
  Award, 
  CheckCircle, 
  PlayCircle,
  Printer,
  Download
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Helper to parse Thai date (e.g. "10 ก.ค. 69") to a comparable number
function parseThaiDateToValue(dateStr: string): number {
  if (!dateStr || dateStr === "ไม่ระบุวัน") return 99999999;
  
  const parts = dateStr.trim().split(/\s+/);
  if (parts.length < 3) {
    const day = parseInt(parts[0], 10) || 0;
    return day;
  }
  
  const day = parseInt(parts[0], 10) || 0;
  const monthStr = parts[1];
  const year = parseInt(parts[2], 10) || 0;
  
  const months: Record<string, number> = {
    "ม.ค.": 1,
    "ก.พ.": 2,
    "มี.ค.": 3,
    "เม.ย.": 4,
    "พ.ค.": 5,
    "มิ.ย.": 6,
    "ก.ค.": 7,
    "ส.ค.": 8,
    "ก.ย.": 9,
    "ต.ค.": 10,
    "พ.ย.": 11,
    "ธ.ค.": 12
  };
  
  const monthVal = months[monthStr] || 0;
  return (year * 10000) + (monthVal * 100) + day;
}

// Helper to parse Thai time (e.g. "09.30 น.") to minutes
function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 9999;
  const clean = timeStr.replace(/น\./g, "").replace(/\s/g, "").trim();
  const parts = clean.split(/[.:]/);
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

interface DistrictScheduleProps {
  matches: Match[];
  selectedDistrict: string;
  onSelectDistrict: (district: string) => void;
}

export default function DistrictSchedule({ 
  matches, 
  selectedDistrict, 
  onSelectDistrict 
}: DistrictScheduleProps) {
  // Local filters
  const [sportFilter, setSportFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState<boolean>(false);

  const handleExportPDF = () => {
    setShowPreview(false);
    setIsExporting(true);

    const loadHtml2Pdf = (): Promise<any> => {
      return new Promise((resolve, reject) => {
        if ((window as any).html2pdf) {
          resolve((window as any).html2pdf);
          return;
        }
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
        script.crossOrigin = "anonymous";
        script.onload = () => {
          resolve((window as any).html2pdf);
        };
        script.onerror = (e) => reject(e);
        document.body.appendChild(script);
      });
    };

    loadHtml2Pdf()
      .then((html2pdf) => {
        const element = document.getElementById("district-pdf-content");
        if (element) {
          const opt = {
            margin:       [10, 10, 10, 10], // margin in mm
            filename:     `ตารางแข่งขัน_${selectedDistrict}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, logging: false },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
          };
          html2pdf().set(opt).from(element).save()
            .then(() => {
              setIsExporting(false);
            })
            .catch((err: any) => {
              console.error("PDF generation failed:", err);
              setIsExporting(false);
            });
        } else {
          setIsExporting(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load html2pdf.js:", err);
        setIsExporting(false);
        // Fallback
        window.print();
      });
  };

  // Get medals of all teams to compute selected district's rank
  const standings = useMemo(() => {
    return calculateMedals(matches);
  }, [matches]);

  const isPetanqueDrawHeld = useMemo(() => {
    const petanqueMatches = matches.filter(m => m.sport === "petanque");
    if (petanqueMatches.length === 0) return false;
    return petanqueMatches.some(m => 
      (m.teamA && TEAM_NAMES.includes(m.teamA)) || 
      (m.teamB && TEAM_NAMES.includes(m.teamB))
    );
  }, [matches]);

  // Find selected district's medal stats & rank
  const districtProfile = useMemo(() => {
    if (!selectedDistrict) return null;
    
    const rankIndex = standings.findIndex(t => t.team === selectedDistrict);
    const medalStats = standings[rankIndex] || { team: selectedDistrict, gold: 0, silver: 0, bronze: 0 };
    
    // Filter matches for this district
    let districtMatches = matches.filter(m => {
      if (m.sport === "track") {
        return m.participants?.includes(selectedDistrict);
      } else {
        return m.teamA === selectedDistrict || m.teamB === selectedDistrict;
      }
    });

    // If Petanque draw is not held yet, inject virtual Petanque matches for this district
    if (!isPetanqueDrawHeld) {
      districtMatches = [
        ...districtMatches,
        {
          id: "petanque_virtual_men",
          sport: "petanque",
          category: "ชายคู่ (เปตอง)",
          gender: "ชาย",
          round: "กำหนดการแข่งขัน (รอจับฉลากแบ่งสาย)",
          group: "",
          date: "6 ก.ค. 69",
          time: "09.00 น.",
          court: "สนามเปตอง",
          status: "pending",
          teamA: selectedDistrict,
          teamB: "รอผลจับฉลาก",
          scoreA: null,
          scoreB: null,
          winner: "",
          order: 99
        },
        {
          id: "petanque_virtual_women",
          sport: "petanque",
          category: "หญิงคู่ (เปตอง)",
          gender: "หญิง",
          round: "กำหนดการแข่งขัน (รอจับฉลากแบ่งสาย)",
          group: "",
          date: "7 ก.ค. 69",
          time: "09.00 น.",
          court: "สนามเปตอง",
          status: "pending",
          teamA: selectedDistrict,
          teamB: "รอผลจับฉลาก",
          scoreA: null,
          scoreB: null,
          winner: "",
          order: 99
        },
        {
          id: "petanque_virtual_mixed",
          sport: "petanque",
          category: "ทีมผสม (เปตอง)",
          gender: "ผสม",
          round: "กำหนดการแข่งขัน (รอจับฉลากแบ่งสาย)",
          group: "",
          date: "8 ก.ค. 69",
          time: "09.00 น.",
          court: "สนามเปตอง",
          status: "pending",
          teamA: selectedDistrict,
          teamB: "รอผลจับฉลาก",
          scoreA: null,
          scoreB: null,
          winner: "",
          order: 99
        }
      ];
    }

    const total = districtMatches.length;
    const completed = districtMatches.filter(m => m.status === "completed").length;
    const live = districtMatches.filter(m => m.status === "live").length;
    const pending = districtMatches.filter(m => m.status === "pending").length;

    return {
      rank: rankIndex !== -1 ? rankIndex + 1 : "-",
      medals: medalStats,
      total,
      completed,
      live,
      pending,
      matches: districtMatches
    };
  }, [selectedDistrict, matches, standings, isPetanqueDrawHeld]);

  // Filtered district matches based on pills + search
  const filteredMatches = useMemo(() => {
    if (!selectedDistrict || !districtProfile) return [];

    return districtProfile.matches.filter(m => {
      // 1. Sport filter
      if (sportFilter !== "all" && m.sport !== sportFilter) return false;

      // 2. Status filter
      if (statusFilter !== "all" && m.status !== statusFilter) return false;

      // 3. Search query (search category or round or opponent)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const opponent = m.sport !== "track" 
          ? (m.teamA === selectedDistrict ? m.teamB : m.teamA) || ""
          : m.participants?.filter(p => p !== selectedDistrict).join(" ") || "";
        
        const matchText = `${m.category} ${m.round} ${m.court} ${opponent}`.toLowerCase();
        if (!matchText.includes(query)) return false;
      }

      return true;
    }).sort((a, b) => {
      // 1. Sort by Date first
      const dateA = parseThaiDateToValue(a.date);
      const dateB = parseThaiDateToValue(b.date);
      if (dateA !== dateB) return dateA - dateB;

      // 2. Sort by Time second
      const timeA = parseTimeToMinutes(a.time);
      const timeB = parseTimeToMinutes(b.time);
      if (timeA !== timeB) return timeA - timeB;

      // 3. Fallback to order
      return a.order - b.order;
    });
  }, [selectedDistrict, districtProfile, sportFilter, statusFilter, searchQuery]);

  // Group matches by Date
  const matchesByDate = useMemo(() => {
    const groups: Record<string, Match[]> = {};
    filteredMatches.forEach(m => {
      const d = m.date || "ไม่ระบุวัน";
      if (!groups[d]) {
        groups[d] = [];
      }
      groups[d].push(m);
    });

    // Sort dates logically using the robust parsing helper
    const sortedDates = Object.keys(groups).sort((a, b) => {
      return parseThaiDateToValue(a) - parseThaiDateToValue(b);
    });

    return sortedDates.map(date => {
      const sortedList = groups[date].sort((a, b) => {
        const timeA = parseTimeToMinutes(a.time);
        const timeB = parseTimeToMinutes(b.time);
        if (timeA !== timeB) return timeA - timeB;
        return a.order - b.order;
      });
      return {
        date,
        list: sortedList
      };
    });
  }, [filteredMatches]);

  // Helper for sport styles
  const getSportStyle = (sport: string) => {
    switch (sport) {
      case "track":
        return {
          icon: "🏃",
          label: "กรีฑา",
          color: "#00FF66",
          bg: "bg-[#00FF66]/10 border-[#00FF66]/30 text-[#00FF66]",
          borderColor: "border-l-4 border-l-[#00FF66]"
        };
      case "petanque":
        return {
          icon: "🥎",
          label: "เปตอง",
          color: "#10B981",
          bg: "bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]",
          borderColor: "border-l-4 border-l-[#10B981]"
        };
      case "volleyball":
        return {
          icon: "🏐",
          label: "วอลเลย์บอล",
          color: "#FF5722",
          bg: "bg-[#FF5722]/10 border-[#FF5722]/30 text-[#FF5722]",
          borderColor: "border-l-4 border-l-[#FF5722]"
        };
      case "football":
        return {
          icon: "⚽",
          label: "ฟุตบอล",
          color: "#F43F5E",
          bg: "bg-rose-500/10 border-rose-500/30 text-rose-400",
          borderColor: "border-l-4 border-l-rose-500"
        };
      default:
        return {
          icon: "🏆",
          label: "กีฬา",
          color: "#3B82F6",
          bg: "bg-blue-500/10 border-blue-500/30 text-blue-400",
          borderColor: "border-l-4 border-l-blue-500"
        };
    }
  };

  return (
    <div className="space-y-6" id="district-schedule-tab">
      {/* Visual PDF export response banner */}
      {isExporting && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] bg-[#1E293B] border-2 border-emerald-500 text-white px-6 py-4 shadow-2xl flex items-center gap-4 animate-bounce print:hidden max-w-md w-full mx-auto">
          <div className="shrink-0 w-6 h-6 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
          <div className="flex-grow space-y-0.5">
            <h4 className="text-sm font-black text-emerald-400 uppercase tracking-wide">📥 กำลังดาวน์โหลดและจัดเตรียม PDF</h4>
            <p className="text-[10px] text-slate-400 font-semibold leading-normal">ระบบกำลังประมวลผลตารางแข่งรายอำเภอของ {selectedDistrict} และเปิดเมนูสั่งพิมพ์</p>
          </div>
        </div>
      )}

      <div className="space-y-6 print:hidden">
        {/* 1. District Selection Header Card */}
        <div className="bg-[#111827] border border-slate-800 p-6 rounded-none text-white space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xl font-black uppercase text-white flex items-center gap-2">
                <Calendar className="text-[#FF5722]" size={22} />
                ตารางการแข่งขันและโปรแกรมแข่งรายอำเภอ
              </h2>
              <p className="text-xs text-slate-400 font-semibold">
                แสดงเฉพาะโปรแกรมแข่งขันของหน่วยงาน/อำเภอที่ท่านเลือก เพื่อการติดตามทีมของตนเองอย่างรวดเร็วและเป็นระบบ
              </p>
            </div>

            {selectedDistrict && (
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold text-xs uppercase tracking-wider transition-all duration-150 cursor-pointer flex items-center gap-1.5 rounded-none"
              >
                <Printer size={14} className="text-[#FF5722]" />
                ส่งออก PDF ของ {selectedDistrict}
              </button>
            )}
          </div>

        {/* If no district is selected */}
        {!selectedDistrict && (
          <div className="border border-dashed border-slate-800 bg-[#0A0F1D] p-10 text-center space-y-3">
            <AlertCircle className="mx-auto text-amber-500 animate-pulse" size={40} />
            <h3 className="text-base font-black uppercase tracking-wide">ยังไม่ได้เลือกอำเภอ / สังกัด</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto font-medium">
              กรุณาเลือกอำเภอของคุณจากกล่องตัวเลือก "เลือกอำเภอ / สังกัดเพื่อติดตามการแข่งขัน" ด้านบนสุดของหน้าจอ หรือคลิกเลือกปุ่มอำเภอด้านล่าง เพื่อระบุกลุ่มเป้าหมาย จากนั้นระบบจะสร้างตารางการแข่ง สรุปเหรียญรางวัล และสถิติต่างๆ เฉพาะทีมของคุณขึ้นมาโดยอัตโนมัติ
            </p>
            <div className="flex flex-wrap justify-center gap-2 pt-4">
              {TEAM_NAMES.slice(0, 15).map(name => (
                <button
                  key={name}
                  onClick={() => onSelectDistrict(name)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-[#FF5722]/20 border border-slate-800 hover:border-[#FF5722] text-xs font-bold text-slate-300 hover:text-white transition-colors duration-150 cursor-pointer"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedDistrict && districtProfile && (
        <>
          {/* 2. District Profile & Stats Block */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Profile Leaderboard info */}
            <div className="bg-[#111827] border border-slate-800 p-5 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute right-[-20px] top-[-20px] opacity-[0.03] group-hover:scale-110 transition-transform">
                <Trophy size={140} className="text-white" />
              </div>
              <div className="space-y-1 z-10">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#FF5722]">
                  leaderboard status
                </span>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  🏆 {selectedDistrict === "สสจ.ปัตตานี" ? "สสจ.ปัตตานี" : `คป.สอ. อ. ${selectedDistrict}`}
                </h3>
                <p className="text-xs text-slate-400 font-semibold">
                  อันดับตารางเหรียญรางวัลในระบบขณะนี้
                </p>
              </div>
              <div className="flex items-baseline gap-2 mt-4 z-10">
                <span className="text-4xl font-black text-[#00FF66]">อันดับ {districtProfile.rank}</span>
                <span className="text-xs text-slate-500 font-mono font-bold">ของทั้งจังหวัด</span>
              </div>
            </div>

            {/* Medal Standings Box */}
            <div className="bg-[#111827] border border-slate-800 p-5 flex flex-col justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                  medal standings
                </span>
                <h3 className="text-xs font-bold text-slate-300">
                  จำนวนเหรียญรางวัลที่ได้รับ
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <div className="bg-amber-500/5 border border-amber-500/20 py-2">
                  <span className="block text-xs font-mono font-bold text-amber-400 mb-0.5">🥇 ทอง</span>
                  <span className="text-xl font-black text-white">{districtProfile.medals.gold}</span>
                </div>
                <div className="bg-slate-300/5 border border-slate-300/20 py-2">
                  <span className="block text-xs font-mono font-bold text-slate-300 mb-0.5">🥈 เงิน</span>
                  <span className="text-xl font-black text-white">{districtProfile.medals.silver}</span>
                </div>
                <div className="bg-amber-700/5 border border-amber-700/20 py-2">
                  <span className="block text-xs font-mono font-bold text-amber-600 mb-0.5">🥉 ทองแดง</span>
                  <span className="text-xl font-black text-white">{districtProfile.medals.bronze}</span>
                </div>
              </div>
            </div>

            {/* Event schedule stats */}
            <div className="bg-[#111827] border border-slate-800 p-5 flex flex-col justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                  match overview
                </span>
                <h3 className="text-xs font-bold text-slate-300">
                  สถิติตารางการแข่งขันของทีม
                </h3>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-3 text-center font-mono">
                <div className="bg-[#1E293B]/60 border border-slate-800 py-2">
                  <span className="block text-[9px] text-slate-400 font-bold mb-0.5">ทั้งหมด</span>
                  <span className="text-lg font-black text-white">{districtProfile.total}</span>
                </div>
                <div className="bg-red-950/20 border border-red-900/30 py-2">
                  <span className="block text-[9px] text-red-400 font-bold mb-0.5">🔴 สด</span>
                  <span className="text-lg font-black text-red-400">{districtProfile.live}</span>
                </div>
                <div className="bg-slate-800/40 border border-slate-800 py-2">
                  <span className="block text-[9px] text-slate-400 font-bold mb-0.5">⏳ รอแข่ง</span>
                  <span className="text-lg font-black text-slate-300">{districtProfile.pending}</span>
                </div>
                <div className="bg-emerald-950/20 border border-emerald-900/30 py-2">
                  <span className="block text-[9px] text-emerald-400 font-bold mb-0.5">🟢 จบแล้ว</span>
                  <span className="text-lg font-black text-emerald-400">{districtProfile.completed}</span>
                </div>
              </div>
            </div>

          </div>

          {/* 3. Toolbar & Filters */}
          <div className="bg-[#111827] border border-slate-800 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Filter sport pills */}
            <div className="flex flex-wrap gap-1">
              {[
                { id: "all", label: "🏆 กีฬาทั้งหมด" },
                { id: "football", label: "⚽ ฟุตบอล" },
                { id: "volleyball", label: "🏐 วอลเลย์บอล" },
                { id: "petanque", label: "🥎 เปตอง" },
                { id: "track", label: "🏃 กรีฑา/วิ่ง" }
              ].map((pill) => {
                const isActive = sportFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    onClick={() => setSportFilter(pill.id)}
                    className={`px-3 py-1.5 font-bold text-xs cursor-pointer transition-all ${
                      isActive 
                        ? "bg-[#FF5722] text-white border border-[#FF5722]" 
                        : "bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>

            {/* Search and Status Selectors */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {/* Status Select */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="p-2 bg-[#0A0F1D] text-slate-300 border border-slate-800 text-xs font-bold focus:outline-none focus:border-[#FF5722] rounded-none"
              >
                <option value="all">📊 ทุกสถานะแข่งขัน</option>
                <option value="live">🔴 กำลังแข่งขันสด (Live)</option>
                <option value="pending">⏳ ยังไม่แข่งขัน (Upcoming)</option>
                <option value="completed">🟢 สิ้นสุดแข่งขันแล้ว (Finished)</option>
              </select>

              {/* Search Bar */}
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search size={14} className="text-slate-500" />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหา รอบแข่ง / ฝ่ายตรงข้าม..."
                  className="pl-9 pr-3 py-2 bg-[#0A0F1D] border border-slate-800 text-xs text-white placeholder-slate-500 rounded-none w-full sm:w-56 focus:outline-none focus:border-[#FF5722]"
                />
              </div>
            </div>

          </div>

          {/* 4. Matches Timeline */}
          <div className="space-y-8">
            {matchesByDate.length === 0 ? (
              <div className="border border-dashed border-slate-800 bg-[#111827] py-16 text-center space-y-2">
                <AlertCircle className="mx-auto text-slate-600" size={32} />
                <h4 className="text-base font-black text-slate-400 uppercase tracking-wide">ไม่พบโปรแกรมการแข่งขัน</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                  ไม่พบบันทึกการแข่งขันที่ตรงตามเงื่อนไขตัวกรองของคุณ ลองเปลี่ยนประเภทกีฬาหรือล้างข้อความค้นหาของคุณ
                </p>
                {(sportFilter !== "all" || statusFilter !== "all" || searchQuery !== "") && (
                  <button
                    onClick={() => {
                      setSportFilter("all");
                      setStatusFilter("all");
                      setSearchQuery("");
                    }}
                    className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold cursor-pointer transition-colors duration-150"
                  >
                    ล้างการกรองทั้งหมด
                  </button>
                )}
              </div>
            ) : (
              matchesByDate.map((group) => (
                <div key={group.date} className="space-y-4">
                  {/* Date Header */}
                  <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
                    <Calendar size={18} className="text-[#00FF66]" />
                    <h3 className="text-base font-black uppercase text-white font-sans tracking-wide">
                      วันที่การแข่ง: {group.date}
                    </h3>
                    <span className="text-[10px] font-mono font-bold bg-[#111827] text-slate-400 border border-slate-800 px-2 py-0.5 rounded-none ml-2">
                      {group.list.length} แมตช์
                    </span>
                  </div>

                  {/* Matches List Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {group.list.map((match) => {
                      const sportStyle = getSportStyle(match.sport);
                      const isLive = match.status === "live";
                      const isCompleted = match.status === "completed";
                      const isTrack = match.sport === "track";

                      return (
                        <div
                          key={match.id}
                          className={`relative border flex flex-col justify-between transition-all duration-150 rounded-none overflow-hidden ${sportStyle.borderColor} ${
                            isLive 
                              ? "bg-[#1E293B] border-[#00FF66] shadow-[0_0_12px_0_rgba(0,255,102,0.1)]" 
                              : "bg-[#111827] border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          {/* Card Header (Category, Round & Live state) */}
                          <div className="p-3 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-mono font-black px-2 py-0.5 border uppercase rounded-none ${sportStyle.bg}`}>
                                {sportStyle.icon} {sportStyle.label}
                              </span>
                              <span className="text-[11px] font-bold text-slate-300 truncate max-w-[200px]" title={match.category}>
                                {match.category}
                              </span>
                            </div>
                            <div className="shrink-0">
                              {isLive ? (
                                <span className="text-[9px] font-mono font-black bg-red-950 text-red-400 border border-red-900 px-1.5 py-0.5 animate-pulse rounded-none">
                                  🔴 LIVE
                                </span>
                              ) : isCompleted ? (
                                <span className="text-[9px] font-mono font-black bg-emerald-950 text-emerald-400 border border-emerald-900 px-1.5 py-0.5 rounded-none">
                                  🟢 จบการแข่งขัน
                                </span>
                              ) : (
                                <span className="text-[9px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded-none">
                                  ⏳ กำหนดแข่ง
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Card Body (Matchup content) */}
                          <div className="p-4 space-y-4 flex-grow">
                            
                            {/* Dual Team Scoreboard (Football, Volleyball, Petanque) */}
                            {match.id.startsWith("petanque_virtual") ? (
                              <div className="py-2 text-center space-y-2">
                                <div className="text-sm font-black text-amber-400">
                                  🥎 {match.category}
                                </div>
                                <div className="text-xs text-slate-400 font-semibold bg-slate-900 border border-slate-800/80 py-1.5 px-3 inline-block rounded-none leading-relaxed">
                                  {match.round}
                                </div>
                              </div>
                            ) : !isTrack ? (
                              <div className="grid grid-cols-7 items-center gap-2">
                                {/* Team A */}
                                <div className="col-span-3 text-center space-y-1">
                                  <div className="h-10 flex items-center justify-center">
                                    <span className={`text-xs font-black leading-tight ${
                                      match.teamA === selectedDistrict 
                                        ? "text-[#00FF66] font-bold bg-[#00FF66]/5 border border-[#00FF66]/20 px-2 py-1" 
                                        : "text-white"
                                    }`}>
                                      {match.teamA}
                                    </span>
                                  </div>
                                  {match.teamA === selectedDistrict && (
                                    <span className="inline-block text-[9px] bg-[#00FF66]/10 text-[#00FF66] px-1 py-0.2 rounded-none font-bold uppercase font-mono border border-[#00FF66]/20">
                                      ทีมของเรา
                                    </span>
                                  )}
                                </div>

                                {/* SCORE / VS */}
                                <div className="col-span-1 text-center font-mono font-black text-lg">
                                  {isCompleted || isLive ? (
                                    <div className="flex items-center justify-center gap-1.5 text-white bg-slate-950 px-2 py-1 border border-slate-800">
                                      <span className={match.winner === match.teamA ? "text-[#00FF66]" : "text-slate-300"}>
                                        {match.scoreA ?? 0}
                                      </span>
                                      <span className="text-slate-600 text-xs">:</span>
                                      <span className={match.winner === match.teamB ? "text-[#00FF66]" : "text-slate-300"}>
                                        {match.scoreB ?? 0}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-500 text-xs font-bold font-sans">VS</span>
                                  )}
                                </div>

                                {/* Team B */}
                                <div className="col-span-3 text-center space-y-1">
                                  <div className="h-10 flex items-center justify-center">
                                    <span className={`text-xs font-black leading-tight ${
                                      match.teamB === selectedDistrict 
                                        ? "text-[#00FF66] font-bold bg-[#00FF66]/5 border border-[#00FF66]/20 px-2 py-1" 
                                        : "text-white"
                                    }`}>
                                      {match.teamB}
                                    </span>
                                  </div>
                                  {match.teamB === selectedDistrict && (
                                    <span className="inline-block text-[9px] bg-[#00FF66]/10 text-[#00FF66] px-1 py-0.2 rounded-none font-bold uppercase font-mono border border-[#00FF66]/20">
                                      ทีมของเรา
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              /* Track Athletics Heat / Placement Details */
                              <div className="space-y-2">
                                <span className="block text-[10px] font-mono text-slate-500 uppercase font-black">
                                  📌 ผู้ร่วมเข้าแข่งขันทิศทางลู่:
                                </span>
                                {match.status === "completed" && match.ranks && match.ranks.length > 0 ? (
                                  <div className="space-y-1">
                                    {match.ranks.slice(0, 3).map((r, rIdx) => {
                                      const medalIcon = rIdx === 0 ? "🥇" : rIdx === 1 ? "🥈" : "🥉";
                                      const isSelf = r.name === selectedDistrict;
                                      return (
                                        <div 
                                          key={r.name} 
                                          className={`flex items-center justify-between p-1.5 border ${
                                            isSelf 
                                              ? "bg-[#00FF66]/5 border-[#00FF66]/40 text-[#00FF66] font-bold" 
                                              : "bg-slate-900/30 border-slate-800/80 text-slate-300"
                                          } text-xs`}
                                        >
                                          <span className="flex items-center gap-1">
                                            <span>{medalIcon}</span>
                                            <span>อันดับ {r.rank}</span>
                                            <span className="font-bold">{r.name}</span>
                                            {isSelf && <span className="text-[8px] bg-[#00FF66] text-slate-950 font-sans px-1 font-black rounded-none">ทีมของเรา</span>}
                                          </span>
                                          <span className="font-mono text-[10px] text-slate-400">
                                            {r.time || "ไม่มีบันทึกเวลา"}
                                          </span>
                                        </div>
                                      );
                                    })}
                                    {/* Show other participant names who did not get top 3 but still entered */}
                                    {match.participants && match.participants.length > 3 && (
                                      <div className="text-[10px] text-slate-500 font-medium pl-1 pt-1 italic">
                                        ผู้เข้าร่วมอื่นๆ: {match.participants.filter(p => !match.ranks?.slice(0, 3).some(r => r.name === p)).join(", ")}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  /* Athletics Upcoming List */
                                  <div className="flex flex-wrap gap-1">
                                    {match.participants?.map((p) => {
                                      const isSelf = p === selectedDistrict;
                                      return (
                                        <span 
                                          key={p} 
                                          className={`text-[10px] font-semibold px-2 py-1 border ${
                                            isSelf 
                                              ? "bg-[#00FF66]/10 border-[#00FF66] text-[#00FF66] font-bold" 
                                              : "bg-slate-900 border-slate-800 text-slate-400"
                                          }`}
                                        >
                                          {isSelf ? "⭐ " : ""}{p}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Volleyball Set Details (if available) */}
                            {match.sport === "volleyball" && match.sets && match.sets.length > 0 && (
                              <div className="mt-2 text-center border-t border-slate-800/50 pt-2">
                                <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block mb-1">
                                  ผลการเล่นแต่ละเซต (Set Scores)
                                </span>
                                <div className="flex justify-center gap-2">
                                  {match.sets.map((set, setIdx) => (
                                    <span 
                                      key={setIdx} 
                                      className="text-[10px] font-mono bg-slate-900 border border-slate-800 px-1.5 py-0.5 text-slate-300"
                                    >
                                      S{setIdx+1}: {set.scoreA}-{set.scoreB}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                          </div>

                          {/* Card Footer (Metadata: Date, Time, Court Location) */}
                          <div className="p-3 bg-slate-900/40 border-t border-slate-800/60 flex flex-wrap justify-between gap-2 text-[11px] text-slate-400 font-mono">
                            <span className="flex items-center gap-1 font-bold text-slate-300">
                              <Clock size={12} className="text-[#FF5722]" />
                              {match.time}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin size={12} className="text-[#FF5722]" />
                              {match.court} • {match.round}
                            </span>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      </div>

      {/* Beautiful Interactive Print Preview Modal overlay */}
      {showPreview && selectedDistrict && (
        <div className="fixed inset-0 bg-slate-950/90 z-[9999] flex flex-col justify-between overflow-y-auto p-4 md:p-8 backdrop-blur-md print:hidden">
          {/* Sticky Top Bar for controls */}
          <div className="bg-slate-900 border border-slate-800 p-4 max-w-4xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl rounded-none shrink-0 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#FF5722]/10 border border-[#FF5722]/30 text-[#FF5722]">
                <Printer size={20} className="animate-pulse" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">🔍 หน้าต่างตัวอย่างก่อนสั่งพิมพ์ / ดาวน์โหลด PDF</h3>
                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">กรุณาตรวจสอบรายละเอียดความถูกต้องของตาราง หากพร้อมแล้วสามารถกดปุ่มสั่งพิมพ์ด้านขวาได้ทันที</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer rounded-none"
              >
                ย้อนกลับ
              </button>
              <button
                type="button"
                onClick={handleExportPDF}
                className="py-1.5 px-4 bg-[#00FF66] text-slate-950 hover:bg-[#00E55C] font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/10 transition-all cursor-pointer rounded-none flex items-center gap-1"
              >
                <Download size={13} className="stroke-[3]" />
                ดาวน์โหลดไฟล์ PDF
              </button>
            </div>
          </div>

          {/* Interactive Simulation Content of the A4 paper page on the screen */}
          <div className="flex-grow max-w-4xl w-full mx-auto bg-slate-950/40 border border-slate-850 p-2 md:p-6 shadow-2xl mb-4 overflow-y-auto">
            <div id="district-pdf-content" className="bg-white text-black p-8 md:p-12 shadow-inner min-h-[1123px] font-sans border border-gray-300 max-w-[210mm] mx-auto text-left relative">
              {/* Decorative print border simulation */}
              <div className="absolute top-2 right-2 text-[8px] font-mono text-gray-400 select-none">A4 Paper Simulation Preview</div>
              
              {/* Header Block */}
              <div className="text-center border-b-2 border-black pb-4 mb-6">
                <div className="flex justify-center mb-1 text-4xl">🏆</div>
                <h1 className="text-sm sm:text-base md:text-lg font-black uppercase tracking-wide text-black leading-tight">
                  รายงานโปรแกรมและผลการแข่งขันรายอำเภออย่างเป็นทางการ (Official District Report)
                </h1>
                <h2 className="text-xs font-bold text-gray-800 mt-1 font-sans">
                  การแข่งขันกีฬาบุคลากรสาธารณสุข จังหวัดปัตตานี ประจำปี 2569 "ปัตตานีเกมส์"
                </h2>
                <p className="text-[10px] text-gray-500 mt-0.5 font-semibold font-mono">
                  ณ สนามกีฬาเทศบาลเมืองบานา จังหวัดปัตตานี
                </p>
                <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center text-[10px] font-semibold px-3 text-gray-700 bg-gray-100 py-2 border border-gray-300 gap-1.5">
                  <span>สังกัด/คป.สอ.: <strong className="text-black font-extrabold">{selectedDistrict}</strong></span>
                  {sportFilter !== "all" && (
                    <span>ชนิดกีฬา: <strong className="text-black font-extrabold">{
                      sportFilter === "football" ? "ฟุตบอล" :
                      sportFilter === "volleyball" ? "วอลเลย์บอล" :
                      sportFilter === "petanque" ? "เปตอง" :
                      sportFilter === "track" ? "กรีฑา" : sportFilter
                    }</strong></span>
                  )}
                  <span>พิมพ์เมื่อ: {new Date().toLocaleDateString('th-TH', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })} น.</span>
                </div>
              </div>

              {/* Chronological Match Schedule Table */}
              <div>
                <h3 className="text-[10px] font-bold border-b-2 border-black pb-1 mb-2 uppercase text-black font-sans">
                  📅 รายละเอียดโปรแกรมและผลการแข่งขัน ({filteredMatches.length} รายการ)
                </h3>
                {filteredMatches.length === 0 ? (
                  <p className="text-xs text-center text-gray-500 py-4 font-sans">ไม่มีรายการแข่งขันที่ตรงตามตัวกรองที่เลือก</p>
                ) : (
                  <table className="w-full text-[9px] border-collapse border border-black text-black">
                    <thead>
                      <tr className="bg-gray-100 border-b border-black text-left font-sans">
                        <th className="p-1 border-r border-black font-bold text-center w-[40px]">คู่ที่</th>
                        <th className="p-1 border-r border-black font-bold w-[95px]">วัน/เวลาแข่งขัน</th>
                        <th className="p-1 border-r border-black font-bold w-[65px]">กีฬา</th>
                        <th className="p-1 border-r border-black font-bold w-[110px]">ประเภท / รอบ</th>
                        <th className="p-1 border-r border-black font-bold text-right w-[140px]">ทีมฝั่ง A</th>
                        <th className="p-1 border-r border-black font-bold text-center w-[60px]">คะแนน</th>
                        <th className="p-1 border-r border-black font-bold w-[140px]">ทีมฝั่ง B</th>
                        <th className="p-1 border-black font-bold text-center w-[90px]">ผลการแข่งขัน</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMatches.map((m) => {
                        const matchNum = m.id.split("_").pop();
                        const isCompleted = m.status === "completed";
                        const isLive = m.status === "live";

                        return (
                          <tr key={m.id} className="border-b border-gray-300 hover:bg-gray-50 text-left">
                            <td className="p-1 border-r border-black font-bold text-center bg-gray-50 font-mono">{matchNum}</td>
                            <td className="p-1 border-r border-black font-mono font-medium text-[8px]">
                              <div>{m.date}</div>
                              <div className="font-bold">{m.time}</div>
                            </td>
                            <td className="p-1 border-r border-black font-bold text-center uppercase font-sans text-[8px]">
                              {m.sport === "football" ? "⚽ ฟุตบอล" :
                               m.sport === "volleyball" ? "🏐 วอลเลย์" :
                               m.sport === "petanque" ? "🥎 เปตอง" : "🏃 กรีฑา"}
                            </td>
                            <td className="p-1 border-r border-black text-[8px]">
                              <div className="font-bold leading-tight">{m.category}</div>
                              <div className="text-gray-600 font-mono leading-none text-[8px]">{m.round} {m.group ? `(${m.group})` : ""}</div>
                            </td>

                            {m.id.startsWith("petanque_virtual") ? (
                              <td colSpan={3} className="p-1 border-r border-black text-center font-bold text-amber-700 bg-amber-50 text-[8px]">
                                📢 รอผลการจับฉลากแบ่งสายประเภท {m.category} อย่างเป็นทางการ
                              </td>
                            ) : m.sport === "track" ? (
                              <td colSpan={3} className="p-1 border-r border-black text-[8px]">
                                {m.participants && m.participants.length > 0 ? (
                                  <div className="grid grid-cols-1 gap-0.5">
                                    {m.participants.map((p, idx) => {
                                      const rank = m.ranks?.[idx]?.rank;
                                      const score = m.ranks?.[idx]?.score;
                                      return (
                                        <div key={idx} className="flex justify-between items-center text-[8px] border-b border-gray-100 pb-0.5">
                                          <span className={p === selectedDistrict ? "font-bold underline text-black" : ""}>
                                            {idx + 1}. {p} {p === selectedDistrict ? "⭐" : ""}
                                          </span>
                                          <span className="font-mono text-gray-700">
                                            {score ? `เวลา: ${score}` : ""} {rank ? `[อันดับ: ${rank}]` : ""}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 italic font-sans">ยังไม่มีผู้ลงทะเบียน</span>
                                )}
                              </td>
                            ) : (
                              <>
                                <td className={`p-1 border-r border-black text-right font-bold text-[8px] ${m.winner === m.teamA ? "text-emerald-800" : ""} ${m.teamA === selectedDistrict ? "underline decoration-wavy" : ""}`}>
                                  {m.winner === m.teamA && "👑 "}{m.teamA || "TBD"}
                                </td>
                                <td className="p-1 border-r border-black text-center font-mono font-black bg-gray-50 text-[10px]">
                                  {m.scoreA !== null ? m.scoreA : "-"} : {m.scoreB !== null ? m.scoreB : "-"}
                                </td>
                                <td className={`p-1 border-r border-black font-bold text-[8px] ${m.winner === m.teamB ? "text-emerald-800" : ""} ${m.teamB === selectedDistrict ? "underline decoration-wavy" : ""}`}>
                                  {m.teamB || "TBD"}{m.winner === m.teamB && " 👑"}
                                </td>
                              </>
                            )}

                            <td className="p-1 text-center text-[8px]">
                              {isLive ? (
                                <span className="font-bold text-red-600 animate-pulse">กำลังแข่ง 🔴</span>
                              ) : isCompleted ? (
                                <span className="text-emerald-700 font-bold font-sans">
                                  {m.winner === selectedDistrict ? "✓ ชนะ 🎉" : m.winner ? `แพ้ (ผู้ชนะ: ${m.winner})` : "เสร็จสิ้น"}
                                </span>
                              ) : (
                                <span className="text-gray-400 font-sans">ยังไม่แข่งขัน</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Footer Signature Block */}
              <div className="pt-12 grid grid-cols-2 gap-8 text-[10px] text-black font-sans">
                <div className="text-center">
                  <p className="mb-10">ลงชื่อ ............................................................ ผู้จัดการทีม / ตัวแทน</p>
                  <p>( {selectedDistrict} )</p>
                  <p className="text-gray-500 mt-1">ผู้ประสานงานตารางทีม คป.สอ.</p>
                </div>
                <div className="text-center">
                  <p className="mb-10">ลงชื่อ ............................................................ พยาน / เจ้าหน้าที่สนาม</p>
                  <p>( ............................................................ )</p>
                  <p className="text-gray-500 mt-1">เจ้าหน้าที่บันทึกผลการแข่งขันกลาง</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Beautiful Printable Official PDF Section for District (Hidden on screen, shown ONLY during Print/PDF export) */}
      {selectedDistrict && (
        <div className="hidden print:block bg-white text-black p-6 min-h-screen font-sans">
          {/* Header Block */}
          <div className="text-center border-b-2 border-black pb-4 mb-6">
            <div className="flex justify-center mb-1 text-4xl">🏆</div>
            <h1 className="text-xl font-black uppercase tracking-wide text-black">
              รายงานโปรแกรมและผลการแข่งขันรายอำเภออย่างเป็นทางการ (Official District Report)
            </h1>
            <h2 className="text-sm font-bold text-gray-800 mt-1 font-sans">
              การแข่งขันกีฬาบุคลากรสาธารณสุข จังหวัดปัตตานี ประจำปี 2569 "ปัตตานีเกมส์"
            </h2>
            <p className="text-xs text-gray-500 mt-0.5 font-semibold font-mono">
              ณ สนามกีฬาเทศบาลเมืองบานา จังหวัดปัตตานี
            </p>
            <div className="mt-4 flex flex-wrap justify-between items-center text-xs font-semibold px-4 text-gray-700 bg-gray-100 py-2 border border-gray-300">
              <span>สังกัด/คป.สอ.: <strong className="text-black font-extrabold">{selectedDistrict}</strong></span>
              {sportFilter !== "all" && (
                <span>ชนิดกีฬา: <strong className="text-black font-extrabold">{
                  sportFilter === "football" ? "ฟุตบอล" :
                  sportFilter === "volleyball" ? "วอลเลย์บอล" :
                  sportFilter === "petanque" ? "เปตอง" :
                  sportFilter === "track" ? "กรีฑา" : sportFilter
                }</strong></span>
              )}
              <span>พิมพ์เมื่อ: {new Date().toLocaleDateString('th-TH', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })} น.</span>
            </div>
          </div>

          {/* District Stats Summary Table (Excluded from print PDF on user request) */}

          {/* Chronological Match Schedule Table */}
          <div>
            <h3 className="text-xs font-bold border-b-2 border-black pb-1 mb-2 uppercase text-black font-sans">
              📅 รายละเอียดโปรแกรมและผลการแข่งขัน ({filteredMatches.length} รายการ)
            </h3>
            {filteredMatches.length === 0 ? (
              <p className="text-xs text-center text-gray-500 py-4 font-sans">ไม่มีรายการแข่งขันที่ตรงตามตัวกรองที่เลือก</p>
            ) : (
              <table className="w-full text-[10px] border-collapse border border-black text-black">
                <thead>
                  <tr className="bg-gray-100 border-b border-black text-left font-sans">
                    <th className="p-1.5 border-r border-black font-bold text-center w-[40px]">คู่ที่</th>
                    <th className="p-1.5 border-r border-black font-bold w-[95px]">วัน/เวลาแข่งขัน</th>
                    <th className="p-1.5 border-r border-black font-bold w-[75px]">กีฬา</th>
                    <th className="p-1.5 border-r border-black font-bold w-[120px]">ประเภท / รอบ</th>
                    <th className="p-1.5 border-r border-black font-bold text-right w-[150px]">ทีมฝั่ง A</th>
                    <th className="p-1.5 border-r border-black font-bold text-center w-[70px]">คะแนน</th>
                    <th className="p-1.5 border-r border-black font-bold w-[150px]">ทีมฝั่ง B</th>
                    <th className="p-1.5 border-black font-bold text-center w-[100px]">ผลการแข่งขัน / สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMatches.map((m) => {
                    const matchNum = m.id.split("_").pop();
                    const isCompleted = m.status === "completed";
                    const isLive = m.status === "live";

                    return (
                      <tr key={m.id} className="border-b border-gray-300 hover:bg-gray-50 text-left">
                        <td className="p-1.5 border-r border-black font-bold text-center bg-gray-50 font-mono">{matchNum}</td>
                        <td className="p-1.5 border-r border-black font-mono font-medium text-[9px]">
                          <div>{m.date}</div>
                          <div className="font-bold">{m.time}</div>
                        </td>
                        <td className="p-1.5 border-r border-black font-bold text-center uppercase font-sans text-[9px]">
                          {m.sport === "football" ? "⚽ ฟุตบอล" :
                           m.sport === "volleyball" ? "🏐 วอลเลย์" :
                           m.sport === "petanque" ? "🥎 เปตอง" : "🏃 กรีฑา"}
                        </td>
                        <td className="p-1.5 border-r border-black">
                          <div className="font-bold">{m.category}</div>
                          <div className="text-gray-600 font-mono text-[9px]">{m.round} {m.group ? `(${m.group})` : ""}</div>
                        </td>

                        {m.id.startsWith("petanque_virtual") ? (
                          <td colSpan={3} className="p-1.5 border-r border-black text-center font-bold text-amber-700 bg-amber-50">
                            📢 รอผลการจับฉลากแบ่งสายประเภท {m.category} อย่างเป็นทางการ
                          </td>
                        ) : m.sport === "track" ? (
                          <td colSpan={3} className="p-1.5 border-r border-black">
                            {m.participants && m.participants.length > 0 ? (
                              <div className="grid grid-cols-1 gap-1">
                                {m.participants.map((p, idx) => {
                                  const rank = m.ranks?.[idx]?.rank;
                                  const score = m.ranks?.[idx]?.score;
                                  return (
                                    <div key={idx} className="flex justify-between items-center text-[9px] border-b border-gray-100 pb-0.5">
                                      <span className={p === selectedDistrict ? "font-bold underline text-black" : ""}>
                                        {idx + 1}. {p} {p === selectedDistrict ? "⭐" : ""}
                                      </span>
                                      <span className="font-mono text-gray-700">
                                        {score ? `เวลา: ${score}` : ""} {rank ? `[อันดับ: ${rank}]` : ""}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-gray-400 italic font-sans">ยังไม่มีผู้ลงทะเบียน</span>
                            )}
                          </td>
                        ) : (
                          <>
                            <td className={`p-1.5 border-r border-black text-right font-bold ${m.winner === m.teamA ? "text-emerald-800" : ""} ${m.teamA === selectedDistrict ? "underline decoration-wavy" : ""}`}>
                              {m.winner === m.teamA && "👑 "}{m.teamA || "TBD"}
                            </td>
                            <td className="p-1.5 border-r border-black text-center font-mono font-black bg-gray-50 text-xs">
                              {m.scoreA !== null ? m.scoreA : "-"} : {m.scoreB !== null ? m.scoreB : "-"}
                            </td>
                            <td className={`p-1.5 border-r border-black font-bold ${m.winner === m.teamB ? "text-emerald-800" : ""} ${m.teamB === selectedDistrict ? "underline decoration-wavy" : ""}`}>
                              {m.teamB || "TBD"}{m.winner === m.teamB && " 👑"}
                            </td>
                          </>
                        )}

                        <td className="p-1.5 text-center">
                          {isLive ? (
                            <span className="font-bold text-red-600 animate-pulse">กำลังแข่ง 🔴</span>
                          ) : isCompleted ? (
                            <span className="text-emerald-700 font-bold font-sans">
                              {m.winner === selectedDistrict ? "✓ ชนะ 🎉" : m.winner ? `แพ้ (ผู้ชนะ: ${m.winner})` : "เสร็จสิ้น"}
                            </span>
                          ) : (
                            <span className="text-gray-400 font-sans">ยังไม่แข่งขัน</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer Signature Block */}
          <div className="pt-12 grid grid-cols-2 gap-8 text-xs text-black font-sans">
            <div className="text-center">
              <p className="mb-12">ลงชื่อ ............................................................ ผู้จัดการทีม / ตัวแทน</p>
              <p>( {selectedDistrict} )</p>
              <p className="text-gray-500 mt-1">ผู้ประสานงานตารางทีม คป.สอ.</p>
            </div>
            <div className="text-center">
              <p className="mb-12">ลงชื่อ ............................................................ พยาน / เจ้าหน้าที่สนาม</p>
              <p>( ............................................................ )</p>
              <p className="text-gray-500 mt-1">เจ้าหน้าที่บันทึกผลการแข่งขันกลาง</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

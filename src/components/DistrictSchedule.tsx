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
  PlayCircle 
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

  // Get medals of all teams to compute selected district's rank
  const standings = useMemo(() => {
    return calculateMedals(matches);
  }, [matches]);

  // Find selected district's medal stats & rank
  const districtProfile = useMemo(() => {
    if (!selectedDistrict) return null;
    
    const rankIndex = standings.findIndex(t => t.team === selectedDistrict);
    const medalStats = standings[rankIndex] || { team: selectedDistrict, gold: 0, silver: 0, bronze: 0 };
    
    // Filter matches for this district
    const districtMatches = matches.filter(m => {
      if (m.sport === "track") {
        return m.participants?.includes(selectedDistrict);
      } else {
        return m.teamA === selectedDistrict || m.teamB === selectedDistrict;
      }
    });

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
  }, [selectedDistrict, matches, standings]);

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
                            {!isTrack ? (
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
  );
}

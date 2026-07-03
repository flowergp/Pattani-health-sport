import { useState } from "react";
import { Match, Medal } from "../types";
import { calculateMedals } from "../utils/calcMedals";
import { 
  Trophy, 
  Activity, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  Search, 
  Flame, 
  Zap,
  MapPin,
  Calendar
} from "lucide-react";
import { motion } from "motion/react";

interface DashboardProps {
  matches: Match[];
  selectedDistrict?: string;
}

export default function Dashboard({ matches, selectedDistrict }: DashboardProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const totalMatches = matches.length;
  const completedMatches = matches.filter((m) => m.status === "completed").length;
  const liveMatches = matches.filter((m) => m.status === "live").length;
  const pendingMatches = matches.filter((m) => m.status === "pending").length;
  const completionPercent = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0;

  // Calculate medals
  const medalStandings = calculateMedals(matches);

  // Filter medal standings by search term
  const filteredStandings = medalStandings.filter((team) =>
    team.team.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Quick summary of live or recently completed matches
  const recentMatches = [...matches]
    .filter((m) => {
      const isStatusMatch = m.status === "live" || m.status === "completed";
      if (!isStatusMatch) return false;
      if (selectedDistrict) {
        return (
          m.teamA === selectedDistrict ||
          m.teamB === selectedDistrict ||
          (m.participants && m.participants.includes(selectedDistrict))
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (a.status === "live" && b.status !== "live") return -1;
      if (a.status !== "live" && b.status === "live") return 1;
      return b.order - a.order; // Descending order for recently updated
    })
    .slice(0, 4);

  return (
    <div className="space-y-8" id="dashboard-section">
      {/* 1. Hero Block & Stats Panel */}
      <div className="grid grid-cols-1 gap-6">
        {/* Welcome Hero (Navy/Slate Card) */}
        <div className="border border-slate-800 bg-[#111827] text-white p-6 flex flex-col justify-between relative overflow-hidden group rounded-none">
          <div className="absolute right-[-40px] top-[-40px] opacity-5 rotate-12 group-hover:scale-110 transition-transform">
            <Trophy size={200} className="text-white" />
          </div>
          <div className="space-y-4 z-10">
            <div className="inline-block bg-slate-800 text-[#00FF66] px-3 py-1 font-mono text-xs border border-slate-700 uppercase tracking-wider rounded-none">
              Pattani Public Health 2026
            </div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight leading-none text-white">
              คป.สอ. ปัตตานีเกมส์ 2569
            </h1>
            <p className="text-slate-300 max-w-lg text-xs md:text-sm">
              ระบบจัดการแข่งขันกีฬา บันทึกผล และรายงานตารางเหรียญรางวัลแบบเรียลไทม์
            </p>
          </div>
          <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-slate-800/80 z-10">
            <div className="flex items-center gap-2 text-xs font-mono font-bold bg-[#1E293B] text-slate-200 px-3 py-1.5 border border-slate-700">
              <Calendar size={14} className="text-[#FF5722]" />
              <span>6 - 10 ก.ค. 2569</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold bg-[#1E293B] text-slate-200 px-3 py-1.5 border border-slate-700">
              <MapPin size={14} className="text-[#FF5722]" />
              <span>สนามกีฬาเทศบาลเมืองบานา จังหวัดปัตตานี</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Stats Summary (Row of Cards with perfect Modern High-Contrast theme) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#111827] border border-slate-800 p-4 rounded-none flex flex-col justify-between min-h-[110px]">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">การแข่งขันทั้งหมด</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-black text-white">{totalMatches}</span>
            <span className="text-xs font-mono font-semibold text-slate-500">แมตช์</span>
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800 p-4 rounded-none flex flex-col justify-between min-h-[110px]">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">แข่งเสร็จสิ้น</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-black text-[#00FF66]">{completedMatches}</span>
            <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-900/60 px-1.5 py-0.5 rounded-none">
              {completionPercent}%
            </span>
          </div>
        </div>

        <div className="bg-[#1E293B] border border-[#00FF66]/60 p-4 rounded-none flex flex-col justify-between min-h-[110px]">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#00FF66]">กำลังแข่ง (Live)</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-black text-white flex items-center gap-2">
              {liveMatches}
              {liveMatches > 0 && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              )}
            </span>
            <span className="text-xs font-mono font-bold bg-[#00FF66]/10 border border-[#00FF66]/30 px-1.5 py-0.5 text-[#00FF66] rounded-none">
              LIVE
            </span>
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800 p-4 rounded-none flex flex-col justify-between min-h-[110px]">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">รอแข่งขัน</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-black text-slate-300">{pendingMatches}</span>
            <span className="text-xs font-mono font-semibold text-slate-400 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded-none">
              PENDING
            </span>
          </div>
        </div>
      </div>

      {/* 3. Medal Standings & Live Updates Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Medal Standings (Colspan 2) */}
        <div className="xl:col-span-2 border border-slate-800 bg-[#111827] p-6 space-y-4 rounded-none">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <Trophy className="text-[#FF5722] fill-[#FF5722]/10" size={24} />
              <h2 className="text-lg font-black uppercase text-white tracking-wide">ตารางสรุปเหรียญรางวัล</h2>
            </div>
            {/* Search */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search size={14} className="text-slate-400" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาทีม/คป.สอ..."
                className="pl-9 pr-4 py-2 w-full sm:w-64 bg-[#1E293B] border border-slate-700 font-mono text-xs text-white placeholder-slate-400 rounded-none focus:outline-none focus:border-[#FF5722]"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-800">
            <table className="w-full text-left font-sans">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800 text-slate-300 font-mono text-xs uppercase">
                  <th className="py-2.5 px-4 text-center font-mono w-16">อันดับ</th>
                  <th className="py-2.5 px-4 font-bold">คป.สอ. / ทีม</th>
                  <th className="py-2.5 px-4 text-center bg-amber-500/10 text-amber-400 border-r border-slate-800 font-mono w-20">🥇 ทอง</th>
                  <th className="py-2.5 px-4 text-center bg-slate-300/10 text-slate-300 border-r border-slate-800 font-mono w-20">🥈 เงิน</th>
                  <th className="py-2.5 px-4 text-center bg-amber-700/10 text-amber-500 border-r border-slate-800 font-mono w-20">🥉 ทองแดง</th>
                  <th className="py-2.5 px-4 text-center bg-slate-950 text-slate-200 font-mono w-20">รวม</th>
                </tr>
              </thead>
              <tbody>
                {filteredStandings.map((team, idx) => {
                  const total = team.gold + team.silver + team.bronze;
                  const isTop3 = idx < 3 && total > 0;
                  const isUserTeam = selectedDistrict && team.team === selectedDistrict;
                  return (
                    <tr
                      key={team.team}
                      className={`border-b border-slate-800/60 font-medium transition-all duration-200 hover:bg-slate-800/40 text-xs ${
                        isUserTeam 
                          ? "bg-[#FF5722]/15 border-l-4 border-l-[#FF5722] text-white shadow-inner" 
                          : isTop3 
                            ? "bg-amber-500/5" 
                            : ""
                      }`}
                    >
                      <td className={`py-3 px-4 text-center font-mono font-bold text-sm ${isUserTeam ? "text-[#00FF66]" : "text-slate-400"}`}>
                        {idx + 1}
                      </td>
                      <td className={`py-3 px-4 font-bold flex items-center gap-2 ${isUserTeam ? "text-[#00FF66]" : "text-white"}`}>
                        {isUserTeam ? (
                          <Trophy size={14} className="text-[#FF5722] animate-pulse shrink-0" />
                        ) : isTop3 ? (
                          <Flame size={14} className="text-[#FF5722] shrink-0" />
                        ) : null}
                        {team.team}
                        {isUserTeam && <span className="text-[10px] bg-[#FF5722] text-white px-1.5 py-0.5 ml-1 uppercase rounded-none font-sans font-bold">ทีมของฉัน</span>}
                      </td>
                      <td className="py-3 px-4 text-center bg-amber-500/5 border-r border-slate-800 font-mono font-bold text-amber-400 text-sm">
                        {team.gold}
                      </td>
                      <td className="py-3 px-4 text-center bg-slate-300/5 border-r border-slate-800 font-mono font-bold text-slate-300 text-sm">
                        {team.silver}
                      </td>
                      <td className="py-3 px-4 text-center bg-amber-700/5 border-r border-slate-800 font-mono font-bold text-amber-500 text-sm">
                        {team.bronze}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-black text-sm bg-slate-900/60 text-white">
                        {total}
                      </td>
                    </tr>
                  );
                })}
                {filteredStandings.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 font-semibold font-mono text-xs">
                      ❌ ไม่พบทีมที่ค้นหา
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live / Recent Activity (Colspan 1) */}
        <div className="border border-slate-800 bg-[#111827] p-6 space-y-4 rounded-none">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Activity className="text-[#FF5722]" size={20} />
            <h2 className="text-base font-black uppercase text-white tracking-wide">ความเคลื่อนไหวล่าสุด</h2>
          </div>

          <div className="space-y-4">
            {recentMatches.map((m) => {
              const isLive = m.status === "live";
              const isTrack = m.sport === "track";

              return (
                <div
                  key={m.id}
                  className={`p-4 border rounded-none transition-all duration-150 ${
                    isLive 
                      ? "bg-[#1E293B] border-[#00FF66] shadow-[0_0_8px_0_rgba(0,255,102,0.15)]" 
                      : "bg-[#151F32] border-slate-800"
                  }`}
                >
                  {/* Badge */}
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(() => {
                        const matchNum = m.id.split("_").pop();
                        return matchNum && !isNaN(Number(matchNum)) ? (
                          <span className="bg-slate-950 text-amber-400 text-[9px] font-mono px-2 py-0.5 border border-slate-800 uppercase rounded-none">
                            คู่ที่ {matchNum}
                          </span>
                        ) : null;
                      })()}
                      <span className="bg-slate-950 text-slate-300 text-[9px] font-mono px-2 py-0.5 border border-slate-800 uppercase rounded-none">
                        {m.category}
                      </span>
                    </div>
                    <span
                      className={`text-[9px] font-mono font-bold px-2 py-0.5 border rounded-none uppercase ${
                        isLive
                          ? "bg-[#00FF66]/10 text-[#00FF66] border-[#00FF66]/30"
                          : "bg-emerald-950 text-emerald-400 border-emerald-900"
                      }`}
                    >
                      {isLive ? "LIVE 🔴" : "จบการแข่งขัน"}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="space-y-2">
                    {isTrack ? (
                      // Track view
                      <div className="text-xs font-medium space-y-1">
                        <span className="text-slate-400 block font-mono text-[10px]">รอบ: {m.round} ({m.group})</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {m.ranks && m.ranks.length > 0 ? (
                            m.ranks.slice(0, 3).map((r, i) => (
                              <span
                                key={r.name}
                                className={`px-1.5 py-0.5 text-[9px] border font-mono rounded-none ${
                                  isLive 
                                    ? "bg-[#1E293B] text-[#00FF66] border-[#00FF66]/30" 
                                    : "bg-slate-800 text-slate-300 border-slate-700"
                                }`}
                              >
                                #{i + 1} {r.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-500 italic font-mono text-[10px]">ยังไม่มีผลจัดอันดับ</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      // Team VS view
                      <div className="flex justify-between items-center py-1">
                        <div className="space-y-1.5 w-full">
                          <div className="flex justify-between items-center text-xs">
                            <span className={`font-semibold ${m.winner === m.teamA ? "text-[#00FF66] underline decoration-wavy" : "text-white"}`}>
                              {m.teamA}
                            </span>
                            <span className="font-mono text-sm bg-slate-950 text-white px-2 py-0.5 border border-slate-800 font-bold">
                              {m.scoreA ?? "-"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className={`font-semibold ${m.winner === m.teamB ? "text-[#00FF66] underline decoration-wavy" : "text-white"}`}>
                              {m.teamB}
                            </span>
                            <span className="font-mono text-sm bg-slate-950 text-white px-2 py-0.5 border border-slate-800 font-bold">
                              {m.scoreB ?? "-"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Date & Location */}
                  <div className={`mt-3 pt-2 border-t flex justify-between items-center text-[9px] font-mono ${
                    isLive ? "border-slate-800/80 text-[#00FF66]" : "border-slate-800/50 text-slate-400"
                  }`}>
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {m.time}
                    </span>
                    <span>{m.court}</span>
                  </div>
                </div>
              );
            })}

            {recentMatches.length === 0 && (
              <div className="py-12 text-center text-slate-500 font-bold font-mono text-xs bg-[#151F32] border border-slate-800">
                ⏳ ยังไม่มีแมตช์ที่กำลังแข่งหรือเสร็จสิ้น
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

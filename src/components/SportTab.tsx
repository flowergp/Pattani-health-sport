import React, { useState, useEffect, useMemo } from "react";
import { Match, Participant } from "../types";
import { calculateGroupStandings } from "../utils/calcStandings";
import { getDisplayMatchNum } from "../utils/matchUtils";
import { TEAM_NAMES } from "../initialData";
import { 
  Clock, 
  MapPin, 
  Edit3, 
  Check, 
  Play, 
  Award, 
  AlertCircle,
  TrendingUp,
  Table,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Printer,
  Download,
  CheckCircle,
  Trophy,
  Save,
  Calendar
} from "lucide-react";

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

interface SportTabProps {
  sport: "track" | "petanque" | "volleyball" | "football" | "parade" | "cheerleader" | "fun_sport";
  matches: Match[];
  onUpdateMatch: (id: string, updates: Partial<Match>) => Promise<void>;
  onUpdateMatches?: (updatesList: { id: string; updates: Partial<Match> }[]) => Promise<void>;
  onAddMatch: (match: Omit<Match, "id" | "order">) => Promise<void>;
  onDeleteMatch: (id: string) => Promise<void>;
  isLoggedIn: boolean;
  selectedDistrict?: string;
  drawLots?: { [key: string]: string[] };
  onUpdateDrawLots?: (key: string, teamOrder: string[]) => Promise<void>;
}

// สร้างเป็น component แยกเพื่อหลีกเลี่ยงปัญหา hooks ใน IIFE
interface PetanqueResultFormProps {
  medals: Array<{ rank: number; label: string; color: string; bg: string; value: string; key: string }>;
  catTeams: string[];
  onSave: (r1: string, r2: string, r3: string) => void;
  currentR1: string;
  currentR2: string;
  currentR3: string;
}

function PetanqueResultForm({ medals, catTeams, onSave, currentR1, currentR2, currentR3 }: PetanqueResultFormProps) {
  const [r1, setR1] = useState(currentR1);
  const [r2, setR2] = useState(currentR2);
  const [r3, setR3] = useState(currentR3);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // อัปเดตเมื่อ props เปลี่ยน (บันทึกแล้วกลับมา)
  React.useEffect(() => {
    setR1(currentR1);
    setR2(currentR2);
    setR3(currentR3);
  }, [currentR1, currentR2, currentR3]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(r1, r2, r3);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  // รายการ dropdown ที่แต่ละ rank เลือกได้ (กรองทีมที่เลือกไปแล้วใน rank อื่นออก)
  const getAvailableTeams = (excludeVals: string[]) => [
    "",
    ...catTeams.filter(t => !excludeVals.includes(t)),
  ];

  const rankValues = [r1, r2, r3];
  const rankSetters = [setR1, setR2, setR3];
  const rankKeys = ["r1", "r2", "r3"];

  return (
    <div className="border border-slate-700 bg-[#0F172A] p-4 space-y-3 rounded-none">
      <div className="flex items-center gap-2 mb-1">
        <Save size={14} className="text-emerald-400" />
        <span className="text-[11px] font-black uppercase text-emerald-400 font-mono">
          เลือกผลการแข่งขัน (Admin เท่านั้น)
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {rankValues.map((val, idx) => {
          const others = rankValues.filter((_, i) => i !== idx);
          const available = getAvailableTeams(others);
          return (
            <div key={rankKeys[idx]}>
              <label className="block text-[10px] font-bold font-mono uppercase text-slate-400 mb-1">
                {idx === 0 ? "🥇 อันดับที่ 1 — ชนะเลิศ" : idx === 1 ? "🥈 อันดับที่ 2 — รองชนะเลิศ" : "🥉 อันดับที่ 3 — รองชนะเลิศ 2"}
              </label>
              <select
                value={val}
                onChange={(e) => rankSetters[idx](e.target.value)}
                className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-bold focus:outline-none focus:border-emerald-500 rounded-none cursor-pointer"
              >
                <option value="">— เลือกทีม —</option>
                {/* สังเกต: TEAM_NAMES ที่ไม่ถูกเลือกใน rank อื่น */}
                {available.filter(t => t !== "").map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
                {/* ถ้าทีมสองคู่ไม่มีในรายการ catTeams, เพิ่มเป็นตัวเลือก */}
                {val && !available.includes(val) && (
                  <option value={val}>{val}</option>
                )}
              </select>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className={`px-5 py-2 font-bold text-xs uppercase tracking-wide border transition-all cursor-pointer rounded-none flex items-center gap-2 ${
            saved
              ? "bg-emerald-600 border-emerald-500 text-white"
              : "bg-[#FF5722] hover:bg-[#E04E1D] border-[#FF5722] text-white"
          } disabled:opacity-50`}
        >
          {isSaving ? "⏳ กำลังบันทึก..." : saved ? "✅ บันทึกสำเร็จ" : "💾 บันทึกผล 3 อันดับ"}
        </button>
      </div>
    </div>
  );
}

// ===== Parade4ResultForm: เหมือน PetanqueResultForm แต่มี 4 อันดับ (พาเหรด/กองเชียร์) =====
interface Parade4ResultFormProps {
  catTeams: string[];
  onSave: (r1: string, r2: string, r3: string, r4: string) => void;
  currentR1: string;
  currentR2: string;
  currentR3: string;
  currentR4: string;
}

function Parade4ResultForm({ catTeams, onSave, currentR1, currentR2, currentR3, currentR4 }: Parade4ResultFormProps) {
  const [r1, setR1] = useState(currentR1);
  const [r2, setR2] = useState(currentR2);
  const [r3, setR3] = useState(currentR3);
  const [r4, setR4] = useState(currentR4);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  React.useEffect(() => {
    setR1(currentR1);
    setR2(currentR2);
    setR3(currentR3);
    setR4(currentR4);
  }, [currentR1, currentR2, currentR3, currentR4]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(r1, r2, r3, r4);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  const getAvailableTeams = (excludeVals: string[]) => [
    "",
    ...catTeams.filter(t => !excludeVals.includes(t)),
  ];

  const rankValues = [r1, r2, r3, r4];
  const rankSetters = [setR1, setR2, setR3, setR4];
  const rankKeys = ["r1", "r2", "r3", "r4"];
  const rankLabels = [
    "🥇 อันดับที่ 1 — ชนะเลิศ",
    "🥈 อันดับที่ 2 — รองชนะเลิศ",
    "🥉 อันดับที่ 3 — รองชนะเลิศ อันดับ 2",
    "🏅 อันดับที่ 4 — รองชนะเลิศ อันดับ 3",
  ];

  return (
    <div className="border border-slate-700 bg-[#0F172A] p-4 space-y-3 rounded-none">
      <div className="flex items-center gap-2 mb-1">
        <Save size={14} className="text-emerald-400" />
        <span className="text-[11px] font-black uppercase text-emerald-400 font-mono">
          เลือกผลการแข่งขัน (Admin เท่านั้น)
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {rankValues.map((val, idx) => {
          const others = rankValues.filter((_, i) => i !== idx);
          const available = getAvailableTeams(others);
          return (
            <div key={rankKeys[idx]}>
              <label className="block text-[10px] font-bold font-mono uppercase text-slate-400 mb-1">
                {rankLabels[idx]}
              </label>
              <select
                value={val}
                onChange={(e) => rankSetters[idx](e.target.value)}
                className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-bold focus:outline-none focus:border-emerald-500 rounded-none cursor-pointer"
              >
                <option value="">— เลือกทีม —</option>
                {available.filter(t => t !== "").map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
                {val && !available.includes(val) && (
                  <option value={val}>{val}</option>
                )}
              </select>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className={`px-5 py-2 font-bold text-xs uppercase tracking-wide border transition-all cursor-pointer rounded-none flex items-center gap-2 ${
            saved
              ? "bg-emerald-600 border-emerald-500 text-white"
              : "bg-[#FF5722] hover:bg-[#E04E1D] border-[#FF5722] text-white"
          } disabled:opacity-50`}
        >
          {isSaving ? "⏳ กำลังบันทึก..." : saved ? "✅ บันทึกสำเร็จ" : "💾 บันทึกผล 4 อันดับ"}
        </button>
      </div>
    </div>
  );
}


interface RankResultFormProps {
  numRanks: 3 | 4; // จำนวนอันดับที่ต้องเลือก
  catTeams: string[];
  onSave: (ranks: string[]) => void;
  currentRanks: string[];
  sportLabel: string; // ชื่อกีฬา เช่น "พาเหรด"
}

function RankResultForm({ numRanks, catTeams, onSave, currentRanks, sportLabel }: RankResultFormProps) {
  const initRanks = Array.from({ length: numRanks }, (_, i) => currentRanks[i] || "");
  const [ranks, setRanks] = useState<string[]>(initRanks);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  React.useEffect(() => {
    setRanks(Array.from({ length: numRanks }, (_, i) => currentRanks[i] || ""));
  }, [currentRanks, numRanks]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(ranks);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  const getAvailableTeams = (excludeVals: string[]) => [
    "",
    ...catTeams.filter(t => !excludeVals.includes(t)),
  ];

  const rankLabels = [
    "🥇 อันดับที่ 1 — ชนะเลิศ",
    "🥈 อันดับที่ 2 — รองชนะเลิศ",
    "🥉 อันดับที่ 3 — อันดับสาม",
    "🏅 อันดับที่ 4 — อันดับสี่",
  ];

  return (
    <div className="border border-slate-700 bg-[#0F172A] p-4 space-y-3 rounded-none">
      <div className="flex items-center gap-2 mb-1">
        <Save size={14} className="text-purple-400" />
        <span className="text-[11px] font-black uppercase text-purple-400 font-mono">
          เลือกผลการแข่งขัน {sportLabel} (Admin เท่านั้น)
        </span>
      </div>

      <div className={`grid grid-cols-1 ${numRanks === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"} gap-3`}>
        {ranks.map((val, idx) => {
          const others = ranks.filter((_, i) => i !== idx);
          const available = getAvailableTeams(others);
          return (
            <div key={idx}>
              <label className="block text-[10px] font-bold font-mono uppercase text-slate-400 mb-1">
                {rankLabels[idx]}
              </label>
              <select
                value={val}
                onChange={(e) => {
                  const newRanks = [...ranks];
                  newRanks[idx] = e.target.value;
                  setRanks(newRanks);
                }}
                className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-bold focus:outline-none focus:border-purple-500 rounded-none cursor-pointer"
              >
                <option value="">— เลือกทีม —</option>
                {available.filter(t => t !== "").map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
                {val && !available.includes(val) && (
                  <option value={val}>{val}</option>
                )}
              </select>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className={`px-5 py-2 font-bold text-xs uppercase tracking-wide border transition-all cursor-pointer rounded-none flex items-center gap-2 ${
            saved
              ? "bg-emerald-600 border-emerald-500 text-white"
              : "bg-purple-600 hover:bg-purple-500 border-purple-500 text-white"
          } disabled:opacity-50`}
        >
          {isSaving ? "⏳ กำลังบันทึก..." : saved ? "✅ บันทึกสำเร็จ" : `💾 บันทึกผล ${numRanks} อันดับ`}
        </button>
      </div>
    </div>
  );
}

// ===== TrackDirectResultForm: บันทึกผลวิ่งโดยตรง (ที่ 1-3 เลือกจาก dropdown) =====
interface TrackDirectResultFormProps {
  category: string;
  currentRanks: string[];
  onSave: (ranks: string[]) => void;
}

function TrackDirectResultForm({ category, currentRanks, onSave }: TrackDirectResultFormProps) {
  const NUM_RANKS = 3;
  const initRanks = Array.from({ length: NUM_RANKS }, (_, i) => currentRanks[i] || "");
  const [ranks, setRanks] = useState<string[]>(initRanks);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  React.useEffect(() => {
    setRanks(Array.from({ length: NUM_RANKS }, (_, i) => currentRanks[i] || ""));
  }, [currentRanks]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(ranks);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  const getAvailableTeams = (excludeVals: string[]) =>
    TEAM_NAMES.filter(t => !excludeVals.includes(t));

  const rankConfig = [
    { label: "🥇 ที่ 1 — เหรียญทอง", color: "text-amber-400" },
    { label: "🥈 ที่ 2 — เหรียญเงิน", color: "text-slate-300" },
    { label: "🥉 ที่ 3 — เหรียญทองแดง", color: "text-amber-600" },
  ];

  return (
    <div className="border border-[#00FF66]/30 bg-[#0F172A] p-4 space-y-3 rounded-none">
      <div className="flex items-center gap-2 mb-1">
        <Save size={14} className="text-[#00FF66]" />
        <span className="text-[11px] font-black uppercase text-[#00FF66] font-mono">
          บันทึกผลการแข่งขัน {category}
        </span>
      </div>
      <p className="text-[10px] text-slate-400 font-mono">
        ✨ เลือกทีมโดยตรง — ที่ 1, 2, 3 เท่านั้น ไม่ต้องผ่านรอบคัดเลือก
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {ranks.map((val, idx) => {
          const others = ranks.filter((_, i) => i !== idx);
          const available = getAvailableTeams(others.filter(Boolean));
          const cfg = rankConfig[idx];
          return (
            <div key={idx}>
              <label className={`block text-[10px] font-bold font-mono uppercase mb-1 ${cfg.color}`}>
                {cfg.label}
              </label>
              <select
                value={val}
                onChange={(e) => {
                  const newRanks = [...ranks];
                  newRanks[idx] = e.target.value;
                  setRanks(newRanks);
                }}
                className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-bold focus:outline-none focus:border-[#00FF66] rounded-none cursor-pointer"
              >
                <option value="">— เลือกทีม —</option>
                {available.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
                {val && !available.includes(val) && (
                  <option value={val}>{val}</option>
                )}
              </select>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className={`px-5 py-2 font-bold text-xs uppercase tracking-wide border transition-all cursor-pointer rounded-none flex items-center gap-2 ${
            saved
              ? "bg-emerald-600 border-emerald-500 text-white"
              : "bg-[#00FF66] hover:bg-[#00DD55] border-[#00FF66] text-slate-950"
          } disabled:opacity-50`}
        >
          {isSaving ? "⏳ กำลังบันทึก..." : saved ? "✅ บันทึกสำเร็จ" : "💾 บันทึกผลวิ่ง"}
        </button>
      </div>
    </div>
  );
}



export default function SportTab({
  sport,
  matches,
  onUpdateMatch,
  onUpdateMatches,
  onAddMatch,
  onDeleteMatch,
  isLoggedIn,
  selectedDistrict,
  drawLots = {},
  onUpdateDrawLots
}: SportTabProps) {
  // Filters state
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedRound, setSelectedRound] = useState<string>("all");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [selectedCourt, setSelectedCourt] = useState<string>("all");
  const [teamSearch, setTeamSearch] = useState<string>("");
  const [activeView, setActiveView] = useState<"all" | "standings" | "bracket" | "matches">("all");
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);
  const [lastFilename, setLastFilename] = useState<string>("");
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);


  const handleSwapDrawLots = async (
    team: string,
    direction: "up" | "down",
    standings: any[],
    cat: string,
    grpName: string
  ) => {
    if (!isLoggedIn || !onUpdateDrawLots) return;

    const currentOrder = standings.map((s) => s.team);
    const idx = currentOrder.indexOf(team);
    if (idx === -1) return;

    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= currentOrder.length) return;

    const teamAtTarget = currentOrder[targetIdx];
    const newOrder = [...currentOrder];
    newOrder[idx] = teamAtTarget;
    newOrder[targetIdx] = team;

    const key = `${sport}_${cat}_${grpName}`;
    await onUpdateDrawLots(key, newOrder);
  };

  const handleExportPDF = () => {
    setIsExporting(true);

    const originalGetComputedStyle = window.getComputedStyle;

    // Helper to convert oklch color string to rgb/hex to bypass html2canvas parser error
    const convertOklchColor = (colorStr: string): string => {
      if (!colorStr || typeof colorStr !== "string") return colorStr;
      const lower = colorStr.toLowerCase();
      if (!lower.includes("oklch")) return colorStr;

      let result = "";
      let i = 0;
      while (i < colorStr.length) {
        if (colorStr.substr(i, 6).toLowerCase() === "oklch(") {
          let start = i;
          let parenCount = 1;
          i += 6;
          while (i < colorStr.length && parenCount > 0) {
            if (colorStr[i] === "(") {
              parenCount++;
            } else if (colorStr[i] === ")") {
              parenCount--;
            }
            i++;
          }
          const match = colorStr.slice(start, i);
          
          // Convert this single match
          let converted = "rgb(120, 120, 120)";
          try {
            const canvas = document.createElement("canvas");
            canvas.width = 1;
            canvas.height = 1;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.fillStyle = match;
              const cv = ctx.fillStyle;
              if (cv && cv !== "#000000" && cv !== "rgb(0, 0, 0)") {
                converted = cv;
              } else if (cv === "#000000" || cv === "rgb(0, 0, 0)") {
                if (match.includes("0 0 0") || match.includes(" 0% 0") || match.includes(" 0 0")) {
                  converted = cv;
                } else {
                  // Fallback for browsers that don't support oklch on canvas
                  const nums = match.match(/[\d.]+%?/g);
                  if (nums && nums.length >= 1) {
                    let lVal = parseFloat(nums[0]);
                    if (nums[0].includes("%")) lVal /= 100;
                    const grayInt = Math.round(lVal * 255);
                    const clamped = Math.max(0, Math.min(255, grayInt));
                    const hex = clamped.toString(16).padStart(2, "0");
                    if (match.includes("/")) {
                      const alphaVal = nums[nums.length - 1];
                      if (alphaVal && !alphaVal.includes("%")) {
                        converted = `rgba(${clamped}, ${clamped}, ${clamped}, ${alphaVal})`;
                      } else {
                        converted = `#${hex}${hex}${hex}`;
                      }
                    } else {
                      converted = `#${hex}${hex}${hex}`;
                    }
                  }
                }
              }
            }
          } catch (e) {
            // ignore
          }
          result += converted;
        } else {
          result += colorStr[i];
          i++;
        }
      }
      return result;
    };

    // Temporarily proxy getComputedStyle during export with correct receiver to avoid Illegal invocation
    window.getComputedStyle = function(...args: any[]) {
      const context = (this && this.getComputedStyle) ? this : window;
      const style = originalGetComputedStyle.apply(context, args as any);
      
      const element = args[0];
      const isInsidePdf = element && (
        element.id === "sport-pdf-content" || 
        document.getElementById("sport-pdf-content")?.contains(element)
      );

      if (!isInsidePdf) {
        return style;
      }

      return new Proxy(style, {
        get(target, prop) {
          if (prop === "getPropertyValue") {
            return function(propertyName: string) {
              const originalVal = target.getPropertyValue(propertyName);
              return convertOklchColor(originalVal);
            };
          }
          const val = (target as any)[prop];
          if (typeof val === "function") {
            return val.bind(target);
          }
          if (typeof val === "string") {
            return convertOklchColor(val);
          }
          return val;
        }
      });
    };

    // Gather and compile all original stylesheet contents
    let originalCssText = "";
    const originalSheets = Array.from(document.styleSheets);

    for (let i = 0; i < originalSheets.length; i++) {
      const sheet = originalSheets[i];
      try {
        const rules = sheet.cssRules || sheet.rules;
        if (rules) {
          for (let j = 0; j < rules.length; j++) {
            originalCssText += rules[j].cssText + "\n";
          }
        }
      } catch (e) {
        // CORS or access blocked, handle gracefully
      }
    }

    // Also collect style tags text content directly
    const styleTags = Array.from(document.querySelectorAll("style"));
    styleTags.forEach(style => {
      originalCssText += style.textContent + "\n";
    });

    // Clean up oklch from compiled css text
    const sanitizedCssText = convertOklchColor(originalCssText);

    // Temporarily remove all original style-producing elements to prevent html2canvas from parsing/fetching them
    const styleElements = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"));
    const removedElements: { el: HTMLElement, parent: Node, nextSibling: Node | null }[] = [];
    
    styleElements.forEach((el: any) => {
      if (el.parentNode) {
        removedElements.push({
          el,
          parent: el.parentNode,
          nextSibling: el.nextSibling
        });
        el.parentNode.removeChild(el);
      }
    });

    // Inject temporary sanitized style block
    const tempStyleEl = document.createElement("style");
    tempStyleEl.id = "temp-pdf-sanitized-styles";
    tempStyleEl.textContent = sanitizedCssText;
    document.head.appendChild(tempStyleEl);

    // Sanitize any inline styles containing oklch on elements inside the pdf container
    const pdfElement = document.getElementById("sport-pdf-content");
    const originalInlineStyles: { el: HTMLElement, cssText: string }[] = [];
    if (pdfElement) {
      const walker = document.createTreeWalker(pdfElement, NodeFilter.SHOW_ELEMENT);
      let currentNode = walker.currentNode as HTMLElement;
      while (currentNode) {
        if (currentNode.style && currentNode.style.cssText && currentNode.style.cssText.toLowerCase().includes("oklch")) {
          originalInlineStyles.push({ el: currentNode, cssText: currentNode.style.cssText });
          currentNode.style.cssText = convertOklchColor(currentNode.style.cssText);
        }
        currentNode = walker.nextNode() as HTMLElement;
      }
    }

    // Cleanup helper to restore original environment
    const cleanupStyles = () => {
      window.getComputedStyle = originalGetComputedStyle;
      if (tempStyleEl.parentNode) {
        tempStyleEl.parentNode.removeChild(tempStyleEl);
      }
      removedElements.forEach(({ el, parent, nextSibling }) => {
        parent.insertBefore(el, nextSibling);
      });
      originalInlineStyles.forEach(({ el, cssText }) => {
        el.style.cssText = cssText;
      });
    };

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
        const element = document.getElementById("sport-pdf-content");
        if (element) {
          const targetFilename = `ตารางแข่งขัน_${sport}.pdf`;
          setLastFilename(targetFilename);
          const opt = {
            margin:       [10, 10, 10, 10], // margin in mm
            filename:     targetFilename,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, logging: false },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
          };

          // Generate blob url to download and to provide as fallback download link
          html2pdf().set(opt).from(element).toPdf().output('blob')
            .then((blob: any) => {
              const url = URL.createObjectURL(blob);
              setPdfBlobUrl(url);

              // Trigger automatic download
              const a = document.createElement("a");
              a.href = url;
              a.download = targetFilename;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);

              cleanupStyles();
              setIsExporting(false);
              setExportSuccess(true);
            })
            .catch((err: any) => {
              console.error("PDF generation failed:", err);
              cleanupStyles();
              setIsExporting(false);
              setExportSuccess(false);
              setShowPreview(false);
              // Fallback
              window.print();
            });
        } else {
          cleanupStyles();
          setIsExporting(false);
          setShowPreview(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load html2pdf.js:", err);
        cleanupStyles();
        setIsExporting(false);
        setShowPreview(false);
        // Fallback
        window.print();
      });
  };

  // For adding a custom match
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [newGroup, setNewGroup] = useState("");
  const [newRound, setNewRound] = useState("รอบแรก");
  const [newCourt, setNewCourt] = useState("สนามที่ 1");
  const [newTime, setNewTime] = useState("09.00 น.");
  const [newDate, setNewDate] = useState("6 ก.ค. 69");
  const [newTeamA, setNewTeamA] = useState("");
  const [newTeamB, setNewTeamB] = useState("");

  // Edit match state
  const [scoreA, setScoreA] = useState<string>("");
  const [scoreB, setScoreB] = useState<string>("");
  const [matchStatus, setMatchStatus] = useState<"pending" | "live" | "completed">("pending");
  const [winner, setWinner] = useState<string>("");
  const [editTeamA, setEditTeamA] = useState<string>("");
  const [editTeamB, setEditTeamB] = useState<string>("");
  const [editDate, setEditDate] = useState<string>("");
  const [editTime, setEditTime] = useState<string>("");
  const [editCourt, setEditCourt] = useState<string>("");
  const [editRound, setEditRound] = useState<string>("");
  const [editGroup, setEditGroup] = useState<string>("");

  // Volleyball set-score edit state
  const [set1A, setSet1A] = useState("0");
  const [set1B, setSet1B] = useState("0");
  const [set2A, setSet2A] = useState("0");
  const [set2B, setSet2B] = useState("0");
  const [set3A, setSet3A] = useState("0");
  const [set3B, setSet3B] = useState("0");

  // Track event rankings edit state
  // Key: team name, Value: rank & time
  const [trackRanks, setTrackRanks] = useState<{ [team: string]: { rank: number; time: string } }>({});

  // Petanque slot inputs state
  const [showPetanqueDrawForm, setShowPetanqueDrawForm] = useState(false);
  const [isSavingDraw, setIsSavingDraw] = useState(false);
  const [petanqueSlots, setPetanqueSlots] = useState<{ [key: string]: string }>({
    A1: "", A2: "", A3: "", A4: "",
    B1: "", B2: "", B3: "", B4: "",
    C1: "", C2: "", C3: "", C4: "",
    D1: "", D2: "", D3: "", D4: "",
  });

  // Get current sport's matches
  const sportMatches = matches.filter((m) => m.sport === sport);

  const isPetanqueDrawHeld = () => {
    const petanqueMatches = matches.filter(m => m.sport === "petanque");
    if (petanqueMatches.length === 0) return false;
    return petanqueMatches.some(m => 
      (m.teamA && TEAM_NAMES.includes(m.teamA)) || 
      (m.teamB && TEAM_NAMES.includes(m.teamB))
    );
  };
  const petanqueDrawNotHeld = sport === "petanque" && !isPetanqueDrawHeld();

  // Auto-initialize petanque draw inputs when selectedCategory or matches changes
  useEffect(() => {
    if (sport === "petanque" && selectedCategory) {
      const findMatchTeam = (suffix: number, isTeamB = false) => {
        const matchId = `petanque_${selectedCategory}_${suffix}`;
        const match = matches.find((m) => m.id === matchId);
        if (match) {
          return isTeamB ? match.teamB : match.teamA;
        }
        return "";
      };

      setPetanqueSlots({
        A1: findMatchTeam(1) || "",
        A2: findMatchTeam(1, true) || "",
        A3: findMatchTeam(2) || "",
        A4: findMatchTeam(2, true) || "",

        B1: findMatchTeam(7) || "",
        B2: findMatchTeam(7, true) || "",
        B3: findMatchTeam(8) || "",
        B4: findMatchTeam(8, true) || "",

        C1: findMatchTeam(13) || "",
        C2: findMatchTeam(13, true) || "",
        C3: findMatchTeam(14) || "",
        C4: findMatchTeam(14, true) || "",

        D1: findMatchTeam(19) || "",
        D2: findMatchTeam(19, true) || "",
        D3: findMatchTeam(20) || "",
        D4: findMatchTeam(20, true) || "",
      });
    }
  }, [sport, selectedCategory, matches]);

  // Reset filters when sport changes
  useEffect(() => {
    setSelectedCategory("");
    setSelectedGroup("all");
    setSelectedCourt("all");
  }, [sport]);

  // Reset group and court filters when category changes
  useEffect(() => {
    setSelectedGroup("all");
    setSelectedCourt("all");
  }, [selectedCategory]);

  // Auto-select first non-empty category for non-track sports if empty
  useEffect(() => {
    if (sport !== "track" && selectedCategory === "") {
      const nonEmptyCats = Array.from(new Set(sportMatches.map((m) => m.category))).filter(Boolean);
      if (nonEmptyCats.length > 0) {
        setSelectedCategory(nonEmptyCats[0]);
      }
    }
  }, [sport, sportMatches, selectedCategory]);

  // Get unique categories for this sport
  const categories = sport === "track"
    ? ["", ...Array.from(new Set(sportMatches.map((m) => m.category))).filter(Boolean)]
    : Array.from(new Set(sportMatches.map((m) => m.category))).filter(Boolean);
  // Get unique rounds for this sport
  const rounds = ["all", ...Array.from(new Set(sportMatches.map((m) => m.round))).filter(r => {
    if (sport === "track") return true;
    return r !== "รอบ 8 ทีม" && r !== "รอบรองชนะเลิศ" && r !== "รอบชิงชนะเลิศ" && r !== "ชิงที่ 3";
  })];

  // Get unique groups for this sport & selected category
  const groupsList = useMemo(() => {
    const list = sportMatches
      .filter((m) => selectedCategory === "" || m.category === selectedCategory)
      .map((m) => m.group)
      .filter(Boolean);
    // Sort logically
    return ["all", ...Array.from(new Set(list)).sort()];
  }, [sportMatches, selectedCategory]);

  // Get unique courts for this sport & selected category
  const courtsList = useMemo(() => {
    const list = sportMatches
      .filter((m) => selectedCategory === "" || m.category === selectedCategory)
      .map((m) => m.court)
      .filter(Boolean);
    // Sort logically
    return ["all", ...Array.from(new Set(list)).sort()];
  }, [sportMatches, selectedCategory]);

  // Filter matches
  const filteredMatches = sportMatches.filter((m) => {
    // Cut bracket/knockout rounds from the match schedule list (รายการแข่งขัน) (except for track)
    if (sport !== "track" && (m.round === "รอบ 8 ทีม" || m.round === "รอบรองชนะเลิศ" || m.round === "รอบชิงชนะเลิศ" || m.round === "ชิงที่ 3")) {
      return false;
    }

    const matchCat = selectedCategory === "" ? true : m.category === selectedCategory;
    const matchRound = selectedRound === "all" || m.round === selectedRound;
    const matchGroup = selectedGroup === "all" || m.group === selectedGroup;
    const matchCourt = selectedCourt === "all" || m.court === selectedCourt;
    
    let matchTeam = true;
    if (teamSearch.trim()) {
      const search = teamSearch.toLowerCase();
      if (m.sport === "track") {
        matchTeam = m.participants?.some(p => p.toLowerCase().includes(search)) ?? false;
      } else {
        matchTeam = 
          (m.teamA?.toLowerCase().includes(search) ?? false) || 
          (m.teamB?.toLowerCase().includes(search) ?? false);
      }
    }

    let matchDistrict = true;
    if (selectedDistrict) {
      if (m.sport === "track") {
        matchDistrict = m.participants?.some(p => p === selectedDistrict) ?? false;
      } else {
        matchDistrict = m.teamA === selectedDistrict || m.teamB === selectedDistrict;
      }
    }

    // If no category is selected, only show matches if a search, district, group, or court filter is active (except for track, which supports Show All)
    if (
      selectedCategory === "" && 
      !teamSearch.trim() && 
      !selectedDistrict && 
      selectedGroup === "all" && 
      selectedCourt === "all" && 
      sport !== "track"
    ) {
      return false;
    }

    return matchCat && matchRound && matchTeam && matchDistrict && matchGroup && matchCourt;
  }).sort((a, b) => {
    // For Petanque, sort by match number (suffix of the ID)
    if (sport === "petanque") {
      const numA = Number(a.id.split("_").pop()) || 0;
      const numB = Number(b.id.split("_").pop()) || 0;
      if (numA !== numB) return numA - numB;
    }

    // 1. Sort by Date first
    const dateA = parseThaiDateToValue(a.date);
    const dateB = parseThaiDateToValue(b.date);
    if (dateA !== dateB) return dateA - dateB;

    // 2. Sort by Time second
    const timeA = parseTimeToMinutes(a.time);
    const timeB = parseTimeToMinutes(b.time);
    if (timeA !== timeB) return timeA - timeB;

    // 3. Fallback to round order for football, or court, or custom order
    if (sport === "football") {
      const roundOrder: Record<string, number> = {
        "รอบแรก": 1,
        "รอบคัดเลือก": 2,
        "รอบ 8 ทีม": 3,
        "รอบรองชนะเลิศ": 4,
        "ชิงที่ 3": 5,
        "รอบชิงชนะเลิศ": 6,
      };
      const roundA = roundOrder[a.round] || 99;
      const roundB = roundOrder[b.round] || 99;
      if (roundA !== roundB) return roundA - roundB;
      
      return a.court.localeCompare(b.court);
    }
    
    return a.order - b.order;
  });

  // Unique groups found in this sport for round 1 (for standings tables)
  const groupStandingsList = sport !== "track" 
    ? Array.from(new Set(sportMatches.filter(m => m.round === "รอบแรก" && m.group).map(m => m.group))).sort()
    : [];

  // Determine active category to display in the bracket.
  // We prefer the selected category, but if it is empty, we set it to empty.
  const activeBracketCategory = selectedCategory !== "" 
    ? selectedCategory 
    : "";

  // Suffixes of match IDs for each stage of the bracket depending on the sport
  let qfSuffixes: string[] = [];
  let sfSuffixes: string[] = [];
  let thirdSuffix = "";
  let finalSuffix = "";

  if (sport === "petanque") {
    qfSuffixes = ["25", "27", "26", "28"]; // Top pair feeds into SF1 (25 vs 27), bottom pair feeds into SF2 (26 vs 28)
    sfSuffixes = ["29", "30"];
    thirdSuffix = "31";
    finalSuffix = "32";
  } else if (sport === "volleyball") {
    qfSuffixes = ["19", "21", "20", "22"];
    sfSuffixes = ["23", "24"];
    thirdSuffix = "25";
    finalSuffix = "26";
  } else if (sport === "football") {
    qfSuffixes = ["19", "20", "21", "22"];
    sfSuffixes = ["23", "24"];
    thirdSuffix = "";
    finalSuffix = "26";
  }

  // Filter matches for the active bracket category
  const bracketMatches = sportMatches.filter(m => m.category === activeBracketCategory);

  // Map match ID suffix (e.g. "17") to its Match object for quick lookup
  const koMap: { [key: string]: Match } = {};
  bracketMatches.forEach(m => {
    const suffix = m.id.split("_").pop();
    if (suffix) {
      koMap[suffix] = m;
    }
  });

  const hasQF = qfSuffixes.some(suffix => koMap[suffix] !== undefined);
  const hasSF = sfSuffixes.some(suffix => koMap[suffix] !== undefined);
  const hasFinal = koMap[finalSuffix] !== undefined || koMap[thirdSuffix] !== undefined;
  const hasAnyKnockout = hasQF || hasSF || hasFinal;

  const handleStartEdit = (m: Match) => {
    if (!isLoggedIn) return;
    setEditingMatchId(m.id);
    setScoreA(m.scoreA !== null ? String(m.scoreA) : "");
    setScoreB(m.scoreB !== null ? String(m.scoreB) : "");
    setMatchStatus(m.status);
    setWinner(m.winner ?? "");
    setEditTeamA(m.teamA || "");
    setEditTeamB(m.teamB || "");
    setEditDate(m.date || "");
    setEditTime(m.time || "");
    setEditCourt(m.court || "");
    setEditRound(m.round || "");
    setEditGroup(m.group || "");

    if (sport === "volleyball" && m.sets && m.sets.length >= 3) {
      setSet1A(String(m.sets[0]?.scoreA ?? 0));
      setSet1B(String(m.sets[0]?.scoreB ?? 0));
      setSet2A(String(m.sets[1]?.scoreA ?? 0));
      setSet2B(String(m.sets[1]?.scoreB ?? 0));
      setSet3A(String(m.sets[2]?.scoreA ?? 0));
      setSet3B(String(m.sets[2]?.scoreB ?? 0));
    }

    if (sport === "track" && m.participants) {
      const initialRanks: { [t: string]: { rank: number; time: string } } = {};
      m.participants.forEach((team) => {
        const found = m.ranks?.find((r) => r.name === team);
        initialRanks[team] = {
          rank: found?.rank ?? 0,
          time: found?.time ?? ""
        };
      });
      setTrackRanks(initialRanks);
    }
  };

  const handleSaveEdit = async (m: Match) => {
    const updates: Partial<Match> = {
      status: matchStatus,
      date: editDate,
      time: editTime,
      court: editCourt,
      round: editRound,
      group: editGroup
    };

    const batchUpdates: { id: string; updates: Partial<Match> }[] = [];

    if (sport === "track") {
      // Build final ranks array based on input
      const finalRanks: Participant[] = Object.entries(trackRanks)
        .map(([name, val]: [string, any]) => {
          const res: Participant = { name };
          if (val.rank > 0) res.rank = val.rank;
          if (val.time) res.time = val.time;
          return res;
        })
        .filter(r => r.rank !== undefined)
        .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));

      updates.ranks = finalRanks;

      // Handle Qualifier Auto-Progression for Track & Field
      if (matchStatus === "completed" && m.round === "รอบคัดเลือก") {
        // Find the sister qualifying round and final round match
        const sisterGroupId = m.group === "กลุ่ม 1" ? "กลุ่ม 2" : "กลุ่ม 1";
        
        // Find other group match for the same category
        const sisterMatch = sportMatches.find(
          (sm) => sm.category === m.category && sm.group === sisterGroupId && sm.round === "รอบคัดเลือก"
        );

        const finalMatch = sportMatches.find(
          (fm) => fm.category === m.category && fm.round === "รอบชิงชนะเลิศ"
        );

        if (finalMatch) {
          // Get top 4 from current match
          const currentTop4 = finalRanks
            .filter(r => r.rank !== undefined && r.rank <= 4)
            .map(r => r.name);

          let sisterTop4: string[] = [];
          if (sisterMatch && sisterMatch.status === "completed" && sisterMatch.ranks) {
            sisterTop4 = sisterMatch.ranks
              .filter(r => r.rank !== undefined && r.rank <= 4)
              .map(r => r.name);
          }

          // If we have qualifiers, merge them and update the final round match
          const mergedParticipants = [...currentTop4, ...sisterTop4];
          if (mergedParticipants.length > 0) {
            batchUpdates.push({
              id: finalMatch.id,
              updates: {
                participants: mergedParticipants,
                ranks: mergedParticipants.map(name => ({ name }))
              }
            });
          }
        }
      }

    } else {
      // For Petanque, Volleyball, Football
      const sA = scoreA === "" ? null : Number(scoreA);
      const sB = scoreB === "" ? null : Number(scoreB);

      updates.scoreA = sA;
      updates.scoreB = sB;
      updates.teamA = editTeamA;
      updates.teamB = editTeamB;

      if (sA !== null && sB !== null) {
        if (sA > sB) updates.winner = editTeamA;
        else if (sB > sA) updates.winner = editTeamB;
        else updates.winner = "เสมอ";
      } else {
        updates.winner = null;
      }

      // Volleyball sets are no longer calculated automatically, standard score entry is used instead.

      const propagate = (targetMatchId: string, teamName: string, slot: "teamA" | "teamB") => {
        const target = matches.find(tm => tm.id === targetMatchId);
        if (target) {
          const existing = batchUpdates.find(u => u.id === targetMatchId);
          if (existing) {
            existing.updates[slot] = teamName;
          } else {
            batchUpdates.push({ id: targetMatchId, updates: { [slot]: teamName } });
          }
        }
      };

      // Bracket-Match Automatic Progression for Petanque / Volleyball / Football!
      // When a knockout match is completed, we can propagate the winner to the next round!
      const finalWinner = updates.winner;
      if (matchStatus === "completed" && finalWinner && m.round !== "รอบชิงชนะเลิศ" && m.round !== "ชิงที่ 3") {
        // Find if this match determines a spot in a subsequent match
        // Let's analyze the match ID structures:
        // Match numbers:
        // e.g. 'petanque_ทั่วไป ช_17' (QF 1)
        // e.g. 'petanque_ทั่วไป ช_18' (QF 2)
        // e.g. 'petanque_ทั่วไป ช_19' (QF 3)
        // e.g. 'petanque_ทั่วไป ช_20' (QF 4)
        // Semi-final 1: ID '..._21' has TeamA = "ผู้ชนะคู่ที่ 17", TeamB = "ผู้ชนะคู่ที่ 19"
        // Semi-final 2: ID '..._22' has TeamA = "ผู้ชนะคู่ที่ 18", TeamB = "ผู้ชนะคู่ที่ 20"
        
        const suffix = m.id.split("_").pop();
        const matchNum = Number(suffix);

        if (!isNaN(matchNum)) {
          // Petanque Progression (25-28 to 29-30, 29-30 to 31-32)
          if (m.sport === "petanque") {
            const prefix = m.id.replace(`_${matchNum}`, "");
            if (matchNum === 25) propagate(prefix + "_29", finalWinner, "teamA");
            if (matchNum === 27) propagate(prefix + "_29", finalWinner, "teamB");
            if (matchNum === 26) propagate(prefix + "_30", finalWinner, "teamA");
            if (matchNum === 28) propagate(prefix + "_30", finalWinner, "teamB");

            // From Semi finals to Final / 3rd Place
            if (matchNum === 29) {
              const loser = finalWinner === editTeamA ? editTeamB : editTeamA;
              propagate(prefix + "_32", finalWinner, "teamA"); // Final TeamA
              propagate(prefix + "_31", loser, "teamA"); // 3rd Place TeamA
            }
            if (matchNum === 30) {
              const loser = finalWinner === editTeamA ? editTeamB : editTeamA;
              propagate(prefix + "_32", finalWinner, "teamB"); // Final TeamB
              propagate(prefix + "_31", loser, "teamB"); // 3rd Place TeamB
            }
          }

          // Volleyball Progression (19-22 to 23-24, 23-24 to 25-26)
          if (m.sport === "volleyball") {
            const prefix = m.id.replace(`_${matchNum}`, "");
            if (matchNum === 19) propagate(prefix + "_23", finalWinner, "teamA");
            if (matchNum === 21) propagate(prefix + "_23", finalWinner, "teamB");
            if (matchNum === 20) propagate(prefix + "_24", finalWinner, "teamA");
            if (matchNum === 22) propagate(prefix + "_24", finalWinner, "teamB");

            if (matchNum === 23) {
              const loser = finalWinner === editTeamA ? editTeamB : editTeamA;
              propagate(prefix + "_26", finalWinner, "teamA"); // Final
              propagate(prefix + "_25", loser, "teamA"); // 3rd
            }
            if (matchNum === 24) {
              const loser = finalWinner === editTeamA ? editTeamB : editTeamA;
              propagate(prefix + "_26", finalWinner, "teamB"); // Final
              propagate(prefix + "_25", loser, "teamB"); // 3rd
            }
          }

          // Football Progression (19-22 QF, 23-24 SF, 25 3rd, 26 Final)
          if (m.sport === "football") {
            const prefix = m.id.replace(`_${matchNum}`, "");
            if (matchNum === 19) propagate(prefix + "_23", finalWinner, "teamA");
            if (matchNum === 20) propagate(prefix + "_23", finalWinner, "teamB");
            if (matchNum === 21) propagate(prefix + "_24", finalWinner, "teamA");
            if (matchNum === 22) propagate(prefix + "_24", finalWinner, "teamB");

            if (matchNum === 23) {
              propagate(prefix + "_26", finalWinner, "teamA"); // Final TeamA
            }
            if (matchNum === 24) {
              propagate(prefix + "_26", finalWinner, "teamB"); // Final TeamB
            }
          }
        }
      }
    }

    batchUpdates.push({ id: m.id, updates });

    if (onUpdateMatches) {
      await onUpdateMatches(batchUpdates);
    } else {
      for (const u of batchUpdates) {
        await onUpdateMatch(u.id, u.updates);
      }
    }

    setEditingMatchId(null);
  };

  const handleClearScore = async (m: Match) => {
    if (!isLoggedIn) return;
    
    if (!window.confirm(`คุณแน่ใจหรือไม่ที่จะเคลียร์คะแนนและผลแข่งขันของคู่นี้กลับเป็นค่าเริ่มต้น?`)) {
      return;
    }

    const updates: Partial<Match> = {
      status: "pending",
      scoreA: null,
      scoreB: null,
      winner: null
    };

    if (sport === "volleyball") {
      updates.sets = [
        { scoreA: 0, scoreB: 0 },
        { scoreA: 0, scoreB: 0 },
        { scoreA: 0, scoreB: 0 }
      ];
    }

    if (sport === "track") {
      updates.ranks = [];
    }

    await onUpdateMatch(m.id, updates);
    setEditingMatchId(null);
  };

  const handleDeleteMatch = async (matchId: string) => {
    if (!window.confirm("⚠️ คุณแน่ใจหรือไม่ว่าต้องการลบคู่แข่งขันคู่นี้ออกจากระบบ? การกระทำนี้ไม่สามารถกู้คืนได้")) {
      return;
    }
    try {
      setEditingMatchId(null);
      await onDeleteMatch(matchId);
    } catch (err) {
      console.error("Failed to delete match: ", err);
    }
  };

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCat.trim() || !newTeamA.trim() || !newTeamB.trim()) return;

    await onAddMatch({
      sport,
      category: newCat,
      gender: newCat.includes("หญิง") ? "หญิง" : newCat.includes("ผสม") ? "ผสม" : "ชาย",
      group: newGroup,
      round: newRound,
      court: newCourt,
      time: newTime,
      date: newDate,
      status: "pending",
      teamA: newTeamA,
      teamB: newTeamB,
      scoreA: null,
      scoreB: null,
      winner: null
    });

    setNewCat("");
    setNewGroup("");
    setNewTeamA("");
    setNewTeamB("");
    setShowAddForm(false);
  };

  const handleSavePetanqueDraw = async () => {
    if (!isLoggedIn) return;
    setIsSavingDraw(true);

    try {
      // Mapping from match index (1-24) to the updated teams.
      const getTeamsForMatchSuffix = (suffix: number) => {
        const s = petanqueSlots;
        // Group A (1-6)
        if (suffix >= 1 && suffix <= 6) {
          if (suffix === 1) return { teamA: s.A1 || "1 สาย A", teamB: s.A2 || "2 สาย A" };
          if (suffix === 2) return { teamA: s.A3 || "3 สาย A", teamB: s.A4 || "4 สาย A" };
          if (suffix === 3) return { teamA: s.A1 || "1 สาย A", teamB: s.A3 || "3 สาย A" };
          if (suffix === 4) return { teamA: s.A2 || "2 สาย A", teamB: s.A4 || "4 สาย A" };
          if (suffix === 5) return { teamA: s.A1 || "1 สาย A", teamB: s.A4 || "4 สาย A" };
          if (suffix === 6) return { teamA: s.A2 || "2 สาย A", teamB: s.A3 || "3 สาย A" };
        }
        // Group B (7-12)
        if (suffix >= 7 && suffix <= 12) {
          if (suffix === 7) return { teamA: s.B1 || "1 สาย B", teamB: s.B2 || "2 สาย B" };
          if (suffix === 8) return { teamA: s.B3 || "3 สาย B", teamB: s.B4 || "4 สาย B" };
          if (suffix === 9) return { teamA: s.B1 || "1 สาย B", teamB: s.B3 || "3 สาย B" };
          if (suffix === 10) return { teamA: s.B2 || "2 สาย B", teamB: s.B4 || "4 สาย B" };
          if (suffix === 11) return { teamA: s.B1 || "1 สาย B", teamB: s.B4 || "4 สาย B" };
          if (suffix === 12) return { teamA: s.B2 || "2 สาย B", teamB: s.B3 || "3 สาย B" };
        }
        // Group C (13-18)
        if (suffix >= 13 && suffix <= 18) {
          if (suffix === 13) return { teamA: s.C1 || "1 สาย C", teamB: s.C2 || "2 สาย C" };
          if (suffix === 14) return { teamA: s.C3 || "3 สาย C", teamB: s.C4 || "4 สาย C" };
          if (suffix === 15) return { teamA: s.C1 || "1 สาย C", teamB: s.C3 || "3 สาย C" };
          if (suffix === 16) return { teamA: s.C2 || "2 สาย C", teamB: s.C4 || "4 สาย C" };
          if (suffix === 17) return { teamA: s.C1 || "1 สาย C", teamB: s.C4 || "4 สาย C" };
          if (suffix === 18) return { teamA: s.C2 || "2 สาย C", teamB: s.C3 || "3 สาย C" };
        }
        // Group D (19-24)
        if (suffix >= 19 && suffix <= 24) {
          if (suffix === 19) return { teamA: s.D1 || "1 สาย D", teamB: s.D2 || "2 สาย D" };
          if (suffix === 20) return { teamA: s.D3 || "3 สาย D", teamB: s.D4 || "4 สาย D" };
          if (suffix === 21) return { teamA: s.D1 || "1 สาย D", teamB: s.D3 || "3 สาย D" };
          if (suffix === 22) return { teamA: s.D2 || "2 สาย D", teamB: s.D4 || "4 สาย D" };
          if (suffix === 23) return { teamA: s.D1 || "1 สาย D", teamB: s.D4 || "4 สาย D" };
          if (suffix === 24) return { teamA: s.D2 || "2 สาย D", teamB: s.D3 || "3 สาย D" };
        }
        return null;
      };

      // Loop and update all 24 group stage matches
      for (let i = 1; i <= 24; i++) {
        const matchId = `petanque_${selectedCategory}_${i}`;
        const match = matches.find((m) => m.id === matchId);
        if (match) {
          const updatedTeams = getTeamsForMatchSuffix(i);
          if (updatedTeams) {
            // Only update if they actually changed
            if (match.teamA !== updatedTeams.teamA || match.teamB !== updatedTeams.teamB) {
              await onUpdateMatch(matchId, {
                teamA: updatedTeams.teamA,
                teamB: updatedTeams.teamB,
              });
            }
          }
        }
      }
      alert("บันทึกรายชื่อทีมและจัดสายใหม่เรียบร้อยแล้ว!");
      setShowPetanqueDrawForm(false);
    } catch (err: any) {
      alert("เกิดข้อผิดพลาดในการบันทึก: " + err.message);
    } finally {
      setIsSavingDraw(false);
    }
  };

  const renderPetanqueSlotSelector = (group: string, num: number) => {
    const slotKey = `${group}${num}`;
    const value = petanqueSlots[slotKey] || "";
    const defaultPlaceholder = `${num} สาย ${group}`;
    const isCustom = value && value !== defaultPlaceholder && !TEAM_NAMES.includes(value);

    // Current dropdown selection
    const selectValue = TEAM_NAMES.includes(value) || value === defaultPlaceholder
      ? value 
      : (value === "" ? defaultPlaceholder : "custom");

    return (
      <div className="space-y-1">
        <label className="block text-[10px] font-bold text-slate-400 font-mono">
          ทีมที่ {num} (Slot {num})
        </label>
        <select
          value={selectValue}
          onChange={(e) => {
            const selected = e.target.value;
            if (selected === "custom") {
              setPetanqueSlots(prev => ({ ...prev, [slotKey]: "" }));
            } else {
              setPetanqueSlots(prev => ({ ...prev, [slotKey]: selected }));
            }
          }}
          className="w-full p-1.5 bg-[#0A0F1D] text-white border border-slate-800 text-xs font-bold focus:outline-none focus:border-emerald-500 rounded-none cursor-pointer"
        >
          <option value={defaultPlaceholder}>{defaultPlaceholder} (ค่าเริ่มต้น)</option>
          {TEAM_NAMES.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
          <option value="custom">✍️ พิมพ์ชื่อทีมเอง...</option>
        </select>

        {(isCustom || value === "" || (!TEAM_NAMES.includes(value) && value !== defaultPlaceholder)) && (
          <input
            type="text"
            value={value}
            onChange={(e) => setPetanqueSlots(prev => ({ ...prev, [slotKey]: e.target.value }))}
            placeholder="พิมพ์ระบุชื่อทีม..."
            className="w-full p-1.5 bg-[#0D1527] text-white border border-slate-800 text-xs font-bold focus:outline-none focus:border-emerald-500 rounded-none mt-1 placeholder-slate-600 animate-fadeIn"
          />
        )}
      </div>
    );
  };

  const renderBracketMatch = (m: Match | undefined) => {
    if (!m) {
      return (
        <div className="border border-dashed border-slate-800 p-3 text-center text-xs text-slate-500 font-bold bg-[#111827]">
          รอยืนยันคู่แข่งขัน
        </div>
      );
    }

    const isLive = m.status === "live";
    const isCompleted = m.status === "completed";

    return (
      <button
        type="button"
        onClick={() => {
          const element = document.getElementById(`match-card-${m.id}`);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            element.classList.add("ring-2", "ring-[#00FF66]", "ring-offset-2", "ring-offset-slate-900");
            setTimeout(() => {
              element.classList.remove("ring-2", "ring-[#00FF66]", "ring-offset-2", "ring-offset-slate-900");
            }, 2500);
          }
          // Start editing directly when clicked from bracket
          if (isLoggedIn) {
            handleStartEdit(m);
          }
        }}
        className={`w-full text-left border p-2.5 transition-all rounded-none ${
          isLive 
            ? "bg-[#1E293B] border-[#00FF66] shadow-[0_0_8px_0_rgba(0,255,102,0.15)]" 
            : isCompleted 
              ? "bg-[#0F172A] border-slate-800" 
              : "bg-[#151F32] border-slate-800 hover:bg-[#1E293B]"
        }`}
      >
        <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 border-b border-slate-800/60 pb-1 mb-1.5">
          <span className="truncate max-w-[90px]">📍 {m.court}</span>
          <span>🕒 {m.time}</span>
        </div>

        <div className="space-y-1 text-xs">
          <div className="flex justify-between items-center gap-1">
            <span className={`font-bold truncate max-w-[130px] ${m.winner === m.teamA ? "text-[#00FF66] font-black underline decoration-wavy" : "text-white"}`}>
              {m.winner === m.teamA && "👑 "}{m.teamA || "TBD"}
            </span>
            <span className="font-mono font-black px-1.5 py-0.5 bg-slate-950 text-slate-200 text-[11px] border border-slate-800 min-w-[20px] text-center">
              {m.scoreA !== null ? m.scoreA : "-"}
            </span>
          </div>

          <div className="flex justify-between items-center gap-1">
            <span className={`font-bold truncate max-w-[130px] ${m.winner === m.teamB ? "text-[#00FF66] font-black underline decoration-wavy" : "text-white"}`}>
              {m.winner === m.teamB && "👑 "}{m.teamB || "TBD"}
            </span>
            <span className="font-mono font-black px-1.5 py-0.5 bg-slate-950 text-slate-200 text-[11px] border border-slate-800 min-w-[20px] text-center">
              {m.scoreB !== null ? m.scoreB : "-"}
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center mt-1.5 pt-1 border-t border-dashed border-slate-800">
          <span className="text-[10px] font-mono bg-amber-500/10 text-amber-400 px-2 py-0.5 border border-amber-500/30 font-black">
            คู่ที่ {getDisplayMatchNum(m.id, m.sport)}
          </span>
          {isLive && (
            <span className="text-[8px] text-[#00FF66] font-black animate-pulse font-mono">
              กำลังแข่ง 🔴
            </span>
          )}
          {isCompleted && (
            <span className="text-[8px] text-emerald-400 font-bold font-mono">
              เสร็จสิ้น ✓
            </span>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-8" id="sport-tab-section">
      {/* Visual PDF export response banner */}
      {isExporting && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] bg-[#1E293B] border-2 border-emerald-500 text-white px-6 py-4 shadow-2xl flex items-center gap-4 animate-bounce print:hidden max-w-md w-full mx-auto">
          <div className="shrink-0 w-6 h-6 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
          <div className="flex-grow space-y-0.5">
            <h4 className="text-sm font-black text-emerald-400 uppercase tracking-wide">📥 กำลังประมวลผลและดาวน์โหลด PDF</h4>
            <p className="text-[10px] text-slate-400 font-semibold leading-normal">ระบบกำลังดาวน์โหลดตารางการแข่งขันชนิดกีฬาเป็นไฟล์ PDF ลงในเครื่องของคุณ</p>
          </div>
        </div>
      )}

      <div className="space-y-8 print:hidden">
        {/* 1. Control Filters Card */}
        <div className="border border-slate-800 bg-[#111827] p-6 space-y-4 rounded-none text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-base font-black uppercase flex items-center gap-2 text-white">
              <Award size={20} className="text-[#FF5722]" />
              ตัวกรองโปรแกรมการแข่งขัน
            </h2>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold text-xs uppercase tracking-wider transition-all duration-150 cursor-pointer flex items-center gap-1.5 rounded-none"
              >
                <Printer size={14} className="text-[#FF5722]" />
                ส่งออก PDF / พิมพ์ตาราง
              </button>

              {sport === "petanque" && isLoggedIn && false && (
                <button
                  type="button"
                  onClick={() => {
                    setShowPetanqueDrawForm(!showPetanqueDrawForm);
                    setShowAddForm(false);
                  }}
                  className="py-2 px-4 bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-600 font-bold text-xs uppercase tracking-wider transition-all duration-150 cursor-pointer flex items-center gap-1.5 rounded-none"
                >
                  <Award size={14} />
                  {showPetanqueDrawForm ? "ปิดการจับฉลาก" : "🎯 จับฉลากแบ่งสาย"}
                </button>
              )}

              {isLoggedIn && sport !== "petanque" && sport !== "parade" && sport !== "cheerleader" && sport !== "fun_sport" && (
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(!showAddForm);
                    setShowPetanqueDrawForm(false);
                  }}
                  className="py-2 px-4 bg-[#FF5722] hover:bg-[#E04E1D] text-white font-bold text-xs uppercase tracking-wider transition-all duration-150 cursor-pointer flex items-center gap-1.5 rounded-none"
                >
                  <Plus size={14} />
                  {showAddForm ? "ปิดหน้าต่างเพิ่ม" : "เพิ่มแมตช์ใหม่ (+)"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sticky Controls Container (Category buttons, View Selector, and Group filter) */}
        <div className="sticky top-0 md:top-[var(--header-height,104px)] z-40 bg-[#111827] border border-slate-800 p-4 shadow-xl space-y-3 rounded-none text-white transition-all print:hidden">
          {/* Category segment buttons for quick access */}
          {categories.length >= 1 && (
            <div className="flex flex-wrap gap-2 pb-2 border-b border-slate-800/60">
              {categories.map((c) => {
                const isActive = selectedCategory === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedCategory(c)}
                    className={`px-3 py-2 text-xs font-bold uppercase border transition-all duration-150 cursor-pointer rounded-none ${
                      isActive
                        ? "bg-[#FF5722] text-white border-[#FF5722]"
                        : "bg-[#1E293B] text-slate-300 border-slate-700 hover:bg-[#2D3748]"
                    }`}
                  >
                    {c === "" ? (sport === "track" ? "✨ แสดงทั้งหมด" : "⚠️ กรุณาเลือกประเภท") : c}
                  </button>
                );
              })}
            </div>
          )}

          {/* 🛠️ Selectable View Options (ซ่อนสำหรับ track, petanque, parade, cheerleader, fun_sport) */}
          {sport !== "track" && sport !== "petanque" && sport !== "parade" && sport !== "cheerleader" && sport !== "fun_sport" && (
            <div className="pb-2 border-b border-slate-800/60">
              <span className="block text-[10px] font-bold uppercase text-slate-400 mb-2 flex items-center gap-1.5 font-mono">
                🖥️ เลือกมุมมองที่ต้องการแสดงผล (Select display section):
              </span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { id: "all", label: "✨ แสดงทั้งหมด", desc: "รวมทุกส่วน" },
                  { id: "standings", label: "📊 ตารางคะแนน", desc: "รอบแบ่งกลุ่ม" },
                  { id: "matches", label: "📋 รายการแข่งขัน", desc: "และผลลัพธ์" },
                  { id: "bracket", label: "🏆 ผังประกบคู่", desc: "รอบน็อคเอ้าท์" }
                ].map((tab) => {
                  const isActive = activeView === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveView(tab.id as any)}
                      className={`p-2 border transition-all duration-150 cursor-pointer flex flex-col items-center justify-center text-center leading-tight rounded-none ${
                        isActive
                          ? "bg-[#FF5722] border-[#FF5722] text-white font-black"
                          : "bg-[#151F32] border-slate-800 text-slate-300 hover:bg-[#1E293B]"
                      }`}
                    >
                      <span className="text-xs font-bold">{tab.label}</span>
                      <span className={`text-[9px] font-mono mt-0.5 ${isActive ? 'text-white/80' : 'text-slate-500 font-medium'}`}>{tab.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>

      {/* Petanque Schedule notice when draw has not been held yet (ซ่อน เนื่องจากแสดงเพียงวันแข่งขัน) */}

      {/* 3. Group Standings Section (ซ่อนสำหรับ track, petanque, parade, cheerleader, fun_sport) */}
      {sport !== "track" && sport !== "petanque" && sport !== "parade" && sport !== "cheerleader" && sport !== "fun_sport" && selectedCategory !== "" && (activeView === "all" || activeView === "standings") && (
        <div className="space-y-4">
          {(selectedCategory === "all" ? categories.filter(c => c !== "all") : [selectedCategory]).map((cat) => {
            const catMatches = sportMatches.filter(m => m.category === cat);
            const catGroups = Array.from(new Set(catMatches.filter(m => m.round === "รอบแรก" && m.group).map(m => m.group))).sort();
            
            // Check if there are any standings in this category
            const hasStandings = catGroups.some(grpName => calculateGroupStandings(matches, sport, grpName, cat, drawLots).length > 0);
            if (!hasStandings) return null;

            return (
              <div key={cat} className="border border-slate-800 bg-[#151F32] p-4 space-y-3 rounded-none">
                <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2">
                  <Table size={16} className="text-[#FF5722]" />
                  <h3 className="text-sm font-black uppercase text-white">
                    ตารางคะแนนรอบแบ่งกลุ่ม - <span className="text-[#00FF66]">{cat}</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {catGroups.map((grpName) => {
                    const standings = calculateGroupStandings(matches, sport, grpName, cat, drawLots);
                    if (standings.length === 0) return null;

                    return (
                      <div key={grpName} className="border border-slate-800/80 bg-[#111827] p-3 space-y-2 rounded-none">
                        <div className="bg-[#FF5722] text-white py-0.5 px-2 inline-block font-mono text-[9px] font-bold uppercase rounded-none">
                          {grpName}
                        </div>
                        <div className="overflow-x-auto border border-slate-800/60">
                          <table className="w-full text-left font-sans text-[11px]">
                            <thead>
                              <tr className="bg-slate-900 text-slate-300 border-b border-slate-800 font-mono">
                                <th className="py-1.5 px-2 font-bold">ทีม</th>
                                <th className="py-1.5 px-1 text-center font-mono">แข่ง</th>
                                <th className="py-1.5 px-1 text-center font-mono">ชนะ</th>
                                <th className="py-1.5 px-1 text-center font-mono">แพ้</th>
                                <th className="py-1.5 px-1 text-center font-mono">+/-</th>
                                <th className="py-1.5 px-2 text-center bg-[#FF5722]/10 text-[#FF5722] font-mono font-bold">คะแนน</th>
                              </tr>
                            </thead>
                            <tbody>
                              {standings.map((st, i) => {
                                const tiedTeams = standings.filter(item => item.points === st.points && item.won === st.won);
                                const isTied = (sport === "football" || sport === "volleyball") && tiedTeams.length > 1;

                                return (
                                  <tr key={st.team} className="border-b border-slate-800/60 font-semibold bg-transparent hover:bg-slate-800/20 text-slate-300">
                                    <td className="py-1.5 px-2 font-bold flex items-center justify-between gap-1 text-white min-h-[32px]">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-mono text-slate-500">{i + 1}.</span> {st.team}

                                      </div>
                                      {isTied && isLoggedIn && onUpdateDrawLots && (
                                        <div className="flex items-center gap-0.5 shrink-0 ml-2">
                                          <button
                                            type="button"
                                            onClick={() => handleSwapDrawLots(st.team, "up", standings, cat, grpName)}
                                            disabled={i === 0 || standings[i - 1].points !== st.points || standings[i - 1].won !== st.won}
                                            className="p-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 border border-slate-700 cursor-pointer rounded-none"
                                            title="สลับขึ้น (ชนะจับฉลาก)"
                                          >
                                            <ChevronUp size={10} />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleSwapDrawLots(st.team, "down", standings, cat, grpName)}
                                            disabled={i === standings.length - 1 || standings[i + 1].points !== st.points || standings[i + 1].won !== st.won}
                                            className="p-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 border border-slate-700 cursor-pointer rounded-none"
                                            title="สลับลง (แพ้จับฉลาก)"
                                          >
                                            <ChevronDown size={10} />
                                          </button>
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-1.5 px-1 text-center font-mono">{st.played}</td>
                                    <td className="py-1.5 px-1 text-center font-mono text-emerald-400">{st.won}</td>
                                    <td className="py-1.5 px-1 text-center font-mono text-red-400">{st.lost}</td>
                                    <td className={`py-1.5 px-1 text-center font-mono font-bold ${st.scoreDiff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                      {st.scoreDiff > 0 ? `+${st.scoreDiff}` : st.scoreDiff}
                                    </td>
                                    <td className="py-1.5 px-2 text-center bg-[#FF5722]/5 font-mono font-black text-[11px] border-l border-slate-800/60 text-[#FF5722]">
                                      {st.points}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 🏅 ผลการแข่งขัน 3 อันดับ (เฉพาะเปตอง) — มีผลต่อตารางสรุปเหรียญ */}
      {sport === "petanque" && selectedCategory !== "" && selectedCategory !== "all" && (() => {
        const resultKey = `petanque_result_${selectedCategory}`;
        const savedResult: string[] = drawLots?.[resultKey] || [];
        const rank1 = savedResult[0] || "";
        const rank2 = savedResult[1] || "";
        const rank3 = savedResult[2] || "";

        // ใช้ TEAM_NAMES ทั้ง 13 ทีมใน dropdown โดยตรง
        const catTeams = TEAM_NAMES;

        const handleSaveResult = async (r1: string, r2: string, r3: string) => {
          if (!onUpdateDrawLots) return;
          await onUpdateDrawLots(resultKey, [r1, r2, r3]);
        };

        const medals = [
          { rank: 1, label: "🥇 อันดับที่ 1 (ชนะเลิศ)", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/40", value: rank1, key: "r1" },
          { rank: 2, label: "🥈 อันดับที่ 2 (รองชนะเลิศ)", color: "text-slate-300", bg: "bg-slate-500/10 border-slate-500/40", value: rank2, key: "r2" },
          { rank: 3, label: "🥉 อันดับที่ 3 (รองชนะเลิศอันดับ 2)", color: "text-amber-600", bg: "bg-amber-700/10 border-amber-700/40", value: rank3, key: "r3" },
        ];

        return (
          <div className="border border-emerald-500/30 bg-[#111827] p-5 space-y-4 rounded-none shadow-lg">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Trophy size={18} className="text-yellow-400" />
              <h3 className="text-sm font-black uppercase text-white">
                ผลการแข่งขัน 3 อันดับ — <span className="text-emerald-400">{selectedCategory}</span>
              </h3>
            </div>

            {/* แสดงผล 3 อันดับแบบ read-only */}
            {(rank1 || rank2 || rank3) && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {medals.map((m) => (
                  <div key={m.key} className={`border ${m.bg} p-3 rounded-none flex flex-col items-center gap-1`}>
                    <span className="text-2xl">{m.rank === 1 ? "🥇" : m.rank === 2 ? "🥈" : "🥉"}</span>
                    <span className={`text-[10px] font-mono font-bold uppercase ${m.color}`}>
                      {m.rank === 1 ? "ชนะเลิศ" : m.rank === 2 ? "รองชนะเลิศ" : "รองชนะเลิศ อันดับ 2"}
                    </span>
                    <span className={`text-sm font-black text-center ${m.value ? "text-white" : "text-slate-600"}`}>
                      {m.value || "— ยังไม่ระบุ —"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* ฟอร์มให้ admin เลือก dropdown */}
            {isLoggedIn && onUpdateDrawLots && (
              <PetanqueResultForm
                medals={medals}
                catTeams={catTeams}
                onSave={handleSaveResult}
                currentR1={rank1}
                currentR2={rank2}
                currentR3={rank3}
              />
            )}
          </div>
        );
      })()}

      {/* 🎺 ผลการแข่งขัน (พาเหรด) — เหมือนเปตอง */}
      {sport === "parade" && (() => {
        const cat = selectedCategory && selectedCategory !== "all" ? selectedCategory : "พาเหรด";
        const resultKey = `parade_result_${cat}`;
        const savedResult: string[] = drawLots?.[resultKey] || [];
        const rank1 = savedResult[0] || "";
        const rank2 = savedResult[1] || "";
        const rank3 = savedResult[2] || "";
        const rank4 = savedResult[3] || "";

        const handleSaveResult = async (r1: string, r2: string, r3: string, r4?: string) => {
          if (!onUpdateDrawLots) return;
          await onUpdateDrawLots(resultKey, [r1, r2, r3, r4 || ""].filter((_, i) => i < 4));
        };

        const medals = [
          { rank: 1, label: "🥇 อันดับที่ 1 (ชนะเลิศ)", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/40", value: rank1, key: "r1" },
          { rank: 2, label: "🥈 อันดับที่ 2 (รองชนะเลิศ)", color: "text-slate-300", bg: "bg-slate-500/10 border-slate-500/40", value: rank2, key: "r2" },
          { rank: 3, label: "🥉 อันดับที่ 3 (รองชนะเลิศ อันดับ 2)", color: "text-amber-600", bg: "bg-amber-700/10 border-amber-700/40", value: rank3, key: "r3" },
          { rank: 4, label: "🏅 อันดับที่ 4 (รองชนะเลิศ อันดับ 3)", color: "text-amber-700", bg: "bg-amber-800/10 border-amber-800/40", value: rank4, key: "r4" },
        ];

        return (
          <div className="border border-emerald-500/30 bg-[#111827] p-5 space-y-4 rounded-none shadow-lg">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Trophy size={18} className="text-yellow-400" />
              <h3 className="text-sm font-black uppercase text-white">
                ผลการแข่งขัน 4 อันดับ — <span className="text-emerald-400">{cat}</span>
              </h3>
            </div>

            {(rank1 || rank2 || rank3 || rank4) && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {medals.map((m) => (
                  <div key={m.key} className={`border ${m.bg} p-3 rounded-none flex flex-col items-center gap-1`}>
                    <span className="text-2xl">{m.rank === 1 ? "🥇" : m.rank === 2 ? "🥈" : m.rank === 3 ? "🥉" : "🏅"}</span>
                    <span className={`text-[10px] font-mono font-bold uppercase ${m.color}`}>
                      {m.rank === 1 ? "ชนะเลิศ" : m.rank === 2 ? "รองชนะเลิศ" : m.rank === 3 ? "อันดับสาม" : "อันดับสี่"}
                    </span>
                    <span className={`text-sm font-black text-center ${m.value ? "text-white" : "text-slate-600"}`}>
                      {m.value || "— ยังไม่ระบุ —"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {isLoggedIn && onUpdateDrawLots && (
              <Parade4ResultForm
                catTeams={TEAM_NAMES}
                onSave={(r1, r2, r3, r4) => handleSaveResult(r1, r2, r3, r4)}
                currentR1={rank1}
                currentR2={rank2}
                currentR3={rank3}
                currentR4={rank4}
              />
            )}
          </div>
        );
      })()}

      {/* 📣 ผลการแข่งขัน (ประกวดกองเชียร์) — เหมือนเปตอง */}
      {sport === "cheerleader" && (() => {
        const cat = selectedCategory && selectedCategory !== "all" ? selectedCategory : "ประกวดกองเชียร์";
        const resultKey = `cheerleader_result_${cat}`;
        const savedResult: string[] = drawLots?.[resultKey] || [];
        const rank1 = savedResult[0] || "";
        const rank2 = savedResult[1] || "";
        const rank3 = savedResult[2] || "";
        const rank4 = savedResult[3] || "";

        const handleSaveResult = async (r1: string, r2: string, r3: string, r4?: string) => {
          if (!onUpdateDrawLots) return;
          await onUpdateDrawLots(resultKey, [r1, r2, r3, r4 || ""].filter((_, i) => i < 4));
        };

        const medals = [
          { rank: 1, label: "🥇 อันดับที่ 1 (ชนะเลิศ)", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/40", value: rank1, key: "r1" },
          { rank: 2, label: "🥈 อันดับที่ 2 (รองชนะเลิศ)", color: "text-slate-300", bg: "bg-slate-500/10 border-slate-500/40", value: rank2, key: "r2" },
          { rank: 3, label: "🥉 อันดับที่ 3 (รองชนะเลิศ อันดับ 2)", color: "text-amber-600", bg: "bg-amber-700/10 border-amber-700/40", value: rank3, key: "r3" },
          { rank: 4, label: "🏅 อันดับที่ 4 (รองชนะเลิศ อันดับ 3)", color: "text-amber-700", bg: "bg-amber-800/10 border-amber-800/40", value: rank4, key: "r4" },
        ];

        return (
          <div className="border border-emerald-500/30 bg-[#111827] p-5 space-y-4 rounded-none shadow-lg">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Trophy size={18} className="text-yellow-400" />
              <h3 className="text-sm font-black uppercase text-white">
                ผลการแข่งขัน 4 อันดับ — <span className="text-emerald-400">{cat}</span>
              </h3>
            </div>

            {(rank1 || rank2 || rank3 || rank4) && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {medals.map((m) => (
                  <div key={m.key} className={`border ${m.bg} p-3 rounded-none flex flex-col items-center gap-1`}>
                    <span className="text-2xl">{m.rank === 1 ? "🥇" : m.rank === 2 ? "🥈" : m.rank === 3 ? "🥉" : "🏅"}</span>
                    <span className={`text-[10px] font-mono font-bold uppercase ${m.color}`}>
                      {m.rank === 1 ? "ชนะเลิศ" : m.rank === 2 ? "รองชนะเลิศ" : m.rank === 3 ? "อันดับสาม" : "อันดับสี่"}
                    </span>
                    <span className={`text-sm font-black text-center ${m.value ? "text-white" : "text-slate-600"}`}>
                      {m.value || "— ยังไม่ระบุ —"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {isLoggedIn && onUpdateDrawLots && (
              <Parade4ResultForm
                catTeams={TEAM_NAMES}
                onSave={(r1, r2, r3, r4) => handleSaveResult(r1, r2, r3, r4)}
                currentR1={rank1}
                currentR2={rank2}
                currentR3={rank3}
                currentR4={rank4}
              />
            )}
          </div>
        );
      })()}

      {/* 🎉 ผลการแข่งขัน (กีฬามหาสนุก) — เหมือนเปตอง */}
      {sport === "fun_sport" && (() => {
        const cat = selectedCategory && selectedCategory !== "all" ? selectedCategory : "กีฬามหาสนุก";
        const resultKey = `fun_sport_result_${cat}`;
        const savedResult: string[] = drawLots?.[resultKey] || [];
        const rank1 = savedResult[0] || "";
        const rank2 = savedResult[1] || "";
        const rank3 = savedResult[2] || "";

        const catTeams = TEAM_NAMES;

        const handleSaveResult = async (r1: string, r2: string, r3: string) => {
          if (!onUpdateDrawLots) return;
          await onUpdateDrawLots(resultKey, [r1, r2, r3]);
        };

        const medals = [
          { rank: 1, label: "🥇 อันดับที่ 1 (ชนะเลิศ)", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/40", value: rank1, key: "r1" },
          { rank: 2, label: "🥈 อันดับที่ 2 (รองชนะเลิศ)", color: "text-slate-300", bg: "bg-slate-500/10 border-slate-500/40", value: rank2, key: "r2" },
          { rank: 3, label: "🥉 อันดับที่ 3 (รองชนะเลิศอันดับ 2)", color: "text-amber-600", bg: "bg-amber-700/10 border-amber-700/40", value: rank3, key: "r3" },
        ];

        return (
          <div className="border border-emerald-500/30 bg-[#111827] p-5 space-y-4 rounded-none shadow-lg">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Trophy size={18} className="text-yellow-400" />
              <h3 className="text-sm font-black uppercase text-white">
                ผลการแข่งขัน 3 อันดับ — <span className="text-emerald-400">{cat}</span>
              </h3>
            </div>

            {(rank1 || rank2 || rank3) && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {medals.map((m) => (
                  <div key={m.key} className={`border ${m.bg} p-3 rounded-none flex flex-col items-center gap-1`}>
                    <span className="text-2xl">{m.rank === 1 ? "🥇" : m.rank === 2 ? "🥈" : "🥉"}</span>
                    <span className={`text-[10px] font-mono font-bold uppercase ${m.color}`}>
                      {m.rank === 1 ? "ชนะเลิศ" : m.rank === 2 ? "รองชนะเลิศ" : "รองชนะเลิศ อันดับ 2"}
                    </span>
                    <span className={`text-sm font-black text-center ${m.value ? "text-white" : "text-slate-600"}`}>
                      {m.value || "— ยังไม่ระบุ —"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {isLoggedIn && onUpdateDrawLots && (
              <PetanqueResultForm
                medals={medals}
                catTeams={catTeams}
                onSave={handleSaveResult}
                currentR1={rank1}
                currentR2={rank2}
                currentR3={rank3}
              />
            )}
          </div>
        );
      })()}

      {/* ⚽/🏐 ผลการแข่งขัน 3 อันดับ (ฟุตบอล / วอลเลย์บอล) — คำนวณอัตโนมัติจากแมตช์ชิงชนะเลิศและชิงที่ 3 */}
      {(sport === "volleyball" || sport === "football") && selectedCategory !== "" && selectedCategory !== "all" && (() => {
        const finalMatch = matches.find(
          (m) => m.sport === sport && m.category === selectedCategory && m.round === "รอบชิงชนะเลิศ"
        );
        const thirdPlaceMatch = matches.find(
          (m) => m.sport === sport && m.category === selectedCategory && m.round === "ชิงที่ 3"
        );

        let rank1 = "";
        let rank2 = "";
        let rank3 = "";

        if (finalMatch && finalMatch.status === "completed") {
          if (finalMatch.scoreA !== null && finalMatch.scoreB !== null) {
            rank1 = finalMatch.scoreA > finalMatch.scoreB ? finalMatch.teamA : finalMatch.teamB;
            rank2 = finalMatch.scoreA > finalMatch.scoreB ? finalMatch.teamB : finalMatch.teamA;
          } else if (finalMatch.winner) {
            rank1 = finalMatch.winner;
            rank2 = finalMatch.winner === finalMatch.teamA ? finalMatch.teamB : finalMatch.teamA;
          }
        }

        if (thirdPlaceMatch && thirdPlaceMatch.status === "completed") {
          if (thirdPlaceMatch.scoreA !== null && thirdPlaceMatch.scoreB !== null) {
            rank3 = thirdPlaceMatch.scoreA > thirdPlaceMatch.scoreB ? thirdPlaceMatch.teamA : thirdPlaceMatch.teamB;
          } else if (thirdPlaceMatch.winner) {
            rank3 = thirdPlaceMatch.winner;
          }
        }

        const medals = [
          { rank: 1, label: "🥇 อันดับที่ 1 (ชนะเลิศ)", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/40", value: rank1, key: "r1" },
          { rank: 2, label: "🥈 อันดับที่ 2 (รองชนะเลิศ)", color: "text-slate-300", bg: "bg-slate-500/10 border-slate-500/40", value: rank2, key: "r2" },
          { rank: 3, label: "🥉 อันดับที่ 3 (รองชนะเลิศอันดับ 2)", color: "text-amber-600", bg: "bg-amber-700/10 border-amber-700/40", value: rank3, key: "r3" },
        ];

        return (
          <div className="border border-[#FF5722]/30 bg-[#111827] p-5 space-y-4 rounded-none shadow-lg">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Trophy size={18} className="text-yellow-400" />
              <h3 className="text-sm font-black uppercase text-white">
                สรุปผลการแข่งขัน 3 อันดับแรก — <span className="text-emerald-400">{selectedCategory}</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {medals.map((m) => (
                <div key={m.key} className={`border ${m.bg} p-3 rounded-none flex flex-col items-center gap-1`}>
                  <span className="text-2xl">{m.rank === 1 ? "🥇" : m.rank === 2 ? "🥈" : "🥉"}</span>
                  <span className={`text-[10px] font-mono font-bold uppercase ${m.color}`}>
                    {m.rank === 1 ? "ชนะเลิศ" : m.rank === 2 ? "รองชนะเลิศ" : "รองชนะเลิศ อันดับ 2"}
                  </span>
                  <span className={`text-sm font-black text-center ${m.value ? "text-white" : "text-slate-500 italic"}`}>
                    {m.value || "— ยังไม่มีผลสรุป —"}
                  </span>
                </div>
              ))}
            </div>
            {!rank1 && !rank2 && !rank3 && (
              <p className="text-[10.5px] font-semibold text-slate-400 text-center font-mono leading-relaxed mt-2 bg-slate-900/40 p-2.5 border border-slate-800/60">
                💡 หมายเหตุ: ผลการจัดอันดับ 3 อันดับแรกจะสรุปให้โดยอัตโนมัติเมื่อแมตช์ "รอบชิงชนะเลิศ" และ "ชิงที่ 3" แข่งขันเสร็จสิ้นและบันทึกคะแนนเรียบร้อยแล้ว
              </p>
            )}
          </div>
        );
      })()}

      {/* 🏃 ผลการแข่งขัน (กรีฑา/วิ่ง) */}
      {sport === "track" && (() => {
        const isShowAll = !selectedCategory || selectedCategory === "" || selectedCategory === "all";

        if (isShowAll) {
          // ── โหมด "แสดงทั้งหมด": รวมเหรียญวิ่งทุกประเภทจาก drawLots ──
          const medalScore: Record<string, { gold: number; silver: number; bronze: number }> = {};
          const trackKeys = Object.keys(drawLots || {}).filter(k => k.startsWith("track_direct_result_"));
          const categoriesWithResult: { cat: string; r1: string; r2: string; r3: string }[] = [];

          trackKeys.forEach(key => {
            const catName = key.replace("track_direct_result_", "");
            const res: string[] = (drawLots as any)[key] || [];
            const r1 = res[0] || "";
            const r2 = res[1] || "";
            const r3 = res[2] || "";
            if (!r1 && !r2 && !r3) return;
            categoriesWithResult.push({ cat: catName, r1, r2, r3 });
            [r1, r2, r3].forEach((team, idx) => {
              if (!team) return;
              if (!medalScore[team]) medalScore[team] = { gold: 0, silver: 0, bronze: 0 };
              if (idx === 0) medalScore[team].gold++;
              else if (idx === 1) medalScore[team].silver++;
              else medalScore[team].bronze++;
            });
          });

          const ranked = Object.entries(medalScore)
            .sort(([, a], [, b]) => {
              if (b.gold !== a.gold) return b.gold - a.gold;
              if (b.silver !== a.silver) return b.silver - a.silver;
              return b.bronze - a.bronze;
            })
            .slice(0, 3);

          const medalBgs = [
            "bg-yellow-500/10 border-yellow-500/40",
            "bg-slate-300/10 border-slate-400/40",
            "bg-amber-700/10 border-amber-700/40",
          ];
          const medalIcons = ["🥇", "🥈", "🥉"];
          const medalLabels = ["ชนะเลิศรวมสูงสุด", "รองชนะเลิศรวม", "อันดับสามรวม"];
          const medalColors = ["text-yellow-400", "text-slate-300", "text-amber-600"];

          return (
            <div className="border border-emerald-500/30 bg-[#111827] p-5 space-y-4 rounded-none shadow-lg">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Trophy size={18} className="text-yellow-400" />
                <h3 className="text-sm font-black uppercase text-white">
                  🏆 สรุปผลการแข่งขันวิ่ง <span className="text-emerald-400">รวมทุกประเภท</span>
                  <span className="ml-2 text-[10px] font-mono font-bold text-slate-400 normal-case">({categoriesWithResult.length} ประเภทที่มีผล)</span>
                </h3>
              </div>

              {ranked.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {ranked.map(([team, score], idx) => (
                    <div key={team} className={`border ${medalBgs[idx]} p-4 rounded-none flex flex-col items-center gap-1.5`}>
                      <span className="text-3xl">{medalIcons[idx]}</span>
                      <span className={`text-[10px] font-mono font-bold uppercase ${medalColors[idx]}`}>
                        {medalLabels[idx]}
                      </span>
                      <span className="text-base font-black text-center text-white mt-1">{team}</span>
                      <div className="flex gap-2 mt-1 text-[10px] font-mono font-bold">
                        {score.gold > 0 && <span className="text-yellow-400">🥇×{score.gold}</span>}
                        {score.silver > 0 && <span className="text-slate-300">🥈×{score.silver}</span>}
                        {score.bronze > 0 && <span className="text-amber-600">🥉×{score.bronze}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-slate-500 py-8 text-xs font-mono italic">
                  ⏳ ยังไม่มีผลการแข่งขันวิ่งประเภทใดเลย
                </div>
              )}

              {/* รายละเอียดแยกตามประเภท */}
              {categoriesWithResult.length > 0 && (
                <div className="border-t border-slate-800 pt-3 space-y-2">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">📋 ผลแยกตามประเภท:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {categoriesWithResult.map(({ cat, r1, r2, r3 }) => (
                      <div key={cat} className="bg-slate-900/60 border border-slate-800 p-2.5 space-y-1">
                        <span className="text-[10px] font-black text-[#00FF66] font-mono block truncate">🏃 {cat}</span>
                        <div className="space-y-0.5">
                          {r1 && <div className="text-[10px] font-mono text-slate-300"><span className="text-yellow-400">🥇</span> {r1}</div>}
                          {r2 && <div className="text-[10px] font-mono text-slate-300"><span className="text-slate-400">🥈</span> {r2}</div>}
                          {r3 && <div className="text-[10px] font-mono text-slate-300"><span className="text-amber-600">🥉</span> {r3}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        }

        // ── โหมดเลือกประเภทเฉพาะ ──
        const cat = selectedCategory;
        const resultKey = `track_direct_result_${cat}`;
        const savedResult: string[] = (drawLots as any)?.[resultKey] || [];
        const rank1 = savedResult[0] || "";
        const rank2 = savedResult[1] || "";
        const rank3 = savedResult[2] || "";

        const catTeams = TEAM_NAMES;

        const handleSaveResult = async (r1: string, r2: string, r3: string) => {
          if (!onUpdateDrawLots) return;
          await onUpdateDrawLots(resultKey, [r1, r2, r3]);
        };

        const medals = [
          { rank: 1, label: "🥇 อันดับที่ 1 (ชนะเลิศ)", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/40", value: rank1, key: "r1" },
          { rank: 2, label: "🥈 อันดับที่ 2 (รองชนะเลิศ)", color: "text-slate-300", bg: "bg-slate-500/10 border-slate-500/40", value: rank2, key: "r2" },
          { rank: 3, label: "🥉 อันดับที่ 3 (รองชนะเลิศอันดับ 2)", color: "text-amber-600", bg: "bg-amber-700/10 border-amber-700/40", value: rank3, key: "r3" },
        ];

        return (
          <div className="border border-emerald-500/30 bg-[#111827] p-5 space-y-4 rounded-none shadow-lg">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Trophy size={18} className="text-yellow-400" />
              <h3 className="text-sm font-black uppercase text-white">
                ผลการแข่งขัน 3 อันดับ — <span className="text-emerald-400">{cat}</span>
              </h3>
            </div>

            {(rank1 || rank2 || rank3) && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {medals.map((m) => (
                  <div key={m.key} className={`border ${m.bg} p-3 rounded-none flex flex-col items-center gap-1`}>
                    <span className="text-2xl">{m.rank === 1 ? "🥇" : m.rank === 2 ? "🥈" : "🥉"}</span>
                    <span className={`text-[10px] font-mono font-bold uppercase ${m.color}`}>
                      {m.rank === 1 ? "ชนะเลิศ" : m.rank === 2 ? "รองชนะเลิศ" : "รองชนะเลิศ อันดับ 2"}
                    </span>
                    <span className={`text-sm font-black text-center ${m.value ? "text-white" : "text-slate-600"}`}>
                      {m.value || "— ยังไม่ระบุ —"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {isLoggedIn && onUpdateDrawLots && (
              <PetanqueResultForm
                medals={medals}
                catTeams={catTeams}
                onSave={handleSaveResult}
                currentR1={rank1}
                currentR2={rank2}
                currentR3={rank3}
              />
            )}
          </div>
        );
      })()}

      {/* 1.5 Petanque Seeding & Draw Form */}
      {sport === "petanque" && showPetanqueDrawForm && (
        <div className="border border-emerald-500/60 bg-[#1E293B] p-6 space-y-4 rounded-none text-white shadow-2xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-700/60 pb-3">
            <div>
              <h3 className="text-base font-black uppercase tracking-wide text-emerald-400 flex items-center gap-2">
                <Award size={18} className="text-emerald-400" />
                แผงบันทึกผลการจับฉลากแบ่งสายเปตอง
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                ประเภท: <span className="text-white font-bold">{selectedCategory || "ไม่ได้เลือก"}</span> (ตารางแข่งขัน 24 แมตช์จะปรับเปลี่ยนชื่อทีมคู่แข่งตามข้อมูลที่กรอกที่นี่โดยอัตโนมัติ)
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("คุณแน่ใจหรือไม่ว่าต้องการคืนค่ารายชื่อทีมเป็นค่าเริ่มต้น (เช่น 1 สาย A, 2 สาย A, ...)?")) {
                    setPetanqueSlots({
                      A1: "1 สาย A", A2: "2 สาย A", A3: "3 สาย A", A4: "4 สาย A",
                      B1: "1 สาย B", B2: "2 สาย B", B3: "3 สาย B", B4: "4 สาย B",
                      C1: "1 สาย C", C2: "2 สาย C", C3: "3 สาย C", C4: "4 สาย C",
                      D1: "1 สาย D", D2: "2 สาย D", D3: "3 สาย D", D4: "4 สาย D",
                    });
                  }
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold border border-slate-700 rounded-none cursor-pointer"
              >
                🔄 คืนค่าตัวเลือกเริ่มต้น
              </button>
            </div>
          </div>

          {!selectedCategory || selectedCategory === "all" ? (
            <div className="p-4 bg-[#0A0F1D] text-slate-400 text-xs border border-yellow-800/50 text-center font-bold">
              ⚠️ กรุณาเลือกประเภทการแข่งขัน (เช่น ทั่วไป ชายคู่, ทั่วไป หญิงคู่, ทีมผสม) จากตัวกรองด้านบนก่อนทำการจัดการจัดสาย
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Group A */}
                <div className="border border-slate-800 bg-[#0F172A] p-4 space-y-3">
                  <div className="bg-[#FF5722] text-white py-0.5 px-2 inline-block font-mono text-[9px] font-bold uppercase rounded-none">
                    สาย A (Group A)
                  </div>
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((num) => (
                      <React.Fragment key={num}>
                        {renderPetanqueSlotSelector("A", num)}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Group B */}
                <div className="border border-slate-800 bg-[#0F172A] p-4 space-y-3">
                  <div className="bg-emerald-600 text-white py-0.5 px-2 inline-block font-mono text-[9px] font-bold uppercase rounded-none">
                    สาย B (Group B)
                  </div>
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((num) => (
                      <React.Fragment key={num}>
                        {renderPetanqueSlotSelector("B", num)}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Group C */}
                <div className="border border-slate-800 bg-[#0F172A] p-4 space-y-3">
                  <div className="bg-indigo-600 text-white py-0.5 px-2 inline-block font-mono text-[9px] font-bold uppercase rounded-none">
                    สาย C (Group C)
                  </div>
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((num) => (
                      <React.Fragment key={num}>
                        {renderPetanqueSlotSelector("C", num)}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Group D */}
                <div className="border border-slate-800 bg-[#0F172A] p-4 space-y-3">
                  <div className="bg-purple-600 text-white py-0.5 px-2 inline-block font-mono text-[9px] font-bold uppercase rounded-none">
                    สาย D (Group D)
                  </div>
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((num) => (
                      <React.Fragment key={num}>
                        {renderPetanqueSlotSelector("D", num)}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSavePetanqueDraw}
                  disabled={isSavingDraw}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wide border border-emerald-500 transition-all cursor-pointer rounded-none disabled:opacity-50"
                >
                  {isSavingDraw ? "⏳ กำลังบันทึกข้อมูลและปรับปรุงตารางแข่ง..." : "💾 บันทึกรายชื่อทีมแบ่งสายลงตารางแข่งขัน"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Add Custom Match Form (Collapsible) */}
      {showAddForm && (
        <form onSubmit={handleCreateMatch} className="border border-[#FF5722]/60 bg-[#1E293B] p-6 space-y-4 rounded-none text-white">
          <h3 className="text-base font-black uppercase tracking-wide text-white flex items-center gap-2">
            <Plus size={18} className="text-[#FF5722]" /> สร้างรอบการแข่ง/แมตช์แข่งขันใหม่
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">ประเภทกีฬา/การแข่ง</label>
              <input
                type="text"
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                placeholder="เช่น วิ่ง 100 เมตร หญิง, ทั่วไป ชายคู่"
                className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none placeholder-slate-500"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">กลุ่ม/สาย (ระบุถ้ามี)</label>
              <input
                type="text"
                value={newGroup}
                onChange={(e) => setNewGroup(e.target.value)}
                placeholder="เช่น สาย A, กลุ่ม 1"
                className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">รอบการแข่งขัน</label>
              <select
                value={newRound}
                onChange={(e) => setNewRound(e.target.value)}
                className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none"
              >
                <option value="รอบแรก">รอบแรก</option>
                <option value="รอบคัดเลือก">รอบคัดเลือก</option>
                <option value="รอบ 8 ทีม">รอบ 8 ทีม</option>
                <option value="รอบรองชนะเลิศ">รอบรองชนะเลิศ</option>
                <option value="ชิงที่ 3">ชิงที่ 3</option>
                <option value="รอบชิงชนะเลิศ">รอบชิงชนะเลิศ</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">สถานที่ / สนาม</label>
              <input
                type="text"
                value={newCourt}
                onChange={(e) => setNewCourt(e.target.value)}
                className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">เวลาแข่งขัน</label>
              <input
                type="text"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">วันที่แข่งขัน</label>
              <input
                type="text"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">ทีม A / สังกัด A</label>
              <input
                type="text"
                value={newTeamA}
                onChange={(e) => setNewTeamA(e.target.value)}
                className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none"
                required={sport !== "track"}
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">ทีม B / สังกัด B</label>
              <input
                type="text"
                value={newTeamB}
                onChange={(e) => setNewTeamB(e.target.value)}
                className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none"
                required={sport !== "track"}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-[#FF5722] hover:bg-[#E04E1D] text-white font-bold text-xs uppercase tracking-wider transition-all duration-150 cursor-pointer rounded-none border-0"
          >
            สร้างโปรแกรมการแข่งแข่งขันใหม่ (+)
          </button>
        </form>
      )}

      {/* 3. Add Custom Match Form (Collapsible) placeholder to keep order clear */}

      {/* 4. Match List Grid (ซ่อนสำหรับ petanque, parade, cheerleader, fun_sport, track) */}
      {sport !== "petanque" && sport !== "parade" && sport !== "cheerleader" && sport !== "fun_sport" && sport !== "track" && activeView !== "bracket" && (activeView === "all" || activeView === "matches" || selectedCategory === "") && (
        <div className="space-y-4">
          <h3 className="text-base font-black uppercase text-white tracking-wide">
            📅 รายการแข่งขันและผลลัพธ์ {selectedCategory !== "" ? `(${filteredMatches.length})` : filteredMatches.length > 0 ? `(แสดงเฉพาะ คป.สอ. ${selectedDistrict || teamSearch}) (${filteredMatches.length})` : ""}
          </h3>

          {selectedCategory === "" && filteredMatches.length === 0 ? (
            <div className="border border-dashed border-slate-800 bg-[#111827] p-8 text-center rounded-none text-white">
              <AlertCircle className="mx-auto text-[#FF5722] mb-3" size={32} />
              <h4 className="text-base font-black uppercase tracking-wide">
                {(sport as string) === "track" ? "ไม่พบรายการแข่งขัน" : "กรุณาเลือกประเภทการแข่งขัน"}
              </h4>
              <p className="text-xs text-slate-400 mt-2 font-semibold font-mono max-w-xl mx-auto leading-relaxed">
                {(sport as string) === "track"
                  ? "ไม่พบบันทึกการแข่งขันกรีฑาในประเภทที่เลือก หรือรายการนี้ยังไม่มีการจัดแข่งในตาราง"
                  : selectedDistrict 
                    ? `ไม่พบรายการแข่งขันของ คป.สอ. ${selectedDistrict} ในกีฬานี้ หรือกรุณาเลือกประเภทการแข่งขันด้านบน` 
                    : "กรุณาคลิกเลือกประเภทการแข่งขันด้านบน เพื่อแสดงตารางคะแนน, ผังประกบคู่ และโปรแกรมการแข่งขันทั้งหมด"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredMatches.map((m) => {
                const isEditing = editingMatchId === m.id;
                const isLive = m.status === "live";
                const isCompleted = m.status === "completed";
                const isTrack = m.sport === "track";

                return (
                  <div
                    key={m.id}
                    id={`match-card-${m.id}`}
                    className={`border p-5 flex flex-col justify-between transition-all rounded-none ${
                      isLive 
                        ? "bg-[#1E293B] border-[#00FF66] shadow-[0_0_12px_rgba(0,255,102,0.12)] text-white" 
                        : isCompleted 
                          ? "bg-[#0F172A] border-slate-800 text-slate-300" 
                          : "bg-[#111827] border-slate-800 text-slate-300"
                    }`}
                  >
                    <div>
                      {/* Top bar info */}
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <div className="space-y-1.5">
                          {/* Prominent Date/Time indicator */}
                          <div className="flex items-center gap-1.5 text-amber-400 bg-slate-950 px-2.5 py-1 border border-slate-800 rounded-none w-fit text-[10px] font-mono font-black uppercase tracking-wider">
                            <Clock size={11} className="text-[#FF5722]" />
                            <span>{m.date} • {m.time}</span>
                          </div>

                          {/* Prominent Court Location indicator */}
                          <div className="flex items-center gap-1.5 text-[#00FF66] bg-slate-950 px-2.5 py-1 border border-slate-800 rounded-none w-fit text-[10.5px] font-mono font-black uppercase tracking-wider mt-1">
                            <MapPin size={11} className="text-[#00FF66]" />
                            <span>{m.court}</span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            {(() => {
                              const displayNum = getDisplayMatchNum(m.id, m.sport);
                              return displayNum ? (
                                <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs md:text-sm font-mono px-2.5 py-1 font-black uppercase block w-fit rounded-none">
                                  คู่ที่ {displayNum}
                                </span>
                              ) : null;
                            })()}
                            <span className="bg-[#FF5722] text-white text-[9px] font-mono px-2 py-0.5 font-bold uppercase block w-fit rounded-none">
                              {m.category}
                            </span>
                            <span className="text-[11px] font-mono font-bold text-slate-400 block">
                              รอบ: {m.round} {m.group ? `(${m.group})` : ""}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[9px] font-mono font-black px-2 py-0.5 border uppercase rounded-none whitespace-nowrap ${
                            isLive
                              ? "border-[#00FF66] bg-[#00FF66]/10 text-[#00FF66] animate-pulse"
                              : isCompleted
                              ? "border-slate-700 bg-slate-800 text-slate-300"
                              : "border-slate-700 bg-slate-900 text-slate-400"
                          }`}
                        >
                          {isLive ? "กำลังแข่ง 🔴" : isCompleted ? "เสร็จสิ้น" : "ยังไม่แข่ง"}
                        </span>
                      </div>

                  {/* Match Body content */}
                  {!isEditing ? (
                    <div className="py-4 space-y-3">
                      {isTrack ? (
                        // Improved Track race display
                        <div className="space-y-3">
                          {m.round === "รอบคัดเลือก" && (
                            <div className="text-[10px] bg-sky-950/40 border border-sky-800/60 text-sky-400 px-2.5 py-1.5 font-bold rounded-none flex items-center gap-1.5 font-sans">
                              <span>📢 หมายเหตุ: คัดเลือกอันดับที่ 1-4 เพื่อเข้าสู่รอบชิงชนะเลิศ</span>
                            </div>
                          )}
                          
                          {isCompleted && m.ranks && m.ranks.some(r => r.rank !== undefined) ? (
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-bold text-[#FF5722] font-mono block uppercase tracking-wider">🏆 ผลการแข่งขันอย่างเป็นทางการ:</span>
                              <div className="border border-slate-800/80 divide-y divide-slate-800/60 bg-slate-950">
                                {m.ranks
                                  .filter(r => r.rank !== undefined)
                                  .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
                                  .map((r) => {
                                    const medal = r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : `${r.rank}`;
                                    const isQualified = m.round === "รอบคัดเลือก" && r.rank! <= 4;
                                    return (
                                      <div key={r.name} className="flex justify-between items-center p-2 text-xs font-mono font-semibold">
                                        <div className="flex items-center gap-2">
                                          <span className="w-5 text-center font-bold">{medal}</span>
                                          <span className="text-white font-bold">{r.name}</span>
                                          {isQualified && (
                                            <span className="text-[9px] bg-green-950 text-green-400 border border-green-800/40 px-1 py-0.2 rounded-none font-sans font-bold">
                                              เข้ารอบชิง 🎉
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-slate-400 font-bold">{r.time || "-"}</span>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          ) : (
                            // แสดงผล 3 อันดับอัตโนมัติ (ถ้ายังไม่มีผลให้แสดงข้อความรอ)
                            <div className="space-y-1.5">
                              {m.ranks && m.ranks.some(r => r.rank !== undefined) ? (
                                <>
                                  <span className="text-[10px] font-bold text-[#FF5722] font-mono block uppercase tracking-wider">🏆 ผลการแข่งขัน 3 อันดับแรก:</span>
                                  <div className="border border-slate-800/80 divide-y divide-slate-800/60 bg-slate-950">
                                    {m.ranks
                                      .filter(r => r.rank !== undefined)
                                      .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
                                      .slice(0, 3)
                                      .map((r) => {
                                        const medal = r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : `${r.rank}`;
                                        return (
                                          <div key={r.name} className="flex justify-between items-center p-2 text-xs font-mono font-semibold">
                                            <div className="flex items-center gap-2">
                                              <span className="w-5 text-center font-bold">{medal}</span>
                                              <span className="text-white font-bold">{r.name}</span>
                                            </div>
                                            <span className="text-slate-400 font-bold">{r.time || "-"}</span>
                                          </div>
                                        );
                                      })}
                                  </div>
                                </>
                              ) : (
                                <div className="text-xs italic text-slate-500 font-bold font-mono bg-slate-950/40 p-2.5 border border-slate-800/60">
                                  ⏳ รอผลการแข่งขัน
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        // Dual Sports (Petanque, Volleyball, Football)
                        <div className="flex flex-col space-y-2">
                          <div className="flex justify-between items-center bg-[#151F32] p-2.5 border border-slate-800/80 rounded-none">
                            <span className={`font-bold text-sm ${m.winner === m.teamA ? "text-[#00FF66] underline decoration-wavy underline-offset-4 font-black" : "text-white"}`}>
                              {m.teamA}
                            </span>
                            <span className="font-mono font-black text-lg bg-slate-950 text-white px-3 py-0.5 border border-slate-800 rounded-none">
                              {m.scoreA !== null ? m.scoreA : "-"}
                            </span>
                          </div>

                          <div className="flex justify-between items-center bg-[#151F32] p-2.5 border border-slate-800/80 rounded-none">
                            <span className={`font-bold text-sm ${m.winner === m.teamB ? "text-[#00FF66] underline decoration-wavy underline-offset-4 font-black" : "text-white"}`}>
                              {m.teamB}
                            </span>
                            <span className="font-mono font-black text-lg bg-slate-950 text-white px-3 py-0.5 border border-slate-800 rounded-none">
                              {m.scoreB !== null ? m.scoreB : "-"}
                            </span>
                          </div>

                          {/* Show sets for Volleyball */}
                          {m.sport === "volleyball" && m.sets && m.sets.some(s => s.scoreA > 0 || s.scoreB > 0) && (
                            <div className="bg-slate-950 p-2 border border-slate-800 flex justify-around items-center font-mono text-[10px] font-black text-slate-400 rounded-none">
                              <span>Set 1: {m.sets[0]?.scoreA} - {m.sets[0]?.scoreB}</span>
                              <span>Set 2: {m.sets[1]?.scoreA} - {m.sets[1]?.scoreB}</span>
                              <span>Set 3: {m.sets[2]?.scoreA} - {m.sets[2]?.scoreB}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    // EDITING STATE MODAL INLINE
                    <div className="py-4 space-y-4 bg-[#1E293B] p-4 border border-slate-700 my-2 text-white rounded-none">
                      <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                        <span className="font-mono text-xs font-bold text-[#FF5722]">
                          ✍️ บันทึกคะแนนและสถานะ {(() => {
                            const matchNum = m.id.split("_").pop();
                            return matchNum && !isNaN(Number(matchNum)) ? `(คู่ที่ ${matchNum})` : "";
                          })()}
                        </span>
                        <span className="font-mono text-[9px] bg-slate-950 text-slate-400 px-1.5 py-0.5 border border-slate-800">ID: {m.id}</span>
                      </div>

                      {/* Status select */}
                      <div>
                        <label className="block text-[10px] font-mono font-bold uppercase mb-1 text-slate-400">สถานะแข่ง</label>
                        <select
                          value={matchStatus}
                          onChange={(e) => setMatchStatus(e.target.value as any)}
                          className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none"
                        >
                          <option value="pending">ยังไม่แข่ง (Pending)</option>
                          <option value="live">กำลังแข่ง (Live)</option>
                          <option value="completed">เสร็จสิ้นการแข่ง (Completed)</option>
                        </select>
                      </div>

                      {/* Program details edit */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">วันที่</label>
                          <input
                            type="text"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            placeholder="เช่น 6 ก.ค. 69"
                            className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">เวลา</label>
                          <input
                            type="text"
                            value={editTime}
                            onChange={(e) => setEditTime(e.target.value)}
                            placeholder="เช่น 09.00 น."
                            className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">สนาม</label>
                          <input
                            type="text"
                            value={editCourt}
                            onChange={(e) => setEditCourt(e.target.value)}
                            placeholder="เช่น สนามที่ 1"
                            className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">รอบการแข่งขัน</label>
                          <input
                            type="text"
                            value={editRound}
                            onChange={(e) => setEditRound(e.target.value)}
                            placeholder="เช่น รอบแรก"
                            className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">กลุ่ม/สาย</label>
                          <input
                            type="text"
                            value={editGroup}
                            onChange={(e) => setEditGroup(e.target.value)}
                            placeholder="เช่น สาย A (เว้นว่างไว้ถ้าไม่มี)"
                            className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none"
                          />
                        </div>
                      </div>

                      {isTrack ? (
                        // Edit track ranks
                        <div className="space-y-2">
                          <label className="block text-[10px] font-mono font-bold uppercase text-slate-400">
                            {m.round === "รอบชิงชนะเลิศ" ? "จัดอันดับและสถิติเวลา (รอบชิงชนะเลิศ):" : "จัดอันดับและสถิติเวลา (1-4 ผ่านเข้ารอบชิง):"}
                          </label>
                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {m.participants?.map((team) => (
                              <div key={team} className="flex items-center justify-between gap-2 bg-[#151F32] p-1.5 border border-slate-800 rounded-none">
                                <span className="font-bold text-xs text-white">{team}</span>
                                <div className="flex gap-1.5">
                                  <input
                                    type="number"
                                    min="0"
                                    max="14"
                                    placeholder="อันดับ"
                                    value={trackRanks[team]?.rank || ""}
                                    onChange={(e) => {
                                      const rank = parseInt(e.target.value) || 0;
                                      setTrackRanks({
                                        ...trackRanks,
                                        [team]: { ...trackRanks[team], rank }
                                      });
                                    }}
                                    className="w-14 p-1 text-center bg-[#0A0F1D] text-white border border-slate-700 font-mono font-bold text-xs rounded-none"
                                  />
                                  <input
                                    type="text"
                                    placeholder="เวลา (วิ)"
                                    value={trackRanks[team]?.time || ""}
                                    onChange={(e) => {
                                      const time = e.target.value;
                                      setTrackRanks({
                                        ...trackRanks,
                                        [team]: { ...trackRanks[team], time }
                                      });
                                    }}
                                    className="w-20 p-1 text-center bg-[#0A0F1D] text-white border border-slate-700 font-mono text-xs rounded-none"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        // Edit team names & score
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-mono font-bold text-slate-400 truncate mb-1">ชื่อทีมฝั่ง A</label>
                              <input
                                type="text"
                                value={editTeamA}
                                onChange={(e) => setEditTeamA(e.target.value)}
                                placeholder="ชื่อทีมฝั่ง A"
                                className="w-full p-1.5 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-mono font-bold text-slate-400 truncate mb-1">ชื่อทีมฝั่ง B</label>
                              <input
                                type="text"
                                value={editTeamB}
                                onChange={(e) => setEditTeamB(e.target.value)}
                                placeholder="ชื่อทีมฝั่ง B"
                                className="w-full p-1.5 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none"
                              />
                            </div>
                          </div>

                          {/* Standard dual sport score editor */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="block text-[10px] font-mono font-bold text-slate-400">
                                {sport === "volleyball" ? "จำนวนเซตที่ชนะ ทีม A" : "คะแนนทีม A"}
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={scoreA !== null ? scoreA : ""}
                                onChange={(e) => setScoreA(e.target.value === "" ? null : parseInt(e.target.value))}
                                className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none font-mono"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-[10px] font-mono font-bold text-slate-400">
                                {sport === "volleyball" ? "จำนวนเซตที่ชนะ ทีม B" : "คะแนนทีม B"}
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={scoreB !== null ? scoreB : ""}
                                onChange={(e) => setScoreB(e.target.value === "" ? null : parseInt(e.target.value))}
                                className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(m)}
                          className="flex-1 py-1.5 bg-[#FF5722] hover:bg-[#E04E1D] text-white font-bold text-xs uppercase rounded-none transition-all cursor-pointer border-0"
                        >
                          บันทึกข้อมูล
                        </button>
                        <button
                          type="button"
                          onClick={() => handleClearScore(m)}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase rounded-none transition-all cursor-pointer border-0 flex items-center gap-1"
                        >
                          🔄 เคลียร์สกอร์
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMatch(m.id)}
                          className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs uppercase rounded-none transition-all cursor-pointer border-0 flex items-center gap-1"
                        >
                          🗑️ ลบคู่แข่ง
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingMatchId(null)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase rounded-none transition-all cursor-pointer border-0"
                        >
                          ยกเลิก
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Edit Button footer */}
                {!isEditing && isLoggedIn && (
                  <button
                    onClick={() => handleStartEdit(m)}
                    className="w-full mt-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer rounded-none transition-all border-0"
                  >
                    <Edit3 size={12} />
                    บันทึกคะแนน / อัปเดตผลแข่งขัน
                  </button>
                )}
              </div>
            );
          })}

          {filteredMatches.length === 0 && (
            <div className="py-16 text-center text-slate-500 font-bold font-mono col-span-2 bg-[#111827] border border-dashed border-slate-800">
              ❌ ไม่พบตารางการแข่งขันตามตัวกรองที่เลือก
            </div>
          )}
        </div>
        )}
      </div>
      )}

      {/* 4.5 Petanque Custom Schedule Block */}
      {sport === "petanque" && (
        <div className="border border-slate-800 bg-[#111827] p-6 space-y-4 rounded-none text-white max-w-4xl mx-auto shadow-md">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Calendar className="text-[#FF5722]" size={20} />
            <h3 className="text-base font-black uppercase text-white tracking-wide">
              📅 กำหนดการแข่งขันเปตอง
            </h3>
          </div>
          <div className="space-y-3 font-sans text-sm font-semibold">
            <p className="text-slate-400 text-xs font-semibold leading-relaxed">
              เริ่มแข่งขันเวลา <span className="text-[#00FF66] font-bold">09.00 น.</span> ณ สนามเปตอง โดยมีรายละเอียดดังนี้:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 bg-[#151F32] border border-slate-800 rounded-none flex flex-col items-center gap-1.5 text-center">
                <span className="text-2xl">🥎</span>
                <span className="text-xs font-bold text-slate-400 font-sans">ชายคู่</span>
                <span className="text-xs font-black text-[#00FF66] font-mono bg-slate-950 px-2 py-0.5 border border-slate-800">6 ก.ค. 69</span>
              </div>
              <div className="p-4 bg-[#151F32] border border-slate-800 rounded-none flex flex-col items-center gap-1.5 text-center">
                <span className="text-2xl">🥎</span>
                <span className="text-xs font-bold text-slate-400 font-sans">หญิงคู่</span>
                <span className="text-xs font-black text-[#00FF66] font-mono bg-slate-950 px-2 py-0.5 border border-slate-800">7 ก.ค. 69</span>
              </div>
              <div className="p-4 bg-[#151F32] border border-slate-800 rounded-none flex flex-col items-center gap-1.5 text-center">
                <span className="text-2xl">🥎</span>
                <span className="text-xs font-bold text-slate-400 font-sans">ทีมผสม</span>
                <span className="text-xs font-black text-[#00FF66] font-mono bg-slate-950 px-2 py-0.5 border border-slate-800">8 ก.ค. 69</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Knockout Bracket Display Card (ซ่อนสำหรับ petanque, track, parade, cheerleader, fun_sport) */}
      {sport !== "track" && sport !== "petanque" && sport !== "parade" && sport !== "cheerleader" && sport !== "fun_sport" && activeBracketCategory && (activeView === "all" || activeView === "bracket") && (
        <div className="border border-slate-800 bg-[#111827] p-6 space-y-4 rounded-none text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Award size={20} className="text-[#FF5722]" />
              <h2 className="text-base font-black uppercase tracking-wide text-white">
                ผังประกบคู่รอบน็อคเอ้าท์ (Knockout Bracket)
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-[#FF5722] text-white text-xs font-mono px-3 py-1 font-bold uppercase rounded-none">
                {activeBracketCategory}
              </span>
            </div>
          </div>

          <div className="space-y-4">
              <p className="text-xs text-slate-400 font-semibold font-mono">
                💡 คลิกที่คู่แข่งขันในผังเพื่อเลื่อนหน้าจอไปยังการบันทึกคะแนน/แก้ไขผลลัพธ์ของคู่นั้นโดยตรง
              </p>

              {!hasAnyKnockout ? (
                <div className="border border-dashed border-slate-800 bg-slate-900/40 p-6 text-center rounded-none">
                  <AlertCircle className="mx-auto text-slate-500 mb-2" size={24} />
                  <p className="text-sm font-black text-slate-300">
                    ไม่พบข้อมูลโปรแกรมการแข่งขันรอบน็อคเอ้าท์สำหรับ <span className="text-[#FF5722]">{activeBracketCategory}</span> ในขณะนี้
                  </p>
                  <p className="text-xs text-slate-500 mt-1 font-semibold">
                    (โปรแกรมจะเริ่มแสดงเมื่อถึงรอบ 8 ทีม หรือรอบรองชนะเลิศ)
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto pb-4">
                  {/* Bracket Flow Row Container */}
                  <div className="flex gap-6 md:gap-12 min-w-[700px] pt-4 justify-between items-stretch">
                    
                    {/* 1. QUARTERFINALS COLUMN */}
                    {hasQF && (
                      <div className="flex-1 min-w-[220px] flex flex-col justify-around py-2 space-y-8">
                        <div className="text-center font-bold text-[10px] uppercase bg-slate-900 text-slate-300 py-1.5 border border-slate-800 rounded-none font-mono">
                          รอบ 8 ทีม (Quarterfinals)
                        </div>
                        
                        {/* Match 1 & 2 Pair */}
                        <div className="space-y-4 bg-[#151F32] p-2.5 border border-slate-800 rounded-none relative">
                          <div className="absolute -right-3 top-1/2 -translate-y-1/2 text-[#FF5722] font-black text-xs z-10">
                            →
                          </div>
                          <span className="text-[8px] font-mono bg-slate-900 text-[#FF5722] px-1.5 py-0.5 border border-slate-800 font-bold uppercase block w-fit rounded-none">
                            สายบนคู่ที่ 1 & 2
                          </span>
                          {renderBracketMatch(koMap[qfSuffixes[0]])}
                          {renderBracketMatch(koMap[qfSuffixes[1]])}
                        </div>

                        {/* Match 3 & 4 Pair */}
                        <div className="space-y-4 bg-[#151F32] p-2.5 border border-slate-800 rounded-none relative">
                          <div className="absolute -right-3 top-1/2 -translate-y-1/2 text-[#FF5722] font-black text-xs z-10">
                            →
                          </div>
                          <span className="text-[8px] font-mono bg-slate-900 text-[#FF5722] px-1.5 py-0.5 border border-slate-800 font-bold uppercase block w-fit rounded-none">
                            สายล่างคู่ที่ 3 & 4
                          </span>
                          {renderBracketMatch(koMap[qfSuffixes[2]])}
                          {renderBracketMatch(koMap[qfSuffixes[3]])}
                        </div>
                      </div>
                    )}

                    {/* 2. SEMIFINALS COLUMN */}
                    {hasSF && (
                      <div className="flex-1 min-w-[220px] flex flex-col justify-around py-2 space-y-8">
                        <div className="text-center font-bold text-[10px] uppercase bg-slate-900 text-slate-300 py-1.5 border border-slate-800 rounded-none font-mono">
                          รอบรองชนะเลิศ (Semifinals)
                        </div>

                        {/* SF 1 Card Container */}
                        <div className="flex flex-col justify-center h-1/2 min-h-[140px] relative">
                          <div className="absolute -right-3 top-1/2 -translate-y-1/2 text-[#FF5722] font-black text-xs z-10">
                            →
                          </div>
                          <span className="text-[8px] font-mono bg-slate-900 text-[#00FF66] px-1.5 py-0.5 border border-slate-800 font-bold uppercase block w-fit mb-1 rounded-none">
                            รอบรองคู่ที่ 1
                          </span>
                          {renderBracketMatch(koMap[sfSuffixes[0]])}
                        </div>

                        {/* SF 2 Card Container */}
                        <div className="flex flex-col justify-center h-1/2 min-h-[140px] relative">
                          <div className="absolute -right-3 top-1/2 -translate-y-1/2 text-[#FF5722] font-black text-xs z-10">
                            →
                          </div>
                          <span className="text-[8px] font-mono bg-slate-900 text-[#00FF66] px-1.5 py-0.5 border border-slate-800 font-bold uppercase block w-fit mb-1 rounded-none">
                            รอบรองคู่ที่ 2
                          </span>
                          {renderBracketMatch(koMap[sfSuffixes[1]])}
                        </div>
                      </div>
                    )}

                    {/* 3. FINALS & 3RD PLACE COLUMN */}
                    <div className="flex-1 min-w-[220px] flex flex-col justify-around py-2 space-y-8">
                      <div className="text-center font-bold text-[10px] uppercase bg-slate-900 text-slate-300 py-1.5 border border-slate-800 rounded-none font-mono">
                        รอบชิงชนะเลิศ (Medal Matches)
                      </div>

                      {/* Gold Match */}
                      <div className="flex flex-col justify-center min-h-[120px] bg-amber-500/5 p-2.5 border border-amber-500/20 rounded-none">
                        <span className="text-[8px] font-mono bg-amber-500/10 text-amber-400 px-2 py-1 border border-amber-500/30 font-black uppercase block w-fit mb-2 rounded-none">
                          🏆 รอบชิงชนะเลิศ (เหรียญทอง)
                        </span>
                        {renderBracketMatch(koMap[finalSuffix])}
                      </div>

                      {/* Bronze Match */}
                      {koMap[thirdSuffix] && (
                        <div className="flex flex-col justify-center min-h-[120px] bg-slate-900/20 p-2.5 border border-slate-800 rounded-none">
                          <span className="text-[8px] font-mono bg-slate-800 text-slate-300 px-2 py-1 border border-slate-700 font-black uppercase block w-fit mb-2 rounded-none">
                            🥉 ชิงอันดับที่ 3 (เหรียญทองแดง)
                          </span>
                          {renderBracketMatch(koMap[thirdSuffix])}
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      {/* 5. Hidden editing match modal (e.g. for "รอบ 8 ทีม" that are not in filteredMatches) */}
      {(() => {
        const isEditingHiddenMatch = editingMatchId && !filteredMatches.some(m => m.id === editingMatchId);
        const hiddenEditingMatch = isEditingHiddenMatch ? matches.find(m => m.id === editingMatchId) : null;
        if (!hiddenEditingMatch) return null;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-lg border border-slate-700 bg-[#1E293B] p-6 space-y-4 rounded-none text-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                <span className="font-mono text-sm font-black text-[#FF5722] flex items-center gap-1.5">
                  ✍️ บันทึกคะแนน {hiddenEditingMatch.round} ({hiddenEditingMatch.category}) {(() => {
                    const matchNum = hiddenEditingMatch.id.split("_").pop();
                    return matchNum && !isNaN(Number(matchNum)) ? `(คู่ที่ ${matchNum})` : "";
                  })()}
                </span>
                <button 
                  type="button"
                  onClick={() => setEditingMatchId(null)}
                  className="text-slate-400 hover:text-white font-bold font-mono text-xs cursor-pointer"
                >
                  ✕ ปิด
                </button>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-mono font-bold text-slate-400 block">
                  รอบ: {hiddenEditingMatch.round} {hiddenEditingMatch.group ? `(${hiddenEditingMatch.group})` : ""}
                </span>
                <span className="text-[11px] font-mono font-bold text-slate-400 block">
                  สนาม: {hiddenEditingMatch.court} | เวลา: {hiddenEditingMatch.time}
                </span>
              </div>

              {/* Status select */}
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase mb-1 text-slate-400">สถานะแข่ง</label>
                <select
                  value={matchStatus}
                  onChange={(e) => setMatchStatus(e.target.value as any)}
                  className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none"
                >
                  <option value="pending">ยังไม่แข่ง (Pending)</option>
                  <option value="live">กำลังแข่ง (Live)</option>
                  <option value="completed">เสร็จสิ้นการแข่ง (Completed)</option>
                </select>
              </div>

              {/* Program details edit */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">วันที่</label>
                  <input
                    type="text"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    placeholder="เช่น 6 ก.ค. 69"
                    className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">เวลา</label>
                  <input
                    type="text"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    placeholder="เช่น 09.00 น."
                    className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">สนาม</label>
                  <input
                    type="text"
                    value={editCourt}
                    onChange={(e) => setEditCourt(e.target.value)}
                    placeholder="เช่น สนามที่ 1"
                    className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">รอบการแข่งขัน</label>
                  <input
                    type="text"
                    value={editRound}
                    onChange={(e) => setEditRound(e.target.value)}
                    placeholder="เช่น รอบแรก"
                    className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">กลุ่ม/สาย</label>
                  <input
                    type="text"
                    value={editGroup}
                    onChange={(e) => setEditGroup(e.target.value)}
                    placeholder="เช่น สาย A"
                    className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none"
                  />
                </div>
              </div>

              {/* Edit team names & score */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-slate-400 truncate mb-1">ชื่อทีมฝั่ง A</label>
                    <input
                      type="text"
                      value={editTeamA}
                      onChange={(e) => setEditTeamA(e.target.value)}
                      placeholder="ชื่อทีมฝั่ง A"
                      className="w-full p-1.5 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-slate-400 truncate mb-1">ชื่อทีมฝั่ง B</label>
                    <input
                      type="text"
                      value={editTeamB}
                      onChange={(e) => setEditTeamB(e.target.value)}
                      placeholder="ชื่อทีมฝั่ง B"
                      className="w-full p-1.5 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none"
                    />
                  </div>
                </div>

                {/* Standard dual sport score editor */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono font-bold text-slate-400">
                      {sport === "volleyball" ? "จำนวนเซตที่ชนะ ทีม A" : "คะแนนทีม A"}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={scoreA !== null ? scoreA : ""}
                      onChange={(e) => setScoreA(e.target.value === "" ? null : parseInt(e.target.value))}
                      className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono font-bold text-slate-400">
                      {sport === "volleyball" ? "จำนวนเซตที่ชนะ ทีม B" : "คะแนนทีม B"}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={scoreB !== null ? scoreB : ""}
                      onChange={(e) => setScoreB(e.target.value === "" ? null : parseInt(e.target.value))}
                      className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleSaveEdit(hiddenEditingMatch)}
                  className="flex-1 py-2 bg-[#FF5722] hover:bg-[#E04E1D] text-white font-bold text-xs uppercase rounded-none transition-all cursor-pointer border-0"
                >
                  บันทึกข้อมูล
                </button>
                <button
                  type="button"
                  onClick={() => handleClearScore(hiddenEditingMatch)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase rounded-none transition-all cursor-pointer border-0 flex items-center gap-1"
                >
                  🔄 เคลียร์สกอร์
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteMatch(hiddenEditingMatch.id)}
                  className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs uppercase rounded-none transition-all cursor-pointer border-0 flex items-center gap-1"
                >
                  🗑️ ลบคู่แข่ง
                </button>
                <button
                  type="button"
                  onClick={() => setEditingMatchId(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase rounded-none transition-all cursor-pointer border-0"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      </div>

      {/* Beautiful Interactive Print Preview Modal overlay */}
      {showPreview && (
        <div className="fixed inset-0 bg-slate-950/90 z-[9999] flex flex-col justify-between overflow-y-auto p-4 md:p-8 backdrop-blur-md print-overlay-container text-black">
          {/* Export Success Modal Dialog */}
          {exportSuccess && (
            <div className="fixed inset-0 bg-slate-950/85 z-[10000] flex items-center justify-center p-4 backdrop-blur-sm text-white">
              <div className="bg-slate-900 border border-emerald-500/30 p-6 md:p-8 max-w-lg w-full text-center shadow-2xl relative">
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                  <CheckCircle size={32} />
                </div>
                
                <h3 className="text-lg md:text-xl font-black text-white mb-2 uppercase tracking-wide">
                  🎉 ดาวน์โหลดตารางสำเร็จแล้ว!
                </h3>
                
                <div className="space-y-4 text-left text-sm text-slate-300">
                  <p className="leading-relaxed text-center sm:text-left">
                    ระบบได้สร้างและส่งไฟล์ PDF ไปยังอุปกรณ์ของคุณแล้ว เรียกว่า <span className="font-mono text-emerald-400 font-bold bg-slate-950 px-1.5 py-0.5 border border-slate-850">{lastFilename}</span>
                  </p>
                  
                  <div className="bg-slate-950/50 border border-slate-800 p-3.5 space-y-2">
                    <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider">📁 ไฟล์ PDF ถูกเก็บไว้ที่ไหน?</h4>
                    <p className="text-xs leading-relaxed text-slate-400">
                      โดยปกติแล้ว ไฟล์ PDF นี้จะถูกดาวน์โหลดลงเครื่องคอมพิวเตอร์ แท็บเล็ต หรือมือถือของคุณโดยอัตโนมัติ โดยจะไปบันทึกอยู่ใน <span className="font-bold text-white">"โฟลเดอร์ดาวน์โหลด (Downloads / ดาวน์โหลด)"</span> ของอุปกรณ์ที่คุณกำลังใช้งานอยู่
                    </p>
                  </div>
                  
                  <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 space-y-2">
                    <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider">💡 หากคุณไม่พบบันทึกไฟล์ดาวน์โหลด:</h4>
                    <p className="text-xs leading-relaxed text-slate-400">
                      เนื่องจากระบบตัวอย่าง (Iframe Sandbox) ของ AI Studio อาจบล็อกการส่งข้อมูลดาวน์โหลดเพื่อความปลอดภัยของเบราว์เซอร์
                    </p>
                    <p className="text-xs leading-relaxed text-amber-300 font-bold">
                      วิธีแก้ไขง่ายๆ: ให้คลิกปุ่ม <span className="underline">"เปิดในแท็บใหม่" (Open in new tab)</span> ที่แถบควบคุมขวาบนของระบบ เพื่อเปิดเว็บแอปแบบเต็มจอ แล้วกดปุ่มดาวน์โหลดอีกครั้ง จะได้ไฟล์ 100% แน่นวยครับ!
                    </p>
                  </div>

                  {pdfBlobUrl && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 space-y-2.5">
                      <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider">📥 ดาวน์โหลดสำรอง (สำหรับ Iframe Sandbox)</h4>
                      <p className="text-xs leading-relaxed text-slate-400">
                        หากเบราว์เซอร์บล็อกการดาวน์โหลดอัตโนมัติ คุณสามารถคลิกปุ่มด้านล่างเพื่อเปิดไฟล์ PDF ในแท็บใหม่เพื่อพิมพ์หรือบันทึกลงเครื่องได้โดยตรง
                      </p>
                      <a
                        href={pdfBlobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 py-2 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md rounded-none w-full justify-center"
                      >
                        <Download size={13} className="stroke-[3]" />
                        เปิดไฟล์ PDF ในแท็บใหม่
                      </a>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (pdfBlobUrl) {
                        URL.revokeObjectURL(pdfBlobUrl);
                        setPdfBlobUrl(null);
                      }
                      setExportSuccess(false);
                      setShowPreview(false);
                    }}
                    className="py-2.5 px-6 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-emerald-500/15"
                  >
                    ตกลงและปิดหน้านี้
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sticky Top Bar for controls */}
          <div className="bg-slate-900 border border-slate-800 p-4 max-w-4xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl rounded-none shrink-0 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#FF5722]/10 border border-[#FF5722]/30 text-[#FF5722]">
                <Printer size={20} className="animate-pulse" />
              </div>
              <div className="text-left text-white">
                <h3 className="text-sm font-black uppercase tracking-wider">🔍 หน้าต่างตัวอย่างก่อนสั่งพิมพ์ / ดาวน์โหลด PDF</h3>
                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">กรุณาตรวจสอบรายละเอียดความถูกต้องของตาราง หากพร้อมแล้วสามารถกดปุ่มสั่งพิมพ์ด้านขวาได้ทันที</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (pdfBlobUrl) {
                    URL.revokeObjectURL(pdfBlobUrl);
                    setPdfBlobUrl(null);
                  }
                  setShowPreview(false);
                  setExportSuccess(false);
                }}
                className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer rounded-none"
              >
                ย้อนกลับ
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="py-1.5 px-4 bg-amber-500 text-slate-950 hover:bg-amber-400 font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-500/10 transition-all cursor-pointer rounded-none flex items-center gap-1"
              >
                <Printer size={13} className="stroke-[3]" />
                สั่งพิมพ์ตาราง
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
            <div id="sport-pdf-content" className="bg-white text-black p-8 md:p-12 shadow-inner min-h-[1123px] font-sans border border-gray-300 max-w-[210mm] mx-auto text-left relative">
              {/* Decorative print border simulation */}
              <div className="absolute top-2 right-2 text-[8px] font-mono text-gray-400 select-none font-bold">A4 Paper Simulation Preview</div>
              
              {/* Header Block */}
              <div className="text-center border-b-2 border-black pb-4 mb-6">
                <div className="flex justify-center mb-1 text-4xl">🏆</div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-wide text-black leading-tight">
                  ใบรายงานผลและตารางการแข่งขันอย่างเป็นทางการ (Official Match Report)
                </h1>
                <h2 className="text-base sm:text-lg font-bold text-gray-800 mt-1 font-sans">
                  การแข่งขันกีฬาบุคลากรสาธารณสุข จังหวัดปัตตานี ประจำปี 2569 "ปัตตานีเกมส์"
                </h2>
                <p className="text-sm sm:text-base text-gray-500 mt-0.5 font-semibold font-mono">
                  ณ สนามกีฬาเทศบาลเมืองบานา จังหวัดปัตตานี
                </p>
                <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm sm:text-base font-semibold px-3 text-gray-700 bg-gray-100 py-2 border border-gray-300 gap-1.5">
                  <span>ชนิดกีฬา: <strong className="text-black font-extrabold">{
                    sport === "football" ? "ฟุตบอล (Football)" :
                    sport === "volleyball" ? "วอลเลย์บอล (Volleyball)" :
                    sport === "petanque" ? "เปตอง (Petanque)" :
                    sport === "track" ? "กรีฑา (Track & Field)" :
                    sport === "parade" ? "พาเหรด" :
                    sport === "cheerleader" ? "ประกวดกองเชียร์" :
                    sport === "fun_sport" ? "กีฬามหาสนุก" : sport
                  }</strong></span>
                  {selectedCategory && (
                    <span>ประเภท: <strong className="text-black font-extrabold">{selectedCategory}</strong></span>
                  )}
                  {selectedRound !== "all" && (
                    <span>รอบ: <strong className="text-black font-extrabold">{selectedRound}</strong></span>
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

              {/* Content sections based on sport type */}
              <div className="space-y-6 text-black">
                {petanqueDrawNotHeld ? (
                  <div className="border border-black p-6 bg-gray-50 rounded-none text-center space-y-4">
                    <h3 className="text-sm font-black text-black border-b border-black pb-2">
                      📌 กำหนดการแข่งขันเปตอง (กรณีรอผลการจับฉลาก)
                    </h3>
                    <div className="text-[10px] font-bold text-gray-855 space-y-2.5 leading-relaxed inline-block text-left mx-auto py-2">
                      <p>ประเภทชายคู่ วันที่ 6 กรกฎาคม 2569</p>
                      <p>ประเภทหญิงคู่ วันที่ 7 กรกฎาคม 2569</p>
                      <p>ประเภททีมผสม วันที่ 8 กรกฎาคม 2569</p>
                      <p className="mt-4 text-black text-xs font-black text-center font-sans">เริ่มแข่งขัน 9.00น. เป็นต้นไป ณ สนามเปตอง</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* 🏅 สรุปผลการจัดอันดับ 3 อันดับแรก (Top 3 Standings PDF) */}
                    {selectedCategory !== "" && (
                      <div className="border border-black p-4 mb-4 bg-gray-50/20">
                        <h3 className="text-xs sm:text-sm font-bold border-b-2 border-black pb-1 mb-2 uppercase text-black font-sans flex items-center gap-1">
                          🏅 สรุปผลการจัดอันดับ 3 อันดับแรก (Top 3 Standings)
                        </h3>
                        {(() => {
                          let r1 = "";
                          let r2 = "";
                          let r3 = "";

                          if (sport === "volleyball" || sport === "football") {
                            const finalMatch = matches.find(
                              (m) => m.sport === sport && m.category === selectedCategory && m.round === "รอบชิงชนะเลิศ"
                            );
                            const thirdPlaceMatch = matches.find(
                              (m) => m.sport === sport && m.category === selectedCategory && m.round === "ชิงที่ 3"
                            );

                            if (finalMatch && finalMatch.status === "completed") {
                              if (finalMatch.scoreA !== null && finalMatch.scoreB !== null) {
                                r1 = finalMatch.scoreA > finalMatch.scoreB ? finalMatch.teamA : finalMatch.teamB;
                                r2 = finalMatch.scoreA > finalMatch.scoreB ? finalMatch.teamB : finalMatch.teamA;
                              } else if (finalMatch.winner) {
                                r1 = finalMatch.winner;
                                r2 = finalMatch.winner === finalMatch.teamA ? finalMatch.teamB : finalMatch.teamA;
                              }
                            }

                            if (thirdPlaceMatch && thirdPlaceMatch.status === "completed") {
                              if (thirdPlaceMatch.scoreA !== null && thirdPlaceMatch.scoreB !== null) {
                                r3 = thirdPlaceMatch.scoreA > thirdPlaceMatch.scoreB ? thirdPlaceMatch.teamA : thirdPlaceMatch.teamB;
                              } else if (thirdPlaceMatch.winner) {
                                r3 = thirdPlaceMatch.winner;
                              }
                            }
                          } else if (sport === "petanque") {
                            const savedResult = drawLots?.[`petanque_result_${selectedCategory}`] || [];
                            r1 = savedResult[0] || "";
                            r2 = savedResult[1] || "";
                            r3 = savedResult[2] || "";
                          } else if (sport === "fun_sport") {
                            const savedResult = drawLots?.[`fun_sport_result_${selectedCategory}`] || [];
                            r1 = savedResult[0] || "";
                            r2 = savedResult[1] || "";
                            r3 = savedResult[2] || "";
                          } else if (sport === "track") {
                            const savedResult = drawLots?.[`track_direct_result_${selectedCategory}`] || [];
                            r1 = savedResult[0] || "";
                            r2 = savedResult[1] || "";
                            r3 = savedResult[2] || "";
                          } else if (sport === "parade") {
                            const savedResult = drawLots?.[`parade_result_${selectedCategory}`] || [];
                            r1 = savedResult[0] || "";
                            r2 = savedResult[1] || "";
                            r3 = savedResult[2] || "";
                          } else if (sport === "cheerleader") {
                            const savedResult = drawLots?.[`cheerleader_result_${selectedCategory}`] || [];
                            r1 = savedResult[0] || "";
                            r2 = savedResult[1] || "";
                            r3 = savedResult[2] || "";
                          }

                          if (!r1 && !r2 && !r3) {
                            return <p className="text-xs text-gray-500 italic font-sans">ยังไม่มีผลการจัดอันดับอย่างเป็นทางการ</p>;
                          }

                          return (
                            <div className="grid grid-cols-3 gap-2 text-center text-xs font-sans">
                              <div className="border border-gray-300 p-2 bg-yellow-500/5">
                                <span className="font-bold block text-yellow-600">🥇 ชนะเลิศ</span>
                                <span className="font-black text-black">{r1 || "—"}</span>
                              </div>
                              <div className="border border-gray-300 p-2 bg-slate-300/5">
                                <span className="font-bold block text-slate-500">🥈 รองชนะเลิศ อันดับ 1</span>
                                <span className="font-black text-black">{r2 || "—"}</span>
                              </div>
                              <div className="border border-gray-300 p-2 bg-amber-700/5">
                                <span className="font-bold block text-amber-600">🥉 รองชนะเลิศ อันดับ 2</span>
                                <span className="font-black text-black">{r3 || "—"}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Group Standings (if applicable) */}
                    {sport !== "track" && sport !== "petanque" && selectedCategory !== "" && (
                      <div>
                        {(selectedCategory === "all" ? categories.filter(c => c !== "all") : [selectedCategory]).map((cat) => {
                          const catMatches = sportMatches.filter(m => m.category === cat);
                          const catGroups = Array.from(new Set(catMatches.filter(m => m.round === "รอบแรก" && m.group).map(m => m.group))).sort();
                          
                          const hasStandings = catGroups.some(grpName => calculateGroupStandings(matches, sport, grpName, cat, drawLots).length > 0);
                          if (!hasStandings) return null;

                          return (
                            <div key={cat} className="mb-4">
                              <h3 className="text-xs sm:text-sm font-bold border-b-2 border-black pb-1 mb-2 uppercase text-black font-sans flex items-center gap-1">
                                📊 ตารางคะแนนแบ่งกลุ่ม ({cat})
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {catGroups.map((grpName) => {
                                  const standings = calculateGroupStandings(matches, sport, grpName, cat, drawLots);
                                  if (standings.length === 0) return null;

                                  return (
                                    <div key={grpName} className="border border-black p-1.5 bg-gray-50/50">
                                      <div className="font-bold text-[13px] bg-black text-white px-1.5 py-0.5 inline-block mb-1.5 font-mono">
                                        {grpName}
                                      </div>
                                      <table className="w-full text-left text-sm border-collapse text-black">
                                        <thead>
                                          <tr className="border-b border-black bg-gray-100 font-bold">
                                            <th className="py-0.5 px-1 border-r border-gray-300">อันดับ/ทีม</th>
                                            <th className="py-0.5 px-0.5 text-center border-r border-gray-300">แข่ง</th>
                                            <th className="py-0.5 px-0.5 text-center border-r border-gray-300">ชนะ</th>
                                            <th className="py-0.5 px-0.5 text-center border-r border-gray-300">แพ้</th>
                                            <th className="py-0.5 px-0.5 text-center border-r border-gray-300">+/-</th>
                                            <th className="py-0.5 px-1 text-center">คะแนน</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {standings.map((st, i) => (
                                            <tr key={st.team} className="border-b border-gray-200">
                                              <td className="py-0.5 px-1 border-r border-gray-300 font-bold">
                                                {i + 1}. {st.team}
                                              </td>
                                              <td className="py-0.5 px-0.5 text-center border-r border-gray-300">{st.played}</td>
                                              <td className="py-0.5 px-0.5 text-center border-r border-gray-300 text-emerald-700 font-bold">{st.won}</td>
                                              <td className="py-0.5 px-0.5 text-center border-r border-gray-300 text-red-700">{st.lost}</td>
                                              <td className="py-0.5 px-0.5 text-center border-r border-gray-300 font-bold">{st.scoreDiff > 0 ? `+${st.scoreDiff}` : st.scoreDiff}</td>
                                              <td className="py-0.5 px-1 text-center font-bold bg-gray-100">{st.points}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Main Matches Schedule Table */}
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold border-b-2 border-black pb-1 mb-2 uppercase text-black font-sans">
                        📅 โปรแกรมแข่งขันและผลการแข่งขันอย่างเป็นทางการ ({filteredMatches.length} รายการ)
                      </h3>
                      {filteredMatches.length === 0 ? (
                        <p className="text-xs text-center text-gray-500 py-4 font-sans">ไม่มีรายการแข่งขันที่ตรงตามตัวกรองที่เลือก</p>
                      ) : (
                        <table className="w-full text-sm border-collapse border border-black text-black">
                          <thead>
                            <tr className="bg-gray-100 border-b border-black text-left">
                              <th className="p-1 border-r border-black font-bold text-center w-[45px]">คู่ที่</th>
                              <th className="p-1 border-r border-black font-bold w-[105px]">วัน/เวลาแข่งขัน</th>
                              <th className="p-1 border-r border-black font-bold w-[85px]">สนาม</th>
                              <th className="p-1 border-r border-black font-bold w-[125px]">ประเภท / รอบ</th>
                              {sport === "track" ? (
                                <th className="p-1 border-black font-bold">สรุปผลการแข่งขันกรีฑา</th>
                              ) : (
                                <>
                                  <th className="p-1 border-r border-black font-bold text-right w-[215px]">ทีมฝั่ง A</th>
                                  <th className="p-1 border-black font-bold w-[215px]">ทีมฝั่ง B</th>
                                </>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {filteredMatches.map((m) => {
                              const displayNum = getDisplayMatchNum(m.id, m.sport);
                              const isCompleted = m.status === "completed";
                              const isLive = m.status === "live";

                              return (
                                <tr key={m.id} className="border-b border-gray-300 hover:bg-gray-50 text-left">
                                  <td className="p-1 border-r border-black font-black text-center bg-amber-50 text-amber-950 font-mono text-base">{displayNum}</td>
                                  <td className="p-1 border-r border-black font-mono font-medium text-xs">
                                    <div>{m.date}</div>
                                    <div className="font-bold">{m.time}</div>
                                  </td>
                                  <td className="p-1 border-r border-black text-xs font-semibold">{m.court}</td>
                                  <td className="p-1 border-r border-black text-xs">
                                    <div className="font-bold">{m.category}</div>
                                    <div className="text-gray-600 font-mono leading-none">{m.round} {m.group ? `(${m.group})` : ""}</div>
                                  </td>
                                  {sport === "track" ? (
                                    <td className="p-1 text-xs">
                                      {m.participants && m.participants.length > 0 ? (
                                        <div className="grid grid-cols-1 gap-0.5">
                                          {m.participants.map((p, idx) => {
                                            const rank = m.ranks?.[idx]?.rank;
                                            const score = m.ranks?.[idx]?.score;
                                            return (
                                              <div key={idx} className="flex justify-between items-center text-[10px] border-b border-gray-100 pb-0.5">
                                                <span>{idx + 1}. {p}</span>
                                                <span className="font-mono text-gray-700">
                                                  {score ? `เวลา: ${score}` : ""} {rank ? `[อันดับ: ${rank}]` : ""}
                                                </span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <span className="text-gray-400 italic">ยังไม่มีผู้ลงทะเบียน</span>
                                      )}
                                    </td>
                                  ) : (
                                    <>
                                      <td className={`p-1 border-r border-black text-right font-bold text-sm ${m.winner === m.teamA ? "text-emerald-800" : ""}`}>
                                        {m.winner === m.teamA && "👑 "}{m.teamA || "TBD"}
                                      </td>
                                      <td className={`p-1 font-bold text-sm ${m.winner === m.teamB ? "text-emerald-800" : ""}`}>
                                        {m.teamB || "TBD"}{m.winner === m.teamB && " 👑"}
                                      </td>
                                    </>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>

                    {/* Bracket / Finals Report for Cup structure if category is selected and not track or petanque */}
                    {sport !== "track" && sport !== "petanque" && selectedCategory !== "" && (
                      <div className="border border-black p-3 bg-gray-50/20">
                        <h3 className="text-xs sm:text-sm font-bold border-b-2 border-black pb-1 mb-2 uppercase text-black font-sans">
                          🏆 ผลการแข่งขันรอบน็อคเอาท์ (Knockout Playoff Matches)
                        </h3>
                        {(() => {
                          const koMatches = sportMatches.filter(m => 
                            m.category === selectedCategory && 
                            (m.round === "รอบ 8 ทีม" || m.round === "รอบรองชนะเลิศ" || m.round === "รอบชิงชนะเลิศ" || m.round === "ชิงที่ 3")
                          ).sort((a,b) => (a.order || 0) - (b.order || 0));

                          if (koMatches.length === 0) {
                            return <p className="text-xs text-gray-500 italic font-sans">ไม่มีบันทึกการแข่งขันรอบน็อคเอาท์ของประเภทนี้</p>;
                          }

                          return (
                            <table className="w-full text-sm border-collapse border border-black text-black">
                              <thead>
                                <tr className="bg-gray-100 border-b border-black text-left">
                                  <th className="p-1 border-r border-black font-bold text-center w-[45px]">คู่ที่</th>
                                  <th className="p-1 border-r border-black font-bold w-[120px]">รอบ</th>
                                  <th className="p-1 border-r border-black font-bold text-right">ทีมฝั่ง A</th>
                                  <th className="p-1 border-r border-black font-bold text-left font-sans">ทีมฝั่ง B</th>
                                  <th className="p-1 border-black font-bold text-center w-[120px]">ผู้ชนะเข้ารอบ</th>
                                </tr>
                              </thead>
                              <tbody>
                                {koMatches.map((m) => {
                                  const displayMatchNum = getDisplayMatchNum(m.id, m.sport);
                                  return (
                                    <tr key={m.id} className="border-b border-gray-300">
                                      <td className="p-1 border-r border-black font-black text-center bg-amber-50 text-amber-950 font-mono text-base">{displayMatchNum}</td>
                                      <td className="p-1 border-r border-black font-bold">{m.round} {m.group ? `(${m.group})` : ""}</td>
                                      <td className={`p-1 border-r border-black text-right ${m.winner === m.teamA ? "font-black text-emerald-800" : ""}`}>{m.teamA || "TBD"}</td>
                                      <td className={`p-1 border-r border-black text-left ${m.winner === m.teamB ? "font-black text-emerald-800" : ""}`}>{m.teamB || "TBD"}</td>
                                      <td className="p-1 text-center font-bold text-emerald-700">{m.winner ? `🏆 ${m.winner}` : "รอยืนยันผล"}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          );
                        })()}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer Signature Block */}
              <div className="pt-12 grid grid-cols-2 gap-8 text-sm sm:text-base text-black font-sans">
                <div className="text-center">
                  <p className="mb-10">ลงชื่อ ............................................................ ผู้บันทึก / เจ้าหน้าที่สถิติ</p>
                  <p>( ............................................................ )</p>
                  <p className="text-gray-500 mt-1">ฝ่ายเทคนิคกีฬาประจำชนิดกีฬา</p>
                </div>
                <div className="text-center">
                  <p className="mb-10">ลงชื่อ ............................................................ ผู้รับรอง / คณะกรรมการกลาง</p>
                  <p>( ............................................................ )</p>
                  <p className="text-gray-500 mt-1">ประธานฝ่ายเทคนิคการแข่งขัน</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 4. Beautiful Printable Official PDF Section (Hidden on screen, shown ONLY during Print/PDF export) */}
      <div className="hidden print:block bg-white text-black p-6 min-h-screen font-sans">
        {/* Header Block */}
        <div className="text-center border-b-2 border-black pb-4 mb-6">
          <div className="flex justify-center mb-1 text-4xl">🏆</div>
          <h1 className="text-3xl font-black uppercase tracking-wide text-black">
            ใบรายงานผลและตารางการแข่งขันอย่างเป็นทางการ (Official Match Report)
          </h1>
          <h2 className="text-lg font-bold text-gray-800 mt-1 font-sans">
            การแข่งขันกีฬาบุคลากรสาธารณสุข จังหวัดปัตตานี ประจำปี 2569 "ปัตตานีเกมส์"
          </h2>
          <p className="text-base text-gray-500 mt-0.5 font-semibold font-mono">
            ณ สนามกีฬาเทศบาลเมืองบานา จังหวัดปัตตานี
          </p>
          <div className="mt-4 flex justify-between items-center text-base font-semibold px-4 text-gray-700 bg-gray-100 py-2 border border-gray-300">
            <span>ชนิดกีฬา: <strong className="text-black font-extrabold">{
              sport === "football" ? "ฟุตบอล (Football)" :
              sport === "volleyball" ? "วอลเลย์บอล (Volleyball)" :
              sport === "petanque" ? "เปตอง (Petanque)" :
              sport === "track" ? "กรีฑา (Track & Field)" : sport
            }</strong></span>
            {selectedCategory && (
              <span>ประเภท: <strong className="text-black font-extrabold">{selectedCategory}</strong></span>
            )}
            {selectedRound !== "all" && (
              <span>รอบ: <strong className="text-black font-extrabold">{selectedRound}</strong></span>
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

        {/* Content sections based on sport type */}
        <div className="space-y-6 text-black">
          {petanqueDrawNotHeld ? (
            <div className="border border-black p-6 bg-gray-50 rounded-none text-center space-y-4">
              <h3 className="text-lg font-black text-black border-b border-black pb-2">
                📌 กำหนดการแข่งขันเปตอง
              </h3>
              <div className="text-sm font-bold text-gray-850 space-y-2.5 leading-relaxed inline-block text-left mx-auto py-2">
                <p>ประเภทชายคู่ วันที่ 6 กรกฎาคม 2569</p>
                <p>ประเภทหญิงคู่ วันที่ 7 กรกฎาคม 2569</p>
                <p>ประเภททีมผสม วันที่ 8 กรกฎาคม 2569</p>
                <p className="mt-4 text-black text-base font-black text-center font-sans">เริ่มแข่งขัน 9.00น.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Group Standings (if applicable) */}
              {sport !== "track" && sport !== "petanque" && selectedCategory !== "" && (
            <div>
              {(selectedCategory === "all" ? categories.filter(c => c !== "all") : [selectedCategory]).map((cat) => {
                const catMatches = sportMatches.filter(m => m.category === cat);
                const catGroups = Array.from(new Set(catMatches.filter(m => m.round === "รอบแรก" && m.group).map(m => m.group))).sort();
                
                const hasStandings = catGroups.some(grpName => calculateGroupStandings(matches, sport, grpName, cat, drawLots).length > 0);
                if (!hasStandings) return null;

                return (
                  <div key={cat} className="mb-6">
                    <h3 className="text-sm font-bold border-b-2 border-black pb-1 mb-2 uppercase text-black font-sans flex items-center gap-1">
                      📊 ตารางคะแนนแบ่งกลุ่ม ({cat})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {catGroups.map((grpName) => {
                        const standings = calculateGroupStandings(matches, sport, grpName, cat, drawLots);
                        if (standings.length === 0) return null;

                        return (
                          <div key={grpName} className="border border-black p-2 bg-gray-50/50">
                            <div className="font-bold text-base bg-black text-white px-2 py-0.5 inline-block mb-2 font-mono">
                              {grpName}
                            </div>
                            <table className="w-full text-left text-sm border-collapse text-black">
                              <thead>
                                <tr className="border-b border-black bg-gray-100 font-bold">
                                  <th className="py-1 px-1.5 border-r border-gray-300">อันดับ/ทีม</th>
                                  <th className="py-1 px-0.5 text-center border-r border-gray-300">แข่ง</th>
                                  <th className="py-1 px-0.5 text-center border-r border-gray-300">ชนะ</th>
                                  <th className="py-1 px-0.5 text-center border-r border-gray-300">แพ้</th>
                                  <th className="py-1 px-0.5 text-center border-r border-gray-300">+/-</th>
                                  <th className="py-1 px-1.5 text-center">คะแนน</th>
                                </tr>
                              </thead>
                              <tbody>
                                {standings.map((st, i) => (
                                  <tr key={st.team} className="border-b border-gray-200">
                                    <td className="py-1 px-1.5 border-r border-gray-300 font-bold text-xs text-black">
                                      {i + 1}. {st.team}
                                    </td>
                                    <td className="py-1 px-0.5 text-center border-r border-gray-300 text-xs">{st.played}</td>
                                    <td className="py-1 px-0.5 text-center border-r border-gray-300 text-emerald-700 font-bold text-sm">{st.won}</td>
                                    <td className="py-1 px-0.5 text-center border-r border-gray-300 text-red-700 text-xs">{st.lost}</td>
                                    <td className="py-1 px-0.5 text-center border-r border-gray-300 font-bold text-sm">{st.scoreDiff > 0 ? `+${st.scoreDiff}` : st.scoreDiff}</td>
                                    <td className="py-1 px-1.5 text-center font-bold bg-gray-100 text-xs">{st.points}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Main Matches Schedule Table */}
          <div>
            <h3 className="text-sm font-bold border-b-2 border-black pb-1 mb-2 uppercase text-black font-sans">
              📅 โปรแกรมแข่งขันและผลการแข่งขันอย่างเป็นทางการ ({filteredMatches.length} รายการ)
            </h3>
            {filteredMatches.length === 0 ? (
              <p className="text-xs text-center text-gray-500 py-4 font-sans">ไม่มีรายการแข่งขันที่ตรงตามตัวกรองที่เลือก</p>
            ) : (
              <table className="w-full text-sm border-collapse border border-black text-black">
                <thead>
                  <tr className="bg-gray-100 border-b border-black text-left">
                    <th className="p-1.5 border-r border-black font-bold text-center w-[45px]">คู่ที่</th>
                    <th className="p-1.5 border-r border-black font-bold w-[105px]">วัน/เวลาแข่งขัน</th>
                    <th className="p-1.5 border-r border-black font-bold w-[85px]">สนาม</th>
                    <th className="p-1.5 border-r border-black font-bold w-[125px]">ประเภท / รอบ</th>
                    {sport === "track" ? (
                      <th className="p-1.5 border-black font-bold">สรุปผลการแข่งขันกรีฑา</th>
                    ) : (
                      <>
                        <th className="p-1.5 border-r border-black font-bold text-right w-[215px]">ทีมฝั่ง A</th>
                        <th className="p-1.5 border-black font-bold w-[215px]">ทีมฝั่ง B</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredMatches.map((m) => {
                    const displayNum = getDisplayMatchNum(m.id, m.sport);
                    const isCompleted = m.status === "completed";
                    const isLive = m.status === "live";

                    return (
                      <tr key={m.id} className="border-b border-gray-300 hover:bg-gray-50 text-left">
                        <td className="p-1.5 border-r border-black font-black text-center bg-amber-50 text-amber-950 font-mono text-base">{displayNum}</td>
                        <td className="p-1.5 border-r border-black font-mono font-medium text-xs">
                          <div>{m.date}</div>
                          <div className="font-bold">{m.time}</div>
                        </td>
                        <td className="p-1.5 border-r border-black font-semibold text-xs">{m.court}</td>
                        <td className="p-1.5 border-r border-black text-xs">
                          <div className="font-bold">{m.category}</div>
                          <div className="text-gray-600 font-mono text-[10px]">{m.round} {m.group ? `(${m.group})` : ""}</div>
                        </td>

                        {sport === "track" ? (
                          <td className="p-1.5 text-xs">
                            {m.participants && m.participants.length > 0 ? (
                              <div className="grid grid-cols-1 gap-1">
                                {m.participants.map((p, idx) => {
                                  const rank = m.ranks?.[idx]?.rank;
                                  const score = m.ranks?.[idx]?.score;
                                  return (
                                    <div key={idx} className="flex justify-between items-center text-[10px] border-b border-gray-100 pb-0.5">
                                      <span>{idx + 1}. <strong className="font-bold text-black">{p}</strong></span>
                                      <span className="font-mono text-gray-700">
                                        {score ? `เวลา/ระยะ: ${score}` : ""} {rank ? `[อันดับ: ${rank}]` : ""}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">ยังไม่มีผู้ลงทะเบียน</span>
                            )}
                          </td>
                        ) : (
                          <>
                            <td className={`p-1.5 border-r border-black text-right font-bold text-sm ${m.winner === m.teamA ? "text-emerald-800" : ""}`}>
                              {m.winner === m.teamA && "👑 "}{m.teamA || "TBD"}
                            </td>
                            <td className={`p-1.5 font-bold text-sm ${m.winner === m.teamB ? "text-emerald-800" : ""}`}>
                              {m.teamB || "TBD"}{m.winner === m.teamB && " 👑"}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Bracket / Finals Report for Cup structure if category is selected and not track or petanque */}
          {sport !== "track" && sport !== "petanque" && selectedCategory !== "" && (
            <div className="border border-black p-4 bg-gray-50/20">
              <h3 className="text-sm font-bold border-b-2 border-black pb-1 mb-2 uppercase text-black font-sans">
                🏆 ผลการแข่งขันรอบน็อคเอาท์ (Knockout Playoff Matches)
              </h3>
              {(() => {
                const koMatches = sportMatches.filter(m => 
                  m.category === selectedCategory && 
                  (m.round === "รอบ 8 ทีม" || m.round === "รอบรองชนะเลิศ" || m.round === "รอบชิงชนะเลิศ" || m.round === "ชิงที่ 3")
                ).sort((a,b) => (a.order || 0) - (b.order || 0));

                if (koMatches.length === 0) {
                  return <p className="text-xs text-gray-500 italic font-sans">ไม่มีบันทึกการแข่งขันรอบน็อคเอาท์ของประเภทนี้</p>;
                }

                return (
                  <table className="w-full text-sm border-collapse border border-black text-black">
                    <thead>
                      <tr className="bg-gray-100 border-b border-black text-left">
                        <th className="p-1.5 border-r border-black font-bold text-center w-[45px]">คู่ที่</th>
                        <th className="p-1.5 border-r border-black font-bold w-[120px]">รอบ</th>
                        <th className="p-1.5 border-r border-black font-bold text-right">ทีมฝั่ง A</th>
                        <th className="p-1.5 border-r border-black font-bold text-left font-sans">ทีมฝั่ง B</th>
                        <th className="p-1.5 border-black font-bold text-center w-[120px]">ผู้ชนะเข้ารอบ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {koMatches.map((m) => {
                        const displayMatchNum = getDisplayMatchNum(m.id, m.sport);
                        return (
                          <tr key={m.id} className="border-b border-gray-300">
                            <td className="p-1.5 border-r border-black font-black text-center bg-amber-50 text-amber-950 font-mono text-base">{displayMatchNum}</td>
                            <td className="p-1.5 border-r border-black font-bold">{m.round} {m.group ? `(${m.group})` : ""}</td>
                            <td className={`p-1.5 border-r border-black text-right ${m.winner === m.teamA ? "font-black text-emerald-800" : ""}`}>{m.teamA || "TBD"}</td>
                            <td className={`p-1.5 border-r border-black text-left ${m.winner === m.teamB ? "font-black text-emerald-800" : ""}`}>{m.teamB || "TBD"}</td>
                            <td className="p-1.5 text-center font-bold text-emerald-700">{m.winner ? `🏆 ${m.winner}` : "รอยืนยันผล"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          )}
          </>)}

          {/* Footer Signature Block */}
          <div className="pt-12 grid grid-cols-2 gap-8 text-base text-black font-sans">
            <div className="text-center">
              <p className="mb-12">ลงชื่อ ............................................................ ผู้รายงานผล</p>
              <p>( ............................................................ )</p>
              <p className="text-gray-500 mt-1">เจ้าหน้าที่ประสานงานการแข่งขัน</p>
            </div>
            <div className="text-center">
              <p className="mb-12">ลงชื่อ ............................................................ ผู้แทนผู้ตัดสิน</p>
              <p>( ............................................................ )</p>
              <p className="text-gray-500 mt-1">หัวหน้าคณะผู้ตัดสิน</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

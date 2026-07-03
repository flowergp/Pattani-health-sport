import { useState, useMemo, useEffect } from "react";
import { Match, Medal, Participant } from "../types";
import { TEAM_NAMES } from "../initialData";
import { calculateMedals } from "../utils/calcMedals";
import { getDisplayMatchNum } from "../utils/matchUtils";
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

// Helper to check if category is similar
function isSameCategory(catA: string, catB: string): boolean {
  const norm = (s: string) => (s || "").replace(/\s+/g, "").toLowerCase();
  const nA = norm(catA);
  const nB = norm(catB);
  if (nA === nB) return true;
  // Loose petanque category matching
  if (nA.includes("ชาย") && nB.includes("ชาย") && (nA.includes("เปตอง") || nB.includes("เปตอง") || nA.includes("ชายคู่") || nB.includes("ชายคู่"))) return true;
  if (nA.includes("หญิง") && nB.includes("หญิง") && (nA.includes("เปตอง") || nB.includes("เปตอง") || nA.includes("หญิงคู่") || nB.includes("หญิงคู่"))) return true;
  if (nA.includes("ผสม") && nB.includes("ผสม") && (nA.includes("เปตอง") || nB.includes("เปตอง"))) return true;
  return false;
}

const bracketSports = [
  { id: "football_men", label: "⚽ ฟุตบอลชาย", sport: "football", category: "ฟุตบอลชาย" },
  { id: "football_women", label: "⚽ ฟุตบอลหญิง", sport: "football", category: "ฟุตบอลหญิง" },
  { id: "volley_men", label: "🏐 วอลเลย์บอลชาย", sport: "volleyball", category: "ทีมชาย" },
  { id: "volley_women", label: "🏐 วอลเลย์บอลหญิง", sport: "volleyball", category: "ทีมหญิง" },
  { id: "petanque_men", label: "🥎 เปตองชายคู่", sport: "petanque", category: "ทั่วไป ชายคู่" },
  { id: "petanque_women", label: "🥎 เปตองหญิงคู่", sport: "petanque", category: "ทั่วไป หญิงคู่" },
  { id: "petanque_mixed", label: "🥎 เปตองทีมผสม", sport: "petanque", category: "ทีมผสม (ชาย 1 หญิง 2)" },
];

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
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);
  const [lastFilename, setLastFilename] = useState<string>("" as string);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  const [activeBracketSport, setActiveBracketSport] = useState<string>("football_men");

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
        element.id === "district-pdf-content" || 
        document.getElementById("district-pdf-content")?.contains(element)
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
    const pdfElement = document.getElementById("district-pdf-content");
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
        const element = document.getElementById("district-pdf-content");
        if (element) {
          const targetFilename = `ตารางแข่งขัน_${selectedDistrict}.pdf`;
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

      const participatedKeys = new Set<string>();
    districtMatches.forEach(m => {
      participatedKeys.add(`${m.sport}:::${m.category}`);
    });

    if (!isPetanqueDrawHeld) {
      participatedKeys.add("petanque:::ทั่วไป ชายคู่");
      participatedKeys.add("petanque:::ทั่วไป หญิงคู่");
      participatedKeys.add("petanque:::ทีมผสม (ชาย 1 หญิง 2)");
    }

    const extractMatchNum = (id: string): number => {
      const parts = id.split("_");
      const last = parts[parts.length - 1];
      const parsed = parseInt(last, 10);
      return isNaN(parsed) ? 0 : parsed;
    };

    const extraKnockoutMatches = matches.filter(m => {
      const isKO = m.round === "รอบ 8 ทีม" || m.round === "รอบรองชนะเลิศ" || m.round === "ชิงที่ 3" || m.round === "รอบชิงชนะเลิศ";
      if (!isKO) return false;

      let participates = false;
      for (const key of participatedKeys) {
        const [pSport, pCat] = key.split(":::");
        if (m.sport === pSport && isSameCategory(m.category, pCat)) {
          participates = true;
          break;
        }
      }
      if (!participates) return false;

      const isAlreadyIn = districtMatches.some(dm => dm.id === m.id);
      if (isAlreadyIn) return false;

      const matchNum = extractMatchNum(m.id);

      // Calculate path for this specific (m.sport, m.category)
      const myGroups = new Set<string>();
      matches.forEach(allM => {
        if (allM.sport === m.sport && isSameCategory(allM.category, m.category) && allM.round === "รอบแรก") {
          if (allM.teamA === selectedDistrict || allM.teamB === selectedDistrict) {
            if (allM.group) {
              myGroups.add(allM.group.trim());
            }
          }
        }
      });

      // QF check
      const connectedQFNums = new Set<number>();
      const qfMatchesForThis = matches.filter(allM => 
        allM.sport === m.sport && 
        isSameCategory(allM.category, m.category) && 
        allM.round === "รอบ 8 ทีม"
      );
      qfMatchesForThis.forEach(qfM => {
        const qfNum = extractMatchNum(qfM.id);
        const isDirect = qfM.teamA === selectedDistrict || qfM.teamB === selectedDistrict;
        const isGroupMatch = Array.from(myGroups).some(g => 
          (qfM.teamA && qfM.teamA.includes(g)) || (qfM.teamB && qfM.teamB.includes(g))
        );
        if (isDirect || isGroupMatch) {
          connectedQFNums.add(qfNum);
        }
      });

      // SF check
      const connectedSFNums = new Set<number>();
      const sfMatchesForThis = matches.filter(allM => 
        allM.sport === m.sport && 
        isSameCategory(allM.category, m.category) && 
        allM.round === "รอบรองชนะเลิศ"
      );
      sfMatchesForThis.forEach(sfM => {
        const sfNum = extractMatchNum(sfM.id);
        const isDirect = sfM.teamA === selectedDistrict || sfM.teamB === selectedDistrict;
        const referencesQF = Array.from(connectedQFNums).some(qfNum => 
          (sfM.teamA && sfM.teamA.includes(`คู่ที่ ${qfNum}`)) || 
          (sfM.teamB && sfM.teamB.includes(`คู่ที่ ${qfNum}`))
        );
        if (isDirect || referencesQF) {
          connectedSFNums.add(sfNum);
        }
      });

      // Final/3rd check
      const connectedFinalNums = new Set<number>();
      const finalMatchesForThis = matches.filter(allM => 
        allM.sport === m.sport && 
        isSameCategory(allM.category, m.category) && 
        (allM.round === "รอบชิงชนะเลิศ" || allM.round === "ชิงที่ 3")
      );
      finalMatchesForThis.forEach(fM => {
        const fNum = extractMatchNum(fM.id);
        const isDirect = fM.teamA === selectedDistrict || fM.teamB === selectedDistrict;
        const referencesSF = Array.from(connectedSFNums).some(sfNum => 
          (fM.teamA && fM.teamA.includes(`คู่ที่ ${sfNum}`)) || 
          (fM.teamB && fM.teamB.includes(`คู่ที่ ${sfNum}`))
        );
        if (isDirect || referencesSF || connectedSFNums.size > 0) {
          connectedFinalNums.add(fNum);
        }
      });

      // Check if this current match `m` is in the set of connected matches
      if (m.round === "รอบ 8 ทีม") {
        return connectedQFNums.has(matchNum);
      } else if (m.round === "รอบรองชนะเลิศ") {
        return connectedSFNums.has(matchNum);
      } else if (m.round === "รอบชิงชนะเลิศ" || m.round === "ชิงที่ 3") {
        return connectedFinalNums.has(matchNum);
      }

      return false;
    }).map(m => ({
      ...m,
      isPotential: true
    }));

    districtMatches = [...districtMatches, ...extraKnockoutMatches];

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

    const total = districtMatches.filter(m => !m.isPotential).length;
    const completed = districtMatches.filter(m => !m.isPotential && m.status === "completed").length;
    const live = districtMatches.filter(m => !m.isPotential && m.status === "live").length;
    const pending = districtMatches.filter(m => !m.isPotential && m.status === "pending").length;

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

  useEffect(() => {
    if (selectedDistrict && districtProfile) {
      // Find the first bracket sport that they actually have matches in
      const availableBracketSport = bracketSports.find(sportOpt => 
        districtProfile.matches.some(m => 
          m.sport === sportOpt.sport && 
          isSameCategory(m.category, sportOpt.category)
        )
      );
      if (availableBracketSport) {
        setActiveBracketSport(availableBracketSport.id);
      }
    }
  }, [selectedDistrict, districtProfile]);

  const selectedBracketConfig = useMemo(() => {
    return bracketSports.find(s => s.id === activeBracketSport) || bracketSports[0];
  }, [activeBracketSport]);

  const bracketMatchesForSport = useMemo(() => {
    if (!selectedDistrict || !districtProfile) return [];
    return districtProfile.matches.filter(m => 
      m.sport === selectedBracketConfig.sport && 
      isSameCategory(m.category, selectedBracketConfig.category)
    );
  }, [selectedDistrict, districtProfile, selectedBracketConfig]);

  const roundGroupStage = useMemo(() => bracketMatchesForSport.filter(m => m.round === "รอบแรก"), [bracketMatchesForSport]);
  const roundQF = useMemo(() => bracketMatchesForSport.filter(m => m.round === "รอบ 8 ทีม"), [bracketMatchesForSport]);
  const roundSF = useMemo(() => bracketMatchesForSport.filter(m => m.round === "รอบรองชนะเลิศ"), [bracketMatchesForSport]);
  const roundFinals = useMemo(() => bracketMatchesForSport.filter(m => m.round === "รอบชิงชนะเลิศ" || m.round === "ชิงที่ 3"), [bracketMatchesForSport]);

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
            <h4 className="text-sm font-black text-emerald-400 uppercase tracking-wide">📥 กำลังประมวลผลและดาวน์โหลด PDF</h4>
            <p className="text-[10px] text-slate-400 font-semibold leading-normal">ระบบกำลังดาวน์โหลดตารางแข่งขันรายอำเภอของ {selectedDistrict} เป็นไฟล์ PDF ลงในเครื่องของคุณ</p>
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

          {/* 2.5 Visual Tournament Bracket Pathway */}
          <div className="bg-[#111827] border border-slate-800 p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#FF5722]">
                  tournament map
                </span>
                <h3 className="text-base font-black text-white flex items-center gap-2 uppercase tracking-wide">
                  🗺️ เส้นทางการแข่งขันสู่รอบชิงชนะเลิศ (Bracket Pathway)
                </h3>
                <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                  แผนภาพสรุปเส้นทางการแข่งขันและประกบคู่ของ <span className="text-[#00FF66] font-bold">{selectedDistrict}</span> หากสามารถรักษาผลงานผ่านเข้ารอบถัดไปได้สำเร็จ
                </p>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-3 text-[10px] font-bold">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-3 h-3 bg-slate-900 border border-slate-800 inline-block"></span>
                  <span>โปรแกรมปกติ / ยืนยันคู่แล้ว</span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-400">
                  <span className="w-3 h-3 bg-[#16120E] border border-dashed border-amber-500/50 inline-block"></span>
                  <span>หากผ่านเข้ารอบ (Potential Path)</span>
                </div>
              </div>
            </div>

            {/* Sport Selector Pills for Bracket */}
            <div className="flex flex-wrap gap-1">
              {bracketSports.map(sportOpt => {
                // Check if district participates in this sport category
                const hasMatches = districtProfile.matches.some(m => 
                  m.sport === sportOpt.sport && 
                  isSameCategory(m.category, sportOpt.category)
                );
                if (!hasMatches) return null;

                const isSelected = activeBracketSport === sportOpt.id;
                return (
                  <button
                    key={sportOpt.id}
                    onClick={() => setActiveBracketSport(sportOpt.id)}
                    className={`px-3 py-1.5 text-xs font-bold transition-all cursor-pointer border rounded-none ${
                      isSelected
                        ? "bg-[#FF5722] text-white border-[#FF5722]"
                        : "bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white"
                    }`}
                  >
                    {sportOpt.label}
                  </button>
                );
              })}
            </div>

            {/* Bracket columns - Flow layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              
              {/* Column 1: Group Stage */}
              <div className="space-y-3 bg-[#0A0F1D]/60 p-3 border border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1">
                  <span className="text-xs font-black text-slate-200">1. รอบแรก (แบ่งกลุ่ม)</span>
                  <span className="text-[9px] font-mono font-bold bg-slate-900 border border-slate-800 px-1.5 py-0.5 text-slate-400">
                    {roundGroupStage.length} แมตช์
                  </span>
                </div>
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                  {roundGroupStage.length === 0 ? (
                    <div className="text-[10px] text-slate-500 py-6 text-center italic">ไม่มีการแข่งขันรอบแรกในสายนี้</div>
                  ) : (
                    roundGroupStage.map(m => (
                      <div 
                        key={m.id} 
                        className="bg-[#111827] border border-slate-800/80 p-2 text-[11px] space-y-1 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex justify-between text-[9px] font-mono text-slate-400">
                          <span className="font-bold text-[#FF5722]">{m.group}</span>
                          <span>{m.time} | {m.court.replace("สนามที่", "สนาม")}</span>
                        </div>
                        <div className="flex justify-between items-center font-sans font-bold pt-0.5">
                          <span className={m.teamA === selectedDistrict ? "text-[#00FF66] font-extrabold" : "text-slate-300"}>
                            {m.teamA}
                          </span>
                          <span className="text-slate-500 font-mono text-[9px] bg-slate-900 px-1 border border-slate-800">VS</span>
                          <span className={m.teamB === selectedDistrict ? "text-[#00FF66] font-extrabold" : "text-slate-300"}>
                            {m.teamB}
                          </span>
                        </div>
                        {m.status === "completed" ? (
                          <div className="text-[9px] font-mono text-center font-black bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 py-0.5 mt-1">
                            ผลการแข่ง: {m.scoreA} - {m.scoreB}
                          </div>
                        ) : m.status === "live" ? (
                          <div className="text-[9px] font-mono text-center font-black bg-red-950/20 border border-red-900/30 text-red-400 py-0.5 mt-1 animate-pulse">
                            กำลังแข่ง 🔴
                          </div>
                        ) : (
                          <div className="text-[9px] font-mono text-center text-slate-500 bg-slate-900/40 border border-slate-800/80 py-0.5 mt-1">
                            {m.date}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column 2: Quarter-finals */}
              <div className="space-y-3 bg-[#0A0F1D]/60 p-3 border border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1">
                  <span className="text-xs font-black text-slate-200">2. รอบ 8 ทีมสุดท้าย</span>
                  <span className="text-[9px] font-mono font-bold bg-slate-900 border border-slate-800 px-1.5 py-0.5 text-slate-400">
                    {roundQF.length} แมตช์
                  </span>
                </div>
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                  {roundQF.length === 0 ? (
                    <div className="text-[10px] text-slate-500 py-6 text-center italic">ไม่มีการประกบคู่รอบนี้</div>
                  ) : (
                    roundQF.map(m => (
                      <div 
                        key={m.id} 
                        className={`p-2 text-[11px] space-y-1.5 transition-colors ${
                          m.isPotential 
                            ? "border border-dashed border-amber-500/40 bg-[#16120E] hover:border-amber-500/60" 
                            : "bg-[#111827] border border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex justify-between text-[9px] font-mono">
                          <span className={m.isPotential ? "text-amber-400 font-extrabold" : "text-slate-400 font-bold"}>
                            {m.isPotential ? "⏳ หากเข้ารอบ" : "ยืนยันคู่แข่งขัน"}
                          </span>
                          <span className="text-slate-400">{m.time} | {m.court.replace("สนามที่", "สนาม")}</span>
                        </div>
                        <div className="flex justify-between items-center font-sans font-bold">
                          <span className={m.teamA === selectedDistrict ? "text-[#00FF66] font-extrabold" : m.teamA?.includes(selectedDistrict) ? "text-[#00FF66]" : "text-slate-300"}>
                            {m.teamA}
                          </span>
                          <span className="text-slate-500 font-mono text-[9px] bg-slate-900 px-1 border border-slate-800">VS</span>
                          <span className={m.teamB === selectedDistrict ? "text-[#00FF66] font-extrabold" : m.teamB?.includes(selectedDistrict) ? "text-[#00FF66]" : "text-slate-300"}>
                            {m.teamB}
                          </span>
                        </div>
                        {m.status === "completed" ? (
                          <div className="text-[9px] font-mono text-center font-black bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 py-0.5">
                            ผลการแข่ง: {m.scoreA} - {m.scoreB}
                          </div>
                        ) : (
                          <div className="text-[9px] font-mono text-center text-slate-500 bg-slate-900/40 border border-slate-800/80 py-0.5">
                            {m.date}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column 3: Semifinals */}
              <div className="space-y-3 bg-[#0A0F1D]/60 p-3 border border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1">
                  <span className="text-xs font-black text-slate-200">3. รอบรองชนะเลิศ</span>
                  <span className="text-[9px] font-mono font-bold bg-slate-900 border border-slate-800 px-1.5 py-0.5 text-slate-400">
                    {roundSF.length} แมตช์
                  </span>
                </div>
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                  {roundSF.length === 0 ? (
                    <div className="text-[10px] text-slate-500 py-6 text-center italic">ไม่มีการประกบคู่รอบนี้</div>
                  ) : (
                    roundSF.map(m => (
                      <div 
                        key={m.id} 
                        className={`p-2 text-[11px] space-y-1.5 transition-colors ${
                          m.isPotential 
                            ? "border border-dashed border-amber-500/40 bg-[#16120E] hover:border-amber-500/60" 
                            : "bg-[#111827] border border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex justify-between text-[9px] font-mono">
                          <span className={m.isPotential ? "text-amber-400 font-extrabold" : "text-slate-400 font-bold"}>
                            {m.isPotential ? "⏳ หากเข้ารอบ" : "ยืนยันคู่แข่งขัน"}
                          </span>
                          <span className="text-slate-400">{m.time} | {m.court.replace("สนามที่", "สนาม")}</span>
                        </div>
                        <div className="flex justify-between items-center font-sans font-bold">
                          <span className={m.teamA === selectedDistrict ? "text-[#00FF66] font-extrabold" : m.teamA?.includes(selectedDistrict) ? "text-[#00FF66]" : "text-slate-300"}>
                            {m.teamA}
                          </span>
                          <span className="text-slate-500 font-mono text-[9px] bg-slate-900 px-1 border border-slate-800">VS</span>
                          <span className={m.teamB === selectedDistrict ? "text-[#00FF66] font-extrabold" : m.teamB?.includes(selectedDistrict) ? "text-[#00FF66]" : "text-slate-300"}>
                            {m.teamB}
                          </span>
                        </div>
                        {m.status === "completed" ? (
                          <div className="text-[9px] font-mono text-center font-black bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 py-0.5">
                            ผลการแข่ง: {m.scoreA} - {m.scoreB}
                          </div>
                        ) : (
                          <div className="text-[9px] font-mono text-center text-slate-500 bg-slate-900/40 border border-slate-800/80 py-0.5">
                            {m.date}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column 4: Finals / 3rd Place */}
              <div className="space-y-3 bg-[#0A0F1D]/60 p-3 border border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1">
                  <span className="text-xs font-black text-slate-200">4. รอบชิงชนะเลิศ</span>
                  <span className="text-[9px] font-mono font-bold bg-slate-900 border border-slate-800 px-1.5 py-0.5 text-slate-400">
                    {roundFinals.length} แมตช์
                  </span>
                </div>
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                  {roundFinals.length === 0 ? (
                    <div className="text-[10px] text-slate-500 py-6 text-center italic">ไม่มีข้อมูลรอบชิงชนะเลิศ</div>
                  ) : (
                    roundFinals.map(m => (
                      <div 
                        key={m.id} 
                        className={`p-2 text-[11px] space-y-1.5 transition-colors ${
                          m.isPotential 
                            ? "border border-dashed border-amber-500/40 bg-[#16120E] hover:border-amber-500/60" 
                            : "bg-[#111827] border border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex justify-between text-[9px] font-mono">
                          <span className={m.isPotential ? "text-amber-400 font-extrabold" : "text-slate-400 font-bold"}>
                            {m.isPotential ? "⏳ หากเข้ารอบ" : "รอบชิงตำแหน่ง"} {(() => {
                              const displayNum = getDisplayMatchNum(m.id, m.sport);
                              return displayNum ? `(คู่ที่ ${displayNum})` : "";
                            })()}
                          </span>
                          <span className="text-slate-400">{m.time} | {m.court.replace("สนามที่", "สนาม")}</span>
                        </div>
                        <div className="text-[10px] text-slate-300 font-bold text-center bg-slate-900 border border-slate-800/80 py-0.5 font-mono">
                          {m.round}
                        </div>
                        <div className="flex justify-between items-center font-sans font-bold">
                          <span className={m.teamA === selectedDistrict ? "text-[#00FF66] font-extrabold" : m.teamA?.includes(selectedDistrict) ? "text-[#00FF66]" : "text-slate-300"}>
                            {m.teamA}
                          </span>
                          <span className="text-slate-500 font-mono text-[9px] bg-slate-900 px-1 border border-slate-800">VS</span>
                          <span className={m.teamB === selectedDistrict ? "text-[#00FF66] font-extrabold" : m.teamB?.includes(selectedDistrict) ? "text-[#00FF66]" : "text-slate-300"}>
                            {m.teamB}
                          </span>
                        </div>
                        {m.status === "completed" ? (
                          <div className="text-[9px] font-mono text-center font-black bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 py-0.5">
                            ผลการแข่ง: {m.scoreA} - {m.scoreB}
                          </div>
                        ) : (
                          <div className="text-[9px] font-mono text-center text-slate-500 bg-slate-900/40 border border-slate-800/80 py-0.5">
                            {m.date}
                          </div>
                        )}
                      </div>
                    ))
                  )}
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
                          className={`relative border flex flex-col justify-between transition-all duration-150 rounded-none overflow-hidden ${
                            match.isPotential
                              ? "border-dashed border-amber-500/40 bg-[#16120E]"
                              : sportStyle.borderColor
                          } ${
                            isLive 
                              ? "bg-[#1E293B] border-[#00FF66] shadow-[0_0_12px_0_rgba(0,255,102,0.1)]" 
                              : match.isPotential
                                ? ""
                                : "bg-[#111827] border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          {/* Card Header (Category, Round & Live state) */}
                          <div className="p-3 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] font-mono font-black px-2 py-0.5 border uppercase rounded-none ${sportStyle.bg}`}>
                                {sportStyle.icon} {sportStyle.label}
                              </span>
                              {(() => {
                                const displayNum = getDisplayMatchNum(match.id, match.sport);
                                return displayNum ? (
                                  <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs md:text-sm font-mono px-2.5 py-1 font-black uppercase rounded-none">
                                    คู่ที่ {displayNum}
                                  </span>
                                ) : null;
                              })()}
                              <span className="text-[11px] font-bold text-slate-300 truncate max-w-[200px]" title={match.category}>
                                {match.category}
                              </span>
                            </div>
                            <div className="shrink-0">
                              {match.isPotential ? (
                                <span className="text-[9px] font-mono font-black bg-amber-950 text-amber-400 border border-amber-900 px-1.5 py-0.5 rounded-none">
                                  ⚠️ หากเข้ารอบ
                                </span>
                              ) : isLive ? (
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
                            {/* Prominent Date/Time & Court indicators */}
                            <div className="flex flex-col gap-1.5 mb-3">
                              <div className="flex items-center gap-1.5 text-amber-400 bg-slate-950 px-2.5 py-1 border border-slate-800 rounded-none w-fit text-[10px] font-mono font-black uppercase tracking-wider">
                                <Clock size={11} className="text-[#FF5722]" />
                                <span>{match.date} • {match.time}</span>
                              </div>

                              <div className="flex items-center gap-1.5 text-[#00FF66] bg-slate-950 px-2.5 py-1 border border-slate-800 rounded-none w-fit text-[10.5px] font-mono font-black uppercase tracking-wider">
                                <MapPin size={11} className="text-[#00FF66]" />
                                <span>{match.court}</span>
                              </div>
                            </div>
                            {match.isPotential && (
                              <div className="bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-[10px] text-amber-400 font-bold flex items-center gap-1.5 font-sans mb-1.5 rounded-none leading-normal">
                                <span>📢</span>
                                <span>โปรแกรมรอบถัดไป ({match.round}) หาก {selectedDistrict} เข้ารอบ</span>
                              </div>
                            )}
                            
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
        <div className="fixed inset-0 bg-slate-950/90 z-[9999] flex flex-col justify-between overflow-y-auto p-4 md:p-8 backdrop-blur-md print-overlay-container">
          {/* Export Success Modal Dialog */}
          {exportSuccess && (
            <div className="fixed inset-0 bg-slate-950/85 z-[10000] flex items-center justify-center p-4 backdrop-blur-sm">
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
            <div id="district-pdf-content" className="bg-white text-black p-8 md:p-12 shadow-inner min-h-[1123px] font-sans border border-gray-300 max-w-[210mm] mx-auto text-left relative">
              {/* Decorative print border simulation */}
              <div className="absolute top-2 right-2 text-[8px] font-mono text-gray-400 select-none">A4 Paper Simulation Preview</div>
              
              {/* Header Block */}
              <div className="text-center border-b-2 border-black pb-4 mb-6">
                <div className="flex justify-center mb-1 text-4xl">🏆</div>
                <h1 className="text-lg sm:text-xl md:text-2xl font-black uppercase tracking-wide text-black leading-tight">
                  รายงานโปรแกรมและผลการแข่งขันรายอำเภออย่างเป็นทางการ (Official District Report)
                </h1>
                <h2 className="text-base sm:text-lg font-bold text-gray-800 mt-1 font-sans">
                  การแข่งขันกีฬาบุคลากรสาธารณสุข จังหวัดปัตตานี ประจำปี 2569 "ปัตตานีเกมส์"
                </h2>
                <p className="text-sm sm:text-base text-gray-500 mt-0.5 font-semibold font-mono">
                  ณ สนามกีฬาเทศบาลเมืองบานา จังหวัดปัตตานี
                </p>
                <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm sm:text-base font-semibold px-3 text-gray-700 bg-gray-100 py-2 border border-gray-300 gap-1.5">
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
                <h3 className="text-xs sm:text-sm font-bold border-b-2 border-black pb-1 mb-2 uppercase text-black font-sans">
                  📅 รายละเอียดโปรแกรมและผลการแข่งขัน ({filteredMatches.length} รายการ)
                </h3>
                {filteredMatches.length === 0 ? (
                  <p className="text-xs text-center text-gray-500 py-4 font-sans">ไม่มีรายการแข่งขันที่ตรงตามตัวกรองที่เลือก</p>
                ) : (
                  <table className="w-full text-sm border-collapse border border-black text-black">
                    <thead>
                      <tr className="bg-gray-100 border-b border-black text-left font-sans">
                        <th className="p-1 border-r border-black font-bold text-center w-[45px]">คู่ที่</th>
                        <th className="p-1 border-r border-black font-bold w-[105px]">วัน/เวลาแข่งขัน</th>
                        <th className="p-1 border-r border-black font-bold w-[75px]">กีฬา</th>
                        <th className="p-1 border-r border-black font-bold w-[125px]">ประเภท / รอบ</th>
                        <th className="p-1 border-r border-black font-bold text-right w-[210px]">ทีมฝั่ง A</th>
                        <th className="p-1 border-black font-bold w-[210px]">ทีมฝั่ง B</th>
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
                            <td className="p-1 border-r border-black font-bold text-center uppercase font-sans text-xs">
                              {m.sport === "football" ? "⚽ ฟุตบอล" :
                               m.sport === "volleyball" ? "🏐 วอลเลย์" :
                               m.sport === "petanque" ? "🥎 เปตอง" : "🏃 กรีฑา"}
                            </td>
                            <td className="p-1 border-r border-black text-xs">
                              <div className="font-bold leading-tight">{m.category}</div>
                              <div className="text-gray-600 font-mono leading-none text-[10px] flex items-center gap-1 mt-0.5">
                                <span>{m.round} {m.group ? `(${m.group})` : ""}</span>
                                {m.isPotential && (
                                  <span className="text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.2 text-[7px] font-black leading-none uppercase shrink-0">หากเข้ารอบ</span>
                                )}
                              </div>
                            </td>

                            {m.id.startsWith("petanque_virtual") ? (
                              <td colSpan={2} className="p-1 text-center font-bold text-amber-700 bg-amber-50 text-xs">
                                📢 รอผลการจับฉลากแบ่งสายประเภท {m.category} อย่างเป็นทางการ
                              </td>
                            ) : m.sport === "track" ? (
                              <td colSpan={2} className="p-1 text-xs">
                                {m.participants && m.participants.length > 0 ? (
                                  <div className="grid grid-cols-1 gap-0.5">
                                    {m.participants.map((p, idx) => {
                                      const rank = m.ranks?.[idx]?.rank;
                                      const score = m.ranks?.[idx]?.score;
                                      return (
                                        <div key={idx} className="flex justify-between items-center text-xs border-b border-gray-100 pb-0.5">
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
                                <td className={`p-1 border-r border-black text-right font-bold text-[11px] ${m.winner === m.teamA ? "text-emerald-800" : ""} ${m.teamA === selectedDistrict ? "underline decoration-wavy" : ""}`}>
                                  {m.winner === m.teamA && "👑 "}{m.teamA || "TBD"}
                                </td>
                                <td className={`p-1 font-bold text-[11px] ${m.winner === m.teamB ? "text-emerald-800" : ""} ${m.teamB === selectedDistrict ? "underline decoration-wavy" : ""}`}>
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

              {/* Footer Signature Block */}
              <div className="pt-12 grid grid-cols-2 gap-8 text-sm sm:text-base text-black font-sans">
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
            <h1 className="text-2xl font-black uppercase tracking-wide text-black">
              รายงานโปรแกรมและผลการแข่งขันรายอำเภออย่างเป็นทางการ (Official District Report)
            </h1>
            <h2 className="text-lg font-bold text-gray-800 mt-1 font-sans">
              การแข่งขันกีฬาบุคลากรสาธารณสุข จังหวัดปัตตานี ประจำปี 2569 "ปัตตานีเกมส์"
            </h2>
            <p className="text-base text-gray-500 mt-0.5 font-semibold font-mono">
              ณ สนามกีฬาเทศบาลเมืองบานา จังหวัดปัตตานี
            </p>
            <div className="mt-4 flex flex-wrap justify-between items-center text-sm font-semibold px-4 text-gray-700 bg-gray-100 py-2 border border-gray-300">
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
            <h3 className="text-sm font-bold border-b-2 border-black pb-1 mb-2 uppercase text-black font-sans">
              📅 รายละเอียดโปรแกรมและผลการแข่งขัน ({filteredMatches.length} รายการ)
            </h3>
            {filteredMatches.length === 0 ? (
              <p className="text-xs text-center text-gray-500 py-4 font-sans">ไม่มีรายการแข่งขันที่ตรงตามตัวกรองที่เลือก</p>
            ) : (
              <table className="w-full text-sm border-collapse border border-black text-black">
                <thead>
                  <tr className="bg-gray-100 border-b border-black text-left font-sans">
                    <th className="p-1.5 border-r border-black font-bold text-center w-[45px]">คู่ที่</th>
                    <th className="p-1.5 border-r border-black font-bold w-[105px]">วัน/เวลาแข่งขัน</th>
                    <th className="p-1.5 border-r border-black font-bold w-[85px]">กีฬา</th>
                    <th className="p-1.5 border-r border-black font-bold w-[135px]">ประเภท / รอบ</th>
                    <th className="p-1.5 border-r border-black font-bold text-right w-[225px]">ทีมฝั่ง A</th>
                    <th className="p-1.5 border-black font-bold w-[225px]">ทีมฝั่ง B</th>
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
                        <td className="p-1.5 border-r border-black font-bold text-center uppercase font-sans text-xs">
                          {m.sport === "football" ? "⚽ ฟุตบอล" :
                           m.sport === "volleyball" ? "🏐 วอลเลย์" :
                           m.sport === "petanque" ? "🥎 เปตอง" : "🏃 กรีฑา"}
                        </td>
                        <td className="p-1.5 border-r border-black text-xs">
                          <div className="font-bold">{m.category}</div>
                          <div className="text-gray-600 font-mono text-[10px]">{m.round} {m.group ? `(${m.group})` : ""}</div>
                        </td>

                        {m.id.startsWith("petanque_virtual") ? (
                          <td colSpan={2} className="p-1.5 text-center font-bold text-amber-700 bg-amber-50">
                            📢 รอผลการจับฉลากแบ่งสายประเภท {m.category} อย่างเป็นทางการ
                          </td>
                        ) : m.sport === "track" ? (
                          <td colSpan={2} className="p-1.5 text-xs">
                            {m.participants && m.participants.length > 0 ? (
                              <div className="grid grid-cols-1 gap-1">
                                {m.participants.map((p, idx) => {
                                  const rank = m.ranks?.[idx]?.rank;
                                  const score = m.ranks?.[idx]?.score;
                                  return (
                                    <div key={idx} className="flex justify-between items-center text-xs border-b border-gray-100 pb-0.5">
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
                            <td className={`p-1.5 border-r border-black text-right font-bold text-[11px] ${m.winner === m.teamA ? "text-emerald-800" : ""} ${m.teamA === selectedDistrict ? "underline decoration-wavy" : ""}`}>
                              {m.winner === m.teamA && "👑 "}{m.teamA || "TBD"}
                            </td>
                            <td className={`p-1.5 font-bold text-[11px] ${m.winner === m.teamB ? "text-emerald-800" : ""} ${m.teamB === selectedDistrict ? "underline decoration-wavy" : ""}`}>
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

          {/* Footer Signature Block */}
          <div className="pt-12 grid grid-cols-2 gap-8 text-base text-black font-sans">
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

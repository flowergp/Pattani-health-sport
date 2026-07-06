import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  collection,
  onSnapshot,
  setDoc,
  doc,
  getDocs,
  disableNetwork
} from "firebase/firestore";
import { db } from "./firebase";
import { Match, AdminUser } from "./types";
import { getInitialMatches, TEAM_NAMES } from "./initialData";
import Dashboard from "./components/Dashboard";
import SportTab from "./components/SportTab";
import UserManager from "./components/UserManager";
import DistrictSchedule from "./components/DistrictSchedule";
import { calculateGroupStandings } from "./utils/calcStandings";
import { 
  Trophy, 
  Award, 
  Sliders, 
  RefreshCw, 
  Flame, 
  Activity,
  Heart,
  Smile,
  ShieldAlert
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function resolveAllMatches(allMatches: Match[], drawLots?: { [key: string]: string[] }): Match[] {
  return allMatches.map(m => {
    if (m.sport === "track") return m;
    
    let teamA = m.teamA;
    let teamB = m.teamB;
    let updated = false;

    const regex = /ที่\s*(\d+)\s*สาย\s*([A-D])/i;

    if (teamA) {
      const matchA = teamA.match(regex);
      if (matchA) {
        const rankNum = parseInt(matchA[1], 10);
        const groupLetter = matchA[2].toUpperCase();
        const groupName = `สาย ${groupLetter}`;
        
        const groupMatches = allMatches.filter(
          gm => gm.sport === m.sport && 
                gm.group === groupName && 
                gm.round === "รอบแรก" &&
                gm.category === m.category
        );
        const hasAnyCompleted = groupMatches.some(gm => gm.status === "completed");
        
        if (hasAnyCompleted) {
          const standings = calculateGroupStandings(allMatches, m.sport, groupName, m.category, drawLots);
          if (standings && standings.length >= rankNum) {
            teamA = standings[rankNum - 1].team;
            updated = true;
          }
        }
      }
    }

    if (teamB) {
      const matchB = teamB.match(regex);
      if (matchB) {
        const rankNum = parseInt(matchB[1], 10);
        const groupLetter = matchB[2].toUpperCase();
        const groupName = `สาย ${groupLetter}`;
        
        const groupMatches = allMatches.filter(
          gm => gm.sport === m.sport && 
                gm.group === groupName && 
                gm.round === "รอบแรก" &&
                gm.category === m.category
        );
        const hasAnyCompleted = groupMatches.some(gm => gm.status === "completed");
        
        if (hasAnyCompleted) {
          const standings = calculateGroupStandings(allMatches, m.sport, groupName, m.category, drawLots);
          if (standings && standings.length >= rankNum) {
            teamB = standings[rankNum - 1].team;
            updated = true;
          }
        }
      }
    }

    return updated ? { ...m, teamA, teamB } : m;
  });
}

function getDefaultUsers(): AdminUser[] {
  return [];
}

// All matches live in ONE Firestore document (matches/_all) and all users in
// users/_all. Data is tiny (~65KB total, limit is 1MB) so a page load costs
// 1 read instead of 200+, and a score update costs each viewer 1 read.
// The doc IDs sit inside the collections already allowed by firestore.rules,
// so no rules re-deploy is needed.
const matchesDocRef = () => doc(db, "matches", "_all");
const usersDocRef = () => doc(db, "users", "_all");

function cleanMatchesList(rawList: Match[]): Match[] {
  // Filter out corrupted petanque IDs from previous versions and deduplicate
  const uniqueMap = new Map<string, Match>();
  rawList
    .filter((m) => m && m.id && !m.id.startsWith("petanque_ทั_") && !m.id.startsWith("petanque_ที_"))
    .forEach((m) => uniqueMap.set(m.id, m));
  return Array.from(uniqueMap.values()).sort((a, b) => a.order - b.order);
}

const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn("Storage access denied:", e);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn("Storage access denied:", e);
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn("Storage access denied:", e);
    }
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "track" | "petanque" | "volleyball" | "football" | "admins" | "my-schedule">("dashboard");
  // Session-only: never persisted, so a single bad connection can't
  // permanently silo a device in local mode — every reload retries the cloud
  // (cheap now: 1 read per load with the single-doc layout).
  const [isLocalFallback, setIsLocalFallback] = useState<boolean>(false);
  
  const [matches, setMatches] = useState<Match[]>(() => {
    const saved = safeLocalStorage.getItem("pattani_matches");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Match[];
        if (Array.isArray(parsed)) {
          // Auto-migrate if we have old volleyball match IDs (without _c1_ or _c2_)
          const hasOldVolleyballIds = parsed.some(
            (m) => m && m.sport === "volleyball" && m.round === "รอบแรก" && !m.id.includes("_c1_") && !m.id.includes("_c2_")
          );
          if (hasOldVolleyballIds) {
            console.log("Old volleyball matches detected in local storage. Clearing cache...");
            safeLocalStorage.removeItem("pattani_matches");
            return getInitialMatches();
          }

          // Clean up corrupted IDs and deduplicate
          const uniqueMap = new Map<string, Match>();
          parsed
            .filter((m) => m && m.id && !m.id.startsWith("petanque_ทั_") && !m.id.startsWith("petanque_ที_"))
            .forEach((m) => uniqueMap.set(m.id, m));
          return Array.from(uniqueMap.values());
        }
      } catch (e) {
        // ignore
      }
    }
    return getInitialMatches();
  });

  const [drawLots, setDrawLots] = useState<{ [key: string]: string[] }>(() => {
    const saved = safeLocalStorage.getItem("pattani_drawLots");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return {};
  });

  const resolvedMatches = useMemo(() => {
    return resolveAllMatches(matches, drawLots);
  }, [matches, drawLots]);


  const [dbUsers, setDbUsers] = useState<AdminUser[]>(() => {
    const saved = safeLocalStorage.getItem("pattani_users");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return getDefaultUsers();
  });

  const [loading, setLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // Custom district filter state
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");

  // Theme state: dark or light
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (safeLocalStorage.getItem("pattani_theme") as "dark" | "light") || "dark";
  });

  useEffect(() => {
    safeLocalStorage.setItem("pattani_theme", theme);
    if (theme === "light") {
      document.documentElement.classList.add("theme-light");
      document.documentElement.classList.remove("theme-dark");
    } else {
      document.documentElement.classList.add("theme-dark");
      document.documentElement.classList.remove("theme-light");
    }
  }, [theme]);

  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        document.documentElement.style.setProperty(
          "--header-height",
          `${headerRef.current.offsetHeight}px`
        );
      }
    };

    updateHeaderHeight();

    if (headerRef.current) {
      const observer = new ResizeObserver(updateHeaderHeight);
      observer.observe(headerRef.current);
      return () => observer.disconnect();
    }
  }, []);

  // Admin authentication state
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return safeLocalStorage.getItem("isLoggedIn") === "true";
  });
  const [currentUser, setCurrentUser] = useState<{ username: string; role: "admin" | "editor"; team?: string } | null>(() => {
    const saved = safeLocalStorage.getItem("currentUser");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Find matching user in database users list
    const matchedUser = dbUsers.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password
    );

    if ((username.trim().toLowerCase() === "admin" && password === "1234") || matchedUser) {
      setIsLoggedIn(true);
      safeLocalStorage.setItem("isLoggedIn", "true");
      
      const loggedInInfo = matchedUser 
        ? { username: matchedUser.username, role: matchedUser.role, team: matchedUser.team } 
        : { username: "admin", role: "admin" as const };
        
      setCurrentUser(loggedInInfo);
      safeLocalStorage.setItem("currentUser", JSON.stringify(loggedInInfo));
      
      setShowLoginModal(false);
      setLoginError("");
      setUsername("");
      setPassword("");
    } else {
      setLoginError("ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    safeLocalStorage.removeItem("isLoggedIn");
    safeLocalStorage.removeItem("currentUser");
    if (activeTab === "admins") {
      setActiveTab("dashboard");
    }
  };

  const saveMatchesLocally = (newMatches: Match[]) => {
    const sorted = [...newMatches].sort((a, b) => a.order - b.order);
    setMatches(sorted);
    safeLocalStorage.setItem("pattani_matches", JSON.stringify(sorted));
  };


  const saveUsersLocally = (newUsers: AdminUser[]) => {
    setDbUsers(newUsers);
    safeLocalStorage.setItem("pattani_users", JSON.stringify(newUsers));
  };

  // Only give up on the cloud for errors that won't heal on their own.
  // Transient network blips are left to the SDK, which queues writes in the
  // persistent cache and flushes them when the connection returns.
  const isFatalDbError = (error: any) =>
    error?.code === "resource-exhausted" ||
    error?.code === "permission-denied" ||
    error?.message?.includes("Quota");

  // Fire-and-forget write of the full matches list to the single doc (1 write)
  const persistMatches = (list: Match[]) => {
    if (isLocalFallback) return;
    (async () => {
      try {
        const writePromise = setDoc(matchesDocRef(), { matches: list, drawLots });
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Write connection timed out (4s)")), 4000)
        );
        await Promise.race([writePromise, timeoutPromise]);
      } catch (error: any) {
        console.error("Error saving matches to Firestore: ", error);
        if (isFatalDbError(error)) {
          enableLocalFallback();
        }
      }
    })();
  };

  const handleUpdateDrawLots = async (key: string, teamOrder: string[]) => {
    const newDrawLots = { ...drawLots, [key]: teamOrder };
    setDrawLots(newDrawLots);
    safeLocalStorage.setItem("pattani_drawLots", JSON.stringify(newDrawLots));

    if (isLocalFallback) return;

    try {
      const writePromise = setDoc(matchesDocRef(), { matches, drawLots: newDrawLots });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Write connection timed out (4s)")), 4000)
      );
      await Promise.race([writePromise, timeoutPromise]);
    } catch (error: any) {
      console.error("Error saving draw lots: ", error);
      enableLocalFallback();
    }
  };

  const enableLocalFallback = () => {
    setIsLocalFallback(true);
    setDbError(
      "เชื่อมต่อฐานข้อมูลกลางไม่สำเร็จในขณะนี้ ระบบจึงทำงานในโหมดสำรองชั่วคราว (Local Safety Fallback Mode) " +
      "ข้อมูลที่แก้ไขจะถูกเก็บไว้ในเบราว์เซอร์เครื่องนี้เท่านั้น และจะยังไม่ถูกส่งขึ้นฐานข้อมูลกลาง " +
      "กรุณากดปุ่ม \"ลองเชื่อมต่อฐานข้อมูลใหม่\" หรือรีเฟรชหน้าเว็บเมื่ออินเทอร์เน็ตกลับมาปกติ"
    );

    // Auto-seed local matches if current matches list is empty
    if (matches.length === 0) {
      saveMatchesLocally(getInitialMatches());
    }

    disableNetwork(db).catch((err) => {
      console.log("Failed to disable Firestore network in enableLocalFallback: ", err);
    });
  };

  // Flip Firestore back online when leaving fallback within the session
  useEffect(() => {
    if (isLocalFallback) {
      disableNetwork(db).catch((err) => {
        console.log("Failed to disable Firestore network: ", err);
      });
    }
  }, [isLocalFallback]);

  // 1. Sync matches and users from Firestore (single-doc listeners: 1 read each)
  useEffect(() => {
    // If we're already marked as local fallback, don't block with loading spinner
    if (isLocalFallback) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setDbError(null);

    let unsubscribeMatches = () => {};
    let unsubscribeUsers = () => {};
    let migratedMatches = false;
    let migratedUsers = false;

    // Fall back locally if Firestore can't deliver a first snapshot in time
    // (slow mobile first loads need headroom; cached loads resolve instantly)
    const timeoutId = setTimeout(() => {
      console.warn("Firestore connection timed out (10s). Enabling local fallback.");
      enableLocalFallback();
      setLoading(false);
    }, 10000);

    // One-time migration: consolidate legacy per-match docs into matches/_all.
    // Runs only when the server confirms matches/_all does not exist yet.
    const migrateOrSeedMatches = async () => {
      if (migratedMatches) return;
      migratedMatches = true;
      try {
        console.log("matches/_all not found. Migrating legacy match docs...");
        const legacySnap = await getDocs(collection(db, "matches"));
        const legacyList: Match[] = [];
        legacySnap.forEach((docSnap) => {
          if (docSnap.id === "_all") return;
          const data = docSnap.data() as Match;
          if (data && data.id) {
            legacyList.push(data);
          }
        });
        const source = legacyList.length > 0 ? legacyList : getInitialMatches();
        await setDoc(matchesDocRef(), { matches: cleanMatchesList(source) });
        console.log(`Migrated ${source.length} matches into matches/_all`);
      } catch (err: any) {
        console.error("Matches migration error: ", err);
        if (err?.code === "resource-exhausted" || err?.message?.includes("Quota")) {
          enableLocalFallback();
          setLoading(false);
        }
      }
    };

    const migrateOrSeedUsers = async () => {
      if (migratedUsers) return;
      migratedUsers = true;
      try {
        console.log("users/_all not found. Migrating legacy user docs...");
        const legacySnap = await getDocs(collection(db, "users"));
        const legacyList: AdminUser[] = [];
        legacySnap.forEach((docSnap) => {
          if (docSnap.id === "_all") return;
          const data = docSnap.data();
          legacyList.push({
            id: docSnap.id,
            username: data.username || "",
            password: data.password || "",
            role: data.role || "editor",
            createdAt: data.createdAt || "",
            team: data.team || ""
          });
        });
        await setDoc(usersDocRef(), { users: legacyList });
        console.log(`Migrated ${legacyList.length} users into users/_all`);
      } catch (err: any) {
        console.error("Users migration error: ", err);
      }
    };

    try {
      // Sync matches (single document)
      unsubscribeMatches = onSnapshot(
        matchesDocRef(),
        (snapshot) => {
          const fromCache = snapshot.metadata.fromCache;
          if (!snapshot.exists()) {
            // A cache-only "missing" can just mean the doc was never cached;
            // let the 5s timeout handle the offline case instead of seeding.
            if (fromCache) return;
            clearTimeout(timeoutId);
            migrateOrSeedMatches();
            return;
          }
          clearTimeout(timeoutId);
          const data = snapshot.data();
          const rawList: Match[] = Array.isArray(data?.matches) ? data.matches : [];
          saveMatchesLocally(cleanMatchesList(rawList));
          setLoading(false);
        },
        (error: any) => {
          clearTimeout(timeoutId);
          console.error("Firestore matches subscription error: ", error);
          enableLocalFallback();
          setLoading(false);
        }
      );

      // Sync users (single document)
      unsubscribeUsers = onSnapshot(
        usersDocRef(),
        (snapshot) => {
          const fromCache = snapshot.metadata.fromCache;
          if (!snapshot.exists()) {
            if (fromCache) return;
            migrateOrSeedUsers();
            return;
          }
          const data = snapshot.data();
          const usersList: AdminUser[] = Array.isArray(data?.users) ? data.users : [];
          saveUsersLocally(usersList);
        },
        (error: any) => {
          console.error("Firestore users subscription error: ", error);
          enableLocalFallback();
        }
      );
    } catch (e: any) {
      console.error("Failed to connect to firestore streams: ", e);
      enableLocalFallback();
      setLoading(false);
    }

    return () => {
      clearTimeout(timeoutId);
      unsubscribeMatches();
      unsubscribeUsers();
    };
  }, [isLocalFallback]);

  // Update selected district automatically when user logs in
  useEffect(() => {
    if (isLoggedIn && currentUser?.team) {
      setSelectedDistrict(currentUser.team);
    }
  }, [isLoggedIn, currentUser]);

  // 2. Helper to load initial schedule to Firestore
  const resetToDefaultPDFSchedule = async (isAuto = false) => {
    if (!isAuto && !isLoggedIn) {
      console.warn("Unauthorized: Must be logged in to reset schedule");
      return;
    }
    setIsResetting(true);
    setLoading(true);

    // Reset locally first
    const defaultMatches = getInitialMatches();
    saveMatchesLocally(defaultMatches);

    if (!isLocalFallback) {
      try {
        // Overwrite the single consolidated doc: 1 write total
        await setDoc(matchesDocRef(), { matches: defaultMatches });
        console.log("Reset matches/_all successfully!");
      } catch (err: any) {
        console.error("Batch seed error: ", err);
        if (err?.code === "resource-exhausted" || err?.message?.includes("Quota")) {
          enableLocalFallback();
        } else {
          setDbError(err.message || "เกิดข้อผิดพลาดขณะบันทึกข้อมูลตารางการแข่งขัน");
        }
      } finally {
        setIsResetting(false);
        setLoading(false);
      }
    } else {
      setIsResetting(false);
      setLoading(false);
    }
  };


  const seedDefaultDistrictUsers = async () => {
    if (isLocalFallback) return;
    const districts = [
      { th: "เมือง", en: "muang" },
      { th: "หนองจิก", en: "nongchik" },
      { th: "ยะรัง", en: "yarang" },
      { th: "ยะหริ่ง", en: "yaring" },
      { th: "ยะหรึ่ง", en: "yarueng" },
      { th: "ปะนาเระ", en: "panare" },
      { th: "มายอ", en: "mayo" },
      { th: "แม่ลาน", en: "maelan" },
      { th: "แม่ลาน", en: "maelarn" },
      { th: "ไม้แก่น", en: "maikaen" },
      { th: "โคกโพธิ์", en: "khokpho" },
      { th: "สายบุรี", en: "saiburi" },
      { th: "กะพ้อ", en: "kapho" },
      { th: "ทุ่งยางแดง", en: "thungyangdaeng" },
      { th: "สสจ.ปัตตานี", en: "ssjpattani" }
    ];

    try {
      const districtUsers: AdminUser[] = [];
      districts.forEach((d, idx) => {
        districtUsers.push({
          id: `user_th_${idx}`,
          username: d.th,
          password: "1234",
          role: "editor",
          team: d.th,
          createdAt: new Date().toLocaleDateString("th-TH")
        });
        districtUsers.push({
          id: `user_en_${idx}`,
          username: d.en,
          password: "1234",
          role: "editor",
          team: d.th,
          createdAt: new Date().toLocaleDateString("th-TH")
        });
      });

      // Merge into existing users (by id) and save as one document: 1 write
      const mergedMap = new Map<string, AdminUser>(dbUsers.map((u) => [u.id, u]));
      districtUsers.forEach((u) => mergedMap.set(u.id, u));
      const mergedList = Array.from(mergedMap.values());

      saveUsersLocally(mergedList);
      await setDoc(usersDocRef(), { users: mergedList });
      console.log("Seeded default district users!");
    } catch (err: any) {
      console.error("Error seeding default district users: ", err);
      if (err?.code === "resource-exhausted" || err?.message?.includes("Quota")) {
        enableLocalFallback();
      }
    }
  };


  // 3. Score/Match updates
  const handleUpdateMatch = async (id: string, updates: Partial<Match>) => {
    if (!isLoggedIn) return;

    // Local-first update
    const updatedList = matches.map((m) => m.id === id ? { ...m, ...updates } : m);
    saveMatchesLocally(updatedList);
    persistMatches(updatedList);
  };

  const handleAddMatch = async (newMatch: Omit<Match, "id" | "order">) => {
    if (!isLoggedIn) return;

    const newId = `${newMatch.sport}_custom_${Date.now()}`;
    const orderValue = matches.length > 0 ? Math.max(...matches.map(m => m.order)) + 1 : 1;
    const fullMatch: Match = {
      ...newMatch,
      id: newId,
      order: orderValue
    };

    // Local-first update
    const updatedList = [...matches, fullMatch];
    saveMatchesLocally(updatedList);
    persistMatches(updatedList);
  };

  const handleDeleteMatch = async (id: string) => {
    if (!isLoggedIn) return;

    // Local-first delete
    const updatedList = matches.filter((m) => m.id !== id);
    saveMatchesLocally(updatedList);
    persistMatches(updatedList);
  };


  // 5. User action handlers
  const handleAddUser = async (username: string, password: string, role: "admin" | "editor") => {
    if (!isLoggedIn) return;

    const newId = `user_${Date.now()}`;
    const newUser: AdminUser = {
      id: newId,
      username,
      password,
      role,
      createdAt: new Date().toLocaleDateString("th-TH")
    };

    // Local-first update
    const updatedList = [...dbUsers, newUser];
    saveUsersLocally(updatedList);

    if (!isLocalFallback) {
      try {
        await setDoc(usersDocRef(), { users: updatedList });
      } catch (error: any) {
        console.error("Error adding user: ", error);
        if (isFatalDbError(error)) enableLocalFallback();
        throw error;
      }
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!isLoggedIn) return;

    // Local-first update
    const updatedList = dbUsers.filter((u) => u.id !== id);
    saveUsersLocally(updatedList);

    if (!isLocalFallback) {
      try {
        await setDoc(usersDocRef(), { users: updatedList });
      } catch (error: any) {
        console.error("Error deleting user: ", error);
        if (isFatalDbError(error)) enableLocalFallback();
        throw error;
      }
    }
  };

  const handleUpdateUser = async (id: string, updates: Partial<AdminUser>) => {
    if (!isLoggedIn) return;

    // Local-first update
    const updatedList = dbUsers.map((u) => u.id === id ? { ...u, ...updates } : u);
    saveUsersLocally(updatedList);

    if (!isLocalFallback) {
      try {
        await setDoc(usersDocRef(), { users: updatedList });
      } catch (error: any) {
        console.error("Error updating user: ", error);
        if (isFatalDbError(error)) enableLocalFallback();
        throw error;
      }
    }
  };

  return (
    <div className={`min-h-screen ${theme === "light" ? "theme-light" : ""} bg-[#0A0F1D] text-[#E2E8F0] pb-16 selection:bg-[#FF5722] selection:text-white transition-colors duration-200`}>
      
      {/* HEADER BAR (Modern Information-Dense & Unified Navbar) */}
      <header ref={headerRef} className="bg-[#111827] border-b border-slate-800 md:sticky top-0 z-50 shadow-md print:hidden">
        {/* Top bar (Logo & Admin) */}
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="bg-[#1E293B] text-[#00FF66] px-3.5 py-1.5 text-2xl font-black italic border border-slate-700 hidden sm:block">
              P-SPORTS
            </div>
            <div className="p-2 bg-[#1E293B] border border-slate-700 flex items-center justify-center">
              <Trophy size={24} className="text-[#FF5722]" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-black uppercase leading-none tracking-tight text-white">
                PATTANI SPORTS 2026
              </h1>
              <p className="text-[9px] font-mono font-semibold text-slate-400 uppercase tracking-widest mt-1">
                ระบบจัดการแข่งขันกีฬา คป.สอ. ปัตตานีเกมส์ 2569
              </p>
            </div>
          </div>

          {/* Quick Realtime connection badge & Admin status */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="px-3.5 py-1.5 bg-[#1E293B] hover:bg-[#334155] border border-slate-800 text-xs font-black uppercase cursor-pointer rounded-none transition-all flex items-center gap-1.5 text-slate-200 hover:text-white"
              title="สลับโหมดมืด/สว่าง"
            >
              {theme === "dark" ? "☀️ โหมดสว่าง" : "🌙 โหมดมืด"}
            </button>

            {isLocalFallback ? (
              <div className="bg-[#1E293B] border border-amber-500/30 px-4 py-1.5 flex items-center font-mono text-[11px] text-amber-400">
                <span className="relative flex h-2 w-2 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                SYSTEM: <span className="text-amber-400 ml-1.5 font-bold">LOCAL SAFETY MODE 🟡</span>
              </div>
            ) : (
              <div className="bg-[#1E293B] border border-slate-800 px-4 py-1.5 flex items-center font-mono text-[11px] text-slate-300">
                <span className="relative flex h-2 w-2 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00FF66]"></span>
                </span>
                SYSTEM: <span className="text-[#00FF66] ml-1.5 font-bold">LIVE ONLINE 🟢</span>
              </div>
            )}

            {isLoggedIn ? (
              <div className="flex items-center gap-2">
                <div className="bg-[#1E293B] border border-[#00FF66]/30 px-3 py-1.5 text-xs font-bold text-[#00FF66] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-[#00FF66] rounded-full animate-pulse"></span>
                  แอดมิน (Admin)
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900 border border-red-800 text-red-400 font-bold text-xs uppercase cursor-pointer rounded-none transition-all duration-150"
                >
                  ออกจากระบบ
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="px-4 py-1.5 bg-[#FF5722] hover:bg-[#E04E1D] border-0 text-white font-black text-xs uppercase tracking-wider cursor-pointer rounded-none transition-all duration-150 flex items-center gap-1.5"
              >
                🔒 เข้าสู่ระบบ (Login)
              </button>
            )}
          </div>
        </div>

        {/* Navigation Bar (Sticky Sub-Header) */}
        <div className="bg-[#0b101c] border-b border-slate-800/30">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between overflow-x-auto scrollbar-none">
              <div className="flex items-center space-x-1 overflow-x-auto scrollbar-none w-full py-1">
                {/* Main Views */}
                {[
                  { id: "dashboard", label: "📊 สรุปเหรียญรางวัล", activeColor: "#3B82F6" },
                ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      style={{ borderBottomColor: isActive ? tab.activeColor : 'transparent' }}
                      className={`py-2 px-4 font-black text-xs uppercase tracking-wider border-b-2 rounded-none cursor-pointer transition-all whitespace-nowrap ${
                        isActive
                          ? "bg-slate-800/40 text-white"
                          : "border-transparent text-slate-400 hover:text-white hover:bg-slate-800/20"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}

                {/* Vertical Divider */}
                <div className="h-6 w-[1px] bg-slate-800 mx-2 flex-shrink-0" />

                {/* Sports Section Header (Desktop Only or Subtle badge) */}
                <span className="text-[10px] font-mono font-black text-slate-500 uppercase tracking-wider select-none px-2 hidden md:inline-block flex-shrink-0">
                  SPORTS / กีฬา:
                </span>

                {/* Sports tabs */}
                {[
                  { id: "football", label: "⚽ ฟุตบอล", activeColor: "#F43F5E" },
                  { id: "volleyball", label: "🏐 วอลเลย์บอล", activeColor: "#FF5722" },
                  { id: "petanque", label: "🥎 เปตอง", activeColor: "#10B981" },
                  { id: "track", label: "🏃 กรีฑา/วิ่ง", activeColor: "#00FF66" },
                ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      style={{ borderBottomColor: isActive ? tab.activeColor : 'transparent' }}
                      className={`py-2 px-4 font-black text-xs uppercase tracking-wider border-b-2 rounded-none cursor-pointer transition-all whitespace-nowrap ${
                        isActive
                          ? "bg-slate-800/40 text-white"
                          : "border-transparent text-slate-400 hover:text-white hover:bg-slate-800/20"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}

                {/* Vertical Divider */}
                <div className="h-6 w-[1px] bg-slate-800 mx-2 flex-shrink-0" />

                {/* Schedules & Management */}
                {[
                  { id: "my-schedule", label: "📅 ตารางแข่งรายอำเภอ", activeColor: "#F59E0B" },
                  ...(isLoggedIn && currentUser?.role === "admin" ? [
                    { id: "admins", label: "👥 จัดการผู้ดูแล", activeColor: "#A855F7" }
                  ] : [])
                ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      style={{ borderBottomColor: isActive ? tab.activeColor : 'transparent' }}
                      className={`py-2 px-4 font-black text-xs uppercase tracking-wider border-b-2 rounded-none cursor-pointer transition-all whitespace-nowrap ${
                        isActive
                          ? "bg-slate-800/40 text-white"
                          : "border-transparent text-slate-400 hover:text-white hover:bg-slate-800/20"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* LOGIN MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm border border-slate-800 bg-[#111827] p-6 space-y-4 rounded-none text-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="text-sm font-black uppercase text-white flex items-center gap-2">
                🔒 เข้าสู่ระบบผู้ดูแล (Admin Login)
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowLoginModal(false);
                  setLoginError("");
                  setUsername("");
                  setPassword("");
                }}
                className="text-slate-400 hover:text-white font-bold font-mono text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {loginError && (
                <div className="bg-red-950/40 border border-red-900/60 p-2 text-xs font-bold text-red-400 text-center">
                  {loginError}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">
                  ชื่อผู้ใช้งาน (Username)
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ระบุชื่อผู้ใช้..."
                  className="w-full p-2.5 bg-[#0A0F1D] text-white border border-slate-800 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none placeholder-slate-600"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">
                  รหัสผ่าน (Password)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="ระบุรหัสผ่าน..."
                  className="w-full p-2.5 bg-[#0A0F1D] text-white border border-slate-800 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none placeholder-slate-600"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#FF5722] hover:bg-[#E04E1D] text-white border-0 font-black text-xs tracking-wider uppercase transition-all duration-150 cursor-pointer rounded-none"
              >
                ยืนยันเข้าสู่ระบบ
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 mt-6">

        {/* District Filter Selector Card */}
        <div className="bg-[#111827] border border-slate-800 p-4 mb-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[#FF5722] text-sm animate-bounce">📍</span>
              <h4 className="font-bold text-sm text-slate-100 uppercase font-sans tracking-wider">
                เลือกอำเภอ / สังกัดเพื่อติดตามการแข่งขัน (Personalized District Filter)
              </h4>
            </div>
            <p className="text-xs text-slate-400 font-semibold leading-relaxed">
              เลือกหน่วยงาน/อำเภอของคุณ เพื่อกรองสรุปผล, ตารางสรุปเหรียญรางวัล, และโปรแกรมแข่งขันเฉพาะทีมของคุณโดยเฉพาะ
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="p-2.5 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-black focus:outline-none focus:border-[#FF5722] rounded-none min-w-[200px]"
            >
              <option value="">🏆 แสดงทุกอำเภอ / ทุกทีม</option>
              {TEAM_NAMES.map((name) => (
                <option key={name} value={name}>
                  {name === "สสจ.ปัตตานี" ? "สสจ.ปัตตานี 🏥" : `อ. ${name}`}
                </option>
              ))}
            </select>
            {selectedDistrict && (
              <button
                type="button"
                onClick={() => setSelectedDistrict("")}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-mono text-xs font-black border border-slate-700 rounded-none transition-colors cursor-pointer"
                title="ล้างตัวกรอง"
              >
                ล้าง x
              </button>
            )}
          </div>
        </div>
        
        {/* Error Notification */}
        {dbError && (
          <div className="bg-amber-950/40 border border-amber-900/60 p-4 mb-6 text-xs sm:text-sm font-bold text-amber-400 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-2.5">
              <span className="text-amber-500 shrink-0 text-base">⚠️</span>
              <div>
                <p className="text-white font-black">แจ้งเตือนระบบฐานข้อมูล (Database Notice)</p>
                <p className="mt-1 font-sans text-amber-400/90 leading-relaxed">{dbError}</p>
              </div>
            </div>
            {isLocalFallback && (
              <button
                type="button"
                onClick={() => {
                  safeLocalStorage.removeItem("pattani_local_fallback");
                  window.location.reload();
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-black text-xs uppercase tracking-wider rounded-none shrink-0 transition-all cursor-pointer border-0"
              >
                🔄 ลองเชื่อมต่อฐานข้อมูลใหม่ (Retry Cloud)
              </button>
            )}
          </div>
        )}

        {/* Loading Overlay */}
        {loading && (
          <div className="neo-card bg-[#111827] border border-slate-800 p-12 flex flex-col items-center justify-center space-y-4 text-center my-12">
            <RefreshCw size={48} className="text-[#FF5722] animate-spin" />
            <div className="space-y-1">
              <p className="font-black text-xl text-white">กำลังดึงตารางโปรแกรมจาก Firebase...</p>
              <p className="text-xs font-mono font-semibold text-slate-400">
                หากระบบใช้งานครั้งแรก จะดึงข้อมูลต้นฉบับดั้งเดิมจากไฟล์ PDF แนบโดยอัตโนมัติ
              </p>
            </div>
          </div>
        )}


        {/* Content Tabs Switcher */}
        {!loading && (
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === "dashboard" && (
                  <Dashboard 
                    matches={resolvedMatches} 
                    selectedDistrict={selectedDistrict}
                    drawLots={drawLots}
                  />
                )}

                {activeTab === "track" && (
                  <SportTab
                    sport="track"
                    matches={resolvedMatches}
                    onUpdateMatch={handleUpdateMatch}
                    onAddMatch={handleAddMatch}
                    onDeleteMatch={handleDeleteMatch}
                    isLoggedIn={isLoggedIn}
                    selectedDistrict={selectedDistrict}
                    drawLots={drawLots}
                    onUpdateDrawLots={handleUpdateDrawLots}
                  />
                )}

                {activeTab === "petanque" && (
                  <SportTab
                    sport="petanque"
                    matches={resolvedMatches}
                    onUpdateMatch={handleUpdateMatch}
                    onAddMatch={handleAddMatch}
                    onDeleteMatch={handleDeleteMatch}
                    isLoggedIn={isLoggedIn}
                    selectedDistrict={selectedDistrict}
                    drawLots={drawLots}
                    onUpdateDrawLots={handleUpdateDrawLots}
                  />
                )}

                {activeTab === "volleyball" && (
                  <SportTab
                    sport="volleyball"
                    matches={resolvedMatches}
                    onUpdateMatch={handleUpdateMatch}
                    onAddMatch={handleAddMatch}
                    onDeleteMatch={handleDeleteMatch}
                    isLoggedIn={isLoggedIn}
                    selectedDistrict={selectedDistrict}
                    drawLots={drawLots}
                    onUpdateDrawLots={handleUpdateDrawLots}
                  />
                )}

                {activeTab === "football" && (
                  <SportTab
                    sport="football"
                    matches={resolvedMatches}
                    onUpdateMatch={handleUpdateMatch}
                    onAddMatch={handleAddMatch}
                    onDeleteMatch={handleDeleteMatch}
                    isLoggedIn={isLoggedIn}
                    selectedDistrict={selectedDistrict}
                    drawLots={drawLots}
                    onUpdateDrawLots={handleUpdateDrawLots}
                  />
                )}

                {activeTab === "my-schedule" && (
                  <DistrictSchedule
                    matches={resolvedMatches}
                    selectedDistrict={selectedDistrict}
                    onSelectDistrict={setSelectedDistrict}
                    drawLots={drawLots}
                  />
                )}

                {activeTab === "admins" && isLoggedIn && currentUser?.role === "admin" && (
                  <UserManager
                    users={dbUsers}
                    onAddUser={handleAddUser}
                    onDeleteUser={handleDeleteUser}
                    onUpdateUser={handleUpdateUser}
                    isLoggedIn={isLoggedIn}
                    onResetData={resetToDefaultPDFSchedule}
                    onSeedDistrictUsers={seedDefaultDistrictUsers}
                    isResetting={isResetting}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="mt-16 pt-8 border-t border-slate-800 text-center text-xs text-slate-500 space-y-2 print:hidden">
        <p className="font-mono uppercase tracking-widest text-[10px]">
          คป.สอ. ปัตตานีเกมส์ 2569 • พัฒนาโดย กลุ่มงานสุขศึกษา รพ.ปัตตานี
        </p>
      </footer>
    </div>
  );
}

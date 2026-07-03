import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  collection, 
  onSnapshot, 
  setDoc, 
  doc, 
  deleteDoc, 
  updateDoc, 
  addDoc,
  writeBatch,
  getDocs,
  disableNetwork
} from "firebase/firestore";
import { db } from "./firebase";
import { Match, ExpenseItem, AdminUser } from "./types";
import { getInitialMatches, INITIAL_EXPENSES, TEAM_NAMES } from "./initialData";
import Dashboard from "./components/Dashboard";
import SportTab from "./components/SportTab";
import ExpenseManager from "./components/ExpenseManager";
import UserManager from "./components/UserManager";
import DistrictSchedule from "./components/DistrictSchedule";
import { calculateGroupStandings } from "./utils/calcStandings";
import { 
  Trophy, 
  Award, 
  Coins, 
  Sliders, 
  RefreshCw, 
  Flame, 
  Activity,
  Heart,
  Smile,
  ShieldAlert
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function resolveAllMatches(allMatches: Match[]): Match[] {
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
          const standings = calculateGroupStandings(allMatches, m.sport, groupName, m.category);
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
          const standings = calculateGroupStandings(allMatches, m.sport, groupName, m.category);
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

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "track" | "petanque" | "volleyball" | "football" | "admins" | "my-schedule">("dashboard");
  const [isLocalFallback, setIsLocalFallback] = useState<boolean>(() => {
    return localStorage.getItem("pattani_local_fallback") === "true";
  });
  
  const [matches, setMatches] = useState<Match[]>(() => {
    const saved = localStorage.getItem("pattani_matches");
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
            localStorage.removeItem("pattani_matches");
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

  const resolvedMatches = useMemo(() => {
    return resolveAllMatches(matches);
  }, [matches]);

  const [expenses, setExpenses] = useState<ExpenseItem[]>(() => {
    const saved = localStorage.getItem("pattani_expenses");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return INITIAL_EXPENSES;
  });

  const [dbUsers, setDbUsers] = useState<AdminUser[]>(() => {
    const saved = localStorage.getItem("pattani_users");
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
  const [dbError, setDbError] = useState<string | null>(() => {
    if (localStorage.getItem("pattani_local_fallback") === "true") {
      return "เปิดใช้งานโหมดสำรองความปลอดภัย (Local Safety Fallback Mode) เรียบร้อยแล้ว! เนื่องจากจำนวนการใช้งานคลาวด์ Firebase ฟรีส่วนกลางเกินขีดจำกัดสำหรับวันนี้ ระบบได้ปรับเข้าสู่โหมดการทำงานในเครื่องของคุณโดยอัตโนมัติ คุณสามารถแก้ไขผลคะแนนต่างๆ ได้ตามปกติ โดยข้อมูลทั้งหมดจะจัดเก็บอยู่ในเบราว์เซอร์เครื่องนี้อย่างปลอดภัย";
    }
    return null;
  });

  // Custom district filter state
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");

  // Theme state: dark or light
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("pattani_theme") as "dark" | "light") || "dark";
  });

  useEffect(() => {
    localStorage.setItem("pattani_theme", theme);
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
    return localStorage.getItem("isLoggedIn") === "true";
  });
  const [currentUser, setCurrentUser] = useState<{ username: string; role: "admin" | "editor"; team?: string } | null>(() => {
    const saved = localStorage.getItem("currentUser");
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
      localStorage.setItem("isLoggedIn", "true");
      
      const loggedInInfo = matchedUser 
        ? { username: matchedUser.username, role: matchedUser.role, team: matchedUser.team } 
        : { username: "admin", role: "admin" as const };
        
      setCurrentUser(loggedInInfo);
      localStorage.setItem("currentUser", JSON.stringify(loggedInInfo));
      
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
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("currentUser");
    if (activeTab === "admins") {
      setActiveTab("dashboard");
    }
  };

  const saveMatchesLocally = (newMatches: Match[]) => {
    const sorted = [...newMatches].sort((a, b) => a.order - b.order);
    setMatches(sorted);
    localStorage.setItem("pattani_matches", JSON.stringify(sorted));
  };

  const saveExpensesLocally = (newExpenses: ExpenseItem[]) => {
    setExpenses(newExpenses);
    localStorage.setItem("pattani_expenses", JSON.stringify(newExpenses));
  };

  const saveUsersLocally = (newUsers: AdminUser[]) => {
    setDbUsers(newUsers);
    localStorage.setItem("pattani_users", JSON.stringify(newUsers));
  };

  const enableLocalFallback = () => {
    setIsLocalFallback(true);
    localStorage.setItem("pattani_local_fallback", "true");
    setDbError(
      "เปิดใช้งานโหมดสำรองความปลอดภัย (Local Safety Fallback Mode) เรียบร้อยแล้ว! " +
      "เนื่องจากจำนวนการใช้งานคลาวด์ Firebase ฟรีส่วนกลางเกินขีดจำกัดสำหรับวันนี้ " +
      "ระบบได้ปรับเข้าสู่โหมดการทำงานในเครื่องของคุณโดยอัตโนมัติ คุณสามารถดูผลลัพธ์ ตารางการแข่งขัน " +
      "และแก้ไขผลคะแนนต่างๆ ได้ตามปกติ โดยข้อมูลทั้งหมดจะจัดเก็บอยู่ในเบราว์เซอร์เครื่องนี้อย่างปลอดภัย"
    );
    
    // Auto-seed local matches if current matches list is empty
    if (matches.length === 0) {
      saveMatchesLocally(getInitialMatches());
    }

    disableNetwork(db).catch((err) => {
      console.log("Failed to disable Firestore network in enableLocalFallback: ", err);
    });
  };

  // Turn off Firestore network if local fallback is active to completely silence Quota / Connection errors
  useEffect(() => {
    if (localStorage.getItem("pattani_local_fallback") === "true" || isLocalFallback) {
      disableNetwork(db).catch((err) => {
        console.log("Failed to disable Firestore network on mount: ", err);
      });
    }
  }, [isLocalFallback]);

  // 1. Sync matches and expenses from Firestore
  useEffect(() => {
    // If we're already marked as local fallback, don't block with loading spinner
    if (localStorage.getItem("pattani_local_fallback") === "true" || isLocalFallback) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setDbError(null);

    let unsubscribeMatches = () => {};
    let unsubscribeExpenses = () => {};
    let unsubscribeUsers = () => {};

    // 3-second timeout to fall back locally if Firestore is slow or quota-exceeded
    const timeoutId = setTimeout(() => {
      console.warn("Firestore connection timed out (3s). Enabling local fallback.");
      enableLocalFallback();
      setLoading(false);
    }, 3000);

    try {
      // Sync matches
      unsubscribeMatches = onSnapshot(
        collection(db, "matches"),
        async (snapshot) => {
          clearTimeout(timeoutId);
          if (snapshot.empty) {
            console.log("Firestore matches collection is empty. Auto-seeding default matches...");
            const defaultMatches = getInitialMatches();
            try {
              const batch = writeBatch(db);
              defaultMatches.forEach((m) => {
                batch.set(doc(db, "matches", m.id), m);
              });
              await batch.commit();
              console.log("Auto-seeded matches collection successfully!");
            } catch (err) {
              console.error("Auto-seed matches error: ", err);
            }
            return;
          }

          const matchesList: Match[] = [];
          snapshot.forEach((docSnap) => {
            matchesList.push({ ...docSnap.data() } as Match);
          });

          const isThanyarak = (name: string | null | undefined) => {
            if (!name) return false;
            return name.includes("ธัญ");
          };

          let needsFirestoreSync = false;
          const pendingUpdates: { id: string; data: Match }[] = [];

          // Filter out "ธัญรักษ์" / "ธัญญารักษ์" matches, football matches for 3rd place, and any corrupted petanque IDs from previous versions
          const cleanedMatchesList = matchesList
            .filter(m => m.id && !m.id.startsWith("petanque_ทั_") && !m.id.startsWith("petanque_ที_"))
            .filter(m => !isThanyarak(m.teamA) && !isThanyarak(m.teamB))
            .filter(m => !(m.sport === "football" && m.round === "ชิงที่ 3"))
            .map(m => {
              let updated = false;
              let participants = m.participants;
              if (participants && participants.some(p => isThanyarak(p))) {
                participants = participants.filter(p => !isThanyarak(p));
                updated = true;
              }
              let ranks = m.ranks;
              if (ranks) {
                const originalLength = ranks.length;
                ranks = ranks.filter(r => !isThanyarak(r.name));
                if (ranks.length !== originalLength) {
                  updated = true;
                }
              }
              if (updated) {
                const updatedMatch = { ...m, participants, ranks };
                needsFirestoreSync = true;
                pendingUpdates.push({ id: m.id, data: updatedMatch });
                return updatedMatch;
              }
              return m;
            });

          // Deduplicate matches list by unique ID to be absolutely sure there are no duplicates in the application state
          const uniqueMatchesMap = new Map<string, Match>();
          cleanedMatchesList.forEach((m) => {
            if (m.id) {
              uniqueMatchesMap.set(m.id, m);
            }
          });
          let finalMatchesList = Array.from(uniqueMatchesMap.values());

          // Write updates to Firestore if logged in
          if (needsFirestoreSync && !isLocalFallback && isLoggedIn) {
            try {
              const batch = writeBatch(db);
              pendingUpdates.forEach((upd) => {
                batch.set(doc(db, "matches", upd.id), upd.data);
              });
              await batch.commit();
              console.log("Successfully migrated football matches and cleaned up Thanyarak!");
            } catch (err) {
              console.error("Failed to sync migrated matches to Firestore: ", err);
            }
          }

          const sortedList = finalMatchesList.sort((a, b) => a.order - b.order);
          saveMatchesLocally(sortedList);
          setLoading(false);
        },
        (error: any) => {
          clearTimeout(timeoutId);
          console.error("Firestore matches subscription error: ", error);
          if (error?.code === "resource-exhausted" || error?.message?.includes("Quota")) {
            enableLocalFallback();
          } else {
            setDbError("การเชื่อมต่อฐานข้อมูลล้มเหลว กำลังใช้ฐานข้อมูลในตัวเครื่องชั่วคราว");
          }
          setLoading(false);
        }
      );

      // Sync expenses
      unsubscribeExpenses = onSnapshot(
        collection(db, "expenses"),
        async (snapshot) => {
          const expensesList: ExpenseItem[] = [];
          snapshot.forEach((docSnap) => {
            expensesList.push({ id: docSnap.id, ...docSnap.data() } as ExpenseItem);
          });

          saveExpensesLocally(expensesList);
        },
        (error: any) => {
          console.error("Firestore expenses subscription error: ", error);
          if (error?.code === "resource-exhausted" || error?.message?.includes("Quota")) {
            enableLocalFallback();
          }
        }
      );

      // Sync users
      unsubscribeUsers = onSnapshot(
        collection(db, "users"),
        async (snapshot) => {
          const usersList: AdminUser[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            usersList.push({
              id: docSnap.id,
              username: data.username || "",
              password: data.password || "",
              role: data.role || "editor",
              createdAt: data.createdAt || "",
              team: data.team || ""
            });
          });
          
          saveUsersLocally(usersList);
        },
        (error: any) => {
          console.error("Firestore users subscription error: ", error);
          if (error?.code === "resource-exhausted" || error?.message?.includes("Quota")) {
            enableLocalFallback();
          }
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
      unsubscribeExpenses();
      unsubscribeUsers();
    };
  }, [db, isResetting, isLocalFallback]);

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
        // Fetch all existing match docs first
        const matchesSnap = await getDocs(collection(db, "matches"));
        const batch = writeBatch(db);

        // Delete existing
        matchesSnap.forEach((d) => {
          batch.delete(doc(db, "matches", d.id));
        });
        await batch.commit();

        // Write new initial data in chunks (Firestore limit is 500 per batch)
        const chunkSize = 200;
        for (let i = 0; i < defaultMatches.length; i += chunkSize) {
          const chunk = defaultMatches.slice(i, i + chunkSize);
          const writeBatchInstance = writeBatch(db);
          chunk.forEach((match) => {
            const matchRef = doc(db, "matches", match.id);
            writeBatchInstance.set(matchRef, match);
          });
          await writeBatchInstance.commit();
        }

        console.log("Seeded matches collection successfully!");
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

  const seedDefaultExpenses = async () => {
    if (isLocalFallback) return;
    try {
      const batch = writeBatch(db);
      INITIAL_EXPENSES.forEach((item) => {
        const expRef = doc(db, "expenses", item.id);
        batch.set(expRef, item);
      });
      await batch.commit();
    } catch (err: any) {
      console.error("Error seeding default expenses: ", err);
      if (err?.code === "resource-exhausted" || err?.message?.includes("Quota")) {
        enableLocalFallback();
      }
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
      const batch = writeBatch(db);
      districts.forEach((d, idx) => {
        // Thai username
        const thId = `user_th_${idx}`;
        batch.set(doc(db, "users", thId), {
          id: thId,
          username: d.th,
          password: "1234",
          role: "editor",
          team: d.th,
          createdAt: new Date().toLocaleDateString("th-TH")
        });

        // English username
        const enId = `user_en_${idx}`;
        batch.set(doc(db, "users", enId), {
          id: enId,
          username: d.en,
          password: "1234",
          role: "editor",
          team: d.th,
          createdAt: new Date().toLocaleDateString("th-TH")
        });
      });
      await batch.commit();
      console.log("Seeded default district users!");
    } catch (err: any) {
      console.error("Error seeding default district users: ", err);
      if (err?.code === "resource-exhausted" || err?.message?.includes("Quota")) {
        enableLocalFallback();
      }
    }
  };

  const resetExpenses = async () => {
    if (!isLoggedIn) return;
    
    // Reset locally first
    saveExpensesLocally(INITIAL_EXPENSES);

    if (!isLocalFallback) {
      try {
        // Delete existing
        const snap = await getDocs(collection(db, "expenses"));
        const batch = writeBatch(db);
        snap.forEach((d) => {
          batch.delete(doc(db, "expenses", d.id));
        });
        await batch.commit();
        await seedDefaultExpenses();
      } catch (err: any) {
        console.error("Error resetting expenses: ", err);
        if (err?.code === "resource-exhausted" || err?.message?.includes("Quota")) {
          enableLocalFallback();
        }
      }
    }
  };

  // 3. Score/Match updates
  const handleUpdateMatch = async (id: string, updates: Partial<Match>) => {
    if (!isLoggedIn) return;

    // Local-first update
    const updatedList = matches.map((m) => m.id === id ? { ...m, ...updates } : m);
    saveMatchesLocally(updatedList);

    if (!isLocalFallback) {
      try {
        const matchRef = doc(db, "matches", id);
        await updateDoc(matchRef, updates);
      } catch (error: any) {
        console.error("Error updating match in Firestore: ", error);
        if (error?.code === "resource-exhausted" || error?.message?.includes("Quota")) {
          enableLocalFallback();
        }
      }
    }
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

    if (!isLocalFallback) {
      try {
        await setDoc(doc(db, "matches", newId), fullMatch);
      } catch (error: any) {
        console.error("Error adding match in Firestore: ", error);
        if (error?.code === "resource-exhausted" || error?.message?.includes("Quota")) {
          enableLocalFallback();
        }
      }
    }
  };

  const handleDeleteMatch = async (id: string) => {
    if (!isLoggedIn) return;

    // Local-first delete
    const updatedList = matches.filter((m) => m.id !== id);
    saveMatchesLocally(updatedList);

    if (!isLocalFallback) {
      try {
        await deleteDoc(doc(db, "matches", id));
      } catch (error: any) {
        console.error("Error deleting match in Firestore: ", error);
        if (error?.code === "resource-exhausted" || error?.message?.includes("Quota")) {
          enableLocalFallback();
        }
      }
    }
  };

  // 4. Budget/Expenses actions
  const handleAddExpense = async (item: Omit<ExpenseItem, "id" | "total">) => {
    if (!isLoggedIn) return;

    const total = item.quantity * item.pricePerUnit;
    const newId = `exp_custom_${Date.now()}`;
    const newExpense: ExpenseItem = {
      id: newId,
      name: item.name,
      quantity: item.quantity,
      pricePerUnit: item.pricePerUnit,
      total
    };

    // Local-first update
    const updatedList = [...expenses, newExpense];
    saveExpensesLocally(updatedList);

    if (!isLocalFallback) {
      try {
        await setDoc(doc(db, "expenses", newId), {
          name: item.name,
          quantity: item.quantity,
          pricePerUnit: item.pricePerUnit,
          total
        });
      } catch (error: any) {
        console.error("Error adding expense: ", error);
        if (error?.code === "resource-exhausted" || error?.message?.includes("Quota")) {
          enableLocalFallback();
        }
      }
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!isLoggedIn) return;

    // Local-first update
    const updatedList = expenses.filter((e) => e.id !== id);
    saveExpensesLocally(updatedList);

    if (!isLocalFallback) {
      try {
        await deleteDoc(doc(db, "expenses", id));
      } catch (error: any) {
        console.error("Error deleting expense: ", error);
        if (error?.code === "resource-exhausted" || error?.message?.includes("Quota")) {
          enableLocalFallback();
        }
      }
    }
  };

  const handleUpdateExpense = async (id: string, updates: Partial<ExpenseItem>) => {
    if (!isLoggedIn) return;

    // Local-first update
    const updatedList = expenses.map((e) => {
      if (e.id === id) {
        const merged = { ...e, ...updates };
        if (updates.quantity !== undefined || updates.pricePerUnit !== undefined) {
          merged.total = merged.quantity * merged.pricePerUnit;
        }
        return merged;
      }
      return e;
    });
    saveExpensesLocally(updatedList);

    if (!isLocalFallback) {
      try {
        await updateDoc(doc(db, "expenses", id), updates);
      } catch (error: any) {
        console.error("Error updating expense: ", error);
        if (error?.code === "resource-exhausted" || error?.message?.includes("Quota")) {
          enableLocalFallback();
        }
      }
    }
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
        await setDoc(doc(db, "users", newId), {
          id: newId,
          username,
          password,
          role,
          createdAt: newUser.createdAt
        });
      } catch (error: any) {
        console.error("Error adding user: ", error);
        if (error?.code === "resource-exhausted" || error?.message?.includes("Quota")) {
          enableLocalFallback();
        }
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
        await deleteDoc(doc(db, "users", id));
      } catch (error: any) {
        console.error("Error deleting user: ", error);
        if (error?.code === "resource-exhausted" || error?.message?.includes("Quota")) {
          enableLocalFallback();
        }
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
        await updateDoc(doc(db, "users", id), updates);
      } catch (error: any) {
        console.error("Error updating user: ", error);
        if (error?.code === "resource-exhausted" || error?.message?.includes("Quota")) {
          enableLocalFallback();
        }
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

            <div className="bg-[#1E293B] border border-slate-800 px-4 py-1.5 flex items-center font-mono text-[11px] text-slate-300">
              <span className="relative flex h-2 w-2 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00FF66]"></span>
              </span>
              SYSTEM: <span className="text-[#00FF66] ml-1.5 font-bold">LIVE ONLINE 🟢</span>
            </div>

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
                  />
                )}

                {activeTab === "my-schedule" && (
                  <DistrictSchedule
                    matches={resolvedMatches}
                    selectedDistrict={selectedDistrict}
                    onSelectDistrict={setSelectedDistrict}
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

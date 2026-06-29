import React, { useState, useEffect } from "react";
import { 
  collection, 
  onSnapshot, 
  setDoc, 
  doc, 
  deleteDoc, 
  updateDoc, 
  addDoc,
  writeBatch,
  getDocs
} from "firebase/firestore";
import { db } from "./firebase";
import { Match, ExpenseItem, AdminUser } from "./types";
import { getInitialMatches, INITIAL_EXPENSES, TEAM_NAMES } from "./initialData";
import Dashboard from "./components/Dashboard";
import SportTab from "./components/SportTab";
import ExpenseManager from "./components/ExpenseManager";
import UserManager from "./components/UserManager";
import DistrictSchedule from "./components/DistrictSchedule";
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

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "track" | "petanque" | "volleyball" | "football" | "admins" | "my-schedule">("dashboard");
  const [matches, setMatches] = useState<Match[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [dbUsers, setDbUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // Custom district filter state
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");

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

  // 1. Sync matches and expenses from Firestore
  useEffect(() => {
    setLoading(true);
    setDbError(null);

    // Sync matches
    const unsubscribeMatches = onSnapshot(
      collection(db, "matches"),
      async (snapshot) => {
        const matchesList: Match[] = [];
        snapshot.forEach((doc) => {
          matchesList.push({ ...doc.data() } as Match);
        });

        const isThanyarak = (name: string | null | undefined) => {
          if (!name) return false;
          return name.includes("ธัญ");
        };

        // Filter out "ธัญรักษ์" / "ธัญญารักษ์" matches and clean up ranks/participants client-side
        const cleanedMatchesList = matchesList
          .filter(m => !isThanyarak(m.teamA) && !isThanyarak(m.teamB))
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
            return updated ? { ...m, participants, ranks } : m;
          });

        // Background database cleanup if any "ธัญ" team is found in the database
        const hasThanyarak = matchesList.some(
          m => isThanyarak(m.teamA) || 
               isThanyarak(m.teamB) || 
               (m.participants && m.participants.some(p => isThanyarak(p))) ||
               (m.ranks && m.ranks.some(r => isThanyarak(r.name)))
        );

        if (hasThanyarak && !isResetting) {
          const runHealing = async () => {
            console.log("Self-healing: removing 'ธัญรักษ์/ธัญญารักษ์' from Firestore...");
            const toDelete: string[] = [];
            const toUpdate: { id: string; updates: Partial<Match> }[] = [];

            matchesList.forEach(m => {
              if (isThanyarak(m.teamA) || isThanyarak(m.teamB)) {
                toDelete.push(m.id);
              } else {
                let updated = false;
                const updates: Partial<Match> = {};

                if (m.participants && m.participants.some(p => isThanyarak(p))) {
                  updates.participants = m.participants.filter(p => !isThanyarak(p));
                  updated = true;
                }

                if (m.ranks && m.ranks.some(r => isThanyarak(r.name))) {
                  updates.ranks = m.ranks.filter(r => !isThanyarak(r.name));
                  updated = true;
                }

                if (updated) {
                  toUpdate.push({ id: m.id, updates });
                }
              }
            });

            try {
              const batch = writeBatch(db);
              toDelete.forEach(id => {
                batch.delete(doc(db, "matches", id));
              });
              toUpdate.forEach(({ id, updates }) => {
                batch.update(doc(db, "matches", id), updates);
              });
              await batch.commit();
              console.log("Self-healing successful!");
            } catch (err) {
              console.error("Self-healing error: ", err);
            }
          };
          runHealing();
        }

        // General Self-Healing and Synchronizer to keep Firestore in sync with initialData.ts
        const defaultMatches = getInitialMatches();
        const defaultMatchesMap = new Map(defaultMatches.map(dm => [dm.id, dm]));

        const obsoleteMatches = matchesList.filter(m => !defaultMatchesMap.has(m.id));
        const matchesInDbIds = new Set(matchesList.map(m => m.id));
        const missingMatches = defaultMatches.filter(dm => !matchesInDbIds.has(dm.id));

        const mismatchedMatches = matchesList.filter(m => {
          const defM = defaultMatchesMap.get(m.id);
          if (defM) {
            return (
              defM.teamA !== m.teamA ||
              defM.teamB !== m.teamB ||
              defM.group !== m.group ||
              defM.court !== m.court ||
              defM.time !== m.time ||
              defM.sport !== m.sport ||
              defM.category !== m.category ||
              defM.gender !== m.gender ||
              defM.round !== m.round ||
              defM.date !== m.date
            );
          }
          return false;
        });

        const needsSyncHealing = obsoleteMatches.length > 0 || missingMatches.length > 0 || mismatchedMatches.length > 0;

        if (needsSyncHealing && !isResetting) {
          const runSyncHealing = async () => {
            console.log("Self-healing: Synchronizing database matches with defined schedule...");
            try {
              const batch = writeBatch(db);

              // Delete obsolete matches
              obsoleteMatches.forEach(m => {
                console.log(`Deleting obsolete match: ${m.id}`);
                batch.delete(doc(db, "matches", m.id));
              });

              // Add missing matches
              missingMatches.forEach(dm => {
                console.log(`Adding missing match: ${dm.id}`);
                batch.set(doc(db, "matches", dm.id), dm);
              });

              // Update mismatched matches (preserve score/status/winner/sets/remarks/etc.)
              mismatchedMatches.forEach(m => {
                console.log(`Updating mismatched match: ${m.id}`);
                const defM = defaultMatchesMap.get(m.id)!;
                batch.update(doc(db, "matches", m.id), {
                  teamA: defM.teamA,
                  teamB: defM.teamB,
                  group: defM.group,
                  court: defM.court,
                  time: defM.time,
                  sport: defM.sport,
                  category: defM.category,
                  gender: defM.gender,
                  round: defM.round,
                  date: defM.date,
                  order: defM.order
                });
              });

              await batch.commit();
              console.log("Database self-healing/synchronization completed successfully!");
            } catch (err) {
              console.error("Database self-healing error: ", err);
            }
          };
          runSyncHealing();
        }

        // If collection is completely empty, auto-populate with PDF data
        if (snapshot.empty && !isResetting) {
          console.log("No matches found in Firestore. Populating with initial data...");
          try {
            await resetToDefaultPDFSchedule(true);
          } catch (err: any) {
            console.error("Error populating default matches: ", err);
            setDbError(err.message || "Failed to seed default matches database");
          }
        } else {
          setMatches(cleanedMatchesList.sort((a, b) => a.order - b.order));
          setLoading(false);
        }
      },
      (error) => {
        console.error("Firestore matches subscription error: ", error);
        setDbError("การเชื่อมต่อฐานข้อมูลล้มเหลว กรุณาตรวจสอบการตั้งค่า Firebase");
        setLoading(false);
      }
    );

    // Sync expenses
    const unsubscribeExpenses = onSnapshot(
      collection(db, "expenses"),
      async (snapshot) => {
        const expensesList: ExpenseItem[] = [];
        snapshot.forEach((doc) => {
          expensesList.push({ id: doc.id, ...doc.data() } as ExpenseItem);
        });

        // If empty, auto-populate
        if (snapshot.empty && !isResetting) {
          try {
            await seedDefaultExpenses();
          } catch (err) {
            console.error("Error populating default expenses: ", err);
          }
        } else {
          setExpenses(expensesList);
        }
      },
      (error) => {
        console.error("Firestore expenses subscription error: ", error);
      }
    );

    // Sync users
    const unsubscribeUsers = onSnapshot(
      collection(db, "users"),
      async (snapshot) => {
        const usersList: AdminUser[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          usersList.push({
            id: doc.id,
            username: data.username || "",
            password: data.password || "",
            role: data.role || "editor",
            createdAt: data.createdAt || "",
            team: data.team || ""
          });
        });
        
        if (snapshot.empty && !isResetting) {
          console.log("No users found in Firestore. Populating with initial district users...");
          try {
            await seedDefaultDistrictUsers();
          } catch (err) {
            console.error("Error auto-seeding users: ", err);
          }
        } else {
          setDbUsers(usersList);
        }
      },
      (error) => {
        console.error("Firestore users subscription error: ", error);
      }
    );

    return () => {
      unsubscribeMatches();
      unsubscribeExpenses();
      unsubscribeUsers();
    };
  }, []);

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
      const defaultMatches = getInitialMatches();
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
      setDbError(err.message || "เกิดข้อผิดพลาดขณะบันทึกข้อมูลตารางการแข่งขัน");
    } finally {
      setIsResetting(false);
      setLoading(false);
    }
  };

  const seedDefaultExpenses = async () => {
    const batch = writeBatch(db);
    INITIAL_EXPENSES.forEach((item) => {
      const expRef = doc(db, "expenses", item.id);
      batch.set(expRef, item);
    });
    await batch.commit();
  };

  const seedDefaultDistrictUsers = async () => {
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
    } catch (err) {
      console.error("Error seeding default district users: ", err);
    }
  };

  const resetExpenses = async () => {
    if (!isLoggedIn) return;
    // Delete existing
    const snap = await getDocs(collection(db, "expenses"));
    const batch = writeBatch(db);
    snap.forEach((d) => {
      batch.delete(doc(db, "expenses", d.id));
    });
    await batch.commit();
    await seedDefaultExpenses();
  };

  // 3. Score/Match updates
  const handleUpdateMatch = async (id: string, updates: Partial<Match>) => {
    if (!isLoggedIn) return;
    try {
      const matchRef = doc(db, "matches", id);
      await updateDoc(matchRef, updates);
    } catch (error) {
      console.error("Error updating match in Firestore: ", error);
    }
  };

  const handleAddMatch = async (newMatch: Omit<Match, "id" | "order">) => {
    if (!isLoggedIn) return;
    try {
      const newId = `${newMatch.sport}_custom_${Date.now()}`;
      const orderValue = matches.length > 0 ? Math.max(...matches.map(m => m.order)) + 1 : 1;
      const fullMatch: Match = {
        ...newMatch,
        id: newId,
        order: orderValue
      };
      await setDoc(doc(db, "matches", newId), fullMatch);
    } catch (error) {
      console.error("Error adding match in Firestore: ", error);
    }
  };

  // 4. Budget/Expenses actions
  const handleAddExpense = async (item: Omit<ExpenseItem, "id" | "total">) => {
    if (!isLoggedIn) return;
    try {
      const total = item.quantity * item.pricePerUnit;
      const newId = `exp_custom_${Date.now()}`;
      await setDoc(doc(db, "expenses", newId), {
        name: item.name,
        quantity: item.quantity,
        pricePerUnit: item.pricePerUnit,
        total
      });
    } catch (error) {
      console.error("Error adding expense: ", error);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!isLoggedIn) return;
    try {
      await deleteDoc(doc(db, "expenses", id));
    } catch (error) {
      console.error("Error deleting expense: ", error);
    }
  };

  const handleUpdateExpense = async (id: string, updates: Partial<ExpenseItem>) => {
    if (!isLoggedIn) return;
    try {
      await updateDoc(doc(db, "expenses", id), updates);
    } catch (error) {
      console.error("Error updating expense: ", error);
    }
  };

  // 5. User action handlers
  const handleAddUser = async (username: string, password: string, role: "admin" | "editor") => {
    if (!isLoggedIn) return;
    try {
      const newId = `user_${Date.now()}`;
      await setDoc(doc(db, "users", newId), {
        id: newId,
        username,
        password,
        role,
        createdAt: new Date().toLocaleDateString("th-TH")
      });
    } catch (error: any) {
      console.error("Error adding user: ", error);
      throw error;
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!isLoggedIn) return;
    try {
      await deleteDoc(doc(db, "users", id));
    } catch (error: any) {
      console.error("Error deleting user: ", error);
      throw error;
    }
  };

  const handleUpdateUser = async (id: string, updates: Partial<AdminUser>) => {
    if (!isLoggedIn) return;
    try {
      await updateDoc(doc(db, "users", id), updates);
    } catch (error: any) {
      console.error("Error updating user: ", error);
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1D] text-[#E2E8F0] pb-16 selection:bg-[#FF5722] selection:text-white">
      
      {/* HEADER BAR (Modern Information-Dense) */}
      <header className="bg-[#111827] border-b border-slate-800 py-3.5 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
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

      {/* NAVIGATION TABS (Flat, Sharp-Angled) */}
      <nav className="max-w-7xl mx-auto px-4 mt-8">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "dashboard", label: "📊 สรุปเหรียญรางวัล", accent: "border-t-[#3B82F6]" },
            { id: "football", label: "⚽ ฟุตบอล", accent: "border-t-rose-500" },
            { id: "volleyball", label: "🏐 วอลเลย์บอล", accent: "border-t-[#FF5722]" },
            { id: "petanque", label: "🥎 เปตอง", accent: "border-t-[#10B981]" },
            { id: "track", label: "🏃 กรีฑา/วิ่ง", accent: "border-t-[#00FF66]" },
            { id: "my-schedule", label: "📅 ตารางแข่งรายอำเภอ", accent: "border-t-amber-500" },
            ...(isLoggedIn && currentUser?.role === "admin" ? [
              { id: "admins", label: "👥 จัดการผู้ดูแล", accent: "border-t-purple-500" }
            ] : [])
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-3.5 font-bold text-xs uppercase tracking-wider border-x border-b border-slate-800 border-t-2 rounded-none cursor-pointer transition-all ${tab.accent} ${
                  isActive 
                    ? "bg-[#1E293B] text-white border-b-transparent border-x-slate-700" 
                    : "bg-[#111827] text-slate-400 hover:text-white hover:bg-slate-800/40"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 mt-6">

        {/* District Filter Selector Card */}
        <div className="bg-[#111827] border border-slate-800 p-4 mb-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
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
          <div className="neo-card bg-red-950/40 border border-red-900/60 p-4 mb-6 flex items-start gap-3">
            <ShieldAlert size={24} className="text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-red-200">เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล</h4>
              <p className="text-xs font-medium text-red-300 leading-relaxed">{dbError}</p>
            </div>
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
                    matches={matches} 
                    onResetData={() => resetToDefaultPDFSchedule(false)} 
                    isResetting={isResetting}
                    selectedDistrict={selectedDistrict}
                  />
                )}

                {activeTab === "track" && (
                  <SportTab
                    sport="track"
                    matches={matches}
                    onUpdateMatch={handleUpdateMatch}
                    onAddMatch={handleAddMatch}
                    isLoggedIn={isLoggedIn}
                    selectedDistrict={selectedDistrict}
                  />
                )}

                {activeTab === "petanque" && (
                  <SportTab
                    sport="petanque"
                    matches={matches}
                    onUpdateMatch={handleUpdateMatch}
                    onAddMatch={handleAddMatch}
                    isLoggedIn={isLoggedIn}
                    selectedDistrict={selectedDistrict}
                  />
                )}

                {activeTab === "volleyball" && (
                  <SportTab
                    sport="volleyball"
                    matches={matches}
                    onUpdateMatch={handleUpdateMatch}
                    onAddMatch={handleAddMatch}
                    isLoggedIn={isLoggedIn}
                    selectedDistrict={selectedDistrict}
                  />
                )}

                {activeTab === "football" && (
                  <SportTab
                    sport="football"
                    matches={matches}
                    onUpdateMatch={handleUpdateMatch}
                    onAddMatch={handleAddMatch}
                    isLoggedIn={isLoggedIn}
                    selectedDistrict={selectedDistrict}
                  />
                )}

                {activeTab === "my-schedule" && (
                  <DistrictSchedule
                    matches={matches}
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
                    onSeedDistrictUsers={seedDefaultDistrictUsers}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="mt-16 pt-8 border-t border-slate-800 text-center text-xs text-slate-500 space-y-2">
        <p className="font-mono uppercase tracking-widest text-[10px]">
          คป.สอ. ปัตตานีเกมส์ 2569 • พัฒนาโดย กลุ่มงานสุขศึกษา รพ.ปัตตานี
        </p>
      </footer>
    </div>
  );
}

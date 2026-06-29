export interface Participant {
  name: string;
  rank?: number;
  time?: string;
  score?: number;
}

export interface Match {
  id: string; // unique ID, e.g., 'track_101', 'petanque_men_1'
  sport: "track" | "petanque" | "volleyball" | "football";
  category: string; // e.g., 'วิ่ง 100 เมตร หญิง', 'ชายคู่', 'ทีมชาย'
  gender: "ชาย" | "หญิง" | "ผสม";
  group: string; // e.g., 'กลุ่ม 1', 'สาย A', or '' for brackets
  round: string; // 'รอบแรก' | 'รอบคัดเลือก' | 'รอบ 8 ทีม' | 'รอบรองชนะเลิศ' | 'รอบชิงชนะเลิศ' | 'ชิงที่ 3'
  court: string; // 'สนามที่ 1', 'สนาม อบจ.', etc.
  time: string; // e.g., '09.00 น.'
  date: string; // e.g., '6 ก.ค. 69'
  status: "pending" | "live" | "completed";
  
  // For dual sports (Petanque, Volleyball, Football)
  teamA?: string;
  teamB?: string;
  scoreA?: number | null;
  scoreB?: number | null;
  winner?: string | null;
  sets?: { scoreA: number; scoreB: number }[]; // For volleyball (e.g. set scores)

  // For Track & Field (many participants in one heat/run)
  participants?: string[]; // e.g., ['ไม้แก่น', 'ทุ่งยางแดง', 'สสจ.']
  ranks?: Participant[]; // Result ranking: [{name: 'สายบุรี', rank: 1}, {name: 'มายอ', rank: 2}]
  
  order: number; // For sorting
}

export interface TeamStanding {
  team: string;
  played: number;
  won: number;
  lost: number;
  points: number;
  scoreDiff: number; // For tie breakers
}

export interface Medal {
  team: string;
  gold: number;
  silver: number;
  bronze: number;
}

export interface ExpenseItem {
  id: string;
  name: string;
  quantity: number;
  pricePerUnit: number;
  total: number;
}

export interface AdminUser {
  id: string;
  username: string;
  password?: string;
  role: "admin" | "editor";
  createdAt: string;
  team?: string;
}

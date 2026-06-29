import React, { useState } from "react";
import { ExpenseItem } from "../types";
import { 
  PlusCircle, 
  Trash2, 
  Coins, 
  TrendingUp, 
  Sliders, 
  Layers,
  Sparkles,
  Award
} from "lucide-react";

interface ExpenseManagerProps {
  expenses: ExpenseItem[];
  onAddExpense: (item: Omit<ExpenseItem, "id" | "total">) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
  onUpdateExpense: (id: string, updates: Partial<ExpenseItem>) => Promise<void>;
  onResetExpenses: () => Promise<void>;
  isLoggedIn: boolean;
}

export default function ExpenseManager({
  expenses,
  onAddExpense,
  onDeleteExpense,
  onUpdateExpense,
  onResetExpenses,
  isLoggedIn
}: ExpenseManagerProps) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [pricePerUnit, setPricePerUnit] = useState(10);
  const [isAdding, setIsAdding] = useState(false);

  const totalExpense = expenses.reduce((sum, item) => sum + item.total, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsAdding(true);
    await onAddExpense({
      name,
      quantity,
      pricePerUnit
    });

    setName("");
    setQuantity(1);
    setPricePerUnit(10);
    setIsAdding(false);
  };

  const handleUpdate = async (id: string, q: number, p: number) => {
    const total = q * p;
    await onUpdateExpense(id, {
      quantity: q,
      pricePerUnit: p,
      total
    });
  };

  return (
    <div className="space-y-8" id="budget-section">
      {/* Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Total Card */}
        <div className="border border-slate-800 bg-[#111827] text-white p-6 flex flex-col justify-between space-y-4 rounded-none">
          <div className="flex items-center gap-2">
            <Coins size={24} className="text-[#FF5722]" />
            <span className="font-mono text-xs font-black uppercase text-slate-400 tracking-wider">
              งบประมาณใช้จ่ายรวม (ทั้งหมด)
            </span>
          </div>
          <div>
            <span className="text-4xl font-black text-white">
              {totalExpense.toLocaleString()}
            </span>
            <span className="text-sm font-black font-mono ml-2 text-[#00FF66]">บาท</span>
          </div>
          <p className="text-xs font-mono font-semibold text-slate-400">
            คำนวณจากค่าใช้จ่ายวัสดุ อุปกรณ์ และการเตรียมสถานที่จัดแข่งขัน
          </p>
        </div>

        {/* Info Card 1 */}
        <div className="border border-slate-800 bg-[#111827] p-6 flex flex-col justify-between rounded-none text-white">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Award size={20} className="text-[#FF5722]" />
              <h3 className="text-base font-black uppercase tracking-wide">เอกสารอ้างอิง PDF</h3>
            </div>
            <p className="text-xs font-mono font-semibold text-slate-400 leading-relaxed">
              ประมาณการค่าวัสดุดั้งเดิมจากเอกสารของคณะกรรมการจัดแข่งขัน คป.สอ. ประจำปี 2569 
              ยอดรวมเริ่มต้น 790 บาท สำหรับการแข่งขันเปตอง และกรีฑา
            </p>
          </div>
          {isLoggedIn && (
            <button
              onClick={onResetExpenses}
              className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold text-xs tracking-wider uppercase transition-all duration-150 cursor-pointer self-start rounded-none mt-4"
            >
              โหลดค่าวัสดุเริ่มต้นจาก PDF
            </button>
          )}
        </div>

        {/* Add Expense Form Card */}
        {isLoggedIn ? (
          <div className="border border-[#FF5722]/60 bg-[#1E293B] p-6 rounded-none text-white">
            <h3 className="text-base font-black uppercase tracking-wide flex items-center gap-2 mb-4 text-[#FF5722]">
              <PlusCircle size={18} />
              เพิ่มรายการค่าใช้จ่าย
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">ชื่อรายการวัสดุ/อุปกรณ์</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น น้ำดื่ม, ป้ายสแตนด์เชียร์"
                  className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none placeholder-slate-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">จำนวน</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold font-mono focus:outline-none focus:border-[#FF5722] rounded-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">ราคาต่อหน่วย</label>
                  <input
                    type="number"
                    min="0"
                    value={pricePerUnit}
                    onChange={(e) => setPricePerUnit(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold font-mono focus:outline-none focus:border-[#FF5722] rounded-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isAdding}
                className="w-full py-2 bg-[#FF5722] hover:bg-[#E04E1D] text-white border-0 font-bold text-xs uppercase tracking-wider transition-all duration-150 cursor-pointer disabled:opacity-50 rounded-none"
              >
                {isAdding ? "กำลังบันทึก..." : "เพิ่มรายการ (+)"}
              </button>
            </form>
          </div>
        ) : (
          <div className="border border-slate-800 bg-[#111827] p-6 rounded-none text-white flex flex-col justify-center items-center text-center space-y-4">
            <div className="p-3 bg-slate-900 border border-slate-800 text-[#FF5722] flex items-center justify-center">
              <PlusCircle size={28} />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black uppercase tracking-wide">จัดการงบประมาณค่าใช้จ่าย</h3>
              <p className="text-[11px] font-semibold text-slate-400 leading-relaxed max-w-[240px]">
                🔒 กรุณาเข้าสู่ระบบด้วยบัญชีผู้ดูแล (Admin) เพื่อเพิ่มหรือแก้ไขรายการงบประมาณ
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Expenses Table */}
      <div className="border border-slate-800 bg-[#111827] p-6 space-y-4 rounded-none text-white">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sliders size={20} className="text-[#FF5722]" />
            <h2 className="text-base font-black uppercase tracking-wide text-white">รายการค่าใช้จ่ายและงบประมาณจัดแข่งขัน</h2>
          </div>
          <span className="font-mono text-xs font-bold bg-[#1E293B] text-slate-300 px-3 py-1 border border-slate-700 rounded-none">
            รวม {expenses.length} รายการ
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-800/80">
          <table className="w-full text-left font-sans">
            <thead>
              <tr className="bg-slate-900 text-slate-300 font-mono text-xs uppercase">
                <th className="py-2.5 px-4 font-bold">รายการวัสดุ / อุปกรณ์</th>
                <th className="py-2.5 px-4 text-center font-mono w-32">จำนวน</th>
                <th className="py-2.5 px-4 text-center font-mono w-40">ราคาต่อหน่วย (บาท)</th>
                <th className="py-2.5 px-4 text-right font-mono w-40">ยอดรวม (บาท)</th>
                <th className="py-2.5 px-4 text-center w-24">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-slate-800 hover:bg-slate-800/30 text-xs transition-colors"
                >
                  <td className="py-3 px-4 font-semibold text-white">{item.name}</td>
                  
                  {/* Quantity editor */}
                  <td className="py-3 px-4 text-center">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      disabled={!isLoggedIn}
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value) || 1);
                        handleUpdate(item.id, val, item.pricePerUnit);
                      }}
                      className="w-16 p-1 bg-[#0A0F1D] text-white text-center border border-slate-700 font-mono text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </td>

                  {/* Price editor */}
                  <td className="py-3 px-4 text-center">
                    <input
                      type="number"
                      min="0"
                      value={item.pricePerUnit}
                      disabled={!isLoggedIn}
                      onChange={(e) => {
                        const val = Math.max(0, parseInt(e.target.value) || 0);
                        handleUpdate(item.id, item.quantity, val);
                      }}
                      className="w-24 p-1 bg-[#0A0F1D] text-white text-center border border-slate-700 font-mono text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </td>

                  {/* Total price */}
                  <td className="py-3 px-4 text-right font-mono font-bold text-[#00FF66] text-sm">
                    {item.total.toLocaleString()}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => onDeleteExpense(item.id)}
                      disabled={!isLoggedIn}
                      className="p-1.5 bg-red-950/40 hover:bg-red-900 border border-red-800/60 text-red-400 transition-all duration-150 cursor-pointer inline-flex items-center justify-center rounded-none disabled:opacity-30 disabled:cursor-not-allowed disabled:border-slate-800"
                      title={isLoggedIn ? "ลบรายการ" : "กรุณาเข้าสู่ระบบเพื่อลบรายการ"}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}

              {expenses.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 font-semibold font-mono text-xs">
                    ❌ ไม่มีข้อมูลค่าใช้จ่าย กดปุ่ม "โหลดค่าวัสดุเริ่มต้นจาก PDF" เพื่อเริ่มใช้งาน
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

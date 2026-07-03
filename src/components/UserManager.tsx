import React, { useState } from "react";
import { AdminUser } from "../types";
import { UserPlus, Trash2, Shield, Key, Eye, EyeOff, AlertCircle } from "lucide-react";

interface UserManagerProps {
  users: AdminUser[];
  onAddUser: (username: string, password: string, role: "admin" | "editor") => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  onUpdateUser: (id: string, updates: Partial<AdminUser>) => Promise<void>;
  isLoggedIn: boolean;
  onSeedDistrictUsers?: () => Promise<void>;
  onResetData?: () => Promise<void>;
  isResetting?: boolean;
}

export default function UserManager({
  users,
  onAddUser,
  onDeleteUser,
  onUpdateUser,
  isLoggedIn,
  onSeedDistrictUsers,
  onResetData,
  isResetting
}: UserManagerProps) {
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "editor">("editor");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // For inline password viewing
  const [showPasswords, setShowPasswords] = useState<{ [id: string]: boolean }>({});
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Editing states
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState<"admin" | "editor">("editor");

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) return;

    setErrorMsg("");
    setSuccessMsg("");

    const cleanedUsername = newUsername.trim().toLowerCase();
    if (!cleanedUsername) {
      setErrorMsg("กรุณากรอกชื่อผู้ใช้งาน");
      return;
    }

    if (newPassword.length < 4) {
      setErrorMsg("รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร");
      return;
    }

    // Check duplicate
    const exists = users.some(u => u.username.toLowerCase() === cleanedUsername);
    if (exists || cleanedUsername === "admin") {
      setErrorMsg(`ชื่อผู้ใช้งาน "${newUsername}" มีอยู่ในระบบแล้ว`);
      return;
    }

    setIsAdding(true);
    try {
      await onAddUser(newUsername.trim(), newPassword, newRole);
      setSuccessMsg(`เพิ่มผู้ดูแล "${newUsername}" เรียบร้อยแล้ว`);
      setNewUsername("");
      setNewPassword("");
      setNewRole("editor");
      
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "เกิดข้อผิดพลาดในการเพิ่มผู้ดูแล");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string, username: string) => {
    if (!isLoggedIn) return;
    if (username === "admin") {
      alert("ไม่สามารถลบบัญชีหลัก admin ได้");
      return;
    }

    if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบผู้ดูแลระบบ "${username}"?`)) {
      try {
        await onDeleteUser(id);
        setSuccessMsg(`ลบผู้ดูแล "${username}" เรียบร้อยแล้ว`);
        setTimeout(() => setSuccessMsg(""), 3000);
      } catch (err: any) {
        setErrorMsg(err.message || "เกิดข้อผิดพลาดในการลบผู้ดูแล");
      }
    }
  };

  const startEdit = (user: AdminUser) => {
    setEditingUserId(user.id);
    setEditPassword(user.password || "");
    setEditRole(user.role);
  };

  const saveEdit = async (id: string) => {
    if (!editPassword || editPassword.length < 4) {
      alert("รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร");
      return;
    }

    try {
      await onUpdateUser(id, {
        password: editPassword,
        role: editRole
      });
      setEditingUserId(null);
      setSuccessMsg("อัปเดตข้อมูลผู้ดูแลเรียบร้อยแล้ว");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาดในการอัปเดตข้อมูล");
    }
  };

  return (
    <div id="user-manager-root" className="bg-[#0F172A] border border-slate-800 p-4 md:p-6 text-white space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h2 className="text-xl font-black uppercase tracking-wider flex items-center gap-2 text-white">
            👥 จัดการสิทธิ์แอดมิน (Admin & Users)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            เพิ่ม ลบ และอัปเดตสิทธิ์บัญชีผู้ใช้สำหรับใช้ในการล็อกอินเข้าแก้ไขข้อมูลโปรแกรมแข่งและงบประมาณ
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">

          <div className="flex items-center gap-2 bg-[#1E293B] border border-slate-800 px-3 py-1 text-xs text-slate-300 font-mono">
            <Shield size={14} className="text-[#00FF66]" />
            บัญชีทั้งหมด: {users.length + (users.some(u => u.username === "admin") ? 0 : 1)} บัญชี
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></span>
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-950/40 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <AlertCircle size={16} />
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Card (Add User) */}
        <div className="lg:col-span-1 border border-slate-800 bg-[#111827] p-5 rounded-none text-white space-y-4 h-fit">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <UserPlus size={18} className="text-[#FF5722]" />
            <h3 className="text-sm font-black uppercase text-white">
              เพิ่มบัญชีผู้ดูแลใหม่
            </h3>
          </div>

          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">
                ชื่อผู้ใช้งาน (Username)
              </label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="ภาษาอังกฤษ เช่น preeda, somchai"
                className="w-full p-2.5 bg-[#0A0F1D] text-white border border-slate-800 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none placeholder-slate-600"
                required
                disabled={!isLoggedIn}
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">
                รหัสผ่าน (Password)
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="ความยาวขั้นต่ำ 4 ตัวอักษร"
                  className="w-full p-2.5 pr-10 bg-[#0A0F1D] text-white border border-slate-800 text-xs font-mono focus:outline-none focus:border-[#FF5722] rounded-none placeholder-slate-600"
                  required
                  disabled={!isLoggedIn}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">
                ระดับสิทธิ์ (Role Privilege)
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as "admin" | "editor")}
                className="w-full p-2.5 bg-[#0A0F1D] text-white border border-slate-800 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none"
                disabled={!isLoggedIn}
              >
                <option value="editor">Editor (แก้ไขผลการแข่งขันและค่าใช้จ่ายได้)</option>
                <option value="admin">Admin (แก้ไขได้ทุกอย่าง + จัดการผู้ใช้อื่น)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isAdding || !isLoggedIn}
              className="w-full py-2.5 bg-[#FF5722] hover:bg-[#E04E1D] text-white border-0 font-black text-xs uppercase tracking-wider transition-all duration-150 cursor-pointer disabled:opacity-40 rounded-none flex items-center justify-center gap-1.5"
            >
              <UserPlus size={14} />
              {isAdding ? "กำลังบันทึก..." : "สร้างบัญชีผู้ใช้ (+)"}
            </button>
          </form>
        </div>

        {/* User List Table */}
        <div className="lg:col-span-2 border border-slate-800 bg-[#111827] p-5 rounded-none space-y-4">
          <div className="border-b border-slate-800 pb-2">
            <h3 className="text-sm font-black uppercase text-white flex items-center gap-1.5">
              <Key size={16} className="text-blue-400" />
              รายชื่อผู้มีสิทธิ์จัดการระบบ (Admins & Editors)
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase">
                  <th className="py-3 px-2 font-bold">ชื่อผู้ใช้ (Username)</th>
                  <th className="py-3 px-2 font-bold">ระดับสิทธิ์ (Role)</th>
                  <th className="py-3 px-2 font-bold">รหัสผ่าน (Password)</th>
                  <th className="py-3 px-2 font-bold">วันที่สร้าง</th>
                  <th className="py-3 px-2 text-center font-bold">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {/* 1. Built-in master admin default representation if not explicitly in collection */}
                {!users.some(u => u.username === "admin") && (
                  <tr className="hover:bg-slate-800/20">
                    <td className="py-3.5 px-2 font-bold text-[#00FF66] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-[#00FF66] rounded-full"></span>
                      admin
                    </td>
                    <td className="py-3.5 px-2">
                      <span className="bg-red-950/40 border border-red-900/60 px-2 py-0.5 text-[9px] font-bold text-red-400 font-mono uppercase">
                        Super Admin
                      </span>
                    </td>
                    <td className="py-3.5 px-2 font-mono text-slate-400">
                      •••• (1234)
                    </td>
                    <td className="py-3.5 px-2 font-mono text-slate-500">
                      ระบบหลัก
                    </td>
                    <td className="py-3.5 px-2 text-center text-[10px] text-slate-500 font-bold font-mono">
                      🔒 บัญชีระบบ
                    </td>
                  </tr>
                )}

                {/* DB Users */}
                {users.map((user) => {
                  const isEditing = editingUserId === user.id;
                  const isSystemAdmin = user.username === "admin";

                  return (
                    <tr key={user.id} className="hover:bg-slate-800/20">
                      {/* Username */}
                      <td className="py-3.5 px-2 font-bold text-white">
                        {user.username}
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-2">
                        {isEditing ? (
                          <select
                            value={editRole}
                            disabled={isSystemAdmin}
                            onChange={(e) => setEditRole(e.target.value as "admin" | "editor")}
                            className="bg-[#0A0F1D] text-white border border-slate-700 text-[11px] p-1 rounded-none focus:outline-none"
                          >
                            <option value="editor">Editor</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-0.5 text-[9px] font-bold font-mono uppercase ${
                            user.role === "admin"
                              ? "bg-red-950/40 border border-red-900/60 text-red-400"
                              : "bg-blue-950/40 border border-blue-900/60 text-blue-400"
                          }`}>
                            {user.role}
                          </span>
                        )}
                      </td>

                      {/* Password */}
                      <td className="py-3.5 px-2 font-mono">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            className="bg-[#0A0F1D] text-white border border-slate-700 text-xs p-1 w-28 rounded-none font-mono"
                          />
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span>
                              {showPasswords[user.id] ? user.password : "••••"}
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(user.id)}
                              className="text-slate-500 hover:text-slate-300 cursor-pointer"
                            >
                              {showPasswords[user.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Date Created */}
                      <td className="py-3.5 px-2 font-mono text-slate-400">
                        {user.createdAt || "ไม่ระบุ"}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => saveEdit(user.id)}
                                className="px-2 py-1 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-[10px] cursor-pointer rounded-none border-0"
                              >
                                บันทึก
                              </button>
                              <button
                                onClick={() => setEditingUserId(null)}
                                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white font-bold text-[10px] cursor-pointer rounded-none border-0"
                              >
                                ยกเลิก
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEdit(user)}
                                disabled={!isLoggedIn}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-[10px] cursor-pointer rounded-none border-0 disabled:opacity-40"
                              >
                                แก้ไข
                              </button>
                              <button
                                onClick={() => handleDelete(user.id, user.username)}
                                disabled={!isLoggedIn || isSystemAdmin}
                                className="px-2 py-1 bg-red-950/50 hover:bg-red-900 text-red-400 font-bold text-[10px] cursor-pointer rounded-none border-0 disabled:opacity-40"
                                title={isSystemAdmin ? "บัญชีหลักไม่สามารถลบได้" : ""}
                              >
                                ลบ
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>


      </div>
    </div>
  );
}

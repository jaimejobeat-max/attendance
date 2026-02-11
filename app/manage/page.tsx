"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search,
    Pencil,
    Trash2,
    Save,
    X,
    Plus,
    ArrowLeft,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Database,
    Filter,
    RefreshCw,
} from "lucide-react";
import Link from "next/link";

// ── 타입 정의 ──────────────────────────────────────────────
interface AttendanceRow {
    날짜: string;
    지점: string;
    이름: string;
    예정출근: string;
    실제출근: string;
    예정퇴근: string;
    실제퇴근: string;
    "지각(분)": string;
    "오버타임(분)": string;
    비고: string;
    _rowNumber: number;
}

type EditableFields = Omit<AttendanceRow, "_rowNumber">;

const COLUMNS: { key: keyof EditableFields; label: string; width: string }[] = [
    { key: "날짜", label: "날짜", width: "w-28" },
    { key: "지점", label: "지점", width: "w-20" },
    { key: "이름", label: "이름", width: "w-20" },
    { key: "예정출근", label: "예정출근", width: "w-20" },
    { key: "실제출근", label: "실제출근", width: "w-20" },
    { key: "예정퇴근", label: "예정퇴근", width: "w-20" },
    { key: "실제퇴근", label: "실제퇴근", width: "w-20" },
    { key: "지각(분)", label: "지각(분)", width: "w-20" },
    { key: "오버타임(분)", label: "오버타임", width: "w-20" },
    { key: "비고", label: "비고", width: "w-28" },
];

// ── 메인 컴포넌트 ──────────────────────────────────────────
export default function ManagePage() {
    const [allData, setAllData] = useState<AttendanceRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingRow, setEditingRow] = useState<number | null>(null);
    const [editData, setEditData] = useState<EditableFields | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<number | null>(null);
    const [toast, setToast] = useState<{
        type: "success" | "error";
        message: string;
    } | null>(null);

    // 검색 필터
    const [filterDate, setFilterDate] = useState("");
    const [filterName, setFilterName] = useState("");

    // ── 데이터 로드 ────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/attendance");
            const json = await res.json();
            if (json.success) {
                setAllData(json.data);
            }
        } catch (e) {
            console.error("Failed to fetch data:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ── 필터링 ─────────────────────────────────────────────
    const filteredData = useMemo(() => {
        return allData.filter((row) => {
            const matchDate = filterDate ? row.날짜 === filterDate : true;
            const matchName = filterName
                ? row.이름.toLowerCase().includes(filterName.toLowerCase())
                : true;
            return matchDate && matchName;
        });
    }, [allData, filterDate, filterName]);

    // ── 토스트 표시 ────────────────────────────────────────
    const showToast = (type: "success" | "error", message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 4000);
    };

    // ── 수정 모드 진입 ─────────────────────────────────────
    const startEdit = (row: AttendanceRow) => {
        setEditingRow(row._rowNumber);
        const { _rowNumber, ...fields } = row;
        void _rowNumber;
        setEditData(fields);
    };

    // ── 수정 취소 ──────────────────────────────────────────
    const cancelEdit = () => {
        setEditingRow(null);
        setEditData(null);
    };

    // ── 수정 셀 업데이트 ──────────────────────────────────
    const updateEditCell = (key: keyof EditableFields, value: string) => {
        if (!editData) return;
        setEditData({ ...editData, [key]: value });
    };

    // ── 저장 (PUT) ─────────────────────────────────────────
    const handleSave = async () => {
        if (!editingRow || !editData) return;
        setSaving(true);

        try {
            const res = await fetch("/api/attendance", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rowNumber: editingRow, data: editData }),
            });
            const json = await res.json();

            if (json.success) {
                showToast("success", "데이터가 성공적으로 수정되었습니다.");
                setEditingRow(null);
                setEditData(null);
                await fetchData();
            } else {
                showToast("error", json.error || "수정에 실패했습니다.");
            }
        } catch {
            showToast("error", "서버 연결에 실패했습니다.");
        } finally {
            setSaving(false);
        }
    };

    // ── 삭제 (DELETE) ──────────────────────────────────────
    const handleDelete = async (rowNumber: number) => {
        if (!confirm("이 데이터를 삭제하시겠습니까?")) return;
        setDeleting(rowNumber);

        try {
            const res = await fetch("/api/attendance", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rowNumber }),
            });
            const json = await res.json();

            if (json.success) {
                showToast("success", "데이터가 삭제되었습니다.");
                await fetchData();
            } else {
                showToast("error", json.error || "삭제에 실패했습니다.");
            }
        } catch {
            showToast("error", "서버 연결에 실패했습니다.");
        } finally {
            setDeleting(null);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100">
            {/* ─── 헤더 ─── */}
            <header className="sticky top-0 z-30 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl">
                <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-4">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-zinc-400 transition hover:text-white"
                    >
                        <ArrowLeft size={18} />
                        <span className="text-sm">홈</span>
                    </Link>
                    <div className="h-5 w-px bg-zinc-700" />
                    <h1 className="text-lg font-semibold tracking-tight">
                        <span className="text-indigo-400">LAYER</span> 데이터 관리
                    </h1>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-6 py-10 space-y-8">
                {/* ─── 검색 필터 ─── */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-6 shadow-2xl"
                >
                    <div className="mb-5 flex items-center gap-3">
                        <div className="rounded-xl bg-amber-500/10 p-2.5">
                            <Filter size={20} className="text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold">데이터 검색</h2>
                            <p className="text-xs text-zinc-500 mt-0.5">
                                날짜 또는 이름으로 기존 데이터를 검색하세요
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        {/* 날짜 필터 */}
                        <div className="flex-1 min-w-[200px]">
                            <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                                날짜
                            </label>
                            <input
                                type="date"
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
                            />
                        </div>

                        {/* 이름 필터 */}
                        <div className="flex-1 min-w-[200px]">
                            <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                                이름
                            </label>
                            <div className="relative">
                                <Search
                                    size={16}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                                />
                                <input
                                    type="text"
                                    value={filterName}
                                    onChange={(e) => setFilterName(e.target.value)}
                                    placeholder="이름을 입력하세요"
                                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800/80 pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
                                />
                            </div>
                        </div>

                        {/* 필터 초기화 & 새로고침 */}
                        <div className="flex items-end gap-2">
                            <button
                                onClick={() => {
                                    setFilterDate("");
                                    setFilterName("");
                                }}
                                className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-600 hover:text-white"
                            >
                                초기화
                            </button>
                            <button
                                onClick={fetchData}
                                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
                            >
                                <RefreshCw size={14} />
                                새로고침
                            </button>
                        </div>
                    </div>
                </motion.section>

                {/* ─── 데이터 테이블 ─── */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-6 shadow-2xl"
                >
                    <div className="mb-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-indigo-500/10 p-2.5">
                                <Database size={20} className="text-indigo-400" />
                            </div>
                            <div>
                                <h2 className="text-base font-semibold">
                                    근태 데이터{" "}
                                    <span className="text-zinc-500 font-normal">
                                        ({filteredData.length}건)
                                    </span>
                                </h2>
                                <p className="text-xs text-zinc-500 mt-0.5">
                                    수정 버튼을 클릭하면 인라인 편집 모드로 전환됩니다
                                </p>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 size={28} className="animate-spin text-indigo-400" />
                        </div>
                    ) : filteredData.length === 0 ? (
                        <div className="py-16 text-center">
                            <p className="text-sm text-zinc-500">
                                {allData.length === 0
                                    ? "등록된 데이터가 없습니다."
                                    : "검색 결과가 없습니다."}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-zinc-800">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-zinc-800 bg-zinc-800/50">
                                        {COLUMNS.map((col) => (
                                            <th
                                                key={col.key}
                                                className={`${col.width} px-3 py-2.5 text-left text-xs font-medium text-zinc-400 whitespace-nowrap`}
                                            >
                                                {col.label}
                                            </th>
                                        ))}
                                        <th className="w-24 px-3 py-2.5 text-center text-xs font-medium text-zinc-400">
                                            작업
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredData.map((row) => {
                                        const isEditing = editingRow === row._rowNumber;
                                        const isDeleting = deleting === row._rowNumber;

                                        return (
                                            <motion.tr
                                                key={row._rowNumber}
                                                layout
                                                className={`border-b border-zinc-800/50 transition ${isEditing
                                                        ? "bg-indigo-500/5 ring-1 ring-inset ring-indigo-500/20"
                                                        : "hover:bg-zinc-800/30"
                                                    }`}
                                            >
                                                {COLUMNS.map((col) => (
                                                    <td key={col.key} className="px-1.5 py-1">
                                                        {isEditing ? (
                                                            <input
                                                                type="text"
                                                                value={editData?.[col.key] ?? ""}
                                                                onChange={(e) =>
                                                                    updateEditCell(col.key, e.target.value)
                                                                }
                                                                className={`${col.width} rounded-md border border-indigo-500/30 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30`}
                                                            />
                                                        ) : (
                                                            <span className="block px-2 py-1.5 text-zinc-300">
                                                                {String(row[col.key]) || "—"}
                                                            </span>
                                                        )}
                                                    </td>
                                                ))}
                                                <td className="px-2 py-1">
                                                    <div className="flex items-center justify-center gap-1">
                                                        {isEditing ? (
                                                            <>
                                                                <button
                                                                    onClick={handleSave}
                                                                    disabled={saving}
                                                                    className="rounded-md p-1.5 text-emerald-400 transition hover:bg-emerald-500/10 disabled:opacity-40"
                                                                    title="저장"
                                                                >
                                                                    {saving ? (
                                                                        <Loader2
                                                                            size={14}
                                                                            className="animate-spin"
                                                                        />
                                                                    ) : (
                                                                        <Save size={14} />
                                                                    )}
                                                                </button>
                                                                <button
                                                                    onClick={cancelEdit}
                                                                    className="rounded-md p-1.5 text-zinc-400 transition hover:bg-zinc-700 hover:text-white"
                                                                    title="취소"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    onClick={() => startEdit(row)}
                                                                    className="rounded-md p-1.5 text-zinc-500 transition hover:bg-indigo-500/10 hover:text-indigo-400"
                                                                    title="수정"
                                                                >
                                                                    <Pencil size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(row._rowNumber)}
                                                                    disabled={isDeleting}
                                                                    className="rounded-md p-1.5 text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
                                                                    title="삭제"
                                                                >
                                                                    {isDeleting ? (
                                                                        <Loader2
                                                                            size={14}
                                                                            className="animate-spin"
                                                                        />
                                                                    ) : (
                                                                        <Trash2 size={14} />
                                                                    )}
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </motion.section>
            </main>

            {/* ─── 토스트 알림 ─── */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, x: "-50%" }}
                        animate={{ opacity: 1, y: 0, x: "-50%" }}
                        exit={{ opacity: 0, y: 50, x: "-50%" }}
                        className={`fixed bottom-8 left-1/2 z-50 flex items-center gap-3 rounded-xl px-5 py-3 text-sm font-medium shadow-2xl ${toast.type === "success"
                                ? "bg-emerald-600 text-white"
                                : "bg-red-600 text-white"
                            }`}
                    >
                        {toast.type === "success" ? (
                            <CheckCircle2 size={18} />
                        ) : (
                            <AlertCircle size={18} />
                        )}
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

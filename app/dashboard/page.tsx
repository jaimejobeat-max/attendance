"use client";

import { useEffect, useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
    CalendarDays,
    CalendarRange,
    Clock,
    AlertTriangle,
    Users,
    TrendingUp,
    ArrowLeft,
    Loader2,
} from "lucide-react";
import Link from "next/link";

// ── 타입 ───────────────────────────────────────────────────
interface AttendanceRow {
    날짜: string;
    지점: string;
    이름: string;
    예정출근: string;
    실제출근: string;
    예정퇴근: string;
    실제퇴근: string;
    "지각": string;
    "오버타임": string;
    "총근무": string;
    비고: string;
    _rowNumber?: number;
}

type TabType = "weekly" | "monthly";

// ── 유틸리티 ───────────────────────────────────────────────
function getWeekRange(today: Date): [Date, Date] {
    const day = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return [monday, sunday];
}

function getMonthRange(today: Date): [Date, Date] {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const last = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
    );
    return [first, last];
}

function parseDate(dateStr: string): Date {
    return new Date(dateStr);
}

function formatDate(d: Date): string {
    return d.toISOString().split("T")[0];
}

function formatDateKR(dateStr: string): string {
    const d = new Date(dateStr);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
    const weekday = weekdays[d.getDay()];
    return `${month}/${day} (${weekday})`;
}

function safeNum(val: string): number {
    const n = parseInt(val, 10);
    return isNaN(n) ? 0 : n;
}

// 비고란에서 파트/대관 정보 추출
function extractPart(memo: string): string {
    if (!memo) return "—";
    // "파트: XX", "파트:XX", "파트 XX", "XX파트" 등 다양한 형태 지원
    const partMatch = memo.match(/파트\s*[:：]?\s*([^\s,]+)|([^\s,]+)\s*파트/i);
    if (partMatch) return partMatch[1] || partMatch[2] || "—";
    // "오픈", "마감", "미들" 등 키워드
    if (/오픈/i.test(memo)) return "오픈";
    if (/마감/i.test(memo)) return "마감";
    if (/미들/i.test(memo)) return "미들";
    return "—";
}

function extractRental(memo: string): string {
    if (!memo) return "—";
    // "대관: XX시", "대관 XX:XX", "대관XX" 등
    const rentalMatch = memo.match(
        /대관\s*[:：]?\s*([^\s,]+(?:\s*~\s*[^\s,]+)?)/i
    );
    if (rentalMatch) return rentalMatch[1];
    if (rentalMatch) return rentalMatch[1];
    return "";
}

function updateNote(note: string, type: "part" | "rental", value: string): string {
    let newNote = note || "";
    const prefix = type === "part" ? "파트" : "대관";

    // 기존 파트/대관 제거
    if (type === "part") {
        newNote = newNote.replace(/파트\s*[:：]?\s*([^\s,]+)/i, "").replace(/([^\s,]+)\s*파트/i, "").trim();
        // 오픈/마감/미들 키워드 제거
        newNote = newNote.replace(/오픈|마감|미들/gi, "").trim();
    } else {
        newNote = newNote.replace(/대관\s*[:：]?\s*([^\s,]+(?:\s*~\s*[^\s,]+)?)/i, "").trim();
    }

    // 슬래시 정리 (중복/양끝)
    newNote = newNote.replace(/\/+/g, "/").replace(/^\/|\/$/g, "").trim();

    if (!value) return newNote;

    // 새 값 추가
    const newVal = type === "part" ? `파트: ${value}` : `대관: ${value}`;
    return newNote ? `${newNote} / ${newVal}` : newVal;
}

// 요일 정렬 (월~일)
function getDayOfWeekOrder(dateStr: string): number {
    const d = new Date(dateStr);
    const day = d.getDay(); // 0=Sun
    return day === 0 ? 6 : day - 1; // Mon=0, Tue=1, ..., Sun=6
}

// ── 사람별 통계 계산 ───────────────────────────────────────
interface PersonStat {
    name: string;
    total: number | string;
}



// ── 근무자 테이블 컴포넌트 ─────────────────────────────────
function WorkerTable({ rows }: { rows: AttendanceRow[] }) {
    if (rows.length === 0) {
        return (
            <p className="text-xs text-zinc-600 py-6 text-center">
                데이터가 없습니다.
            </p>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-xs">
                <thead>
                    <tr className="border-b border-zinc-800">
                        <th className="px-3 py-2 text-left font-medium text-zinc-500 uppercase tracking-wider">
                            지점
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-zinc-500 uppercase tracking-wider">
                            이름
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-zinc-500 uppercase tracking-wider">
                            파트
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-zinc-500 uppercase tracking-wider">
                            대관
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-zinc-500 uppercase tracking-wider">
                            출근
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-zinc-500 uppercase tracking-wider">
                            퇴근
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr
                            key={i}
                            className="border-b border-zinc-800/40 hover:bg-zinc-800/20 transition-colors"
                        >
                            <td className="px-3 py-2 text-zinc-400">{row.지점}</td>
                            <td className="px-3 py-2 text-zinc-100 font-medium">
                                {row.이름}
                            </td>
                            <td className="px-3 py-2 text-zinc-400">
                                {extractPart(row.비고)}
                            </td>
                            <td className="px-3 py-2 text-zinc-400">
                                {extractRental(row.비고)}
                            </td>
                            <td className="px-3 py-2 text-zinc-300">
                                {row.실제출근 || row.예정출근 || "—"}
                            </td>
                            <td className="px-3 py-2 text-zinc-300">
                                {row.실제퇴근 || row.예정퇴근 || "—"}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ── 지점별 근무자 테이블 ─────────────────────────────────────
// ── 지점별 근무자 테이블 (수정 가능) ──────────────────────────
function WorkerTableByBranch({ rows, onUpdate }: { rows: AttendanceRow[], onUpdate: (row: AttendanceRow, type: "part" | "rental", val: string) => void }) {
    if (rows.length === 0) {
        return (
            <p className="text-xs text-zinc-600 py-6 text-center">
                데이터가 없습니다.
            </p>
        );
    }

    // 지점별 그룹화
    const byBranch = new Map<string, AttendanceRow[]>();
    for (const row of rows) {
        const b = row.지점 || "미지정";
        if (!byBranch.has(b)) byBranch.set(b, []);
        byBranch.get(b)!.push(row);
    }

    return (
        <div className="divide-y divide-zinc-800">
            {Array.from(byBranch.entries()).map(([branch, branchRows]) => (
                <div key={branch}>
                    <div className="px-3 py-1.5 bg-zinc-900/60">
                        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">
                            {branch}
                        </span>
                        <span className="text-[10px] text-zinc-600 ml-1.5">
                            {branchRows.length}명
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-zinc-800/60">
                                    <th className="px-3 py-1.5 text-left font-medium text-zinc-600 w-20">이름</th>
                                    <th className="px-3 py-1.5 text-left font-medium text-zinc-600 w-24">파트</th>
                                    <th className="px-3 py-1.5 text-left font-medium text-zinc-600 w-24">대관시간</th>
                                    <th className="px-3 py-1.5 text-left font-medium text-zinc-600 w-16">출근</th>
                                    <th className="px-3 py-1.5 text-left font-medium text-zinc-600 w-16">퇴근</th>
                                </tr>
                            </thead>
                            <tbody>
                                {branchRows.map((row, i) => (
                                    <tr key={i} className="border-b border-zinc-800/30 hover:bg-zinc-800/20 transition-colors">
                                        <td className="px-3 py-1.5 text-zinc-100 font-medium">{row.이름}</td>
                                        <td className="px-3 py-1.5">
                                            <input
                                                type="text"
                                                defaultValue={extractPart(row.비고).replace("—", "")}
                                                onBlur={(e) => onUpdate(row, "part", e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                                                className="w-full bg-transparent text-zinc-400 focus:text-zinc-100 outline-none placeholder:text-zinc-700"
                                                placeholder="입력"
                                            />
                                        </td>
                                        <td className="px-3 py-1.5">
                                            <input
                                                type="text"
                                                defaultValue={extractRental(row.비고).replace("—", "")}
                                                onBlur={(e) => onUpdate(row, "rental", e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                                                className="w-full bg-transparent text-zinc-400 focus:text-zinc-100 outline-none placeholder:text-zinc-700"
                                                placeholder="입력"
                                            />
                                        </td>
                                        <td className="px-3 py-1.5 text-zinc-300">{row.실제출근 || row.예정출근 || "—"}</td>
                                        <td className="px-3 py-1.5 text-zinc-300">{row.실제퇴근 || row.예정퇴근 || "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ── 주간 상세 기록 테이블 (정렬/필터 포함) ─────────────────────
function WeeklyRecordTable({ rows }: { rows: AttendanceRow[] }) {
    const [sort, setSort] = useState<"date" | "late" | "overtime" | "work">("date");

    const sorted = useMemo(() => {
        return [...rows].sort((a, b) => {
            if (sort === "late") return safeNum(b["지각"]) - safeNum(a["지각"]);
            if (sort === "overtime") return safeNum(b["오버타임"]) - safeNum(a["오버타임"]);
            if (sort === "work") return safeNum(b["총근무"]) - safeNum(a["총근무"]);
            // date desc
            return new Date(b.날짜).getTime() - new Date(a.날짜).getTime();
        });
    }, [rows, sort]);

    if (rows.length === 0) {
        return (
            <div className="border border-zinc-800 border-t-0 py-12 text-center">
                <p className="text-xs text-zinc-600">데이터가 없습니다.</p>
            </div>
        );
    }

    return (
        <div className="border border-zinc-800 border-t-0">
            {/* 정렬 옵션 */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800/60 bg-zinc-900/20">
                <span className="text-[10px] text-zinc-500">정렬</span>
                <div className="flex gap-1">
                    {[
                        { key: "date", label: "기본" },
                        { key: "late", label: "지각 순" },
                        { key: "overtime", label: "오버타임 순" },
                        { key: "work", label: "근무시간 순" },
                    ].map((opt) => (
                        <button
                            key={opt.key}
                            onClick={() => setSort(opt.key as any)}
                            className={`px-2 py-0.5 text-[10px] rounded border ${sort === opt.key
                                ? "bg-zinc-800 border-zinc-700 text-zinc-200"
                                : "border-transparent text-zinc-500 hover:text-zinc-300"
                                } transition`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 테이블 */}
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b border-zinc-800/60 text-[10px] uppercase text-zinc-500">

                            <th className="px-4 py-2 text-left font-medium">이름</th>
                            <th className="px-4 py-2 text-left font-medium">지각</th>
                            <th className="px-4 py-2 text-left font-medium">오버타임</th>
                            <th className="px-4 py-2 text-left font-medium">총 근무</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((row, i) => (
                            <tr key={i} className="border-b border-zinc-800/30 hover:bg-zinc-800/20 transition">

                                <td className="px-4 py-2 text-zinc-200 font-medium">{row.이름}</td>
                                <td className="px-4 py-2">
                                    <span className={safeNum(row["지각"]) > 0 ? "text-rose-400 font-bold" : "text-zinc-500"}>
                                        {row["지각"] || "-"}
                                    </span>
                                </td>
                                <td className="px-4 py-2">
                                    <span className={safeNum(row["오버타임"]) > 0 ? "text-emerald-400 font-bold" : "text-zinc-500"}>
                                        {row["오버타임"] || "-"}
                                    </span>
                                </td>
                                <td className="px-4 py-2">
                                    <span className="text-zinc-400">
                                        {row["총근무"] || "-"}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── 사람별 통계 계산 ───────────────────────────────────────


interface MemberStatRow {
    "이름": string;
    "주간 총 근무": string;
    "월간 총 근무": string;
    "주간 오버타임": string;
    "월간 오버타임": string;
    "월간 지각": string;
    "주간 지각": string;
}



// ── 사람별 상세 리스트 카드 (총합 없이 개인별만) ─────────────
function DetailStatCard({
    icon: Icon,
    label,
    persons,
    accentClass,
    formatter = (val: number | string) => typeof val === "number" ? `${val}분` : val,
}: {
    icon: React.ElementType;
    label: string;
    persons: PersonStat[];
    accentClass: string;
    formatter?: (val: number | string) => string;
}) {
    return (
        <div className="border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="flex items-center gap-2 mb-3">
                <Icon size={14} className={accentClass} />
                <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">
                    {label}
                </span>
            </div>
            {persons.length > 0 ? (
                <div className="space-y-1">
                    {persons.map((p) => (
                        <div key={p.name} className="flex items-center justify-between">
                            <span className="text-[11px] text-zinc-400">{p.name}</span>
                            <span className={`text-[11px] font-medium ${accentClass}`}>
                                {formatter(p.total)}
                            </span>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-[10px] text-zinc-700">
                    해당 없음
                </p>
            )}
        </div>
    );
}

// ── 메인 대시보드 ──────────────────────────────────────────
export default function DashboardPage() {
    const [data, setData] = useState<AttendanceRow[]>([]);
    const [stats, setStats] = useState<MemberStatRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<TabType>("weekly");

    const today = useMemo(() => new Date(), []);
    const todayStr = formatDate(today);
    const [weekStart, weekEnd] = useMemo(() => getWeekRange(today), [today]);
    const [monthStart, monthEnd] = useMemo(() => getMonthRange(today), [today]);

    useEffect(() => {
        fetch("/api/attendance")
            .then((r) => r.json())
            .then((res) => {
                if (res.success) {
                    setData(res.data);
                    if (res.stats) setStats(res.stats);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    // ── 필터 ─────────────────────────────────────────────
    const todayRows = useMemo(
        () => data.filter((r) => r.날짜 === todayStr),
        [data, todayStr]
    );

    const weekRows = useMemo(
        () =>
            data.filter((r) => {
                const d = parseDate(r.날짜);
                return d >= weekStart && d <= weekEnd;
            }),
        [data, weekStart, weekEnd]
    );

    const monthRows = useMemo(
        () =>
            data.filter((r) => {
                const d = parseDate(r.날짜);
                return d >= monthStart && d <= monthEnd;
            }),
        [data, monthStart, monthEnd]
    );

    // ── 주간 통계 (사람별) ────────────────────────────────
    // 주간 지각: Member_Stats 연동
    const weeklyLatePersons = useMemo(() => {
        if (stats.length === 0) return [];
        return stats
            .map(s => ({ name: s.이름, total: s["주간 지각"] }))
            .filter(p => p.total && p.total !== "0분" && p.total !== "0");
    }, [stats]);

    // 주간 오버타임: Member_Stats 연동
    const weeklyOvertimePersons = useMemo(() => {
        if (stats.length === 0) return [];
        return stats
            .map(s => ({ name: s.이름, total: s["주간 오버타임"] }))
            .filter(p => p.total && p.total !== "0분" && p.total !== "0")
            .sort((a, b) => safeNum(String(b.total)) - safeNum(String(a.total))); // 숫자 기준 정렬 시도 (문자열이면 부정확할 수 있음)
    }, [stats]);

    // 주간 총 근무시간: Member_Stats 연동
    const weeklyTotalWorkPersons = useMemo(() => {
        if (stats.length === 0) return [];
        return stats
            .map(s => ({ name: s.이름, total: s["주간 총 근무"] }))
            .filter(p => p.total && p.total !== "0분" && p.total !== "0시간 0분");
    }, [stats]);

    // ── 월간 통계 ────────────────────────────────────────
    const monthRowsCount = monthRows.length; // renamed to avoid conflict if needed, used in text

    // 월간 지각: Member_Stats 연동
    const monthlyLatePersons = useMemo(() => {
        if (stats.length === 0) return [];
        return stats
            .map(s => ({ name: s.이름, total: s["월간 지각"] }))
            .filter(p => p.total && p.total !== "0분" && p.total !== "0");
    }, [stats]);

    // 월간 오버타임: Member_Stats 연동
    const monthlyOvertimePersons = useMemo(() => {
        if (stats.length === 0) return [];
        return stats
            .map(s => ({ name: s.이름, total: s["월간 오버타임"] }))
            .filter(p => p.total && p.total !== "0분" && p.total !== "0");
    }, [stats]);

    // 월간 총 근무: Member_Stats 연동 (신규)
    const monthlyTotalWorkPersons = useMemo(() => {
        if (stats.length === 0) return [];
        return stats
            .map(s => ({ name: s.이름, total: s["월간 총 근무"] }))
            .filter(p => p.total && p.total !== "0분" && p.total !== "0시간 0분");
    }, [stats]);


    // ── 데이터 업데이트 (파트/대관) ────────────────────────
    const handleUpdateRow = async (row: AttendanceRow, type: "part" | "rental", val: string) => {
        if (!row._rowNumber) return;

        const currentVal = type === "part" ? extractPart(row.비고) : extractRental(row.비고);
        if (currentVal === val || (currentVal === "—" && !val)) return;

        const newNote = updateNote(row.비고, type, val);

        // Optimistic Update
        const newData = data.map(r => r._rowNumber === row._rowNumber ? { ...r, 비고: newNote } : r);
        setData(newData);

        // API Call
        try {
            await fetch("/api/attendance", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    rowNumber: row._rowNumber,
                    data: { "비고": newNote }
                })
            });
        } catch (e) {
            console.error("Failed to update note", e);
            // Revert on error? For now just log.
        }
    };

    // ── 로딩 ─────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <Loader2 size={24} className="animate-spin text-zinc-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100">
            {/* ─── 헤더 ─── */}
            <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm">
                <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3">
                    <Link
                        href="/"
                        className="flex items-center gap-1.5 text-zinc-500 transition hover:text-zinc-200"
                    >
                        <ArrowLeft size={14} />
                        <span className="text-xs">홈</span>
                    </Link>
                    <div className="h-4 w-px bg-zinc-800" />
                    <h1 className="text-sm font-semibold tracking-tight">
                        <span className="text-zinc-400">LAYER</span> 근태 대시보드
                    </h1>
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
                {/* ─── 탭 ─── */}
                <div className="flex gap-px border border-zinc-800 w-fit">
                    {[
                        {
                            key: "weekly" as TabType,
                            label: "주간 현황",
                            icon: CalendarDays,
                        },
                        {
                            key: "monthly" as TabType,
                            label: "월간 현황",
                            icon: CalendarRange,
                        },
                    ].map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition ${tab === key
                                ? "bg-zinc-100 text-zinc-900"
                                : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"
                                }`}
                        >
                            <Icon size={12} />
                            {label}
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {/* ════════ 주간 현황 ════════ */}
                    {tab === "weekly" && (
                        <motion.div
                            key="weekly"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-6"
                        >
                            {/* 기간 */}
                            <p className="text-[11px] text-zinc-600 tracking-wide">
                                {formatDate(weekStart)} — {formatDate(weekEnd)}
                            </p>

                            {/* 통계 카드 */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-px border border-zinc-800">
                                {/* 주간 지각 — 사람별 (기존 로직) */}
                                <DetailStatCard
                                    icon={AlertTriangle}
                                    label="주간 지각"
                                    persons={weeklyLatePersons}
                                    accentClass="text-rose-400"
                                />

                                {/* 주간 오버타임 — 사람별 (Member_Stats) */}
                                <DetailStatCard
                                    icon={Clock}
                                    label="주간 오버타임"
                                    persons={weeklyOvertimePersons}
                                    accentClass="text-emerald-400"
                                />
                            </div>

                            <div className="grid grid-cols-1 border border-zinc-800 border-t-0">
                                {/* 주간 총 근무시간 — 사람별 (Member_Stats) */}
                                <DetailStatCard
                                    icon={Clock}
                                    label="주간 총 근무시간"
                                    persons={weeklyTotalWorkPersons}
                                    accentClass="text-indigo-400"
                                />
                            </div>

                            {/* 오늘 근무 — 지점별 테이블 */}
                            <section className="border border-zinc-800">
                                <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2.5 bg-zinc-900/40">
                                    <div className="flex items-center gap-2">
                                        <Users size={14} className="text-zinc-400" />
                                        <span className="text-xs font-semibold text-zinc-300">
                                            오늘 근무
                                        </span>
                                        <span className="text-[10px] text-zinc-600">
                                            {todayRows.length}명
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-zinc-600">{todayStr}</span>
                                </div>
                                <WorkerTableByBranch rows={todayRows} onUpdate={handleUpdateRow} />
                            </section>

                            {/* 이번 달 요일별 기록 */}
                            <section className="space-y-px">
                                <div className="border border-zinc-800 px-4 py-2.5 bg-zinc-900/40">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-semibold text-zinc-300">
                                            이번 달 전체 기록
                                        </span>
                                        <span className="text-[10px] text-zinc-600">
                                            {monthRows.length}건
                                        </span>
                                    </div>
                                </div>

                                <WeeklyRecordTable rows={monthRows} />
                            </section>
                        </motion.div>
                    )}

                    {/* ════════ 월간 현황 ════════ */}
                    {tab === "monthly" && (
                        <motion.div
                            key="monthly"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-6"
                        >
                            {/* 기간 */}
                            <p className="text-[11px] text-zinc-600 tracking-wide">
                                {today.getFullYear()}년 {today.getMonth() + 1}월
                            </p>

                            {/* 통계 카드 (Member_Stats) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-px border border-zinc-800">
                                <DetailStatCard
                                    icon={AlertTriangle}
                                    label="누적 지각"
                                    persons={monthlyLatePersons}
                                    accentClass="text-rose-400"
                                />

                                <DetailStatCard
                                    icon={Clock}
                                    label="누적 오버타임"
                                    persons={monthlyOvertimePersons}
                                    accentClass="text-emerald-400"
                                />
                            </div>

                            <div className="grid grid-cols-1 border border-zinc-800 border-t-0">
                                <DetailStatCard
                                    icon={Clock}
                                    label="누적 총 근무시간"
                                    persons={monthlyTotalWorkPersons}
                                    accentClass="text-indigo-400"
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div >
    );
}

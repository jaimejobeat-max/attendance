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
    "지각(분)": string;
    "오버타임(분)": string;
    비고: string;
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
    return "—";
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
    total: number;
}

function getPerPersonStats(
    rows: AttendanceRow[],
    field: "지각(분)" | "오버타임(분)"
): PersonStat[] {
    const map = new Map<string, number>();
    for (const row of rows) {
        const val = safeNum(row[field]);
        if (val > 0) {
            map.set(row.이름, (map.get(row.이름) || 0) + val);
        }
    }
    return Array.from(map.entries())
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total);
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
function WorkerTableByBranch({ rows }: { rows: AttendanceRow[] }) {
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
                                    <th className="px-3 py-1.5 text-left font-medium text-zinc-600 w-16">파트</th>
                                    <th className="px-3 py-1.5 text-left font-medium text-zinc-600 w-20">대관</th>
                                    <th className="px-3 py-1.5 text-left font-medium text-zinc-600 w-16">출근</th>
                                    <th className="px-3 py-1.5 text-left font-medium text-zinc-600 w-16">퇴근</th>
                                </tr>
                            </thead>
                            <tbody>
                                {branchRows.map((row, i) => (
                                    <tr key={i} className="border-b border-zinc-800/30 hover:bg-zinc-800/20 transition-colors">
                                        <td className="px-3 py-1.5 text-zinc-100 font-medium">{row.이름}</td>
                                        <td className="px-3 py-1.5 text-zinc-400">{extractPart(row.비고)}</td>
                                        <td className="px-3 py-1.5 text-zinc-400">{extractRental(row.비고)}</td>
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
    const [sort, setSort] = useState<"date" | "late" | "overtime">("date");

    const sorted = useMemo(() => {
        return [...rows].sort((a, b) => {
            if (sort === "late") return safeNum(b["지각(분)"]) - safeNum(a["지각(분)"]);
            if (sort === "overtime") return safeNum(b["오버타임(분)"]) - safeNum(a["오버타임(분)"]);
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
                        { key: "date", label: "최신순" },
                        { key: "late", label: "지각 순" },
                        { key: "overtime", label: "오버타임 순" },
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
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((row, i) => (
                            <tr key={i} className="border-b border-zinc-800/30 hover:bg-zinc-800/20 transition">

                                <td className="px-4 py-2 text-zinc-200 font-medium">{row.이름}</td>
                                <td className="px-4 py-2">
                                    {safeNum(row["지각(분)"]) > 0 ? (
                                        <span className="text-rose-400 font-bold">{row["지각(분)"]}분</span>
                                    ) : (
                                        <span className="text-zinc-700">-</span>
                                    )}
                                </td>
                                <td className="px-4 py-2">
                                    {safeNum(row["오버타임(분)"]) > 0 ? (
                                        <span className="text-emerald-400 font-bold">{row["오버타임(분)"]}분</span>
                                    ) : (
                                        <span className="text-zinc-700">-</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── 사람별 상세 리스트 카드 (총합 없이 개인별만) ─────────────
function DetailStatCard({
    icon: Icon,
    label,
    persons,
    accentClass,
}: {
    icon: React.ElementType;
    label: string;
    persons: PersonStat[];
    accentClass: string;
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
                                {p.total}분
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
                if (res.success) setData(res.data);
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
    const weeklyLate = useMemo(
        () => weekRows.reduce((s, r) => s + safeNum(r["지각(분)"]), 0),
        [weekRows]
    );
    const weeklyOvertime = useMemo(
        () => weekRows.reduce((s, r) => s + safeNum(r["오버타임(분)"]), 0),
        [weekRows]
    );
    const weeklyLatePersons = useMemo(
        () => getPerPersonStats(weekRows, "지각(분)"),
        [weekRows]
    );
    const weeklyOvertimePersons = useMemo(
        () => getPerPersonStats(weekRows, "오버타임(분)"),
        [weekRows]
    );

    // ── 월간 통계 ────────────────────────────────────────
    const monthlyLate = useMemo(
        () => monthRows.reduce((s, r) => s + safeNum(r["지각(분)"]), 0),
        [monthRows]
    );
    const monthlyOvertime = useMemo(
        () => monthRows.reduce((s, r) => s + safeNum(r["오버타임(분)"]), 0),
        [monthRows]
    );
    const monthlyTotalShifts = monthRows.length;
    const monthlyUniqueWorkers = useMemo(
        () => new Set(monthRows.map((r) => r.이름)).size,
        [monthRows]
    );
    const monthlyLatePersons = useMemo(
        () => getPerPersonStats(monthRows, "지각(분)"),
        [monthRows]
    );
    const monthlyOvertimePersons = useMemo(
        () => getPerPersonStats(monthRows, "오버타임(분)"),
        [monthRows]
    );



    // ── 월간 일자별 그룹 ────────────────────────────────
    const monthlyByDate = useMemo(() => {
        const map = new Map<string, AttendanceRow[]>();
        for (const row of monthRows) {
            const key = row.날짜;
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(row);
        }
        return Array.from(map.entries()).sort(
            (a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()
        );
    }, [monthRows]);

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
                                {/* 주간 지각 — 사람별 */}
                                <DetailStatCard
                                    icon={AlertTriangle}
                                    label="주간 지각"
                                    persons={weeklyLatePersons}
                                    accentClass="text-rose-400"
                                />

                                {/* 주간 오버타임 — 사람별 */}
                                <DetailStatCard
                                    icon={Clock}
                                    label="주간 오버타임"
                                    persons={weeklyOvertimePersons}
                                    accentClass="text-emerald-400"
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
                                <WorkerTableByBranch rows={todayRows} />
                            </section>

                            {/* 이번 주 요일별 기록 (월~일) */}
                            <section className="space-y-px">
                                <div className="border border-zinc-800 px-4 py-2.5 bg-zinc-900/40">
                                    <span className="text-xs font-semibold text-zinc-300">
                                        이번 주 전체 기록
                                    </span>
                                    <span className="text-[10px] text-zinc-600 ml-2">
                                        {weekRows.length}건
                                    </span>
                                </div>

                                <WeeklyRecordTable rows={weekRows} />
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

                            {/* 통계 카드 */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-px border border-zinc-800">
                                <div className="bg-zinc-900/60 p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <TrendingUp size={14} className="text-zinc-400" />
                                        <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">
                                            총 근무
                                        </span>
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-bold tracking-tight text-zinc-100">
                                            {monthlyTotalShifts}
                                        </span>
                                        <span className="text-xs text-zinc-600">건</span>
                                    </div>
                                </div>

                                <div className="bg-zinc-900/60 p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Users size={14} className="text-zinc-400" />
                                        <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">
                                            참여 인원
                                        </span>
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-bold tracking-tight text-zinc-100">
                                            {monthlyUniqueWorkers}
                                        </span>
                                        <span className="text-xs text-zinc-600">명</span>
                                    </div>
                                </div>

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

                            {/* 일자별 리스트 */}
                            <section className="space-y-px">
                                <div className="border border-zinc-800 px-4 py-2.5 bg-zinc-900/40">
                                    <span className="text-xs font-semibold text-zinc-300">
                                        월간 전체 기록
                                    </span>
                                </div>

                                {monthlyByDate.length === 0 ? (
                                    <div className="border border-zinc-800 border-t-0 py-8 text-center">
                                        <p className="text-xs text-zinc-600">
                                            이번 달 등록된 데이터가 없습니다.
                                        </p>
                                    </div>
                                ) : (
                                    monthlyByDate.map(([dateStr, rows]) => (
                                        <div
                                            key={dateStr}
                                            className="border border-zinc-800 border-t-0"
                                        >
                                            <div className="flex items-center justify-between border-b border-zinc-800/60 px-4 py-2 bg-zinc-950">
                                                <span className="text-[11px] font-medium text-zinc-400">
                                                    {formatDateKR(dateStr)}
                                                </span>
                                                <span className="text-[10px] text-zinc-700">
                                                    {rows.length}명
                                                </span>
                                            </div>
                                            <WorkerTable rows={rows} />
                                        </div>
                                    ))
                                )}
                            </section>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}

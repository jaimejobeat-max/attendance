"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ClipboardPaste,
    Send,
    Trash2,
    Plus,
    CheckCircle2,
    AlertCircle,
    ArrowLeft,
    Loader2,
    ChevronDown,
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
}

// ── 드롭다운 옵션 ──────────────────────────────────────────
const BRANCH_OPTIONS = ["홍대", "강남", "건대", "성수", "합정", "이태원", "신촌"];
const NAME_OPTIONS = [
    "진리", "다빈", "인아", "수빈", "하준", "서연", "지우",
    "민준", "예린", "도현", "유나", "시우", "채원", "현우",
];

// ── 숫자(시간) 판별 헬퍼 ─────────────────────────────────────
function isTimeToken(tok: string): boolean {
    return /^\d{1,2}(:\d{2})?$/.test(tok);
}

// ── 텍스트 파서 ────────────────────────────────────────────
function parseScheduleText(text: string, date: string): AttendanceRow[] {
    const results: AttendanceRow[] = [];
    const lines = text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

    let lastBatchStart = 0;

    for (const line of lines) {
        // *로 시작하는 줄 → 비고
        if (line.startsWith("*")) {
            const memo = line.slice(1).trim();
            for (let i = lastBatchStart; i < results.length; i++) {
                results[i].비고 = results[i].비고
                    ? results[i].비고 + " / " + memo
                    : memo;
            }
            continue;
        }

        lastBatchStart = results.length;

        // 괄호 안 내용 추출
        const parenRegex = /\(([^)]+)\)/g;
        const parenMatches: string[] = [];
        let match;
        while ((match = parenRegex.exec(line)) !== null) {
            parenMatches.push(match[1].trim());
        }

        const mainPart = line.replace(/\([^)]*\)/g, "").trim();
        const tokens = mainPart.split(/\s+/);
        if (tokens.length < 2) continue;

        let idx = 0;
        const branch = tokens[idx++];

        let checkIn = "";
        if (idx < tokens.length && isTimeToken(tokens[idx])) {
            checkIn = tokens[idx++];
        }

        while (idx < tokens.length) {
            const tok = tokens[idx];
            if (isTimeToken(tok)) { idx++; continue; }

            const name = tokens[idx++];
            let checkOut = "";
            if (idx < tokens.length && isTimeToken(tokens[idx])) {
                checkOut = tokens[idx++];
            }

            results.push({
                날짜: date, 지점: branch, 이름: name,
                예정출근: checkIn, 실제출근: "", 예정퇴근: checkOut, 실제퇴근: "",
                "지각(분)": "", "오버타임(분)": "", 비고: "",
            });
        }

        for (const pContent of parenMatches) {
            const pTokens = pContent.split(/\s+/);
            let pCheckOut = "";
            const names: string[] = [];
            for (const pt of pTokens) {
                if (isTimeToken(pt) && !pCheckOut) pCheckOut = pt;
                else if (!isTimeToken(pt)) names.push(pt);
            }
            for (const name of names) {
                results.push({
                    날짜: date, 지점: branch, 이름: name,
                    예정출근: checkIn, 실제출근: "", 예정퇴근: pCheckOut, 실제퇴근: "",
                    "지각(분)": "", "오버타임(분)": "", 비고: "",
                });
            }
        }
    }

    return results;
}

// ── 드롭다운 셀 컴포넌트 ────────────────────────────────────
function DropdownCell({
    value,
    options,
    onChange,
}: {
    value: string;
    options: string[];
    onChange: (v: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [filter, setFilter] = useState("");
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const filtered = options.filter((o) =>
        o.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => { setOpen(!open); setFilter(""); }}
                className="flex items-center justify-between w-full px-2 py-1.5 text-left text-sm rounded border border-transparent hover:border-zinc-600 hover:bg-zinc-800/60 transition group"
            >
                <span className={value ? "text-zinc-100" : "text-zinc-600"}>
                    {value || "선택"}
                </span>
                <ChevronDown
                    size={12}
                    className="text-zinc-600 opacity-0 group-hover:opacity-100 transition ml-1 shrink-0"
                />
            </button>

            {open && (
                <div className="absolute z-50 top-full left-0 mt-1 w-36 bg-zinc-800 border border-zinc-700 rounded-lg shadow-2xl overflow-hidden">
                    <input
                        type="text"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        placeholder="검색..."
                        autoFocus
                        className="w-full px-3 py-2 text-xs bg-zinc-900/80 border-b border-zinc-700 text-zinc-100 outline-none placeholder:text-zinc-600"
                    />
                    <div className="max-h-40 overflow-y-auto">
                        {filtered.map((opt) => (
                            <button
                                key={opt}
                                onClick={() => { onChange(opt); setOpen(false); }}
                                className={`w-full text-left px-3 py-1.5 text-xs transition hover:bg-indigo-500/20 ${opt === value ? "bg-indigo-500/10 text-indigo-300" : "text-zinc-300"
                                    }`}
                            >
                                {opt}
                            </button>
                        ))}
                        {filtered.length === 0 && (
                            <p className="px-3 py-2 text-[10px] text-zinc-600">
                                결과 없음
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── 컬럼 정의 ──────────────────────────────────────────────
type ColKey = keyof AttendanceRow;
interface ColDef {
    key: ColKey;
    label: string;
    w: string; // tailwind width
    type: "text" | "dropdown-branch" | "dropdown-name";
}

const COLUMNS: ColDef[] = [
    { key: "날짜", label: "날짜", w: "w-[110px]", type: "text" },
    { key: "지점", label: "지점", w: "w-[90px]", type: "dropdown-branch" },
    { key: "이름", label: "이름", w: "w-[90px]", type: "dropdown-name" },
    { key: "예정출근", label: "예정출근", w: "w-[80px]", type: "text" },
    { key: "실제출근", label: "실제출근", w: "w-[80px]", type: "text" },
    { key: "예정퇴근", label: "예정퇴근", w: "w-[80px]", type: "text" },
    { key: "실제퇴근", label: "실제퇴근", w: "w-[80px]", type: "text" },
    { key: "지각(분)", label: "지각", w: "w-[64px]", type: "text" },
    { key: "오버타임(분)", label: "오버타임", w: "w-[72px]", type: "text" },
    { key: "비고", label: "비고", w: "w-[140px]", type: "text" },
];

// ── 메인 컴포넌트 ──────────────────────────────────────────
export default function InputPage() {
    const [rawText, setRawText] = useState("");
    const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [rows, setRows] = useState<AttendanceRow[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [toast, setToast] = useState<{
        type: "success" | "error";
        message: string;
    } | null>(null);

    const showToast = useCallback(
        (type: "success" | "error", message: string) => {
            setToast({ type, message });
            setTimeout(() => setToast(null), 4000);
        },
        []
    );

    // 텍스트 입력 → 즉시 파싱
    const handleTextChange = (text: string) => {
        setRawText(text);
        if (text.trim()) {
            const parsed = parseScheduleText(text, date);
            setRows(parsed);
        }
    };

    // 날짜 변경 시 기존 행의 날짜도 업데이트
    const handleDateChange = (newDate: string) => {
        setDate(newDate);
        setRows((prev) => prev.map((r) => ({ ...r, 날짜: newDate })));
    };

    // ── 시간 변환 헬퍼 (분 단위) ──────────────────────────────────
    function timeToMinutes(timeStr: string): number | null {
        if (!timeStr) return null;
        // "10" -> 10:00, "10:30" -> 10:30
        if (!/^\d{1,2}(:\d{2})?$/.test(timeStr)) return null;

        let [h, m] = timeStr.split(":").map(Number);
        if (isNaN(h)) return null;
        if (m === undefined) m = 0;
        return h * 60 + m;
    }

    // 셀 수정
    const updateCell = (rowIdx: number, key: ColKey, value: string) => {
        setRows((prev) =>
            prev.map((r, i) => {
                if (i !== rowIdx) return r;
                const updated = { ...r, [key]: value };

                // ── 지각 자동 계산: 실제출근 - 예정출근 ──
                if (key === "예정출근" || key === "실제출근") {
                    const sched = timeToMinutes(updated.예정출근);
                    const actual = timeToMinutes(updated.실제출근);
                    if (sched !== null && actual !== null) {
                        const diff = actual - sched;
                        updated["지각(분)"] = diff > 0 ? diff.toString() : "0";
                    } else if (!updated.실제출근) {
                        // 실제출근 값이 없으면 초기화
                        updated["지각(분)"] = "";
                    }
                }

                // ── 오버타임 자동 계산: 실제퇴근 - 예정퇴근 ──
                if (key === "예정퇴근" || key === "실제퇴근") {
                    const sched = timeToMinutes(updated.예정퇴근);
                    const actual = timeToMinutes(updated.실제퇴근);
                    if (sched !== null && actual !== null) {
                        const diff = actual - sched;
                        updated["오버타임(분)"] = diff > 0 ? diff.toString() : "0";
                    } else if (!updated.실제퇴근) {
                        // 실제퇴근 값이 없으면 초기화
                        updated["오버타임(분)"] = "";
                    }
                }

                return updated;
            })
        );
    };

    // 행 삭제
    const removeRow = (rowIdx: number) => {
        setRows((prev) => prev.filter((_, i) => i !== rowIdx));
    };

    // 빈 행 추가
    const addEmptyRow = () => {
        setRows((prev) => [
            ...prev,
            {
                날짜: date, 지점: "", 이름: "",
                예정출근: "", 실제출근: "", 예정퇴근: "", 실제퇴근: "",
                "지각(분)": "", "오버타임(분)": "", 비고: "",
            },
        ]);
    };

    // 전송
    const handleSubmit = async () => {
        if (rows.length === 0) return;
        setIsSending(true);

        try {
            const results = await Promise.all(
                rows.map((row) =>
                    fetch("/api/attendance", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(row),
                    })
                )
            );

            const allOk = results.every((r) => r.ok);
            if (allOk) {
                showToast("success", `${rows.length}건의 데이터가 시트에 기록되었습니다.`);
                setRows([]);
                setRawText("");
            } else {
                showToast("error", "일부 데이터 전송에 실패했습니다.");
            }
        } catch {
            showToast("error", "서버 연결에 실패했습니다.");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100">
            {/* ─── 헤더 ─── */}
            <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm">
                <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-6 py-3">
                    <Link
                        href="/"
                        className="flex items-center gap-1.5 text-zinc-500 transition hover:text-zinc-200"
                    >
                        <ArrowLeft size={14} />
                        <span className="text-xs">홈</span>
                    </Link>
                    <div className="h-4 w-px bg-zinc-800" />
                    <h1 className="text-sm font-semibold tracking-tight">
                        <span className="text-zinc-400">LAYER</span> 근태 입력
                    </h1>
                </div>
            </header>

            <main className="mx-auto max-w-[1400px] px-6 py-6 space-y-4">
                {/* ─── 텍스트 입력 + 날짜 ─── */}
                <section className="border border-zinc-800 bg-zinc-900/40">
                    <div className="flex items-center gap-3 border-b border-zinc-800 px-4 py-2.5">
                        <ClipboardPaste size={14} className="text-indigo-400" />
                        <span className="text-xs font-semibold text-zinc-300">
                            스케줄 텍스트 입력
                        </span>
                        <span className="text-[10px] text-zinc-600">
                            지점 출근시간 이름 퇴근시간 (퇴근 이름 이름) / *비고
                        </span>
                        <div className="ml-auto flex items-center gap-2">
                            <label className="text-[10px] text-zinc-500">날짜</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => handleDateChange(e.target.value)}
                                className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 outline-none focus:border-indigo-500"
                            />
                        </div>
                    </div>
                    <textarea
                        value={rawText}
                        onChange={(e) => handleTextChange(e.target.value)}
                        placeholder={`홍대 10 진리 18 (14 다빈 인아)\n*대관 15시\n강남 09 수빈 18`}
                        rows={4}
                        className="w-full resize-none bg-transparent px-4 py-3 font-mono text-sm text-zinc-100 placeholder:text-zinc-700 outline-none"
                    />
                </section>

                {/* ─── 스프레드시트 편집 테이블 ─── */}
                <section className="border border-zinc-800">
                    {/* 테이블 헤더 바 */}
                    <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2 bg-zinc-900/40">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-zinc-300">
                                근무 데이터
                            </span>
                            <span className="text-[10px] text-zinc-600">
                                {rows.length}건
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={addEmptyRow}
                                className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-zinc-400 border border-zinc-700 hover:border-zinc-500 hover:text-zinc-200 transition"
                            >
                                <Plus size={12} />
                                행 추가
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={rows.length === 0 || isSending}
                                className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {isSending ? (
                                    <Loader2 size={12} className="animate-spin" />
                                ) : (
                                    <Send size={12} />
                                )}
                                {isSending ? "전송 중..." : "시트로 전송"}
                            </button>
                        </div>
                    </div>

                    {/* 테이블 */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                            <thead>
                                <tr className="bg-zinc-900/60">
                                    <th className="w-8 px-1 py-2 text-center text-[10px] font-medium text-zinc-600 border-b border-zinc-800">
                                        #
                                    </th>
                                    {COLUMNS.map((col) => (
                                        <th
                                            key={col.key}
                                            className={`${col.w} px-1 py-2 text-left text-[10px] font-medium text-zinc-500 uppercase tracking-wider border-b border-zinc-800`}
                                        >
                                            {col.label}
                                        </th>
                                    ))}
                                    <th className="w-10 px-1 py-2 border-b border-zinc-800" />
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={COLUMNS.length + 2}
                                            className="py-12 text-center text-xs text-zinc-700"
                                        >
                                            텍스트를 입력하면 자동으로 분석됩니다
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((row, rowIdx) => (
                                        <motion.tr
                                            key={rowIdx}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ duration: 0.15, delay: rowIdx * 0.02 }}
                                            className="group border-b border-zinc-800/40 hover:bg-zinc-800/20 transition-colors"
                                        >
                                            {/* 행 번호 */}
                                            <td className="px-1 py-0.5 text-center text-[10px] text-zinc-700 border-r border-zinc-800/30">
                                                {rowIdx + 1}
                                            </td>

                                            {/* 각 셀 */}
                                            {COLUMNS.map((col) => (
                                                <td
                                                    key={col.key}
                                                    className={`${col.w} px-0.5 py-0.5 border-r border-zinc-800/20`}
                                                >
                                                    {col.type === "dropdown-branch" ? (
                                                        <DropdownCell
                                                            value={row[col.key]}
                                                            options={BRANCH_OPTIONS}
                                                            onChange={(v) =>
                                                                updateCell(rowIdx, col.key, v)
                                                            }
                                                        />
                                                    ) : col.type === "dropdown-name" ? (
                                                        <DropdownCell
                                                            value={row[col.key]}
                                                            options={NAME_OPTIONS}
                                                            onChange={(v) =>
                                                                updateCell(rowIdx, col.key, v)
                                                            }
                                                        />
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            value={row[col.key]}
                                                            onChange={(e) =>
                                                                updateCell(
                                                                    rowIdx,
                                                                    col.key,
                                                                    e.target.value
                                                                )
                                                            }
                                                            className="w-full px-2 py-1.5 bg-transparent text-sm text-zinc-200 rounded border border-transparent outline-none hover:border-zinc-700 focus:border-indigo-500/50 focus:bg-zinc-800/60 transition"
                                                        />
                                                    )}
                                                </td>
                                            ))}

                                            {/* 삭제 버튼 */}
                                            <td className="px-1 py-0.5 text-center">
                                                <button
                                                    onClick={() => removeRow(rowIdx)}
                                                    className="p-1 rounded text-zinc-700 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>

            {/* ─── 토스트 알림 ─── */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, x: "-50%" }}
                        animate={{ opacity: 1, y: 0, x: "-50%" }}
                        exit={{ opacity: 0, y: 50, x: "-50%" }}
                        className={`fixed bottom-8 left-1/2 z-50 flex items-center gap-3 px-5 py-3 text-sm font-medium shadow-2xl ${toast.type === "success"
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

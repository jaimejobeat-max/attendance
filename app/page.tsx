import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100 flex items-center justify-center">
      <div className="w-full max-w-lg px-6 space-y-10 text-center">
        {/* 로고 / 타이틀 */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            <span className="text-indigo-400">LAYER</span> STUDIOS
          </h1>
          <p className="text-sm text-zinc-500 tracking-widest uppercase">
            Attendance Management
          </p>
        </div>

        {/* 네비게이션 카드 */}
        <div className="grid gap-4">
          <Link
            href="/dashboard"
            className="group flex items-center gap-4 rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-5 shadow-lg transition hover:border-indigo-500/30 hover:bg-zinc-800/50"
          >
            <div className="rounded-xl bg-indigo-500/10 p-3 transition group-hover:bg-indigo-500/20">
              <svg
                className="w-6 h-6 text-indigo-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                />
              </svg>
            </div>
            <div className="text-left">
              <h2 className="font-semibold text-zinc-100">근태 대시보드</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                주간·월간 현황 한눈에 보기
              </p>
            </div>
          </Link>

          <Link
            href="/input"
            className="group flex items-center gap-4 rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-5 shadow-lg transition hover:border-emerald-500/30 hover:bg-zinc-800/50"
          >
            <div className="rounded-xl bg-emerald-500/10 p-3 transition group-hover:bg-emerald-500/20">
              <svg
                className="w-6 h-6 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
            </div>
            <div className="text-left">
              <h2 className="font-semibold text-zinc-100">스케줄 입력 도구</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                텍스트로 근태 데이터 일괄 입력
              </p>
            </div>
          </Link>

          <Link
            href="/manage"
            className="group flex items-center gap-4 rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-5 shadow-lg transition hover:border-amber-500/30 hover:bg-zinc-800/50"
          >
            <div className="rounded-xl bg-amber-500/10 p-3 transition group-hover:bg-amber-500/20">
              <svg
                className="w-6 h-6 text-amber-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                />
              </svg>
            </div>
            <div className="text-left">
              <h2 className="font-semibold text-zinc-100">데이터 관리</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                기존 데이터 검색·수정·삭제
              </p>
            </div>
          </Link>
        </div>

        <p className="text-xs text-zinc-600">
          © {new Date().getFullYear()} Layer Studios
        </p>
      </div>
    </div>
  );
}

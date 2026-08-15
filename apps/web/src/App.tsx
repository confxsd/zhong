import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  GraduationCap,
  Languages,
  Library,
  Moon,
  RotateCcw,
  Sun,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { api } from "./api/client";
import HistoryDetailPage from "./pages/HistoryDetailPage";
import HistoryPage from "./pages/HistoryPage";
import LibraryPage from "./pages/LibraryPage";
import ReviewPage from "./pages/ReviewPage";
import TranslatePage from "./pages/TranslatePage";

const NAV = [
  { to: "/", label: "Study", cn: "学习", icon: GraduationCap, end: true },
  { to: "/library", label: "Library", cn: "词库", icon: Library },
  { to: "/review", label: "Review", cn: "复习", icon: RotateCcw },
  { to: "/history", label: "History", cn: "记录", icon: Clock },
];

function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label="Toggle dark mode"
      className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface text-soft transition hover:bg-surface-strong hover:text-ink"
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

function SidebarContent({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: api.stats, refetchInterval: 30_000 });
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="flex h-full flex-col">
      <NavLink to="/" className="flex items-center gap-3 px-4 pb-6 pt-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent font-cn text-2xl font-bold text-white">
          仲
        </div>
        <div>
          <div className="text-lg font-bold leading-tight">Zhōng</div>
          <div className="text-xs text-soft">Chinese study companion</div>
        </div>
      </NavLink>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-accent text-white"
                  : "text-soft hover:bg-surface hover:text-ink"
              }`
            }
          >
            <item.icon size={18} />
            <span className="flex-1">{item.label}</span>
            <span className="text-[11px] opacity-40 transition group-hover:opacity-100">{item.cn}</span>
            {item.to === "/review" && stats && stats.due > 0 && (
              <span
                className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold ${
                  location.pathname === item.to ? "bg-white/25 text-white" : "bg-accent text-white"
                }`}
              >
                {stats.due}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4">
        <div className="mb-3 grid grid-cols-3 gap-2 text-center">
          <button onClick={() => navigate("/library")} title="Words in library" className="rounded-xl bg-surface px-1 py-2 transition hover:bg-surface-strong">
            <div className="text-sm font-bold text-ink">{stats ? stats.totalVocab : "–"}</div>
            <div className="text-[10px] text-soft">words</div>
          </button>
          <button onClick={() => navigate("/review")} title="Due for review" className="rounded-xl bg-surface px-1 py-2 transition hover:bg-surface-strong">
            <div className={`text-sm font-bold ${stats && stats.due > 0 ? "text-accent" : "text-ink"}`}>
              {stats ? stats.due : "–"}
            </div>
            <div className="text-[10px] text-soft">due</div>
          </button>
          <button onClick={() => navigate("/history")} title="Study sessions" className="rounded-xl bg-surface px-1 py-2 transition hover:bg-surface-strong">
            <div className="text-sm font-bold text-ink">{stats ? stats.sessions : "–"}</div>
            <div className="text-[10px] text-soft">sessions</div>
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-soft">
            <Languages size={14} />
            zh ⇄ en
          </div>
          <ThemeToggle dark={dark} onToggle={onToggle} />
        </div>
      </div>
    </div>
  );
}

function AppShell() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem("zhong-theme");
    return stored ? stored === "dark" : true;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("zhong-theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <div className="flex h-full">
      <aside className="hidden w-60 shrink-0 bg-paper md:block">
        <SidebarContent dark={dark} onToggle={() => setDark((d) => !d)} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="scrollbar-thin flex-1 overflow-y-auto px-4 pb-28 pt-5 md:px-8 md:pb-10 md:pt-7">
          <div className="mx-auto w-full max-w-4xl">
            <Outlet />
          </div>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around bg-paper px-2 py-2 md:hidden">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `relative flex flex-col items-center gap-0.5 rounded-xl px-4 py-1.5 text-[11px] font-medium transition ${
                isActive ? "text-accent" : "text-soft"
              }`
            }
          >
            <item.icon size={20} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<TranslatePage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/history/:id" element={<HistoryDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  Ellipsis,
  Flame,
  GraduationCap,
  History,
  LayoutDashboard,
  Library,
  Map,
  Moon,
  Music,
  RotateCcw,
  Sun,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { api } from "./api/client";
import DashboardPage from "./pages/DashboardPage";
import HistoryDetailPage from "./pages/HistoryDetailPage";
import HistoryPage from "./pages/HistoryPage";
import LibraryPage from "./pages/LibraryPage";
import ReviewPage from "./pages/ReviewPage";
import SongDetailPage from "./pages/SongDetailPage";
import SongsPage from "./pages/SongsPage";
import TrackPage from "./pages/TrackPage";
import TranslatePage from "./pages/TranslatePage";

const NAV = [
  { to: "/", label: "Home", cn: "首页", icon: LayoutDashboard, end: true },
  { to: "/study", label: "Study", cn: "学习", icon: GraduationCap },
  { to: "/songs", label: "Songs", cn: "歌曲", icon: Music },
  { to: "/review", label: "Review", cn: "复习", icon: RotateCcw },
  { to: "/track", label: "Track", cn: "课程", icon: Map },
  { to: "/library", label: "Library", cn: "词库", icon: Library },
];

const MOBILE_NAV = NAV.filter((item) => item.to !== "/songs" && item.to !== "/library");

const MORE_ITEMS = [
  { to: "/songs", label: "Songs", cn: "歌曲", icon: Music },
  { to: "/library", label: "Library", cn: "词库", icon: Library },
  { to: "/history", label: "History", cn: "历史", icon: History },
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
          <button onClick={() => navigate("/library")} title="Words in memory" className="rounded-xl bg-surface px-1 py-2 transition hover:bg-surface-strong">
            <div className="text-sm font-bold text-ink">{stats ? stats.totalVocab : "–"}</div>
            <div className="text-[10px] text-soft">words</div>
          </button>
          <button onClick={() => navigate("/review")} title="Due for review" className="rounded-xl bg-surface px-1 py-2 transition hover:bg-surface-strong">
            <div className={`text-sm font-bold ${stats && stats.due > 0 ? "text-accent" : "text-ink"}`}>
              {stats ? stats.due : "–"}
            </div>
            <div className="text-[10px] text-soft">due</div>
          </button>
          <button onClick={() => navigate("/review")} title="Day streak" className="rounded-xl bg-surface px-1 py-2 transition hover:bg-surface-strong">
            <div className="flex items-center justify-center gap-0.5 text-sm font-bold text-amber">
              <Flame size={11} />
              {stats ? stats.streak : "–"}
            </div>
            <div className="text-[10px] text-soft">streak</div>
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-soft">
            <Clock size={14} />
            <button onClick={() => navigate("/history")} className="transition hover:text-ink">
              History
            </button>
          </div>
          <ThemeToggle dark={dark} onToggle={onToggle} />
        </div>
      </div>
    </div>
  );
}

function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="More">
      <div className="anim-fade absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="anim-sheet-up absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-line bg-paper pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-2 shadow-[0_-16px_48px_rgba(0,0,0,0.2)]">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-surface-strong" />
        <div className="px-2">
          {MORE_ITEMS.map((item) => {
            const active = location.pathname === item.to;
            return (
              <button
                key={item.to}
                onClick={() => {
                  navigate(item.to);
                  onClose();
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  active ? "bg-accent text-white" : "text-ink hover:bg-surface"
                }`}
              >
                <item.icon size={18} />
                <span className="flex-1 text-left">{item.label}</span>
                <span className="text-xs opacity-40">{item.cn}</span>
              </button>
            );
          })}
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
  const [moreOpen, setMoreOpen] = useState(false);

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
        <header className="flex items-center justify-end gap-2 px-4 pt-3 md:hidden">
          <button
            onClick={() => setMoreOpen(true)}
            aria-label="More"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface text-soft transition hover:bg-surface-strong hover:text-ink"
          >
            <Ellipsis size={18} />
          </button>
          <ThemeToggle dark={dark} onToggle={() => setDark((d) => !d)} />
        </header>
        <main className="scrollbar-thin flex-1 overflow-y-auto px-4 pb-28 pt-4 md:px-8 md:pb-10 md:pt-7">
          <div className="mx-auto w-full max-w-4xl">
            <Outlet />
          </div>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around bg-paper px-1 pb-[env(safe-area-inset-bottom)] pt-2 md:hidden">
        {MOBILE_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[11px] font-medium transition ${
                isActive ? "text-accent" : "text-soft"
              }`
            }
          >
            <item.icon size={20} />
            <span className="max-w-full truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="/study" element={<TranslatePage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/track" element={<TrackPage />} />
        <Route path="/songs" element={<SongsPage />} />
        <Route path="/songs/:id" element={<SongDetailPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/history/:id" element={<HistoryDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
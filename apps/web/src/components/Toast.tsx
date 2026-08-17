import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

type ToastKind = "success" | "error";

const ToastContext = createContext<(message: string, kind?: ToastKind) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; message: string; kind: ToastKind }[]>([]);
  const counter = useRef(0);

  const push = useCallback((message: string, kind: ToastKind = "success") => {
    const id = ++counter.current;
    setItems((prev) => [...prev.slice(-2), { id, message, kind }]);
    window.setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 2600);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2 md:bottom-6">
        {items.map((t) => (
          <div
            key={t.id}
            className={`anim-pop pointer-events-auto flex items-center gap-2 rounded-full px-4 py-2 text-sm text-white ${
              t.kind === "error" ? "bg-red-600" : "bg-ink"
            }`}
          >
            {t.kind === "error" ? <XCircle size={15} className="shrink-0" /> : <CheckCircle2 size={15} className="shrink-0 text-jade" />}
            <span className="max-w-[70vw]">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
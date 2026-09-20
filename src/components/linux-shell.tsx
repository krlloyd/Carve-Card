import { useEffect, useState, type ReactNode } from "react";
import { desktopApi, type CarveDesktop } from "@/lib/desktop";
import { HelpDialog } from "@/components/help-dialog";

export function LinuxShell({
  subtitle,
  children,
}: {
  subtitle: string;
  children: ReactNode;
}) {
  const [desktop, setDesktop] = useState<CarveDesktop | undefined>(undefined);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    setDesktop(desktopApi());
  }, []);

  function onMin() {
    desktop?.minimize();
  }

  function onMax() {
    if (desktop) desktop.maximize();
    else void document.documentElement.requestFullscreen?.();
  }

  function onClose() {
    if (desktop) desktop.close();
    else window.close();
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-bg text-canvas">
      <header className="linux-drag relative z-20 flex h-11 shrink-0 items-center gap-3 border-b border-border bg-bg-elevated px-2 sm:px-3">
        <Mark />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold leading-none tracking-tight text-canvas">
            Carve Card
          </h1>
          <p className="mt-0.5 truncate font-mono text-xs tracking-wide text-canvas-muted uppercase">
            Inventables · X-Carve
          </p>
        </div>
        <div className="linux-no-drag flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="h-8 rounded-full px-3 text-sm font-semibold text-canvas hover:bg-bg"
          >
            Help
          </button>
          <WinBtn label="Minimize" onClick={onMin}>
            <rect x="4.5" y="9" width="11" height="1.6" rx="0.6" fill="currentColor" />
          </WinBtn>
          <WinBtn label="Maximize" onClick={onMax}>
            <rect
              x="5"
              y="5"
              width="10"
              height="10"
              rx="1.2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            />
          </WinBtn>
          <WinBtn label="Close" onClick={onClose} danger>
            <path
              d="M5.5 5.5 L14.5 14.5 M14.5 5.5 L5.5 14.5"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </WinBtn>
        </div>
      </header>
      <div className="h-1 shrink-0 bg-accent" />
      <div className="relative min-h-0 flex-1 overflow-x-clip overflow-y-auto">{children}</div>
      <footer className="flex h-8 shrink-0 items-center justify-between gap-3 border-t border-border bg-bg-elevated px-3 font-mono text-[11px] text-canvas-muted">
        <span className="min-w-0 truncate">{subtitle}</span>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="font-sans text-xs font-semibold text-canvas underline-offset-2 hover:underline"
          >
            Help
          </button>
          <span>{desktop ? "Room · Linux desktop" : "Room · SQLite"}</span>
        </div>
      </footer>
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}

function Mark() {
  return (
    <svg viewBox="0 0 40 40" className="linux-no-drag size-7 shrink-0 text-accent" aria-hidden="true">
      <rect width="40" height="40" rx="10" fill="currentColor" />
      <g className="text-accent-fg">
        <path
          d="M12 12 L28 28 M28 12 L12 28"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <circle cx="20" cy="20" r="3.4" fill="currentColor" />
      </g>
    </svg>
  );
}

function WinBtn({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={
        danger
          ? "flex size-8 items-center justify-center rounded-full text-canvas-muted transition-colors duration-150 hover:bg-danger hover:text-accent-fg"
          : "flex size-8 items-center justify-center rounded-full text-canvas-muted transition-colors duration-150 hover:bg-bg hover:text-canvas"
      }
    >
      <svg viewBox="0 0 20 20" className="size-3.5" aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}

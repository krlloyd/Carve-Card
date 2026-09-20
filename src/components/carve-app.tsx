import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, Copy, RotateCcw, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LinuxShell } from "@/components/linux-shell";
import { calculate } from "@/lib/cnc/calculate";
import {
  BITS,
  CATEGORIES,
  DIAMETERS_IN,
  DIAMETERS_MM,
  MACHINES,
  MATERIALS,
  OPERATIONS,
  PROJECTS,
  getBit,
  getMachine,
  getMaterial,
} from "@/lib/cnc/data";
import {
  chiploadLabel,
  feedUnit,
  formatDiameter,
  IN_TO_MM,
  inToDisplay,
  ipmToDisplay,
  lengthUnit,
  parseDiameterInput,
} from "@/lib/cnc/format";
import type { Aggression, ChiploadBand, MaterialCategory } from "@/lib/cnc/types";
import { useShop, hydrateShop } from "@/lib/store";
import { cn } from "@/lib/utils";

const CAT_DOT: Record<MaterialCategory, string> = {
  wood: "bg-cat-wood",
  sheet: "bg-cat-sheet",
  plastic: "bg-cat-plastic",
  metal: "bg-cat-metal",
  foam: "bg-cat-foam",
  other: "bg-cat-other",
};

const BAND_COPY: Record<ChiploadBand, { label: string; cls: string }> = {
  rubbing: { label: "Rubbing", cls: "text-danger" },
  light: { label: "Light", cls: "text-warn" },
  sweet: { label: "Sweet spot", cls: "text-ok" },
  heavy: { label: "Heavy", cls: "text-warn" },
  overload: { label: "Overload", cls: "text-danger" },
};

export function CarveApp() {
  const shop = useShop();
  const [category, setCategory] = useState<MaterialCategory | "all">("all");
  const [copied, setCopied] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [customDia, setCustomDia] = useState("");

  useEffect(() => {
    void hydrateShop();
  }, []);

  const machine = getMachine(shop.machineId);
  const material = getMaterial(shop.materialId);
  const bit = getBit(shop.bitType);

  const result = useMemo(
    () =>
      calculate({
        machineId: shop.machineId,
        materialId: shop.materialId,
        bitType: shop.bitType,
        diameterIn: shop.diameterIn,
        flutes: shop.flutes,
        operation: shop.operation,
        aggression: shop.aggression,
        rpmOverride: shop.rpmOverride,
      }),
    [
      shop.machineId,
      shop.materialId,
      shop.bitType,
      shop.diameterIn,
      shop.flutes,
      shop.operation,
      shop.aggression,
      shop.rpmOverride,
    ],
  );

  const units = shop.units;
  const diameters = units === "mm" ? DIAMETERS_MM.map((mm) => mm / IN_TO_MM) : DIAMETERS_IN;

  const filtered =
    category === "all" ? MATERIALS : MATERIALS.filter((m) => m.category === category);

  async function copyCard() {
    const text = result.easelText;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      setCopied(ok);
    }
    window.setTimeout(() => setCopied(false), 1600);
  }

  function commitSave() {
    shop.saveCard(saveName);
    setSaveName("");
    setSaveOpen(false);
  }

  return (
    <LinuxShell subtitle={`${machine.shortName} · ${material.name} · ${bit.name}`}>
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 sm:py-8 lg:gap-8">
        <Header units={units} onUnits={shop.setUnits} />

        <section className="flex min-w-0 flex-col gap-2">
          <SectionLabel>Job starters</SectionLabel>
          <div className="no-scrollbar flex w-full min-w-0 gap-2 overflow-x-auto pb-1">
            {PROJECTS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => shop.applyProject(p)}
                className="h-11 shrink-0 rounded-full bg-surface px-4 text-sm text-fg shadow-[var(--shadow-border)] transition-[background-color,box-shadow] duration-150 hover:bg-surface-2 hover:shadow-[var(--shadow-border-hover)]"
              >
                {p.label}
              </button>
            ))}
          </div>
        </section>

        <div className="flex min-w-0 flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8">
          <div className="flex min-w-0 flex-col gap-6 lg:col-start-1 lg:row-start-1">
            <section className="flex flex-col gap-3">
              <SectionLabel>Machine</SectionLabel>
              <div className="grid gap-2 sm:grid-cols-3">
                {MACHINES.map((m) => {
                  const on = m.id === shop.machineId;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => shop.setMachine(m.id)}
                      className={cn(
                        "flex min-h-11 w-full min-w-0 flex-col items-start gap-1 rounded-lg p-4 text-left whitespace-normal transition-[background-color,box-shadow,color] duration-150",
                        on
                          ? "bg-accent text-accent-fg"
                          : "bg-surface text-fg shadow-[var(--shadow-border)] hover:shadow-[var(--shadow-border-hover)]",
                      )}
                    >
                      <span className="text-sm font-medium">{m.name}</span>
                      <span className={cn("text-xs leading-snug", on ? "text-accent-fg/70" : "text-muted")}>
                        {m.spindleName} · {m.rpmMin / 1000}–{m.rpmMax / 1000}k
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-sm text-canvas">{machine.blurb}</p>
            </section>

            <section className="flex flex-col gap-3">
              <SectionLabel>Material</SectionLabel>
              <div className="no-scrollbar flex w-full min-w-0 gap-1 overflow-x-auto pb-1">
                <CatChip label="All" on={category === "all"} onClick={() => setCategory("all")} />
                {CATEGORIES.map((c) => (
                  <CatChip
                    key={c.id}
                    label={c.label}
                    dot={CAT_DOT[c.id]}
                    on={category === c.id}
                    onClick={() => setCategory(c.id)}
                  />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {filtered.map((m) => {
                  const on = m.id === shop.materialId;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => shop.setMaterial(m.id)}
                      className={cn(
                        "flex min-h-14 w-full min-w-0 flex-col items-start justify-center gap-0.5 rounded-md px-3 py-2.5 text-left whitespace-normal transition-[background-color,box-shadow,color] duration-150",
                        on
                          ? "bg-accent text-accent-fg"
                          : "bg-surface text-fg shadow-[var(--shadow-border)] hover:shadow-[var(--shadow-border-hover)]",
                      )}
                    >
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <span
                          className={cn(
                            "size-1.5 shrink-0 rounded-full",
                            on ? "bg-accent-fg/70" : CAT_DOT[m.category],
                          )}
                        />
                        {m.name}
                      </span>
                      <span className={cn("line-clamp-1 pl-3.5 text-xs", on ? "text-accent-fg/65" : "text-subtle")}>
                        {m.aka}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <SectionLabel>Bit & cut</SectionLabel>
              <div className="grid grid-cols-2 gap-2">
                {BITS.map((b) => {
                  const on = b.id === shop.bitType;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => shop.setBitType(b.id)}
                      className={cn(
                        "flex min-h-11 w-full min-w-0 flex-col items-start gap-0.5 rounded-md px-3 py-2.5 text-left whitespace-normal transition-[background-color,box-shadow] duration-150",
                        on
                          ? "bg-accent text-accent-fg"
                          : "bg-surface text-fg shadow-[var(--shadow-border)] hover:shadow-[var(--shadow-border-hover)]",
                      )}
                    >
                      <span className="text-sm font-medium">{b.name}</span>
                      <span className={cn("text-xs leading-snug", on ? "text-accent-fg/65" : "text-subtle")}>
                        {b.blurb}
                      </span>
                    </button>
                  );
                })}
              </div>

              <FieldLabel>Diameter</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {diameters.map((d) => {
                  const on = Math.abs(d - shop.diameterIn) < 0.001;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => shop.setDiameterIn(d)}
                      className={cn(
                        "h-11 min-w-11 rounded-sm px-3 font-mono text-sm tabular-nums transition-colors duration-150",
                        on
                          ? "bg-accent text-accent-fg"
                          : "bg-surface text-fg shadow-[var(--shadow-border)] hover:bg-surface-2",
                      )}
                    >
                      {formatDiameter(d, units)}
                    </button>
                  );
                })}
              </div>
              <input
                type="number"
                min={0.02}
                step={units === "mm" ? 0.1 : 0.001}
                inputMode="decimal"
                placeholder={units === "mm" ? "Custom mm" : "Custom in"}
                value={customDia}
                onChange={(e) => setCustomDia(e.target.value)}
                onBlur={() => {
                  const n = parseDiameterInput(customDia, units);
                  if (n) shop.setDiameterIn(n);
                }}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  const n = parseDiameterInput(customDia, units);
                  if (n) shop.setDiameterIn(n);
                }}
                className="h-11 w-full rounded-md bg-surface px-3 font-mono text-sm text-fg shadow-[var(--shadow-border)] placeholder:text-subtle"
              />

              {!bit.forceFlutes ? (
                <>
                  <FieldLabel>Flutes</FieldLabel>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => shop.setFlutes(n)}
                        className={cn(
                          "h-11 rounded-sm font-mono text-sm tabular-nums transition-colors duration-150",
                          shop.flutes === n
                            ? "bg-accent text-accent-fg"
                            : "bg-surface text-fg shadow-[var(--shadow-border)] hover:bg-surface-2",
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-canvas">
                  {bit.name} runs as {bit.forceFlutes}-flute.
                </p>
              )}

              <FieldLabel>Operation</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {OPERATIONS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => shop.setOperation(o.id)}
                    className={cn(
                      "h-11 rounded-full px-4 text-sm transition-colors duration-150",
                      shop.operation === o.id
                        ? "bg-accent text-accent-fg"
                        : "bg-surface text-fg shadow-[var(--shadow-border)] hover:bg-surface-2",
                    )}
                  >
                    {o.name}
                  </button>
                ))}
              </div>
              <p className="text-sm text-canvas">
                {OPERATIONS.find((o) => o.id === shop.operation)?.blurb}
              </p>

              <FieldLabel>How hard to push</FieldLabel>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ["conservative", "Gentle"],
                    ["balanced", "Balanced"],
                    ["aggressive", "Push it"],
                  ] as [Aggression, string][]
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => shop.setAggression(id)}
                    className={cn(
                      "h-11 rounded-md text-sm font-medium transition-colors duration-150",
                      shop.aggression === id
                        ? "bg-accent text-accent-fg"
                        : "bg-surface text-fg shadow-[var(--shadow-border)] hover:bg-surface-2",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </section>
          </div>

          <div className="order-first flex min-w-0 flex-col gap-4 lg:order-none lg:col-start-2 lg:row-start-1 lg:sticky lg:top-6">
            <article className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs tracking-widest text-accent uppercase">Shop card</p>
                  <h2 className="mt-1 text-lg font-medium text-fg">
                    {material.name}
                    <span className="text-muted"> · {machine.shortName}</span>
                  </h2>
                  <p className="text-sm text-muted">
                    {formatDiameter(shop.diameterIn, units)} {bit.name.toLowerCase()}
                    {bit.forceFlutes ? "" : ` · ${shop.flutes} flute`}
                    {" · "}
                    {OPERATIONS.find((o) => o.id === shop.operation)?.name}
                  </p>
                </div>
                <DifficultyPill value={material.difficulty} />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat
                  value={result.rpm.toLocaleString()}
                  label="RPM"
                  hint={
                    result.dial
                      ? `Dial ${result.dial.n}`
                      : result.vfdHz
                        ? `${result.vfdHz} Hz`
                        : machine.spindleName
                  }
                />
                <Stat value={ipmToDisplay(result.feedIpm, units)} label={feedUnit(units)} hint="Feed" />
                <Stat value={ipmToDisplay(result.plungeIpm, units)} label={feedUnit(units)} hint="Plunge" />
                <Stat
                  value={inToDisplay(result.docIn, units, 3)}
                  label={lengthUnit(units)}
                  hint="Depth / pass"
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <MiniStat label="Chipload" value={chiploadLabel(result.chiploadIn, units)} />
                <MiniStat
                  label="Stepover"
                  value={
                    result.stepoverIn != null && result.stepoverPct != null
                      ? `${inToDisplay(result.stepoverIn, units, 3)} ${lengthUnit(units)} · ${result.stepoverPct}%`
                      : "Full slot"
                  }
                />
                <MiniStat
                  label="MRR"
                  value={
                    units === "mm"
                      ? `${Math.round(result.mrrIn3 * 16387)} mm³/min`
                      : `${result.mrrIn3.toFixed(2)} in³/min`
                  }
                  className="col-span-2 sm:col-span-1"
                />
              </div>

              <ChiploadMeter
                band={result.chiploadBand}
                actual={result.chiploadIn}
                target={result.targetChiploadIn}
              />

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <FieldLabel className="mt-0 mb-0 text-muted">
                    {machine.spindleKind === "vfd" ? "Spindle RPM" : "Router RPM"}
                  </FieldLabel>
                  {shop.rpmOverride != null ? (
                    <button
                      type="button"
                      onClick={() => shop.setRpmOverride(null)}
                      className="inline-flex h-9 items-center gap-1 rounded-sm px-2 text-xs text-muted hover:text-fg"
                    >
                      <RotateCcw className="size-3.5" />
                      Auto
                    </button>
                  ) : (
                    <span className="text-xs text-subtle">Auto from material</span>
                  )}
                </div>
                <input
                  type="range"
                  min={machine.rpmMin}
                  max={machine.rpmMax}
                  step={100}
                  value={result.rpm}
                  onChange={(e) => shop.setRpmOverride(Number(e.target.value))}
                  className="h-11 w-full accent-accent"
                  aria-label="Spindle RPM"
                />
                <div className="mt-1 flex justify-between font-mono text-xs tabular-nums text-subtle">
                  <span>{machine.rpmMin.toLocaleString()}</span>
                  <span>
                    {machine.spindleKind === "vfd"
                      ? `${result.vfdHz} Hz · ${machine.collet}`
                      : result.dial
                        ? `Dial ${result.dial.n} · ${machine.collet}`
                        : machine.collet}
                  </span>
                  <span>{machine.rpmMax.toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Button className="flex-1" onClick={() => void copyCard()}>
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copied ? "Copied" : "Copy for Easel"}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setSaveOpen(true);
                    setSaveName(`${material.name} ${formatDiameter(shop.diameterIn, units)}`);
                  }}
                >
                  <Save className="size-4" />
                  Save card
                </Button>
              </div>

              {saveOpen ? (
                <form
                  className="mt-3 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    commitSave();
                  }}
                >
                  <input
                    autoFocus
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    className="h-11 flex-1 rounded-md bg-surface px-3 text-sm text-fg shadow-[var(--shadow-border)]"
                    placeholder="Card name"
                  />
                  <Button type="submit" size="md">
                    Save
                  </Button>
                </form>
              ) : null}
            </article>

            {result.warnings.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {result.warnings.map((w) => (
                  <li
                    key={w.title + w.body}
                    className="rounded-lg bg-surface px-4 py-3 shadow-[var(--shadow-border)]"
                  >
                    <p
                      className={cn(
                        "text-sm font-medium",
                        w.level === "danger"
                          ? "text-danger"
                          : w.level === "warn"
                            ? "text-warn"
                            : "text-fg",
                      )}
                    >
                      {w.title}
                    </p>
                    <p className="mt-1 text-sm text-muted">{w.body}</p>
                  </li>
                ))}
              </ul>
            ) : null}

            <section className="rounded-lg bg-surface p-4 shadow-[var(--shadow-border)] sm:p-5">
              <h3 className="text-sm font-medium text-fg">For {material.name}</h3>
              <p className="mt-1 text-sm text-muted">{material.coolant}</p>
              <ul className="mt-3 flex flex-col gap-2">
                {result.tips.map((t) => (
                  <li key={t} className="text-sm leading-relaxed text-fg/90">
                    {t}
                  </li>
                ))}
              </ul>
              {result.passPlan.length > 0 ? (
                <div className="mt-4 border-t border-border pt-4">
                  <p className="mb-2 text-xs font-medium tracking-widest text-subtle uppercase">
                    Passes at this DOC
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {result.passPlan.map((p) => (
                      <div key={p.label} className="rounded-sm bg-surface-2 px-3 py-2">
                        <p className="font-mono text-sm tabular-nums text-fg">{p.passes}×</p>
                        <p className="text-xs text-subtle">{p.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            {shop.saved.length > 0 ? (
              <section className="flex flex-col gap-2">
                <SectionLabel>Saved cards</SectionLabel>
                <ul className="flex flex-col gap-2">
                  {shop.saved.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center gap-2 rounded-md bg-surface py-1 pr-1 pl-4 shadow-[var(--shadow-border)]"
                    >
                      <button
                        type="button"
                        onClick={() => shop.loadCard(c.id)}
                        className="min-h-11 flex-1 truncate text-left text-sm text-fg"
                      >
                        {c.name}
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${c.name}`}
                        onClick={() => shop.deleteCard(c.id)}
                        className="grid size-11 place-items-center text-subtle hover:text-danger"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </div>

        <p className="pb-6 text-xs leading-relaxed text-canvas-muted">
          Starting numbers for Inventables X-Carve machines with a spindle or DWP611. Paste into
          Easel, then listen to the cut: powder means rubbing, stringy plastic means heat, a
          growling gantry means too much depth. Shop-card starts, not a warranty.
        </p>
      </div>
    </LinuxShell>
  );
}

function Header({
  units,
  onUnits,
}: {
  units: "in" | "mm";
  onUnits: (u: "in" | "mm") => void;
}) {
  return (
    <header className="flex min-w-0 items-center justify-between gap-3">
      <p className="min-w-0 text-sm text-canvas">Cut settings for Easel and your spindle.</p>
      <div className="flex shrink-0 rounded-md bg-surface p-1 shadow-[var(--shadow-border)]">
        {(["in", "mm"] as const).map((u) => (
          <button
            key={u}
            type="button"
            onClick={() => onUnits(u)}
            className={cn(
              "h-9 min-w-11 rounded-sm px-3 font-mono text-sm transition-colors duration-150",
              units === u ? "bg-accent text-accent-fg" : "text-muted hover:text-fg",
            )}
          >
            {u}
          </button>
        ))}
      </div>
    </header>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-base font-bold tracking-wide text-canvas uppercase sm:text-lg">{children}</h2>
  );
}

function FieldLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("mt-2 text-xs font-medium tracking-wide text-canvas-muted uppercase", className)}>
      {children}
    </p>
  );
}

function CatChip({
  label,
  on,
  onClick,
  dot,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
  dot?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm transition-colors duration-150",
        on
          ? "bg-accent text-accent-fg"
          : "bg-surface text-fg shadow-[var(--shadow-border)] hover:bg-surface-2",
      )}
    >
      {dot ? (
        <span className={cn("size-1.5 rounded-full", on ? "bg-accent-fg/70" : dot)} />
      ) : null}
      {label}
    </button>
  );
}

function Stat({ value, label, hint }: { value: string; label: string; hint: string }) {
  return (
    <div className="rounded-md bg-surface px-3 py-3">
      <p className="font-mono text-2xl leading-none font-medium tabular-nums tracking-tight text-fg">
        {value}
      </p>
      <p className="mt-2 text-xs tracking-wide text-subtle uppercase">{hint}</p>
      <p className="font-mono text-xs text-muted">{label}</p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-md bg-surface px-3 py-2.5", className)}>
      <p className="text-xs tracking-wide text-subtle uppercase">{label}</p>
      <p className="mt-1 font-mono text-sm tabular-nums text-fg">{value}</p>
    </div>
  );
}

function ChiploadMeter({
  band,
  actual,
  target,
}: {
  band: ChiploadBand;
  actual: number;
  target: number;
}) {
  const ratio = Math.min(2, actual / target);
  const pct = Math.min(96, Math.max(4, (ratio / 2) * 100));
  const copy = BAND_COPY[band];
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-xs tracking-wide text-subtle uppercase">Chipload band</p>
        <p className={cn("font-mono text-xs", copy.cls)}>{copy.label}</p>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-surface-2">
        <div className="absolute inset-y-0 left-0 w-[22%] bg-danger/35" />
        <div className="absolute inset-y-0 left-[22%] w-[16%] bg-warn/35" />
        <div className="absolute inset-y-0 left-[38%] w-[22%] bg-ok/50" />
        <div className="absolute inset-y-0 left-[60%] w-[18%] bg-warn/35" />
        <div className="absolute inset-y-0 left-[78%] w-[22%] bg-danger/35" />
        <div
          className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg"
          style={{ left: `${pct}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-xs tracking-wide text-subtle uppercase">
        <span>Dust</span>
        <span>Cut</span>
        <span>Strain</span>
      </div>
    </div>
  );
}

function DifficultyPill({ value }: { value: "easy" | "moderate" | "demanding" }) {
  const label = value === "easy" ? "Easy" : value === "moderate" ? "Moderate" : "Demanding";
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-3 py-1 text-xs font-medium",
        value === "easy"
          ? "bg-ok/15 text-ok"
          : value === "moderate"
            ? "bg-surface-2 text-muted"
            : "bg-danger/15 text-danger",
      )}
    >
      {label}
    </span>
  );
}

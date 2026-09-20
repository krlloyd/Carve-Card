import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

const STEPS = [
  {
    title: "Start a job",
    body: "Job starters fill machine, material, and bit for common X-Carve work. Skip them if you already know the cut.",
  },
  {
    title: "Machine",
    body: "Pick the machine you actually have. X-Carve Pro with a VFD spindle can run faster feeds than a classic X-Carve with a DWP611. The shop card stays inside that machine’s RPM, feed, and plunge limits.",
  },
  {
    title: "Material",
    body: "Suggestions change with the stock. Hardwoods, sheet goods, plastics, aluminum, and foam each get their own SFM, chipload, and coolant note. Read the tips under the shop card before you cut.",
  },
  {
    title: "Bit & cut",
    body: "Set diameter and flutes, then the operation (profile, pocket, V-carve, drill, surfacing) and how hard to push. Gentle is the first pass on a new material. Balanced is the everyday card. Push it only after a test cut sounds clean.",
  },
  {
    title: "Read the shop card",
    body: "Use RPM, feed, plunge, and depth of cut in Easel. Chipload is chip size per tooth. Rubbing means the bit is polishing and will burn. Sweet spot is the target. Overload means back off feed or depth.",
  },
  {
    title: "Copy, then listen",
    body: "Copy for Easel pastes the numbers. Save a card when a cut works — it is stored in a local Room database (SQLite tables for settings and cards). Powder means rubbing, stringy plastic means heat, a growling gantry means too much depth. These are shop-card starts, not a warranty.",
  },
];

export function HelpDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Overlay className="absolute inset-0 bg-bg-elevated/75" />
          <Dialog.Content className="relative flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)] outline-none">
            <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div>
                <Dialog.Title className="text-lg font-bold tracking-tight text-fg">
                  How to use Carve Card
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-muted">
                  Feeds and speeds for Inventables X-Carve machines with a spindle or DWP611.
                </Dialog.Description>
              </div>
              <Dialog.Close
                className="grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg"
                aria-label="Close help"
              >
                <X className="size-4" />
              </Dialog.Close>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <ol className="flex flex-col gap-4">
                {STEPS.map((step, i) => (
                  <li key={step.title} className="flex gap-3">
                    <span className="font-mono text-sm font-bold text-accent tabular-nums">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-fg">{step.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

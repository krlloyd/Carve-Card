import { create } from "zustand";
import type { Aggression, BitType, Operation, ShopCard, Units } from "@/lib/cnc/types";
import { getBit } from "@/lib/cnc/data";
import type { ShopSnapshot } from "@/lib/room";

interface AppState {
  machineId: string;
  materialId: string;
  bitType: BitType;
  diameterIn: number;
  flutes: number;
  operation: Operation;
  aggression: Aggression;
  units: Units;
  rpmOverride: number | null;
  saved: ShopCard[];
  setMachine: (id: string) => void;
  setMaterial: (id: string) => void;
  setBitType: (id: BitType) => void;
  setDiameterIn: (n: number) => void;
  setFlutes: (n: number) => void;
  setOperation: (op: Operation) => void;
  setAggression: (a: Aggression) => void;
  setUnits: (u: Units) => void;
  setRpmOverride: (n: number | null) => void;
  applyProject: (p: {
    materialId: string;
    bitType: BitType;
    diameterIn: number;
    flutes: number;
    operation: Operation;
  }) => void;
  saveCard: (name: string) => void;
  loadCard: (id: string) => void;
  deleteCard: (id: string) => void;
}

let persist: ((snap: ShopSnapshot) => void) | null = null;

function snapshot(s: AppState): ShopSnapshot {
  return {
    machineId: s.machineId,
    materialId: s.materialId,
    bitType: s.bitType,
    diameterIn: s.diameterIn,
    flutes: s.flutes,
    operation: s.operation,
    aggression: s.aggression,
    units: s.units,
    rpmOverride: s.rpmOverride,
    saved: s.saved,
  };
}

export const useShop = create<AppState>()((set, get) => ({
  machineId: "xcarve-pro",
  materialId: "maple",
  bitType: "upcut",
  diameterIn: 0.25,
  flutes: 2,
  operation: "profile",
  aggression: "balanced",
  units: "in",
  rpmOverride: null,
  saved: [],
  setMachine: (machineId) => set({ machineId, rpmOverride: null }),
  setMaterial: (materialId) => set({ materialId, rpmOverride: null }),
  setBitType: (bitType) => {
    const bit = getBit(bitType);
    set({
      bitType,
      flutes: bit.forceFlutes ?? get().flutes,
      rpmOverride: null,
    });
  },
  setDiameterIn: (diameterIn) => set({ diameterIn, rpmOverride: null }),
  setFlutes: (flutes) => set({ flutes }),
  setOperation: (operation) => set({ operation, rpmOverride: null }),
  setAggression: (aggression) => set({ aggression }),
  setUnits: (units) => set({ units }),
  setRpmOverride: (rpmOverride) => set({ rpmOverride }),
  applyProject: (p) =>
    set({
      materialId: p.materialId,
      bitType: p.bitType,
      diameterIn: p.diameterIn,
      flutes: p.flutes,
      operation: p.operation,
      rpmOverride: null,
    }),
  saveCard: (name) => {
    const s = get();
    const card: ShopCard = {
      id: crypto.randomUUID(),
      name: name.trim() || "Untitled card",
      savedAt: Date.now(),
      input: {
        machineId: s.machineId,
        materialId: s.materialId,
        bitType: s.bitType,
        diameterIn: s.diameterIn,
        flutes: s.flutes,
        operation: s.operation,
        aggression: s.aggression,
      },
    };
    set({ saved: [card, ...s.saved].slice(0, 24) });
  },
  loadCard: (id) => {
    const card = get().saved.find((c) => c.id === id);
    if (!card) return;
    set({ ...card.input, rpmOverride: null });
  },
  deleteCard: (id) => set({ saved: get().saved.filter((c) => c.id !== id) }),
}));

useShop.subscribe((state) => {
  persist?.(snapshot(state));
});

export async function hydrateShop() {
  const sqlite = await import("@/lib/room");
  const snap = await sqlite.bootSqlite();
  useShop.setState(snap);
  persist = sqlite.persistSnapshot;
}

import type { Aggression, BitType, Operation, ShopCard, Units } from "@/lib/cnc/types";

export type ShopSnapshot = {
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
};

export type SettingsEntity = {
  id: 1;
  machineId: string;
  materialId: string;
  bitType: BitType;
  diameterIn: number;
  flutes: number;
  operation: Operation;
  aggression: Aggression;
  units: Units;
  rpmOverride: number | null;
  updatedAt: number;
};

export type CardEntity = {
  id: string;
  name: string;
  savedAt: number;
  machineId: string;
  materialId: string;
  bitType: BitType;
  diameterIn: number;
  flutes: number;
  operation: Operation;
  aggression: Aggression;
};

export const SETTINGS_DEFAULTS: Omit<SettingsEntity, "updatedAt"> = {
  id: 1,
  machineId: "xcarve-pro",
  materialId: "maple",
  bitType: "upcut",
  diameterIn: 0.25,
  flutes: 2,
  operation: "profile",
  aggression: "balanced",
  units: "in",
  rpmOverride: null,
};

export function snapshotFromRoom(settings: SettingsEntity, cards: CardEntity[]): ShopSnapshot {
  return {
    machineId: settings.machineId,
    materialId: settings.materialId,
    bitType: settings.bitType,
    diameterIn: settings.diameterIn,
    flutes: settings.flutes,
    operation: settings.operation,
    aggression: settings.aggression,
    units: settings.units,
    rpmOverride: settings.rpmOverride,
    saved: cards.map(cardFromEntity),
  };
}

export function settingsFromSnapshot(snap: ShopSnapshot): SettingsEntity {
  return {
    id: 1,
    machineId: snap.machineId,
    materialId: snap.materialId,
    bitType: snap.bitType,
    diameterIn: snap.diameterIn,
    flutes: snap.flutes,
    operation: snap.operation,
    aggression: snap.aggression,
    units: snap.units,
    rpmOverride: snap.rpmOverride,
    updatedAt: Date.now(),
  };
}

export function entityFromCard(card: ShopCard): CardEntity {
  return {
    id: card.id,
    name: card.name,
    savedAt: card.savedAt,
    machineId: card.input.machineId,
    materialId: card.input.materialId,
    bitType: card.input.bitType,
    diameterIn: card.input.diameterIn,
    flutes: card.input.flutes,
    operation: card.input.operation,
    aggression: card.input.aggression,
  };
}

export function cardFromEntity(row: CardEntity): ShopCard {
  return {
    id: row.id,
    name: row.name,
    savedAt: row.savedAt,
    input: {
      machineId: row.machineId,
      materialId: row.materialId,
      bitType: row.bitType,
      diameterIn: row.diameterIn,
      flutes: row.flutes,
      operation: row.operation,
      aggression: row.aggression,
    },
  };
}

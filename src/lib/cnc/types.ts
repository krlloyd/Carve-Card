export type Units = "in" | "mm";
export type Aggression = "conservative" | "balanced" | "aggressive";
export type Operation =
  | "profile"
  | "pocket"
  | "vcarve"
  | "3d-rough"
  | "3d-finish"
  | "surfacing"
  | "drill";
export type BitType =
  | "upcut"
  | "downcut"
  | "compression"
  | "ball"
  | "vbit60"
  | "vbit90"
  | "oflute"
  | "surfacing";
export type MaterialCategory = "wood" | "sheet" | "plastic" | "metal" | "foam" | "other";
export type SpindleKind = "vfd" | "router";
export type WarningLevel = "info" | "warn" | "danger";
export type ChiploadBand = "rubbing" | "light" | "sweet" | "heavy" | "overload";

export interface Machine {
  id: string;
  name: string;
  shortName: string;
  blurb: string;
  spindleKind: SpindleKind;
  spindleName: string;
  powerHp: number;
  rpmMin: number;
  rpmMax: number;
  collet: string;
  maxFeedIpm: number;
  maxPlungeIpm: number;
  /** Max depth of cut as a fraction of tool diameter. */
  docCap: number;
  /** 0–1 machine rigidity vs X-Carve Pro. Scales chipload. */
  rigidity: number;
  dials?: { n: number; rpm: number }[];
}

export interface Material {
  id: string;
  name: string;
  aka: string;
  category: MaterialCategory;
  /** Target chipload at 1/4" carbide, balanced, rigid machine (inches/tooth). */
  chipload025: number;
  /** Surface feet per minute for carbide router bits. */
  sfm: number;
  /** Ideal DOC as a fraction of diameter, before machine cap. */
  docFrac: number;
  plungeFrac: number;
  stepoverRough: number;
  stepoverFinish: number;
  suggestedBit: BitType;
  suggestedFlutes: number;
  difficulty: "easy" | "moderate" | "demanding";
  tips: string[];
  warnings: string[];
  coolant: string;
}

export interface BitProfile {
  id: BitType;
  name: string;
  blurb: string;
  chipload: number;
  doc: number;
  plunge: number;
  forceFlutes?: number;
  defaultDiameterIn: number;
}

export interface OperationProfile {
  id: Operation;
  name: string;
  blurb: string;
  chipload: number;
  doc: number;
  stepover: "rough" | "finish" | "none";
}

export interface Warning {
  level: WarningLevel;
  title: string;
  body: string;
}

export interface CalcInput {
  machineId: string;
  materialId: string;
  bitType: BitType;
  diameterIn: number;
  flutes: number;
  operation: Operation;
  aggression: Aggression;
  rpmOverride: number | null;
}

export interface PassPlan {
  thicknessIn: number;
  label: string;
  passes: number;
}

export interface CalcResult {
  rpm: number;
  rpmSource: "auto" | "override" | "dial";
  dial: { n: number; rpm: number } | null;
  vfdHz: number | null;
  chiploadIn: number;
  targetChiploadIn: number;
  chiploadBand: ChiploadBand;
  feedIpm: number;
  plungeIpm: number;
  docIn: number;
  stepoverIn: number | null;
  stepoverPct: number | null;
  mrrIn3: number;
  feedCapped: boolean;
  plungeCapped: boolean;
  warnings: Warning[];
  tips: string[];
  suggestedBit: BitType;
  suggestedFlutes: number;
  passPlan: PassPlan[];
  easelText: string;
}

export interface ShopCard {
  id: string;
  name: string;
  savedAt: number;
  input: Omit<CalcInput, "rpmOverride">;
}

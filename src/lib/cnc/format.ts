import type { Units } from "./types";

export const IN_TO_MM = 25.4;

export function inToDisplay(inches: number, units: Units, digits = 3): string {
  if (units === "mm") return (inches * IN_TO_MM).toFixed(Math.min(digits, 2));
  return inches.toFixed(digits);
}

export function ipmToDisplay(ipm: number, units: Units): string {
  if (units === "mm") return String(Math.round(ipm * IN_TO_MM));
  return String(ipm);
}

export function feedUnit(units: Units): string {
  return units === "mm" ? "mm/min" : "IPM";
}

export function lengthUnit(units: Units): string {
  return units === "mm" ? "mm" : "in";
}

export function formatDiameter(inches: number, units: Units): string {
  if (units === "mm") {
    const mm = inches * IN_TO_MM;
    return Number.isInteger(mm) ? `${mm} mm` : `${mm.toFixed(2)} mm`;
  }
  const denoms: [number, string][] = [
    [1 / 16, '1/16"'],
    [1 / 8, '1/8"'],
    [3 / 16, '3/16"'],
    [1 / 4, '1/4"'],
    [3 / 8, '3/8"'],
    [1 / 2, '1/2"'],
    [3 / 4, '3/4"'],
    [1, '1"'],
    [1.25, '1-1/4"'],
  ];
  const hit = denoms.find(([v]) => Math.abs(v - inches) < 0.001);
  return hit ? hit[1] : `${inches.toFixed(3)}"`;
}

export function parseDiameterInput(raw: string, units: Units): number | null {
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return units === "mm" ? n / IN_TO_MM : n;
}

export function chiploadLabel(inches: number, units: Units): string {
  if (units === "mm") return `${(inches * IN_TO_MM).toFixed(3)} mm`;
  return `${inches.toFixed(4)} in`;
}

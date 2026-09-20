import { getBit, getMachine, getMaterial, getOperation } from "./data";
import type {
  Aggression,
  CalcInput,
  CalcResult,
  ChiploadBand,
  PassPlan,
  Warning,
} from "./types";

const AGGRESSION: Record<
  Aggression,
  { chipload: number; doc: number; label: string }
> = {
  conservative: { chipload: 0.72, doc: 0.75, label: "Conservative" },
  balanced: { chipload: 1, doc: 1, label: "Balanced" },
  aggressive: { chipload: 1.22, doc: 1.12, label: "Aggressive" },
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function roundTo(n: number, step: number) {
  return Math.round(n / step) * step;
}

function nearestDial(rpm: number, dials: { n: number; rpm: number }[]) {
  return dials.reduce((best, d) =>
    Math.abs(d.rpm - rpm) < Math.abs(best.rpm - rpm) ? d : best,
  );
}

function chiploadBand(actual: number, target: number): ChiploadBand {
  const r = actual / target;
  if (r < 0.45) return "rubbing";
  if (r < 0.75) return "light";
  if (r <= 1.2) return "sweet";
  if (r <= 1.55) return "heavy";
  return "overload";
}

function stockOptions(): { thicknessIn: number; label: string }[] {
  return [
    { thicknessIn: 0.125, label: "1/8 in" },
    { thicknessIn: 0.25, label: "1/4 in" },
    { thicknessIn: 0.5, label: "1/2 in" },
    { thicknessIn: 0.75, label: "3/4 in" },
    { thicknessIn: 18 / 25.4, label: "18 mm" },
  ];
}

export function calculate(input: CalcInput): CalcResult {
  const machine = getMachine(input.machineId);
  const material = getMaterial(input.materialId);
  const bit = getBit(input.bitType);
  const op = getOperation(input.operation);
  const agg = AGGRESSION[input.aggression];

  const D = clamp(input.diameterIn, 0.02, 2.5);
  const flutes = bit.forceFlutes ?? clamp(Math.round(input.flutes), 1, 4);

  let rpm = (material.sfm * 3.82) / D;
  if (material.category === "plastic") rpm = Math.min(rpm, 18000);
  if (material.category === "metal") rpm = Math.min(rpm, 14000);
  if (material.category === "other") rpm = Math.min(rpm, 16000);
  rpm = clamp(rpm, machine.rpmMin, machine.rpmMax);
  rpm = roundTo(rpm, 500);
  rpm = clamp(rpm, machine.rpmMin, machine.rpmMax);

  let rpmSource: CalcResult["rpmSource"] = "auto";
  let dial: CalcResult["dial"] = null;

  if (input.rpmOverride != null) {
    rpm = clamp(roundTo(input.rpmOverride, 100), machine.rpmMin, machine.rpmMax);
    rpmSource = "override";
    if (machine.dials) dial = nearestDial(rpm, machine.dials);
  } else if (machine.dials) {
    dial = nearestDial(rpm, machine.dials);
    rpm = dial.rpm;
    rpmSource = "dial";
  }

  const vfdHz = machine.spindleKind === "vfd" ? Math.round(rpm / 60) : null;

  const diaScale = Math.pow(D / 0.25, 0.82);
  let smallBit = 1;
  if (D < 0.125) smallBit = 0.65 + 0.35 * (D / 0.125);

  const targetChipload = clamp(
    material.chipload025 *
      diaScale *
      smallBit *
      machine.rigidity *
      agg.chipload *
      bit.chipload *
      op.chipload,
    0.00035,
    0.018,
  );

  let chipload = targetChipload;
  let feedIpm = chipload * rpm * flutes;
  let feedCapped = false;
  if (feedIpm > machine.maxFeedIpm) {
    feedIpm = machine.maxFeedIpm;
    feedCapped = true;
    chipload = feedIpm / (rpm * flutes);
  }
  feedIpm = feedIpm < 20 ? roundTo(feedIpm, 0.5) : roundTo(feedIpm, 1);
  chipload = feedIpm / (rpm * flutes);

  let plungeIpm = feedIpm * material.plungeFrac * bit.plunge;
  let plungeCapped = false;
  if (plungeIpm > machine.maxPlungeIpm) {
    plungeIpm = machine.maxPlungeIpm;
    plungeCapped = true;
  }
  if (input.operation === "drill") {
    plungeIpm = Math.min(feedIpm * 0.6, machine.maxPlungeIpm);
  }
  plungeIpm = plungeIpm < 20 ? roundTo(plungeIpm, 0.5) : roundTo(plungeIpm, 1);

  let docFrac = Math.min(machine.docCap, material.docFrac) * agg.doc * bit.doc * op.doc;
  if (bit.id === "surfacing" || input.operation === "surfacing") {
    docFrac = (0.03 / D) * agg.doc;
  }
  if (bit.id === "vbit60" || bit.id === "vbit90") {
    docFrac = Math.min(0.22 / D, 0.7) * agg.doc;
  }
  let docIn = clamp(D * docFrac, 0.004, D * 1.6);
  if (material.category === "metal") {
    docIn = clamp(D * 0.12 * agg.doc * machine.rigidity, 0.004, 0.04 * (D / 0.125));
  }
  docIn = docIn < 0.05 ? roundTo(docIn, 0.001) : roundTo(docIn, 0.005);

  let stepoverPct: number | null = null;
  let stepoverIn: number | null = null;
  if (op.stepover === "rough") {
    stepoverPct = Math.round(material.stepoverRough * 100);
    if (bit.id === "surfacing") stepoverPct = 40;
    if (bit.id === "ball") stepoverPct = 35;
  } else if (op.stepover === "finish") {
    stepoverPct = Math.round(material.stepoverFinish * 100);
    if (bit.id === "ball") stepoverPct = 10;
  }
  if (stepoverPct != null) {
    stepoverIn = roundTo(D * (stepoverPct / 100), 0.001);
  }

  const width = stepoverIn ?? D;
  const mrrIn3 = roundTo(feedIpm * docIn * width, 0.01);

  const band = chiploadBand(chipload, targetChipload);

  const warnings: Warning[] = [];
  const tips: string[] = [...material.tips];

  if (material.suggestedBit !== input.bitType) {
    const rec = getBit(material.suggestedBit);
    tips.unshift(
      `For ${material.name}, a ${rec.name.toLowerCase()} is the usual starting bit.`,
    );
  }
  if (material.suggestedFlutes !== flutes && !bit.forceFlutes) {
    tips.unshift(
      `${material.suggestedFlutes}-flute is the usual pick in ${material.name.toLowerCase()}.`,
    );
  }

  if (band === "rubbing") {
    warnings.push({
      level: "danger",
      title: "Rubbing — chipload too thin",
      body: "The bit is polishing instead of cutting. Raise feed or drop RPM. Dust and burning come from going too slow, not too fast.",
    });
  } else if (band === "light") {
    warnings.push({
      level: "warn",
      title: "Light chipload",
      body: "Workable, but heat will build on long jobs. Nudge feed up until chips look like flakes or commas, not powder.",
    });
  } else if (band === "heavy") {
    warnings.push({
      level: "warn",
      title: "Heavy cut",
      body: "Listen for growl and watch for deflection. If the gantry shakes, drop depth per pass before you drop feed.",
    });
  } else if (band === "overload") {
    warnings.push({
      level: "danger",
      title: "Overload risk",
      body: "Chipload is past what this frame wants. Switch to Conservative or take a shallower pass.",
    });
  }

  if (feedCapped) {
    warnings.push({
      level: "warn",
      title: `Feed capped at ${machine.maxFeedIpm} IPM`,
      body: "This machine will not go faster. Chipload is lower than the material target — a larger bit or fewer flutes gets you closer.",
    });
  }
  if (plungeCapped) {
    warnings.push({
      level: "info",
      title: `Plunge capped at ${machine.maxPlungeIpm} IPM`,
      body: "X-Carve Z is the weak axis. Peck or ramp into the cut instead of plunging a slot at full depth.",
    });
  }

  if (material.category === "metal" && machine.rigidity < 0.8) {
    warnings.push({
      level: "danger",
      title: "Aluminum on a belt-drive X-Carve",
      body: "Possible, not pleasant. Tiny DOC, 1-flute, wax on every pass, and a plate bolted down — tape is not enough.",
    });
  }
  if (material.category === "metal" && flutes > 1) {
    warnings.push({
      level: "warn",
      title: "Use a single flute in metal",
      body: "Two flutes pack chips in a 1/8–1/4 in slot and weld. An O-flute is the right geometry.",
    });
  }
  if (material.category === "plastic" && flutes > 1) {
    warnings.push({
      level: "warn",
      title: "Plastics prefer one flute",
      body: "A second flute adds heat. If the kerf smears or chips weld, switch to an O-flute and raise feed.",
    });
  }
  if (material.category === "plastic" && rpm > 18000) {
    warnings.push({
      level: "info",
      title: "High RPM in plastic",
      body: "Heat first, then melt. If the edge frosts, drop a dial (or 2–4k RPM) and keep the feed up.",
    });
  }
  if (D <= 0.0625 && docIn > D * 0.6) {
    warnings.push({
      level: "warn",
      title: "Tiny bit, deep pass",
      body: "1/16 in bits snap from DOC, not feed. Halve depth per pass and keep chipload in the sweet band.",
    });
  }
  if (input.aggression === "aggressive" && machine.rigidity < 0.8) {
    warnings.push({
      level: "warn",
      title: "Aggressive on a classic X-Carve",
      body: "The belts will skip before the bit does. Balanced is the usual ceiling unless the frame is upgraded.",
    });
  }
  if ((bit.id === "vbit60" || bit.id === "vbit90") && input.operation !== "vcarve") {
    tips.unshift(
      "V-bits are happiest on the V-carve operation — tip speed is what matters, not slot chipload.",
    );
  }
  if (bit.id === "downcut" && input.operation === "pocket") {
    warnings.push({
      level: "info",
      title: "Downcut in a pocket",
      body: "Chips have nowhere to go. Take shallower passes or rough with an upcut and finish the floor.",
    });
  }

  for (const extra of material.warnings) {
    warnings.push({
      level: material.difficulty === "demanding" ? "warn" : "info",
      title: extra.split("—")[0]?.trim() || "Material note",
      body: extra,
    });
  }

  const passPlan: PassPlan[] = stockOptions()
    .filter((s) => s.thicknessIn >= docIn * 0.4)
    .slice(0, 4)
    .map((s) => ({
      thicknessIn: s.thicknessIn,
      label: s.label,
      passes: Math.max(1, Math.ceil(s.thicknessIn / docIn)),
    }));

  const stepoverLine =
    stepoverIn != null && stepoverPct != null
      ? `Stepover: ${stepoverIn.toFixed(3)} in (${stepoverPct}%)`
      : "Stepover: n/a (profile / V-carve)";

  const easelText = [
    `Carve Card — ${machine.name}`,
    `Material: ${material.name}`,
    `Bit: ${bit.name}, ${D} in, ${flutes} flute`,
    `Operation: ${op.name} · ${agg.label}`,
    `Spindle: ${rpm.toLocaleString()} RPM${dial ? ` (dial ${dial.n})` : ""}${vfdHz ? ` · ${vfdHz} Hz` : ""}`,
    `Feed: ${feedIpm} IPM`,
    `Plunge: ${plungeIpm} IPM`,
    `Depth/pass: ${docIn} in`,
    stepoverLine,
    `Chipload: ${chipload.toFixed(4)} in/tooth`,
  ].join("\n");

  return {
    rpm,
    rpmSource,
    dial,
    vfdHz,
    chiploadIn: chipload,
    targetChiploadIn: targetChipload,
    chiploadBand: band,
    feedIpm,
    plungeIpm,
    docIn,
    stepoverIn,
    stepoverPct,
    mrrIn3,
    feedCapped,
    plungeCapped,
    warnings,
    tips,
    suggestedBit: material.suggestedBit,
    suggestedFlutes: material.suggestedFlutes,
    passPlan,
    easelText,
  };
}

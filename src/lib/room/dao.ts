import type { Database } from "sql.js";
import { getBit, getMachine, getMaterial, getOperation } from "@/lib/cnc/data";
import type { Aggression, BitType, Operation, Units } from "@/lib/cnc/types";
import {
  SETTINGS_DEFAULTS,
  type CardEntity,
  type SettingsEntity,
} from "@/lib/room/entities";

type SqlValue = number | string | Uint8Array | null;

function rows(engine: Database, sql: string, params: SqlValue[] = []) {
  const stmt = engine.prepare(sql);
  if (params.length) stmt.bind(params);
  const out: Record<string, SqlValue>[] = [];
  while (stmt.step()) out.push(stmt.getAsObject());
  stmt.free();
  return out;
}

function asBit(v: SqlValue): BitType {
  return getBit(String(v ?? SETTINGS_DEFAULTS.bitType) as BitType).id;
}

function asOperation(v: SqlValue): Operation {
  return getOperation(String(v ?? SETTINGS_DEFAULTS.operation) as Operation).id;
}

function asAggression(v: SqlValue): Aggression {
  return v === "conservative" || v === "aggressive" ? v : "balanced";
}

function asUnits(v: SqlValue): Units {
  return v === "mm" ? "mm" : "in";
}

function machineId(v: SqlValue): string {
  const id = String(v ?? SETTINGS_DEFAULTS.machineId);
  return getMachine(id).id === id ? id : SETTINGS_DEFAULTS.machineId;
}

function materialId(v: SqlValue): string {
  const id = String(v ?? SETTINGS_DEFAULTS.materialId);
  return getMaterial(id).id === id ? id : SETTINGS_DEFAULTS.materialId;
}

function settingsFromRow(row: Record<string, SqlValue>): SettingsEntity {
  const bitType = asBit(row.bit_type);
  return {
    id: 1,
    machineId: machineId(row.machine_id),
    materialId: materialId(row.material_id),
    bitType,
    diameterIn: Number(row.diameter_in ?? SETTINGS_DEFAULTS.diameterIn),
    flutes: getBit(bitType).forceFlutes ?? Number(row.flutes ?? SETTINGS_DEFAULTS.flutes),
    operation: asOperation(row.operation),
    aggression: asAggression(row.aggression),
    units: asUnits(row.units),
    rpmOverride: row.rpm_override == null ? null : Number(row.rpm_override),
    updatedAt: Number(row.updated_at ?? Date.now()),
  };
}

function cardFromRow(row: Record<string, SqlValue>): CardEntity {
  return {
    id: String(row.id),
    name: String(row.name),
    savedAt: Number(row.saved_at),
    machineId: String(row.machine_id),
    materialId: String(row.material_id),
    bitType: asBit(row.bit_type),
    diameterIn: Number(row.diameter_in),
    flutes: Number(row.flutes),
    operation: asOperation(row.operation),
    aggression: asAggression(row.aggression),
  };
}

export class SettingsDao {
  constructor(private engine: Database) {}

  get(): SettingsEntity | null {
    const [row] = rows(this.engine, "SELECT * FROM shop_settings WHERE id = 1");
    return row ? settingsFromRow(row) : null;
  }

  upsert(entity: SettingsEntity) {
    this.engine.run(
      `INSERT INTO shop_settings (
        id, machine_id, material_id, bit_type, diameter_in, flutes, operation,
        aggression, units, rpm_override, updated_at
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        machine_id = excluded.machine_id,
        material_id = excluded.material_id,
        bit_type = excluded.bit_type,
        diameter_in = excluded.diameter_in,
        flutes = excluded.flutes,
        operation = excluded.operation,
        aggression = excluded.aggression,
        units = excluded.units,
        rpm_override = excluded.rpm_override,
        updated_at = excluded.updated_at`,
      [
        entity.machineId,
        entity.materialId,
        entity.bitType,
        entity.diameterIn,
        entity.flutes,
        entity.operation,
        entity.aggression,
        entity.units,
        entity.rpmOverride,
        entity.updatedAt,
      ],
    );
  }
}

export class CardDao {
  constructor(private engine: Database) {}

  getAll(): CardEntity[] {
    return rows(this.engine, "SELECT * FROM shop_cards ORDER BY saved_at DESC").map(cardFromRow);
  }

  upsert(entity: CardEntity) {
    this.engine.run(
      `INSERT INTO shop_cards (
        id, name, saved_at, machine_id, material_id, bit_type, diameter_in,
        flutes, operation, aggression
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        saved_at = excluded.saved_at,
        machine_id = excluded.machine_id,
        material_id = excluded.material_id,
        bit_type = excluded.bit_type,
        diameter_in = excluded.diameter_in,
        flutes = excluded.flutes,
        operation = excluded.operation,
        aggression = excluded.aggression`,
      [
        entity.id,
        entity.name,
        entity.savedAt,
        entity.machineId,
        entity.materialId,
        entity.bitType,
        entity.diameterIn,
        entity.flutes,
        entity.operation,
        entity.aggression,
      ],
    );
  }

  deleteById(id: string) {
    this.engine.run("DELETE FROM shop_cards WHERE id = ?", [id]);
  }

  sync(next: CardEntity[]) {
    const keep = new Set(next.map((c) => c.id));
    for (const row of this.getAll()) {
      if (!keep.has(row.id)) this.deleteById(row.id);
    }
    for (const card of next.slice(0, 24)) this.upsert(card);
  }
}

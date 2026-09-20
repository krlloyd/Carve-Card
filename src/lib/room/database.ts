import initSqlJs, { type Database } from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import { desktopApi } from "@/lib/desktop";
import { CardDao, SettingsDao } from "@/lib/room/dao";
import {
  SETTINGS_DEFAULTS,
  entityFromCard,
  settingsFromSnapshot,
  snapshotFromRoom,
  type ShopSnapshot,
} from "@/lib/room/entities";

export const ROOM_VERSION = 1;

const SCHEMA_V1 = `
CREATE TABLE IF NOT EXISTS room_meta (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version INTEGER NOT NULL,
  identity_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS shop_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  machine_id TEXT NOT NULL,
  material_id TEXT NOT NULL,
  bit_type TEXT NOT NULL,
  diameter_in REAL NOT NULL,
  flutes INTEGER NOT NULL,
  operation TEXT NOT NULL,
  aggression TEXT NOT NULL,
  units TEXT NOT NULL,
  rpm_override REAL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS shop_cards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  saved_at INTEGER NOT NULL,
  machine_id TEXT NOT NULL,
  material_id TEXT NOT NULL,
  bit_type TEXT NOT NULL,
  diameter_in REAL NOT NULL,
  flutes INTEGER NOT NULL,
  operation TEXT NOT NULL,
  aggression TEXT NOT NULL
);
`;

const IDB_NAME = "carve-card";
const IDB_STORE = "sqlite";
const IDB_KEY = "carve-card.sqlite";
const LEGACY_KEY = "carve-card-shop";
const IDENTITY = "shop_settings,shop_cards";

let room: ShopRoom | null = null;
let flushTimer = 0;

export class ShopRoom {
  readonly settings: SettingsDao;
  readonly cards: CardDao;

  constructor(private engine: Database) {
    this.settings = new SettingsDao(engine);
    this.cards = new CardDao(engine);
  }

  snapshot(): ShopSnapshot {
    const settings = this.settings.get() ?? {
      ...SETTINGS_DEFAULTS,
      updatedAt: Date.now(),
    };
    return snapshotFromRoom(settings, this.cards.getAll());
  }

  persist(snap: ShopSnapshot) {
    this.settings.upsert(settingsFromSnapshot(snap));
    this.cards.sync(snap.saved.map(entityFromCard));
    window.clearTimeout(flushTimer);
    flushTimer = window.setTimeout(() => {
      void flush(this.engine);
    }, 80);
  }
}

export async function bootSqlite(): Promise<ShopSnapshot> {
  const engine = await openEngine();
  room = new ShopRoom(engine);
  return room.snapshot();
}

export function persistSnapshot(snap: ShopSnapshot) {
  room?.persist(snap);
}

async function openEngine(): Promise<Database> {
  const SQL = await initSqlJs({ locateFile: () => wasmUrl });
  const bytes = await readBytes();
  const engine = bytes ? new SQL.Database(bytes) : new SQL.Database();
  migrate(engine);
  if (!new SettingsDao(engine).get()) {
    const legacy = readLegacy();
    const seed = new ShopRoom(engine);
    seed.settings.upsert(
      legacy ? settingsFromSnapshot(legacy) : { ...SETTINGS_DEFAULTS, updatedAt: Date.now() },
    );
    if (legacy) seed.cards.sync(legacy.saved.map(entityFromCard));
    await flush(engine);
    if (legacy) localStorage.removeItem(LEGACY_KEY);
  }
  return engine;
}

function migrate(engine: Database) {
  engine.run(SCHEMA_V1);
  const version = Number(engine.exec("PRAGMA user_version")[0]?.values[0]?.[0] ?? 0);
  if (version < ROOM_VERSION) {
    engine.run(`PRAGMA user_version = ${ROOM_VERSION}`);
  }
  engine.run(
    `INSERT INTO room_meta (id, version, identity_hash) VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET version = excluded.version, identity_hash = excluded.identity_hash`,
    [ROOM_VERSION, IDENTITY],
  );
}

function readLegacy(): ShopSnapshot | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: Partial<ShopSnapshot> };
    const s = parsed.state ?? {};
    return {
      machineId: s.machineId ?? SETTINGS_DEFAULTS.machineId,
      materialId: s.materialId ?? SETTINGS_DEFAULTS.materialId,
      bitType: s.bitType ?? SETTINGS_DEFAULTS.bitType,
      diameterIn: s.diameterIn ?? SETTINGS_DEFAULTS.diameterIn,
      flutes: s.flutes ?? SETTINGS_DEFAULTS.flutes,
      operation: s.operation ?? SETTINGS_DEFAULTS.operation,
      aggression: s.aggression ?? SETTINGS_DEFAULTS.aggression,
      units: s.units ?? SETTINGS_DEFAULTS.units,
      rpmOverride: s.rpmOverride ?? null,
      saved: Array.isArray(s.saved) ? s.saved : [],
    };
  } catch {
    return null;
  }
}

async function readBytes(): Promise<Uint8Array | null> {
  const desktop = desktopApi();
  if (desktop?.readDb) {
    const buf = await desktop.readDb();
    return buf && buf.byteLength > 0 ? new Uint8Array(buf) : null;
  }
  return idbGet();
}

async function flush(engine: Database) {
  const bytes = engine.export();
  const desktop = desktopApi();
  if (desktop?.writeDb) {
    await desktop.writeDb(bytes);
    return;
  }
  await idbSet(bytes);
}

function idbGet(): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onerror = () => resolve(null);
    req.onsuccess = () => {
      const tx = req.result.transaction(IDB_STORE, "readonly");
      const get = tx.objectStore(IDB_STORE).get(IDB_KEY);
      get.onsuccess = () => {
        const v = get.result;
        resolve(v instanceof Uint8Array ? v : v ? new Uint8Array(v) : null);
      };
      get.onerror = () => resolve(null);
    };
  });
}

function idbSet(bytes: Uint8Array): Promise<void> {
  return new Promise((resolve) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onerror = () => resolve();
    req.onsuccess = () => {
      const tx = req.result.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(bytes, IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    };
  });
}

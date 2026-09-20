export type CarveDesktop = {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  platform: string;
  readDb: () => Promise<Uint8Array | null>;
  writeDb: (bytes: Uint8Array) => Promise<void>;
};

export function desktopApi(): CarveDesktop | undefined {
  if (typeof window === "undefined") return undefined;
  return window.carveDesktop;
}

declare global {
  interface Window {
    carveDesktop?: CarveDesktop;
  }
}

# Carve Card

Feeds and speeds for [Inventables](https://www.inventables.com) X-Carve machines with a spindle or DWP611.

Pick a machine, material, and bit. Carve Card writes a shop card — RPM, feed, plunge, depth of cut, chipload, and Easel-ready copy — then stores saved cards in a local Room-style SQLite database.

## Linux download

The AppImage is in [v1.0.0](https://github.com/krlloyd/Carve-Card/releases/tag/v1.0.0) (too large for git).

```bash
chmod +x carve-card-1.0.0.AppImage
./carve-card-1.0.0.AppImage
```

## Run from source

```bash
npm install
npm run dev
```

```bash
npm run typecheck
npm run linux:pack
```

`linux:pack` builds a Linux AppImage under `desktop/dist-linux`.

## What it calculates

- RPM from material SFM and bit diameter, clamped to the machine
- Chipload, feed, and plunge inside X-Carve Pro / classic limits
- Depth of cut, stepover, and a pass plan by stock thickness
- Material tips (wood, sheet, plastic, aluminum, foam)

Saved cards and the last shop setup persist locally (SQLite via sql.js; the Linux app writes `carve-card.sqlite` in user data).

## License

Use it in the shop. Numbers are starting points — listen to the cut.

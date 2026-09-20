# Carve Card

Feeds and speeds for [Inventables](https://www.inventables.com) X-Carve machines with a spindle or DWP611.

Pick a machine, material, and bit. Carve Card writes a shop card — RPM, feed, plunge, depth of cut, chipload, and Easel-ready copy — then stores saved cards in a local Room-style SQLite database.

## Pull

```bash
git clone https://github.com/krlloyd/Carve-Card.git
cd Carve-Card
```

Already cloned? Update it:

```bash
git pull origin main
```

## Install the Linux app

### AppImage (fastest)

1. Download [carve-card-1.0.0.AppImage](https://github.com/krlloyd/Carve-Card/releases/download/v1.0.0/carve-card-1.0.0.AppImage) from [Releases](https://github.com/krlloyd/Carve-Card/releases/tag/v1.0.0).
2. Make it executable and run it:

```bash
chmod +x carve-card-1.0.0.AppImage
./carve-card-1.0.0.AppImage
```

To keep it with your other apps:

```bash
mkdir -p ~/Applications
mv carve-card-1.0.0.AppImage ~/Applications/
~/Applications/carve-card-1.0.0.AppImage
```

### Desktop icon (optional)

From a clone of this repo, after the AppImage is in `~/Applications`:

```bash
mkdir -p ~/.local/share/icons/hicolor/512x512/apps ~/.local/share/applications
cp desktop/icons/512x512.png ~/.local/share/icons/hicolor/512x512/apps/carve-card.png
sed "s|^Exec=.*|Exec=$HOME/Applications/carve-card-1.0.0.AppImage|" desktop/carve-card.desktop \
  > ~/.local/share/applications/carve-card.desktop
update-desktop-database ~/.local/share/applications 2>/dev/null || true
```

Carve Card then shows in the applications menu. Drag it to the desktop or favorites if you want a shortcut.

### Build the AppImage from source

Needs Node.js 22+.

```bash
git clone https://github.com/krlloyd/Carve-Card.git
cd Carve-Card
npm install
npm --prefix desktop install
npm run linux:pack
```

The AppImage lands in `desktop/dist-linux/carve-card-1.0.0.AppImage`. Then follow the AppImage steps above.

## Run from source (dev)

```bash
git clone https://github.com/krlloyd/Carve-Card.git
cd Carve-Card
npm install
npm run dev
```

Then open http://localhost:8080.

```bash
npm run typecheck
```

## What it calculates

- RPM from material SFM and bit diameter, clamped to the machine
- Chipload, feed, and plunge inside X-Carve Pro / classic limits
- Depth of cut, stepover, and a pass plan by stock thickness
- Material tips (wood, sheet, plastic, aluminum, foam)

Saved cards and the last shop setup persist locally (SQLite via sql.js; the Linux app writes `carve-card.sqlite` in user data).

## License

Use it in the shop. Numbers are starting points — listen to the cut.

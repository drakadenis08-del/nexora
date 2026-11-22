# NEXORA

Connected life planner: an interactive concept with sample data. Includes the landing page and the app (Life Map, What If?, list, timeline, insights, templates and settings). The interface comes in 4 languages: EN, UA, DE and PL.

## Run locally

Requires Node.js 20.19+ (or 22.12+).

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # type-check + production build into dist/
npm run preview   # serve dist/ locally
```

## Deploy

1. Push this folder to a GitHub repository.
2. In Vercel: **Add New → Project → Import** the repository.
3. Vercel detects Vite automatically. Build command: `npm run build`, output directory: `dist`.

Routing uses URL hashes (`#app`, `#map-move`, …), so no rewrite rules are needed.

## Structure

```
index.html              HTML entry (fonts, favicon, #root)
public/favicon.svg      static files copied as-is
src/main.tsx            React entry, global CSS
src/App.tsx             renders the mount points, then starts the NEXORA modules
src/components/         React components (AppShell, BootError, mascot/)
src/assets/             images imported from code
src/styles/nexora.css   all styles: tokens, palette, layout, responsive, reduced motion
src/legacy/             the original NEXORA modules, unchanged in behaviour
  boot.ts               loads them in order, wires GSAP + ScrollTrigger from npm
  i18n.js, i18n-dict.js translation layer and dictionaries (EN/UA/DE/PL)
  engine.js             dates, dependencies, What If? simulation, apply
  data.js               templates and sample data
  ui.js                 icons, logo, dialogs, toasts
  graph.js              Life Map canvas (pan, zoom, drag, minimap)
  app.js                app routes and views
  landing.js            landing page and scroll animations
src/types/global.d.ts   types for the globals the legacy modules publish
```

## How it is put together

React owns the page entry and renders four mount points (`#land`, `#shell`, `#dlg`, `#toast`). The original modules then render into those nodes, as they did in the Claude Artifact. This keeps the interface, content, animations and behaviour identical. Screens can be moved into React components one at a time later.

Data is stored in `localStorage` (`nexora-demo-v1`, `nexora-lang`) in the visitor's browser. There is no backend, account, sync or AI model.

## 3D hummingbird mascot

The mascot is a React Three Fiber component shown only in the landing hero. Its code is in `src/components/mascot/`:

| File | Role |
|---|---|
| `LandingMascot.tsx` | Renders the mascot into the hero slot `#nxMascot` and sets its state |
| `Mascot3D.tsx` | Public component: lazy loading, static fallback, reduced motion, WebGL check, pauses when off screen |
| `MascotScene.tsx` | Canvas, lights and pointer-following movement (the lazily loaded 3D chunk) |
| `GlbMascot.tsx` | Loads the Blender GLB and plays its animation clips |
| `PreviewMascot.tsx` | Temporary preview built from simple shapes, used until the GLB exists |
| `mascotConfig.ts` | Model path, clip keywords, fade time, blink interval, model size |
| `clips.ts` | Matches clip names to states |

**The model.** `public/models/hummingbird.glb` holds the NEXORA hummingbird: about 10.6k triangles, 560 KB, 10 bones, and the clips Idle, Blink, Curious, Thinking and Happy. Its editable source is `blender/NEXORA_Hummingbird.blend`. `blender/build_hummingbird.py` rebuilds both files from scratch (`python build_hummingbird.py <out_dir>` with the `bpy` package, or run it from Blender's Scripting tab). To swap the model, export from Blender as glTF Binary (`.glb`) with animations included and replace the file. No code changes are needed. In `npm run dev` the browser console lists the clips it found and which states have no clip.

**Clip names.** Matching ignores case and works on part of a name too, so `Idle`, `Hummingbird_Idle` and `Armature|Idle` all count.

| State | Matching words | When it plays |
|---|---|---|
| Idle | idle, hover, fly | Default loop |
| Blink | blink | Plays over the main clip every 3 to 6 seconds |
| Curious | curious, look, tilt | The pointer comes close to the mascot |
| Thinking | thinking, think, ponder | Right after "Move to June 15" is pressed |
| Happy | happy, joy, celebrate | 0.7 s later, for about 2 seconds |

A state without its own clip uses Idle, otherwise the first clip in the file. With no clips at all, the model still hovers and follows the pointer.

**Fallbacks.** The static image `src/assets/mascot-hummingbird.svg` is shown in four cases:
- while the 3D chunk loads;
- when reduced motion is on (system setting or NEXORA's own setting);
- when WebGL is not available;
- if the 3D view fails.

The 3D chunk (three.js, R3F, Drei; about 1 MB, 270 KB gzipped) downloads only when the hero comes on screen.

**Draco.** Draco-compressed GLBs work. Drei fetches the Draco decoder from Google's CDN the first time one loads.

## Next steps (not done yet)

- Migrate screens from `src/legacy` to typed React components, starting with small ones (Settings, Templates).

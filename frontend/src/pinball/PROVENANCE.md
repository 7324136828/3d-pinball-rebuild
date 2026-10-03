# Source provenance

## Modern 3D Pinball React adaptation

These modules are a preserved-source adaptation of `original-project/src/` for the
Modern 3D Pinball React frontend. The original-project directory remains unchanged.
`engine.js` adds idle startup, all-player score snapshots (including billion
parts), a cheats-used flag, and a fresh-session score reset. `audio.js` adds cleanup
for React unmounts. React owns rendering, fixed-step simulation, inputs, pause,
and API-backed game sessions; the original physics and mission controllers are
retained. The original upstream provenance follows below.

The gameplay modules are JavaScript translations of the MIT-licensed reconstructed Space Cadet engine used by the existing native and WebAssembly editions:

- [alula/SpaceCadetPinball](https://github.com/alula/SpaceCadetPinball), commit `0bc12d3ca97a30a61e1e325cfde1eeec379bb9b9`.
- Its upstream reconstruction: [k4zmu2a/SpaceCadetPinball](https://github.com/k4zmu2a/SpaceCadetPinball).

The upstream MIT notice is preserved in `LICENSE`. Native field names, message codes, mathematical equations, score tables, controller functions, and mission transitions are retained where they explain the port. Graphics-only Win32/SDL behavior is represented by lightweight JavaScript state objects that the modern renderer reads. There is no native source or compiled engine in this folder.

The matched Windows reconstruction in `cpp/src` was also used to resolve regressions in the browser fork: lamp decrement and bargraph fill, flipper visual frame selection, capturing a mission's acceptance score before its counter changes, five-slot high-score cycling, and case-insensitive cheat toggles. The JavaScript adapter also applies a changed player selection during the opening light show. Collision tests verified all 1,227 authored static/trigger edges plus the two moving flippers.

The native kickback class declares a firing-state `ActiveFlag` that shadows its inherited collision flag. JavaScript preserves those independent states as `KickbackActiveFlag` and `ActiveFlag`, keeping both launch pad colliders enabled while their firing timers are idle.

`public/assets/table.json` was exported from the supplied Windows Space Cadet table. Original `PINBALL.DAT` SHA-256: `42defd5d2a339a3953fe643716aff4e35b2cea7a3e54505c82d1e78d5325bc04`. This folder contains the readable export and metadata only, without DAT, WAV, MIDI, or bitmap pixel payloads. The original table data and text retain their original ownership; the engine's MIT license does not relicense them.

The modern scene is adapted from the workspace's `web/src/renderer.js`: new procedural artwork, Three.js geometry, copper/chrome materials, lamp insets and cabinet lighting. Sound effects are new Web Audio synthesis, replacing the original recordings.

Third-party npm packages are pinned in `package-lock.json`:

- [Three.js](https://github.com/mrdoob/three.js), MIT; runtime graphics.
- [Vite](https://github.com/vitejs/vite), MIT; development and bundling.
- [Playwright](https://github.com/microsoft/playwright), Apache-2.0; local browser verification.

License files for installed packages remain in `node_modules`; those packages' development tools are not runtime game dependencies. The finished website is independent of the native and WebAssembly editions.

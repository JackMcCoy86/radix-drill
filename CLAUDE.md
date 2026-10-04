# Radix Drill

Practice drills for number systems and ARM assembly (A32, GNU syntax). Static site on
GitHub Pages. Plain HTML, CSS, and ES modules: no build step, no dependencies, no
frameworks. Keep it that way. (`package.json` only exists so Node treats the `.js` files
as modules for the test script.)

## Token rule: open only the file you need

Each file covers one area, so read the one that matters instead of everything. For large
files (`styles.css`, `alu.js`, `generators.js`, `app.js`), `grep -n` for the function or
selector first and read just that range.

## Map

| File | What's in it |
|---|---|
| `index.html` | Page skeleton only (header, tabs, controls, `#stage`) |
| `styles.css` | All CSS: base reset, theme vars, layout |
| `js/util.js` | Number and HTML helpers: `R`, `P`, `MASK`, `bin`, `hex`, `grp`, `sgn`, `H`, `B`, `c`, `pick`, `step`, `fmtNeg` |
| `js/render.js` | Solution renderers: `bitStrip`, `nibbleMap`, `divTable`, `placeTable` |
| `js/radix/generators.js` | Number systems generators (`genDec2Bin` ... `genAddFlags`, plus `genSignExt`) |
| `js/radix/topics.js` | `RADIX_TOPICS` |
| `js/radix/lessons.js` | `RADIX_LESSONS` (Learn mode, keyed by topic id) |
| `js/arm/model.js` | A32 model (registers, NZCV, shifter, `encImm`, memory, `exec`, `condOK`) and display helpers (`txt`, `hlAsm`, `asmBlock`, `regTable`) |
| `js/arm/alu.js` | `genALU`, `genShift`, `genImm`, `genFlags`, `genCond`, `COND` |
| `js/arm/trace.js` | `TRACES` programs, `runProg`, `genTrace` |
| `js/arm/memory.js` | `genMem` |
| `js/arm/topics.js` | `ASM_TOPICS` |
| `js/drills.js` | `DRILLS` registry, `WIDTH`, `ALL` |
| `js/parse.js` | `parse(raw, kind)` answer parsing |
| `js/app.js` | Entry point. UI, state, grading, Learn mode (browser only) |

Dependencies only point downward: util → render → radix/arm generators → topics →
drills → app. Keep it that way; a generator file should never import from `app.js`.

## How a drill works

Each topic is `{ id, label, group, gen }` in `RADIX_TOPICS` or `ASM_TOPICS`. A generator
`gen(width)` returns a problem object:

```js
{ prompt, kind, width, expect, answer, sol, diagnose }
```

- `kind` is one of `bin`, `hex`, `dec`, `word`, `flags`, `choice`; it decides how
  `parse()` reads the user's input.
- `sol` is HTML built from `step(...)` and the solution renderers.
- `diagnose(x)` returns specific feedback for a common wrong answer, or `""`.

Adding a topic:
1. Write the `gen...` function in the right file and add it to that file's `export { ... }`
   list at the bottom.
2. Import it in that drill's `topics.js` and add one entry to the topic list.

The UI picks it up automatically. A new drill (for example branches and the stack) gets
its own folder like `js/arm/` and one entry in `DRILLS`.

Modules don't share globals. If a file uses a helper, it must import it, and the file
that defines it must export it. A missing import shows up as a `ReferenceError` in the
test or the browser console.

## Conventions

- Number systems problems are 8-bit (`WIDTH = 8`); generators also support 16 and 32.
- Progress is stored in `localStorage` under `radix-drill-v1`. Changing the shape of `S`
  needs to stay compatible with saved data.
- Feedback text: plain, short sentences that explain the mistake.
- Formatting follows Prettier defaults.

## Testing

All the logic runs in Node without a browser:

```sh
node test/check.js
```

It runs every generator 200 times, checks each problem has the fields the app needs,
and prints one line per topic. Pass a number to change the run count
(`node test/check.js 1000`). Use this whenever the change is logic only.

For visual changes, open the site through a local server (VS Code Live Server, or
`python -m http.server`). Double-clicking `index.html` won't work: browsers block ES
modules on `file://` pages.

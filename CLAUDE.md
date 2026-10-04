# Radix Drill

Practice drills for number systems and ARM assembly (A32, GNU syntax). Static site on
GitHub Pages: everything lives in ONE file, `index.html` (~3,800 lines, ~135 KB). No build
step, no dependencies, no frameworks. Keep it that way.

## Token rule: never read index.html whole

Reading the full file costs ~35k tokens. Instead, `grep -n` for the section marker or
function name you need, then read only that line range. Line numbers drift as the file
changes, so search for the markers below rather than trusting fixed numbers.

## Map of index.html (search for these)

| Section | Find it with |
|---|---|
| CSS (theme vars, then layout) | the two `<style>` blocks at the top |
| Page skeleton (header, tabs, controls) | `class="wrap"` |
| Number formatting helpers (`R`, `bin`, `hex`, `H`, `B`) | `number helpers` |
| Solution renderers (`bitStrip`, `divTable`, `nibbleMap`, `placeTable`) | `solution renderers` |
| Number systems generators (`genDec2Bin` ... `genAddFlags`) | `NUMBER SYSTEMS DRILL` |
| Number systems topic list | `const RADIX_TOPICS` |
| Learn mode lessons | `const RADIX_LESSONS` |
| ARM model (registers, NZCV, shifter, memory, `exec`) | `ARM ASSEMBLY DRILL` |
| ARM generators (`genALU`, `genShift`, `genImm`, `genFlags`, `genCond`, `genTrace`, `genMem`) | `function gen<Name>` |
| Trace programs for `genTrace` | `const TRACES` |
| ARM topic list | `const ASM_TOPICS` |
| Drill registry | `const DRILLS` |
| Answer parsing | `function parse(` |
| App UI, state, grading, Learn mode | `---------- app ----------` |

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

Adding a topic = write a `gen...` function in the right drill section and add one entry to
that drill's topic list. The UI picks it up automatically. Number systems lessons are keyed
by topic id in `RADIX_LESSONS`.

## Conventions

- Number systems problems are 8-bit (`WIDTH = 8`); generators also support 16 and 32.
- Progress is stored in `localStorage` under `radix-drill-v1`. Changing the shape of `S`
  needs to stay compatible with saved data.
- Feedback text: plain, short sentences that explain the mistake.

## Testing

The app code is guarded by `typeof document !== "undefined"`, so all the logic runs in
Node without a browser. Quick check that every generator still works:

```sh
node -e 'const h=require(`fs`).readFileSync(`index.html`,`utf8`);eval(h.slice(h.indexOf(`<script>`)+8,h.lastIndexOf(`</script>`))+`;for(const t of ALL){const p=t.gen(WIDTH);console.log(t.id,p.kind,p.answer)}`)'
```

The JS strings use backticks, not double quotes, so the same command works in PowerShell
(Windows PowerShell 5.1 strips inner double quotes when passing arguments to `node`) and
in bash. It prints one line per topic; an error means a generator broke.

Use this instead of opening the page whenever the change is logic only. For visual
changes, open `index.html` in a browser.

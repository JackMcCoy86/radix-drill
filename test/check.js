// Smoke test: run every generator many times at every width it supports and
// make sure each problem has the fields the app needs. Run with `node test/check.js`.
import { ALL, WIDTH } from "../js/drills.js";

const KINDS = ["bin", "hex", "dec", "word", "flags", "choice"];
const RUNS = Number(process.argv[2]) || 200;
let fail = 0;

for (const t of ALL) {
  try {
    for (let i = 0; i < RUNS; i++) {
      const p = t.gen(WIDTH);
      if (!KINDS.includes(p.kind)) throw new Error(`unknown kind ${p.kind}`);
      for (const f of ["prompt", "sol"])
        if (typeof p[f] !== "string" || !p[f]) throw new Error(`missing ${f}`);
      if (p.answer === undefined) throw new Error("missing answer");
      if (p.expect === undefined) throw new Error("missing expect");
    }
    const p = t.gen(WIDTH);
    console.log("ok  ", t.id.padEnd(12), p.kind.padEnd(7), String(p.answer));
  } catch (e) {
    fail++;
    console.log("FAIL", t.id.padEnd(12), e.message);
  }
}
console.log(
  fail
    ? `\n${fail} topic(s) failed.`
    : `\nAll ${ALL.length} topics passed (${RUNS} runs each).`,
);
process.exit(fail ? 1 : 0);

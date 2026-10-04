// ARM program tracing: trace programs and the tracer.
import { R, bin, c, pick, step } from "../util.js";
import {
  H32,
  rg,
  sx,
  dv,
  vt,
  NOWRITE,
  mkState,
  exec,
  txt,
  asmBlock,
  insHtml,
  flagLine,
} from "./model.js";

/* program tracing */
const MOVI = (rd, v, hx) => ({
  op: "MOV",
  rd,
  op2: { k: "imm", v, hex: hx },
});
const MVNI = (rd, v) => ({ op: "MVN", rd, op2: { k: "imm", v } });
const setVal = (rd, negP = 0.35) =>
  Math.random() < negP ? MVNI(rd, R(0, 30)) : MOVI(rd, R(0, 60));
const L = (ins) => ({ ins });
const TRACES = [
  () => {
    const a = R(2, 30),
      b = R(2, 30);
    const first = pick([
      {
        op: "ADD",
        rd: 2,
        rn: 0,
        op2: { k: "reg", rm: 1, sh: "LSL", n: R(1, 3) },
      },
      { op: "SUB", rd: 2, rn: 0, op2: { k: "reg", rm: 1 } },
      { op: "MUL", rd: 2, rn: 0, rm: 1 },
      { op: "ADD", rd: 2, rn: 0, op2: { k: "reg", rm: 1 } },
    ]);
    const more = [
      () => ({ op: "SUB", rd: 2, rn: 2, op2: { k: "reg", rm: 0 } }),
      () => ({
        op: "RSB",
        rd: 2,
        rn: 2,
        op2: { k: "imm", v: R(50, 200) },
      }),
      () => ({ op: "ADD", rd: 2, rn: 2, op2: { k: "imm", v: R(1, 50) } }),
      () => ({
        op: "MOV",
        alias: "LSR",
        rd: 2,
        op2: { k: "reg", rm: 2, sh: "LSR", n: R(1, 2) },
      }),
      () => ({
        op: "AND",
        rd: 2,
        rn: 2,
        op2: { k: "imm", v: pick([0x0f, 0xf0, 0xff, 0x3f]), hex: true },
      }),
      () => ({ op: "EOR", rd: 2, rn: 2, op2: { k: "reg", rm: 1 } }),
      () => ({
        op: "ADD",
        rd: 2,
        rn: 2,
        op2: { k: "reg", rm: 2, sh: "LSL", n: 1 },
      }),
    ];
    const i = R(0, more.length - 1);
    let j;
    do {
      j = R(0, more.length - 1);
    } while (j === i);
    return {
      prog: [MOVI(0, a), MOVI(1, b), first, more[i](), more[j]()].map(L),
      ask: 2,
    };
  },
  () => {
    const [c1, c2] = pick([
      ["GT", "LE"],
      ["LT", "GE"],
      ["HI", "LS"],
      ["LO", "HS"],
      ["EQ", "NE"],
    ]);
    const i0 = setVal(0, 0.45);
    let i1 = setVal(1, 0.45);
    if (c1 === "EQ" && Math.random() < 0.5) i1 = { ...i0, rd: 1 };
    return {
      prog: [
        i0,
        i1,
        { op: "CMP", rn: 0, op2: { k: "reg", rm: 1 } },
        { op: "MOV", cond: c1, rd: 2, op2: { k: "reg", rm: 0 } },
        { op: "MOV", cond: c2, rd: 2, op2: { k: "reg", rm: 1 } },
      ].map(L),
      ask: 2,
    };
  },
  () => ({
    prog: [
      setVal(0, 0.6),
      { op: "CMP", rn: 0, op2: { k: "imm", v: 0 } },
      { op: "RSB", cond: "LT", rd: 0, rn: 0, op2: { k: "imm", v: 0 } },
    ].map(L),
    ask: 0,
    note: "This is the classic absolute-value idiom: negate only when the value is below zero.",
  }),
  () => {
    const n = R(3, 7);
    return {
      prog: [
        L(MOVI(0, 0)),
        L(MOVI(1, n)),
        { label: "loop" },
        L({ op: "ADD", rd: 0, rn: 0, op2: { k: "reg", rm: 1 } }),
        L({ op: "SUB", s: 1, rd: 1, rn: 1, op2: { k: "imm", v: 1 } }),
        L({ op: "B", cond: "NE", target: "loop" }),
      ],
      ask: 0,
      note: `The loop adds ${Array.from({ length: n }, (_, k) => n - k).join(" + ")} = ${(n * (n + 1)) / 2}. SUBS sets Z when r1 reaches 0, which ends the loop.`,
    };
  },
  () => {
    const n = R(3, 6);
    let f = 1;
    for (let k = 2; k <= n; k++) f *= k;
    return {
      prog: [
        L(MOVI(0, 1)),
        L(MOVI(1, n)),
        { label: "loop" },
        L({ op: "MUL", rd: 0, rn: 0, rm: 1 }),
        L({ op: "SUB", s: 1, rd: 1, rn: 1, op2: { k: "imm", v: 1 } }),
        L({ op: "B", cond: "NE", target: "loop" }),
      ],
      ask: 0,
      note: `The loop computes ${n}! = ${Array.from({ length: n }, (_, k) => n - k).join(" × ")} = ${f}.`,
    };
  },
  () => {
    const n = R(2, 5),
      k = R(2, 9);
    return {
      prog: [
        L(MOVI(0, 0)),
        L(MOVI(1, n)),
        { label: "loop" },
        L({ op: "ADD", rd: 0, rn: 0, op2: { k: "imm", v: k } }),
        L({ op: "SUB", rd: 1, rn: 1, op2: { k: "imm", v: 1 } }),
        L({ op: "CMP", rn: 1, op2: { k: "imm", v: 0 } }),
        L({ op: "B", cond: "GT", target: "loop" }),
      ],
      ask: 0,
      note: `The loop body runs ${n} times, adding ${k} each time: ${n} × ${k} = ${n * k}.`,
    };
  },
  () => {
    const v = R(5, 63);
    return {
      prog: [
        L(MOVI(0, v, true)),
        L(MOVI(1, 0)),
        { label: "loop" },
        L({ op: "AND", rd: 2, rn: 0, op2: { k: "imm", v: 1 } }),
        L({ op: "ADD", rd: 1, rn: 1, op2: { k: "reg", rm: 2 } }),
        L({
          op: "MOV",
          alias: "LSR",
          s: 1,
          rd: 0,
          op2: { k: "reg", rm: 0, sh: "LSR", n: 1 },
        }),
        L({ op: "B", cond: "NE", target: "loop" }),
      ],
      ask: 1,
      note: `This loop counts the 1 bits in ${sx(v)} = ${bin(v, 8)}. Each pass adds bit 0 to r1, then shifts r0 right until it's zero.`,
    };
  },
  () => {
    const m = () => pick([0x0f, 0xf0, 0xff, 0x3c, 0x81, 0x18, 0x100, 0x300]);
    return {
      prog: [
        MOVI(0, R(0x10, 0xff), true),
        { op: "ORR", rd: 0, rn: 0, op2: { k: "imm", v: m(), hex: true } },
        { op: "BIC", rd: 0, rn: 0, op2: { k: "imm", v: m(), hex: true } },
        { op: "EOR", rd: 0, rn: 0, op2: { k: "imm", v: m(), hex: true } },
      ].map(L),
      ask: 0,
    };
  },
];
function runProg(prog, st, limit = 300) {
  const labels = {};
  prog.forEach((l, i) => {
    if (l.label) labels[l.label] = i;
  });
  const trace = [];
  let pc = 0,
    steps = 0;
  while (pc < prog.length && steps < limit) {
    const l = prog[pc];
    if (!l.ins) {
      pc++;
      continue;
    }
    const before = st.r.slice(),
      info = exec(st, l.ins);
    steps++;
    if (l.ins.op === "B") {
      trace.push({
        ins: l.ins,
        note: info.skipped
          ? "not taken, falls through"
          : `taken, back to ${l.ins.target}`,
        skip: !!info.skipped,
      });
      pc = info.skipped ? pc + 1 : labels[l.ins.target];
      continue;
    }
    if (info.skipped) {
      trace.push({
        ins: l.ins,
        note: `skipped (${l.ins.cond} is false)`,
        skip: true,
      });
      pc++;
      continue;
    }
    const parts = [];
    for (let k = 0; k < 16; k++)
      if (before[k] !== st.r[k]) parts.push(`${rg(k)} = ${vt(st.r[k])}`);
    if (!parts.length && l.ins.rd !== undefined && !NOWRITE[l.ins.op])
      parts.push(`${rg(l.ins.rd)} = ${vt(st.r[l.ins.rd])} (unchanged)`);
    if (l.ins.s || NOWRITE[l.ins.op]) parts.push(flagLine(st));
    trace.push({ ins: l.ins, note: parts.join(", ") });
    pc++;
  }
  return trace;
}
function genTrace() {
  const t = pick(TRACES)(),
    st = mkState(),
    trace = runProg(t.prog, st),
    ans = st.r[t.ask];
  const hasLabels = t.prog.some((l) => l.label);
  const lines = t.prog.map((l) =>
    l.label ? `${l.label}:` : (hasLabels ? "    " : "") + txt(l.ins),
  );
  const tbl = `<div class="scroll"><table class="tbl"><thead><tr><th>#</th><th>Instruction</th><th>Effect</th></tr></thead><tbody>${trace
    .map(
      (r, i) =>
        `<tr class="${r.skip ? "skip" : ""}"><td>${i + 1}</td><td>${insHtml(r.ins)}</td><td>${r.note}</td></tr>`,
    )
    .join("")}</tbody></table></div>`;
  const sol =
    step("Run it one instruction at a time:", tbl) +
    (t.note ? step(t.note) : "") +
    step(`Final ${rg(t.ask)} = ${c(dv(ans))} (${H32(ans)}).`);
  return {
    block: true,
    prompt: `${asmBlock(lines)}<p>After this runs, what is in ${c(rg(t.ask))}?</p>`,
    kind: "word",
    expect: ans,
    answer: `${dv(ans)} (${sx(ans)})`,
    sol,
  };
}

export { genTrace };

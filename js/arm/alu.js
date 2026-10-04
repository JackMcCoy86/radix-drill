// ARM generators: ALU ops, shifts, immediates, flags, condition codes.
import { R, bin, c, pick, step, fmtNeg } from "../util.js";
import { bitStrip } from "../render.js";
import {
  U,
  S32,
  H32,
  bitAt,
  rg,
  sx,
  dv,
  B32,
  ror,
  encImm,
  mkState,
  condOK,
  exec,
  immTxt,
  txt,
  asmBlock,
  regTable,
  flagLine,
  cmpSym,
  distinctRegs,
  SHDESC,
  MASKS,
} from "./model.js";

function genALU() {
  const op = pick([
    "ADD",
    "ADD",
    "SUB",
    "SUB",
    "RSB",
    "AND",
    "ORR",
    "EOR",
    "BIC",
    "MVN",
    "MUL",
  ]);
  const logic = ["AND", "ORR", "EOR", "BIC", "MVN"].includes(op);
  const [ra, rb, rx] = distinctRegs(3),
    rd = Math.random() < 0.25 && op !== "MVN" ? ra : rx;
  const arithVal = () => pick([R(1, 200), R(200, 4000), U(-R(1, 100))]);
  const logicVal = () => pick([R(0x100, 0xffff), U(Math.random() * 2 ** 32)]);
  let ins,
    regs,
    sol = "";
  if (op === "MUL") {
    const x = pick([R(2, 300), U(-R(2, 40))]),
      y = R(2, 300);
    ins = { op, rd, rn: ra, rm: rb };
    regs = [
      [ra, x],
      [rb, y],
    ];
  } else {
    const a = logic ? logicVal() : arithVal(),
      b = logic ? logicVal() : pick([R(1, 300), U(-R(1, 50))]);
    const roll = Math.random();
    let op2;
    if (roll < 0.3)
      op2 = logic
        ? { k: "imm", v: MASKS(), hex: true }
        : { k: "imm", v: R(1, 255) };
    else if (roll < 0.65) op2 = { k: "reg", rm: rb };
    else
      op2 = {
        k: "reg",
        rm: rb,
        sh: pick(["LSL", "LSL", "LSR", "ASR"]),
        n: logic ? R(1, 8) : R(1, 4),
      };
    ins = op === "MVN" ? { op, rd, op2 } : { op, rd, rn: ra, op2 };
    regs =
      op === "MVN"
        ? op2.k === "reg"
          ? [[rb, b]]
          : []
        : op2.k === "reg"
          ? [
              [ra, a],
              [rb, b],
            ]
          : [[ra, a]];
  }
  const run1 = (insn) => {
    const s = mkState();
    regs.forEach(([r, v]) => (s.r[r] = v));
    const info = exec(s, insn);
    return { v: s.r[rd], info };
  };
  const { v: res, info } = run1(ins);
  if (op === "MUL") {
    const x = regs[0][1],
      y = regs[1][1],
      full = S32(x) * y;
    sol += step(
      `MUL multiplies and keeps the low 32 bits: ${dv(x)} × ${y} = ${fmtNeg(full)}.`,
    );
  } else {
    const o2 = ins.op2,
      a = info.a,
      b = info.b;
    if (o2.sh)
      sol += step(
        `First the barrel shifter handles operand 2: ${c(`${rg(o2.rm)}, ${o2.sh} #${o2.n}`)}. ${SHDESC[o2.sh](o2.n)}`,
        `<pre class="calc">${H32(regs.find((r) => r[0] === o2.rm)[1])} ${o2.sh} #${o2.n} = ${H32(b)}</pre>`,
      );
    else if (o2.k === "imm")
      sol += step(
        `Operand 2 is the immediate ${c(immTxt(o2.v, o2.hex))} = ${H32(b)}.`,
      );
    const lc = (lab, x) => `${lab.padEnd(8)}${B32(x)}`;
    switch (op) {
      case "ADD":
        sol += step(
          `ADD: ${dv(a)} + ${dv(b)} = ${dv(res)}. In hex, ${H32(a)} + ${H32(b)} = ${H32(res)}.`,
        );
        break;
      case "SUB":
        sol += step(
          `SUB computes Rn − operand 2: ${dv(a)} − ${dv(b)} = ${dv(res)}.`,
        );
        break;
      case "RSB":
        sol += step(
          `RSB is reverse subtract, operand 2 − Rn: ${dv(b)} − ${dv(a)} = ${dv(res)}.`,
        );
        break;
      case "AND":
        sol += step(
          "AND keeps a 1 only where both bits are 1.",
          `<pre class="calc">${lc(rg(ins.rn), a)}\n${lc("AND", b)}\n${lc("=", res)}</pre>`,
        );
        break;
      case "ORR":
        sol += step(
          "ORR sets a 1 wherever either bit is 1.",
          `<pre class="calc">${lc(rg(ins.rn), a)}\n${lc("ORR", b)}\n${lc("=", res)}</pre>`,
        );
        break;
      case "EOR":
        sol += step(
          "EOR sets a 1 wherever the two bits differ.",
          `<pre class="calc">${lc(rg(ins.rn), a)}\n${lc("EOR", b)}\n${lc("=", res)}</pre>`,
        );
        break;
      case "BIC":
        sol += step(
          "BIC (bit clear) clears every bit that is 1 in operand 2. It computes Rn AND NOT operand 2.",
          `<pre class="calc">${lc(rg(ins.rn), a)}\n${lc("AND NOT", b)}\n${lc("=", res)}</pre>`,
        );
        break;
      case "MVN":
        sol += step(
          "MVN writes the bitwise NOT of operand 2: every bit flips.",
          `<pre class="calc">${lc("op2", b)}\n${lc("NOT =", res)}</pre>`,
        );
        break;
    }
  }
  sol += step(
    `${rg(rd)} = ${c(H32(res))}, which is ${dv(res)} as a signed value.`,
  );
  const plain =
    ins.op2 && ins.op2.sh
      ? run1({ ...ins, op2: { k: "reg", rm: ins.op2.rm } }).v
      : null;
  return {
    block: true,
    prompt: `${regs.length ? "<p>Registers before:</p>" + regTable(regs) : ""}${asmBlock([txt(ins)])}<p>What does ${c(rg(rd))} hold afterward?</p>`,
    kind: "word",
    expect: res,
    answer: H32(res),
    sol,
    diagnose: (v) => {
      if (op === "RSB" && v === U(info.a - info.b))
        return "RSB is reverse subtract: operand 2 minus Rn.";
      if (op === "SUB" && v === U(info.b - info.a))
        return "SUB is Rn minus operand 2. RSB is the reversed one.";
      if (op === "BIC" && v === U(info.a & info.b))
        return "That's plain AND. BIC clears the bits that are set in operand 2.";
      if (plain !== null && v === plain && plain !== res)
        return "Operand 2 is shifted before the operation happens.";
      return "";
    },
  };
}
function genShift() {
  const t = pick(["LSL", "LSR", "ASR", "ASR", "ROR"]),
    [rm, rd] = distinctRegs(2);
  const v =
    t === "ASR" && Math.random() < 0.7
      ? R(0x80000000, 0xffffffff)
      : pick([R(0x100, 0xffff), U(Math.random() * 2 ** 32)]);
  const n = Math.random() < 0.4 ? 4 * R(1, 7) : R(1, 31);
  const ins = {
    op: "MOV",
    alias: t,
    rd,
    op2: { k: "reg", rm, sh: t, n },
  };
  const st = mkState();
  st.r[rm] = v;
  exec(st, ins);
  const r = st.r[rd];
  const lsr = v >>> n,
    asr = U(S32(v) >> n);
  const sol =
    step(`${rg(rm)} before:`, bitStrip(bin(v, 32), t === "ASR")) +
    step(SHDESC[t](n)) +
    (n % 4 === 0
      ? step(
          `${n} is a multiple of 4, so this moves whole hex digits: ${H32(v)} → ${H32(r)}.`,
        )
      : "") +
    step(`${rg(rd)} after:`, bitStrip(bin(r, 32))) +
    step(`${rg(rd)} = ${c(H32(r))}.`);
  return {
    block: true,
    prompt: `<p>Registers before:</p>${regTable([[rm, v]])}${asmBlock([txt(ins)])}<p>What does ${c(rg(rd))} hold afterward?</p>`,
    kind: "word",
    expect: r,
    answer: H32(r),
    sol,
    diagnose: (x) =>
      t === "ASR" && x === lsr && lsr !== r
        ? "That's LSR. ASR copies the sign bit (1 here) into the vacated top bits."
        : t === "LSR" && x === asr && asr !== r
          ? "That's ASR. LSR always fills the top with zeros."
          : t === "ROR" && x === lsr && lsr !== r
            ? "ROR wraps the bits that fall off the bottom around to the top."
            : "",
  };
}
function genImm() {
  let v;
  if (Math.random() < 0.5) {
    v = ror(R(1, 255), 2 * R(0, 15));
    if (v < 256 && Math.random() < 0.75) v = ror(R(1, 255), 2 * R(4, 15));
  } else {
    const gens = [
      () => U(R(0x101, 0xfff) * 2 ** R(0, 20)),
      () => U(Math.random() * 2 ** 32),
      () => U(R(1, 255) * 2 ** (2 * R(0, 11) + 1)),
      () => R(0x101, 0x3ff),
    ];
    do {
      v = pick(gens)();
    } while (encImm(v) || v === 0);
  }
  const hi = 31 - Math.clz32(v),
    lo = 31 - Math.clz32(v & -v),
    start = lo - (lo % 2),
    fits = hi <= start + 7;
  const e = fits ? { imm8: v / 2 ** start, rot: (32 - start) % 32 } : encImm(v),
    ok = !!e,
    mn = pick(["ORR", "EOR", "ORR"]),
    line = `${mn} r0, r1, #${sx(v)}`;
  const ones = [];
  for (let k = 31; k >= 0; k--) if (bitAt(v, k)) ones.push(k);
  const where =
    ones.length <= 8
      ? `The 1 bits are at position${ones.length > 1 ? "s" : ""} ${ones.join(", ")}.`
      : `The 1 bits run from bit ${hi} down to bit ${lo}.`;
  const simpleWin = new Set(
    Array.from({ length: 8 }, (_, k) => start + k).filter((k) => k < 32),
  );
  const win = ok
    ? new Set(Array.from({ length: 8 }, (_, k) => (k + 32 - e.rot) % 32))
    : simpleWin;
  let sol =
    step(
      `Write the constant in binary. ${where}`,
      bitStrip(bin(v, 32), false, win) +
        `<p class="dim" style="margin-top:6px">The bar over the bits marks the 8-bit window.</p>`,
    ) +
    step(
      `Find the window. The lowest 1 is bit ${lo}${lo % 2 ? `, which is odd, so round down to bit ${start}` : ", which is already even"}. An 8-bit window starting there covers bits ${start}–${start + 7}. The highest 1 is bit ${hi}, which is ${fits ? "inside" : "outside"} the window.`,
    );
  if (ok && fits) {
    const k = start,
      val = v / 2 ** k;
    sol +=
      step(
        k
          ? `Yes. Inside the window is ${c(sx(val))} (${bin(val, 8)}), so the constant is ${c(sx(val))} shifted left by ${k}. Check: ${sx(val)} × ${2 ** k} = ${sx(v)}.`
          : `Yes. It already fits in bits 0–7, so no shift is needed.`,
      ) +
      step(
        k
          ? `How it's stored: ARM's hardware rotates right, and rotating right by ${32 - k} is the same as shifting left by ${k}. So the instruction holds imm8 = ${c(sx(e.imm8))} and rotate = ${e.rot}, stored as the 4-bit field ${e.rot / 2} (the hardware doubles it).`
          : `How it's stored: imm8 = ${c(sx(e.imm8))} with a rotation of 0.`,
      );
  } else if (ok) {
    const top = new Set([...win].filter((k) => k >= 16)),
      bot = [...win].filter((k) => k < 16);
    sol +=
      step(
        `The simple window misses, but the window is allowed to wrap from bit 31 around to bit 0. Bits ${Math.min(...top)}–31 plus bits 0–${Math.max(...bot)} form one 8-bit window that holds every 1.`,
      ) +
      step(
        `Yes. That's ${c(sx(e.imm8))} (${bin(e.imm8, 8)}) rotated right by ${e.rot}: the low ${e.rot} bits of it wrap around to the top. Stored as imm8 = ${c(sx(e.imm8))}, rotate field = ${e.rot / 2}.`,
      );
  } else {
    sol +=
      step(
        `No. Bit ${hi} sticks out of the window, and no wrapped window (bit 31 around to bit 0) covers every 1 either, so this constant can't be encoded.`,
      ) +
      step(
        `To use it anyway, load it into a register first with ${c(`LDR r2, =${sx(v)}`)} (the assembler stores it in a literal pool) or the ARMv7 pair ${c("MOVW")}/${c("MOVT")}, then use ${c(`${mn} r0, r1, r2`)}.`,
      );
  }
  sol += step(
    'The rule: an A32 immediate is an 8-bit value moved to an even bit position (shifted left by 0, 2, 4, …), with wraparound allowed. Officially that\'s "rotated right by an even amount."',
  );
  return {
    block: true,
    prompt: `${asmBlock([line])}<p>Can ${c("#" + sx(v))} be encoded as an A32 immediate, so this instruction assembles as written?</p>`,
    kind: "choice",
    expect: ok ? 0 : 1,
    choices: ["Yes, it encodes", "No, it doesn't fit"],
    answer: ok ? "Yes, it encodes" : "No, it doesn't fit",
    sol,
  };
}
function genFlags() {
  const kind = pick([
    "ADDS",
    "ADDS",
    "SUBS",
    "SUBS",
    "CMP",
    "CMP",
    "CMP",
    "CMN",
    "RSBS",
    "ANDS",
    "MOVS",
    "LSLS",
    "TST",
  ]);
  const pool = () =>
    pick([
      0,
      1,
      R(2, 100),
      0x7fffffff,
      0x80000000,
      0xffffffff,
      U(-R(1, 100)),
      U(Math.random() * 2 ** 32),
      0x40000000,
      U(0x7ffffff0 + R(0, 15)),
    ]);
  let a = pool(),
    b = pool();
  if ((kind === "CMP" || kind === "SUBS") && Math.random() < 0.2) b = a;
  const f0 = { n: R(0, 1), z: R(0, 1), c: R(0, 1), v: R(0, 1) },
    sh = R(1, 8);
  const reg2 = { k: "reg", rm: 1 };
  const ins = {
    ADDS: { op: "ADD", s: 1, rd: 2, rn: 0, op2: reg2 },
    SUBS: { op: "SUB", s: 1, rd: 2, rn: 0, op2: reg2 },
    RSBS: { op: "RSB", s: 1, rd: 2, rn: 0, op2: reg2 },
    CMP: { op: "CMP", rn: 0, op2: reg2 },
    CMN: { op: "CMN", rn: 0, op2: reg2 },
    ANDS: { op: "AND", s: 1, rd: 2, rn: 0, op2: reg2 },
    TST: { op: "TST", rn: 0, op2: reg2 },
    MOVS: { op: "MOV", s: 1, rd: 2, op2: { k: "reg", rm: 0 } },
    LSLS: {
      op: "MOV",
      alias: "LSL",
      s: 1,
      rd: 2,
      op2: { k: "reg", rm: 0, sh: "LSL", n: sh },
    },
  }[kind];
  const usesB = kind !== "MOVS" && kind !== "LSLS";
  const st = mkState();
  Object.assign(st, f0);
  st.r[0] = a;
  st.r[1] = b;
  const info = exec(st, ins);
  const r = info.res;
  const exp = (st.n << 3) | (st.z << 2) | (st.c << 1) | st.v;
  const cls =
    ins.op === "ADD" || ins.op === "CMN"
      ? "add"
      : ins.op === "SUB" || ins.op === "CMP"
        ? "sub"
        : ins.op === "RSB"
          ? "rsb"
          : "logic";
  const ua = U(a),
    ub = U(b),
    RANGE = "(−2147483648 … 2147483647)";
  let s = "";
  if (cls === "add")
    s += step(
      `${kind === "CMN" ? "CMN adds without storing the result" : "ADDS adds and sets the flags"}: ${H32(a)} + ${H32(b)} = ${H32(r)}.`,
    );
  else if (cls === "sub")
    s += step(
      `${kind === "CMP" ? "CMP subtracts without storing the result" : "SUBS subtracts and sets the flags"}: ${H32(a)} − ${H32(b)} = ${H32(r)}.`,
    );
  else if (cls === "rsb")
    s += step(
      `RSBS computes operand 2 − Rn: ${H32(b)} − ${H32(a)} = ${H32(r)}.`,
    );
  else
    s += step(
      kind === "MOVS"
        ? `MOVS copies r0 into r2 and sets N and Z: ${H32(r)}.`
        : kind === "LSLS"
          ? `LSLS shifts r0 left by ${sh}: ${H32(a)} → ${H32(r)}.`
          : `${kind === "TST" ? "TST does an AND without storing the result" : "ANDS"}: ${H32(a)} AND ${H32(b)} = ${H32(r)}.`,
    );
  s += step(`<strong>N = ${st.n}</strong>: bit 31 of the result is ${st.n}.`);
  s += step(
    `<strong>Z = ${st.z}</strong>: the result ${st.z ? "is" : "is not"} zero.`,
  );
  if (cls === "add")
    s += step(
      `<strong>C = ${st.c}</strong>: as unsigned numbers, ${ua} + ${ub} = ${ua + ub}, which ${st.c ? "is more than 4294967295, so a 1 carries out of bit 31" : "fits in 32 bits, so nothing carries out"}.`,
    );
  else if (cls === "sub" || cls === "rsb") {
    const [x, y] = cls === "sub" ? [ua, ub] : [ub, ua];
    s += step(
      `<strong>C = ${st.c}</strong>: after a subtraction, ARM sets C to 1 when there's no borrow, meaning the first value ≥ the second as unsigned numbers. ${x} ${x >= y ? "≥" : "<"} ${y}.`,
    );
  } else
    s += step(
      kind === "LSLS"
        ? `<strong>C = ${st.c}</strong>: the last bit shifted out is bit ${32 - sh} of r0, which is ${st.c}.`
        : `<strong>C = ${st.c}</strong>: there's no shift, so ${kind} leaves C unchanged. It was ${f0.c}.`,
    );
  if (cls === "logic")
    s += step(
      `<strong>V = ${st.v}</strong>: logical instructions don't change V. It was ${f0.v}.`,
    );
  else {
    const [x, y, op] =
      cls === "add"
        ? [S32(a), S32(b), "+"]
        : cls === "sub"
          ? [S32(a), S32(b), "−"]
          : [S32(b), S32(a), "−"];
    const t = op === "+" ? x + y : x - y;
    s += step(
      `<strong>V = ${st.v}</strong>: as signed numbers, ${fmtNeg(x)} ${op} ${fmtNeg(y)} = ${fmtNeg(t)}, which ${st.v ? "is outside" : "fits in"} the 32-bit signed range ${RANGE}.`,
    );
  }
  return {
    block: true,
    prompt: `<p>Flags before: ${c(flagLine(f0))}</p>${regTable(
      usesB
        ? [
            [0, a],
            [1, b],
          ]
        : [[0, a]],
    )}${asmBlock([txt(ins)])}<p>What are N, Z, C, and V afterward? Tap each flag to set it.</p>`,
    kind: "flags",
    expect: exp,
    answer: flagLine(st),
    sol: s,
    diagnose: (v) => {
      const w = ["N", "Z", "C", "V"].filter(
        (f, i) => ((v >> (3 - i)) & 1) !== ((exp >> (3 - i)) & 1),
      );
      if (w.length === 1 && w[0] === "C" && (cls === "sub" || cls === "rsb"))
        return "After a subtraction, C = 1 means no borrow (the first value ≥ the second, unsigned). x86 uses the opposite convention.";
      if (cls === "logic" && w.includes("V"))
        return "Logical instructions leave V alone.";
      if (cls === "logic" && kind !== "LSLS" && w.includes("C"))
        return "With no shift, logical instructions leave C alone.";
      return "";
    },
  };
}
const COND = {
  EQ: ["equal", "Z = 1"],
  NE: ["not equal", "Z = 0"],
  HS: ["unsigned higher or same", "C = 1"],
  LO: ["unsigned lower", "C = 0"],
  HI: ["unsigned higher", "C = 1 and Z = 0"],
  LS: ["unsigned lower or same", "C = 0 or Z = 1"],
  GE: ["signed greater than or equal", "N = V"],
  LT: ["signed less than", "N ≠ V"],
  GT: ["signed greater than", "Z = 0 and N = V"],
  LE: ["signed less than or equal", "Z = 1 or N ≠ V"],
  MI: ["minus (negative result)", "N = 1"],
  PL: ["plus (positive or zero result)", "N = 0"],
};
function genCond() {
  const roll = Math.random();
  let a, b;
  if (roll < 0.45) {
    a = U(-R(1, 40));
    b = R(1, 40);
    if (Math.random() < 0.5) [a, b] = [b, a];
  } else if (roll < 0.6) {
    a = b = R(0, 60);
  } else {
    a = R(0, 80);
    b = R(0, 80);
  }
  const cd = pick(Object.keys(COND));
  const i1 = { op: "CMP", rn: 0, op2: { k: "reg", rm: 1 } },
    i2 =
      Math.random() < 0.5
        ? { op: "MOV", cond: cd, rd: 2, op2: { k: "imm", v: 1 } }
        : { op: "ADD", cond: cd, rd: 2, rn: 2, op2: { k: "imm", v: 1 } };
  const st = mkState();
  st.r[0] = a;
  st.r[1] = b;
  exec(st, i1);
  const ok = condOK(cd, st);
  const [desc, formula] = COND[cd],
    sa = S32(a),
    sb = S32(b),
    ua = U(a),
    ub = U(b),
    diff = U(a - b);
  let s =
    step(
      `CMP computes r0 − r1 = ${dv(a)} − ${dv(b)} and sets the flags without storing the result: ${c(flagLine(st))}.`,
    ) +
    step(
      `${cd} means ${desc}. It executes when ${formula}, which is ${ok ? "true" : "false"} here.`,
    );
  if (["GT", "GE", "LT", "LE"].includes(cd))
    s += step(`Signed view: ${dv(a)} ${cmpSym(sa, sb)} ${dv(b)}.`);
  else if (["HI", "HS", "LO", "LS"].includes(cd))
    s += step(`Unsigned view: ${ua} ${cmpSym(ua, ub)} ${ub}.`);
  else if (cd === "EQ" || cd === "NE")
    s += step(`r0 and r1 are ${a === b ? "equal" : "not equal"}.`);
  else
    s += step(
      `The result of r0 − r1 is ${dv(diff)}, which is ${S32(diff) < 0 ? "negative" : "zero or positive"}.`,
    );
  if (sa < sb !== ua < ub && !["EQ", "NE", "MI", "PL"].includes(cd))
    s += step(
      `The signed and unsigned comparisons disagree here: signed, ${dv(a)} ${cmpSym(sa, sb)} ${dv(b)}; unsigned, ${ua} ${cmpSym(ua, ub)} ${ub}. That's why ARM has separate condition codes for each (GT/LT for signed, HI/LO for unsigned).`,
    );
  const mn = txt(i2).split(" ")[0];
  return {
    block: true,
    prompt: `${regTable([
      [0, a],
      [1, b],
    ])}${asmBlock([txt(i1), txt(i2)])}<p>Does the ${c(mn)} execute?</p>`,
    kind: "choice",
    expect: ok ? 0 : 1,
    choices: ["Yes, it executes", "No, it's skipped"],
    answer: ok ? "Yes, it executes" : "No, it's skipped",
    sol: s,
  };
}

export { genALU, genShift, genImm, genFlags, genCond, COND };

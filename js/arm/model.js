// A small A32 model (registers, NZCV, barrel shifter, little-endian memory) plus assembly display helpers.
import { R, bin, hex, grp, pick, fmtNeg } from "../util.js";

/* ================= ARM ASSEMBLY DRILL ================= */
/* --- a small A32 model: 32-bit registers, NZCV, barrel shifter, little-endian memory --- */
const U = (x) => x >>> 0,
  S32 = (x) => x | 0,
  H32 = (v) => "0x" + hex(U(v), 32);
const bitAt = (v, i) => (v >>> i) & 1;
const rg = (i) => "r" + i;
const sx = (v) => "0x" + U(v).toString(16).toUpperCase();
const dv = (v) => fmtNeg(S32(v));
const vt = (v) => {
  const s = S32(v);
  return s >= 0 && s < 10 ? String(s) : `${dv(v)} (${sx(v)})`;
};
const B32 = (v) => grp(bin(U(v), 32));
function ror(v, n) {
  n &= 31;
  return n ? U((v >>> n) | (v << (32 - n))) : U(v);
}
function shifter(v, t, n, cin) {
  v = U(v);
  if (t === "LSL")
    return n ? { v: U(v << n), c: bitAt(v, 32 - n) } : { v, c: cin };
  if (t === "LSR") return { v: v >>> n, c: bitAt(v, n - 1) };
  if (t === "ASR") return { v: U(S32(v) >> n), c: bitAt(v, n - 1) };
  const r = ror(v, n);
  return { v: r, c: bitAt(r, 31) };
}
function encImm(v) {
  v = U(v);
  for (let r = 0; r < 32; r += 2) {
    const x = r ? U((v << r) | (v >>> (32 - r))) : v;
    if (x < 256) return { imm8: x, rot: r };
  }
  return null;
}
const ARITH = { ADD: 1, SUB: 1, RSB: 1, CMP: 1, CMN: 1 };
const NOWRITE = { CMP: 1, CMN: 1, TST: 1, TEQ: 1 };
const MEMOPS = { LDR: 1, LDRB: 1, LDRH: 1, LDRSB: 1, LDRSH: 1, STR: 1 };
function mkState() {
  return {
    r: new Array(16).fill(0),
    n: 0,
    z: 0,
    c: 0,
    v: 0,
    mem: new Map(),
  };
}
function condOK(cd, f) {
  switch (cd) {
    case "EQ":
      return f.z === 1;
    case "NE":
      return f.z === 0;
    case "CS":
    case "HS":
      return f.c === 1;
    case "CC":
    case "LO":
      return f.c === 0;
    case "MI":
      return f.n === 1;
    case "PL":
      return f.n === 0;
    case "VS":
      return f.v === 1;
    case "VC":
      return f.v === 0;
    case "HI":
      return f.c === 1 && f.z === 0;
    case "LS":
      return f.c === 0 || f.z === 1;
    case "GE":
      return f.n === f.v;
    case "LT":
      return f.n !== f.v;
    case "GT":
      return f.z === 0 && f.n === f.v;
    case "LE":
      return f.z === 1 || f.n !== f.v;
    default:
      return true;
  }
}
function rd8(st, a) {
  return st.mem.get(U(a)) || 0;
}
function rdWord(st, a) {
  return U(
    rd8(st, a) |
      (rd8(st, a + 1) << 8) |
      (rd8(st, a + 2) << 16) |
      (rd8(st, a + 3) << 24),
  );
}
function wrWord(st, a, w) {
  for (let k = 0; k < 4; k++) st.mem.set(U(a + k), (U(w) >>> (8 * k)) & 255);
}
function exec(st, i) {
  if (i.cond && !condOK(i.cond, st)) return { skipped: true };
  if (i.op === "B") return { branch: true };
  if (MEMOPS[i.op]) return execMem(st, i);
  if (i.op === "MUL") {
    const r = U(Math.imul(st.r[i.rn], st.r[i.rm]));
    st.r[i.rd] = r;
    if (i.s) {
      st.n = bitAt(r, 31);
      st.z = r === 0 ? 1 : 0;
    }
    return { res: r };
  }
  const a = U(i.rn === undefined ? 0 : st.r[i.rn]);
  let b, sc;
  if (i.op2.k === "imm") {
    b = U(i.op2.v);
    sc = st.c;
  } else if (i.op2.sh) {
    const s = shifter(st.r[i.op2.rm], i.op2.sh, i.op2.n, st.c);
    b = s.v;
    sc = s.c;
  } else {
    b = U(st.r[i.op2.rm]);
    sc = st.c;
  }
  let r,
    cf = sc,
    vf = st.v;
  switch (i.op) {
    case "ADD":
    case "CMN":
      r = U(a + b);
      cf = a + b > 0xffffffff ? 1 : 0;
      vf = (~(a ^ b) & (a ^ r)) >>> 31;
      break;
    case "SUB":
    case "CMP":
      r = U(a - b);
      cf = a >= b ? 1 : 0;
      vf = ((a ^ b) & (a ^ r)) >>> 31;
      break;
    case "RSB":
      r = U(b - a);
      cf = b >= a ? 1 : 0;
      vf = ((b ^ a) & (b ^ r)) >>> 31;
      break;
    case "AND":
    case "TST":
      r = U(a & b);
      break;
    case "ORR":
      r = U(a | b);
      break;
    case "EOR":
    case "TEQ":
      r = U(a ^ b);
      break;
    case "BIC":
      r = U(a & ~b);
      break;
    case "MOV":
      r = b;
      break;
    case "MVN":
      r = U(~b);
      break;
  }
  if (!NOWRITE[i.op]) st.r[i.rd] = r;
  if (i.s || NOWRITE[i.op]) {
    st.n = bitAt(r, 31);
    st.z = r === 0 ? 1 : 0;
    st.c = cf;
    if (ARITH[i.op]) st.v = vf;
  }
  return { res: r, a, b };
}
function execMem(st, i) {
  const base = U(st.r[i.rn]);
  let off = 0;
  if (i.off) {
    off =
      i.off.k === "imm"
        ? i.off.v
        : i.off.sh
          ? shifter(st.r[i.off.rm], i.off.sh, i.off.n, st.c).v
          : U(st.r[i.off.rm]);
  }
  const ea = i.mode === "post" ? base : U(base + off);
  let val;
  switch (i.op) {
    case "LDR":
      val = rdWord(st, ea);
      break;
    case "LDRB":
      val = rd8(st, ea);
      break;
    case "LDRH":
      val = rd8(st, ea) | (rd8(st, ea + 1) << 8);
      break;
    case "LDRSB":
      val = U((rd8(st, ea) << 24) >> 24);
      break;
    case "LDRSH":
      val = U(((rd8(st, ea) | (rd8(st, ea + 1) << 8)) << 16) >> 16);
      break;
    case "STR":
      wrWord(st, ea, st.r[i.rt]);
      break;
  }
  if (val !== undefined) st.r[i.rt] = val;
  const wb = i.mode === "pre" || i.mode === "post" ? U(base + off) : null;
  if (wb !== null) st.r[i.rn] = wb;
  return { ea, base, off, val, wb };
}
function immTxt(v, hx) {
  return hx || U(v) > 255 ? "#" + sx(v) : "#" + v;
}
function o2txt(o) {
  return o.k === "imm"
    ? immTxt(o.v, o.hex)
    : rg(o.rm) + (o.sh ? `, ${o.sh} #${o.n}` : "");
}
function txt(i) {
  const sfx = (i.s ? "S" : "") + (i.cond || "");
  if (i.alias)
    return `${i.alias}${sfx} ${rg(i.rd)}, ${rg(i.op2.rm)}, #${i.op2.n}`;
  if (MEMOPS[i.op]) {
    const o = i.off,
      ot = o
        ? o.k === "imm"
          ? `#${o.v < 0 ? "-" : ""}${Math.abs(o.v)}`
          : rg(o.rm) + (o.sh ? `, ${o.sh} #${o.n}` : "")
        : null;
    if (!ot) return `${i.op} ${rg(i.rt)}, [${rg(i.rn)}]`;
    if (i.mode === "post") return `${i.op} ${rg(i.rt)}, [${rg(i.rn)}], ${ot}`;
    return `${i.op} ${rg(i.rt)}, [${rg(i.rn)}, ${ot}]${i.mode === "pre" ? "!" : ""}`;
  }
  switch (i.op) {
    case "B":
      return `B${i.cond || ""} ${i.target}`;
    case "MOV":
    case "MVN":
      return `${i.op}${sfx} ${rg(i.rd)}, ${o2txt(i.op2)}`;
    case "CMP":
    case "CMN":
    case "TST":
    case "TEQ":
      return `${i.op}${i.cond || ""} ${rg(i.rn)}, ${o2txt(i.op2)}`;
    case "MUL":
      return `MUL${sfx} ${rg(i.rd)}, ${rg(i.rn)}, ${rg(i.rm)}`;
    default:
      return `${i.op}${sfx} ${rg(i.rd)}, ${rg(i.rn)}, ${o2txt(i.op2)}`;
  }
}
function hlAsm(line) {
  const k = line.indexOf("@"),
    code = k < 0 ? line : line.slice(0, k),
    cm = k < 0 ? "" : line.slice(k);
  const h = code.replace(
    /(#-?(?:0x[0-9A-Fa-f]+|\d+))|\b(r1[0-5]|r[0-9]|sp|lr|pc)\b|\b([A-Z]{1,6})\b|^(\w+):/g,
    (m, im, reg, kw, lb) =>
      im
        ? `<span class="im">${im}</span>`
        : reg
          ? reg
          : kw
            ? `<span class="kw">${kw}</span>`
            : `<span class="lb">${lb}</span>:`,
  );
  return h + (cm ? `<span class="cm">${cm}</span>` : "");
}
const asmBlock = (lines) =>
  `<pre class="asm">${lines.map(hlAsm).join("\n")}</pre>`;
const insHtml = (i) => `<span class="ins">${hlAsm(txt(i))}</span>`;
function regTable(list) {
  if (!list.length) return "";
  return `<div class="scroll"><table class="tbl regs"><thead><tr><th>Register</th><th>Hex</th><th>Signed</th></tr></thead><tbody>${list
    .map(
      ([r, v]) =>
        `<tr><td class="rn">${rg(r)}</td><td>${H32(v)}</td><td class="dim">${dv(v)}</td></tr>`,
    )
    .join("")}</tbody></table></div>`;
}
const flagLine = (f) => `N=${f.n} Z=${f.z} C=${f.c} V=${f.v}`;
const cmpSym = (x, y) => (x > y ? ">" : x < y ? "<" : "=");
function distinctRegs(k) {
  const o = [];
  while (o.length < k) {
    const r = R(0, 7);
    if (!o.includes(r)) o.push(r);
  }
  return o;
}
const SHDESC = {
  LSL: (n) =>
    `LSL moves every bit left ${n} place${n > 1 ? "s" : ""} and fills the bottom with zeros. Bits pushed past bit 31 are lost. Without overflow, that's × ${2 ** n}.`,
  LSR: (n) =>
    `LSR moves every bit right ${n} place${n > 1 ? "s" : ""} and fills the top with zeros (unsigned ÷ ${2 ** n}).`,
  ASR: (n) =>
    `ASR moves every bit right ${n} place${n > 1 ? "s" : ""} and copies the sign bit into the top, so negative values stay negative (signed ÷ ${2 ** n}, rounding down).`,
  ROR: (n) =>
    `ROR moves every bit right ${n} place${n > 1 ? "s" : ""}. Bits that fall off bit 0 wrap around into the top.`,
};
const MASKS = () =>
  pick([0xff, 0xf0, 0x0f, 0xff00, 0xff0000, 0xf000000f, U(2 ** R(0, 31))]);

export {
  U,
  S32,
  H32,
  bitAt,
  rg,
  sx,
  dv,
  vt,
  B32,
  ror,
  encImm,
  NOWRITE,
  mkState,
  condOK,
  rdWord,
  wrWord,
  exec,
  immTxt,
  txt,
  asmBlock,
  insHtml,
  regTable,
  flagLine,
  cmpSym,
  distinctRegs,
  SHDESC,
  MASKS,
};

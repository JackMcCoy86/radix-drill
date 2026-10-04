// Number systems problem generators.
import {
  R,
  P,
  MASK,
  bin,
  grp,
  sgn,
  inv,
  H,
  B,
  c,
  pick,
  step,
  fmtNeg,
} from "../util.js";
import { bitStrip, nibbleMap, divTable, placeTable } from "../render.js";

/* ================= NUMBER SYSTEMS DRILL ================= */
function genDec2Bin(n) {
  const v = n === 8 ? R(20, 255) : R(P(n - 4), MASK(n));
  let sol;
  if (n === 8) {
    sol =
      step(
        "Divide by 2 repeatedly. Each remainder is the next bit, starting at bit 0.",
        divTable(v, 2),
      ) +
      step(
        `Read the remainders from the bottom up and pad on the left to ${n} bits.`,
        bitStrip(bin(v, n)),
      );
  } else {
    sol =
      step(
        `Dividing by 2 would take up to ${n} steps. Dividing by 16 is faster, because each remainder is a whole hex digit.`,
        divTable(v, 16),
      ) +
      step(
        `Reading up gives ${c(H(v, n))}. Expand each hex digit into its 4 bits.`,
        nibbleMap(v, n),
      ) +
      step("Result:", bitStrip(bin(v, n)));
  }
  const sig = v.toString(2),
    rev = parseInt([...sig].reverse().join(""), 2);
  return {
    prompt: `Convert ${c(v)} to <strong>${n}-bit</strong> binary.`,
    kind: "bin",
    width: n,
    expect: v,
    answer: B(v, n),
    sol,
    diagnose: (x) =>
      x === rev && rev !== v
        ? "The bits are in reverse order. The first remainder is bit 0, the rightmost bit."
        : "",
  };
}
function genDec2Hex(n) {
  const v = n === 8 ? R(20, 255) : R(P(n - 4), MASK(n));
  return {
    prompt: `Convert ${c(v)} to hexadecimal (${n}-bit).`,
    kind: "hex",
    width: n,
    expect: v,
    answer: H(v, n),
    sol:
      step(
        "Divide by 16 repeatedly. Each remainder (0–15) is one hex digit, starting with the least significant.",
        divTable(v, 16),
      ) + step(`Read the remainders from the bottom up: ${c(H(v, n))}.`),
  };
}
function genHex2Dec(n) {
  const v =
    n === 8 ? R(16, 255) : n === 16 ? R(256, MASK(16)) : R(P(16), MASK(32));
  return {
    prompt: `Convert ${c(H(v, n))} to decimal (unsigned).`,
    kind: "dec",
    width: n,
    expect: v,
    answer: String(v),
    sol: step(
      "Multiply each hex digit by its place value, a power of 16, and add the products.",
      placeTable(v, n),
    ),
    diagnose: (x) =>
      x === sgn(v, n) && x !== v
        ? "That's the signed reading. The question asks for the unsigned value."
        : "",
  };
}
function genBin2Dec(n) {
  const v =
    n === 8 ? R(16, 255) : n === 16 ? R(256, MASK(16)) : R(P(16), MASK(32));
  const terms = [];
  for (let k = n - 1; k >= 0; k--) {
    if ((v >>> k) & 1) terms.push(2 ** k);
  }
  return {
    prompt: `Convert ${c(B(v, n))} to decimal (unsigned).`,
    kind: "dec",
    width: n,
    expect: v,
    answer: String(v),
    sol:
      step(
        "Each 1 bit is worth 2 raised to its position. Find the 1s:",
        bitStrip(bin(v, n)),
      ) + step(`Add their place values: ${terms.join(" + ")} = ${v}.`),
    diagnose: (x) =>
      x === sgn(v, n) && x !== v
        ? "That's the signed reading. The question asks for the unsigned value."
        : "",
  };
}
function genBin2Hex(n) {
  const v = R(1, MASK(n)),
    shown = n === 8 ? bin(v, 8) : grp(bin(v, n), 8);
  return {
    prompt: `Convert ${c(shown)} to hexadecimal.`,
    kind: "hex",
    width: n,
    expect: v,
    answer: H(v, n),
    sol:
      step(
        "Split the bits into groups of 4, starting from bit 0 on the right. Each group maps to one hex digit.",
        nibbleMap(v, n),
      ) + step(`Result: ${c(H(v, n))}.`),
  };
}
function genHex2Bin(n) {
  const v = R(1, MASK(n));
  return {
    prompt: `Write ${c(H(v, n))} as <strong>${n}-bit</strong> binary.`,
    kind: "bin",
    width: n,
    expect: v,
    answer: B(v, n),
    sol:
      step("Replace each hex digit with its 4-bit pattern.", nibbleMap(v, n)) +
      step("Result:", bitStrip(bin(v, n))),
  };
}
function genNeg2TC(n) {
  const m = Math.random() < 0.9 ? R(1, P(n - 1) - 1) : P(n - 1),
    u = P(n) - m,
    kind = n === 8 ? "bin" : "hex";
  let sol =
    step(
      `Start with the magnitude, ${m}, in ${n}-bit binary.`,
      bitStrip(bin(m, n)),
    ) +
    step(
      "Invert every bit (the one's complement).",
      bitStrip(bin(inv(m, n), n)),
    ) +
    step(`Add 1. That gives ${c(H(u, n))}.`, bitStrip(bin(u, n), true)) +
    step(
      `Check with the shortcut: 2<sup>${n}</sup> − ${m} = ${u} = ${c(H(u, n))}.`,
    );
  if (m === P(n - 1))
    sol += step(
      `−${m} is the most negative ${n}-bit value. Its pattern is a 1 followed by all 0s, and it has no positive counterpart.`,
    );
  return {
    prompt: `Write ${c(fmtNeg(-m))} as an <strong>${n}-bit</strong> two's complement value, in ${kind === "bin" ? "binary" : "hex"}.`,
    kind,
    width: n,
    expect: u,
    answer: kind === "bin" ? B(u, n) : H(u, n),
    sol,
    diagnose: (x) =>
      x === inv(m, n)
        ? "That's the one's complement. Add 1 to finish."
        : x === m
          ? "That's the positive magnitude. Invert the bits, then add 1."
          : "",
  };
}
function genTC2Dec(n) {
  const u = Math.random() < 0.75 ? R(P(n - 1), MASK(n)) : R(1, P(n - 1) - 1),
    s = sgn(u, n),
    shown = n === 8 ? c(B(u, 8)) : c(H(u, n));
  let sol;
  if (s >= 0) {
    sol =
      step(
        `Bit ${n - 1}, the sign bit, is 0. The value is positive and reads the same as unsigned.`,
        bitStrip(bin(u, n), true),
      ) + step(`Value: ${s}.`);
  } else {
    const mag = inv(u, n) + 1;
    sol =
      step(
        `Bit ${n - 1}, the sign bit, is 1. The value is negative.`,
        bitStrip(bin(u, n), true),
      ) +
      step(
        `Method 1: subtract 2<sup>${n}</sup> from the unsigned value. ${u} − ${P(n)} = ${fmtNeg(s)}.`,
      ) +
      step(
        `Method 2: invert and add 1 to get the magnitude. ${c(B(inv(u, n), n))} + 1 = ${c(B(mag, n))} = ${mag}, so the value is ${fmtNeg(s)}.`,
      );
  }
  return {
    prompt: `An ${n}-bit register holds ${shown}. What signed decimal value is that in two's complement?`,
    kind: "dec",
    width: n,
    expect: s,
    answer: fmtNeg(s),
    sol,
    diagnose: (x) =>
      s < 0 && x === u
        ? `That's the unsigned reading. Bit ${n - 1} is 1, so the signed value is negative.`
        : s < 0 && x === -inv(u, n)
          ? "Close. After inverting, remember to add 1."
          : "",
  };
}
function genNegate(n) {
  const x = Math.random() < 0.08 ? P(n - 1) : R(1, MASK(n)),
    r = (P(n) - x) % P(n);
  let sol =
    step(
      `x = ${c(H(x, n))}, which is ${fmtNeg(sgn(x, n))} as a signed value.`,
      bitStrip(bin(x, n), true),
    ) +
    step("Invert every bit.", bitStrip(bin(inv(x, n), n))) +
    step(
      `Add 1. −x = ${c(H(r, n))}, which is ${fmtNeg(sgn(r, n))} signed.`,
      bitStrip(bin(r, n), true),
    );
  if (x === P(n - 1))
    sol += step(
      `Negating the most negative value gives the same pattern back. +${P(n - 1)} doesn't fit in ${n}-bit two's complement, so the result overflows.`,
    );
  if (n === 32)
    sol += step(`On ARM this is what ${c("RSB r0, r0, #0")} computes.`);
  return {
    prompt: `Negate the ${n}-bit two's complement value ${c(H(x, n))}. Give −x in hex.`,
    kind: "hex",
    width: n,
    expect: r,
    answer: H(r, n),
    sol,
    diagnose: (v) =>
      v === inv(x, n)
        ? "That's the one's complement. Add 1 to finish."
        : v === x && x !== P(n - 1)
          ? "That's the original value."
          : "",
  };
}
function genRange() {
  const w = pick([4, 8, 16, 32]);
  const V = [
    [
      "u",
      `largest value a ${w}-bit <em>unsigned</em> number can hold`,
      P(w) - 1,
      (v) =>
        v === P(w)
          ? `Counting starts at 0, so the largest is 2<sup>${w}</sup> − 1.`
          : "",
    ],
    [
      "t",
      `largest value in ${w}-bit <em>two's complement</em>`,
      P(w - 1) - 1,
      (v) =>
        v === P(w - 1)
          ? "One bit is used for the sign, and 0 takes one of the non-negative patterns."
          : "",
    ],
    [
      "t",
      `most negative value in ${w}-bit <em>two's complement</em>`,
      -P(w - 1),
      (v) =>
        v === -(P(w - 1) - 1)
          ? "That's the limit for sign-magnitude and one's complement. Two's complement reaches one further."
          : "",
    ],
    [
      "s",
      `most negative value in ${w}-bit <em>sign-magnitude</em>`,
      -(P(w - 1) - 1),
      (v) =>
        v === -P(w - 1)
          ? "That's the two's complement limit. Sign-magnitude wastes a pattern on −0."
          : "",
    ],
    [
      "o",
      `most negative value in ${w}-bit <em>one's complement</em>`,
      -(P(w - 1) - 1),
      (v) =>
        v === -P(w - 1)
          ? "That's the two's complement limit. One's complement wastes a pattern on −0."
          : "",
    ],
    [
      "s",
      `number of distinct values ${w}-bit <em>sign-magnitude</em> can represent`,
      P(w) - 1,
      (v) =>
        v === P(w)
          ? "There are 2<sup>" +
            w +
            "</sup> patterns, but +0 and −0 are the same value."
          : "",
    ],
  ];
  const [hl, desc, ans, diag] = pick(V),
    h = P(w - 1);
  const rows = [
    ["u", "Unsigned", `0`, `${P(w) - 1}`, `${P(w)}`, "2<sup>n</sup> − 1"],
    [
      "s",
      "Sign-magnitude",
      `−${h - 1}`,
      `${h - 1}`,
      `${P(w) - 1} (two zeros)`,
      "±(2<sup>n−1</sup> − 1)",
    ],
    [
      "o",
      "One's complement",
      `−${h - 1}`,
      `${h - 1}`,
      `${P(w) - 1} (two zeros)`,
      "±(2<sup>n−1</sup> − 1)",
    ],
    [
      "t",
      "Two's complement",
      `−${h}`,
      `${h - 1}`,
      `${P(w)}`,
      "−2<sup>n−1</sup> … 2<sup>n−1</sup> − 1",
    ],
  ];
  const tbl = `<div class="scroll"><table class="tbl"><thead><tr><th>Representation</th><th>Min</th><th>Max</th><th>Values</th><th>Formula</th></tr></thead><tbody>${rows
    .map(
      (r) =>
        `<tr class="${r[0] === hl ? "hl" : ""}"><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td><td>${r[5]}</td></tr>`,
    )
    .join("")}</tbody></table></div>`;
  return {
    prompt: `What is the ${desc}?`,
    kind: "dec",
    width: w,
    expect: ans,
    answer: fmtNeg(ans),
    sol:
      step(
        `Here n = ${w}. The four common representations compare like this:`,
        tbl,
      ) +
      step(
        "Two's complement has one more negative value than positive because 0 uses one of the patterns that start with 0, and there's no −0.",
      ),
    diagnose: diag,
  };
}
function genSignExt() {
  const src = Math.random() < 0.6 ? 8 : 16,
    signed = Math.random() < 0.5,
    op = src === 8 ? (signed ? "LDRSB" : "LDRB") : signed ? "LDRSH" : "LDRH",
    v = Math.random() < 0.65 ? R(P(src - 1), MASK(src)) : R(1, P(src - 1) - 1),
    msb = v >= P(src - 1) ? 1 : 0,
    res = signed && msb ? MASK(32) - MASK(src) + v : v,
    alt = signed ? v : msb ? MASK(32) - MASK(src) + v : -1,
    unit = src === 8 ? "byte" : "halfword";
  const how = signed
    ? `${c(op)} sign-extends. It copies bit ${src - 1}, the sign bit, into every bit above it.`
    : `${c(op)} zero-extends. Every bit above bit ${src - 1} becomes 0, whatever the sign bit is.`;
  return {
    prompt: `Memory holds the ${unit} ${c(H(v, src))}. After ${c(op + " r0, [r1]")} loads it, what does r0 hold? Give all 32 bits in hex.`,
    kind: "hex",
    width: 32,
    expect: res,
    answer: H(res, 32),
    sol:
      step(
        `The ${unit} in binary. Its top bit (bit ${src - 1}) is ${msb}.`,
        bitStrip(bin(v, src), true),
      ) +
      step(how) +
      step(`r0 = ${c(H(res, 32))}.`, bitStrip(bin(res, 32))) +
      (signed
        ? step(
            `As a signed value that's ${fmtNeg(sgn(res, 32))}, the same number the ${unit} represented.`,
          )
        : ""),
    diagnose: (x) =>
      x === alt && alt !== res
        ? signed
          ? `That's zero extension. The S in ${op} means the sign bit is copied upward.`
          : `${op} has no S, so it zero-extends. Only ${op.replace("LDR", "LDRS")} copies the sign bit.`
        : "",
  };
}
function genAddFlags(n) {
  const sub = Math.random() < 0.5,
    target = R(0, 3);
  let a,
    b,
    C,
    V,
    k = 0;
  do {
    a = R(0, MASK(n));
    b = R(0, MASK(n));
    C = sub ? a >= b : a + b > MASK(n);
    const ss = sub ? sgn(a, n) - sgn(b, n) : sgn(a, n) + sgn(b, n);
    V = ss > P(n - 1) - 1 || ss < -P(n - 1);
    k++;
  } while ((C ? 1 : 0) + (V ? 2 : 0) !== target && k < 1000);
  const out = (C ? 1 : 0) + (V ? 2 : 0),
    sum = a + b,
    r = sub ? (a - b + P(n)) % P(n) : sum % P(n),
    sa = sgn(a, n),
    sb = sgn(b, n),
    sr = sgn(r, n),
    ma = a >= P(n - 1) ? 1 : 0,
    mb = b >= P(n - 1) ? 1 : 0,
    mr = r >= P(n - 1) ? 1 : 0;
  const choices = [
    "No carry, no overflow (C=0, V=0)",
    "Carry out only (C=1, V=0)",
    "Signed overflow only (C=0, V=1)",
    "Both (C=1, V=1)",
  ];
  const diagnose = (x) =>
    sub && x === (out ^ 1)
      ? "On ARM, C after a subtraction is the opposite of a borrow: C = 1 when no borrow was needed (first operand ≥ second, unsigned)."
      : (x === 1 && out === 2) || (x === 2 && out === 1)
        ? "C and V are swapped. C comes from the unsigned view, V from the signed view."
        : "";
  if (sub) {
    const nb = inv(b, n),
      block =
        n <= 16
          ? `<pre class="calc">    ${B(a, n)}   ${H(a, n)}\n+   ${B(nb, n)}   ${H(nb, n)}   ← NOT ${H(b, n)}\n+   ${" ".repeat(B(a, n).length - 1)}1\n${"─".repeat(B(a, n).length + 4)}\n  ${C ? 1 : 0} ${B(r, n)}   ${H(r, n)}\n  ↑ carry out of bit ${n - 1}</pre>`
          : `<pre class="calc">  ${H(a, n)}\n+ ${H(nb, n)}   ← NOT ${H(b, n)}\n+ ${" ".repeat(9)}1\n${"─".repeat(12)}\n${C ? "1" : " "} ${H(r, n)}   ${C ? "← a 1 carries out of bit 31" : "(no carry out)"}</pre>`;
    return {
      prompt: `Compute ${c(H(a, n))} − ${c(H(b, n))} as ${n}-bit values. Which flags would ${c("SUBS")} set?`,
      kind: "choice",
      width: n,
      expect: out,
      choices,
      answer: choices[out],
      sol:
        step(
          "ARM subtracts by adding: a − b = a + NOT b + 1. The carry out of that addition becomes C.",
          block,
        ) +
        step(
          `<strong>Unsigned view (C flag):</strong> ${C ? `${a} ≥ ${b}, so no borrow is needed: C = 1.` : `${a} < ${b}, so a borrow is needed: C = 0.`} On ARM, C after a subtraction means “no borrow”.`,
        ) +
        step(
          `<strong>Signed view (V flag):</strong> ${fmtNeg(sa)} − ${fmtNeg(sb)} = ${fmtNeg(sa - sb)}. ${V ? `That's outside ${fmtNeg(-P(n - 1))} … ${P(n - 1) - 1}, so the ${n}-bit result reads as ${fmtNeg(sr)}: V = 1.` : `That's inside ${fmtNeg(-P(n - 1))} … ${P(n - 1) - 1}: V = 0.`}`,
        ) +
        step(
          `Shortcut for V: overflow can only happen when the operands have different sign bits, and it happens when the result's sign bit differs from the first operand's. Here the sign bits are ${ma} − ${mb} → ${mr}.`,
        ),
      diagnose,
    };
  }
  let block;
  if (n <= 16) {
    block = `<pre class="calc">    ${B(a, n)}   ${H(a, n)}\n+   ${B(b, n)}   ${H(b, n)}\n${"─".repeat(B(a, n).length + 4)}\n  ${C ? 1 : 0} ${B(r, n)}   ${H(r, n)}\n  ↑ carry out of bit ${n - 1}</pre>`;
  } else {
    block = `<pre class="calc">  ${H(a, n)}\n+ ${H(b, n)}\n${"─".repeat(12)}\n${C ? "1" : " "} ${H(r, n)}   ${C ? "← a 1 carries out of bit 31" : "(no carry out)"}</pre>`;
  }
  return {
    prompt: `Add${c(H(a, n))} + ${c(H(b, n))} as ${n}-bit values. Which flags would ${c("ADDS")} set?`,
    kind: "choice",
    width: n,
    expect: out,
    choices,
    answer: choices[out],
    sol:
      step("Add the bits. Anything past the top bit is the carry out.", block) +
      step(
        `<strong>Unsigned view (C flag):</strong> ${a} + ${b} = ${sum}. ${C ? `That's more than ${MASK(n)}, so a 1 carries out: C = 1.` : `That fits in ${n} bits (max ${MASK(n)}): C = 0.`}`,
      ) +
      step(
        `<strong>Signed view (V flag):</strong> ${fmtNeg(sa)} + ${fmtNeg(sb)} = ${fmtNeg(sa + sb)}. ${V ? `That's outside ${fmtNeg(-P(n - 1))} … ${P(n - 1) - 1}, so the ${n}-bit result reads as ${fmtNeg(sr)}: V = 1.` : `That's inside ${fmtNeg(-P(n - 1))} … ${P(n - 1) - 1}: V = 0.`}`,
      ) +
      step(
        `Shortcut for V: overflow can only happen when both operands have the same sign bit, and it happens when the result's sign bit differs. Here the sign bits are ${ma} + ${mb} → ${mr}.`,
      ),
    diagnose,
  };
}

export {
  genDec2Bin,
  genDec2Hex,
  genHex2Dec,
  genBin2Dec,
  genBin2Hex,
  genHex2Bin,
  genNeg2TC,
  genTC2Dec,
  genNegate,
  genRange,
  genSignExt,
  genAddFlags,
};

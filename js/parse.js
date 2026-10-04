// Answer parsing for each answer kind.
import { U } from "./arm/model.js";

function parse(raw, kind) {
  let s = String(raw)
    .trim()
    .replace(/[\s_,]/g, "")
    .replace(/[−–—]/g, "-");
  if (!s) return { error: "Type an answer first." };
  if (kind === "bin") {
    s = s.replace(/^0b/i, "");
    if (!/^[01]+$/.test(s))
      return { error: "Use only 0s and 1s for a binary answer." };
    return { value: parseInt(s, 2) };
  }
  if (kind === "hex") {
    s = s.replace(/^0x/i, "");
    if (!/^[0-9a-f]+$/i.test(s))
      return { error: "Use the digits 0–9 and A–F for a hex answer." };
    return { value: parseInt(s, 16) };
  }
  if (kind === "word") {
    let neg = false,
      v;
    s = s.replace(/^\+/, "");
    if (s[0] === "-") {
      neg = true;
      s = s.slice(1);
    }
    if (/^0x[0-9a-f]+$/i.test(s)) v = parseInt(s.slice(2), 16);
    else if (/^0b[01]+$/i.test(s)) v = parseInt(s.slice(2), 2);
    else if (/^\d+$/.test(s)) v = parseInt(s, 10);
    else if (/^[0-9a-f]+$/i.test(s))
      return {
        error:
          "Put 0x in front of a hex answer, like 0x1F. Plain digits are read as decimal.",
      };
    else return { error: "Enter a value like 0x1F, 31, or -5." };
    if (neg) v = -v;
    if (v > 0xffffffff || v < -0x80000000)
      return { error: "That doesn't fit in a 32-bit register." };
    return { value: U(v) };
  }
  s = s.replace(/^\+/, "");
  if (!/^-?\d+$/.test(s))
    return { error: "Enter a whole decimal number, like 42 or -42." };
  return { value: parseInt(s, 10) };
}

export { parse };

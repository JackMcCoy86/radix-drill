// ARM load/store and endianness generator.
import { R, c, pick, step } from "../util.js";
import {
  U,
  H32,
  sx,
  mkState,
  rdWord,
  wrWord,
  exec,
  txt,
  asmBlock,
  regTable,
} from "./model.js";

/* memory */
function genMem() {
  const base = pick([0x1000, 0x2000, 0x8000, 0x10000]),
    st = mkState();
  for (let i = 0; i < 4; i++)
    wrWord(st, base + 4 * i, U(Math.random() * 2 ** 32));
  const variant = pick([
    "off",
    "pre",
    "post",
    "reg",
    "byte",
    "half",
    "sbyte",
    "str",
  ]);
  let ins,
    ask = "r0";
  st.r[1] = base;
  switch (variant) {
    case "off":
      ins = {
        op: "LDR",
        rt: 0,
        rn: 1,
        off: { k: "imm", v: pick([4, 8, 12]) },
        mode: "off",
      };
      break;
    case "pre":
      ins = {
        op: "LDR",
        rt: 0,
        rn: 1,
        off: { k: "imm", v: pick([4, 8]) },
        mode: "pre",
      };
      ask = pick(["r0", "r1"]);
      break;
    case "post":
      st.r[1] = base + pick([0, 4, 8]);
      ins = {
        op: "LDR",
        rt: 0,
        rn: 1,
        off: { k: "imm", v: 4 },
        mode: "post",
      };
      ask = pick(["r0", "r1"]);
      break;
    case "reg":
      st.r[2] = R(1, 3);
      ins = {
        op: "LDR",
        rt: 0,
        rn: 1,
        off: { k: "reg", rm: 2, sh: "LSL", n: 2 },
        mode: "off",
      };
      break;
    case "byte":
      ins = {
        op: "LDRB",
        rt: 0,
        rn: 1,
        off: { k: "imm", v: R(1, 15) },
        mode: "off",
      };
      break;
    case "half":
      ins = {
        op: "LDRH",
        rt: 0,
        rn: 1,
        off: { k: "imm", v: 2 * R(1, 7) },
        mode: "off",
      };
      break;
    case "sbyte": {
      const k = R(1, 15);
      st.mem.set(base + k, R(0x80, 0xff));
      ins = {
        op: "LDRSB",
        rt: 0,
        rn: 1,
        off: { k: "imm", v: k },
        mode: "off",
      };
      break;
    }
    case "str":
      st.r[1] = base + 8;
      st.r[0] = U(Math.random() * 2 ** 32);
      ins =
        Math.random() < 0.5
          ? {
              op: "STR",
              rt: 0,
              rn: 1,
              off: { k: "imm", v: -4 },
              mode: "pre",
            }
          : {
              op: "STR",
              rt: 0,
              rn: 1,
              off: { k: "imm", v: 4 },
              mode: "post",
            };
      ask = pick(["addr", "r1"]);
      break;
  }
  const words = [0, 1, 2, 3].map((i) => rdWord(st, base + 4 * i)),
    r1 = st.r[1],
    regs = [[1, r1]];
  if (variant === "reg") regs.push([2, st.r[2]]);
  if (variant === "str") regs.unshift([0, st.r[0]]);
  const mem0 = new Map(st.mem),
    info = exec(st, ins);
  const expect = ask === "addr" ? info.ea : st.r[ask === "r0" ? 0 : 1];
  const memTbl = `<div class="scroll"><table class="tbl regs"><thead><tr><th>Address</th><th>Word</th></tr></thead><tbody>${words.map((w, i) => `<tr><td class="rn">${H32(base + 4 * i)}</td><td>${H32(w)}</td></tr>`).join("")}</tbody></table></div>`;
  const offS = info.off < 0 ? `− ${-info.off}` : `+ ${info.off}`;
  let s;
  if (ins.mode === "post")
    s = step(
      `Post-indexed: the access uses r1 as it is, ${H32(info.ea)}. Only afterward does r1 change to r1 ${offS} = ${H32(info.wb)}.`,
    );
  else if (ins.mode === "pre")
    s = step(
      `Pre-indexed with ${c("!")}: address = r1 ${offS} = ${H32(info.ea)}. Afterward that address is written back into r1.`,
    );
  else if (variant === "reg")
    s = step(
      `Register offset: r2 is shifted first (${st.r[2]} LSL #2 = ${info.off}, a word index times 4), so address = ${H32(info.base)} + ${info.off} = ${H32(info.ea)}. r1 doesn't change.`,
    );
  else
    s = step(
      `Offset addressing: address = r1 + ${info.off} = ${H32(info.ea)}. Without ${c("!")}, r1 doesn't change.`,
    );
  const k = info.ea % 4,
    wa = info.ea - k,
    wd = rdWord({ mem: mem0 }, wa);
  if (ins.op === "LDR")
    s += step(
      `The word at ${H32(info.ea)} is ${H32(info.val)}, so r0 = ${H32(info.val)}.`,
    );
  else if (ins.op === "STR")
    s += step(`STR writes r0 (${H32(regs[0][1])}) to ${H32(info.ea)}.`);
  else {
    const size = ins.op === "LDRH" ? 2 : 1;
    const bt = `<div class="scroll"><table class="tbl"><thead><tr><th>Address</th><th>Byte</th></tr></thead><tbody>${[0, 1, 2, 3].map((j) => `<tr class="${j >= k && j < k + size ? "hl" : ""}"><td>${H32(wa + j)}</td><td>${sx(mem0.get(wa + j) || 0)}</td></tr>`).join("")}</tbody></table></div>`;
    s += step(
      `ARM stores words little-endian: the lowest address holds the least significant byte. The word ${H32(wd)} at ${H32(wa)} is laid out like this:`,
      bt,
    );
    const raw =
      size === 2
        ? mem0.get(info.ea) | (mem0.get(info.ea + 1) << 8)
        : mem0.get(info.ea);
    if (ins.op === "LDRSB")
      s += step(
        `The byte is ${sx(raw)}. Its top bit is 1, so LDRSB sign-extends it: r0 = ${H32(info.val)}.`,
      );
    else
      s += step(
        `${ins.op} ${size === 2 ? "reads the halfword" : "reads the byte"} ${sx(raw)} and zero-extends it: r0 = ${H32(info.val)}.`,
      );
  }
  if (info.wb !== null) s += step(`Writeback: r1 = ${H32(info.wb)}.`);
  const q =
    ask === "addr"
      ? "Which address does the STR write to?"
      : `What is in ${c(ask)} afterward?`;
  return {
    block: true,
    prompt: `<p>Memory (32-bit words):</p>${memTbl}${regTable(regs)}${asmBlock([txt(ins)])}<p>${q}</p>`,
    kind: "word",
    expect,
    answer: H32(expect),
    sol: s,
    diagnose: (v) => {
      if (
        variant === "post" &&
        ask === "r0" &&
        v === rdWord({ mem: mem0 }, info.wb)
      )
        return "Post-indexed loads from r1 first. The offset is added to r1 afterward.";
      if (variant === "post" && ask === "r1" && v === r1)
        return "Post-indexed always updates r1 after the access.";
      if (variant === "pre" && ask === "r1" && v === r1)
        return "The ! writes the computed address back into r1.";
      if (variant === "reg" && v === rdWord({ mem: mem0 }, base + st.r[2]))
        return "The index is shifted (LSL #2, so ×4) before it's added.";
      if (
        (variant === "byte" || variant === "sbyte") &&
        v === ((wd >>> (8 * (3 - k))) & 255) &&
        v !== info.val
      )
        return "That's the big-endian byte. On ARM the lowest address holds the least significant byte.";
      if (variant === "sbyte" && v === mem0.get(info.ea))
        return "LDRSB sign-extends: the byte's top bit is 1, so the upper 24 bits become 1s.";
      if (variant === "str" && ask === "addr" && v === r1 && ins.mode === "pre")
        return "Pre-indexed adds the offset before the access.";
      if (
        variant === "str" &&
        ask === "addr" &&
        v === info.wb &&
        ins.mode === "post"
      )
        return "Post-indexed writes to r1 first, then updates r1.";
      return "";
    },
  };
}

export { genMem };

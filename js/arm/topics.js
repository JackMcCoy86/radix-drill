// ARM assembly topic list.
import { genSignExt } from "../radix/generators.js";
import { genALU, genShift, genImm, genFlags, genCond } from "./alu.js";
import { genTrace } from "./trace.js";
import { genMem } from "./memory.js";

const ASM_TOPICS = [
  {
    id: "a_alu",
    label: "Arithmetic & logic",
    group: "Instructions",
    gen: genALU,
    fixed: true,
  },
  {
    id: "a_shift",
    label: "Shifts & rotates",
    group: "Instructions",
    gen: genShift,
    fixed: true,
  },
  {
    id: "a_imm",
    label: "Immediate encoding",
    group: "Instructions",
    gen: genImm,
    fixed: true,
  },
  {
    id: "a_flags",
    label: "Flags (NZCV)",
    group: "Flags & control flow",
    gen: genFlags,
    fixed: true,
  },
  {
    id: "a_cond",
    label: "Condition codes",
    group: "Flags & control flow",
    gen: genCond,
    fixed: true,
  },
  {
    id: "a_trace",
    label: "Program tracing",
    group: "Flags & control flow",
    gen: genTrace,
    fixed: true,
  },
  {
    id: "a_mem",
    label: "Load & store",
    group: "Memory",
    gen: genMem,
    fixed: true,
  },
  {
    id: "signext",
    label: "Sign & zero extension",
    group: "Memory",
    gen: genSignExt,
    fixed: true,
  },
];

export { ASM_TOPICS };

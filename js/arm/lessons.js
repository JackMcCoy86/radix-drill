// Learn mode lessons for ARM assembly, keyed by topic id.
import { c } from "../util.js";
import { COND } from "./alu.js";

/* ---------- lessons (Learn mode) ---------- */
const table = (head, rows) =>
  `<div class="scroll"><table class="tbl"><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((d) => `<td>${d}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;

const ASM_LESSONS = {
  a_alu: {
    sum: "Work out operand 2, apply the operation, keep 32 bits.",
    idea: `Most A32 data-processing instructions look like ${c("OP Rd, Rn, operand2")}. Rn is always a register. Operand 2 can be an immediate, a register, or a register run through the barrel shifter first. The result goes into Rd and wraps to 32 bits.`,
    how: [
      `Find operand 2. If it's a shifted register like ${c("r1, LSL #2")}, do the shift first.`,
      `Apply the operation to Rn and operand 2. Watch the order: ${c("SUB")} is Rn − operand 2, ${c("RSB")} is operand 2 − Rn.`,
      `Keep the low 32 bits and write the answer in hex. Negative results wrap around: −1 is ${c("0xFFFFFFFF")}.`,
    ],
    tip: [
      "Shortcut",
      `For logic operations, work one hex digit at a time. Each digit is 4 bits that don't affect their neighbours. ANDing with ${c("0xFF")} keeps the last two hex digits and clears the rest.`,
    ],
    ref: [
      "Operations",
      () =>
        table(
          ["Instruction", "Computes"],
          [
            [c("ADD"), "Rn + op2"],
            [c("SUB"), "Rn − op2"],
            [c("RSB"), "op2 − Rn"],
            [c("AND"), "Rn AND op2"],
            [c("ORR"), "Rn OR op2"],
            [c("EOR"), "Rn XOR op2"],
            [c("BIC"), "Rn AND NOT op2"],
            [c("MVN"), "NOT op2 (no Rn)"],
            [c("MUL"), "Rn × Rm, low 32 bits (registers only)"],
          ],
        ),
    ],
    watch: [
      "Mixing up SUB and RSB. RSB is the reversed one.",
      "Doing the operation before shifting operand 2. The shift always comes first.",
      "Treating BIC as AND. BIC clears the bits that are 1 in operand 2.",
    ],
  },
  a_shift: {
    sum: "Move the bits; the shift type decides what fills the gap.",
    idea: `There are four shift types: LSL, LSR, ASR, and ROR. In GNU syntax ${c("LSL r0, r1, #4")} is shorthand for ${c("MOV r0, r1, LSL #4")}. They all move bits the same distance, and differ only in what fills the empty positions.`,
    how: [
      "Write the value in binary (or hex, if the shift is a multiple of 4).",
      "Move every bit n places in the shift's direction.",
      "Fill the gap: LSL and LSR fill with 0s. ASR fills the top with copies of bit 31. ROR fills the top with the bits that fell off the bottom.",
      "Convert the result back to hex.",
    ],
    tip: [
      "Shortcut",
      `A shift by a multiple of 4 moves whole hex digits. On ${c("0x12345678")}, LSR #8 gives ${c("0x00123456")} and ROR #8 gives ${c("0x78123456")}.`,
    ],
    ref: [
      "Shift types",
      () =>
        table(
          ["Type", "Direction", "Fills with", "Arithmetic meaning"],
          [
            ["LSL", "left", "0s at the bottom", "× 2<sup>n</sup>"],
            ["LSR", "right", "0s at the top", "unsigned ÷ 2<sup>n</sup>"],
            ["ASR", "right", "copies of bit 31", "signed ÷ 2<sup>n</sup>, rounding down"],
            ["ROR", "right", "bits from the bottom", "none, no bits are lost"],
          ],
        ),
    ],
    watch: [
      "Using LSR when the question says ASR. If bit 31 is 1, ASR fills the top with 1s.",
      "Losing the bits in a ROR. They wrap around to the top.",
      "Moving n hex digits instead of n bits. Only multiples of 4 line up with hex digits.",
    ],
  },
  a_imm: {
    sum: "An 8-bit value, moved to an even bit position.",
    idea: "An A32 instruction has only 12 bits for an immediate: an 8-bit value (imm8) and a 4-bit rotate field. The hardware rotates imm8 right by twice the rotate field. So a constant encodes only if all of its 1 bits fit inside an 8-bit window that starts on an even bit.",
    how: [
      "Write the constant in binary and find its lowest and highest 1 bits.",
      "Round the lowest 1's position down to an even number. That's where the window starts.",
      "If the highest 1 is at most 7 positions above the start, it encodes.",
      `If not, try a window that wraps from bit 31 around to bit 0. ${c("0xF000000F")} encodes as ${c("0xFF")} rotated right by 4.`,
    ],
    tip: [
      "Shortcut",
      `Every value from 0 to 255 encodes. So does any constant whose nonzero hex digits sit in two neighbouring positions, like ${c("0x00AB0000")}, because hex digits always start on an even bit.`,
    ],
    ref: [
      "Examples",
      () =>
        table(
          ["Constant", "Encodes?", "Why"],
          [
            [c("0xFF"), "Yes", "fits in bits 0–7"],
            [c("0x3FC"), "Yes", "0xFF shifted left 2"],
            [c("0x1FE"), "No", "0xFF shifted left 1, an odd amount"],
            [c("0x101"), "No", "bits 0 and 8 are 9 bits apart"],
            [c("0xFF000000"), "Yes", "0xFF shifted left 24"],
            [c("0xF000000F"), "Yes", "window wraps from bit 28 to bit 3"],
          ],
        ),
    ],
    watch: [
      `Allowing odd shifts. ${c("0x1FE")} is 0xFF shifted by 1, which can't be encoded.`,
      `Counting the 1 bits instead of how far apart they are. ${c("0x101")} has only two 1s but spans 9 bits.`,
      "Forgetting that the window can wrap from bit 31 around to bit 0.",
    ],
  },
  a_flags: {
    sum: "N and Z come from the result; C and V depend on the instruction.",
    idea: `Instructions with an S suffix, plus ${c("CMP")}, ${c("CMN")}, and ${c("TST")}, update the NZCV flags. N and Z always describe the 32-bit result. C and V mean different things for arithmetic and logical instructions.`,
    how: [
      "Compute the 32-bit result. CMP works like SUBS, CMN like ADDS, and TST like ANDS, but they throw the result away.",
      "N = bit 31 of the result. Z = 1 if the result is 0.",
      "C: after an add, 1 if the unsigned sum carries out of bit 31. After a subtract, 1 if there was no borrow (first ≥ second as unsigned). After a logical instruction, the last bit the shifter pushed out, or unchanged if there's no shift.",
      "V: after an add or subtract, 1 if the signed result is out of range. Logical instructions leave V unchanged.",
    ],
    tip: [
      "Shortcut",
      `Two values to remember: ${c("0x7FFFFFFF + 1")} gives 0x80000000 with N = 1 and V = 1. ${c("0xFFFFFFFF + 1")} gives 0 with Z = 1 and C = 1.`,
    ],
    ref: [
      "What each instruction sets",
      () =>
        table(
          ["Instruction", "N, Z", "C", "V"],
          [
            ["ADDS, CMN", "from result", "carry out", "signed overflow"],
            ["SUBS, RSBS, CMP", "from result", "1 = no borrow", "signed overflow"],
            ["ANDS, MOVS, TST", "from result", "shifter carry, or unchanged", "unchanged"],
            ["LSLS, LSRS, …", "from result", "last bit shifted out", "unchanged"],
          ],
        ),
    ],
    watch: [
      "Treating C after a subtraction as a borrow flag. On ARM, C = 1 means no borrow. x86 uses the opposite.",
      "Changing V on a logical instruction. Only arithmetic instructions touch V.",
      "Comparing equal values: CMP gives Z = 1 and C = 1, since a ≥ a.",
    ],
  },
  a_cond: {
    sum: "Run the CMP, then test the condition against NZCV.",
    idea: `Almost every A32 instruction can take a condition suffix, like ${c("MOVGT")} or ${c("ADDEQ")}. It runs only if the condition holds for the current flags. Otherwise it's skipped, as if it weren't there.`,
    how: [
      `Work out the flags from the ${c("CMP r0, r1")}, which computes r0 − r1.`,
      "Look up the condition's flag test in the table below and check it.",
      "Or skip the flags: after CMP r0, r1, most conditions just compare r0 with r1. GT, GE, LT, and LE compare them as signed numbers; HI, HS, LO, and LS as unsigned.",
    ],
    tip: [
      "Shortcut",
      `Read the suffix as a comparison. After ${c("CMP r0, r1")}, ${c("MOVGT")} runs if r0 > r1 signed. A negative number is huge when read unsigned: −1 is 4294967295, so −1 is HI compared to 5. HS and LO are also written CS and CC.`,
    ],
    ref: [
      "Condition codes",
      () =>
        table(
          ["Code", "Meaning", "Runs when"],
          Object.entries(COND).map(([k, [m, f]]) => [c(k), m, f]),
        ),
    ],
    watch: [
      "Comparing as signed for HI, HS, LO, or LS. Those codes read both values as unsigned.",
      "Mixing up HS (≥) with HI (>), or GE (≥) with GT (>).",
      "Testing the sign of r0 for MI or PL. They test the sign of r0 − r1.",
    ],
  },
  a_trace: {
    sum: "Run one instruction at a time and track every register.",
    idea: "Tracing means being the processor. Keep a table of the registers and flags, update it after each instruction, and follow branches back to their labels.",
    how: [
      `Write down each register's starting value. ${c("MVN r0, #5")} puts NOT 5 = −6 in r0.`,
      `Run each line in order, changing only its destination register. Flags change only on instructions with an S suffix and on ${c("CMP")}, ${c("CMN")}, and ${c("TST")}.`,
      "For a conditional instruction or branch, check the condition against the current flags. A skipped instruction changes nothing. A taken branch jumps to its label.",
      "Stop when you run past the last line.",
    ],
    tip: [
      "Shortcut",
      "Look for the pattern. Once you see what one pass of a loop does, you can often work out the result without tracing every pass. Still check the first and last passes by hand.",
    ],
    watch: [
      "Treating MVN #n as −n. It gives −(n + 1).",
      `Updating flags on an instruction without S. ${c("SUB")} leaves the flags alone; ${c("SUBS")} sets them.`,
      "Running a loop one time too many or too few. Check where the test happens relative to the decrement.",
    ],
  },
  a_mem: {
    sum: "Work out the address, read it little-endian, then apply writeback.",
    idea: `${c("LDR")} loads a register from memory and ${c("STR")} stores one. The address is a base register plus an offset. The addressing mode decides whether the offset is added before or after the access, and whether the base register is updated.`,
    how: [
      `Find the address. ${c("[r1, #4]")} is r1 + 4. ${c("[r1, r2, LSL #2]")} is r1 + r2 × 4.`,
      "Read or write at that address. LDR moves 4 bytes. LDRB and LDRH move 1 or 2 and zero-extend; LDRSB and LDRSH sign-extend.",
      `ARM is little-endian: the lowest address holds the least significant byte. The word ${c("0x11223344")} at 0x1000 puts 0x44 at 0x1000 and 0x11 at 0x1003.`,
      "Apply writeback, if the mode has it (see the table).",
    ],
    tip: [
      "Finding a byte",
      "To read the byte at offset k into a word, count k bytes from the right of its hex value. Offset 0 is the last two hex digits, offset 3 is the first two.",
    ],
    ref: [
      "Addressing modes",
      () =>
        table(
          ["Syntax", "Address used", "r1 afterward"],
          [
            [c("[r1, #4]"), "r1 + 4", "unchanged"],
            [c("[r1, #4]!"), "r1 + 4", "r1 + 4 (pre-indexed)"],
            [c("[r1], #4"), "r1", "r1 + 4 (post-indexed)"],
            [c("[r1, r2, LSL #2]"), "r1 + r2 × 4", "unchanged"],
          ],
        ),
    ],
    watch: [
      "Reading bytes big-endian. The byte at the lowest address is the rightmost one in the hex word.",
      "Using the updated address for a post-indexed access. It uses r1 first, then adds the offset.",
      "Forgetting the shift on a register offset. LSL #2 multiplies the index by 4.",
    ],
  },
  signext: {
    sum: "Copy the sign bit upward for LDRSB and LDRSH; fill with 0s otherwise.",
    idea: "Loading a byte or halfword into a 32-bit register leaves the upper bits to fill. Zero extension fills them with 0s and keeps the unsigned value. Sign extension fills them with copies of the top bit and keeps the signed value.",
    how: [
      "Look at the top bit: bit 7 of a byte, bit 15 of a halfword. In hex it's 1 when the first digit is 8–F.",
      `${c("LDRB")} and ${c("LDRH")}: fill every bit above it with 0.`,
      `${c("LDRSB")} and ${c("LDRSH")}: fill every bit above it with a copy of the top bit.`,
      "Write out all 8 hex digits.",
    ],
    tip: [
      "Shortcut",
      `In hex, a byte from 0x80 to 0xFF sign-extends to ${c("0xFFFFFF")} followed by the byte. A halfword from 0x8000 to 0xFFFF becomes ${c("0xFFFF")} followed by the halfword. If the top bit is 0, both kinds of load just pad with 0s.`,
    ],
    ref: [
      "Examples",
      () =>
        table(
          ["In memory", "Zero-extended", "Sign-extended"],
          [
            [c("0x7F"), c("0x0000007F"), c("0x0000007F")],
            [c("0x80"), c("0x00000080"), c("0xFFFFFF80")],
            [c("0xBEEF"), c("0x0000BEEF"), c("0xFFFFBEEF")],
          ],
        ),
    ],
    watch: [
      "Sign-extending with LDRB or LDRH. Only the versions with an S copy the sign bit.",
      "Changing the original bits. Extension only fills the bits above; the byte or halfword itself stays the same.",
    ],
  },
};

export { ASM_LESSONS };

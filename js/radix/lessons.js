// Learn mode lessons for number systems, keyed by topic id.
import { P, bin, c } from "../util.js";

/* ---------- lessons (Learn mode) ---------- */
function placeRef(base, k) {
  const pos = [...Array(k)].map((_, i) => k - 1 - i);
  return `<div class="scroll"><table class="tbl"><tbody><tr><th>Position</th>${pos.map((p) => `<td>${p}</td>`).join("")}</tr><tr><th>Place value</th>${pos.map((p) => `<td>${base ** p}</td>`).join("")}</tr></tbody></table></div>`;
}
const nibbleRef = () =>
  `<div class="map">${[...Array(16)].map((_, d) => `<div class="pair"><span class="h">${d.toString(16).toUpperCase()}</span><span class="b">${bin(d, 4)}</span></div>`).join("")}</div>`;
const digitRef = () =>
  `<div class="map">${[10, 11, 12, 13, 14, 15].map((d) => `<div class="pair"><span class="h">${d.toString(16).toUpperCase()}</span><span class="b">${d}</span></div>`).join("")}</div>`;
function rangeRef(n) {
  const h = P(n - 1),
    rows = [
      ["Unsigned", "0 … 2<sup>n</sup> − 1", `0 … ${P(n) - 1}`],
      ["Sign-magnitude", "±(2<sup>n−1</sup> − 1)", `−${h - 1} … ${h - 1}`],
      ["One's complement", "±(2<sup>n−1</sup> − 1)", `−${h - 1} … ${h - 1}`],
      [
        "Two's complement",
        "−2<sup>n−1</sup> … 2<sup>n−1</sup> − 1",
        `−${h} … ${h - 1}`,
      ],
    ];
  return `<div class="scroll"><table class="tbl"><thead><tr><th>Representation</th><th>Range</th><th>${n}-bit</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join("")}</tbody></table></div>`;
}
const SIGNED_READING =
  "Giving the signed reading. These questions ask for the unsigned value, so a top bit of 1 doesn't make it negative.";
const RADIX_LESSONS = {
  dec2bin: {
    sum: "Divide by 2 and read the remainders from the bottom up.",
    idea: "Every binary digit stands for a power of 2: 1, 2, 4, 8, 16, and so on, doubling from right to left. Converting a decimal number means finding which of those powers add up to it.",
    how: [
      "Divide the number by 2. The remainder, 0 or 1, is bit 0 (the rightmost bit).",
      "Divide the quotient by 2 again. That remainder is bit 1. Keep going until the quotient reaches 0.",
      "Read the remainders from the last one to the first, and pad with 0s on the left to the full width.",
    ],
    tip: [
      "Faster for big numbers",
      "Divide by 16 instead. Each remainder is a whole hex digit, and each hex digit expands to exactly 4 bits.",
    ],
    ref: ["Powers of 2", () => placeRef(2, 8)],
    watch: [
      "Reading the remainders top to bottom. That writes the bits in reverse order.",
      "Leaving off the leading 0s. An 8-bit answer always has 8 bits, even for a small number.",
    ],
  },
  dec2hex: {
    sum: "Divide by 16 and turn each remainder into a hex digit.",
    idea: "Hex digits stand for powers of 16: 1, 16, 256, 4096, and so on. Each digit runs from 0 to 15, with A–F standing for 10–15.",
    how: [
      "Divide the number by 16. The remainder (0–15) is the rightmost hex digit.",
      "Divide the quotient by 16 again for the next digit. Keep going until the quotient reaches 0.",
      "Write remainders 10–15 as A–F, then read the digits from the last one to the first.",
    ],
    ref: ["Digits above 9", digitRef],
    watch: [
      "Writing a remainder like 12 as two digits. It's the single digit C.",
      "Reading the remainders top to bottom, which reverses the digits.",
    ],
  },
  hex2dec: {
    sum: "Multiply each digit by its power of 16, then add.",
    idea: "A hex number is a sum: each digit times the power of 16 for its position. Positions count from 0 on the right.",
    how: [
      "Number the digits from 0, starting on the right.",
      "Convert each digit to its value (A = 10 … F = 15) and multiply it by 16 raised to its position.",
      "Add the products.",
    ],
    tip: [
      "Shortcut",
      "Work left to right instead. Start at 0, and for each digit multiply the running total by 16 and add the digit. No big powers needed.",
    ],
    ref: ["Powers of 16", () => placeRef(16, 5)],
    watch: [
      SIGNED_READING,
      "Counting positions from the left, or starting at 1 instead of 0.",
    ],
  },
  bin2dec: {
    sum: "Add up the place value of every 1 bit.",
    idea: "Bit k is worth 2<sup>k</sup>, counting from bit 0 on the right. A 0 bit adds nothing, so only the 1s matter.",
    how: [
      "Number the bits from 0, starting on the right.",
      "For each 1 bit, write down 2 raised to its position.",
      "Add those values.",
    ],
    tip: [
      "Shortcut",
      "For long values, convert to hex first (groups of 4 bits), then hex to decimal. A run of all 1s is one less than the next power of 2: 1111 1111 = 2<sup>8</sup> − 1 = 255.",
    ],
    ref: ["Powers of 2", () => placeRef(2, 8)],
    watch: [
      SIGNED_READING,
      "Numbering bits from the left. Bit 0 is always the rightmost bit.",
    ],
  },
  bin2hex: {
    sum: "Split the bits into groups of 4 and convert each group.",
    idea: "16 is 2<sup>4</sup>, so every hex digit lines up with exactly 4 bits. There's no arithmetic, just a lookup.",
    how: [
      "Starting at the right, split the bits into groups of 4.",
      "If the leftmost group is short, pad it with 0s on the left.",
      "Replace each group with its hex digit.",
    ],
    ref: ["4-bit patterns", nibbleRef],
    watch: [
      "Grouping from the left when the bit count isn't a multiple of 4. Always start from bit 0 on the right.",
    ],
  },
  hex2bin: {
    sum: "Replace each hex digit with its 4-bit pattern.",
    idea: "16 is 2<sup>4</sup>, so every hex digit expands to exactly 4 bits. There's no arithmetic, just a lookup.",
    how: [
      "Take the hex digits one at a time.",
      "Write each digit's 4-bit pattern, keeping its leading 0s (3 becomes 0011, not 11).",
      "Join the groups in the same order.",
    ],
    ref: ["4-bit patterns", nibbleRef],
    watch: [
      "Dropping the leading 0s inside a group. Every hex digit is exactly 4 bits.",
      "Mixing up B (1011) and D (1101).",
    ],
  },
  neg2tc: {
    sum: "Write the magnitude in binary, invert every bit, add 1.",
    idea: "In n-bit two's complement, −m is stored as the bit pattern for 2<sup>n</sup> − m. Negative values always have a 1 in the top bit, the sign bit.",
    how: [
      "Write the magnitude m (the number without its minus sign) in n-bit binary, including leading 0s.",
      "Invert every bit: 0s become 1s and 1s become 0s.",
      "Add 1.",
    ],
    tip: [
      "Shortcut",
      "Copy the bits from the right up to and including the first 1, then invert everything to its left. Or compute 2<sup>n</sup> − m directly.",
    ],
    watch: [
      "Stopping after the inversion. That's one's complement, and it's off by one.",
      "Inverting before padding to the full width. The leading 0s have to become 1s too.",
      "The most negative value, −2<sup>n−1</sup>, is a 1 followed by all 0s. In 8 bits, −128 is 1000 0000.",
    ],
  },
  tc2dec: {
    sum: "Check the sign bit. If it's 1, subtract 2ⁿ from the unsigned value.",
    idea: "In two's complement the top bit has a negative weight: −2<sup>n−1</sup> instead of +2<sup>n−1</sup>. Every other bit keeps its usual positive value.",
    how: [
      "Look at the top bit (bit n−1). If it's 0, the value is positive: read it as an ordinary unsigned number.",
      "If it's 1, the value is negative. Read the pattern as unsigned, then subtract 2<sup>n</sup>.",
      "Or invert every bit and add 1 to get the magnitude, then put a minus sign in front.",
    ],
    tip: [
      "Shortcut",
      "Use the negative weight directly. In 8 bits, 1000 0011 is −128 + 2 + 1 = −125.",
    ],
    watch: [
      "Giving the unsigned reading when the top bit is 1.",
      "Inverting without adding 1, which leaves the magnitude one too small.",
    ],
  },
  negate: {
    sum: "Invert all the bits, then add 1. It works in both directions.",
    idea: "Negation in two's complement is the same operation whether x is positive or negative: the result is 2<sup>n</sup> − x, kept to n bits.",
    how: [
      "Write x in binary.",
      "Invert every bit.",
      "Add 1, and drop any carry past the top bit.",
    ],
    tip: [
      "On ARM",
      `${c("RSB r0, r0, #0")} computes 0 − r0, which is the same thing. GNU as also accepts ${c("NEG r0, r0")} for it.`,
    ],
    watch: [
      "Stopping after the inversion (one's complement).",
      "The most negative value has no positive partner. Negating 1000…0 gives 1000…0 back, which is an overflow.",
      "Negating 0 gives 0: all 1s plus 1 wraps around to all 0s.",
    ],
  },
  range: {
    sum: "The smallest and largest values n bits can hold in each representation.",
    idea: "n bits give 2<sup>n</sup> patterns. Each representation shares them out differently between positive and negative values.",
    how: [
      "Unsigned: every pattern is a non-negative number, so the range is 0 to 2<sup>n</sup> − 1.",
      "Two's complement: half the patterns are negative. The range is −2<sup>n−1</sup> to 2<sup>n−1</sup> − 1.",
      "Sign-magnitude and one's complement: both have a +0 and a −0, so they lose one value. The range is −(2<sup>n−1</sup> − 1) to 2<sup>n−1</sup> − 1.",
    ],
    ref: ["Ranges for n = 8", () => rangeRef(8)],
    watch: [
      "Answering 2<sup>n</sup> for the largest unsigned value. Counting starts at 0, so it's 2<sup>n</sup> − 1.",
      "Making two's complement symmetric. It has one more negative value than positive, because 0 takes one of the non-negative patterns.",
    ],
  },
  addflags: {
    sum: "C tracks the unsigned result, V tracks the signed result.",
    idea: "The adder doesn't know whether you meant the operands as unsigned or signed, so ARM reports on both. C says whether the unsigned result went out of range, and V says whether the signed result did.",
    how: [
      `${c("ADDS")}: C = 1 when the unsigned sum is bigger than 2<sup>n</sup> − 1, which shows up as a carry out of the top bit.`,
      `${c("SUBS")}: ARM computes a + NOT b + 1, and C is the carry out of that addition. So C = 1 when a ≥ b as unsigned values (no borrow).`,
      "V = 1 when the true signed result falls outside −2<sup>n−1</sup> … 2<sup>n−1</sup> − 1, so the n-bit result has the wrong sign.",
    ],
    tip: [
      "Shortcut",
      "You can spot V from the sign bits alone. When adding, overflow only happens if both operands have the same sign and the result's sign is different. When subtracting, only if the operands' signs differ and the result's sign differs from the first operand's.",
    ],
    watch: [
      `Treating C after ${c("SUBS")} as a borrow flag. On ARM it's the opposite: C = 0 means a borrow happened.`,
      "Swapping C and V. C comes from the unsigned view, V from the signed view.",
    ],
  },
};

export { RADIX_LESSONS };

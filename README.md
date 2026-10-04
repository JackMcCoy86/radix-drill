# radix-drill
Practice drills for ARM assembly and number systems, built for my microprocessor
engineering course.

**Live app:** https://jackmccoy86.github.io/radix-drill/

Every problem is generated randomly, so there's no fixed question bank to memorize.
Each answer is checked instantly and comes with a step-by-step worked solution.
Common mistakes (like forgetting to add 1 in two's complement, or reading a
little-endian byte backwards) get specific feedback.

For number systems, **Learn** mode has a short guide to each problem type: how
it works, a reference table where it helps, common mistakes, and a fresh worked
example. Each guide links straight to practicing that topic.

## Drills

**Number systems**
- Conversions between binary, hex, and decimal (8-bit)
- Two's complement, negation, and representation ranges
- Carry vs. signed overflow (ADDS and SUBS)

**ARM assembly (A32, GNU syntax)**
- Arithmetic, logic, and barrel-shifter operands
- Shifts and rotates
- Immediate encoding (8-bit value, even rotation)
- NZCV flags after ADDS, SUBS, CMP, and more
- Condition codes (signed vs. unsigned comparisons)
- Program tracing with loops and conditional execution
- Load/store addressing modes and little-endian memory
- Sign and zero extension (LDRB, LDRSB, LDRH, LDRSH)

## How it works

Runs entirely in the browser as a single HTML file, with no install or account
needed. Assembly answers come from a small built-in model of the 32-bit ARM
instruction set. Progress is saved locally in your browser.

On a phone, use "Add to Home Screen" to open it like an app.

## Roadmap

- [x] Binary → decimal conversions
- [x] Subtraction in the carry/overflow drill
- [ ] Branches, the stack, and PUSH/POP
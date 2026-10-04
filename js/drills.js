// Drill registry: every drill and its topics.
import { RADIX_TOPICS } from "./radix/topics.js";
import { RADIX_LESSONS } from "./radix/lessons.js";
import { ASM_TOPICS } from "./arm/topics.js";

const DRILLS = [
  {
    id: "radix",
    label: "Number systems",
    topics: RADIX_TOPICS,
    lessons: RADIX_LESSONS,
  },
  { id: "asm", label: "ARM assembly", topics: ASM_TOPICS },
];
/* Number systems problems are 8-bit. The generators also handle 16 and 32. */
const WIDTH = 8;
const ALL = [...RADIX_TOPICS, ...ASM_TOPICS];

export { DRILLS, WIDTH, ALL };

// Number systems topic list.
import {
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
  genAddFlags,
} from "./generators.js";

const RADIX_TOPICS = [
  {
    id: "dec2bin",
    label: "Decimal → binary",
    group: "Conversions",
    gen: genDec2Bin,
  },
  {
    id: "dec2hex",
    label: "Decimal → hex",
    group: "Conversions",
    gen: genDec2Hex,
  },
  {
    id: "hex2dec",
    label: "Hex → decimal",
    group: "Conversions",
    gen: genHex2Dec,
  },
  {
    id: "bin2dec",
    label: "Binary → decimal",
    group: "Conversions",
    gen: genBin2Dec,
  },
  {
    id: "bin2hex",
    label: "Binary → hex",
    group: "Conversions",
    gen: genBin2Hex,
  },
  {
    id: "hex2bin",
    label: "Hex → binary",
    group: "Conversions",
    gen: genHex2Bin,
  },
  {
    id: "neg2tc",
    label: "Negative → two's complement",
    group: "Signed values",
    gen: genNeg2TC,
  },
  {
    id: "tc2dec",
    label: "Two's complement → decimal",
    group: "Signed values",
    gen: genTC2Dec,
  },
  {
    id: "negate",
    label: "Negation",
    group: "Signed values",
    gen: genNegate,
  },
  {
    id: "range",
    label: "Ranges",
    group: "Signed values",
    gen: genRange,
    fixed: true,
  },
  {
    id: "addflags",
    label: "Carry & overflow",
    group: "Signed values",
    gen: genAddFlags,
  },
];

export { RADIX_TOPICS };

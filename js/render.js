// Solution renderers: bit strips, nibble maps, division and place-value tables.
import { bin, hex } from "./util.js";

/* ---------- solution renderers ---------- */
function bitStrip(s, signBit = false, win = null) {
  const L = s.length,
    groups = [];
  for (let i = 0; i < L; i += 4) groups.push([s.slice(i, i + 4), L - 1 - i]);
  return `<div class="scroll"><div class="strip">${groups
    .map(([g, hi]) => {
      const lo = hi - g.length + 1;
      return `<div class="nib"><span class="idx"><span>${hi}</span><span>${lo}</span></span><div class="cells">${[...g].map((b, j) => `<span class="bit b${b}${signBit && hi - j === L - 1 ? " sign" : ""}${win && win.has(hi - j) ? " win" : ""}">${b}</span>`).join("")}</div></div>`;
    })
    .join("")}</div></div>`;
}
function nibbleMap(v, n) {
  const h = hex(v, n),
    b = bin(v, n);
  return `<div class="map">${[...h].map((d, i) => `<div class="pair"><span class="h">${d}</span><span class="b">${b.slice(i * 4, i * 4 + 4)}</span></div>`).join("")}</div>`;
}
function divTable(v, base) {
  const rows = [];
  let q = v,
    k = 0;
  while (q > 0) {
    const nq = Math.floor(q / base),
      r = q % base;
    rows.push([q, nq, r, k]);
    q = nq;
    k++;
  }
  return `<div class="scroll"><table class="tbl"><thead><tr><th>Divide</th><th>Quotient</th><th>Remainder</th><th>Gives</th></tr></thead><tbody>${rows
    .map(
      ([q, nq, r, k]) =>
        `<tr><td>${q} ÷ ${base}</td><td>${nq}</td><td>${r}${base === 16 && r > 9 ? " = " + r.toString(16).toUpperCase() : ""}</td><td>${base === 2 ? "bit " + k : "hex digit " + k}</td></tr>`,
    )
    .join("")}</tbody></table></div>`;
}
function placeTable(v, n) {
  const h = hex(v, n).replace(/^0+(?=.)/, ""),
    L = h.length;
  let terms = [];
  const rows = [...h]
    .map((d, i) => {
      const pos = L - 1 - i,
        val = parseInt(d, 16),
        w = 16 ** pos,
        pr = val * w;
      terms.push(pr);
      return `<tr><td>${d}</td><td>${val}</td><td>16<sup>${pos}</sup> = ${w}</td><td>${pr}</td></tr>`;
    })
    .join("");
  return `<div class="scroll"><table class="tbl"><thead><tr><th>Digit</th><th>Value</th><th>Place</th><th>Product</th></tr></thead><tbody>${rows}</tbody></table></div><p class="result-line">${terms.join(" + ")} = ${v}</p>`;
}

export { bitStrip, nibbleMap, divTable, placeTable };

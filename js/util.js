// Number formatting and HTML helpers shared by every drill.

/* ---------- number helpers ---------- */
const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const P = (n) => 2 ** n;
const MASK = (n) => P(n) - 1;
const bin = (v, n) => v.toString(2).padStart(n, "0");
const hex = (v, n) =>
  v
    .toString(16)
    .toUpperCase()
    .padStart(Math.ceil(n / 4), "0");
const grp = (s, k = 4) => {
  const o = [];
  for (let i = s.length; i > 0; i -= k)
    o.unshift(s.slice(Math.max(0, i - k), i));
  return o.join(" ");
};
const sgn = (u, n) => (u >= P(n - 1) ? u - P(n) : u);
const inv = (v, n) => MASK(n) - v;
const H = (v, n) => "0x" + hex(v, n);
const B = (v, n) => grp(bin(v, n));
const c = (s) => `<code>${s}</code>`;
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const step = (t, x = "") => `<li><p>${t}</p>${x}</li>`;
const fmtNeg = (v) => (v < 0 ? "−" + -v : String(v));

export { R, P, MASK, bin, hex, grp, sgn, inv, H, B, c, pick, step, fmtNeg };

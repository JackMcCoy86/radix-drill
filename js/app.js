// App UI, state, grading, Learn mode. Browser only.
import { c, pick } from "./util.js";
import { RADIX_TOPICS } from "./radix/topics.js";
import { ASM_TOPICS } from "./arm/topics.js";
import { DRILLS, WIDTH, ALL } from "./drills.js";
import { parse } from "./parse.js";

/* ---------- app ---------- */
const KEY = "radix-drill-v1";
const S = {
  settings: {
    drill: "radix",
    mode: "practice",
    setSize: 0,
    topics: {
      radix: RADIX_TOPICS.map((t) => t.id),
      asm: ASM_TOPICS.map((t) => t.id),
    },
  },
  life: { by: {}, best: 0 },
  ses: { done: 0, correct: 0, streak: 0, best: 0, by: {} },
  cur: null,
  graded: false,
  last: null,
  lesson: null,
};
function setTopics(k, arr) {
  const ids = DRILLS.find((x) => x.id === k).topics.map((t) => t.id),
    f = arr.filter((i) => ids.includes(i));
  if (f.length) S.settings.topics[k] = f;
}
try {
  const d = JSON.parse(localStorage.getItem(KEY) || "null");
  if (d && d.settings) {
    const ds = d.settings;
    if ([0, 10, 25].includes(ds.setSize)) S.settings.setSize = ds.setSize;
    if (DRILLS.some((x) => x.id === ds.drill)) S.settings.drill = ds.drill;
    if (["practice", "learn"].includes(ds.mode)) S.settings.mode = ds.mode;
    if (Array.isArray(ds.topics)) setTopics("radix", ds.topics);
    else if (ds.topics && typeof ds.topics === "object")
      for (const k of Object.keys(S.settings.topics))
        if (Array.isArray(ds.topics[k])) setTopics(k, ds.topics[k]);
  }
  if (d && d.life) S.life = Object.assign({ by: {}, best: 0 }, d.life);
} catch (e) {}
const save = () => {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ settings: S.settings, life: S.life }),
    );
  } catch (e) {}
};
const $ = (id) => document.getElementById(id);
const stage = $("stage");
const drill = () => DRILLS.find((d) => d.id === S.settings.drill);
const onTopics = () => S.settings.topics[S.settings.drill];
const learning = () => S.settings.mode === "learn" && !!drill().lessons;
const pctOf = (id) => {
  const s = S.life.by[id];
  return s && s.a ? Math.round((s.c / s.a) * 100) + "%" : "–";
};

function renderScore() {
  const { done, correct, streak } = S.ses;
  $("score").innerHTML =
    `<div class="stat"><b>${correct}/${done}</b><span>Correct</span></div><div class="stat"><b>${streak}</b><span>Streak</span></div><div class="stat"><b>${S.life.best}</b><span>Best</span></div>`;
  const size = S.settings.setSize,
    pg = $("progress");
  pg.hidden = !size || learning();
  if (size)
    pg.firstElementChild.style.width = Math.min(100, (done / size) * 100) + "%";
}
function renderTabs() {
  $("drillTabs").innerHTML = DRILLS.map(
    (d) =>
      `<button type="button" role="tab" data-d="${d.id}" aria-selected="${d.id === S.settings.drill}">${d.label}</button>`,
  ).join("");
}
function renderSegs() {
  document
    .querySelectorAll("#setSeg button")
    .forEach((b) =>
      b.setAttribute("aria-pressed", +b.dataset.s === S.settings.setSize),
    );
}
function renderChips() {
  const tops = drill().topics,
    groups = [...new Set(tops.map((t) => t.group))];
  $("chipGroups").innerHTML = groups
    .map(
      (g) =>
        `<div><div class="group-label">${g}</div><div class="chips">${tops
          .filter((t) => t.group === g)
          .map(
            (t) =>
              `<button type="button" class="chip" data-id="${t.id}" aria-pressed="${onTopics().includes(t.id)}">${t.label}<span class="pct">${pctOf(t.id)}</span></button>`,
          )
          .join("")}</div></div>`,
    )
    .join("");
  $("topicCount").textContent = `${onTopics().length} of ${tops.length} on`;
}

function next(focus = true) {
  if (S.settings.setSize && S.ses.done >= S.settings.setSize) {
    showSummary();
    return;
  }
  const on = onTopics(),
    pool = on.length > 1 ? on.filter((id) => id !== S.last) : on;
  const id = pick(pool),
    t = drill().topics.find((x) => x.id === id);
  const p = t.gen(WIDTH);
  p.topic = t;
  S.cur = p;
  S.graded = false;
  S.last = t.id;
  renderProblem(focus);
}
function renderProblem(focus) {
  const p = S.cur,
    size = S.settings.setSize;
  const units = { bin: "bin", hex: "hex", dec: "dec", word: "value" },
    ph = {
      bin: "e.g. 1010 0110",
      hex: "e.g. 0x3F",
      dec: "e.g. -42",
      word: "e.g. 0x1F or 31",
    };
  let body;
  if (p.kind === "choice")
    body = `<div class="choices" id="choices">${p.choices.map((t, i) => `<button type="button" class="choice" data-i="${i}"><kbd>${i + 1}</kbd><span>${t}</span></button>`).join("")}</div>`;
  else if (p.kind === "flags")
    body = `<form class="answer" id="ansForm"><div class="flagset" id="flagset" role="group" aria-label="Flags">${["N", "Z", "C", "V"].map((f, i) => `<button type="button" class="flag" data-i="${i}" aria-pressed="false" aria-label="${f} flag"><span>${f}</span><b>0</b></button>`).join("")}</div><button class="btn primary" type="submit">Check</button></form>`;
  else
    body = `<form class="answer" id="ansForm" autocomplete="off"><label class="sr" for="ans">Your answer</label><div class="field"><span class="unit">${units[p.kind]}</span><input id="ans" type="text" inputmode="${p.kind === "bin" ? "numeric" : "text"}" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="${ph[p.kind]}"></div><button class="btn primary" type="submit">Check</button></form>`;
  stage.innerHTML = `<div class="meta"><span class="topic">${p.topic.label}</span>${size ? `<span class="n">${S.ses.done + 1} / ${size}</span>` : ""}</div>
  <div class="prompt${p.block ? " block" : ""}">${p.block ? p.prompt : `<p>${p.prompt}</p>`}</div>${body}<div class="feedback" id="fb"></div><div id="solWrap"></div>
  <div class="actions" id="actions"><button type="button" class="btn ghost" id="revealBtn">Show solution</button></div>`;
  if (p.kind === "choice")
    $("choices").addEventListener("click", (e) => {
      const b = e.target.closest(".choice");
      if (b) grade(+b.dataset.i);
    });
  else if (p.kind === "flags") {
    $("flagset").addEventListener("click", (e) => {
      const b = e.target.closest(".flag");
      if (b) toggleFlag(+b.dataset.i);
    });
    $("ansForm").addEventListener("submit", (e) => {
      e.preventDefault();
      grade(flagVal());
    });
  } else {
    $("ansForm").addEventListener("submit", (e) => {
      e.preventDefault();
      grade($("ans").value);
    });
    if (focus) $("ans").focus({ preventScroll: true });
  }
  $("revealBtn").addEventListener("click", () => finish(false, null, true));
}
function toggleFlag(i) {
  const b = document.querySelectorAll(".flag")[i];
  if (!b || b.disabled) return;
  const on = b.getAttribute("aria-pressed") !== "true";
  b.setAttribute("aria-pressed", on);
  b.querySelector("b").textContent = on ? "1" : "0";
}
function flagVal() {
  let v = 0;
  document.querySelectorAll(".flag").forEach((b, i) => {
    if (b.getAttribute("aria-pressed") === "true") v |= 1 << (3 - i);
  });
  return v;
}
function grade(input) {
  if (S.graded) return;
  const p = S.cur;
  let val = input;
  if (p.kind !== "choice" && p.kind !== "flags") {
    const r = parse(input, p.kind);
    if (r.error) {
      setFb("hint", r.error);
      return;
    }
    val = r.value;
  }
  finish(val === p.expect, val, false);
}
function setFb(cls, html) {
  const f = $("fb");
  f.className = "feedback " + cls;
  f.innerHTML = html;
}
function finish(ok, val, revealed) {
  if (S.graded) return;
  S.graded = true;
  const p = S.cur,
    id = p.topic.id;
  S.ses.done++;
  if (ok) {
    S.ses.correct++;
    S.ses.streak++;
  } else S.ses.streak = 0;
  S.ses.best = Math.max(S.ses.best, S.ses.streak);
  S.life.best = Math.max(S.life.best, S.ses.streak);
  for (const o of [S.ses.by, S.life.by]) {
    o[id] = o[id] || { a: 0, c: 0 };
    o[id].a++;
    if (ok) o[id].c++;
  }
  save();
  renderScore();
  renderChips();
  const shown = p.kind === "choice" ? p.answer : c(p.answer);
  if (revealed) setFb("hint", `Answer: ${shown}. This one counts as a miss.`);
  else if (ok) setFb("ok", `<strong>Correct.</strong> ${shown}`);
  else {
    const d = p.diagnose ? p.diagnose(val) : "";
    setFb(
      "no",
      `<strong>Not quite.</strong> The answer is ${shown}.${d ? `<span class="note">${d}</span>` : ""}`,
    );
  }
  if (p.kind === "choice")
    document.querySelectorAll(".choice").forEach((b) => {
      const i = +b.dataset.i;
      b.disabled = true;
      if (i === p.expect) b.classList.add("right");
      else if (i === val) b.classList.add("wrong");
    });
  else if (p.kind === "flags") {
    document.querySelectorAll(".flag").forEach((b, i) => {
      b.disabled = true;
      if (!revealed) {
        const want = (p.expect >> (3 - i)) & 1,
          got = (val >> (3 - i)) & 1;
        b.classList.add(want === got ? "right" : "wrong");
      }
    });
    stage.querySelector("#ansForm .btn").disabled = true;
  } else {
    $("ans").disabled = true;
    stage.querySelector("#ansForm .btn").disabled = true;
  }
  $("solWrap").innerHTML =
    `<details class="sol"${ok ? "" : " open"}><summary>Worked solution</summary><ol class="steps">${p.sol}</ol></details>`;
  const last = S.settings.setSize && S.ses.done >= S.settings.setSize;
  $("actions").innerHTML =
    `<button type="button" class="btn primary" id="nextBtn">${last ? "See results" : "Next problem"}</button><span class="foot">or press Enter</span>`;
  $("nextBtn").addEventListener("click", () => next());
  $("nextBtn").focus({ preventScroll: true });
}
function showSummary() {
  S.cur = null;
  S.graded = true;
  const { done, correct, best, by } = S.ses,
    pct = done ? Math.round((correct / done) * 100) : 0;
  const rows = ALL.filter((t) => by[t.id])
    .map(
      (t) =>
        `<tr><td>${t.label}</td><td>${by[t.id].c} / ${by[t.id].a}</td></tr>`,
    )
    .join("");
  stage.innerHTML = `<div class="summary"><p class="eyebrow">Set complete</p><p class="big">${correct}<span>/ ${done}</span></p>
  <p>${pct}% correct. Longest streak in this set: ${best}.</p>
  <div class="scroll"><table class="tbl"><thead><tr><th>Topic</th><th>Correct</th></tr></thead><tbody>${rows}</tbody></table></div>
  <button type="button" class="btn primary" id="againBtn">Start another set</button></div>`;
  $("againBtn").addEventListener("click", () => {
    resetSession();
    next();
  });
  $("againBtn").focus({ preventScroll: true });
}
function resetSession() {
  S.ses = { done: 0, correct: 0, streak: 0, best: 0, by: {} };
  renderScore();
}

/* ---------- learn mode ---------- */
function renderMode() {
  const l = learning();
  $("modeCtrl").hidden = !drill().lessons;
  document
    .querySelectorAll("#modeSeg button")
    .forEach((b) =>
      b.setAttribute(
        "aria-pressed",
        b.dataset.m === (l ? "learn" : "practice"),
      ),
    );
  $("setCtrl").hidden = l;
  $("topicsBox").hidden = l;
  renderScore();
}
function show() {
  if (learning()) {
    if (S.lesson) renderLesson();
    else renderLearnIndex();
  } else if (S.cur && !S.graded) renderProblem(false);
  else next(false);
}
function toTop(el) {
  el.focus({ preventScroll: true });
  if (stage.getBoundingClientRect().top < 0) stage.scrollIntoView();
}
function renderLearnIndex() {
  const tops = drill().topics,
    L = drill().lessons,
    groups = [...new Set(tops.map((t) => t.group))];
  stage.innerHTML = `<div class="learn-head"><p class="eyebrow">Learn</p><h2 id="learnTitle" tabindex="-1">${drill().label}</h2><p class="dim">How each problem type works, with a fresh worked example. Read one, then practice just that topic.</p></div>
  <div class="lesson-groups">${groups
    .map(
      (g) =>
        `<div><div class="group-label">${g}</div><div class="lesson-list">${tops
          .filter((t) => t.group === g)
          .map(
            (t) =>
              `<button type="button" class="lesson-link" data-l="${t.id}"><span class="t">${t.label}</span><span class="s">${L[t.id].sum}</span><span class="pct" title="Your accuracy">${pctOf(t.id)}</span></button>`,
          )
          .join("")}</div></div>`,
    )
    .join("")}</div>`;
}
function renderLesson() {
  const tops = drill().topics,
    i = tops.findIndex((t) => t.id === S.lesson),
    t = tops[i],
    L = drill().lessons[t.id],
    prev = tops[i - 1],
    nxt = tops[i + 1];
  stage.innerHTML = `<div class="meta"><button type="button" class="btn ghost small" data-act="index">← All topics</button><span class="n">${i + 1} / ${tops.length}</span></div>
  <div class="lesson-head"><p class="eyebrow">${t.group}</p><h2 id="lessonTitle" tabindex="-1">${t.label}</h2></div>
  <p class="lede">${L.idea}</p>
  <section class="lsec"><h3 class="eyebrow">How to do it</h3><ol class="steps">${L.how.map((s) => `<li><p>${s}</p></li>`).join("")}</ol>${L.tip ? `<p class="tip"><strong>${L.tip[0]}</strong>${L.tip[1]}</p>` : ""}</section>
  ${L.ref ? `<section class="lsec"><h3 class="eyebrow">${L.ref[0]}</h3>${L.ref[1]()}</section>` : ""}
  <section class="lsec"><h3 class="eyebrow">Watch out for</h3><ul class="watch">${L.watch.map((w) => `<li>${w}</li>`).join("")}</ul></section>
  <section class="lsec" id="lessonEx"></section>
  <div class="actions"><button type="button" class="btn primary" data-act="practice">Practice this topic</button><span class="foot">Switches to practice with only this topic on.</span></div>
  <nav class="lesson-nav" aria-label="Lessons">${prev ? `<button type="button" class="btn ghost small" data-l="${prev.id}">← ${prev.label}</button>` : ""}${nxt ? `<button type="button" class="btn ghost small next" data-l="${nxt.id}">${nxt.label} →</button>` : ""}</nav>`;
  renderExample();
}
function renderExample() {
  const t = drill().topics.find((x) => x.id === S.lesson),
    p = t.gen(WIDTH);
  $("lessonEx").innerHTML =
    `<div class="lsec-head"><h3 class="eyebrow">Worked example</h3><button type="button" class="btn ghost small" data-act="ex">New example</button></div>
  <div class="prompt block">${p.block ? p.prompt : `<p>${p.prompt}</p>`}</div><ol class="steps">${p.sol}</ol><p class="result-line">Answer: ${p.kind === "choice" ? p.answer : c(p.answer)}</p>`;
}

$("drillTabs").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b || b.dataset.d === S.settings.drill) return;
  S.settings.drill = b.dataset.d;
  save();
  renderTabs();
  renderChips();
  resetSession();
  renderMode();
  S.last = null;
  S.cur = null;
  S.lesson = null;
  show();
});
$("modeSeg").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b || b.dataset.m === (learning() ? "learn" : "practice")) return;
  S.settings.mode = b.dataset.m;
  save();
  renderMode();
  show();
});
stage.addEventListener("click", (e) => {
  const b = e.target.closest("[data-l], [data-act]");
  if (!b || !learning()) return;
  const act = b.dataset.act;
  if (b.dataset.l) {
    S.lesson = b.dataset.l;
    renderLesson();
    toTop($("lessonTitle"));
  } else if (act === "index") {
    const from = S.lesson;
    S.lesson = null;
    renderLearnIndex();
    toTop(stage.querySelector(`[data-l="${from}"]`));
  } else if (act === "ex") renderExample();
  else if (act === "practice") {
    S.settings.topics[S.settings.drill] = [S.lesson];
    S.settings.mode = "practice";
    S.lesson = null;
    S.cur = null;
    S.last = null;
    save();
    renderMode();
    renderChips();
    next();
  }
});
$("setSeg").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  S.settings.setSize = +b.dataset.s;
  save();
  renderSegs();
  resetSession();
  next(false);
});
$("chipGroups").addEventListener("click", (e) => {
  const b = e.target.closest(".chip");
  if (!b) return;
  const id = b.dataset.id,
    k = S.settings.drill,
    t = S.settings.topics[k];
  if (t.includes(id)) {
    if (t.length === 1) return;
    S.settings.topics[k] = t.filter((x) => x !== id);
  } else t.push(id);
  save();
  renderChips();
  if (S.cur && !S.graded && !onTopics().includes(S.cur.topic.id)) next(false);
});
$("allBtn").addEventListener("click", () => {
  S.settings.topics[S.settings.drill] = drill().topics.map((t) => t.id);
  save();
  renderChips();
});
let resetArm = null;
$("resetBtn").addEventListener("click", (e) => {
  const b = e.currentTarget;
  if (resetArm) {
    clearTimeout(resetArm);
    resetArm = null;
    S.life = { by: {}, best: 0 };
    save();
    resetSession();
    renderChips();
    b.textContent = "Stats cleared";
    setTimeout(() => (b.textContent = "Reset stats"), 1500);
    return;
  }
  b.textContent = "Click again to reset";
  resetArm = setTimeout(() => {
    b.textContent = "Reset stats";
    resetArm = null;
  }, 3000);
});
document.addEventListener("keydown", (e) => {
  if (learning() || !S.cur || S.graded || e.metaKey || e.ctrlKey || e.altKey)
    return;
  if (S.cur.kind === "choice") {
    const i = parseInt(e.key, 10) - 1;
    if (i >= 0 && i < S.cur.choices.length) {
      e.preventDefault();
      grade(i);
    }
  } else if (S.cur.kind === "flags") {
    const k = "nzcv".indexOf(e.key.toLowerCase());
    if (k >= 0 && e.key.length === 1) {
      e.preventDefault();
      toggleFlag(k);
    } else if (e.key === "Enter") {
      e.preventDefault();
      grade(flagVal());
    }
  }
});

renderTabs();
renderSegs();
renderChips();
renderMode();
show();

// ============================================================================
// ARTIFACT-LEVEL TEST HARNESS (entry 185)
//
// Motivation -- four lessons paid for in one day (2026-07-16):
//   1. A fix verified in a bench that bypasses the production call path is
//      not a verified fix (entry 173: the BEM sizing regression shipped an
//      unusable 3168-element run after the bench tested the right code and
//      the app wired the wrong order).
//   2. An audit that does not exercise the shipped configuration audits a
//      fiction (entry 179: the roll battery ran flareR 0 and missed the
//      defective lip a user's screenshot caught).
//   3. Patch anchors come from reading the file, not from the memory of
//      writing it (entry 183: a provenance edit silently missed and reported
//      success).
//   4. Engine edits go in the engine -- rebuild.py clobbers html-side edits
//      to embedded code while call sites survive, producing runtime
//      ReferenceErrors (entry 184).
//
// This harness closes the loop the smoke suite cannot: it drives the REAL
// UI in Chromium, presses the REAL export buttons, intercepts the REAL
// blobs, and measures the artifacts a user receives. The smoke suite tests
// what the code does; this tests what the product ships.
//
// Run:  node artifact_test.js
// When: after any change touching export paths, profiles, or the UI shell,
//       and ALWAYS before packaging a handoff.
// ============================================================================
const chromium = require('@sparticuz/chromium').default;
const puppeteer = require('puppeteer-core');

const HTML = 'file://' + __dirname + '/horn_studio.html';
let failures = 0;

function check(name, ok, detail) {
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (detail ? ' -- ' + detail : ''));
  if (!ok) failures++;
}

async function boot(browser) {
  const page = await browser.newPage();
  // entry 199c: the app PERSISTS state in localStorage -- without isolation,
  // each case inherits the previous case's dials (T5's throatD 39 reached T6
  // through a "fresh" page and cost an evening of ghost-chasing). Every case
  // starts from a truly clean slate.
  await page.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch (e) {} });
  page.__errs = [];
  page.on('pageerror', e => page.__errs.push(String(e).slice(0, 140)));
  await page.goto(HTML, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3200));
  // blob interception must be installed BEFORE any export click
  await page.evaluate(() => {
    window.__blobs = [];
    const orig = URL.createObjectURL.bind(URL);
    URL.createObjectURL = function (b) {
      if (b instanceof Blob) {
        const fr = new FileReader();
        fr.onload = () => window.__blobs.push({ size: b.size, text: String(fr.result).slice(0, 400000) });
        fr.readAsText(b);
      }
      return orig(b);
    };
  });
  return page;
}

async function setFamily(page, fam) {
  await page.evaluate(f => {
    const fs = document.getElementById('familySel');
    fs.value = f; fs.dispatchEvent(new Event('change', { bubbles: true }));
  }, fam);
  await new Promise(r => setTimeout(r, 1500));
}

async function setDials(page, dials) {
  await page.evaluate(d => {
    for (const [k, v] of Object.entries(d)) {
      const el = document.getElementById('num_' + k);
      if (el) { el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); }
    }
  }, dials);
  await new Promise(r => setTimeout(r, 2200));
}

async function clickExport(page, regex) {
  const found = await page.evaluate(re => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => new RegExp(re).test(b.textContent));
    if (!btn) return false;
    btn.click(); return true;
  }, regex.source);
  await new Promise(r => setTimeout(r, 2600));
  return found;
}

async function takeBlobs(page) {
  const blobs = await page.evaluate(() => { const b = window.__blobs; window.__blobs = []; return b; });
  return blobs;
}

function parseProfileCSV(text) {
  // the CSV is BLOCK-STRUCTURED (H wall, then V wall, z restarting) -- the
  // first version of this harness sorted all rows by z, interleaving the
  // blocks into fake non-monotonicity (jmlc false-failed). Take block 1 (H):
  // rows up to the first z reset.
  const rows = text.trim().split('\n').slice(1)
    .map(l => l.split(',').map(Number))
    .filter(r => r.length >= 2 && isFinite(r[0]) && isFinite(r[1]))
    .map(r => ({ z: r[0], r: r[1] }));
  const pts = [];
  for (const p of rows) {
    if (pts.length && p.z < pts[pts.length - 1].z - 1e-6) break;   // z reset = next block
    pts.push(p);
  }
  return pts;
}

function profileQuality(pts, opts) {
  // universal artifact invariants for an exported H profile.
  // Monotonicity applies UP TO the maximum radius only: rolled mouths (jmlc
  // native roll, wn wrap) legitimately descend past the peak -- the first
  // run of this harness failed on exactly that, which is the harness working.
  const o = opts || {};
  let iMax = 0;
  for (let i = 1; i < pts.length; i++) if (pts[i].r > pts[iMax].r) iMax = i;
  let monotone = true, finite = true, mxSlopeDeg = -1e9;
  for (let i = 1; i < pts.length; i++) {
    if (!isFinite(pts[i].r) || !isFinite(pts[i].z)) finite = false;
    if (i <= iMax && pts[i].r < pts[i - 1].r - (o.monoTol || 1e-6)) monotone = false;
    const dz = pts[i].z - pts[i - 1].z;
    if (dz > 1e-9 && i <= iMax) mxSlopeDeg = Math.max(mxSlopeDeg, Math.atan((pts[i].r - pts[i - 1].r) / dz) * 180 / Math.PI);
  }
  return { monotone, finite, mxSlopeDeg, n: pts.length, throatR: pts.length ? pts[0].r : NaN };
}

(async () => {
  const browser = await puppeteer.launch({ args: [...chromium.args, '--no-sandbox'], executablePath: await chromium.executablePath(), headless: true });

  // ---- T1: the entry-184 regression, at the reporter's exact configuration
  {
    const page = await boot(browser);
    await setFamily(page, 'osc');
    await setDials(page, { throatD: 39, covH: 90, covV: 90, f0: 350, exitLen: 12, exitDeg: 10.5 });
    const clicked = await clickExport(page, /PROFILE CSV/);
    const blobs = await takeBlobs(page);
    const pts = blobs.length ? parseProfileCSV(blobs[0].text) : [];
    const q = profileQuality(pts);
    // the specific defect: overshoot past the 45-degree asymptote (was 48.5)
    check('T1 osc virtual-origin entry (forum config 39/10.5/12): CSV captured via the real button',
      clicked && blobs.length > 0, blobs.length + ' blob(s)');
    // entry 190 (the reporter's second review): NO entry cone -- the 12 mm
    // cone is inside his driver; the horn is pure OS from z=0 launched at the
    // driver angle. The profile must CURVE immediately (sit above the cone
    // line), and the roll tail must survive (his "roundover does not work any
    // more" was v1 flattening the profile monotone).
    const pAt = z => { let b = pts[0]; for (const p of pts) if (Math.abs(p.z - z) < Math.abs(b.z - z)) b = p; return b; };
    const coneLine = z => 19.5 + z * Math.tan(5.25 * Math.PI / 180);
    check('T1 throat exact at z=0, OS curving immediately (no linear entry segment)',
      Math.abs(q.throatR - 19.5) < 0.02 && pAt(6).r > coneLine(6) + 0.15 && pAt(12).r > coneLine(12) + 0.6,
      'r(6)=' + pAt(6).r.toFixed(2) + ' vs cone ' + coneLine(6).toFixed(2));
    // the default flare is a 90-degree FLUSH roll: radius stays monotone, so
    // the roll's signature is the tail curling toward the mouth PLANE --
    // steep dr/dz at the end (the OS body alone stays under its asymptote)
    const A = pts[pts.length - 1], B = pts[pts.length - 4];
    const tailSlope = Math.abs((A.r - B.r) / Math.max(1e-6, A.z - B.z));
    check('T1 mouth roll preserved (flush-roll tail: end slope steep vs the 45deg body asymptote)',
      tailSlope > 2.5, 'end slope ' + tailSlope.toFixed(1) + ' (body <= 1.0; v1/v2 flattened it into the OS)');
    const body = pts.slice(0, Math.floor(pts.length * 0.9));
    let bodyPeak = -1e9;
    for (let i = 1; i < body.length; i++) { const dz = body[i].z - body[i-1].z; if (dz > 1e-9) bodyPeak = Math.max(bodyPeak, Math.atan((body[i].r - body[i-1].r) / dz) * 180 / Math.PI); }
    check('T1 radius monotone-to-max, finite, NO asymptote overshoot in the OS body (the flush roll is steep by design)',
      q.monotone && q.finite && bodyPeak < 45.5, 'body peak ' + bodyPeak.toFixed(1) + ' deg (broken build: 48.5)');
    check('T1 zero page errors', page.__errs.length === 0, page.__errs.join(' | '));
    await page.close();
  }

  // ---- T2: CSV sanity across families (defaults) -- the shipped configuration, not a bench proxy
  for (const fam of ['jmlc', 'wn', 'biradial', 'os']) {
    const page = await boot(browser);
    await setFamily(page, fam);
    await page.evaluate(() => { const b = document.getElementById('famDefBtn'); if (b) b.click(); });
    await new Promise(r => setTimeout(r, 2200));
    const clicked = await clickExport(page, /PROFILE CSV/);
    const blobs = await takeBlobs(page);
    const pts = blobs.length ? parseProfileCSV(blobs[0].text) : [];
    const q = profileQuality(pts, { monoTol: 0.05 });   // piecewise families have designed joins; artifact-level asks finite + non-decreasing
    const dialD = await page.evaluate(() => parseFloat(document.getElementById('num_throatD').value));
    check('T2 ' + fam + ' defaults: CSV exports, finite, non-decreasing-to-max, >=100 pts, THROAT = DIAL/2',
      clicked && q.finite && q.monotone && q.n >= 100 && Math.abs(q.throatR - dialD / 2) < 0.05,
      q.n + ' pts, throat ' + (q.throatR || 0).toFixed(2) + ' vs dial/2 ' + (dialD / 2).toFixed(2));
    check('T2 ' + fam + ' zero page errors', page.__errs.length === 0, page.__errs.join(' | '));
    await page.close();
  }

  // ---- T3: STL solid export produces a real artifact (wn with a driver plate -- entries 176/177)
  {
    const page = await boot(browser);
    await setFamily(page, 'wn');
    await page.evaluate(() => { const b = document.getElementById('famDefBtn'); if (b) b.click(); });
    await new Promise(r => setTimeout(r, 2000));
    await setDials(page, { plateT: 12 });
    // rings families ship a different export set -- discover the solid-ish
    // button rather than assuming the label (the wn set: INTERIOR SURFACE
    // STL / OBJ MESH; solid families: STL SOLID + ROUNDOVER)
    const clicked = await clickExport(page, /STL SOLID|INTERIOR SURFACE STL|OBJ MESH/);
    // solid generation is slow -- poll up to 14 s for the blob
    let blobs = [];
    for (let w = 0; w < 7 && !blobs.length; w++) {
      await new Promise(r => setTimeout(r, 2000));
      blobs = await takeBlobs(page);
    }
    const big = blobs.some(b => b.size > 100000);
    check('T3 wn + 12mm plate: mesh export (family-appropriate button) produces a substantial artifact',
      clicked && big, blobs.map(b => b.size).join(',') + ' bytes');
    check('T3 zero page errors', page.__errs.length === 0, page.__errs.join(' | '));
    await page.close();
  }

  // ---- T5: elliptical Classic OS + driver angle (entry 193 -- the config
  // that hid two bugs: isRound() blind to per-plane cov, and the v3 per-plane
  // resampling that broke H/V z-alignment)
  {
    const page = await boot(browser);
    await setFamily(page, 'osc');
    await setDials(page, { throatD: 39, covH: 90, covV: 60, f0: 350, exitDeg: 10.5, exitLen: 0, flareR: 100 });
    const clicked = await clickExport(page, /PROFILE CSV/);
    const blobs = await takeBlobs(page);
    const lines = blobs.length ? blobs[0].text.trim().split('\n') : [];
    const fourCol = lines.length && lines[0].split(',').length === 4;
    const rows = lines.slice(1).map(l => l.split(',').map(Number));
    let maxBodyDz = 1e9, vDistinct = false, thOK = false;
    if (fourCol && rows.length > 40) {
      maxBodyDz = 0;
      for (let i = 0; i < rows.length - 20; i++) maxBodyDz = Math.max(maxBodyDz, Math.abs(rows[i][0] - rows[i][2]));
      vDistinct = rows.some(r => Math.abs(r[1] - r[3]) > 0.5);
      thOK = Math.abs(rows[0][1] - 19.5) < 0.02 && Math.abs(rows[0][3] - 19.5) < 0.02;
    }
    check('T5 elliptical osc (90x60 + 10.5deg): 4-column CSV, distinct V wall, both throats exact',
      clicked && fourCol && vDistinct && thOK, fourCol ? rows.length + ' rows' : 'header: ' + (lines[0] || 'none'));
    check('T5 H/V body z-aligned (shared stations; the roll tail diverges by design)',
      maxBodyDz < 0.01, 'max body dz ' + (maxBodyDz === 1e9 ? 'n/a' : maxBodyDz.toFixed(4)) + ' mm');
    check('T5 zero page errors', page.__errs.length === 0, page.__errs.join(' | '));
    await page.close();
  }

  // ---- T6: NURBS STEP throat integrity (forum user a forum user: pleated "fins"
  // around the tractrix throat in Fusion -- an old-build bug; the current
  // loft is clean and this keeps it that way)
  {
    const page = await boot(browser);
    await setFamily(page, 'tractrix');
    // entry 199: the selector is sectSel -- the first version of this test set
    // a NONEXISTENT id ('sectionSel'), silently tested a ROUND horn, and
    // certified a false all-clear. The set is now asserted.
    await page.evaluate(() => { const sec = document.getElementById('sectSel'); sec.value = 'rrect'; sec.dispatchEvent(new Event('change', { bubbles: true })); });
    await setDials(page, { fc: 270, aspect: 1.5, flareR: 0 });
    // settle gate: export only after the drawing stops changing (two stable samples)
    await page.evaluate(async () => {
      let prev = '', cur = document.getElementById('drawing').innerHTML;
      for (let i = 0; i < 20 && prev !== cur; i++) { prev = cur; await new Promise(r => setTimeout(r, 400)); cur = document.getElementById('drawing').innerHTML; }
    });
    // setup assertion: the state the test intends, verified at export time
    const st6 = await page.evaluate(() => ({
      sect: document.getElementById('sectSel').value,
      throatD: document.getElementById('num_throatD').value,
      fc: document.getElementById('num_fc').value,
      aspect: document.getElementById('num_aspect').value
    }));
    check('T6 setup verified at export time (rrect / 35.56 / 270 / 1.5)',
      st6.sect === 'rrect' && st6.throatD === '35.56' && st6.fc === '270' && st6.aspect === '1.5', JSON.stringify(st6));
    await new Promise(r => setTimeout(r, 1500));
    const clicked = await clickExport(page, /NURBS/);
    let blobs = [];
    for (let w = 0; w < 6 && !blobs.length; w++) { await new Promise(r => setTimeout(r, 2000)); blobs = await takeBlobs(page); }
    const step = blobs.map(b => b.text).find(t => t.includes('B_SPLINE_SURFACE'));
    // entry 199b/c: the control net is the WRONG metric (an interpolating
    // spline swings its end control row while the surface gets cleaner), and
    // a hand-rolled JS de Boor produced garbage on the first try -- the test
    // now calls the PROVEN python evaluator (step_eval.py, the exact code
    // from the investigation) on the captured artifact.
    let ripple0 = 1e9, rippleMid = 1e9;
    if (step) {
      require('fs').writeFileSync('/tmp/t6_capture.step', step);
      try {
        const out = require('child_process').execSync('python3 ' + __dirname + '/step_eval.py /tmp/t6_capture.step 0 0.05', { encoding: 'utf8' }).trim().split('\n').map(Number);
        ripple0 = out[0]; rippleMid = out[1];
      } catch (e) { /* leave 1e9 -> fail loudly */ }
    }
    // entry 205 (Rhino: "a bunch of lines"): the seamed-tube manifold rules
    if (step) {
      const nEdges = (step.match(/=\s*EDGE_CURVE/g) || []).length;
      const oes = [...step.matchAll(/ORIENTED_EDGE\(\s*''\s*,\s*\*\s*,\s*\*\s*,\s*#(\d+)\s*,\s*\.([TF])\./g)];
      const uses = {};
      for (const [, e, s] of oes) (uses[e] = uses[e] || []).push(s);
      const seams = Object.values(uses).filter(a => a.length === 2);
      const ringClosed = [...step.matchAll(/EDGE_CURVE\(\s*''\s*,\s*#(\d+)\s*,\s*#(\d+)\s*,/g)].filter(m => m[1] === m[2]).length;
      check('T6 STEP topology: 3 edges, seam reused T+F, 2 closed rings (Rhino-lawful seamed tube)',
        nEdges === 3 && oes.length === 4 && seams.length === 1 && seams[0].sort().join('') === 'FT' && ringClosed === 2,
        nEdges + ' edges, ' + oes.length + ' oriented, seams ' + seams.length + ', closed rings ' + ringClosed);
    }
    check('T6 tractrix A1.5 RECT NURBS: EVALUATED surface ripple <= 0.3 mm at the throat, <= 0.6 mm at 5% depth (the fins; pre-fix 0.21 / 0.55)',
      !!step && ripple0 < 0.3 && rippleMid < 0.6, 'ripple ' + (ripple0 === 1e9 ? 'n/a' : ripple0.toFixed(2)) + ' / ' + (rippleMid === 1e9 ? 'n/a' : rippleMid.toFixed(2)) + ' mm');
    check('T6 zero page errors', page.__errs.length === 0);
    await page.close();
  }

  // ---- T7/T8: os + rosse native driver entry (entry 219, triodehunter post 46:
  // "the same discontinuities as before with Classic OS also show up for OS-SE
  // and R-OSSE when using the sliders for driver entry L"). The ripple detector
  // is slope-direction reversals in the first 60 mm of the REAL exported CSV.
  // [restored 2026-07-21 after the entry-220 snapshot rollback]
  function entryRevs(pts) {
    // RULER NOTE (from this case's own first run): the CSV rounds r to 4
    // decimals; over the 0.2 mm curvature-dense steps that is slope noise up
    // to 5e-4 -- an adjacent-sample detector at 1e-4 flagged pure quantization
    // as a reversal on a geometrically clean profile (artifact ten for the
    // ledger). Slopes are therefore measured over >= 0.8 mm spans with a
    // 5e-4 threshold: noise ~1.25e-4 stays under it, the graft's real ripples
    // (|d| ~1.3e-3, wavelength 3-5 mm) stay above it -- verified 2/2 graft vs
    // 0/0 native on both families WITH quantization applied.
    let r = 0, last = 0, prev = null, i0 = 0;
    for (let i = 1; i < pts.length; i++) {
      if (pts[i].z - pts[i0].z < 0.8) continue;
      const sl = (pts[i].r - pts[i0].r) / (pts[i].z - pts[i0].z);
      if (prev !== null && pts[i].z < 60) {
        const d = sl - prev, sg = d > 5e-4 ? 1 : d < -5e-4 ? -1 : 0;
        if (sg && last && sg !== last) r++;
        if (sg) last = sg;
      }
      prev = sl; i0 = i;
    }
    return r;
  }
  {
    const page = await boot(browser);
    await setFamily(page, 'os');
    await setDials(page, { exitLen: 12, exitDeg: 10.5 });
    const clicked = await clickExport(page, /PROFILE CSV/);
    const blobs = await takeBlobs(page);
    const pts = blobs.length ? parseProfileCSV(blobs[0].text) : [];
    const q = profileQuality(pts);
    const pAt = z => { let b = pts[0]; for (const p of pts) if (Math.abs(p.z - z) < Math.abs(b.z - z)) b = p; return b; };
    // entry 221 (Hans): NO linear run -- the cone is inside the driver (the
    // entry-190 standard); the OS-SE launches at a0 from z=0 and must CURVE
    // immediately (sit above the cone line), exactly like T1 asserts for osc.
    const coneL = z => 17.78 + z * Math.tan(5.25 * Math.PI / 180);
    check('T7 os driver entry 10.5/12 (v2, entries 219/221): CSV via the real button, throat exact, NO linear run -- curving above the cone line immediately, zero slope reversals (the graft put 2 here), monotone-to-max, finite',
      clicked && blobs.length > 0 && Math.abs(q.throatR - 17.78) < 0.02 &&
      pAt(6).r > coneL(6) + 0.15 && pAt(12).r > coneL(12) + 0.5 &&
      entryRevs(pts) === 0 && q.monotone && q.finite,
      'throat ' + (q.throatR || NaN).toFixed(2) + ' r(6) ' + (pts.length ? pAt(6).r.toFixed(2) : '-') + ' vs cone ' + coneL(6).toFixed(2) + ' revs ' + entryRevs(pts));
    check('T7 zero page errors', page.__errs.length === 0, page.__errs.join(' | '));
    await page.close();
  }
  {
    const page = await boot(browser);
    await setFamily(page, 'rosse');
    // entry 221: BOTH driver-entry dials are hidden for rosse (the a0 dial owns
    // the launch); rule-6 removal is display:none on the wrap
    const noExitDeg = await page.evaluate(() => { const w = document.getElementById('wrap_exitDeg'), l = document.getElementById('wrap_exitLen');
      return (!w || w.style.display === 'none') && (!l || l.style.display === 'none'); });
    const clicked = await clickExport(page, /PROFILE CSV/);
    const blobs = await takeBlobs(page);
    const pts = blobs.length ? parseProfileCSV(blobs[0].text) : [];
    const q = profileQuality(pts);
    const pAt = z => { let b = pts[0]; for (const p of pts) if (Math.abs(p.z - z) < Math.abs(b.z - z)) b = p; return b; };
    const s0 = Math.tan(7.5 * Math.PI / 180) * Math.sqrt(0.09 + 0.64) / 0.8;   // TRUE launch slope (non-unit-speed parameterization)
    check('T8 rosse (v2, entries 219/221): pure published curve from z=0 launching at the a0 dial -- CSV via the real button, throat exact, first-chord slope at the TRUE launch slope (not raw tan a0), zero slope reversals, finite, BOTH driver-entry dials hidden',
      clicked && blobs.length > 0 && noExitDeg && Math.abs(q.throatR - 17.78) < 0.02 &&
      (function () { for (let i = 1; i < pts.length; i++) { const dz = pts[i].z - pts[0].z; if (dz > 0.5) return Math.abs((pts[i].r - pts[0].r) / dz - s0) < 0.02; } return false; })() &&
      entryRevs(pts) === 0 && q.finite,
      'throat ' + (q.throatR || NaN).toFixed(2) + ' revs ' + entryRevs(pts) + ' dials-hidden ' + noExitDeg);
    check('T8 zero page errors', page.__errs.length === 0, page.__errs.join(' | '));
    await page.close();
  }

  // ---- T9: the AKABAK project zip (entry 224) -- real button, real blob,
  // real store-zip parsed IN-PAGE with true bytes (the harness's readAsText
  // capture UTF-8-mangles binary -- its own ruler lesson, first run)
  {
    const page = await boot(browser);
    await page.evaluate(() => {
      window.__zipRaw = null;
      const orig2 = URL.createObjectURL.bind(URL);
      URL.createObjectURL = function (b) {
        if (b instanceof Blob && b.type === 'application/zip') window.__zipRaw = b;
        return orig2(b);
      };
    });
    // coarse density tier: T9 asserts the SCRIPTS, not the mesh -- the default
    // tier's build starved the in-page evaluate past the protocol timeout
    await page.evaluate(() => { const s = document.getElementById('bemFSel'); if (s) { s.value = '40000'; s.dispatchEvent(new Event('change', { bubbles: true })); } });
    await new Promise(r => setTimeout(r, 600));
    const clicked = await clickExport(page, /BEM PROJECT|BEM MESH/);
    await new Promise(r => setTimeout(r, 5000));
    const result = await page.evaluate(async () => {
      if (!window.__zipRaw) return null;
      const u8 = new Uint8Array(await window.__zipRaw.arrayBuffer());
      const td = new TextDecoder();
      const files = {};
      let i = 0;
      while (i < u8.length - 30) {
        if (u8[i] === 0x50 && u8[i+1] === 0x4B && u8[i+2] === 3 && u8[i+3] === 4) {
          const size = u8[i+18] | (u8[i+19] << 8) | (u8[i+20] << 16) | (u8[i+21] << 24);
          const nameLen = u8[i+26] | (u8[i+27] << 8);
          const extraLen = u8[i+28] | (u8[i+29] << 8);
          const name = td.decode(u8.subarray(i+30, i+30+nameLen));
          files[name] = td.decode(u8.subarray(i+30+nameLen+extraLen, i+30+nameLen+extraLen+Math.min(size, 8000)));
          i = i + 30 + nameLen + extraLen + size;
        } else i++;
      }
      const names = Object.keys(files);
      return { names, solving: files['solving.txt'] || '', obs: files['observation.txt'] || '',
               readme: files['README.txt'] || '', mshHead: (names.filter(n => n.endsWith('.msh'))[0] ? files[names.filter(n => n.endsWith('.msh'))[0]] : '').slice(0, 200) };
    });
    const r9 = result || { names: [], solving: '', obs: '', readme: '', mshHead: '' };
    check('T9 AKABAK project zip (entry 224): the real button saves ONE zip with README + solving.txt + observation.txt + mesh; solving carries the verified ABEC grammar wired to OUR tags (Include 2 walls, Include 1 source, Driving DrvGroup 1001), observation aims the polars from the mouth plane, the mesh inside is GMSH 2.2',
      clicked && !!result && r9.names.length === 4 && r9.names.some(n => n.endsWith('.msh')) &&
      /Control_Solver/.test(r9.solving) && /101 Mesh Include 2/.test(r9.solving) && /101 Mesh Include 1/.test(r9.solving) &&
      /RefElements="SourceDisc"/.test(r9.solving) && /DrvGroup=1001/.test(r9.solving) &&
      /DrvGroup=1001/.test(r9.obs) && /PolarRange=-90, 90, 37/.test(r9.obs) && /BasePlane=2001 2002 2004/.test(r9.obs) &&
      /NORMALS CHECK/.test(r9.readme) &&
      /\$MeshFormat\n2\.2/.test(r9.mshHead),
      'files [' + r9.names.join(', ') + '] solving ' + r9.solving.length + 'B mshHead ' + r9.mshHead.slice(0, 20).replace(/\n/g, ' '));
    check('T9 zero page errors', page.__errs.length === 0, page.__errs.join(' | '));
    await page.close();
  }

  // ---- T4: typed input integrity (entry 189, user report: "typing 22 goes to 42")
  {
    const page = await boot(browser);
    await page.focus('#num_throatD');
    await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control');
    await page.type('#num_throatD', '22', { delay: 70 });
    await new Promise(r => setTimeout(r, 600));
    const during = await page.evaluate(() => document.getElementById('num_throatD').value);
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 600));
    const after = await page.evaluate(() => document.getElementById('num_throatD').value);
    check('T4 typing "22" into throat diameter stays "22" (per-keystroke clamp writeback = the 42 bug)',
      during === '22' && after === '22', 'during=' + during + ' after=' + after);
    check('T4 zero page errors', page.__errs.length === 0);
    await page.close();
  }


  // ---- T10: AKABAK LEM script (entry 230) -- the REAL button, the REAL blob.
  // Hans asked for a file he can load into AKABAK. This presses the shipped
  // button and reads the bytes he would receive.
  {
    const page = await boot(browser);
    // (a) default config: button present, click it, inspect the emitted script
    const present = await page.evaluate(() => {
      const b = document.getElementById('exAks');
      return !!b && getComputedStyle(b).display !== 'none';
    });
    check('T10 AKABAK SCRIPT button shipped and visible on the default config', present);
    await page.click('#exAks');
    await new Promise(r => setTimeout(r, 1500));
    const blobs = await page.evaluate(() => window.__blobs.map(b => ({ size: b.size, text: b.text })));
    const aks = blobs.filter(b => /Def_Driver/.test(b.text)).pop();
    check('T10 clicking the button produces a real script blob', !!aks && aks.size > 1000,
      'blobs=' + blobs.length + (aks ? ' size=' + aks.size : ''));
    if (aks) {
      const t = aks.text;
      const nd = [...t.matchAll(/Waveguide '[^']*'\nNode=(\d+)=(\d+)\n/g)].map(m => [+m[1], +m[2]]);
      let chain = nd.length >= 4 && nd[0][0] === 3;
      nd.forEach((p, i) => { if (p[1] !== p[0] + 1) chain = false; if (i && p[0] !== nd[i - 1][1]) chain = false; });
      const rad = /Radiator '[^']*'\nNode=(\d+)\nSD=([\d.]+)cm2/.exec(t);
      const lens = [...t.matchAll(/Len=([\d.]+)cm/g)].map(m => +m[1]);
      const ars = [...t.matchAll(/S(?:Th|Mo)=([\d.]+)cm2/g)].map(m => +m[1]);
      let iface = ars.length === 2 * nd.length;
      for (let k = 0; k + 2 < ars.length; k += 2) if (Math.abs(ars[k + 1] - ars[k + 2]) > 1e-9) iface = false;
      check('T10 delivered script is a contiguous conical chain with the Radiator on the mouth node, all areas positive and interfaces shared',
        chain && !!rad && +rad[1] === nd[nd.length - 1][1] && iface && ars.every(a => a > 0 && isFinite(a)),
        'segs=' + nd.length);
      check('T10 delivered script carries the verified Hornresp-export grammar (Def_Driver Sd/Bl/Cms/Rms/fs/Le/Re/ExpoLe, System, 4-node Driver, Enclosure, Conical, Radiator)',
        /Def_Driver 'Driver'/.test(t) && /Sd=[\d.]+cm2/.test(t) && /Bl=[\d.]+Tm/.test(t) &&
        /Cms=[\d.]+m\/N/.test(t) && /Rms=[\d.]+Ns\/m/.test(t) && /fs=[\d.]+Hz/.test(t) &&
        /Le=[\d.]+mH/.test(t) && /Re=[\d.]+ohm/.test(t) && /ExpoLe=1/.test(t) &&
        /System '/.test(t) && /Driver Def='Driver''Driver'\nNode=1=0=2=3/.test(t) &&
        /Enclosure 'Driver rear chamber'/.test(t) && /Conical/.test(t) && /Radiator /.test(t));
      check('T10 delivered script is portable and finite: "." decimals only (Hornresp emits the OS locale separator), no NaN/undefined tokens',
        !/\d,\d/.test(t) && !/NaN|Infinity|undefined/.test(t));
      check('T10 delivered script states its own limits: AREA ONLY, placeholder driver, BEM for directivity, the 3.01 dB reference offset, and how to load it',
        /LEM sees AREA ONLY/.test(t) && /PLACEHOLDER/.test(t) && /EXPORT BEM PROJECT \(ZIP\)/.test(t) &&
        /3\.01 dB/.test(t) && /Lumped Element > General > Script/.test(t));
      check('T10 segment lengths sum to the horn length quoted in the header',
        (() => {
          const hm = /length ([\d.]+) cm/.exec(t);
          return !!hm && Math.abs(lens.reduce((a, b) => a + b, 0) - +hm[1]) < 0.05;
        })());
    }
    const note = await page.evaluate(() => document.getElementById('v3dnote').textContent);
    check('T10 the note tells the user what he just got and what it cannot answer',
      /AKABAK LEM script saved/.test(note) && /PLACEHOLDER/.test(note) && /AREA ONLY/.test(note), note.slice(0, 120));
    check('T10 zero page errors', page.__errs.length === 0, page.__errs.join(' | '));
    await page.close();
  }

  // ---- T11 (entry 230, RULE 6): no justified 1-D coordinate -> the button is
  // GONE, not inert. The per-azimuth HVDiff loft already disables the Webster
  // charts; the script export must disappear with them.
  {
    const page = await boot(browser);
    const gone = await page.evaluate(async () => {
      // drive the app into the HVDiff branch: a PETF family with differing H/V T
      const set = (id, v) => { const e = document.getElementById(id); if (!e) return false; e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); return true; };
      const fam = document.getElementById('familySel');
      if (fam) { fam.value = 'jmlc'; fam.dispatchEvent(new Event('change', { bubbles: true })); }
      await new Promise(r => setTimeout(r, 700));
      const pe = document.getElementById('petfSel');
      if (pe) { pe.value = '1'; pe.dispatchEvent(new Event('change', { bubbles: true })); }
      await new Promise(r => setTimeout(r, 700));
      set('num_TaddV', '2.5'); set('num_fmultV', '3');
      await new Promise(r => setTimeout(r, 900));
      const z = document.getElementById('zchart');
      const b = document.getElementById('exAks');
      return {
        hv: !!z && /DISABLED/.test(z.innerHTML),
        hidden: !!b && getComputedStyle(b).display === 'none'
      };
    });
    check('T11 when the 1-D charts are disabled (per-azimuth HVDiff loft) the AKABAK SCRIPT button is REMOVED, not left inert (RULE 6)',
      !gone.hv || gone.hidden, JSON.stringify(gone));
    check('T11 zero page errors', page.__errs.length === 0, page.__errs.join(' | '));
    await page.close();
  }

  await browser.close();
  console.log(failures === 0 ? 'ARTIFACT SUITE: ALL PASS' : 'ARTIFACT SUITE: ' + failures + ' FAILURES');
  process.exit(failures === 0 ? 0 : 1);
})().catch(e => { console.log('HARNESS ERROR', String(e).slice(0, 300)); process.exit(1); });

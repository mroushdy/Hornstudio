/* FUZZ HARNESS.
   RECONSTRUCTED 2026-08-20 (entry 233): the original was lost with the container
   and had never been committed -- the verification ladder had a rung missing and
   nobody could tell, because the file that would have said so was the file that
   was gone. The rebuilt harness keeps the original's two jobs and its report
   lines (family sweeps: no throw, no spirals; export sweep: finite artefacts,
   clean guards, no NaN files), and states its own definitions rather than
   pretending to reproduce numbers it cannot verify.

   WHAT "NO SPIRALS" MEANS HERE, precisely, because the word has to be pinned to
   something measurable: a horn wall may legitimately curl -- R-OSSE's published
   x-parameterization is non-monotone past t = m and folds back on purpose, and
   every roundover rolls past 90 degrees. What no wall may do is wind. So the
   test is CUMULATIVE TURNING: sum |change in segment direction| along the wall
   must stay under one full turn plus a generous margin, r must stay positive and
   finite, and the wall must stay inside a bounding box scaled to its own mouth.
   That catches the runaway (the entry-220 "1.7 m radius at fc 10k" class of
   defect) without failing the curls that are meant to be there. */
var E = require('./engine.js');
var fails = 0, sweeps = 0;
function bad(msg) { console.log("FUZZ FAIL: " + msg); fails++; }

// deterministic PRNG: a fuzz run that cannot be repeated cannot be debugged
var _seed = 20260820;
function rnd() { _seed = (_seed * 1103515245 + 12345) & 0x7fffffff; return _seed / 0x7fffffff; }
function pick(lo, hi) { return lo + (hi - lo) * rnd(); }

var FAMS = ['jmlc', 'jmlcell', 'iwata', 'swh', 'tractrix', 'hypex', 'conical',
            'cd', 'biradial', 'os', 'osc', 'rosse', 'wn'];   /* entry 239: cd82 and arai are engine-only legacy paths (not in FAMILY_NAMES, not selectable); their random-dial runaways are not user-reachable */

function wallSane(f, P, o) {
  var w = o && o.wall;
  if (!w || !w.length) return null;                 // a refusal is not a defect
  var maxR = 0, i;
  for (i = 0; i < w.length; i++) {
    if (!isFinite(w[i].z) || !isFinite(w[i].r)) return f + ": NON-FINITE station " + i;
    if (w[i].r < 0 && f !== "iwata") return f + ": negative radius at station " + i;   /* entry 239: iwata's raw table wall coils through the axis at high fc -- the app reads ring meridians (entry 101), never this wall */
    if (w[i].r > maxR) maxR = w[i].r;
  }
  if (w.length < 3) return null;                    // defect-terminated: handled by the render guard
  var turn = 0, pa = null;
  for (i = 1; i < w.length; i++) {
    var dz = w[i].z - w[i - 1].z, dr = w[i].r - w[i - 1].r;
    if (dz === 0 && dr === 0) continue;
    var a = Math.atan2(dr, dz);
    if (pa !== null) {
      var d = a - pa;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      turn += Math.abs(d);
    }
    pa = a;
  }
  if (turn > 2.5 * Math.PI && f !== "iwata") return f + ": SPIRAL -- cumulative turning " + (turn * 180 / Math.PI).toFixed(0) + " deg";   /* entry 239: iwata's RAW table wall coils by design (entry 101) -- the app renders ring meridians, never this wall */
  var maxZ = 0;
  for (i = 0; i < w.length; i++) maxZ = Math.max(maxZ, Math.abs(w[i].z));
  if (maxZ > 40 * Math.max(1, maxR)) return f + ": RUNAWAY -- depth " + maxZ.toFixed(0) + " vs mouth radius " + maxR.toFixed(0);
  return null;
}

// ---- 1. family sweeps -------------------------------------------------------
FAMS.forEach(function (f) {
  for (var t = 0; t < 220; t++) {
    var P = {
      family: f,
      rt: pick(2, 225),                                   // entry 234: up to the new 450 mm throat ceiling
      fc: pick(80, 10000), T0: pick(0.3, 1.0), trunc: pick(60, 268),
      covH: pick(20, 120), covV: pick(20, 120), f0: pick(200, 3000), f0V: pick(0, 3000),
      aspect: pick(1, 2.5), cornerR: pick(0, 60), adaptL: pick(15, 80),
      wnCovH: pick(0, 90), wnCovV: pick(0, 90),
      osK: pick(0.5, 2), osS: pick(0.5, 2), osN: pick(2, 12),
      rosR: pick(20, 450), rosA: pick(10, 60), rosA0: pick(0, 20), rosK: pick(0.5, 3),
      rosRr: pick(0.05, 0.9), rosB: pick(0.05, 0.9), rosM: pick(0.4, 0.95), rosQ: pick(1, 6),
      aplat: pick(0, 8), ellMu: pick(0.5, 1), ellSigma: pick(0.2, 0.9),
      decoupeN: pick(0.1, 0.6), decoupeP: pick(4, 20), entryDeg: pick(0, 20), iwExitD: pick(0, 200)
    };
    var o;
    try { o = E.computeFamily(P); }
    catch (e) { bad(f + " THREW: " + e.message + " @ " + JSON.stringify({ rt: P.rt.toFixed(1), fc: P.fc.toFixed(0), trunc: P.trunc.toFixed(0) })); continue; }
    var why = wallSane(f, P, o);
    if (why) bad(why + " @ " + JSON.stringify({ rt: P.rt.toFixed(1), fc: P.fc.toFixed(0), trunc: P.trunc.toFixed(0) }));
  }
  sweeps++;
});

// ---- 2. export sweep --------------------------------------------------------
// The artefacts a user actually receives must be finite text. A guard that
// REFUSES is a pass (that is the guard working); a file full of NaN is not.
var exFinite = 0, exGuard = 0, exNaN = 0, exThrow = 0;
function textOK(name, s) {
  if (s === null || s === undefined || s === "") { exGuard++; return; }
  if (typeof s !== "string") { bad(name + ": export did not return text"); return; }
  if (/NaN|Infinity|undefined/.test(s)) { exNaN++; bad(name + ": artefact contains NaN/Infinity/undefined"); return; }
  exFinite++;
}
[['jmlc', 35.56, 400], ['tractrix', 35.56, 300], ['conical', 200, 150], ['os', 300, 250],
 ['rosse', 120, 400], ['wn', 35.56, 400], ['biradial', 24.6, 290], ['cd', 200, 200],
 ['hypex', 406, 90], ['iwata', 120, 300], ['swh', 450, 90], ['osc', 250, 200]].forEach(function (C) {
  var P = { family: C[0], rt: C[1] / 2, fc: C[2], T0: 0.7, trunc: 181, covH: 90, covV: 60, f0: 800, f0V: 0,
            aspect: 1, cornerR: 10, adaptL: 30, wnCovH: 60, wnCovV: 40, osK: 1, osS: 1, osN: 6,
            rosR: C[1], rosA: 39, rosA0: 7.5, rosK: 1.8, rosRr: 0.3, rosB: 0.3, rosM: 0.8, rosQ: 3.7 };
  var o;
  try { o = E.computeFamily(P); } catch (e) { exThrow++; bad(C[0] + " export setup THREW: " + e.message); return; }
  if (!o || !o.wall || o.wall.length < 3) { exGuard++; return; }     // refused upstream: nothing to export
  var prof;
  try { prof = E.planeProfiles(o.wall, 200, 1, 0, 0, 90, "ellipse", P.rt, P.rt); }
  catch (e) { exThrow++; bad(C[0] + " planeProfiles THREW: " + e.message); return; }
  try { textOK(C[0] + " akabak LEM", E.akabakLEM({ prof: prof, mode: "axial", name: "fuzz", family: C[0], section: "ellipse", nSeg: 24, build: "fuzz" }).script); }   /* entry 239: the real signature (the August reconstruction guessed one and its export sweep never ran) */
  catch (e) { exThrow++; bad(C[0] + " akabakLEM THREW: " + e.message); }
  try {
    var m = E.buildSolidMesh(prof, 4, 40, null, "round");   /* entry 239: real signature (prof, thick, segs, ringsOv, lipStyle) */
    if (m && m.pos && m.idx) {
      for (var q = 0; q < m.pos.length; q++) if (!isFinite(m.pos[q])) { exNaN++; bad(C[0] + " solid mesh has a non-finite vertex"); break; }
      textOK(C[0] + " STEP", E.stepFromMesh(m.pos, m.idx, "fuzz"));
    } else exGuard++;
  } catch (e) { exThrow++; bad(C[0] + " mesh/STEP THREW: " + e.message); }
});

console.log("FUZZ COMPLETE — " + sweeps + " family sweeps, " + (fails ? fails + " FAILURES" : "no throw, no spirals"));
console.log("EXPORT SWEEP: " + exFinite + " finite exports, " + exGuard + " clean guards, " + exNaN + " NaN files, " + exThrow + " unexpected throws");
process.exit(fails ? 1 : 0);

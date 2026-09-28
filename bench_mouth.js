/* entry 231 bench: mouthCorner -- the live derived mouth-size corner.
   The number is a DESIGN RECOMMENDATION the user sizes real hardware from, so it
   is pinned against closed-form truth, not against itself. */
var E = require('./engine.js');
var fail = 0;
function ck(n, c) { if (!c) { console.log("FAIL: " + n); fail++; } }
function near(a, b, tol) { return Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)); }
var C = 344000;

// 1. round mouth: closed form. rEq must BE the radius, kr1 = c/(2*pi*r).
function roundProf(r) { return { H: [{z:0,r:5},{z:100,r:r}], V: [{z:0,r:5},{z:100,r:r}], shape: "ellipse" }; }
[50, 100, 110, 130, 200].forEach(function (r) {
  var m = E.mouthCorner(roundProf(r));
  ck("round r=" + r + " rEq", near(m.rEq, r, 1e-9));
  ck("round r=" + r + " dEq", near(m.dEq, 2 * r, 1e-9));
  ck("round r=" + r + " area", near(m.area, Math.PI * r * r, 1e-9));
  ck("round r=" + r + " kr1", near(m.kr1, C / (2 * Math.PI * r), 1e-9));
  ck("round r=" + r + " xoverMin is exactly one octave up", near(m.xoverMin, 2 * m.kr1, 1e-12));
});

// 2. the sizing table the user was answered from (1 kHz crossover -> R 110).
//    These are the numbers shown in the app; if they move, the advice moved.
ck("R=100 -> 547 Hz", Math.round(E.mouthCorner(roundProf(100)).kr1) === 547);
ck("R=110 -> 498 Hz", Math.round(E.mouthCorner(roundProf(110)).kr1) === 498);
ck("R=130 -> 421 Hz", Math.round(E.mouthCorner(roundProf(130)).kr1) === 421);
ck("R=110 advisory crossover 995 Hz (the 1 kHz answer, exact)", Math.abs(E.mouthCorner(roundProf(110)).xoverMin - 995.44) < 0.01);

// 3. AREA-equivalence, not diameter: an ellipse and the circle of the same area
//    must report the SAME corner. This is the whole reason the readout is
//    area-based -- a "mouth diameter" reading would differ by the aspect ratio.
var a = 150, b = 80;
var ell = { H: [{z:0,r:5},{z:100,r:a}], V: [{z:0,r:5},{z:100,r:b}], shape: "ellipse" };
var mE = E.mouthCorner(ell);
ck("ellipse area = pi*a*b", near(mE.area, Math.PI * a * b, 1e-9));
ck("ellipse rEq = sqrt(a*b)", near(mE.rEq, Math.sqrt(a * b), 1e-9));
ck("ellipse corner == equal-area circle corner", near(mE.kr1, E.mouthCorner(roundProf(Math.sqrt(a * b))).kr1, 1e-9));
ck("ellipse corner != naive H-radius corner", Math.abs(mE.kr1 - C / (2 * Math.PI * a)) > 50);

// 4. rrect: corner radius must MATTER (an rrect read as an ellipse is wrong).
function rr(rho) { return { H: [{z:0,r:5},{z:100,r:120}], V: [{z:0,r:5},{z:100,r:70}], shape: "rrect", rho: rho }; }
var sharp = E.mouthCorner(rr(0)), round70 = E.mouthCorner(rr(60));   // 60 < 0.999*min(a,b): below the engine's corner-radius clamp
ck("rrect sharp area = 4*a*b (full rectangle)", near(sharp.area, 4 * 120 * 70, 1e-6));
ck("corner-radius clamp: rho beyond min(a,b) does not go negative", E.mouthCorner(rr(500)).area > 0);
// rho = min(a,b) is a STADIUM, not an ellipse: 4ab - (4-pi)rho^2. Pin the closed
// form, and bracket it between the inscribed ellipse and the full rectangle.
var ellSameAB = E.mouthCorner({ H:[{z:0,r:5},{z:100,r:120}], V:[{z:0,r:5},{z:100,r:70}], shape:"ellipse" });
ck("rrect rounded corners use the closed form 4ab-(4-pi)rho^2", near(round70.area, 4 * 120 * 70 - (4 - Math.PI) * 60 * 60, 1e-9));
ck("rounded rrect sits between ellipse and full rectangle", round70.area > ellSameAB.area && round70.area < sharp.area);
ck("rounding the corners RAISES the corner frequency", round70.kr1 > sharp.kr1);
ck("an rrect mouth read as an ellipse would understate the corner", ellSameAB.kr1 > sharp.kr1);

// 5. superellipse: seNArr must be honoured (n=2 is the ellipse).
var se2 = E.mouthCorner({ H: [{z:0,r:5},{z:100,r:a}], V: [{z:0,r:5},{z:100,r:b}], seNArr: [2, 2] });
ck("sellipse n=2 == ellipse", near(se2.area, Math.PI * a * b, 1e-6));
var se4 = E.mouthCorner({ H: [{z:0,r:5},{z:100,r:a}], V: [{z:0,r:5},{z:100,r:b}], seNArr: [4, 4] });
ck("sellipse n=4 is fuller than n=2", se4.area > se2.area && se4.area < 4 * a * b);

// 6. the override path (wn curved-wavefront mouth / any truer area the caller holds).
var ov = E.mouthCorner(roundProf(100), Math.PI * 130 * 130);
ck("override wins", near(ov.rEq, 130, 1e-9) && ov.overridden === true);
ck("no override -> overridden false", E.mouthCorner(roundProf(100)).overridden === false);
ck("zero/neg/undefined override is IGNORED, not trusted", near(E.mouthCorner(roundProf(100), 0).rEq, 100, 1e-9)
  && near(E.mouthCorner(roundProf(100), -5).rEq, 100, 1e-9)
  && near(E.mouthCorner(roundProf(100), null).rEq, 100, 1e-9));

// 7. degenerate input returns null rather than NaN Hz on screen (RULE 6 spirit:
//    no readout at all beats a readout that lies).
ck("null prof -> null", E.mouthCorner(null) === null);
ck("1-point wall -> null", E.mouthCorner({ H: [{z:0,r:5}], V: [{z:0,r:5}] }) === null);
ck("no V -> null", E.mouthCorner({ H: [{z:0,r:5},{z:10,r:50}] }) === null);
ck("zero-radius mouth -> null", E.mouthCorner({ H: [{z:0,r:5},{z:10,r:0}], V: [{z:0,r:5},{z:10,r:0}] }) === null);

// 8. real generated walls, every family the readout will appear on: finite,
//    positive, ordered, and monotone in mouth size.
var FAMS = [
  ['swh',    {family:'swh',rt:12.7,fc:400,T0:0.7,trunc:181}],
  ['jmlc',   {family:'jmlc',rt:12.7,fc:400,T0:0.7,trunc:181}],
  ['conical',{family:'conical',rt:12.7,fc:400,T0:0.7,trunc:181,covH:90}],
  ['os',     {family:'os',rt:12.7,fc:400,T0:0.7,trunc:181,covH:90}],
  ['osc',    {family:'osc',rt:12.7,fc:400,T0:0.7,trunc:181,covH:90,f0:800}],
  ['rosse',  {family:'rosse',rt:12.7,rosR:130,rosA:39,rosA0:7.5,rosK:1.8,rosRr:0.3,rosB:0.3,rosM:0.8,rosQ:3.7}],
  ['cd',     {family:'cd',rt:16.5,fc:360,T0:0.6,trunc:181,covH:90,covV:40,f0:500,f0V:1466,cornerR:16.5}],
  ['biradial',{family:'biradial',rt:24.6,fc:290,T0:0.7,trunc:181,covH:95,cornerR:20}],
  ['iwata',  {family:'iwata',rt:12.7,fc:400,T0:0.7,trunc:181}],
  ['tractrix',{family:'tractrix',rt:12.7,fc:400,T0:0.7,trunc:181}],
  ['hypex',  {family:'hypex',rt:12.7,fc:400,T0:0.7,trunc:181}],
  ['jmlcell',{family:'jmlcell',rt:12.7,fc:400,T0:0.7,trunc:181,aspect:1.5}],
  ['arai',   {family:'arai',rt:24.6,fc:290,T0:0.7,trunc:181,covH:95,cornerR:20}],
  ['cd82',   {family:'cd82',rt:17.78,fc:400,trunc:181,covH:90,covV:50,f0:800,f0V:0,cornerR:6}]
];
FAMS.forEach(function (F) {
  var w = E.computeFamily(F[1]).wall;
  if (!w || w.length < 2) { console.log("FAIL: " + F[0] + " produced no wall"); fail++; return; }
  var p = E.planeProfiles(w, 200, 1, 0, 0, 90, "ellipse", F[1].rt, F[1].rt);
  var m = E.mouthCorner(p);
  ck(F[0] + " corner is a real number", m && isFinite(m.kr1) && m.kr1 > 0 && m.kr1 < 20000);
  ck(F[0] + " advisory is one octave up", m && near(m.xoverMin, 2 * m.kr1, 1e-12));
});

// 9. monotonicity on the family the user actually asked about: bigger R must
//    ALWAYS lower the corner, or the readout would mislead him while he drags.
var prev = Infinity;
[80, 90, 100, 110, 120, 130, 150, 180, 220].forEach(function (R) {
  var w = E.computeFamily({family:'rosse',rt:12.7,rosR:R,rosA:39,rosA0:7.5,rosK:1.8,rosRr:0.3,rosB:0.3,rosM:0.8,rosQ:3.7}).wall;
  var m = E.mouthCorner(E.planeProfiles(w, 200, 1, 0, 0, 90, "ellipse", 12.7, 12.7));
  ck("rosse R=" + R + " lowers the corner", m.kr1 < prev);
  ck("rosse R=" + R + " mouth Deq == 2R", near(m.dEq, 2 * R, 2e-3));
  prev = m.kr1;
});

// 10. the readout must react to the coverage dial WITHOUT the mouth moving
//     (R-OSSE: a changes depth, not R) -- i.e. corner stays put, depth does not.
var d30 = E.computeFamily({family:'rosse',rt:12.7,rosR:110,rosA:30,rosA0:7.5,rosK:1.8,rosRr:0.3,rosB:0.3,rosM:0.8,rosQ:3.7}).wall;
var d50 = E.computeFamily({family:'rosse',rt:12.7,rosR:110,rosA:50,rosA0:7.5,rosK:1.8,rosRr:0.3,rosB:0.3,rosM:0.8,rosQ:3.7}).wall;
function mz(w) { var z = 0; for (var i = 0; i < w.length; i++) if (w[i].z > z) z = w[i].z; return z; }
ck("R-OSSE coverage changes DEPTH", mz(d30) > mz(d50) + 20);
ck("R-OSSE coverage does NOT change the corner", near(
  E.mouthCorner(E.planeProfiles(d30, 200, 1, 0, 0, 90, "ellipse", 12.7, 12.7)).kr1,
  E.mouthCorner(E.planeProfiles(d50, 200, 1, 0, 0, 90, "ellipse", 12.7, 12.7)).kr1, 2e-3));

console.log(fail ? fail + " mouthCorner bench FAILURES" : "all mouthCorner bench checks pass");
process.exit(fail ? 1 : 0);

// bench_akabak.js -- entry 230. Exercise akabakLEM across families and check the
// emitted script is finite, node-contiguous, area-monotone-ish and unit-tagged.
var E = require('./engine.js');
var CASES = [
  { name: 'os (OS-SE)',  fam: { family: 'os', rt: 12.7, fc: 500, covH: 90, f0: 800, entryDeg: 7.5 } },
  { name: 'osc',        fam: { family: 'osc', rt: 12.7, fc: 500, covH: 90, f0: 800, entryDeg: 7.5 } },
  { name: 'rosse',      fam: { family: 'rosse', rt: 12.7, rosR: 130, rosA: 39, rosA0: 7.5, rosK: 1.8, rosRr: 0.3, rosB: 0.3, rosM: 0.8, rosQ: 3.7 } },
  { name: 'jmlc',       fam: { family: 'jmlc', fc: 340, rt: 12.7, T0: 0.707107, trunc: 175 } },
  { name: 'jmlcell',    fam: { family: 'jmlcell', fc: 340, rt: 12.7, T0: 0.707107, trunc: 175, ar: 1.5 } },
  { name: 'hypex',      fam: { family: 'hypex', fc: 400, rt: 12.7, T0: 0.7, trunc: 175 } },
  { name: 'tractrix',   fam: { family: 'tractrix', rt: 12.7, fc: 400, mouthR: 200 } },
  { name: 'conical',    fam: { family: 'conical', rt: 12.7, fc: 400, entryDeg: 20 } },
  { name: 'swh',        fam: { family: 'swh', rt: 12.7, fc: 400, T0: 0.7, trunc: 175 } },
  { name: 'biradial',   fam: { family: 'biradial', rt: 24.6, fc: 290, T0: 0.7, trunc: 181, covH: 95, cornerR: 20 } },
  { name: 'iwata',      fam: { family: 'iwata', rt: 12.7, fc: 400, covH: 90 } },
  { name: 'cd',         fam: { family: 'cd', rt: 16.5, fc: 360, T0: 0.6, trunc: 181, covH: 90, covV: 40, f0: 500, f0V: 1466, cornerR: 16.5, cdRound: true } },
  { name: 'wn',         fam: { family: 'wn', rt: 12.7, fc: 500, covH: 90, covV: 40 } }
];
var fails = 0;
function chk(n, c, msg) { if (!c) { fails++; console.log('  FAIL [' + n + '] ' + msg); } }
CASES.forEach(function (cs) {
  var fam, prof;
  try { fam = E.computeFamily(cs.fam); prof = E.planeProfiles(fam.wall, 220, 1, 0, 0, 0, 'ellipse', cs.fam.rt, 0); }
  catch (e) { console.log(cs.name + ': computeFamily/planeProfiles threw -- ' + e.message); return; }
  var r = E.akabakLEM({ prof: prof, name: 'test_' + cs.name, family: cs.fam.family, section: 'ellipse', build: 230, nSeg: 24 });
  if (!r) { console.log(cs.name + ': akabakLEM returned null'); fails++; return; }
  var s = r.script;
  chk(cs.name, s.indexOf('NaN') < 0 && s.indexOf('Infinity') < 0 && s.indexOf('undefined') < 0, 'non-finite/undefined token in script');
  chk(cs.name, s.indexOf(',') < 0 || !/\d,\d/.test(s), 'locale comma decimal found');
  // node contiguity across Waveguide blocks
  var nodes = [], m, re = /Waveguide '[^']*'\nNode=(\d+)=(\d+)\n/g;
  while ((m = re.exec(s))) nodes.push([+m[1], +m[2]]);
  chk(cs.name, nodes.length === r.nSeg, 'waveguide count ' + nodes.length + ' != nSeg ' + r.nSeg);
  for (var i = 0; i < nodes.length; i++) {
    chk(cs.name, nodes[i][1] === nodes[i][0] + 1, 'seg ' + i + ' node pair not contiguous');
    if (i) chk(cs.name, nodes[i][0] === nodes[i - 1][1], 'seg ' + i + ' does not chain from previous');
  }
  // radiator sits on the last node
  var rm = /Radiator '[^']*'\nNode=(\d+)\nSD=([\d.]+)cm2/.exec(s);
  chk(cs.name, !!rm, 'no Radiator block');
  if (rm) chk(cs.name, +rm[1] === nodes[nodes.length - 1][1], 'radiator node != last segment mouth node');
  // segment lengths sum to the horn length
  var lens = [], lm, lre = /Len=([\d.]+)cm/g;
  while ((lm = lre.exec(s))) lens.push(+lm[1]);
  var sum = lens.reduce(function (a, b) { return a + b; }, 0);
  chk(cs.name, Math.abs(sum - r.length / 10) < 0.05, 'sum(Len) ' + sum.toFixed(3) + ' != length ' + (r.length / 10).toFixed(3) + 'cm');
  // areas: throat/mouth agree with the returned summary, all positive
  var ar = [], am, are = /S(?:Th|Mo)=([\d.]+)cm2/g;
  while ((am = are.exec(s))) ar.push(+am[1]);
  chk(cs.name, ar.length === 2 * r.nSeg, 'area token count ' + ar.length);
  chk(cs.name, ar.every(function (a) { return a > 0; }), 'non-positive area');
  chk(cs.name, Math.abs(ar[0] - r.throatArea / 100) < 0.02, 'first STh != throatArea');
  chk(cs.name, Math.abs(ar[ar.length - 1] - r.mouthArea / 100) < 0.02, 'last SMo != mouthArea');
  // adjacent segments share the interface area (STh[i+1] == SMo[i])
  for (var k = 0; k + 2 < ar.length; k += 2) chk(cs.name, Math.abs(ar[k + 1] - ar[k + 2]) < 1e-9, 'interface area mismatch at seg ' + (k / 2));
  // header anchors + required grammar
  ['Def_Driver', 'System ', 'Driver Def=', 'Enclosure ', 'Waveguide ', 'Radiator ', 'Conical',
   'Sd=', 'Bl=', 'Cms=', 'Rms=', 'fs=', 'Le=', 'Re=', 'ExpoLe=1',
   'WHAT THIS IS', 'WHAT IT IS NOT', 'HOW TO LOAD', 'PLACEHOLDER', '3.01 dB'].forEach(function (t) {
    chk(cs.name, s.indexOf(t) >= 0, 'missing "' + t + '"');
  });
  chk(cs.name, s.split('\n').filter(function (l) { return l && l[0] !== '|' && l.trim(); }).length > 0, 'no non-comment content');
  console.log(cs.name + ': ' + r.nSeg + ' seg, throat ' + (r.throatArea / 100).toFixed(2) +
    ' cm2 -> mouth ' + (r.mouthArea / 100).toFixed(2) + ' cm2, L ' + (r.length / 10).toFixed(2) +
    ' cm, skipped ' + r.skipped + ', ' + s.length + ' chars');
});
// nSeg clamping
var f0 = E.computeFamily(CASES[0].fam), p0 = E.planeProfiles(f0.wall, 220, 1, 0, 0, 0, 'ellipse', 12.7, 0);
[1, 4, 24, 64, 500].forEach(function (n) {
  var r = E.akabakLEM({ prof: p0, nSeg: n });
  var want = Math.max(4, Math.min(64, n));
  if (r.nSeg !== want) { fails++; console.log('  FAIL clamp: nSeg ' + n + ' -> ' + r.nSeg + ' want ' + want); }
});
// degenerate input returns null, not a broken script
[null, { prof: null }, { prof: { H: [{z:0,r:1}], V: [{z:0,r:1}] } }].forEach(function (o, i) {
  if (E.akabakLEM(o) !== null) { fails++; console.log('  FAIL degenerate case ' + i + ' did not return null'); }
});

// ---- wavefront coordinate (JMLC sMap) and negative-z station exclusion ----
(function () {
  var f = E.computeFamily({ family: 'jmlc', fc: 340, rt: 12.7, T0: 0.707107, trunc: 175 });
  var p = E.planeProfiles(f.wall, 220, 1, 0, 0, 0, 'ellipse', 12.7, 0);
  // build a wavefront map: s grows faster than z (spherical cap arc)
  var sm = [], sAcc = 0;
  for (var i = 0; i < p.H.length; i++) {
    if (i) sAcc += Math.hypot(p.H[i].z - p.H[i - 1].z, p.H[i].r - p.H[i - 1].r);
    sm.push({ z: p.H[i].z, s: sAcc });
  }
  var ax = E.akabakLEM({ prof: p, nSeg: 24 });
  var wf = E.akabakLEM({ prof: p, nSeg: 24, mode: 'wavefront', sMap: sm });
  if (!(wf.length > ax.length)) { fails++; console.log('  FAIL wavefront length ' + wf.length.toFixed(1) + ' !> axial ' + ax.length.toFixed(1)); }
  if (Math.abs(wf.throatArea - ax.throatArea) > 1e-6 || Math.abs(wf.mouthArea - ax.mouthArea) > 1e-6) { fails++; console.log('  FAIL wavefront changed the area law'); }
  if (wf.script.indexOf('Wavefront length') < 0) { fails++; console.log('  FAIL wavefront header not labelled'); }
  if (ax.script.indexOf('Axial length') < 0) { fails++; console.log('  FAIL axial header not labelled'); }
  console.log('wavefront: L ' + (wf.length / 10).toFixed(2) + ' cm vs axial ' + (ax.length / 10).toFixed(2) + ' cm (same areas)');

  // entry-192 style loading-only bore prepended at z < 0 must be excluded and reported
  var H2 = [{ z: -20, r: 12.7 }, { z: -10, r: 12.7 }].concat(p.H);
  var V2 = [{ z: -20, r: 12.7 }, { z: -10, r: 12.7 }].concat(p.V);
  var bore = E.akabakLEM({ prof: { H: H2, V: V2, shape: 'ellipse', rho: 0 }, nSeg: 24 });
  if (bore.skipped !== 2) { fails++; console.log('  FAIL bore stations skipped = ' + bore.skipped + ' want 2'); }
  if (Math.abs(bore.length - ax.length) > 1e-6) { fails++; console.log('  FAIL bore stations changed the horn length'); }
  if (bore.script.indexOf('loading-only stations behind the throat') < 0) { fails++; console.log('  FAIL bore exclusion not disclosed in header'); }
  console.log('driver-bore prepend: ' + bore.skipped + ' stations excluded, length unchanged, disclosed');
})();

console.log(fails ? '\nFAILURES: ' + fails : '\nall akabak bench checks pass');

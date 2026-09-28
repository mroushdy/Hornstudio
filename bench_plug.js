/* entry 237 bench: the bullet phase plug (rewritten 2026-09-28 for the shipped API;
   the August draft benched an API that never reached the repo).
   The plug's claim is that it is an ACOUSTIC object -- it occludes area and every
   1-D consumer sees the NET area -- and a PRINTABLE one: closed solids that a
   slicer unions with the horn. Both are pinned here, with numbers. */
var E = require('./engine.js');
var fail = 0;
function ck(n, c, extra) { if (!c) { console.log("FAIL: " + n + (extra !== undefined ? " -- " + extra : "")); fail++; } }
function near(a, b, tol) { return Math.abs(a - b) <= (tol || 1e-9) * Math.max(1, Math.abs(b)); }

// 1. NOSE SHAPES: exact at both ends, monotone, ordered cone < ogive < ellipse, ogive tangent at the base
["bullet", "ellipse", "cone"].forEach(function (sh) {
  var p = E.bulletProfile(80, 120, 60, sh);
  ck(sh + " starts at the base radius", near(p[0].r, 40));
  ck(sh + " ends exactly on the axis at z = L", p[p.length - 1].r === 0 && near(p[p.length - 1].z, 120));
  for (var i = 1; i < p.length; i++) ck(sh + " tapers monotonically", p[i].r <= p[i - 1].r + 1e-12);
});
var B = { D: 80, L: 120, shape: "bullet" }, EL = { D: 80, L: 120, shape: "ellipse" }, CO = { D: 80, L: 120, shape: "cone" };
for (var z = 3; z < 120; z += 3) ck("cone < ogive < ellipse at z=" + z, E.bulletRAt(CO, z) < E.bulletRAt(B, z) + 1e-9 && E.bulletRAt(B, z) < E.bulletRAt(EL, z) + 1e-9);
ck("tangent ogive leaves the base tangent to the axis (dr/dz -> 0)", Math.abs((E.bulletRAt(B, 0.5) - 40) / 0.5) < 0.02);
ck("cone slope is -R/L immediately", near((E.bulletRAt(CO, 0.5) - 40) / 0.5, -40 / 120, 1e-9));
ck("radius is zero past the tip and behind the base", E.bulletRAt(B, 120.001) === 0 && E.bulletRAt(B, -1) === 0);

// 2. THE TWO MODES on a real large-throat horn (12" cone driver: 250 mm throat, fc 120)
var horn = E.computeFamily({ family: 'hypex', rt: 125, fc: 120, T0: 0.7, petf: false });
var prof = E.planeProfiles(horn.wall, 300, 1, 0, 0, 90, "ellipse", 125, 0);
var plug = { D: 150, L: 300, shape: "bullet", spokes: 4, spokeT: 4 };
var des = E.plugApply(prof, plug, true), ret = E.plugApply(prof, plug, false);
var fArr = [100, 150, 250, 500, 1000, 2000];
var z0 = E.throatImpedance(prof, fArr, "axial", null), zD = E.throatImpedance(des, fArr, "axial", null), zR = E.throatImpedance(ret, fArr, "axial", null);
var same = true, diff = false;
for (var k = 0; k < fArr.length; k++) { if (Math.abs(z0[k].re - zD[k].re) > 1e-9 || Math.abs(z0[k].im - zD[k].im) > 1e-9) same = false; if (Math.abs(z0[k].re - zR[k].re) > 1e-3) diff = true; }
ck("DESIGNED-IN: net area == law at every plugged station, so throat impedance is bit-identical to the bare horn", same);
ck("RETROFIT: walls untouched, occluded area subtracted -> the loading CHANGES (the chart shows the cost)", diff && near(ret.H[0].r, prof.H[0].r) && ret.occl[0] > 0);
var netOK = true;
for (var i = 0; i < des.H.length; i++) {
  var A = E.sectionArea("ellipse", des.H[i].r, des.V[i].r, 0) - des.occl[i], A0 = E.sectionArea("ellipse", prof.H[i].r, prof.V[i].r, 0);
  if (Math.abs(A - A0) > 1e-6 * A0) netOK = false;
}
ck("designed-in net area equals the law at EVERY station (not just the throat)", netOK);
ck("wall opening is reported and bounded (sqrt(1 + occl/A))", des.plug.maxScale > 1 && des.plug.maxScale < 1.5 && des.plug.maxDr > 0);
ck("beyond the bullet nothing changes", near(des.H[des.H.length - 1].r, prof.H[prof.H.length - 1].r) && des.occl[des.H.length - 1] === 0);
var R0 = E.hornResponse(prof, fArr, "axial", null), RD = E.hornResponse(des, fArr, "axial", null);
var respSame = true; for (var q = 0; q < fArr.length; q++) if (Math.abs(R0[q].db - RD[q].db) > 1e-6) respSame = false;
ck("hornResponse reads the net area too (designed-in == bare)", respSame);

// 3. PRINTABILITY: closed, outward, right size
var ms = E.plugMeshes(des, 64, 5);
ck("bullet + 4 spokes = 5 closed solids", ms.length === 5);
ms.forEach(function (m, i) { var v = E.validateMesh(m, false); ck("solid " + i + " watertight, finite, outward", v.watertight && v.finite && m.volume > 0, JSON.stringify(v)); });
var vEll = E.bulletMesh({ D: 100, L: 200, shape: "ellipse" }, 96).volume;
ck("ellipsoid bullet volume within 0.5% of (2/3) pi R^2 L", near(vEll, (2 / 3) * Math.PI * 50 * 50 * 200, 0.005), vEll);
var vCone = E.bulletMesh({ D: 100, L: 200, shape: "cone" }, 96).volume;
ck("cone bullet volume within 0.5% of (1/3) pi R^2 L", near(vCone, (1 / 3) * Math.PI * 50 * 50 * 200, 0.005), vCone);
// spokes reach from inside the bullet to inside the wall shell
var sp = ms[1], rMin = 1e9, rMax = 0, zMin = 1e9, zMax = 0;
for (var p = 0; p < sp.pos.length; p += 3) { var rr = Math.hypot(sp.pos[p + 1], sp.pos[p + 2]); rMin = Math.min(rMin, rr); rMax = Math.max(rMax, rr); zMin = Math.min(zMin, sp.pos[p]); zMax = Math.max(zMax, sp.pos[p]); }
ck("spoke spans 12%..72% of the bullet length (to the nearest station)", Math.abs(zMin - 0.12 * 300) < 9 && Math.abs(zMax - 0.72 * 300) < 9, zMin + ".." + zMax);
ck("spoke inner edge is inside the bullet, outer edge inside the wall shell", rMin < E.bulletRAt(plug, zMin) && rMax > des.H[0].r);
// the merged STL-style mesh stays finite
var all = E.mergeMeshes([E.buildSolidMesh(des, 5, 64, null, "round")].concat(ms));
var fin = true; for (var f2 = 0; f2 < all.pos.length; f2++) if (!isFinite(all.pos[f2])) fin = false;
ck("merged horn + plug mesh is finite", fin);

// 4. NO PLUG, NO EFFECT
var none = E.plugApply(prof, { D: 0, L: 0 }, true);
ck("D = 0 returns the profile untouched", none === prof);
console.log(fail ? fail + " plug bench FAILURES" : "all plug bench checks pass");
process.exit(fail ? 1 : 0);

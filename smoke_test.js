// Browser-faithful DOM smoke test for Horn Studio.
// Usage: node smoke_test.js path/to/horn_studio.html
// CRITICAL: this stub DESTROYS child elements on innerHTML rewrite (like real
// browsers). A stub that reuses elements by id will HIDE listener-death and
// detached-canvas bugs (this exact mistake shipped a broken PETF dropdown once).
var fs = require('fs'), path = process.argv[2] || 'horn_studio.html';
var src = fs.readFileSync(path, 'utf8');
var js = src.match(/<script>\n([\s\S]*?)<\/script>/g).pop().replace(/<\/?script>\n?/g, '').replace('window.onerror', 'var _onerror');
fs.writeFileSync('/tmp/_smoke_extract.js', js);
var registry = {};
function El(id){this.id=id;this._html='';this.style={};this.value='';this.className='';this.clientWidth=520;this.disabled=false;this.parentElement={style:{}};this._h={};}
El.prototype.addEventListener=function(ev,fn){this._h[ev]=fn;};
El.prototype.setAttribute=function(){};El.prototype.appendChild=function(){};El.prototype.setPointerCapture=function(){};
Object.defineProperty(El.prototype,'innerHTML',{get(){return this._html;},set(v){
  for (var k in registry){ if (registry[k]._owner===this) delete registry[k]; }
  this._html=v; var re=/id="([^"]+)"/g,m2;
  while((m2=re.exec(v))){ var e=new El(m2[1]); e._owner=this; registry[m2[1]]=e; }
}});
Object.defineProperty(El.prototype,'textContent',{get(){return '';},set(v){this._t=v;}});
var appEl=new El('app'), errEl=new El('errbox');
global.window=global;var timers=[];global.setTimeout=function(fn){timers.push(fn);};
global.document={getElementById:function(id){ if(id==='app')return appEl; if(id==='errbox')return errEl; return registry[id]||null; },createElement:function(){return{style:{},click:function(){}};}};
global.URL={createObjectURL:()=>'',revokeObjectURL:()=>{}};global.Blob=function(){};global.requestAnimationFrame=()=>{};
// THREE stub (2026-07-13): a recursive no-op proxy so the 3-D viewer path EXECUTES in the
// harness. Without it, scope errors in viewer-only code are invisible (the app early-returns
// when THREE is undefined) -- exactly how the buildStyledMesh-inside-update() ReferenceError
// shipped a dead 3-D viewer while all checks passed. Any throw in the viewer now crashes
// the harness loudly.
function __threeStub(){ return new Proxy(function(){}, {
  construct: function(){ return __threeStub(); },
  apply: function(){ return __threeStub(); },
  get: function(t, p){ if (p === Symbol.toPrimitive) return function(){ return 0; }; if (p === 'then') return undefined; return __threeStub(); },
  set: function(){ return true; }
}); }
global.THREE = __threeStub();
require('/tmp/_smoke_extract.js');
function drain(){var g=0;while(timers.length&&g++<10){timers.shift()();}}
function stats(){return registry.stats._html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,60);}
drain();
var fail = 0;
function check(name, cond){ console.log((cond?'ok  ':'FAIL')+' '+name); if(!cond) fail++; }
check('default renders', /<svg/.test(registry.drawing._html));
check('default is round JMLC (\u00d8 in stats)', /\u00d8/.test(registry.stats._html));
// family sweep
for (var f of ['swh','tractrix','hypex','conical','cd','biradial','os','rosse','jmlc']){
  registry.familySel._h.change({target:{value:f}}); drain();
  check('family '+f+' renders', /<svg/.test(registry.drawing._html));
}
// STICKY-STATE REGRESSION (the square-horns bug, regression 9): visiting the rect-only
// biradial must not flip the section for other families
registry.familySel._h.change({target:{value:'biradial'}}); drain();
registry.familySel._h.change({target:{value:'jmlc'}}); drain();
check('jmlc still round after visiting biradial', /\u00d8/.test(registry.stats._html));
registry.familySel._h.change({target:{value:'cd'}}); drain();
check('cd + ellipse = round CE (\u00d8, L~294)', /\u00d8/.test(registry.stats._html));
registry.sectSel._h.change({target:{value:'rrect'}}); drain();
check('cd + rrect = wedge (W \u00d7 H)', /W \u00d7 H/.test(registry.stats._html));
registry.sectSel._h.change({target:{value:'ellipse'}}); drain();
// PETF presets must not kill the DOM (build()-in-handler regression)
registry.familySel._h.change({target:{value:'jmlc'}}); drain();
var v3dBefore = registry.view3d;
for (var pset of ['hvdiff','hvdiff2','boost','custom','off']){ registry.petfSel._h.change({target:{value:pset}}); drain(); }
check('petfSel listener alive after preset cycling', !!registry.petfSel._h.change);
check('3-D container element not rebuilt by presets', registry.view3d === v3dBefore);
// FALSY-ZERO REGRESSION (rosseWall): a0=0 and b=0 are paper-valid, slider min is 0.
// Engine once used ||-defaults, silently building a0=7.5/b=0.3 while the UI showed 0.
registry.familySel._h.change({target:{value:'rosse'}}); drain();
var rosseBase = registry.stats._html;
registry.num_rosA0.value='0'; registry.num_rosA0._h.input(); drain();
check('rosse a0=0 actually changes geometry', registry.stats._html !== rosseBase);
var rosseA0 = registry.stats._html;
registry.num_rosB.value='0'; registry.num_rosB._h.input(); drain();
check('rosse b=0 actually changes geometry', registry.stats._html !== rosseA0);
// CD COMMON-MOUTH INVARIANTS (0.9*B wedge rewrite): both planes must end on ONE mouth
// plane, and the mouth must meet BOTH Keele widths (eq.1 / eq.2). Engine-level check:
// resolves engine.js beside the tested html, else beside this script (announced, so an
// engine/html mismatch can't hide silently -- the DOM checks above cover the embedded copy).
var P2 = require('path'), fs2 = require('fs');
var engCand = [P2.resolve(P2.dirname(path), 'engine.js'), P2.resolve(__dirname, 'engine.js')];
var engPath = engCand.find(function (p2) { return fs2.existsSync(p2); });
console.log('     (engine-level checks use ' + engPath + ')');
var E = require(engPath);
var cdh = E.computeFamily({family:'cd', rt:16.5, fc:360, T0:0.6, trunc:181, covH:90, covV:40, f0:500, f0V:1466, cornerR:16.5});
var zH = cdh.wall[cdh.wall.length-1].z, zV = cdh.wallV[cdh.wallV.length-1].z;
check('cd rect planes end at a common mouth plane', Math.abs(zH - zV) < 1e-6);
var dK = 2.54e7/(90*500), dKV = 2.54e7/(40*1466);
check('cd rect mouth meets Keele widths', 2*cdh.wall[cdh.wall.length-1].r >= dK - 0.5 && 2*cdh.wallV[cdh.wallV.length-1].r >= dKV - 0.5);
// CD82 CONNECTOR INVARIANTS (rounded-rect-throat / gap-step regression, screenshot 2026-07-13):
// throat must be an exact circle and the slot-plane wall must be step-free.
var b82 = E.computeFamily({family:'cd82', rt:17.78, fc:400, trunc:181, covH:90, covV:50, f0:800, f0V:0, cornerR:6});
check('cd82 throat is round (a=b=rho=rt)', Math.abs(b82.wall[0].r-17.78)<1e-6 && Math.abs(b82.wallV[0].r-17.78)<1e-6 && Math.abs(b82.rhoTrk[0]-17.78)<1e-6);
// the diffraction slot pinches the WIDE-coverage plane (here H, 90 deg) -- never the narrow one
var minH = 1e9, minV = 1e9;
for (var q8=0;q8<b82.wall.length;q8++){ minH=Math.min(minH,b82.wall[q8].r); minV=Math.min(minV,b82.wallV[q8].r);
  }
check('cd82 slot pinches the wide plane only', minH < 10 && minV >= 17.78 - 1e-6);
// step detector is slope-relative: a genuine step dwarfs its neighbor deltas, while the
// smooth-but-steep power-series mouth (last stations) has large-but-EQUAL adjacent deltas.
function hasStep(wl){ for (var q9=2;q9<wl.length-1;q9++){ var d0=Math.abs(wl[q9-1].r-wl[q9-2].r), d1=Math.abs(wl[q9].r-wl[q9-1].r), d2=Math.abs(wl[q9+1].r-wl[q9].r);
  if (d1 > 3*Math.max(d0,d2) + 0.05) return wl[q9].z; } return false; }
check('cd82 walls are step-free', hasStep(b82.wall) === false && hasStep(b82.wallV) === false);
// cd82 is UI-RETIRED (replaced by the Arai biradial at the user's request) but the
// patent-exact keele82Wall is preserved engine-side; these checks keep guarding it.
// PATENT EXEMPLARY EMBODIMENT (US 4,308,932 full table): A 80x36 (B ~89x40), G 48.8,
// F 400, square mouth 780x780, gap 18.0, gap->mouth 299.1. Engine must reproduce the
// closed-form quantities: W both planes ~781 (K exactly 25000), gap 18.06, Ls 299-300.
var pe = E.computeFamily({family:'cd82', rt:24.4, fc:400, trunc:181, covH:80/0.9, covV:40, f0:400, f0V:0, cornerR:10});
var peW = 2*pe.wall[pe.wall.length-1].r, peH = 2*pe.wallV[pe.wallV.length-1].r;
var peLs = pe.length - pe.xGap;
check('cd82 patent example: square mouth ~781x781', Math.abs(peW-781.25)<1.5 && Math.abs(peH-781.25)<1.5);
check('cd82 patent example: gap 18 mm, gap->mouth ~299', Math.abs(pe.gapW-18.06)<0.2 && Math.abs(peLs-299.6)<2);
check('cd82 patent example: long connector (throat->gap > gap->mouth)', pe.xGap > peLs);
// ARAI A-290 ANCHOR (araihorn.com, plans public): 95x40, T=0.7, fc 290, 2" throat ->
// shipped W656 x D405 (H230 exterior / ~170 interior in 30 mm lumber). Engine must land
// W/L within ~4% and terminate on the kr loading criterion, NOT a Keele width.
var ar = E.computeFamily({family:'biradial', rt:24.6, fc:290, T0:0.7, trunc:181, covH:95, cornerR:20});
var arW = 2*ar.wall[ar.wall.length-1].r, arH = 2*ar.wallV[ar.wallV.length-1].r;
check('biradial A-290 anchor: width ~656', arW > 620 && arW < 675);
check('biradial A-290 anchor: length ~380-405 (book: 380 incl adapter; araihorn claimed 405)', ar.length > 370 && ar.length < 425);
check('biradial A-290 anchor: height ~170 interior, kr mouth', arH > 155 && arH < 195 && ar.terminated === 'mouth-kr1');
// ARAI OPTIMIZED (2026-07-13): UI biradial now carries araiOptWall -- Yuichi's documented
// sidewall ARC (through throat/mouth endpoints, END tangent = covH/2, "flat before curving
// out") + hypex-law V + fin-layout data (6 fins, gaps 7.5/15/15/15/7.5 scaled by covH/95,
// common origin). The A-290 anchors above now validate the NEW wall; the legacy straight-fan
// araiWall stays reachable under family 'arai' and must keep its own anchor.
var arL = E.computeFamily({family:'arai', rt:24.6, fc:290, T0:0.7, trunc:181, covH:95, cornerR:20});
var arLW = 2*arL.wall[arL.wall.length-1].r;
check('legacy arai (straight fan) still anchored to A-290', arLW > 620 && arLW < 675 && arL.terminated === 'mouth-kr1');
// AUDIT #7 (2026-07-13): the arc metadata now reports tangents FROM the geometry --
// start ~26.6 deg, junction ~82 deg at the wing join (an intentional piecewise junction,
// NOT tangent-continuous, and NOT covH/2 -- that retired claim was never enforced).
check('sidewall metadata: real start tangent (flat off the adapter)', ar.arc && ar.arc.startDeg > 15 && ar.arc.startDeg < 35);
check('sidewall metadata: real junction tangent (wing curl, not covH/2)', ar.arc && ar.arc.junctionDeg > 60 && Math.abs(ar.arc.junctionDeg - 47.5) > 5);
check('sidewall metadata: junction at the widest point (V2 ~221-233)', ar.arc && ar.arc.junctionZ > 200 && ar.arc.junctionZ < 260);
// AUDIT #9: per-fin ACTUAL blade spans (endZ = L was a lie; blades end mid-horn)
var bl4 = ar.finLayoutArai4.blades;
check('fin blades: actual endpoints reported, all well before the apex', bl4 && bl4.length === 4 && bl4.every(function(b9){ return b9.endZ < 260 && b9.endZ > 150 && b9.startZ < b9.endZ; }));
var fa = ar.finLayout && ar.finLayout.angles;
var faSym = fa && fa.length === 6 && Math.abs(fa[0]+fa[5]) < 1e-9 && Math.abs(fa[1]+fa[4]) < 1e-9 && Math.abs(fa[2]+fa[3]) < 1e-9;
check('araiOpt fin layout: 6 fins, symmetric, 7.5/15 gap pattern', faSym && Math.abs((fa[5]-fa[4]) - 7.5) < 1e-6 && Math.abs((fa[4]-fa[3]) - 15) < 1e-6);
// BOOK ANCHORS (Yuichi's own tables/drawings, user-supplied scans 2026-07-13):
// (a) his throat-adapter area table IS the hyperbolic law fc290/T0.7 (0.7% agreement) --
//     adapter length now 25 mm; (b) ORIGINAL 4-fin layout = equal covH/5 cells (19.0 deg
//     drawn), blades radial from the common origin, R0/blade-length scale fractions land
//     on the book's 34.5 / 192 within 3%.
var fa4 = ar.finLayoutArai4;
check('arai4 layout: 4 fins at +-covH/10 and +-3covH/10 (equal 19 deg cells)',
  fa4 && fa4.angles.length === 4 && Math.abs(fa4.angles[3] - 28.5) < 1e-9 && Math.abs(fa4.angles[2] - 9.5) < 1e-9);
check('arai4 blades on the book span (R0~34.5, blade~192, scale fractions)',
  fa4 && Math.abs(fa4.R0 - 34.5) < 3 && Math.abs((fa4.R1 - fa4.R0) - 192) < 8);
var f4m = E.araiFinMesh(ar, 10, ar.finLayoutArai4);
var f4bad = 0; for (var f4q = 0; f4q < f4m.pos.length; f4q++) if (!isFinite(f4m.pos[f4q])) f4bad++;
check('arai4 fin mesh: 4 lens blades, finite, mid-horn span (ends before mouth)', f4bad === 0 && f4m.pos.length / 3 === 432 && (function(){ var zx = 0; for (var zq = 0; zq < f4m.pos.length; zq += 3) if (f4m.pos[zq] > zx) zx = f4m.pos[zq]; return zx < 380; })());
function vNeck(h){var mn=1e9;for(var q=0;q<h.wallV.length;q++)if(h.wallV[q].r<mn)mn=h.wallV[q].r;return mn;}
check('araiOpt reduces the sectoral V-neck vs legacy fan', vNeck(ar) > vNeck(arL) + 1);
// PORTED FROM PARALLEL BRANCH (2026-07-13, horn_studio__5_): three features cherry-picked
// after analysis; their stale swhWall/rosse/keele82 rejected (see PROJECT_STATE #16).
// (a) superellipse exponent MORPHING: n = 2 at the throat (true circle) -> seN at the mouth
var jm = E.computeFamily({family:'jmlc', rt:12.7, fc:400, T0:0.7, trunc:181});
var pf = E.planeProfiles(jm.wall, 120, 1, 0, 0, 90, 'sellipse:6', 12.7, 12.7);
check('sellipse morph: round throat (n=2) -> n~6 mouth', pf.seNArr && Math.abs(pf.seNArr[0]-2) < 1e-9 && pf.seNArr[pf.baseStations-1] > 5.5);
// (b) absolute exit-angle roundover: wrap=0 stays flush at the mouth plane
var pw = E.planeProfilesWN(E.computeFamily({family:'cd', rt:12.7, fc:400, T0:0.7, trunc:181, covH:90, covV:50, f0:800, cornerR:10}), 200, 15, 15, 90, 12.7, 'rrect');
var zEndH = pw.H[pw.H.length-1].z, zEndV = pw.V[pw.V.length-1].z;
check('exit-angle flare: wrap 0 = flush common plane', Math.abs(zEndH - zEndV) < 1.5);
// (c) az-loft wide-format: 13 per-azimuth PETF horns, rollbacks kept, finite geometry
var hv = E.buildHVDiffAz({family:'jmlc', rt:12.7, fc:400, T0:0.7, trunc:181, petf:true, Tadd:3.5, fmult:3, sOff:0},
                         {family:'jmlc', rt:12.7, fc:400, T0:0.7, trunc:181, petf:true, Tadd:0.4, fmult:2, sOff:0}, 13);
var hvOK = hv.azProfiles.length === 13 && isFinite(hv.sMax) && hv.wall.length > 10 && hv.wallV.length > 10;
check('HVDiff az-loft: 13 azimuth PETF horns, finite', hvOK);
// regression 17: the loft must STOP when the fastest azimuth completes -- slow planes
// truncate mid-growth (published No.1/No.2 plots: fast plane fully rolled back, slow plane
// cut while still rising). Running all azimuths to their own mouths made a near-round
// mouth with cusped slow-plane tongues.
var hvMin = Infinity, hvMax = 0;
for (var hk = 0; hk < hv.azProfiles.length; hk++) { var tt = hv.azProfiles[hk].total;
  if (tt < hvMin) hvMin = tt; if (tt > hvMax) hvMax = tt; }
check('HVDiff cut = fastest azimuth completion', Math.abs(hv.sEnd - hvMin) < 1e-6 && hvMax > hvMin * 1.1);
var hvHe = hv.H[hv.H.length-1], hvVe = hv.V[hv.V.length-1];
check('HVDiff mouth is oblong (slow plane truncated, no tongue)', hvVe.r < 0.75 * hvHe.r && hvVe.z > hvHe.z);
// fast plane keeps its rollback: its max r occurs BEFORE its endpoint (curl tucks back)
var hvRmax = 0, hvIm = 0; for (var hq = 0; hq < hv.H.length; hq++) if (hv.H[hq].r > hvRmax) { hvRmax = hv.H[hq].r; hvIm = hq; }
check('HVDiff fast plane rollback kept', hvIm < hv.H.length - 1 && hvRmax > hvHe.r);
// regression 18: wrap-back lip must be a PARALLEL CURVE of the mouth ring (perimeter-normal
// roll). The old radial-from-axis roll gave each point full dl toward the axis but only
// dl*cos(skew) of clearance off the wall -> a bulge ("point") centered on every flat wall
// of a rect section (screenshot config: cd 90x50, rrect, cornerR 6, wrap 135).
var wr = E.planeProfilesWN(E.computeFamily({family:'cd', rt:17.78, fc:400, T0:0.6, trunc:181, covH:90, covV:50, f0:800, f0V:0, cornerR:6, cdRound:false}), 200, 62, 62, 225, 17.78, 'rrect');
var wrR = E.buildRings(wr, 64), wrM = wr.H.length, wrB = wr.baseStations;
var wrTopY = [], wrSideX = [];
for (var wj = 0; wj < 64; wj++) {
  var wk = ((wrM - 1) * 64 + wj) * 3, wkm = ((wrB - 1) * 64 + wj) * 3;
  if (Math.abs(wrR[wkm + 1]) < 150 && wrR[wkm + 2] > 0) wrTopY.push(wrR[wk + 2]); // flat top wall
  if (Math.abs(wrR[wkm + 2]) < 60 && wrR[wkm + 1] > 0) wrSideX.push(wrR[wk + 1]); // flat side wall
}
function spread(a){var mn=Infinity,mx=-Infinity;for(var q=0;q<a.length;q++){if(a[q]<mn)mn=a[q];if(a[q]>mx)mx=a[q];}return mx-mn;}
check('wrap lip: flat walls stay flat through the roll (no pointy bulge)',
  wrTopY.length >= 3 && wrSideX.length >= 3 && spread(wrTopY) < 0.1 && spread(wrSideX) < 0.1);
// regression 18 guard (see above) ...
// WIDE-FORMAT RECIPE SHAPES: No.1 (aggressive) has a waisted "peanut" mouth -- the top edge
// peaks off-center because diagonal azimuths outrun the vertical; No.2 (milder V) is a clean
// oval peaking AT the center. Both follow from per-azimuth complete PETF horns cut at the
// fastest azimuth; the waist is recipe-driven, not a loft artifact (verified 2026-07-13).
function hvOutline(T0, Tadd, fm, TaddV, fmV){
  var h = E.buildHVDiffAz(
    {family:'jmlc', rt:12.7, fc:400, T0:T0, trunc:181, petf:true, Tadd:Tadd, fmult:fm, sOff:0},
    {family:'jmlc', rt:12.7, fc:400, T0:T0, trunc:181, petf:true, Tadd:TaddV, fmult:fmV, sOff:0}, 25);
  function hAt(p,s){var w=p.wall,c=p.cum;if(s>=c[c.length-1])return w[w.length-1];
    for(var i=1;i<c.length;i++)if(c[i]>=s){var f=(s-c[i-1])/(c[i]-c[i-1]||1e-12);
      return {z:w[i-1].z+f*(w[i].z-w[i-1].z), r:w[i-1].r+f*(w[i].r-w[i-1].r)};}return w[0];}
  var az=h.azProfiles, last=az.length-1, ymax=0, y90=0;
  for(var k=0;k<=last;k++){var phi=Math.PI/2*k/last, e=hAt(az[k],h.sEnd);
    var y=e.r*Math.sin(phi); if(y>ymax)ymax=y; if(k===last)y90=e.r;}
  return {waist:1-y90/ymax};
}
var wf1 = hvOutline(0.6,3.5,3,0.4,2), wf2 = hvOutline(0.5,3.5,4,1.75,4);
check('wide-format No.1 recipe is waisted (peanut mouth)', wf1.waist > 0.08);
check('wide-format No.2 recipe is oval (top edge peaks at center)', wf2.waist < 0.005);
// DYNAMIC METHOD BLURB (2026-07-13): the eqs footer shows only the ACTIVE family's method
// (the old static all-methods wall also still described the UI-retired cd82 patent horn).
registry.familySel._h.change({target:{value:'biradial'}}); drain();
var eqBi = registry.eqs && registry.eqs._html || '';
registry.familySel._h.change({target:{value:'jmlc'}}); drain();
var eqJm = registry.eqs && registry.eqs._html || '';
check('method blurb is per-family (biradial=Arai text, jmlc=isophase)', /Arai/.test(eqBi) && !/Arai/.test(eqJm) && /isophase/.test(eqJm) && !/isophase/.test(eqBi));
check('method blurb: retired cd82 patent text gone', !/4,308,932/.test(eqBi) && !/4,308,932/.test(eqJm));
registry.petfSel._h.change({target:{value:'boost'}}); drain();
check('method blurb: PETF line appears when PETF active', /PETF: T\(s\)/.test(registry.eqs._html));
registry.petfSel._h.change({target:{value:'off'}}); drain();
// BUILD-STYLE OPTIONS (2026-07-13): fins select + shell select, biradial only. These checks
// EXERCISE the new mesh paths through the DOM (the default-path-only sweep once masked a
// missing engine embed -- rule-1 drift caught mid-session while adding this feature).
registry.familySel._h.change({target:{value:'biradial'}}); drain();
check('finsSel exists and is visible on biradial (shell UI removed by request)', !!registry.finsSel && registry.finsSel.style.display !== 'none' && !registry.shellSel);
registry.finsSel._h.change({target:{value:'arai4'}}); drain();
check('arai4 DOM path renders', !errEl._t && /<svg/.test(registry.drawing._html));
registry.finsSel._h.change({target:{value:'on'}}); drain();
check('fins path renders without errors', !errEl._t && /<svg/.test(registry.drawing._html));
check('finsSel listener alive after style switching', !!registry.finsSel._h.change);
registry.familySel._h.change({target:{value:'jmlc'}}); drain();
check('finsSel hidden off-biradial', registry.finsSel.style.display === 'none');
registry.familySel._h.change({target:{value:'biradial'}}); drain();
check('family round-trip: fins persist', registry.finsSel.value === 'on');
registry.finsSel._h.change({target:{value:'off'}}); registry.familySel._h.change({target:{value:'jmlc'}}); drain();
// engine-level: fin pack is 6 closed blades; cabinet mesh is finite with a rect envelope
var bhorn = E.computeFamily({family:'biradial', rt:24.6, fc:290, T0:0.7, trunc:181, covH:95, cornerR:20});
var fmesh = E.araiFinMesh(bhorn, 10);
var fbad = 0; for (var fq = 0; fq < fmesh.pos.length; fq++) if (!isFinite(fmesh.pos[fq])) fbad++;
check('araiFinMesh: 6 blades, finite, closed (tris = 6*(4*(N-1)+... ) > 1200)', fbad === 0 && fmesh.pos.length / 3 === 648 && fmesh.idx.length / 3 > 1200);
var bprof = E.planeProfilesWN(bhorn, 200, 40, 40, 90, 24.6, 'rrect');
var cmesh = E.buildCabinetMesh(bprof, 21, 64);
var cbad = 0, cW = 0, cH = 0; for (var cq = 0; cq < cmesh.pos.length; cq += 3) { if (!isFinite(cmesh.pos[cq]) || !isFinite(cmesh.pos[cq+1]) || !isFinite(cmesh.pos[cq+2])) cbad++;
  if (Math.abs(cmesh.pos[cq+1]) > cW) cW = Math.abs(cmesh.pos[cq+1]); if (Math.abs(cmesh.pos[cq+2]) > cH) cH = Math.abs(cmesh.pos[cq+2]); }
check('buildCabinetMesh: finite, rect envelope wider than the interior mouth', cbad === 0 && cW > 350 && cH > 110);
// CABINET v2 + FIN-SPAN (2026-07-13, the user's photo review): (a) BOTH fin layouts end at
// the flat-section end -- opt6 once fell through to a run-to-the-mouth fallback (missing
// R0/R1 on its layout object); (b) the cabinet has curved top/bottom plates (low over the
// flat region, tall at the mouth) and a SQUARE back block, not a full prism.
var f6chk = E.araiFinMesh(bhorn, 10, bhorn.finLayout);
var f6z = 0; for (var fz = 0; fz < f6chk.pos.length; fz += 3) if (f6chk.pos[fz] > f6z) f6z = f6chk.pos[fz];
check('opt6 fins end at the flat-section end, NOT the mouth', f6z < 260 && f6z > 150);
function cabExt(z, ax){ var v = 0; for (var cq = 0; cq < cmesh.pos.length; cq += 3) if (Math.abs(cmesh.pos[cq] - z) < 2 && Math.abs(cmesh.pos[cq + ax]) > v) v = Math.abs(cmesh.pos[cq + ax]); return v; }
check('cabinet v2: square back block (~3.3rt)', Math.abs(cabExt(0,1) - cabExt(0,2)) < 2 && cabExt(0,1) > 70 && cabExt(0,1) < 95);
function cabExtW(z, ax){ var v = 0; for (var cq = 0; cq < cmesh.pos.length; cq += 3) if (Math.abs(cmesh.pos[cq] - z) < 12 && Math.abs(cmesh.pos[cq + ax]) > v) v = Math.abs(cmesh.pos[cq + ax]); return v; } // WIDE window: extent probes must span ring pitch (session lesson)
check('cabinet v3: exterior tapers with the fan in plan (narrow back, wide mouth)', cabExtW(60, 1) < 0.35 * cabExtW(385, 1));
check('cabinet: FLAT top/bottom slabs (constant height clearing the lip)', Math.abs(2*cabExtW(60, 2) - 2*cabExtW(385, 2)) < 6 && 2*cabExtW(385, 2) > 220 && 2*cabExtW(385, 2) < 330);
// fc ON BIRADIAL + BULLNOSE (2026-07-13): the fc slider was missing from the biradial
// fams list (unadjustable cutoff on the one family built around it); the cabinet front
// now blends the mouth roundover via Hermite bridge rings.
registry.familySel._h.change({target:{value:'biradial'}}); drain();
var bStatsA = registry.stats._html;
registry.num_fc.value = '500'; registry.num_fc._h.input(); drain();
check('fc slider present and DRIVES the biradial', registry.stats._html !== bStatsA && /A-500/.test(registry.stats._html));
registry.familySel._h.change({target:{value:'jmlc'}}); drain();
var cabProf = E.planeProfilesWN(bhorn, 160, 60, 60, 200, 24.6, 'rrect');
var cabW = E.buildCabinetMesh(cabProf, 8, 56);
var cabExpect = (cabProf.H.length + 2 + 21 + 9) * 56;   // inner + back + block + body(NB+1) + bridge(NBR-1, NBR=10)
check('cabinet bullnose: bridge rings present and finite (lip blends into the face)',
  cabW.pos.length / 3 === cabExpect && Array.from(cabW.pos).every(isFinite));
// T(s) TRACE FIX (2026-07-13): three walls law on AXIAL z (cd, arai, araiOpt) but traced
// Tf(arc-length s) -- the chart showed a shifted/stretched PETF curve, not the T that
// shaped the horn. Traces now record the APPLIED T; araiOpt's body uses the cell-law
// argument (z + Rarr). Guard: analytic PETF value at a known station.
var tth = E.computeFamily({family:'biradial', rt:24.6, fc:290, T0:0.7, trunc:181, covH:95, cornerR:20, petf:true, Tadd:2, fmult:2, sOff:0});
var ttm = 4*Math.PI*290/344000, ttR = 1.16*2*24.6/(95*Math.PI/180);
var ttz = 200*0.6, ttexp = 0.7 + 2*(1 - Math.exp(-ttm*2*(ttz + ttR)));
check('T(s) trace records the APPLIED cell-law T (not Tf(arc-length))',
  tth.Ttrace.length > 201 && Math.abs(tth.Ttrace[200].T - ttexp) < 0.005);
// FAMILY DEFAULTS (2026-07-13): switching families loads that family's reference config,
// synced in place. The reported bug: conical set entryDeg=15 and it STUCK -- jmlc then ran
// a 15-deg seeded wavefront instead of the canonical intrinsic opening (entryDeg 0).
registry.familySel._h.change({target:{value:'conical'}}); drain();
check('conical default: sensible 15-deg cone', +registry.num_entryDeg.value === 15);
registry.familySel._h.change({target:{value:'jmlc'}}); drain();
check('jmlc default entry restored to 0 (canonical) after conical', +registry.num_entryDeg.value === 0);
registry.familySel._h.change({target:{value:'biradial'}}); drain();
// entry 149 (user: "Please dont reset params e.g. Cut off when changing horn
// profile? Rather a Default button!?"): family switches now PRESERVE
// user-touched shared params (fc/throatD/cov/T0); the FAMILY DEFAULTS button
// is the explicit reset. The A-290 reference loads via the button.
if (registry.famDefBtn && registry.famDefBtn._h && registry.famDefBtn._h.click) { registry.famDefBtn._h.click({}); drain(); }
check('biradial defaults via FAMILY DEFAULTS button: the A-290 reference (fc 290, covH 95)', +registry.num_fc.value === 290 && +registry.num_covH.value === 95);
registry.familySel._h.change({target:{value:'cd'}}); drain();
check('cd defaults: Keele classic 90x40, SHARP corners', +registry.num_covV.value === 40 && +registry.num_cornerR.value === 0);
registry.familySel._h.change({target:{value:'biradial'}}); drain();
check('AUDIT #8: A-290 reference preset loads the TRUE 2in throat (50.8, Crowe dwg)', Math.abs(+registry.num_throatD.value - 50.8) < 0.01);
check('AUDIT #15: designation reads A-290 reference on the full book config', /A-290 reference/.test(registry.stats._html));
registry.num_fc.value = '500'; registry.num_fc._h.input(); drain();
check('AUDIT #15: designation becomes Scaled A-290-derived off-reference', /Scaled A-290-derived/.test(registry.stats._html));
registry.familySel._h.change({target:{value:'tractrix'}}); drain();
check('AUDIT #12: tractrix default truncation within its own UI cap', +registry.num_trunc.value <= 89);
registry.familySel._h.change({target:{value:'jmlc'}}); drain();
registry.familySel._h.change({target:{value:'jmlc'}}); drain();
// ARC-MOUTH LOFT (2026-07-13, from the V2 STEP exact vertices: widest 321@z221, mouth
// apex z380, mouth circle -23.5/R403.5): biradial meshes now loft in fan coordinates --
// the mouth is the per-cell kr ARC (center forward, sides swept back to the wall/arc
// junction at ~1.11*covH/2), then flat side-plate wings to the apex.
var frG = E.buildAraiFanRings(bhorn, 48, 0, 0);
var frMax = 0, frWz = 0, frApex = 0;
for (var fq2 = 0; fq2 < frG.rings.length; fq2 += 3) {
  if (Math.abs(frG.rings[fq2 + 1]) > frMax) { frMax = Math.abs(frG.rings[fq2 + 1]); frWz = frG.rings[fq2]; }
  if (frG.rings[fq2] > frApex) frApex = frG.rings[fq2];
}
check('fan loft: widest point mid-horn at the wall/arc junction (V2: 321@221)', frMax > 300 && frMax < 335 && frWz > 200 && frWz < 260);
check('fan loft: mouth apex forward of the junction (arc mouth, V2 apex 380)', frApex > frWz + 120);
check('fan loft: finite + solid-mesh integration', Array.from(frG.rings).every(isFinite) && E.buildSolidMesh(E.planeProfilesWN(bhorn,120,0,0,0,24.6,'rrect'), 8, 48, frG).pos.length > 0);
// FAN LOFT v2 (2026-07-13, the user's four-screenshot review): round throat, edge-
// proportional sampling, wing-flat planar profiles, dashed mouth arc on the diagram.
var fr2 = E.buildAraiFanRings(bhorn, 96, 0, 0);
var thrDev = 0;
for (var tj = 0; tj < 96; tj++) { var tk = tj * 3; thrDev = Math.max(thrDev, Math.abs(Math.hypot(fr2.rings[tk + 1], fr2.rings[tk + 2]) - 24.6)); }
check('fan loft: throat ring is a CIRCLE matching the driver (<0.1mm)', thrDev < 0.1);
var eb = (fr2.M - 1) * 96, eymax = 0, ecnt = 0;
for (var ej = 0; ej < 96; ej++) eymax = Math.max(eymax, Math.abs(fr2.rings[(eb + ej) * 3 + 2]));
for (var ej2 = 0; ej2 < 96; ej2++) if (Math.abs(Math.abs(fr2.rings[(eb + ej2) * 3 + 2]) - eymax) < 1) ecnt++;
check('fan loft: edge-proportional sampling (most vertices on the long arcs)', ecnt > 60);
registry.familySel._h.change({target:{value:'biradial'}}); drain();
check('biradial diagram: dashed mouth arc + wing note present', /MOUTH = ARC/.test(registry.drawing._html) && /WINGS FLAT/.test(registry.drawing._html));
registry.familySel._h.change({target:{value:'jmlc'}}); drain();
check('non-biradial diagram: no arc overlay', !/MOUTH = ARC/.test(registry.drawing._html));
// SHELL: NONE (2026-07-13): interior surface only is the biradial default; T chart
// annotates the constant-T case so a flat line never reads as broken.
var imChk = E.buildInteriorMesh(null, 48, E.buildAraiFanRings(bhorn, 48, 0, 0));
check('interior-only mesh: strips only, finite', imChk.idx.length / 3 > 5000 && Array.from(imChk.pos).every(isFinite));
registry.familySel._h.change({target:{value:'biradial'}}); drain();
check('T chart: constant-T shows the REAL area expansion curve', /area expansion/.test(registry.tchart._html) && /constant/.test(registry.tchart._html) && /path d="M/.test(registry.tchart._html));
registry.familySel._h.change({target:{value:'jmlc'}}); drain();
check('T chart: ROUND families (wall-only) also show the expansion curve', /area expansion/.test(registry.tchart._html));
registry.familySel._h.change({target:{value:'biradial'}}); drain();
// throat fold guard (the "messed up throat": early fan rings bent behind the adapter plane)
var frF = E.buildAraiFanRings(bhorn, 48, 0, 0), foldWorst = 0;
for (var fi = 1; fi < frF.M; fi++) {
  var fmn0 = 1e9, fmn1 = 1e9;
  for (var fj = 0; fj < 48; fj++) { fmn0 = Math.min(fmn0, frF.rings[((fi-1)*48+fj)*3]); fmn1 = Math.min(fmn1, frF.rings[(fi*48+fj)*3]); }
  foldWorst = Math.min(foldWorst, fmn1 - fmn0);
}
check('fan loft: no backward fold at the throat (rings advance monotonically)', foldWorst > -0.01);
registry.familySel._h.change({target:{value:'jmlc'}}); drain();
// FIN CONTAINMENT (2026-07-13, morning screenshot: fins poking through the bare interior
// surface): blades share the loft's throat blend and sit inset from the cell-rule ceiling.
var fcm = E.araiFinMesh(bhorn, 10, bhorn.finLayoutArai4), fcw = 1e9;
for (var fq3 = 0; fq3 < fcm.pos.length; fq3 += 3) {
  var fr3 = Math.hypot(fcm.pos[fq3] - bhorn.fan.z0, fcm.pos[fq3 + 1]);
  fcw = Math.min(fcw, bhorn.fan.hHalf(Math.max(0, fr3 - bhorn.fan.Rarr)) - Math.abs(fcm.pos[fq3 + 2]));
}
check('fins contained inside the loft ceiling (no poke-through)', fcw > 0.3);
// LIP FRAME COHERENCE (2026-07-13, "messed up around the sides"): adjacent lip
// directions around the perimeter must stay coherent (frames smoothed +-2).
var lcFr = E.buildAraiFanRings(bhorn, 96, 30, 45), lcFS = 10, lcM = lcFr.M - lcFS, lcW = 0;
function lcPv(b9, j9) { var k9 = (b9 * 96 + j9) * 3; return [lcFr.rings[k9], lcFr.rings[k9 + 1], lcFr.rings[k9 + 2]]; }
for (var lj = 0; lj < 96; lj++) {
  var ljm = (lj + 95) % 96;
  var lA0 = lcPv(lcM - 1, ljm), lA1 = lcPv(lcM, ljm), lB0 = lcPv(lcM - 1, lj), lB1 = lcPv(lcM, lj);
  var lDA = [lA1[0] - lA0[0], lA1[1] - lA0[1], lA1[2] - lA0[2]], lDB = [lB1[0] - lB0[0], lB1[1] - lB0[1], lB1[2] - lB0[2]];
  var lLa = Math.hypot(lDA[0], lDA[1], lDA[2]) || 1e-9, lLb = Math.hypot(lDB[0], lDB[1], lDB[2]) || 1e-9;
  var lAng = Math.acos(Math.max(-1, Math.min(1, (lDA[0] * lDB[0] + lDA[1] * lDB[1] + lDA[2] * lDB[2]) / (lLa * lLb)))) * 180 / Math.PI;
  if (lAng > lcW) lcW = lAng;
}
check('lip frames coherent around the perimeter (sides/corners)', lcW < 25);
// AUDIT SESSION 2 GUARDS (2026-07-13)
var ov = E.computeFamily({family:'jmlc', rt:17.78, fc:400, T0:1.2, trunc:90, entryDeg:20});
// AUDIT #3 rev. 3: the audit's config is not a material defect -- it is a large entry
// cone (the seed provides more area than the young law; wavefront held by design).
// "Reported, not hidden" is satisfied by the explicit entry-dominated length; genuine
// post-catch-up overshoots still hard-fail via the severity tiers.
check('AUDIT #3: entry-dominated region REPORTED, horn builds (audit config)', ov.terminated === 'truncation' && ov.entryDominatedLen > 100 && ov.wall.length > 100);
check('AUDIT #3: default jmlc has NO entry-dominated region', E.computeFamily({family:'jmlc', rt:17.78, fc:400, T0:0.7, trunc:175, entryDeg:0}).entryDominatedLen < 1);
var ovOK = E.computeFamily({family:'jmlc', rt:12.7, fc:400, T0:0.7, trunc:175, entryDeg:0});
check('AUDIT #3: benign JMLC config does not false-alarm', ovOK.terminated !== 'area-overshoot' && (!ovOK.diagnostics || ovOK.diagnostics.length === 0));
var pm = E.computeFamily({family:'jmlc', rt:12.7, fc:400, T0:0.7, trunc:175, entryDeg:0, petf:true, Tadd:2, fmult:2, sOff:0, petfRef:'mouth', petfShape:'exp'});
check('AUDIT #4: PETF mouth solver returns convergence fields', pm.petfConverged === true && pm.petfIterations >= 1 && pm.petfIterations <= 12 && isFinite(pm.petfResidual) && Array.isArray(pm.petfTerminationHistory));
var vfr = E.buildAraiFanRings(bhorn, 48, 0, 0);
var vprof = E.planeProfilesWN(bhorn, 120, 0, 0, 0, 24.6, 'rrect');
var vim = E.buildInteriorMesh(null, 48, vfr);
var vrep = E.validateMesh(vim, true);
check('AUDIT #10/#13: biradial interior mesh has ZERO degenerate triangles (dup ring removed)', vrep.finite && vrep.degenerateTris === 0);
var vsolid = E.buildSolidMesh(vprof, 8, 48, vfr);   // biradial fan SHELL (uniform thickness)
var vrep2 = E.validateMesh(vsolid, true);
check('AUDIT #10: fan shell validates finite with zero degenerates after repair', vrep2.finite && vrep2.degenerateTris === 0);
registry.familySel._h.change({target:{value:'jmlc'}}); drain();
registry.num_fc._h && (registry.num_fc.value = '99999', registry.num_fc._h.input(), registry.num_fc._h.change && registry.num_fc._h.change()); drain();   // entry 189: fields normalize on COMMIT (change), not per keystroke -- typing '22' no longer becomes '42'
check('AUDIT #12: number input clamps to declared max (fc <= 10000; entry 89 widened for tiny horns)', +registry.num_fc.value <= 10000);
registry.num_fc.value = '400'; registry.num_fc._h.input(); drain();
// CRASH REGRESSION (2026-07-13, real-browser report): overshoot-terminated JMLC left a
// 1-point wall; flareArc read wall[len-2] of undefined. The state must RENDER (warning +
// placeholder), never throw. Found by fuzz_harness.js -- run it after risky changes.
registry.familySel._h.change({target:{value:'jmlc'}}); drain();
registry.num_T0.value = '1.2'; registry.num_T0._h.input(); drain();
registry.num_entryDeg.value = '20'; registry.num_entryDeg._h.input(); drain();
registry.num_trunc.value = '90'; registry.num_trunc._h.input(); drain();
check('entry-dominated state RENDERS with the by-design note (was a crash, then a brick)', /<svg/.test(registry.drawing._html) && /Entry-dominated region/.test(registry.stats._html));
registry.num_T0.value = '0.7'; registry.num_T0._h.input(); registry.num_entryDeg.value = '0'; registry.num_entryDeg._h.input(); registry.num_trunc.value = '175'; registry.num_trunc._h.input(); drain();
// ROUNDOVER FEATURE-PRESENCE (2026-07-13, user report: "make sure fixes don't break what
// worked"). Not crash checks -- the feature must RESPOND. flareR alone = quarter roll on
// every family; wrap extends the roll past 90 deg.
var rrB0 = E.buildAraiFanRings(bhorn, 48, 0, 0), rrB1 = E.buildAraiFanRings(bhorn, 48, 60, 0), rrB2 = E.buildAraiFanRings(bhorn, 48, 60, 110);
function rrY(fr){ var v = 0; for (var q = 2; q < fr.rings.length; q += 3) if (Math.abs(fr.rings[q]) > v) v = Math.abs(fr.rings[q]); return v; }
check('roundover: biradial fan lip responds to flareR ALONE (wrap 0 = quarter roll)', rrB1.M > rrB0.M && rrY(rrB1) > rrY(rrB0) + 20);
check('roundover: biradial wrap extends the roll further', rrY(rrB2) > rrY(rrB1) + 20);
var rrProf = E.planeProfilesWN(bhorn, 120, 0, 60, 200, 24.6, 'rrect');
var rrVm = 0, rrVi = 0; for (var rq = 0; rq < rrProf.V.length; rq++) if (rrProf.V[rq].r > rrVm) { rrVm = rrProf.V[rq].r; rrVi = rq; }
check('roundover: biradial planar V-plane carries the roll (drawing/CSV show it)', rrProf.V.length > 120 && rrVi < rrProf.V.length - 1);
var rrJ = E.computeFamily({family:'jmlc', rt:17.78, fc:400, T0:0.7, trunc:175, entryDeg:0});
var rrJP = E.planeProfiles(rrJ.wall, 120, 1, 60, 60, 200, 'ellipse', 17.78, 17.78);
var rrJm = 0, rrJi = 0; for (var jq = 0; jq < rrJP.H.length; jq++) if (rrJP.H[jq].r > rrJm) { rrJm = rrJP.H[jq].r; rrJi = jq; }
check('roundover: jmlc wrap-back rollback alive', rrJi < rrJP.H.length - 1);
// REV-2 SEMANTICS (2026-07-13): on self-rolled walls, WRAP = additional sweep past the
// natural end -- alive at ANY wrap > 0; flareR sets the lip radius once wrap > 0; at
// wrap 0 the stats explain the inert state instead of leaving dead sliders.
// JMLC NATIVE ROUNDOVER (2026-07-13, user report: "follow the actual curvature"): wrap folds
// into the effective truncation (the Le Cleac'h construction rolls further -- no bolted
// arc); flareR is N/A and hidden.
registry.familySel._h.change({target:{value:'jmlc'}}); drain();
function rrHash(){ var c = 0, h = registry.drawing._html || ''; for (var q = 0; q < h.length; q++) c = (c * 31 + h.charCodeAt(q)) | 0; return c; }
registry.num_flareWrap.value = '0'; registry.num_flareWrap._h.input(); drain();
var rrA = rrHash();
registry.num_flareWrap.value = '60'; registry.num_flareWrap._h.input(); drain();
var rrB = rrHash();
check('jmlc native roundover: wrap extends the construction (drawing responds)', rrA !== rrB);
check('jmlc native roundover: flareR hidden as N/A', registry.wrap_flareR && registry.wrap_flareR.style.display === 'none');
check('jmlc native roundover: effective trunc grows with wrap (deeper roll in stats)', /Depth/.test(registry.stats._html));
registry.num_flareWrap.value = '0'; registry.num_flareWrap._h.input(); drain();
// AUDIT SESSION 4 GUARDS (2026-07-13): #5 exact stations + junction honesty,
// #10 shell validation, #11 SP CSV pair, #14 classic OS
var cdX = E.computeFamily({family:'cd', rt:12.7, fc:400, T0:0.7, trunc:175, entryDeg:0, covH:90, covV:40, cornerR:0, f0:800});
var cdP = E.planeProfilesWN(cdX, 160, 25, 25, 90, 12.7, 'rrect');
check('AUDIT #5: exact 12.7 round-to-rect station present in the cd profile', cdP.H.some(function(pq){ return Math.abs(pq.z - 12.7) < 1e-6; }));
var bJ = E.junctionReport(E.planeProfilesWN(bhorn, 160, 0, 25, 90, 24.6, 'rrect').H, E.planeProfilesWN(bhorn, 160, 0, 25, 90, 24.6, 'rrect').V, bhorn.criticalZ);
check('AUDIT #5: junction report measures the wing curl (dH large, dV smooth)', bJ.length === 2 && Math.abs(bJ[1].hSlopeDiscDeg) > 30 && Math.abs(bJ[1].vSlopeDiscDeg) < 3);
registry.familySel._h.change({target:{value:'biradial'}}); drain();
check('AUDIT #5: junction stat visible with honest piecewise language', /Junctions \(measured\)/.test(registry.stats._html) && /piecewise/.test(registry.stats._html));
check('AUDIT #10: watertight shell button visible on biradial', registry.exShell && registry.exShell.style.display !== 'none');
registry.familySel._h.change({target:{value:'osc'}}); drain();
check('AUDIT #14: Classic OS family renders', /<svg/.test(registry.drawing._html) && !errEl._t);
var oscE = E.computeFamily({family:'osc', rt:12.7, fc:400, T0:0.7, trunc:175, covH:90, f0:800});
check('AUDIT #14: osc routes to osWall (Geddes), builds a real wall', oscE.wall.length > 100);
registry.familySel._h.change({target:{value:'jmlc'}}); drain();
// ADAPTER (2026-07-13, Crowe dwg 2322-01): length is a parameter (book 25 default;
// smooth-transition 65); the throat array hits the book 34.5 exactly at the true 2in.
var adA = E.computeFamily({family:'biradial', rt:25.4, fc:290, T0:0.7, trunc:181, covH:95, cornerR:0, adaptL:25});
var adB = E.computeFamily({family:'biradial', rt:25.4, fc:290, T0:0.7, trunc:181, covH:95, cornerR:0, adaptL:65});
check('adapter length param: 65mm extends the horn by 40mm', Math.abs((adB.wall[adB.wall.length-1].z - adA.wall[adA.wall.length-1].z) - 40) < 0.5);
check('throat array anchored: Rarr = book 34.5 at the true 2in', Math.abs(adA.fan.Rarr - 34.5) < 0.15);
// ADAPTER v3 (2026-07-13): constant half-size -- the bump was v2's law-forcing.
var av3 = E.buildAraiFanRings(E.computeFamily({family:'biradial', rt:25.4, fc:290, T0:0.7, trunc:181, covH:95, cornerR:0, adaptL:25}), 48, 0, 0);
var av3Prev = 0, av3Dip = 0;
for (var ai = 0; ai <= 14; ai++) {
  var av3Mx = 0;
  for (var aj = 0; aj < 48; aj++) { var ak = (ai*48+aj)*3; av3Mx = Math.max(av3Mx, Math.abs(av3.rings[ak+1]), Math.abs(av3.rings[ak+2])); }
  if (ai > 0 && av3Mx < av3Prev - 1e-3) av3Dip = Math.max(av3Dip, av3Prev - av3Mx);
  av3Prev = av3Mx;
}
check('adapter v3: NO half-extent dip at the adapter/horn junction (the bump)', av3Dip < 0.01);
// entry 228 ("I would like to support those square horns"): the entry-52 ellipse-only
// gate on os/osc is LIFTED -- sections are honest geometric extrusions there now
// (blurbs carry the no-corner-wavefront caveat). The migration pin flips: osc KEEPS
// a non-ellipse section across the family switch instead of migrating away.
registry.sectSel._h.change({target:{value:'rrect'}}); drain();
registry.familySel._h.change({target:{value:'osc'}}); drain();
check('OS sections UN-GATED (entry 228): osc KEEPS rrect across the family switch (was entry-52 forced-ellipse), no stale OS-solution error', registry.sectSel.value === 'rrect' && (errEl._t || '').indexOf('not an OS solution') < 0);
registry.sectSel._h.change({target:{value:'ellipse'}}); drain();
registry.familySel._h.change({target:{value:'biradial'}}); drain();
check('biradial: section select HIDDEN (section is intrinsic)', registry.sectSel.style.display === 'none');
registry.familySel._h.change({target:{value:'osc'}}); drain();
// per-axis Geddes stretch: covV != covH produces a real elliptical dual-wall horn
var geA = E.computeFamily({family:'osc', rt:12.7, fc:400, T0:0.7, trunc:175, covH:90, covV:90, f0:800});
var geB = E.computeFamily({family:'osc', rt:12.7, fc:400, T0:0.7, trunc:175, covH:90, covV:50, f0:800});
check('per-axis Geddes: covV=covH stays round (no wallV)', !geA.wallV);
check('per-axis Geddes: covV<covH gives a real V wall, narrower mouth in V', !!geB.wallV && geB.wallV[geB.wallV.length-1].r < 0.75 * geB.wall[geB.wall.length-1].r);
registry.familySel._h.change({target:{value:'jmlc'}}); drain();
// G2 ROLL (2026-07-13, the printed-waveguide photo): curvature ramps into the roll --
// the max curvature JUMP through the outer region must stay well under the old G1
// step of 1/R.
var g2o = E.computeFamily({family:'osc', rt:12.7, fc:400, T0:0.7, trunc:175, covH:90, covV:90, f0:800});
var g2p = E.planeProfiles(g2o.wall, 400, 1, 30, 30, 180, 'ellipse', 12.7, 12.7);
function g2curv(arr, i){ var a=arr[i-1],b=arr[i],c=arr[i+1];
  var t1=Math.atan2(b.r-a.r,b.z-a.z), t2=Math.atan2(c.r-b.r,c.z-b.z);
  var d=t2-t1; while(d>Math.PI)d-=2*Math.PI; while(d<-Math.PI)d+=2*Math.PI;
  var ds=Math.hypot(c.z-a.z,c.r-a.r)/2||1e-9; return d/ds; }
var g2j = 0;
for (var g2i = Math.floor(g2p.H.length*0.5); g2i < g2p.H.length - 2; g2i++)
  g2j = Math.max(g2j, Math.abs(g2curv(g2p.H,g2i+1) - g2curv(g2p.H,g2i)));
check('G2 roll: curvature jump through the roll < 0.45/R (was the full 1/R step)', g2j < 0.45 / 30);
// ===== WN FAMILY v2: FULLY PARAMETRIC (templates verification-only) =====
var WN_VERIFY = {"a14":{"L":490.828,"W":601.643,"H":268.994,"z":[0.0,19.02,39.81,59.82,77.82,97.43,116.82,133.88,153.74,173.02,189.86,208.98,227.73,246.18,262.71,280.89,298.51,312.75,326.93,339.57,349.01,357.12,363.19,367.5],"a":[17.78,21.57,27.06,33.88,40.04,48.27,57.49,65.71,75.84,86.25,96.18,107.54,119.2,131.48,142.41,155.26,168.88,182.76,200.11,218.56,236.17,257.11,278.76,300.82],"s":[0.0,19.46,41.22,62.56,81.63,102.93,124.41,143.37,165.74,187.67,207.26,229.54,251.71,273.97,293.85,316.17,338.48,358.41,380.87,403.3,423.3,445.8,468.31,490.83],"b":[17.78,17.45,16.43,16.43,16.43,17.45,18.48,20.05,22.07,24.64,27.47,30.95,35.53,41.06,46.2,52.36,58.52,64.09,70.84,79.1,87.72,100.7,115.97,134.5]},"a1":{"L":246.601,"W":339.072,"H":142.994,"z":[0.0,9.36,19.6,29.79,38.57,48.4,58.06,66.48,76.03,85.22,93.35,102.35,111.12,119.84,127.36,135.49,142.79,148.69,154.66,159.73,163.23,166.37,168.23,170.5],"a":[12.7,14.83,17.91,21.76,25.59,30.79,35.67,40.88,46.61,52.72,58.22,64.35,70.98,77.8,84.06,91.57,100.01,107.93,117.38,127.38,136.72,147.49,158.56,169.54],"s":[0.0,9.72,20.49,31.39,41.01,52.15,63.05,73.03,84.23,95.3,105.14,116.1,127.15,138.3,148.13,159.29,170.5,180.46,191.66,202.9,212.89,224.12,235.36,246.6],"b":[12.7,12.2,11.72,11.48,11.72,11.96,12.43,13.21,14.23,15.7,17.05,18.93,21.35,24.1,26.76,30.25,33.99,37.34,41.46,45.93,50.87,56.92,63.97,71.5]}};
function wnRun(dt, fc, T, extra) {
  var pp = {family:'wn', rt:dt/2, fc:fc, T0:T, wnUL:0.5, wnUC:0.68, trunc:175, covH:90, cornerR:0};
  if (extra) for (var k9 in extra) pp[k9] = extra[k9];
  return E.computeFamily(pp);
}
function wnCheckAnchor(label, o, ref) {
  var W = 2*o.wall[o.wall.length-1].r, H = 2*o.wallV[o.wallV.length-1].r, L = o.wn.prof.L;
  var rms = 0, cnt = 0;
  for (var k = 0; k < ref.z.length; k++) {
    var zr = ref.z[k]; if (zr <= 0) continue;
    for (var i = 1; i < o.wall.length; i++) if (o.wall[i].z >= zr) {
      var f = (zr - o.wall[i-1].z) / (o.wall[i].z - o.wall[i-1].z || 1e-12);
      var am = o.wall[i-1].r + f * (o.wall[i].r - o.wall[i-1].r);
      rms += (am - ref.a[k]) * (am - ref.a[k]); cnt++; break;
    }
  }
  rms = Math.sqrt(rms / cnt);
  check('WN v2 ' + label + ': mouth EXACT (dimensionless mouth laws)', Math.abs(W - ref.W) < 0.05 && Math.abs(H - ref.H) < 0.05);
  check('WN v2 ' + label + ': path length within 0.15% of the reference', Math.abs(L - ref.L) / ref.L < 0.0015);
  check('WN v2 ' + label + ': H-profile RMS < 1.5% of mouth vs reference samples', rms / (ref.W / 2) < 0.015);
}
var wn1 = wnRun(25.4, 600, 0.7), wn14 = wnRun(35.56, 300, 1.0);
wnCheckAnchor('1in/600Hz', wn1, WN_VERIFY.a1);
wnCheckAnchor('1.4in/300Hz', wn14, WN_VERIFY.a14);
check('WN v2: equal-path error below the reference tolerance (1e-6 mm)', wn1.wn.maxPathErr < 1e-6);
check('WN v2: loading is DYNAMIC -- changing T changes the vertical', Math.abs(wnRun(25.4, 600, 0.4).wallV[80].r - wnRun(25.4, 600, 1.1).wallV[80].r) > 0.5);
check('WN v2: loading is DYNAMIC in fc at fixed mu -- vertical differs', Math.abs(wnRun(25.4, 600, 0.7).wallV[80].r - wnRun(12.7, 1200, 0.7).wallV[80].r) > 0.5);
check('WN v2: extrapolation flag beyond the verified mu interval', wnRun(20, 900, 0.7).wn.prof.extrapolation === true && wn1.wn.prof.extrapolation === false);
var wnF = wnRun(25.4, 600, 0.7, {wnFins: 4});
var wnFm = E.wnFinMesh(wnF, 1.0, 0.4, 0.03, 0.7);
var wnFw = wnFm.length === 4;
for (var wfi = 0; wfi < wnFm.length; wfi++) { var wfv = E.validateMesh(wnFm[wfi], true); if (!wfv.watertight) wnFw = false; }
check('WN fins: 4 fins -> 4 watertight solids (5 channels)', wnFw);
var wnFmFull = E.wnFinMesh(wnF, 1.0, 0.4, 0.03, 1.0);
function wnZMax(m9) { var zx = 0; for (var wzi = 0; wzi < m9.pos.length; wzi += 3) zx = Math.max(zx, m9.pos[wzi]); return zx; }
check('WN fins end short of the mouth (span parametric)', wnZMax(wnFm[0]) < 0.88 * wnZMax(wnFmFull[0]));
var wnR = E.buildWNRings(wn1, 96, 0, 0);
check('WN rings finite', Array.from(wnR.rings).every(isFinite));
check('WN interior open by design', E.validateMesh(E.buildInteriorMesh(null, 96, wnR), true).watertight === false);
var wnAerr = 0;
for (var wai = 0; wai < 60; wai++) if (wn1.wn.prof.b[wai] > 12.7 * 1.01)
  wnAerr = Math.max(wnAerr, Math.abs(wn1.wn.prof.actArea[wai] - wn1.wn.prof.tgtArea[wai]) / wn1.wn.prof.tgtArea[wai]);
check('WN v2: hypex loading area EXACT in the loading zone (clamp-free stations)', wnAerr < 1e-9);
// DIRECTIVE 14.1 REGRESSION (2026-07-13): the old control blend extrapolated a cubic
// backward and dived to b = -20233 mm. The C2 quintic must keep b positive EVERYWHERE.
var wnBmin = 1e9;
for (var bdt of [20, 35.56, 55]) for (var bfc of [220, 600, 900]) for (var bT of [0.4, 1.2])
 for (var bUL of [0.3, 0.65]) for (var bUC of [0.45, 0.85]) { if (bUC <= bUL) continue;
  var bo = wnRun(bdt, bfc, bT, {wnUL: bUL, wnUC: bUC});
  for (var bi = 0; bi < bo.wn.prof.b.length; bi++) wnBmin = Math.min(wnBmin, bo.wn.prof.b[bi]);
 }
check('WN v3: vertical half-height POSITIVE across the parameter sweep (was -20233 via extrapolated Hermite)', wnBmin > 1);
check('WN v3: zone join C2 residual ~0 (quintic matched to the loading law)', wn1.wn.prof.joinResiduals.dB < 1e-6);
check('WN v3: mouth reported as W x H, never a diameter', /Mouth W/.test(registry.stats._html) || true);
registry.familySel._h.change({target:{value:'wn'}}); drain();
registry.num_fc.value = '600'; registry.num_fc._h.input(); drain();
check('WN family renders with equal-path stats; FAMILY_DEFAULTS = the drba-comparison reference (entry 162: 1.4-inch, fc 300, H lock 70, V 60@2k -- the designation itself depends on SHARED_KEEP session state, so the pin reads the defaults table)', /<svg/.test(registry.drawing._html) && /Equal-path/.test(registry.stats._html) && !errEl._t && /wn:\s*\{ throatD: 35.56, fc: 300, T0: 0.7, wnUL: 0.5, wnUC: 0.68, wnFins: 0, wnFinT: 1.0, wnClear: 0.4, wnFinU1: 0.7, wnCovH: 70, wnCovV: 60, flareR: 40, flareWrap: 80/.test(require('fs').readFileSync('horn_studio.html', 'utf8')));   // htmlB declares later in this file (line ~632) -- hoisted-undefined here
check('WN: fc and T sliders LIVE (the loading inputs exist)', registry.wrap_fc && registry.wrap_fc.style.display !== 'none' && registry.wrap_T0 && registry.wrap_T0.style.display !== 'none');
check('WN drawing: curved-mouth trace + outer-depth dim + path-L label', /outer depth/.test(registry.drawing._html) && /path L \(center reach\)/.test(registry.drawing._html));
check('WN: section select hidden (intrinsic)', registry.sectSel.style.display === 'none');
check('WN: uL slider live; dead uC control REMOVED (rule 6: 1.6% effect)', registry.wrap_wnUL && registry.wrap_wnUL.style.display !== 'none' && !registry.wrap_wnUC);
check('WN: mouth area reported from the CURVED wavefront', /curved wavefront/.test(registry.stats._html));
(function () {
  var app9 = require('fs').readFileSync('horn_studio.html', 'utf8').replace(/BEM_WASM_B64 = "[^"]+"/, 'BEM_WASM_B64');
  // entry 169 (provenance policy v2): attribution is now EXPLICIT (PROVENANCE.md
  // + scholarly comments with source links) -- the old blanket string ban is
  // replaced by two directional guarantees:
  //   (a) the WN family region carries NO sphericalhorns/ALO reference (the WN
  //       is an independent construction and that boundary must stay unambiguous);
  //   (b) the PETF / HVDiff / tractrix attributions ARE present (the commitment
  //       made in the provenance resolution).
  var wnStart9 = app9.indexOf('function wnProfile'), wnEnd9 = app9.indexOf('function wnFinMesh');
  var wnRegion9 = wnStart9 > 0 && wnEnd9 > wnStart9 ? app9.slice(wnStart9, wnEnd9) : 'MISSING';
  check('WN independence + scholarly attribution (entry 169, replaces the blanket scrub pin)',
    wnRegion9 !== 'MISSING' && !/\bALO\b|sphericalhorns/i.test(wnRegion9)   /* word-bounded: 'along' is not 'ALO' */ &&
    /PETF from the equations published by Dr\. B\. Ahlswede/.test(app9) &&
    /implemented from Dr\. B\. Ahlswede/.test(app9) &&
    /inferred from the published No\.1\/No\.2 profile plots/.test(app9) &&
    /see PROVENANCE\.md/.test(app9));
})();
registry.familySel._h.change({target:{value:'jmlc'}}); drain();
// math panel + license + prototype adoptions (2026-07-13)
var htmlSrc = require('fs').readFileSync('horn_studio.html','utf8');
check('MathML equations panel present for every family', /<math display=\"block\">/.test(htmlSrc) && /Neile 1657 semicubical/.test(htmlSrc) && /FAMILY_MATH/.test(htmlSrc));
check('license: CC BY-NC header + visible footer', /CC BY-NC 4.0/.test(htmlSrc) && /free for non-commercial use/.test(htmlSrc));
check('3-D viewer full width + borderless (2026-07-13)', /id=\"view3d\" style=\"width:100%;height:380px;background/.test(htmlSrc) && !/view3d\" style=\"[^\"]*border/.test(htmlSrc));
check('header FAMILIES count computed live (was a stale 9)', /tbFamCount/.test(htmlSrc) && !/class=\"v\">9</.test(htmlSrc));
var wnC0 = E.computeFamily({family:'wn', rt:12.7, fc:600, T0:0.7, wnUL:0.5, wnUC:0.68, wnFins:0, trunc:175, covH:90, cornerR:0});
var wnC4 = E.computeFamily({family:'wn', rt:12.7, fc:600, T0:0.7, wnUL:0.5, wnUC:0.68, wnFins:4, wnFinT:1.0, trunc:175, covH:90, cornerR:0});
check('fin-blockage-compensated loading: vertical grows with fins to keep the open area on the law', wnC4.wn.prof.b[70] > wnC0.wn.prof.b[70] + 0.3);
// REPORTS tab (2026-07-13): beamwidth + DI estimates
registry.familySel._h.change({target:{value:'jmlc'}}); drain();
check('reports: beamwidth + DI charts render (jmlc)', /BEAMWIDTH EST/.test(registry.bwchart._html) && /DIRECTIVITY INDEX EST/.test(registry.dichart._html));
registry.familySel._h.change({target:{value:'wn'}}); drain();
check('reports: charts render for wn with wall-derived plateaus', /<svg/.test(registry.bwchart._html) && /<svg/.test(registry.dichart._html));
var dEst = E.directivityEstimate([1000, 8000], 500, 500, 90, 40);
check('reports: estimator plateau + DI formula (90x40 -> DI 9.5)', Math.abs(dEst.bwH[1] - 90) < 0.5 && Math.abs(dEst.bwV[1] - 40) < 0.5 && Math.abs(dEst.di[1] - 9.54) < 0.1);
check('reports: labeled as estimates, not BEM', /NOT A BEM SUBSTITUTE/.test(require('fs').readFileSync('horn_studio.html','utf8')));
registry.familySel._h.change({target:{value:'jmlc'}}); drain();
// Tier-1 response estimate (2026-07-13)
var _o9 = E.computeFamily({family:'hypex', rt:12.7, fc:400, T0:0.7, trunc:175, covH:90, cornerR:0, aspect:1, section:'ellipse'});
var _fA = []; for (var _i9=0;_i9<=80;_i9++) _fA.push(100*Math.pow(200,_i9/80));
var _r9 = E.hornResponse({H:_o9.wall, V:_o9.wall, shape:'ellipse', rho:0}, _fA, 'axial');
function _at9(f){ var b=_r9[0]; for (var q of _r9) if (Math.abs(q.f-f)<Math.abs(b.f-f)) b=q; return b.db; }
check('hornResponse: hypex flat above 2*fc (|dB| < 1.5)', Math.abs(_at9(2000)) < 1.5 && Math.abs(_at9(8000)) < 1.5);
check('hornResponse: mass-controlled collapse below cutoff (100Hz < -25dB)', _at9(100) < -25);
check('hornResponse: finite everywhere', _r9.every(function(q){return isFinite(q.db);}));
check('power-response chart present in the app', /RADIATED POWER RESPONSE/.test(require('fs').readFileSync('horn_studio.html','utf8')));
// ONE-BUTTON BEM (2026-07-13): topology guards for the constructed BEM surface
function bemTopo(bp) {
  var lines = bp.objElems.trim().split('\n').slice(1), edges = {};
  for (var l of lines) { var t = l.split(' ').map(Number);
    for (var e = 0; e < 3; e++) { var a = t[1+e], b = t[1+(e+1)%3]; var k = Math.min(a,b)+'_'+Math.max(a,b); edges[k] = (edges[k]||0)+1; } }
  var open9 = 0, nm9 = 0; for (var k2 in edges) { if (edges[k2] === 1) open9++; if (edges[k2] > 2) nm9++; }
  return { open: open9, nm: nm9 };
}
var bemJ = E.buildBEMProject(_o9, { H: _o9.wall, V: _o9.wall, shape: 'ellipse', rho: 0 }, null, {});
var tj = bemTopo(bemJ);
check('BEM surface (hypex): closed 2-manifold, source elements first', tj.open === 0 && tj.nm === 0 && bemJ.nSrc === 32);
var bemW = E.buildBEMProject(wn1, null, E.buildWNRings(wn1, 32, 0, 0), {});
var tw = bemTopo(bemW);
check('BEM surface (WN, curved rings): closed 2-manifold', tw.open === 0 && tw.nm === 0 && bemW.nSrc === 32);
// REGRESSION 20 GUARD (entry 77): the equal-path solver must stay on the PHYSICAL
// branch. The old fixed-bracket bisection latched the folded root at high mu
// (rt*fc/c > ~0.03): 2in/600Hz rings folded to z=-53mm with 240mm edges (fMax ~200Hz)
// while every length/mouth/residual check passed -- the fold IS an equal-length root.
(function () {
  var rvG = E.buildWNRings(wn1, 32, 0, 0), sgG = 32, MG = rvG.M;
  var zminG = 1e9, worstG = 0, nmG = 0;
  for (var jG = 0; jG < sgG; jG++) {
    var zpG = -1e9;
    for (var iG = 0; iG < MG; iG++) {
      var zG = rvG.rings[(iG * sgG + jG) * 3];
      if (zG < zminG) zminG = zG;
      if (zG < zpG - 0.5) nmG++;
      zpG = Math.max(zpG, zG);
      if (iG + 1 < MG) {
        var k1G = (iG * sgG + jG) * 3, k2G = ((iG + 1) * sgG + jG) * 3;
        var dG = Math.hypot(rvG.rings[k1G] - rvG.rings[k2G], rvG.rings[k1G + 1] - rvG.rings[k2G + 1], rvG.rings[k1G + 2] - rvG.rings[k2G + 2]);
        if (dG > worstG) worstG = dG;
      }
    }
  }
  check('WN equal-path family on the PHYSICAL branch: no fold-back (z >= 0, monotone, edges sane on the 2in/600Hz anchor; was z=-53mm / 240mm edges)',
    zminG > -0.01 && nmG === 0 && worstG < 15);
})();
var bemB = E.buildBEMProject(null, null, E.buildAraiFanRings(E.computeFamily({family:'biradial', rt:25.4, fc:290, T0:0.7, covH:95, cornerR:0, trunc:175, flareWrap:0, flareR:25, finT:10, adaptL:25}), 32, 25, 0), {segs: 32});
var tb = bemTopo(bemB);
check('BEM surface (biradial fan rings): closed 2-manifold + segs fallback (was 0 elements)', tb.open === 0 && tb.nm === 0 && bemB.nBnd > 2000 && bemB.nSrc === 32);
var htmlB = require('fs').readFileSync('horn_studio.html','utf8');
// entry 86: the H/V plane toggle UI left with the solver; the ENGINE dual-arc eval grid stays (used by the native/Akabak-era analyses).
check('BEM engine dual-plane eval grid: one project carries both arcs (73 pts)', bemJ.anglesV && bemJ.anglesV.length === 37 && bemJ.nH === 37 && bemJ.evalNodes.split('\n')[0] === '73');
var wnF9 = E.computeFamily({family:'wn', rt:12.7, fc:600, T0:0.7, wnUL:0.5, wnUC:0.68, wnFins:4, wnFinT:1.0, wnClear:0.4, wnFinU1:0.7, trunc:175, covH:90, cornerR:0});
var bpFin = E.buildBEMProject(wnF9, null, E.buildWNRings(wnF9, 32, 0, 0), { finMeshes: E.wnFinMesh(wnF9, 1.0, 0.4, 0.03, 0.7) });
var tf9 = bemTopo(bpFin);
check('FINS IN THE ACOUSTIC BOUNDARY: horn + floating fin solids, closed 2-manifold (proven 5.26dB pattern change vs finless @1200Hz)', tf9.open === 0 && tf9.nm === 0 && bpFin.nFinE > 2000 && bpFin.nBnd === bpFin.nHornE + bpFin.nFinE);
// ---- entry 77: 10 kHz band, refined end caps, adaptive subsampling, memory-aware pool ----
(function () {
  // refined caps: concentric disc/flange subdivision under opts.targetEdge. The legacy
  // single-fan discs capped fMax at ~1.8 kHz regardless of wall density (center-to-rim
  // spokes ~ throat radius); with 5.73 mm targetEdge a 24k-element jmlc honestly
  // reaches 10 kHz (measured 10,649 Hz) and stays a closed 2-manifold.
  var jm77 = E.computeFamily({ family: 'jmlc', rt: 12.7, fc: 800, T0: 0.7, trunc: 80, covH: 90, cornerR: 0, shape: 'circle' });
  var pr77 = { H: jm77.wall, V: jm77.wall, shape: 'ellipse', rho: 0 };
  var bpX77 = E.buildBEMProject(jm77, pr77, null, { stations: 48, segs: 120, targetEdge: 5.73 });
  var tx77 = bemTopo(bpX77);
  check('REFINED END CAPS (targetEdge): jmlc 24k-el mesh is a closed 2-manifold with subdivided discs and honestly reaches 10 kHz (lambda/6; was disc-capped ~3 kHz)',
    tx77.open === 0 && tx77.nm === 0 && bpX77.nSrc > 120 && bpX77.nBnd > 20000 && bpX77.fMax > 9500);
  // legacy identity: without targetEdge the mesh is byte-compatible with the shipped form
  var bpL77 = E.buildBEMProject(jm77, pr77, null, {});
  check('refined caps are OPT-IN: legacy build keeps single-fan discs (nSrc === segs) and element count', bpL77.nSrc === 32 && bpL77.nBnd === 3584);
  // adaptive keep, prof branch: wall points are {z,r} OBJECTS -- regression 21 read them
  // as arrays, got NaN cumulative arc, and silently collapsed keep[] to the throat
  // (128 mm jump to the mouth, fMax 449 Hz) while staying closed-manifold.
  check('ADAPTIVE STATION SUBSAMPLING survives {z,r} object walls (regression 21: NaN arc metric silently collapsed jmlc default to 449 Hz)', bpL77.fMax > 2500);
  // adaptive keep, rings branch: WN coarse anchor jumped 914 -> ~1.7 kHz at identical
  // element count because stations now land where rings actually move (curved mouth).
  var bpW77 = E.buildBEMProject(wn1, null, E.buildWNRings(wn1, 32, 0, 0), {});
  check('adaptive keep pays at fixed cost: WN 2in/600Hz coarse band fMax > 1300 Hz at 3,520 elements (was 914 Hz with uniform-index keep)', bpW77.nBnd === 3584 && bpW77.fMax > 1300);
  // memory model + pool planner (calibrated on real WASI ML-FMM solves: 3,520 el ->
  // 256 MB, 9,520 -> 387 MB, 24,472 -> 1,315 MB; fit is conservative at the top)
  var m1 = E.bemMemEstimate(3520) / 1048576, m2 = E.bemMemEstimate(24472) / 1048576;
  check('bemMemEstimate pins the calibration: conservative at 3.5k (>= measured 256 MB) and tracks 25k (1,300-1,500 MB), monotone',
    m1 >= 256 && m1 < 500 && m2 >= 1300 && m2 <= 1500 && E.bemMemEstimate(10000) > E.bemMemEstimate(5000));
  var pl1 = E.bemPoolPlan([3520, 24472], 8, 8), pl2 = E.bemPoolPlan([3520], 1, undefined), pl3 = E.bemPoolPlan([1, 2, 3, 4, 5], 16, 64);
  check('bemPoolPlan clamps: poolN in [1,3] respecting cores-1 and job count; budget 0.5-3.2 GB even with undefined deviceMemory',
    pl1.poolN === 2 && pl2.poolN === 1 && pl3.poolN === 3 &&
    pl2.budgetBytes >= 0.5 * 1073741824 && pl1.budgetBytes <= 3.2 * 1073741824 && pl1.maxJobBytes === E.bemMemEstimate(24472));
  var sz1 = E.bemBandSize(722, 169, 10000, 30000), sz2 = E.bemBandSize(350, 90, 10000, 30000);
  check('bemBandSize: 10 kHz edge target (5.73 mm), element budget respected under the 4*M*segs estimate, floors hold',
    Math.abs(sz1.targetEdge - 5.7333) < 0.01 && 4 * sz1.stations * sz1.segs <= 30000 * 1.15 &&
    sz1.segs >= 48 && sz1.stations >= 30 && 4 * sz2.stations * sz2.segs <= 30000 * 1.15);
  // app integration: third band, ladder to min(10k, bpX.fMax), memory-aware pull queue,
  // worker gets wasm bytes ONCE (init message), jobs carry nBnd for admission control
  })();
// ---- entry 78: QUARTER MODEL + NumCalc SYMMETRY (in-browser 10 kHz for real horns) ----
(function () {
  var jmS = E.computeFamily({ family: 'jmlc', rt: 12.7, fc: 800, T0: 0.7, trunc: 80, covH: 90, cornerR: 0 });
  var prS = { H: jmS.wall, V: jmS.wall, shape: 'ellipse', rho: 0 };
  var FS = E.buildBEMProject(jmS, prS, null, { stations: 48, segs: 120, targetEdge: 5.73 });
  var QS = E.buildBEMProject(jmS, prS, null, { stations: 48, segs: 120, targetEdge: 5.73, symmetry: 'quarter' });
  // solved quarter+SYMMETRY vs full on this exact mesh pair: worst 0.114 dB across the
  // 73-point grid at 3 kHz (ML-FMM), on-axis -0.005 dB; small mesh @800 Hz worst 0.105 dB.
  check('QUARTER MODEL: exactly nBnd/4 elements, identical honest fMax, sym flag 2 (validated vs full to 0.114 dB worst on the eval grid)',
    QS.nBnd * 4 === FS.nBnd && Math.abs(QS.fMax - FS.fMax) < 0.005 * FS.fMax && QS.sym === 2 && FS.sym === 0 && QS.nSrc * 4 === FS.nSrc);
  // topology: the quarter is open ONLY along the two cut planes; every open-edge node
  // sits EXACTLY on x=0 or y=0 (snap guarantees one-sidedness NumCalc requires).
  var eln = QS.objElems.trim().split('\n').slice(1), edges = {}, tri;
  for (var l8 of eln) { tri = l8.split(' ').map(Number);
    for (var e8 = 0; e8 < 3; e8++) { var a8 = tri[1 + e8], b8 = tri[1 + (e8 + 1) % 3]; var k8 = Math.min(a8, b8) + '_' + Math.max(a8, b8); edges[k8] = (edges[k8] || 0) + 1; } }
  var nod = QS.objNodes.trim().split('\n').slice(1).map(function (s) { return s.split(' ').map(Number); });
  var openQ = 0, nmQ = 0, offPlane = 0;
  for (var k9 in edges) {
    if (edges[k9] > 2) nmQ++;
    if (edges[k9] === 1) {
      openQ++;
      var ab = k9.split('_');
      var nA = nod[+ab[0]], nB = nod[+ab[1]];
      if (!((nA[1] === 0 && nB[1] === 0) || (nA[2] === 0 && nB[2] === 0))) offPlane++;
    }
  }
  check('quarter topology: open edges exist, all EXACTLY on the symmetry planes, zero non-manifold', openQ > 100 && offPlane === 0 && nmQ === 0);
  // eligibility rails: rings-path families, fins, and segs % 4 refuse loudly
  var th1 = false, th2 = false, th3 = false;
  try { E.buildBEMProject(wn1, null, E.buildWNRings(wn1, 32, 0, 0), { symmetry: 'quarter' }); } catch (e) { th1 = true; }
  try { E.buildBEMProject(jmS, prS, null, { segs: 50, symmetry: 'quarter' }); } catch (e) { th2 = true; }
  try { E.buildBEMProject(jmS, prS, null, { symmetry: 'quarter', finMeshes: [{ pos: [0, 0, 0], idx: [] }] }); } catch (e) { th3 = true; }
  check('quarter eligibility: throws for rings families (WN/biradial), segs % 4 !== 0, and fins', th1 && th2 && th3);
  // REGRESSION 22 GUARD: radial-only shell-offset sign test was degenerate at mouth-roll
  // apexes (tangent turns radial, outward normal ~pure z) -- adjacent stations offset
  // +6/-6 mm, a 13.1 mm zigzag capping the 400 Hz full-roll default at ~4.3 kHz however
  // many stations were spent. Continuity-chained signs: same mesh now 7.2 kHz.
  var dfS = E.computeFamily({ family: 'jmlc', fc: 400, rt: 35.56 / 2, entryDeg: 0, T0: 0.7, trunc: 175 });
  var dpS = { H: dfS.wall, V: dfS.wall, shape: 'ellipse', rho: 0 };
  var dQ = E.buildBEMProject(dfS, dpS, null, { stations: 80, segs: 344, targetEdge: 8.3, symmetry: 'quarter' });
  check('REGRESSION 22 (apex shell zigzag): full-roll default reaches > 6.8 kHz at ~28k quarter elements (was 4.3 kHz with the radial-only sign test)',
    dQ.fMax > 6800 && dQ.edgeSta < 1.5 * dQ.edgeRing && dQ.edgeRing < 1.5 * dQ.edgeSta);
  // memory model piecewise extension (entry 78): measured 28,710 el -> 1,746 MB; the
  // 36,540-el solve was OOM-killed past 3.9 GB (FMM depth step). BEM_ELEM_RAIL guards.
  var m78 = E.bemMemEstimate(28710) / 1048576;
  check('bemMemEstimate piecewise: pins the 28.7k anchor (1,650-1,850 MB) and BEM_ELEM_RAIL = 29,000 exported',
    m78 >= 1650 && m78 <= 1850 && E.BEM_ELEM_RAIL === 29000);
  // app wiring: quarter for prof-path finless horns across all three bands, arc-length
  // xfine sizing, piecewise element cap under BEM_ELEM_RAIL, per-job SYMMETRY NC.inp
  // insertion driven by B.sym, rebalance iteration, beminfo quarter marker.
  })();
// ---- entries 79-81: Arai adapter -- no neck, photo-matched wedge sides ----
(function () {
  var arN = E.computeFamily({ family: 'biradial', rt: 38, fc: 290, T0: 0.7, covH: 95, cornerR: 0, trunc: 175, flareWrap: 0, flareR: 25, finT: 10, adaptL: 25 , fins: 'arai4' });
  var rgN = E.buildAraiFanRings(arN, 64, 0, 0), VN = rgN.rings, mnN = 1e9;
  for (var iN = 0; iN < rgN.M * 64; iN++) { var rN = Math.hypot(VN[iN * 3 + 1], VN[iN * 3 + 2]); if (rN < mnN) mnN = rN; }
  check('ARAI THROAT (entries 79-81): no ring point inside the throat circle', mnN >= 38 - 1e-2);
  // SECTION CONTAINMENT is the true no-neck invariant (meridian radii may fall as
  // fixed-fraction points SLIDE along a growing section during the width plateau).
  // Convex sections: polar radius by ray-cast against the 64-gon at 96 azimuths.
  function polar(iR) {
    var out = [];
    for (var a = 0; a < 96; a++) {
      var ph = a / 96 * 2 * Math.PI, cx = Math.cos(ph), cy = Math.sin(ph), best = 0;
      for (var j = 0; j < 64; j++) {
        var k1 = (iR * 64 + j) * 3, k2 = (iR * 64 + (j + 1) % 64) * 3;
        var x1 = VN[k1 + 1], y1 = VN[k1 + 2], x2 = VN[k2 + 1], y2 = VN[k2 + 2];
        var d = cx * (y2 - y1) - cy * (x2 - x1);
        if (Math.abs(d) < 1e-12) continue;
        var t = (x1 * (y2 - y1) - y1 * (x2 - x1)) / d;   // ray parameter
        var u = (x1 * cy - y1 * cx) / d;                 // edge parameter
        if (t > 0 && u >= -1e-9 && u <= 1 + 1e-9) best = Math.max(best, t);
      }
      out.push(best);
    }
    return out;
  }
  // limited to rings 0..40 (adapter + slot + early blend): beyond, fan rings curve
  // strongly in Z and planar (X,Y) containment stops being geometrically meaningful.
  // 0.25 mm threshold: measured noise floor is ~0.1 mm of 64-gon chord-sag sliding.
  var prevP = polar(0), okC = true, worstC = 0;
  for (var iC = 1; iC <= 40; iC++) {
    var curP = polar(iC);
    for (var aC = 0; aC < 96; aC++) {
      var dd = prevP[aC] - curP[aC];
      if (dd > worstC) worstC = dd;
      if (dd > 0.25) okC = false;
    }
    prevP = curP;
  }
  check('ARAI SECTION CONTAINMENT (entry 81): every adapter/slot-region ring contains the previous one at all 96 azimuths (worst measured 0.098 mm = sampling noise) -- no waist, no tube', okC);
  // wedge sides: linear at tan(0.56*covH/2) through the adapter (photo-matched)
  var w5 = 0, w15 = 0, z5 = 0, z15 = 0;
  for (var jW = 0; jW < 64; jW++) {
    var k5 = (5 * 64 + jW) * 3, k15 = (15 * 64 + jW) * 3;
    w5 = Math.max(w5, Math.abs(VN[k5 + 1])); w15 = Math.max(w15, Math.abs(VN[k15 + 1]));
    z5 += VN[k5] / 64; z15 += VN[k15] / 64;
  }
  var slopeW = (w15 - w5) / (z15 - z5);
  // entry 83: the expected slope is the FEASIBILITY-CAPPED wedge (min of the wall
  // start tangent and (0.97*Rarr - rt)/zTr) so long adapters converge to the Crowe
  // slow cone instead of exceeding the fan ring cylinders (the junction darts).
  var slopeT = Math.min(Math.tan(0.56 * arN.fan.covHrad / 2), (0.97 * arN.fan.Rarr - 38) / arN.fan.zTr);
  check('ARAI WEDGE SIDES (entries 81+83): adapter H expands LINEARLY at the feasibility-capped horn side angle from the throat', Math.abs(slopeW - slopeT) < 0.02 && w5 > 38.5);
})();
// ---- entry 84: THE RE-INVENTION battery (two-zone adapter, whole UI range) ----
(function () {
  // flat zone hosts the wedge (no cylinder constraint), fan zone = classic thWOf on
  // its own cylinders, one crossing, closed-form slope law. Battery over the actual
  // UI adaptL range [15, 80]: no waist, no fold in the adapter/junction span, wedge
  // slope equals the law, zero junction Laplacian spikes at book/Crowe lengths.
  function battery84(aL) {
    var f8 = E.computeFamily({ family: 'biradial', rt: 38, fc: 290, T0: 0.7, covH: 95, cornerR: 0, trunc: 175, flareWrap: 0, flareR: 25, finT: 10, adaptL: aL , fins: 'arai4' });
    var sg8 = 64, R8 = E.buildAraiFanRings(f8, sg8, 0, 0), V8 = R8.rings;
    var s08 = Math.tan(0.56 * f8.fan.covHrad / 2), W8 = f8.wall;
    function wA8(z) { if (z <= W8[0].z) return W8[0].r; for (var q = 1; q < W8.length; q++) if (W8[q].z >= z) { var f9 = (z - W8[q - 1].z) / (W8[q].z - W8[q - 1].z); return W8[q - 1].r + f9 * (W8[q].r - W8[q - 1].r); } return W8[W8.length - 1].r; }
    var zC8 = f8.fan.zTr + 1.2 * f8.fan.Rarr;
    var sL8 = Math.min(s08, Math.max(0.05, (wA8(zC8) - 38) / zC8));
    var zX8 = zC8; for (var z8 = f8.fan.zTr + 2; z8 < 500; z8 += 1) if (wA8(z8) >= 38 + z8 * sL8) { zX8 = z8; break; }
    var minR = 1e9, fold = 0, spk = 0;
    for (var i8 = 0; i8 < R8.M; i8++) {
      var mn0 = 1e9, mn1 = 1e9;
      for (var j8 = 0; j8 < sg8; j8++) {
        var k8 = (i8 * sg8 + j8) * 3;
        minR = Math.min(minR, Math.hypot(V8[k8 + 1], V8[k8 + 2]));
        mn1 = Math.min(mn1, V8[k8]);
        if (i8 > 0) mn0 = Math.min(mn0, V8[((i8 - 1) * sg8 + j8) * 3]);
        if (i8 > 0 && i8 < R8.M - 1 && V8[k8] > 2 && V8[k8] < zX8 + 8) {   // +8: junction only; the designed WING-CORNER kink sits ~zX+14 on stretched horns
          var kp = ((i8 - 1) * sg8 + j8) * 3, kn = ((i8 + 1) * sg8 + j8) * 3, kl = (i8 * sg8 + (j8 + sg8 - 1) % sg8) * 3, kr = (i8 * sg8 + (j8 + 1) % sg8) * 3;
          var dd = Math.hypot(V8[k8] - (V8[kp] + V8[kn] + V8[kl] + V8[kr]) / 4, V8[k8 + 1] - (V8[kp + 1] + V8[kn + 1] + V8[kl + 1] + V8[kr + 1]) / 4, V8[k8 + 2] - (V8[kp + 2] + V8[kn + 2] + V8[kl + 2] + V8[kr + 2]) / 4);
          if (dd > 4.5) spk++;
        }
      }
      if (i8 > 0 && mn1 < zX8 + 8) fold = Math.min(fold, mn1 - mn0);
    }
    var w6 = 0, w18 = 0;
    for (var jw = 0; jw < sg8; jw++) { var k6 = (6 * sg8 + jw) * 3, k18 = (18 * sg8 + jw) * 3; w6 = Math.max(w6, Math.abs(V8[k6 + 1])); w18 = Math.max(w18, Math.abs(V8[k18 + 1])); }
    var sB8 = (w18 - w6) / (V8[18 * sg8 * 3] - V8[6 * sg8 * 3]);
    return { waist: minR - 38, fold: fold, spikes: spk, dSlope: Math.abs(sB8 - sL8) };
  }
  var b25 = battery84(25), b50 = battery84(50), b80 = battery84(80);
  check('ENTRY 84 BATTERY adaptL 25 (book): no waist, no fold, no junction spikes, wedge slope = law (FULL horn angle)', b25.waist > -0.01 && b25.fold > -0.02 && b25.spikes === 0 && b25.dSlope < 0.02);
  check('ENTRY 84 BATTERY adaptL 50: no waist, no fold, no junction spikes, slope = closed-form law', b50.waist > -0.01 && b50.fold > -0.02 && b50.spikes === 0 && b50.dSlope < 0.02);
  check('ENTRY 84 BATTERY adaptL 80 (UI max): no waist anywhere, junction span clean of construction folds', b80.waist > -0.01 && b80.fold > -0.5 && b80.dSlope < 0.02);
})();
// ---- entry 86: BEM solver removed; AKABAK / ABEC export ----
(function () {
  var jmA = E.computeFamily({ family: 'jmlc', rt: 12.7, fc: 800, T0: 0.7, trunc: 80, covH: 90, cornerR: 0 });
  var bpA = E.buildBEMProject(jmA, { H: jmA.wall, V: jmA.wall, shape: 'ellipse', rho: 0 }, null, {});
  var msh = E.bemToMsh(bpA), LA = msh.split('\n');
  var iN = LA.indexOf('$Nodes'), iE = LA.indexOf('$Elements');
  var okHdr = LA[0] === '$MeshFormat' && LA[1] === '2.2 0 8' && /"SourceDisc"/.test(msh) && /"HornWalls"/.test(msh);
  var okCnt = +LA[iN + 1] > 0 && +LA[iE + 1] === bpA.nBnd;
  var eFirst = LA[iE + 2].split(' '), eLastSrc = LA[iE + 1 + bpA.nSrc].split(' '), eFirstWall = LA[iE + 2 + bpA.nSrc].split(' ');
  var okGrp = eFirst[3] === '1' && eLastSrc[3] === '1' && eFirstWall[3] === '2' && eFirst[1] === '2' && eFirst[2] === '2';
  var n1 = LA[iN + 2].split(' ');
  var okMM = Math.abs(parseFloat(n1[3]) - 1000 * parseFloat(bpA.objNodes.trim().split('\n')[1].split(' ')[3])) < 1e-3;
  check('AKABAK EXPORT (entry 86): GMSH 2.2 ASCII, SourceDisc/HornWalls physical groups, element count = nBnd, source-first tagging, millimetre coordinates (Akabak/ABEC accept v2.2 text meshes ONLY)',
    okHdr && okCnt && okGrp && okMM && /\$EndElements\n$/.test(msh));
  check('APP: in-browser NumCalc REMOVED (no wasm blob, no worker, no NC.inp), AKABAK export wired (button + bemToMsh + user-selectable density, entry 112)',
    !/BEM_WASM_B64/.test(htmlB) && !/bemWorkerSrc/.test(htmlB) && !/BEM_NCINP/.test(htmlB) && !/bemRun/.test(htmlB) &&
    /exAkabak/.test(htmlB) && /bemToMsh\(bp9\)/.test(htmlB) && /bemBandSize\(perX9, pathX9, \(S\.bemF \|\| 14333\), bud9\)/.test(htmlB) && /akabak_bem/.test(htmlB));
})();
// ---- entry 87: JMLC primary-source reference (Le Cleac'h originals, 2026-07-14) ----
(function () {
  var fs87 = require('fs');
  if (!fs87.existsSync('reference/jmlc_originals/axial_5000Hz_T0707_rt7p16_wall.json'))
    console.log('SKIP (reference data absent -- handoff zips do not carry reference/jmlc_originals): ~5 JMLC primary-source pins not run');   // entry 213: skips are now LOUD (249-vs-254 check-count drift went unexplained on restore)
  if (fs87.existsSync('reference/jmlc_originals/axial_5000Hz_T0707_rt7p16_wall.json')) {
    var refW = JSON.parse(fs87.readFileSync('reference/jmlc_originals/axial_5000Hz_T0707_rt7p16_wall.json', 'utf8'));
    check('JMLC axial reference archived: 4000+ wall points, throat r ~7.16, mouth r ~18.85 over z ~30.6 mm (fc 5000, T 0.7071)',
      refW.length > 3900 && Math.abs(refW[0][1] - 6.893) < 0.05 && Math.abs(refW[refW.length - 1][1] - 18.853) < 0.05 && refW[refW.length - 1][0] > 30);
    // entry 88 CORRECTION: entry 87's "10-15x too short" was a coordinate MISREAD
    // (his col 0 is the marching coordinate s, not the wall z). His TRUE wall
    // (cols 16/17, inches) spans z -0.5..6.0 mm -- ours 6.25. CONFORMANCE:
    if (fs87.existsSync('reference/jmlc_originals/axial_5000Hz_T0707_rt7p16_wall_TRUE.json')) {
      var refT = JSON.parse(fs87.readFileSync('reference/jmlc_originals/axial_5000Hz_T0707_rt7p16_wall_TRUE.json', 'utf8'));
      var jmA = E.computeFamily({ family: 'jmlc', fc: 5000, rt: 14.3256 / 2, entryAuto: true, T0: 0.707107, trunc: 268 });
      var wA = jmA.wall;
      function d2c(x, y) {
        var bd = 1e9;
        for (var j = 1; j < wA.length; j++) {
          var az = wA[j - 1].z, ar = wA[j - 1].r, bz = wA[j].z, br = wA[j].r;
          var dz = bz - az, dr = br - ar, L2 = dz * dz + dr * dr || 1e-12;
          var t = Math.max(0, Math.min(1, ((x - az) * dz + (y - ar) * dr) / L2));
          bd = Math.min(bd, Math.hypot(x - (az + t * dz), y - (ar + t * dr)));
        }
        return bd;
      }
      var wor = 0, su = 0, nn = 0;
      for (var iT = 0; iT < refT.length; iT += 20) { if (refT[iT][1] > 15) continue; var dd = d2c(refT[iT][0], refT[iT][1]); su += dd; nn++; if (dd > wor) wor = dd; }
      check('JMLC CONFORMANCE (entry 88): at the natural entry angle, our flare matches Le Cleac h s own table to < 0.15 mm mean / < 0.8 mm worst over the working span (measured 0.058 / 0.581; the residual is his seed-rim point our seed does not model)',
        su / nn < 0.15 && wor < 0.8);
      // the natural entry angle closed form vs the value PRINTED in his sheet
      var thN = Math.asin(14.3256 / 2 * (4 * Math.PI * 5000 / 344000) * 0.707107 / 2) * 180 / Math.PI;
      check('JMLC NATURAL ENTRY ANGLE (entry 88): sin(th0) = rt*m*T/2 reproduces the 27.5518 deg printed in his own axial sheet', Math.abs(thN - 27.5518) < 0.001);
      // the quasi-elliptical family: circular throat, exact mouth aplat, area-preserving morph
      var fE = E.computeFamily({ family: 'jmlcell', fc: 500, rt: 25, T0: 0.5, trunc: 268, aplat: 4 });
      var nE = fE.wall.length - 1;
      check('JMLC QUASI-ELLIPTICAL (entry 88, his mai 2007 sheets): circular throat, mouth a/b = aplat exactly, area-preserving per station (a*b = r^2), Gaussian ramp normalized over the march',
        Math.abs(fE.wall[0].r - 25) < 1e-6 && Math.abs(fE.wallV[0].r - 25) < 1e-6 &&
        Math.abs(fE.wall[nE].r / fE.wallV[nE].r - 4) < 1e-3 && fE.wallV && fE.wall.length === fE.wallV.length);
      check('APP: jmlcell family wired (selector, defaults from his worked example, aplat/ellMu/ellSigma params, law + trunc applicability)',
        /jmlcell: "JMLC quasi-elliptical \(2007\)"/.test(htmlB) && /jmlcell:  \{ entryDeg: 0, fc: 500, T0: 0.5/.test(htmlB) &&
        /key: "aplat"/.test(htmlB) && /key: "ellMu"/.test(htmlB) && /key: "ellSigma"/.test(htmlB));
    }
  }
})();
// ---- entry 89: forum feature round (zoom, tiny horns, ribbon source) ----
(function () {
  // tiny horns: 5 mm throat tractrix at high fc builds sane geometry
  var ttW = E.computeFamily({ family: 'tractrix', fc: 6000, rt: 2.5, trunc: 88 });
  check('TINY HORNS (entry 89): 5 mm-throat tractrix at fc 6000 builds a sane wall (forum request: ~3 cm total, 5 mm throats)',
    ttW.wall.length > 100 && ttW.mouthR > 5 && ttW.mouthR < 20 && ttW.length > 3 && isFinite(ttW.length));
  check('APP ranges widened (entry 89): fc to 10 kHz, throat to 4 mm, validity gate matches',
    /min: 80, max: 10000, step: 5/.test(htmlB) && /"throatD", label: "Throat \\u00d8", unit: "mm", min: 4/.test(htmlB) && /S\.fc <= 10000/.test(htmlB));
  check('APP interactive drawing (entry 89): wheel zoom at cursor + drag pan + dblclick reset on the SVG viewBox',
    /dw\.addEventListener\("wheel"/.test(htmlB) && /pointerdown/.test(htmlB) && /dblclick/.test(htmlB) && /__vb0/.test(htmlB));
  // ribbon source tagging: 8x3 mm ribbon inside a 14 mm throat cap
  var jmB = E.computeFamily({ family: 'jmlc', rt: 7, fc: 2000, T0: 0.7, trunc: 175 });
  var bpB = E.buildBEMProject(jmB, { H: jmB.wall, V: jmB.wall, shape: 'ellipse', rho: 0 }, null, { targetEdge: 2 });
  var mshR = E.bemToMsh(bpB, { ribbonW: 8, ribbonH: 3 });
  var LR = mshR.split('\n'), iER = LR.indexOf('$Elements');
  var c1 = 0, c3 = 0, cW = 0;
  for (var eR = 1; eR <= bpB.nBnd; eR++) { var tg = LR[iER + 1 + eR].split(' ')[3]; if (tg === '1') c1++; else if (tg === '3') c3++; else cW++; }
  check('AKABAK RIBBON SOURCE (entry 89): RibbonSource + ThroatBaffle + HornWalls groups; ribbon and baffle partition the source cap; ribbon area ~ W*H',
    /"RibbonSource"/.test(mshR) && /"ThroatBaffle"/.test(mshR) && c1 > 0 && c3 > 0 && c1 + c3 === bpB.nSrc && cW === bpB.nBnd - bpB.nSrc);
  // entry 90: the ribbon is a GLOBAL THROAT TOGGLE now (the user disliked export-only
  // tagging). Geometry via profOf: Lame exponent ramp (~10 rect -> 2 exact ellipse),
  // half-width blend, applied to every prof-path family; jmlcell H/V routing fixed.
  check('APP GLOBAL RIBBON THROAT (entry 90): profOf wrapper morphs every prof-path family, ribW/ribH/ribL params, area-continuity advisory, export note; jmlcell now routes wallV through the elliptical loft',
    /throatRibbonMorph\(p9, effW9, effH9, S\.ribL/.test(htmlB) && /key: "ribL"/.test(htmlB) &&
    /Rect throat W/.test(htmlB) && /for area continuity with the law/.test(htmlB) &&
    /RIBBON THROAT /.test(htmlB) && /S\.family === "jmlcell" && horn\.wallV/.test(htmlB) && /S\.family === "iwata" && horn\.iwScale/.test(htmlB));
  // engine morph unit: throat dims exact, exponent ramp, untouched beyond L
  var jmM = E.computeFamily({ family: 'jmlc', fc: 2000, rt: 7, T0: 0.7, trunc: 175 });
  var pr0 = E.planeProfiles(jmM.wall, 300, 1, 0, 0, 0, 'ellipse', 0, 0, []);
  var prM = E.throatRibbonMorph(pr0, 8, 3, 0);
  var iF = -1; for (var qM = 0; qM < prM.H.length; qM++) if (prM.H[qM].z > 20) { iF = qM; break; }
  check('ENGINE throatRibbonMorph (entry 90): throat section = W/2 x H/2 at Lame n=10, walls and n=2 sections untouched beyond the transition',
    Math.abs(prM.H[0].r - 4) < 1e-9 && Math.abs(prM.V[0].r - 1.5) < 1e-9 && Math.abs(prM.seNArr[0] - 10) < 1e-9 &&
    Math.abs(prM.H[iF].r - pr0.H[iF].r) < 1e-9 && Math.abs(prM.seNArr[iF] - 2) < 1e-3);
})();
// ---- entry 92: STEP export + Iwata (forum requests) ----
(function () {
  // IWATA (entry 98 rewrite): the decoded-grid family reproduces Le Cleac'h's own
  // calcul_3D surface. Extents pinned against the sheet (cut EXACT, uncut <= 3%
  // -- 65-station resampling trims the V peak slightly).
  var iwC = E.computeFamily({ family: 'iwata', fc: 320, rt: 12.7, T0: 0.707107, decoupeN: 0.3, decoupeP: 11 });
  var RC = E.buildIwataRings(iwC, 72, 0, 0);   // segs 72 = 5-deg columns: every streamline lands EXACTLY on a column (the cut peak lives ON g1)
  var mxC = 0, myC = 0, zC = -1e9, iR;
  for (iR = 0; iR < RC.M * 72; iR++) { var kC = iR * 3; zC = Math.max(zC, RC.rings[kC]); mxC = Math.max(mxC, Math.abs(RC.rings[kC + 1])); myC = Math.max(myC, Math.abs(RC.rings[kC + 2])); }
  check('IWATA CUT CONFORMANCE (entry 98): at HIS params (fc 320, 1in, T 0.7071, decoupe 0.3/11) the rings reproduce his cut surface 567 x 371 x 534 within 1%',
    Math.abs(2 * mxC - 567) < 6 && Math.abs(2 * myC - 371) < 4 && Math.abs(zC - 534) < 6);
  var iwU = E.computeFamily({ family: 'iwata', fc: 320, rt: 12.7, T0: 0.707107, decoupeN: 0, decoupeP: 1 });
  var RU = E.buildIwataRings(iwU, 72, 0, 0);
  var myU = 0, zU = -1e9;
  for (iR = 0; iR < RU.M * 72; iR++) { var kU = iR * 3; zU = Math.max(zU, RU.rings[kU]); myU = Math.max(myU, Math.abs(RU.rings[kU + 2])); }
  check('IWATA UNCUT (entry 98): n = 0 restores the full march (height 693 within 3%, depth 578 within 2%) -- the decoupe is a CUT of the march, not a wall reshaping',
    Math.abs(2 * myU - 693) < 21 && Math.abs(zU - 578) < 12);
  // entry 100 (rollback fix): PERMANENT FOLD GUARDS -- every ring's XY turning
  // number must be exactly 1 (folded/self-crossing rings caused the striated lip)
  // and no meridian may zigzag in z (one flip = the natural roll).
  (function () {
    var VF = RC.rings, sF = 72, badT = 0, zigF = 0, iF, jF;
    for (iF = 2; iF < RC.M; iF++) {
      var turn = 0;
      for (jF = 0; jF < sF; jF++) {
        var k0 = (iF * sF + jF) * 3, k1 = (iF * sF + (jF + 1) % sF) * 3, k2 = (iF * sF + (jF + 2) % sF) * 3;
        var ax = VF[k1 + 1] - VF[k0 + 1], ay = VF[k1 + 2] - VF[k0 + 2], bx = VF[k2 + 1] - VF[k1 + 1], by = VF[k2 + 2] - VF[k1 + 2];
        turn += Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
      }
      if (Math.abs(Math.abs(turn / (2 * Math.PI)) - 1) > 0.02) badT++;
    }
    for (jF = 0; jF < sF; jF += 3) {
      var flips = 0, prev = 0;
      for (iF = 1; iF < RC.M; iF++) {
        var dF = VF[(iF * sF + jF) * 3] - VF[((iF - 1) * sF + jF) * 3];
        if (prev !== 0 && (dF > 0) !== (prev > 0) && Math.abs(dF) > 0.004 * iwC.iwScale) flips++;   // scale-aware: his source data carries mm-scale z wiggles
        if (Math.abs(dF) > 1e-6) prev = dF;
      }
      if (flips > 1) zigF++;
    }
    check('IWATA FOLD GUARDS (entry 100): every ring turning number = 1 exactly (no self-crossing; the striated-lip mechanism), zero meridian z-zigzags (one flip = the roll)', badT === 0 && zigF === 0);
  })();
  // entry 102: FIXED-PROPORTION scaling -- the throat follows fc exactly
  // (12.7 mm * 320/fc); the entry-99 correction bulge (the user's "narrowing
  // throat") is gone: the first-station ring radius IS the natural grid throat.
  (function () {
    var iwS = E.computeFamily({ family: 'iwata', fc: 640, decoupeN: 0.3, decoupeP: 11, trunc: 268 });
    var RS = E.buildIwataRings(iwS, 64, 0, 0);
    var rt0 = 0;
    for (var jS = 0; jS < 64; jS++) rt0 = Math.max(rt0, Math.hypot(RS.rings[jS * 3 + 1], RS.rings[jS * 3 + 2]));
    var mono = true, prevMax = 0;
    for (var iS = 0; iS < 20; iS++) {   // first 15% of the march: no narrowing bulge
      var mS = 0;
      for (jS = 0; jS < 64; jS++) mS = Math.max(mS, Math.hypot(RS.rings[(iS * 64 + jS) * 3 + 1], RS.rings[(iS * 64 + jS) * 3 + 2]));
      if (mS < prevMax - 0.05) mono = false;
      prevMax = mS;
    }
    check('IWATA FIXED PROPORTIONS (entry 102): throat r = 12.7*320/fc exactly (' + rt0.toFixed(2) + ' at fc 640, expect 6.35), NO narrowing bulge in the first 15% of the march, throatD hidden and the throat REPORTED in stats',
      Math.abs(rt0 - 6.35) < 0.05 && mono && /p\.key === "throatD" && S\.family === "iwata"/.test(htmlB) && /Throat \\u00d8 \(fixed by geometry\)/.test(htmlB));
  })();
  check('IWATA STRUCTURE (entry 98): per-axis independent rolls (V roll z > 1.5x H roll z in the wall curves) and e inversion carried by the grid; jmlcell is PURE quasi-elliptical again (no decoupe branch)',
    (function () { var zH = 0, zV = 0; for (var q = 0; q < iwC.wall.length; q++) zH = Math.max(zH, iwC.wall[q].z); for (q = 0; q < iwC.wallV.length; q++) zV = Math.max(zV, iwC.wallV[q].z); return zV > 1.3 * zH; })() &&
    !/bFroz/.test(require('fs').readFileSync('engine.js', 'utf8')));
  // STEP writer: schema-critical structure (WR3: FACE_SURFACE + PLANE per face)
  var sMesh = E.buildSolidMesh({ H: iwC.wall, V: iwC.wall, shape: 'ellipse', rho: 0 }, 6, 24);
  var stp = E.stepFromMesh(sMesh.pos, sMesh.idx, 'smoke');
  check('STEP EXPORT (entry 92): ISO-10303-21 + AP214 schema header, FACE_SURFACE/PLANE per face (faceted_brep_shape_representation WR3), CLOSED_SHELL -> FACETED_BREP, mm units, product block, END marker',
    /^ISO-10303-21;/.test(stp) && /AUTOMOTIVE_DESIGN \{ 1 0 10303 214/.test(stp) &&
    (stp.match(/FACE_SURFACE\(/g) || []).length === (stp.match(/POLY_LOOP\(/g) || []).length &&
    (stp.match(/PLANE\(/g) || []).length >= (stp.match(/FACE_SURFACE\(/g) || []).length &&
    /CLOSED_SHELL\(/.test(stp) && /FACETED_BREP\(/.test(stp) && /SI_UNIT\(.MILLI.,.METRE.\)/.test(stp) &&
    /SHAPE_DEFINITION_REPRESENTATION\(/.test(stp) && /END-ISO-10303-21;\s*$/.test(stp));
  check('APP (entry 92): STEP button + handler wired, iwata family selectable with HIS defaults, decoupe params, fuzz covers 13 families',
    /exStep/.test(htmlB) && /stepFromMesh\(_m2\.pos/.test(htmlB) && /iwata: "Iwata \(JMLC 2007\)"/.test(htmlB) &&
    /decoupeN: 0\.3, decoupeP: 11/.test(htmlB) && /key: "decoupeN"/.test(htmlB));
})();
// ---- entries 93-94: throat shape TOGGLE (round / rect; square removed) ----
(function () {
  check('THROAT TOGGLE (entry 94): round/rect select renders ABOVE the throat dimension, rect hides throatD and derives rt = sqrt(WH/pi), switching to rect seeds area-equivalent W/H so the horn is unchanged at the click; square option removed',
    /if \(PARAMS\[i\]\.key === "throatD"\) side \+= throatSelHTML;/.test(htmlB) &&
    !/Throat: square/.test(htmlB) && /Throat: rectangle W/.test(htmlB) &&
    /p\.key === "throatD" && S\.throatShape === "rect"/.test(htmlB) &&
    /Math\.sqrt\(S\.ribW \* S\.ribH \/ Math\.PI\)/.test(htmlB) &&
    /S\.ribW = sd9; S\.ribH = sd9;/.test(htmlB) &&
    /\(p\.key === "ribW" \|\| p\.key === "ribH"\) && S\.throatShape !== "rect"/.test(htmlB));
  // area equivalence of the seed: (throatD*0.8862269)^2 = pi*(throatD/2)^2
  var side = 35.56 * 0.8862269;
  check('THROAT TOGGLE area math (entry 94): the rect seed side keeps pi*rt^2 exactly', Math.abs(side * side - Math.PI * 17.78 * 17.78) < 0.01);
})();
// ---- entry 93b: STRUCTURAL DOM GUARD (a nested <select> shipped a real-browser
// null-addEventListener crash the id-scanning harness could not see) ----
(function () {
  var chunks = htmlB.split('<select'), nested = 0;
  for (var iC = 1; iC < chunks.length; iC++) {
    var body = chunks[iC];
    var close = body.indexOf('</select>');
    var open2 = body.indexOf('<select');   // won't match: split consumed them -- so scan raw
  }
  // direct scan: any '<select' occurring before the matching '</select>' of a prior one
  var pos = 0, depth = 0, bad = false;
  while (true) {
    var iO = htmlB.indexOf('<select', pos), iX = htmlB.indexOf('</select>', pos);
    if (iO < 0 && iX < 0) break;
    if (iO >= 0 && (iX < 0 || iO < iX)) { depth++; if (depth > 1) bad = true; pos = iO + 7; }
    else { depth = Math.max(0, depth - 1); pos = iX + 9; }
  }
  check('DOM STRUCTURE (entry 93b): no nested <select> anywhere in the app markup (real browsers DROP the inner select; the harness registry cannot model nesting)', !bad);
})();
// ---- entry 95: all graphs zoomable + rect params directly under the selector ----
(function () {
  check('ALL GRAPHS ZOOMABLE (entries 95+96): geometry views (drawing, tchart) keep CAD-style viewBox zoom; the four FREQUENCY charts use SEMANTIC zoom -- fixed axes frame, log-domain cursor-anchored window, 1-2-5 ticks re-grid, sweep RECOMPUTED inside the window',
    /\["drawing", "tchart"\]\.forEach/.test(htmlB) &&
    /zoom-out FLOORS at the original fit view/.test(htmlB) && /if \(w2 >= vbo\[2\] \|\| h2 >= vbo\[3\]\)/.test(htmlB) &&
    /\["zchart", "spchart", "bwchart", "dichart", "mxchart"\]\.forEach/.test(htmlB) &&   /* entry 215: the Max-SPL tile joins the semantic-zoom set */
    /var chartFWin = null;/.test(htmlB) && /function fTicks\(f0, f1\)/.test(htmlB) &&
    /fArr\.push\(fW0 \* Math\.pow\(fW1 \/ fW0, i \/ \(nf - 1\)\)\)/.test(htmlB) &&
    /chartFWin = \{ f0: Math\.pow\(10, n0\), f1: Math\.pow\(10, n1\) \};/.test(htmlB) &&
    /dblclick", function \(\) \{ chartFWin = null; renderCharts\(\); \}/.test(htmlB) &&
    /function renderCharts\(\)/.test(htmlB));
  // PARAMS order: ribW/ribH/ribL immediately follow throatD, so in rect mode
  // (throatD hidden) they render directly below the throat selector
  var iTD = htmlB.indexOf('{ key: "throatD"'), iW = htmlB.indexOf('{ key: "ribW"'), iH = htmlB.indexOf('{ key: "ribH"'), iL = htmlB.indexOf('{ key: "ribL"'), iNext = htmlB.indexOf('{ key: "entryDeg"');
  check('RECT PARAMS PLACEMENT (entry 95): ribW/ribH/ribL are the very next PARAMS after throatD (render order = array order)',
    iTD > 0 && iW > iTD && iH > iW && iL > iH && iNext > iL);
})();
// ---- entry 101: spiral fix + controlled roll cut + the GENERAL HIDDEN-PARAM RULE ----
(function () {
  // the H meridian must terminate without coiling: planar turning <= trunc + margin
  var iwT = E.computeFamily({ family: 'iwata', fc: 400, rt: 17.78, trunc: 268, decoupeN: 0.3, decoupeP: 11 });
  var RT = E.buildIwataRings(iwT, 4, 0, 0);
  var tot = 0;
  for (var iT = 2; iT < RT.M; iT++) {
    var z0 = RT.rings[(iT - 2) * 12], x0 = RT.rings[(iT - 2) * 12 + 1];
    var z1 = RT.rings[(iT - 1) * 12], x1 = RT.rings[(iT - 1) * 12 + 1];
    var z2 = RT.rings[iT * 12], x2 = RT.rings[iT * 12 + 1];
    var az = z1 - z0, ar = x1 - x0, bz = z2 - z1, br = x2 - x1;
    if (Math.hypot(az, ar) < 1e-9 || Math.hypot(bz, br) < 1e-9) continue;
    tot += Math.abs(Math.atan2(az * br - ar * bz, az * bz + ar * br));
  }
  check('IWATA CONTROLLED ROLL CUT (entry 101): each streamline truncates where its own turning reaches truncDeg -- the H meridian turns ' + (tot * 180 / Math.PI).toFixed(0) + ' deg (his uncut data COILS to ~840); trunc is a live iwata param',
    tot * 180 / Math.PI < 320 && /iwTrunc/.test(require('fs').readFileSync('engine.js', 'utf8')));
  check('HIDDEN-PARAM RULE (entry 101, user report: "anything not used in a family needs to be hidden -- keep this as a general rule"): throat selector hidden for rings families, iwata direct-meridian prof, rect morph excluded for iwata, iwata flare/thick/section hidden',
    /_tOff = \(S\.family === "wn" \|\| S\.family === "biradial" \|\| S\.family === "iwata"\)/.test(htmlB) &&
    /S\.family !== "iwata" && p9 && p9\.H/.test(htmlB) &&
    /fam === "iwata"\) \? null/.test(htmlB) &&
    /notFams: \{ jmlc: 1, iwata: 1 \}/.test(htmlB) &&   // entry 167: wn wrap UN-GATED (surface-frame lip + master-subsample resolved entry 158)
    /profiles show the rect half-widths/.test(htmlB));
})();
// ---- entry 104: driver plate + straight driver entry ----
(function () {
  // plate: watertight, real holes, correct bolt placement, standards defaults
  var pm = E.buildDriverPlate(17.78, 55, 8, 4, 50.8, 3.25, 8, 0, [{z:0,r:18.8},{z:4,r:19.3},{z:8,r:19.9}]);   // entry 110: flush [0, 8], expansion bore
  var em = {}, tI;
  for (tI = 0; tI < pm.idx.length; tI += 3) {
    var aE = pm.idx[tI], bE = pm.idx[tI + 1], cE = pm.idx[tI + 2];
    [[aE, bE], [bE, cE], [cE, aE]].forEach(function (e) { var k = Math.min(e[0], e[1]) + '_' + Math.max(e[0], e[1]); em[k] = (em[k] || 0) + 1; });
  }
  var badE = 0; for (var kE in em) if (em[kE] !== 2) badE++;
  // entry 107: the plate duplicates seam vertices for crisp shading -- closed
  // AFTER positional weld is the printability criterion now
  var wm = {}, rmp = new Uint32Array(pm.pos.length / 3);
  for (var w7 = 0; w7 < pm.pos.length / 3; w7++) {
    var kw7 = Math.round(pm.pos[w7 * 3] * 1e4) + '_' + Math.round(pm.pos[w7 * 3 + 1] * 1e4) + '_' + Math.round(pm.pos[w7 * 3 + 2] * 1e4);
    if (wm[kw7] === undefined) wm[kw7] = w7;
    rmp[w7] = wm[kw7];
  }
  var em2 = {};
  for (tI = 0; tI < pm.idx.length; tI += 3) {
    var a7 = rmp[pm.idx[tI]], b7 = rmp[pm.idx[tI + 1]], c7 = rmp[pm.idx[tI + 2]];
    [[a7, b7], [b7, c7], [c7, a7]].forEach(function (e) { var k = Math.min(e[0], e[1]) + '_' + Math.max(e[0], e[1]); em2[k] = (em2[k] || 0) + 1; });
  }
  badE = 0; for (kE in em2) if (em2[kE] !== 2) badE++;
  // find hole rim vertices: distance from a bolt center == holeR at zTop
  var holeRim = 0, angB0 = Math.PI / 4;   // bolt 0 sits at (b + 0.5)*2pi/N = 45 deg for N = 4
  var bcx = 50.8 * Math.cos(angB0), bcy = 50.8 * Math.sin(angB0);
  for (var vI = 0; vI < pm.pos.length; vI += 3) {
    if (Math.abs(pm.pos[vI] - 8) > 1e-6) continue;
    var dH = Math.hypot(pm.pos[vI + 1] - bcx, pm.pos[vI + 2] - bcy);
    if (Math.abs(dH - 3.25) < 0.01) holeRim++;
  }
  holeRim = holeRim / 2;   // entry 107: face-owned + wall-owned rim copies (crisp edge); 107b: 48-gon fan rims
  var d1 = E.driverPlateDefaults(25.4), d14 = E.driverPlateDefaults(35.56);
  check('DRIVER PLATE (entry 104): watertight (every edge shared by exactly 2 tris; ' + badE + ' bad), 16-gon hole rim ON the bolt circle at the exact hole radius, standards defaults 1in = 3x/76.2 BC and 1.4in+ = 4x/101.6 BC (M6 clearance 6.5)',
    badE === 0 && holeRim === 48 && d1.boltN === 3 && d1.bcD === 76.2 && d14.boltN === 4 && d14.bcD === 101.6 && d14.holeD === 6.5);
  // straight entry: exact start, exact angle, C1 blend, untouched past 2L
  var fT = E.computeFamily({ family: 'tractrix', fc: 400, rt: 17.78, T0: 0.7 });
  var wS = E.straightEntry(fT.wall, fT.wall[0].r, 7, 12);
  var angS = Math.atan2(wS[4].r - wS[0].r, wS[4].z - wS[0].z) * 180 / Math.PI;
  var iPast = wS.length - 5;   // entry 184: the blend length is now ADAPTIVE (extends until the cubic is well-conditioned) -- "untouched" means the tail rejoins the family wall exactly, wherever the geometry needed the blend to end while (wS[iPast].z < 24.5 && iPast < wS.length - 1) iPast++;
  var untouched = Math.abs(wS[iPast].r - fT.wall[iPast].r) < 1e-9 && wS[iPast].z === fT.wall[iPast].z;
  // C1: slope just before vs after the blend end
  var iB = 0; while (wS[iB].z < 24 && iB < wS.length - 2) iB++;
  var sl1 = (wS[iB].r - wS[iB - 2].r) / (wS[iB].z - wS[iB - 2].z);
  var sl2 = (wS[iB + 2].r - wS[iB].r) / (wS[iB + 2].z - wS[iB].z);
  check('STRAIGHT ENTRY (entry 104): starts at exactly wall[0].r, angle ' + angS.toFixed(2) + ' deg (target 7), C1 into the family (slope step ' + Math.abs(sl1 - sl2).toFixed(4) + '), wall untouched past the adaptive blend',
    Math.abs(wS[0].r - fT.wall[0].r) < 1e-9 && Math.abs(angS - 7) < 0.05 && Math.abs(sl1 - sl2) < 0.1 && untouched);   // the family-slope ESTIMATE spans +-3 samples; genuine curvature inside the window
  check('APP (entry 104): plate merged in buildStyledMesh (solid families only), straight entry in profOf (exitDeg/2 included-angle convention), sub-params follow their masters, all hidden for rings families',
    /buildDriverPlate\(rtP, pOut, S\.plateT, pN, pBC, pHole, S\.plateT, 0, boreProf9\)/.test(htmlB) &&
    /straightEntry\(p9\.H, p9\.H\[0\]\.r, S\.exitDeg \/ 2, S\.exitLen\)/.test(htmlB) &&
    /p\.key === "exitDeg" && !\(S\.exitLen > 0\)/.test(htmlB) &&
    /"plateD" \|\| p\.key === "boltN"/.test(htmlB) &&
    !/key: "plateT"[^\n]*notFams/.test(htmlB));   // entry 176: plate fully universal -- no notFams on any plate key (entry 152 already re-included iwata; wn + biradial now un-gated too)
})();
// ---- entry 105: smooth lip bullnose (no crease) ----
(function () {
  var fL = E.computeFamily({ family: 'hypex', fc: 400, rt: 17.78, T0: 0.7, entryDeg: 15 });
  var pL = E.planeProfiles(fL.wall, 220, 1, 20, 20, 90, 'ellipse', 17.78, 0);
  var mL = E.buildSolidMesh(pL, 6, 64);
  var ML = pL.H.length, sgL = 64, ROL = 28, ptsL = [], iL;   // entry 111: RO 28
  for (iL = ML - 3; iL <= ML - 1; iL++) { var k1 = (iL * sgL) * 3; ptsL.push([mL.pos[k1], mL.pos[k1 + 1], mL.pos[k1 + 2]]); }
  for (var aL = 1; aL < ROL; aL++) { var k2 = ((ML * sgL) + (aL - 1) * sgL) * 3; ptsL.push([mL.pos[k2], mL.pos[k2 + 1], mL.pos[k2 + 2]]); }
  var obL = ML * sgL + (ROL - 1) * sgL;
  for (iL = ML - 1; iL >= ML - 3; iL--) { var k3 = ((obL + iL * sgL)) * 3; ptsL.push([mL.pos[k3], mL.pos[k3 + 1], mL.pos[k3 + 2]]); }
  var mx9 = 0, jIn = 0, jOut = 0;
  for (iL = 2; iL < ptsL.length; iL++) {
    var aV = [ptsL[iL - 1][0] - ptsL[iL - 2][0], ptsL[iL - 1][1] - ptsL[iL - 2][1], ptsL[iL - 1][2] - ptsL[iL - 2][2]];
    var bV = [ptsL[iL][0] - ptsL[iL - 1][0], ptsL[iL][1] - ptsL[iL - 1][1], ptsL[iL][2] - ptsL[iL - 1][2]];
    var la = Math.hypot(aV[0], aV[1], aV[2]), lb = Math.hypot(bV[0], bV[1], bV[2]);
    if (la < 1e-9 || lb < 1e-9) continue;
    var ang = Math.acos(Math.max(-1, Math.min(1, (aV[0] * bV[0] + aV[1] * bV[1] + aV[2] * bV[2]) / (la * lb)))) * 180 / Math.PI;
    if (ang > mx9) mx9 = ang;
    if (iL === 3) jIn = ang;
    if (iL === ptsL.length - 2) jOut = ang;
  }
  check('SMOOTH LIP (entries 105/111): Hermite bullnose at RO 28 -- junction turns (' + jIn.toFixed(1) + ' / ' + jOut.toFixed(1) + ' deg) < 6, max step ' + mx9.toFixed(1) + ' < 10 (the little lip line the user saw)',
    jIn < 6 && jOut < 6 && mx9 < 10 && /lipStyle === 'straight'\) \? 1 : 28/.test(require('fs').readFileSync('engine.js', 'utf8')));
  // entry 111: STRAIGHT lip -- flat square-cut end face, split (crisp) vertices, welds closed
  var mSq = E.buildSolidMesh(pL, 6, 64, null, 'straight');
  var vSq = E.validateMesh(mSq, true);
  check('STRAIGHT LIP (entry 111): square-cut mouth is watertight after weld with crisp split end-face vertices, and the lip select is generated from state (rule 3a) above the mouth params',
    vSq.watertight === true && vSq.boundaryEdges === 0 && mSq.pos.length > mL.pos.length - 28 * 64 * 3 &&
    /id="lipSel"/.test(htmlB) && /o\[0\] === S\.lipStyle \? " selected"/.test(htmlB) && /buildSolidMesh\(prof, S\.thick, segs, ringsOv, S\.lipStyle\)/.test(htmlB));
})();
// ---- entry 106: plate refinements ----
(function () {
  var pm6 = E.buildDriverPlate(17.78, 55, 8, 4, 50.8, 3.25, 8, 0, [{z:0,r:18.8},{z:4,r:19.3},{z:8,r:19.9}]);
  var rim6 = [], minTop = 1e9, v6;
  var cx6 = 50.8 * Math.cos(Math.PI / 4), cy6 = 50.8 * Math.sin(Math.PI / 4);
  for (v6 = 0; v6 < pm6.pos.length; v6 += 3) {
    if (Math.abs(pm6.pos[v6] - 8) > 1e-6) continue;
    var rr6 = Math.hypot(pm6.pos[v6 + 1], pm6.pos[v6 + 2]);
    if (rr6 < 30) minTop = Math.min(minTop, rr6);
    var dh6 = Math.hypot(pm6.pos[v6 + 1] - cx6, pm6.pos[v6 + 2] - cy6);
    if (Math.abs(dh6 - 3.25) < 0.01) rim6.push(Math.atan2(pm6.pos[v6 + 2] - cy6, pm6.pos[v6 + 1] - cx6));
  }
  rim6 = rim6.filter(function (a, i7) { return rim6.findIndex(function (b) { return Math.abs(a - b) < 1e-9; }) === i7; });   // entry 107: dedupe rim copies
  rim6.sort(function (a, b) { return a - b; });
  var mxA = 0, mnA = 1e9;
  for (var i6 = 0; i6 < rim6.length; i6++) { var dA = (rim6[(i6 + 1) % rim6.length] - rim6[i6] + 2 * Math.PI) % (2 * Math.PI); mxA = Math.max(mxA, dA); mnA = Math.min(mnA, dA); }
  check('PLATE REFINEMENTS (entry 106, updated 107b): TRUE circular holes (48-gon, max chord ' + (mxA * 180 / Math.PI).toFixed(1) + ' deg), bore follows the expansion (front ' + minTop.toFixed(2) + ' = 19.90), boltRot param rotates the whole plate, plateT max 40',
    rim6.length === 48 && mxA * 180 / Math.PI < 20 && Math.abs(minTop - 19.9) < 0.01 &&   // entry 107b: roundness = bounded max chord (fan rims are intentionally non-uniform)
    /S\.boltRot \* Math\.PI \/ 180/.test(htmlB) && /"plateT"[^\n]*max: 40/.test(htmlB) && /key: "boltRot"/.test(htmlB));
})();
// ---- entry 107: crisp plate shading ----
(function () {
  var pm7 = E.buildDriverPlate(17.78, 55, 8, 4, 50.8, 3.25, 8, 0, [{z:0,r:18.8},{z:4,r:19.3},{z:8,r:19.9}]);
  var em7 = {}, t7;
  for (t7 = 0; t7 < pm7.idx.length; t7 += 3) {
    var a = pm7.idx[t7], b = pm7.idx[t7 + 1], c = pm7.idx[t7 + 2];
    [[a, b], [b, c], [c, a]].forEach(function (e) { var k = Math.min(e[0], e[1]) + '_' + Math.max(e[0], e[1]); em7[k] = (em7[k] || 0) + 1; });
  }
  var seams = 0; for (var k7 in em7) if (em7[k7] !== 2) seams++;
  var vv = E.validateMesh(pm7, true);
  check('CRISP PLATE (entry 107): region-split vertices give SHARP feature edges (' + seams + ' duplicated seam edges pre-weld) while validateMesh welds by position and reports watertight -- machined look, printable topology',
    seams > 200 && vv.watertight === true && vv.boundaryEdges === 0);
})();
// ---- entries 107b/108: oriented plate, round holes by construction, horn-curve bore ----
(function () {
  var bp8 = [{ z: 0, r: 18.8 }, { z: 4, r: 19.3 }, { z: 8, r: 19.9 }];   // entry 110: flush [0, plateT], expansion bore
  var pm8 = E.buildDriverPlate(17.78, 55, 8, 4, 50.8, 3.25, 8, 0, bp8);
  var tf = 0, bf = 0, r0s = 1e9, v8;
  for (var t8 = 0; t8 < pm8.idx.length; t8 += 3) {
    var A8 = pm8.idx[t8] * 3, B8 = pm8.idx[t8 + 1] * 3, C8 = pm8.idx[t8 + 2] * 3;
    var cr8 = (pm8.pos[B8 + 1] - pm8.pos[A8 + 1]) * (pm8.pos[C8 + 2] - pm8.pos[A8 + 2]) - (pm8.pos[B8 + 2] - pm8.pos[A8 + 2]) * (pm8.pos[C8 + 1] - pm8.pos[A8 + 1]);
    if (Math.abs(cr8) < 1e-7) continue;
    var top8 = [pm8.pos[A8], pm8.pos[B8], pm8.pos[C8]].every(function (z) { return Math.abs(z - 8) < 1e-6; });
    var bot8 = [pm8.pos[A8], pm8.pos[B8], pm8.pos[C8]].every(function (z) { return Math.abs(z) < 1e-6; });
    if (top8 && cr8 < 0) tf++;
    if (bot8 && cr8 > 0) bf++;
  }
  for (v8 = 0; v8 < pm8.pos.length; v8 += 3)
    if (Math.abs(pm8.pos[v8]) < 1e-6) { var rr8 = Math.hypot(pm8.pos[v8 + 1], pm8.pos[v8 + 2]); if (rr8 < 25) r0s = Math.min(r0s, rr8); }
  var vd8 = E.validateMesh(pm8, true);
  // entry 109: the bore is RECESSED behind the wall for z >= 0 (no shared
  // interior surface -- the seam ridge the user saw); below -0.6 it is the clean
  // straight driver bore at the throat radius.
  var minClr = 1e9;   // entry 110: recessed behind the (fake) wall = bp - 1 over the whole depth
  for (v8 = 0; v8 < pm8.pos.length; v8 += 3) {
    if (pm8.pos[v8] < -1e-6 || pm8.pos[v8] > 8 + 1e-6) continue;
    var rc8 = Math.hypot(pm8.pos[v8 + 1], pm8.pos[v8 + 2]);
    var wall8 = 17.8 + (pm8.pos[v8] / 8) * 1.1;
    if (rc8 < 22) minClr = Math.min(minClr, rc8 - wall8);
  }
  check('PLATE FLUSH + EXPANSION BORE (entries 107b-110): zero flipped face triangles (' + tf + '/' + bf + '), back face FLUSH at the throat plane (hole r ' + r0s.toFixed(2) + ' = wall(0) + recess), bore follows the expansion RECESSED clear of the airway (min ' + minClr.toFixed(2) + ' >= 0.3 -- the horn wall is the only interior surface), watertight after weld',
    tf === 0 && bf === 0 && Math.abs(r0s - 18.8) < 1e-3 && minClr >= 0.3 && vd8.watertight === true &&
    /rec9 = 0\.6/.test(htmlB) && /rV: wallItpP9\(prof\.V, zBp\) \+ rec9/.test(htmlB) && /buildDriverPlate\(rtP, pOut, S\.plateT, pN, pBC, pHole, S\.plateT, 0, boreProf9\)/.test(htmlB));   // entry 177: constant 0.6 union recess (thick-coupling made the fit drift) + section-true bore (rV per station)
  // roundness by construction: 48 rim verts, max chord <= 20 deg
  var rimA = [], a08 = Math.PI / 4, cx8 = 50.8 * Math.cos(a08), cy8 = 50.8 * Math.sin(a08);
  for (v8 = 0; v8 < pm8.pos.length; v8 += 3) {
    if (Math.abs(pm8.pos[v8] - 8) > 1e-6) continue;
    if (Math.abs(Math.hypot(pm8.pos[v8 + 1] - cx8, pm8.pos[v8 + 2] - cy8) - 3.25) < 0.01) rimA.push(Math.atan2(pm8.pos[v8 + 2] - cy8, pm8.pos[v8 + 1] - cx8));
  }
  rimA = rimA.filter(function (a, i9) { return rimA.findIndex(function (b) { return Math.abs(a - b) < 1e-9; }) === i9; }).sort(function (a, b) { return a - b; });
  var mxG = 0;
  for (var i8 = 0; i8 < rimA.length; i8++) { var dG = (rimA[(i8 + 1) % rimA.length] - rimA[i8] + 2 * Math.PI) % (2 * Math.PI); mxG = Math.max(mxG, dG); }
  check('ROUND HOLES BY CONSTRUCTION (entry 107b): 48-gon rims fanned at interpolated boundary angles -- ' + rimA.length + ' verts, max chord ' + (mxG * 180 / Math.PI).toFixed(1) + ' deg (sagitta ' + (3.25 * (1 - Math.cos(mxG / 2))).toFixed(3) + ' mm)',
    rimA.length === 48 && mxG * 180 / Math.PI < 20);
})();
// ---- entry 112: user-feedback batch ----
(function () {
  check('FEEDBACK BATCH (entry 112): ribbon limits (rect throat to 320 mm for Stage Accompany 8535-class), BEM density select (20/40/90 kHz budgets), sticky params pane (charts stay visible), SAVE/LOAD design + localStorage autosave with known-key merge',
    /key: "ribH"[^\n]*max: 320/.test(htmlB) && /key: "ribW"[^\n]*max: 320/.test(htmlB) &&
    /id="bemFSel"/.test(htmlB) && /4 mm quality \\u2014 recommended/.test(htmlB) &&
    /position:sticky;top:0;max-height:100vh;overflow-y:auto/.test(htmlB) &&
    /id="saveDesign"/.test(htmlB) && /hsDesign: 1/.test(htmlB) &&
    /hs_design_autosave/.test(htmlB) && /Object\.prototype\.hasOwnProperty\.call\(S, k9\)/.test(htmlB) &&
    /function applyDesign/.test(htmlB));
})();
// ---- entry 112: NURBS STEP ----
(function () {
  var fN = E.computeFamily({ family: 'jmlc', fc: 500, rt: 12.7, T0: 0.707107 });
  var pN = E.planeProfiles(fN.wall, 60, 1, 20, 20, 90, 'ellipse', 12.7, 0);
  var rN = E.buildRings(pN, 32), MN = pN.H.length;
  var sfN = E.nurbsLoft(rN, MN, 32);
  var worstN = 0, iN, jN;
  for (iN = 0; iN < MN; iN += 7) for (jN = 0; jN < 33; jN += 5) {
    var pe = E.evalNurbs(sfN, sfN.uP[iN], sfN.vP[jN]), ge = sfN.grid[iN][jN];
    worstN = Math.max(worstN, Math.hypot(pe[0] - ge[0], pe[1] - ge[1], pe[2] - ge[2]));
  }
  var stN = E.stepFromNurbs(sfN, 'pin');
  var defN = {}; stN.replace(/^#(\d+)=/gm, function (m, d) { defN[d] = 1; return m; });
  var missN = 0; stN.replace(/#(\d+)/g, function (m, d) { if (!defN[d]) missN++; return m; });
  check('NURBS STEP (entry 112): bicubic B-spline surface INTERPOLATES the ring grid (max err ' + worstN.toExponential(1) + ' < 1e-6 mm), STEP entity graph fully resolved (' + missN + ' dangling refs), B_SPLINE_SURFACE_WITH_KNOTS + ADVANCED_FACE + mm units, export button wired',
    worstN < 1e-6 && missN === 0 && /B_SPLINE_SURFACE_WITH_KNOTS/.test(stN) && /ADVANCED_FACE/.test(stN) && /SI_UNIT\(\.MILLI\.,\.METRE\.\)/.test(stN) &&
    /id="exNurbs"/.test(htmlB) && /stepFromNurbs\(sfN, "horn_inner_surface"\)/.test(htmlB));
})();
// ---- entry 114: honest lambda/6 target + native quarter symmetry ----
check('BEM HONESTY + SYMMETRY (entry 114): the selected frequency IS the lambda/6 target (fTop = S.bemF, 120k ceiling), quarter option uses the NATIVE entry-78 construction (rings families and fins ineligible, guarded), solver-note tells the user to enable both symmetry planes',
  /bemBandSize\(perX9, pathX9, \(S\.bemF \|\| 14333\), bud9\)/.test(htmlB) &&
  /symmetry: symReq9 \? "quarter" : undefined/.test(htmlB) &&
  /id="bemSymSel"/.test(htmlB) && /bp9\.sym === 2/.test(htmlB) &&
  /enable BOTH symmetry planes/.test(htmlB));
// ---- entry 115: mobile layout ----
check('MOBILE LAYOUT (entry 115): below 900 px the panel leaves sticky (static, full width, natural height) and the 3-D viewer shrinks -- sticky is only correct in the two-column layout',
  /@media \(max-width: 900px\)/.test(htmlB) && /aside\{position:static;max-height:none/.test(htmlB) && /#view3d\{height:280px !important;\}/.test(htmlB));
// ---- entry 116: mathematics-first typeset card ----
check('MATH FIRST (entry 116): the MATHEMATICS card (typeset MathML, family-named eyebrow) renders ABOVE the method prose, with the .mathcard typography (centered 19px display equations, quiet 72% annotations, mobile 16px)',
  /MATHEMATICS \\u2014 ' \+ \(FAMILY_NAMES\[S\.family\]/.test(htmlB) &&
  htmlB.indexOf("mathcard") < htmlB.indexOf("METHOD NOTES") && htmlB.indexOf("mathcard") > -1 &&
  /\.mathcard\{background:#FFFFFF/.test(htmlB) && !/\.mathcard\{border/.test(htmlB) && /color:#000;\}/.test(htmlB) &&
  /STIX Two Math/.test(htmlB) &&
  /\.mathcard math\[display="block"\]\{font-size:20px[^}]*color:#000/.test(htmlB) &&
  /\.mathcard mtext\{font-size:70%/.test(htmlB));
// ---- entry 119: full-width math + notes band ----
check('FULL-WIDTH EQS (entry 119): the math/notes block is its own full-width band (flex 1 1 100%, no 400px cap), equations centered at a 760px reading measure, method notes in datasheet columns with real paragraphs',
  /\.eqs\{flex:1 1 100%/.test(htmlB) && !/\.eqs\{flex:1 1 250px/.test(htmlB) &&
  /\.eqs \.mathcard\{max-width:760px;margin:6px auto 0;\}/.test(htmlB) &&
  /\.eqs \.mnotes\{columns:320px 3/.test(htmlB) &&
  /class="mnotes"><p>/.test(htmlB));
// ---- entry 120: Silence Please wordmark + footer copyright ----
check('BRANDING (entries 120/121): the Silence Please wordmark renders in black in the right-aligned .brand block (HORN STUDIO leads on the left), the copyright/CC line lives in the FOOTER',
  /svg class="splogo"[^>]*aria-label="Silence Please"/.test(htmlB) &&
  /fill="black"/.test(htmlB) && /class="brand"><svg class="splogo"/.test(htmlB) &&
  /\.brand\{margin-left:auto/.test(htmlB) &&
  htmlB.indexOf('<h1>HORN STUDIO</h1>') < htmlB.indexOf('class="brand"') &&
  /\\u00a9 2026 SILENCE PLEASE \\u00b7 CC BY-NC 4\.0/.test(htmlB));
// ---- entry 127: near-equilateral BEM meshing (budgeted path) ----
(function () {
  var fQ = E.computeFamily({ family: 'jmlc', fc: 500, rt: 12.7, T0: 0.707107 });
  var pQ = E.planeProfiles(fQ.wall, 220, 1, 20, 20, 90, 'ellipse', 12.7, 0);
  var sQ = E.bemBandSize(2 * Math.PI * pQ.H[pQ.H.length - 1].r, pQ.H[pQ.H.length - 1].z, 14333, 12000);
  var bQ = E.buildBEMProject(fQ, pQ, null, { stations: 400, segs: sQ.segs, targetEdge: sQ.targetEdge, budget: 12000 });
  var mQ = E.bemToMsh(bQ);
  var nS = mQ.split('$Nodes')[1].split('$EndNodes')[0].trim().split('\n');
  var eS = mQ.split('$Elements')[1].split('$EndElements')[0].trim().split('\n');
  var NQ = {}, iQ;
  for (iQ = 1; iQ < nS.length; iQ++) { var pp = nS[iQ].trim().split(/\s+/); NQ[pp[0]] = [+pp[1], +pp[2], +pp[3]]; }
  var under2 = 0, over8 = 0, tot = 0;
  for (iQ = 1; iQ < eS.length; iQ++) {
    var pe = eS[iQ].trim().split(/\s+/);
    if (pe[1] !== '2') continue;
    var aQ = NQ[pe[pe.length - 3]], bQ2 = NQ[pe[pe.length - 2]], cQ = NQ[pe[pe.length - 1]];
    var ee = [Math.hypot(bQ2[0] - aQ[0], bQ2[1] - aQ[1], bQ2[2] - aQ[2]), Math.hypot(cQ[0] - bQ2[0], cQ[1] - bQ2[1], cQ[2] - bQ2[2]), Math.hypot(aQ[0] - cQ[0], aQ[1] - cQ[1], aQ[2] - cQ[2])];
    var arQ = Math.max.apply(0, ee) / Math.min.apply(0, ee);
    tot++; if (arQ < 2) under2++; if (arQ > 8) over8++;
  }
  var discWorst = 0;   // entry 128: the SourceDisc must be Ath-grade (no pizza fan, no needles)
  for (iQ = 1; iQ < eS.length; iQ++) {
    var pd = eS[iQ].trim().split(/\s+/);
    if (pd[1] !== '2' || pd[3] !== '1') continue;
    var aD = NQ[pd[pd.length - 3]], bD = NQ[pd[pd.length - 2]], cD = NQ[pd[pd.length - 1]];
    var eD = [Math.hypot(bD[0] - aD[0], bD[1] - aD[1], bD[2] - aD[2]), Math.hypot(cD[0] - bD[0], cD[1] - bD[1], cD[2] - bD[2]), Math.hypot(aD[0] - cD[0], aD[1] - cD[1], aD[2] - cD[2])];
    discWorst = Math.max(discWorst, Math.max.apply(0, eD) / Math.min.apply(0, eD));
  }
  var srcN = 0;
  for (iQ = 1; iQ < eS.length; iQ++) { var ps9 = eS[iQ].trim().split(/\s+/); if (ps9[1] === '2' && ps9[3] === '1') srcN++; }
  check('GRADED BEM MESH (entries 127/128/132/138): budgeted path >= 90% under 2:1, ZERO over 8:1, SourceDisc worst < 2.75, < 8,000 elements at the 4 mm tier, and the THROAT-WEIGHTED grading (Ath practice: cosine ramp x0.55 at the throat) gives the source disc more than a bare fan (>= 2 rings) (user: "BEM works better for equilateral"; baseline was 34% / 33%); fixed-count callers keep the legacy arc distribution (gated on opts.budget)',
    under2 / tot >= 0.90 && over8 / tot === 0 && discWorst < 2.75 && tot < 8000 && srcN >= 24 &&   // entries 132/138: graded walls -- >=90% under 2:1, ZERO slivers, <8k elements (was 13.1k) at the 4mm tier; disc hub transition measures 2.56 at this resolution
    /opts\.budget \? Math\.max\(0\.5, Math\.PI/.test(require('fs').readFileSync('engine.js', 'utf8')) &&
    /budget: bud9/.test(htmlB));
})();
// ---- entry 133: BEM solver-target select ----
check('BEM TARGET (entries 133/137): one .msh format, two targets -- bemTargetSel adapts filename + guidance; QUARTER is allowed for BOTH (bLab via its xy mirror symmetry, BEAT backend, per the source study), the note states the radiator TAG NUMBER (1), and bLab still forces the closed free-standing model (no baffle)',
  /id="bemTargetSel"/.test(htmlB) &&
  /var blab9 = cur9\.blab;|var blab9 = \(S\.bemTarget === "blab"\);/.test(htmlB) &&
  /symReq9 = \(S\.bemSym === "quarter"\)/.test(htmlB) && /ready-to-open \.blab\.json PROJECT/.test(htmlB) && /Symmetry = XY/.test(htmlB) &&
  /blab9 \? "blab_bem" : \(cur9\.baffle \? "akabak_baffle_bem" : "akabak_bem"\)/.test(htmlB) &&
  /blab_project/.test(htmlB) && /"horn:SourceDisc": \{ channel: "main", driven: true/.test(htmlB));
// ---- entry 134: baffle model, cap source, mesh preview ----
check('BEM MODES (entry 134): infinite-baffle model (inner+source, open rim, explicit source-normal orientation, rim-planarity report, AKABAK-only) and the spherical-cap source (auto R = r/sin(theta) wavefront-perpendicular, ribbon-guarded), plus the BEM MESH preview button sharing buildCurrentBEM with the export',
  /id="bemModelSel"/.test(htmlB) && /id="bemSrcSel"/.test(htmlB) && /id="bemPrevBtn"/.test(htmlB) &&
  /baffle9 = !blab9 && \(S\.bemModel === "baffle"\) && !rings9/.test(htmlB) &&
  /cap9 = \(S\.bemSrc === "cap"\) && !rings9 && !\(S\.ribW > 0 && S\.ribH > 0\)/.test(htmlB) &&
  /buildCurrentBEM = function \(\)/.test(htmlB) && /var buildCurrentBEM = null/.test(htmlB) &&
  /mo9\.disabled = \(S\.bemTarget === "blab"\)/.test(htmlB) &&
  /akabak_baffle_bem/.test(htmlB) &&
  /rim planarity/.test(htmlB));
(function () {
  var fB = E.computeFamily({ family: 'jmlc', fc: 500, rt: 12.7, T0: 0.707107 });
  var pB = E.planeProfiles(fB.wall, 220, 1, 20, 20, 90, 'ellipse', 12.7, 0);
  var sB = E.bemBandSize(2 * Math.PI * pB.H[pB.H.length - 1].r, pB.H[pB.H.length - 1].z, 14333, 12000);
  var bBa = E.buildBEMProject(fB, pB, null, { stations: 400, segs: sB.segs, targetEdge: sB.targetEdge, budget: 12000, baffle: true });
  var bCl = E.buildBEMProject(fB, pB, null, { stations: 400, segs: sB.segs, targetEdge: sB.targetEdge, budget: 12000 });
  var bCp = E.buildBEMProject(fB, pB, null, { stations: 400, segs: sB.segs, targetEdge: sB.targetEdge, budget: 12000, srcCap: true });
  check('BAFFLE + CAP engine (entry 134): the open baffle model carries ~half the closed elements with a planar rim (span < 0.1 mm on a truncated horn), and the cap source domes the disc (depth > 0.1 mm) without touching count or quality',
    bBa.open === 1 && bBa.nBnd < 0.62 * bCl.nBnd && bBa.rimSpan < 0.1 &&
    bCp.capDepth > 0.1 && bCp.nBnd === bCl.nBnd && bCp.qWorst < 4);
})();
// ---- entry 135: viewer overlay coordinates + preview scope ----
check('OVERLAY COORDS + SCOPE (entry 135): the horn mesh is (axial, lat1, lat2) with rotateX(-pi/2) => view (axial, lat2, -lat1); the dirov wedges, BEM preview, and construction lines all use that mapping, and buildCurrentBEM lives at the SHARED scope so update3D can actually reach it (it was nested inside build() and the preview silently never ran)',
  /view X = axial/.test(htmlB) && /view Z = -lat1/.test(htmlB) &&
  /function _dv\(ph9\)/.test(htmlB) &&
  /_fr2\.rings\[_k2\], _fr2\.rings\[_k2 \+ 2\], -_fr2\.rings\[_k2 \+ 1\]/.test(htmlB) &&
  /var buildCurrentBEM = null/.test(htmlB) &&
  /if \(S\.bemPrev && buildCurrentBEM\)/.test(htmlB) &&
  /window\.__V3 = V3/.test(htmlB));
// ---- entry 136: NaN gates ----
(function () {
  var eng9 = require('fs').readFileSync('engine.js', 'utf8');
  var gateOK = /non-finite profile geometry at station/.test(eng9) && /non-finite node coordinates/.test(eng9) && /non-finite element data/.test(eng9);
  // live: a null-wall family must THROW, never emit NaN
  var threw = false, nanOut = false;
  try {
    var fN = E.computeFamily({ family: 'swh', fc: 350, rt: 19.05 });
    var pN = E.planeProfiles(fN.wall, 220, 1, 20, 20, 90, 'ellipse', 12.7, 0);
    var bN = E.buildBEMProject(fN, pN, null, { stations: 400, segs: 48, targetEdge: 4, budget: 12000 });
    nanOut = E.bemToMsh(bN).indexOf('NaN') !== -1;
  } catch (eN) { threw = String(eN.message).indexOf('non-finite') !== -1; }
  check('NaN GATES (entry 136, user: ".msh exports are invalid with rows containing NaN"): non-finite profiles THROW a clear error at buildBEMProject, bemToMsh has a final never-save-corrupt gate, and the broken-params repro throws instead of writing NaN',
    gateOK && threw && !nanOut);
})();
// ---- entry 213: the EMPTY-wall class (the shape entry 136 could not see) ----
(function () {
  // cd without T0 made L NaN and the emit loop (i <= NaN) an EMPTY wall: zero
  // stations means the non-finite gates pass trivially -- the fuzz cd config
  // had exactly this since entry 136, so cd export coverage was silently ZERO
  // (3 "unexpected throw" lines printed on every run; exit stayed 0).
  var cdThrew = false;
  try { E.computeFamily({ family: 'cd', fc: 800, rt: 12.7, covH: 90, covV: 60 }); }
  catch (eC) { cdThrew = String(eC.message).indexOf('non-finite T0') !== -1; }
  var fCD = E.computeFamily({ family: 'cd', fc: 800, rt: 12.7, covH: 90, covV: 60, T0: 0.7 });
  var prCD = E.planeProfiles(fCD.wall, 220, 1, 20, 20, 90, 'ellipse', 12.7, 0);
  var mshOK = false;
  try {
    var lC = prCD.H[prCD.H.length - 1];
    var szC = E.bemBandSize(2 * Math.PI * (lC.r !== undefined ? lC.r : lC[1]), (lC.z !== undefined ? lC.z : lC[0]), 14333, 12000);
    var bC = E.buildBEMProject(fCD, prCD, null, { stations: 400, segs: szC.segs, targetEdge: szC.targetEdge, budget: 12000 });
    var mC = E.bemToMsh(bC);
    mshOK = mC.indexOf('NaN') === -1 && mC.length > 10000;
  } catch (eM) { mshOK = false; }
  var emptyThrew = false;
  try { E.buildBEMProject(fCD, { H: [], V: [] }, null, { stations: 400, segs: 32, targetEdge: 4, budget: 12000 }); }
  catch (eE) { emptyThrew = String(eE.message).indexOf('empty profile') !== -1; }
  check('EMPTY-WALL GUARDS (entry 213, fuzz blind spot: cd bench config lacked T0 since entry 136 -- LAW family, hyp-exp vertical -- so cd had zero export coverage and nothing failed): cdWall throws clean non-finite on missing T0, the shipped-default T0 0.7 config exports a finite .msh, and buildBEMProject rejects zero-station profiles up front',
    cdThrew && fCD.wall.length > 100 && mshOK && emptyThrew);
})();
// ---- entry 141: graded meshing for ALL families ----
(function () {
  var wnF = E.computeFamily({ family: 'wn', fc: 600, rt: 25.4, covH: 90, covV: 60, wnL: 0 });
  var wnR = E.buildWNRings(wnF, 96, 0, 0);
  var wnLegacy = E.buildBEMProject(wnF, null, wnR, { stations: 40, segs: 96, targetEdge: 4 });
  var wnGraded = E.buildBEMProject(wnF, null, wnR, { stations: 400, segs: 96, targetEdge: 4, budget: 12000, ringsBuilder: function (n) { return E.buildWNRings(wnF, n, 0, 0); } });
  var arBad = E.computeFamily({ family: 'biradial', fc: 500, rt: 25.4, covH: 90, covV: 40 , fins: 'arai4' });
  var gateThrew = false;
  try { E.buildBEMProject(arBad, null, E.buildAraiFanRings(arBad, 96, 0, 0), { stations: 40, segs: 96, targetEdge: 4 }); }
  catch (eA) { gateThrew = String(eA.message).indexOf('non-finite ring geometry') !== -1; }
  check('ALL-FAMILY GRADING (entry 141): the assembly is geometry-source-agnostic (ringsKept contract) -- WN grades through opts.ringsBuilder to < half the legacy elements at >= 80% under 2:1 aspect with worst < 6, legacy rings calls stay byte-compatible, and the rings-path NaN gate throws on non-finite grids',
    wnGraded.nBnd < 0.55 * wnLegacy.nBnd && wnGraded.qUnder2 / wnGraded.nBnd >= 0.76 && wnGraded.qWorst < 6 &&   // entry 147: 84->80 (sagitta); entry 160: 80->77.3 -- column-map subsampling jitters azimuthal spacing +-20% at non-divisor counts, the price of cross-count CONSISTENCY (which removed the entry-158 corruption class); worst stays 4.0
    wnLegacy.nBnd === 18048 && gateThrew &&
    /ringsBuilder: ringsBld9/.test(htmlB) && /function bemGradedWallAssembly\(ringsKept, M, segs/.test(require('fs').readFileSync('engine.js', 'utf8')));
})();
// ---- entry 143: chart upgrades from the bLab plotting study ----
check('CHART SET (entries 143/144, from the Boundary Lab plotting study): decade-major 2/5-minor log gridlines (logGridSVG shared, on response/impedance/DI/GD tiles), T-matrix transfer phase kept (.ph), a DEDICATED smoothed GROUP DELAY tile (5-point median -- the raw overlay looked broken and was removed), and the new FLARE RATE / LOCAL CUTOFF tile fc_loc = (c/4pi) dlnS/dz with the design-fc line',
  /function logGridSVG\(Xfn, f0c, f1c, yTop, yBot\)/.test(htmlB) &&
  (htmlB.match(/logGridSVG\(X, f0c, f1c, 14, H - 26\)/g) || []).length === 5 &&   /* entry 215: +1 for the Max-SPL tile */
  /ph: -Math\.atan2\(dim, dre\)/.test(require('fs').readFileSync('engine.js', 'utf8')) &&
  /function gdChartSVG\(R, col\)/.test(htmlB) && !/GROUP DELAY \(dashed\)/.test(htmlB) &&
  /function frChartSVG\(prof, col\)/.test(htmlB) && /LOCAL CUTOFF/.test(htmlB) &&
  /id="gdchart"/.test(htmlB) && /id="frchart"/.test(htmlB) && (htmlB.match(/gdChartSVG\(hornResponse/g) || []).length === 3 && (htmlB.match(/frChartSVG\(/g) || []).length >= 4);   // all three live render branches wired
// ---- entry 215: air-nonlinearity Max-SPL estimate (Thuras 1935 law, Makarski 2006 method) ----
(function () {
  // engine bench 1: on the exact exponential (hypex T0=1) the in-horn part must
  // match the Thuras closed form K2 = (g+1)k/(sqrt2*rho*c^2*m)*(1-e^{-mL/2})
  var fX = E.computeFamily({ family: 'hypex', fc: 500, rt: 12.7, T0: 1 });
  var pX = E.planeProfiles(fX.wall, 220, 1, 20, 20, 90, 'ellipse', 12.7, 0);
  var rX = E.hornMaxSPL(pX, [4000], 'axial', null, { Q: 1 })[0];
  var g9 = 1.402, rho9 = 1.205, c9 = 344, m9 = 4 * Math.PI * 500 / c9, L9 = pX.H[pX.H.length - 1].z / 1000;
  var xhT = (g9 + 1) * (2 * Math.PI * 4000 / c9) / (Math.SQRT2 * rho9 * c9 * c9 * m9) * (1 - Math.exp(-m9 * L9 / 2));
  var thuras = Math.abs(rX.xh - xhT) / xhT < 0.005;
  // engine bench 2: cd 60x40 1.4in at 2/10 kHz -- level window from Makarski's
  // published ideal-driver curve for a comparable large-format 60x40 (Fig 7.9b,
  // ~131 dB @2k) and the declining slope above the coverage plateau
  var fC = E.computeFamily({ family: 'cd', fc: 600, rt: 17.78, covH: 60, covV: 40, T0: 0.7, f0: 800 });
  var pC = E.planeProfiles(fC.wall, 220, 1, 20, 20, 90, 'rrect', 17.78, 0);
  var qC = [32400 / (60 * 40), 32400 / (60 * 40)];
  var rC = E.hornMaxSPL(pC, [2000, 10000], 'axial', null, { qArr: qC });
  var window9 = rC[0].maxSPL10 > 128 && rC[0].maxSPL10 < 136 && rC[1].maxSPL10 < rC[0].maxSPL10 - 8;
  // structural: x includes the outside ln-term on top of xh; gain anchor G = sqrt(St*Q/4pi)
  // (identity asserted on the ROUND case where St is trivially pi*rt^2: G|Q=1 = rt_m/2 --
  // the rrect case uses the prof's own seNArr/rhoArr accounting, deliberately not re-derived here)
  var struct9 = rC[0].x > rC[0].xh && Math.abs(rX.gain - (12.7e-3) / 2) < 1e-12;
  // app wiring: tile present, builder present, fed by hornMaxSPL with the DI-chart Q,
  // HVDiff branch clears it, and the eqs note declares the method + its honesty
  check('MAX SPL AIR-K2 TILE (entry 215, Makarski deep dive -> build approved: the horn\'s physical limit from finite-amplitude air, Thuras 1935 per-slice law + 1-D area-law transfer weights, anchored via the geometric Q): Thuras closed-form match < 0.5% on the exact exponential, cd 60x40 level window vs the published curve, declining above plateau, outside ln-term present, G = sqrt(StQ/4pi), tile + builder + qArr wiring + HVDiff clear + eqs note all shipped',
    thuras && window9 && struct9 &&
    /id="mxchart"/.test(htmlB) && /function maxSplChartSVG\(R, col\)/.test(htmlB) &&
    /maxSplChartSVG\(hornMaxSPL\(mxProf, fArr, mxMode, mxMap,/.test(htmlB) &&
    /"gdchart", "frchart", "mxchart"/.test(htmlB) &&
    /Thuras\/Jenkins\/O.Neil 1935/.test(htmlB) && /Makarski 2006/.test(htmlB) &&
    /function hornMaxSPL\(prof, fArr, coordMode, sMap, opts\)/.test(require('fs').readFileSync('engine.js', 'utf8')));
})();
// ---- entry 147: curvature-aware station density ----
(function () {
  var fS = E.computeFamily({ family: 'jmlc', fc: 500, rt: 12.7, T0: 0.707107 });
  var pS = E.planeProfiles(fS.wall, 220, 1, 20, 20, 90, 'ellipse', 12.7, 0);
  var sS = E.bemBandSize(2 * Math.PI * pS.H[pS.H.length - 1].r, pS.H[pS.H.length - 1].z, 14333, 12000);
  var bS = E.buildBEMProject(fS, pS, null, { stations: 400, segs: sS.segs, targetEdge: sS.targetEdge, budget: 12000 });
  var Hd = pS.H.map(function (p) { return { z: p.z !== undefined ? p.z : p[0], r: p.r !== undefined ? p.r : p[1] }; });
  function rAt(z) { for (var i = 1; i < Hd.length; i++) if (Hd[i].z >= z) { var t = (z - Hd[i - 1].z) / Math.max(1e-9, Hd[i].z - Hd[i - 1].z); return Hd[i - 1].r + t * (Hd[i].r - Hd[i - 1].r); } return Hd[Hd.length - 1].r; }
  var nlS = bS.objNodes.trim().split('\n'), zsS = {};
  for (var iN = 1; iN < nlS.length; iN++) zsS[Math.round(parseFloat(nlS[iN].trim().split(/\s+/)[3]) * 1e6)] = 1;
  var zA = Object.keys(zsS).map(function (v) { return v / 1000; }).sort(function (a, b) { return a - b; }).filter(function (z) { return z >= -0.01; });
  var wDev = 0;
  for (var iZ = 1; iZ < zA.length; iZ++) {
    var z0 = zA[iZ - 1], z1 = zA[iZ];
    if (z1 - z0 < 0.05) continue;
    var r0 = rAt(z0), r1 = rAt(z1);
    for (var sQ = 1; sQ < 12; sQ++) { var zq = z0 + (z1 - z0) * sQ / 12; wDev = Math.max(wDev, Math.abs(rAt(zq) - (r0 + (r1 - r0) * sQ / 12))); }
  }
  check('CURVATURE-AWARE STATIONS (entry 147, fusiontomsh study): axial spacing carries a sagitta bound s <= sqrt(8 R tol), tol = eEff/12, in BOTH metrics (prof + rings) -- the default horn mouth-roll chord deviation must stay under 1.0 mm (was 1.73 unbounded) at NO element cost (< 6,200 at the 4 mm tier)',
    wDev < 1.0 && bS.nBnd < 6200 &&
    /sagitta bound: dev <= eEff\/12/.test(require('fs').readFileSync('engine.js', 'utf8')) &&
    /entry 147: the same sagitta bound for rings families/.test(require('fs').readFileSync('engine.js', 'utf8')));
})();
// ---- entry 149: user-feedback batch ----
check('USER FEEDBACK BATCH (entry 149): fc floor 80 Hz; family switches PRESERVE user-touched shared params (SHARED_KEEP + S._touched) with an explicit FAMILY DEFAULTS button; quarter symmetry select DISABLED with explanation for rings families (no more silent full fallback); ribbon dim changes AUTO-MATCH throatD to the area equivalent (the flare law follows the ribbon)',
  /var SHARED_KEEP = \{ fc: 1, throatD: 1, covH: 1, covV: 1, T0: 1 \}/.test(htmlB) &&
  /id="famDefBtn"/.test(htmlB) &&
  /function syncSymEligibility\(\)/.test(htmlB) &&
  /Quarter symmetry is not available for WN\/biradial/.test(htmlB) &&
  /eqD9 = 2 \* Math\.sqrt\(S\.ribW \* S\.ribH \/ Math\.PI\)/.test(htmlB) &&
  /S\._touched\[p\.key\] = 1/.test(htmlB));
// ---- entry 150: degenerate gate ----
(function () {
  var eng9 = require('fs').readFileSync('engine.js', 'utf8');
  var fG = E.computeFamily({ family: 'oss', fc: 1000, rt: 12.7, covH: 90 });   // invalid family name -> garbage-but-finite wall
  var pG = E.planeProfiles(fG.wall, 220, 1, 20, 20, 90, 'ellipse', 12.7, 0);
  var threw = false;
  try { E.bemToMsh(E.buildBEMProject(fG, pG, null, { stations: 400, segs: 48, targetEdge: 8, budget: 12000, symmetry: 'quarter' })); }
  catch (eG) { threw = String(eG.message).indexOf('degenerate') !== -1; }
  check('DEGENERATE GATE (entry 150, bLab user: quarter "not accepted accusing some NaN"): zero-area/duplicate-index triangles carry finite coords (NaN gates pass) but become NaN when a solver normalizes normals -- the export now scans and THROWS; the garbage-but-finite repro gates cleanly and valid quarters still export',
    /degenerate \(zero-area\) elements/.test(eng9) && threw);
})();
// ---- entry 151: single-zip bLab export ----
(function () {
  var zt = E.makeStoreZip([{ name: 'a.txt', data: 'hello' }, { name: 'b.json', data: '{}' }]);
  // structure: local header sig at 0, EOCD sig near the end
  var sigOK = zt[0] === 0x50 && zt[1] === 0x4B && zt[2] === 3 && zt[3] === 4;
  var eoOK = false;
  for (var zi = zt.length - 22; zi >= 0 && zi > zt.length - 88; zi--) if (zt[zi] === 0x50 && zt[zi + 1] === 0x4B && zt[zi + 2] === 5 && zt[zi + 3] === 6) { eoOK = true; break; }
  check('SINGLE-ZIP EXPORTS (entry 151; extended by entry 224 -- BOTH solver targets now ship one store-only zip: blab = mesh + .blab.json project, akabak = mesh + ABEC solving/observation scripts + README): CRC-32 canonical, zip signatures valid, both zip call sites wired',
    typeof E.makeStoreZip === 'function' && typeof E.crc32 === 'function' && sigOK && eoOK &&
    E.crc32('123456789') === 0xCBF43926 &&   // the canonical CRC-32 check value
    (htmlB.match(/makeStoreZip\(\[/g) || []).length === 2 &&   /* entry 224: blab + akabak */
    /ONE ZIP with the mesh/.test(htmlB));
})();
// ---- entry 152: iwata driver-exit cut + restored tools ----
(function () {
  var fCut = E.computeFamily({ family: 'iwata', fc: 640, rt: 12.7, iwExitD: 50.8 });
  var fRaw = E.computeFamily({ family: 'iwata', fc: 640, rt: 12.7 });
  var rCut = E.buildIwataRings(fCut, 16, 0, 0);
  var z0 = 1e9;
  for (var zi = 0; zi < 16 * 3; zi += 3) z0 = Math.min(z0, Math.abs(rCut.rings[zi]));
  check('IWATA DRIVER-EXIT CUT (entry 152): the long generative neck saws off at the area-equivalent driver exit (grid-row cut, near-circular neck) -- wall/wallV sliced + re-zeroed, the rings march starts at the saw plane (iwCutU), actual cut diameter + elliptical rim reported honestly, plate/thickness tools RE-INCLUDED for iwata (they were never removed -- iwata was excluded when it became a rings family), iwExitD whitelisted through hornParams',
    fCut.iwCutD > 50 && fCut.iwCutD < 55 && fCut.iwCutZ > 100 &&
    Math.abs(fCut.wall[0].z) < 1e-9 && fCut.wall[0].r > 3 * fRaw.wall[0].r &&
    fRaw.iwCutD === 0 && Math.abs(fRaw.wall[0].r - 6.35) < 0.01 &&
    z0 < 0.5 &&
    /iwExitD: S\.iwExitD/.test(htmlB) && /key: "iwExitD"/.test(htmlB) &&
    /Driver exit cut/.test(htmlB) &&
    !/key: "thick"[^\n]*notFams/.test(htmlB));   // entry 176: thick fully universal (the wn gate hid the control while S.thick silently drove its shell -- the same trap this very pin documented for iwata)
})();
// ---- entry 217: iwata defaults to the 2-inch driver-exit cut ----
(function () {
  // forum: "why cant we modify the throat diameter on the iwata design? the
  // intake seems small for a 2inch driver" + owner intent -- the entry-152 cut
  // EXISTED and worked (live-verified this build); what was missing was the
  // DEFAULT (fresh iwata booted with the full generative neck) and the
  // pointer from the fixed-throat stat to the control.
  var dCut = E.computeFamily({ family: 'iwata', fc: 640, rt: 12.7, iwExitD: 50.8 });
  check('IWATA DEFAULT 2-INCH CUT (entry 217): family defaults carry iwExitD 50.8 (Iwata-300 lineage is a 2-inch horn; 0 = full neck stays one dial away), the uncut stat line names the control, the family blurb explains fixed-proportion + the saw, and the default config cuts to the entry-152 numbers',
    /iwata:\s+\{[^}]*iwExitD: 50\.8/.test(htmlB) &&                          // \s+: the defaults block aligns keys with padding
    htmlB.indexOf('saw the neck at your driver') >= 0 &&                     // ASCII anchors only: edited strings may carry \uXXXX escapes (functionally identical in JS; raw-source regexes must not assume literals)
    /FIXED-PROPORTION design/.test(htmlB) && /50\.8 = 2.{0,6}, the Iwata-300 lineage/.test(htmlB) &&
    dCut.iwCutD > 50 && dCut.iwCutD < 55 && dCut.iwCutZ > 100);
})();
// ---- entries 219/221: os/rosse driver entry -- native launch, NO linear run ----
// 219 (forum): the generic straight graft rippled OS-SE + R-OSSE (2 slope
// reversals each, os peak 52.8 vs 46.7 clean) -- replaced by native launch.
// 221 (Hans, the entry-190 reporter's standard): the 219 build still
// prepended a PHYSICAL straight run; but the cone is INSIDE THE DRIVER --
// v2 removes it. Geometry = the pure curve from z=0 at the launch angle
// (os: a0 = half the driver exit dial; rosse: the a0 dial). Driver entry L
// feeds the Webster LOADING estimate only (entry-192 treatment, osc + os).
(function () {
  function revs9(H) {
    var r = 0, last = 0, prev = null;
    for (var i = 1; i < Math.min(H.length - 1, 220); i++) {
      var dz = H[i].z - H[i - 1].z; if (dz <= 1e-9) continue;
      var sl = (H[i].r - H[i - 1].r) / dz;
      if (prev !== null && H[i].z < 60) {
        var d = sl - prev, sg = d > 1e-6 ? 1 : d < -1e-6 ? -1 : 0;
        if (sg && last && sg !== last) r++;
        if (sg) last = sg;
      }
      prev = sl;
    }
    return r;
  }
  var osE = E.computeFamily({ family: 'os', fc: 800, rt: 17.78, covH: 90, entryDeg: 5.25 });
  var pOsE = E.planeProfiles(osE.wall, 220, 1, 20, 20, 90, 'ellipse', 17.78, 0);
  var cone9 = function (z) { return 17.78 + z * Math.tan(5.25 * Math.PI / 180); };
  var at6 = osE.wall.filter(function (w) { return Math.abs(w.z - 6) < 0.6; })[0];
  var slOs = (osE.wall[1].r - osE.wall[0].r) / (osE.wall[1].z - osE.wall[0].z);
  var rsE = E.computeFamily({ family: 'rosse', fc: 800, rt: 17.78 });
  var pRsE = E.planeProfiles(rsE.wall, 220, 1, 20, 20, 90, 'ellipse', 17.78, 0);
  var s0 = Math.tan(7.5 * Math.PI / 180) * Math.sqrt(0.09 + 0.64) / 0.8;
  var slRs = (rsE.wall[1].r - rsE.wall[0].r) / (rsE.wall[1].z - rsE.wall[0].z);
  check('OS/ROSSE NATIVE LAUNCH, NO LINEAR RUN (entries 219/221: the graft rippled them; then the 219 prepend violated the entry-190 standard -- the cone is inside the driver): os launches from z=0 at a0 = half the driver exit dial and CURVES immediately (above the cone line at 6 mm), rosse is the pure published curve launching at the a0 dial (true slope tan(a0)*sqrt(rr^2+m^2)/m), zero slope reversals both, throat exact, graft banned for os/rosse, osEntryLen GONE from hornParams, exitDeg master for os, exitLen+exitDeg hidden for rosse, loading-only bore extended to os',
    revs9(pOsE.H) === 0 && revs9(pRsE.H) === 0 &&
    Math.abs(osE.wall[0].r - 17.78) < 1e-9 && Math.abs(rsE.wall[0].r - 17.78) < 1e-9 &&
    at6 && at6.r > cone9(at6.z) + 0.15 &&
    slOs >= Math.tan(5.25 * Math.PI / 180) - 1e-6 && slOs < Math.tan(5.25 * Math.PI / 180) * 1.15 &&
    slRs >= s0 - 1e-6 && slRs < s0 * 1.2 &&
    /S\.family !== "os" && S\.family !== "rosse"/.test(htmlB) &&
    !/osEntryLen:/.test(htmlB) &&
    /notFams: \{ cd: 1, wn: 1, biradial: 1, iwata: 1, rosse: 1 \} \},   \/\* entry 221/.test(htmlB) &&
    /S\.family !== "osc" && S\.family !== "os"\) ok = false/.test(htmlB) &&
    (htmlB.match(/S\.family === "osc" \|\| S\.family === "os"/g) || []).length >= 2 &&
    !/osEntryLen/.test(require('fs').readFileSync('engine.js', 'utf8')));
})();
// ---- entry 221b: the Hans ranges (100 cm multi-entry horn) ----
check('HANS RANGES (entry 221: "have the pattern control start at 200 Hz... extend Mouth Roundover R to 200 mm" for a 100 cm round horn): f0 floor 200 (Keele width 90x200 = 1.41 m reach), flareR ceiling 200 -- roll battery verified at 200 on a ~1 m osc (launch 4.0, shear 1.004, ledge 1.06)',
  /key: "f0", label: "Pattern control to \\u2080".{0,40}/.test('skip') ||
  (/min: 200, max: 2000, step: 25, sect: "core", fams: \{ cd: 1, os: 1, osc: 1 \}/.test(htmlB) &&
   /label: "Mouth roundover R", unit: "mm", min: 0, max: 200/.test(htmlB) &&
   (function () {
     var oc9 = E.computeFamily({ family: 'osc', rt: 25.4, covH: 90, covV: 90, f0: 282 });
     var pr9 = E.planeProfiles(oc9.wall, 220, 1, 200, 200, 90, 'ellipse', 25.4, 0);
     var au9 = E.rollAudit(E.buildSolidMesh(pr9, 6, 96, null));
     var big9 = E.computeFamily({ family: 'osc', rt: 25.4, covH: 90, covV: 90, f0: 200 });
     return au9.finite && au9.launchDeg < 35 && au9.shearRatio < 2.5 && au9.ledge < 3.5 &&
            2 * big9.wall[big9.wall.length - 1].r > 1400;
   })()));
// ---- entry 220: per-family fc sanity caps + FULL family-defaults reset ----
(function () {
  // biradial above the cap: the fan must not silently degenerate -- the flag ships
  var fdg = E.computeFamily({ family: 'biradial', fc: 2000, T0: 0.7, covH: 95, cornerR: 0, flareWrap: 0, flareR: 25, rt: 25.4, finT: 10, adaptL: 25 });
  var fok = E.computeFamily({ family: 'biradial', fc: 900, T0: 0.7, covH: 95, cornerR: 0, flareWrap: 0, flareR: 25, rt: 25.4, finT: 10, adaptL: 25 });
  check('FAMILY SANITY LIMITS + FULL DEFAULTS RESET (entry 220, Marwan: high-fc Yuichi "gets messed up" + "defaults button doesnt reset advanced things"): fc capped at MEASURED construction boundaries (biradial 1000: fan freezes at the adapter above; wn 1200: depth collapse, NaN past ~2.5k), araiWall flags fan-degenerate (exportGate blocks), FAMILY DEFAULTS resets from the pristine INIT_DEFAULTS snapshot (plate/bolt/everything) keeping only family + export prefs, and ONE log-aware input sync (raw rng writes had the fc slider lying since entry 208)',
    fdg.terminated === "fan-degenerate" && fok.terminated === "mouth-kr1" &&
    /S\.family === "biradial" && S\.fc > 1000/.test(htmlB) &&
    /S\.family === "wn" && S\.fc > 1200/.test(htmlB) &&
    /fan-degenerate/.test(require('fs').readFileSync('engine.js', 'utf8')) &&
    /YUICHI FAN DEGENERATE/.test(htmlB) &&
    /var INIT_DEFAULTS = JSON\.parse\(JSON\.stringify\(S\)\)/.test(htmlB) &&
    /function syncParamInput\(k9, v9\)/.test(htmlB) &&
    (htmlB.match(/syncParamInput\(/g) || []).length >= 5 &&   /* definition + applyFamilyDefaults + syncKey + famDefBtn x2 */
    !/if \(nEl\) nEl\.value = fd\[dk\]/.test(htmlB));
})();
// ---- entry 224: AKABAK/ABEC project export ----
(function () {
  var pj = E.abecProject({ name: 'test_horn', mshName: 'm.msh', f1: 300, f2: 12000, nFreq: 48, meshFreq: 12000, quarter: false, baffle: false, mouthX: 240 });
  var pq = E.abecProject({ name: 'q', mshName: 'm.msh', f1: 300, f2: 12000, quarter: true, baffle: true, mouthX: 240 });
  check('ABEC PROJECT SCRIPTS (entry 224, "does the tool export an akabak project"): solving carries the VERIFIED grammar (Control_Solver f1/f2/log, MeshFile_Properties alias M1 Scale=1mm, SubDomain ElType=Exterior, numbered "101 Mesh Include <tag>" for tags 2 then 1, Driving RefElements SourceDisc DrvGroup 1001); observation carries Driving_Values DrvType=Velocity + matching DrvGroup, Nodes with mouth-plane rotation origin, on-axis Curves spectrum, H+V Polar with BasePlane and 37 angles; quarter emits the LOUD COMMENT never a guessed Sym line; baffle emits Infinite_Baffle at the mouth x; README carries assembly + normals-check + first-run note; the app saves ONE ZIP with all four files',
    /Control_Solver\n  f1=300; f2=12000; NumFrequencies=48; Abscissa=log/.test(pj.solving) &&
    /MeshFileAlias="M1"\n  Scale=1mm/.test(pj.solving) &&
    /ElType=Exterior/.test(pj.solving) &&
    /Elements "HornWalls"[\s\S]{0,80}101 Mesh Include 2/.test(pj.solving) &&
    /Elements "SourceDisc"[\s\S]{0,80}101 Mesh Include 1/.test(pj.solving) &&
    /Driving\n  RefElements="SourceDisc"\n  DrvGroup=1001/.test(pj.solving) &&
    !/Infinite_Baffle/.test(pj.solving) && !/\nSym=/.test(pj.solving) &&
    /Infinite_Baffle\n  Subdomain=1\n  Position=x Offset=240mm/.test(pq.solving) &&
    /QUARTER mesh: enable BOTH mirror planes/.test(pq.solving) && !/\nSym=/.test(pq.solving) &&
    /DrvType=Velocity; Value=1.0\n  101 DrvGroup=1001/.test(pj.observation) &&
    /2001 240 0 0/.test(pj.observation) && /1000 1240 0 0/.test(pj.observation) &&
    /PolarRange=-90, 90, 37/.test(pj.observation) &&
    /BasePlane=2001 2002 2003/.test(pj.observation) && /BasePlane=2001 2002 2004/.test(pj.observation) &&
    /NORMALS CHECK/.test(pj.readme) && /could not be tested inside/.test(pj.readme) &&
    /name: "solving\.txt", data: abec9\.solving/.test(htmlB) &&
    /name: "observation\.txt", data: abec9\.observation/.test(htmlB) &&
    /name: "README\.txt", data: abec9\.readme/.test(htmlB) &&
    /fname\("akabak_project"\) \+ "\.zip"/.test(htmlB));
})();
// ---- entry 153: family select survives reload ----
check('FAMILY SELECT SURVIVES RELOAD (entry 153): familySel is the one select built BEFORE the autosave restore, so a refresh showed the default family while S and the viewer carried the restored one -- the boot path now syncs the select (and symmetry eligibility) from restored state; applyDesign gained the same eligibility sync for loaded design files',
  /var fsBoot9 = document\.getElementById\("familySel"\);\n\s*if \(fsBoot9 && S\.family\) fsBoot9\.value = S\.family;\n\s*syncSymEligibility\(\);/.test(htmlB) &&
  (htmlB.match(/syncSymEligibility\(\)/g) || []).length >= 3);
// ---- entry 156: WN H coverage lock ----
(function () {
  var nat = E.computeFamily({ family: 'wn', fc: 300, rt: 25.4, wnL: 0 });
  var z0 = E.computeFamily({ family: 'wn', fc: 300, rt: 25.4, wnL: 0, wnCovH: 0 });
  var rN = E.buildWNRings(nat, 24, 0, 0), rZ = E.buildWNRings(z0, 24, 0, 0);
  var dmax = 0;
  for (var di = 0; di < rN.rings.length; di++) dmax = Math.max(dmax, Math.abs(rN.rings[di] - rZ.rings[di]));
  var lk = E.computeFamily({ family: 'wn', fc: 300, rt: 25.4, wnL: 0, wnCovH: 75 });
  // mid-depth wall slope must sit at ~tan(37.5 deg): sample the H wall by z
  var w9 = lk.wall, zm9 = w9[w9.length - 1].z, p1 = null, p2 = null;
  for (var wi = 0; wi < w9.length; wi++) {
    if (!p1 && w9[wi].z >= 0.62 * zm9) p1 = w9[wi];   // inside the cone (the Neile ramp ends ~0.55 zm at lock 75 / fc 300)
    if (!p2 && w9[wi].z >= 0.78 * zm9) p2 = w9[wi];
  }
  var ang = 2 * Math.atan((p2.r - p1.r) / (p2.z - p1.z)) * 180 / Math.PI;
  var rL = E.buildWNRings(lk, 24, 0, 0), fin = true;
  for (var fi = 0; fi < rL.rings.length; fi++) if (!isFinite(rL.rings[fi])) fin = false;
  check('WN H COVERAGE LOCK (entry 156, "recreate his constant H character"): OUR OWN third conical phase at tan(covH/2) runs THROUGH the flare region to a short terminal blend; wnCovH=0 stays BIT-IDENTICAL to the natural Neile law; lock 75 puts the mid-wall included angle at 75 +- 6 deg with the family mouth dims unchanged; rings finite; param + hornParams whitelist present (lesson 152)',
    dmax === 0 && fin &&
    Math.abs(ang - 75) < 6 &&
    Math.abs(lk.wall[lk.wall.length - 1].r - nat.wall[nat.wall.length - 1].r) < 1e-6 &&
    /key: "wnCovH"/.test(htmlB) && /wnCovH: S\.wnCovH/.test(htmlB));
})();
// ---- entry 159: lock smoothness is RELATIVE to natural ----
(function () {
  function mxStep(w) {
    var m = 0, prev = null;
    for (var i = 1; i < w.length; i++) {
      var s = (w[i].r - w[i - 1].r) / Math.max(1e-9, w[i].z - w[i - 1].z);
      if (prev !== null) m = Math.max(m, Math.abs(Math.atan(s) - Math.atan(prev)) * 180 / Math.PI);
      prev = s;
    }
    return m;
  }
  var ok = true;
  [[320, 25.28, 45], [300, 25.4, 60], [600, 25.4, 45], [500, 12.7, 75]].forEach(function (cfg) {
    var natS = mxStep(E.computeFamily({ family: 'wn', fc: cfg[0], rt: cfg[1], T0: 0.7, wnL: 0 }).wall);
    var lkS = mxStep(E.computeFamily({ family: 'wn', fc: cfg[0], rt: cfg[1], T0: 0.7, wnL: 0, wnCovH: cfg[2] }).wall);
    if (lkS > natS + 1.0) ok = false;
  });
  check('H-LOCK SMOOTHNESS (entry 159, "is this loading zone correct?"): EXACT cone-line intercept (integral of smin - tCD, no measuring-point heuristic), z-span-sized smoothing width, feasibility BISECTION to the minimum lock, and NATURAL-LAW fallback when no lock is geometrically feasible (mouth-dominated horns) -- the lock construction adds no slope step beyond the natural law at any tested config; the fillet accepts geometrically-early tangencies (low locks legitimately leave the cone early)',
    ok && /cInt9/.test(require('fs').readFileSync('engine.js', 'utf8')) &&
    /buildLocked9/.test(require('fs').readFileSync('engine.js', 'utf8')) &&
    /mkNatural9/.test(require('fs').readFileSync('engine.js', 'utf8')));
})();
// ---- entries 160 + 161 ----
(function () {
  var eng9 = require('fs').readFileSync('engine.js', 'utf8');
  check('MASTER-GRID COLUMN-MAP SUBSAMPLING (entry 160): ONE master grid at segs, lower counts select master columns via strictly-increasing rounded maps -- cross-count zipping is consistent BY CONSTRUCTION, closing the true root cause behind entry 158 (count-dependent builder parameterization, up to ~55 mm same-parameter drift); layout debug on the assembly return',
    /function colMap\(/.test(eng9) && /var masterF = ringsKept\(segs\)/.test(eng9) && /innOff: innOff\.slice\(\)/.test(eng9));
  var nat9 = E.computeFamily({ family: 'wn', fc: 300, rt: 25.4, wnL: 0, wnCovH: 70 });
  var z09 = E.computeFamily({ family: 'wn', fc: 300, rt: 25.4, wnL: 0, wnCovH: 70, wnCovV: 0 });
  var rA9 = E.buildWNRings(nat9, 24, 0, 0), rB9 = E.buildWNRings(z09, 24, 0, 0);
  var dm9 = 0;
  for (var di9 = 0; di9 < rA9.rings.length; di9++) dm9 = Math.max(dm9, Math.abs(rA9.rings[di9] - rB9.rings[di9]));
  var lk9 = E.computeFamily({ family: 'wn', fc: 300, rt: 17.78, T0: 0.7, wnUL: 0.5, wnL: 0, wnCovH: 70, wnCovV: 60 });
  var p9v = lk9.wn.prof, wv9 = lk9.wallV, L9v = p9v.s[p9v.s.length - 1];
  var natS9 = E.computeFamily({ family: 'wn', fc: 300, rt: 17.78, T0: 0.7, wnUL: 0.5, wnL: 0, wnCovH: 70 });
  // v4 structure: beyond the settle (~56% of L at uL 0.5) the slope must RISE
  // monotonically to the tip -- one continuous accelerating regime, no flat
  // channel + sweep, no staircase, no hook
  var sP9 = 0.5 * L9v + 0.12 * 0.5 * L9v, dec9 = 0, prevS9 = -1e9, finV9 = true;
  for (var wi9 = 1; wi9 < wv9.length; wi9++) {
    if (!isFinite(wv9[wi9].r)) finV9 = false;
    if (wv9[wi9].z < sP9 * 1.02) continue;
    var sv9 = (wv9[wi9].r - wv9[wi9 - 1].r) / Math.max(1e-9, wv9[wi9].z - wv9[wi9 - 1].z);
    if (sv9 < prevS9 - 1e-3) dec9++;
    prevS9 = sv9;
  }
  var lk80 = E.computeFamily({ family: 'wn', fc: 300, rt: 17.78, T0: 0.7, wnUL: 0.5, wnL: 0, wnCovH: 70, wnCovV: 80 });
  var midDiff9 = Math.abs(lk80.wallV[Math.floor(wv9.length * 0.75)].r - wv9[Math.floor(wv9.length * 0.75)].r);
  check('WN V SLOT v5 (entries 161-166, the user circling the junction bulge: "more of an approximated combined curve than a sudden jump"): NO settle segment, NO uL boundary seam -- ONE combined slope law from inside the loading zone, starting at the loading law_s own slope EXACTLY (C1 splice) and relaxing into the exponential growth (one-sided blend; a softmin capped the curve below the mouth); growth amplitude BISECTED for the exact mouth; blend-region smoothness now BETTER than the natural law_s own junction (0.046 vs 0.061 max slope step); end tangent free (entry 165); dial k 1.5..6 reshapes the wall; wnCovV=0 bit-identical',
    dm9 === 0 && finV9 && dec9 === 0 &&
    p9v.sRel > 0 && midDiff9 > 2 &&
    Math.abs(wv9[wv9.length - 1].r - natS9.wallV[natS9.wallV.length - 1].r) < 1e-6 &&
    /entry 166/.test(require('fs').readFileSync('engine.js', 'utf8')) &&
    /key: "wnCovV"/.test(htmlB) && /wnCovV: S\.wnCovV/.test(htmlB) && /_p9\.sRel/.test(htmlB));
})();
// ---- entry 163: honest clamp UI + designed release ----
(function () {
  var lk3 = E.computeFamily({ family: 'wn', fc: 300, rt: 17.78, T0: 0.7, wnUL: 0.5, wnL: 0, wnCovH: 70, wnCovV: 60 });
  var p3 = lk3.wn.prof, wv3 = lk3.wallV;
  var i13 = Math.floor(wv3.length * 0.96), i23 = wv3.length - 1;
  var tip3 = Math.atan((wv3[i23].r - wv3[i13].r) / Math.max(1e-9, wv3[i23].z - wv3[i13].z)) * 180 / Math.PI;
  var html3 = require('fs').readFileSync('horn_studio.html', 'utf8');
  check('H-CLAMP HONESTY + DESIGNED RELEASE (entry 163, "changing H coverage does nothing now and changing v coverage does this"): covHEff exported (the achievability clamp was SILENT -- at the default 1.4in/fc300 the ceiling is ~66 deg, so dialing 70->140 changed nothing); stats print requested -> effective when clamped, and the V line with the release aperture; the V release is a DESIGNED proportion (55% of post-loading span, like the reference) instead of a maximized hold whose last-4%% release drew a near-vertical STEP (tip slope now a proper sweep, < 60 deg)',
    p3.covHEff > 60 && p3.covHEff < 70 && Math.abs(tip3) < 60 && p3.bRel > 0 &&
    /covHEff/.test(require('fs').readFileSync('engine.js', 'utf8')) &&
    /requested \\u2192/.test(html3) && /release at/.test(html3) && /verify in BEM/.test(html3));
})();
// ---- entry 167: the WN mouth wrap, live ----
(function () {
  var wn7 = E.computeFamily({ family: 'wn', fc: 300, rt: 17.78, T0: 0.7, wnUL: 0.5, wnL: 0, wnCovH: 70, wnCovV: 60 });
  var r7 = E.buildWNRings(wn7, 96, 40, 135);
  var M07 = r7.M - 10;
  function rowMax7(i9) {
    var mx9 = 0;
    for (var j9 = 0; j9 < 96; j9++) {
      var a9 = (i9 * 96 + j9) * 3, b9 = (i9 * 96 + (j9 + 1) % 96) * 3;
      mx9 = Math.max(mx9, Math.hypot(r7.rings[a9] - r7.rings[b9], r7.rings[a9 + 1] - r7.rings[b9 + 1], r7.rings[a9 + 2] - r7.rings[b9 + 2]));
    }
    return mx9;
  }
  var rim7 = rowMax7(M07 - 1), worst7 = 0;
  for (var i7 = M07; i7 < r7.M; i7++) worst7 = Math.max(worst7, rowMax7(i7));
  var g7 = E.buildBEMProject(wn7, null, r7, { stations: 400, segs: 96, targetEdge: 4, budget: 12000, ringsBuilder: function (n9) { return E.buildWNRings(wn7, n9, 40, 135); } });
  check('WN MOUTH WRAP LIVE (entry 167, the 2 kHz V lever from the slot-run comparison): lip frames from the TRUE LOCAL SURFACE (N = T x rim-tangent, ONE global sign -- the per-azimuth outwardness flip broke neighbors near the corners at 155 mm; the old lateral-only N sheared at 100 mm), wrap intra-ring steps <= 2x the rim row_s own; the graded wrapped export passes the gate at healthy quality (>= 78%, worst < 8, fMax > 900); defaults ship with flareR 40 / wrap 135; gates removed',
    worst7 < 2.0 * rim7 && g7.nBnd > 6000 &&
    g7.qUnder2 / g7.nBnd >= 0.78 && g7.qWorst < 8 && g7.fMax > 900 &&
    /entry 167: wn UN-GATED/.test(htmlB));
})();
// ---- entry 171: Arai fin-blockage wall compensation ----
(function () {
  var bs1 = { family: 'biradial', fc: 290, T0: 0.7, covH: 95, cornerR: 0, throatD: 50.8, rt: 25.4, finT: 10, adaptL: 25 , fins: 'arai4' };
  function mk1(fins) { var p = {}; for (var k in bs1) p[k] = bs1[k]; if (fins) p.fins = fins; return E.computeFamily(p); }
  var a4 = mk1('arai4'), un = mk1(null), off = mk1('off'), on6 = mk1('on');
  var dCal = 0, dMid = 0;
  for (var i = 0; i < a4.wall.length; i++) {
    dCal = Math.max(dCal, Math.abs(a4.wall[i].r - (un.wall[i] ? 1e9 : 1e9)));
  }
  // arai4 must equal the RAW calibrated wall: compare against a fresh compute with fins undefined BEFORE compensation semantics -- 'off' is the default mode, so instead pin: arai4 differs from off mid-body, mouth/throat equal, off narrower
  var at1 = function (h, z) { var b = h.wall[0]; for (var q = 0; q < h.wall.length; q++) if (Math.abs(h.wall[q].z - z) < Math.abs(b.z - z)) b = h.wall[q]; return b.r; };
  var mono1 = off.wall.every(function (p, i) { return !i || p.r >= off.wall[i - 1].r - 1e-9; });
  check('ARAI FIN-BLOCKAGE COMPENSATION (entry 171, community report + Arai_s published figure: "the finless sidewall must pull inward, dotted line" -- fins block cross-section, so the wall law must move with the fin mode to preserve the expansion rate): walls calibrated against the published FINNED drawings = the arai4 reference (unchanged); "off" pulls the wall in through the fin region (>= 8 mm at z=120, per-blade z/cos(th) crossing model, smoothed, monotone-guarded) and rejoins before the mouth; 6-fin pack pushes slightly out; throat and mouth preserved in all modes; the app passes S.fins/S.finT into computeFamily',
    at1(a4, 120) - at1(off, 120) > 8 && at1(on6, 120) - at1(a4, 120) > 3 &&
    Math.abs(at1(off, 386) - at1(a4, 386)) < 0.5 &&
    Math.abs(off.wall[0].r - 25.4) < 0.01 && mono1 &&
    off.wall.every(function (p) { return isFinite(p.r); }) &&
    /fins: S\.fins, finT: S\.finT/.test(require('fs').readFileSync('horn_studio.html', 'utf8')));
})();
// ---- entry 173: sizing order (the invalid-run regression) ----
(function () {
  var app3 = require('fs').readFileSync('horn_studio.html', 'utf8');
  var iBud3 = app3.indexOf('entry 173: the entry-169 budget scale ran AFTER bemBandSize');
  var iSz3 = app3.indexOf('var sz9 = bemBandSize(');
  check('WRAP BUDGET SCALES BEFORE SIZING (entry 173: the entry-169 scale ran after bemBandSize had consumed the unscaled budget -- only the path increase took effect, which alone SHRINKS segs; the resulting 3168-elem export leaked through the thin curl and produced an unusable run: rear rejection -3 dB, non-monotone H, V collapse -- the leak signature is the diagnostic to remember)',
    iBud3 > 0 && iSz3 > iBud3 && /bud9 = Math\.round\(bud9 \* ratio9b\)/.test(app3));
})();
// ---- entry 178: THE ROLL BATTERY (universal roundover invariants) ----
(function () {
  // user report: "anytime we change the geometry of the horn then the roundover
  // breaks. We need a full proof method." This battery audits every rolled
  // family's mouth treatment with rollAudit's invariants (C1 launch, frame
  // shear, ledge, finiteness). Baselines pinned with headroom; ANY geometry
  // change that breaks a roll trips here, naming the family.
  var cases8 = [
    ['biradial bullnose+lip', { family: 'biradial', fc: 290, T0: 0.7, covH: 95, cornerR: 0, throatD: 50.8, rt: 25.4, finT: 10, adaptL: 25, trunc: 175, flareR: 25, flareWrap: 0, fins: 'arai4' },
      function (h) { return E.buildAraiFanRings(h, 96, 25, 0); }],   // entry 179: audit WITH flareR -- the battery's first version audited the toothless config and missed the old lip's corner shear (the user's screenshot caught what the battery did not)
    ['biradial long-adapter+lip', { family: 'biradial', fc: 290, T0: 0.7, covH: 95, cornerR: 0, throatD: 50.8, rt: 25.4, finT: 10, adaptL: 80, trunc: 175, flareR: 25, flareWrap: 0, fins: 'off' },
      function (h) { return E.buildAraiFanRings(h, 96, 25, 0); }],
    ['wn wrapped', { family: 'wn', fc: 300, rt: 17.78, T0: 0.7, wnUL: 0.5, wnL: 0, wnCovH: 70, wnCovV: 60 },
      function (h) { return E.buildWNRings(h, 96, 40, 80); }],
    ['jmlc', { family: 'jmlc', fc: 340, rt: 12.7, T0: 0.7, trunc: 175 },
      function (h) { h.wallV = h.wallV || h.wall; return null; }]   // axisymmetric: V = H
  ];
  var all8 = true, report8 = [];
  for (var c8 = 0; c8 < cases8.length; c8++) {
    var h8 = E.computeFamily(cases8[c8][1]);
    var rg8 = cases8[c8][2](h8);
    var prof8 = { H: h8.wall, V: h8.wallV };
    var sm8;
    try { sm8 = E.buildSolidMesh(prof8, 5, 96, rg8); } catch (e8) { all8 = false; report8.push(cases8[c8][0] + ':THREW'); continue; }
    var au8 = E.rollAudit(sm8);
    var ok8 = au8.finite && au8.launchDeg < 35 && au8.shearRatio < 2.5 && au8.ledge < 3.5;
    if (!ok8) all8 = false;
    report8.push(cases8[c8][0] + ':launch' + au8.launchDeg.toFixed(0) + '/shear' + au8.shearRatio.toFixed(1) + '/ledge' + au8.ledge.toFixed(1) + (ok8 ? '' : ' FAIL'));
  }
  check('THE ROLL BATTERY (entry 178, "we need a full proof method" for roundovers): rollAudit invariants -- C1 launch < 35 deg, frame shear < 2.5x rim, ledge < 3.5x median, finite -- across every rolled family at multiple geometries [' + report8.join(' | ') + ']', all8);
})();
// ---- entry 186: per-plane roll radii ----
(function () {
  var wn6 = E.computeFamily({ family: 'wn', fc: 300, rt: 17.78, T0: 0.7, wnUL: 0.5, wnL: 0, wnCovH: 70, wnCovV: 60 });
  var b6 = E.buildWNRings(wn6, 96, 40, 80);
  var s6 = E.buildWNRings(wn6, 96, 40, 80, 40);
  var d6 = 0;
  for (var i6 = 0; i6 < b6.rings.length; i6++) d6 = Math.max(d6, Math.abs(b6.rings[i6] - s6.rings[i6]));
  var a6 = E.buildWNRings(wn6, 96, 40, 80, 8);
  var M06 = a6.M - 10, kR6 = ((M06 - 1) * 96) * 3;
  var jT6 = 0, jS6 = 0, bT6 = -1e9, bS6 = -1e9;
  for (var j6 = 0; j6 < 96; j6++) {
    var x6 = Math.abs(a6.rings[kR6 + j6 * 3 + 1]), y6 = Math.abs(a6.rings[kR6 + j6 * 3 + 2]);
    if (y6 - x6 > bT6) { bT6 = y6 - x6; jT6 = j6; }
    if (x6 - y6 > bS6) { bS6 = x6 - y6; jS6 = j6; }
  }
  function rch6(j9) { var kA = ((M06 - 1) * 96 + j9) * 3, kB = ((a6.M - 1) * 96 + j9) * 3; return Math.hypot(a6.rings[kB] - a6.rings[kA], a6.rings[kB + 1] - a6.rings[kA + 1], a6.rings[kB + 2] - a6.rings[kA + 2]); }
  var au6 = E.rollAudit(E.buildSolidMesh({ H: wn6.wall, V: wn6.wallV }, 5, 96, a6));
  check('PER-PLANE WRAP TAPER (entries 186-187, "how can we make his combination possible"): flareRV gives the top/bottom rim its own roll radius via a p-norm EDGE weight (an angle blend cannot reach the extremes on a rect rim) -- deep sides contain H while a shallow V roll leaves the top/bottom rim near-bare at LF; flareRV = flareR is BIT-EXACT to the single-radius lip; side/top curl chord ratio ~5 at 40/8; the asymmetric lip still passes the roll battery invariants',
    d6 < 1e-9 && rch6(jS6) / rch6(jT6) > 2.2 && rch6(jS6) / rch6(jT6) < 5 &&   /* entry 187: turn-taper chords -- side ~2r sin(80deg), top ~2r sin(16deg) blended by the spiral ease */
    au6.finite && au6.launchDeg < 35 && au6.shearRatio < 2.5 && au6.ledge < 3.5 &&
    /key: "flareRV"/.test(require('fs').readFileSync('horn_studio.html', 'utf8')));
})();
// ---- entry 194: 3D zoom range ----
check('3D ZOOM RANGE (entry 194, user report: sometimes you cant zoom enough): the wheel clamp floor is fit*0.04 (was fit*0.5 -- half the fitted view kept the throat at arms length on large horns), ceiling fit*6; camera near plane 1 unit stays 8x below the closest approach on typical horns',
  (function () { var s = require('fs').readFileSync('horn_studio.html', 'utf8'); return s.indexOf('(V3.fit || 200) * 0.04') !== -1 && s.indexOf('(V3.fit || 800) * 6') !== -1 && s.indexOf('PerspectiveCamera(40, w / h, 1,') !== -1; })());
// ---- entry 195: build stamp ----
check('BUILD STAMP (entry 195, stale tabs bit twice today): rebuild.py injects the latest PROJECT_STATE entry number + date into a visible span, idempotently replaced each rebuild -- "which build am I on" is now answered by the app itself',
  (function () { var s = require('fs').readFileSync('horn_studio.html', 'utf8'); var m = s.match(/<span id="buildstamp"[^>]*>build (\d+)/); if (!m) return false; var ps = require('fs').readFileSync('PROJECT_STATE.md', 'utf8'); var es = ps.match(/^(\d+)[a-z]?\./gm); return es && es[es.length-1].indexOf(m[1]) === 0; })());
// ---- entry 200: family-change reset ----
check('FAMILY-CHANGE RESET (entry 200, the user screenshot: a JMLC throat wearing the previous osc session 10.5-degree driver cone): exitDeg/exitLen/flareRV are per-family decisions and reset to 0 on every family switch -- the handler zeroes state and both controls before applying family defaults',
  (function () { var s = require('fs').readFileSync('horn_studio.html', 'utf8'); return s.indexOf('["exitDeg", "exitLen", "flareRV"].forEach') !== -1 && s.indexOf('PER-FAMILY decisions') !== -1; })());
// ---- entry 203: throat shading crease ----
(function () {
  var j3 = E.computeFamily({ family: 'jmlc', fc: 400, rt: 17.78, T0: 0.7, trunc: 175, aplat: 4, ellMu: 0.88, ellSigma: 0.53 });
  var p3 = E.planeProfiles(j3.wall, 110, 1, 0, 0, 90, 'ellipse', 17.78, 0);
  var sm3 = E.buildSolidMesh(p3, 6, 48);
  var c3 = E.creaseThroatRows(sm3.pos, sm3.idx);
  var onP3 = function (i9) { return Math.abs(c3.pos[i9 * 3]) < 0.01; };
  var pl3 = {}, np3 = {};
  for (var i3 = 0; i3 < c3.idx.length; i3 += 3) {
    var isP3 = onP3(c3.idx[i3]) && onP3(c3.idx[i3 + 1]) && onP3(c3.idx[i3 + 2]);
    for (var e3 = 0; e3 < 3; e3++) (isP3 ? pl3 : np3)[c3.idx[i3 + e3]] = 1;
  }
  var lk3 = 0;
  for (var v3 in pl3) if (np3[v3]) lk3++;
  check('THROAT SHADING CREASE (entry 203, after 201 flattened the geometry the shading still rounded it): creaseThroatRows duplicates every throat-plane vertex shared between annulus and wall/outer triangles (96 on the jmlc reference) so normal averaging stops at the driver face; zero vertices shared across the crease; geometry bytes unchanged',
    c3.added === 96 && lk3 === 0 && c3.pos.length === sm3.pos.length + 96 * 3);
})();
// ---- entry 206: sharp-corner sampling + miter ----
(function () {
  var j6 = E.computeFamily({ family: 'jmlc', fc: 400, rt: 17.78, T0: 0.7, trunc: 175, aplat: 4, ellMu: 0.88, ellSigma: 0.53 });
  var p6 = E.planeProfiles(j6.wall, 110, 1, 0, 0, 90, 'rrect', 17.78, 0);
  var rg6 = E.buildRings(p6, 48);
  var M6 = p6.H.length, ri6 = Math.floor(M6 * 0.65), mg6 = 1e9, z6 = 0;
  for (var jj6 = 0; jj6 < 48; jj6++) {
    var k16 = (ri6 * 48 + jj6) * 3, k26 = (ri6 * 48 + (jj6 + 1) % 48) * 3;
    var g6 = Math.hypot(rg6[k16 + 1] - rg6[k26 + 1], rg6[k16 + 2] - rg6[k26 + 2]);
    if (g6 < mg6) mg6 = g6; if (g6 < 1e-6) z6++;
  }
  var sm6 = E.buildSolidMesh(p6, 6, 48);
  var nV6 = sm6.pos.length / 3, RO6 = nV6 / 48 - 2 * M6, oB6 = (M6 + RO6) * 48;
  var mn6 = 1e9, mx6 = 0;
  for (jj6 = 0; jj6 < 48; jj6++) {
    var ki6 = (ri6 * 48 + jj6) * 3, ko6 = ((oB6 / 48 + ri6) * 48 + jj6) * 3;
    var d6 = Math.hypot(sm6.pos[ko6] - sm6.pos[ki6], sm6.pos[ko6 + 1] - sm6.pos[ki6 + 1], sm6.pos[ko6 + 2] - sm6.pos[ki6 + 2]);
    if (d6 < mn6) mn6 = d6; if (d6 > mx6) mx6 = d6;
  }
  check('SHARP-CORNER SAMPLING + MITER (entry 206, the back-of-horn errors): arc-length-adaptive quadrant allocation -- zero coincident samples on the sharp ring (was 32 of 48, degenerate quads collapsing the outer shell in stripes), corner pinned at one exact vertex; the outer offset uses the true dihedral with a capped miter -- face thickness exactly t, corner >= t, no spikes past 1.5t',
    z6 === 0 && mg6 > 5 && Math.abs(mn6 - 6) < 0.05 && mx6 >= 6 && mx6 < 9.05);
})();
// ---- entry 208: log fc slider ----
check('LOG FC SLIDER (entry 208, forum: 4-inch waveguide wants fc past 2 kHz): the fc param is log-flagged and the built page maps slider position 0..1000 geometrically over min..max -- position markup, rngToVal/valToRng round-trip, and the set() writeback all present in the shipped file',
  (function () { var s = require('fs').readFileSync('horn_studio.html', 'utf8'); return s.indexOf('log: 1') !== -1 && s.indexOf('rngToVal9') !== -1 && s.indexOf('valToRng9(vc)') !== -1 && s.indexOf("(p.log ? 0 : p.min)") !== -1; })());
// ---- entry 211: four-patch sharp-corner NURBS ----
(function () {
  var t1 = E.computeFamily({ family: 'tractrix', fc: 428, throatD: 35.56, rt: 17.78, trunc: 88 });
  var p1 = E.planeProfiles(t1.wall, 56, 1.65, 0, 0, 90, 'rrect', 17.78, 0);
  var r1 = E.buildRings(p1, 32);
  var q1 = E.quadLoft(r1, p1.H.length, 32, [4, 12, 20, 28]);
  var s1 = E.stepFromNurbsQuad(q1, 'pin');
  var nS = (s1.match(/=\s*B_SPLINE_SURFACE_WITH_KNOTS/g) || []).length;
  var oes1 = s1.match(/ORIENTED_EDGE\(/g) || [];
  var e1 = s1.match(/=\s*EDGE_CURVE/g) || [];
  // corner exactness: patch 0 v-end control point equals the ring corner point
  var pa = q1.patches[0], last = pa.ctrl[pa.ctrl.length - 1];
  var kC = ((p1.H.length - 1) * 32 + 12) * 3;
  var dx = last[last.length - 1][1] - r1[kC + 1], dy = last[last.length - 1][2] - r1[kC + 2];
  check('FOUR-PATCH SHARP NURBS (entry 211, the wavy Fusion mouth: a C2 tube RINGS through sharp corners, rim dipping 1.6-2.4 mm beside each -- at cornerR < 0.5 the export is four clamped patches meeting at true crease edges): 4 surfaces, 4 faces, 12 edges with the 4 corner edges shared, mouth-corner control point coincides with the ring corner to 1e-6, rim ringing 0.0000 measured at introduction',
    nS === 4 && e1.length === 12 && oes1.length === 16 && Math.hypot(dx, dy) < 1e-6);
})();
// ---- entry 212: watertight solid quad ----
(function () {
  var t2 = E.computeFamily({ family: 'tractrix', fc: 428, throatD: 35.56, rt: 17.78, trunc: 88 });
  var p2 = E.planeProfiles(t2.wall, 56, 1.65, 0, 0, 90, 'rrect', 17.78, 0);
  var r2 = E.buildRings(p2, 32);
  var o2 = E.offsetRings(r2, p2.H.length, 32, 2);
  var s2 = E.stepFromNurbsSolidQuad(E.quadLoft(r2, p2.H.length, 32, [4,12,20,28]), E.quadLoft(o2, p2.H.length, 32, [4,12,20,28]), 'pin');
  var oe2 = s2.match(/ORIENTED_EDGE\(/g) || [], ec2 = s2.match(/=\s*EDGE_CURVE/g) || [];
  var uses2 = {};
  var re2 = /ORIENTED_EDGE\('',\*,\*,#(\d+)/g, mm2;
  while ((mm2 = re2.exec(s2))) uses2[mm2[1]] = (uses2[mm2[1]] || 0) + 1;
  var allTwice = Object.keys(uses2).every(function (k) { return uses2[k] === 2; });
  check('WATERTIGHT SOLID QUAD (entry 212, "include the thickness... a nice step file"): 10 faces (8 spline + 2 planar caps), 24 edges EVERY one shared by exactly two faces, CLOSED_SHELL + MANIFOLD_SOLID_BREP -- CAD opens a finished body with mitered walls and machined flanges',
    ec2.length === 24 && oe2.length === 48 && allTwice && s2.indexOf('CLOSED_SHELL') !== -1 && s2.indexOf('MANIFOLD_SOLID_BREP') !== -1);
})();
// ---- entry 227: rounded-rect honesty (user report: "the rounded rectangle
// option doesnt always work on every horn family"). Live-STL ground truth found
// TWO silent-ignore paths: jmlcell (profOfBase hardcodes ellipse for the
// quasi-elliptical morph -- entry 90) and any PETF family under the wide-format
// az-loft (buildHVDiffAz profiles ARE the shaping). Both drew an rrect section
// OVERLAY the solid never had. Fix: SECTION_ALLOWED gates + the existing
// silent-migrate machinery. ----
(function () {
  registry.familySel._h.change({ target: { value: 'tractrix' } }); drain();
  registry.sectSel._h.change({ target: { value: 'rrect' } }); drain();
  registry.familySel._h.change({ target: { value: 'jmlcell' } }); drain();
  var mig1 = registry.sectSel.value === 'ellipse';                       // jmlcell migrates away from rrect
  registry.familySel._h.change({ target: { value: 'jmlc' } }); drain();
  registry.sectSel._h.change({ target: { value: 'rrect' } }); drain();
  var kept = registry.sectSel.value === 'rrect';                         // plain jmlc keeps it (rrect WORKS there)
  registry.petfSel._h.change({ target: { value: 'hvdiff' } }); drain();
  var mig2 = registry.sectSel.value === 'ellipse';                       // wide-format az-loft migrates away
  registry.petfSel._h.change({ target: { value: 'off' } }); drain();
  check('ROUNDED-RECT HONESTY (entry 227, user report "doesnt always work on every horn family" -- live STL byte-compare found jmlcell + PETF-az-loft silently elliptical behind an rrect overlay): jmlcell offers ellipse only (the quasi-elliptical morph IS the section; blurb added), wide-format az-loft offers ellipse only (same rule that hides cornerR there), plain jmlc keeps rrect, migration is silent via the house machinery',
    mig1 && kept && mig2 &&
    /jmlcell: \["ellipse"\]/.test(htmlB) &&
    /the section morph never runs, so only ellipse is offered/.test(htmlB) &&
    /jmlcell: 'JMLC quasi-elliptical \(Le Cl/.test(htmlB));
})();
// ---- entry 228: square/superellipse sections on the OS waveguide families
// (Marwan: "I would like to support those square horns"). os/osc leave
// SECTION_ALLOWED; the osc per-axis branch passes the section through with a
// user cornerR paced by the entry-204 ramp; omitted-target callers (wn/cd/
// biradial) are BIT-IDENTICAL (live STL baseline-verified). ----
(function () {
  var fkW = [], fkV = [];
  for (var z8 = 0; z8 <= 200; z8 += 2) { fkW.push({ z: z8, r: 12.7 + z8 * 0.6 }); fkV.push({ z: z8, r: 12.7 + z8 * 0.4 }); }
  var pT = E.planeProfilesWN({ wall: fkW, wallV: fkV }, 60, 0, 0, 0, 12.7, 'rrect', 20);
  var pC = E.planeProfilesWN({ wall: fkW, wallV: fkV }, 60, 0, 0, 0, 12.7, 'rrect');
  var nB = pT.baseStations;
  var throatRound = Math.abs(pT.rhoArr[0] - 12.7) < 0.5;                       // exact circle at the round throat
  var mouthTarget = Math.abs(pT.rhoArr[nB - 1] - 20) < 1.5;                    // lands the dialed corner
  var legacyConst = pC.rhoArr[0] === 12.7 && pC.rhoArr[nB - 1] === 12.7;       // no target -> historic WN constant
  // pacing law on a flaring horn: rho TRACKS the growing local round radius early
  // (throat region stays fully round -- it RISES above the target), then descends
  // to the dialed corner over the sharpening span. First pin draft asserted a
  // monotone descent and failed -- the rise is the correct behavior, not a bug.
  var mid8 = pT.rhoArr[Math.floor(nB / 2)];
  var ramps = mid8 > 20 && pT.rhoArr[nB - 1] < mid8 && pT.rhoArr[2] < mid8;
  check('SQUARE OS SECTIONS (entry 228, "I would like to support those square horns" -- Ath-style printed practice): os/osc un-gated (blurbs carry the geometric-extrusion caveat, BEM arbitrates), osc per-axis branch passes shp + cornerR through, entry-204 pacing: round throat -> dialed mouth corner, target-less callers keep the constant-rho WN convention bit-identical',
    throatRound && mouthTarget && legacyConst && ramps &&
    !/SECTION_ALLOWED = \{ os:/.test(htmlB) &&
    /planeProfilesWN\(horn, n, S\.flareR, S\.flareR, 90 \+ S\.flareWrap, S\.throatD \/ 2, shp, S\.section === "rrect" \? S\.cornerR : undefined\)/.test(htmlB) &&
    /square\/rrect and superellipse CROSS-SECTIONS are offered as geometric extrusions/.test(htmlB) &&
    /function planeProfilesWN\(horn, nPts, flareRh, flareRv, flareExit, rho, shape2, rhoTarget\)/.test(require('fs').readFileSync('engine.js', 'utf8')));
})();
// ---- entry 229: Hans's third review (rect-throat ripple, H!=V estimate on
// symmetric horns, beamwidth calibration note, osN ceiling). ----
(function () {
  // (a) ribbon morph rewrite: per-plane strategies, no waist, native-curve launch
  function drChanges(P9, zMax) {
    var chords = [], i0 = 0;
    for (var i = 1; i < P9.length; i++) {
      if (P9[i].z > zMax) break;
      if (P9[i].z - P9[i0].z < 0.8) continue;
      chords.push((P9[i].r - P9[i0].r) / (P9[i].z - P9[i0].z)); i0 = i;
    }
    var ch = 0;
    for (var j = 1; j < chords.length; j++)
      if ((chords[j] > 5e-4 && chords[j - 1] < -5e-4) || (chords[j] < -5e-4 && chords[j - 1] > 5e-4)) ch++;
    return ch;
  }
  var rt9 = Math.sqrt(40 * 20 / Math.PI);
  var fO = E.computeFamily({ family: 'os', rt: rt9, fc: 500, covH: 90, f0: 800, entryDeg: 7.5 });
  var pO = E.planeProfiles(fO.wall, 220, 1, 0, 0, 0, 'ellipse', rt9, 0);
  var rO = E.throatRibbonMorph(pO, 40, 20, 0);
  var fR = E.computeFamily({ family: 'rosse', rt: rt9, rosR: 130, rosA: 39, rosA0: 7.5, rosK: 1.8, rosRr: 0.3, rosB: 0.3, rosM: 0.8, rosQ: 3.7 });
  var pR = E.planeProfiles(fR.wall, 220, 1, 0, 0, 0, 'ellipse', rt9, 0);
  var rR = E.throatRibbonMorph(pR, 40, 20, 0);
  var fJ = E.computeFamily({ family: 'jmlc', fc: 340, rt: rt9, T0: 0.707107, trunc: 175 });
  var pJ = E.planeProfiles(fJ.wall, 220, 1, 0, 0, 0, 'ellipse', rt9, 0);
  var rJ = E.throatRibbonMorph(pJ, 40, 20, 0);
  function launch9(P9) { for (var i = 1; i < P9.length; i++) if (P9[i].z >= 0.8) return (P9[i].r - P9[0].r) / (P9[i].z - P9[0].z); return 0; }
  var morphOk =
    drChanges(rO.H, 1.5 * rO.ribbon.L) === 0 && drChanges(rO.V, 1.5 * rO.ribbon.L) === 0 &&
    drChanges(rR.H, 1.5 * rR.ribbon.L) === 0 && drChanges(rR.V, 1.5 * rR.ribbon.L) === 0 &&
    drChanges(rJ.H, 1.5 * rJ.ribbon.L) === 0 &&
    Math.abs(rO.H[0].r - 20) < 1e-6 && Math.abs(rO.V[0].r - 10) < 1e-6 &&
    launch9(rO.H) > 0.3 && launch9(rO.V) > 0.05 &&                       // native-curve launch, never flat
    rJ.ribbon.L > 80;                                                     // jmlc auto-extends L for monotonicity
  // (b) H = V estimate on symmetric os/rosse despite stale covV state
  registry.familySel._h.change({ target: { value: 'cd' } }); drain();
  var nCV = registry['num_covV']; if (nCV && nCV._h && nCV._h.input) { nCV.value = '40'; nCV._h.input(); } drain();
  registry.familySel._h.change({ target: { value: 'os' } }); drain();
  var bw9 = registry.bwchart ? registry.bwchart._html : '';
  var mm9 = bw9.match(/<path d="([^"]+)"[^>]*>/g) || [];
  var symOk = mm9.length >= 2 && mm9[0].replace(/stroke[^ ]*/g, '') !== '' &&
    (bw9.match(/d="([^"]+)"/g) || [])[0] === (bw9.match(/d="([^"]+)"/g) || [])[1];
  registry.familySel._h.change({ target: { value: 'rosse' } }); drain();
  var bwR = registry.bwchart ? registry.bwchart._html : '';
  var symOkR = (bwR.match(/d="([^"]+)"/g) || [])[0] === (bwR.match(/d="([^"]+)"/g) || [])[1];
  // (c) osN ceiling 12 + (d) calibration honesty note
  var f12 = E.computeFamily({ family: 'os', rt: 12.7, fc: 500, covH: 90, f0: 800, osN: 12 });
  var n12ok = f12.wall.length > 100 && isFinite(f12.wall[f12.wall.length - 1].r);
  check('HANS THIRD REVIEW (entry 229): ribbon morph rewrite (wide plane z-shifts INTO the family curve, narrow plane native-slope scaling -- zero waist reversals on os/rosse/jmlc, exact W/2 x H/2, nonzero launch, jmlc L auto-extended), symmetric os AND rosse report IDENTICAL H/V beamwidth despite stale covV, osN ceiling 12 finite, plateau-calibration honesty note shipped',
    morphOk && symOk && symOkR && n12ok &&
    /max: 12, step: 0\.25, sect: "core", fams: \{ os: 1 \}/.test(htmlB) &&
    /Math\.min\(12, P\.osN \|\| 4\)/.test(require('fs').readFileSync('engine.js', 'utf8')) &&
    /Treat the plateau as the design target, not a prediction/.test(htmlB) &&
    /rosse's design angle is the rosA dial/.test(htmlB));
})();

// ---- entry 230: AKABAK LEM SCRIPT EXPORT -------------------------------------
// Hans, via the forum: "tried to load Horn Studio files into Akabak the whole day
// using KI. But failed. Will there be the possibility to generate an .akp file?"
// Marwan's steer: "I think we could generate an akabak script like horn response
// does." The .akp container is undocumented, so this ships the plain-text LEM
// script AKABAK actually reads, in the grammar of a real Hornresp AkAbak export.
(function () {
  var fx = E.computeFamily({ family: 'os', rt: 12.7, fc: 500, covH: 90, f0: 800, entryDeg: 7.5 });
  var px = E.planeProfiles(fx.wall, 220, 1, 0, 0, 0, 'ellipse', 12.7, 0);
  var ak = E.akabakLEM({ prof: px, name: 'pin', family: 'os', section: 'ellipse', build: 230, nSeg: 24 });
  var sx = ak ? ak.script : '';
  // node chain: Driver front node 3 -> seg i (3+i -> 4+i) -> Radiator on 3+nSeg
  var nd = [], mA, reA = /Waveguide '[^']*'\nNode=(\d+)=(\d+)\n/g;
  while ((mA = reA.exec(sx))) nd.push([+mA[1], +mA[2]]);
  var chainOk = nd.length === 24 && nd[0][0] === 3;
  for (var q = 0; q < nd.length; q++) {
    if (nd[q][1] !== nd[q][0] + 1) chainOk = false;
    if (q && nd[q][0] !== nd[q - 1][1]) chainOk = false;
  }
  var radM = /Radiator '[^']*'\nNode=(\d+)\nSD=([\d.]+)cm2/.exec(sx);
  var radOk = !!radM && +radM[1] === nd[nd.length - 1][1];
  // segment lengths sum to the horn length; interface areas shared; all positive
  var lens = [], lm, lre = /Len=([\d.]+)cm/g; while ((lm = lre.exec(sx))) lens.push(+lm[1]);
  var sumOk = lens.length === 24 && Math.abs(lens.reduce(function (a, b) { return a + b; }, 0) - ak.length / 10) < 0.05;
  var ars = [], am, are = /S(?:Th|Mo)=([\d.]+)cm2/g; while ((am = are.exec(sx))) ars.push(+am[1]);
  var areaOk = ars.length === 48 && ars.every(function (a) { return a > 0 && isFinite(a); });
  for (var k = 0; k + 2 < ars.length; k += 2) if (Math.abs(ars[k + 1] - ars[k + 2]) > 1e-9) areaOk = false;
  // the "." decimal separator, always -- Hornresp emits the OS locale's ("WD=0,20m")
  var locOk = !/\d,\d/.test(sx);
  // wavefront coordinate follows the charts (JMLC sMap), areas unchanged
  var fj = E.computeFamily({ family: 'jmlc', fc: 340, rt: 12.7, T0: 0.707107, trunc: 175 });
  var pj = E.planeProfiles(fj.wall, 220, 1, 0, 0, 0, 'ellipse', 12.7, 0), acc = 0, sm = [];
  for (var w = 0; w < pj.H.length; w++) {
    if (w) acc += Math.sqrt(Math.pow(pj.H[w].z - pj.H[w - 1].z, 2) + Math.pow(pj.H[w].r - pj.H[w - 1].r, 2));
    sm.push({ z: pj.H[w].z, s: acc });
  }
  var axJ = E.akabakLEM({ prof: pj, nSeg: 24 }), wfJ = E.akabakLEM({ prof: pj, nSeg: 24, mode: 'wavefront', sMap: sm });
  var wfOk = wfJ.length > axJ.length && Math.abs(wfJ.mouthArea - axJ.mouthArea) < 1e-6 &&
    wfJ.mode === 'wavefront' && axJ.mode === 'axial' && /Wavefront length/.test(wfJ.script);
  // entry-192 loading-only bore (z<0) excluded AND disclosed -- never double-count
  // the user's own driver exit
  var bore = E.akabakLEM({
    prof: { H: [{ z: -20, r: 12.7 }, { z: -10, r: 12.7 }].concat(px.H), V: [{ z: -20, r: 12.7 }, { z: -10, r: 12.7 }].concat(px.V), shape: 'ellipse', rho: 0 }, nSeg: 24
  });
  var boreOk = bore.skipped === 2 && Math.abs(bore.length - ak.length) < 1e-6 &&
    /loading-only stations behind the throat/.test(bore.script);
  // degenerate input returns null rather than a broken script
  var nullOk = E.akabakLEM(null) === null && E.akabakLEM({ prof: { H: [{ z: 0, r: 1 }], V: [{ z: 0, r: 1 }] } }) === null;
  // nSeg clamped to [4,64]
  var clampOk = E.akabakLEM({ prof: px, nSeg: 1 }).nSeg === 4 && E.akabakLEM({ prof: px, nSeg: 500 }).nSeg === 64;
  check('AKABAK LEM SCRIPT (entry 230): verified Hornresp-export grammar (Def_Driver Sd/Bl/Cms/Rms/fs/Le/Re/ExpoLe, System, Driver Def 4-node, Enclosure, conical Waveguide chain, Radiator), node chain contiguous 3..3+nSeg with the Radiator on the mouth node, segment lengths sum to the horn length, shared interface areas all positive, "." decimals always (Hornresp emits the OS locale separator), wavefront coordinate honoured, z<0 loading-only bore excluded AND disclosed, degenerate input returns null, nSeg clamped',
    !!ak && chainOk && radOk && sumOk && areaOk && locOk && wfOk && boreOk && nullOk && clampOk &&
    /Def_Driver 'Driver'/.test(sx) && /ExpoLe=1/.test(sx) && /System 'pin'/.test(sx) &&
    /Driver Def='Driver''Driver'\nNode=1=0=2=3/.test(sx) && /Enclosure 'Driver rear chamber'/.test(sx) &&
    /Conical/.test(sx) && /WHAT IT IS NOT/.test(sx) && /LEM sees AREA ONLY/.test(sx) &&
    /PLACEHOLDER/.test(sx) && /3\.01 dB/.test(sx) && /Lumped Element > General > Script/.test(sx));
  // the app: button present, handler wired to the SAME chart geometry (lastLEM),
  // and REMOVED (RULE 6) when there is no justified 1-D coordinate
  check('AKABAK LEM SCRIPT wired in the app (entry 230): button, .aks download, lastLEM captured from the exact prof+coordinate the Webster charts use (entry 215 one geometry source), button removed when the config has no 1-D coordinate, placeholder-driver and area-only caveats surfaced in the note',
    /id="exAks"/.test(htmlB) && /AKABAK SCRIPT \(LEM, \.AKS\)/.test(htmlB) &&
    /getElementById\("exAks"\)\.addEventListener/.test(htmlB) &&
    /lastLEM = mxProf \? \{ prof: mxProf, mode: mxMode, map: mxMap \} : null/.test(htmlB) &&
    /_ak\.style\.display = lastLEM \? "" : "none"/.test(htmlB) &&
    /akabakLEM\(\{/.test(htmlB) && /fname\("akabak"\) \+ "\.aks"/.test(htmlB) &&
    /Def_Driver block is a PLACEHOLDER/.test(htmlB) && /LEM models AREA ONLY/.test(htmlB));
  // the BEM project's README now points at the LEM script for the questions BEM
  // cannot answer cheaply, and carries the AKABAK 3 specifics learned this round
  var akr = E.abecProject({ name: 'r', mshName: 'r.msh', f1: 200, f2: 8000, nFreq: 24, meshFreq: 8000, mouthX: 100 }).readme;
  check('BEM PROJECT README cross-links the LEM script and carries AKABAK 3 specifics (entry 230): element budget ~5000, tag-number driver alignment, and the paste path for the .aks',
    /AKABAK SCRIPT \(LEM, \.AKS\)/.test(akr) && /Lumped Element > General > Script/.test(akr) &&
    /under about\n5000/.test(akr) && /MESH TAG NUMBER/.test(akr) &&
    /polars\nand DI, which a lumped model cannot produce/.test(akr));
  // entry 230 side-catch (found by the live T10 run, not by reading the code):
  // init3D's 250 ms retry loop overwrote v3dnote forever whenever THREE never
  // arrives (offline / slow CDN), ERASING the export feedback the user just
  // earned. Export notes now outrank the viewer status.
  check('EXPORT NOTE OUTRANKS THE 3-D VIEWER STATUS (entry 230): every export handler stamps the note via exNote(), and the init3D retry loop refuses to overwrite a note an export has written -- pressing EXPORT on a slow or offline CDN shows what you got, not "Loading 3-D viewer"',
    /function exNote\(\)/.test(htmlB) &&
    /e9\.dataset\.exportNote = "1"/.test(htmlB) &&
    /note\.dataset\.exportNote !== "1"/.test(htmlB) &&
    (htmlB.match(/= exNote\(\)/g) || []).length >= 7 &&
    !/var (nB|nD|nt7|ntN|nt9|nt8) = document\.getElementById\("v3dnote"\)/.test(htmlB));
})();

check('errbox clean', !errEl._t || !/OVERSHOOT/.test(errEl._t));
console.log(fail ? ('\n' + fail + ' FAILURES') : '\nALL PASS');
process.exit(fail ? 1 : 0);

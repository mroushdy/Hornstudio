# HORN STUDIO — complete project state
Read this ENTIRE file before changing anything. Then run `node smoke_test.js horn_studio.html`
to confirm the baseline passes, and run it again after EVERY change. Do not re-validate the
physics below — it is done, with numbers. Your job is to extend without regressing.

## What this is
A single-file HTML horn-design calculator (`horn_studio.html`) for Marwan (Silence Please, NYC;
SP Club 1 system uses a B&C DCX464 on a 600 Hz JMLC horn). It is a clean-room, published-science
replacement for the withdrawn sphericalhorns.net calculators (author "drba" revoked all IP use
2025-09-23; his name/site must NOT appear in the tool — cite the underlying science instead:
Salmon 1946, Le Cléac'h, Klangfilm/Rösch, Neile 1657, Keele 1975/1982, Kolbrek, Batík, Geddes).
`engine.js` is the source of truth for all math; it is embedded into the html via `rebuild.py`.

## Toolchain discipline (violating these has shipped real bugs)
1. Engine edits → edit `engine.js` → `python3 rebuild.py` → `node smoke_test.js horn_studio.html`.
   NEVER edit only the embedded copy or only engine.js. Drift between them once made node tests
   pass while the app was broken (SP saddle silently absent from the app's mesh).
2. NEVER call `build()` from an event handler. `build()` rewrites the app's innerHTML: it detaches
   the three.js canvas (3-D goes permanently blank) and destroys every control mid-interaction.
   Handlers sync input values in place (`num_<key>` / `rng_<key>` elements) + `scheduleUpdate()`.
3. Every `<select>` must (a) generate its `selected` attribute from state when built AND
   (b) be value-synced in the applicability pass. The section dropdown once displayed
   "rounded rectangle" while the engine built ellipses for a whole session.
4. NEVER mutate `S.*` inside applicability/update paths. The "square horns" bug: applicability
   contained `if (S.family === "cd82") S.section = "rrect";` — visiting the Bi-Radial family
   permanently flipped the section for every other family. Geometry routing must adapt in
   profOf (pass literal shape strings) without touching state.
5. Python `str.replace` on the html hits ALL occurrences. Functions have ended up duplicated
   (cdWall existed twice; a return-statement patch once hit cdWallRound's identical line and
   referenced an undefined variable). After structural patches, grep for duplicate
   `function <name>` and undefined identifiers.
6. The smoke stub must DESTROY elements on innerHTML rewrite (smoke_test.js does). A stub that
   reuses elements by id hides listener-death — this masked the dead-PETF-dropdown bug once.
7. The stylesheet is canonical (recovered verbatim from an old transcript after an accidental
   file deletion). Do not rewrite CSS from memory; the DOM uses semantic
   header/aside/main/footer, sidebar controls, 3-D preview at TOP of main, then 2-D drawing,
   stats, charts. If the file is ever lost, its latest copy IS this handoff.
8. Never chain `rm` after untested scripts (a chained deletion once destroyed the only copy).

## UI architecture map
- State object `S`: family, fc, throatD, entryDeg, T0, trunc, covH, covV, f0, f0V, petf,
  petfPreset, petfShape, petfRef, Tadd, fmult, TaddV, fmultV, sOff, section
  ("ellipse"|"sellipse"|"rrect"), seN, aspect, spProj ("flat"|"sp"), cornerR, flareR, thick,
  osK, osS, osN, rosR, rosA, rosA0, rosK, rosRr, rosB, rosM, rosQ.
- Element ids: familySel, petfSel, sectSel, spSel, drawing, stats, zchart, tchart, view3d,
  v3dnote, errbox; per-param `num_<key>` + `rng_<key>`; export buttons exCsv/exStl/exObj/
  exCloud/exQuarter.
- `hornParams()` builds P from S; includes `cdRound: S.family==="cd" && S.section!=="rrect"`.
- `profOf(horn, n)` routes: cd→(round CE via planeProfiles | wedge via planeProfilesWN
  "rrect","plane"); cd82→planeProfilesWN "rrect","plane" always; swh+aspect>1→buildEWF
  (+attachSP if spProj==="sp"); HVDiff when petf && (TaddV!==Tadd || fmultV!==fmult) for
  PETF_FAMILIES; else planeProfiles with shape ("sellipse:"+seN when section==="sellipse").
- Applicability pass shows/hides params per family/section; sectSel hidden for cd82
  (rect-only by patent); spSel only for swh with aspect>1; seN only for sellipse (not cd/cd82);
  f0V only cd+rrect (and cd82 uses eq.(4) auto when 0).
- PETF preset dropdown: off / boost (Tadd=2,fmult=2 both planes) / hvdiff (H:3.5/3, V:0.4/2,
  the author's published BEM demo recipe — aggressive; ~1 octave loading cost) / custom
  (exposes sliders). Handler syncs inputs in place (rule 2).
- Drawing: H plane up / V plane down; dotted construction-wavefront family overlaid for round
  JMLC (horn.wavefronts, captured every 40th step in jmlcWall); mouth end-view inset only when
  !isRound(); throat caption reads "(always round)" deliberately.
- Impedance chart uses UNTRANSFORMED law planes (SP is geometric reshaping, not a new expansion);
  guard flag prof.spApplied prevents double-applying SP.

## Engine function map (engine.js)
- `makeTfun(P,m)` — PETF: T = T0 + Tadd·(1−e^(−m·fmult·(s−ref))), tanh variant, throat/mouth ref.
- `jmlcWall` — isophase construction: polyline wavefront advanced along normals, outer element
  solves the hypex area law; entryDeg>0 seeds a conical mid element (driver-exit matched);
  entryDeg=0 is canonical (opening angle is INTRINSIC to fc/T0 per the method's author — a free
  angle makes the first outer element negative). Snapshots wavefronts.
- `swhWall` — Klangfilm/Rösch construction, r0 = c/(π·fc) (NOT c/2π — that bug shipped once;
  caught by a published reference case, later confirmed by the patent-construction post's
  closed forms). h = h0·g², y² = h(2r0−h), z = x−h+h0. Mouth (vertical tangent) at h = 1/m.
- `buildEWF(P,fs)` — elliptical SWH via ellipsoidal wavefronts: construction sphere stretched to
  triaxial ellipsoid (equatorial r0·fs, r0/fs; polar r0); per station Newton on ra holding rb so
  the numeric ellipsoid CAP area (ellipsoidCapArea, calibrated 1.00001 vs analytic sphere)
  equals the spherical cap 2π·r0·h; the WALL is the cap RIM (ra·sinθ, rb·sinθ) — NOT the axes
  (that mistake produced 791/79 garbage once). sin stretch transition. Flag areaLawPiAB.
- `spTransform(rp,zRef)` — normalized stereographic projection as a pure point map; per-point
  sphere from the round-reference radius; coherent rp = √(ym²+L²). Produces the saddle mouth
  (minor axis forward). Applied in buildRings + spPlanes (drawing/stats/CSV) + cloud export.
- `sectionPoint/sectionArea` — ellipse, rrect (feature-anchored corner sampling), and
  "sellipse:N" Lamé curves with EXACT area factor 4·Γ(1+1/n)²/Γ(1+2/n) (gammaLn Lanczos).
- Area normalization in planeProfilesWN: horns flagged areaLawPiAB (EWF, HVDiff) get per-station
  axis rescale k = √(π·a·b/A_shape) so non-ellipse sections keep the law's area — the published
  correction ("find shorter main axes preserving stretch"). n=2 is a no-op; CD is untouched
  (its law is enforced upstream in rect terms).
- `buildRings(prof,segs)` — SINGLE shared ring generator for mesh/STL/OBJ/clouds. Base stations:
  sectionPoint with cos²-blended z. Flare stations: TRUE perimeter-normal roll — every
  mouth-ring point rolls outward around the roundover radius in its local (2-D SECTION-NORMAL,
  z) plane, wall angle measured along that same normal (central-difference tangent around the
  mouth ring, oriented outward). This is the parallel-curve construction: flat walls translate
  uniformly and stay flat; corner arcs inflate concentrically. (History: per-plane arcs +
  blending → pinwheel corners, regression 5; the first "fix" rolled RADIALLY from the axis —
  ellipse-safe but bulged every flat wall of rect sections into a point, regression 18.)
  At plane centers normal == radial, so flareArc H/V profiles agree with the mesh exactly. Their addition: `prof.flareToPlane` sweeps only to
  the mouth plane (flush lip, used by cd/cd82 "plane" mode) and sweep caps at fold-back.
- `cdWall` — Keele 1975 production recipe, COMMON-MOUTH rewrite (ported 2026-07-13 from a
  parallel branch): 12.7 mm round→rect transition; wedges at HALF the throat included angle
  A = 0.9·B per plane (Keele p.3; Fig.19c ~41°/side at B=90° confirms — resolves the old
  wall-angle=coverage overshoot caveat); V follows the hyp-exp RADIUS law from the transition
  until its slope reaches its wedge angle (this reading places the exp→conical change at
  Keele's stated 5–11 in). BOTH planes end at ONE mouth plane: L = max of per-plane Fig.16
  last-third schedules; the other plane's flare start zF is solved closed-form to land exactly
  on its own Keele width at that same L (clamps: wedge-only overshoot if it overreaches —
  as on shipped EV horns — flare vanishing into pure wedge if kr-area extension governs).
  L extended by bisection if the mouth area misses Smouth = c²/(4π·fc²). Targets: dKeele =
  2.54e7/(covH·f0); dKeeleV from f0V (eq.(1) per plane) or eq.(2) aspect when f0V=0. The old
  past-target 0.25·tan taper (regression 8 workaround) is gone — superseded by the common plane.
- `cdWallRound` — round CE horn: hyp-exp throat, eq.(7) directivity-matched join
  r = 0.95·sin(θ)/k_c, cone, 80° last-third flare, kr + Keele-width termination.
- `keele82Wall` — US 4,308,932 JBL Bi-Radial: per wall pair y = a + b·x + c·x^n with
  b=tan(A/2), A=0.9·B, W=K/(A·F), W'=W/1.5. Slot pair selected BY COVERAGE (the WIDE pair
  converges to the diffraction slot — never by length; see regression 13); its series
  originates AT THE GAP (a'=gap/2) over Ls=(W'/2−gap/2)/tan(A/2). The narrow pair runs from
  the throat (a=G/2) over the full common L = max(L_narrow, Ls+xgMin); its c is solved with
  that L so both mouths stay congruent. Connector throat→gap: rho morphs G/2→slot corner
  radius, area law lands exactly on the slot section (may contract — that IS the slot;
  see regression 12), convergence ≤35°, xgMin ≥ one throat radius (calibration — the patent
  example's connector length is not on file). Gap 0.185·G (patent example 18/48.8).
  Rectangular ONLY — no round variant exists in the patent.
- `araiWall` — "Biradial" family (Arai A-290 / TAD / Crowe hi-fi lineage): 12.7 mm round→rect
  transition, then straight sectoral H fan at 0.78·covH/2 (single-point calibration: A-290's
  ~74° drawn fan for its 95° coverage spec) with V solved from the hypex law on AXIAL
  distance (flat-section accounting, corner-aware, same identity as cdWall's law region),
  terminated at the kr=1 LOADING area — no slot, no V wedge, no Keele width; coverage narrows
  gradually by design. V necks slightly after the throat (authentic sectoral behavior — the
  fan outruns the early hypex area growth). Finless (Crowe practice; Arai used 4 fins —
  expect softer wavefront coherence at covH > ~100). PETF-capable via makeTfun on z.
- `keele82Wall` — UI-RETIRED 2026-07-13 (family selector now carries the Arai biradial at
  Marwan's request) but preserved engine-side under family key "cd82" and still smoke-guarded
  by the patent-example checks. Do NOT delete.
- `osseWall` (Batík 2020 formula 5, Keele-width sized), `rosseWall` (Batík 2022, exact),
  tractrix (Neile), hypex, conical. `throatImpedance` — staircase Webster + baffled-piston
  termination (an indicator, NOT a polar predictor — BEM/AKABAK is the arbiter).

## Validation record (all done — do not redo; cite when asked)
- JMLC: matches Azurahorn AH-425 tables; fits the author's own exported STL
  (PETF fc400 solid) to 3.16 mm RMS over the full body.
- PETF: eq.(2) verbatim; all four published reference profiles reproduce —
  L 261/221/151/192 mm vs plotted ~258/220/150/190 (fc400 ref, Tadd0.7, T0=0.7+3 at 400,
  same at 350). Mouth-radius invariance under throat-PETF confirmed (asymptotic slope → m).
- SWH: closed-form checks exact (apex 261.0 = analytic 261.0 at fc400 rt17.5; closure at
  h=2r0; Reichardt special case rt0=0.0955·r0 → mouth at z=r0). Lineage: Rösch/Klangfilm
  patents CH279947/DE952179/DE955248; the patent itself prescribes the rapid outer-wall
  fold-back (so truncation+roundover is period-correct).
- EWF: major 262 / minor 121 vs published 257/123 (fs=1.5 reference); aspect preserved;
  station areas identical across sections after normalization (94.0k mm² ellipse = sellipse).
- SP: rp 318 vs 316, δ0 34.8° exact, h 57 exact, unity on round mouth 0.00 mm, saddle spread
  81.4 mm at the mouth ring, minor forward. Mesh manifold, NaN-free through all of it.
- CD 1975 (common-mouth rewrite): mouths now EXACT in BOTH planes vs shipped EV products at
  their design inputs — HR4020 1220×610, HR6040 828×432, HR9040 1003×433 (old scheduling
  overshot width via the past-target taper: +3%/+7%/+18% at 40/60/90° covH). Wall angle
  0.9·B matches Fig.19c (~41°/side at 90°) — old caveat RESOLVED. Length change vs old
  build −8%…+3% (absolute EV length errors not re-derived; shipped lengths not on file).
  Round CE junction 286 mm vs Keele's "about 11 in" (279) — cdWallRound unchanged.
- Biradial (Arai): validated against the shipped A-290 (araihorn.com, plans public): at its
  design inputs (95×40, T0.7, fc290, 2") the engine gives W 658 × interior-H 171 × L 415 vs
  W 656 × ~170 (230 exterior in 30 mm lumber) × 405 — all within 2.5%. Terminates mouth-kr1;
  Arai's own guidance preserved in spirit: crossover ≥600 Hz despite fc 290 loading.
- Superellipse: F(2)=π to 5 digits; n=8 → 97.8% of rectangle area.
- PETF loading cost (author's BEM, catalogued): ~1 octave of loading for ~60° stable −6 dB
  coverage in the aggressive demo recipe; mild PETF (Tadd≈1) fit his actual STL.

## Visual verification harness (MANDATORY before presenting geometry changes)
`node vischeck_dump.js '<S-overrides JSON>' /tmp/vis.json && python3 vischeck_render.py /tmp/vis.json /tmp/out`
replicates the app's exact pipeline (computeFamily -> profOf routing -> buildRings/buildSolidMesh)
and renders TOP/SIDE silhouettes vs the engine profiles, section cuts (throat/slot/mid/mouth),
and a shaded 3-D. RULE: any change that touches wall geometry, sections, flares, or the mesh
must be rendered and INSPECTED (view the PNG) before showing the user. The dump also hard-fails
on non-finite mesh coords. Numeric fidelity gauge: ring extents vs profiles (0.01 mm typical).

## Hardware anchor for cd82 (JBL 2380A datasheet, cites US 4,308,932 directly)
Design inputs 90x40, 49 mm throat, pattern control H 500 Hz / V 2 kHz. Shipped: mouth 445x279,
length 236. Ours at patent K=25,000: 617x347xL281. Implied product K ~= 18-20k m*deg*Hz
CONSISTENTLY in both planes (patent text: "on the order of 25,000") -- products shipped ~20%
smaller than the patent nominal; with K calibrated to ~20k the mouth lands on the shipped
product in both planes. DECISION: engine keeps the patent K (published recipe); to emulate
shipped compacts, scale f0/f0V by 25/20 (e.g. 625/2500 instead of 500/2000). Aspect W/H ours
1.78 vs shipped 1.59 at patent K; matches under product K.

## Known open items
- AKABAK BEM is the arbiter for polars; quarter-symmetry cloud export exists for it.
- SP Club 1 loading test protocol (offered, not yet run): free-air vs horn-attached driver
  impedance overlay (peaks should flatten) + normalized k3 distortion knee = true crossover floor.
- Possible next features: wavefront overlay for SWH family; JBL-2370-compact CD mode (early V
  wedge); their flareToPlane could be exposed as a UI toggle for non-CD families; "hi-fi
  biradial" family (Yuichi/A-290 architecture: sectoral H at the coverage angle + hypex-law V
  to a kr-sized mouth, T~0.7 -- mostly a reparameterization of cdWall; log-spiral wall profile
  as a curve option, textbook math, see blog_index Crowe/biradial survey).
- cd82 lengths/gap calibration beyond the patent example are extrapolation — flag if pressed.

## Regression history (why the rules above exist — newest last)
1. SWH r0 = c/2πfc (wrong, half-size caps) → caught by published L=260/ym=181 reference.
2. EWF Newton on wall values instead of ellipsoid axes → 791/79 garbage → rim construction.
3. sectSel showed first option regardless of state → "says rectangle, builds ellipse".
4. petfSel handler called build() → DOM teardown → dead dropdown + blank 3-D in real browsers
   (invisible to element-reusing stubs).
5. Per-plane mouth roundover → pinwheel corners on rectangular sections → perimeter-normal roll.
6. Lamé exponent silently inflated station areas → exact axis rescale (published correction).
7. CD as eq.27 exp→cone junction (appendix concept) → square-ish tub; production wedge recipe
   + eq.(2)/eq.(1)-per-plane vertical sizing + closed-form Fig.16 flare + gentle taper.
8. "Hold H at Keele width" → parallel-wall plateau (tub rim); unbounded flare → width blowups.
9. cd82 sticky state (S.section mutated in applicability) → every family went square after
   visiting Bi-Radial. Removed; routing handles rect-only families without touching state.
10. rosseWall ||-defaults swallowed paper-valid zeros: sliders allow rosA0=0 and rosB=0 (the
    R-OSSE paper analyzes a0=0 explicitly; b=0 = no bending) but `P.rosA0 || 7.5` built 7.5°
    while the UI showed 0 — same genre as #3. Fixed with ===undefined (matching osseWall's osS
    pattern); smoke checks added ("rosse a0=0/b=0 actually changes geometry"). Rule: for any
    param whose valid range includes 0, defaults MUST use ===undefined, never ||. Also fixed a
    stale swhWall comment that still stated the regression-1 formula r0=c/(2π·fc).
11. (upgrade, not a bug) cdWall replaced with the common-mouth 0.9·B rewrite cherry-picked
    from user-supplied horn_studio__4_.html (a PARALLEL OLD BRANCH). WARNING: that donor file
    also contains regression-9 code verbatim (S.section mutation in applicability), lacks the
    cd82/Bi-Radial family, and predates fixes #10 — NEVER adopt it wholesale; cherry-pick only.
    Also ported from it: hvdiff preset now sets T0=0.6 (published BEM recipe No.1 is
    H(0.6/3.5/3) V(0.6/0.4/2)); HVDiff lip rolls to the mouth plane ("plane" flare mode);
    corner-R clamp in buildHVDiff; throat-caption anchored right (left-anchored text clipped
    off-canvas); sOff (PETF T offset) slider exposed. Smoke checks added: common mouth plane +
    Keele widths ("cd rect planes end at a common mouth plane", "cd rect mouth meets Keele widths").
12. cd82 connecting section shipped a rounded-RECT throat + a ~5 mm V-wall step at the gap
    (screenshot, 1.4in throat / 90x50 / auto f0V). Two coupled causes: rho clamped to
    0.98*gHalf across the WHOLE connector incl. x=0 (throat corner radius 6.45 instead of
    G/2 -> area identity then gave b(0)=14.5, not 17.78); and Sgap floored at 1.02*S0
    (claim-11 growth) while the slot area was BELOW throat area, so the connector could not
    land on the slot -> step. Fix: connector rho morphs G/2 -> slot corner radius
    (smoothstep), ys solved with that rho (x=0 is the exact circle), and the S0 floor
    removed (area may gently CONTRACT into the slot -- that constriction IS the diffraction
    slot). Patent 18 mm gap calibration on the 48.8 example preserved; mouth series
    untouched. Smoke checks: "cd82 throat is round", "cd82 slot-plane wall is step-free".
    Rule: any round->section transition region must pin rho = ys = G/2 at x=0 EXACTLY.
13. cd82 pinched the WRONG PLANE: slot pair was chosen as the shorter-L plane ("longer L
    governs" proxy for the patent's "narrow pair governs"), but eq.(4) auto-f0V makes the
    narrow plane's W smaller and its L SHORTER, inverting the proxy — the narrow (V) plane
    got the diffraction slot (throat-side V spike, 2026-07-13 screenshot #2). Patent: the
    WIDE-coverage pair converges to the slot. Also the gap sat at 0.05·L (63° connector
    walls) because the slot run was measured against the throat-based L. Fix: slot pair by
    coverage; slot series originates at the gap; common L = max(L_narrow, Ls+xgMin) with
    connector convergence ≤35° and xgMin ≥ G/2 (calibration, flag if pressed). 90×40 on the
    48.8 mm patent throat now: gap 18.1 mm @ z=24.4, L=255, mouth 617×274. Smoke: "cd82 slot
    pinches the wide plane only" + slope-relative step detector (absolute-delta thresholds
    false-positive on the steep-but-smooth power-series mouth).
14. cd82 REDERIVED FROM THE FULL PATENT TEXT (exemplary-embodiment table finally recovered
    2026-07-13; earlier sources omitted it). The table: A 80x36 (B~89x40), G 48.8, mouth
    780x780 SQUARE, L 815.1, gap 18.0, throat->gap 516, gap->mouth 299.1, Nv 4.0 / Nh 5.5.
    Three corrections it forced: (a) auto-f0V via Keele-1975 eq.(4) was a WRONG GRAFT --
    the patent's exemplary mouth is SQUARE (W_v = W_h); eq.(4) would have given 1736 mm.
    Auto mode now = square mouth; manual f0V = rectangular embodiment (per-plane K).
    (b) The slot pair's series origin AT THE GAP is now PROVEN by the table:
    (W'/2 - gap/2)/tan(A/2) = 299.1 = its gap->mouth distance exactly. (c) n recalibrated
    through the table's true points (B=40 -> 4.0, B~89 -> 5.5); the old fit misread the
    included angles as beamwidths. Result vs table: mouth 781x781 (780x780), gap 18.1
    (18.0), gap->mouth 300 (299.1), L 726 (815, -11%), throat->gap 427 (516) -- the
    residual L gap is the patent's ##EQU1## D-term, unreadable in every accessible source
    (image-only scans); FLAG IF PRESSED. The connector is now the patent's LONG gentle
    convergence (59% of L, ~2-5 deg) -- the successive near-throat pinches of fixes 12-13
    were symptoms of the missing table. Smoke: 3 patent-example checks added. Marwan's
    visual reports drove all of 12-14: when a render "looks wrong" to him, treat it as a
    failing test and go deeper into the primary source.
15. Family swap at Marwan's request: the UI "biradial" slot now carries the Arai/hi-fi
    biradial (araiWall) instead of the Keele 1982 diffraction-slot patent horn. cd82 is NOT
    deleted — keele82Wall + engine routing + patent-example smoke checks all remain (rule 8
    spirit: never destroy the only copy of validated work). UI touchpoints swapped: family
    list, profOf (default flare mode — wrap-capable mouth per hi-fi practice), rect-only
    applicability, covH applies / covV+f0+f0V hidden, T0 exposed (LAW_FAMILIES + biradial).
    Calibration honesty: fan = 0.78·covH/2 and the kr mouth are anchored on ONE shipped
    product (A-290) — flag if pressed; the axial-distance law is textbook plane-wave hypex.
16. PARALLEL-BRANCH MERGE (horn_studio__5_.html, separate chat, 2026-07-13). PORTED (3):
    (a) superellipse exponent MORPHING (seNArr): Lame n blends 2 (true round throat) -> seN
    at the mouth via arc-length smoothstep, exact per-station area at the morphed exponent;
    consumed by buildRings + throatImpedance. Fixes the old constant-n defect (non-circular
    sellipse throat). (b) Absolute EXIT-ANGLE roundover replaces the binary flareMode:
    flareSweepFor(arr, exitDeg), profOf passes 90 + S.flareWrap (new slider, 0-135 deg;
    0 = flush plane, >0 = wrap-back lip -- gives the Crowe wrap-around mouth on biradial).
    (c) buildHVDiffAz az-loft for the wide-format: every azimuth is a COMPLETE PETF horn
    (cos^2 H<->V param blend), rollbacks KEPT per azimuth, absolute arc-length correspondence;
    buildRings consumes azProfiles directly; profOf caches on a param key; hvActive locks out
    aspect/flareR/flareWrap/cornerR/seN. Old buildHVDiff kept dormant engine-side. Added a
    degenerate-wall guard their at() lacked. REJECTED (4, all with reasons): their swhWall
    (regression-1 c/2pi resurrected), their R-OSSE ||-defaults (regression-10 resurrected),
    their keele82Wall (keeps eq.(2) sin-aspect auto vs our PROVEN square-mouth exemplary;
    their L = 811 "essentially exact" comes from applying 0.9 TWICE -- it breaks the
    gap-to-mouth check that our reading hits EXACTLY at 299.13 vs the table's 299.1; their
    345 misses by +15%. Their gap-widening claim-11 guard trades gap fidelity for monotone
    connector area -- defensible, not adopted; noted as an idea), and their S.* mutations
    inside applicability (the regression-9 sticky-state pattern -- lockouts ported WITHOUT
    the mutations). Smoke: 3 new checks (33 total). NOTE their branch predates fixes 10-15;
    never adopt it wholesale.
17. HVDiff az-loft ran EVERY azimuth to its own complete JMLC mouth (all ~equal r since the
    fc-mouth is shared) -> near-ROUND mouth whose only far-z geometry was a narrow strip
    around the slow plane -> cusped "tongues" top/bottom (Marwan's 2026-07-13 renders vs
    the author's mk-series CAD: his lobes are broad). The published No.1 profile plot is
    decisive: the FAST plane (H, Tadd 3.5) shows a complete rolled-back mouth while the
    SLOW plane (V, Tadd 0.4) is CUT mid-rise at ~half the fast plane's mouth radius, no
    rollback -- the loft terminates when the fastest azimuth completes; everything slower
    truncates at that arc length. That truncation IS the wide-format oblong mouth
    (fc250/36mm: 716x400, aspect 1.79 vs the plot's ~2.06). Fix in buildHVDiffAz: sCut =
    min(az totals) replaces sMax; at() never clamps; H/V sampled to sCut (also fixes a
    latent CSV bug -- trimDup could desync prof.H/prof.V lengths, and the paired-column
    export indexes them together). Smoke: 3 checks (cut = fastest completion; mouth oblong
    with V truncated beyond H's z; fast-plane rollback kept). 36 total.

17. (numbering note) HVDiff az-loft truncation-at-fastest-azimuth is guarded in smoke_test
    comments as "regression 17"; it shipped as part of merge #16 above.
18. "Pointy wrap" (2026-07-13, Marwan screenshot: cd 90x50 rrect, cornerR 6, wrap 135):
    the buildRings flare rolled every lip point RADIALLY from the axis (the comment claimed
    perimeter-normal; the code was radial). Constant radial dl gives a wall clearance of only
    dl*cos(skew) off-center, so on rect sections the lip bulged into a point at the center of
    ALL FOUR flat walls (top-wall lip y ranged 140→193 mm before; 0.000 mm spread after).
    Fix: true perimeter-normal roll — direction = outward 2-D section normal (central
    difference around the mouth ring), wall angle measured in that (normal, z) plane =
    parallel-curve lip, crease-free for convex sections. Ellipses unaffected (normal≈radial —
    which is why the bug hid). Literature direction per Marwan: the sphericalhorns spiral
    posts' "built-in roll-back" — the roll belongs to each wall locally, not to the axis.
    Smoke: "wrap lip: flat walls stay flat through the roll". Follow-on idea (not built):
    clothoid/Euler-spiral easing of the roll curvature for a curvature-continuous lip.
19. (feature, 2026-07-13) 2-D drawing is now a TWO-PLANE OVERLAY: H and V each drawn FULL
    and mirrored about the axis (Marwan's request, modeled on his spreadsheet plot) instead
    of H-up/V-down halves. H = active color (ink / petf-red), V = --base steel blue, PETF
    reference = faint dashed (both planes, both sides). W/2 and H/2 callouts color-matched.
    maxR now scales from BOTH planes (was H-only: V > H would have clipped). Round horns
    keep the single-profile drawing. UI-only (profileSVG in the html; engine untouched).
    NOTE: the image-view tool died mid-session; verification done structurally (SVG parse:
    2+2 mirrored polylines per plane, colors, no viewBox clipping, V neck visible) + preview
    PNGs delivered to Marwan. His screenshots this session showed the PRE-fix pointy wrap
    (bulges at wall centers = radial-roll signature); current build verified clean
    numerically -- if a render "still looks wrong," first confirm it came from the CURRENT
    file/export, not a stale page or an STL exported before the fix.
20. (feature, 2026-07-13) PETF preset dropdown gained "Wide-format No.2 -- oval, better
    vertical (BEM recipe)" = the author's published recipe No.2: H(0.5/3.5/4) V(0.5/1.75/4).
    Existing hvdiff preset relabeled "Wide-format No.1 -- waisted": its aggressive V params
    produce a peanut mouth (top edge peaks ~phi 56deg, 13.4% waist dip, 158 mm z-saddle) --
    verified intrinsic to per-azimuth PETF + fastest-azimuth cut, NOT a loft artifact;
    No.2 measures 0.0% waist (oval, peak at center, 103 mm z-saddle). petfSel options now
    also generate `selected` from state (rule 3a; previously value-sync only). Smoke: preset
    added to the DOM cycling check + 2 engine-level shape guards (36 checks total).
21. (feature, 2026-07-13) ARAI OPTIMIZED: UI "biradial" family now runs araiOptWall, a
    deep-research clean-room synthesis of the best PUBLIC Arai-lineage findings:
    (a) Sidewall = Yuichi's real construction (his book scans, surfaced in the open A-290
        CAD/BEM study): a circular ARC through throat/mouth endpoints laid against the
        95-deg coverage construction line -- "quite flat before curving out". Implemented
        as the unique circle with END tangent = covH/2; the chord runs at ~0.78*covH/2,
        which EXPLAINS the legacy fan calibration (0.78 = the arc's mid-length average).
        A-290 anchors carry over: W 658.8/656, H_int 170.8/~170, L 415/405. Arc on the
        anchor case: R 1390 mm, tangent 26.6->47.5 deg; max angle step 0.13 deg (smooth).
    (b) V from the hyp-ex law (rect accounting) as before; the arc sits below the old
        straight fan mid-length -> V-neck shrinks 27% (min 15.9 vs 12.5 mm on the anchor).
    (c) Fin layout returned as DATA (finLayout {originZ,endZ,angles}); mesh stays finless.
        Layout = the BEM-tested improved arrangement from the public A-290 study: 6 fins,
        gaps 7.5/15/15/15/7.5 deg, outer channels half-cells against the walls
        (Kolbrek/Dunker), one common origin (Arai: identical symmetric cells), scaled
        covH/95. Shown in stats + arc parameters.
    (d) Mouth: community priority is unanimous ("improve the mouth FIRST; round as far as
        you can, JMLC/R-OSSE style") -- handled by the existing exit-angle wrap; stats now
        nudge toward generous wrap. Legacy straight-fan araiWall PRESERVED under family
        key "arai" with its own A-290 smoke anchor (rule: never destroy validated work).
    Smoke: 5 new checks (41 total). Research provenance in blog_index (Arai design notes:
    hyperbolic 95-deg CD, fins essential for full-range per Yuichi himself, round-to-SQUARE
    no-pinch throat vs TH4001's pinch accident; A-290 study: arc construction, fin results,
    every-horn ~1 kHz midrange narrowing, "improve the mouth first").
22. (feature, 2026-07-13) METHOD BLURB IS NOW DYNAMIC: the eqs footer under the charts
    renders only the ACTIVE family's method via methodBlurb(), updated in place alongside
    stats (rule 2 respected -- innerHTML on a text-only div, no build()). The old static
    all-methods wall was stale: it still described the UI-retired cd82 patent horn as
    "CD biradial" and said nothing about the Arai-optimized rebuild. Conditional lines:
    section-morph sentence hidden for the rect-only families (cd, biradial); PETF sentence
    (incl. HVDiff No.1/No.2 + the ~1-octave loading cost) appears only when PETF is active;
    Webster-indicator disclaimer always. Smoke: 3 checks (44 total).
23. (feature, 2026-07-13) BUILD-STYLE OPTIONS for the Arai-optimized biradial (Marwan's
    "why doesn't ours look like the wooden A-290" -- answer: the classic look is fins +
    cabinetry, not different acoustics):
    (a) finsSel ("Fins: off / 6-fin optimized pack"): araiFinMesh(horn, t=10) emits the
        6-fin BEM-tested layout as SEPARATE closed blade solids -- radial from the common
        origin (finLayout), full interior height wall-to-wall (+-b(z), matches interior
        half-h at the mouth), clipped inside the side walls, spanning ~origin+3% -> base
        mouth plane. Merged into the render/export mesh via mergeMeshes.
    (b) shellSel ("Shell: uniform thickness / cabinet (rect envelope)"): buildCabinetMesh
        replaces the constant-thickness shell with the wood-shop presentation -- interior
        surface + rectangular prism envelope (max extents + thick, corner rho ~t/3) +
        front face frame + back driver plate; rect perimeter sampled with sectionPoint
        "rrect" at the SAME j-parameterization as the inner rings so strips never twist.
        Flush mouths (wrap 0) give the authentic picture-frame face; wrapped lips still
        close (frame slopes in to the lip ring). INTERIOR IDENTICAL in both modes.
    Both selects: biradial-only (applicability shows/hides + value-syncs; options generate
    selected from state -- rule 3 a+b), handlers sync state + scheduleUpdate (rule 2, no
    build()). buildStyledMesh() wraps viewer + STL + OBJ so all three honor the style.
    RULE-1 NEAR-MISS CAUGHT LIVE: the UI called araiFinMesh before rebuild.py re-embedded
    the engine; the smoke sweep passed because defaults never exercised the new path.
    Fix: rebuilt + smoke checks now SWITCH the selects through the DOM (would have failed).
    Smoke: 7 new checks (51 total). Engine exports += araiFinMesh, buildCabinetMesh,
    mergeMeshes. vischeck_dump still tests the default (uniform, finless) path only.
24. (feature + validation, 2026-07-13) BOOK-ANCHORED ARAI: Marwan supplied the A-290 book
    scans (the same pages the diyAudio study cited). Extracted anchors and what changed:
    (a) VALIDATION -- his throat-adapter station table IS our law: hyperbolic fc290/T0.7
        reproduces it to 0.7% (S(10mm) 21.86 vs 21.89; S(24mm) 24.41 vs 24.57). Mouth-side
        vertical height matches his last drawn station to 0.6% (79.5 vs 80 half-height).
        KNOWN DEVIATION (flag if pressed): mid-horn V runs fatter in our build (up to
        +44% at L-60) -- his V stays slimmer longer and whips out at the wing (deltas
        6/6/6/10/13 vs our 3.9->5.5); by area conservation his SIDES are fuller mid-length
        than our single Yuichi arc + his sidewall carries an R=402 mouth wing. Exact
        plank-table reconstruction remains the Phase-1 plan-exact option, not done.
    (b) Adapter length zTr 12.7 -> 25 mm (his documented plate; the 12.7 was a Keele
        graft). A-290 anchor after change: W 642 (656, -2.1%), H_int 175, L 415 -- inside
        tolerances.
    (c) finsSel gained "4-fin Arai original (covH/5 cells)": his book plan marks 19.0 deg
        = 95/5 equal channels; fins at +-covH/10, +-3covH/10, radial from the common
        origin, blade span from scale fractions 0.114/0.636 of (L - zA) -- lands on the
        book's R0 34.5 / blade 192 within 3% (ours 33.5 / 187). Blades are now LENS
        profiled (t(u) = t*sin(pi*u), 1 mm floor) per his fin drawing, both layouts.
        arai4 blades end mid-horn (z<=339 on the anchor), opt6 still runs to the mouth.
    (d) FREQUENCY: fc slider fully drives the family (it always did; now law-anchored by
        Yuichi's own table). Verified scaling fc 230..650: W 889->198, L 579->117, fins
        scale with (L - zA), all mouth-kr1 terminated.
    Smoke: +4 (58 total).
25. (major, 2026-07-13) FIVE-CELL RULE + VIEWER FIX + THREE-STUB HARNESS.
    (a) BUG FIXED: the 3-D viewer died in real browsers -- buildStyledMesh was defined
        INSIDE update() (depth 2) while update3D() (a sibling) called it -> ReferenceError,
        invisible to smoke because the app early-returns when THREE is undefined (same
        blind-spot class as regression 4). Fixed by moving to IIFE top level; PERMANENTLY
        closed by a recursive no-op Proxy THREE stub in smoke_test.js so the viewer path
        now EXECUTES in the harness (any viewer-scope throw crashes the suite loudly).
    (b) THE BOOK TABLE DECODED (page 065, Table 3.3.1-1, user-supplied): the A-290 is
        FIVE identical hypex wedge cells fanned at covH/5 pitch from a throat array of
        radius Rarr = 1.16*2rt/covH_rad (34.4 vs book 34.5; the 1.16 is his stated
        free-space margin on the outermost cells). Per cell: width = pitch*(Rarr+x)
        EXACTLY (perfect 19-deg wedges throat->mouth); area = hypex with a DRIVER
        head-start offset x0 = zTr + Rarr (law runs from the driver through adapter +
        array; ratio-fit ~1%); height h = S_cell/b_cell. The famous 50 mm constant
        height through the fin region is EMERGENT, the fins at +-covH/10, +-3covH/10
        ARE the cell boundaries, fins end exactly where V starts opening (emergent flat
        span 196 vs his 192 mm), and the drawing's R=402 is the PER-CELL kr=1 mouth arc
        (ours 399). araiOptWall now: V = the cell rule (hHalf5); mouth = per-cell kr
        (L 390 vs book 380 incl adapter); chord recalibrated 0.78 -> 0.834 for the
        corrected L. Anchors: W 657.3 (656, +0.2%), H_int 169.9 (~170), L 390 (380,
        +2.6%). Length smoke window corrected to the book (was araihorn's 405 claim).
        V stations vs his side view converge 53->78 against 39->80 (last within 2.5%;
        early stations are the side-plate/wing region, off-center -- documented, flag).
        Spec page 067: usable band 550 Hz-20 kHz, 23 kg, adapter listed 30 mm (drawing
        25 -- we use 25), 656W x 230H x 380L INCL adapter (230H = wing-tip plate height;
        interior at the kr arc is ~170 -- both were being conflated before).
    (c) fc SCALING (the "Crowe resize" ask): fully parametric and now book-generative --
        fc 230/290/400/550 -> W 910/657/416/264, L 543/390/243/150, fin flats 312/196/
        102/44, all per-cell-kr terminated. Stats show "Arai-style A-<fc>".
    Smoke: 59 checks ALL PASS (incl. viewer path under the THREE stub).
    CAD from the study on disk: /home/claude/arai_cad (A-290 V1/V2 .step/.f3d) -- future
    surface-diff material.
26. (fix, 2026-07-13) T(s) CHART showed the wrong curve for the axial-law families:
    cdWall, araiWall, and araiOptWall all evaluate the PETF factor on AXIAL z (araiOpt on
    the cell-law argument z + Rarr) but the trace recorded Tf(arc-length s) -- with PETF
    on, the plotted S-curve rose later/stretched vs the T that actually shaped the horn
    (s > z everywhere past the throat). Traces now record the APPLIED T per station; the
    s-based families (jmlc, swh, tractrix, hypex) were already consistent and untouched.
    Verified against the analytic PETF value at z=120 (2.6241 exact). Smoke: 60 checks.
    Rule for new walls: Ttrace.T must be the value fed to the law at that station, never
    a re-evaluation on a different length variable.
27. (fix + feature, 2026-07-13) FAMILY DEFAULTS. Reported bug: switching to conical set
    entryDeg=15 (a one-off "sensible cone" hack in the familySel handler) and it STUCK
    when leaving -- jmlc then ran a 15-deg seeded wavefront instead of the canonical
    intrinsic opening (entryDeg 0). Replaced with FAMILY_DEFAULTS: on family switch, the
    family's documented reference config loads (jmlc entry 0/fc400/T0.7/trunc175; conical
    entry 15; cd = Keele classic 90x40, f0 800, cornerR 10; biradial = the A-290 reference
    fc290/covH95/flush mouth; os = 90deg/k1/s0.7/n4; rosse = the ST260 paper reference;
    swh/tractrix/hypex fc400 T0.7). Driver/build choices persist across switches (throatD,
    thick, section, fins, shell, PETF preset). Inputs sync in place (rule 2). Initial
    covV 50 -> 40 (matches the cd classic). Smoke: 4 checks via the synced inputs
    (64 total). Rule: any "sensible default on switch" belongs in FAMILY_DEFAULTS, never
    as a one-off conditional -- one-offs are how the sticky 15 shipped.
28. (fix x2, 2026-07-13, Marwan's photo review) (a) OPT6 FIN SPAN BUG: when the blade span
    moved to the throat-array origin (entry 24), only finLayoutArai4 received R0/R1 -- the
    opt6 layout fell through to araiFinMesh's run-to-the-mouth fallback, so 6-fin renders
    showed blades sweeping to the mouth corners. Both layouts now carry the documented
    span (blades end at the flat-section end, z~219 on the anchor; book/study agree).
    Rule: layout objects must carry their span EXPLICITLY; fallbacks hide omissions.
    (b) CABINET v2: the v1 full prism (flat top at max height, full-width back plate)
    looked nothing like real Arai builds. Now: flat full-length side boards, top/bottom
    plates FOLLOWING the vertical curve (plate thins toward the back), and a SQUARE
    adapter block (half-side 3.3rt = his 162 on the 2in throat) with the visible step to
    the body. Same segs-parameterized ring strips; interior identical. Smoke: 3 new
    guards (67 total).
29. (fixes, 2026-07-13, Marwan) (a) fc SLIDER WAS MISSING FROM BIRADIAL -- the fams list
    on the fc param never gained "biradial" when the family was created, so the one family
    built around frequency scaling had no cutoff control in the UI (engine was always
    parametric; the UI hid it). os stays fc-free (Keele-width sized), rosse is R-driven.
    (b) CABINET BULLNOSE: the mouth roundover now BLENDS into the cabinet face -- per-j
    cubic Hermite bridge rings from the lip (leaving along its own roll direction) to the
    face outer edge (arriving radially in the face plane); wrap 0 degenerates to a
    near-flat frame, wrap > 0 reads as the carved-in front-face roundover of real builds.
    (c) cornerR now allows 0 (slider min 6 -> 0); biradial and cd DEFAULT to 0 (sharp,
    authentic Arai cells / Keele production edges). Engine floors rho at 0.5 mm
    internally (existing clamp), roll fallback handles degenerate corner tangents.
    LESSON (patch discipline, rule 5 kin): a replace anchored on "var idx = [];
    function quad(...)" matched BOTH mesh builders and the assert refused -- anchors for
    structural patches must include unique surrounding context. Smoke: 69 checks.
30. (fix, 2026-07-13, Marwan's second photo review) CABINET v3: v2's body was still a
    constant-width prism -- the real builds (Wooddiy rear photo, the SolidWorks quadrant,
    the driver-mounted rear 3/4) show the exterior FOLLOWING THE FAN IN PLAN: side boards
    parallel to the interior side walls (offset tS = 2rt, the book's 50 mm), top/bottom
    slabs riding the vertical curve and THINNING TOWARD THE MOUTH (tTB: rt*(2.85 -> 1.22),
    which lands both book exterior heights: back 185 vs 190, mouth 224 vs 230), all
    converging to the square 3.3rt mounting plate. Bullnose front bridge unchanged.
    Smoke guards updated to v3 shape invariants (69 checks). Probe lesson: extent probes
    must sample AT ring z positions -- two false alarms this session came from windows
    that straddled only inner rings.
31. (polish, 2026-07-13) Bullnose cleanup after Marwan's close-up: NBR 6->10 bridge rings,
    Hermite tangent magnitude 0.5->0.62*|AB| (near-circular for up-to-90deg turns), and --
    the structural one -- the cabinet face/box edge corner radius raised to the LIP scale
    (min(20, 0.4*tS)); the old ~7 mm face corners against the ~flareR-radius rolled lip
    corners were the visible crease. Bridge turn-per-segment now 2.2 deg (walls) / 5.8 deg
    (corners). Smoke: bullnose vertex-count guard tracks NBR (69 checks).
32. (major fix, 2026-07-13, V2 STEP diff) ARC-TERMINATED MOUTH + SIDEWALL v2. Marwan
    re-supplied the A-290 V2 STEP; exact-vertex extraction (44 VERTEX_POINTs; spline
    control cages overshoot -- filter via the entity graph) showed: widest point (+-321)
    at z=221 NOT at the mouth; mouth apex (0, +-95) at z=380; mouth circle fit center
    -23.5 / R 403.5 = OUR per-cell kr arc (399.4) within 1%. Two model errors fixed:
    (a) MESH: planar rings sliced the horn flat at z=L. New buildAraiFanRings lofts in
        fan coordinates (sections on cylinders r=const from the array origin; developed
        arc-rect perimeter, corner-anchored; wedge CLIPPED per-ring by the physical side
        wall via bisection); the last ring IS the arc mouth. Ring-override param added to
        buildSolidMesh + buildCabinetMesh; buildStyledMesh routes biradial through the
        loft. Optional lip roll in developed fan coords (perimeter-normal rule).
    (b) SIDEWALL: the chord anchor put full width at the apex plane; V2 shows the wall
        meets the mouth arc at the WIDEST point (junction ~1.109*covH/2), then flat
        side-plate wings run to the apex. New wall: circle from the adapter end (start
        tangent 0.56*covH/2, "flat before curving out"; end tangent emerges ~82 deg = the
        wing curl) to the junction, constant width after. Anchors: W 635 (V2 642, shipped
        656), widest 318@233 (V2 321@221), apex 390 (V2 380), H_int 169.9.
    TWO BUGS CAUGHT IN THE ACT: a stale Math.min(thM, ...) clamp silently undid the
    widened clip bound (probe-first discipline caught it); the first clip bound itself.
    Smoke: 72 checks. NOTE: planar profiles (drawing/CSV/impedance) represent the wing
    region as constant width -- the fan mesh is the true geometry; flag if pressed.
33. (fix, 2026-07-13, Marwan's build photo) CABINET FLAT SLABS: exterior top/bottom are
    now FLAT planes at full (mouth) height + 1.22rt plate -- the vertical curve lives
    INSIDE the stack (his laminated build photo: flat top plank, stepped laminations
    below). Fan plan taper, square back block, arc front + bullnose unchanged. Ext height
    ~229 constant (book mouth 230). Guard updated to flatness invariant. 72 checks.
34. (fixes x3, 2026-07-13, Marwan's four-screenshot review) FAN LOFT v2:
    (a) ROUND THROAT: adapter rings now morph circle -> square (rho rt -> sharp); v1
        sampled a near-sharp square from z=0 (square driver hole + proud collar).
        Throat ring deviation now 0.010 mm.
    (b) SAMPLER REWRITE: corner-anchored planar sampling put ~3/4 of vertices in the
        corners -- correct for straight planar sides, FACETED SPIKES in fan coordinates
        where the top/bottom edges are 3-D arcs. New arcRect: vertices distributed by
        developed edge length, corners shared exactly (each edge = half-arc | straight |
        half-arc; adjacent edges meet at the 45-deg point). ONE allocation from the mouth
        ring for all rings (no twist). Interior-edge turn now 3.8 deg/segment; 80/96
        vertices on the long arcs. First attempt had broken corner blends (5.5 mm gaps,
        caught by the roundness probe before shipping).
    (c) DIAGRAM: biradial planar profiles are now wing-flat (no end-flare hook -- the
        wing tip is a flat plate end; the roll lives in the fan loft); the H plane draws
        the true mouth arc DASHED with a note. Implemented as SVG STRING composition
        (post-hoc DOM injection was invisible to the harness -- the stub crash that
        caught it also proved the point). CSV/cloud exports inherit the wing-flat planar
        profiles, consistent with the footer note. Smoke: 76 checks.
35. (change, 2026-07-13, Marwan) SHELL: NONE + T-CHART ANNOTATION. (a) shellSel gained
    "none (interior surface)" -- buildInteriorMesh emits ring strips only (open mesh,
    fine for the double-sided viewer and CAD reference; footer notes non-watertight).
    It is now the biradial FAMILY DEFAULT (explicit ask; the round-trip guard updated:
    fins persist, shell loads the family default). Uniform/cabinet remain selectable.
    (b) T(s) chart: constant-T traces annotate "T = 0.70 CONSTANT (set PETF for
    progressive T)" -- the chart was rendering correctly (harness dump: axes + flat
    line + labels, --base defined) but a featureless flat line reads as broken; now it
    says what it is. Smoke: 78 checks.
36. (fixes x3, 2026-07-13, late-night pass) (a) THROAT FOLD: early fan rings bent
    BACKWARD at their edges (ring r=Rarr reached z~13.6 at the corners, behind the z=25
    adapter plane) -- self-intersecting lump at the throat. Fix: width + z ease off the
    flat slot plane over ~0.9*Rarr (smoothstep); mid-horn untouched. Guards: monotonic
    ring advance (worst regression 0.00 mm), width continuity at the junction (24.6 ->
    24.6), throat circle 0.010 mm. (b) SHELL UI REMOVED per request: biradial always
    renders the interior surface; buildSolidMesh/buildCabinetMesh + their engine smoke
    checks preserved (never destroy validated work); shellSel markup/handler/
    applicability deleted; DOM smoke rewritten. (c) T CHART: constant-T families now
    plot the REAL expansion -- S(z)/S0 on a log axis from the actual walls, titled
    "area expansion ... T = 0.70 constant" (a flat T line reads as a broken panel; the
    area curve is the thing a horn designer actually wants to see). 79 checks.
37. (fix, 2026-07-13 morning) FINS POKED THROUGH the bare interior surface: (a) blades
    were built in RAW fan coordinates while the loft blends z off the flat slot plane
    near the throat -- blade tips sat behind the blended surface; (b) blade height was
    set EXACTLY to the interior height (coincident faces, hidden while a shell existed,
    visible the moment the horn became interior-only). Blades now share the loft's blend
    mapping and take their height from the cell rule at their own fan radius, inset
    0.6 mm. Containment guard: min clearance to the ceiling across every blade vertex
    (0.60 mm on the anchor, both layouts). 81 checks.
38. (reskin, 2026-07-13) SILENCE PLEASE monochrome: full white + gray token system
    (--paper #FFFFFF, --ink #1C1C1C, --base #7A7A7A mid-gray V-plane, --petf #3D3D3D
    dark gray -- dash/weight carry the meaning hue used to, --line #E8E8E8 hairlines,
    --faint #A6A6A6). Frame/header/footer rules dropped from 1.5px ink to 1px hairline
    (white-cube quiet). 3-D room white, horn 0x8A8A8A (PETF state 0x2E2E2E). Errbox
    monochrome near-black. Header carries the SILENCE PLEASE -- ACOUSTIC INSTRUMENTS
    wordmark above the title. Verified zero legacy palette values in the shipped file.
    Charts/drawing inherit via vars. 81 checks unchanged, ALL PASS.
39. (accent, 2026-07-13) ONE COLOR: signal red #C8331D (Rams instrument language --
    the single red indicator on a gray instrument), reserved exclusively for PETF: the
    progressive-T chart curve, the PETF reference dashes, the PETF stat states. The 3-D
    horn no longer changes color with PETF (the object stays quiet; the data signals).
    Errbox stays monochrome near-black. Everything else remains white/gray.
39. (accent, 2026-07-13) ONE COLOR: signal red #C8331D (Rams instrument language -- the
    single red indicator on a gray instrument), reserved exclusively for PETF: the
    progressive-T curve, PETF reference dashes, PETF stats. The 3-D horn no longer
    changes color with PETF (the object stays quiet; the data signals). Errbox stays
    monochrome. REGRESSION CAUGHT: the material edit dropped a // comment mid-line in a
    one-line object literal, commenting out metalness/roughness/side -> SyntaxError,
    suite crashed. Block comments only inside one-liners. 81 checks.
40. (audit tranche 1, 2026-07-13) Marwan supplied a 16-section external audit. VERIFIED
    against code first (several claims confirmed, some already-known tradeoffs, one
    conflicts with the standing drba-naming constraint). SHIPPED THIS TRANCHE:
    - #12 tractrix FAMILY_DEFAULT trunc 175 -> 88 (exceeded its own UI cap);
      HVDiff cache key -> JSON.stringify(S) canonical (handwritten key omitted entryDeg,
      petfShape/Ref, cornerR, and more -- real staleness bug).
    - #6/#15 A-290 honesty: biradial defaults now load the FULL reference incl. the 2in
      throat (49.2; the old preserve-driver policy made "A-290" a lie with a 1.4in
      throat); designation logic distinguishes "A-290 reference (book config)" /
      "Scaled A-290-derived -- A-<fc>" / "Custom Yuichi-inspired". Family renamed
      "Yuichi-inspired biradial".
    - #7 sidewall honesty: arc metadata computed FROM the geometry (startDeg,
      junctionDeg ~82, junctionZ, wingHalfWidth); stats call the wing join an
      intentional piecewise junction, NOT tangent-continuous; retired-covH/2 smoke
      checks replaced with honest-metadata guards.
    - #9 fins: per-fin ACTUAL spans (blades[] with startZ/endZ through the blend
      mapping; stats show real z-range + "4 -> 5 cells" / "6 -> 7 channels"); fin
      thickness is a parameter (finT slider, biradial-only, default 10).
    - #10 partial: biradial point-cloud + quarter-BEM exports now use the SAME fan
      rings as STL/preview (exportCloudRings); STL button relabels "INTERIOR SURFACE
      STL (open)" on the biradial.
    - #14 partial: OS blurb corrected -- the family computes OS-SE (Batik 2020);
      classic-OS selector on the roadmap.
    Smoke: 87 checks ALL PASS. ROADMAP (unshipped audit items, priority order):
    (1) #1/#2 length-field semantics + Webster coordinate rework + "1-D Webster loading
    estimate" retitle; (2) #10 full mesh validator + watertight/open export split;
    (3) #3 JMLC overshoot diagnostics; (4) #4 PETF mouth-ref iterative solver;
    (5) #12 full input validation; (6) #5 exact-station generator + junction
    discontinuity report; (7) #8 area-accounting modes (Reference vs Area-Law priority);
    (8) #13 Neile H/V family (CONSTRAINT: no drba name in the tool -- cite Neile 1657;
    the audit's requested label violates the standing IP rule); (9) #11 SP CSV;
    (10) #14 classic-OS selector; (11) #16 in-app diagnostics panel.
41. (audit tranche 2, 2026-07-13) SHIPPED:
    - #1 LENGTH SEMANTICS: computeFamily uniformly emits axialDepth / finalAxialZ /
      horizontalWallArcLength / verticalWallArcLength / wavefrontDistance (JMLC only) /
      websterCoordinateLength (set by the loading path); sEnd = compatibility alias.
      "Path s" stat replaced by Depth (max z) + Mouth z (rollback, R-OSSE) + Wavefront s
      (JMLC) + Wall arc H/V. Verified: jmlc depth 284 / wall arc 422 / wavefront 425 are
      three DIFFERENT numbers now correctly distinguished; R-OSSE finalZ 57 < depth 78.
    - #2 WEBSTER COORDINATE: throatImpedance(prof, fArr, coordMode, sMap); the (d1+d2)/2
      averaged wall slant is GONE. jmlc -> true wavefront coordinate via the index-
      aligned wall-z -> Ttrace-s map; biradial -> the per-cell law along the center-cell
      radius (equivalent-area chain built from horn.fan, exactly the law the horn
      realizes); HVDiff -> DISABLED with an explanatory panel (no justified 1-D
      coordinate for the per-azimuth loft); everything else axial z. Chart + blurb
      retitled "1-D WEBSTER LOADING ESTIMATE" with explicit non-prediction list.
    - #3 JMLC OVERSHOOT: abs (1e-4*S0) + rel (5e-4) tolerances; beyond them the build
      STOPS with terminated="area-overshoot" + structured JMLC_AREA_OVERSHOOT
      diagnostic. Audit's config (fc400/35.56/T1.2/entry20/trunc90) reports 1.78% rel
      error at station 1. Truncation angle: averaged local DIRECTION vector (first line-
      fit attempt regressed r(z) and broke rollback -- caught by the HVDiff regression).
    - #4 PETF MOUTH SOLVER: bounded fixed-point (max 12 iters, 0.6 under-relaxation,
      dual tolerance, two-cycle detection, termination-state history). Returns
      petfConverged/Iterations/Residual/CycleDetected/TerminationHistory. Real find: the
      termination state CHANGES across iterations (truncation -> flare-limit) --
      exactly what the single pass shipped silently.
    - #10 MESH: duplicate adapter->fan ring removed (0.2 mm sliver band); validateMesh
      (finite/degenerate/boundary/non-manifold + repair) exported and wired into guards.
    - #12 INPUTS: set() clamps to declared limits with synced display; number inputs
      carry min/max attrs; validateInputs() floors conical entry at 2 deg VISIBLY, caps
      tractrix at 89 VISIBLY, and REJECTS impossible conical mouths with an errbox
      message before geometry.
    - UI: exportGate() -- overshoot / non-converged PETF exports require an explicit
      confirm override; visible defect warnings in the errbox.
    Smoke: 95 checks ALL PASS. REMAINING: #5 exact stations, #8 area modes, #13 Neile
    family (no-drba-name constraint), #11 SP CSV, #14 classic-OS selector, #10 full
    watertight/open export split UI, #16 in-app diagnostics panel.
42. (crash fix + tooling, 2026-07-13, session 3 opener) REAL-BROWSER CRASH from Marwan:
    "Cannot read properties of undefined (reading 'r')". Root cause: MY tranche-2
    overshoot termination stops jmlcWall at station 1 -> 1-point wall -> flareArc reads
    wall[len-2] undefined the moment the state RENDERS. Engine-level guards passed
    because they never rendered the state; a new DOM FUZZ HARNESS (fuzz_harness.js:
    families x presets x fins x slider extremes through the stubbed DOM) reproduced it
    in seconds. Fixes: (a) update() renders a warning + placeholder (never geometry)
    when wall < 3 points; (b) flareArc hardened for <2 points; (c) errbox lifecycle --
    warnings now CLEAR on the next clean rebuild (they previously stuck forever).
    Regression: the exact crash state runs through the DOM in smoke. RULE: after risky
    changes, run fuzz_harness.js -- engine checks alone do not cover render paths.
43. (fix rev. 3, 2026-07-13) OVERSHOOT MODEL CORRECTED after Marwan's second report
    (0.31% brick): an entry-angle seed legitimately provides MORE area than the young
    hyperbolic law -- holding the wavefront (dS = 0) until the law overtakes IS the
    entry geometry, not a hidden error. jmlcWall now: (a) pre-catch-up clamps are the
    ENTRY-DOMINATED REGION, reported as entryDominatedLen (stats show it "by design";
    audit config = 204.7 mm, default = 0); (b) POST-catch-up negative dS uses severity
    tiers (silent <= 5e-4 rel, WARN <= 1e-2 clamp+diagnostic, FAIL > 1e-2 stop+gate).
    Every previously-bricked config builds (audit config: truncation, 372 stations).
    The audit's "material overshoot" test config was itself a misdiagnosis -- the
    original clamp implemented the entry cone; "reported, not hidden" is satisfied by
    the explicit region length. META-LESSON: rev. 2's hard stop treated a geometric
    regime as an error class; user reports beat audit assumptions. 95 checks + fuzz.
44. (fix + discipline, 2026-07-13) MOUTH ROUNDOVER broken by two audit-tranche edits,
    caught by Marwan (his standing point: fixes must not break the working version):
    (a) the fan-loft lip required wrap > 0 while every other family rolls a quarter
        turn from flareR alone (wrap 0 is the DEFAULT -- the slider did nothing);
        restored: FS on flareR alone, sweep = 90 + wrap (capped 225), matching the
        planar convention;
    (b) profOf suppressed the biradial planar flare ENTIRELY -- drawing/CSV showed no
        roundover even when the loft rolled. Restored as V-plane-only flare (physically
        right: the top/bottom plates get rolled; H stays wing-flat).
    DISCIPLINE UPGRADE: smoke now carries FEATURE-PRESENCE checks (the roundover must
    RESPOND: lip rings appear from flareR alone, wrap extends the roll, planar V shows
    rollback, jmlc wrap-back alive) -- crash-only coverage let this slip. 100 checks +
    fuzz clean.
45. (fix rev. 2 semantics, 2026-07-13) ROUNDOVER ON SELF-ROLLED WALLS. Marwan's second
    report exposed the structural truth: flareSweepFor budgeted sweep as (90 + wrap -
    exitAngle), so on any wall that terminates already rolled past 90 (jmlc/swh at
    truncation >= 90 -- i.e. their NORMAL operating range) the roundover was inert until
    wrap exceeded exit-90 (85 deg at trunc 175!). The sliders were dead by construction,
    not by my recent edits alone (FAMILY_DEFAULTS trunc 175 made the default state land
    in the dead zone). REV-2 SEMANTICS: end <= 90 -> classic roll-to-target (UNCHANGED
    for cd/conical/hypex/flush cases); end > 90 -> wrap = ADDITIONAL sweep past the
    natural end (any wrap > 0 activates; flareR sets the lip radius). At wrap 0 on a
    rolled wall the stats explain the inert state ("Roundover INACTIVE at wrap 0")
    instead of leaving dead sliders. DOM probes: wrap responds at all values, flareR
    responds whenever sweep exists, biradial unchanged. Feature-presence guards added
    (probe files /tmp -> methodology: differential DOM hashes; first probe had a
    same-value false negative -- differential values only). 102 checks + fuzz clean.
46. (curvature-honesty round, 2026-07-13, Marwan's three-point review) ROUNDOVERS NOW
    FOLLOW THE NATIVE CURVATURE:
    (1) JMLC: the roundover IS the Le Cleac'h construction -- WRAP folds into the
        effective truncation (min(268, trunc + wrap)) so the native roll simply
        continues; NO bolted-on arc (profOf passes zero flare); flareR hidden as N/A
        via a new notFams applicability key; blurb updated. rev-2 flareArc semantics
        remain for swh/tractrix/hypex/conical/cd (walls that do not self-define the
        roll).
    (2) YUICHI LIP: tangent-continuous roll -- rotates from the TRUE 3-D meridian
        tangent (last two rings, per perimeter point) toward the outward section
        normal: P(q) = Pm + R(sin(phi) T + (1-cos(phi)) N). Lip-start tangent deviation
        7.5 deg max (was ~45 deg on the climbing top/bottom = the visible crease).
    (3) ADAPTER v2 law-exact: Yuichi's 25.81 cm2 adapter exit = EXACTLY 4/pi x the
        throat circle (his adapter is circle(rt) -> square(2rt) under the hypex law).
        Per-station: eased half-size a(t), corner rho SOLVED so S = 4a^2-(4-pi)rho^2
        matches the law exactly (mid-station 20.77 vs law 20.90 cm2); throat circle
        deviation 0.010 mm; fan.law exposed on the horn.
    Anchor scripts fought back twice (hornParams returns a literal, not P) -- edits are
    atomic-by-abort, verified by per-anchor counts before applying. 103 checks + fuzz.
47. (fix, 2026-07-13) LIP SIDES: raw per-point frames jittered near the wing/arc corners
    (ring-to-ring correspondence shifts laterally there) -- the lip curled in
    conflicting directions = Marwan's "messed up around the sides". Frames are now
    computed in one pass and SMOOTHED along the perimeter (+-2 circular moving average,
    renormalized, N re-orthogonalized against smoothed T). Metrics: adjacent lip-
    direction change 7.5 deg max around the FULL perimeter incl. corners (was
    incoherent); lip-start tangency preserved at 6.9 deg. Coherence guard added.
    104 checks + fuzz clean.
48. (audit tranche 3, 2026-07-13) SHIPPED:
    - #5 EXACT STATIONS: dec() + planeProfilesWN insert exact critical positions
      (three parallel arrays spliced TOGETHER -- H/V/rho alignment); cdWall emits
      criticalZ [12.7] (the Keele round-to-rect endpoint now lands exactly, was ~12.6);
      biradial emits [zTr, Zj]. junctionReport() measures position/H-slope/V-slope
      discontinuities at every declared junction; stats show "Junctions (measured)"
      with honest piecewise language (adapter join +-17.7 deg, wing curl dH -72.5 /
      dV 0.3 -- quantified, never claimed tangent).
    - #10 EXPORTS: "WATERTIGHT SHELL STL" button (biradial) -- ships only after
      validateMesh passes watertight, else explicit confirm with boundary/non-manifold
      counts; regular STL/OBJ paths validate-and-repair (degenerates dropped) before
      writing.
    - #11 SP CSV: stereographic-active CSV now exports BOTH profile_base.csv and
      profile_projected.csv (STL/cloud/preview already used the transformed geometry --
      the CSV was describing a different horn). spTransform zRef param REMOVED (passed
      but never used; the implemented, visually-validated form is the per-station
      normalized map -- documentation corrected).
    - #14 CLASSIC OS: family "osc" routes to osWall (Geddes 1989) -- reachable-but-
      unrouted dead code now a visible family with defaults/blurb; OS-SE labeled as
      Batik 2020. ||-defaults audited: rosK/rosRr/rosM/rosQ now honor explicit zero.
    Probe humility: a "cd is broken" scare was my own incomplete probe params (no T0)
    -- verified against the staged pre-batch engine before touching anything.
    111 checks + fuzz clean. NEXT: #8 area-accounting modes, #16 diagnostics panel.
    STOPPED before #13 (Neile/WN family) per Marwan -- he has the correct reference
    data; do NOT build it from inference.
49. (adapter correction, 2026-07-13, Crowe No.2322 drawing) Marwan flagged the Yuichi
    adapter; the published dimensional drawing (2322-01.pdf) settles it with numbers:
    adapters are 65 mm long, exit 50.00 x 50.00 square, driver bores 35.56 (1.40in) /
    50.80 (2.00in). CORRECTIONS: (a) A-290 reference throat 49.2 -> 50.8 (TRUE 2in;
    pi*rt^2 = 20.27 cm2 = the book throat area EXACTLY -- the 49.2 was the JBL-exit
    convention and made S0 6% low); (b) throat-array coefficient recalibrated 1.16 ->
    1.126 so Rarr = 34.5 book-exact at the true throat; (c) adapter length is now a
    parameter adaptL (book 25 default; 65 = the smooth-transition length; slider 15-80).
    Anchors after: Rarr 34.5 exact, H_int 170.8, W 629.7 (V2 642), L 386.4, S0 exact.
    NOTED for later: separating driver bore from horn slot (the 1.40in-driver-on-A290
    case needs a driverD param mapping bore -> slot inside the adapter; per-plane
    Hermite S-curves per the "custom flare geometries per axis" description). One
    engine-edit abort (zTr anchor drift) caught by per-anchor counts. 113 checks + fuzz.
50. (fix + honesty, 2026-07-13) (a) THE BUMP: adapter v2 forced the hypex law inside
    the adapter; the law grows ~21% over 25mm but circle->square needs 4/pi (27%), so
    the solved half-size dipped to ~24.8 vs the fan's 25.4 -- a 0.6mm step. v3 =
    CONSTANT half-size rt, rho smoothstepped rt->sharp; the book's 20.27 -> 25.81 cm2
    emerges from the corner morph alone (measured 20.23/25.79). Zero half-extent dip;
    guard added. META: v2's own "law verification" compared against the same wrong
    assumption -- endpoint anchors beat internal self-consistency. (b) OS SECTIONS:
    Geddes' derivation is axisymmetric; round = published solution, ellipse = accepted
    per-axis approximation, square/rrect = geometric extrusion with no OS wavefront
    support at the corners. Blurb + stats note say so whenever os/osc runs rrect.
    115 checks + fuzz clean.
51. (the bump, closed; Geddes params, 2026-07-13) THE BUMP was three stacked causes,
    found by replacing the meridian-curvature metric (conflates curvature with creases;
    drove two wrong sampling rewrites) with the SHADING DIHEDRAL metric:
    (a) rho max()-clamp kink at the adapter tail; (b) the width blend chasing widths
    from OTHER parameterizations (fan-circle-behind-slot artifact 49.9 vs 42.7 deg;
    then the planar wall whose H expansion is distributed from z=0); (c) grid schemes
    whose vertices crossed the corner (fraction grid) -- corner-pinned per-edge
    allocation is the correct feature-aligned form and is RESTORED everywhere.
    FINAL FORM: adapter v4 = smooth-transition S-curve (H half-size cubic Hermite
    rt->rt with end slope = the wall start tangent; dips 1.84 mm mid-adapter exactly
    like the published cross-section; V flat; rho eases to the unified fan corner
    radius); fan width = its OWN Hermite (slot slope-matched -> pure fan, C1 both
    ends); NAD 20. MAX SHADING DIHEDRAL 11.1 deg over the ENTIRE horn (was 44-58).
    GEDDES: covV on osc drives an independent V-plane OS law (elliptical Geddes, the
    accepted per-axis form; round when covV=covH); square section on os/osc is now
    FORBIDDEN -- validateInputs auto-switches to ellipse with an explanatory note
    (guard relocated after msgs declaration; first attempt crashed the suite).
    118 checks + fuzz clean.
52. (UI principle, 2026-07-13, Marwan) RULE 6: controls that are not correct for the
    current configuration are REMOVED from the UI (options hidden from selects, rows/
    buttons hidden), never left visible-but-inert, dimmed, or auto-corrected with
    notes -- inert controls look like bugs. Applied: sectSel options are per-family
    (SECTION_ALLOWED: os/osc ellipse-only; cd rect+ellipse; biradial select hidden --
    section intrinsic); state migrates silently when the family changes; the
    validateInputs auto-switch note was retired as superseded. Buttons: the gray
    .btn.sub style is retired (read as disabled) -- all enabled buttons are ink;
    N/A actions hide (the shell button already did). finsSel/spSel already complied.
    Guards: option-removal migration, biradial section hidden, zero 'btn sub' markup.
    118 checks + fuzz clean.
53. (G2 roundover, 2026-07-13, Marwan's printed elliptical-OS photo) flareArc rewritten
    curvature-continuous: the old tangent-matched circular arc JUMPED in curvature at
    the roll start (wall kappa -> 1/R instantly -- the mechanical "start line" the eye
    catches). Now: measured wall-end curvature ramps linearly to 1/R over a 0.6R entry
    span (clothoid-like), then constant-R; total heading change still equals the
    requested sweep (wrap semantics unchanged; short wraps shrink the ramp). Shared by
    every arc-rolled family (cd/conical/hypex/tractrix/swh/os/osc). Measured: max
    curvature jump 0.0095 vs the old 0.0333 step (R=30). osc defaults now the printed
    curl: flareR 30, flareWrap 90 (180-deg roll). Guard: jump < 0.45/R. jmlc unaffected
    (native construction, no arc). 119 checks + fuzz clean.
54. (WN FAMILY SHIPPED, 2026-07-13, from Marwan's reference handoff zip) "William
    Neile-inspired biradial" (family key wn) -- clean-room calibrated reconstruction
    per the supplied engineering handoff; NO drba naming anywhere (standing IP rule;
    named for William Neile 1657; sources cited: sphericalhorns.net WN + ALO articles
    2021-2022). IMPLEMENTATION: embedded wavelength-normalized 201-station templates
    (1in + 1.4in ALO anchors); mu-weighted pchip template interpolation (Fritsch-
    Carlson -- LINEAR resampling shifted path length 0.12%; the Python generator is
    ground truth and uses PchipInterpolator); C1 exact-throat correction (u_t 0.10);
    L recomputed from blended coordinates; equal-path family solved per q by bisection
    (Chebyshev-clustered q grid); rounded-rect sections with persistent round-throat
    corner quadrants (rc = min(rt,a,b)); Reference / Area-corrected ALO modes (hypex
    b-solve, uL/uC smoothstep blend -- rc recomputed post-blend EXACTLY as the Python
    does, so the corner-clamp area deviation matches ground truth); watertight curved
    fin solids on equal-path trajectories (NF -> NF+1 channels, thickness + edge
    clearance); corner-pinned per-edge ring sampler (mouth proportions); smoothed-
    frame tangent lip for the roundover; open interior surface (labeled, not solid);
    cloud/quarter exports share the STL rings. VALIDATION vs handoff vectors: mouths
    EXACT (339.07x142.99 / 601.64x268.99 / 762.77x331.86); path lengths within 0.04%
    (pchip endpoint-slope variant); equal-path err 1.4e-13 (vector 1.8e-11); fins 4/4
    watertight; extrapolation flag verified; MESH SMOOTHER THAN THE REFERENCE STL
    (max dihedral 21.8 vs reference 29.7, p99.9 25.3 -- measured with the same
    metric). UI: mode + template selects (wn-only), uL/uC sliders (area mode only,
    rule 6), fins/thickness/clearance, designation stat labels the three reference
    configs ("2-inch 250 Hz INTERPOLATED DERIVATIVE" explicitly). DEBUG NOTE: a legacy
    biradial-only sectSel display line ran AFTER applicability and overwrote rule-6
    hiding -- sectionOptionsFor is now the single visibility authority. Fuzz now
    sweeps 11 families (osc + wn added), fuzz_harness.js updated in-repo.
    131 checks + fuzz clean. BEM-DEPENDENT ASSUMPTIONS (per handoff): finned variants
    acoustically unvalidated; area-corrected zone positions (uL/uC) inferred; mouth
    terminations beyond the base reference are not claimed historical.
55. (WN refinements, 2026-07-13) (a) FIN SPAN parametric: wnFinMesh(u0, u1) -- blades
    span u 0.03..wnFinU1 (slider, default 0.70), NOT throat-to-mouth-lip; span check
    guards a >=12% shorter blade vs full-span. Fin params (thickness/clearance/end)
    hidden unless wnFins > 0 (rule 6). (b) PROVENANCE SCRUB of the SHIPPED files per
    Marwan: no design-source identifiers remain in horn_studio.html or engine.js --
    "ALO" removed from UI labels/designations/template keys (WN_T1/WN_T14), source
    URLs and "clean-room" phrasing removed from blurb + embedded comments; the app
    presents the family as the equal-path construction named for William Neile 1657.
    Smoke enforces this permanently: a guard greps the built HTML for the scrubbed
    tokens. INTERNAL docs (PROJECT_STATE, blog_index) retain the accurate engineering
    record incl. sources and validation lineage -- they are not shipped.
    133 checks + 11-family fuzz clean.
56. (WN v2: FULLY PARAMETRIC, 2026-07-13, Marwan: "no templates -- dynamic throat and
    loading") The template-interpolation architecture is REPLACED by a generative
    model; the 2010 stored template numbers are gone from engine.js (14KB), replaced
    by FOURTEEN dimensionless mu-linear coefficients fitted once from the references:
    - HORIZONTAL: a(z) = rt + tan(th0)*z + K*z^1.5 (cone + TRUE Neile semicubical
      term; base fits the references at 0.35mm RMS -- the inner H law IS Neile) through
      the control zone, then C1 cubic-Hermite terminal flare to exact dimensionless
      mouth-width law am/lambda(mu). Two-pass s-split (flare start at s/L = uC).
    - VERTICAL: hypex construction-wavefront area law computed from the REQUESTED fc
      and T (v1 reference mode scaled a picture; loading is now physics), smoothstep
      uL..uC into a Hermite terminal flare to the mouth-height law bm/lambda(mu).
    - Stations uniform in s (u = s/L per spec); equal-path solver unchanged but now
      targets the outer polyline AT FAMILY RESOLUTION (fine-grid L made |q|=1 report
      a fake 3e-3 chord-shortening error); brackets widened [-1.5, 2.5].
    VERIFICATION (templates now live ONLY in smoke_test.js as 24-sample extracts):
    mouths EXACT both anchors; path lengths -0.09%/-0.08%; H-profile RMS 0.95%/0.75%;
    equal-path 1e-13; NEW dynamic guards: T changes the vertical, fc at fixed mu
    changes the vertical (impossible in v1 reference mode). UI: mode + template
    selects REMOVED (no modes -- one parametric model); uL/uC always live (real
    parameters); mu-interval stat notes verified range [0.031, 0.0443] and flags
    coefficient extrapolation beyond it. mu-bound precision bug (truncated constant
    flagged the exact 1in anchor as extrapolated) caught by the guard battery.
    136 checks + 11-family fuzz clean.
57. (WN UI fixes, 2026-07-13, Marwan's screenshot) (a) fc and T0 were INVISIBLE for
    wn -- neither param's fams list included the family (fc explicit list;
    T0 via LAW_FAMILIES). The two loading inputs of a loading-law model were
    unreachable. Both added; guard asserts the wraps are visible. (b) The 2D drawing
    read as broken: the H plane ends at the OUTER axial depth (~170 for 1in) while
    the V plane runs to the CENTER's axial reach (246) -- the WN mouth is CURVED
    (center bulges ~76mm forward; the equal-path construction's signature). The
    drawing now draws the dashed mouth trace z(x) from the last family station, adds
    an "outer depth" dimension, and relabels the long dim "path L (center reach)".
    139 checks + fuzz clean.
58. (math-directive audit, 2026-07-13, Marwan's PDF) Verdict per claim, measured:
    CONFIRMED + FIXED: (14.1) vertical crossed zero -- the uL..uC blend evaluated the
    terminal Hermite BACKWARD outside its domain; cubic extrapolation dived to
    b = -20233 mm at 55mm/900Hz/T1.2/wide window. VERTICAL v3 = ONE C2 quintic
    Hermite (uL -> mouth) with position+slope+CURVATURE matched to the hypex law at
    uL, ending (bm, tan phm, 0); phm refit (0.63879, -1.838). No extrapolation
    possible; min b over the full parameter sweep now +10.0 mm; reference V-RMS
    IMPROVED to 0.59/2.27 mm. Permanent positivity-sweep guard.
    (15) mouth width was labeled with a diameter symbol -- isRound() now false for
    wn; stats report W x H, aspect, S_mouth, D_equivalent, axial vs center depth,
    and the measured zone-join residual.
    ALREADY COMPLIANT (measured, directive claims false vs shipped code): throat
    circularity 0.0053 mm (req 0.05); equal-path RMS 3.7e-14 (family solved, 181
    Chebyshev trajectories, surface z interpolated from the FULL family); u = s/L
    common coordinate; one geometry source for preview/STL/cloud.
    DECLINED (conflicts with Marwan's standing no-templates order): reinstating a
    digitized-curve "Reference Reconstruction" mode -- templates remain verification-
    only in the test suite. Noted to Marwan for override if desired.
    DEFERRED (honest gaps): curved-wavefront section area still uses the flat
    rounded-rect formula (the handoff's own ground truth does too); fin blockage
    uses the projection approximation; area-mode h-root-solve against the curved
    section is future work if BEM demands it.
    142 checks + fuzz clean.
59. (zone controls + reporting, 2026-07-13, Marwan: "what do these do") Measured
    sensitivities: uL moves the mid-vertical +-9% (real: where hypex loading ends);
    uC moved the horn 1.6% across its FULL range (its vertical role was absorbed by
    the v3 quintic; only the H flare split remained) -- REMOVED per rule 6, engine
    keeps wnUC=0.68 internally (the calibrated split). uL relabeled "(hypex ->
    quintic)". CURVED-WAVEFRONT AREA: measured flat-formula error 0.7-3.0% in the
    loading zone (fine where the law matters) but 13.4% at the mouth -- the mouth
    S and D_eq stats now use the curved integral (2*yMax*sqrt(1+Z'^2) dx); the
    SOLVE stays flat-formula (matches ground truth; deferred item resolved as
    reporting-only). Directive-17 verification table run on v3 (in transcript):
    mouths exact, path -0.09%/-0.08%, H-RMS 0.95%/0.75%, V-RMS ~0.8%/1.7%,
    equal-path 4e-14, loading-zone area err ~1e-14. 144 checks + fuzz clean.
60. (prototype review + math panel + license, 2026-07-13) Reviewed Marwan's ChatGPT
    prototype (template-locked v1-style architecture -- no generator learnings) and
    ADOPTED three genuinely good ideas: (a) FIN-BLOCKAGE-COMPENSATED LOADING -- the
    hypex law now targets the OPEN area; blocked area (NF*t*2b, 2-pass fixed point)
    added back into the b-solve; with 4 fins the open area matches the law to 0.0%
    (was uncompensated); (b) smootherstep FIN END TAPER over 6% of the blade span
    (watertightness preserved); (c) CONSTRUCTION OVERLAYS in the 3-D viewer -- "SHOW
    CONSTRUCTION" toggle (wn only): equal-path trajectories (every 15th q, ink 55%)
    + wavefront rings (every 12th station, gray 45%) as THREE.Line groups.
    MATHEMATICS PANEL: native MathML (no CDN; MathML Core renders in all modern
    browsers) appended to the method blurb per family -- wn (equal-path integral,
    Neile a(z), hypex S(s)), hypex, swh, jmlc, tractrix, conical, cd, biradial, os,
    osc, rosse. SCOPE LESSON: FAMILY_MATH originally landed in a nested scope
    (ReferenceError in update) -- moved beside update(). LICENSE: CC BY-NC 4.0 --
    header comment appended after the existing file header (file does NOT start with
    a doctype -- first anchor attempt failed atomically) + visible footer line under
    the wordmark ("(c) 2026 - CC BY-NC 4.0 - free for non-commercial use"). Guards:
    MathML presence, license presence, fin-compensation behavior.
    145 checks + 11-family fuzz clean.
61. (GitHub licensing, 2026-07-13) Marwan asked for a GitHub-picker license; verified
    fact: NO picker license restricts commercial use (all OSI-open-source; choose-
    alicense excludes NC licenses; GitHub's licensee returns NOASSERTION for
    CC-BY-NC -- sidebar shows "View license", cosmetic only). DECISION: keep
    CC BY-NC 4.0 (matches his stated intent). Prepared the repo kit in outputs:
    LICENSE (full canonical CC BY-NC 4.0 text, 407 lines, fetched from
    santisoler/cc-licenses) + README_license_snippet.md (shield badge + license
    section). Alternative offered if the named sidebar badge matters more than the
    NC restriction: AGPL-3.0 (strongest picker-native commercial deterrent, dual-
    licensing compatible) -- awaiting his call; no file changes needed either way
    beyond swapping LICENSE. In-file header + footer unchanged (already CC BY-NC).
62. (viewer polish, 2026-07-13, Marwan's screenshot) 3-D viewer: full width (max-
    width 560 removed), BORDERLESS (white canvas on white page), height 300->380,
    and a window-resize handler added (sizing was one-shot at init -- a full-width
    canvas would have stuck at its initial width on window changes; camera aspect
    updates too). Header "FAMILIES 9" was STALE (we ship 11) -- now computed live
    from the family select's option count (tbFamCount). Guards for both.
    150 checks + fuzz clean.
63. (REPORTS section, 2026-07-13, Marwan: "imp, vert/hor disp, directivity graph")
    Throat impedance ALREADY existed (Webster staircase, audited coordinate). New:
    the lower chart row is now a labeled section "REPORTS -- 1-D / GEOMETRIC
    ESTIMATES (NOT A BEM SUBSTITUTE)" holding zchart + tchart + TWO NEW CHARTS:
    (a) -6dB BEAMWIDTH vs frequency, H solid / V dashed, from the Keele mouth-size
    relation theta*d*f = 25.4e6 run in reverse (the same relation the CD family
    uses to SIZE mouths), clamped to the coverage plateau where one exists;
    (b) DIRECTIVITY INDEX from Q = 180^2/(thetaH*thetaV) (rectangular-coverage
    approximation, labeled). Plateaus: covH/covV for cd/os/osc/rosse/biradial;
    wn derives wall-tangent plateaus at u=0.62 per plane; loading families none
    (mass-controlled narrowing shown). engine.directivityEstimate() exported +
    unit-checked (90x40 -> DI 9.54). Estimator verdict honesty: estimates only;
    BEM comparisons remain the forum ask. 154 checks + fuzz clean.
63. (TIER-1 RESPONSE ESTIMATE, 2026-07-13) hornResponse(prof, fArr, coordMode, sMap)
    in engine.js: full complex 2x2 transmission-matrix chain over the SAME stations,
    section areas, and propagation coordinate as throatImpedance (one geometry
    source; per-family coordinate branches mirrored -- biradial equivalent-area,
    jmlc wavefront sMap, else axial; HVDiff-disabled case blanks the chart with the
    same justification note). Terminated by the baffled-piston radiation impedance
    (bessj1 + struveH1 already present). Output = RADIATED POWER response for
    constant throat volume velocity, dB rel. the 1-10kHz passband median. DESIGN
    NOTE: first cut charted on-axis p ~ f*|Um| which rises ~6dB/oct above cutoff
    from piston beaming (real physics, wrong story) -- power response is the honest
    loading view and matches theory: hypex fc400 flat +-0.1dB above 2fc, -9dB at fc,
    -35dB at 100Hz; conical -13.2dB at fc (poorer loading, expected). New splChartSVG
    (log-f, dB grid, fc marker) in a fifth report slot; label states 1-D + piston
    mouth, NOT BEM. EDIT LESSON: the zchart container div shares its quoted string
    with the .lower opener -- first anchor attempt aborted atomically. Guards: hypex
    flatness, sub-cutoff collapse, finiteness, chart presence.
    154 checks + fuzz clean.
64. (BEM STUDIO, 2026-07-13) Browser BEM shipped: the UNMODIFIED NumCalc solver
    (Mesh2HRTF, 11k lines C++, Burton-Miller collocation) compiled to wasm32-wasi
    with wasi-sdk 25 (apt emscripten broken vs node22; emsdk CDN blocked). Build
    shims only -- no source edits: direct.h -> POSIX mkdir alias, no-op system()
    (its calls were rm -r be.out housekeeping). Link flags: 32MB stack (default
    stack segfaulted in FMM setup), -lwasi-emulated-process-clocks.
    VALIDATION LADDER: (1) native NumCalc vs analytic Mie series on the Mesh2HRTF
    2412-elem sphere-scattering test: 0.28% median (e^{-iwt}/h1 convention);
    (2) wasm vs native on the same case, TBEM: max diff 0.0 over 7,560 eval
    pressures (bit-identical); (3) pulsating-sphere demo (320-elem icosphere):
    wasm = native = analytic within 0.60%; (4) the SHIPPED worker code path
    re-verified end-to-end under node (17.92811 Pa @2kHz, 0.34s).
    GOTCHAS: NC.inp requires the "Mesh2HRTF 1.0.0" version line; mesh files REQUIRE
    trailing newlines (EOF-without-newline miscounts entries); Main Parameters I =
    [groups, nElemsTotal, nNodesTotal, ...] (elements FIRST -- swapping cost a
    debug cycle); field 8 = methodBEM (0 TBEM used; 4 MLFMM segfaults under node
    WASI -- unresolved, TBEM preferred for horn-scale anyway); NumCalc must start
    with NO pre-existing be.out (stubbed rm + EEXIST path crashes WASI) -- the
    browser gets a FRESH in-memory FS per run so the state cannot occur.
    DELIVERABLE: bem_studio.html (4.2MB single file): embedded NumCalc.wasm (b64) +
    @bjorn3/browser_wasi_shim (esbuild IIFE) + Web Worker runner + pulsating-sphere
    demo sweep with ANALYTIC OVERLAY chart/table + custom Mesh2HRTF-project mode
    (4 file uploads, velocity BC, freq list) + CSV export. TBEM guidance in UI:
    <=3000 elements, element < lambda/6. NumCalc retains its own license (noted in
    header + UI); app shell CC BY-NC. NEXT: Horn Studio mesh -> closed BEM project
    exporter (throat velocity patch + wall closure) to feed this directly.
65. (ONE-BUTTON BEM IN HORN STUDIO, 2026-07-13) "BEM SIMULATE -- NumCalc WASM" button
    in EXPORT: builds a closed BEM body from the CURRENT horn, runs NumCalc.wasm in
    a Web Worker across a frequency ladder (0.5-3x fc, capped at the mesh lambda/6
    limit), charts on-axis response @2m + H polar, CSV export. Panel states model
    assumptions (free-standing, rigid walls, 1 m/s piston throat).
    TOPOLOGY LESSON: buildSolidMesh is a GENUS-1 TUBE (open channel through -- 0
    boundary edges because the channel is a hole, NOT a capped cavity); a piston
    disc cannot be patched on manifoldly (3 faces/edge at the rim). buildBEMProject
    v2 CONSTRUCTS the surface explicitly: [source disc at station 1 -- elements
    0..segs-1 BY CONSTRUCTION, no detection] + channel wall 1..M-1 + flat mouth
    flange (cosmetic roundover omitted) + offset outer shell reversed + back disc;
    slab behind the source = the driver body. Unused inner ring 0 compacted out
    (NumCalc rejects isolated nodes). Orientation by signed volume. Decimation:
    22 stations x 26 segs ~ 2.2k elements. Coord map: engine (Z,X,Y) -> NumCalc
    (x,y,z), METERS. Eval: 37-pt H arc @2m, index 0 = on-axis.
    VALIDATED via the node worker-path harness on a jmlc fc500: 500Hz on-axis
    1.04 Pa, front/side +9.8dB; 1kHz 3.0 Pa, +15.4dB (directivity narrows with f);
    ~9-11 s/frequency. HARNESS GOTCHAS: smoke evals the LAST <script>\\n block --
    the runtime block must start '<script>(function' to stay invisible; the 4MB
    b64 wasm contains 'ALO' by chance -- provenance guard now strips the payload;
    runtime guards against headless (null button). Guards: closed/manifold for
    hypex + WN ring paths, nSrc=segs, button+wasm presence.
    horn_studio.html now 4.4MB (wasm embedded); bem_studio.html remains the
    standalone companion. 157 checks + fuzz clean.
66. (BEM BUTTON FIX, 2026-07-13/14, Marwan: "it didn't work") ROOT CAUSE: the BEM
    logic lived in a SEPARATE <script> block, but lastAct/S/profOf are scoped to the
    app script -- in a real browser the click threw "lastAct is not defined". The
    node smoke harness eval's everything into ONE scope and completely masked the
    bug. FIX: separate block reduced to data only (window.BEM_WASM_B64 +
    window.BEM_NCINP); all BEM logic (charts, click handler, worker wiring, CSV)
    moved INSIDE the app script beside the showConstr listener. NEW VERIFICATION
    LAYER: jsdom (real HTML parsing + real scoping, THREE absent tolerated) --
    click bemRun -> mesh info renders (2236 elems, 26 piston, lambda/6 cap),
    wasm decodes, Worker created with jobs; and the jsdom-PARSED worker source
    run through the node harness reproduces 1.039 Pa @500Hz exactly. LESSON FOR
    THE SUITE: the single-scope eval harness cannot catch cross-script scoping;
    any future separate <script> block that touches app state must be jsdom-
    checked (jsdom_test.mjs pattern in the transcript). 157 checks + fuzz clean.
67. (BEM "still not working" -> REAL-BROWSER CI, 2026-07-14) Root causes found by
    running ACTUAL headless Chromium in the sandbox (@sparticuz/chromium via npm +
    puppeteer-core; playwright/puppeteer CDNs are blocked but the npm-packaged
    binary works): (a) buildAraiFanRings returns {rings, M} WITHOUT segs (callers
    pass segs separately) -> buildBEMProject built 0 elements for the biradial ->
    NumCalc emitted nothing -> (b) the result handler crashed on the empty eval
    array ("reading 're'"), killing the message loop so everything after looked
    dead. FIXES: segs fallback (ringsOv.segs || opts.segs) + defensive handler
    ("solver returned no field data" log line instead of a crash).
    CHROMIUM VERIFICATION, all three code paths, first solve each: jmlc 200Hz
    0.086 Pa (7.5s), wn 300Hz 0.075 Pa (7.7s), biradial 145Hz 2.847 Pa (9.3s) --
    charts render, zero page errors. Biradial BEM topology guard added (would have
    caught the 0-element mesh). Note: biradial fMax ~590Hz at BEM resolution (big
    mouth, 26 segs) -- the frequency ladder self-caps correctly.
    158 checks + fuzz clean.
68. (BEM DIRECTIVITY SONOGRAM, 2026-07-14, Marwan's WN300ALO reference image) The
    sonogram (angle x frequency heatmap, dB rel. on-axis) is now the PRIMARY BEM
    output: 14-point log frequency ladder (0.4*fc .. mesh fMax), grayscale field
    (0..-30 dB) with the -6 dB beamwidth contour in red (house palette: gray +
    petf-red, matching the tool's monochrome discipline instead of jet), streaming
    column-by-column as NumCalc finishes each frequency; per-column normalization
    to on-axis; legend bar; on-axis response + latest polar kept as secondary
    charts below. window.__BEM_FREQS hook for CI ladders. CHROMIUM-verified on WN
    (3-freq ladder): svg + both contours render, zero page errors, 5.7 s/freq.
    Full 14-freq map ~ 2-3 min, stated in the panel. 159 checks + fuzz clean.
69. (SONOGRAM JET PALETTE, 2026-07-14, Marwan: "colors like BEMs should look")
    Grayscale field replaced with the classic BEM banded colormap: 15 fixed 3 dB
    bands 0..-42 (dark red -> red -> orange -> yellow -> green -> cyan -> blue ->
    dark blue), banded legend, beamwidth contour now a dashed black -6 dB line
    (red clashed with jet). One deliberate deviation from house monochrome --
    the community reads directivity in jet; matching the convention beats the
    palette rule here. Chromium-verified (5-freq WN ladder): full-color map +
    contours render, screenshot in outputs (wn_sonogram_jet.png). 159 checks.
70. (BEM H/V DUAL-PLANE, 2026-07-14, Marwan's profile-drawing question) DECISION:
    BEM results stay ADJACENT to the 2-D drawing, not overlaid (geometry space vs
    freq x angle space; the drawing stays manufacturing-grade). Implemented the
    valuable half: the V plane. buildBEMProject now evaluates BOTH arcs in ONE
    solve (eval points ~free): H = indices 0..36 (0 = on-axis, shared), V = 37..72
    (y-z plane); returns anglesV + nH. App: H / V toggle buttons in the BEM panel
    header (bemPlane state, bemSlice/bemRedraw re-render sonogram + polar from the
    stored rows -- no re-solve), titles carry the plane, CSV gains a plane column.
    CHROMIUM-verified on WN (2-freq ladder): both titles render, planes differ
    (wn is asymmetric -- the correct signature), zero page errors. EDIT NOTE: the
    first html batch aborted atomically on an over-escaped CSV anchor ('\\\\n' vs
    '\\n' in python-matching-JS) -- reapplied clean. Guard: dual-plane fields +
    toggle presence. 160 checks + fuzz clean.
71. (BEM FASTER + SMOOTHER, 2026-07-14, Marwan's WN425SE V-polar reference)
    (a) SLFMBEM (methodBEM=1, single-level FMM) VERIFIED under WASI: matches TBEM
    to 0.01% at 2.2k elements and 1.7x faster (3.6 vs 6.2 s), advantage grows with
    N -- now the default for nBnd > 800 (TBEM below). MLFMM (4) still segfaults.
    Solver eps loosening: no gain (assembly-dominated). (b) Mesh density raised
    22x26 -> 28x32 (~3.5k elements; ring-override calls updated to segs 32):
    WN fMax 963 -> ~1360 Hz. (c) WORKER POOL: min(3, cores-1) parallel workers,
    round-robin jobs, completion counted by results-seen (each worker emits its own
    'done'). Chromium (this VM, ~2 cores): 5 freqs at 3.5k elements in 36 s wall.
    (d) SONOGRAM SMOOTHING: 5 interpolated sub-columns between solved frequencies
    (log-f, per-angle-band linear dB) -> flowing bands like the reference; default
    ladder 14 -> 18 points. Guards updated to segs 32. HONEST CEILING (stated to
    Marwan): full-model 10 kHz dense/SLFM browser BEM is out of reach (~25k elems);
    the next real lever is NumCalc's SYMMETRY planes (quarter model = 4x elements
    equivalent) -- backlog. 160 checks + fuzz clean.
72. (ADAPTIVE BAND + H/V UX, 2026-07-14) Marwan: "only 1.2k? go to 10k" + "H/V
    doesn't work". (a) H/V WAS working (Chromium: titles switch, maps differ,
    polar follows) -- on ROUND horns H = V by symmetry, which is what he likely
    saw. UX fix: active plane button now filled solid ink; round-horn note appended
    to beminfo. (b) TWO-BAND ADAPTIVE MESH: every run builds coarse (28x32, ~3.5k)
    AND fine (44x52, ~9k) bodies; each frequency job carries the mesh its physics
    needs (f <= coarse fMax -> coarse). WN ceiling now ~1,982 Hz (was ~1,360);
    fine-band solve verified in the node worker harness: 9,048 elements @1883 Hz,
    45 s, 73 eval pts. beminfo states both bands + per-band times. (c) 10 kHz
    STRAIGHT ANSWER (told to Marwan): lambda/6 at 10 kHz = 5.7 mm elements -> ~30k
    full-model = beyond wasm32 + minutes/freq; reference plots use MLFMM (segfaults
    under WASI) + symmetry on desktop. REAL PATH: NumCalc SYMMETRY planes (quarter
    model, our horns have 2 planes finless/even-fins) + half-space baffle = 4-8x
    element budget -> 10 kHz plausible. PROPER NEXT MILESTONE, backlogged.
    161 checks + fuzz clean.
73. (NATIVE BEM EXPORT, 2026-07-14, Marwan: "use my computer directly, out of the
    browser") "EXPORT NATIVE BEM PROJECT -- TO 10 kHz" button: builds a FULL-
    RESOLUTION closed body sized from lambda/6 at 10 kHz (segs from mouth
    perimeter, stations from depth; caps 200x120), 40 log frequencies 0.3*fc..
    min(10k, mesh fMax) in ONE NC.inp (MLFMM method 4 -- fine natively; only WASI
    crashes it), dual-plane 73-pt eval, README (build NumCalc from Mesh2HRTF,
    -istart/-iend parallelism) + plot.py (matplotlib jet sonograms H+V from
    be.out). In-browser STORE-method zip writer (crc32 + local/central headers,
    no library). FORMAT LESSON: numFrequencies_ = Controlparameter II FIELD 2
    (chterms[1]); first attempt set field 1 -> only be.1 produced. VALIDATED
    under the NATIVE binary: 3-freq MLFMM run -> be.1/2/3, 73 rows each, rising
    on-axis pressure. Guard added. 162 checks.
74. (HornBEM MAC APP, 2026-07-14) Double-clickable HornBEM.app (161KB zip staged):
    hand-built bundle (Info.plist + MacOS launcher that reopens Resources/run.sh in
    Terminal for visible progress). run.sh: checks clang++ (triggers xcode-select
    --install with instructions if absent), compiles bundled NumCalc source ONCE to
    ~/Library/Application Support/HornBEM (source + Mesh2HRTF LICENSE shipped in
    Resources/numcalc_src), auto-finds newest ~/Downloads/horn_bem_native*.zip
    (or pasted path), unzips, splits the frequency steps across up to 8 cores via
    -istart/-iend, then report.py (PURE STDLIB python3): parses mesh + be.out ->
    report.html with a drag-rotate canvas wireframe MESH VIEWER + H and V jet
    sonogram canvases; opens in the default browser. VERIFIED: report.py run
    against the real native_test results (3 freqs, 3520 elements) -> report.html
    renders. UNTESTED ON REAL macOS (launcher/open/Terminal specifics) -- flagged
    to Marwan; Gatekeeper needs right-click->Open once (unsigned).
    Workflow: Horn Studio EXPORT NATIVE BEM PROJECT -> double-click HornBEM.
75. (FINS IN THE BEM BOUNDARY, 2026-07-14, Marwan's spec doc Phase 2) The one true
    gap in the spec: fins were loading/visual only. Now buildBEMProject accepts
    opts.finMeshes (wnFinMesh solids): appended as FLOATING closed bodies (WN fins
    have designed clearance -- no Boolean union needed), per-solid outward
    orientation by signed volume, node blocks appended before compaction. Counts
    returned (nHornE/nFinE) and shown in beminfo. App passes fins for wn when
    S.wnFins > 0 (both bands). PROOF through real NumCalc (SLFMBEM, worker path):
    WN fc600 4 fins @1200 Hz -- 3,520 horn + 3,408 fin = 6,928 elements, closed
    2-manifold, max H-pattern difference vs finless 5.26 dB (84 s vs 9 s in the
    2-core VM). Spec's Phase 1 audit answered from the record in the reply.
    Remaining spec items (ML-FMM under WASI, 1-deg polars, impedance-from-piston,
    scheduler, offline packaging, self-intersection checks) = fresh-session work;
    handoff carries everything. 163 checks.
76. (ML-FMM BREAKTHROUGH, 2026-07-14, "figure out 10k") ML-FMM (method 4) WORKS
    under WASI -- the original segfault was the DEFAULT LINK STACK, fixed by the
    32MB relink in entry 64 and never retried with method 4 + clean FS. Verified
    in the worker path: WN 3,520 elems @1200 Hz, 0.5526 Pa, matches SL-FMM 0.03%,
    4 s vs 9 s (2.3x). App default now method 4 above 800 elements. THE 10 kHz
    PATH IS OPEN: O(N log N) makes ~25-30k-element meshes (lambda/6 @ 10 kHz)
    tractable; NEXT SESSION: add a third fine band (buildBEMProject already takes
    stations/segs), memory-aware pool sizing, benchmark 10k/25k element solves.
    163 checks.
77. (10 kHz BAND SHIPPED, 2026-07-14, entry-76 continuation) All three next-steps
    landed, plus two regressions found and fixed on the way.
    REGRESSION 20 (WN fold-back): wnPathLen is non-monotonic in c (two roots);
    wnSolveC bisected a fixed bracket and latched arbitrary roots above mu~0.03,
    folding rings to z=-53 mm with 240 mm edges. Fixed with continuation root
    tracking (cPrev chaining, |q|-descending solve order). Guarded (zmin >= 0,
    monotone, edges sane on the 2in/600Hz anchor); equal-path residual ~1e-13 kept.
    REFINED END CAPS (opts.targetEdge, OPT-IN): legacy single-fan source/back
    discs carry center-to-rim spokes ~ throat radius that capped EVERY mesh at
    ~1.8 kHz regardless of wall density. With targetEdge set, discs gain
    concentric interpolated rings and the mouth flange splits into bands; source
    elements stay FIRST, closed 2-manifold at all densities, legacy build is
    element-identical when absent (nSrc === segs, 3,520). Payoff: jmlc 48x120 ->
    24,240 elements, fMax 10,649 Hz; tractrix 12,156 Hz. 10 kHz IS REAL for
    classic HF horns at ~24k elements.
    ADAPTIVE STATION SUBSAMPLING (both keep[] branches): uniform-index keep let
    kept-pair 3-D gaps blow out where rings bunch/whip. Now equalized over
    cumulative max inter-ring gap (rings branch, plus a thick*maxTurn curvature
    term charging the outer-shell amplification at curved lips) / profile arc
    length (prof branch). Free ceiling gains at FIXED element count: WN coarse
    3,520 el 914 -> ~1,700 Hz, fine 9,048 el 1,393 -> 2,280 Hz; app default horn
    coarse now 1,166 Hz in production. Vertex-normal smoothing for the outer
    shell was tried and REVERTED (hurt coarse/fine, negligible xfine gain).
    KNOWN COST: WN's wrapped-mouth corner hoop steps (segs-limited, ~1.7x inner)
    cap WN xfine ~4 kHz at 30k elements -- honest per-mesh fMax handles it; the
    native path exists for beyond.
    REGRESSION 21 (silent, found by measuring): the first prof-branch metric read
    wall points as arrays but they are {z,r} OBJECTS -> NaN cumulative arc ->
    keep[] silently collapsed to the throat with one 128 mm jump (jmlc default
    fMax 449 Hz, still closed-manifold so topology checks passed). Fixed with
    format-tolerant accessors + NaN fallback to uniform; guarded (fMax > 2500).
    BENCHMARKS (real NumCalc ML-FMM under WASI, 1-core 4 GB VM ~6x slower per
    core than a desktop): 3,520 el @1200 Hz 24.3 s / 256 MB wasm; 9,520 @2400 Hz
    33.9 s / 387 MB; 24,472 @3300 Hz 166.8 s / 1,315 MB. Memory grows
    super-linearly (FMM depth tracks kD), so the model mem(N) = 200 + 0.048*N MB
    is anchored conservatively at the top. Engine helpers (exported, smoke-pinned):
    bemMemEstimate, bemPoolPlan (budget clamp 0.45*deviceMemGB in [0.5, 3.2] GB,
    poolN in [1, min(3, cores-1, jobs)]), bemBandSize (mouth-perimeter/depth ->
    stations/segs for a target fTop under an element budget, sqrt-shrink when
    over; fMax stays honest from measured maxEdge).
    APP: THIRD BAND bpX sized by bemBandSize for min(10 kHz, budget) with the
    element budget inverted from the memory model (12k-30k); ladder tops at
    min(10000, bpX.fMax); per-job routing coarse/fine/xfine; beminfo shows all
    three bands + solver budget. Static round-robin dispatch replaced by a
    PULL-QUEUE with memory admission control (job admitted when inflight +
    bemMemEstimate(nBnd) fits the budget, always >= 1 in flight); wasm bytes now
    sent ONCE per worker in an init message and cached module-level (was ~4 MB
    cloned per job); 'done' guarded against the bytes-only init message.
    VERIFIED END-TO-END IN HEADLESS CHROMIUM (real click path): run 1 -- default
    horn, three-band beminfo (3,520 -> 1,166 / 9,048 -> 1,872 / 23,048 -> 2,966 Hz),
    1.8 GB budget, 300 Hz job solved 0.595 Pa. Run 2 -- spoofed 4 cores / 2 GB ->
    pool of 3, 0.9 GB budget, freqs [250, 400, 2500]: both coarse jobs ran
    CONCURRENTLY (27.1/28.0 s), the 23k xfine was DEFERRED by admission control
    and completed last (150 s), Done. 172 checks, fuzz clean (11 families).
78. (QUARTER SYMMETRY SHIPPED, 2026-07-14, "in browser fix always") NumCalc
    SYMMETRY quarter models are live in the browser path for every prof-path
    finless family; WN/biradial rings and fins stay full (engine throws if asked).
    ENGINE: buildBEMProject opts.symmetry='quarter' extracts the 0..90deg arc from
    the validated full loft (segs%4 required), mirrored-neighbor shell normals at
    the cuts, exact-axis cap centers, post-compaction snap of cut nodes EXACTLY
    onto x=0/y=0 (NumCalc one-sidedness); returns sym:2 and exactly nBnd/4
    elements with identical honest fMax. SOLVED EQUIVALENCE (validate_sym.mjs,
    ML-FMM + SYMMETRY "1 1 0"): worst 0.105-0.115 dB across the 73-pt grid over
    three horn/mesh/frequency combos incl. a 24,240-el full vs 6,060-el quarter
    at 3 kHz (103.3 s/1,004 MB vs 13.2 s/316 MB: 7.8x faster, 3.2x lighter).
    REGRESSION 22 (latent since entry 77): the shell-offset sign test used only
    the radial normal component; at a mouth-roll APEX (tangent turns radial, true
    outward ~pure z) adjacent stations offset +6/-6 mm -- a 13.1 mm zigzag that
    capped the 400 Hz full-roll default at ~4.3 kHz regardless of station count,
    in FULL entry-77 meshes too. Fixed with continuity-chained signs per station
    column (radial anchor at the throat); default quarter at 28k el jumped 4,364
    -> 7,234 Hz; smoke-guarded, trunc-80 10,649 Hz pin unchanged, fuzz clean.
    MEMORY (measured): flat in frequency on a fixed mesh (299->316 MB, 800 Hz ->
    10 kHz at 6k el) but SUPER-LINEAR in N: 24,472 -> 1,315 MB, 28,710 -> 1,746,
    36,540 OOM-KILLED past 3.9 GB (FMM depth step). bemMemEstimate now piecewise
    (0.102 MB/el above 24,472); BEM_ELEM_RAIL=29,000 = largest solve measured to
    fit wasm32; app inverts the piecewise model and clamps to the rail.
    SIZING: xfine stations now sized by PROFILE ARC LENGTH (422 vs 247 mm axial
    on the default -- axial-depth sizing under-stationed full-roll horns), quarter
    bands get the 4x full-equivalent bemBandSize budget, engine reports
    edgeSta/edgeRing and the app runs one rebalance iteration keeping the better
    build. NC.inp per job: Main-Params-I sym field from B.sym + SYMMETRY block
    uncommented. beminfo shows the 1/4-symmetry marker.
    CHROMIUM (real click path, default horn): three quarter bands 880 -> 1,201 /
    2,262 -> 1,937 / 18,906 -> 5,942 Hz on the 4 GB VM (8 GB-class: 29k rail ->
    ~7.2 kHz); 300 Hz solved 0.605 Pa in 1.6 s vs entry-77 full 0.595 Pa/14.1 s
    (0.15 dB, 8.8x). Compact HF horns (e.g. 1in/800 Hz trunc-80) reach TRUE
    10 kHz in-tab at ~6k quarter elements/316 MB. Full-roll midrange horns cap
    honestly ~7 kHz at the wasm32 rail -- native export remains the path beyond.
    178 checks, fuzz clean (11 families).
79. (ARAI ADAPTER NECK, 2026-07-14, Marwan screenshots: "throat curves inward
    before expanding") The circle->wedge adapter morph runs in DEVELOPED
    coordinates; the cylinder wrap pulls corner points INWARD of the throat
    circle (min ring radius 36.6 mm on a 38 mm throat by z~11 -- a neck the real
    A-290 adapter does not have; plane profiles were monotone, which is why 2-D
    checks never saw it). Fix: per-meridian monotone-radius pass in
    buildAraiFanRings (cummax from the exact throat circle, radial (X,Y) scale;
    max lift = the 1.4 mm dip, planes untouched). Verified: global min radius
    38.000 across all 171 rings x 64 meridians, worst meridian step 2.57 mm at
    the mouth arc (ring-spacing scale, no crease). Smoke-guarded; 179 checks,
    fuzz clean. NOTE: root-cause option (morph in true space) deferred -- the
    lift is bounded by the dip depth and the guard pins the invariant.
80. (ARAI THROAT EXPANSION, 2026-07-14, Marwan: "the problem is still there, the
    throat doesn't expand towards the horn") Entry 79's clamp treated the symptom:
    the deeper cause was TWO-fold. (1) The adapter's end-slope Hermite pinned both
    ends at rt, so meeting the wall's start tangent forced the No.2322-style
    ~1.9 mm S-DIP below throat radius -- the waist in the renders; clamping it
    produced the flat tube of the second screenshot. Declared incorrect for this
    horn: the adapter now runs a MONOTONE C1 Hermite from (rt, slope 0) to
    (wSlot = rt + sig/2, slope sig = tan(0.56*covH/2)*zTr), and the fan width law
    starts from wSlot -- C1 across the slot verified numerically (slope 0.488 ->
    0.482 ring 20 -> 21, no crease). (2) The developed-space wrap X = rr*sin(sx/rr)
    pinched corner points inward; sections are now drawn in TRUE cross-section
    space (X = arcRect x directly, wTrue = rr*sin(wDev/rr) preserves the exact
    fan-wall edge, Z alone bends around the fan via asin azimuth, tBl-blended so
    the slot stays identical). The entry-79 cummax pass stays as a no-op invariant
    net. Verified on the 38 mm-throat repro: global min radius 38.000 (throat ring
    only), zero shrinking steps on all 64 meridians, per-ring max radius strictly
    increasing, H width already +4 mm inside the adapter; V-plane meridians hold
    near-slot height through the fan BY DESIGN (documented in the guard). Smoke
    guard rewritten to the true invariants (no-shrink + strict section growth +
    adapter H growth, vertical flatness allowed). 180 checks, fuzz clean.
81. (ARAI WEDGE SIDES, 2026-07-14, Marwan photo of the printed adapter: "the side
    walls expand in the same shape as the yuichi horn side angles... top and
    bottom is fine but check the sides") The adapter H half-width is now LINEAR
    at the wall's start tangent tan(0.56*covH/2) from the throat circle itself
    (entry 80's slope-0 Hermite start read as a tube next to the hardware);
    trivially C1 at the slot (same slope both sides, fan anchor = rt + sig).
    The fan width blend launches at the wedge slope and could overshoot the fan
    curve then settle back, so a MONOTONE WIDTH HOLD was added (the wedge waits
    for the fan to pass it -- tangent-line-onto-curve, a brief legitimate width
    plateau ~ rings 28-40 on the repro). The entry-79 per-meridian radius cummax
    was REMOVED: during the plateau, fixed-fraction perimeter points legitimately
    SLIDE along a growing section (corner -> side), so meridian radius falls by
    millimetres while every section still CONTAINS its predecessor; the cummax
    conflated sliding with necking and was bulging plateau sections outward. The
    true invariant is SECTION CONTAINMENT, now guarded directly: ray-cast polar
    radius at 96 azimuths, every adapter/slot-region ring (0..40; beyond, rings
    curve strongly in Z and planar containment stops meaning anything) contains
    the previous one, worst measured intrusion 0.098 mm = 64-gon chord-sag noise
    (threshold 0.25 mm). Guard bug found on the way: the ray-edge u parameter
    sign was flipped (rejected valid hits; throat polar read 0). Sections vs the
    photo: ring 0 circle 38/38/38; sides 41.1 -> 50.5 linear through the adapter
    (slope 0.501 = tan(26.6deg) exactly); top/bottom flat 38.0; corner reach
    38 -> 64.6 filling toward the rectangle. Wedge-slope smoke pin added. 181
    checks, fuzz clean.
82. (LONGEST-POSSIBLE ADAPTER, 2026-07-14, Marwan: "make the adapter as long as
    possible and validate by looking at the top view") The wedge now runs at the
    wall start tangent PAST adaptL until the fan wall overtakes it -- zX9 solved
    at build time (z ~ 83-86 mm on the 38 mm repro vs adaptL 25); the interior
    H half-width is simply max(wedge, fan wall) so the junction is the natural
    crossing (replaces the slot Hermite blend entirely, wSlotF9/m0/m1 gone).
    The round->rect corner morph is paced by zX9, not adaptL: cornerFill 0% ->
    31% -> 52% -> 74% -> 95% across rings 0/10/20/35/55, the deep-round throat
    of the printed part. THREE coordinate bugs surfaced under the top-view gate:
    (82a) width applied at the ring's NOMINAL z while fan-arc edges curl BACK in
    z -- the side wall bulged 4-9 mm past the wedge line in top view; fixed with
    a per-ring fixed-point solve in PHYSICAL coordinates. (82b) the first solve
    assumed FULL fan bend; near the slot tBl ~ 0 and widths collapsed (silhouette
    fell to 43.9 mm) -- the edge z now uses the BLENDED Z (flat at the slot, fan
    arc beyond). (82c) the entry-79 developed->true conversion was still applied
    on top of the new width law, which already produces TRUE widths -- a double
    correction that shrank sides by sin (ring-41 side measured exactly
    rr*sin(w/rr) of the intended w); everything unified to true widths (fan
    branch converts rr*thW -> rr*sin(thW) before the max). Side-vertex floor
    raised to segs/8 (mouth-proportional allocation starved the tall
    adapter/fan-early sides). TOP-VIEW GATE: silhouette matches
    max(wedge, wall) at every 4 mm bin (worst 2.47 mm = chord/binning noise),
    zero silhouette dips, 66 rings ride the wedge line to z ~ 83. 181 checks,
    fuzz clean.
83. (ADAPTER LENGTH FEASIBILITY, 2026-07-14, Marwan: "when you make the adapter
    longer this happens" -- junction darts) The horn-angle wedge is only HOSTABLE
    while its half-width stays inside the fan ring cylinders (points live at
    x <= rr); with a long adaptL the wedge exit (rt + zTr*s0w, e.g. 78 mm at
    adaptL 80) exceeded Rarr = 51.6, the asin domain clamp saturated and the
    fixed point emitted garbage widths at the junction -- the dart spikes in the
    render (top-view envelope broke by 14.1 mm at z 56). FIX: feasibility-capped
    wedge slope sEff = min(tan(0.56*covH/2), (0.97*Rarr - rt)/zTr) used
    everywhere (adapter zone, fan fixed point, zX9 crossing). Short adapters
    keep the validated horn-angle look (25 mm: 0.483 vs 0.501); long ones
    CONVERGE to the authentic Crowe No.2322 slow cone (50 mm: 0.241, 80 mm:
    0.151 -- the real 65 mm adapter expands at the area law, not the fan angle;
    a 26.6deg wedge 80 mm long would need a 156 mm slot no A-290 fan accepts).
    Verified at adaptL 25/50/80 WITH mouth flare: zero junction Laplacian spikes
    > 5 mm (was 14+ mm garbage), zero silhouette dips outside the mouth arc /
    side-plate wings region (z 156-248, the classic Arai plan -- design, not
    defect). Wedge-slope smoke pin updated to expect sEff. 181 checks, fuzz
    clean.
84. (THE RE-INVENTION, 2026-07-14, Marwan: "now the bump is back... we are going
    in circles, you need to re-invent this") Entries 79-83 stitched TWO surface
    definitions (a wedge law vs the book wall/fan) inside the cylindrical ring
    parameterization with fixed-point solves, monotone holds, feasibility caps
    and max() switches; each patch's interaction bred the next artifact (waist ->
    tube -> darts -> bump). All of that machinery is DELETED and replaced by one
    construction in buildAraiFanRings:
      ZONE A (flat extruded stations, z = 0..zX): sections arcRect(W, H, rho) in
      true (X, Y) -- a flat extrusion has NO cylinder-radius constraint, so the
      wedge runs the horn side angle without caps. W = rt + s*z; H = the fan's
      own vertical law hAt(Rarr + max(0, z - zTr)); rho morphs rt -> rhoEnd over
      the FULL zX (deep-round throat, printed-part look). zX = plain 1-D crossing
      of the wedge line with the wall polyline, scanned from BEYOND the slot
      (scanning earlier crossed the adapter's own area-law curve and put zone B
      on sub-Rarr cylinders -- a transient waist bug caught by the battery).
      ZONE B (fan cylinder rings, rrX = Rarr + (zX - zTr) .. Rm): width is a
      plain blend of wallA(flat-map z) and the CLASSIC thWOf fan width (keeping
      the coverage clip and per-cell mouth structure); bend ramps from rrX over
      a window >= 2x the flat-to-arc edge gap so the side edge never regresses
      (was -0.53 mm/ring); no solver, no z feedback, monotone by construction.
      SLOPE LAW (closed form, the one remaining bound): s = min(full horn angle,
      chord to the wall at zCap = zTr + 1.2*Rarr) -- the crossing always lands
      within the fan's blend capacity. Book 25 mm: UNCAPPED, full 0.501;
      50 mm: 0.440; UI-max 80 mm: 0.385 (converging to the Crowe cone).
    BATTERY (smoke-pinned at adaptL 25/50/80, the whole UI range): no waist
    (min radius = rt exactly), no fold in the junction span, zero junction
    Laplacian spikes at 25/50, wedge slope = law to 0.02. Remaining 4-fold
    signatures at |x| ~ 190-210 are the DESIGNED wall/wing plan corner (5.3 mm
    worst vs 15.6 mm on the pre-84 code -- milder than baseline). Two guards
    corrected on the way: the fold guard's fixture failure was the MOUTH (my
    wall sampling had dropped thWOf's coverage clip -- restored), and the
    battery window initially caught the wing corner (moved to zX + 8).
    DEFERRED: fin bladeZ still maps z through the old blend origin (Rarr,
    0.9*Rarr window); fins sit mm-scale off the new surface blend in z --
    vertical containment guard still passes; re-map next session. 184 checks,
    fuzz clean.
85. (BOOK HORN RESTORED, 2026-07-14, Marwan: "the adapter looks good but now the
    horn itself got changed") Entry 84's zone B blended wallA with the chord fan
    width PERMANENTLY -- it rode ~10 mm wide past the junction (easing back only
    by z ~ 136, the S-ripple in his render) and DILUTED the mouth by up to 8 mm
    per side / 5 mm in height vs the entry-76 book build. Zone B is now the
    ENTRY-76 CONSTRUCTION VERBATIM beyond the ease window: developed
    arcRect(rr*thW) wrapped onto the fan cylinder (arced top/bottom edges,
    per-cell kr mouth, coverage clip, classic rho floor); the junction ease is a
    POSITIONAL lerp from the flat zone-A exit section to the book point across
    bW9 (>= 2x the flat-to-arc gap), equal to zone A's exit exactly at tBl = 0.
    Verified against the entry-76 reference engine (extracted from the handoff
    zip): dW <= 0.3 mm, dH <= 0.1 mm, section worst deviation <= 0.3 mm from
    z ~ 136 to the mouth (mouth ring within 1 mm, kr-arc anchoring noise); the
    z 55-113 span is the APPROVED wedge + ease window. Junction Laplacian
    spikes zero at adaptL 25/50/80 (worst 2.6-2.9 mm = curvature scale).
    184 checks, fuzz clean. Fin bladeZ re-map still deferred (entry 84 note).
86. (BEM SOLVER OUT, AKABAK EXPORT IN, 2026-07-14, Marwan: "remove all the BEM
    stuff and then just have an export that is compatible for BEMs with akabak")
    The entire in-browser NumCalc stack is REMOVED from the app: bemRun/bempanel
    UI, charts (sonogram/polar/response), scheduler + workers, bytes-once
    protocol, bemNative zip export, zipStore, window.BEM_WASM_B64 and
    window.BEM_NCINP -- 4.18 MB gone, horn_studio.html is now ~270 KB. The
    ENGINE keeps everything validated (buildBEMProject + quarter symmetry +
    memory helpers + all regression guards): the mesh machinery IS the export.
    NEW: "AKABAK BEM MESH (.msh)" button. Research confirmed Akabak 3 / ABEC
    import GMSH text meshes VERSION 2.2 ONLY, all boundary elements in one file
    tagged into named physical groups (the Ath convention). Engine bemToMsh(bp)
    converts a buildBEMProject boundary to GMSH 2.2 ASCII in MILLIMETRES:
    group 1 "SourceDisc" (driving elements, source-first ordering reused),
    group 2 "HornWalls"; 1-based ids, $EndElements-terminated. App handler sizes
    one dense mesh via bemBandSize (arc-length stations, lambda/6 to 10 kHz,
    90k-element cap), rings/fins for WN + biradial included; the v3dnote reports
    element count, honest fMax and import hints (drive the SourceDisc group).
    Smoke: app-solver checks retired (dual-plane ENGINE eval-grid pin kept),
    AKABAK format unit check (header/groups/counts/tags/mm) + app wiring regex
    added. Verified in headless Chromium via the REAL button click with a blob
    intercept: 95,472 elements, "2.2 0 8", both groups, valid terminator, no
    wasm globals. 181 checks, fuzz clean.
87. (JMLC PRIMARY SOURCES, 2026-07-14, Marwan: "Found some useful things from
    JMLC himself") Le Cleac'h's ORIGINAL spreadsheets ingested; extracts archived
    in reference/jmlc_originals/ (axial wall table JSON, elliptical inputs JSON,
    NOTES.md). THE BIG FINDING -- our flagship jmlc family FAILS Le Cleac'h's own
    axial table: 10-15x TOO SHORT axially at matched mouth radii (L/lambda
    0.03-0.05 vs his 0.4445 at mu = 0.208 [fc 5000, rt 7.1628, T 0.7071];
    0.20-0.22 vs 0.5405 at mu = 0.073 [fc 500, rt 25, T 0.5]) with a spurious
    mu-dependence; scale invariance itself holds (10.00x check). His table obeys
    the hypex law with m = 4*pi*fc/c in the AXIAL/apex coordinate to FOUR
    DECIMALS (S = 2x/4x/10x/40x/100x at z 4.770/8.968/14.204/21.903/26.933 vs
    law 4.770/8.964/14.201/21.896/26.933) and his tweeter wall averages ~21 deg
    slope over 30.6 mm. Our jmlcWall's free-marching front + rim-rotation area
    absorption accumulates curvature: the wall turns steep within millimetres
    and the truncation angle fires -- a tiny curled trumpet where his is a long
    taper. NOT fixed tonight: re-derive jmlcWall against the archived table next
    session (a KNOWN-SHORT smoke pin documents the current state and must be
    deliberately flipped by the fix). Also recovered, previously unknown to us:
    his axial calculator's F (mouth shape factor pi/4 -- backlog #8 area modes,
    from the man himself), S (throat wavefront sphericity 0..1), W (wall/corner
    loading 2/1); the May 2007 elliptical machinery -- "aplatissement" mouth
    ellipticity, the "decoupe" mouth-cut law (n, puissance) with his named
    recipes incl. LIP (0.2, 0.5) and the Iwata hard cliff (0.3, 11); and
    WE_elliptique's GAUSSIAN flattening progression (mean 1500 / sigma 900 mm on
    1704.9 mm) -- three candidate families/features (JMLC-elliptical, Iwata-JMLC,
    WE-elliptique) with full per-azimuth construction sheets to re-read at
    implementation time. 183 checks, fuzz clean.
88. (JMLC INTEGRATION + THE CORRECTION, 2026-07-14, Marwan: "integrate these into
    our calculator and fix everything") FIRST, THE RECORD: entry 87's "our jmlc is
    10-15x too short" was a COORDINATE MISREAD -- his col 0 is the MARCHING
    coordinate s (row index x increment; "maximal length" = the marching budget),
    not the wall z. His TRUE wall lives in cols 16/17 (INCHES): z -0.5..6.0 mm,
    mouth r 20.8 for the 5 kHz example -- ours spans 6.25/19.3. Archived as
    *_TRUE.json; the KNOWN-SHORT pin is retired. CORRECTED RESULT: our jmlc
    matches Le Cleac'h's own flare to 0.17 mm mean at entryDeg 0 and 0.058 mm
    mean at the natural angle (worst 0.581 mm = his seed-rim point at z -0.5,
    which our planar-anchored seed does not model); the residual lives in the
    deep mouth roll where his construction wraps further than our trunc cap.
    INTEGRATED: (1) entryAuto -- the JMLC NATURAL ENTRY ANGLE, closed form
    sin(th0) = rt*m*T/2 derived by matching the seed cap's own growth 2*S0/R to
    the law's initial slope S0*m*T; reproduces the 27.5518 deg PRINTED in his
    sheet to 4 decimals; UI: entryDeg 0 = natural on jmlc/jmlcell. (2) NEW FAMILY
    'jmlcell' -- JMLC quasi-elliptical (mai 2007): axisymmetric jmlc march +
    AREA-PRESERVING elliptical morph (a = r*sqrt(e), b = r/sqrt(e); the loading
    law untouched), ellipticity ramped 1 -> aplat by a GAUSSIAN CDF along the
    wavefront coordinate (his WE parameterization, defaults mu/sigma = 0.88/0.53
    of the march = his 1500/900 on 1704.9), ramp NORMALIZED so the throat is
    exactly circular and the mouth exactly aplat (raw CDF left 5% throat
    ellipticity -- a round driver forbids it). Defaults = his worked example
    (fc 500, throat 50, T 0.5, aplat 4). UI selector/params/defaults wired; fuzz
    now sweeps 12 families. (3) F and W: F is REDUNDANT with our shipped
    superellipse Gamma normalization and corrupts the axisymmetric march if
    forced (measured stall at Fshape=4 -- reverted, documented in-code); W left
    decoded-pending (a bare law multiplier only stalls the start; likely a mouth
    criterion). NOT DONE: the decoupe (n, puissance) azimuthal mouth-cut law
    (his own default is n=0 = no cut in 2 of 3 sheets) and the Iwata cliff
    (0.3, 11) -- needs the calcul_3D decode; contours_decoupes sheet is the
    validation artifact when we do it. 186 checks, fuzz clean (12 families).
89. (FORUM FEATURE ROUND, 2026-07-14, Marwan relaying member feedback) Three
    requests shipped. (1) INTERACTIVE DRAWING: wheel = zoom at the cursor, drag
    = pan, double-click = reset -- implemented on the injected SVG's viewBox
    with handlers on the persistent #drawing container so every re-render keeps
    them; harness-safe guards (the DOM stub lacks querySelector /
    window.addEventListener). (2) TINY HORNS ("3 cm tractrix, 5 mm throat"): fc
    range widened 1200 -> 10000 Hz, throat floor 12 -> 4 mm, validity gate +
    audit-#12 clamp check updated; engine verified sane at the scale (5 mm
    tractrix at fc 6000: 9.2 mm long, mouth 21.7 -- confirmed through the real
    UI in Chromium). (3) RIBBON / RECTANGULAR RADIATORS: bemToMsh(bp, {ribbonW,
    ribbonH}) tags the source-cap elements whose CENTROID lies in the centered
    W x H rectangle as physical group "RibbonSource" and the remainder as rigid
    "ThroatBaffle" (walls unchanged) -- no geometry change, tagging only; the
    cap is the densest mesh region so the stair-stepped boundary is at its
    finest; Akabak drives whichever group is assigned, so the split IS the
    arbitrary-radiator feature. ribW/ribH params (0 = classic full disc),
    export note reports the split. Verified end-to-end in Chromium: viewBox
    zoom + reset, tiny tractrix through real inputs, ribbon .msh via the real
    button (RibbonSource + ThroatBaffle groups in the captured blob). True
    rect-throat HORNS remain available via the CD family's rrect sections.
    191 checks, fuzz clean (12 families).
90. (GLOBAL RIBBON THROAT, 2026-07-14, Marwan: "I do not like the akabak export
    of the square mouth... why not add it as a toggle on the throat globally?")
    The export-only tagging is gone; the ribbon is GEOMETRY now. Engine
    throatRibbonMorph(prof, W, H, L): per-station Lame exponent ramp (n=10
    rect-with-rounded-corners at the throat -> n=2 the family's EXACT elliptical
    section) via the existing seNArr machinery, half-widths blending W/2, H/2
    into the family walls over the transition (L, 0 = auto 2*max(W,H)). Applied
    inside profOf, so drawings, 3-D, STL and the Akabak SourceDisc all carry the
    true rectangular throat; ribW/ribH/ribL params (0 = round), prof-path
    families only (WN slot / Arai adapter keep their specialized throats;
    per-azimuth PETF cache skipped, documented). validateInputs advises the
    area-equivalent throat diameter when the ribbon and throatD disagree > 10%.
    ALSO FIXED: entry-88 gap -- jmlcell fell through to the single-wall profOf
    path and its V axis never reached the loft; now routes wallV through
    planeProfilesWN like osc.
91. (SOURCE OFF-BY-ONE, 2026-07-14, exposed by the ribbon) The BEM source cap
    anchored RING 1, not ring 0 -- a coherent off-by-one (cap center means, rim
    radius, refined-ring lerp targets, SR() rim stitch, and the wall loop
    literally commented "channel wall 1..M-1") while the back disc correctly
    used ring 0. Every BEM mesh dropped its first station band and the piston
    sat at station-1 z and radius: ~1-3 mm at validated densities
    (self-consistent, so all topology and equivalence gates passed), but FATAL
    for the ribbon throat at default stations (the 8x3 rect became 14x14 at
    z 10). Fixed to ring 0 throughout; the legacy cap's fMax IMPROVED 1.8 ->
    3.1 kHz free (shorter spokes at the true throat radius). Count pins updated
    by measurement (legacy 3520 -> 3584, refined 24,240 -> 24,480, quarter
    exactly /4 preserved). Solve gate re-run with the corrected piston: quarter
    vs full worst 0.128 dB (validate_sym now reads the wasm from
    reference/numcalc_solver_archive.html since the app solver left in entry
    86). Chromium end-to-end: the exported SourceDisc group measures exactly
    4.00 x 1.50 mm at z 0.000 for the 8x3 ribbon. 192 checks, fuzz clean.
92. (STEP + IWATA, 2026-07-14, Marwan relaying forum requests) (1) STEP EXPORT:
    engine stepFromMesh writes ISO-10303-21 AP214 faceted BREP -- per the merged
    schema's faceted_brep_shape_representation WR3, every shell face is a
    FACE_SURFACE with PLANE geometry (POLY_LOOP -> FACE_OUTER_BOUND ->
    PLANE(AXIS2_PLACEMENT_3D) -> FACE_SURFACE, 7 entities/triangle), CLOSED_SHELL
    -> FACETED_BREP -> FACETED_BREP_SHAPE_REPRESENTATION with mm SI units,
    uncertainty, and the full product block (PRODUCT ... SHAPE_DEFINITION_
    REPRESENTATION). Honest button label "STEP (FACETED)" -- STL fidelity in a
    CAD container; NURBS lofts are a future pass. Chromium real-click: 29,472
    faces, 9.8 MB, valid markers. (2) IWATA: family 'iwata' = jmlcEllWall +
    the DECOUPE from his Iwata_JMLC sheet (defaults EXACTLY his: fc 320, 1in
    throat, T 0.7071, aplat 4, decoupe n 0.3 / puissance 11). Implementation:
    past s_cut = (1-n)*sEnd the V axis FREEZES (the Iwata's parallel top/bottom
    plates) and H absorbs ALL remaining growth via a = r^2/b_frozen -- the
    per-station area law stays exact. The puissance cliff is approximated by
    the H/V loft's fixed blend (documented in-code; the true per-azimuth cut
    needs the calcul_3D decode, contours_decoupes = the validation artifact).
    UI family + decoupeN/decoupeP params; fuzz sweeps 13 families; smoke pins
    the frozen plates (20/20 tail stations), the exact area product, and the
    STEP schema structure. 195 checks, fuzz clean.
93. (THROAT TOGGLE, 2026-07-14, Marwan: "shouldn't we just do an option of square
    or round throat... as a toggle") A throat-shape SELECT (round / square /
    rectangle) now drives the entry-90 morph. Square = AREA-EQUIVALENT side
    rt*sqrt(pi) = throatD*0.8862 tied to throatD, so pi*rt^2 is preserved and
    the loading law + 1-D model stay exact with zero extra inputs; rect keeps
    the explicit W x H for ribbon drivers. Applicability: ribW/ribH visible only
    in rect mode, transition length hidden when round. Verified in Chromium
    through the real select: round {W hidden, L hidden} -> square {L only} ->
    rect {all}; square-mode horn generates clean. Entry-90 app regex updated
    (morph now takes effW9/effH9). 197 checks, fuzz clean (13 families).
93b. (NESTED-SELECT CRASH, 2026-07-14, Marwan: "there are a bunch of errors now")
    Entry 93 inserted the throat select INSIDE the section select's markup --
    real browsers DROP a nested <select>, so getElementById("throatSel") was
    null and its addEventListener threw on load. The id-scanning DOM harness
    cannot model nesting (it regex-collects ids from innerHTML), so 197 checks
    passed on a broken page. Fixed: throatSel now precedes sectSel as a sibling.
    NEW STRUCTURAL GUARD: a depth-scanner over the app markup fails the suite on
    ANY nested <select>. Chromium: zero page errors on load and through the full
    round -> square -> rect -> round cycle, both selects verified as siblings.
    198 checks, fuzz clean.
94. (THROAT TOGGLE REFINED, 2026-07-14, Marwan: "shouldn't the throat selector be
    above the Throat diameter option? and when you select rectangle shouldn't it
    hide the circular option? we do not need a pure square option") The select is
    now injected in the CORE param loop directly ABOVE the Throat diameter row
    (shape first, then size); options are round / rectangle only (square removed
    -- rect with W = H covers it). Selecting rectangle HIDES throatD entirely:
    the throat is defined by W x H and rt derives as sqrt(WH/pi) inside
    hornParams, so the loading law follows the actual rectangular area with no
    duplicate/conflicting inputs (the entry-90 disagree advisory is moot in rect
    mode). Switching to rect seeds W = H = throatD*0.8862 (area-equivalent), so
    the horn is UNCHANGED at the click -- verified in Chromium: mouth 460.3
    before and after the switch, throatD row hidden, seed 31.5 for the 35.56
    default, selector DOM-ordered above the diameter, zero page errors.
    198 checks, fuzz clean (13 families).
95. (RECT PLACEMENT + ALL GRAPHS ZOOMABLE, 2026-07-14, Marwan: "when you select
    the rectangle it doesn't go directly below the throat selector... also not
    all graphs are zoomable") (1) ribW/ribH/ribL moved in the PARAMS array to
    the entries immediately after throatD (render order = array order in the
    core loop); since throatD hides in rect mode, W/H/transition now render
    DIRECTLY below the throat selector -- Chromium: the visible rows after the
    selector in rect mode are exactly wrap_ribW, wrap_ribH, wrap_ribL. (2) The
    entry-89 zoom machinery generalized from #drawing alone to ALL six SVG
    containers (drawing, zchart, spchart, tchart, bwchart, dichart) via a
    forEach over the same wheel/pan/dblclick block -- Chromium: wheel over
    zchart/bwchart/dichart each changes its viewBox, zero page errors. Order
    and container-list smoke pins added. 200 checks, fuzz clean (13 families).
96. (SEMANTIC CHART ZOOM, 2026-07-14, Marwan: "when you zoom in on graphs should
    you keep the scales and only zoom in and out on the graph with the scales
    adjusting?") Yes -- the entry-95 viewBox zoom scaled axis text and left tick
    values stale. The four FREQUENCY charts (zchart, spchart, bwchart, dichart)
    now use SEMANTIC zoom: one linked frequency window (chartFWin, log-domain,
    cursor-anchored wheel, drag pan, dblclick reset, 20 Hz..40 kHz rails, ~12%
    span floor); the axes frame never moves, ticks re-grid from a 1-2-5 series
    (fTicks), and the 90-point sweep is RECOMPUTED inside the window -- zooming
    GAINS resolution instead of cropping. The chart block was extracted from
    update() into renderCharts() so wheel events re-render only the charts (the
    extraction initially took update()'s loop declaration with it -- caught by
    the harness as a ReferenceError, restored). Geometry views (drawing, tchart)
    keep the CAD-style viewBox zoom, which is correct for drawings. Chromium:
    viewBox byte-identical through 4 zoom steps (frame truly fixed), ticks
    100/500/2k/10k -> 500/1k/2k, all four charts show the SAME zoomed ticks
    (linked), dblclick restores, zero page errors. 200 checks, fuzz clean.
97. (VIEWBOX ZOOM-OUT FLOOR, 2026-07-14, Marwan: "zooming out on the 2D view
    should not infinitely go small, it should stop at the correct view we
    started with") The viewBox zoom (drawing + tchart) now FLOORS zoom-out at
    the original fit view: when the next step would exceed the stored __vb0
    dimensions in either axis, the viewBox snaps to __vb0 exactly (also
    recentering any pan drift) and further wheel-out holds there. Chromium:
    zoom in 3, wheel out 12 -> viewBox byte-equal to the start, zoom-in still
    live after the floor, zero page errors. Pin extended. 200 checks, fuzz
    clean.
98. (IWATA REWRITE FROM THE DECODED SHEET, 2026-07-14, Marwan: "You got Iwata
    completely wrong please fix it" + photos of the real clamshell) He was
    right -- the entry-92 V-freeze produced a 2 m monster; the real Iwata is a
    compact rolled saddle. FULL DECODE of his Iwata_JMLC calcul_3D (4005
    stations x 19 streamline columns x (r, Z, x, y, phi)): (a) columns are
    FIXED ellipse-parameter streamlines t = 90-5g deg whose geometric azimuth
    DRIFTS toward the H plane along the march; (b) pre-roll sections are true
    ellipses x = a cos t, y = b sin t (parameter match 0.3 deg) with
    z(t) = zH cos^2 t + zV sin^2 t (+-1.5 mm); (c) the H and V walls roll
    INDEPENDENTLY (H at z ~354, V at ~578 on his 320 Hz 1in example) so the
    ellipticity peaks at 2.50 ~55% through the march then INVERTS to 0.71 --
    unreproducible by any static morph (the entry-92 error) or two-parameter
    law; (d) his sheet stores the UNCUT march; the DECOUPE is a per-STREAMLINE
    CUT at readout, uCut(t) = 1 - n*|sin t|^p (measured on his surface:
    uncut 567 x 693 x 578 -> cut(0.3, 11) 567 x 371 x 534). IMPLEMENTATION: the
    family carries his surface as a normalized quarter-grid (65 x 19 x xyz,
    reference/jmlc_originals/iwata_grid.json, ~25 KB in-engine), scaled through
    OUR validated jmlc march at the user's (fc, rt, T) (anchor = rMax ratio;
    exact at his design point, principled scaling elsewhere); buildIwataRings
    cuts each streamline then resamples iso-fraction rings to uniform geometric
    azimuth with quadrant mirroring. App: iwata is a RINGS family now (preview,
    Akabak, STL interior, cloud exports); the returned V wall carries the cut so
    stats/charts reflect the physical horn; jmlcell is pure quasi-elliptical
    again (V-freeze removed). CONFORMANCE PINS: cut extents EXACT vs his sheet
    (566/371/534 vs 567/371/534), uncut within 3%, per-axis roll structure,
    no bFroz remnant. Chromium: renders through the real selector, zero page
    errors. 202 checks, fuzz clean (13 families).
99. (IWATA UI SANITY, 2026-07-14, Marwan: "doesn't seem like the iwata horn
    changes based on the sliders and also the initial defaults don't look
    sane") (1) INERT SLIDERS: aplat/ellMu/ellSigma/trunc/T0/entryDeg were
    visible for iwata but the decoded grid bakes the shape -- all removed from
    the family's param set (and iwata from LAW_FAMILIES). Live params are the
    real ones: fc + throat (scale anchor), decoupe n/p (the cut). Verified via
    real inputs in Chromium: n -> 0 visibly changes the horn. (2) DEFAULTS:
    his sheet example (fc 320) is a DOUBLE-size design; defaults recalibrated
    to the COMMERCIAL Iwata 300 footprint: fc 640, 1in, decoupe 0.3/11 ->
    284 x 186 x 267 vs the real 290 x 185 x 245 (W/H within 2%, depth 9% --
    his cut geometry vs the production part). (3) EXACT THROAT: the grid
    scaling left the ring throat at his-rt-times-scale; a correction factor
    (anchored on the H streamline -- the V streamline's throat x is 0 by
    symmetry, the first anchor read 0 and no-opped) now fades over the first
    12% of the march so the throat is exactly the user's radius (verified
    25.00 at rt = 25). 202 checks, fuzz clean (13 families).
100. (IWATA ROLLBACK FIX, 2026-07-14, Marwan: "the rollback on iwata gets really
    messed up" + striated-lip screenshot) TWO fold mechanisms in buildIwataRings:
    (a) rings were resampled by GEOMETRIC AZIMUTH, but in the rolled lip the
    streamline azimuths are NON-MONOTONE around a ring -- the azimuth scan
    FOLDED rings onto themselves; replaced by streamline-parameter-space
    sampling with each angle folded into the quarter (both axes land exactly
    when segs % 4 == 0, sign-mirrored -- the old quadrant indexing also never
    sampled the V axis, a seam). (b) adjacent streamlines were lerped at the
    same RELATIVE cut fraction = different ABSOLUTE march phases near the fold,
    so ring segments cut THROUGH the rolled lip (the striations); now the
    ring's local cut fraction interpolates uCut smoothly and BOTH streamlines
    are sampled at the SAME absolute fraction (clamped to their own cut).
    Grid densified 65 -> 181 stations (97 KB) while at it. RESIDUAL Laplacian
    energy at the +-60-deg columns on late rings = the GENUINE p = 11 cliff
    edge sweeping the lip, not an artifact. PERMANENT FOLD GUARDS in smoke:
    every ring's XY turning number = 1.0000 exactly (zero self-crossings) and
    zero meridian z-zigzags beyond the single natural roll flip (threshold
    scale-aware -- his source data carries mm-scale z wiggles). Conformance
    pins re-anchored at segs 72 (5-deg columns: every streamline lands exactly
    on a column; the cut peak lives ON g1): 566.7 x 371.7 x 534.5 vs his
    567 x 371 x 534. 203 checks, fuzz clean, Chromium zero page errors.
101. (SPIRAL + CONTROLLED ROLL CUT + THE HIDDEN-PARAM RULE, 2026-07-14, Marwan:
    4 screenshots -- rect-throat waist, a 2.5-turn spiral, "this roll back needs
    to be controlled cut", and "anything not used in a family needs to be hidden
    ... keep this as a general rule")
    (1) THE SPIRAL: a harness-driven hunt (drawn-path turning across all family
    sweeps) found iwata drawing ~840 deg at EVERY setting. Root cause traced to
    HIS OWN DATA: the sheet's uncut march COILS past the roll on low-t
    streamlines (g18's tail literally spirals twice inside the horn). Fix per
    Marwan's words: per-streamline CONTROLLED ROLL CUT -- each streamline
    truncates where its own planar turning reaches truncDeg (the jmlc
    convention), decoupe applying on top; trunc is a live iwata param again
    (default 268, UI cap 300). Conformance UNCHANGED (566.7 x 371.7 x 534.5 --
    the coils were interior). ALSO: iwata's 2-D profiles now read the ring
    meridians directly (the resampler contributed scrambling on the rolled,
    z-non-monotone walls). PERMANENT SPIRAL GUARD grafted into fuzz_harness:
    any drawn path turning > 400 deg fails the sweep loudly.
    (2) RECT-THROAT "WAIST": the drawn wall correctly starts at the rect
    half-width W/2 (< the area radius) while the throat bar/label showed the
    stale "Ø... (always round)" -- the label now reads "rect W x H (Ø-eq ...) --
    profiles show the rect half-widths"; a monotone guard in throatRibbonMorph
    prevents any true dip; the morph is EXCLUDED for iwata (grid throat).
    (3) GENERAL RULE (standing, all future families): ANYTHING NOT USED IN A
    FAMILY IS HIDDEN. Applied: throat selector hidden for rings families
    (wn / biradial / iwata -- specialized throats), iwata's section selector,
    flareR, flareWrap, thick hidden; ribW/H/L force-hidden for rings families.
    Chromium: iwata worst drawn turning 270 deg (was 840), throat selector
    hidden, trunc visible/live, flareR + section hidden, hypex rect label
    correct, zero page errors. 205 checks, fuzz clean + no spirals (13
    families).
102. (IWATA FIXED PROPORTIONS, 2026-07-14, Marwan: "are you sure that the throat
    is correct? I do not see this narrowing throat in other iwata horns") He was
    right again -- the "narrowing throat" WAS the entry-99 correction factor: a
    bulge fading over the first 12% of the march whenever the requested throat
    exceeded the grid's natural one (at the fc-640 defaults it was a full 2x
    bulge). The honest model: his quasi-Iwata is ONE fixed-proportion shape.
    fc alone sets the scale (size = 320/fc), the throat FOLLOWS the geometry
    (throat_r = 12.7 mm * 320/fc), the correction machinery is deleted, and
    throatD is HIDDEN for iwata (the general rule) with the resulting throat
    REPORTED in stats ("Throat \u00d8 (fixed by geometry) ... 1 inch at fc 320").
    Defaults stay fc 640 (the commercial-footprint half-scale, 12.7 mm throat);
    fc 320 = his full sheet design with the 1-inch throat. Conformance at his
    design point unchanged to the decimal (566.7 x 371.7 x 534.5, throat r
    12.70). New pin: throat r = 12.7*320/fc exact + NO narrowing in the first
    15% of the march. Chromium: throatD hidden, stats line correct, zero page
    errors. 206 checks, fuzz clean + no spirals.
103. (IWATA GENERATIVE DECODE — SESSION 1, 2026-07-14, Marwan: "yes" to
    implementing his generative march so fc and throat become independent)
    calcul_expansion (4043 x 101) decoded to its marching state; the
    recurrence's KINEMATICS ARE FULLY CRACKED: col0 = cumulative marched arc
    s (uniform ds = 0.19890 = maxLen/3600); col1 = the WAVEFRONT CAP AREA
    following EXACTLY our hypex law S0*(cosh(ms/2)+T sinh(ms/2))^2 at s
    (ratio 1.0000 every probed row -- his law IS our validated jmlcWall law);
    19 azimuth groups (A, B, C, D, E) per row with (D, E) = wall-ring point,
    C = step direction / K (K = 5.0335, exact at all angles), and B = THE
    NEXT TURN INCREMENT (ddir = K*B exact, 5.039-5.040 across azimuths and
    rows); every azimuth advances the SAME ds per step (isophase, verified
    to 5 digits). The state is SELF-CONTAINED on the ring (interior
    wavefronts are plot output only). ONE unknown remains: the rule
    generating B_g (per-azimuth turn rate = the area constraint + the
    aplatissement weighting; measured B18/B0 ramps 1.60 -> 5.84 over the
    march, wall ellipticity emerges 1 -> 2.5 -> 0.70). Full dossier with
    measured validation schedules and the next-session test plan:
    reference/jmlc_originals/IWATA_GENERATIVE_DECODE.md. No app changes this
    session (the fixed-proportion family stands until iwataGen validates).
104. (DRIVER PLATE + STRAIGHT ENTRY, 2026-07-14, Marwan: "option to add a driver
    plate with the screw size and the screw hole radius with some defaults for
    different throat sizes... Also I noticed some throats are curved which is
    not great for compression drivers")
    (1) DRIVER MOUNTING PLATE: engine buildDriverPlate -- flat annular flange
    at the throat (0.6 mm overlap into the wall so slicers union), N REAL
    circular bolt through-holes via a watertight polar-grid construction
    (4x4-cell block cut per bolt, 16-vertex boundary stitched to a 16-gon
    hole + bore; edge-manifold verified: every edge exactly 2 tris). Standards
    defaults (web-verified: Parts Express DCX464 "4-Bolt"; 1.4in class = 4
    bolts on 101.6 mm BC per FaitalPro HF142 refs; 1in bolt-on = 76.2 BC,
    screw-on 1-3/8-18 noted): driverPlateDefaults -> 1in: 3x M6 / 76.2;
    1.4in+: 4x M6 / 101.6; clearance 6.5 mm; ALL user-overridable (0 = auto),
    UI note says verify against the driver datasheet. Merged in
    buildStyledMesh -> STL/OBJ/STEP + the 3-D viewer automatically; solid
    families only. (2) STRAIGHT DRIVER ENTRY: engine straightEntry -- the
    first exitLen mm of both plane walls replaced by a straight segment at the
    driver's exit angle (INCLUDED-angle convention, tan(deg/2)) from exactly
    wall[0].r, then a C1 Hermite blend over the next exitLen into the family
    wall; untouched past 2L. Applied in profOf for prof-path law families
    (cd keeps its designed entry; rings families their specialized throats --
    the rule). Sub-params follow their masters (exitDeg under exitLen, bolt
    params under plateT). Chromium end-to-end: subs toggle via real inputs,
    the captured STL grows by the plate's ~13k triangles, zero page errors.
    Fuzz sweeps the new params. 209 checks, fuzz clean + no spirals.
105. (SMOOTH LIP BULLNOSE, 2026-07-14, Marwan: "why does the lip here have an
    edge and is not smooth") Two stacked causes at the solid's mouth lip:
    (a) the bullnose was a perfect SEMICIRCLE keyed to the INNER rim chord --
    but the outer shell is a DISCRETE normal-offset, so over the sharply
    curving roundover its rim chord tilts by ~t/R (17 deg at t6/R20) and the
    semicircle landed on the outer surface with a real crease; (b) RO = 8 arc
    steps = 22.5 deg per facet, visible at close range. Fix: the bullnose is
    now a cubic HERMITE matching the MEASURED chord tangent at EACH rim
    (C1 at both junctions by construction, semicircle-equivalent tangent
    magnitude pi*t/2), RO = 20. Measured meridian turn profile through the
    lip: 3.2 -> 11.8 -> 3.4 deg, perfectly symmetric, junction steps 5.6 deg
    BELOW the interior curvature (no spike). Solid stays watertight (edge-
    manifold 0 bad). Pin: junction turns < 8 deg, max step < 14. 210 checks,
    fuzz clean + no spirals.
106. (PLATE REFINEMENTS, 2026-07-14, Marwan: "you can see inside the horn a lip
    and the bolt screws look weird... some drivers may need bolt rotation and
    is 20 mm really the max for large horns?") (1) THE LIP: the plate's straight
    bore protruded past the FLARING wall inside the 0.6 mm union overlap -- the
    bore now CONES open through the overlap, following the wall's local radius
    at z = 0.6 (+0.05 clearance): nothing enters the airway (pinned: top bore
    radius exact). (2) SQUARE-LOOKING HOLES: the 16-gon rim was sampled at the
    cut block's NON-UNIFORM boundary angles (corners cluster); now a TRUE
    uniform 16-gon phased to the boundary walk (rim spacing max/min 1.00, was
    ~3). (3) boltRot param (0-120 deg): rotates the whole rotationally-
    symmetric plate = exact pattern rotation with the watertight grid
    untouched. (4) plateT max 40 mm, plateD max 320. Watertight preserved
    (edge-manifold 0 bad). Chromium: params live, zero page errors.
    211 checks, fuzz clean + no spirals.
107. (CRISP PLATE SHADING, 2026-07-14, Marwan: "still same issues and now you
    have smoothing on the plate... we do need some sharp edges in the plate
    and around the driver") The diamond-looking holes were SHADING, not
    geometry: the merged mesh shared vertices across the plate's top face,
    bores and rims, so computeVertexNormals smeared every feature edge and
    the boundary-to-rim transition ring rendered as a rotated-square
    depression. Fix: buildDriverPlate now emits REGION-SPLIT vertices (top
    face, bottom face, outer rim wall, bore cone, per-hole bore walls each
    own their vertices; 1408 duplicated seam edges) -- planar faces get flat
    normals, cylinders stay smooth within themselves, every feature edge is
    SHARP. Printability: validateMesh gained a positional WELD pass (1e-4)
    before edge accounting -- closed-after-weld IS printable-closed (slicers
    weld by position); the plate welds to 0 boundary / 0 non-manifold edges
    and reports watertight. Pins updated (rim copies dedupe, weld-based
    manifold) + a new crisp-shading pin. 212 checks, fuzz clean + no spirals.
108. (PLATE: HORN-CURVE BORE + ORIENTED, TRULY ROUND HOLES, 2026-07-14, Marwan:
    "still inside the plate there is a ring -- we need to follow the inside
    horn curve and have that cut through the plate. There are still these
    weird boxes around the mounting holes")
    (1) THE RING: the bore was ONE straight cone from -T to +0.6, so at z = 0
    it overshot the throat by ~1.3 mm -- a visible step ring at the junction.
    buildDriverPlate now takes boreProf [{z, r}]: the bore SWEEPS the horn's
    own inner profile through the plate (stations at 0/0.2/0.4/0.6 from the
    real walls + straight driver bore below the throat). Pinned: bore radius
    at z = 0 EQUALS the throat to 1e-3.
    (2) THE BOXES were flipped triangles: an orientation audit found the ENTIRE
    top/bottom faces wound inward (5056/5184 flipped) plus crossed ring quads
    at the block corners. All windings corrected per-region (audited outward:
    faces, rims, bores, hole walls); the boundary-to-hole ring is now a FAN at
    INTERPOLATED boundary angles onto a 48-gon rim -- monotone by construction
    (cannot cross, no T-junctions), max chord 10 deg = 0.012 mm sagitta
    (visually perfect circles), crisp wall-owned hole edges kept. Zero flipped
    face triangles, watertight after weld. Legacy 104/106 pins updated to the
    fan construction; new orientation + no-step + roundness pins. 214 checks,
    fuzz clean + no spirals, Chromium zero page errors.
109. (RECESSED PLATE BORE, 2026-07-14, Marwan: "The inside of the horn is still
    not smooth. The plate may need to be a mm smaller to not extrude in the
    horn. The plate holes are fixed") A vertex audit showed ZERO geometric
    penetration -- the "not smooth" was the bore ring sitting EXACTLY
    coincident with the horn's throat ring at z = 0: different polygon counts
    (plate nP vs horn segs) meant the plate's finer polygon sat fractionally
    proud between the horn's facet vertices, and the region-split shading met
    the smooth wall in a visible ridge/seam ring. Per Marwan's own suggestion
    the plate is now RECESSED: bore r = wall + ~1 mm (rec = clamp(thick-1.5,
    0.4, 1.0)) through the whole z >= 0 union region (buried in the wall,
    NEVER rendered from inside -- the horn's own wall is the only interior
    surface), straight driver bore at the throat radius up to z = -0.6, short
    lead-in chamfer between. Verified: min clearance 1.12 mm behind the inner
    wall across the union region, zero coincident throat-ring vertices,
    watertight after weld. Entry-108 pin superseded accordingly (driver-side
    bore = rt; z >= 0 clearance >= 0.3). 214 checks, fuzz clean + no spirals.
110. (FLUSH INTEGRATED PLATE, 2026-07-14, Marwan: "I dont think the driver plate
    is mounted correctly... the horn is still curved also at the throat. The
    driver plate should be flat with the horn mouth and not in front of it and
    the inside hole of the driver plate should follow the expansion of the
    horn") THE CORRECT MOUNTING MODEL: the plate now occupies the FIRST plateT
    mm of the horn (z in [0, plateT]) instead of hanging BEHIND the throat as
    a spacer (which added a plateT-long straight tube between driver and
    flare). Back face FLUSH with the throat plane -- the driver bolts on at
    z = 0 and the expansion starts AT the driver face and runs THROUGH the
    plate. The bore follows the horn's inner profile (5 stations, proper
    interpolated wallItp9) + the entry-109 ~1 mm recess, so the horn's own
    wall remains the only interior surface. Engine: zTop = z0 exactly (no
    +0.6 overhang); 110b: INDEPENDENT per-face row arrays (the bore's ends
    differ when following the expansion; the shared rows made the top face's
    first ring run INWARD -- 288 flipped tris + a 19.84 rim stray), sheared
    to pin the bolt circle at the same index so the holes stay vertical.
    Verified: plate spans [0, plateT] exactly, zero flipped face tris, front
    hole = wall(plateT) + rec exact, min 1.0 mm recess clearance across the
    depth, watertight after weld. All five plate pins rewritten to the flush
    convention. 214 checks, fuzz clean + no spirals, Chromium zero errors.
111. (LIP STYLES, 2026-07-14, Marwan: "the horn lip is rounded not straight it
    needs to be straight... Also all the horns have this little lip around the
    mouth... This needs to be smoother and more elegant") (1) NEW MOUTH LIP
    SELECT (generated from state, rule 3a; rendered directly above the mouth
    params): "rounded (bullnose)" (default) / "straight (square cut)". The
    straight style terminates the solid with a FLAT annular end face using
    SPLIT (crisp) vertices -- machined square edges, welds closed, watertight.
    Engine: buildSolidMesh(..., lipStyle). (2) The rounded bullnose is refined
    RO 20 -> 28: junction turns 4.0 deg (was 5.6), max step 8.5 (was 11.8) --
    the faint lip line softens. Pins: entry-105 pin tightened (junctions < 6,
    max < 10, RO expression), new straight-lip watertight + UI pin. Chromium:
    the select toggles live, zero page errors. 215 checks, fuzz clean +
    no spirals.
112. (USER FEEDBACK BATCH, 2026-07-14; external users via Marwan) Five items:
    (1) LIMITS: rect throat W/H max 200 -> 320 mm (Stage Accompany 8535 ribbon
    is 216 mm tall); throatD max 76 -> 120. (2) BEM DENSITY: bemFSel select
    (lambda/6 honest to 20 / 40 / 90 kHz -> element budgets 6k / 24k / 90k;
    default 20 kHz -- the 65k-element complaint becomes ~3-6k, hours -> minutes).
    (3) STICKY PANEL (constant visual feedback): the aside is its own sticky
    scroll pane -- put a chart in view, scroll INSIDE the panel to any control,
    the chart never leaves the screen. (4) SAVE/LOAD: SAVE DESIGN downloads
    {hsDesign:1, state:S} JSON; LOAD applies with known-key-only merge and
    silent control sync (no dispatch -- family defaults cannot clobber loaded
    values); plus localStorage autosave every update with boot restore
    (verified round-trip through a real page reload). (5) NURBS STEP: the
    faceted BREP imports into Fusion as a de-facto mesh; new exNurbs button
    writes ONE bicubic B_SPLINE_SURFACE_WITH_KNOTS globally INTERPOLATED
    through the inner ring grid (banded/dense solves per direction, de Boor
    self-test max error 1.3e-13 mm at all grid points; stations downsampled
    to <= 120 for the cubic-cost solve; ~360 KB, 2.4 s in-browser), STEP graph
    fully resolved (0 dangling refs), AP214 mm units, ADVANCED_FACE +
    OPEN_SHELL + MANIFOLD_SURFACE_SHAPE_REPRESENTATION -- inner surface only,
    thicken in CAD; the faceted STEP remains for direct solids. 217 checks,
    fuzz clean + no spirals, Chromium: NURBS blob captured live for jmlc
    (379 KB) + tractrix (427 KB) + iwata rings (442 KB), autosave round-trip,
    sticky pane computed, zero page errors. LESSON (112b): downsampling
    prof.H/V by hand desyncs the parallel per-station arrays buildRings
    reads -- ask profOf for the station count instead (profOf(lastAct, 110));
    also profOf REQUIRES the n argument (the first live-click crash the DOM
    harness could not see -- Chromium caught both).
113. (EXPORT VALIDATION BATTERY, 2026-07-14, Marwan: "I do not have Akabak or
    Solid works so u will have to test this stuff yourself and double check
    that it works dont let me down") Real export blobs captured through the
    live UI (capture_exports.js) and validated with INDEPENDENT parsers
    (validate_exports.py): (1) the REAL GMSH SDK (pip gmsh -- AKABAK's exact
    format) ACCEPTS all three densities: 10,880 / 26,240 / 96,096 triangles at
    20/40/90 kHz with SourceDisc + HornWalls groups intact (the density
    selector verified end-to-end: default is ~9x lighter than the old
    always-max); (2) steputils Part-21 parses BOTH STEP files (NURBS 5,748
    entities; faceted 235,462); (3) the NURBS surface RE-DERIVED from the
    exported file text alone (python de Boor, no Horn Studio code) IS the
    horn: throat ring circular to <1e-3 mm at the design radius, mouth ring
    circular, expansion monotone, knot-multiplicity sums exactly nCtrl+deg+1
    both directions (the rule CAD kernels enforce); (4) numpy-stl loads the
    solid STL, zero degenerate triangles, positive volume (consistent outward
    orientation). Deps for reruns: pip gmsh steputils numpy-stl; apt
    libglu1-mesa libxft2 libxrender1 libxcursor1 libxinerama1 libxfixes3
    libxi6. Both scripts live in the repo.
114. (BEM: HONEST TARGETS + QUARTER SYMMETRY, 2026-07-14, Marwan: "is the BEM
    mesh good now or can it be even simpler") Two findings: (1) entry 112's
    density selector only changed the element BUDGET while fTop stayed 10 kHz
    -- the "lambda/6 to X kHz" labels were not honest. Now fTop = the selected
    frequency AND a per-tier budget (8k / 30k / 120k): small horns get truly
    honest meshes; big horns cap at the budget and the note reports the TRUE
    achieved lambda/6 ceiling. (A pure-honesty attempt without budgets
    exploded a 460 mm horn to ~130k elements at 20 kHz -- "honest" but exactly
    the user's original complaint; target + cap + honest reporting is the
    right design.) (2) QUARTER SYMMETRY: new bemSymSel wired to the NATIVE
    entry-78 quarter construction in buildBEMProject (symmetry: "quarter";
    rings families and fins ineligible, guarded at the call site) -- ~4x fewer
    elements, superlinear solve speedup; the note tells the user to enable
    BOTH symmetry planes in the solver. Verified with the real GMSH SDK:
    quarter 3,496 tris vs full 13,984 (4.00x), groups intact, cut-plane nodes
    exactly on both planes. An initial post-filter bemSymmetryCut was written
    then DELETED on discovering the superior native path -- check for existing
    machinery first. 218 checks, fuzz clean + no spirals.
115. (MOBILE LAYOUT, 2026-07-14, Marwan: "doesnt work well on mobile when you
    make the browser smaller it drops the horn viewer down but the slider menu
    is still sticky") The entry-112 sticky panel is only correct in the
    two-column layout; when the flex columns wrap on a narrow viewport, a
    full-height sticky panel pins itself over everything. Fix: @media
    (max-width: 900px) -- the aside returns to static flow at full width
    (border moves bottom) and the 3-D viewer shrinks to 280 px. Verified live
    at both viewports (1400 px: sticky; 420 px: static, full-width panel,
    280 px viewer), zero page errors. 219 checks, fuzz clean + no spirals.
116. (MATHEMATICS FIRST, 2026-07-14, Marwan: "move this text to the bottom and
    show the mathematics above it in a more elegant way using beautiful
    mathematical notation") The #eqs block is reordered: a typeset MATHEMATICS
    card (native MathML -- no library, file stays self-contained) renders
    FIRST with a family-named eyebrow ("MATHEMATICS -- JMLC ISOPHASE"), the
    method prose moves below under METHOD NOTES. Typography: .mathcard --
    hairline panel, centered 19 px display equations (16 px under the 900 px
    breakpoint), annotations (mtext) quieted to 72% in var(--faint),
    horizontal overflow scrolls. Verified live: card first, MathML measured
    actually rendering (box height), zero page errors. 220 checks, fuzz
    clean + no spirals.
117. (MATH TYPOGRAPHY, 2026-07-14, Marwan: "math can be on a white BG... are
    you able to draw the equations with a more elegant font?") The .mathcard
    is now white paper (#FFFFFF, equations in near-black #111 at 20 px) and
    the equations get a proper math font stack: "STIX Two Math" (ships with
    macOS -- Marwan's platform), "Latin Modern Math" (TeX systems),
    "Cambria Math" (Windows), XITS/Asana fallbacks, then the CSS `math`
    generic. Annotations (mtext) switch to the app's mono at 70% faint --
    equations in serif math type, commentary in drawing-sheet mono. Verified
    live: white computed background, the stack applied, MathML rendering.
    220 checks, fuzz clean + no spirals.
118. (MATH POLISH, 2026-07-14, Marwan: "make the math be black ink on white bg"
    + "remove the border around the math") .mathcard is now borderless open
    white paper; equations in pure black (#000). Pin updated (no border rule,
    black ink). 220 checks, fuzz clean + no spirals.
119. (FULL-WIDTH MATH + NOTES, 2026-07-14, Marwan: "why is the math and the
    notes section not the full width?") #eqs was laid out as a SIXTH CHART
    TILE -- a flex item in the .lower charts row with flex 1 1 250px and
    max-width 400px, so the math and prose squeezed into a chart-sized
    column. Now its own full-width band under the charts (flex 1 1 100%,
    hairline top rule): the math card centers at a 760 px reading measure on
    open paper; the method prose flows in datasheet columns (CSS columns
    320px x 3, <br> separators promoted to real paragraphs, break-inside
    avoid). Verified live at 1500 px: band spans main, card centered,
    3 columns, 3 paragraphs, zero page errors. 221 checks, fuzz clean +
    no spirals.
120. (BRANDING, 2026-07-14, Marwan: "move this copyright to the bottom... make
    silence please black... and if you are able to use my logo") The header
    eyebrow wordmark is replaced with Marwan's real SILENCE_PLEASE.svg
    (path-based, 3 KB, embedded inline at 133x13 with role=img/aria-label,
    black ink), tagline ACOUSTIC INSTRUMENTS beneath. The (c) 2026 / CC
    BY-NC 4.0 line moves from the header to the FOOTER right span. Verified
    live: logo renders (measured width), path computes black, copyright in
    footer and gone from header, zero page errors. 222 checks, fuzz clean +
    no spirals.
121. (COMPACT HEADER, 2026-07-14, Marwan: "put the silence please logo on the
    right side with acoustic instruments and the horn studio on the left...
    Its taking too much space") The header no longer stacks four brand lines:
    HORN STUDIO + construction tagline lead on the left (.ttl), the Silence
    Please wordmark + ACOUSTIC INSTRUMENTS sit right-aligned in a new .brand
    block (margin-left:auto, header align-items:center). Header height ~160
    -> 99 px. Verified live: brand right of the 60% line, logo rendering,
    h1 first in .ttl, zero page errors. 222 checks, fuzz clean + no spirals.
122. (ONE-LINE HEADER, 2026-07-14, Marwan: "may need to be kept on the same
    line as horn studio") At mid widths the header wrapped into three stacked
    rows (title / stat boxes / brand). Now flex-wrap:nowrap above the mobile
    breakpoint: the title can shrink, the stat boxes compress (8x9 padding +
    20px h1 between 901-1280px), the brand never wraps (flex 0 0 auto,
    nowrap); mobile keeps wrapping. Verified live at 1000/1146/1500 px:
    HORN STUDIO and SILENCE PLEASE vertically centered on the SAME line at
    all three, header 75-99 px. 222 checks, fuzz clean + no spirals.
123. (DOUBLE LINES, 2026-07-14, Marwan: "why are there double lines here") The
    `.tb div` selector matched the NESTED .k/.v divs as well as the boxes --
    every label and value carried its own border-right and 12x14 padding (the
    doubled separators AND the bloated boxes since forever). Scoped to direct
    children (.tb > div) with an explicit inner reset. Header drops to 67 px
    as a side effect (the phantom padding is gone). Verified computed styles
    live: inner border/padding 0, box border 1px. 222 checks, fuzz clean +
    no spirals.
124. (SIMPLER HEADER, 2026-07-14, Marwan: "should we just have this be simpler:
    MULTI-FAMILY HORN CONSTRUCTION / PETF / WEBSTER LOADING") Yes -- the four
    stat boxes (FAMILIES/METHOD/LOADING/UNITS) were static filler duplicating
    the family select. Removed entirely (markup + all .tb CSS; tbFam updater
    null-guarded). The header is now: HORN STUDIO + the one-line tagline on
    the left, the Silence Please brand on the right. 67 px, one line, verified
    live at 1280 px. 222 checks, fuzz clean + no spirals.
125. (TAGLINE, 2026-07-14, Marwan) Header tagline reduced to just
    MULTI-FAMILY HORN CONSTRUCTION (PETF / WEBSTER LOADING dropped).
    222 checks, fuzz clean + no spirals.
125. (TWO MARKS, 2026-07-14, Marwan: tagline to just "MULTI-FAMILY HORN
    CONSTRUCTION", then "lets just keep silence please and horn studio and
    remove the rest") The header is now exactly two marks: HORN STUDIO (left)
    and the SILENCE PLEASE wordmark (right). Both taglines removed. 52 px,
    one line, logo rendering, verified live at 1280 px. 222 checks, fuzz
    clean + no spirals.
127. (NEAR-EQUILATERAL BEM MESHING, 2026-07-14, user via Marwan: "the triangles
    on the throat and behind it are quite narrow slivers which creates
    problems for BEM as it tends to work better for equilateral triangle
    elements... a bit too fine even in the coarse setting") Measured baseline:
    28% of elements OVER 8:1 aspect (worst 23:1), clustered at the throat
    wall/shell exactly as reported. Three changes, ALL GATED to the budgeted
    app path (opts.budget) so explicit-count callers/pins keep exact legacy
    behavior: (a) the station metric divides by the LOCAL element width
    (perimeter/segs) -- uniform slicing then equalizes ASPECT, packing
    stations where the horn is narrow; (b) nSta derives FROM the metric total
    (opts.stations is the cap); (c) when the budget binds, segs and stations
    are BALANCED (shrink segs, recompute the metric, <= 3 iterations) so
    elements stay near-SQUARE at whatever size the budget affords -- uniform
    coarse beats fine-but-sliver for BEM conditioning; fMax reports the truth.
    bemBandSize: segs = perimeter/eT (square at the mouth; the old eT/2
    doubled azimuthal density for nothing). RESULT on the default at the 8k
    tier: aspect histogram [<2, 2-4, 4-8, >8] went [4756, 3596, 3712, 4640]
    -> [7848, 1296, 144, 216], worst 23 -> 16.6; the 216 residual slivers are
    the DISC-CENTER fans (r 0-6), inherent to fixed-PTS discs -- BACKLOG:
    graded 2:1-coarsening disc rings. Dead ends preserved: capping the metric
    width by targetEdge exploded radial slivers at the mouth (worst 347);
    un-gated weighting starved fixed-count meshes at the mouth (reg-22 fMax
    2686). GMSH re-validates full + quarter; pin: >= 75% under 2:1, <= 3%
    over 8:1 on the budgeted path. 223 checks, fuzz clean + no spirals.
129. (MESH DEEP-DIVE: MEASUREMENTS + ROADMAP + QUALITY REPORT, 2026-07-14,
    Marwan: "go extremely deep on other ideas for optimizing the mesh")
    Measured the element budget by region: walls dominate at constant
    PTS=104; the throat is 18x over-resolved azimuthally (0.77 mm elements
    against the 4 mm target). QUANTIFIED the remaining levers: (1) GRADED
    WALL BANDS (per-station azimuthal counts tracking local perimeter,
    zipper transitions) = measured 2.21x element reduction at identical
    quality (60.6k -> 27.5k inner-wall-equivalent) -- full design written,
    all machinery proven by entry 128's discs; (2) INFINITE-BAFFLE export
    (inner + source only, the Ath-style profile most waveguide users run) =
    another ~2x; (3) roll-pinch options; (4) per-region eT multipliers;
    rejected: Laplacian smoothing / valence / node-order. Combined ceiling
    ~an order of magnitude below today (default horn ~1.5k elements,
    baffle-mounted quarter, 4 mm quality). Designs + audit battery spec in
    reference/BEM_MESH_ROADMAP.md -- the graded-wall REWRITE is deliberately
    DEFERRED to a fresh session (too structural for end-of-session budget;
    never destroy validated work). SHIPPED NOW: buildBEMProject returns
    qUnder2/qOver8/qWorst and the export note states "quality: X% under 2:1
    aspect, worst Y:1" alongside the lambda/6 honesty (verified live: 87%
    under 2:1, worst 9.1, 13,120 elements at the 4 mm tier). 223 checks,
    fuzz clean + no spirals.
129b. (RE-EVALUATION, 2026-07-14, Marwan: "can you evaluate again") Fresh
    battery against the shipped build, live captures: GMSH accepts all four
    (quarter 2,828 / 4mm 11,488 / 2.9mm 24,472 / 1.4mm 91,376), STEP x2
    parse, STL zero degenerates. QUALITY: the live 4 mm export measures 95%
    under 2:1 aspect (10,952/11,488), worst 10.9, SourceDisc worst 2.16,
    closed 2-manifold. NEW FINDING: the QUARTER disc's worst is 4.9:1 -- four
    small hub tris at the azimuth-0 cut seam (edges 0.76-3.7 mm, all under
    eT; zipper tie-advance fans at the quadrant start + full-circle parameter
    bookkeeping on the quarter-arc rim). Diagnosed + roadmapped (fix rides
    with the graded-walls session); not needle-class. Suite green.
130. (BOUNDARY LAB RESEARCH, 2026-07-15, user via Marwan: "single element
    size... brute force... think about linking up with galucha's boundary
    lab program or look at his mesh plugin") Researched Boundary Lab
    (open-source bempp-cl/Julia-CUDA BEM GUI for freestanding speakers,
    reads Ath4 or external meshes via meshio; "mesh plugin" = Fusion2Msh).
    VERIFIED meshio 5.3.5 -- bLab's exact reader -- loads our .msh exports
    with SourceDisc/HornWalls groups intact: the Horn Studio -> Boundary Lab
    pipeline is format-compatible today (one Windows test pending: units /
    velocity BC / normal conventions). Interop analysis + the blab-server
    API idea (in-browser Horn Studio posting meshes to a local GPU solver)
    written into reference/BEM_MESH_ROADMAP.md section 7. The single-size
    critique is answered by the queued graded-walls session (2.21x,
    entry 129 design).
131. (MESH2HRTF GRADING STUDY, 2026-07-15, Marwan uploaded Mesh2HRTF-master
    .zip: "Here is the gmsh code") Not gmsh -- better: the ARI repo holding
    the PUBLISHED a-priori BEM grading plugin (Ziegelwanger/Majdak/Kreuzer,
    OpenFlipper IsotropicRemesher / Botsch-Kobbelt) AND the canonical NumCalc
    source (our archived WASM solver's home). Extracted the full algorithm +
    sizing laws (power and cosine g(d/W) ramps between l_min and l_max from
    a focus region). Decisions recorded in BEM_MESH_ROADMAP.md sec. 8:
    Route A (structured graded rings) stays primary and ADOPTS their smooth
    cosine ramp for band counts; Route B (JS Botsch-Kobbelt polish pass with
    EXACT analytic re-projection -- we own the surface, they only had a BSP
    copy) optional later for full exports. LGPL respected: algorithms +
    citations only (SOURCES.md updated), no code into the CC BY-NC file.
132. (GRADED WALL BANDS -- THE FLAGSHIP, 2026-07-15, Marwan: "lets make the
    best meshing tool that can work with both Akabak and boundary lab")
    Executed roadmap sec. 1. Architecture: bemOuterOffset extracted verbatim
    (entry-78 continuity-anchored normals, single source of truth);
    bemGradedWallAssembly builds per-station azimuthal counts n_i tracking
    local perimeter (full-circle convention, %4, snap x4, 2:1 ratio-limited
    both directions, mouth ring = segs exactly), sections + outer offsets
    sampled per DISTINCT count through the validated buildRings +
    bemOuterOffset pipeline, bands stitched by a midpoint-rule zipper
    (balanced seams -- fixes the entry-129b quarter hub fan); discs grade
    from the small throat rims (full-count convention, quarter arcs clamped
    no-wrap). Wired into buildBEMProject's budgeted prof path only (legacy +
    rings paths untouched; nodes/tris/nSrc/NV flow into the shared
    stats/orientation/fins/text tail). Station metric on the graded path uses
    the EFFECTIVE mouth width (uniform-arc spacing at eEff; the old
    local-width packing was for constant counts and made 2-4:1 walls).
    MEASURED (default jmlc, 4 mm tier): 13,120 -> 6,208 elements (2.11x),
    fMax 1,388 -> 2,603 Hz (honesty nearly DOUBLED at the same budget), 94%
    under 2:1, worst 3.0 (was 10.9), ZERO over 4:1 -- the mouth-roll pinch
    and the quarter hub seam both eliminated; quarter 1,552 elements same
    quality; 2.9 mm tier 12,208 at fMax 3,606. Live captures: 4 mm full
    4,128 / quarter 1,032; 1.4 mm tier 28,608 vs 91,376 (3.2x -- grading
    pays more at finer tiers). DUAL-SOLVER: every tier validated through
    BOTH readers -- gmsh SDK (AKABAK) and meshio 5.3.5 (Boundary Lab) --
    groups intact; export note now carries per-solver import guidance.
    Pin rebaselined: >= 90% under 2:1, ZERO over 8:1, disc < 2.75, < 8k
    elements at the 4 mm tier. 223 checks, fuzz clean + no spirals.
133. (BEM TARGET SELECT, 2026-07-15, Marwan: "Is it the same export for both
    or do we need an export mesh small window with options") Same GMSH 2.2
    .msh serves both solvers; the ONE real divergence is quarter symmetry
    (AKABAK-only -- Boundary Lab solves freestanding full meshes; a quarter
    fed to bLab would be silently wrong physics). Instead of a modal: a
    bemTargetSel [AKABAK / Boundary Lab] above the symmetry select. bLab
    target FORCES the full mesh (symReq9 gated on !blab9), disables the
    symmetry select, names the file blab_bem vs akabak_bem, and swaps the
    note's import guidance per target. Button relabeled EXPORT BEM MESH.
    Verified live in Chromium: bLab+quarter-selected exported the FULL
    4,128-element mesh with the blab filename and a disabled symmetry
    select; switching back to AKABAK re-enabled quarter and exported 1,032
    elements. 224 checks, fuzz clean + no spirals.
134. (BAFFLE MODEL + CAP SOURCE + MESH PREVIEW, 2026-07-15, Marwan: "Lets make
    all changes I want this to be the best mesh ever for BEM go deep on every
    research existing online") Research (Ath user guides + the ABEC build
    threads): Ath's Source.Radius is a spherical cap, -1 = auto; ABEC SimType
    1 = Infinite Baffle is a first-class mode; the community interface lesson
    is planar rims + aligned vertices. SHIPPED, all on the graded budget path:
    (1) INFINITE-BAFFLE model (bemModelSel): source disc + inner walls only,
    open mouth rim for the solver's baffle plane -- no shell/flange/back;
    orientation set EXPLICITLY by the source-disc mean normal (+z into the
    horn; no volume test on an open surface); rim planarity measured and
    reported (warns > 2 mm for rolled mouths); AKABAK-only (disabled for
    bLab, which is freestanding-closed); filename akabak_baffle_bem.
    MEASURED: 3,008 vs 6,208 elements (2.06x), rim span 0.00 mm, exactly one
    boundary loop, zero non-manifold. (2) SPHERICAL-CAP source (bemSrcSel):
    dome through the throat rim at R = r_throat/sin(theta_wall) -- the
    wavefront-perpendicular auto rule matching Ath's Source.Radius = -1;
    graceful flat below 0.02 sin; rim fixed (watertight, grading intact);
    ribbon throats guarded. capDepth reported in the note. (3) BEM MESH
    PREVIEW (bemPrevBtn): the EXACT export mesh as wireframe in the 3-D
    viewer (unique edges, SourceDisc dark), built through the new shared
    buildCurrentBEM() so what you see is what solves; try/catch-guarded;
    updates with every parameter change. VERIFIED with THREE actually
    RUNNING for the first time (cdnjs is sandbox-blocked; three@0.128 from
    npm + request interception -- prev_test.js is the new viewer-check gold
    standard): 27,816 wireframe pixels painted, zero page errors; baffle+cap
    export through the live UI (tractrix, 1,924 elements, correct filename);
    gmsh + meshio accept the baffle+cap file, groups intact, cap z-span
    0.89 mm in the exported nodes. npm note: installing three PRUNED the
    puppeteer deps; @sparticuz/chromium is now 149.x with an ESM default
    export (require(...).default) -- capture/prev scripts patched, versions
    pinned in package.json. 226 checks, fuzz clean + no spirals.
135. (VIEWER OVERLAY FIXES, 2026-07-15, Marwan: "The bem mesh option doesnt do
    anything and the directivity is not on the same axis as the horn") Both
    real; both mine. (1) buildCurrentBEM was declared INSIDE build() while
    update3D lives at the shared scope -- the preview's typeof guard silently
    skipped forever. The entry-134 "verification" was a FALSE POSITIVE: it
    counted dark pixels with no baseline, i.e., the horn itself. Fixed:
    var at shared scope, assigned in build(). (2) COORDINATE CONVENTION,
    now documented: engine meshes are (axial, lat1, lat2); the viewer bakes
    rotateX(-pi/2) into the geometry => view = (axial, lat2, -lat1). The
    dirov wedges, the BEM preview node mapping, and the OLD construction
    lines all assumed axial-on-Y -- wedges pointed 90 degrees off the horn
    axis; the preview drew displaced. All three overlays now use the correct
    mapping. VERIFIED with the upgraded prev_test.js harness (npm three@0.128
    injected via request interception -- cdnjs is sandbox-blocked, so THREE
    had never actually executed in any previous "live" viewer check;
    window.__V3 debug handle added): preview bbox coincides with the horn on
    all three axes (514/616/660 vs 514/616/661) and the wedges center at
    LOCAL (220, 0, 0) -- forward on the horn axis, laterally centered to the
    mm (the first world-space "off-center" reading was the orbit rotation of
    a pure forward vector -- assert in LOCAL space). prev_test.js is the
    viewer-check gold standard now; pixel counting without a baseline is
    banned. 227 checks, fuzz clean + no spirals.
136. (NaN EXPORT GATES, 2026-07-15, user via Marwan: ".msh file exports are
    invalid now with some rows containing NaN, so not able to import them")
    Systematic hunt: swept 258 family x shape x budget x mode configs -- NaN
    reproduced ONLY on invalid-parameter builds (e.g. swh without its full
    param set returns a 40,000-null wall SILENTLY; the app UI always passes
    valid params, so the user's file most likely came from an intermediate
    entry-127-129 era build). Whatever the origin: defense in depth so a
    corrupt file can never be saved again. (1) buildBEMProject rejects
    non-finite profile stations up front with "check the parameters";
    (2) bemToMsh has a FINAL gate scanning nodes + elements text -- throws,
    never saves; (3) the fuzz harness gained a permanent EXPORT NaN SWEEP
    (8 families x full/quarter/baffle+cap: 21 finite exports, 3 clean guards,
    0 NaN); (4) smoke pin: the broken-params repro must throw, never emit.
    All five live capture files verified clean. 228 checks, fuzz + sweep
    clean.
137. (BOUNDARY LAB SOURCE STUDY, 2026-07-15, Marwan uploaded the full
    boundary-lab-main codebase: "Do deep analysis, learn from it") 23k lines
    read. FACTS THAT CORRECT US: (1) bLab DOES support mirror symmetry --
    symmetry.py: modes off/x/xy, mirror planes X=0/Y=0 (OUR lat1/lat2 axes
    exactly), reduced mesh must live in the positive fundamental domain with
    1e-9 m tolerance -- our first-quadrant quarter with exact cut-plane nodes
    is DIRECTLY compatible; supported by the BEAT engine backend
    (beat_engine_backend.py supports_symmetry=True) and advertised by
    blab-server /health. Entry 133's forced-full for bLab REVERSED: quarter
    allowed, note says "set Symmetry = XY (BEAT engine backend)".
    (2) Radiators are selected by NUMERIC physical tag; the DEFAULT
    tag_throat = 2 (Ath's convention -- our SourceDisc is tag 1): the note
    now states "physical TAG 1" explicitly. (3) scale_factor default 0.001
    (mm -> m): our mm units are the ecosystem default, confirmed in code.
    (4) mesh_clean.py repairs coincident vertices (1e-9), duplicate/collapsed
    tris, and reports boundary/non-manifold edges -- our exports are already
    weld-clean and unique-noded. (5) Server API: GET /health (capabilities),
    POST /jobs (SimulationConfig JSON per protocol.py + mesh assets), NDJSON
    per-frequency streaming (solve_stream) -- NO CORS HEADERS, so
    browser-direct live solve needs a one-line upstream PR or a local proxy.
    (6) Their spinorama/impedance/balloon postprocess = the chart set a
    future live-solve integration unlocks. 228 checks, fuzz + sweep clean.
138. (THROAT-WEIGHTED GRADING + BLAB-VALIDATOR VERIFICATION, 2026-07-15,
    Marwan: "Are there any mesh fixes we need to do now?") Ran Boundary
    Lab's OWN code against our exports: symmetry.py validate_reduced_mesh_
    config PASSES our quarter for "xy"; their loader path finds triangles +
    physical tags. Nothing broken -- but the numbers exposed one genuine
    upgrade: our uniform-eEff grading gave the SOURCE DISC only a bare fan
    on budget-capped horns, while Ath practice runs the throat ~2x finer
    than the mouth (ThroatResolution 4-5 vs Mouth 10, Rear 20+ in their
    configs) because the source carries the velocity BC. Implemented: the
    target edge tightens toward the throat with the Mesh2HRTF cosine ramp
    (x0.55 at the throat -> x1.0 from 30% of the arc), source-disc plan at
    throat resolution. MEASURED: source elements doubled (16 -> 32 on the
    bench config; fan -> 2 graded rings), +16 elements total (6,208 ->
    6,224), quality unchanged (94% under 2:1, worst 3.0), quarter re-passes
    bLab's xy validator after the change. Pin extended: source >= 24
    elements (no bare fans). 228 checks, fuzz + sweep clean.
139. (BLAB PROJECT EXPORT, 2026-07-15, Marwan: "apply all the improvements we
    can do to the browser app one by one starting with the highest priority")
    Highest implementable priority (the live-solve bridge waits on the CORS
    request to galucha): Boundary Lab target now saves a READY-TO-OPEN
    .blab.json PROJECT alongside the mesh -- schema from project_io.py +
    dialogs.py (schema_version 1; imported_meshes entry {name "horn",
    source_file = the msh filename, scale 0.001, translation 0}; symmetry
    "xy" for quarter else "off"; source_config_by_name "horn:SourceDisc"
    driven=true on channel "main", walls driven=false; default channel).
    User flow: both files in one folder, File > Open Project, hit solve --
    zero manual radiator/tag/symmetry setup. VERIFIED THROUGH THEIR CODE:
    read_project_file + migrate + resolve_project_paths load our file, the
    mesh path resolves, sources land driven/undriven correctly, and their
    symmetry validator passes the referenced quarter mesh for "xy". Note
    text updated; pins aligned. 228 checks, fuzz + sweep clean.
140. (BRIDGE PAUSED + RINGS NOTE, 2026-07-15, Marwan: "No dont do the bridge
    for now... Is the bem mesh problem fully solved?") The live-solve UI
    insertions were REVERTED cleanly mid-build (button row + livePanel);
    hs_blab_proxy.py stays in the repo as a dormant asset (the CORS
    forwarder, 40 lines, ready when the bridge resumes). Small honest UX
    addition: WN/biradial (rings-path) exports now SAY "uniform mesh (graded
    meshing for rings families is on the roadmap)" instead of implying the
    graded pipeline -- those two families still ride the legacy
    constant-count path (no grading/quarter/baffle/cap), the one substantive
    gap left in the mesh story. 228 checks, fuzz + sweep clean.
141. (GRADED MESHING FOR ALL FAMILIES -- THE CONTRACT, 2026-07-15, Marwan:
    "Lets fix it for all families and all future families") The graded
    assembly is now GEOMETRY-SOURCE-AGNOSTIC: bemGradedWallAssembly takes a
    single contract function ringsKept(n) -> Float32Array(M*n*3) of KEPT
    stations at any azimuthal count (%4); per-station perimeters, arc
    positions, and the cap slope are MEASURED from a 64-count probe grid
    (correct for any section shape, wraps included). The prof path
    implements it via buildRings(p2, n); rings families via the app-supplied
    opts.ringsBuilder(n) with kept-station subsampling (station sets are
    segs-independent -- verified for WN, M=160 at 32 and 64). ANY FUTURE
    FAMILY: pass its ring builder and it gets grading, throat weighting, the
    cap source, quality stats, and NaN gates for free. Rings station metric
    switched to the measured mouth-ring perimeter / segs (uniform-arc, the
    entry-132 lesson). RESULTS: WN 18,048 -> 4,752 elements (3.8x), 43% ->
    84% under 2:1, worst 23.1 -> 4.0; Arai biradial (A-290 defaults) 18,048
    -> 4,248 (4.2x), 85% under 2:1, worst 5.7; both manifold-clean. FOUND +
    GATED: the rings path bypassed the entry-136 NaN gate -- biradial with
    bad params builds an all-NaN grid silently (possibly the user's original
    NaN report!); a strided rings gate now throws "non-finite ring geometry".
    Quarter stays ineligible for rings (wrap cut-safety) and baffle is forced
    off (wrapped mouths have no planar rim); both future work. Known
    headroom: rings budgets under-fill (no segs grow pass yet -- fMax
    honestly reported). Fuzz sweep extended with WN + biradial at real
    defaults; two mid-turn script-abort incidents caught by the suite (the
    prof call site landed one edit behind the signature change -- anchors
    verified before every write from now on). 229 checks, fuzz + sweep clean.
142. (TRIPLE CHECK, 2026-07-15, Marwan: "triple check everything... does it
    now export a boundary labs project?") FULL VERIFICATION MATRIX, all
    through the LIVE UI in Chromium (triple_check.js, kept in repo): suite
    229 ALL PASS; fuzz 13 family sweeps + EXPORT SWEEP 23 finite / 3 clean
    guards / 0 NaN. Live exports, all clean, zero page errors: akabak full
    169KB / quarter 40KB / baffle+cap 78KB; blab full + quarter EACH WITH
    a .blab.json project (yes -- the project export works for both, quarter
    project carries symmetry "xy"); WN 112KB and biradial 102KB through the
    real family-switch path (graded rings live). External validation on the
    fresh files: gmsh + meshio accept all six meshes with SourceDisc/
    HornWalls tags intact; bLab's OWN read_project_file + migrate + resolve
    load the quarter project, the mesh path resolves, sources land
    driven/undriven, and their xy symmetry validator PASSES the referenced
    mesh. Everything banked.
143. (CHART UPGRADES FROM THE BLAB PLOTTING STUDY, 2026-07-15, Marwan: "Did
    you not learn any in browser improvements to our graphs from the
    boundary lab source code?") Fair challenge -- the first analysis filed
    their whole chart set under "solve-gated" too quickly. Corrections:
    (a) our existing tiles already covered more of their in-browser set
    than credited (throat impedance R+X and a DI estimate chart exist from
    earlier sessions); (b) two genuine learnings applied: (1) their log-
    frequency axis discipline (_setup_log_frequency_axis): decade-major +
    2/5-minor vertical gridlines now render behind ALL THREE chart tiles
    via a shared logGridSVG helper; (2) GROUP DELAY: hornResponse's
    T-matrix denominators carried the transfer phase but discarded it --
    now kept (.ph = -atan2(dim, dre)), and the response chart draws an
    unwrapped, auto-scaled group-delay dashed trace (the number Marwan
    actually uses when setting crossover delays). Verified live in
    Chromium: 3 decade gridlines on the response tile, substantial GD path,
    zero errors. STILL solve-gated (honestly): normalized isobar/sonogram
    maps, spinorama energy averages, balloon -- those need real polars from
    the live-solve bridge. 230 checks, fuzz + sweep clean.
144. (CHART FIX + TWO NEW GRAPH TYPES, 2026-07-15, Marwan: "One graph broke
    and I do not see any changes? Aren't we able to display new types of
    graphs that are more useful?") Diagnosis: (a) the "broken" graph = the
    entry-143 GROUP DELAY OVERLAY -- raw finite-difference tau on a coarse
    f grid is spiky and rendered as dashed noise across the response chart
    (tchart's empty state for iwata/tractrix/conical/os/osc/rosse is the
    DESIGNED "n/a for this family" message, verified pre-existing);
    (b) "no changes" = the subtle minor gridlines were the only visible
    delta. FIXED + SHIPPED: the overlay is REMOVED and GROUP DELAY is now
    its own tile (unwrapped phase, 5-point median smoothing, robust 5-95
    percentile scale, ms gridlines, fc marker, honest 1-D ESTIMATE label);
    plus a genuinely NEW graph type: LOCAL CUTOFF f_loc(z) =
    (c/4pi)-d lnS/dz vs axial position with the design-fc dashed line --
    the Kolbrek flare-rate chart showing WHERE the horn loads, absent from
    every parametric tool we know. LESSON BANKED: renderCharts has FOUR
    spchart branches (_sp0 disabled / _sp1 HVDiff / _sp2 wavefront / _sp3
    axial) -- the first wiring hit only two, tiles rendered once and froze
    (caught by a cross-family content-differentiation check, byte-identical
    paths across jmlc/tractrix/conical); all three live branches now wired
    and the pin counts them. Verified: gd + fr differentiate across
    families, all 13 families render every tile NaN-free, zero page errors.
    231 checks, fuzz + sweep clean.
145. (PROCESS NOTE, 2026-07-15, Marwan: "lets not do the BEM calculations in
    browser we tried that before") Correct and then some: entry 64 SHIPPED
    browser BEM (NumCalc wasm32-wasi, validated wasm = native = analytic
    within 0.60%, delivered as bem_studio.html -- in this repo). This
    session's "compile C++ for the browser" turn re-derived that work from
    scratch (native NumCalc rebuild + pulsating-sphere validation at -1.00%,
    wasi-sdk fetched) before Marwan stopped it -- a compaction blind spot:
    the summary mentioned the NumCalc wasm embedding and it was not
    connected to the question. Nothing shipped; the repo was never touched
    (all scratch in /tmp, now deleted); horn_studio.html unchanged since
    entry 144. LESSON: before proposing "new" capabilities, grep
    PROJECT_STATE.md and the repo for prior art -- the journal exists
    precisely so completed work is not re-litigated.
146. (DIRECTIVITY-TOGGLE BEM FEASIBILITY, 2026-07-15, Marwan: "is there a C++
    solution to improving the directivity toggle on the 3D preview? or
    should we delete it") MEASURED, not estimated: the graded QUARTER mesh
    (3,062 elements at the 2.9mm tier, honest to 3.8 kHz) solved through
    native NumCalc dense TBEM with NumCalc's OWN two symmetry planes
    (SYMMETRY section: count in Main Params I field 5, then flags 1 1 0 +
    plane coordinates -- the quarter solves as the full 12k-element horn) in
    42 s single-threaded; H-plane polar at 3,577 Hz is clean physics
    (-6 dB full width 58 deg, smooth mainlobe, monotone skirt). Scaling: the
    4mm-tier quarter (1,556 elems) ~ 5.5 s native / ~10-15 s wasm per
    frequency but honest only to ~2.6 kHz; 16 kHz needs ~27k quarter
    elements = dense TBEM out of browser memory, PERMANENTLY infeasible
    in-browser. VERDICT: keep the geometric toggle (instant, live during
    parameter drags); the C++ upgrade is the already-shipped entry-64
    NumCalc wasm (TBEM = exactly the WASI-validated path) as an OPT-IN
    "verify at one frequency <= ~4 kHz" worker run (~1-2 min), drawing the
    measured wedge beside the estimate; HF wedges stay geometric, labeled
    as such. NC.inp recipe for our meshes banked here: objNodes text is
    already NumCalc-format meters; elements re-indexed 0-based; BOUNDARY
    ELEM 0 TO nSrc-1 VELO 1.0; eval grid = arc nodes with 3-node dummy
    elements type 2. Nothing shipped this turn -- feasibility only, by
    design. (Also: the bench directivityEstimate signature differs from the
    app path -- comparison number to be pulled through the app when the
    integration session happens.)
147. (CURVATURE-AWARE STATIONS, 2026-07-15, Marwan uploaded fusiontomsh-main:
    "see if our mesh export needs any improvements") The tool: a Fusion 360
    -> gmsh 2.2 add-in from the same ecosystem (per-body named physical
    groups, ASCII 2.2, mm -- our conventions already match). Its two
    transferable ideas: curvature-based sizing and seam-aware conformal
    blending (the latter banked for the enclosure session, roadmap sec 10).
    MEASURED the gap it exposed: our arc-uniform stations left 1.73 mm of
    chord (sagitta) deviation in the default horn's MOUTH ROLL -- 15% of
    the element size, in exactly the region that shapes mouth-termination
    physics. SHIPPED: a sagitta bound on axial station spacing,
    s <= sqrt(8 R tol) with tol = eEff/12, in BOTH the prof metric (three-
    point circumradius on the profile) and the rings metric (circumradius
    on ring centroids -- wraps included). RESULTS: chord deviation 1.73 ->
    0.61 mm at the 4 mm tier AND 432 FEWER elements (6,224 -> 5,792; the
    metric moved stations from straight wall into the roll); quality
    93%/3.0, fMax unchanged. WN: 4,752 -> 4,448 elements with the wrap now
    fidelity-bounded; under-2:1 dipped 84% -> 80.0% (a few 2-4:1 bands buy
    the geometric fidelity -- pin floor moved to 0.78 with the trade
    documented). New pin: default-horn roll deviation < 1.0 mm at < 6,200
    elements. Captures + gmsh + meshio green. 232 checks, fuzz + sweep
    clean.
148. (HANDOFF WRITTEN, 2026-07-15, Marwan: "Can you create a handoff file to
    work on this in another session") HANDOFF_BEM_VERIFY_DIRECTIVITY.md
    written to the repo + outputs: the complete brief for the "VERIFY (BEM)"
    directivity integration -- measured feasibility table (entry 146), the
    full NC.inp recipe with every parser gotcha folded in (Mesh2HRTF header,
    Main Params I field order + symmetry count field + methodBEM 0-only,
    plane-waves zero, SYMMETRY section format, trailing newlines, fresh
    be.out), what to extract from bem_studio.html vs never rebuild, the
    viewer coordinate convention, the worker architecture, the verification
    ladder (native-vs-wasm match, the 58-deg reference case, Chromium
    end-to-end with __V3 local-space assertions), known constraint edges
    (rings/fins quarter-ineligibility, 3k element ceiling, fMax clamping),
    file map, and acceptance criteria. Suite untouched at 232 ALL PASS.
    [entry 148 addendum] Handoff zip built + RESTORE-VERIFIED:
    horn_studio_handoff_2026-07-15_entry148.zip (11.4 MB, 52 files) at
    /mnt/user-data/outputs -- repo minus node_modules, plus numcalc_src/
    (native NumCalc reference source) and HANDOFF_README.md (restore steps,
    strict workflow, contents map). Verified by unzipping to a fresh dir and
    running the suite from the extracted copy: 232 ALL PASS.
149. (USER FEEDBACK BATCH, 2026-07-15, three forum reports via Marwan)
    (1) SA8535 ribbon user, CONFIRMED READING OF THE CODE: the flare law
    runs from throatD; the rectangular ribbon is a smooth entry morph
    (entry 90/101). FIXED to match the expectation: changing ribW/ribH now
    AUTO-MATCHES throatD to the area equivalent (2*sqrt(WH/pi)); manual
    throatD edits afterwards still win and still warn. Verified live with
    the user's exact 48.6x166 case -> throat 101.35. (2) "Dont reset params
    when changing profile / give a Default button": family switches now
    PRESERVE user-touched shared params (fc, throatD, covH, covV, T0 --
    S._touched tracking) so profile-vs-profile comparison at constant
    inputs works; the new FAMILY DEFAULTS button is the explicit reset.
    Smoke's defaults pins moved to the button semantics. (3) "lower Fo...
    100 Hz or less": fc floor 150 -> 80 Hz, all prof families verified
    stable at 80 (mouth radii to ~1.05 m -- the horns are just big).
    (4) Thommy (WN/Neile): quarter-for-rings silently fell back to full --
    the symmetry select is now DISABLED for WN/biradial with a tooltip
    explaining the wrap cut-safety, state forced to full; his "70x120cm at
    600 Hz" does NOT reproduce (WN fc600 defaults measure 467x204x266 mm --
    likely different cov/params or an import-scale reading); his slow load
    was the pre-graded 18k-element era, now 4.4k. All four behaviors
    verified live in Chromium, zero page errors. 232 checks, fuzz + sweep
    clean.

    [entry 149 addendum] The entry-148 handoff zip predated this batch --
    replaced with horn_studio_handoff_2026-07-15_entry149.zip (same layout,
    current build), restore-verified: suite ALL PASS from the extracted copy.
150. (DEGENERATE GATE, 2026-07-15, bLab user via Marwan: "quarter symmetry
    mesh... not accepted accusing some NaN on some parts") INVESTIGATION:
    the CURRENT build cannot reproduce it -- all 13 families exported
    through the LIVE APP (quarter where eligible) scan clean for literal
    NaN, duplicate-index, and zero-area elements; the shipped quarter also
    passes bLab's own loader + xy validator + a normals pass (finite unit
    normals). The user's file is most plausibly from an OLDER build (the
    pre-entry-132 quarter era) or a bLab-side stitch/solve stage -- their
    exact file/params requested. BUT the hunt exposed a REAL gap: a bench
    config with an invalid family name produced a wall of garbage-but-
    FINITE numbers -> 2,208 zero-area triangles that passed every existing
    gate (finite coords; the NaN string scan is blind to them) and would
    become NaN the instant any solver normalizes normals -- exactly the
    reported symptom class. HARDENED: buildBEMProject now scans all
    triangles post-orientation for duplicate indices and cross-product
    magnitude < 1e-10 and THROWS ("degenerate (zero-area) elements -- check
    the parameters"); the fuzz export sweep gained a permanent zero-area
    scan; the bogus bench family names (oss/keele) in the sweep replaced
    with real ones; the gate recognized as a clean guard. Two more
    &&-chain edit aborts caught this turn (a probe crash skipped the edit
    while its output interleaved confusingly) -- standalone edit blocks +
    grep-verify after write, always. 233 checks, fuzz + sweep clean
    (17 finite / 6 clean guards / 0 NaN / 0 degenerate).
151. (SINGLE-ZIP BLAB EXPORT, 2026-07-15, Marwan: "when it downloads multiple
    files should it do it in a zip file?") YES, for two hard reasons:
    browsers gate multiple programmatic downloads (Chrome permission
    interstitial, Safari can drop the second file), and Boundary Lab needs
    the mesh + project in ONE folder, which a zip enforces by construction.
    SHIPPED: makeStoreZip in the engine -- a store-only ZIP writer (local
    headers + central directory + CRC-32, no compression; text meshes make
    size irrelevant) validated against python zipfile (namelist, testzip
    None, content round-trip) and unzip -t, with the canonical CRC-32 check
    value (crc32("123456789") = 0xCBF43926) pinned. The blab target now
    saves ONE zip (fname_blab.zip) containing the .msh + the ready-to-open
    .blab.json; the project's source_file references the mesh by its exact
    in-zip name; single-file AKABAK exports stay bare (no unzip friction
    for one file). Chromium end-to-end: exactly ONE download captured, zip
    CRCs valid, meshio loads the contained quarter finite in the positive
    domain, symmetry xy. 234 checks, fuzz + sweep clean.
152. (IWATA DRIVER-EXIT CUT + TOOL RESTORATION, 2026-07-15, Marwan +
    screenshot: "something does not seem right with the throat... thickness
    seems too thick... Why did we also remove the other tools for the
    driver plate and thickness... there must be a way to choose an exit
    driver by cutting through this long neck") THREE findings, all
    root-caused: (1) The "wrong" throat is the decoded Iwata's OWN
    generative entry -- a long slow-expanding near-circular neck (r 6.35 mm
    at the fc-640 half-scale, ~90 mm to reach r 20). Mathematically
    faithful; physically always sawn off at the driver exit. (2) "Too
    thick": the thick control carried notFams iwata, so the preview shell
    sat pinned at S.thick (6 mm default) with NO way to change it -- on the
    12.7 mm neck a 6 mm shell reads as the screenshot's fat snout. (3) The
    plate/bolt/entry tools were NEVER REMOVED -- iwata was blanket-excluded
    from them when it became the decoded rings family (entries 88-110).
    SHIPPED: iwExitD ("Driver exit \u00d8 cut, 0 = full neck", iwata-only)
    -- iwataCutRow finds the grid row where the MEAN streamline radius
    reaches exitD/2 (the neck is near-circular; a row IS the saw plane);
    iwataWall slices wall/wallV and re-zeroes z; buildIwataRings starts the
    march at iwCutU with z shifted, so the 3-D preview, BEM, NURBS, STEP,
    and the driver plate (generic block, bore follows the cut wall) ALL
    inherit the cut. Actual cut \u00d8 snaps to the row and is reported
    with the ELLIPTICAL rim honestly (the Iwata expands H-first: \u00d852
    area-equiv = 67.7x33.3 H\u00d7V rim at 2-inch) plus neck length removed.
    thick + plateT/plateD/boltN/boltCircleD/boltHoleD/boltRot re-included
    for iwata; exitLen/exitDeg stay excluded (the cut IS the entry
    solution); flareR/flareWrap stay excluded (the table roll is native).
    hornParams gained the iwExitD whitelist entry (the param silently
    never reached computeFamily until then -- caught live: stats showed the
    uncut horn). Live-verified: depth 264.1 -> 141.8 mm at the 2-inch cut,
    controls present, stats line exact, zero page errors. Fuzz gained an
    iwExitD export config (BEM path inherits the cut cleanly). 235 checks,
    sweep 20/6/0.
153. (FAMILY SELECT vs RELOAD, 2026-07-15, Marwan: "if you move from JMLC to
    another horn and refresh the browser it doesnt reset the 3D viewer it
    stays the same") REPRODUCED in the THREE-injected harness: after a
    family switch + reload, the autosave and the VIEWER carried the new
    family while the familySel DISPLAYED jmlc -- a select/viewer mismatch,
    because familySel is the ONE select whose HTML is stringified BEFORE
    the entry-112 autosave restore runs (every other stateful select is
    built after it and bakes restored values). FIXED at boot: sync
    familySel.value from restored S + syncSymEligibility() where the
    element exists (next to the listener attachment); applyDesign also
    gained the eligibility sync (loading a WN design file now disables
    quarter correctly). LESSON (again, same turn-class as 137/141/150):
    the first fix landed inside applyDesign, not boot -- the anchor text
    existed in a different function; caught because the reload repro was
    re-run after the edit, not assumed. Note: puppeteer page.reload() with
    request interception can hang -- fresh page.goto() navigations are the
    reliable reload test. Verified: wn AND tractrix both MATCH select =
    saved = designation after reload, eligibility correct per family, zero
    page errors. 236 checks, fuzz + sweep clean.
154. (ANALYSIS ONLY -- "do we need to change our horn math since it is the
    same frequency as dr.ba", 2026-07-15) Three-way discriminator run on the
    WN-vs-GCH250 question (both fc 250). OUR GEOMETRY (live bwchart decode,
    WN fc250 defaults): H settles to a constant 58 deg (clean pattern
    control); V narrows MONOTONICALLY 168 -> 104 -> 69 -> 43 -> 26 -> 23
    deg from 500 Hz to 5 kHz -- NO waist. THE BEM ARCHIVES (same fc): V
    pinches to 31 deg at 2 kHz then REBOUNDS to 43 at 3.15k -- a waist the
    geometry does not predict, therefore an emergent field effect
    (free-standing bare mesh, sharp mouth edges -> V-plane edge diffraction
    in exactly the band where the smaller V mouth dimension crosses
    lambda), not a profile-law defect. drba's published GCH250 (measured
    device, full construction) is smooth. VERDICT: no math change -- the
    equal-path solve is verified to 1e-13 and the geometric design intent
    is monotone; the deltas live in simulation setup (mouth termination /
    enclosure / mesh honesty above 4-5k). Actions if pursued: re-solve with
    mouth wrap or the baffle model at a finer tier; longer-term the
    ENCLOSURE COMPANION MESH (P4 backlog) is exactly the missing piece --
    this analysis strengthens its case. Nothing shipped.
155. (ANALYSIS -- "what settings should we make to get results most similar
    to this [WN300ALO reference set]", 2026-07-15) Target beamwidths read
    from his published polars (-6 dB full width): H 90/74/60, V 110/66/50
    at 1k/2k/4k. Live-app sweeps of the REAL WN knobs at fc 300: wnUL
    0.3-0.6 and T0 0.6/0.8 barely move the estimate (V@4k 25-29 only); the
    WN's directivity is essentially FIXED by construction at a given fc:
    H ~62 deg constant, V 97/50/~27. (First sweep attempt used covH/covV
    -- those are cd/os/osc/biradial params, not wn; the identical results
    were lingering non-wn inputs no-oping, not a UI bug.) CONCLUSION: our
    Neile-inspired WN and his WN300ALO are structurally different
    directivity designs (ours more constant-H / CD-like; his wider at LF
    narrowing gradually). No settings reproduce his trajectory; closing it
    would be a NEW parameterization of our own (e.g. an exposed H half-
    angle law) -- a design decision, not copying his construction (which
    stays excluded). SIMULATION-SIDE settings that DO make results
    comparable: free-standing closed mesh (his AKABAK shot = quarter via
    two symmetry planes of free space, no baffle), eval at 3 m, finest
    mesh tier through Boundary Lab (WN cannot quarter; his 13k band needs
    GPU-scale honesty), sweep capped at honest fMax, plots normalized
    +-90 deg in 3 dB bands (the match-style plotter from entry-154 turn).
    wnUL 0.4 / T0 0.6 is the marginal best geometric fit. Nothing shipped.
156. (WN H COVERAGE LOCK, 2026-07-15, Marwan: "Yes lets try to recreate his
    constant H character that is what makes that horn special") SHIPPED:
    wnCovH ("H coverage lock, 0 = natural Neile", 0-140 deg, wn-only) --
    a THIRD, CONICAL phase in OUR H law between the Neile loading zone and
    the mouth: the Neile runs until its slope reaches tan(covH/2), the
    wall goes straight at that angle THROUGH the flare region (first
    attempt ended the cone at the uC split and did nothing -- the natural
    62-deg character lives IN the Hermite flare; the cone now extends to
    min(0.82 zm, feasibility clamp aB <= 0.92 am)), then a short terminal
    Hermite blend to the family's EXACT unchanged mouth laws. The V wall
    adapts automatically (hypex area law solves b from the held a) and the
    equal-path family consumes the new outer -- our own construction
    extended; nothing imported from drba (whose method stays excluded).
    VERIFIED live (bwchart decode, fc 300): lock 60/75/90/110 -> H
    60/75/88/108 deg CONSTANT from 800 Hz to 6.3 kHz; wnCovH=0
    BIT-IDENTICAL rings to the pre-feature build; mouth dims unchanged at
    every lock; rings finite; V law untouched (123/60/31 -- V shaping is
    its own future knob). hornParams whitelist done up front (lesson 152).
    Fuzz gained a locked BEM config. 237 checks, sweep 21/6/0.
157. (H-LOCK GEOMETRY REBUILD, 2026-07-15, Marwan + profile screenshot: "The
    H-coverage doesnt go all the way to the end... and also the loading
    zone feels a bit weird how it changes") Both observations were real
    defects in the entry-156 construction: a C1-only kink at the
    Neile->cone junction (curvature snapped to zero) and a cubic-Hermite
    S-WIGGLE at the mouth (end slopes inconsistent with the chord), which
    also ended the straight wall early. REBUILT: (a) SLOPE-SPACE
    SMOOTH-MIN -- s(z) = softmin(neile'(z), tan(covH/2), w = 0.10 dt)
    integrated on a 1200-pt fine grid: curvature-continuous everywhere,
    the loading EASES into the cone; (b) TANGENT CIRCULAR FILLET to the
    mouth -- the unique circle through (zm, am) with mouth tangent thm,
    tangent to the cone line (closed form R = (am - tCD zm - c0)/(sec thc
    - cos(thm - thc)); c0 measured from the integrated curve where the
    smoothing has converged): monotone by construction, mouth EXACT, the
    cone now holds to 82-86% of depth (was ~70% with the wiggle);
    (c) ACHIEVABILITY CLAMP -- tCD capped at neile'(0.66 zm): at fc 300
    the loading law smoothly reaches ~75 deg max; wider requests clamp
    rather than kink (the unclamped lock 90 hid an UPWARD slope jump at
    the clamped-zC junction -- the monotone check only caught decreases;
    the bwchart shows users the effective coverage). Hermite fallback kept
    for degenerate fillets. Verified: locks 60-140 all slope-monotone,
    mouth exact to 1e-6, natural law still bit-identical, suite + fuzz
    green. 237 checks, sweep 23/6/0.
158. (WN WRAP INVESTIGATION, 2026-07-15, Marwan + AKABAK mesh screenshot:
    "btw his horn looks something like this") The reference horn's defining
    mesh feature: a continuously curved wall with the mouth rim CURLING
    FORWARD past the mouth plane (~170-deg lip) -- the classic edge-
    diffraction killer, and the prime suspect for our V-waist finding
    (entry 154). DISCOVERED: buildWNRings(horn, segs, flareR, wrapDeg)
    ALREADY implements the roll, and the viewer/cloud paths passed
    S.flareR/S.flareWrap while the BEM paths passed 0,0 -- a live
    preview-vs-export MISMATCH (users could see a roll the solve dropped).
    Wiring the BEM paths exposed the deeper break: the closed-solid
    topology caps "the outer back ring" to center, which for a bare horn
    is the outer THROAT ring -- with a wrap it is the CURL TIP, so the cap
    tents a membrane from the tip ring through the horn body to the
    throat (104-mm elements at 15-deg azimuthal steps, quality 76%/14.8,
    fMax 552; localized by triangle autopsy after two wrong hypotheses --
    non-monotone perimeter ladder, unit corruption -- both disproven by
    measurement). RESOLUTION THIS TURN: consistency, not the feature --
    BEM paths stay 0,0 with the reason documented in-code; flareR/
    flareWrap gated (notFams wn); viewer + cloud sites zeroed for wn so a
    stale S.flareR cannot desync. The RINGS-WRAP SEAM CLOSURE (tip
    annulus: inner tip ring <-> outer tip ring, outer shell returning
    over the roll) is its own session, sharing machinery with the
    rings-quarter backlog item -- and it is the highest-leverage physics
    feature for the drba comparison per entries 154/155. 237 checks,
    fuzz + sweep clean.
159. (H-LOCK LOADING + SMOOTHNESS AUDIT, 2026-07-15, Marwan + screenshot at
    fc 320 / throat 50.56 / lock 45: "is this loading zone correct?")
    LOADING VERDICT: acoustically CORRECT -- fc_loc along the locked-45
    wall descends 568/395/265/184 Hz through the depth, crossing design fc
    EARLIER than the natural law (a 45-deg cone from a 50-mm throat has a
    high, relaxing flare rate); no loading deficit. THE VISIBLE MID-WALL
    CORNER WAS REAL: the Hermite fallback had engaged (13-deg step at 0.82
    zm). Three construction fixes landed chasing it across the parameter
    space: (1) EXACT cone-line intercept -- c0 = rt + integral(smin - tCD)
    dz accumulated during the grid pass; two successive measuring-point
    heuristics (1.6 zC, then slope-rate convergence) each left a lock band
    where the fillet tangency landed ON the measuring point and the guard
    failed by zero margin; (2) smoothing width sized in Z-SPAN (0.012 zm x
    rate) -- the fixed slope-width stretched the transition across ~30% of
    depth for deep-zC locks and the tangency landed inside it; (3)
    feasibility BISECTION to the minimum expressible lock + NATURAL-LAW
    fallback when none exists (mouth-dominated horns, e.g. fc 600: even
    tMax lies below the mouth chord -- the corner-prone forced-Hermite
    fallback is GONE). VERIFICATION LESSON: the absolute 5-deg step
    detector false-positived on the natural law's own steep mouth flare at
    high fc (14.7 deg/station at fc 600 with NO lock) -- the correct
    criterion is RELATIVE: locked max step <= natural + 1 deg, now the
    pin, passing across 48 configs (6 fc/rt corners x 8 locks). rt is the
    THROAT RADIUS (one bench run doubled mu by passing the diameter --
    caught against the screenshot's W/2). Natural law still bit-identical.
    238 checks, fuzz + sweep clean.
160. (MASTER-GRID COLUMN-MAP SUBSAMPLING, 2026-07-16, "lets fix everything
    including the things you mentioned you missed" pt 1) The TRUE root
    cause behind entry 158 found by triangle autopsy with layout mapping:
    NOT assembly topology (the back cap always targeted row 0 correctly;
    the membrane theory was wrong) but the ring builders' COUNT-DEPENDENT
    azimuthal parameterization -- same-parameter nodes drift up to ~55 mm
    between segs 48 and 96, EVEN BARE; bare exports survived only because
    count transitions land in the near-circular throat region. Fix in
    bemGradedWallAssembly: ONE master grid = ringsKept(segs); every lower
    count SELECTS master columns via a strictly-increasing rounded COLUMN
    MAP -- cross-count consistency by construction for every rings family,
    snap4 granularity retained (a divisor-ladder first attempt degraded
    the healthy prof path and was replaced). WN graded quality 80 -> 77.3%
    (column-map spacing jitter +-20% at non-divisor counts; worst stays
    4.0) -- entry-141 pin floor moved 0.78 -> 0.76 with the trade
    documented. Assembly return gained layout debug (innEnd/outEnd/cSrc/
    cBack/innOff/nArrD); bemOuterOffset exported. WRAP RE-SCOPED with the
    real diagnosis: even with consistent grids, buildWNRings wrap rows
    have INTRA-RING wildness (100-mm azimuthal neighbor steps, 200-mm
    z-range within one ring) -- the per-azimuth roll framing shears/twists
    around the WN's non-planar equal-path rim (z varies ~150 mm). The lip
    needs rotation-minimizing frame re-parameterization: its own session;
    wrap stays gated (entry-158 state). buildAraiFanRings NaN in the bench
    was GIGO (incomplete biradial params -- entry-150 lesson replayed; the
    live 13-family sweep is the valid check). rt is the throat RADIUS.
161. (WN V COVERAGE LOCK, same turn, pt 2) wnCovV ("V coverage lock, 0 =
    natural", 0-140 deg, wn-only): the entry-156/159 architecture on the
    VERTICAL wall, with the hypex LOADING ZONE (u <= uL) untouched --
    loading is the V law's purpose there. KEY PHYSICS: the V mouth tangent
    phm is SHALLOW (~36 deg) and the natural V wall is already ~30-36 deg
    in its outer half -- the V pattern is aperture-limited, and the needed
    direction is WIDENING. No single tangent fillet exists for widening
    locks (the cone overshoots the mouth chord while the mouth tangent
    sits ABOVE the lock angle): the correct wide-V wall opens fast,
    FLATTENS, then flares -- an S in slope, monotone in position.
    Construction: integrated smooth-max cone to s1, then a C2 quintic
    Hermite to the exact (bm, tan(phm), 0), s1 BISECTED for the longest
    monotone cone; narrowing locks keep the entry-159 convex fillet;
    branch-aware bisection (DOWN for widening). Three bugs found en route:
    the abscissa (the V wall lives on s, the straight center path -- the
    first draft integrated zOuter and silently no-opd), the fillet branch
    chosen by chord sign instead of mouth-tangent comparison, and an
    upward-only bisection. VERIFIED live (bwchart, fc 300, lock-70 H):
    covV 0/50/60/70 -> V 48/50/60/70 at 2k, held flat to 4k, H untouched
    at 69 constant, wnCovV=0 bit-identical, V mouth exact, loading
    untouched. The natural law's pre-existing 0.1-mm throat dip (station
    7, hypex/rounded-rect inversion) is unchanged by the lock -- noted,
    not chased. drba recipe update: wnCovH 70 + wnCovV 55-60 predicts V
    93/60/55 vs his 110/66/50. 240 checks, fuzz 26 exports clean.
162. (V LOCK v2: DIFFRACTION-SLOT + FAMILY DEFAULTS, 2026-07-16, Marwan:
    "the V coverage lock makes it all look super weird and make the
    suggested numbers the family default" + the reference 2D profile:
    "this is how the V coverage looks like") The reference profile
    rewrote the design brief: the wide-V reference geometry PINCHES
    slightly, stays LOW for most of the length, and releases in one late
    accelerating sweep -- a DIFFRACTION-SLOT design. Physics: a small V
    aperture releasing late diffracts wide; a steadily-opening V wall
    (our natural law AND the entry-161 cone-early construction) builds
    waveguide directivity and NARROWS -- the first widening branch was
    physically backwards (its shelf-and-wiggle look was the complaint;
    a min-slope-floor patch landed first, then the whole branch was
    replaced). V patterns are APERTURE-ruled and fall ~1/f (the reference
    measures 110/66/50 -- a flat V plateau was never the physics), so the
    DIAL SEMANTICS changed: wnCovV = the target -6 dB V beamwidth AT
    2 kHz via the Keele relation; bHold = 25.4e6/(2000 covV)/2.
    CONSTRUCTION: hold quintic (sL, bL, mV) -> (mid-hold, bHold, flat),
    flat hold, release quintic -> (bm, tan(phm)); release point bisected
    LATE after a coarse feasibility scan (steep holds only fit with a
    late mid-hold -- starting early and bailing lost covV 50-66); mild
    pinch allowed (0.70 floor), no bulge (1.06 cap); loading zone
    untouched; wnCovV=0 bit-identical; the narrowing branch (requests
    below the natural mouth's own 2 kHz width) keeps the wall-angle
    fillet. prof.bRel exports the release aperture and the bwchart V
    estimate reads it (mouthH_eff = 2 bRel, no plateau) -- the chart now
    shows the honest falling aperture curve. VERIFIED live: defaults
    fresh-boot -> V estimate 118/61/30 at 1k/2k/4k vs the reference
    110/66/50 (the 4k gap = pure-1/f vs his release-flare HF control;
    BEM arbitrates). FAMILY DEFAULTS: wn -> throatD 35.56, fc 300, T0
    0.7, wnCovH 70, wnCovV 60 (the drba-comparison reference; the render
    pin now reads the defaults table since the designation depends on
    SHARED_KEEP session state). Smoke gotcha: htmlB declares at line
    ~632 -- pins above it test hoisted-undefined; local read. Graded BEM
    with the slot: 87%/4.2. 240 checks, fuzz 26 exports clean.
163. (H-CLAMP HONESTY + DESIGNED V RELEASE, 2026-07-16, Marwan + profile
    screenshot: "changing H coverage does nothing now and changing v
    coverage does this [near-vertical release hook]") Two defects, both
    UX-honesty class: (1) "H does nothing" = the entry-157 achievability
    clamp acting SILENTLY -- at the new default throat (1.4 in, fc 300)
    the ceiling is 66.4 deg, so every request >= 67 clamps invisibly and
    the dial appears dead (below it: 55/60/65 track exactly). wnProfile
    now exports covHEff and the stats print "70 deg requested -> 66 deg
    effective (family max at this fc/throat)" when clamped, plus a V
    line with the release aperture ("60 deg at 2 kHz, release aperture
    212 mm, aperture-ruled, falls ~1/f"). (2) The V release hook: the
    entry-162 bisection MAXIMIZED the hold, cramming the release into
    the last ~4% of the path -- a near-vertical STEP, not a flare (the
    reference releases over its final ~45%). The release point is now a
    DESIGNED proportion: 55% of the post-loading span, scanning later
    only when infeasible; tip slope 35 deg (was ~vertical), release at
    83% absolute, dial fidelity unchanged (bRel -> 60 at 2 kHz exact).
    241 checks, fuzz 26 clean.
164. (V SLOT v3: THE REFERENCE SHAPE, 2026-07-16, Marwan with ours-vs-his
    side by side: "changing v coverage does this. it should be like
    yellow line") v2's intermediate HOLD LEVEL drew a STAIRCASE (climb,
    plateau, second rise); the reference is ONE motion. v3 construction:
    settle from the loading end to slightly BELOW the loading height
    (bSet = 0.97 bL -- the reference's mild pinch), run near-flat, then
    ONE continuous C1 quintic sweep to the exact mouth (bm, tan(phm)).
    DIAL SEMANTICS simplified honestly: covV maps to the RELEASE POINT
    (40 -> 15%, 100 -> 75% of the post-loading span; wider = later);
    the @2k Keele promise is GONE -- slot width is diffraction-emergent,
    the stats say "single-sweep flare (reference style), width is
    diffraction-emergent -- verify in BEM", and the bwchart V shows the
    mouth-aperture curve as a LOWER bound (no wall plateau when the slot
    engages). bRel now reports the height at the sweep's max-curvature
    region (the effective diffracting edge) -- reported, not promised;
    sRel exported for the stats. Single-rise verified across the dial
    (structure test: exactly one slope rise after the settle), release
    63/68/78/88% at covV 50/60/80/100, mouth exact, wnCovV=0
    bit-identical. Entry-161 pin rewritten for v3 (dm9 compat + single
    rise + release ordering + markers); entry-163 pin markers updated.
    241 checks, fuzz 26 clean. THE BEM RUN ARBITRATES: defaults (locks
    70 + covV 60), finest tier, free-standing, 3 m.
165. (V SLOT v4: EXPONENTIAL-IN-SLOPE, 2026-07-16, Marwan + the reference
    interior mesh: "still not good") v3's flat-run-then-sweep was TWO
    regimes; the reference V wall grows CONTINUOUSLY -- smoothly rising
    slope from the settle to the tip, convex throughout, no flat channel.
    v4: slope(v) = A(e^{kv} - 1) starting at EXACTLY zero (C1 after a
    short monotone settle -- the forced 0.97 pinch is gone: a dip after a
    rising loading end humps in 3D, and the reference's pinch lives in
    ITS loading law); A solved in closed form so the mouth POSITION lands
    exactly; the END TANGENT IS FREE (56-71 deg across the dial --
    forcing the family's gentler phm onto this shape is what created
    every hook). Dial: covV 40..100 -> growth exponent k 1.5..6 (later
    concentration = slot-like); sRel (25%-of-rise point) reported in the
    stats. Verified: growth-region slope monotone-rising at every dial
    value (0.04/0.15/0.30/0.53/0.87/1.37 at covV 50 -- the reference's
    own profile reads the same near-zero-through-40% signature), mouth
    exact, wnCovV=0 bit-identical, dial reshapes the wall (75%-depth
    height moves). Detector lesson: the first structure scan windowed
    into the LOADING zone and flagged the designed settle as a defect --
    measure the claim's own region. 241 checks, fuzz 26 clean.
166. (V SLOT v5: THE COMBINED CURVE, 2026-07-16, Marwan circling the
    junction bulge on mobile: "maybe the loading zone to non should be
    more of an approximated combined curve than a sudden jump") His
    diagnosis was the design: v4's settle was a discrete segment at the
    uL boundary whose compressed slope-drop read as a BULGE. v5 has NO
    boundary: one combined slope law beginning INSIDE the loading zone
    (zS = 0.72 uL L), starting at the loading law's own slope EXACTLY
    (C1 splice) and relaxing into the exponential growth via a one-sided
    blend sC = sG + (sN - sG) e^{-v/0.18}. FIRST ATTEMPT used softmin(sN,
    sG) -- structurally wrong: a softmin caps the combined integral at
    the loading law's own (bh(zEnd) = 129 < bm = 134.5), the mouth was
    unreachable and the branch silently fell back to natural (caught by
    a why-probe after the blend metrics suspiciously EQUALED natural's).
    Growth amplitude A bisected (40 steps) for the exact mouth; landing
    snapped (< 0.2% residual). RESULT: the blend region is now SMOOTHER
    than the natural law's own junction (max slope step 0.046 vs 0.061),
    the channel + mild dip emerge from the blend rather than being
    stitched, dial response strong (75%-depth height 49.7/45.7/38.4 at
    covV 50/60/80), 25%-rise readout 74/76/81%, mouth exact, wnCovV=0
    bit-identical. 241 checks, fuzz 26 clean. The geometry conversation
    is converged pending Marwan's eye -- the BEM run arbitrates the
    physics: defaults (H 70, V 60), finest tier, free-standing, 3 m.
167. (WN MOUTH WRAP LIVE + DEFAULT RECIPE, 2026-07-16, Marwan: "apply the
    changes including the ones u said are on roadmap... set the dials
    default on what you think is the best option") The 2 kHz V lever
    from the slot-run comparison (entry: slot vs pre-slot vs WN300ALO --
    V 49 vs his 66 at 2k, the bare-rim edge-diffraction band) is now
    SHIPPED. Two fixes completed the entry-158/160/164 diagnosis chain:
    (a) LIP FRAMES FROM THE TRUE LOCAL SURFACE -- N = T x R (R = the 3-D
    rim tangent carrying the rim's ~150 mm axial swing; the old N was
    lateral-only and sheared at ~100 mm near the rect corners); (b) ONE
    GLOBAL SIGN -- the per-azimuth outwardness flip broke neighboring
    frames apart (155-mm steps) exactly where N legitimately tilts
    axial; T x R is globally consistent on a smooth rim, so the sign is
    decided once by summed lateral projection. Wrap intra-ring steps now
    39.7 mm = 1.69x the rim row's own corner step (meshable). The graded
    wrapped export passes end-to-end THROUGH THE EXISTING TOPOLOGY (the
    tip annulus was always correct once builder shear + cross-count
    mismatch fell): f40/w135 -> 8240 elems, 83%/6.0, fMax 1120, max edge
    51 mm, gate clean. UN-GATED: flareR/flareWrap notFams wn removed;
    BEM preview + export + viewer + cloud all pass S.flareR/S.flareWrap
    (the entry-158 zeros reverted -- preview/export parity restored the
    right way). FAMILY DEFAULTS (best-judgment recipe): throatD 35.56,
    fc 300, T0 0.7, wnUL 0.5, wnCovH 70 (clamps honestly to ~66), wnCovV
    60 (BEM-validated slot), flareR 40, flareWrap 135 -- the complete
    drba-comparison instrument as the family's boot state. Fuzz gained
    the full-recipe config (29 exports clean). 242 checks. NEXT BEM RUN
    (the arbitration): defaults as they boot, fine tier, free-standing,
    3 m -- expectation: the 2-2.5 kHz V gap closes toward 66 and the
    V-waist edge diffraction softens; the H-narrowing question from the
    coarse run also resolves.
168. (WRAP-RUN ANALYSIS + DEFAULT CURL DEPTH, 2026-07-16, Measurement_5)
    First BEM contact for the wrapped default (coarse tier, 4784 elems --
    LESS resolution than the bare runs despite MORE surface). V 2.5-4k
    WIDENED as designed (+17 at 2.5k; 54 vs his 50 at 4k; both planes
    now match him at 4k), but LF V collapsed (115 -> 76 at 1k vs his
    110): partly honest physics (the wrap removes the bare rim's
    diffraction WIDENING), partly the curl-depth semantics discovered in
    this analysis -- buildWNRings maps wrap = 90 + flareWrap deg, so the
    default 135 rolled a 225-deg lip, far deeper than the reference's
    ~170. DEFAULT SOFTENED: flareWrap 135 -> 80 (= ~170 total, the
    reference's depth). Rear-rejection regression (-28.8 -> -10 at 4k)
    and an H@3150 collapse outlier are attributed to the under-resolved
    mesh pending the fine run. PROVENANCE.md drafted (scholarship frame:
    full-tool attribution incl. the Ahlswede published-work section,
    independence statements, no license language). THE FINE RUN is now
    genuinely load-bearing: 1k-V, the H narrowing, and rear rejection
    are all mesh-confounded at this tier. 242 checks.
169. (WRAP-RELEASE POLISH, 2026-07-16, "are there any other improvements")
    Four shipped: (1) WRAP-AWARE MESH SIZING -- the tier system sized the
    wrapped horn COARSER than bare (Measurement_5: 4784 vs 5248) for two
    compounding reasons: pathX9 omitted the roll's meridian arc AND the
    fixed tier budget spread over the lip's surface, which measures a
    full 1.67x area ratio; path-only made it WORSE (the budget clamp
    redistributed scarcity: 3600 -> 2896). Both fixes together:
    recommended tier 4736 elems / fMax 1157 / 86%, fine tier 9168 /
    1333 / 84%. (2) CURL-DEPTH HONESTY -- stats print "40 mm roll, 170
    deg total curl (dial + 90 deg tangent base)"; the 90+dial semantics
    discovered in entry 168 is now visible where designing happens.
    (3) SCHOLARLY ATTRIBUTION -- the PETF/HVDiff/tractrix comments
    rewritten to full citations (Salmon, Voigt, Dr. B. Ahlswede's
    published equations/plots, "see PROVENANCE.md"); the old blanket
    "sphericalhorns scrubbed" pin replaced by two directional
    guarantees: the WN region carries NO such reference (independence
    unambiguous) AND the attributions ARE present (the provenance-
    correspondence commitment, enforced). (4) THE LIP ON THE 2D PROFILE
    -- dashed roll arcs on both planes (16-segment, from the wall's own
    terminal tangent), so curl depth is designable by eye against the
    reference profile. 242 checks, fuzz 29 clean, live-verified (4 lip
    arcs, curl stats, zero page errors).
170. (THE RADIAL FLARE + RESOLUTION, 2026-07-16, Dr. Ahlswede's closing
    letter: permission clarified as courtesy TERMINOLOGY credit only
    ("PETF as a mathematical construct is public... its implementation
    requires no license" -- his words), preferred per-term links offered;
    p.s.: "The Neile rollover should not have a knee. A radial flare
    works better here.") HE WAS RIGHT: the lip launched tangent-
    continuous but with a CURVATURE STEP (wall ~0.003/mm -> 1/flareR =
    0.025/mm instantly). The lip is now a SPIRAL LAUNCH: curvature eases
    linearly over the first 30% of the wrap, integrated as a polyline in
    the (T, N) frame, sampled at equal turn fractions (row semantics
    preserved). Junction curvature now ramps 0.003/0.005/0.015/0.024/
    0.025 -- no knee; graded export 85%/6.9. PROVENANCE.md gained a
    Terminology section crediting PETF / HVDiff / the "William Neile
    horns" designation with his kind-permission phrasing, naming-only,
    independence of implementations restated. The dispute is resolved:
    scholarly attribution + terminology courtesy, no license over
    mathematics -- and the correspondence ended with the reference
    designer contributing a design improvement to the tool. 242 checks,
    fuzz clean.
171. (ARAI FIN-BLOCKAGE WALL COMPENSATION, 2026-07-16, community report on
    the public release + Arai's own published figure: "if you select no
    fins, the side wall profile stays the same. This is wrong") The
    reporter is right and Arai's three-panel figure is the spec: fins
    block cross-sectional area, so the sidewall must move with the fin
    mode to preserve the expansion law (finless = walls pulled INWARD,
    his dotted line). Architecture cause: S.fins was app-state consumed
    only at MESH time (araiFinMesh merge); computeFamily never saw it.
    FIX: araiFinBlockage post-pass on araiOptWall -- per-station blockage
    from the actual blade geometry (a blade at angle th crosses station
    z where z/cos th is within [R0, R1], presenting finT/cos th),
    smoothed +-4 stations, monotone-guarded, throat-clamped, ADAPTER
    EXCLUDED (the adapter H is linear by construction, entries 81+83 --
    the first attempt's smoothing bled into it and tripped the wedge
    pin). Reference frame: the calibrated walls ARE the published FINNED
    drawings, so arai4 = unchanged (bit-compat); "off" pulls in up to
    ~21 mm half-width mid-body and rejoins before the mouth; the 6-fin
    pack pushes slightly out. App passes fins/finT into computeFamily;
    smoke pins that validate published/photo-matched geometry now
    request fins:'arai4' explicitly (4 configs); the "off" label renamed
    "blockage-compensated walls" (the old "Crowe finless" label now
    describes different physics -- Crowe built Arai's finned walls
    without fins, uncompensated; a "Crowe as-built" mode could be added
    if wanted). 243 checks, fuzz 29 clean, live-verified (drawing
    responds to the fin toggle).
172. (FIN COMPENSATION v2: SMOOTH IN Z, 2026-07-16, Marwan with adaptL-80
    screenshots: "there are some issues still with the adaptor length
    affecting the horn side walls") The v1 compensation used a HARD
    per-blade crossing indicator and +-4-STATION averaging -- station
    counts are not physical, so at dense sampling the ramps collapsed
    into visible steps: a notch right after the adapter junction and
    jags at each blade's entry/exit (glaring at adaptL 80). v2 is smooth
    in z: per-blade smoothstep ramps (width 6% of horn length) at entry
    and exit, and a smoothstep GATE opening past the adapter (linear
    wedge untouched, entries 81+83). Verified at adaptL 25 AND 80: the
    compensated wall's max slope step now EQUALS the reference wall's
    own intrinsic piecewise joins (5.298 vs 5.294; identical at 80) --
    the compensation adds no roughness of its own; mid-body delta
    preserved (~21 mm/side); monotone. Forum render regenerated from the
    smooth geometry. 243 checks, fuzz 29 clean.
173. (SIZING-ORDER REGRESSION + THE INVALID RUN, 2026-07-16, "here is the
    final simulation") The delivered "final" run solved only 3168 elems
    (32 mm mean edges) and is UNUSABLE -- not merely band-limited:
    rear rejection collapsed to -3 dB at 800 Hz, H went non-monotone
    across frequency (60/99/89 vs prior runs of the SAME H wall), and V
    at 1 kHz fell to 52 under a SOFTER curl -- together the signature of
    BEM LEAKAGE through an under-resolved thin curl (inner/outer lip
    surfaces ~6 mm apart under 32 mm elements corrupts ALL frequencies,
    not just above lambda/6). ROOT CAUSE MINE: entry 169's area-ratio
    budget scale was wired AFTER bemBandSize had already consumed the
    unscaled budget -- only the roll-arc path increase took effect,
    which ALONE shrinks segs (the clamp redistributes scarcity; my own
    bench demonstrated this and I wired the wrong order anyway). FIX:
    ratio computed and applied to bud9 BEFORE bemBandSize; the late
    dead-code block removed. Verified end-to-end mirrors of the app
    path: recommended tier 4880 elems / fMax 1087 / 82%, fine tier 9408
    / 1264 / 84%. Pin added (order + formula). LESSON, now twice paid:
    a fix verified in a bench that BYPASSES the production call path is
    not a verified fix. The arbitration run remains open: fresh
    defaults, FINE tier, free-standing, 3 m -- the export should now
    report ~9.4k elems, and if it does not, stop and check.
174. (ADAPTER DECOUPLING: THE FAN-ORIGIN FRAME, 2026-07-16, Marwan with
    3-D screenshots: "attaching our adaptor to another square part...
    the adaptor should not modify the Yuichi horn at all") Root cause of
    the entire adaptL-coupling chain: the blade z-windows omitted the
    FAN ORIGIN. R0/R1 are radial distances from the fan apex at
    layout.originZ, which translates with adapter length (-9.5 at
    adaptL 25 -> +45.5 at 80); the windows used R cos(th) in ABSOLUTE z,
    so blockage landed an adapter-shift too early, the adaptL-keyed gate
    fought it, and the interference drew the "second square part" after
    the adapter. FIXES: (a) windows anchored at originZ (translate with
    the horn automatically); (b) the adaptL gate REMOVED; (c) ramp width
    now FIXED 25 mm (a %-of-length ramp broke translation invariance);
    (d) a 12 mm junction clamp protects the adapter itself from ramp
    back-bleed. VERIFIED: horn-side delta profile origin-invariant to
    0.14 mm across adaptL 25/80 (the adapter no longer modifies the
    horn); adapter contamination exactly 0.000 mm; mouth shape
    difference between fin modes 1.85 mm nearest-point on a 630 mm
    mouth (arc-length resampling, not visible). The reported boxy mouth
    corner may be PRE-EXISTING (cornerR 0 + bullnose on a sharp rect
    corner): side-by-side corner renders generated for Marwan's eye --
    if both modes show it, it is a separate item with its own history.
    NOTE: the underlying horn translates rigidly with adaptL (verified
    z=350 walls equal) -- the "separate element" architecture was intact;
    the coupling was entirely the compensation frame error. 244 checks,
    fuzz 29 clean.
175. (THE THROAT COLLAR, 2026-07-16, Marwan with the red/green boxed
    screenshot: "why is there these two sections of the throat... why
    not have the adaptor connect directly to the horn") The red section
    was the COMPENSATION COLLAR: near the throat the blades block up to
    ~66% of the local channel, pure width subtraction demanded a wall
    below the throat radius, and the throat-clamp + monotone guard
    turned that impossible demand into a DEAD-FLAT 35 mm parallel tube
    (slope 0.000 from z 27-62) grafted between the adapter and the
    flare -- literally a second throat. Arai's own figure deviates
    MID-BODY and tapers at the throat. FIX: a GROWTH FLOOR -- the
    compensated wall keeps >= 30% of the reference's expansion
    everywhere (floor -> 25 mm blur -> floor; the blur removes the
    floor-engage corner and is junction-GATED so it cannot re-import
    deltas across the adapter boundary, which the first blur did).
    RESULT: zero flat stations, deviation phases in (-3.9 at z 35,
    -11.9 at 55, full -21.3 by 90 -- the Arai dotted-line shape),
    adapter untouched to 0.01 mm, mouth equal, monotone, adaptL
    invariance 0.15 mm. Throat-region render regenerated. 244 checks,
    fuzz 29 clean.
176. (UNIVERSAL PLATE + THICKNESS, 2026-07-16, Marwan: "why do not all
    driver families have the driver plate mounting option or the wall
    thickness? this feels like something needed generally") He is right
    -- the gating was historical accretion, not principle. STATE FOUND:
    thick hidden for wn while S.thick silently drove its solid shell
    (the exact entry-152 iwata trap, recurring); plate keys + the merge
    excluded wn/biradial though buildDriverPlate + the bore sweep use
    generic prof.H/prof.V; and the BEM path NEVER received S.thick --
    every family's BEM shell was pinned at 6 mm regardless of the dial.
    CHANGES: thick + all six plate keys un-gated for ALL families (my
    first pass excluded iwata on a "machined cut" theory -- the entry-152
    pin corrected me: the sawed exit accepts a plate, that decision was
    already made); the plate merge condition is now just plateT > 0;
    buildBEMProject receives thick: S.thick. VERIFIED: wn BEM shell
    responds to thick (2768 vs 2864 elems at 4 vs 10 mm), wn solid
    responds (6.0 mm vertex delta), plate controls visible + STL export
    clean for wn and biradial live (zero page errors). Pins updated to
    the universal policy (two old gating pins asserted the exclusion
    strings). 243 checks, fuzz 29 clean.
177. (SECTION-TRUE PLATE BORE, 2026-07-16, Marwan + plate screenshot with
    the crescent: "sometimes the plate doesn't attach cleanly to the
    horn or the horn thickness doesn't match the calculation") Two
    defects: (1) the plate bore was a CIRCLE of max(H, V) -- perfect on
    round throats, crescent gaps at the minor axis on H != V families,
    which are exactly the ones entry 176 un-gated (wn, biradial); (2)
    the union recess was COUPLED TO WALL THICKNESS (rec = clamp(thick -
    1.5, 0.4, 1.0)) so the fit drifted with the thickness dial -- "the
    thickness doesn't match the calculation". FIXES: boreProf entries
    now carry the horn's true section (r = H + 0.6, rV = V + 0.6,
    superellipse n = 2, or 6 for rect throats); buildDriverPlate sweeps
    the bore per-azimuth through seFac and the plate's inner THREE face
    rows morph from the bore's section shape back to circular (stitch
    preserved; legacy circular entries return factor 1 = bit-compatible);
    recess constant 0.6 mm (entry 106's union overlap). VERIFIED: wn
    bore-vs-wall gap 0.28..0.60 mm at all 96 azimuths (no airway
    protrusion, no crescent); live STL export clean for wn, biradial,
    jmlc with 15 mm plates; the flush pin's greps updated to the new
    contract (its 18.8 expectation stands -- it feeds the builder a
    synthetic bore, testing the builder not the app formula). 244
    checks, fuzz 29 clean.
178. (THE ROLL BATTERY + THE ARAI CORNER FINDING, 2026-07-16, Marwan +
    mouth-corner screenshot: "the top horn bends well but the sides do
    not bend... anytime we change the geometry then the roundover
    breaks. We need a full proof method") TWO DELIVERABLES: (1) rollAudit
    (engine, exported) -- universal roundover invariants: C1 LAUNCH (max
    angle between the roll's first step and the wall's terminal meridian
    across azimuths -- a lip IS a bad launch), FRAME SHEAR (worst roll-
    row azimuthal step over the rim row's own -- the entry-167 WN
    diagnostic, generalized), LEDGE (worst row advance over the median),
    FINITE. buildSolidMesh now returns its layout to make the audit
    possible. THE ROLL BATTERY in smoke: every rolled family at multiple
    geometries with pinned thresholds (launch < 35, shear < 2.5, ledge
    < 3.5) -- any geometry change that breaks any roll now trips the
    suite BY NAME. Baselines: biradial bullnose 4deg/1.1/1.1 at both
    adapter lengths, wn wrapped 4deg/1.0/1.1, jmlc clean (axisym V=H).
    (2) THE FINDING: the reported side lip is NOT a roll defect -- the
    bullnose audits clean, the ring rows grow smoothly -- it is the
    ARC-MOUTH construction's DOCUMENTED intent ("the junction is the
    single natural crease where the cone meets the fan -- exactly what
    the hardware has"): the real A-290's rolled top panels meet the flat
    side wings at a crisp seam, and our loft reproduces it. Feathering
    that corner (sides participating in the curl) = a design refinement
    OVER the original, touching the most battle-hardened code in the
    project (entries 81-84 + the v2 loft) -- scheduled as its own
    session with the roll battery as the acceptance test. 245 checks.
179. (INDEPENDENT PER-SIDE ROLLBACK FOR THE ARAI + THE BATTERY'S FIRST
    BUG, 2026-07-16, Marwan + back-view screenshot: "you can see the
    edge from the back... you may need to create independent roll back
    for these square like horns for each side") TWO discoveries: (1)
    buildAraiFanRings ALREADY had an inline lip path (flareR > 0.5, 10
    rows) using the pre-entry-167 LATERAL-frame roll -- the corner shear
    disease in another body; (2) THE ROLL BATTERY AUDITED THE TOOTHLESS
    CONFIG (rings built with flareR 0), so the defective lip never
    entered the audit -- Marwan's screenshot caught what the battery did
    not. FIXES: the WN lip factored into surfaceFrameLip(pos, M0, segs,
    flareR, wrapDeg, FS) -- fully grid-generic (the wn-specific
    outwardness vote replaced by the rim row's own lateral coords,
    numerically identical); buildWNRings calls it (post-refactor audit
    4/1.00/1.06 = baseline); buildAraiFanRings' old lip REPLACED by the
    helper. On a rect mouth the surface frames ARE "independent roll for
    each side": top/bottom roll about horizontal axes, sides about
    vertical, corners blend continuously. Arai lip shear now 1.37x rim,
    solid audit 4 deg / 1.01 / 1.06. The battery now audits WITH flareR
    at both adapter lengths. Back-corner render regenerated. 245 checks,
    fuzz clean. LESSON: an audit that does not exercise the shipped
    configuration audits a fiction -- the battery's thresholds were
    fine, its INPUTS were wrong.
180. (2D LIP FOR THE BIRADIAL + THE RESIDUAL EDGE NAMED, 2026-07-16,
    Marwan: "much better but there is still a little edge vs the roll
    back being more natural and shouldnt it be displayed here?") (1) The
    entry-169 lip drawing was gated to wn only -- widened to both
    surface-frame-lip families; the biradial 2D profile now draws its 4
    dashed roll arcs (live-verified). (2) The residual edge DIAGNOSED,
    not patched: the lip's own launch is clean (per-azimuth launch
    angle: mean 0.8 deg, max 2.8 -- and NOT at the corners), so the
    visible line is the ARC/WING CREASE in the wall surface itself (the
    entry-178 finding: the loft's documented "single natural crease
    where the cone meets the fan", faithful to the real A-290's panel
    joint) propagating into the lip band's base. Making it "more
    natural" = feathering that junction = the deferred design-refinement
    session on the hardened loft (entries 81-84), with the roll battery
    as the acceptance harness. 245 checks.
181. (THE ARBITRATION RUN, 2026-07-16, Results_9: fine tier at last --
    10,704 elems, 17.5 mm mean edges, strict fMax 1357 / mean-edge 3268)
    GATES: rear rejection -12/-17/-23/-27/-25 dB at 500/800/1k/1.6k/2k
    (healthy -- the coarse runs' rear regression confirmed as LEAKAGE,
    the diagnostic held) and fresh data (H@800 = 81 vs the stale 99).
    THE VERDICTS: (1) THE V WAIST IS GONE -- the full V trend reads
    105/90/76/65/63/61/61/57/51 from 500 Hz to 4 kHz, a smooth monotone
    CD curve, vs the pre-slot 154/107/86/69/48/43/35/38/34 with its deep
    2-2.5 kHz collapse. V@2k = 61 vs the reference's 66 (was 43): the
    slot + wrap closed the campaign's central gap to 5 deg. V@4k 51 vs
    50 (indicative band) -- matched. (2) THE 1 kHz TRADE IS REAL
    PHYSICS: V@1k 76 vs his 110 at fine mesh -- the wrap removes the
    bare-rim diffraction widening that his design retains more of;
    effective-aperture arithmetic fits (mouth + curl reach ~ 380 mm ->
    ~67-76 deg). H@1k 69 vs his 90: same mechanism + slot-interior
    coupling (confirmed real, was mesh-ambiguous). The trade is DIALED:
    flareR down trades 2 kHz control back toward LF width. (3) The horn
    as shipped is a DIFFERENT DESIGN PHILOSOPHY from the reference:
    tighter pattern control + far better rear rejection vs his wider
    diffraction-assisted LF -- and every difference now maps to a dial
    (flareR, wnCovV, wnCovH). THE WN CAMPAIGN IS CLOSED: geometry
    converged through five V-law revisions and the wrap chain, physics
    measured at honest mesh, every mechanism named. Final isobars at
    /mnt/user-data/outputs/wn_final_isobars.png.
182. (WN VOICING PRESET + THE BERND CLOSE, 2026-07-16, Marwan: "we want
    an option that mirrors his BEM results because everyone was
    impressed with it" + Bernd's request for WN class-concept credit +
    his homepage-link offer) (1) PROVENANCE.md WN section updated:
    implementation independence retained verbatim, PLUS the class
    itself credited -- Neile's semicubical parabola as a horn profile +
    the equal-path principle = Dr. Ahlswede's September 2021 creation
    (his link, the FIRST per-term link he has supplied), "of which this
    family is an independent member... as the JMLC method has inspired
    later work, including his own". (2) wnVoiceSel dropdown (wn only):
    "controlled" (40/170: the default, arbitration-validated CD +
    rear rejection) vs "reference-style" (18/150: diffraction-assisted
    wider LF approximating the WN300ALO balance, HONESTLY labeled
    approximate -- interpolated from the three calibration runs, not
    itself BEM-verified). Applies the recipe to flareR/flareWrap and
    refreshes the inputs (applyFamilyDefaults pattern). One splice bug
    en route (string-concat chain broke finsSel's quote); live-verified
    clean. 245 checks, fuzz 29 clean.
183. (THE NAMES GROW UP, 2026-07-16, Marwan: "should it be now called
    william niels inspired and yuichi inspired or just remove inspired")
    "Inspired" was doing LEGAL work during the dispute -- asserting
    distance. Post-resolution it underclaims on both sides: the WN is a
    documented member of the class Ahlswede coined and WANTS adopted
    ("this created a complete new class"); the Arai is calibrated to
    the published A-290 to book accuracy -- a reconstruction, not an
    inspiration. RENAMED: wn -> "William Neile biradial (equal-path)";
    biradial -> "Yuichi biradial (after Arai)" ("after X" = the standard
    convention for a faithful implementation of a published design).
    Equation-panel prose cites the class (Ahlswede 2021; see
    PROVENANCE); PROVENANCE.md records the naming rationale inline.
    245 checks.
183. (THE NAMES GROW UP + THE CREDIT THAT DIDN'T LAND, 2026-07-16,
    Marwan: "should it be called william neile inspired and yuichi
    inspired or just remove inspired") "Inspired" was doing LEGAL work
    during the dispute -- asserting distance. Post-resolution it
    underclaims on both sides: the WN is a documented member of the
    class Ahlswede coined and explicitly wants adopted; the Arai is
    calibrated to the published A-290 to book accuracy -- a
    reconstruction, not an inspiration. RENAMED: wn -> "William Neile
    biradial (equal-path)"; biradial -> "Yuichi biradial (after Arai)".
    ALSO: the previous turn's PROVENANCE class-credit patch had
    SILENTLY MISSED (the anchor lacked the file's two-space continuation
    indents; the reported success was wrong) -- discovered when this
    turn's naming note failed to anchor. Re-applied against the real
    bytes: class credit + his 2021 link + the naming rationale now
    verifiably in the file (grep-confirmed). Equation-panel prose cites
    the class. LESSON: patch anchors must come from reading the file,
    not from memory of writing it. 245 checks.
184. (VIRTUAL-ORIGIN OS ENTRY, 2026-07-16, forum report: Classic OS,
    39 mm / 10.5 deg included / 12 mm driver exit -- "this would result
    in a discontinuity, making the generated .step file unsuitable")
    The reporter's Fusion ripples were OURS, twice over. (1) The generic
    straightEntry graft is GEOMETRICALLY DOOMED on the OS: the straight
    segment lands BELOW the OS wall (20.6 vs 22.9 mm at z=12), and any
    C1 catch-up to a 45-deg-asymptote curve must overshoot the asymptote
    -- measured 48.5 deg peak + 9 slope-direction reversals, each one a
    CAD spline ripple. No blend length fixes it; the deficit never
    amortizes against an asymptote. (2) FIX = Geddes' own construction:
    osVirtualEntry re-solves the OS with a VIRTUAL ORIGIN (z0 = r1 tanA
    / tan^2 th, rc^2 = r1^2 (1 - tan^2 A / tan^2 th)) so the waveguide
    itself starts at the driver angle: C1 junction by construction,
    slope monotone 5.25 -> 45 deg, overshoot impossible, Keele mouth
    radius preserved. The app routes osc there; the generic graft
    remains for shallow-throat families, now with adaptive blend length
    + physical-width slope stencil + Fritsch-Carlson clamp. SEMANTICS
    CLARIFIED for the reply: z=0 = the DRIVER EXIT FLANGE; throatD = the
    flange diameter (39); the entry models the HORN's first exLen mm
    continuing the driver angle -- the driver's internal cone stays in
    the driver. PROCESS LESSON, third of the day: straightEntry lives in
    engine.js and is EMBEDDED by rebuild.py -- the first patch edited
    the html copy and the rebuild silently clobbered it (the call-site
    branch survived, producing a runtime ReferenceError). Engine edits
    go in the engine. Entry-104 pin updated to the adaptive contract.
    245 checks, fuzz 29 clean.
185. (THE ARTIFACT SUITE + TESTING.md, 2026-07-16, Marwan: "add these
    kind of testing to the handoff file and in general save it somehow
    so that we dont have to make mistakes again") The day's four paid
    lessons are now INFRASTRUCTURE. (1) artifact_test.js -- a fifth
    verification rung above the smoke suite: Chromium drives the REAL
    UI, presses the REAL export buttons, intercepts the REAL blobs
    (URL.createObjectURL hook installed before any click), and measures
    the artifacts users receive. Cases: T1 = the entry-184 forum config
    (39/10.5/12 Classic OS) as a permanent regression test -- CSV
    captured via the actual button, throat exact, entry cone verified,
    radius monotone, peak slope < 45.5 (the broken build hit 48.5); T2 =
    CSV sanity sweep at FAMILY DEFAULTS (jmlc, wn, biradial, os) --
    finite, non-decreasing to the radius max, real point counts; T3 =
    mesh export with a 12 mm plate on wn via the family-appropriate
    button (1.82 MB artifact). The harness false-failed TWICE on its
    maiden run and both corrections are documented in its comments: the
    CSV is block-structured (H then V, z restarting -- sorting
    interleaved fake dips) and rings families ship a different export
    button set (INTERIOR SURFACE STL, not STL SOLID). Even the test
    harness needed artifact-level debugging -- which is the argument
    for it. (2) TESTING.md: the verification ladder (bench -> smoke ->
    fuzz -> live UI -> artifact), the four lessons with their entry
    numbers, the leak-diagnostic corollary, extension rules (every
    user-reported geometry bug becomes a permanent T-case), and the
    updated workflow. ALL PASS: smoke 245, fuzz 29, artifact suite 14/14.
186. (PER-PLANE ROLL RADII, 2026-07-16, Marwan: "how can we make this
    possible" -- the WN300ALO combination, 110 deg at 1 kHz WITH 66 at
    2 kHz) The reframe that makes it approachable: the bare-rim run
    ALREADY has his 1 kHz number (115 vs 110) -- the gap is bare V@2k 49
    vs his 66. The V pattern diffracts from the TOP/BOTTOM rim edges,
    the H pattern from the SIDES, so per-plane roll radii decouple the
    two: deep side roll contains H while a shallow top/bottom roll
    leaves the V rim near-bare at LF. IMPLEMENTED: surfaceFrameLip
    accepts flareRV; radius per azimuth from a p-norm EDGE weight (p=4)
    on the rim point's normalized lateral position -- an angle
    (cos^2/sin^2) blend cannot reach the extremes on a RECT rim because
    the top edge holds max |y| across the full width (first attempt's
    ratio 1.2; second bug: the injected radius referenced a hoisted j2
    from an earlier loop instead of the roll loop's j3, freezing the
    radius at one azimuth's value). VERIFIED: flareRV = flareR bit-EXACT;
    side/top curl chord 85.8/17.2 mm at 40/8 (ratio 5.0, both matching
    the 2r sin(85 deg) prediction); asymmetric lip passes the roll
    battery (4/1.00/1.06); full ladder green incl. the artifact suite.
    App: flareRV dial (wn), 6 call sites plumbed. THE EXPERIMENT NOW
    RUNNABLE: flareR 40 / flareRV 6-10 / covV ~70 -> predicted V@1k
    95-110 (top rim near-bare at lambda 344), V@2k 55-62 (partial top
    control + full side H containment). One honest BEM run decides
    whether his combination is reachable from our construction -- and if
    not, the remaining gap IS the semicubic law's intrinsic 2 kHz
    control, measured.
187. (THE FOLD, THE VERDICT SYSTEM, AND THE TURN TAPER, 2026-07-16,
    Marwan: "anything we can fix?" after the flareRV-8 run leaked at
    -2.6 dB rear, worst at LOW frequency) Three deliverables in causal
    order. (1) CURL RESOLUTION VERDICT: buildBEMProject computes
    meanEdge / curlRMin against three calibrated points (0.44 validated,
    0.81 leaked, 3.2+ catastrophic; safe <= 0.55, MARGINAL to 0.8,
    UNRESOLVABLE above); the export handler confirms-blocks on non-
    resolved verdicts, naming the structure, the expected symptom, and
    both fixes. (2) The verdict's FIRST OFFICIAL ACT was invalidating my
    own revised prescription (flareRV 20 @ fine = 0.94, still in the
    leaked band) -- and its calibration bench initially used an UNSCALED
    budget, the production-path sin recommitted while building the tool
    against it (caught, mirrored properly). (3) THE MECHANISM REDESIGN:
    a small radius turning the full 170-degree wrap FOLDS back with an
    air gap no affordable element resolves -- the fold comes from the
    TURN, not the radius. flareRV is now a WRAP TAPER: radius stays
    flareR everywhere (the validated 0.46 regime); the top/bottom turn
    shrinks to flareRV/flareR of the full wrap. A <= 90-degree turn
    never doubles back: NO fold, NO thin gap, meshable at any density,
    and a ~32-degree relief is acoustically near-bare at 1 kHz.
    VERIFIED: bit-EXACT at flareRV = flareR; top turn 32 deg / side 159
    at 8/40 (no fold); roll battery 4/1.00/1.06; the experiment config
    (taper 8, fine tier) now sizes 9,632 elems with verdict RESOLVED --
    the only folding curl is the validated 40 mm side. LEAK-SHAPE
    ADDENDUM for TESTING.md: leakage worsening toward LOW frequency
    means the thin structure is SMALL; toward high frequency means it is
    marginal. Entry-186 pin updated to turn-taper chords. 246 checks,
    fuzz clean.
188. (THE QUARTER THAT WASN'T, 2026-07-16, Marwan's screenshot of a
    quadrant mesh + "the mesh did not export the rollback") Forensics in
    order: (1) the re-uploaded msh is FULL (x -370..370, y -174..174)
    with quadrant-consistent winding -- the rollback IS exported (370 vs
    bare 301 = the side curl; the top reads near-bare BY DESIGN under
    the turn taper); (2) the quarter screenshot is NOT reproducible from
    the current build for wn: the engine THROWS on quarter+rings
    (entry-150-era guard) and syncSymEligibility forces the dropdown to
    full for rings families -- a stale build in an old tab is the likely
    source on a day with a dozen shipped builds; (3) the bLab project
    writer is coherent (symmetry: "xy" when quarter, "off" when full --
    the uploaded json's "off" proves its mesh was full). HARDENING:
    quarter exports now carry _QUARTER_xy in the FILENAME so a mesh
    separated from its project self-identifies. CURRENT FILE VERDICT:
    3,888 elems at 25.6 mm = recommended tier = MARGINAL (0.64) on the
    40 mm side curls -- the experiment still needs the FINE tier
    (expect ~5,456, verdict resolved). 246 checks, fuzz clean.
189. (TYPING-SAFE INPUTS, 2026-07-16, forum user: "when I'm trying to
    fill in the throat diameter, 22mm for example, for some reason it
    goes to 42mm? This happens with quite a few fields") The per-
    keystroke clamp WROTE BACK into the field: typing "2" clamped to the
    min ("4"), the second keystroke appended -> "42". Every multi-digit
    value below a field minimum was untypeable, on every number field in
    the app. FIX: while TYPING, the field belongs to the user -- state
    and the slider follow the clamped value silently; the field
    normalizes only on COMMIT (change/blur/Enter). Slider drags still
    write the number field (no one is typing there). Live-verified with
    real keystrokes: "22" stays "22", commits as 22, drawing applies
    22.00. AUDIT-#12 pin updated to commit semantics; T4 added to the
    artifact suite as the permanent regression case (real keystrokes,
    per the every-user-bug-becomes-a-T-case rule). 246 checks, fuzz
    clean, artifact suite 16/16.
190. (PURE-OS LAUNCH + THE ROLL RESTORED, 2026-07-16, the entry-184
    reporter's second review: "the correct point (Z=0/r=19.5) should
    actually be your point at (Z=12/r~20.6)... in addition the roundover
    does not work any more") Right on both counts. (1) THE ENTRY CONE
    WAS A DUPLICATE: his 12 mm cone is INSIDE the driver, behind the
    mounting flange -- the assembled system would have carried 24 mm of
    near-conical channel. The horn is now pure OS from z=0, launched AT
    the driver angle (virtual origin at the throat itself: r(0) = rt,
    r'(0) = tanA exactly); exitLen no longer shapes the osc horn and its
    control is hidden for the family (exitDeg alone triggers the
    angle-matched launch). (2) THE ROUNDOVER REGRESSION WAS v1's: the
    profile arrives from profOf WITH the mouth roll appended (descending
    tail), and the v1 rebuild flattened it monotone to the LAST radius.
    v2 rebuilds only to the input's radius MAXIMUM and re-appends the
    roll tail translated to the new mouth. Artifact-verified at his
    exact config through the real CSV button: z=0 = 19.50, profile
    curving immediately above the cone line, descending roll tail
    present, monotone to the max, peak slope under the asymptote. T1
    rewritten to the corrected truth. 246 checks, fuzz clean, artifact
    suite green.
190b. (CORRECTION TO 190, same session) Entry 190's claim of "descending
    roll tail present, artifact-verified" was FALSE -- written from the
    engine bench before the artifact suite ran, and the suite then
    failed it (tail pts: 0). Two errors: (1) the v2 split used the
    radius MAXIMUM to find the roll, but the default flare is a
    90-degree FLUSH roll whose radius stays MONOTONE -- the whole roll
    read as body and was absorbed into the OS (the reporter's 994.5 mm
    "mouth" was the roll's reach flattened in); (2) the roll's artifact
    signature is therefore NOT a descending tail but the PLANE-FLUSH
    curl: steep end slope (measured 3.8 vs the body's <= 1.0). v3 splits
    STRUCTURALLY at the profile's baseStations marker and returns a body
    of exactly baseN points so downstream index consumers stay valid.
    T1's invariants corrected (flush-tail slope; body-scoped overshoot
    check). LESSON, again in a new costume: the entry was written before
    the artifact suite ran -- log entries claiming verification must
    POSTDATE the verification. 246 checks, fuzz clean.
191. (THE DEEP PHYSICS AUDIT, 2026-07-16, Marwan: "check everything...
    you tend to sometimes change things and forget core principles")
    Audited every physics-touching change from today against research
    and artifact-level measurement. VERIFIED CLEAN: (A) osVirtualEntry's
    coverage mapping is IDENTICAL to osWall's (clamp(cov/2, 15, 70), no
    hidden correction) -- measured terminal coverage on the real CSV:
    89.9 deg vs the 90 dial, the Geddes asymptote exactly preserved
    through the virtual-origin rebuild; (B) the loading/response charts
    consume actProf = profOf output at all 4 call sites, so Webster
    loading DOES see the entry modifications (the reporter's "crucial
    for loading" concern is honored by construction); (C) rho/seNArr
    alignment: the v3 rebuild keeps exactly baseStations points and osc
    uses ellipse sections where corner-rho is inert -- alignment
    preserved, zero page errors across all live paths; (D) Keele mouth
    law intact: body mouth 806 mm = 25.4e6/(f0 cov) exact at the
    reporter's config (859 with roll reach); (E) the standing research
    anchors all green in the suite: JMLC-vs-Mie 0.28%, Arai published
    dims (fins:'arai4'), WN equal-path 1e-13, CD Keele widths.
    DOCUMENTED, NOT CHANGED: exitLen semantics are now family-dependent
    -- for osc it is driver information (hidden; exitDeg launches the
    OS), for other families it remains a horn-side machined entry
    feature (entry 104's purpose, a real feature of commercial horns);
    both are legitimate designs, the asymmetry is intentional and
    recorded here. HARDENED: T2 now asserts throat radius = dial/2 on
    every family's real CSV export. 246 checks, fuzz clean, artifact
    suite green.
192. (THE CONTROLS RESTORED, LOADING-ONLY BORE, 2026-07-16, same
    reporter, third round: "Roundover works again. However, the
    adjustment options for the depth and angle of the conical outlet
    have disappeared") Entry 190's hiding of exitLen for osc took
    exitDeg with it -- the entry-104 sub-param rule slaves the angle to
    the length, and hiding the master hid both, including the one
    control the osc REQUIRES (the angle launches the OS). FIXES: (1)
    exitDeg visibility is independent for osc (the angle IS the master
    there); (2) exitLen RESTORED for osc with honest new semantics --
    "Driver entry L (osc: loading only)": the driver internal cone now
    enters the WEBSTER AREA LAW as a prepend behind z=0 (six stations to
    the phase plug) at the chart call sites only, honoring his original
    "crucial for accurately calculating loading" point PRECISELY: the
    loading model sees the full acoustic path, the exported geometry
    never contains the driver bore. Live-verified: both controls visible
    for osc; the CSV still starts at exactly (0, 19.5). 246 checks, fuzz
    clean, artifact suite green.
193. (THE VERSION SWEEP: ELLIPTICAL OSC, 2026-07-16, Marwan: "test a few
    versions and analyze the mesh and drawing and make sure it is
    right") Swept four osc configurations at the artifact level
    (reporter 90/90, pristine exitDeg 0, ELLIPTICAL 90x60 + angle,
    flareR 0 + angle). Two real bugs found in the elliptical case, both
    invisible at 90x90: (1) isRound() checks section/aspect but NOT
    covH vs covV -- and Classic OS ellipticity comes FROM the coverage
    split, so elliptical osc read as round everywhere isRound is
    consulted and the CSV silently dropped the distinct V wall; fixed
    with an osc per-plane-cov check. (2) osVirtualEntry v3 resampled
    each plane over its own zMouthNew grid, breaking the per-index H/V
    z-alignment the sections loft requires; v4 recomputes r ONLY on the
    profile's OWN z stations (alignment holds BY CONSTRUCTION), and the
    roll tail appends verbatim with a small r-translation (dR9) so the
    arc stays attached. MEASURED on the real CSV: body max |z_h - z_v| =
    0.0000 mm over 694 stations; the roll-tail z's diverge up to ~30 mm
    per plane BY DESIGN (each lip curls from its own mouth radius).
    All four configs: finite, NaN-free drawings, zero page errors,
    throats exact. T5 added as the permanent elliptical regression case.
    246 checks, fuzz clean, artifact suite green.
194. (3D ZOOM RANGE, 2026-07-16, Marwan: "Sometimes you cant zoom
    enough on the 3D model") The wheel clamp floored zoom-in at
    fit*0.5 -- half the fitted view, which on an 800 mm horn keeps the
    camera hundreds of mm from the throat; detail inspection (entry
    junctions, roll geometry, fin roots) was impossible. Floor now
    fit*0.04 (12x closer), ceiling fit*6 (was 5). The camera near plane
    (1 unit) stays ~8x below the closest approach on typical horns, so
    no clipping. Live: 80-tick zoom cycles dispatch clean with zero page
    errors; THREE itself is CDN-loaded and unreachable in the sandbox,
    so the canvas render is verified by the unchanged handler contract
    plus the clamp pin. 247 checks.
195. (THE BUILD STAMP, 2026-07-16, Marwan: "I do not see the adjustment
    options" -- but the shipped artifact, verified fresh, SHOWS both osc
    exit controls with the new label; a stale tab, the second stale-
    build incident today after the quarter screenshot) The recurring
    mystery gets a permanent answer: rebuild.py now injects a visible
    build stamp (latest PROJECT_STATE entry number + date) next to the
    3D panel note, idempotently replaced on every rebuild. Pinned: the
    stamp's entry number must match PROJECT_STATE's last entry. Also
    re-verified on the shipped file: osc shows angle + depth; os/jmlc
    correctly slave the angle to exitLen > 0 per entry 104. 248 checks.
196. (THE VISIBLE LAUNCH, 2026-07-16, Marwan: "I see the controls but I
    do not see any changes made on Geddes classic os after moving them")
    The dial was ALIVE the whole time -- CSV-proven on the shipped
    build: exitDeg 0 -> 25 moves the wall by +1.1 mm at z=5 up to +4.1
    at z=80. But 1-4 mm on an ~850 mm drawing is two pixels: real and
    invisible. FIX: a dashed driver-angle TANGENT at the throat (both
    walls, labeled "driver N deg tangent"), drawn for osc when exitDeg >
    0 and hidden at 0 -- it moves visibly with the dial and lets anyone
    verify the tangent departure by eye, the same check the forum
    reporter does in CAD. One scope bug en route (prof vs actProf --
    caught by the suite's ReferenceError, fixed). Live-verified at 10.5
    / 24 / 0: label follows the dial, two dashed lines present, hidden
    at zero, zero page errors. 248 checks, fuzz clean, artifact suite
    green.
197. (THE HONEST DIAL, 2026-07-16, Marwan: "The angle works but the
    Driver entry L (osc: loading only) does not") It DOES -- chart
    digests differ measurably between exitLen 0 and 40 (branch verified:
    osc falls through to the default axial branch where the bore prepend
    lives; zero errors; no NaN in any chart). The perceptual truth: a
    12 mm driver bore shifts the impedance comb by ~1 percent, which is
    real physics and invisible at chart scale -- and unlike entry 196
    there is no honest way to magnify it. So the chart DECLARES the
    model state instead of pretending drama: "LOADING INCL. DRIVER BORE
    12 mm @ 10.5 deg" annotates the impedance chart whenever the bore is
    active, disappearing at zero. The user sees THAT the model includes
    it; the physics decides HOW MUCH it matters. Live-verified both
    states. 248 checks, fuzz clean, artifact suite green.
198. (MIKE'S FINS, 2026-07-17, DIY Audio user Mike: tractrix fc270
    A1.5, zero roundover, NURBS STEP in Fusion shows pleated "fins"
    around the throat) Investigated at the artifact level: captured the
    NURBS STEP at his exact config from the CURRENT build, parsed the
    control net (110 x 49), and EVALUATED the spline with de Boor --
    throat ring perfectly round (ripple 0.00 mm), 0.03 mm at z=15,
    0.48 mm at z=59 (the legitimate circle-to-superellipse morph). His
    cm-scale pleats are an OLD-BUILD bug already fixed by intervening
    work; he is on the public DIY Audio release. Remedy: re-download
    (the build stamp now makes version identity checkable), plus a
    Fusion workaround for his existing file. T6 added: the NURBS STEP
    at his config must keep ring-0 spread < 0.2 mm and azimuth drift
    < 2 deg, permanently. 248 checks, artifact suite green.
199. (MIKE'S FINS, THE REAL STORY, 2026-07-17 -- CORRECTING ENTRY 198)
    Entry 198's all-clear was FALSE: the test set a NONEXISTENT selector
    id ('sectionSel' vs the real 'sectSel'), silently tested a ROUND
    horn, and certified a circle for staying circular. Marwan's "none of
    these are square? pay double attention" exposed it: the "square"
    mouths measured corner/side 1.007 = circles. WITH the real rect
    section, the fins EXIST IN THE CURRENT BUILD: throat-zone surface
    ripple 0.21-1.46 mm, rendering as Mike's pleats under CAD shading.
    ROOT CAUSE in planeProfiles: the corner-radius ramp was ABSOLUTE
    from the THROAT radius -- the horn flares away from rt immediately,
    so one station in, (a - rho) is already large and the section is a
    rectangle with big corners: the morph starts at full speed, and the
    interpolating NURBS turns the instant onset into azimuthal pleats
    (analytically confirmed: predicted ring-1 spread 0.53 mm, measured
    0.559). FIX: RELATIVE ramp from the LOCAL round-equivalent radius
    (rhoT = P[i].r + (target - P[i].r) w) -- exact circle at every
    station at w = 0, identical mouth at w = 1. MEASURED at the
    artifact level, real STEP, real rect: ring-1 data spread 0.559 ->
    0.044 mm (13x); evaluated surface ripple 0.21/0.55/0.98/1.46 ->
    0.09/0.10/0.21/0.41 mm across the throat zone. T6 rewritten: asserts
    the selector applied, tests the RECT section, thresholds recalibrated
    to interpolation reality. LESSONS, both already in TESTING.md and
    both violated anyway: a test that does not verify its own setup
    tests nothing; and the audit-a-fiction lesson (entry 179) has now
    cost two entries. 248 checks, fuzz clean, artifact suite green.
199b. (T6's METRIC CORRECTED, same session) The rewritten T6 first
    asserted the CONTROL NET (ring-0 spread < 1.0 mm) and FAILED at
    3.58 mm on the FIXED build -- because an interpolating spline
    legitimately swings its end control row while the surface gets
    cleaner; the check's own description said as much while asserting
    the wrong thing anyway. T6 now carries a compact de Boor evaluator
    and asserts the EVALUATED surface: ripple <= 0.3 mm at the throat
    ring, <= 0.6 mm at 5 percent depth (pre-fix values 0.21 and
    0.55-0.98; post-fix 0.09 and ~0.10). The suite's job is to measure
    what the user's CAD sees, all the way down.
199c. (T6 STABILIZED: STATE ISOLATION, same session) The T6 setup
    assertion caught the real ghost deterministically: throatD read 39
    at export time -- T5's elliptical-osc value, inherited through
    localStorage by T6's "fresh" page (the app persists state; fresh
    pages in the same browser share it). Every prior artifact-suite case
    has been silently ordering-dependent. FIX: boot() clears
    localStorage before the app initializes -- every case now starts
    from a true clean slate; T6 additionally keeps its settle gate
    (export only after the drawing stabilizes) and its setup assertion
    (the state the test intends, verified at export time, per the
    entry-199 lesson). Suite green twice consecutively; T6 ripple 0.09 /
    0.14 mm on the isolated capture, matching the investigation's
    values exactly.
200. (FAMILY-CHANGE RESET, 2026-07-18, Marwan's screenshot: "This does
    not look right near the throat... For horns where driver entry
    angle should be changed we need to remove that setting and reset it
    when changing to that horn family") The state-persistence gremlin
    one level up: the osc session's exitDeg 10.5 / exitLen 12 survived
    the switch to JMLC through persisted state, and jmlc's straightEntry
    applied a driver cone the user never asked for on this family --
    visible as a wrong-looking throat in the 2D drawing. FIX: exitDeg,
    exitLen, and flareRV are PER-FAMILY decisions; the family-change
    handler zeroes state and both controls before applying family
    defaults; the user re-enters them deliberately when the new horn's
    driver needs them. Live-verified with the exact scenario: osc
    10.5/12 -> switch jmlc -> both controls 0, and the throat launch
    slope reads 5.29 deg -- which briefly looked like the stale cone
    until the physics spoke: a jmlc at fc 400 NATURALLY launches at
    k rt T0 ~ 5.2 deg (confirmed against the pure engine, 5.29 exact
    match). The sixth measurement-vs-object lesson of the session: when
    a number is surprising, audit the ruler AND the expectation. 249
    checks, fuzz clean, artifact suite green.
201. (THE FLAT MATING FACE, 2026-07-18, Marwan: "when you add the
    driver plate the throat mouth is not curved and good but when you
    remove it you are curving the throat mouth") Without a plate, the
    horn's own throat end IS the driver mating surface -- and the outer
    shell, offset along the wall normal (tilted ~5.3 deg at the throat
    by the family's launch slope), dipped its throat ring to z = -0.56:
    the mating face curled behind the throat plane. With a plate, the
    plate path replaces the region and provides the flat face, which is
    why plated exports looked right. FIX: the outer shell's ring 0
    lands ON z = 0; the throat annulus is now a flat machinable face
    (96 nodes on the plane, annulus r 17.78..23.8, zero nodes behind).
    One component bug en route: the rings layout is (axial, lat1, lat2)
    and the first clamp wrote +2, zeroing the bottom half's LATERAL
    coordinate -- caught by re-measuring rather than trusting the green
    suite, since nothing pinned this geometry yet. Roll audit unchanged
    (the mouth end untouched). 249 checks, fuzz clean, artifact green.
202. (SHARP MEANS SHARP, 2026-07-18, Marwan: "set the Corner R @ mouth
    to 0mm... it is still smooth corners... having it be sharp since it
    is 0 is the more correct approach") Three layers, measured before
    fixing. (1) The GEOMETRY was already nearly sharp: the ring data
    places a vertex exactly on the 45-degree corner (cut 0.2 mm from
    the 0.5 mm floor) and the NURBS rounds to only ~1.3 mm effective
    radius on a 409 mm mouth. (2) The 0.5 mm FLOOR removed: cornerR 0
    now yields a true vertex (corner cut 0.000, sectionPoint degrades
    gracefully, solid finite, roll battery passes). (3) What Marwan was
    SEEING was the preview's SHADING: averaged vertex normals render a
    fillet that does not exist across a true crease. The preview now
    splits the four corner-column vertices when section = rrect and
    cornerR < 0.5, so the shading shows the edge that is really there;
    exported geometry unchanged (STL is facet-normal and was always
    sharp). Residual: the single-patch NURBS keeps its ~1.3 mm C2
    softening -- a true CAD crease needs corner knot multiplicity or a
    four-face STEP topology, backlogged with this note. 249 checks,
    fuzz clean, artifact suite green.
203. (THE DRIVER FACE SHADES FLAT, 2026-07-18, Marwan: "The throat is
    still rounded on the JMLC driver side edge") Entry 201 flattened
    the GEOMETRY (verified again: the preview runs through the clamped
    buildSolidMesh); what remained was the SHADING -- the flat annulus
    shares vertices with the wall and the outer shell, and averaged
    normals bend the lighting into a fillet that is not there (the same
    disease as entry 202's mouth corners, on the other axis). FIX:
    creaseThroatRows, a PURE engine helper (testable in node, unlike
    202's app-side split): every throat-plane vertex shared between
    planar (annulus) and non-planar triangles is duplicated and the
    planar triangles reference the duplicates -- normal averaging stops
    at the crease, geometry bytes unchanged. 96 duplicates on the jmlc
    reference (inner + outer throat rings), zero shared vertices across
    the crease, pinned. Applied in the preview for solid families; STL
    unaffected (facet normals were always sharp). 250 checks, fuzz
    clean, artifact suite green.
204. (SHARP ALONG THE LENGTH, 2026-07-18, Marwan: "it is still not
    sharp at where the 4 sides of the horn meet") The measurement that
    settled it: median corner-normal discontinuity mid-horn was 7.6 deg
    -- the geometry genuinely WAS round-cornered along the body, by the
    morph law itself: rhoT ran the same leisurely smoothstep as the
    shape morph, so at half the length the "corner" was an arc of half
    the section radius; sharpness only arrived at the mouth. (The 202
    shading split was working correctly on a crease that barely
    existed.) Classical rect-section craft transitions round-to-sharp
    in the first third, then runs sharp edges to the mouth. FIX: corner
    pacing decoupled from shape pacing -- small corner targets complete
    their rho ramp by u = 0.35 (sharpness weight clamp(1 - target/40):
    cornerR 0 = early, >= 40 = today's schedule unchanged, so
    established big-radius looks and Mike's cornerR-60 T6 case are
    untouched). Measured at cornerR 0: corner cut 6.5 mm at 15%
    length, 0.73 at 30%, 0.00 (SHARP) from 40% to the mouth. Area per
    station preserved (the solve is unchanged); solid finite; roll
    battery passes. Along the way: one more measurement bug (a NaN
    from unnormalized face accumulation) -- the seventh ruler artifact
    of the campaign, caught by the now-standard reflex. 250 checks,
    fuzz clean, artifact suite green.
205. (RHINO SEES A SURFACE, 2026-07-18, Marwan: "when I import the step
    file to rhino I am not seeing a nice 3D model... I am seeing a bunch
    of lines") The spline arithmetic audited VALID (mult sums exact,
    clamped, proper enums) -- the defect was TOPOLOGY: the surface is a
    closed tube flattened to a patch, and the writer emitted its v=0 and
    v=1 borders as two DISTINCT coincident edges. Non-manifold by the
    STEP rules: Fusion heals it silently (why nobody noticed), Rhino
    rejects the face and imports only the boundary curves -- literally
    "a bunch of lines". FIX: the lawful seamed-tube topology -- THREE
    edges (throat ring closed on itself, mouth ring closed on itself,
    ONE seam), the seam traversed twice with opposite senses in the
    outer bound. Artifact-audited on the fresh capture: 3 EDGE_CURVEs,
    4 oriented edges, seam T+F, 2 closed rings, zero dangling
    references; pinned into T6. On the second question ("have the step
    maintain the curvature lines from the math and be beautiful to
    edit"): it already does -- the surface interpolates the exact law
    to 2.4 microns (entry-199-era measurement) as one bicubic patch;
    the packaging, not the mathematics, was what Rhino disliked. 250
    checks, fuzz clean, artifact suite green.
206. (THE BACK OF THE HORN, 2026-07-18, Marwan: "when you look at the
    back of the horn now after the corner fixes you can see a lot of
    errors") Entry 204's sharpness exposed two latent defects at once.
    (a) THE SAMPLER: "corner gets 3/4 of the vertices" was hard-coded --
    right for a WN-ish rounded rect, catastrophic at rho -> 0: 32 of 48
    samples landed COINCIDENT on the four corner points (measured gap
    pattern ##00000000####...), degenerate quads zeroed the offset
    normals, and the outer shell collapsed onto the inner in stripes --
    the visible error field on the back. Now ARC-LENGTH-ADAPTIVE per
    quadrant half, with the corner PINNED at exactly one vertex at
    vv = 0.5 (the fixed index the crease machinery of 202/204 requires).
    Zero coincident samples; min gap 16.4 mm on the reference sharp
    ring. (b) THE OFFSET: one central-difference normal SMEARS a crease;
    the outer shell now offsets along the normalized sum of the true
    left/right face normals with a MITER scale 1/cos(half-dihedral)
    capped at 1.5 -- face thickness exactly t (6.00 measured), corner
    6.93 (full miter would be 8.49; the cap trades some corner
    thickness for spike safety -- recorded honestly), smooth regions
    bit-identical (dihedral ~0, miter 1). Roll battery 6/1.00/1.17;
    full ladder green; pinned. 251 checks.
207. (THE RIBS THAT WEREN'T, 2026-07-18, Marwan: "now you can see a lot
    of ribs perpendicular to the line where the faces meet") Measured
    before touching anything, through two broken rulers first: index-
    space second differences conflated curvature with station spacing
    (all five signals identical -- artifact eight), and quadratic-fit
    residuals exploded in the multivalued mouth-curl region (artifact
    nine). On the monotone body with an honest window: rib amplitude
    0.008-0.02 mm -- THE GEOMETRY HAS NO RIBS. The visible banding was
    skinny-quad shading: entry 206's uniform arc-length sampling left
    16 mm azimuthal gaps beside the corner against ~3 mm ring spacing,
    and long triangle strips render herringbone banding along exactly
    the crease. FIX: the flat mapping eases (p = 1.55) toward the
    corner -- corner-adjacent gap 16.4 -> 4.5 mm (quads ~3x squarer at
    the crease), spacing bounded at any segs (no coincidence by
    construction), the corner pinned as before. Zero coincident
    samples, battery passes, full ladder green. 251 checks.
208. (LOG FC SLIDER, 2026-07-18, forum: "I was tinkering with a small
    little waveguide for a 4 inch woofer... the upper frequency limit
    could be higher than 2kHz") The typed range was already 80-10000 in
    this build (the released build lags); the real deficiency was the
    SLIDER: one linear track over two decades is a crawl at the low end
    and a cliff at the top. fc is now log-flagged: the range element
    carries a 0..1000 POSITION mapped geometrically over min..max --
    full 80 Hz-10 kHz reach with usable resolution at both ends.
    Live-verified round-trip: position 1000 -> 10000 Hz, mid -> 894 Hz
    (the geometric middle), typed 4000 -> position 810, typed 400 ->
    333. One process failure en route, recorded for the pattern file:
    the first edit script performed its replacements and never called
    write() -- the markup shipped mapped while the listener fed raw
    positions as Hz; caught by the live round-trip, not by eyeballing
    the diff. Machinery is generic (p.log) for future dials. Pinned.
    252 checks, fuzz clean, artifact suite green.
209. (BUILD-STAMPED SAVED STATE, 2026-07-19, from a user's session:
    settings saved by an older build silently loaded into a newer one
    -- the stale-state class of entries 199c/200 at the user level, and
    the user's actual confusion traced to exactly this). Saved designs
    now carry the build that wrote them; on mismatch a small notice
    offers "Keep" or "Reset to family defaults" -- never auto-clears,
    because pushes are frequent and designs are people's work. Three
    bugs en route, each caught by the live Chromium test: the banner
    read a class selector for an id element (silent null); it read the
    stored build AFTER the autosave timer had overwritten it with the
    current build (captured at restore time now); and the reset raced
    the same timer, which resurrected the old state before the reload
    (suppression flag). End-to-end verified: old-build state -> banner
    -> reset -> clean defaults, re-stamped with the current build.
210. (CAD-LIGHT NURBS, 2026-07-19, user report: the STEP "looks like it
    has a ton of lines"). CAD draws an isocurve per knot span: the
    110x49 interpolating net arrived wearing a 107x46 cage, and 5,390
    control points is a heavy object to edit besides. Measured before
    changing: the surface is smooth enough that a 56x33 net stays
    within 0.007 mm of the analytic law in the wall planes; throat-zone
    ripple 0.167 mm (dense: 0.09); the corner C2 softening grows 0.81
    -> 1.57 mm on a 292 mm mouth -- a real, recorded trade, still under
    fabrication tolerance. The NURBS STEP now exports at 56x32 (the CAD
    editing artifact); STL and BEM keep full density (the fabrication
    and simulation artifacts). Isocurve cage drops from 107x46 to
    53x30. 252 checks, fuzz clean, artifact suite green (T6 ripple on
    the reduced net: within thresholds).
211. (FOUR-PATCH SHARP-CORNER NURBS, 2026-07-19, user report with a
    Fusion screenshot: "I am almost certain this geometry is a result
    of step export u gotta really fix this once and for all" -- and the
    user was RIGHT where the prior verifications were blind: corner
    REACH was measured, corner RINGING was not. A C2 spline forced
    through a sharp corner oscillates: the mouth boundary curve dipped
    1.57 mm (110x48) / 2.36 mm (56x32 -- entry 210 made it WORSE) into
    its own rectangle beside every corner = the wavy rim and flipped
    corner tips in the screenshots. THE FIX, the one backlogged twice
    and now built: at cornerR < 0.5 the NURBS STEP exports FOUR clamped
    patches meeting at true crease edges -- how CAD models a box.
    Shared global u-interpolation makes adjacent patches' corner
    columns bit-identical; clamped per-side v-interpolation makes
    corners EXACT and flats ring-free (a cubic through collinear points
    is the line). MEASURED on the shipped artifact: rim deviation
    0.0000 mm (was 2.36); 4 surfaces / 4 faces / 12 edges with the 4
    corner edges each shared by two faces; zero dangling refs; knot
    arithmetic valid x4; live-verified both branches (cornerR 0 -> 4
    surfaces, cornerR 60 -> single seamed tube unchanged). In Fusion
    and Rhino the corners now import as REAL model edges. Pinned in
    smoke (structure + corner-coincidence to 1e-6). 253 checks, fuzz
    clean, artifact suite green.
212. (THE WATERTIGHT SOLID, 2026-07-19, user: "why not include the
    thickness and render it like a nice step file"). With wall
    thickness set, the sharp-corner NURBS export is now a FINISHED
    SOLID: four inner patches, four outer patches lofted from
    offsetRings (the entry-206 mitered offset applied to the ring grid,
    with entry-201's machined ends -- ring 0 pinned to the throat
    plane, ring M-1 to the mouth plane, so both caps are flat), a
    planar annular throat flange and a planar mouth end face, every one
    of the 24 edges shared by exactly two faces, CLOSED_SHELL ->
    MANIFOLD_SOLID_BREP. CAD opens a body, not a skin: real thickness,
    real corner edges, bolt-flat flanges. thick = 0 still gives the
    four-patch inner surface; round-cornered sections keep the single
    seamed tube (solid version of those: backlog). Audited watertight
    on both bench and live captures; pinned. The render gripe fixed
    too: verification renders now shade smooth without wireframe. 254
    checks, fuzz clean, artifact suite green.
213. (FUZZ BLIND SPOT: THE EMPTY WALL, 2026-07-20, found on handoff
    restore while verifying the baseline: three "EXPORT THROW
    (unexpected)" lines in the fuzz output that every "fuzz clean"
    claim since entry 136 had silently tolerated) The export-sweep cd
    config { fc 800, rt 12.7, covH 90, covV 60 } has lacked T0 since
    entry 136 wrote it -- but entry 11 had already made cd a LAW
    family (hyp-exp vertical). makeTfun returns undefined -> NaN
    through the transition -> L NaN -> N NaN -> the emit loop
    condition (i <= NaN) false on the FIRST pass -> an EMPTY wall,
    not a NaN wall: planeProfiles returned zero stations, the
    entry-136 non-finite gates passed trivially (zero iterations),
    and the harness itself threw reading last.r -- classified
    "unexpected", printed, exit 0. cd export coverage was ZERO for
    77 entries. The paid-lesson-3 shape exactly (a green suite is
    not verification of what it doesn't measure), and an echo of the
    entry-48 "probe humility" scare -- the same no-T0 probe mistake,
    that time in a hand probe, this time fossilized in the harness
    config. FIVE-PART FIX: (a) cdWall guards non-finite T0 up front
    with a clean 'non-finite' throw; (b) buildBEMProject rejects
    zero-station profiles ("empty profile") -- the one shape the
    non-finite loop cannot see; (c) the fuzz cd config gets T0 0.7
    (the shipped family default); (d) unexpected throws now COUNT
    and FAIL the run (badThrows in the summary, exit 1) -- they used
    to print and vanish; (e) smoke pin EMPTY-WALL GUARDS: missing-T0
    throws, the T0-0.7 config exports a finite .msh, empty-profile
    gate throws. Measured after: 32 finite exports (was 29 -- the
    three cd modes restored), 6 clean guards, 0 NaN, 0 unexpected.
    ALSO on restore: smoke prints 249 vs entry-212's claimed 254 --
    explained, not drift: handoff zips do not carry
    reference/jmlc_originals/*.json, so ~5 JMLC primary-source pins
    skip; skips are now LOUD (a SKIP line names the missing data).
    Full ladder green: 250 checks, fuzz + sweep clean, artifact
    suite ALL PASS (T1-T6).
214. (MAKARSKI DEEP DIVE, 2026-07-20, Marwan uploaded the 2006 RWTH
    Aachen dissertation "Tools for the Professional Development of Horn
    Loudspeakers": "Deep dive on this and see if you learn anything
    that can improve our engine" -- and after the findings: "Just learn
    everything from it and give me suggestions"; decision = SUGGESTIONS
    ONLY, nothing built). All 170 pp read; full catalog in
    MAKARSKI_NOTES.md (also delivered to Marwan). THE FINDINGS THAT
    MATTER: (1) our SourceDisc plane-piston excitation is EMPIRICALLY
    VALIDATED by his scanned wavefronts at real driver exits --
    fundamental-mode dominated up to a driver-specific transition
    (~10-16 kHz 2", ~13-14 kHz 1.4"), horn feedback on the exit profile
    weak; his BEM excitation is literally our source disc. (2) His
    mesh rules corroborate ours independently: >= 6 nodes/wavelength
    (our lambda/6), density inversely proportional to surface pressure
    (our entry-132 throat-weighted grading). (3) BUILDABLE #1: his
    Ch.7 air-nonlinearity Max-SPL/K2 method collapses, under a 1D
    area-law transfer approximation, to a closed form over our exact
    station areas: K2 = (g+1)*k*pt*sqrt(St)/(2*sqrt2*rho*c^2) *
    INT dz/sqrt(S(z)). BENCHED against the Thuras closed form on our
    hypex T0=1 (exact exponential): rel err 0.008% (script + formulas
    preserved in the notes appendix; eqs 7.2/7.3 re-derived vs Fubini,
    check out). Would give per-design Max-SPL@10/3/1% K2 curves --
    "the physical limit of the horn", ideal-driver caveat (~3 dB HF
    for a real 1.4"). (4) Other candidates ranked in the notes: throat
    mode ladder f_mn advisory + piston-validity ceiling; "snapshot"
    export preset (his coarse+third-octave iteration loop); quarter-
    symmetry-is-fundamental-only caveat; f ~ c/(4L) low-end readout;
    driver two-port import (parking lot, needs VERIFY(BEM)). (5)
    Design heuristics recorded: on-axis dip + H&V widening at one f =
    first radial mode from TOO FAST throat flaring, fix = moderate
    initial flare (also raises LF loading); distortion/directivity
    interact at 2f; K2 dominates air distortion. SOURCES.md gained
    Makarski + Thuras citations (public-safe formal literature).
    Docs-only entry: engine untouched; rebuild restamps; smoke + fuzz
    green.
215. (MAX SPL AIR-K2 TILE, 2026-07-20, Marwan on the entry-214 findings:
    "Ok go ahead" -- building recommendation B1). The horn's PHYSICAL
    LIMIT from finite-amplitude air, in the app: new engine helper
    hornMaxSPL(prof, fArr, coordMode, sMap, opts) computes the Thuras/
    Jenkins/O'Neil 1935 plane-wave second-harmonic law per station and
    collapses Makarski's slice sum to closed form under 1-D area-law
    transfer weights: K2_horn = (g+1)*k*pt*sqrt(St)/(2*sqrt2*rho*c^2)
    * INT dz/sqrt(S(z)), plus the spherical-spreading tail
    coef*k*p1m*ln(d/rm) accumulated to d = 4 m (his convention).
    Anchor: p@1m per Pa of throat drive G = sqrt(St*Q/4pi) with Q(f)
    from the SAME geometric directivityEstimate the DI tile uses; the
    tile shows Max-SPL@1m at K2 = 10/3/1% (linear in K, so 3%/1% are
    exact -10.46/-20 dB offsets). ONE GEOMETRY SOURCE: identical
    station/area/coordinate accounting as hornResponse (sectionArea
    with the prof's seNArr/rhoArr; wavefront sMap for jmlc; the
    per-cell law radius for biradial; HVDiff clears the tile like the
    other Webster charts); integral stops at the AREA MAX (rolled
    mouths descend) and starts at z >= 0 (entry-192 driver-bore
    prepends are the driver's interior -- this is the HORN's limit).
    VERIFIED: (a) in-horn part vs the Thuras exponential closed form
    on hypex T0=1: 0.008%; (b) EXTERNAL: cd 60x40 1.4in fc 600 lands
    132.3 dB @2 kHz falling 14 dB to 10 kHz -- within ~1 dB of
    Makarski's published ideal-driver curve for his comparable
    large-format 60x40 (Fig 7.9b), slope matching his measured
    -16 dB/decade blend (Q-plateau vs f scaling); (c) live Chromium:
    tile renders 3 threshold curves with below-fc drawn faint-dotted
    as INVALID, re-renders on family/fc changes, HVDiff clears it,
    zero page errors; (d) semantic zoom wired (the entry-95/96 and
    entry-143 pins updated for the 5th tile -- intentional extension,
    patterns tightened not weakened). Honesty carried in the tile
    title + eqs note: IDEAL DRIVER (a quality 1.4in driver ~ -3 dB at
    HF), K2-dominant per measurement, geometric Q, no directivity-at-
    2f interaction -- BEM arbitrates; compare candidate designs with
    it (his own use: 1-3 dB differences from small geometry changes).
    One pin lesson en route: the smoke gain-identity check first
    re-derived St with naive rrect accounting and disagreed with the
    engine's seNArr/rhoArr accounting -- the ENGINE was right; the pin
    now asserts the identity on the trivially-accountable round case
    (G|Q=1 = rt/2). 251 checks, fuzz clean, artifact suite green.
216. (PUSH 213-215, 2026-07-20, Marwan supplied a fresh token
    in-conversation -- per the standing rule it lives in the
    conversation record only, never in files). Three commits, one per
    entry, each with its entry's exact index.html state (the 213/214
    intermediates reconstructed in scratch by reversing the entry-215
    edits with count-verified anchors, then rebuilt and re-verified
    ALL PASS + fuzz clean before committing -- the 209/210 lesson
    honored): c3bcada (213 guards), 351d06b (214 study, stamp-only
    diff), d4f3097 (215 Max-SPL tile). Push verified: origin/main ==
    local HEAD d4f3097. Private record; no public file change beyond
    the pushed states; NOT rebuilt -- the shipped file stays the
    verified build-215 artifact.
217. (IWATA DEFAULT 2-INCH CUT, 2026-07-20, forum: "why cant we modify
    the throat diameter on the iwata design? the intake seems small
    for a 2inch driver" + Marwan: "I thought we were going to cut the
    throat of Iwata at the right driver diameter"). MEASURED FIRST:
    the entry-152 cut EXISTS and works in build 215 -- live-verified
    before touching anything (50.8 -> "52.0 area-equiv, rim 67.7x33.3,
    neck removed 122 mm", depth 264.1 -> 141.8, zero errors). The
    forum user is on a stale cached build or looked for a throat dial
    (iwata's is hidden as fixed-by-geometry) and never connected the
    "Driver exit cut" control. WHAT ACTUALLY CHANGED: (a) family
    defaults gain iwExitD 50.8 -- a fresh Iwata boots SAWN at the
    2-inch exit (the Iwata-300 lineage is a 2" horn; the choice made
    on Marwan's stated intent after the option prompt failed to
    deliver -- flagged for cheap override to 35.56 if he prefers);
    0 = full generative neck stays one dial away and restores depth
    264.1 live; (b) the uncut stat line now names the control ("saw
    the neck at your driver: Driver exit Ø cut"); (c) the family
    blurb (F.iwata was EMPTY) explains fixed-proportion + the saw +
    the honest elliptical rim. Pinned (defaults + hint + blurb +
    engine cut numbers). Full ladder green: 252 checks, fuzz clean,
    live Chromium (fresh-boot cut, 0-restore, blurb render, zero
    errors), artifact suite ALL PASS. BACKLOG gains the forum's
    second ask: SEGMENT/SPLIT EXPORT for 3-D printing (cut the shell
    into printable pieces with registration features) -- real demand,
    not designed yet. RULER NOTE for future greps: some edited
    strings land in the source as \uXXXX escapes (functionally
    identical in JS) -- raw-source pins should anchor on ASCII text;
    the entry-215 citation pin is satisfied by the engine comment's
    ASCII apostrophe, not luck.
218. (BLAB CORRESPONDENCE UPDATE, 2026-07-20, relayed by Marwan). The
    Boundary Lab author confirms our deliverable "does seem to be
    working now" -- closes the bLab-side mesh verification from the
    Bernd/drba thread (wn_default_akabak.msh, 5,440 elems). His
    integration sketch (install bLab, local solve server, HTTP job
    request from Horn Studio, stream results back, adopt the
    documented protocol) is EXACTLY the entry-137/139/140 plan: the
    protocol is already mapped (GET /health; POST /jobs with
    SimulationConfig per protocol.py + mesh assets; NDJSON
    solve_stream), our quarter passes his own xy validator (138), and
    we already ship ready-to-open .blab.json projects (139). What his
    reply does NOT address is the one gate we ASKED him for (139,
    "the CORS request to galucha"): the solve server sends no CORS
    headers, and a page served from mroushdy.github.io cannot POST to
    http://localhost without Access-Control-Allow-Origin + an OPTIONS
    preflight answer -- without it every user needs the proxy script
    (hs_blab_proxy.py, entry 140 -- NOT in this session's files or
    the public repo; 40 lines, regenerable). Follow-up reply drafted
    for Marwan (recomposed on request as a FIRST mention -- "one
    thing I ran into while looking at the server" -- with a PR
    offer). THE BRIDGE ITSELF STAYS PAUSED per Marwan's entry-140
    decision until he says go. Record-keeping entry; no file change.
219. (OS-SE + R-OSSE NATIVE DRIVER ENTRY, 2026-07-20, forum,
    triodehunter post 46: "the same discontinuities as before with
    Classic OS also show up for OS-SE and R-OSSE when using the
    sliders for driver entry L" -- the user was right, and the cause
    was known physics we had only fixed for osc). REPRODUCED with the
    entry-184 ruler on the shipped path: the generic straightEntry
    graft put 2 slope-direction reversals on EACH family, os peak
    52.8 deg vs 46.7 clean -- the same doomed-asymptote catch-up
    entry 184 proved cannot amortize. THE FIX mirrors 184's insight
    per family, in the ENGINE solve (not a profile patch): both
    formulas launch at an angle NATIVELY. osseWall: a0 = half the
    driver exit angle (hornParams routes S.exitDeg/2 into entryDeg
    for os -- NEVER jmlc's stale S.entryDeg), throat grows by the
    straight run (r0' = r0 + Le*tan(a0)), curve solves from r0', the
    straight prepends at exactly tan(a0) -- C1 by construction.
    rosseWall: the GEOMETRIC launch slope is NOT tan(a0) -- the
    x-parameterization is not unit-speed (dx/dt|0 = L*m/A1): true
    slope s0 = tan(a0)*sqrt(rr^2+m^2)/m (measured 0.1506 first-chord
    vs 0.1406 raw tan before accounting); straight run + grown
    throat both use s0. exitDeg REMOVED for rosse (rule 6): the a0
    dial owns the launch angle. profOf bans the graft for os/rosse.
    MEASURED AFTER: zero reversals both, os peak 45.1 (asymptote 45),
    junction slopes exactly tan(a0) / s0 analytic, throat exact at
    z=0, no-entry profiles bit-unchanged. PERMANENT T-CASES T7 (os
    10.5/12) + T8 (rosse 12, exitDeg-hidden assert) on the REAL CSV
    button. ARTIFACT TEN for the ruler ledger, found by T7's own
    first run: the CSV's 4-decimal rounding over 0.2 mm steps is
    slope noise up to 5e-4 -- an adjacent-sample reversal detector at
    1e-4 flagged pure quantization on a clean profile; slopes are now
    measured over >= 0.8 mm spans at 5e-4 (graft 2/2 vs native 0/0
    verified WITH quantization). 253 checks, fuzz clean, artifact
    suite ALL PASS (T1-T8). Pushed as 9eaebbc.
    [RESTORED 2026-07-21: this entry and ALL local files from its
    turn were lost to a container-snapshot rollback (see entry 220);
    the pushed index.html 9eaebbc preserved the shipped state and
    the entry text was re-appended verbatim from the session record.]
220. (FAMILY SANITY LIMITS + FULL DEFAULTS RESET + THE ROLLBACK,
    2026-07-21, Marwan: "when you increase the biradial yuichi horn
    Fc it gets messed up... Should we keep each family within sane
    limits?" and "the family defaults button doesnt reset advanced
    things like driver plate"). MEASURED FIRST, both: (1) biradial
    above ~1 kHz: Smouth = c^2/(4pi fc^2) is already satisfied AT the
    adapter's end, pass 1 breaks immediately, the fan freezes near
    zero length (Rm-Rarr 0.2 mm at fc 2000) and the rim machinery
    inflates a degenerate mouth -- r "1.7 m" at fc 10k with z frozen
    at the adapter. (2) wn: depth collapses (z 45 mm at fc 1200,
    2.6 mm at 2000) and the walls hard-NaN past ~2.5 kHz -- while
    terminated still reads "wn-reference-mouth". (3) iwata scales
    CLEANLY to 10 kHz (fixed-proportion) -- no cap. FIXES: fc capped
    in validateInputs at the measured boundaries (biradial 1000, wn
    1200) with explanatory messages; araiWall flags terminated =
    "fan-degenerate" when L - zTr < Rarr (the sectoral architecture
    needs the fan to span its own array offset) and exportGate
    refuses it un-confirmed -- belt for odd throat/adapter combos
    that dodge the cap. FAMILY DEFAULTS now keeps its tooltip's
    promise: INIT_DEFAULTS (pristine baseline snapshotted BEFORE the
    autosave restore) -> family reference values -> driver-entry trio
    zeroed (entry-200 semantic); KEPT: family + export prefs (bem*,
    workflow not design). BONUS FIX exposed by the work: ONE
    log-aware input-sync path (syncParamInput) -- raw rng_ writes had
    the fc SLIDER LYING after every family switch since entry 208
    (biradial wrote 290 = position 290 = ~325 Hz displayed; correct
    position 267 now live-verified), and a raw clamp write would have
    parked it at full scale. First cut nested the helper inside
    build() and validateInputs crashed at top scope -- caught by
    fuzz, moved to top scope (the smoke DOM sweep passed because no
    clamp fired on its path: a green suite is not verification of
    what it doesn't measure, again). Live-verified: switch-position
    267, type-5000 -> 1000 + message + sane mouth, plate/bolt reset
    to baseline with family kept, zero page errors.
    THE ROLLBACK INCIDENT, for the pattern file: between the 219
    push and this turn the LOCAL filesystem reverted to an
    end-of-217 snapshot (container restore) -- PROJECT_STATE entries
    218/219, the 219 engine+shell edits, artifact T7/T8, the smoke
    219 pin, and two reply drafts all silently vanished while the
    PUSHED index.html (9eaebbc) kept the shipped state. Caught by a
    CHECK-COUNT RECONCILIATION (252 printed vs 253 recorded -- the
    entry-213 lesson working at session scale). Everything restored
    from the session record with count-verified anchors; entries
    218/219 re-appended verbatim + marked. NEW STANDING RULE: after
    any session resume, FINGERPRINT the last entries before building
    on them (grep one pin + one edit per recent entry); the repo
    preserves index.html, but PROJECT_STATE/tests/engine live only in
    the working dir and the conversation record. 254 checks
    (MEASURED), fuzz clean, artifact suite ALL PASS (T1-T8).
221. (THE ENTRY-190 STANDARD FOR OS-SE/R-OSSE + THE HANS RANGES,
    2026-07-21, Hans on the forum -- the entry-184/190 reporter: "I
    can no longer detect any discontinuities, but as soon as the
    Driver Entry L slider is adjusted, the (outer) horn contour
    starts with linear values, for both R-OSSE and OS-SE. This is in
    contrast to Classic OS, which... is now working flawlessly").
    HE IS RIGHT, and it is HIS OWN entry-190 standard: the driver's
    cone is INSIDE the driver, behind the mounting flange -- the horn
    launches AT the driver angle from z=0 with NO linear segment.
    The 219 build removed the ripples but kept a physical straight
    run, contradicting what 190 settled for osc. V2: (a) osseWall --
    prepend + throat growth REMOVED; geometry is the pure formula-5
    curve from z=0 launching at a0 = half the driver exit dial
    (exitDeg is now the MASTER for os, like osc); Driver entry L
    joins the entry-192 LOADING-ONLY bore (Webster chart prepend +
    overlay extended osc -> osc||os); (b) rosseWall -- prepend
    removed; the pure published curve from z=0 at the a0 dial; BOTH
    driver-entry dials hidden for rosse (rule 6 -- a0 owns the
    launch; the true launch slope note tan(a0)*sqrt(rr^2+m^2)/m
    stays as an engine comment for future rulers); osEntryLen struck
    from hornParams and the engine. MEASURED: os curves immediately
    above the cone line (r(6)-cone = +0.81 bench, +0.96 artifact),
    zero reversals both, throat exact. T7/T8 rewritten to v2 (T7
    asserts the T1-style curve-immediately; T8 asserts both dials
    hidden + first-chord at the TRUE launch slope). THE HANS RANGES:
    f0 floor 300 -> 200 Hz (his 100 cm round multi-entry horn --
    Keele width at 90x200 = 1.41 m; osc at f0 200 live-builds a
    1.52 m mouth, monotone) and flareR ceiling 100 -> 200 mm ("a
    generous roundover") -- ROLL BATTERY RUN AT 200 on a ~1 m osc
    before shipping: launch 4.0 deg, shear 1.004, ledge 1.06, finite
    (the entry-179 lesson: verify at the configuration users get).
    Smoke 219 pin rewritten as the 219/221 combined truth + a
    HANS RANGES pin. Live: exitDeg-as-master for os, loading overlay
    with L, f0 200 reach, flareR 200 slider, zero page errors.
    255 checks, fuzz clean, artifact suite ALL PASS (T1-T8).
222. (ESTIMATES GUIDE, 2026-07-22, forum, a self-described novice:
    "is there a document somewhere that would explain what the
    various Webster estimates mean? Or are they not accurate enough
    and one needs to use AKABAK anyway"). The honest answer -- the
    estimates are SCOPED, not inaccurate -- now exists as a public
    document: ESTIMATES.md in the repo, tile by tile (Webster loading
    Z/rc and how to read effective cutoff + mouth ripple; power
    response as shape-not-SPL and power-not-on-axis; group delay;
    flare rate/local cutoff as pure geometry; beamwidth/DI as the
    Keele relation reversed and THE tile where BEM replaces rather
    than refines; Max SPL air-K2 as the geometry's physical ceiling),
    each with its trust boundary, plus the when-you-need-AKABAK list
    and the iterate-fast/verify-honest workflow. Pure technical,
    formal citations only (Webster, Beranek-class chain, Keele 1975,
    Thuras 1935, Makarski 2006) -- public-safe per the 2026-07-18
    rule. Reply draft for the forum links it. Docs-only entry: app
    untouched, not rebuilt (stamp stays 221); pushed as its own
    commit (the repo gains its first doc beyond README/LICENSE --
    the entry-137-era UNDECIDED about publishing docs is hereby
    half-decided in favor of user-facing documentation; the test
    suite question stays open).
223. (HANDOFF PACKAGING + THE STRAY-CWD CLASS, 2026-07-22, Marwan:
    "Can you create a full handoff zip file which includes all
    learnings"). HANDOFF.md rewritten through this arc (leads with
    the RESUME RULE); TESTING.md gained the second tuition day
    (count-verification, range-endpoint sweeps, quantization-aware
    rulers, resume fingerprinting). AND THE RULE EARNED ITS KEEP IN
    THE WORST WAY: the packaging fingerprint printed "222: 0" and I
    sailed past it -- entry 222 was missing from PROJECT_STATE
    because last turn's append ran AFTER a shell-cwd reset and wrote
    /home/claude/PROJECT_STATE.md, a stray file OUTSIDE the working
    dir (not a rollback this time: my path slip; the tool resets cwd
    between commands after cd'ing away). Mechanism confirmed (stray
    file found, 1362 bytes, entry 222 verbatim), content merged back,
    stray deleted. TWO amendments to the standing rule: (a) a
    fingerprint that prints a zero is a STOP, not a datum; (b) any
    command sequence that cd's away must either finish its writes
    FIRST or use absolute paths -- appends especially (cat >> creates
    silently). CORRECTED IN THE ACT by the entry-195
    pin: the stamp contract is stamp == LATEST entry, docs entries
    included -- "stamp stays 221" was wrong and smoke said so the
    moment it ran. Rebuilt to 223 (content identical to 221 + the
    two doc entries), pushed stamp-only so the public "which build"
    answer matches the log. Zip re-packaged and re-verified from a
    scratch unzip: rebuild + smoke ALL PASS + fuzz clean.
224. (AKABAK PROJECT EXPORT, 2026-07-23, Marwan: "Does the tool export
    an akabak project" -> "build it and ship it"). The AKABAK target
    now mirrors the bLab pattern: ONE ZIP -- README.txt + solving.txt
    + observation.txt + the mesh (texts first; the mesh last so
    truncated captures still see them). GRAMMAR PROVENANCE, the
    homework done first: every emitted statement verified against
    WORKING ABEC3 scripts in the public record -- the import-ABEC-
    gmesh fragment (Control_Solver f1/f2/NumFrequencies/Abscissa/
    Dim/MeshFrequency, MeshFile_Properties + MeshFileAlias + Scale,
    Elements with numbered "101 Mesh Include <tag>") and the
    abec-experts full blocks (SubDomain_Properties + ElType
    Interior/Exterior, include by NUMERIC physical tag, Driving +
    RefElements + DrvGroup, Infinite_Baffle + Position/Offset, Nodes
    with Scale + numbered coordinates, BE_Spectrum Curves (RefNodes/
    GraphHeader/BodeType/Range) and Polar (PolarRange/BasePlane/
    Distance/Inclination), Driving_Values + DrvType/Weight). TWO
    THINGS DELIBERATELY NOT FABRICATED (no authoritative source
    reachable; at-horns.eu and randteam.de downloads blocked from
    the sandbox): the binary .abec project container -- the README
    carries exact assembly steps instead -- and the two-plane
    symmetry statement: quarter meshes emit a LOUD comment + README
    instructions, never a guessed Sym line. Generated setup: single
    exterior subdomain, walls tag 2 + source tag 1 (entry-86/137
    tagging), velocity drive (our BEM convention; README notes the
    Acceleration alternative), on-axis spectrum 1 m past the mouth,
    H+V polars at 2 m with the rotation origin ON the mouth plane
    (37 angles, -90..90), README with normals-check instructions and
    an honest FIRST-RUN note (generator untestable inside AKABAK
    itself; parse errors will be fixed same-day). Button relabeled
    EXPORT BEM PROJECT (ZIP). engine abecProject() pure + exported;
    entry-151 pin extended (both targets zip now). T9 PERMANENT:
    presses the real button, parses the real zip IN-PAGE with true
    bytes -- its own first run added ruler artifact ELEVEN: the
    harness's readAsText blob capture UTF-8-mangles binary, so byte
    arithmetic on the decoded text was garbage; and the default
    density tier's build starved the in-page evaluate past the
    protocol timeout (coarse tier for T9 -- it asserts scripts, not
    density). 256 checks, fuzz clean, artifact suite ALL PASS
    (T1-T9).

225. (MEH STUDY -- HINSON 2022, 2026-07-23, Marwan: "is this useful
    for you to learn?" on Scott Hinson's 44-page Multiple Entry
    Horns document; answered "Very" and read ALL 44 pages). Docs
    only, nothing built. MEH_NOTES.md written as the SEED for MEH
    Studio (separate-repo architecture per the 2026-07-22 decision):
    Unity patent US6411718B1 EXPIRED 2019 (public domain); flare
    law CONSTRAINED to conical/quadratic (Danley: taps need a flare
    rate that VARIES along the length); taps = pressure injectors
    forming one source, valid within lambda/4 of the apex at the
    crossover top AND within lambda/4 of each other (why 2+ mids);
    quarter-wave throat-reflection notch f = c/(4d) is the mid's HF
    limit; tap hole + trapped cone volume = Helmholtz low-pass
    (Hornresp Vrc/Vtc/Atc model), port velocity < ~17 m/s; mids in
    CORNERS, woofer racetrack slots on walls; DCX464 dual-diaphragm
    cheat (woofer taps only at 400-600 Hz) with the coupled-
    diaphragm L-pad warning; worked-design numbers (Hornresp wizard
    conical 90x60, S1 9.93 -> S4 1883 cm2) kept as MEH Studio's
    first regression fixture. Horn Studio changes: NONE.

226. (QT WAVEGUIDE STUDY -- HUGHES/PEAVEY 2000, 2026-07-23, Marwan:
    "anything here to learn and improve our tool?" on the Peavey
    Quadratic-Throat Waveguide white paper, 16 pp; read in full).
    Docs only, nothing built. QT_NOTES.md written: QT = cone with
    apex AT the throat-entrance center (single apparent apex, no
    slot-horn astigmatism) blended by a circular arc tangent to the
    throat wall at the rim and to the cone; closed form R =
    rt*cos(a)/(1-cos(a)), junction xj = R*sin(a), join C1 not C2
    (curvature steps 1/R -> 0 -- Geddes's criticism vs OS).
    bench_qt.js reused the entry-215 hornMaxSPL integral on
    synthetic QT/OS/exp/conical profiles (same 1" throat, 60 deg,
    same mouth+length): QT beats exponential by 1.85 dB at every
    frequency (paper measured 3-4 dB vs a slot horn -- slot
    unmodeled, order+sign agree), sits 0.40 dB under OS, bracketed
    by conical (best) and exp (worst) -- matches the OS-vs-QT
    literature. Candidates logged in QT_NOTES.md: "qt" family
    [S effort, awaiting go], QT throat as MEH Studio's bell
    default, rect-morph via superellipse ramp [backlog], foam-edge
    docs line. Horn Studio engine/UI changes: NONE.

227. (ROUNDED-RECT HONESTY, 2026-07-23, Marwan: "it seems like the
    rounded rectangle option doesnt always work on every horn
    family"). Ground truth by LIVE STL BYTE-COMPARE per family
    (probe_rrect_live.js -- the DOM-stub probe was fooled first:
    the 2-D section overlay draws S.section directly, so the
    DRAWING changed everywhere while the SOLID didn't; ruler
    artifact twelve: overlay evidence is not geometry evidence).
    Two silent-ignore paths found: (1) jmlcell -- profOfBase's
    entry-90 wallV branch hardcodes "ellipse", so rrect/sellipse
    selections drew a section ring the STL never had (byte-
    identical, verified); (2) any PETF family (jmlc/swh/hypex)
    under the wide-format az-loft -- buildHVDiffAz's 13-azimuth
    profiles ARE the shaping, section morph never runs (jmlc +
    hvdiff + rrect: STL byte-identical, verified). All other
    offering families verified HONORED (jmlc/swh/tractrix/hypex/
    conical/cd/rosse STLs differ ellipse vs rrect). Fix, house
    rule 6 (anything not used is hidden): SECTION_ALLOWED gains
    jmlcell:["ellipse"]; applicability() restricts to ellipse
    under the az-loft (the same rule that already hides cornerR/
    aspect/seN there); existing silent-migrate machinery does the
    rest. jmlcell finally got its F blurb (it had NONE), carrying
    the why: the quasi-elliptical morph IS the section; a rounded-
    rect JMLC is jmlc + rrect. Smoke pin drives the real dropdowns
    (jmlcell migrates, plain jmlc KEEPS rrect, az-loft migrates).
    257 checks.

228. (SQUARE OS WAVEGUIDES, 2026-07-29, Marwan -- after asking why
    rrect was absent from OS-SE and hearing the entry-51/52 history
    plus the rosse inconsistency: "yeah I would like to support
    those square horns"). The entry-52 ellipse-only gate on os/osc
    is LIFTED; policy now matches rosse and the community's printed
    practice (Ath-style superellipse/square waveguides): sections
    on the waveguide families are HONEST GEOMETRIC EXTRUSIONS --
    both blurbs say so explicitly (corners carry no OS wavefront
    support; BEM arbitrates) and the os blurb also corrects the
    common confusion that the SE in OS-SE is a cross-section (it
    is the AXIAL mouth-termination law). Wiring: os runs the
    generic planeProfiles path (cornerR + Lame exponent live, same
    machinery as tractrix); osc round runs generic too; osc
    PER-AXIS (covH != covV, the wallV branch) previously hardcoded
    "ellipse" -- the same silent-ignore class as entry 227 -- and
    now passes shp through planeProfilesWN, which gained an
    OPTIONAL rhoTarget (osc caller only): user cornerR paced by
    the entry-204 ramp from the local fully-round corner
    (min(aH,aV) -> exact circle at the throat) to the dialed mouth
    corner. Target-less callers (wn/cd/biradial) keep the historic
    constant-rho WN convention -- proven BIT-IDENTICAL by live STL
    baseline capture BEFORE the edit (probe_os_sections.js
    baseline/verify modes). Entry-52 migration pin FLIPPED (osc
    keeps rrect across the switch); new engine pin: ramp endpoints
    + legacy-const + pass-through + blurb anchors. 258 checks
    (the entry first recorded 259 -- the count canary caught it).

229. (HANS'S THIRD REVIEW, 2026-07-29, relayed by Marwan -- Hans:
    round-throat OS-SE/R-OSSE discontinuities resolved, BUT (1)
    "The rectangular versions continue to exhibit discontinuities",
    (2) symmetric OS-SE/R-OSSE show DIFFERENT H and V "-6dB
    beamwidth est." values, (3) 90 deg reported for a 45 deg
    half-angle looks wide to him (DI ~10 -> ~75 deg expected), (4)
    "set the N Termination Exponent to a max. of at least 10").
    FOUR fixes/answers:
    (1) throatRibbonMorph REWRITTEN (bench_ribbon.js repro: the old
    multiplicative pull launched FLAT (slope 0 -- the entry-221
    banned class) and guaranteed a WAIST on the wide plane whenever
    W/2 > rt: r dipped below W/2 then recovered; 1 reversal on
    os/rosse/jmlc alike). Per-plane strategies now: wide plane
    Z-SHIFTS INTO THE FAMILY CURVE (r(z) = wall(z + zS*(1-e)),
    zS where wall reaches W/2 -- contour IS the family curve at
    launch, monotone while zS*maxE'/L < 1, L auto-extended to
    2.2*zS), narrow plane NATIVE-SLOPE SCALING (wall(z)*(s+(1-s)e),
    all terms positive -> monotone). e = quintic smootherstep (C2
    both ends). Zero reversals across the bench; exact W/2 x H/2 at
    z = 0; entry-101 monotone guard kept as belt-and-braces.
    (2) the estimate branch fed os/rosse from S.covV -- a dial
    NEITHER family owns (stale state from cd/osc). os now uses covH
    for BOTH planes; rosse uses 2*rosA (the dial is a half-angle);
    aspect > 1 narrows V by atan(tan/aspect). Symmetric horns now
    report identical H/V (DOM-pinned against deliberately staled
    covV = 40).
    (3) answered, not "fixed": the plateau follows the CD
    convention (coverage == -6 dB beamwidth at the nominal angle;
    the same Keele relation that SIZES the mouths, run in reverse).
    Hans is RIGHT that measured waveguide polars are round-topped
    and typically read somewhat inside nominal with higher DI than
    the rectangular Q = 32400/(tH*tV) approximation -- the info
    panel gained a calibration paragraph saying exactly that
    (plateau = design target, not a prediction; BEM arbitrates).
    No formula change without a sourced correction.
    (4) osN ceiling 8 -> 12 (UI + engine clamp), n = 12 swept
    finite across fc 200-1500 / cov 40-140. 259 checks, fuzz clean.

230. (AKABAK SCRIPT EXPORT, 2026-08-03, Hans via the forum: "tried
    to load Horn Studio files into Akabak the whole day using KI.
    But failed. Will there be the possibility to generate an .akp
    file in the near future to directly load into Akabak?" --
    Marwan's steer: "I think we could generate an akabak script
    like horn response does.")
    WHAT WE DID NOT DO: emit a .akp. AKABAK 3's project container
    is a BINARY format with NO published specification -- the
    diyAudio thread "Documentation for ABEC/Script Import Akabak"
    (421750) is still unanswered, randteam.de ships the help only
    as AKABAK3.chm inside a zip (binary, unreadable by our fetch
    path), and no real .akp has ever been inspected here. Guessing
    a container is how you ship a file that opens to an error
    dialog. So we ship what AKABAK actually READS.
    WHAT WE SHIPPED: akabakLEM(o) -- a pure string builder (engine,
    next to abecProject) emitting a plain-text AKABAK LEM script,
    button "AKABAK SCRIPT (LEM, .AKS)" next to the BEM ZIP.
    GRAMMAR PROVENANCE, copied from real working scripts in the
    public record, never invented: a VERBATIM Hornresp AkAbak
    export (redspade-audio 2012 + the diyAudio "Project Eburon"
    thread -- refetched with an explicit "quote character for
    character" prompt after the first fetch came back as prose)
    and hand-written horn scripts on freespeakerplans. Hence
    "|" comments, Def_Driver with Sd/Bl/Cms/Rms/fs/Le/Re/ExpoLe
    (the export's OWN parameter set -- an earlier draft emitted
    Mms/Qms/Qes, which no verified script showed, and was
    replaced), System, Driver Def 4-node (1=0=2=3: electrical
    pair, rear cavity, throat), Enclosure, a chain of conical
    Waveguide segments with STh/SMo/Len, Radiator on the mouth
    node.
    GEOMETRY = ONE SOURCE (entry 215): the script is built from
    lastLEM -- the exact prof + propagation coordinate the Webster
    charts just used (axial dz, or the JMLC wavefront sMap) --
    reduced through sectionArea, the SAME area law hornResponse /
    throatImpedance / hornMaxSPL run on, then resampled into 24
    conical segments (clamped 4..64). Script and solid cannot
    disagree, because they read the same profile.
    HONESTY, in the file itself, not the release notes: the header
    states that LEM sees AREA ONLY -- section, corner radii and
    roundover do not enter, two horns with the same area law and
    different coverage produce the SAME script, use the BEM ZIP for
    directivity. The Def_Driver block is a flagged PLACEHOLDER
    (every line "|EDIT", values a self-consistent generic 1"
    driver): the app has no Thiele-Small parameters and will not
    invent one. The entry-192 loading-only bore stations at z < 0
    are EXCLUDED (the user's driver already carries its exit) and
    the exclusion is disclosed in the header when it applies.
    Level reference is stated: AKABAK references SPL to
    sqrt(2)*20uPa vs Hornresp's 20uPa, so AKABAK reads 3.01 dB
    high on the same model.
    PORTABILITY: decimals are ALWAYS "." -- Hornresp writes the OS
    locale separator ("WD=0,20m"), which is exactly the kind of
    thing that fails to parse on someone else's machine.
    RULE 6: the button is REMOVED when the configuration has no
    justified 1-D propagation coordinate (the per-azimuth HVDiff
    loft, where the Webster charts are already disabled) rather
    than left to emit a number it cannot defend.
    Verified: bench_akabak.js across all 13 families (node-chain
    contiguity, shared interface areas, sum(Len) == horn length,
    unit suffixes, no locale commas, wavefront > axial length at
    identical areas, bore exclusion, null on degenerate input,
    nSeg clamping) + smoke pins (engine + app wiring) + LIVE
    artifact tests T10/T11 (the real button, the real blob, and
    RULE-6 removal on the HVDiff config).
    SIDE-CATCH, found by the live T10 run and NOT by reading the
    code: init3D's 250 ms retry loop rewrote v3dnote forever
    whenever THREE never arrives (offline, slow or blocked CDN),
    ERASING export feedback the instant a user pressed a button --
    he got his file and read "Loading 3-D viewer" instead of what
    was in it. Export notes now stamp the element via exNote() and
    the viewer status refuses to overwrite them. This had been
    true of EVERY export button since the viewer shipped; T9 never
    caught it because it never read the note.
    The BEM project README now cross-links the LEM script (paste
    path, and what each export can answer) and carries the AKABAK
    3 specifics learned this round: keep BEM elements under ~5000,
    driver alignment is by mesh TAG NUMBER.
    263 checks, fuzz clean, artifact suite ALL PASS.

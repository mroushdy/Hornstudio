Horn Studio — sources and implementation notes

Horn Studio is an independent implementation. It is not affiliated with or
endorsed by any author or designer listed below. Implementations marked
"published equations" follow the primary source directly; those marked
"reconstruction" are independent interpretations calibrated or verified
against public reference material.

Profile families

JMLC isophase — published equations. Jean-Michel Le Cléac'h's isophase
construction: curved wavefronts advanced along wall normals carrying the
hyperbolic-exponential area law; the roll past 180° is the native termination.

Spherical-wave / Kugelwellen (+ EWF elliptical variant) — published
equations. Klangfilm-lineage spherical-wave construction; hypex area law
evaluated on spherical caps.

Tractrix — published closed form; mouth radius from rm = c/(2π·fc).

Hyperbolic-exponential (hypex) — Salmon's family, published equations.

Conical — elementary.

Constant-directivity (Keele 1975) — reconstruction from D.B. Keele's CD
horn preprint, validated against Electro-Voice HR-series hardware dimensions.

Keele 1982 Bi-Radial — reconstruction anchored to the patent's exemplary
embodiment table.

OS / OS-SE — published equations. Earl Geddes' oblate-spheroidal waveguide
(JAES 1989); OS-SE superellipse termination per Marcel Batík's published ATH
material.

R-OSSE — published parametric formula (Marcel Batík).

PETF variable-T profiles — published ATH-lineage progressive-expansion
technique; per-plane blending is an independent extension.

Arai-optimized biradial — reconstruction from Yuichi Arai's public plans,
book tables, and the openly published A-290 reference geometry, including the
five-cell rule, throat array radius, fin layouts, and driver adapter.

William Neile-inspired biradial — independent parametric reconstruction of
the curved equal-path, acoustic-loading-optimized ideas published in the
William Neile article series on SphericalHorns.net. Fully parametric: the
horizontal is a cone plus a true Neile z^1.5 term (William Neile, 1657 — the
first rectification of the semicubical parabola) with a C1 Hermite terminal
flare; the vertical is solved from the hypex loading law at the requested fc
and T with a C2 quintic continuation; every horizontal trajectory is solved to
identical arc length. The two published reference geometries are used ONLY as
verification anchors in the automated test suite (mouths reproduced exactly;
path length within 0.1%; profile RMS ≈ 1–2%). It is not the original private
calculator and uses no unpublished formulas.

Theory and background


Bjørn Kolbrek — horn theory series and historical documentation.
A.G. Webster — the horn equation used for the throat-impedance estimates
(a 1-D estimate; not a substitute for BEM).


License

CC BY-NC 4.0 — see LICENSE. Free for non-commercial use with attribution;
commercial use requires written permission.

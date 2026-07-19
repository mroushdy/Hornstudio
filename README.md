# Horn Studio — Provenance & Attribution

*Maintained by (Silence Please, New York). Version 1.0, 16 July 2026.
This document is part of the repository and is updated whenever a method,
citation, or credit changes; corrections are incorporated with acknowledgment.*

Horn Studio is an independent, free, non-commercial tool (CC BY-NC 4.0). Every
implementation in it was written originally for this project. This document
records the *scientific provenance* of the methods it implements: which
published research each horn family and numerical procedure derives from, and
which constructions are Horn Studio's own.

No third-party source code of any kind is included in, or was used to build,
Horn Studio. Where a method derives from published research, the derivation
was made from the publication itself — equations, figures, profile plots, and
public statements — and is credited below and in the source code at the point
of implementation. The tool's complete, timestamped development log is
preserved and documents this history.

---

## Classic horn theory

- **Exponential / hyperbolic-exponential (hypex) family** — V. Salmon,
  *A New Family of Horns* / generalized hypex horn theory (JASA, 1946).
  Implemented from the published plane-wavefront area laws.
- **Tractrix** — P. G. A. H. Voigt (patent, 1927) and the classical tractrix
  curve. The implementation follows the classical equations; the code comments
  also reference the exposition of these equations on sphericalhorns.net
  (equations 3–4 of that presentation) which was used as a working reference
  for notation.
- **Webster horn equation & transmission-matrix response** — A. G. Webster
  (1919); the practical transmission-matrix treatment follows the horn
  literature as surveyed by B. Kolbrek (*Horn Theory: An Introduction*,
  audioXpress, 2008).
- **Conical horn** — classical.

## Named modern constructions

- **JMLC** — Jean-Michel Le Cléac'h's published horn profile construction.
- **Kugelwellen / spherical-wave (SWH)** — the Klangfilm tradition
  (W. Rösch et al.); implemented from the published spherical-wavefront
  construction.
- **Constant-directivity (CD) and bi-radial** — D. B. Keele, Jr.,
  *What's So Sacred About Exponential Horns?* (AES, 1975) and the CD horn
  papers (AES, 1982).
- **Oblate spheroidal (OS / OS-SE)** — E. Geddes, *Acoustic Waveguide Theory*
  (JAES, 1989).
- **R-OSSE** — implemented from the published R-OSSE profile definition by
  Marcel Batík (at-horns.eu).
- **Arai-inspired biradial** — reconstructed from published drawings and
  photographs of the Arai A-290 series; calibration documented in the
  development log.
- **Iwata** — reconstructed from the published Iwata drawings and profile
  data; the decode process is documented in the development log.

## Methods derived from the published work of Dr. Bernd Ahlswede (sphericalhorns.net)

The following features implement or reconstruct methods from Dr. Ahlswede's
*published* research. They are credited in the source at each implementation
site. His current models are private, are not represented in Horn Studio, and
nothing here makes any claim about them.

- **PETF (progressive expansion / T-factor modification)** — implemented from
  the equations published on sphericalhorns.net (equations 1–2 of that
  presentation). Validation was performed against the four published reference
  profiles, and the published BEM results were used as a catalogued
  cross-check of the loading cost. (Rollback treatment was dropped following
  his public 2025 remark that it is approximately equivalent to a small mouth
  roundover.)
- **HVDiff (per-plane PETF laws)** — implemented from the May 2021
  publication on sphericalhorns.net describing different PETF recipes for the
  horizontal and vertical planes, with the published BEM quantification used
  as the behavioral reference.
- **Wide-format HVDiff (azimuthal loft)** — the observable construction rules
  (loft termination at the fastest azimuth's completed mouth; truncation of
  slower azimuths at that arc length) were *inferred from the published No.1 /
  No.2 profile plots and the publicly shown mk-series shapes*. The development
  log documents this inference, including an initial incorrect implementation
  corrected against the published figures. The cos² azimuthal blending of the
  per-plane recipes is Horn Studio's own implementation choice and appears in
  no source.

## Horn Studio's own constructions

- **William Neile biradial (equal-path)** — the implementation is an
  original construction of this project: a Neile semicubical-parabola (z^1.5)
  horizontal law, a C2 quintic vertical law, and a numerically solved
  equal-path trajectory family, none of it derived from any published
  WN-series design; comparisons against published third-party polar
  measurements were used only as benchmarks, and the development log records
  that policy explicitly. The *class itself*, however, has an author: the use
  of Neile's semicubical parabola (W. Neile, 1657, the first rectification of
  the curve) as a loudspeaker-horn profile, together with the equal-path-
  length principle applied to each parabola, was introduced by **Dr. Bernd
  Ahlswede** — [*William Neile Horns*, sphericalhorns.net, September 2021](https://sphericalhorns.net/2021/09/15/william-neile-horns/)
  — creating a new class of horns, of which this family is an independent
  member. His published work on this class inspired and benchmarked this
  family in the same way the JMLC method has inspired later work, including
  his own. The family is accordingly named "William Neile biradial" in the
  tool — adopting the class name he coined — rather than the earlier hedge
  "William Neile–inspired"; likewise the Arai reconstruction is named
  "Yuichi biradial (after Arai)", the standard convention for a faithful
  implementation of a published design, calibrated to the A-290 book
  figures.
- **H coverage lock** (smooth-min slope blending into a conical phase with an
  exact-mouth tangent fillet), **V coverage / diffraction-slot law**
  (combined-curve slope blend with exponential growth), **graded BEM meshing**
  (two-band adaptive density, master-grid column-map subsampling,
  quarter-symmetry machinery), the **equal-path solver**, and the **surface-
  frame mouth-wrap construction** are original to Horn Studio.

## Numerical engine

- **NumCalc** — the BEM solver is NumCalc from the open-source **Mesh2HRTF**
  project (Ziegelwanger, Majdak, Kreuzer et al.), compiled to WebAssembly for
  in-browser use, and used unmodified in native form for export targets. Used
  under its open-source license with attribution.
- Mie-series analytical validation, mesh-quality methodology, and the export
  pipelines are original to Horn Studio.

## Terminology

The terms and notations **PETF**, **HVDiff**, and the designation of
**"William Neile horns"** as a loudspeaker-horn category originate in the
published work of Dr. Bernd Ahlswede (sphericalhorns.net), and are used here
with his kind permission to use his original terms and notations. This
acknowledgment concerns naming and vocabulary only; it implies no restriction
on, and makes no claim about, the independent implementations documented
above. Per-term links to the corresponding articles will be added using
Dr. Ahlswede's preferred references.

---

*Corrections or preferred citations from any researcher named here are
welcome and will be incorporated. The radial-flare mouth treatment in the WN
family follows a suggestion by Dr. B. Ahlswede (July 2026), acknowledged with
thanks.*

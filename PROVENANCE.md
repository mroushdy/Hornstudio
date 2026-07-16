# Horn Studio — Provenance & Attribution

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

- **William Neile–inspired (WN) equal-path biradial** — an original
  construction of this project: a Neile semicubical-parabola (z^1.5)
  horizontal law (W. Neile, 1657, the first rectification of the semicubical
  parabola), a C2 quintic vertical law, and a numerically solved equal-path
  trajectory family. It is *not* derived from any WN-series design published
  elsewhere; comparisons against published third-party polar measurements
  were used only as benchmarks, and the development log records that policy
  explicitly.
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

---

*Corrections or preferred citations from any researcher named here are
welcome and will be incorporated.*

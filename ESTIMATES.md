# Reading the estimate tiles

Horn Studio's REPORTS row is labeled "1-D / GEOMETRIC ESTIMATES (NOT A BEM
SUBSTITUTE)" — this document explains what each tile computes, what it is
good for, and when you genuinely need a 3-D solver (AKABAK / Boundary Lab).

The short version: the estimates are not *inaccurate* — they are *scoped*.
One-dimensional horn theory (Webster's equation) is the mathematics horns
were designed with for a century, and it remains genuinely good at what it
covers: **loading** — how the horn presents an acoustic load to the driver
versus frequency. What it cannot see, by construction, is anything
**three-dimensional**: directivity patterns, transverse modes, diffraction
at the mouth and cabinet, fin interactions. The tiles exist so you can
iterate a design in seconds and arrive at BEM with something already sane.
The footer's rule stands: verify with BEM before cutting.

## The tiles, one by one

**1-D Webster loading estimate (Z/ρc).** The horn is treated as a chain of
short cylindrical segments (a "staircase" over the real area law), terminated
by the radiation impedance of a piston the size of the mouth. The curve is
the acoustic impedance at the throat, normalized to ρc — the ideal resistive
load is 1. Read it like this: where the solid (real) part rises toward 1 and
stays there, the horn is loading the driver; the frequency where it first
reaches about half its passband value is the horn's *effective* cutoff
(usually a little above the design fc); the wiggles near cutoff are
reflections from the mouth — a bigger mouth or a roundover calms them. This
tile is the most trustworthy of the set for its purpose, and it is the right
tool for A-vs-B comparisons between profiles. The propagation coordinate
matters for curved-wavefront designs, so the app uses the wavefront
coordinate for JMLC and the per-cell law radius for the Yuichi biradial —
the chart says so when it applies.

**Radiated power response.** The same staircase chain, asked a different
question: for constant drive at the throat, how much power reaches the
radiation load? Flat above cutoff, ripple near it, collapse below — the
classic loading picture in dB. Two honest limits: it is a *shape* (dB
relative to the passband, not absolute SPL), and it is *power*, not your
on-axis frequency response — on-axis additionally depends on directivity,
which no 1-D model can know.

**Group delay.** The transfer phase of the same chain, differentiated and
smoothed. Useful for spotting where a horn holds energy near cutoff; treat
small features as suggestive, not gospel.

**Flare rate / local cutoff.** Pure geometry: f_loc = (c/4π)·d(ln S)/dz per
station. Every part of the horn only "supports" frequencies above its local
flare rate, so this shows *where along its length* a horn stops working as
the frequency drops. No acoustic model at all — just the area law you
designed, differentiated.

**Beamwidth + DI (geometric).** Not Webster at all: the Keele mouth-size
relation (θ·d·f ≈ 25.4·10⁶ deg·mm·Hz) run in reverse, clamped to the design
coverage where the family defines one. It gives the *trend*: below
mouth-control the pattern widens toward omni, above it the walls (or the
design coverage) hold it. Real polars — sidelobes, waistbanding details,
diffraction effects — are exactly the things this cannot show. This is the
tile where BEM replaces the estimate rather than refines it.

**Max SPL (air K2).** The newest tile and a different kind of statement:
air itself distorts at high sound pressure, mostly in the narrow throat
region, and this is computable from the linear design (plane-wave
second-harmonic law, Thuras/Jenkins/O'Neil 1935, integrated over the horn's
actual area law with the method of Makarski 2006, who verified the approach
within a few dB against measurements). The curves show the SPL at 1 m at
which the *horn alone* — with a hypothetically perfect driver — reaches
10/3/1% second-harmonic distortion. It is the physical ceiling of the
geometry: a real driver sits below it (a good 1.4" driver costs roughly 3 dB
at high frequencies). Its best use is comparing candidate geometries — small
shape changes near the throat move this curve by real decibels.

## So when do you need AKABAK?

Use the estimates for: cutoff and loading character, profile A-vs-B during
design, spotting mouth-reflection trouble, coverage trends, distortion
ceilings, and generally getting a design into sane territory fast.

Go to BEM for: actual directivity (polars/isobars at angles), anything
involving diffraction (mouth edges, cabinets, slots), fins, asymmetric or
exotic sections, higher-order-mode effects at the top of the band, and the
final on-axis response you would publish. The app's BEM export (mesh +
ready-to-open project) exists precisely so that step is cheap.

A useful habit: iterate with the tiles until the loading chart and the
beamwidth trend look right, then run one BEM pass to check directivity, then
iterate again if needed. The estimates keep the loop fast; BEM keeps it
honest.

## Sources

Webster's horn equation (1-D loading theory); transmission-matrix chain with
baffled-piston termination (standard electroacoustics, e.g. Beranek);
D.B. Keele's mouth-size/pattern-control relation (1975 CD horn work);
Thuras, Jenkins & O'Neil, "Extraneous frequencies generated in air carrying
intense sound waves", JASA 1935; M. Makarski, "Tools for the Professional
Development of Horn Loudspeakers", RWTH Aachen 2006 (the BEM-grade version
of the distortion method and its measurement verification).

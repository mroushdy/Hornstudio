#!/usr/bin/env python3
"""Evaluate the exported NURBS surface and measure SECTION RIPPLE.

  usage:  python3 step_eval.py <file.step> <u-fraction> [<u-fraction> ...]
  prints: one ripple figure (mm) per requested u-fraction, in order.

RECONSTRUCTED 2026-08-20 (entry 233). The original helper was lost with the
container and had never been committed -- artifact_test.js T6 called it, so T6
could not run at all. The ORIGINAL's exact ripple definition is not recoverable,
so this file states its own, and PROJECT_STATE records that the historical
pre-fix figures quoted in T6's message (0.21 / 0.55 mm) belong to the lost
evaluator and are NOT claimed to be reproduced by this one.

THE DEFINITION USED HERE, and why it cannot be gamed:
  The exported surface is a bicubic B-spline INTERPOLATED through the ring grid
  (entry 112). The defect it is watched for (entries 205 / 211 / 212: the wavy
  Fusion mouth, the rim dipping beside each corner) is the spline RINGING
  BETWEEN control stations -- a deviation from the section the horn is supposed
  to have. So ripple is measured against the ANALYTIC section, not against the
  surface's own samples:

    1. de Boor-evaluate the real STEP surface on a dense ring at the requested
       u (u is the axial direction; fraction 0 = throat).
    2. Least-squares fit an analytic rounded rectangle -- three free parameters
       (a, b, rho), against ~1500 sampled points -- to that ring.
    3. Ripple = max |signed distance| from the evaluated points to that fitted
       analytic section.

  Three parameters cannot absorb high-order ringing, so a wavy ring cannot fit
  itself flat: the wobble lands in the residual, which is the number reported.
  A circular throat is the rho = min(a,b) case of the same fit, so no special
  casing is needed at u = 0.
"""
import re, sys
import numpy as np
from scipy.optimize import minimize

# ---------------------------------------------------------------- STEP parsing
def load_surface(path):
    s = open(path).read()
    pts = {int(m[0]): (float(m[1]), float(m[2]), float(m[3]))
           for m in re.findall(r"#(\d+)\s*=\s*CARTESIAN_POINT\('[^']*',\(([-\d.eE+]+),([-\d.eE+]+),([-\d.eE+]+)\)\)", s)}
    i = s.index("B_SPLINE_SURFACE_WITH_KNOTS")
    body = s[i:s.index(";", i)]
    du, dv = (int(x) for x in re.search(r"',(\d+),(\d+),\(\(", body).groups())
    grid = [[pts[int(r)] for r in re.findall(r"#(\d+)", row)]
            for row in re.findall(r"\(([#\d,]+)\)", body[body.index("((") + 1: body.index(")),")+2])]
    nums = re.findall(r"\(([-\d.,eE+\s]+)\)", body[body.index(")),"):])
    mu = [int(float(x)) for x in nums[0].split(",")]
    mv = [int(float(x)) for x in nums[1].split(",")]
    ku = [float(x) for x in nums[2].split(",")]
    kv = [float(x) for x in nums[3].split(",")]
    U = np.array([k for k, m in zip(ku, mu) for _ in range(m)])
    V = np.array([k for k, m in zip(kv, mv) for _ in range(m)])
    return du, dv, np.array(grid, dtype=float), U, V

# ------------------------------------------------------------------- de Boor
def basis(knots, deg, n, t):
    """All non-zero B-spline basis values at t, returned as a length-n vector."""
    t = min(max(t, knots[deg]), knots[n])
    k = np.searchsorted(knots, t, side='right') - 1
    k = min(max(k, deg), n - 1)
    N = np.zeros(n)
    d = [0.0] * (deg + 1)
    d[deg] = 1.0
    for r in range(1, deg + 1):
        nd = [0.0] * (deg + 1)
        for j in range(deg - r, deg + 1):
            idx = k - deg + j
            den1 = knots[idx + r] - knots[idx]
            den2 = knots[idx + r + 1] - knots[idx + 1]
            a = (t - knots[idx]) / den1 if den1 > 0 else 0.0
            b = (knots[idx + r + 1] - t) / den2 if den2 > 0 else 0.0
            nd[j] += a * d[j]
            if j + 1 <= deg:
                nd[j] += b * d[j + 1]
        d = nd
    for j in range(deg + 1):
        idx = k - deg + j
        if 0 <= idx < n:
            N[idx] = d[j]
    return N

def ring(du, dv, P, U, V, ufrac, nv=1500):
    nu, nvc = P.shape[0], P.shape[1]
    u = U[du] + ufrac * (U[nu] - U[du])
    Nu = basis(U, du, nu, u)
    out = np.empty((nv, 3))
    vs = np.linspace(V[dv], V[nvc] - 1e-12, nv)
    for i, v in enumerate(vs):
        Nv = basis(V, dv, nvc, v)
        out[i] = np.einsum('i,j,ijk->k', Nu, Nv, P)
    return out

# ------------------------------------------------- analytic rounded-rect fit
def rrect_sdf(xy, a, b, rho):
    rho = min(rho, min(a, b))
    q = np.abs(xy) - np.array([a - rho, b - rho])
    outside = np.linalg.norm(np.maximum(q, 0.0), axis=1)
    inside = np.minimum(np.maximum(q[:, 0], q[:, 1]), 0.0)
    return outside + inside - rho

def ripple(pointset):
    # the ring lives in a plane; take the two axes with spread as the section
    spread = pointset.max(0) - pointset.min(0)
    ax = np.argsort(spread)[-2:]
    xy = pointset[:, sorted(ax)]
    xy = xy - xy.mean(0)
    a0 = np.abs(xy[:, 0]).max(); b0 = np.abs(xy[:, 1]).max()
    best = None
    for r0 in (min(a0, b0), min(a0, b0) * 0.5, min(a0, b0) * 0.1, 0.0):
        r = minimize(lambda p: np.sqrt((rrect_sdf(xy, abs(p[0]), abs(p[1]), abs(p[2])) ** 2).mean()),
                     [a0, b0, r0], method='Nelder-Mead',
                     options={'xatol': 1e-9, 'fatol': 1e-12, 'maxiter': 20000, 'maxfev': 20000})
        if best is None or r.fun < best.fun:
            best = r
    a, b, rho = (abs(v) for v in best.x)
    return float(np.abs(rrect_sdf(xy, a, b, rho)).max())

if __name__ == "__main__":
    du, dv, P, U, V = load_surface(sys.argv[1])
    for f in sys.argv[2:]:
        print("%.6f" % ripple(ring(du, dv, P, U, V, float(f))))

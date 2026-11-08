"""
Invariant checks for the MRIC model.

These test the *model's internal consistency*, not its biological validity.
A passing suite means the engine does what mric.py claims it does; it says
nothing about whether those claims describe cancer.

Run: python3 -I research/mric/model/test_mric.py
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from mric import (  # noqa: E402
    IDX, STATES, Schedule, ablate_memory, default_params, immune_fitness,
    initial_state, mric, simulate, step, visibility, window,
)

FAILURES: list[str] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    if cond:
        print(f"  pass  {name}")
    else:
        print(f"  FAIL  {name} {detail}")
        FAILURES.append(name)


def approx(a: float, b: float, tol: float = 1e-9) -> bool:
    return abs(a - b) <= tol * max(1.0, abs(a), abs(b))


def test_transitions_conserve_mass() -> None:
    """With growth, killing and escape disabled, transitions must conserve mass."""
    p = default_params()
    p = type(p)(**{**p.__dict__, "growth": {s: 0.0 for s in STATES},
                   "kappa": 0.0, "alpha_escape": 0.0})
    st = initial_state(p, cells=1.0e6)
    total0 = st.load
    sch = Schedule("none")
    for _ in range(400):
        st = step(st, p, sch)
    check("transitions conserve total mass",
          approx(st.load, total0, 1e-6),
          f"start={total0:.6e} end={st.load:.6e}")


def test_phi_bounded() -> None:
    """Immune fitness must stay inside [phi_floor, 1] under any control."""
    p = default_params()
    st = initial_state(p, cells=9.0e8)
    worst, best = 1.0, 0.0
    for ox in (0.0, 1.0):
        for buf in (0.0, 1.0):
            for gln in (0.0, 1.0):
                for amp in (0.0, 1.0):
                    v = immune_fitness(
                        st, p,
                        {"oxphos": ox, "buffer": buf, "glutamine": gln, "ampk": amp},
                    )
                    worst, best = min(worst, v), max(best, v)
    check("phi within [floor, 1]", p.phi_floor - 1e-12 <= worst and best <= 1.0,
          f"range=[{worst:.3f}, {best:.3f}]")


def test_visibility_bounded() -> None:
    p = default_params()
    ok = True
    for s in STATES:
        for ox in (0.0, 0.5, 1.0):
            for pr in (0.0, 1.0):
                v = visibility(s, p, {"oxphos": ox, "persist": pr})
                ok &= 0.0 <= v <= 1.0
    check("visibility within [0, 1]", ok)


def test_oxphos_raises_m1_visibility_and_costs_fitness() -> None:
    """The central trade-off must actually be present in the code."""
    p = default_params()
    st = initial_state(p, cells=2.0e6)
    v_off = visibility("M1", p, {"oxphos": 0.0})
    v_on = visibility("M1", p, {"oxphos": 1.0})
    f_off = immune_fitness(st, p, {"oxphos": 0.0})
    f_on = immune_fitness(st, p, {"oxphos": 1.0})
    check("OXPHOS raises M1 visibility", v_on > v_off, f"{v_off:.3f} -> {v_on:.3f}")
    check("OXPHOS lowers immune fitness", f_on < f_off, f"{f_off:.3f} -> {f_on:.3f}")


def test_glutamine_is_divergent() -> None:
    """Glutamine antagonism must help fitness, unlike OXPHOS inhibition."""
    p = default_params()
    st = initial_state(p, cells=2.0e6)
    f_off = immune_fitness(st, p, {"glutamine": 0.0})
    f_on = immune_fitness(st, p, {"glutamine": 1.0})
    check("glutamine antagonism raises immune fitness", f_on > f_off,
          f"{f_off:.3f} -> {f_on:.3f}")


def test_mric_components_bounded() -> None:
    p = default_params()
    tr = simulate(p, Schedule("icb", icb=window(0, 60)), days=120.0)
    ok = all(0.0 <= c <= 1.0 for c in tr.coverage)
    ok &= all(g >= 1.0 for g in tr.recall)
    ok &= all(0.0 <= f <= 1.0 for f in tr.fitness)
    check("MRIC components in range", ok)


def test_untreated_escapes() -> None:
    """A premise of the objective: the untreated system must escape."""
    p = default_params()
    tr = simulate(p, Schedule("untreated"), days=180.0)
    s = tr.summary()
    check("untreated system escapes", s["relapsed"] == 1.0 and s["cleared"] == 0.0,
          f"final={s['final_cells']:.3e}")


def test_extinction_floor() -> None:
    """A subpopulation below one cell must be set to zero, not kept as dust."""
    p = default_params()
    st = initial_state(p, cells=10.0, mix={"M1": 1.0, "M2": 0.0, "M3": 0.0, "M4": 0.0})
    st.x[IDX["M1"]] = 0.5 / p.carrying_capacity   # half a cell
    st = step(st, p, Schedule("none"))
    check("sub-single-cell populations are cleared", st.x[IDX["M1"]] == 0.0)


def test_memory_ablation_is_worse() -> None:
    """The framing's own null test must behave as the document reports."""
    p = default_params()
    sch = Schedule("gln+buf+icb", glutamine=window(0, 28),
                   buffer=window(0, 60), icb=window(14, 60))
    intact = simulate(p, sch, days=180.0).summary()
    ablated = simulate(ablate_memory(p), sch, days=180.0).summary()
    check("memory ablation worsens final burden",
          ablated["log10_final"] > intact["log10_final"],
          f"intact={intact['log10_final']:.2f} ablated={ablated['log10_final']:.2f}")
    check("memory ablation lowers MRIC",
          ablated["final_mric"] < intact["final_mric"],
          f"intact={intact['final_mric']:.2f} ablated={ablated['final_mric']:.2f}")


def test_determinism() -> None:
    p = default_params()
    sch = Schedule("c", glutamine=window(0, 28), icb=window(0, 60))
    a = simulate(p, sch, days=120.0).summary()
    b = simulate(p, sch, days=120.0).summary()
    check("runs are deterministic", a == b)


def test_no_negative_mass() -> None:
    p = default_params()
    sch = Schedule("hard", oxphos=window(0, 60), icb=window(0, 60),
                   glutamine=window(0, 60), buffer=window(0, 60),
                   ampk=window(0, 60), persist=window(0, 60))
    tr = simulate(p, sch, days=200.0)
    ok = all(v >= 0.0 for s in STATES for v in tr.per_state[s])
    check("no negative subpopulations under maximal control", ok)


def main() -> None:
    print("MRIC model invariant checks\n")
    for fn in (
        test_transitions_conserve_mass,
        test_phi_bounded,
        test_visibility_bounded,
        test_oxphos_raises_m1_visibility_and_costs_fitness,
        test_glutamine_is_divergent,
        test_mric_components_bounded,
        test_untreated_escapes,
        test_extinction_floor,
        test_memory_ablation_is_worse,
        test_determinism,
        test_no_negative_mass,
    ):
        fn()
    print()
    if FAILURES:
        print(f"{len(FAILURES)} check(s) FAILED: {', '.join(FAILURES)}")
        sys.exit(1)
    print("all checks passed")


if __name__ == "__main__":
    main()

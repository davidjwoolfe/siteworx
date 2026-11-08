"""
Executable predictions of the MRIC research objective.

Each experiment corresponds to a numbered hypothesis in OBJECTIVE.md and is
written so that it can *fail*. Where an experiment's outcome would falsify the
framing, that is stated in its docstring.

Run:  python3 -I research/mric/model/experiments.py
Writes JSON + a markdown table to research/mric/results/.

Reminder: every number below is a property of the model under illustrative
parameters, not a biological or clinical result.
"""

from __future__ import annotations

import json
import os
import sys
from dataclasses import replace
from typing import Dict, List

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from mric import (  # noqa: E402
    STATES, Params, Schedule, Trace, ablate_memory, combine, constant,
    default_params, simulate, window,
)

HORIZON = 180.0
M1_DOMINANT = {"M1": 0.70, "M2": 0.18, "M3": 0.10, "M4": 0.02}
M2_DOMINANT = {"M1": 0.15, "M2": 0.65, "M3": 0.15, "M4": 0.05}

# Treatment is applied inside a 60-day window; the remaining 120 days test
# durability with no drug on board. Durability, not nadir, is the endpoint.
TX_END = 60.0


# ----------------------------------------------------------------------
# E1 - sequencing (Hypothesis A)
# ----------------------------------------------------------------------
def e1_sequencing(p: Params) -> List[Trace]:
    """
    Does metabolic visibility have to *precede* checkpoint release?

    FALSIFIED IF concurrent dosing matches or beats sequential on durability.
    """
    schedules = [
        Schedule("untreated"),
        Schedule("icb_only", icb=window(0, TX_END)),
        Schedule("oxphos_only", oxphos=window(0, TX_END)),
        Schedule("concurrent", oxphos=window(0, TX_END), icb=window(0, TX_END)),
        Schedule(
            "sequential_ox_then_icb",
            oxphos=window(0, 21),
            icb=window(21, TX_END),
        ),
        Schedule(
            "sequential_overlap",
            oxphos=window(0, 28),
            icb=window(14, TX_END),
        ),
        Schedule(
            "reverse_icb_then_ox",
            icb=window(0, 21),
            oxphos=window(21, TX_END),
        ),
    ]
    return [simulate(p, s, days=HORIZON, mix=M1_DOMINANT) for s in schedules]


# ----------------------------------------------------------------------
# E2 - pulse width (Hypothesis A, quantitative form)
# ----------------------------------------------------------------------
def e2_pulse_width(p: Params) -> Dict[str, Dict[str, float]]:
    """
    The model predicts an interior optimum in OXPHOS-inhibition pulse width:
    too short and M1 never becomes visible; too long and the shared
    mitochondrial dependency degrades effector fitness while toxicity accrues.

    FALSIFIED IF the response is monotone in pulse width.
    """
    out = {}
    for w in (0, 3, 7, 10, 14, 21, 28, 35, 42, 56):
        sch = Schedule(
            f"pulse_{w}d",
            oxphos=window(0, w) if w > 0 else constant(0.0),
            icb=window(max(w - 7, 0), TX_END),
        )
        tr = simulate(p, sch, days=HORIZON, mix=M1_DOMINANT)
        out[f"{w}"] = tr.summary()
    return out


# ----------------------------------------------------------------------
# E3 - which node raises visibility best (Hypothesis D)
# ----------------------------------------------------------------------
def e3_visibility_node(p: Params) -> List[Trace]:
    """
    OXPHOS inhibition raises tumour visibility but *taxes* effector fitness.
    Glutamine antagonism is modelled as divergent: it suppresses tumour
    growth while *raising* effector fitness (Leone 2019; Oh 2020).

    PREDICTION: the divergent node dominates the trade-off node at equal
    assumed potency, and the ranking should be insensitive to modest changes
    in assumed potency.

    FALSIFIED IF the OXPHOS arm wins, or if the ranking flips under the
    sensitivity sweep in e6.
    """
    schedules = [
        Schedule("ox+icb", oxphos=window(0, 21), icb=window(14, TX_END)),
        Schedule("gln+icb", glutamine=window(0, 21), icb=window(14, TX_END)),
        Schedule("ampk+icb", ampk=window(0, 21), icb=window(14, TX_END)),
        Schedule(
            "gln+ampk+icb",
            glutamine=window(0, 21), ampk=window(0, TX_END), icb=window(14, TX_END),
        ),
        Schedule(
            "ox+buffer+icb",
            oxphos=window(0, 21), buffer=window(0, TX_END), icb=window(14, TX_END),
        ),
        Schedule(
            "triple_gln_buf_icb",
            glutamine=window(0, 28), buffer=window(0, TX_END), icb=window(14, TX_END),
        ),
    ]
    return [simulate(p, s, days=HORIZON, mix=M1_DOMINANT) for s in schedules]


# ----------------------------------------------------------------------
# E4 - adaptive vs maximal immune pressure (Hypothesis C)
# ----------------------------------------------------------------------
def e4_adaptive_dosing(p: Params) -> List[Trace]:
    """
    West et al. (2024) report a *bimodal* therapy landscape: either maximise
    immune response, or restrain it to avoid selecting invasive phenotypes.
    Here the restrained arm withholds checkpoint pressure whenever the
    persister compartment is expanding.

    FALSIFIED IF state-contingent restraint never beats continuous maximal
    pressure anywhere in the initial-condition space.
    """

    def restrain(st):
        """Back off checkpoint pressure when M4 is accumulating."""
        if st.t >= TX_END:
            return {"icb": 0.0}
        m4_frac = st.fraction("M4")
        return {"icb": 0.25 if m4_frac > 0.12 else 1.0}

    schedules = [
        Schedule("maximal", glutamine=window(0, 28), icb=window(0, TX_END)),
        Schedule(
            "adaptive_restrained",
            glutamine=window(0, 28),
            icb=window(0, TX_END),
            controller=restrain,
        ),
        Schedule(
            "pulsed_icb",
            glutamine=window(0, 28),
            icb=combine(window(0, 10), window(20, 30), window(40, 50)),
        ),
    ]
    traces = []
    for mix, tag in ((M1_DOMINANT, "M1dom"), (M2_DOMINANT, "M2dom")):
        for s in schedules:
            tr = simulate(p, replace_name(s, f"{s.name}@{tag}"), days=HORIZON, mix=mix)
            traces.append(tr)
    return traces


def replace_name(sch: Schedule, name: str) -> Schedule:
    return Schedule(
        name=name, oxphos=sch.oxphos, icb=sch.icb, buffer=sch.buffer,
        glutamine=sch.glutamine, ampk=sch.ampk, persist=sch.persist,
        controller=sch.controller,
    )


# ----------------------------------------------------------------------
# E5 - the null test (Hypothesis B, and the whole framing)
# ----------------------------------------------------------------------
def e5_memory_ablation(p: Params) -> Dict[str, Dict[str, float]]:
    """
    THE DECISIVE TEST OF THE FRAMING.

    If removing the meta-recursive terms (memory formation and recall gain)
    leaves durability essentially unchanged, then "meta-recursive immune
    capacity" is decorative: the same behaviour would follow from a static
    recognition model, and the research objective should be rewritten around
    metabolic state control alone.

    Reported as the durability gap between intact and ablated models.
    """
    best = Schedule(
        "gln+buf+icb", glutamine=window(0, 28), buffer=window(0, TX_END),
        icb=window(14, TX_END),
    )
    out = {}
    for tag, pp in (("intact", p), ("memory_ablated", ablate_memory(p))):
        for mixtag, mix in (("M1dom", M1_DOMINANT), ("M2dom", M2_DOMINANT)):
            tr = simulate(pp, best, days=HORIZON, mix=mix)
            out[f"{tag}@{mixtag}"] = tr.summary()
    return out


# ----------------------------------------------------------------------
# E6 - sensitivity: do the conclusions survive parameter doubt?
# ----------------------------------------------------------------------
def e6_sensitivity(p: Params) -> Dict[str, Dict[str, float]]:
    """
    One-at-a-time sweep over the three parameters the framing leans on hardest.
    A conclusion that only holds at one parameter value is not a conclusion.
    """
    ox = Schedule("ox+icb", oxphos=window(0, 21), icb=window(14, TX_END))
    gln = Schedule("gln+icb", glutamine=window(0, 21), icb=window(14, TX_END))

    out: Dict[str, Dict[str, float]] = {}
    sweeps = {
        "recall_gain": [0.0, 0.5, 1.0, 2.1, 4.0, 8.0],
        "alpha_escape": [0.0, 0.2, 0.55, 1.0, 1.6],
        "ox_phi_cost": [0.0, 0.10, 0.30, 0.50, 0.70],
    }
    for key, vals in sweeps.items():
        for v in vals:
            pp = replace(p, **{key: v})
            a = simulate(pp, ox, days=HORIZON, mix=M1_DOMINANT).summary()
            b = simulate(pp, gln, days=HORIZON, mix=M1_DOMINANT).summary()
            out[f"{key}={v}"] = {
                "ox_log10_final": a["log10_final"],
                "gln_log10_final": b["log10_final"],
                "gln_wins": float(b["log10_final"] < a["log10_final"]),
                "ox_relapsed": a["relapsed"],
                "gln_relapsed": b["relapsed"],
            }
    return out


# ----------------------------------------------------------------------
# E7 - control feasibility map
# ----------------------------------------------------------------------
def e7_feasibility(p: Params) -> Dict[str, Dict[str, float]]:
    """
    Where in parameter space is durable control reachable at all?

    Sweeps the two coefficients the framing turns on - recall gain (lambda,
    the strength of the meta-recursive update) and alpha_escape (how strongly
    killing selects for escape) - under a fixed, reasonable schedule.

    This is the platform's most reusable artefact: it says which *measurements*
    would tell us whether durable control is achievable, independently of
    which drug is chosen.
    """
    sch = Schedule(
        "gln+buf+icb", glutamine=window(0, 28), buffer=window(0, TX_END),
        icb=window(14, TX_END),
    )
    out = {}
    for lam in (0.0, 1.0, 2.1, 4.0, 6.0, 8.0):
        for a in (0.0, 0.2, 0.55, 1.0):
            pp = replace(p, recall_gain=lam, alpha_escape=a)
            s = simulate(pp, sch, days=HORIZON, mix=M1_DOMINANT).summary()
            out[f"lambda={lam},alpha={a}"] = {
                "log10_final": s["log10_final"],
                "relapsed": s["relapsed"],
                "cleared": s["cleared"],
                "min_margin_post_tx": s["min_margin_post_tx"],
                "final_m4_frac": s["final_m4_frac"],
            }
    return out


# ----------------------------------------------------------------------
# E8 - is persister coverage the binding constraint?
# ----------------------------------------------------------------------
def e8_persister_constraint(p: Params) -> List[Trace]:
    """
    The model asserts that M4 - metabolically idling, minimally visible - is
    the compartment no schedule covers, and therefore the seat of relapse.

    If that assertion is right, then adding a hypothetical control that raises
    M4 visibility should change durability far more than any rearrangement of
    the existing agents. If it does not, the model's emphasis on the persister
    state is misplaced and the objective should be rewritten.

    [SPECULATIVE] The `persist` control is a counterfactual device. No
    published or licensed agent is assumed to produce this effect.
    """
    base = dict(glutamine=window(0, 28), buffer=window(0, TX_END),
                icb=window(14, TX_END))
    schedules = [
        Schedule("best_real_agents", **base),
        Schedule("+persist_unmask_short", persist=window(14, 35), **base),
        Schedule("+persist_unmask_full", persist=window(0, TX_END), **base),
        Schedule(
            "+persist_unmask_maintained",
            persist=combine(window(0, TX_END), window(TX_END, HORIZON, 0.35)),
            **base,
        ),
    ]
    return [simulate(p, s, days=HORIZON, mix=M1_DOMINANT) for s in schedules]


# ----------------------------------------------------------------------
# E9 - is apparent durability just a short horizon?
# ----------------------------------------------------------------------
def e9_horizon(p: Params) -> Dict[str, Dict[str, float]]:
    """
    A 180-day read-out can mistake slow persister regrowth for durable
    control. This re-runs the two decisive arms out to three years.

    If "no relapse" at 180 days dissolves at 540 or 1080 days, the endpoint
    is an artefact of the horizon and must be redefined.
    """
    base = dict(glutamine=window(0, 28), buffer=window(0, TX_END),
                icb=window(14, TX_END))
    schedules = [
        Schedule("best_real_agents", **base),
        Schedule(
            "+persist_maintained",
            persist=combine(window(0, TX_END), window(TX_END, 2000, 0.35)),
            **base,
        ),
    ]
    out = {}
    for H in (180.0, 360.0, 540.0, 1080.0):
        for sch in schedules:
            s = simulate(p, sch, days=H, mix=M1_DOMINANT).summary(tx_end=TX_END)
            out[f"{sch.name}@{int(H)}d"] = {
                "log10_final": s["log10_final"],
                "relapsed": s["relapsed"],
                "cleared": s["cleared"],
                "final_m4_frac": s["final_m4_frac"],
                "min_margin_post_tx": s["min_margin_post_tx"],
            }
    return out


# ----------------------------------------------------------------------
# reporting
# ----------------------------------------------------------------------
def table(traces: List[Trace]) -> str:
    hdr = (
        "| schedule | nadir | final burden | log10 final | cleared | relapsed "
        "| peak MRIC | min margin (2nd half) | OXPHOS tox | cum. M4 influx |"
    )
    sep = "|---|---|---|---|---|---|---|---|---|---|"
    rows = [hdr, sep]
    for tr in traces:
        s = tr.summary()
        rows.append(
            f"| `{tr.name}` | {s['nadir_cells']:.3g} | {s['final_cells']:.3g} | "
            f"{s['log10_final']:.2f} | {'yes' if s['cleared'] else 'no'} | "
            f"{'yes' if s['relapsed'] else 'no'} | {s['peak_mric']:.3f} | "
            f"{s['min_margin_post_tx']:.4f} | {s['toxicity']:.1f} | "
            f"{s['cum_m4_influx_cells']:.3g} |"
        )
    return "\n".join(rows)


def dict_table(d: Dict[str, Dict[str, float]], keys: List[str]) -> str:
    rows = ["| case | " + " | ".join(keys) + " |", "|---" * (len(keys) + 1) + "|"]
    for k, v in d.items():
        cells = []
        for kk in keys:
            val = v.get(kk, float("nan"))
            cells.append(f"{val:.3g}" if isinstance(val, float) else str(val))
        rows.append(f"| `{k}` | " + " | ".join(cells) + " |")
    return "\n".join(rows)


def main() -> None:
    p = default_params()
    here = os.path.dirname(os.path.abspath(__file__))
    outdir = os.path.join(os.path.dirname(here), "results")
    os.makedirs(outdir, exist_ok=True)

    e1 = e1_sequencing(p)
    e2 = e2_pulse_width(p)
    e3 = e3_visibility_node(p)
    e4 = e4_adaptive_dosing(p)
    e5 = e5_memory_ablation(p)
    e6 = e6_sensitivity(p)
    e7 = e7_feasibility(p)
    e8 = e8_persister_constraint(p)
    e9 = e9_horizon(p)

    md = ["# MRIC model runs",
          "",
          "All values are properties of the model under the illustrative "
          "parameters in `mric.py:default_params()`. They are predictions to "
          "be tested, not evidence about biology.",
          "",
          f"Horizon {HORIZON:.0f} days; treatment window closes at day "
          f"{TX_END:.0f}; the remaining days test durability off-treatment.",
          "",
          "## E1 - sequencing (Hypothesis A)", "", table(e1), "",
          "## E2 - OXPHOS pulse width (Hypothesis A, quantitative)", "",
          dict_table(e2, ["log10_final", "relapsed", "toxicity", "cum_m4_influx_cells"]), "",
          "## E3 - which node raises visibility best (Hypothesis D)", "", table(e3), "",
          "## E4 - adaptive vs maximal pressure (Hypothesis C)", "", table(e4), "",
          "## E5 - memory ablation: the null test (Hypothesis B)", "",
          dict_table(e5, ["log10_final", "cleared", "relapsed", "final_mric",
                          "min_margin_post_tx"]), "",
          "## E6 - sensitivity", "",
          dict_table(e6, ["ox_log10_final", "gln_log10_final", "gln_wins",
                          "ox_relapsed", "gln_relapsed"]), "",
          "## E7 - control feasibility map", "",
          dict_table(e7, ["log10_final", "relapsed", "cleared",
                          "min_margin_post_tx", "final_m4_frac"]), "",
          "## E8 - is persister coverage the binding constraint?", "",
          table(e8), "",
          "## E9 - horizon check on durability", "",
          dict_table(e9, ["log10_final", "relapsed", "cleared",
                          "final_m4_frac", "min_margin_post_tx"]), "",
          ]
    report = "\n".join(md)

    with open(os.path.join(outdir, "runs.md"), "w") as f:
        f.write(report + "\n")

    payload = {
        "e1_sequencing": {t.name: t.summary() for t in e1},
        "e2_pulse_width": e2,
        "e3_visibility_node": {t.name: t.summary() for t in e3},
        "e4_adaptive": {t.name: t.summary() for t in e4},
        "e5_memory_ablation": e5,
        "e6_sensitivity": e6,
        "e7_feasibility": e7,
        "e8_persister_constraint": {t.name: t.summary() for t in e8},
        "e9_horizon": e9,
    }
    with open(os.path.join(outdir, "runs.json"), "w") as f:
        json.dump(payload, f, indent=1)

    print(report)
    print(f"\n[written] {os.path.join(outdir, 'runs.md')}")
    print(f"[written] {os.path.join(outdir, 'runs.json')}")


if __name__ == "__main__":
    main()

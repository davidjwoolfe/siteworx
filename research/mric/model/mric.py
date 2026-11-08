"""
MRIC: Meta-Recursive Immune Capacity over tumour metabolic states.

A minimal, auditable state-transition engine for reasoning about metastatic
control as a *coupled* problem: tumour cells move between metabolic states,
and the immune repertoire that must recognise them is itself updated by, and
metabolically gated by, those same states.

WHAT THIS IS
    A hypothesis-generating sandbox. It makes the logic of the research
    objective executable, so its predictions are explicit and falsifiable.

WHAT THIS IS NOT
    Not a fitted model. Not a simulation of any patient, trial or dataset.
    Not clinical decision support. Parameter values are *illustrative* and are
    tagged with provenance in `default_params()`:
        [anchored:<ref>]  sign/direction supported by a cited publication;
                          magnitude is NOT an empirical claim
        [free]            chosen for numerical conditioning only

Every quantitative output of this module is a statement about the model, never
about biology.

UNITS
    Tumour mass `x` is held per state as a *fraction of carrying capacity*,
    so sum(x) in [0, 1]. Absolute cell counts are recovered by multiplying by
    `carrying_capacity`, and a subpopulation below a single cell is treated as
    extinct. All rates are per day. Integration is explicit Euler at `dt`.

Author: generated for the siteworx research platform.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field, replace
from typing import Callable, Dict, List

# --------------------------------------------------------------------------
# State space
# --------------------------------------------------------------------------
# M1  OXPHOS-dominant, immune-excluded
# M2  glycolytic / acidic, immune-suppressed
# M3  immune-infiltrated but metabolically out-competed (exhausted)
# M4  drug-tolerant persister: metabolic idling, minimal antigen visibility
STATES: tuple[str, ...] = ("M1", "M2", "M3", "M4")
IDX: Dict[str, int] = {s: i for i, s in enumerate(STATES)}


@dataclass(frozen=True)
class Params:
    """Model parameters. See default_params() for the provenance of each."""

    growth: Dict[str, float]
    carrying_capacity: float

    visibility: Dict[str, float]      # baseline antigen visibility, [0,1]
    brake: Dict[str, float]           # PD-L1-like brake on killing, [0,1]

    q_base: Dict[tuple, float]        # spontaneous transitions, per day

    alpha_escape: float               # killing-induced escape flux
    escape_targets: Dict[str, str]

    kappa: float                      # killing efficiency per unit effector
    prime: float                      # max priming rate
    prime_halfsat: float              # antigen giving half-maximal priming
    decay_eff: float                  # effector decay

    mem_form: float                   # memory formation from effectors
    mem_decay: float                  # memory decay (slow)
    mem_cap: float                    # memory ceiling per state
    recall_gain: float                # lambda: memory-driven priming boost
    coverage_threshold: float         # effector mass counted as "covering"

    phi_floor: float                  # worst-case immune metabolic fitness
    acid_penalty: float               # fitness lost to acidification
    glucose_penalty: float            # fitness lost to glucose competition

    ox_growth_kill: float
    ox_visibility_gain: float
    ox_phi_cost: float                # the central trade-off
    ox_tox_rate: float

    icb_brake_release: float
    buf_phi_gain: float
    buf_acid_relief: float
    gln_growth_kill: float
    gln_phi_gain: float               # divergent effect
    ampk_phi_gain: float

    # Hypothetical persister-unmasking control. No licensed or published
    # agent is assumed to do this; it exists so the model can be asked
    # whether M4 coverage is the binding constraint. [SPECULATIVE]
    persist_visibility_gain: float = 0.0

    dt: float = 0.25


def default_params() -> Params:
    """
    Illustrative parameter set. References are keyed to REFERENCES.md.

    The set is chosen so that the untreated system escapes, checkpoint
    blockade alone is insufficient, and the persister state M4 is the hardest
    compartment to cover. Those three qualitative features are the *premises*
    of the research objective; the model is built to explore their
    consequences, not to prove them.
    """
    return Params(
        # M4 idles near zero growth but is nearly invisible.
        # [anchored:robertson_tessi_2015]
        growth={"M1": 0.090, "M2": 0.110, "M3": 0.070, "M4": 0.004},
        carrying_capacity=1.0e9,                                       # [free]

        # M1 immune-excluded; M4 lowest visibility of all.
        # [anchored:zhang_tlsb01_2026, fischer_2019, duan_2024]
        visibility={"M1": 0.18, "M2": 0.35, "M3": 0.70, "M4": 0.020},

        # Immune-excluded and acidic states carry the heaviest brake.
        # [anchored:west_2024]
        brake={"M1": 0.75, "M2": 0.85, "M3": 0.55, "M4": 0.80},

        # Baseline plasticity; hybrid transit is cheap. [anchored:jia_2019]
        q_base={
            ("M1", "M2"): 0.010, ("M1", "M3"): 0.006, ("M1", "M4"): 0.0015,
            ("M2", "M1"): 0.008, ("M2", "M3"): 0.010, ("M2", "M4"): 0.0020,
            ("M3", "M1"): 0.006, ("M3", "M2"): 0.012, ("M3", "M4"): 0.0025,
            ("M4", "M1"): 0.0040, ("M4", "M2"): 0.0040, ("M4", "M3"): 0.0020,
        },

        # Killing selects for escape: the evolutionary double-bind.
        # [anchored:west_2024, gatenby_2009]
        alpha_escape=0.55,
        escape_targets={"M1": "M4", "M2": "M4", "M3": "M2", "M4": "M4"},

        kappa=0.85,                                                    # [free]
        prime=0.30,                                                    # [free]
        prime_halfsat=1.0e-3,                                          # [free]
        decay_eff=0.20,                                                # [free]

        mem_form=0.030,                                                # [free]
        mem_decay=0.0022,                                              # [free]
        mem_cap=1.0,                                                   # [free]
        # The meta-recursive term.
        # [anchored:nathan_2026, helmink_2020, cabrita_2020, petitprez_2020]
        recall_gain=2.1,
        coverage_threshold=0.10,                                       # [free]

        phi_floor=0.10,                                                # [free]
        # Acid inactivation and glucose competition gate effector function.
        # [anchored:west_2024, chang_2015]
        acid_penalty=0.55,
        glucose_penalty=0.40,

        # OXPHOS inhibition raises M1 visibility but taxes effector
        # mitochondria and accrues mechanism-based toxicity.
        # [anchored:zhang_tlsb01_2026, duan_2024 | toxicity: yap_2023]
        ox_growth_kill=0.075,
        ox_visibility_gain=0.46,
        ox_phi_cost=0.30,
        ox_tox_rate=1.0,

        icb_brake_release=0.80,                 # [anchored:west_2024]
        buf_phi_gain=0.26,                      # [anchored:west_2024]
        buf_acid_relief=0.55,                   # [anchored:west_2024]

        # Glutamine antagonism: divergent programmes. Suppresses tumour
        # metabolism while effectors adopt a long-lived oxidative phenotype.
        # [anchored:leone_2019, oh_2020]
        gln_growth_kill=0.050,
        gln_phi_gain=0.30,

        ampk_phi_gain=0.24,                     # [anchored:shukla_2024]
        # Off by default: enabled only in the E8 counterfactual.
        persist_visibility_gain=0.55,           # [SPECULATIVE - no agent assumed]
        dt=0.25,
    )


# --------------------------------------------------------------------------
# Interventions
# --------------------------------------------------------------------------
@dataclass(frozen=True)
class Schedule:
    """
    A treatment schedule. Each control maps time (days) to intensity in
    [0, 1]; 0 = off, 1 = the full assumed effect size.
    """

    name: str
    oxphos: Callable[[float], float] = lambda t: 0.0
    icb: Callable[[float], float] = lambda t: 0.0
    buffer: Callable[[float], float] = lambda t: 0.0
    glutamine: Callable[[float], float] = lambda t: 0.0
    ampk: Callable[[float], float] = lambda t: 0.0
    # Hypothetical persister-unmasking control. [SPECULATIVE]
    persist: Callable[[float], float] = lambda t: 0.0
    # Optional state-contingent controller: receives the live State and
    # returns control overrides. This is how adaptive dosing is expressed.
    controller: Callable[["State"], Dict[str, float]] | None = None


def window(start: float, stop: float, level: float = 1.0) -> Callable[[float], float]:
    """Control at `level` on [start, stop), else 0."""
    return lambda t: level if start <= t < stop else 0.0


def constant(level: float = 1.0) -> Callable[[float], float]:
    return lambda t: level


def combine(*fns: Callable[[float], float]) -> Callable[[float], float]:
    """Max-combine several windows into one control."""
    return lambda t: max((f(t) for f in fns), default=0.0)


# --------------------------------------------------------------------------
# Live state
# --------------------------------------------------------------------------
@dataclass
class State:
    t: float
    x: List[float]            # tumour mass per state, fraction of capacity
    eff: List[float]          # effector mass per state-specific clone set
    mem: List[float]          # memory mass per state-specific clone set
    phi: float = 1.0          # immune metabolic fitness, [0,1]
    tox: float = 0.0          # cumulative toxicity budget consumed
    m4_influx: float = 0.0    # cumulative flux into the persister state

    @property
    def load(self) -> float:
        """Total tumour mass as a fraction of carrying capacity."""
        return sum(self.x)

    def cells(self, K: float) -> float:
        return self.load * K

    def fraction(self, s: str) -> float:
        L = self.load
        return self.x[IDX[s]] / L if L > 0 else 0.0


# --------------------------------------------------------------------------
# Core quantities
# --------------------------------------------------------------------------
def immune_fitness(st: State, p: Params, ctrl: Dict[str, float]) -> float:
    """
    phi: the metabolic gate on effector function.

    Falls with acidification (tracked by M2 mass) and with glucose
    competition (tracked by total load). Rises with buffering, glutamine
    antagonism and AMPK activation. Falls with OXPHOS inhibition, because
    effectors share the targeted dependency - the trade-off this model exists
    to expose.
    """
    load = st.load
    acid = st.fraction("M2") * load
    acid *= (1.0 - p.buf_acid_relief * ctrl.get("buffer", 0.0))

    penalty = p.acid_penalty * acid + p.glucose_penalty * load
    gain = (
        p.buf_phi_gain * ctrl.get("buffer", 0.0)
        + p.gln_phi_gain * ctrl.get("glutamine", 0.0)
        + p.ampk_phi_gain * ctrl.get("ampk", 0.0)
    )
    cost = p.ox_phi_cost * ctrl.get("oxphos", 0.0)

    return max(p.phi_floor, min(1.0, 1.0 - penalty + gain - cost))


def visibility(s: str, p: Params, ctrl: Dict[str, float]) -> float:
    """Antigen visibility of state s under the current controls."""
    v = p.visibility[s]
    if s == "M1":
        v += p.ox_visibility_gain * ctrl.get("oxphos", 0.0)
    if s == "M4":
        v += p.persist_visibility_gain * ctrl.get("persist", 0.0)
    return max(0.0, min(1.0, v))


def effective_brake(s: str, p: Params, ctrl: Dict[str, float]) -> float:
    """Residual checkpoint brake after blockade."""
    return p.brake[s] * (1.0 - p.icb_brake_release * ctrl.get("icb", 0.0))


def pressure(st: State, s: str, p: Params, ctrl: Dict[str, float]) -> float:
    """
    Per-capita immune killing rate on state s, per day:

        P_s = kappa * effector_s * phi * V_s * (1 - residual brake)

    This single quantity both kills cells and selects for escape.
    """
    i = IDX[s]
    return (
        p.kappa
        * st.eff[i]
        * st.phi
        * visibility(s, p, ctrl)
        * (1.0 - effective_brake(s, p, ctrl))
    )


def mric(st: State, p: Params, ctrl: Dict[str, float]) -> Dict[str, float]:
    """
    Meta-Recursive Immune Capacity, decomposed into its three measurable
    components plus their product:

        coverage   C   fraction of states with effector mass above threshold
        recall     G   mean memory-driven re-priming multiplier
        fitness    Phi mean metabolic competence of effectors

        MRIC = C * G * Phi

    The components are reported separately and never silently collapsed,
    because the objective's control claim is stated in terms of all three.
    """
    covered = sum(1 for i in range(len(STATES)) if st.eff[i] >= p.coverage_threshold)
    C = covered / len(STATES)
    G = 1.0 + p.recall_gain * (sum(st.mem) / len(STATES))
    return {"coverage": C, "recall_gain": G, "fitness": st.phi, "mric": C * G * st.phi}


def remission_margin(st: State, p: Params, ctrl: Dict[str, float]) -> float:
    """
    The model's remission condition, expressed as a margin (per day):

        margin = min over states of [ P_s - (growth_s + outward leak_s) ]

    Sustained margin > 0 after treatment stops is the model's formal statement
    of durable control: pressure on the *weakest-covered* state must exceed
    that state's net expansion plus its leak into other states. A falling
    burden with a negative margin is the signature of impending relapse.
    """
    worst = math.inf
    for s in STATES:
        leak = sum(v for (a, _b), v in p.q_base.items() if a == s)
        worst = min(worst, pressure(st, s, p, ctrl) - (p.growth[s] + leak))
    return worst


# --------------------------------------------------------------------------
# Integration
# --------------------------------------------------------------------------
def _controls(sch: Schedule, st: State) -> Dict[str, float]:
    ctrl = {
        "oxphos": sch.oxphos(st.t),
        "icb": sch.icb(st.t),
        "buffer": sch.buffer(st.t),
        "glutamine": sch.glutamine(st.t),
        "ampk": sch.ampk(st.t),
        "persist": sch.persist(st.t),
    }
    if sch.controller is not None:
        ctrl.update(sch.controller(st))
    return {k: max(0.0, min(1.0, float(v))) for k, v in ctrl.items()}


def step(st: State, p: Params, sch: Schedule) -> State:
    """One explicit Euler step of the coupled system, in per-capita form."""
    ctrl = _controls(sch, st)
    st.phi = immune_fitness(st, p, ctrl)

    logistic = max(0.0, 1.0 - st.load)
    cell_floor = 1.0 / p.carrying_capacity

    dx = [0.0] * len(STATES)
    deff = [0.0] * len(STATES)
    dmem = [0.0] * len(STATES)
    m4_in = 0.0

    for s in STATES:
        i = IDX[s]
        xi = st.x[i]
        if xi <= 0.0:
            continue

        # --- growth, suppressed by interventions ---------------------
        g = p.growth[s]
        if s == "M1":
            g -= p.ox_growth_kill * ctrl["oxphos"]
        g -= p.gln_growth_kill * ctrl["glutamine"]
        dx[i] += max(0.0, g) * logistic * xi

        # --- immune killing ------------------------------------------
        P = pressure(st, s, p, ctrl)
        dx[i] -= P * xi

        # --- spontaneous transitions ---------------------------------
        for (a, b), q in p.q_base.items():
            if a != s:
                continue
            flux = q * xi
            dx[i] -= flux
            dx[IDX[b]] += flux
            if b == "M4":
                m4_in += flux

        # --- killing-induced escape: the double-bind -----------------
        tgt = p.escape_targets[s]
        if tgt != s:
            esc = p.alpha_escape * P * xi
            dx[i] -= esc
            dx[IDX[tgt]] += esc
            if tgt == "M4":
                m4_in += esc

    # --- immune recursion --------------------------------------------
    for s in STATES:
        i = IDX[s]
        # antigen encountered depends on visibility, not mass alone
        antigen = visibility(s, p, ctrl) * st.x[i]
        drive = antigen / (p.prime_halfsat + antigen)
        recall = 1.0 + p.recall_gain * st.mem[i]
        deff[i] += p.prime * drive * st.phi * recall - p.decay_eff * st.eff[i]
        dmem[i] += (
            p.mem_form * st.eff[i] * max(0.0, 1.0 - st.mem[i] / p.mem_cap)
            - p.mem_decay * st.mem[i]
        )

    dt = p.dt
    nx = []
    for i in range(len(STATES)):
        v = st.x[i] + dt * dx[i]
        nx.append(0.0 if v < cell_floor else v)
    neff = [max(0.0, st.eff[i] + dt * deff[i]) for i in range(len(STATES))]
    nmem = [
        max(0.0, min(p.mem_cap, st.mem[i] + dt * dmem[i])) for i in range(len(STATES))
    ]

    return State(
        t=st.t + dt,
        x=nx,
        eff=neff,
        mem=nmem,
        phi=st.phi,
        tox=st.tox + dt * p.ox_tox_rate * ctrl["oxphos"],
        m4_influx=st.m4_influx + dt * m4_in,
    )


def initial_state(
    p: Params,
    cells: float = 2.0e6,
    mix: Dict[str, float] | None = None,
) -> State:
    """Seed a metastatic burden (in cells) with a metabolic-state mixture."""
    mix = mix or {"M1": 0.70, "M2": 0.18, "M3": 0.10, "M4": 0.02}
    tot = sum(mix.values())
    load = cells / p.carrying_capacity
    x = [load * mix.get(s, 0.0) / tot for s in STATES]
    return State(t=0.0, x=x, eff=[0.0] * len(STATES), mem=[0.0] * len(STATES))


@dataclass
class Trace:
    name: str
    K: float = 1.0e9
    t: List[float] = field(default_factory=list)
    cells: List[float] = field(default_factory=list)
    per_state: Dict[str, List[float]] = field(default_factory=dict)
    mric: List[float] = field(default_factory=list)
    coverage: List[float] = field(default_factory=list)
    recall: List[float] = field(default_factory=list)
    fitness: List[float] = field(default_factory=list)
    margin: List[float] = field(default_factory=list)
    tox: List[float] = field(default_factory=list)
    m4_influx: List[float] = field(default_factory=list)

    def summary(self, relapse_factor: float = 10.0, tx_end: float = 60.0) -> Dict[str, float]:
        nadir = min(self.cells)
        final = self.cells[-1]
        cleared = final < 1.0
        k = self.cells.index(nadir)
        relapsed = (not cleared) and any(
            c > max(relapse_factor * nadir, 1.0) for c in self.cells[k:]
        )
        post = [m for t, m in zip(self.t, self.margin) if t >= tx_end]
        return {
            "nadir_cells": nadir,
            "final_cells": final,
            "log10_final": math.log10(final) if final > 0 else -1.0,
            "cleared": float(cleared),
            "relapsed": float(relapsed),
            "peak_mric": max(self.mric),
            "final_mric": self.mric[-1],
            "min_margin_post_tx": min(post) if post else float("nan"),
            "toxicity": self.tox[-1],
            "cum_m4_influx_cells": self.m4_influx[-1] * self.K,
            "final_m4_frac": (
                self.per_state["M4"][-1] / sum(self.per_state[s][-1] for s in STATES)
                if sum(self.per_state[s][-1] for s in STATES) > 0 else 0.0
            ),
        }


def simulate(
    p: Params,
    sch: Schedule,
    days: float = 180.0,
    cells: float = 2.0e6,
    mix: Dict[str, float] | None = None,
    record_every: int = 4,
) -> Trace:
    """Run one schedule and return its trace."""
    st = initial_state(p, cells=cells, mix=mix)
    tr = Trace(name=sch.name, K=p.carrying_capacity, per_state={s: [] for s in STATES})
    n = int(days / p.dt)
    for k in range(n + 1):
        if k % record_every == 0:
            ctrl = _controls(sch, st)
            m = mric(st, p, ctrl)
            tr.t.append(st.t)
            tr.cells.append(st.load * p.carrying_capacity)
            for s in STATES:
                tr.per_state[s].append(st.x[IDX[s]] * p.carrying_capacity)
            tr.mric.append(m["mric"])
            tr.coverage.append(m["coverage"])
            tr.recall.append(m["recall_gain"])
            tr.fitness.append(m["fitness"])
            tr.margin.append(remission_margin(st, p, ctrl))
            tr.tox.append(st.tox)
            tr.m4_influx.append(st.m4_influx)
        if k < n:
            st = step(st, p, sch)
    return tr


def ablate_memory(p: Params) -> Params:
    """Strip the meta-recursive terms: the framing's own null hypothesis."""
    return replace(p, recall_gain=0.0, mem_form=0.0)


__all__ = [
    "STATES", "IDX", "Params", "default_params", "Schedule", "State", "Trace",
    "window", "constant", "combine", "simulate", "initial_state", "step",
    "mric", "remission_margin", "pressure", "visibility", "immune_fitness",
    "ablate_memory",
]

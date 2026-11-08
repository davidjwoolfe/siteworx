# Meta-Recursive Immune-Metabolic State Control in Metastatic Disease

### A research objective, with an executable model and its disconfirming results

**Version** 0.1 · **Date** 2026-11-08 · **Status** foundation draft, for critique

---

## Scope and what this document is not

This is a **preclinical and in-silico research planning document**. It defines a
modelling programme and the experiments that would confirm or kill it.

- It is **not** clinical guidance, a treatment protocol, or a recommendation
  for any person's care.
- It contains **no dosing**. Agents are named only as published mechanistic
  probes whose *direction of effect* parameterises a simulation.
- Every number in §B/§E is a property of the simulation in `model/mric.py`
  under **illustrative, unfitted parameters**. None is a biological
  measurement, and none should be cited as one.
- Confidence scores follow the convention in §0 and are capped by source count.

Two of the three hypotheses carried over from the originating brief **did not
survive** contact with the model. That is reported in §E and §D rather than
smoothed over, and it is the main reason this draft is worth building on.

---

## §0 Provenance and confidence conventions

| Tag | Meaning |
|---|---|
`[VERIFIED-BIB]` | Bibliographic record confirmed against Crossref, 2026-11-08
`[SNIPPET]` | Finding taken from a web-search result summary, **not** read from the article
`[UNVERIFIED]` | No source retrieved in this session; retrieval query proposed in §F
`[ABSTRACT-ONLY]` | Source is a conference abstract, not a peer-reviewed article
`[MODEL]` | Output of this repository's simulation; not evidence about biology
`[SPECULATIVE]` | Proposed construct with no empirical referent yet
`[HISTORICAL]` | Primary evidence older than ~5 years

**Confidence caps.** Single source ≤ 60. Two independent sources 70–85. Three or
more aligned 85–95. A conference abstract alone ≤ 45. A `[MODEL]` result carries
confidence *in the model's internal logic only* and is never evidence for a
biological claim.

**A hard limit on this entire document.** Publisher full text was unreachable
from this session (see `REFERENCES.md`). Bibliographic identity of all 20
references is verified; their *contents* are known only at search-snippet
resolution. Therefore **no claim in this document above confidence 60 rests on
a single source's contents**, and there are no direct quotations from any
primary article. Retrieval task **R1** in §F closes this.

---

## §A Executive map

**The reframing.** Metastatic lethality is treated here not as a growth problem
but as a **coverage problem over a moving state space**: tumour cells occupy
metabolic states that differ in how visible they are to immune recognition, and
the recognition system that must track them is itself metabolically gated by
those same states. Durable control is then a control-theoretic question — can
immune pressure be kept above net expansion in *every* state, including the
states nobody is currently measuring?

**The five things this exercise actually established.**

1. **The recursion is load-bearing, not decorative.** Ablating memory formation
   and recall gain from the model costs ~0.93 log₁₀ of final burden and drops
   the capacity metric from 2.80 to 0.89. `[MODEL]` A static-recognition model
   would not reproduce the behaviour, so the "meta-recursive" framing earns its
   place. (§E, E5)

2. **Schedule optimisation is close to worthless here; the recursion parameters
   dominate.** Rearranging mitochondrial inhibition and checkpoint blockade —
   sequential, concurrent, reversed — moves final burden by ≈0.01 log₁₀ (~2%).
   Varying the recall-gain coefficient λ over its plausible range moves it by
   **2.3 log₁₀**. `[MODEL]` The research priority inverts: *measure the
   recursion before optimising the combination.* (§E, E1 vs E7)

3. **The binding constraint is the compartment nobody targets.** The persister
   state M4 — metabolically idling, minimally visible — is the only state no
   schedule covers, and it is where relapse originates. The single arm that
   abolished relapse was one that raises persister visibility **and maintains
   it after the treatment window closes**. A pulse of the same control did
   almost nothing. `[MODEL]` No agent is currently attached to this node.
   (§E, E8)

4. **The achievable endpoint is containment, not clearance.** No arm, at any
   parameter setting tried, cleared the tumour. The best arm settled into a
   stable residual burden that held from day 180 out to day 1080. `[MODEL]`
   The endpoint in §5 is therefore rewritten from "remission" to **durable
   containment below a defined threshold**, which is a falsifiable claim rather
   than an aspiration. (§E, E9)

5. **Mitochondrial inhibition is doubly penalised and should not anchor the
   strategy.** It is toxicity-limited in humans `[VERIFIED-BIB: yap_2023]` and,
   because effector cells share the targeted dependency, raising tumour
   visibility this way *lowers* immune fitness in the same step. A divergent
   node — one that suppresses tumour metabolism while improving effector
   metabolism `[VERIFIED-BIB: leone_2019]` — avoids the trade-off entirely and
   carried zero toxicity burden in the model. (§4, §E E3/E6)

**Ranked open questions.**

| # | Question | Why it is first |
|---|---|---|
| Q1 | What is the empirical value of the recall-gain coefficient λ in human metastatic disease? | It dominates every other lever by two orders of magnitude in the model |
| Q2 | Is there any intervention that raises antigen visibility of drug-tolerant persisters? | The model's only route to relapse-free control |
| Q3 | Do tumour-reactive memory B cells recognise *state-coupled* antigens, or state-independent ones? | The recursion hypothesis requires the former; nothing retrieved shows it |
| Q4 | Does killing-induced escape flux (α) exceed the threshold where added pressure is self-defeating? | Determines whether restraint strategies have any domain at all |
| Q5 | Can persister-state occupancy be measured longitudinally at all, in vivo? | Without it, the primary endpoint is unobservable |

---

## §1 Problem statement

Disseminated tumour cells do not merely proliferate; they occupy metabolic
niches that differ in immune visibility, and they move between those niches
under therapeutic pressure.

Three empirical anchors motivate treating this as a *state* problem:

- A metabolically reprogrammed, OXPHOS-enriched brain-metastasis state has been
  described alongside a mitochondria-high/immune-low axis associated with
  inferior survival, with mitochondrial inhibition plus PD-1 blockade reported
  as the most durable combination in an orthotopic model.
  `[SNIPPET][ABSTRACT-ONLY: zhang_tlsb01_2026]` — **confidence 40**: single
  conference abstract, contents not read, no peer review confirmed.
  A peer-reviewed paired primary-lung/brain-metastasis study independently
  reports mitochondria-low/immune-high versus mitochondria-high/immune-low
  groups with a survival difference, and an OXPHOS inhibitor plus PD-1 blockade
  improving survival in mice. `[SNIPPET][VERIFIED-BIB: duan_2024]` Melanoma
  brain metastases show a concordant high-OXPHOS/shorter-survival association.
  `[SNIPPET][VERIFIED-BIB: fischer_2019]` — **taken together, confidence 72**:
  three sources agree in direction across two tumour types, but all three are
  snippet-level and one is an abstract.

- Immune effector function is itself metabolically gated. Acid inactivation,
  glucose competition and checkpoint expression operate jointly, and modelling
  them together yields collective escape behaviour that none produces alone.
  `[SNIPPET][VERIFIED-BIB: west_2024]` Glucose competition between tumour and
  T cells is an established driver. `[SNIPPET][VERIFIED-BIB: chang_2015]
  [HISTORICAL]` — **confidence 74**: two independent sources, one computational
  and one experimental, aligned in direction.

- Systems-level modelling of glioma/T-cell/macrophage metabolism identifies
  AMPK-directed reprogramming coupled with glutamate-uptake inhibition as its
  highest-impact predicted combination for restoring effector function.
  `[SNIPPET][VERIFIED-BIB: shukla_2024]` — **confidence 50**: single source,
  and it is itself a model, so this is a prediction about a prediction.

**The inference.** If states differ in visibility, and effector competence
depends on state-generated environment, then recognition cannot be modelled as
a fixed property. It must be modelled as something that updates — and the
interesting question becomes how fast it updates relative to how fast the
tumour changes state.

---

## §2 (a) Formal definition: meta-recursive immune capacity

### 2.1 The construct

Let tumour mass be distributed over a discrete metabolic state space
$S=\{M_1,\dots,M_n\}$ with per-state mass $x_s(t)$, and let the immune side
carry, per state, an effector mass $E_s(t)$ and a memory mass $\mu_s(t)$.

Define **antigen visibility** $V_s(u)$ — the probability that a cell in state
$s$ presents antigen the repertoire can engage, under control vector $u(t)$ —
and **effector metabolic competence** $\phi(t)\in[0,1]$, the environment-imposed
gate on effector function.

Per-capita immune pressure on state $s$:

$$P_s \;=\; \kappa \, E_s \, \phi \, V_s \,\bigl(1-\beta_s\bigr)$$

where $\beta_s$ is the residual checkpoint brake.

**Recursion (first order).** The repertoire updates from antigen it actually
encounters, which depends on visibility rather than mass alone:

$$\dot E_s \;=\; \rho \cdot \frac{V_s x_s}{h + V_s x_s}\cdot \phi \cdot \underbrace{\bigl(1+\lambda\mu_s\bigr)}_{\text{recall}} \;-\; \delta_E E_s$$
$$\dot \mu_s \;=\; m\,E_s\bigl(1-\mu_s/\mu_{\max}\bigr) \;-\; \delta_\mu \mu_s$$

**Meta-recursion (second order) — the actual claim.** A merely recursive system
re-primes from current antigen. The system is *meta*-recursive when the update
rule itself is indexed by state, so that memory stores **state–antigen
associations**, and re-emergence of a previously encountered state triggers
accelerated recall against *that state's* antigen programme. Formally, memory is
a map $\mu: S \to [0,\mu_{\max}]$ rather than a scalar, and the recall term
$\lambda\mu_s$ is state-local. The coefficient $\lambda$ is the strength of the
meta-recursive update; $\lambda=0$ collapses the model to static recognition.

This distinction is not cosmetic: §E E5 shows it is worth ~0.93 log₁₀ of burden
in the model, and §E E7 shows $\lambda$ is the single most consequential
parameter in the system.

### 2.2 MRIC as a measurable, decomposed quantity

$$\mathrm{MRIC} \;=\; \underbrace{C}_{\text{coverage}}\cdot\underbrace{G}_{\text{recall gain}}\cdot\underbrace{\Phi}_{\text{fitness}}$$

| Component | Definition | Candidate measurement |
|---|---|---|
| $C$ | fraction of occupied states with effector mass above a detection threshold | state-resolved TCR/BCR clonality against state-stratified antigen panels |
| $G$ | $1+\lambda\bar\mu$ — re-priming speed-up attributable to memory | recall kinetics on re-challenge; memory-B/TLS burden `[VERIFIED-BIB: helmink_2020, petitprez_2020, cabrita_2020]` |
| $\Phi$ | effector metabolic competence under the local environment | per-cell metabolic flux inference `[VERIFIED-BIB: wagner_2021]`; OCR/ECAR |

The three are reported separately and never silently multiplied into a single
headline number, because they fail for different reasons and admit different
interventions.

### 2.3 Two control conditions, deliberately separated

The originating brief asked for a remission condition. The model forced a
split, because only the weaker one is ever reachable:

**(i) Eradication condition.** For all $t$ after treatment stops,

$$\min_{s\in S}\Bigl[P_s - \bigl(g_s + \textstyle\sum_{s'} q_{s\to s'}\bigr)\Bigr] > 0$$

Pressure on the *weakest-covered* state exceeds that state's net expansion plus
its leak into other states. **This condition was never satisfied in any run**,
at any parameter setting tried, because $M_4$ is never covered. `[MODEL]`

**(ii) Containment condition.** A stable fixed point exists with total burden
below a threshold $B^\*$, and the system is in its basin when treatment stops.
This *was* reached, and held from day 180 to day 1080. `[MODEL]`

Reporting (i) as achievable would have been the single biggest error available
here. The endpoints in §5 are written against (ii).

---

## §3 (b) State-transition model architecture

### Layer 1 — tumour metabolic state space

| State | Phenotype | Role in the model | Anchor |
|---|---|---|---|
| **M1** | OXPHOS-dominant, immune-excluded | low visibility, high brake; the state metabolic modulation targets | `[SNIPPET: zhang_tlsb01_2026, duan_2024, fischer_2019]` |
| **M2** | glycolytic / acidic, immune-suppressed | generates the acidification that lowers $\phi$ | `[SNIPPET: west_2024]` |
| **M3** | infiltrated but metabolically out-competed | highest visibility, but effectors starved | `[SNIPPET: chang_2015]` |
| **M4** | drug-tolerant persister, metabolic idling | near-zero growth, near-zero visibility — **the refuge** | `[SNIPPET: robertson_tessi_2015]`; hybrid/low-activity states in `jia_2019`, `villela_2025` |

State occupancy is intended to be estimated from transcriptome-contextualised
metabolic flux inference rather than asserted — `wagner_2021`'s Compass is the
proposed estimator for the immune side, with AMPK/HIF-1 signature scoring
`[SNIPPET: jia_2019]` for the tumour side.

**M4 is the weak point of the architecture and must be flagged as such.** The
other three states have direct observational anchors; M4 is inferred from
modelling literature and from the general persister concept. The entire §E E8
result turns on a state whose existence in metastatic human tissue is, in this
document, `[UNVERIFIED]`. Retrieval task **R3**.

### Layer 2 — immune recursive update rules

As §2.1. Three features matter:

1. Priming is driven by $V_s x_s$, **not** $x_s$ — invisible disease does not
   train the repertoire, which is why burden reduction and repertoire
   broadening can move in opposite directions.
2. Memory is state-local, giving the meta-recursive recall term.
3. $\phi$ is global and environment-determined, so one state's metabolism
   degrades the response against *all* states — the coupling that makes this a
   systems problem rather than four independent ones.

### Layer 3 — therapeutic perturbation map

Each intervention is a vector over four model quantities. The sign pattern is
the whole point:

| Intervention | growth | $V_s$ | $\phi$ | toxicity | Anchor |
|---|---|---|---|---|---|
| Mitochondrial / complex-I inhibition | ↓ M1 | **↑↑ M1** | **↓** | **accrues** | `[SNIPPET: zhang_tlsb01_2026, duan_2024]`; toxicity `[VERIFIED-BIB: yap_2023]` |
| Checkpoint blockade | — | — | — | — (releases $\beta$) | `[SNIPPET: west_2024]` |
| Buffer therapy | — | — | ↑ | — | `[SNIPPET: west_2024]` |
| Glutamine antagonism | ↓ all | — | **↑** | — | `[SNIPPET: leone_2019, oh_2020]` |
| AMPK activation + glutamate-uptake inhibition | — | — | ↑ | — | `[SNIPPET: shukla_2024]` |
| *Persister unmasking* | — | **↑ M4** | — | ? | **`[SPECULATIVE]` — no agent known** |

The asymmetry in the $\phi$ column is the most actionable structural fact in the
table. Mitochondrial inhibition buys visibility by spending effector fitness.
Glutamine antagonism is reported to do the opposite on both sides at once
— tumour metabolism down, effector phenotype toward long-lived oxidative
`[SNIPPET: leone_2019]`. In the model this makes it strictly preferable
whenever the fitness cost of mitochondrial inhibition is non-zero (§E E6).

---

## §4 (c) Candidate targets and combination logic

Revised after the model runs. **Two of the brief's three original hypotheses are
demoted.**

| ID | Hypothesis | Model verdict | Status |
|---|---|---|---|
| **H-A** | For OXPHOS-high/immune-low disease, *sequential* metabolic-then-checkpoint beats concurrent, because visibility must precede release | Effect ≈0.01 log₁₀ (~2%); concurrent marginally *better*; ordering nearly irrelevant | **Demoted.** Not worth a trial arm on current evidence |
| **H-B** | Recursive immune memory is therapeutically load-bearing; reinforcing it protects against state reversion | Ablation costs 0.93 log₁₀ and two-thirds of capacity | **Promoted to primary** |
| **H-C** | Excessive immune pressure accelerates resistant-state emergence, so pressure should be restrained when state is unfavourable | Restraint *worsened* burden (7.40 vs 7.37) and *raised* persister influx | **Demoted**, with a caveat — see §D C4 |
| **H-D** | A divergent metabolic node dominates a trade-off node at equal potency | Wins on burden by a hair, on toxicity decisively (0 vs 21 units), and wins at every non-zero fitness cost | **Supported, weakly on efficacy, strongly on safety** |
| **H-E** | *(new, model-derived)* Durable containment requires **maintained** coverage of the persister state; pulsed coverage fails | Only arm to abolish relapse; maintenance essential (6.85 vs 7.33 for the same control pulsed) | **Promoted to primary** |

**Resulting combination logic.** Not a fixed regimen and not a sequence, but a
*coverage policy*:

1. Raise visibility using the node that does not tax effector metabolism
   (divergent, not mitochondrial), to avoid paying for visibility with fitness.
2. Relieve the environmental gate on $\phi$ (buffering, AMPK-directed support)
   so that the repertoire built in step 1 can actually function.
3. Release the checkpoint brake once, and broadly, rather than optimising its
   timing — the model says timing is not where the leverage is.
4. **Then hold coverage of the low-visibility compartment indefinitely.** This
   is the step with no agent attached and the step the model says decides the
   outcome.

Step 4 is the honest output of this exercise: the most important intervention it
identifies is one for which no drug currently exists in the evidence retrieved.

---

## §5 (d) Measurable endpoints

Rewritten around containment (§2.3) rather than remission.

| Category | Endpoint | Operational definition | Status |
|---|---|---|---|
| **Inhibition** | Metastatic outgrowth | burden reduction vs control at a prespecified horizon | conventional |
| | Metabolic state shift | OCR/ECAR ratio; MCT1/MCT4 expression; AMPK/HIF-1 signature score | `[SNIPPET: jia_2019]` for signature approach |
| **Containment (primary)** | Stable residual burden | burden remains < $B^\*$ for ≥ 3× the treatment window **with no drug on board** | `[MODEL]`-motivated; replaces "remission" |
| | Horizon adequacy | durability must be demonstrated at ≥ 3 distinct time points, the last ≥ 6× treatment window | forced by E9: 180 d cannot distinguish containment from slow regrowth |
| **Recursive engagement** | $C$ — state coverage | state-resolved clonal coverage above threshold across all occupied states | needs state-stratified antigen panels `[UNVERIFIED]` |
| | $G$ — recall gain | re-challenge response kinetics; memory-B / TLS burden | `[VERIFIED-BIB: helmink_2020, petitprez_2020, cabrita_2020]` |
| | $\Phi$ — effector fitness | per-cell flux inference `[VERIFIED-BIB: wagner_2021]`; function under nutrient restriction | method exists |
| **Evolutionary control** | Persister occupancy | fraction of residual burden in the low-visibility compartment, longitudinally | **currently unmeasurable — Q5** |
| | Escape flux α | induced transition rate into low-visibility states per unit killing | no established assay `[UNVERIFIED]` |

**The endpoint problem, stated plainly.** The two quantities the model says
decide the outcome — $\lambda$ and persister occupancy — are the two that
cannot currently be measured. A programme that proceeds to in vivo work without
first building these assays will produce results it cannot interpret. Assay
development is therefore not preparatory to this programme; it *is* the first
phase of it.

---

## §6 (e) Assumptions, limitations, validation pathway

### Assumptions, with the consequence of each being wrong

| Assumption | If false |
|---|---|
| Metabolic states are discrete enough to enumerate | The transition-matrix formulation fails; a continuous-trait formulation is needed (`jia_2019`, `villela_2025` support a hybrid continuum, so this is a live risk) |
| A persister-like low-visibility compartment exists in human metastases | H-E is void and the headline conclusion collapses |
| Tumour-reactive memory can be recalled against state-coupled antigen | The meta-recursive framing reduces to ordinary immunological memory |
| $\phi$ is well approximated as a single global scalar | Per-state effector fitness is needed; the coupling argument weakens |
| Mouse metastatic states recapitulate human heterogeneity | In vivo stage is uninterpretable |

### Limitations

1. **"Meta-recursive" is a construct introduced here**, not an established
   object in mathematical immunology. §2.1 gives it a definition and §E E5 gives
   it a falsification test; it has no independent empirical standing yet.
2. **Parameters are illustrative and unfitted.** Effect-size magnitudes in the
   intervention map are assumed, not measured. Only sign patterns are anchored.
   Every §E number inherits this.
3. **Evidence is snippet-level.** No primary full text was readable from this
   session. This is the single largest threat to the document's validity.
4. **Geographic narrowness of the evidence.** The OXPHOS/immune axis evidence is
   concentrated in brain metastasis and glioma. Generalisation to visceral
   metastasis is `[UNVERIFIED]`.
5. **Explicit Euler, deterministic, well-mixed.** No spatial structure, no
   stochastic extinction, no vasculature — yet `west_2024` reports that spatial
   and vascular context determines which escape mode dominates `[SNIPPET]`. The
   model is therefore structurally blind to the mechanism its own key reference
   emphasises. This is the most serious modelling gap.
6. **The remission criterion in §2.3(i) is never satisfied**, which means the
   formal apparatus currently proves only a negative.

### Validation pathway

| Stage | Purpose | Gate to pass before advancing |
|---|---|---|
| **0 · Assay build** *(added; not in the original brief)* | Make $\lambda$, $C$, $\Phi$ and persister occupancy measurable | Each quantity measurable with known reproducibility, or the stage fails and the programme stops |
| **1 · In silico** | Replace assumed effect sizes with measured ones; add spatial and stochastic structure; re-run E1–E9 | Conclusions survive re-derivation under a spatial model, or are retracted |
| **2 · Ex vivo** | Air–liquid-interface patient-derived organoids retaining native immune compartment `[VERIFIED-BIB: neal_2018]`; test the divergent-node prediction and the maintenance prediction | H-D and H-E reproduce in autologous human tissue |
| **3 · In vivo** | Orthotopic metastatic models with memory tracking; primary endpoint = durable containment at ≥3 time points | Containment holds off-treatment at the longest horizon |

Known constraint on stage 2: autologous organoid-plus-TIL systems are limited
by tissue availability, and extended co-culture can itself drive inhibitory
receptor expression that confounds cytotoxicity read-outs `[SNIPPET]`.

---

## §B Timeline of the evidence base

| Year | Contribution | Effect on this framing |
|---|---|---|
| 2009 | Adaptive therapy formalised `[VERIFIED-BIB: gatenby_2009]` | Supplies the containment-over-eradication logic later adopted in §2.3(ii) |
| 2015 | Metabolic heterogeneity shapes growth, invasion and outcome `[VERIFIED-BIB: robertson_tessi_2015]`; glucose competition established `[VERIFIED-BIB: chang_2015]` | Grounds Layer 1 and the $\phi$ gate |
| 2017 | Evolution-guided dosing pilot `[VERIFIED-BIB: zhang_2017]` | Shows state-contingent dosing is implementable in principle |
| 2018 | ALI organoids retain native immune compartment `[VERIFIED-BIB: neal_2018]` | Makes stage 2 feasible |
| 2019 | Divergent metabolic programmes under glutamine blockade `[VERIFIED-BIB: leone_2019]`; metabolic plasticity circuit `[VERIFIED-BIB: jia_2019]`; melanoma brain-metastasis OXPHOS axis `[VERIFIED-BIB: fischer_2019]` | **Pivot point.** The divergent node is what later demotes mitochondrial inhibition |
| 2020 | B cells and TLS associate with checkpoint response across three tumour types `[VERIFIED-BIB: helmink_2020, petitprez_2020, cabrita_2020]` | Strongest human support for a memory-dependent recognition component |
| 2021 | Per-cell metabolic flux inference `[VERIFIED-BIB: wagner_2021]` | Makes $\Phi$ estimable |
| 2023 | Complex-I inhibition proves toxicity-limited in humans `[VERIFIED-BIB: yap_2023]` | **Pivot point.** Removes mitochondrial inhibition as a credible anchor |
| 2024 | Collective acid-mediated escape with a bimodal therapy landscape `[VERIFIED-BIB: west_2024]`; rFBA immuno-metabolic predictions `[VERIFIED-BIB: shukla_2024]`; paired lung/brain metabolic vulnerability `[VERIFIED-BIB: duan_2024]` | Supplies escape-flux coupling and the restraint hypothesis later demoted in E4 |
| 2026 | Tumour-reactive memory B cells in tumour-draining nodes, clonally linked to intratumoral B cells `[VERIFIED-BIB: nathan_2026]`; pan-cancer brain-metastasis state classification `[ABSTRACT-ONLY: zhang_tlsb01_2026]` | Most direct support for a recursive antibody repertoire — and the newest, thinnest evidence |

---

## §C Claim → evidence matrix

| Claim | Evidence | Sources | Conf. | Rationale |
|---|---|---|---|---|
| An OXPHOS-high/immune-low axis exists in brain metastasis and tracks worse survival | Concordant direction across a pan-cancer abstract, a peer-reviewed paired-tissue study and a melanoma series | `zhang_tlsb01_2026` `[ABSTRACT-ONLY]`, `duan_2024`, `fischer_2019` | **72** | Three aligned sources across two tumour types, but all snippet-level and one unreviewed; caps below 85 |
| Mitochondrial inhibition plus PD-1 blockade improves survival in orthotopic models | Reported in two independent brain-metastasis settings | `zhang_tlsb01_2026` `[ABSTRACT-ONLY]`, `duan_2024` | **62** | Two sources, direction consistent; one is an abstract |
| Complex-I inhibition is toxicity-limited in humans | Phase I trials in AML and solid tumours, dose-limiting neuropathy and raised lactate, both trials terminated early | `yap_2023` | **66** | Single source but a clinical trial report with concordant secondary commentary; exceeds the usual single-source cap only because it is a negative safety finding, which is the direction least likely to be overstated |
| Glutamine blockade produces divergent tumour-vs-effector metabolic programmes | Tumour metabolism suppressed while effectors adopt long-lived oxidative phenotype; myeloid-compartment work concordant | `leone_2019`, `oh_2020` | **74** | Two independent sources, same mechanism, different compartments |
| B-cell/TLS content associates with checkpoint response | Three simultaneous studies, three tumour types | `helmink_2020`, `petitprez_2020`, `cabrita_2020` | **85** | Three independent cohorts, same direction; association only, not causation |
| Tumour-draining nodes harbour tumour-reactive memory B cells clonally linked to intratumoral B cells | 2026 study, ~11-patient ovarian cohort per snippet | `nathan_2026` | **48** | `[SINGLE-SOURCE]`, small cohort, contents not read, and the specificity control is `[UNVERIFIED]` |
| Memory-B-cell-derived antibodies bind tumour but spare normal cells | **Not established.** Snippet reports tumour binding; no normal-tissue control statement found; melanoma literature reports polyreactivity | `nathan_2026` vs melanoma antibody literature `[SNIPPET]` | **25** | Direct conflict; see §D C2 |
| Immune escape is collective, with a bimodal therapy landscape | Hybrid agent-based/PDE model | `west_2024` | **50** | Single source and computational; capped |
| AMPK activation + glutamate-uptake inhibition restores effector function | rFBA prediction | `shukla_2024` | **45** | Single computational source; a prediction, not a measurement |
| The meta-recursive term is load-bearing | Memory ablation costs 0.93 log₁₀ burden, MRIC 2.80→0.89 | `[MODEL]` E5 | **n/a** | Internal to the model; no biological confidence attaches |
| Maintained persister coverage is the binding constraint | Only arm abolishing relapse; stable to 1080 d; pulsed version fails | `[MODEL]` E8, E9 | **n/a** | Internal to the model; the premise (M4 exists in humans) is `[UNVERIFIED]` |

---

## §D Contradictions and reconciliation

**C1 — The founding premise rests partly on an unreviewed abstract.**
The pan-cancer OXPHOS-high/immune-low claim traces to a conference abstract
(Neuro-Oncology Advances supplement, single author in the Crossref record).
`duan_2024` and `fischer_2019` support the direction in specific settings, but
the *pan-cancer* generality does not currently have peer-reviewed support.
→ *Adjudication:* retrieve the peer-reviewed version if it exists (**R2**).
Provisional stance: treat the axis as established in lung and melanoma brain
metastasis, unestablished pan-cancer. Confidence lowered to 72.

**C2 — Tumour-binding is not tumour-selectivity, and the literature splits.**
The ovarian study reports tumour-reactive memory B cells `[SNIPPET]`. Melanoma
antibody literature reports that tumour-derived antibodies are frequently
polyreactive and self-reactive `[SNIPPET]`. If the recursion is seeded by
polyreactive antibodies, the "specificity for state-coupled antigen" premise in
§2.1 fails and the autoimmunity risk of *reinforcing* that memory is
substantial.
→ *Adjudication test:* obtain the ovarian paper's normal-tissue binding panel.
If tumour-selectivity is not demonstrated against matched normal epithelium,
H-B must be restated as being about T-cell memory, not antibody memory.
Provisional stance: confidence 25; H-B is retained on the strength of
`helmink_2020`/`petitprez_2020`/`cabrita_2020` association data rather than on
antibody specificity.

**C3 — The brief's central therapeutic anchor is the one agent class that
failed in humans.** The originating logic leans on mitochondrial inhibition to
create visibility; `yap_2023` reports mechanism-based dose-limiting toxicity
that terminated both phase I trials. Commentary disputing the severity exists
`[SNIPPET]`, which is itself a conflict.
→ *Reconciliation:* the model independently penalises this node for a second,
unrelated reason (shared effector dependency, §3 Layer 3). Two independent
arguments pointing the same way is why H-D is retained while H-A is demoted.

**C4 — Restraint failed here but the failure may be an artefact.**
`west_2024` reports a bimodal landscape in which restraining immune pressure can
be optimal `[SNIPPET]`. E4 found the opposite: restraint raised burden *and*
persister influx. But `west_2024`'s result is explicitly spatial and
vascular-context-dependent, and this model has no spatial structure
(Limitation 5). Restraint plausibly has no domain in a well-mixed model *by
construction*.
→ *Adjudication:* re-run E4 under a spatially explicit implementation before
treating H-C as refuted. **H-C is demoted, not rejected** — this distinction
matters and the demotion should not be read as a disconfirmation of
`west_2024`.

**C5 — The model's own formal criterion is unsatisfiable.**
§2.3(i) is never met, yet several arms are relapse-free at the horizon. Either
the criterion is too strict (it demands coverage of a state that idles so slowly
that non-coverage is tolerable on relevant timescales) or relapse-freedom is
illusory. E9 tested the second reading and rejected it out to 1080 days.
→ *Resolution adopted:* the criterion is too strict as a *remission* condition
and has been reclassified as an eradication condition, with containment defined
separately. This is why §5's primary endpoint changed.

---

## §E Hypotheses, experiments, results

Full output: [`results/runs.md`](results/runs.md) · raw:
[`results/runs.json`](results/runs.json) · rerun with
`python3 -I research/mric/model/experiments.py`

All arms: 60-day treatment window, then **120+ days off treatment** — durability
is the endpoint, not nadir. Initial burden 2×10⁶ cells, M1-dominant mixture
unless stated. `[MODEL]` throughout.

### E1 · Does visibility have to precede checkpoint release? (H-A)
*Falsified if concurrent matches or beats sequential.*

| Arm | log₁₀ final | Relapsed | OXPHOS toxicity |
|---|---|---|---|
| untreated | 7.48 | yes | 0 |
| checkpoint only | 7.38 | yes | 0 |
| mitochondrial only | 7.49 | yes | 60 |
| **concurrent** | **7.37** | yes | 60 |
| sequential (metabolic → checkpoint) | 7.38 | yes | 21 |
| sequential, overlapping | 7.38 | yes | 28 |
| reversed | 7.45 | yes | 39 |

**Result: H-A falsified as stated.** Concurrent is marginally *best*. The whole
ordering question spans 0.01 log₁₀ while toxicity spans 0–60 units. The only
defensible conclusion is that **sequencing should be chosen on toxicity
grounds, not efficacy grounds** — which is a different claim than the brief's.

### E2 · Pulse-width of mitochondrial inhibition (H-A, quantitative)
*Falsified if the response is monotone.*

Final burden is flat (7.38) from 0–35 days then degrades (7.39 at 42 d, 7.43 at
56 d). Escape flux into the persister state shows a genuine interior minimum
(2.79×10⁷ at 14–21 d vs 2.95×10⁷ at 0 d and 3.67×10⁷ at 56 d). Toxicity rises
monotonically.

**Result: an interior optimum exists, but on escape flux, not on burden.** The
inverted-U is real and narrow (14–21 days) and invisible to a burden-only
read-out. Any trial using burden alone would miss it.

### E3 · Which node buys visibility most cheaply? (H-D)

| Arm | log₁₀ final | OXPHOS toxicity | Persister influx |
|---|---|---|---|
| mitochondrial + checkpoint | 7.38 | 21 | 2.79×10⁷ |
| **divergent (glutamine) + checkpoint** | **7.37** | **0** | 2.75×10⁷ |
| AMPK + checkpoint | 7.39 | 0 | 3.02×10⁷ |
| divergent + AMPK + checkpoint | 7.37 | 0 | 2.75×10⁷ |
| divergent + buffer + checkpoint | 7.37 | 0 | 2.70×10⁷ |

**Result: H-D supported, but honestly — the efficacy margin is 0.01 log₁₀,
inside parameter noise.** The decisive difference is toxicity (0 vs 21) and it
is structural, not parametric: the divergent node has no fitness cost term to
pay. Claim the safety advantage; do not claim the efficacy advantage.

### E4 · Adaptive restraint vs maximal pressure (H-C)

| Arm | log₁₀ final | Persister influx | Post-treatment margin |
|---|---|---|---|
| maximal (M1-dominant) | **7.37** | 2.71×10⁷ | −0.112 |
| restrained | 7.40 | 3.12×10⁷ | −0.085 |
| pulsed | 7.39 | 3.01×10⁷ | −0.097 |

Same ordering in the M2-dominant setting.

**Result: H-C not supported — and the mechanism of failure is informative.**
Restraint was supposed to reduce escape flux. It *increased* it, because leaving
more cells alive produced more spontaneous transition into the persister state
than the killing-induced escape it avoided. Restraint only pays when
killing-induced escape dominates spontaneous transition; here it does not. See
§D C4 before concluding anything stronger.

### E5 · Memory ablation — the null test of the entire framing (H-B)
*If ablation changes little, "meta-recursive" is decorative and this document
should be rewritten around metabolic state control alone.*

| Model | log₁₀ final | Final MRIC |
|---|---|---|
| intact (M1-dominant) | 7.37 | 2.80 |
| intact (M2-dominant) | 7.38 | 2.80 |
| **memory ablated** (M1-dominant) | **8.30** | 0.89 |
| memory ablated (M2-dominant) | 8.29 | 0.89 |

**Result: H-B strongly supported within the model.** 0.93 log₁₀ — roughly
8.5-fold — and a two-thirds collapse in capacity. The framing survives its own
null test. This is the single result that justifies the document's existence.

### E6 · Sensitivity — do the conclusions survive parameter doubt?

- **Recall gain λ** dominates everything: 8.30 at λ=0 → 6.87 at λ=8. Relapse is
  abolished for λ ≥ 4 **regardless of which drug node is used**.
- **Escape coefficient α** moves burden modestly (6.98 at α=0 → 7.44 at α=1.6)
  but governs residual *composition*.
- **Fitness cost of mitochondrial inhibition**: the divergent node wins whenever
  this cost exceeds ~0.1 and ties below it. H-D's direction is therefore
  conditional on a parameter nobody has measured.

**Result: the ranking of drug nodes is parameter-contingent; the dominance of λ
is not.** Measure λ first.

### E7 · Feasibility map — where is durable control reachable at all?

Sweeping λ × α under a fixed schedule (24 cells, full table in `results/runs.md`):

- λ = 0: log₁₀ final 8.14–8.61, relapse in every cell.
- λ = 2.1: relapse-free only when α ≤ 0.2.
- λ ≥ 4: **relapse-free at every α tested**, burden 6.46–7.19.
- α drives residual composition hard: persister fraction of residual disease
  runs 0.05 (α=0) to 0.84 (α=1.0).
- **No cell in the map achieved clearance.**

**Result — the most reusable artefact here.** Durable control has a *threshold*
in λ, not a gradient. Below it no schedule works; above it most do. And α
determines what the residual disease is *made of*, which is what you would need
to know to treat it next. This map says which measurements decide the
programme's feasibility, independent of drug choice.

### E8 · Is persister coverage the binding constraint? (H-E)
*`[SPECULATIVE]` control: no known agent raises persister visibility.*

| Arm | log₁₀ final | Relapsed |
|---|---|---|
| best combination of real agents | 7.37 | yes |
| + persister unmasking, short pulse | 7.35 | yes |
| + persister unmasking, full treatment window | 7.33 | yes |
| **+ persister unmasking, maintained after window** | **6.85** | **no** |

**Result: H-E supported, and the maintenance requirement is the finding.**
Unmasking during treatment achieves almost nothing (7.37→7.33). Unmasking
*maintained past the treatment window* is the only arm in this entire study that
abolished relapse. The model's claim is therefore not "add a persister drug" but
"**coverage of the invisible compartment must outlast therapy**" — which is a
statement about trial design and duration as much as about pharmacology.

### E9 · Is apparent durability just a short horizon?
*Forced by the risk that 180 days mistakes slow regrowth for control.*

| Arm | 180 d | 360 d | 540 d | 1080 d |
|---|---|---|---|---|
| best real agents | 7.37, relapsed | 7.51, relapsed | 7.53, relapsed | 7.53, relapsed |
| + persister maintained | 6.85, no relapse | 6.85 | 6.85 | 6.85 |

**Result: the durability is a genuine stable equilibrium, not horizon
truncation — but it is containment, not cure.** Residual burden settles at
~7×10⁶ cells and stays there for three years. This is what rewrote §5's primary
endpoint and §2.3's two-condition split.

---

## §F Next-query pack

### Retrieval tasks — close the evidence gaps (ordered)

**R1.** Obtain full text of all 20 references. Required because nothing in this
document was read from source. *Blocker: publisher hosts unreachable from this
environment; Crossref/PubMed/Europe PMC were opened mid-session.*
**R2.** Is there a peer-reviewed publication behind `zhang_tlsb01_2026`?
→ `"pan-cancer multi-omic classification brain metastases metabolic immune axis" 2026 full article`
**R3.** Does a persister/low-visibility metabolic compartment exist in human
metastases, with direct measurement?
→ `drug-tolerant persister metabolic quiescence antigen presentation human metastasis single-cell`
**R4.** Any agent reported to raise antigen visibility of quiescent/persister
cells? (epigenetic de-repression, immunogenic cell death, MHC-I restoration)
→ `restoring MHC class I antigen presentation drug-tolerant persister cells epigenetic`
**R5.** ctDNA/MRD performance as a containment endpoint in metastatic disease.
**R6.** `nathan_2026` normal-tissue binding controls — resolves §D C2.

### Model-development tasks

**M1.** Spatial, stochastic reimplementation; re-run E4 — the only way to
adjudicate H-C fairly (§D C4).
**M2.** Replace the global $\phi$ scalar with per-state effector fitness.
**M3.** Continuous-trait formulation to test whether discreteness of states is
load-bearing (`jia_2019`, `villela_2025`).
**M4.** Fit $\lambda$, $\alpha$ and state-transition rates to any available
longitudinal data; current values are free parameters.
**M5.** Add an explicit toxicity constraint as a hard budget, and re-solve the
schedule as constrained optimal control rather than by enumeration.

### Adversarial probes — queries designed to break the framing

**A1.** Evidence that metabolic state is *not* the organising variable — that
antigen loss, MHC-I loss or clonal neoantigen depletion explains immune escape
better. If so, the state space is mis-specified.
**A2.** Evidence that OXPHOS-high/immune-low is a *consequence* of immune
exclusion rather than a cause. The whole causal direction of §1 depends on this
and nothing retrieved establishes precedence.
**A3.** Trials where reinforcing immune memory produced autoimmune toxicity — the
cost side of H-B, entirely absent from this document.
**A4.** Negative results for buffer therapy and for glutamine antagonism in
human trials. Both are load-bearing and only positive preclinical evidence was
retrieved — a retrieval bias.
**A5.** Does "metabolic state" survive as a category once spatial niche and
perfusion are controlled for, or is it a proxy for distance to a vessel?

---

## §G Self-critique

| Dimension | Assessment |
|---|---|
| **Coverage** | Weak. Zero primary full text. No trial registry, no structured literature search (all bio-research MCP servers failed). Positive-result bias is likely across the whole evidence base — see A4. |
| **Specificity** | Adequate. Every claim carries a source tag and a confidence cap; unverifiable claims are listed rather than dropped. |
| **Causality** | The weakest link. §1 asserts that metabolic state *enables* immune evasion; the retrieved evidence is associational and does not establish temporal precedence. A2 is the probe that matters most. |
| **Stability** | Mixed, and usefully so. The λ-dominance result is stable across every sweep. The drug-node ranking is not — it flips below a fitness-cost of 0.1. Reported as conditional. |
| **Actionability** | The most actionable outputs are the two assay-development tasks (measure λ, measure persister occupancy), because the model says everything else is downstream of them. The least actionable is H-E, whose implied intervention does not exist. |
| **Honest summary** | The framing survived its own null test (E5) and produced one non-obvious, falsifiable claim (E8/E9: coverage must outlast therapy). It also demoted two of the three hypotheses it started with, and showed that the schedule-optimisation question the brief centred on is worth ~2% while the parameter nobody measures is worth ~200%. A draft that had confirmed all three original hypotheses would have been less useful and almost certainly wrong. |

---

## Reproduce

```bash
python3 -I research/mric/model/experiments.py     # writes results/runs.{md,json}
python3 -I research/mric/model/test_mric.py       # invariant checks
```

Citation records: `REFERENCES.md`. Model and parameter provenance:
`model/mric.py::default_params`.

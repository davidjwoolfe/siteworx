# MRIC — meta-recursive immune-metabolic state control

A research objective with an executable model attached, treating metastatic
control as a **coverage problem over a moving metabolic state space** rather
than a growth problem.

**This is preclinical and in-silico research planning. Not clinical guidance,
no dosing, no treatment recommendations.** Simulation outputs are properties of
the model under unfitted illustrative parameters, never biological results.

## Read in this order

| File | What it is |
|---|---|
| [`BRIEFING.md`](BRIEFING.md) | **Start here if you have not read the code.** A ~2,500-word prose account of the whole operation: the reasoning, the choices, the dead ends, what each experiment decided, and what the work cannot yet support. Needs nothing else open |
| [`OBJECTIVE.md`](OBJECTIVE.md) | The research objective. Formal definition, state-transition architecture, targets, endpoints, limitations, validation pathway, and the experiments that tested it |
| [`results/runs.md`](results/runs.md) | Full output of all nine experiments |
| [`REFERENCES.md`](REFERENCES.md) | 20 references, each verified against Crossref; plus an explicit list of what could **not** be verified |
| [`model/mric.py`](model/mric.py) | The engine. Parameter provenance in `default_params()` |
| [`model/experiments.py`](model/experiments.py) | E1–E9, each written so it can fail |
| [`model/test_mric.py`](model/test_mric.py) | 13 invariant checks on the engine |
| [`VISUAL-PROMPT.md`](VISUAL-PROMPT.md) | Design prompt for a five-panel state-space infographic cascade. Carries a palette validated in light and dark, plus the integrity rules that keep model output visually distinct from published evidence |

## Run

```bash
python3 -I research/mric/model/test_mric.py       # 13 invariant checks
python3 -I research/mric/model/experiments.py     # writes results/runs.{md,json}
```

No dependencies beyond the Python standard library.

## What the exercise concluded

Three findings, stated at the confidence they earned:

1. **The recursive framing survives its own null test.** Removing memory
   formation and recall gain costs ~0.93 log₁₀ of final burden. A static
   recognition model would not reproduce the behaviour.

2. **Schedule optimisation is not where the leverage is.** Rearranging the
   metabolic and checkpoint agents moves the outcome ~2%. The memory recall
   coefficient moves it ~200%. Two of the three hypotheses the work started
   from were demoted on this basis.

3. **The achievable endpoint is containment, not cure, and coverage must
   outlast therapy.** No arm cleared the tumour at any parameter setting. The
   only arm that abolished relapse maintained coverage of the low-visibility
   persister compartment *after* the treatment window closed — and no known
   agent does that.

The two quantities the model says decide the outcome — memory recall gain and
persister-state occupancy — are also the two that currently cannot be measured.
That is why assay development is stage 0 of the validation pathway rather than
a preliminary.

## Honest caveats

- No primary full text was readable from the session that produced this;
  bibliographic identity is verified but article *contents* are at
  search-snippet resolution. See `REFERENCES.md`.
- The model is deterministic, well-mixed and non-spatial, while its own key
  reference reports that spatial and vascular context determines which escape
  mode dominates. One demoted hypothesis may be an artefact of this
  (`OBJECTIVE.md` §D C4).
- Parameter magnitudes are assumed. Only sign patterns are literature-anchored.

# Visual elaboration prompt — MRIC comprehension cascade

**Task.** Build a five-panel *state-space infographic cascade* that takes a
reader from the object to the conclusion without prose. Each panel must be
legible alone and must earn the next. Source of truth: `README.md`,
`OBJECTIVE.md` §2–§5, `results/runs.md`. Invent no data.

**Panel 1 — The object.** Four tumour metabolic states as labelled nodes: M1
OXPHOS-dominant/immune-excluded, M2 glycolytic-acidic, M3 infiltrated-but-
outcompeted, M4 drug-tolerant persister. Directed edges = transition rates,
**width-encoded**, never color-encoded. Node fill carries *antigen visibility*
as an ordinal magnitude (M3 highest → M4 lowest). Mark M4 as the refuge: lowest
visibility, near-zero growth, the only state no arm covers. Growth rate goes in
a direct label, not node area.

**Panel 2 — The coupling (the cascade's hinge).** A closed loop in three bands:
tumour state → antigen *visibility × mass* → repertoire update (effector +
state-local memory) → immune pressure → back onto state. Show two facts
visually: priming is driven by visibility, not burden (so invisible disease
trains nothing), and effector fitness Φ is a **single global gate** fed by
every state's metabolism. Draw the escape arrow that pressure itself creates.

**Panel 3 — Capacity, decomposed.** MRIC = coverage × recall gain × fitness as
**three separate meters**, never one score. Label each with its candidate
assay. Flag that two of the three are not currently measurable.

**Panel 4 — Intervention sign map.** Matrix: intervention rows × four columns
(growth, visibility, fitness, toxicity). Diverging encoding — helps / neutral /
harms. Make the fitness column's asymmetry the visual punchline: mitochondrial
inhibition buys visibility by *spending* fitness; the divergent node gains both.
Render the persister-unmasking row in a visibly provisional style — no agent
exists for it.

**Panel 5 — Feasibility surface.** Recall gain (λ) × escape coefficient (α) as a
sequential heatmap of final burden, with the relapse-free boundary drawn as a
contour. Annotate: λ is a **threshold, not a gradient**; no cell achieves
clearance. Adjacent small-multiple: four arms over time showing that persister
coverage only works when *maintained past* the treatment window.

## Encoding law — use these values, they are validated

State/visibility ordinal ramp (one hue, monotone):
light `#86b6ef,#3987e5,#256abf,#104281` · dark `#cde2fb,#86b6ef,#3987e5,#184f95`
Both pass monotone-lightness, step-gap, light-end-contrast and single-hue checks.

Sequential heatmap: same blue ramp, full range. Diverging (Panel 4): blue ↔ red,
**gray midpoint** (`#f0efec` light / `#383835` dark) — the midpoint must read as
"nothing". Status (verdicts only, never series): good `#0ca30c`, warning
`#fab219`, serious `#ec835a`, critical `#d03b3b`, each with icon + label.
Surfaces `#fcfcfb` / `#1a1a19`.

**Do not** assign four categorical hues to the four states. Visibility is a
magnitude; encode it as one. Re-run `validate_palette.js` if you substitute
anything.

## Mark and access rules

Thin marks; 2px lines; ≥8px markers; 2px surface gap between adjacent fills and
a 2px surface ring where marks overlap. Recessive grid and axes. Selective
direct labels — never a number on every node. Legend present wherever ≥2
encodings coexist; ≤4 also direct-labelled, so identity is never color-alone.
Values and labels wear text ink, never the series color. One axis per plot;
**no dual-axis anything**. Dark mode is designed from the same ramps and
validated against the dark surface, not auto-flipped. Ship a hover/tooltip layer
and a table view. Provide the 45°/135° texture channel for CVD, print and
forced-colors.

## Integrity rules — non-negotiable

Model output and published evidence must be **visually distinguishable at a
glance** (distinct frame or texture, plus a key). Every quantity is a model
property under unfitted parameters — say so once, visibly. The speculative
persister-unmasking control must never render like a real agent. Where a claim
carries a confidence cap, show it. Do not render demoted hypotheses as refuted.

**Forbidden:** rainbow ramps, hue at a diverging midpoint, dual axes, cycled
categorical hues, 3-D, decorative gradients, any implication of clinical
applicability.

# Operations brief: what was done, what it decided, and what it cannot yet bear

**For colleagues who have not read the code or the tables.** This is a prose
account of the whole operation — the reasoning, the choices, the dead ends, and
the state the work is now in. Nothing here needs the repository open.

**Scope, stated once and meant literally.** This is preclinical and in-silico
research planning. There is no dosing, no protocol, and no clinical
recommendation anywhere in it. Where drugs are named, they are named as
published mechanistic probes whose *direction* of effect was used to
parameterise a simulation. Every number produced by that simulation is a
property of the simulation, under parameters nobody has measured. None of it is
a biological result and none of it should be quoted as one.

---

## 1. What was asked, and the one decision that shaped everything

The request was for a research objective: define a state-based metabolic
oncology model that exploits the immune system's capacity to recursively update
its own recognition, aimed at inhibition and durable remission of metastatic
disease. A formal definition, a state-transition model, candidate targets,
endpoints, assumptions and a validation path.

That could have been answered with a well-organised prose document. I decided
against it, for one reason: a research objective written only in prose cannot be
wrong. It can be vague, elegant, or fashionable, but there is no operation you
can perform on it that returns a verdict. The phrase at the centre of the brief
— "meta-recursive immune capacity" — is not an established object in
mathematical immunology. It is a construct. Constructs introduced in prose tend
to survive by being unfalsifiable.

So the objective was written *and* made executable. Everything the document
claims about dynamics is implemented in a small, dependency-free model, and
each claim is paired with an experiment designed so that it can fail. The point
was never that the simulation is realistic. The point is that the framing's own
assertions become checkable, including the assertion that the framing matters at
all.

This decision is why two of the three hypotheses we started with are now
demoted. It is the main reason the work is worth building on.

---

## 2. Evidence operations: what was obtained, and what was not

Before any modelling, the brief's empirical anchors had to be located and
checked. This went less well than it should have, and the limits matter more
than the successes.

**What worked.** Web search located the primary literature behind each of the
brief's claims. Twenty references were then resolved against the Crossref API,
so journal, year, volume, pages, author count and item type are verified
records rather than recollection. That verification caught something important:
the pan-cancer brain-metastasis classification underpinning the brief's central
"OXPHOS-high/immune-low" premise is a **conference abstract** in a supplement
issue, with a single author on the record — not a peer-reviewed paper. The
premise still has support from a peer-reviewed paired primary-lung/brain-
metastasis study and a melanoma brain-metastasis series, but the *pan-cancer*
generality does not currently have peer-reviewed backing. That claim is capped
at a confidence of 40 on its own, 72 when the three concordant sources are taken
together.

**What failed, and what that costs us.** Publisher full text was unreachable
from this environment. Two dispatched retrieval agents came back empty with
permanent name-resolution failures on Cell, ScienceDirect, Springer and PMC. The
specialist literature tooling — PubMed, bioRxiv, clinical trials, Consensus,
Open Targets, ChEMBL — all failed to connect at the proxy. A knowledge-graph gap
analysis, intended to generate the adversarial query set structurally rather
than by hand, hit its API quota.

The consequence is precise and should not be softened: **bibliographic identity
of every reference is verified; the contents of those references are known only
at search-snippet resolution.** There is not a single direct quotation from a
primary article in this work, and no cohort size, hazard ratio or effect size is
presented as read from source. Every content-level claim carries a tag saying so.
This is the largest single threat to the document's validity, and closing it is
the first retrieval task in the plan.

One intervention was made to the working environment: a narrow cloud environment
was created opening six bibliographic hosts — Crossref, PubMed, PMC, NCBI
E-utilities, Europe PMC and the DOI resolver — and nothing else. That is the only
reason the reference list is verified rather than remembered. It did not restore
full-text access.

---

## 3. Making "meta-recursive" mean something

The construct needed a definition with a switch on it. Here is the distinction
the work settled on.

A merely **recursive** immune system re-primes from whatever antigen is currently
present. That is ordinary immunology and needs no new vocabulary. A system is
**meta-recursive** when the update rule is itself indexed by tumour state — when
memory stores *state–antigen associations*, so that the re-emergence of a
metabolic state the system has met before triggers accelerated recall against
that specific state's antigen programme.

Formally, this means memory is a map over states rather than a single pool, and
the recall term is state-local. One coefficient — call it the recall gain —
controls how strongly memory accelerates re-priming. Set it to zero and the
whole apparatus collapses to static recognition. That single switch is what made
the framing testable, and it became the most consequential parameter in the
entire system.

Alongside it, immune capacity was defined as a product of three separately
measurable things: **coverage** (what fraction of the occupied states has any
effector population against it at all), **recall gain** (how much faster the
response comes back on re-encounter), and **fitness** (whether those effectors
can function in the metabolic environment the tumour creates). These are
reported separately throughout and never silently multiplied into one headline
figure, because they fail for different reasons and respond to different
interventions. Coverage is an immunological breadth problem; fitness is a
metabolic environment problem. Collapsing them hides which one is binding.

A second definitional move turned out to matter as much. The brief asked for a
remission condition. Writing it down honestly produced two conditions, not one.
The strong condition — immune pressure exceeding net expansion in *every* state,
which is what eradication requires — **was never satisfied in any run, at any
parameter setting tried.** The weaker condition — a stable residual burden below
a threshold, persisting once treatment stops — was reached and held. Reporting
the strong condition as achievable would have been the single biggest error
available in this exercise. The endpoints were rewritten against the weaker one.

---

## 4. What the model represents, and what it deliberately does not

Four tumour metabolic states: an OXPHOS-dominant, immune-excluded state; a
glycolytic and acidic, immune-suppressed state; an infiltrated but
metabolically out-competed state; and a drug-tolerant persister state that
idles at near-zero growth and near-zero visibility. Cells move between them,
both spontaneously and under therapeutic pressure.

Three features of the construction do the real work.

**Priming is driven by visibility times mass, not mass.** Invisible disease does
not train the repertoire. This is why burden reduction and repertoire broadening
can move in opposite directions, and it is the structural reason the persister
state is dangerous — not because it grows, but because it teaches the immune
system nothing while it sits there.

**Effector fitness is global and environment-determined.** One state's
metabolism degrades the response against all states. This is the coupling that
makes the whole thing a systems problem rather than four independent ones.

**Killing selects for escape.** Immune pressure both kills cells and pushes
survivors toward escape states. This is the evolutionary double-bind, and
whether it dominates spontaneous transition turned out to decide the fate of one
of our hypotheses.

The intervention map assigns each therapy class a sign pattern across growth,
visibility, fitness and toxicity. One asymmetry in that map is the most
actionable structural fact the exercise produced. Mitochondrial inhibition
raises the visibility of the immune-excluded state — but effector cells share
the targeted dependency, so it buys visibility by spending immune fitness, in
the same step. A divergent intervention like glutamine antagonism is reported to
do the opposite on both sides at once: suppress tumour metabolism while pushing
effectors toward a long-lived oxidative phenotype. One node pays for visibility;
the other is given it for free.

**What is deliberately absent.** The model is deterministic, well-mixed and has
no spatial structure, no vasculature and no stochastic extinction. That is a
serious omission, not a simplification of convenience, because the paper we lean
on hardest for the escape dynamics reports that spatial and vascular context
determines *which* escape mode dominates. The model is therefore structurally
blind to the mechanism its own key reference emphasises. This is stated as the
most serious modelling gap, and it bears directly on one result below.

---

## 5. Nine experiments, and what each one decided

**The null test came first in importance.** Remove memory formation and recall
gain and re-run the best combination. If durability barely changes, the
meta-recursive framing is decorative and the document should be rewritten around
metabolic state control alone. Result: ablation costs roughly 0.93 log₁₀ of final
burden — about an eight-and-a-half-fold difference — and capacity drops by
two-thirds. **The framing survived its own null test.** This is the single result
that justifies the work's existence.

**The sequencing question, which the brief centred on, came apart.** Sequential
metabolic-then-checkpoint, concurrent, overlapping and reversed schedules span
0.01 log₁₀ — around two percent — and concurrent was marginally *best*, which is
the opposite of the stated hypothesis. Meanwhile toxicity across those arms spans
the full range. The only defensible conclusion is that sequencing should be chosen
on toxicity grounds, not efficacy grounds. That is a different and smaller claim
than the one we began with.

A finer version of the same question did find something. Sweeping the duration of
mitochondrial inhibition shows a genuine interior optimum — but on escape flux
into the persister state, not on burden, which stays flat and then degrades. The
optimum is narrow and **invisible to a burden-only read-out.** Any study
measuring tumour size alone would miss it entirely.

**Adaptive restraint failed, and the mechanism of failure is the useful part.**
The hypothesis was that excessive immune pressure accelerates resistant-state
emergence, so pressure should be withheld when the state is unfavourable.
Restraint made things worse on burden *and* raised persister influx. The reason:
leaving more cells alive generated more spontaneous transition into the
persister state than the killing-induced escape it avoided. Restraint only pays
when killing-induced escape dominates spontaneous drift. Here it does not.

That hypothesis is recorded as **demoted, not refuted**, and the distinction is
deliberate. The published bimodal landscape it came from is explicitly spatial
and vascular-context-dependent, and our model has no spatial structure.
Restraint plausibly has no domain in a well-mixed model by construction. We
should re-run this under a spatial implementation before concluding anything
stronger.

**The sensitivity and feasibility work inverted the research priority.** Varying
the recall gain across its plausible range moves the outcome by 2.3 log₁₀ —
against the two percent that schedule rearrangement buys. Mapping recall gain
against the escape coefficient produced the most reusable artefact in the
repository: durable control has a **threshold** in recall gain, not a gradient.
Below it, no schedule works. Above it, most do — regardless of which drug node is
chosen. The escape coefficient barely moves total burden but strongly determines
what the residual disease is *made of*, with the persister fraction running from
five to eighty-four percent across its range. No cell in that map achieved
clearance.

**The last result is the one I would put in front of a sceptic.** If the
persister state really is the uncovered compartment where relapse originates,
then a control that raises its visibility should matter more than any
rearrangement of existing agents. Tested with an explicitly hypothetical control
— no known agent does this — the answer was yes, with a condition. Unmasking
during the treatment window achieved almost nothing. Unmasking **maintained after
the treatment window closed** was the only arm in the entire study that abolished
relapse. Extending the horizon from 180 days to three years confirmed this is a
genuine stable equilibrium rather than slow regrowth mistaken for control.

So the model's claim is not "add a persister drug." It is that **coverage of the
invisible compartment must outlast therapy** — a statement about trial duration
and design at least as much as about pharmacology.

---

## 6. Where this leaves us

Three findings stand. The recursive framing is load-bearing rather than
rhetorical. Schedule optimisation — the thing easiest to design a trial around —
is worth about two percent, while the parameter nobody measures is worth about
two hundred. And the reachable endpoint is containment rather than cure, with
coverage that has to persist beyond treatment.

There is also a clean negative on the brief's therapeutic anchor. Mitochondrial
complex-I inhibition is toxicity-limited in humans, with dose-limiting
neuropathy and raised lactate terminating both reported phase I trials early. The
model penalises the same node for a second, entirely unrelated reason: the shared
effector dependency. Two independent arguments pointing the same direction is
why the divergent-node hypothesis was retained while the sequencing hypothesis
was dropped. On efficacy the divergent node wins by a hair that sits inside
parameter noise and should not be claimed; on safety it wins structurally,
because it has no fitness cost term to pay.

**The awkward part.** The two quantities the model says decide everything —
recall gain and persister-state occupancy — are also the two that cannot
currently be measured. A programme that proceeds to animal work without first
building those assays will generate results it cannot interpret. Assay
development is therefore stage zero of the validation path, not a preliminary to
it. If those quantities turn out to be unmeasurable, that is a reason to stop,
and the plan says so.

**What would kill this.** Evidence that antigen or MHC-I loss explains immune
escape better than metabolic state would mean the state space is mis-specified.
Evidence that the OXPHOS-high/immune-low pattern is a *consequence* of immune
exclusion rather than a cause would invert the causal story in section one, which
rests on association and has no demonstrated temporal precedence. If the
persister compartment cannot be shown to exist in human metastatic tissue, the
headline result collapses, since its existence is currently inferred from
modelling literature rather than measured. And if tumour-reactive memory
antibodies prove broadly polyreactive rather than tumour-selective — the
melanoma literature points that way, against the ovarian work — then reinforcing
that memory carries an autoimmune cost this document does not account for at all.

Each of those is written up as a named adversarial probe with a query attached,
precisely so nobody has to take the framing on trust.

**Inspecting it yourself** takes two commands: one runs thirteen invariant checks
on the engine, all currently passing; the other regenerates every number quoted
here. Parameter provenance is tagged inline as either literature-anchored in
direction or free for numerical conditioning — no magnitude is claimed as
measured. The confidence caps, the register of claims that could not be verified,
and the five logged contradictions with their adjudication tests are all written
down rather than resolved quietly.

A version of this work that had confirmed all three starting hypotheses would
have read better and would almost certainly have been wrong.

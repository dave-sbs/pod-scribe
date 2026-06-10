# Deep Research Analyst — Architecture Candidates for Prototyping

## Context

The goal is a system that ingests multiple podcast transcripts and produces deep, broad insights — not quick summaries. Speed is a non-priority. The system should surface connections, tensions, and implications that wouldn't appear in a single-pass reading. "Dreamy Elephant" suggests the system should be thorough and even meandering, not optimized for efficiency.

---

## The Core Tension

Most naive systems trade off:
- **Coverage** (touching all the material) vs. **Depth** (analyzing what you touch)
- **Extraction** (finding what's there) vs. **Synthesis** (generating what isn't)

The architectures below each resolve this tension differently. None is optimal — each has a distinct character worth prototyping.

---

## Architecture Candidates

### 1. Geological Strata (Multi-Pass Depth Descent)

**Concept:** Multiple sequential passes over the same corpus, each "digging deeper" into what the previous pass surfaced. Earlier passes scaffold later ones.

**Layers:**
- Pass 1 — Surface: Topics, speakers, explicit claims, timestamps
- Pass 2 — Sub-surface: Arguments, evidence chains, narrative structure
- Pass 3 — Bedrock: Underlying assumptions, speaker worldview, what is conspicuously absent
- Pass 4 — Core: Meta-patterns across transcripts, structural similarities

**Key property:** Each pass is informed by the output of all previous passes. Agents at deeper layers see both the raw text AND the accumulated annotations. They are explicitly prompted to go beyond the previous layer.

**Interesting because:** Depth is *mechanically enforced* by architecture. You can't skip to layer 4 without layers 1–3. This mirrors how expert human researchers actually read.

**Watch out for:** Compounding errors — a wrong claim at layer 2 propagates to layer 3.

---

### 2. Adversarial Dialectic Loop (Hegelian Architecture)

**Concept:** Thesis → Antithesis → Synthesis, applied recursively for N rounds.

**Agents:**
- **Proposer**: Generates bold, non-obvious claims from the corpus ("Speaker X's framework implicitly assumes...")
- **Adversary**: Finds counter-evidence *within the same corpus* to attack the claim
- **Synthesizer**: Resolves the tension into a more nuanced, more defensible insight
- Round N's synthesis becomes Round N+1's thesis

**Key property:** Self-correcting. Bad claims get surfaced and challenged *before* reaching output. Each round produces more robust, more qualified insights.

**Interesting because:** The architecture itself does epistemic work. The output isn't just "what was found" but "what survived scrutiny." Weak insights don't make it through.

**Watch out for:** Adversary agent can be too conservative, killing interesting speculative insights too early. May need a "protect the hypothesis" role.

---

### 3. Semantic Field Construction (Graph-Structural Insight)

**Concept:** Don't read transcripts linearly. Build a knowledge graph where insights emerge from *structure*.

**Nodes:** Concepts, claims, speakers, arguments, events, frames-of-reference  
**Edges:** supports / contradicts / extends / exemplifies / preconditions / caused-by / shares-assumption-with

**Analysis layer:** Run graph algorithms on the resulting structure:
- High centrality nodes = load-bearing concepts
- Bridge nodes (connecting otherwise separate clusters) = key synthesis opportunities
- Structural holes = gaps in the discourse that nobody covers
- Contradiction clusters = live debates worth mapping

**Key property:** The interesting stuff is often *not* where text is densest. It's at the structural edges — bridging nodes, isolated nodes, contradiction clusters.

**Interesting because:** Most agentic systems process text sequentially. This makes connection-finding a first-class architectural primitive. You literally cannot miss cross-transcript links.

**Watch out for:** Graph construction quality bottlenecks everything downstream. A bad ontology bakes in blind spots.

---

### 4. Evolutionary Insight Selection (Population-Based)

**Concept:** Treat insights as organisms subject to selection pressure.

**Process:**
- Generation 0: Spawn many "insight seeds" — small, potentially interesting observations from the corpus
- **Fitness function**: score each seed on non-obviousness × evidence-strength × cross-transcript-connection-density
- Selection: Keep top N seeds per generation
- Mutation operators: extend, invert, quantify, generalize, find-the-exception
- Crossover: Combine seeds from different transcripts that seem unrelated
- Run M generations

**Key property:** Population diversity ensures broad coverage. Fitness pressure ensures depth. The architecture naturally explores the insight space before converging.

**Interesting because:** You can tune the fitness function to reflect what "good research" means in your domain. Changing the fitness function changes the character of the output. Also: you can save "interesting losers" — insights that scored well but didn't make the final cut.

**Watch out for:** Fitness functions are hard to get right. "Non-obvious" is hard to operationalize for an LLM.

---

### 5. Memory Consolidation / Dream Architecture

**Concept:** Inspired by how human memory consolidates during sleep — especially the role of REM's associative, non-linear processing.

**Phases:**
- **Waking** (fast extraction): Rapid, noisy extraction of many fragments from transcripts. Quantity over quality. Don't filter yet.
- **REM** (associative recombination): Agents that replay fragments in unexpected combinations — deliberately juxtaposing things that weren't adjacent in the source. The agent is *prompted to be associative and lateral*, not analytical.
- **Slow-wave** (evaluation): Agents that examine REM-produced combinations and ask "is this actually meaningful or just noise?"
- **Consolidation** (strengthening): High-confidence insights from repeated positive evaluation are strengthened; weak ones decay

**Key property:** The REM phase is the differentiator. It's explicitly *permitted* to be weird and make unexpected connections. The evaluation phase then filters signal from noise.

**Interesting because:** Most pipelines filter aggressively at extraction time. This one delays filtering until *after* associative recombination — surfacing connections that would never survive early filtering. The architecture has a "dreamy" quality by design. Fits the "dreamy elephant" name.

**Watch out for:** High noise floor. Needs a strong evaluation phase to avoid producing hallucinated connections.

---

### 6. Spectral Decomposition (Signal-Processing Analogy)

**Concept:** Decompose the text corpus into different "frequency bands" of meaning, analyze each separately, then reconstruct.

**Frequency bands:**
- **High freq (volatile)**: Specific factual claims, numbers, named references — many, local, often contradict across sources
- **Mid freq (patterns)**: Recurring themes, narrative structures, speaker habits, consensus views
- **Low freq (structural)**: Deep assumptions, speaker worldviews, what they treat as given
- **DC (invariant)**: What is true across ALL transcripts regardless of speaker, topic, or time

**Key property:** Analysis at each band uses a different agent type and different prompting strategy. High-freq agents are skeptics; low-freq agents are anthropologists.

**Interesting because:** It separates "what was literally said" from "what they really meant" from "what their frame of reference is" — three qualitatively different kinds of insight. Most systems blend them together and produce muddy output.

**Watch out for:** The band metaphor can blur — in practice, distinguishing mid from low frequency requires careful prompt engineering.

---

### 7. Newsroom / Editorial Desk Architecture

**Concept:** Multiple specialized desks operating in parallel with different evaluation criteria, then an editor synthesizes.

**Desks:**
- **Fact-check desk**: Finding internal contradictions, verifying cross-transcript claims
- **Features desk**: Narrative arcs, "the story," what would make a compelling piece
- **Opinion desk**: Synthesizing viewpoints, identifying schools of thought
- **Data desk**: Quantifying claims, spotting patterns in numbers
- **Contrast desk**: What changed across time, what shifted between episodes
- **Editor-in-chief**: Weighing desk outputs, determining what's most important

**Key property:** Each desk has different evaluation criteria — the fact-checker cares about consistency, the features writer cares about resonance. This diversity is structural, not accidental.

**Interesting because:** Very composable. You can add or remove desks. You can weight desks differently. The editorial layer creates a natural prioritization mechanism.

**Watch out for:** The editor role is doing the hard synthesis work — if it's weak, the desks are just independent summaries.

---

### 8. Immune System / Antibody Diversity

**Concept:** Generate a diverse population of "detector" agents, each tuned to a different type of insight pattern. What multiple detectors converge on is high-confidence; what only one detector flags may be breakthrough.

**Detector types (examples):**
- Contradiction detector
- Consensus-across-speakers detector
- Surprising claim detector
- Underexplored implication detector
- Expert disagreement detector
- Absence detector (what isn't said that should be)
- Repetition / emphasis detector
- Analogy / metaphor detector (what frameworks speakers use)

**Aggregation:** A "lymph node" layer looks at which fragments of text were flagged by multiple different detectors. Multi-detector flagging = high signal. Single-detector flagging = niche but potentially high-value.

**Interesting because:** Makes the "what is a good insight" question into an empirical question — defined by how many different types of value it has simultaneously. Also: the single-detector signals are an interesting output category.

**Watch out for:** Detector design is the bottleneck. Poorly differentiated detectors just give you correlated noise.

---

### 9. Recursive Compression + Loss Recovery

**Concept:** Compress meaning through abstraction levels, but also recover what was lost.

**Compression ladder:**
- Level 0: Raw transcripts
- Level 1: Key claims (lossy compression)
- Level 2: Themes (more lossy)
- Level 3: Meta-themes
- Level 4: Invariant insights (what survives ALL compression)

**But also:** Run "loss recovery" agents at each level to ask: *What got compressed away? What did we lose? Was anything important in what we discarded?*

**Key property:** What survives all compressions is fundamental. What gets *consistently* discarded reveals implicit assumptions. The recovered material often contains the most interesting "quiet" insights.

**Interesting because:** Compression forces a kind of forced prioritization — but the recovered-loss analysis runs counter to it, acting as a systematic check against loss bias. The tension between what's retained and what's recovered is where interesting analysis lives.

---

## Comparison Matrix

| Architecture | Breadth | Depth | Cross-source | Self-correcting | Novel connections | Prototype complexity |
|---|---|---|---|---|---|---|
| Geological Strata | Medium | High | Low | Low | Low | Low |
| Adversarial Dialectic | Low | Very high | Medium | Very high | Medium | Medium |
| Semantic Graph | High | Medium | Very high | Medium | Very high | High |
| Evolutionary Selection | Very high | Medium | High | Medium | High | Medium |
| Dream/Consolidation | High | Medium | High | Low | Very high | Medium |
| Spectral Decomposition | High | High | Medium | Low | Medium | Medium |
| Newsroom Desks | High | Medium | Medium | Medium | Medium | Low |
| Immune/Antibody | Very high | Low | High | High | High | Low |
| Recursive Compression | Medium | High | Low | Medium | Medium | Medium |

---

## Recommended Prototyping Order

**Start with:** Adversarial Dialectic Loop + Newsroom Desks
- Both are low-to-medium complexity, produce qualitatively different outputs, and directly address the depth-vs-breadth tension. The newsroom gives you breadth; the dialectic gives you depth. Could even combine them.

**Second round:** Dream/Consolidation + Semantic Graph
- More complex, but differentiated. Dream is the most "creative" architecture; Graph is the most structurally rigorous. These will tell you if the domain needs associative reasoning or structural reasoning more.

**Third round:** Evolutionary Selection
- Most general, most tunable. Best saved for after you have a sense of what "good insight" means in practice.

---

## Constraints Confirmed

- **Output format**: Undecided — architecture should produce structured artifacts flexible enough to render as report, database, or Q&A backend
- **Human checkpoints**: Yes — design pause points for human steering between major phases
- **Insight priority**: Topic-level (what's being said about X) + Discourse-level (invisible assumptions, what's treated as obvious, what's never questioned)

---

## Refined Recommendations Given Constraints

### Why topic + discourse-level changes the calculus

Discourse-level insight is *qualitatively harder* than topic-level — it requires surfacing what speakers *didn't say*, what they treated as given, and what framing they imported uncritically. Most LLM prompting fails here because you have to prompt for *absence* and *implicit structure*, not just presence.

Architectures best suited for discourse-level:
- **Spectral Decomposition** — the "low frequency" band is *explicitly* designed for structural assumptions and worldviews
- **Geological Strata** — the deeper layers (3–4) specifically target what's absent and what's assumed
- **Adversarial Dialectic** — the adversary role can be prompted to attack *the frame*, not just the claims
- **Recursive Compression + Loss Recovery** — the loss recovery phase is structurally forced to examine what got discarded, which often contains implicit discourse-level content

For human checkpoints, the best natural pause points are:
- Between strata layers (in Geological)
- Between dialectic rounds (in Adversarial)
- After REM phase / before evaluation (in Dream)
- After desk reports / before editorial (in Newsroom)

### Suggested prototype sequence (given constraints)

**Prototype 1 — Geological Strata + Spectral Decomposition hybrid**

Run 4-layer strata where:
- Layers 1–2 handle topic-level extraction
- Layer 3 is a Spectral "low frequency" pass — discourse-level assumptions
- Layer 4 is synthesis across all prior layers

Human checkpoint between Layer 2 and Layer 3: human can focus or redirect the discourse analysis. This is the highest-leverage pause point because it transitions from "what was said" to "what was assumed."

Output: Layer-annotated insight corpus → flexible to render as report, browse as database, or serve as Q&A retrieval backend.

**Prototype 2 — Adversarial Dialectic on discourse-level claims**

After Prototype 1 produces discourse-level claims (layer 3), run adversarial dialectic *specifically on those claims*. Discourse claims are harder to falsify, so they need more challenge pressure.

Human checkpoint: after round 2, before round 3 — human can inject additional evidence or redirect the adversary.

**Prototype 3 — Dream/Consolidation as a separate parallel track**

Run Dream architecture in parallel with Prototype 1, comparing outputs. Dream's value is in cross-transcript associative connections that linear analysis misses. Especially valuable for discourse-level — sometimes the framing connection is only visible by juxtaposing two episodes that were never related.

---

## Implementation Notes

- All architectures should emit structured intermediate outputs (not just final text) — enables the flexible output format requirement
- Human checkpoint interfaces: present a summary of the phase's findings + a prompt for focus/direction ("Continue as-is / Focus on X / Prune Y / Inject this context")
- Each agent should emit: insight text + evidence quotes + confidence + insight type (topic-level vs. discourse-level) + cross-transcript references
- The "absence detector" — an agent specifically prompted to ask "what topic is never raised that you'd expect?" — is high-value for discourse-level and should appear in every prototype

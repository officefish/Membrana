# Ночной research: верификация чистоты речи (не грамотности)

_Perplexity sonar через туннель, 2026-07-17 (реальный внешний поиск, не сон)._

## Q1 Landscape

Practitioners verify **clarity** and **honesty** separately by using distinct checklists: clarity is assessed through **structural and linguistic constraints** (e.g., subject-verb proximity, jargon removal), while honesty is assessed through **epistemic and evidentiary transparency** (e.g., admitting limitations, verifying sources, avoiding "bullshit").

### 1. Verifying Clarity (Separate from Grammar)
Clarity verification focuses on whether the reader can *decode* the message without ambiguity, often using "plain language" criteria that ignore grammatical correctness if the meaning is obstructed.

| Concept / Checklist | Concrete Criteria for Verification |
| :--- | :--- |
| **Plain English Criteria** | • **One-two-three syntax:** Enforce strict Subject-Verb-Object order to prevent convoluted phrasing [4].<br>• **Homely diction:** Replace technical/big words with "common language" (e.g., "use" instead of "utilize") [4].<br>• **Concrete language:** Use specific, observable words rather than abstract generalizations [8][12]. |
| **Minimalism (Technical Writing)** | • **Delete hollow modifiers:** Remove words like "very," "quite," or "hollow" that add no data [1].<br>• **Replace phrase with word:** Condense "in the event that" to "if" [9].<br>• **Active voice:** Eliminate passive constructions that hide the actor [8]. |
| **Jargon/Buzzword Detection** | • **Word search flags:** Run drafts for specific "hollow" words (e.g., "synergy," "paradigm," "disrupt") and delete or flag them [1].<br>• **Audience test:** Ask peers to identify confusing sections; if they must "ask clarifying questions," the text lacks clarity [5][7]. |
| **Orwell’s Rules** (*Politics and the English Language*) | • **Break the rule of empty language:** If a sentence can be cut without losing meaning, cut it (Orwell’s rule against "padding") [4].<br>• **Avoid ready-made phrases:** Do not use "standpat" phrases like "a consideration which we should not be unwilling to" [4]. |

**Clarity Check Process:**
1. **Read aloud:** Confusion often surfaces when reading text aloud due to awkward rhythm [9].
2. **Logic flow check:** Ensure every sentence reinforces the paragraph’s purpose and every paragraph reinforces the thesis [11].
3. **Visual aid test:** If a concept requires a chart/slide to be understood, the text is unclear [7].

---

### 2. Verifying Honesty (Separate from Grammar)
Honesty verification focuses on the *truthfulness* and *intent* of the content, addressing whether the writer is lying, misleading, or merely "bullshitting" (speaking without regard for truth).

| Concept / Checklist | Concrete Criteria for Verification |
| :--- | :--- |
| **Frankfurt’s "On Bullshit"** | • **Intent check:** Does the language aim to *persuade* without caring about *truth*? (Bullshit differs from lies; it is language that neither lies nor tells the truth) [10].<br>• **Empty language audit:** Identify phrases designed to impress rather than inform (e.g., corporate fluff) [4]. |
| **Research Integrity & Transparency** | • **Acknowledge limitations:** Explicitly state what the research *cannot* prove or where data is weak [10].<br>• **Source transparency:** Be transparent about reporting methods and motives; never add data not present [2].<br>• **Double-check citations:** Ensure every reference notation matches the bibliography and cites the *actual* work consulted [6]. |
| **Ethical Writing Techniques** | • **Bias avoidance:** Write from an objective perspective; ensure personal opinions do not distort facts [5].<br>• **Source verification:** Cross-check facts against multiple credible sources to ensure accuracy [5].<br>• **Clear expression for ethics:** Ensure clarity is used to *prevent* misunderstanding, not to obscure unethical intent [5]. |
| **Journalistic Verification** | • **Skepticism of meaning:** Be skeptical not just of what is seen, but of the writer’s ability to know what it *really* means [2].<br>• **No fabrication:** Do not manipulate or fabricate data; provide a "true and comprehensive account" [10]. |

**Honesty Check Process:**
1. **The "Why" Test:** Ask, "What is the purpose of this paragraph?" If the purpose is not evident or is manipulative, honesty is compromised [11].
2. **Source audit:** Verify that quotes are enclosed in quotation marks and citations correspond to the correct source [6].
3. **Fact cross-check:** Run data through multiple sources to confirm accuracy before finalizing [5].

### Summary of Separation
*   **Clarity** is a **mechanical** check: "Can the reader parse this sentence?" (Use Orwell, Minimalism, and Plain English).
*   **Honesty** is an **ethical** check: "Is the writer telling the truth and admitting uncertainty?" (Use Frankfurt, Source Verification, and Limitation Disclosure).

Practitioners often run a **jargon word search** first (clarity) and then a **citation/source audit** second (honesty), treating them as distinct stages in the editing workflow [1][6].

**Источники:** https://plaintiffmagazine.com/images/issues/2011/12-december/reprints/McGinty-and-Smith_Legal-writing-for-brevity-clarity-and-honesty_Plaintiff-magazine.pdf · http://www1.lasalle.edu/~beatty/310/ACES_CD/editing_and_writing/accuracy_and_fairness/Verification.pdf · https://pmc.ncbi.nlm.nih.gov/articles/PMC4214013/ · https://www.poynter.org/reporting-editing/2021/how-to-write-with-honesty-in-the-plain-style/

## Q2 Fit

To automate clarity and honesty verification, build an **LLM-as-judge** system that evaluates text against a **structured checklist rubric** (jargon, empty words, hedging that shifts meaning, outsider readability) rather than relying on aggregate scores, using **checklist-based evaluation** or **DAGMetric decision trees** to break the task into discrete, verifiable claims [1][7]. This differs from readability metrics like **Flesch-Kincaid**, which only measure **sentence/word complexity** (syntactic difficulty) and cannot detect **semantic dishonesty**, **hedging**, or **empty jargon** that obscures truth [7]. Concrete 2024–2026 methods include **CheckEval** (predefined taxonomies), **FineSurE** (dimensional breakdown), **RAGChecker** (claim-level entailment), and **Process Reward Models (PRMs)** for step-by-step verification [2][3][7].

---

### 1. Core Automation Architecture: LLM-as-Judge with Checklist Rubric

#### Step 1: Define the Rubric (Checklist Criteria)
Create a **dimensional rubric** with explicit, discrete criteria. Avoid vague prompts; instead, define each dimension with examples and negative cases:

| Criteria | Definition | Example of Failure |
|--------|------------|-------------------|
| **Jargon** | Uses industry-specific terms without definition | "Leverage the synergy of our Q3 KPIs" (no definition) |
| **Empty Words** | Non-substantive fillers (e.g., "very," "essential," "robust") | "A very robust and essential solution" |
| **Modality-Shift/Hedging** | Changes meaning via softening (e.g., "may," "could," "might") that hides certainty | "We *might* achieve the target" (vs. "We will") |
| **Outsider Readability** | Can a non-expert understand the core claim? | "The algorithm utilizes stochastic gradient descent" (no plain-language equivalent) |

Use **FineSurE**-style decomposition to assess each dimension independently [3].

#### Step 2: Choose the Evaluation Method
Select one of these 2024–2026 methods based on latency and cost needs:

| Method | Best For | 2024–2026 Status |
|--------|----------|----------------|
| **Checklist Evaluation (CheckEval)** | Transparent, criteria-driven judgments | Automated rubric generation + seed questions [7] |
| **DAGMetric (Decision Tree)** | Controlled scoring via node-based judgments | Breaks one judge into a decision tree [1] |
| **RAGChecker** | Claim-level honesty (entailment) | Extracts atomic claims, checks bidirectional entailment [7] |
| **Process Reward Models (PRMs)** | Step-by-step reasoning verification | Verifies each reasoning step, not just final output [2] |
| **Reflexion/LATS** | Self-consistency + reflection loops | Evolved into richer variants by 2025–2026 [2] |

For **clarity + honesty**,Combine **CheckEval** (for checklist) with **RAGChecker** (for claim-level entailment) to ensure both dimensions are covered [2][7].

#### Step 3: Prompting Best Practices
- **Include explicit criteria**: "Rate based on jargon, empty words, modality-shift, and outsider readability" [5].
- **Chain-of-thought reasoning**: Ask the judge to explain *why* before scoring [5][10].
- **Structured output**: Return JSON `{"score": 0–1, "reasoning": "..."}` [5][8].
- **Add examples**: Provide good/bad examples for each criterion [4][8].
- **Randomize order**: Shuffle candidate order to reduce position bias [5][6][8].

#### Step 4: Calibration & Validation
- Build a **gold-set** of 200 hand-labeled traces with inter-annotator agreement [8].
- Compare judge outputs against human labels; aim for **75–90% alignment** [5].
- **Iterate on rubric**: Analyze disagreements, refine criteria, add negative examples [5][11].
- **Avoid same-family bias**: Use a different LLM family for the judge than the generator [8].

#### Step 5: Deployment Patterns (2026)
Choose a pattern based on your latency/cost constraints [2]:

| Pattern | Latency | Cost | Failure Mode |
|--------|---------|------|--------------|
| **Offline eval** | High (batch) | Low | None (post-hoc) |
| **Online runtime verifier** | Low (real-time) | High | False positives/negatives |
| **Self-consistency loops** | Medium | Medium | Inconsistent judgments |
| **Reflexion/LATS** | Medium–High | Medium | Over-reflection |
| **PRMs** | Medium | High | Step-level errors |
| **Multi-judge ensembles** | High | High | Reduced bias |

For production, **online runtime verifier** or **PRM** is ideal for real-time text verification [2].

---

### 2. How This Differs from Flesch-Kincaid and Readability Metrics

| Metric Type | What It Measures | Cannot Detect | Example Limitation |
|-------------|----------------|---------------|-------------------|
| **Flesch-Kincaid** | Sentence/word complexity (syntactic) | Hedging, jargon, empty words, semantic dishonesty | "The robust solution may potentially deliver" → low complexity score, but high hedging |
| **Gunning Fog** | Flesch + average sentence length | Modality-shift, meaning changes | "We *could* achieve it" → treated same as "We will" |
| **SMOG** | Multi-syllable word count | Empty words, jargon without definition | "Optimize synergy" → short words, but jargon-heavy |
| **LLM-as-Judge (Checklist)** | **Semantic clarity + honesty** (criteria-driven) | — | Detects "very robust solution" as empty words, "might achieve" as hedging |

Key distinction: **Readability metrics** measure *how hard* text is to read (complexity), while **LLM-as-judge with checklist** measures *what the text means* and *whether it's honest* (semantic quality) [7]. A text can be **simple** (low Flesch score) but **dishonest** (heavy hedging, jargon without definition) — only an LLM judge catches this.

---

### 3. Concrete 2024–2026 Methods (Implementation Examples)

#### A. Checklist Evaluation (CheckEval)
```python
# Example rubric definition
rubric = {
    "jargon": {
        "definition": "Uses undefined industry terms",
        "examples": {
            "good": "We use a neural network",
            "bad": "Leverage the synergy of our Q3 KPIs"
        }
    },
    "empty_words": {
        "definition": "Non-substantive fillers",
        "examples": {
            "good": "The solution works",
            "bad": "A very robust and essential solution"
        }
    },
    "modality_shift": {
        "definition": "Hedging that changes meaning",
        "examples": {
            "good": "We will achieve the target",
            "bad": "We *might* achieve the target"
        }
    },
    "outsider_readability": {
        "definition": "Understandable by non-expert",
        "examples": {
            "good": "The algorithm learns from data",
            "bad": "Utilizes stochastic gradient descent"
        }
    }
}
```
Use **CheckEval** to automate rubric generation + evaluation [7].

#### B. Claim-Level Honesty (RAGChecker)
```python
# Extract atomic claims from text
claims = extract_atomic_claims(text)
# Check entailment against source
for claim in claims:
    entailment = bidirectional_entailment(claim, source_docs)
    if not entailment:
        flag_as_honesty_failure(claim)
```
This verifies **honesty** at the claim level, not just aggregate scores [7].

#### C. Decision Tree (DAGMetric)
Break the judge into a **decision tree**:
1. Node 1: "Does text contain jargon?" → Yes/No
2. Node 2: "If yes, is it defined?" → Yes/No
3. Node 3: "Does text use hedging that changes meaning?" → Yes/No
4. Path → Controlled score (0–1)

Each node handles a smaller judgment, reducing bias [1].

#### D. Process Reward Models (PRMs)
For **step-by-step reasoning**, verify each reasoning step:
- Input: "The target is achievable because X, Y, Z"
- PRM checks: "Is X true? Is Y true? Is Z true?"
- If any step fails → flag as dishonest [2].

---

### 4. Limitations & Transparency

- **Symbol bias**: LLM evaluators may have symbol bias when using ICL (in-context learning) [3].
- **Positional bias**: Use **swapping operation** (invoke judge twice, swap order) to reduce bias [6].
- **Verbosity penalty**: Penalize unnecessary length in the rubric; normalize by token count for information density [8].
- **Cost/latency**: Online runtime verifiers and PRMs have higher latency/cost; offline eval is cheaper but post-hoc [2].
- **Calibration required**: Without a gold-set and human alignment, the judge may produce inconsistent results [5][11].

If search results are incomplete on specific **2026 tool implementations** (e.g., exact API endpoints for CheckEval or DAGMetric), supplement with general patterns from **2024–2025 surveys** (LLM-as-Judge survey, FineSurE, CheckEval papers) [3][7].

---

### Summary
| Aspect | Readability Metrics (Flesch-Kincaid) | LLM-as-Judge + Checklist |
|--------|-----------------------------------|-------------------------|
| **Measures** | Complexity (syntactic) | Clarity + Honesty (semantic) |
| **Detects** | Hard words, long sentences | Jargon, empty words, hedging, outsider readability |
| **2024–2026 Methods** | Static formulas | CheckEval, DAGMetric, RAGChecker, PRMs, Reflexion/LATS |
| **Automation** | One-line formula | Structured rubric + chain-of-thought + JSON output |
| **Honesty** | ❌ No | ✅ Yes (claim-level entailment) |

Build an **LLM-as-judge** with **checklist evaluation** (CheckEval) + **claim-level entailment** (RAGChecker) for the most robust clarity/honesty automation in 2024–2026 [2][7].

**Источники:** https://deepeval.com/blog/llm-as-a-judge · https://zylos.ai/research/2026-04-10-llm-as-judge-production-agent-verification-2026 · https://arxiv.org/html/2412.05579v2 · https://www.evidentlyai.com/llm-guide/llm-as-a-judge

## Q3 Risk

Enforcing plain language **harms technical accuracy** when simplification strips away the **precision, nuance, or specific scope** required to distinguish between valid technical states (e.g., replacing “asymptotic” with “approaching” loses the mathematical guarantee of never reaching a limit) or when it forces **abstraction** that obscures critical mechanistic details [1][3][5]. **Jargon is actually necessary** when it serves as a **high-density semantic shortcut** for a concept that is too complex to define without losing fidelity, or when it carries a **rigorously defined meaning** that everyday words lack due to ambiguity [2][4].

### When Plain Language Harms Accuracy
Plain language fails when the global trend of misuse imposes simplicity on areas requiring **rigour, depth, and abstraction**, turning clarity into a tool of suppression rather than inclusion [5].
*   **Loss of Precision:** Words like “extremely” or “never” are often avoided for simplicity but are **imprecise** and can be factually inaccurate in technical contexts; conversely, metaphors used to simplify may neglect critical aspects of a scientific object [3].
*   **Over-Simplification:** Professionals fear that plain language can over-simplify information to the point where it becomes **inaccurate or worthless**, stripping away the necessary complexity to represent the phenomenon correctly [9].
*   **False Equivalence:** The claim that “striving for clarity invariably improves accuracy” is a **flimsy claim** if clarity is achieved by ignoring technical distinctions that define the truth of a statement [1].

### When Jargon Is Necessary
Jargon transitions from “obscuring” to “essential” based on **audience expertise** and **conceptual density**.
*   **Semantic Shortcuts:** For expert groups sharing a common vocabulary, technical jargon acts as a **shortcut**, communicating a complex concept clearly and immediately without the need for repetitive definitions [4].
*   **Defined Rigor:** Jargon is acceptable (and necessary) when it communicates a concept with a **specific, agreed-upon meaning** that everyday language cannot replicate without ambiguity [3].
*   **Audience Alignment:** A highly technical audience prefers complex terms as long as they can reference a **glossary**; for them, plain language explanations can feel alienating or redundant [2][4].

### Distinguishing Needed Terms from Obscuring Jargon
The distinction relies on a careful analysis of **audience** and **purpose**, not just the complexity of the word.

| Feature | **Needed Technical Term** | **Obscuring Jargon** |
| :--- | :--- | :--- |
| **Purpose** | Communicates a concept **clearly understood** by the target specialized group [4] | Used to **impress, rather than inform**, the audience [8] |
| **Definition** | Has a **rigorously defined meaning** unique to the field [3] | Often **vague**, undefined, or means something different from common usage [8] |
| **Audience Fit** | Target readers **know or can easily verify** the meaning [4] | Readers are **not familiar** with the language of the field [3] |
| **Effect** | Reduces ambiguity and increases **precision** [3] | Creates a **barrier to communication** and risks losing trust [3][6] |

**The Test:** Before using a term, ask: *Does my audience truly know its meaning?* If yes, use it. If no, explain it first or substitute an everyday term [4][6].

### Risks of Over-Simplification and the “Clarity Gate”
Treating plain language as a **rubber-stamp** (a mandatory checklist item) rather than a strategic tool creates significant risks:
*   **The Clarity Gate as Suppression:** When plain language is imposed without regard for necessary depth, it becomes a **tool of suppression** that prevents the publication of rigorous research or complex educational material [5].
*   **Misleading the Audience:** If an audience pretends to be a subject matter expert but reads over-simplified content, they may **fail to grasp critical distinctions**, leading to errors in application or research [5].
*   **Rubber-Stamping:** A bureaucratic “clarity gate” that demands simplification without evaluating **context** can force writers to remove essential qualifiers, leading to **misinterpretation** of legal terms or technical data [6].

**Best Practice Strategy:** To balance accuracy and clarity, pair the **full technical document** with a **plain language summary**, or define technical terms within the text/glossary [2]. This ensures the material remains **accurate** for experts while remaining **approachable** for a wider audience [2].

**Источники:** https://digital.gov/s3/files/m-files/pl-summit-2020-joseph-kimble.pdf · https://accessibleweb.com/question-answer/how-can-we-balance-plain-language-with-technical-accuracy-in-complex-fields/ · https://courses.lumenlearning.com/suny-esc-technicalwriting/chapter/appropriate-language-in-technical-communication/ · https://www.nngroup.com/articles/plain-language-experts/


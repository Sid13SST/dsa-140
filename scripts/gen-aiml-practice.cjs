/**
 * Generates the two AI/ML question banks:
 *
 *   src/data/aimlPractice.ts      — 24 questions for the AI interviewer
 *   src/data/aimlPracticeBank.ts  — 50 questions for self-graded practice
 *
 *   node scripts/gen-aiml-practice.cjs
 *
 * The two sets are DISJOINT and the generator fails if they overlap. Practising
 * the questions you are then interviewed on turns the interview into a memory
 * test, which is exactly the failure mode this whole section exists to avoid.
 *
 * Like system design, ML has no judge — nothing can tell you your answer was
 * good. So every question ships a rubric and you grade yourself against it
 * afterwards. Without that, "practise ML system design" is just daydreaming.
 */
const fs = require('fs')

const q = (id, title, tier, family, scope, clarify, rubric) => ({
  id,
  title,
  tier,
  family,
  scope,
  clarify,
  rubric,
})

/* ------------------------- the 50-question practice bank ------------------------- */

const PRACTICE = [
  /* ---------------------------- fundamentals ---------------------------- */
  q('bias-variance-call', 'Diagnose bias vs variance', 'warmup', 'concept',
    'Training error 2%, validation error 18%. Say what is happening and what you change first.',
    ['How much data is there?', 'How many parameters?', 'Is the split random or temporal?'],
    ['Named it as variance/overfitting rather than guessing',
     'More data, stronger regularisation, or a simpler model — and which is cheapest to try first',
     'Why adding features would make this worse',
     'What the same table would look like under high bias instead']),

  q('metric-imbalanced', 'Pick a metric for 0.5% positives', 'warmup', 'concept',
    'A fraud model sees 0.5% positive labels. Accuracy is 99.6%. Choose the metric you ship on.',
    ['What does a false positive cost?', 'What does a false negative cost?', 'Is there a human review queue?'],
    ['Accuracy rejected with the reason, not just the vibe',
     'Precision/recall or PR-AUC chosen over ROC-AUC, with why ROC flatters here',
     'Threshold treated as a product decision, not a model output',
     'Recall@k tied to the size of the review queue']),

  q('cv-leak', 'Cross-validation that lies', 'warmup', 'concept',
    'Your 5-fold CV score is excellent and production is terrible. Explain how the CV was wrong.',
    ['Is there a time dimension?', 'Are rows independent?', 'Where were features computed?'],
    ['Random folds on temporal data named as the classic cause',
     'Group leakage: the same user/entity in train and validation',
     'Preprocessing fitted before the split rather than inside the fold',
     'Time-based or grouped splitting proposed as the fix']),

  q('regularisation-pick', 'L1 or L2 at 10k features', 'warmup', 'concept',
    '10,000 features, 500 rows. Choose a penalty and defend it.',
    ['Do you need interpretability?', 'Are features correlated?', 'Is sparsity useful downstream?'],
    ['L1 for selection when most features are believed useless',
     'Why L2 shrinks but never zeroes',
     'Elastic net named for correlated feature groups',
     'p >> n stated as the actual reason regularisation is mandatory here']),

  q('serving-skew', 'Training/serving skew', 'warmup', 'concept',
    'Offline metrics are stable; online is 10 points worse. Find the skew.',
    ['Where are features computed offline?', 'And online?', 'Is there any shared code?'],
    ['Two implementations of one feature named as the mechanism',
     'Time-travel: offline features seeing data the request cannot',
     'Logging serving-time features and replaying them offline as the diagnosis',
     'A shared transformation path as the structural fix']),

  q('embedding-quality', 'Is this embedding any good?', 'warmup', 'concept',
    'You have a new embedding model. Decide whether it is better than the old one.',
    ['Better for what task?', 'Is there labelled relevance data?', 'What is the latency budget?'],
    ['Intrinsic vs extrinsic evaluation separated',
     'Retrieval metrics (recall@k, MRR, nDCG) named over cosine eyeballing',
     'Dimensionality and index cost counted, not just quality',
     'A held-out query set built before the comparison']),

  q('temperature', 'Temperature, top-k, top-p', 'warmup', 'concept',
    'Explain what each sampling knob changes, and pick settings for a code assistant.',
    ['Is determinism required?', 'Is this user-facing?', 'Is there a verifier downstream?'],
    ['Temperature as a reshaping of the distribution, not "creativity"',
     'top-k as fixed count vs top-p as a probability mass',
     'Low temperature for code, and why',
     'Greedy decoding named along with the repetition failure it causes']),

  q('token-cost', 'Why the tokeniser is your bill', 'warmup', 'concept',
    'Costs doubled after a language change with no traffic change. Explain.',
    ['Which languages?', 'Which tokeniser?', 'Input-heavy or output-heavy?'],
    ['Non-English text producing far more tokens per character',
     'Context window consumed faster, so more truncation or more calls',
     'Measuring tokens-per-request as the metric, not requests',
     'A tokeniser change proposed as the actual lever']),

  q('why-attention', 'Why attention replaced recurrence', 'warmup', 'concept',
    'Explain what attention buys over an RNN, in both quality and systems terms.',
    ['Sequence length?', 'Training or inference?', 'Latency budget?'],
    ['Path length between any two tokens is O(1) rather than O(n)',
     'Parallelism across the sequence during training',
     'Quadratic cost in sequence length named as the price',
     'KV cache mentioned as what makes generation tractable']),

  q('overfit-vs-leak', 'Overfitting vs leakage', 'warmup', 'concept',
    'Distinguish the two precisely, with a test that tells them apart.',
    ['What is the validation score?', 'What is the production score?', 'Any target-derived features?'],
    ['Overfitting: fits noise, validation catches it',
     'Leakage: validation is contaminated, so validation does not catch it',
     'A suspiciously high score named as the leakage smell',
     'Feature-by-feature ablation proposed to find the leaking column']),

  q('threshold-choice', 'Choosing a decision threshold', 'warmup', 'concept',
    'Your classifier outputs probabilities. Pick the threshold that ships.',
    ['Cost matrix?', 'Capacity of any downstream queue?', 'Is calibration checked?'],
    ['Threshold derived from costs, not from 0.5',
     'Calibration checked before treating scores as probabilities',
     'Capacity constraint as an alternative driver (top-N per day)',
     'Threshold revisited when the base rate shifts']),

  q('feature-scaling', 'When scaling matters', 'warmup', 'concept',
    'Name the models that need feature scaling and the ones that do not, with reasons.',
    ['Which model family?', 'Any distance computation?', 'Any regularisation?'],
    ['Trees invariant to monotone scaling',
     'Distance- and gradient-based methods sensitive to it',
     'Regularisation penalising large-scale features unfairly',
     'Scaler fitted on train only, inside the fold']),

  /* ------------------------------ debugging ------------------------------ */
  q('loss-flat', 'Loss will not move', 'core', 'debug',
    'Training loss is flat from step 0. Work through the causes in order.',
    ['Is the loss exactly constant?', 'What is the learning rate?', 'Does one batch overfit?'],
    ['Overfit a single batch as the first diagnostic',
     'Learning rate too low or too high, and how each looks different',
     'Labels shuffled relative to inputs, or gradients not flowing',
     'Output layer / loss mismatch (e.g. softmax applied twice)']),

  q('val-diverges', 'Validation loss turns upward', 'core', 'debug',
    'Training loss keeps falling; validation bottoms out then rises. Respond.',
    ['At which epoch?', 'How large is the validation set?', 'Any augmentation?'],
    ['Named as overfitting past the optimum',
     'Early stopping on the validation curve',
     'Regularisation, dropout, augmentation or more data as levers',
     'Warning that a tiny validation set makes this curve noise']),

  q('offline-online-gap', 'Great offline, flat online', 'core', 'debug',
    'Offline AUC is up 4 points; the A/B test shows nothing. Explain the gap.',
    ['What is the online metric?', 'How was the offline set sampled?', 'Is there feedback loop bias?'],
    ['Offline metric not causally linked to the online one',
     'Selection bias: offline data logged under the old policy',
     'Position/presentation bias in click data',
     'Counterfactual or interleaving evaluation proposed']),

  q('slow-decay', 'Model decays over months', 'core', 'debug',
    'Performance degrades slowly with no deploys. Diagnose without labels.',
    ['Are labels delayed or absent?', 'Has upstream data changed?', 'Any seasonality?'],
    ['Covariate shift vs concept drift distinguished',
     'Input distribution monitoring as the label-free signal',
     'Upstream schema or pipeline change as a common culprit',
     'Retraining cadence tied to measured drift, not a calendar']),

  q('p99-spike', 'p99 latency spikes, p50 fine', 'core', 'debug',
    'Median inference is 40ms; p99 is 3s. Find it.',
    ['Batching enabled?', 'Cold starts?', 'Variable input length?'],
    ['Queueing delay under batching named',
     'Variable sequence length causing variable compute',
     'Model or weights loading inside the request path',
     'GC, cold start, or autoscaling churn as alternatives',
     'Measuring queue time separately from compute time']),

  q('rag-wrong-docs', 'RAG retrieves the wrong thing', 'core', 'debug',
    'Answers are fluent and wrong. Isolate the failing stage.',
    ['Is the right chunk in the index at all?', 'Is it retrieved but ranked low?', 'Is it retrieved and ignored?'],
    ['Retrieval evaluated separately from generation',
     'Three distinct failures named: not indexed, not retrieved, not used',
     'Chunking strategy as a cause of the first',
     'Reranking as the fix for the second, prompt/context order for the third']),

  q('eval-plateau', 'Eval score stops moving', 'core', 'debug',
    'Every prompt change leaves the eval score identical. Explain.',
    ['How many eval examples?', 'How is it scored?', 'What is the variance?'],
    ['Eval set too small or too easy to discriminate',
     'Ceiling effect: everything already passes',
     'Scoring function insensitive to the thing being changed',
     'Confidence interval computed rather than comparing point scores']),

  q('gpu-idle', 'GPU at 20% utilisation', 'core', 'debug',
    'Training is slow and the GPU is mostly idle. Find the bottleneck.',
    ['Where does data come from?', 'Batch size?', 'Any per-step sync?'],
    ['Data loading / preprocessing starving the device',
     'Batch size too small to saturate',
     'Host-device transfer or a synchronising call per step',
     'Profiling named before optimising']),

  q('nondeterminism', 'Two runs, two results', 'core', 'debug',
    'Identical config, different final metrics. Decide whether to care.',
    ['How big is the difference?', 'Seeds fixed?', 'Multi-GPU?'],
    ['Sources: init, shuffling, dropout, non-deterministic kernels, reduction order',
     'Run-to-run variance measured before chasing a "regression"',
     'Seeding everything including the data loader',
     'Accepting nondeterminism but reporting mean ± spread']),

  q('minority-collapse', 'Model predicts one class', 'core', 'debug',
    'With 1% positives, the model predicts all-negative. Fix it.',
    ['What loss?', 'What metric?', 'Is all-negative actually optimal for that loss?'],
    ['All-negative recognised as a rational optimum for plain accuracy',
     'Class weighting or focal loss',
     'Resampling and its distortion of calibration',
     'Evaluating with PR rather than accuracy so the fix is visible']),

  q('dup-rows', 'Duplicated rows across the split', 'core', 'debug',
    'You find near-duplicate records in train and test. Quantify the damage.',
    ['Exact or near duplicates?', 'What fraction?', 'Same entity or same content?'],
    ['Optimistic bias explained mechanically',
     'Deduplication before splitting, not after',
     'Near-duplicate detection (hashing/embedding) not just exact match',
     'Re-reporting the honest score after the fix']),

  q('prompt-regression', 'A prompt fix broke something else', 'core', 'debug',
    'Fixing one failure mode regressed three others. Build the safety net.',
    ['Is there an eval set?', 'Are past failures captured?', 'Is scoring automated?'],
    ['Every reported failure becomes a permanent eval case',
     'Regression gate blocking a deploy on the whole set',
     'Per-category breakdown so one category cannot hide another',
     'Version-controlling prompts like code']),

  /* --------------------------- ML system design --------------------------- */
  q('d-recommender', 'Design a recommender', 'core', 'design',
    'Home feed recommendations for 50M users over a 10M-item catalogue.',
    ['Cold start for users or items?', 'Latency budget?', 'What is the success metric?'],
    ['Two-stage: candidate generation then ranking, with why one stage cannot work',
     'Embedding retrieval / ANN for the candidate stage',
     'Features split into precomputed and request-time',
     'Cold start handled explicitly for both new users and new items',
     'Feedback loop and popularity bias acknowledged']),

  q('d-rag-support', 'Design RAG over support docs', 'core', 'design',
    'Answer customer questions over 200k support articles, with citations.',
    ['How often do docs change?', 'Is a wrong answer worse than no answer?', 'Latency budget?'],
    ['Ingestion pipeline: parse, chunk, embed, index — with the chunking rationale',
     'Hybrid retrieval and a reranking stage',
     'Citation/grounding requirement driving the prompt design',
     'Refusal path when retrieval confidence is low',
     'Re-indexing strategy when documents change',
     'Retrieval and answer quality evaluated separately']),

  q('d-feature-store', 'Design a feature store', 'hard', 'design',
    'Serve the same features to training and to online inference.',
    ['How many models?', 'Online latency budget?', 'Point-in-time correctness needed?'],
    ['Offline store for training, online store for serving, one definition',
     'Point-in-time correct joins to prevent label leakage',
     'Freshness tiers: batch, streaming, request-time',
     'Backfill story for a new feature',
     'Skew detection between the two paths']),

  q('d-fraud', 'Design fraud detection', 'core', 'design',
    'Score transactions in under 100ms, with delayed and adversarial labels.',
    ['What is the fraud rate?', 'When do labels arrive?', 'Cost of a false decline?'],
    ['Latency budget forcing precomputed aggregates',
     'Label delay and how you train despite it',
     'Adversarial drift and retraining cadence',
     'Threshold tied to review-team capacity',
     'Rules layer alongside the model for known patterns']),

  q('d-search-ranking', 'Design search ranking', 'core', 'design',
    'Rank results for a product search over 100M items.',
    ['Query volume?', 'Is relevance labelled?', 'Personalised?'],
    ['Retrieval then ranking, with the size of each stage',
     'Lexical and semantic retrieval combined, and why neither alone',
     'Training data from clicks, and the biases that carries',
     'Online metric vs offline metric named separately',
     'Fallback when the ranker is unavailable']),

  q('d-ctr', 'Design ad click prediction', 'hard', 'design',
    'Predict CTR for ad auctions at 500k QPS.',
    ['Latency budget per request?', 'How many candidate ads?', 'Calibration required?'],
    ['Calibration as a hard requirement because the score feeds a bid',
     'Feature hashing / embedding of very high-cardinality IDs',
     'Online learning or frequent retraining for freshness',
     'Throughput strategy at 500k QPS',
     'Delayed conversion feedback handled']),

  q('d-eval-harness', 'Design an eval harness', 'core', 'design',
    'Make LLM output quality a number CI can block on.',
    ['What task?', 'Who labels?', 'What is the acceptable regression?'],
    ['Eval set construction: size, sourcing, and who writes the gold answers',
     'Deterministic scoring where possible; judge model where not',
     'The judge itself validated against human labels',
     'Per-category breakdown and a regression gate',
     'Eval set kept out of any prompt or fine-tuning data']),

  q('d-llm-serving', 'Design an LLM serving stack', 'hard', 'design',
    'Serve a 7B model to 10k concurrent users on limited GPUs.',
    ['Streaming responses?', 'Latency target for first token?', 'Budget?'],
    ['Continuous/dynamic batching and the latency it costs',
     'KV cache as the real memory constraint, sized roughly',
     'Time-to-first-token separated from tokens-per-second',
     'Quantisation as a capacity lever with its quality cost',
     'Queueing and admission control under overload']),

  q('d-embedding-pipeline', 'Design an embedding pipeline', 'core', 'design',
    'Keep embeddings for a changing 50M-document corpus current.',
    ['Change rate?', 'Acceptable staleness?', 'Model upgrade cadence?'],
    ['Incremental updates rather than full recompute',
     'Idempotency and dedup on re-ingest',
     'The re-embedding migration when the model changes',
     'Index build/swap without downtime',
     'Cost estimate per full pass']),

  q('d-moderation', 'Design content moderation', 'core', 'design',
    'Flag policy-violating uploads at scale, with human review.',
    ['What modalities?', 'Precision or recall priority?', 'Review capacity?'],
    ['Tiered: cheap filter, then model, then human',
     'Threshold set by review capacity',
     'Appeals path feeding back into training data',
     'Adversarial evasion expected and monitored',
     'Different thresholds per policy severity']),

  q('d-ab-ml', 'Design A/B testing for models', 'core', 'design',
    'Compare two ranking models safely on live traffic.',
    ['What is the primary metric?', 'How long can it run?', 'Any network effects?'],
    ['Randomisation unit chosen and defended',
     'Guardrail metrics alongside the primary',
     'Sample size / duration from expected effect size',
     'Shadow mode and gradual ramp before the split',
     'Interleaving named as the cheaper option for ranking']),

  q('d-training-pipeline', 'Design a training pipeline', 'core', 'design',
    'Retrain a production model weekly, reproducibly.',
    ['Data volume?', 'How long does a run take?', 'Who approves a deploy?'],
    ['Data versioning so a run can be reproduced',
     'Deterministic-enough config and seed capture',
     'Automatic evaluation gate before promotion',
     'Model registry with lineage back to data and code',
     'Rollback path']),

  q('d-drift', 'Design drift monitoring', 'core', 'design',
    'Detect degradation when labels arrive weeks late or never.',
    ['Feature count?', 'Traffic volume?', 'What is the alert budget?'],
    ['Input distribution monitoring per feature',
     'Prediction distribution monitoring as a cheap proxy',
     'A statistic and a window, not just a threshold',
     'Alert fatigue managed — what you do not alert on',
     'Proxy labels where real labels are unavailable']),

  q('d-registry', 'Design a model registry', 'core', 'design',
    'Track every model artefact from training to production and back.',
    ['How many models?', 'Compliance requirements?', 'Who can promote?'],
    ['Immutable artefacts with content addressing',
     'Lineage: data version, code commit, config, metrics',
     'Stage transitions with approval',
     'Rollback to a previous version as a first-class operation',
     'What gets garbage collected and when']),

  q('d-batch-inference', 'Design batch scoring', 'core', 'design',
    'Score 500M rows nightly within a four-hour window.',
    ['Where do results go?', 'What if it overruns?', 'Any row-level SLA?'],
    ['Partitioning and parallelism to fit the window',
     'Idempotent writes and safe retries',
     'Failure isolation so one bad partition does not kill the run',
     'Cost/throughput tradeoff versus online serving',
     'What happens downstream if the job is late']),

  q('d-realtime-features', 'Design real-time features', 'hard', 'design',
    'Compute "purchases in the last 5 minutes" at request time.',
    ['Acceptable staleness?', 'Cardinality of keys?', 'Latency budget?'],
    ['Streaming aggregation with windowing',
     'The offline/online consistency problem for the same feature',
     'Late and out-of-order events',
     'State size and expiry',
     'Fallback value when the stream is behind']),

  q('d-multi-tenant', 'Design multi-tenant inference', 'hard', 'design',
    'Serve many customers off shared GPUs without one starving the others.',
    ['Per-tenant SLAs?', 'Custom models per tenant?', 'Isolation requirements?'],
    ['Per-tenant quotas and fair scheduling',
     'Noisy-neighbour prevention',
     'Model loading/unloading strategy if models differ per tenant',
     'Data isolation between tenants',
     'Cost attribution per tenant']),

  q('d-labelling', 'Design a labelling pipeline', 'core', 'design',
    'Produce 100k labels with measurable quality.',
    ['Who labels?', 'How ambiguous is the task?', 'Budget?'],
    ['Written labelling guidelines with edge cases',
     'Inter-annotator agreement measured',
     'Gold set to score annotators',
     'Active learning to prioritise what to label',
     'Feedback loop when the guideline itself is wrong']),

  q('d-semantic-cache', 'Design a semantic cache', 'hard', 'design',
    'Cut LLM cost by serving cached answers to similar questions.',
    ['How similar is "similar enough"?', 'How stale can an answer be?', 'Any personalisation?'],
    ['Similarity threshold and the false-hit risk it creates',
     'Why an exact-match cache is safe and a semantic one is not',
     'Invalidation when the underlying knowledge changes',
     'Personalised or permissioned content excluded from sharing',
     'Hit rate measured against quality impact, not just cost']),

  q('d-agent-tools', 'Design agent tool execution', 'hard', 'design',
    'Let a model call real tools without letting it do damage.',
    ['Which tools are destructive?', 'Is there a human in the loop?', 'What is the failure budget?'],
    ['Tool permissions and an explicit allowlist',
     'Confirmation gates on irreversible actions',
     'Loop and cost bounds to prevent runaway execution',
     'Tool output treated as untrusted input, not instructions',
     'Tracing so a bad run can be reconstructed']),

  /* ------------------------- cost, capacity, decisions ------------------------- */
  q('cost-per-request', 'Cost per request', 'hard', 'applied',
    'Work out what one LLM request costs you, end to end.',
    ['Input and output token counts?', 'Self-hosted or API?', 'Cache hit rate?'],
    ['Input and output tokens priced separately',
     'Retrieval and embedding cost included, not just generation',
     'Amortised GPU cost if self-hosted, including idle time',
     'Cache hit rate as the biggest single lever',
     'A number, with the assumptions stated']),

  q('gpu-or-cpu', 'GPU or CPU for inference', 'hard', 'applied',
    'Decide the hardware for a model serving 200 QPS.',
    ['Model size?', 'Batch or online?', 'Latency target?'],
    ['Arithmetic intensity / model size driving the decision',
     'Batching feasibility as the deciding factor for GPU economics',
     'Cost per request compared on both, not just latency',
     'Utilisation honestly estimated, including idle',
     'A recommendation, not a survey']),

  q('quantisation-call', 'Quantise or not', 'hard', 'applied',
    'int8 halves your serving cost. Decide whether to take it.',
    ['What quality drop is acceptable?', 'Is there an eval set?', 'Which layers?'],
    ['Quality measured on a task eval, not perplexity alone',
     'Post-training vs quantisation-aware training',
     'Which parts are sensitive (attention, outliers) and stay higher precision',
     'The capacity gain quantified in requests or GPUs saved',
     'A rollback plan if quality complaints appear']),

  q('finetune-rag-prompt', 'Fine-tune, retrieve, or prompt', 'hard', 'applied',
    'The model does not know your domain. Choose the intervention.',
    ['Is it missing knowledge or missing behaviour?', 'How often does the knowledge change?', 'How much labelled data?'],
    ['Knowledge gap points to retrieval; behaviour gap points to fine-tuning',
     'Change rate as the argument against baking knowledge into weights',
     'Prompting tried first because it is reversible and cheap',
     'Data requirement for fine-tuning stated concretely',
     'Ongoing cost of each option compared']),

  q('rollback-model', 'Roll back a bad model', 'hard', 'applied',
    'A model shipped an hour ago is hurting a business metric. Act.',
    ['Is the previous version still deployable?', 'Are predictions cached?', 'Any downstream writes?'],
    ['Roll back first, diagnose second',
     'Cached or persisted predictions from the bad model cleaned up',
     'Downstream side effects considered before declaring it over',
     'The gate that should have caught it, added',
     'Blameless note on why the eval missed it']),

  q('capacity-gpus', 'How many GPUs', 'hard', 'applied',
    'Size the fleet for 10k daily active users of a chat product.',
    ['Requests per user per day?', 'Tokens per request?', 'Peak-to-average ratio?'],
    ['Peak QPS derived, not average',
     'Tokens/second per GPU estimated with a stated assumption',
     'Headroom for failure and deploys',
     'Batching effect on effective throughput',
     'A number with the arithmetic shown']),
]

/* ----------------------- the 24-question interview bank ----------------------- */

const INTERVIEW = [
  q('i-newsfeed-rank', 'Rank a news feed', 'core', 'design',
    'Order posts for a social feed with 100M daily users.',
    ['What is the objective — engagement, time, or something else?', 'How fresh must it be?', 'Latency budget?'],
    ['Candidate generation and ranking separated',
     'Objective defined before any modelling',
     'Freshness vs relevance tension addressed',
     'Feedback loop and filter-bubble risk named',
     'Cold start for new posts']),

  q('i-churn', 'Predict subscriber churn', 'core', 'design',
    'Flag subscribers likely to cancel within 30 days.',
    ['What action follows a prediction?', 'How is churn defined exactly?', 'Label delay?'],
    ['Prediction window and label definition pinned down',
     'The intervention determines the metric, not the other way round',
     'Survivorship and censoring in the training data',
     'Uplift vs raw propensity distinguished',
     'Cost of a wasted retention offer']),

  q('i-duplicate-detect', 'Detect duplicate listings', 'core', 'design',
    'Find duplicate product listings across 100M items.',
    ['Exact or near duplicates?', 'Text, image, or both?', 'Batch or real-time?'],
    ['Blocking / candidate generation before pairwise comparison',
     'Embedding plus ANN for the candidate stage',
     'Threshold tuned against a labelled pair set',
     'Transitivity problem when merging clusters',
     'Human review for the ambiguous band']),

  q('i-support-triage', 'Route support tickets', 'core', 'design',
    'Send incoming tickets to the right team automatically.',
    ['How many teams?', 'Cost of a misroute?', 'Is there historical routing data?'],
    ['Historical routing as labels, and the bias that carries',
     'Confidence threshold with a fallback to manual',
     'Class imbalance across teams',
     'Feedback captured when a human reroutes',
     'New team / new category handling']),

  q('i-doc-qa', 'Question answering over documents', 'core', 'design',
    'Answer employee questions over internal wikis and PDFs.',
    ['Are permissions per-document?', 'How stale can answers be?', 'Is refusal acceptable?'],
    ['Permission filtering applied at retrieval, not after generation',
     'Chunking and parsing of heterogeneous formats',
     'Grounding with citations',
     'Refusal behaviour when nothing relevant is retrieved',
     'Evaluation of retrieval separate from answers']),

  q('i-spam', 'Design a spam filter', 'core', 'design',
    'Filter spam for a messaging product under adversarial pressure.',
    ['False positive cost?', 'How fast do attackers adapt?', 'Any user reporting?'],
    ['Adversarial adaptation as the central constraint',
     'Fast-updating rules alongside a slower model',
     'User reports as a label source, and their noise',
     'Precision priority because false positives lose messages',
     'Shadow evaluation before enforcement']),

  q('i-speech', 'Design speech transcription serving', 'hard', 'design',
    'Transcribe audio at scale, both streaming and batch.',
    ['Streaming or offline?', 'How many languages?', 'Accuracy target?'],
    ['Streaming vs batch as genuinely different systems',
     'Chunking with overlap for streaming, and boundary errors',
     'WER as the metric, with its limitations',
     'GPU batching for the offline path',
     'Fallback and retry for long audio']),

  q('i-image-search', 'Design visual search', 'hard', 'design',
    'Find visually similar products from a user photo.',
    ['Catalogue size?', 'Latency budget?', 'Is text also available?'],
    ['Embedding model plus ANN index',
     'Index type and its memory/recall tradeoff',
     'Multimodal fusion if text exists',
     'Query-image preprocessing and its failure modes',
     'Evaluation set of query/target pairs']),

  q('i-forecast', 'Forecast demand', 'core', 'design',
    'Predict daily demand per SKU per warehouse.',
    ['How many series?', 'Horizon?', 'What decision does it drive?'],
    ['Time-based splitting, never random',
     'Hierarchical structure across SKU and location',
     'Intermittent/sparse series handled',
     'Metric chosen for the decision (over- vs under-stocking cost)',
     'Baseline: last week, seasonal naive']),

  q('i-pricing', 'Design dynamic pricing', 'hard', 'design',
    'Set prices that respond to demand without a labelled ground truth.',
    ['Is there exploration budget?', 'Any fairness or legal constraint?', 'How fast can prices change?'],
    ['No counterfactual labels — this is a bandit, not supervised learning',
     'Exploration vs exploitation with a real cost',
     'Guardrails and price-change limits',
     'Fairness and legal constraints named explicitly',
     'Offline evaluation via off-policy estimation']),

  q('i-anomaly', 'Detect infrastructure anomalies', 'core', 'design',
    'Alert on abnormal service behaviour across thousands of metrics.',
    ['What is the alert budget?', 'Are there labels?', 'Seasonality?'],
    ['Unsupervised framing because anomalies are unlabelled',
     'Seasonality and deploy events as expected changes',
     'Alert fatigue as the real failure mode',
     'Per-metric vs joint modelling tradeoff',
     'Feedback from on-call to suppress known-benign patterns']),

  q('i-translate', 'Serve machine translation', 'core', 'design',
    'Translate user-generated content across 30 language pairs.',
    ['Latency budget?', 'Quality bar per language?', 'Volume skew?'],
    ['One multilingual model vs per-pair models, with the tradeoff',
     'Caching for repeated content',
     'Quality varying by pair and how you measure it',
     'Low-resource languages handled explicitly',
     'Fallback when a pair is unsupported']),

  q('i-autocomplete', 'Design search autocomplete', 'core', 'design',
    'Suggest completions within 50ms as the user types.',
    ['Personalised?', 'How fresh must suggestions be?', 'Any safety filtering?'],
    ['Latency budget ruling out a large model on the hot path',
     'Prefix index / trie plus a ranking signal',
     'Popularity with recency decay',
     'Safety filtering of suggestions',
     'Cold start for new or rare prefixes']),

  q('i-copilot', 'Design a code assistant', 'hard', 'design',
    'Suggest code completions inside an editor.',
    ['Latency budget?', 'How much context is available?', 'Is acceptance measured?'],
    ['Time-to-first-token as the metric that matters',
     'Context assembly from the open file and repository',
     'Acceptance rate as the online metric, with its bias',
     'Caching and speculative decoding as latency levers',
     'Privacy of code sent off-machine']),

  q('i-summarise', 'Summarise long documents', 'core', 'design',
    'Produce reliable summaries of documents longer than the context window.',
    ['How long are the documents?', 'Is faithfulness or brevity primary?', 'Any structure to exploit?'],
    ['Chunk-and-combine strategy, with its failure modes',
     'Faithfulness measured separately from fluency',
     'Hallucination detection or grounding',
     'Cost scaling with document length',
     'Evaluation without reference summaries']),

  q('i-guardrails', 'Design LLM guardrails', 'hard', 'design',
    'Prevent unsafe or off-topic outputs in a customer-facing assistant.',
    ['What is actually prohibited?', 'False positive tolerance?', 'Latency budget?'],
    ['Input and output filtering as separate stages',
     'Prompt injection treated as untrusted input',
     'Latency cost of an extra model on the path',
     'Escalation and refusal behaviour',
     'Red-teaming and a growing adversarial eval set']),

  q('i-personalise-email', 'Personalise send timing', 'core', 'design',
    'Choose when to send each user a notification.',
    ['What is the objective?', 'Any frequency cap?', 'Timezone handling?'],
    ['Per-user timing model vs global heuristic baseline',
     'Fatigue and frequency capping as a hard constraint',
     'Objective beyond opens — long-term retention',
     'Exploration to learn timing for new users',
     'Holdout group kept permanently']),

  q('i-vector-db', 'Choose and size a vector store', 'hard', 'design',
    'Pick the index for 100M embeddings under a 20ms budget.',
    ['Recall target?', 'Update rate?', 'Memory budget?'],
    ['HNSW vs IVF vs flat, with the recall/memory/latency tradeoff',
     'Memory footprint estimated from dimension and count',
     'Update and delete handling in the chosen index',
     'Recall measured against exact search',
     'Sharding when it exceeds one machine']),

  q('i-multimodal', 'Design multimodal retrieval', 'hard', 'design',
    'Search a video library by text query.',
    ['What granularity — clip or video?', 'Volume?', 'Latency?'],
    ['Frame/clip sampling strategy and its cost',
     'Joint embedding space vs separate indexes',
     'Temporal aggregation to a video-level score',
     'Storage and compute for indexing at scale',
     'Evaluation with real queries']),

  q('i-experiment-platform', 'Design an ML experiment platform', 'hard', 'design',
    'Let 50 engineers run and compare model experiments.',
    ['How many runs per day?', 'Shared compute?', 'Compliance needs?'],
    ['Run metadata, artefacts and lineage captured automatically',
     'Compute scheduling and quota between teams',
     'Comparability: same eval, same data version',
     'Reproducing a six-month-old run',
     'Cost visibility per team']),

  q('i-data-quality', 'Design data quality checks', 'core', 'design',
    'Stop bad upstream data from poisoning a production model.',
    ['How many sources?', 'Can you block a pipeline?', 'Who owns upstream?'],
    ['Schema, range, volume and null-rate checks',
     'Failing loudly vs degrading gracefully — chosen deliberately',
     'Distribution checks beyond schema validation',
     'Quarantine rather than silent drop',
     'Ownership and alerting to the upstream team']),

  q('i-onboard-model', 'Take a notebook to production', 'core', 'design',
    'A data scientist hands you a notebook that works. Ship it.',
    ['How is it retrained?', 'What are the dependencies?', 'Who owns it after?'],
    ['Notebook to reproducible pipeline as the first step',
     'Dependency and environment pinning',
     'Feature computation moved to a shared path',
     'Monitoring and ownership defined before launch',
     'The rollback story']),

  q('i-cost-cut', 'Halve inference cost', 'hard', 'design',
    'You are told to cut serving cost by 50% without users noticing.',
    ['Where does the cost actually go?', 'What quality drop is detectable?', 'Timeline?'],
    ['Measure before optimising — cost broken down by component',
     'Caching, batching, quantisation, smaller model, routing — ranked by effort',
     'Model routing by difficulty as a large lever',
     'Quality guarded by an eval, not by vibes',
     'A staged plan, not a single change']),

  q('i-migrate-model', 'Migrate to a new base model', 'hard', 'design',
    'Move a production LLM feature from one base model to another.',
    ['What changed — cost, quality, or availability?', 'Are prompts tuned to the old model?', 'Rollback window?'],
    ['Prompts being overfitted to the old model as the main risk',
     'A/B or shadow comparison on the real eval set',
     'Tokeniser and context window differences',
     'Staged rollout with a kill switch',
     'Cost and latency re-measured, not assumed']),
]

/* ------------------------------- assertions ------------------------------- */

const problems = []

const ids = (list) => list.map((x) => x.id)
const dup = (list, name) => {
  const seen = new Set()
  for (const id of ids(list)) {
    if (seen.has(id)) problems.push(`${name}: duplicate id "${id}"`)
    seen.add(id)
  }
}
dup(PRACTICE, 'practice')
dup(INTERVIEW, 'interview')

if (PRACTICE.length !== 50) problems.push(`practice bank has ${PRACTICE.length}, expected 50`)
if (INTERVIEW.length !== 24) problems.push(`interview bank has ${INTERVIEW.length}, expected 24`)

// The whole point: you must not practise the questions you are interviewed on.
const overlap = ids(PRACTICE).filter((id) => ids(INTERVIEW).includes(id))
if (overlap.length) problems.push(`banks overlap: ${overlap.join(', ')}`)

// Titles too — a different id with the same question is the same memory test.
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '')
const titleOverlap = PRACTICE.filter((p) => INTERVIEW.some((i) => norm(i.title) === norm(p.title)))
if (titleOverlap.length) {
  problems.push(`banks share titles: ${titleOverlap.map((t) => t.title).join(', ')}`)
}

for (const x of [...PRACTICE, ...INTERVIEW]) {
  if (x.rubric.length < 4) problems.push(`${x.id}: rubric has only ${x.rubric.length} points`)
  if (x.clarify.length < 3) problems.push(`${x.id}: fewer than 3 clarifying questions`)
}

if (problems.length) {
  console.error('GENERATION FAILED:')
  for (const p of problems) console.error('  - ' + p)
  process.exit(1)
}

/* --------------------------------- emit --------------------------------- */

const s = (x) => JSON.stringify(x)

const body = (list) =>
  list
    .map(
      (x) => `  {
    id: ${s(x.id)},
    title: ${s(x.title)},
    tier: ${s(x.tier)},
    family: ${s(x.family)},
    scope: ${s(x.scope)},
    clarify: [
${x.clarify.map((c) => `      ${s(c)},`).join('\n')}
    ],
    rubric: [
${x.rubric.map((c) => `      ${s(c)},`).join('\n')}
    ],
  },`,
    )
    .join('\n')

const interviewFile = `/**
 * AI/ML interview questions — the bank the AI interviewer draws from.
 *
 * DISJOINT from the practice bank in aimlPracticeBank.ts, asserted by the
 * generator. Practising the questions you are then interviewed on turns the
 * interview into a memory test.
 *
 * ML has no judge. Every question carries a rubric so you can grade yourself
 * after the attempt — that mechanism is the entire point.
 *
 * GENERATED by scripts/gen-aiml-practice.cjs — edit that, not this.
 */
import type { QTier, SdQuestion } from './sdPractice'

/**
 * Graded on every AI/ML question. Deliberately different from the system design
 * rubric: the failure modes here are about data, labels and feedback loops, not
 * about sharding.
 */
export const AIML_UNIVERSAL_RUBRIC: string[] = [
  'Framed it as a prediction task: named the input, the label, and the unit of prediction',
  'Named the offline metric you optimise AND the online metric the business cares about',
  'Said where training data and labels come from, including how delayed or biased they are',
  'Named the baseline you have to beat — ideally one with no ML in it',
  'Separated training from serving, and said what must hold in each',
  'Stated a latency and cost budget with numbers, and respected it later',
  'Said how you would detect this breaking in production when labels are missing or late',
]

export const AIML_INTERVIEW: SdQuestion[] = [
${body(INTERVIEW)}
]

export const AIML_TIERS: QTier[] = ['warmup', 'core', 'hard']

/** Rubric points for an AI/ML question: the shared framework plus its specifics. */
export function aimlRubric(question: SdQuestion): { text: string; universal: boolean }[] {
  return [
    ...AIML_UNIVERSAL_RUBRIC.map((text) => ({ text, universal: true })),
    ...question.rubric.map((text) => ({ text, universal: false })),
  ]
}
`

const practiceFile = `/**
 * The self-graded AI/ML practice bank — 50 questions.
 *
 * Four families, because they are genuinely different exercises:
 *   concept — can you explain the mechanism
 *   debug   — given a symptom, find the cause
 *   design  — ML system design, the closest thing to the real interview
 *   applied — cost, capacity and the decisions nobody teaches
 *
 * DISJOINT from AIML_INTERVIEW; the generator fails the build on any overlap of
 * ids or titles.
 *
 * GENERATED by scripts/gen-aiml-practice.cjs — edit that, not this.
 */
import type { SdQuestion } from './sdPractice'

export const AIML_PRACTICE_BANK: SdQuestion[] = [
${body(PRACTICE)}
]
`

fs.writeFileSync('src/data/aimlPractice.ts', interviewFile)
fs.writeFileSync('src/data/aimlPracticeBank.ts', practiceFile)

const byFamily = {}
for (const p of PRACTICE) byFamily[p.family] = (byFamily[p.family] || 0) + 1
console.log(`practice  ${PRACTICE.length}`, byFamily)
console.log(`interview ${INTERVIEW.length}`)

/**
 * Generates src/data/aiml.ts — the 130-day AI/ML engineering track.
 *
 *   OUT=data/aiml-raw.json node scripts/scrape-aiml-videos.cjs
 *   RAW=data/aiml-raw.json node scripts/gen-aiml-track.cjs > src/data/aiml.ts
 *
 * Video ids are NEVER typed here. Each day names a playlist key and a title
 * FRAGMENT; the fragment must match exactly one scraped video or the generator
 * exits non-zero. That rule exists because a hand-typed pass on the system
 * design track shipped 35 wrong ids out of 74.
 *
 * The track is infra-leaning on purpose. It is aimed at AI/ML *engineering*
 * roles — serving, retrieval, evaluation, pipelines — not at Kaggle placement.
 * Modelling still gets a full phase because you cannot serve what you cannot
 * reason about, but competitions are a side quest, not the spine.
 */
const fs = require('fs')

const raw = JSON.parse(fs.readFileSync(process.env.RAW || 'data/aiml-raw.json', 'utf8'))

/**
 * Channel names are NOT typed here. "State of GPT" sits in Karpathy's playlist
 * but was uploaded by Microsoft Developer, and that kind of mismatch is exactly
 * what a hand-written map gets wrong. The uploader is fetched from YouTube's
 * oEmbed endpoint at generation time instead.
 */
const https = require('https')

const oembed = (id) =>
  new Promise((resolve) => {
    const url = `https://www.youtube.com/oembed?url=https%3A//www.youtube.com/watch%3Fv%3D${id}&format=json`
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode !== 200) {
          res.resume()
          return resolve(null)
        }
        let d = ''
        res.on('data', (c) => (d += c))
        res.on('end', () => {
          try {
            resolve(JSON.parse(d))
          } catch (_) {
            resolve(null)
          }
        })
      })
      .on('error', () => resolve(null))
  })


const problems = []

/** Resolve a title fragment to exactly one scraped video. */
function v(list, fragment) {
  const pool = raw[list]
  if (!pool) {
    problems.push(`unknown playlist key "${list}"`)
    return null
  }
  // A leading ^ anchors to the start of the title, for the cases where one
  // video's title is a substring of another's ("Regression Trees, Clearly
  // Explained" also matches "How to Prune Regression Trees, Clearly Explained").
  const anchored = fragment.startsWith('^')
  const needle = (anchored ? fragment.slice(1) : fragment).toLowerCase()
  const hits = pool.filter((x) =>
    anchored ? x.title.toLowerCase().startsWith(needle) : x.title.toLowerCase().includes(needle),
  )
  if (hits.length !== 1) {
    problems.push(
      `"${fragment}" in ${list} matched ${hits.length} videos` +
        (hits.length > 1 ? ` (${hits.map((h) => h.title).join(' | ')})` : ''),
    )
    return null
  }
  const hit = hits[0]
  if (!hit.seconds) {
    problems.push(`"${hit.title}" in ${list} has no runtime`)
    return null
  }
  return { kind: 'video', id: hit.id, title: hit.title, seconds: hit.seconds, channel: null }
}

const r = (url, label, source) => ({ kind: 'reading', url, label, source })
const self = (text) => ({ kind: 'self', text })

const G = (slug, label) =>
  r(`https://developers.google.com/machine-learning/${slug}`, label, 'Google ML')
const HF = (path, label) =>
  r(`https://huggingface.co/learn/llm-course/${path}`, label, 'Hugging Face')
const MWL = (slug, label) =>
  r(`https://madewithml.com/courses/mlops/${slug}`, label, 'Made With ML')
const CH = (path, label) => r(`https://huyenchip.com/${path}`, label, 'Chip Huyen')
const EY = (slug, label) => r(`https://eugeneyan.com/writing/${slug}/`, label, 'Eugene Yan')
const KAG = (path, label) => r(`https://www.kaggle.com/${path}`, label, 'Kaggle')

/* ------------------------------------------------------------------ *
 * The curriculum. [topic, prompt, kind, resource]
 * `prompt` is the ONE question you should be able to answer when the
 * 20 minutes are up — the day is not "watched a video", it is that.
 * ------------------------------------------------------------------ */

const PHASES = [
  ['Foundations', [
    ['What ML actually is', 'When is ML the wrong tool, and what would you build instead?', 'concept', v('sqMachineLearning', 'A Gentle Introduction to Machine Learning')],
    ['Framing an ML problem', 'Turn a vague product ask into a prediction task with a label and a metric.', 'concept', G('problem-framing', 'Introduction to ML problem framing')],
    ['The first rule of ML', 'Why is the first version of almost every ML system supposed to have no ML in it?', 'concept', EY('first-rule-of-ml', 'The first rule of machine learning')],
    ['Rules of ML', 'Name three rules you would break first under deadline pressure, and the cost of each.', 'concept', G('guides/rules-of-ml', 'Rules of Machine Learning — best practices')],
    ['Vectors', 'What does a vector mean geometrically vs as a list of numbers?', 'concept', v('b3LinAlg', 'Vectors | Chapter 1')],
    ['Span and basis', 'What is a basis, and why does "span" decide whether a system has a solution?', 'concept', v('b3LinAlg', 'Linear combinations, span')],
    ['Linear transformations', 'Why is a matrix just a description of where the basis vectors land?', 'concept', v('b3LinAlg', 'Linear transformations and matrices')],
    ['Matrix multiplication', 'Why is matrix multiplication composition, and why is it not commutative?', 'concept', v('b3LinAlg', 'Matrix multiplication as composition')],
    ['Dot products', 'What does a dot product measure, and why does that make it a similarity score?', 'concept', v('b3LinAlg', 'Dot products and duality')],
    ['Eigenvectors', 'What survives a transformation unchanged in direction, and why does that matter for PCA?', 'concept', v('b3LinAlg', 'Eigenvectors and eigenvalues')],
    ['Derivatives', 'What is a derivative really measuring, and why is "instantaneous rate of change" a paradox?', 'concept', v('b3Calculus', 'The paradox of the derivative')],
    ['The chain rule', 'Why is the chain rule the entire reason backpropagation works?', 'concept', v('b3Calculus', 'Visualizing the chain rule')],
    ['Probability distributions', 'What does a distribution tell you that a mean does not?', 'concept', v('sqStatsFund', 'The Main Ideas behind Probability Distributions')],
    ['The normal distribution', 'Why does the normal distribution keep appearing, and when is assuming it wrong?', 'concept', v('sqStatsFund', 'The Normal Distribution, Clearly Explained')],
    ['Conditional probability', 'State P(A|B) in words for a concrete prediction problem.', 'concept', v('sqStatsFund', 'Conditional Probabilities')],
    ['Bayes theorem', 'Why does a 99%-accurate test for a rare disease still mostly produce false positives?', 'concept', v('sqStatsFund', "Bayes' Theorem, Clearly Explained")],
    ['Expected values', 'How would you use expected value to decide whether a model is worth shipping?', 'concept', v('sqStatsFund', 'Expected Values, Main Ideas')],
    ['Maximum likelihood', 'What is being maximised, and how is that different from minimising error?', 'concept', v('sqStatsFund', 'Maximum Likelihood, clearly explained')],
  ]],

  ['Classical ML', [
    ['Least squares', 'Why squared error and not absolute error?', 'concept', v('sqMachineLearning', 'The Main Ideas of Fitting a Line to Data')],
    ['Linear regression', 'What assumptions does linear regression make, and which one breaks first in practice?', 'concept', v('sqMachineLearning', 'Linear Regression, Clearly Explained')],
    ['R-squared', 'What does R-squared not tell you about a model?', 'concept', v('sqStatsFund', 'R-squared, Clearly Explained')],
    ['Multiple regression', 'What goes wrong when two features are highly correlated?', 'concept', v('sqMachineLearning', 'Multiple Regression, Clearly Explained')],
    ['Odds and log-odds', 'Why do we model log-odds instead of probability directly?', 'concept', v('sqLogistic', 'Odds and Log(Odds), Clearly Explained')],
    ['Logistic regression', 'Why is it called regression when it does classification?', 'concept', v('sqLogistic', 'StatQuest: Logistic Regression')],
    ['Interpreting coefficients', 'Given a fitted coefficient, state its effect on the odds in plain English.', 'concept', v('sqLogistic', 'Details Pt1: Coefficients')],
    ['Fitting by likelihood', 'Why can logistic regression not be fitted with least squares?', 'concept', v('sqLogistic', 'Details Pt 2: Maximum Likelihood')],
    ['Bias and variance', 'Diagnose: training error low, validation error high. What is it, and what do you change?', 'concept', v('sqMachineLearning', 'Bias and Variance')],
    ['Cross validation', 'Why is a single train/test split not enough, and when does k-fold still lie to you?', 'concept', v('sqMachineLearning', 'Cross Validation')],
    ['Confusion matrix', 'Write out the four cells for a fraud detector and say which error costs more.', 'concept', v('sqMachineLearning', 'The Confusion Matrix')],
    ['Precision and recall', 'Your model is 99% accurate on 1% positives. Why is that number meaningless?', 'concept', v('sqMachineLearning', 'Sensitivity and Specificity')],
    ['ROC and AUC', 'When is a PR curve the honest choice over ROC?', 'concept', v('sqMachineLearning', 'ROC and AUC, Clearly Explained')],
    ['Metrics review', 'No new material — pick a metric for each: fraud, search ranking, churn, ad click. Justify each.', 'review', self('For each of fraud detection, search ranking, churn prediction and ad click prediction: name the metric you would optimise, the metric you would monitor, and the metric a stakeholder will wrongly ask for.')],
    ['Overfitting', 'What is the difference between a model that overfits and one that leaks?', 'concept', G('crash-course/overfitting', 'Overfitting, generalisation and the train/test split')],
    ['Ridge regression', 'What does the L2 penalty do to coefficients, and why does that help?', 'concept', v('sqMachineLearning', 'Regularization Part 1: Ridge')],
    ['Lasso regression', 'Why does L1 drive coefficients to exactly zero when L2 does not?', 'concept', v('sqMachineLearning', 'Regularization Part 2: Lasso')],
    ['Choosing a penalty', 'Given 10,000 features and 500 rows, which penalty and why?', 'concept', v('sqMachineLearning', 'Ridge vs Lasso Regression, Visualized')],
    ['Decision trees', 'How does a tree choose a split, and why does that make it greedy?', 'concept', v('sqMachineLearning', 'Decision and Classification Trees')],
    ['Regression trees', 'How does a tree predict a continuous value when it only makes splits?', 'concept', v('sqMachineLearning', '^Regression Trees, Clearly Explained')],
    ['Pruning', 'Why does an unpruned tree always overfit, and how does cost-complexity pruning fix it?', 'concept', v('sqMachineLearning', 'How to Prune Regression Trees')],
    ['Random forests', 'Why do bagging and random feature selection together beat one deep tree?', 'concept', v('sqRandomForest', 'Part 1 - Building, Using and Evaluating')],
    ['AdaBoost', 'What does boosting do differently from bagging?', 'concept', v('sqMachineLearning', 'AdaBoost, Clearly Explained')],
    ['Gradient boosting', 'What exactly is each successive tree fitting?', 'concept', v('sqGradientBoost', 'Part 1 (of 4): Regression Main Ideas')],
    ['Boosting for classification', 'How does gradient boosting produce a probability?', 'concept', v('sqGradientBoost', 'Part 3 (of 4): Classification')],
    ['XGBoost', 'Why is XGBoost still the default for tabular data in production?', 'concept', v('sqXGBoost', 'Part 1 (of 4): Regression')],
    ['XGBoost internals', 'Name two engineering tricks that make XGBoost fast, not just accurate.', 'concept', v('sqXGBoost', 'Part 4 (of 4): Crazy Cool Optimizations')],
    ['Encoding categoricals', 'Why does target encoding leak, and how does k-fold target encoding stop it?', 'concept', v('sqMachineLearning', 'One-Hot, Label, Target and K-Fold Target Encoding')],
    ['Numerical features', 'When is normalisation required, and when is it pointless?', 'concept', G('crash-course/numerical-data', 'Working with numerical data')],
    ['Applied: your first competition', 'Submit once. The score does not matter; the pipeline does.', 'applied', KAG('competitions/titanic', 'Titanic — a two-hour end-to-end baseline')],
  ]],

  ['Deep Learning', [
    ['What a neural network is', 'What is a single neuron computing, and why does depth add power?', 'concept', v('b3NeuralNets', 'But what is a neural network?')],
    ['Gradient descent', 'Why is the loss surface high-dimensional, and why does that not stop us?', 'concept', v('b3NeuralNets', 'Gradient descent, how neural networks learn')],
    ['Backpropagation', 'Explain backprop as message-passing without writing a single derivative.', 'concept', v('b3NeuralNets', 'Backpropagation, intuitively')],
    ['Backprop calculus', 'Write the chain rule for one weight in a two-layer network.', 'concept', v('b3NeuralNets', 'Backpropagation calculus')],
    ['Networks, concretely', 'Redo the same idea in a different voice — what clicked that did not before?', 'concept', v('sqDeepLearning', 'The Essential Main Ideas of Neural Networks')],
    ['Activation functions', 'Why does ReLU beat sigmoid in deep networks?', 'concept', v('sqDeepLearning', 'Pt. 3: ReLU In Action')],
    ['Multiple inputs and outputs', 'How does the shape of the weight matrix follow from the layer sizes?', 'concept', v('sqDeepLearning', 'Pt. 4: Multiple Inputs and Outputs')],
    ['Softmax', 'Why softmax and not just normalising the raw scores?', 'concept', v('sqDeepLearning', 'Part 5: ArgMax and SoftMax')],
    ['Cross-entropy loss', 'Why is cross-entropy the natural loss for a classifier?', 'concept', v('sqDeepLearning', 'Part 6: Cross Entropy')],
    ['Stochastic gradient descent', 'Why is a noisy gradient on a small batch better than an exact one?', 'concept', v('sqMachineLearning', 'Stochastic Gradient Descent')],
    ['Tensors', 'What is a tensor beyond "a multi-dimensional array"?', 'concept', v('sqDeepLearning', 'Tensors for Neural Networks')],
    ['Matrix algebra for networks', 'Why is a forward pass one big matrix multiply, and why does the GPU care?', 'concept', v('sqDeepLearning', 'Essential Matrix Algebra')],
    ['Training review', 'No new material — trace one training step end to end from memory.', 'review', self('On paper, take a 2-input, 1-hidden-layer, 1-output network and trace one full step: forward pass, loss, backward pass, weight update. Then state what changes if you double the batch size, and what changes if you double the learning rate.')],
    ['Convolutional networks', 'Why does weight sharing make a CNN work on images when a dense net does not?', 'concept', v('sqDeepLearning', 'Part 8: Image Classification')],
    ['Word embeddings', 'How does a model learn that "king" and "queen" are related without being told?', 'concept', v('sqDeepLearning', 'Word Embedding and Word2Vec')],
    ['Embeddings in production', 'What makes an embedding good, and how would you check that it is?', 'concept', G('crash-course/embeddings', 'Embeddings — from sparse to dense')],
    ['Recurrent networks', 'Why does an RNN struggle with long sequences?', 'concept', v('sqDeepLearning', 'Recurrent Neural Networks (RNNs)')],
    ['LSTMs', 'What problem do the gates solve that a plain RNN cannot?', 'concept', v('sqDeepLearning', '(LSTM), Clearly Explained')],
    ['Encoder-decoder', 'Why is compressing a whole sentence into one vector a bottleneck?', 'concept', v('sqDeepLearning', 'Sequence-to-Sequence')],
    ['Attention', 'What does attention let the decoder do that a fixed context vector cannot?', 'concept', v('sqDeepLearning', 'Attention for Neural Networks')],
    ['Transformers', 'Why did dropping recurrence entirely make training faster?', 'concept', v('b3NeuralNets', 'Transformers, the tech behind LLMs')],
    ['Self-attention, step by step', 'Explain query, key and value in one sentence each.', 'concept', v('b3NeuralNets', 'Attention in transformers')],
    ['Transformer matrix math', 'What are the actual shapes flowing through an attention head?', 'concept', v('sqDeepLearning', 'The matrix math behind transformer')],
    ['Decoder-only models', 'Why is causal masking the whole difference between GPT and BERT?', 'concept', v('sqDeepLearning', 'Decoder-Only Transformers')],
    ['Encoder-only models', 'Why is an encoder-only model the right choice for retrieval?', 'concept', v('sqDeepLearning', 'Encoder-Only Transformers')],
    ['How transformers work', 'Consolidate: architecture families and what each is for.', 'concept', HF('chapter1/4', 'How do Transformers work?')],
  ]],

  ['LLMs', [
    ['LLMs, briefly', 'In one paragraph, what is an LLM actually doing at inference time?', 'concept', v('b3NeuralNets', 'Large Language Models explained briefly')],
    ['Architecture families', 'Encoder, decoder, encoder-decoder — pick one per task and justify it.', 'concept', HF('chapter1/6', 'Transformer architectures')],
    ['Tokenisation', 'Why does the tokeniser decide your context cost and your bill?', 'concept', HF('chapter2/4', 'Tokenizers')],
    ['Byte-pair encoding', 'Walk through BPE merging on a short word.', 'concept', HF('chapter6/5', 'Byte-Pair Encoding tokenization')],
    ['Tokenisation, deeply', 'Weekend session — why so many LLM bugs are really tokeniser bugs.', 'concept', v('karpathyZ2H', "Let's build the GPT Tokenizer")],
    ['LLMs in the crash course', 'What does the Google framing add that the videos did not?', 'concept', G('crash-course/llm', 'Large language models — the crash course unit')],
    ['Sampling and decoding', 'Temperature, top-k, top-p — what does each actually change?', 'concept', CH('2024/01/16/sampling.html', 'Sampling for text generation')],
    ['Where knowledge lives', 'If facts live in the MLP layers, what does that imply for fine-tuning?', 'concept', v('b3NeuralNets', 'How might LLMs store facts')],
    ['RLHF', 'What is the reward model, and where does it come from?', 'concept', v('sqDeepLearning', 'Reinforcement Learning with Human Feedback')],
    ['RLHF in depth', 'Why is RLHF unstable, and what is DPO trying to avoid?', 'concept', CH('2023/05/02/rlhf.html', 'RLHF — reinforcement learning from human feedback')],
    ['LLM review', 'No new material — write the inference path from prompt to token.', 'review', self('Write, from memory, the full path of a request through an LLM: text to tokens, tokens to embeddings, attention layers, logits, sampling, detokenisation. At each stage name one thing that could make it slow and one that could make it wrong.')],
    ['Building with LLMs', 'What breaks when you move an LLM prototype into production?', 'concept', CH('2023/04/11/llm-engineering.html', 'Building LLM applications for production')],
    ['Prompting', 'Which prompting techniques survive contact with evaluation?', 'concept', EY('prompting', 'Prompting fundamentals and how to apply them')],
    ['Fine-tuning', 'When is fine-tuning the right answer instead of retrieval or prompting?', 'concept', EY('finetuning', 'When and how to fine-tune')],
    ['Supervised fine-tuning', 'What does an SFT dataset look like, concretely?', 'concept', HF('chapter11/1', 'Supervised fine-tuning')],
    ['Quantisation', 'Weekend session — how does int8 not destroy the model?', 'concept', v('umarJamil', 'Quantization explained with PyTorch')],
    ['Preference optimisation', 'Weekend session — DPO without a separate reward model.', 'concept', v('umarJamil', 'Direct Preference Optimization')],
    ['LLM patterns', 'Name the seven patterns and which one you would reach for first.', 'concept', EY('llm-patterns', 'Patterns for building LLM systems')],
    ['Pitfalls', 'Which of these mistakes were you about to make?', 'concept', CH('2025/01/16/ai-engineering-pitfalls.html', 'Common AI engineering pitfalls')],
    ['Agents', 'What makes an agent different from a loop with tool calls?', 'concept', CH('2025/01/07/agents.html', 'Agents — planning, tools and failure modes')],
    ['Build GPT from scratch', 'Weekend session — the single most valuable code-along in this track.', 'concept', v('karpathyZ2H', "Let's build GPT: from scratch")],
    ['State of GPT', 'Map the training stages: pretraining, SFT, reward modelling, RL.', 'concept', v('karpathyZ2H', 'State of GPT')],
  ]],

  ['Retrieval & Evaluation', [
    ['Cosine similarity', 'Why cosine and not Euclidean distance for embeddings?', 'concept', v('sqMachineLearning', 'Cosine Similarity')],
    ['RAG end to end', 'Weekend session — every component of a RAG pipeline and what each costs.', 'concept', v('umarJamil', 'Retrieval Augmented Generation (RAG) Explained')],
    ['Query matching', 'Why does lexical search still beat embeddings on some queries?', 'concept', EY('search-query-matching', 'Search query matching — lexical and semantic')],
    ['Retrieval architecture', 'Draw the two-stage retrieve-then-rank pattern and say why it exists.', 'concept', EY('system-design-for-discovery', 'System design for search and recommendations')],
    ['Design patterns', 'Which patterns recur across every discovery system?', 'concept', EY('design-patterns', 'Design patterns in machine learning systems')],
    ['Real-time recommendations', 'What has to be precomputed and what cannot be?', 'concept', EY('real-time-recommendations', 'Real-time recommendations — how they are served')],
    ['Position bias', 'Why is click data a biased training signal, and how do you correct it?', 'concept', EY('position-bias', 'Position bias in ranking data')],
    ['Counterfactual evaluation', 'How do you evaluate a ranker offline without shipping it?', 'concept', EY('counterfactual-evaluation', 'Counterfactual evaluation and off-policy estimation')],
    ['Evaluating generation', 'Why are BLEU and ROUGE weak, and what replaces them?', 'concept', EY('abstractive', 'Evaluation metrics for text generation')],
    ['Evals', 'What does a good eval set look like, and how do you build one from nothing?', 'concept', EY('evals', 'Task-specific evals that actually work')],
    ['LLM-as-judge', 'When can a model grade a model, and how do you check the grader?', 'concept', EY('llm-evaluators', 'LLM evaluators — how well do they work?')],
    ['Evaluation in the pipeline', 'Where does evaluation sit in a real training pipeline?', 'concept', MWL('evaluation/', 'Evaluation — beyond a single metric')],
    ['Evaluation review', 'No new material — design an eval harness on paper.', 'review', self('Design the eval harness for a support-ticket summariser: what goes in the eval set, how many examples, who labels them, what the offline metric is, what the online metric is, and what regression gate blocks a deploy.')],
    ['The GenAI platform', 'Draw the reference architecture, layer by layer, and say what you would build first.', 'concept', CH('2024/07/25/genai-platform.html', 'Building a generative AI platform')],
  ]],

  ['Serving & Inference', [
    ['Production ML systems', 'What fraction of an ML system is actually the model?', 'concept', G('crash-course/production-ml-systems', 'Production ML systems — the components')],
    ['ML systems design', 'What does a design doc for an ML system contain that a backend one does not?', 'concept', MWL('systems-design', 'ML systems design')],
    ['Serving models', 'Batch vs online vs streaming — pick one per use case and justify it.', 'concept', MWL('serving/', 'Serving — batch and online inference')],
    ['Jobs and services', 'What is the difference between a training job and a serving service operationally?', 'concept', MWL('jobs-and-services/', 'Jobs and services')],
    ['Compilers and optimisers', 'What does a compiler do to a model graph, and why does it make inference faster?', 'concept', CH('2021/09/07/a-friendly-introduction-to-machine-learning-compilers-and-optimizers.html', 'ML compilers and optimisers')],
    ['Distributed data', 'When does your data stop fitting on one machine, and what changes?', 'concept', MWL('distributed-data/', 'Distributed data processing')],
    ['Distributed training', 'Weekend session — what DDP actually synchronises, and when.', 'concept', v('umarJamil', 'Distributed Data Parallel (DDP)')],
    ['Real-time ML', 'What are the two levels of "real-time", and which one are you actually being asked for?', 'concept', CH('2020/12/27/real-time-machine-learning.html', 'Real-time machine learning')],
    ['Real-time, in practice', 'Which of these challenges would bite you first?', 'concept', CH('2022/01/02/real-time-machine-learning-challenges-and-solutions.html', 'Real-time ML — challenges and solutions')],
    ['Stream processing', 'Why is a stream not just a fast batch?', 'concept', CH('2022/08/03/stream-processing-for-data-scientists.html', 'Stream processing for ML')],
    ['Feature stores', 'What problem does a feature store solve that a database does not?', 'concept', EY('feature-stores', 'Feature stores — what they are for')],
    ['Training/serving skew', 'Name the exact mechanism by which offline and online features drift apart.', 'concept', CH('2023/01/08/self-serve-feature-platforms.html', 'Self-serve feature platforms')],
  ]],

  ['Production & MLOps', [
    ['What MLOps is', 'Which parts of MLOps are real engineering and which are vendor marketing?', 'concept', CH('2020/06/22/mlops.html', 'MLOps — what it is and why it is hard')],
    ['Experiment tracking', 'What has to be recorded for a training run to be reproducible?', 'concept', MWL('experiment-tracking/', 'Experiment tracking')],
    ['Versioning', 'Code, data, model — which is hardest to version, and why?', 'concept', MWL('versioning/', 'Versioning code, data and models')],
    ['Testing ML', 'What can you assert about a model that is not just "accuracy went up"?', 'concept', MWL('testing/', 'Testing data, code and models')],
    ['Behavioural tests', 'Write three invariance tests for a sentiment classifier.', 'concept', EY('testing-ml', 'Writing tests for ML systems')],
    ['Monitoring', 'What do you alert on when there are no labels in production?', 'concept', MWL('monitoring/', 'Monitoring machine learning systems')],
    ['Data distribution shift', 'Distinguish covariate shift, label shift and concept drift with an example each.', 'concept', CH('2022/02/07/data-distribution-shifts-and-monitoring.html', 'Data distribution shifts and monitoring')],
    ['ML design docs', 'Write the one-page design doc you would bring to a review.', 'concept', EY('ml-design-docs', 'ML design docs — what goes in them')],
  ]],
]

/* --------------------------- assemble --------------------------- */

async function main() {
 const days = []
for (const [phase, entries] of PHASES) {
  for (const [topic, prompt, kind, res] of entries) {
    days.push({ day: days.length + 1, phase, topic, prompt, kind, res })
  }
}

 // Fill in each video's real uploader from oEmbed. A dead id fails here too.
 for (const d of days) {
   if (d.res && d.res.kind === 'video') {
     const meta = await oembed(d.res.id)
     if (!meta) {
       problems.push(`day ${d.day}: video ${d.res.id} did not resolve via oEmbed`)
       continue
     }
     d.res.channel = meta.author_name
   }
 }

 const EXPECTED = 130
if (days.length !== EXPECTED) {
  problems.push(`expected ${EXPECTED} days, built ${days.length}`)
}

// A day with no resource is a day you will skip.
for (const d of days) {
  if (!d.res) problems.push(`day ${d.day} (${d.topic}) has no resource`)
}

// Two days pointing at the same video is a copy-paste slip, not a plan.
const seenVideo = new Map()
for (const d of days) {
  if (d.res && d.res.kind === 'video') {
    if (seenVideo.has(d.res.id)) {
      problems.push(`day ${d.day} reuses the video from day ${seenVideo.get(d.res.id)}`)
    }
    seenVideo.set(d.res.id, d.day)
  }
}

if (problems.length) {
  console.error('GENERATION FAILED:')
  for (const p of problems) console.error('  - ' + p)
  process.exit(1)
}

/* ----------------------------- emit ----------------------------- */

const s = (x) => JSON.stringify(x)
const out = []

out.push(`/**
 * A 130-day AI/ML engineering track, built to run ALONGSIDE the DSA plan at
 * roughly 20 minutes a day. Like the system design track it is a queue, not a
 * calendar: no dates, nothing is ever "missed". DSA is the priority; this is
 * the thread that runs beside it.
 *
 * INFRA-LEANING ON PURPOSE. The target is AI/ML *engineering* — serving,
 * retrieval, evaluation, pipelines, monitoring — not Kaggle placement. Nobody
 * hires an ML infrastructure engineer on competition rank. Modelling still gets
 * a full phase, because you cannot serve or debug what you cannot reason about,
 * but competitions are a side quest (see AIML_PLATFORMS) rather than the spine.
 *
 * EVERY DAY POINTS AT ONE SPECIFIC THING, and carries the ONE question you
 * should be able to answer when the time is up. A day is not "watched a video".
 *
 * Anything longer than ${'`LONG_SESSION_SECONDS`'} is flagged as a weekend session rather
 * than pretending a 133-minute Karpathy lecture fits a weeknight.
 *
 * GENERATED by scripts/gen-aiml-track.cjs — edit that, not this. Video ids are
 * resolved from scraped playlist data by title fragment and must match exactly
 * one video or the generator fails. Every article URL was checked for a 200.
 */
import type { SdReading, SdVideo } from './systemDesign'

/** The AIML track reuses the system design track's day shape deliberately —
 *  same UI, same progress model, same 20-minute contract. */
export type AimlKind = 'concept' | 'applied' | 'review'

export interface AimlDay {
  day: number
  phase: string
  topic: string
  /** The single question you should be able to answer when the time is up. */
  prompt: string
  kind: AimlKind
  video?: SdVideo
  reading?: SdReading
  /** Set when the day is self-testing with nothing new to watch. */
  selfWork?: string
}

export const AIML_TRACK: AimlDay[] = [`)

for (const d of days) {
  const lines = [
    `  {`,
    `    day: ${d.day},`,
    `    phase: ${s(d.phase)},`,
    `    topic: ${s(d.topic)},`,
    `    prompt: ${s(d.prompt)},`,
    `    kind: ${s(d.kind)},`,
  ]
  if (d.res.kind === 'video') {
    lines.push(
      `    video: { id: ${s(d.res.id)}, title: ${s(d.res.title)}, seconds: ${d.res.seconds}, channel: ${s(d.res.channel)} },`,
    )
  } else if (d.res.kind === 'reading') {
    lines.push(
      `    reading: { label: ${s(d.res.label)}, url: ${s(d.res.url)}, source: ${s(d.res.source)} },`,
    )
  } else {
    lines.push(`    selfWork: ${s(d.res.text)},`)
  }
  lines.push(`  },`)
  out.push(lines.join('\n'))
}

out.push(`]

export const AIML_TOTAL_DAYS = AIML_TRACK.length
export const AIML_PHASES = ${s(PHASES.map(([p]) => p))}

/**
 * Where the hands-on work actually happens. These are NOT 20-minute tasks and
 * they are not part of the daily thread — reading about serving does not teach
 * you serving. Do one on a weekend when DSA allows, or save the lot for January
 * when the DSA plan ends.
 *
 * Every lab names the ACTUAL PLACE the work happens — the dataset page, the
 * library docs, a notebook you can open right now — plus the literal first
 * command to run. A lab that is only a description of a lab is just another
 * practice question, and you will not do it.
 */
export type LabResourceKind = 'dataset' | 'tool' | 'guide' | 'notebook'

export interface AimlLabResource {
  label: string
  url: string
  source: string
  kind: LabResourceKind
}

export interface AimlLab {
  id: string
  title: string
  /** Rough sitting, in hours, so you can tell a Saturday from an evening. */
  hours: number
  goal: string
  /** What has to be true for this to count as done. Ticked individually. */
  done: string[]
  after: number
  /** Open one of these to start. The first is the one to open first. */
  resources: AimlLabResource[]
  /** The literal first thing to do, so there is no blank-page problem. */
  firstStep: string
}

export const AIML_LABS: AimlLab[] = [
  {
    id: 'baseline',
    title: 'A no-ML baseline',
    hours: 2,
    goal: 'Solve a prediction task with rules only, and record the score you have to beat.',
    done: [
      'A heuristic that makes a prediction for every row',
      'A held-out score written down before any model is trained',
      'One paragraph on what the heuristic gets wrong',
    ],
    after: 4,
    resources: [
      { label: 'Titanic — download train.csv', url: 'https://www.kaggle.com/competitions/titanic/data', source: 'Kaggle', kind: 'dataset' },
      { label: 'Open a blank notebook', url: 'https://colab.research.google.com/', source: 'Google Colab', kind: 'notebook' },
      { label: 'Intro to Machine Learning', url: 'https://www.kaggle.com/learn/intro-to-machine-learning', source: 'Kaggle Learn', kind: 'guide' },
    ],
    firstStep: 'Predict survived = (Sex is female). Score it. That is the number to beat.',
  },
  {
    id: 'tabular',
    title: 'Gradient boosting, end to end',
    hours: 4,
    goal: 'Beat your baseline with XGBoost on a real tabular dataset, honestly.',
    done: [
      'Cross-validated score, not a single split',
      'A leakage check you ran deliberately',
      'Feature importances you can explain out loud',
    ],
    after: 48,
    resources: [
      { label: 'House Prices — the dataset', url: 'https://www.kaggle.com/competitions/house-prices-advanced-regression-techniques', source: 'Kaggle', kind: 'dataset' },
      { label: 'XGBoost — get started', url: 'https://xgboost.readthedocs.io/en/stable/get_started.html', source: 'XGBoost docs', kind: 'tool' },
      { label: 'Cross-validation, properly', url: 'https://scikit-learn.org/stable/modules/cross_validation.html', source: 'scikit-learn', kind: 'guide' },
      { label: 'Intermediate Machine Learning', url: 'https://www.kaggle.com/learn/intermediate-machine-learning', source: 'Kaggle Learn', kind: 'guide' },
    ],
    firstStep: 'pip install xgboost scikit-learn pandas',
  },
  {
    id: 'train-nn',
    title: 'Train a network from scratch',
    hours: 4,
    goal: 'Implement forward and backward passes by hand, then check against a framework.',
    done: [
      'Manual gradients match autograd to a small tolerance',
      'Loss curve that actually decreases',
      'One bug you found and what it looked like',
    ],
    after: 62,
    resources: [
      { label: 'micrograd — the whole engine, 100 lines', url: 'https://github.com/karpathy/micrograd', source: 'karpathy', kind: 'tool' },
      { label: 'Autograd — the PyTorch tutorial', url: 'https://pytorch.org/tutorials/beginner/blitz/autograd_tutorial.html', source: 'PyTorch', kind: 'guide' },
      { label: 'torch.autograd — gradcheck', url: 'https://pytorch.org/docs/stable/autograd.html', source: 'PyTorch docs', kind: 'guide' },
      { label: 'Notebook with a free GPU', url: 'https://colab.research.google.com/', source: 'Google Colab', kind: 'notebook' },
    ],
    firstStep: 'git clone https://github.com/karpathy/micrograd',
  },
  {
    id: 'serve',
    title: 'Serve a model behind an API',
    hours: 3,
    goal: 'Put a trained model behind HTTP and measure it under load.',
    done: [
      'p50 and p99 latency measured, not guessed',
      'A load test that finds the throughput ceiling',
      'Model loading kept out of the request path',
    ],
    after: 113,
    resources: [
      { label: 'FastAPI — build the endpoint', url: 'https://fastapi.tiangolo.com/', source: 'FastAPI', kind: 'tool' },
      { label: 'Lifespan events — load the model once', url: 'https://fastapi.tiangolo.com/advanced/events/', source: 'FastAPI', kind: 'guide' },
      { label: 'Locust — write the load test', url: 'https://docs.locust.io/en/stable/quickstart.html', source: 'Locust', kind: 'tool' },
      { label: 'Uvicorn — the server to run it on', url: 'https://github.com/encode/uvicorn', source: 'encode', kind: 'tool' },
    ],
    firstStep: 'pip install fastapi uvicorn locust',
  },
  {
    id: 'batching',
    title: 'Add dynamic batching',
    hours: 3,
    goal: 'Trade latency for throughput on purpose, and show the curve.',
    done: [
      'Throughput vs batch size plotted',
      'The latency cost of batching stated in ms',
      'A max-wait bound so a single request cannot starve',
    ],
    after: 113,
    resources: [
      { label: 'Continuous batching — read this first', url: 'https://www.anyscale.com/blog/continuous-batching-llm-inference', source: 'Anyscale', kind: 'guide' },
      { label: 'Ray Serve — batching in a decorator', url: 'https://docs.ray.io/en/latest/serve/advanced-guides/dyn-req-batch.html', source: 'Ray', kind: 'tool' },
      { label: 'vLLM — batching done for you', url: 'https://docs.vllm.ai/en/latest/', source: 'vLLM', kind: 'tool' },
    ],
    firstStep: 'pip install ray[serve] — then wrap the handler in @serve.batch',
  },
  {
    id: 'rag',
    title: 'Build a RAG pipeline',
    hours: 5,
    goal: 'Index a corpus you care about and answer questions over it.',
    done: [
      'Chunking strategy chosen deliberately, with the reason written down',
      'Retrieval quality measured separately from answer quality',
      'A query it gets wrong, and your diagnosis of which stage failed',
    ],
    after: 98,
    resources: [
      { label: 'sentence-transformers — make the embeddings', url: 'https://sbert.net/', source: 'SBERT', kind: 'tool' },
      { label: 'Chroma — the easiest vector store to start on', url: 'https://docs.trychroma.com/', source: 'Chroma', kind: 'tool' },
      { label: 'FAISS — for when Chroma gets slow', url: 'https://github.com/facebookresearch/faiss', source: 'Meta', kind: 'tool' },
      { label: 'LlamaIndex — the pipeline assembled', url: 'https://docs.llamaindex.ai/en/stable/', source: 'LlamaIndex', kind: 'guide' },
      { label: 'A corpus to index', url: 'https://huggingface.co/datasets', source: 'Hugging Face', kind: 'dataset' },
    ],
    firstStep: 'pip install sentence-transformers chromadb',
  },
  {
    id: 'evals',
    title: 'Write an eval harness',
    hours: 4,
    goal: 'Make model quality a number your CI can block on.',
    done: [
      'At least 50 labelled examples you built yourself',
      'A scoring function that runs headless',
      'A regression gate with a threshold you can defend',
    ],
    after: 110,
    resources: [
      { label: 'promptfoo — a gate in one config file', url: 'https://www.promptfoo.dev/docs/intro/', source: 'promptfoo', kind: 'tool' },
      { label: 'Ragas — metrics built for RAG', url: 'https://docs.ragas.io/en/stable/', source: 'Ragas', kind: 'tool' },
      { label: 'Phoenix — trace and evaluate locally', url: 'https://docs.arize.com/phoenix', source: 'Arize', kind: 'tool' },
      { label: 'openai/evals — the registry pattern', url: 'https://github.com/openai/evals', source: 'OpenAI', kind: 'guide' },
    ],
    firstStep: 'npx promptfoo@latest init',
  },
  {
    id: 'monitor',
    title: 'Detect drift',
    hours: 3,
    goal: 'Alert on a distribution shift with no labels available.',
    done: [
      'A drift statistic computed on a rolling window',
      'A deliberately shifted input set that fires the alert',
      'A false-positive case you tuned out, and how',
    ],
    after: 129,
    resources: [
      { label: 'Evidently — drift reports out of the box', url: 'https://docs.evidentlyai.com/', source: 'Evidently', kind: 'tool' },
      { label: 'What drift actually means', url: 'https://www.evidentlyai.com/blog/machine-learning-monitoring-data-and-concept-drift', source: 'Evidently', kind: 'guide' },
      { label: 'NannyML — estimate performance without labels', url: 'https://nannyml.readthedocs.io/en/stable/', source: 'NannyML', kind: 'tool' },
      { label: 'ks_2samp — the statistic, by hand', url: 'https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ks_2samp.html', source: 'SciPy', kind: 'guide' },
    ],
    firstStep: 'pip install evidently',
  },
]

/**
 * External practice, ranked by how much it actually moves an AI/ML engineering
 * interview. Kaggle is here — but placed honestly. It trains modelling, which
 * is one phase of this track, not the target role.
 */
export interface AimlPlatform {
  name: string
  url: string
  what: string
  /** Straight answer on how much this matters for the roles being targeted. */
  worth: string
}

export const AIML_PLATFORMS: AimlPlatform[] = [
  {
    name: 'Kaggle Learn',
    url: 'https://www.kaggle.com/learn',
    what: 'Short hands-on micro-courses with a notebook per lesson.',
    worth: 'Good for the Classical ML phase. Cheapest way to get your hands dirty.',
  },
  {
    name: 'Kaggle Competitions',
    url: 'https://www.kaggle.com/competitions',
    what: 'Ranked modelling contests on real datasets.',
    worth: 'Do two, then stop. Rank is near-irrelevant for infra roles, but one finished pipeline is a real portfolio piece.',
  },
  {
    name: 'Hugging Face',
    url: 'https://huggingface.co/learn',
    what: 'Models, datasets, and the LLM course this track links into.',
    worth: 'High. This is the toolchain the job actually uses.',
  },
  {
    name: 'Made With ML',
    url: 'https://madewithml.com/',
    what: 'An MLOps course built around one production system.',
    worth: 'High. The closest thing to the day job of an ML engineer.',
  },
  {
    name: 'Papers with Code alternatives',
    url: 'https://paperswithcode.com/',
    what: 'Benchmarks and implementations, when it is up.',
    worth: 'Low priority. Useful for orientation, not for interview prep.',
  },
]

/** Shown once at the top of the track rather than repeated on every day. */
export const AIML_GENERAL: SdReading[] = [
  { label: 'Rules of Machine Learning', url: 'https://developers.google.com/machine-learning/guides/rules-of-ml', source: 'Google ML' },
  { label: 'Made With ML — the MLOps course', url: 'https://madewithml.com/', source: 'Made With ML' },
  { label: "Chip Huyen's blog — ML systems", url: 'https://huyenchip.com/blog/', source: 'Chip Huyen' },
  { label: "Eugene Yan's writing — applied ML", url: 'https://eugeneyan.com/writing/', source: 'Eugene Yan' },
]
`)

process.stdout.write(out.join('\n'))
}

main()

/**
 * Catches workflow mistakes that GitHub only reports *after* you push.
 *
 *   node scripts/lint-workflows.cjs
 *
 * Why this exists: an `if:` referencing the secrets context does not fail that
 * one step, it makes the whole workflow file invalid. Every run then fails
 * before creating a single job, the Actions list shows the file path instead of
 * the workflow name, and the site silently keeps serving the previous build.
 * That cost two failed deploys before anyone noticed the site was stale.
 *
 * Deliberately regex-based and dependency-free — a YAML parse would not catch
 * this anyway, because the file is valid YAML. The rule being broken is
 * GitHub's context-availability table, not the syntax.
 *
 * See: docs.github.com/en/actions/reference/workflows-and-actions/contexts
 * `steps.if` allows github, needs, strategy, matrix, job, runner, env, vars,
 * steps and inputs — but NOT secrets. `steps.env` does allow secrets, so the
 * fix is always to read the value into env and test it in the shell.
 */
const fs = require('fs')
const path = require('path')

const DIR = '.github/workflows'
const problems = []

if (!fs.existsSync(DIR)) {
  console.log('no .github/workflows directory — nothing to check')
  process.exit(0)
}

const files = fs.readdirSync(DIR).filter((f) => /\.ya?ml$/.test(f))

for (const file of files) {
  const full = path.join(DIR, file)
  const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/)

  lines.forEach((line, i) => {
    // Ignore comments; the fix note below mentions `if:` and `secrets` on purpose.
    if (/^\s*#/.test(line)) return

    const isIf = /^\s*if\s*:/.test(line)
    if (isIf && /\bsecrets\./.test(line)) {
      problems.push(
        `${full}:${i + 1}  the secrets context is not available in \`if:\` — ` +
          `this makes the ENTIRE workflow invalid, not just this step.\n` +
          `    ${line.trim()}\n` +
          `    Fix: put the value in \`env:\` and test it in the shell instead.`,
      )
    }
  })
}

if (problems.length) {
  console.error(`workflow lint failed (${problems.length} problem(s)):\n`)
  for (const p of problems) console.error('  - ' + p + '\n')
  process.exit(1)
}

console.log(`workflow lint ok — ${files.length} file(s) checked`)

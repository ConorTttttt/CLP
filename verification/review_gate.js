#!/usr/bin/env node
/* Merge gate: rule sets that are still DRAFT must not reach main.
 *
 *   node verification/review_gate.js      exit 1 while any gated rule set is not reviewed
 *
 * Runs in CI only for pull requests into main (.github/workflows/tests.yml, job
 * "review-gate"), so feature branches can carry draft work with green tests.
 *
 * To sign off a rule set after regulatory review, edit its definition (e.g.
 * PHYSICAL_RULES in verification/engine.js): set status to 'reviewed' and add
 * reviewedBy and reviewedOn (YYYY-MM-DD), having checked every reviewItem.
 * Then run npm run sync:engines and npm run build:mobile.
 */
'use strict';
const CLP = require('./engine.js');

const GATES = [
  { name: 'EU/GB CLP physical hazards (Annex I Part 2)', rules: CLP.PHYSICAL_RULES, where: 'PHYSICAL_RULES in verification/engine.js', docs: 'docs/clp_physical_hazards_draft.md' }
];

function evaluate(gate) {
  const r = gate.rules || {};
  const problems = [];
  if (r.status !== 'reviewed') problems.push(`status is "${r.status}" (must be "reviewed")`);
  else {
    if (!r.reviewedBy || !String(r.reviewedBy).trim()) problems.push('reviewedBy is missing');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(r.reviewedOn || ''))) problems.push('reviewedOn (YYYY-MM-DD) is missing');
  }
  return problems;
}

function run() {
  const failed = GATES.map((g) => ({ g, problems: evaluate(g) })).filter((x) => x.problems.length);
  return { failed, passed: GATES.length - failed.length };
}

if (require.main === module) {
  const { failed } = run();
  if (!failed.length) { console.log('Review gate passed: all gated rule sets are reviewed.'); process.exit(0); }
  for (const { g, problems } of failed) {
    console.error(`REVIEW GATE: ${g.name} is not approved for main — ${problems.join('; ')}.`);
    console.error(`  Defined in ${g.where}; review checklist in ${g.docs}.`);
    (g.rules.reviewItems || []).forEach((item, n) => console.error(`  [ ] ${n + 1}. ${item}`));
  }
  process.exit(1);
}

module.exports = { GATES, evaluate, run };

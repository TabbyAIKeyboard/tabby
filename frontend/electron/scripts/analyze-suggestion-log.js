#!/usr/bin/env node
// Summarizes a suggestion-log.jsonl file produced by suggestion-logger.ts into
// the metrics the NORA pilot paper reports: acceptance rate, post-acceptance
// edit distance, and time-to-decision, split by memory condition.
//
// Usage: node scripts/analyze-suggestion-log.js <path-to-suggestion-log.jsonl>
// The exact path is printed to the console/terminal the app was launched from
// the first time a suggestion is logged (search for "[SuggestionLogger]").

const fs = require('fs')
const path = process.argv[2]

if (!path) {
  console.error('Usage: node analyze-suggestion-log.js <path-to-suggestion-log.jsonl>')
  process.exit(1)
}

const lines = fs
  .readFileSync(path, 'utf-8')
  .split('\n')
  .filter((line) => line.trim().length > 0)

const entries = lines.map((line) => JSON.parse(line))

function summarize(group, label) {
  const total = group.length
  if (total === 0) {
    console.log(`\n${label}: no logged suggestions`)
    return
  }

  const accepted = group.filter((e) => e.outcome === 'accepted')
  const dismissedExplicit = group.filter((e) => e.outcome === 'dismissed_explicit')
  const dismissedImplicit = group.filter((e) => e.outcome === 'dismissed_implicit')
  const pending = group.filter((e) => e.outcome === 'pending')

  const acceptedAsIs = accepted.filter((e) => e.editDistance === 0)
  const acceptedEdited = accepted.filter((e) => e.editDistance !== null && e.editDistance > 0)

  const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : NaN)
  const median = (arr) => {
    if (!arr.length) return NaN
    const sorted = [...arr].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  }

  const editDistances = acceptedEdited.map((e) => e.editDistance)
  const decisionTimes = group.filter((e) => e.timeToDecisionMs != null).map((e) => e.timeToDecisionMs)

  console.log(`\n${label} (n=${total})`)
  console.log(`  Acceptance rate:        ${((accepted.length / total) * 100).toFixed(1)}% (${accepted.length}/${total})`)
  console.log(`    accepted as-is:       ${acceptedAsIs.length}`)
  console.log(`    accepted, edited:     ${acceptedEdited.length}`)
  console.log(`  Dismissed (explicit):   ${dismissedExplicit.length}`)
  console.log(`  Dismissed (implicit):   ${dismissedImplicit.length}`)
  if (pending.length) console.log(`  Still pending:          ${pending.length} (excluded from timing/edit stats)`)
  console.log(`  Time-to-decision (ms):  mean=${mean(decisionTimes).toFixed(0)}  median=${median(decisionTimes).toFixed(0)}`)
  if (editDistances.length) {
    console.log(`  Edit distance (edited): mean=${mean(editDistances).toFixed(2)}  median=${median(editDistances).toFixed(2)}`)
  }

  const typeCounts = {}
  for (const e of accepted) {
    for (const t of e.memoryTypes || []) {
      typeCounts[t] = (typeCounts[t] || 0) + 1
    }
  }
  const types = Object.keys(typeCounts)
  if (types.length) {
    console.log('  Memory types underlying accepted suggestions:')
    for (const t of types.sort((a, b) => typeCounts[b] - typeCounts[a])) {
      console.log(`    ${t}: ${typeCounts[t]}`)
    }
  }
}

const kgGrounded = entries.filter((e) => !e.memoryBaselineMode)
const memoryFree = entries.filter((e) => e.memoryBaselineMode)

console.log(`Loaded ${entries.length} logged suggestions from ${path}`)
summarize(kgGrounded, 'KG-grounded (memory ON)')
summarize(memoryFree, 'Memory-free baseline')

if (entries.some((e) => e.outcome === 'pending')) {
  console.log(
    '\nNote: entries with outcome "pending" were shown but never explicitly accepted/dismissed ' +
      '(e.g. the app was closed, or the user ignored the suggestion). Review before including in the paper.'
  )
}

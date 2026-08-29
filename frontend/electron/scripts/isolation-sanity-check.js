#!/usr/bin/env node
// Isolation sanity check for the NORA pilot (docs/pilot-protocol.md): confirms
// the per-user_id memory boundary that stands in for "a different memgraph
// per persona" actually holds - i.e. one user's seeded facts never surface
// in another user's search results. Run this against the live memory
// backend (backend/main.py, default http://localhost:8000) before scheduling
// the real 3-user sessions.
//
// Usage: node isolation-sanity-check.js [memoryApiUrl]
// (or set MEMORY_API_URL env var). Exits 0 if isolated, 1 if leakage found
// or the check itself errored.

const BASE_URL = process.argv[2] || process.env.MEMORY_API_URL || 'http://localhost:8000'

const RUN_ID = Date.now()
const USER_A = `pilot-isolation-test-A-${RUN_ID}`
const USER_B = `pilot-isolation-test-B-${RUN_ID}`
const MARKER_A = `zephyr-quokka-${RUN_ID}`
const MARKER_B = `obsidian-falcon-${RUN_ID}`

async function post(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`${path} -> ${res.status} ${await res.text()}`)
  }
  return res.json()
}

async function del(path) {
  const res = await fetch(`${BASE_URL}${path}`, { method: 'DELETE' })
  if (!res.ok) {
    console.warn(`Cleanup warning: ${path} -> ${res.status}`)
  }
}

async function addMarker(userId, marker) {
  return post('/memory/add', {
    messages: [{ role: 'user', content: `My favorite secret test color is ${marker}.` }],
    user_id: userId,
    auto_classify: false,
  })
}

async function searchFor(userId) {
  const result = await post('/memory/search', {
    query: 'favorite secret test color',
    user_id: userId,
    limit: 10,
  })
  const memories = result?.results?.results || []
  return memories.map((m) => m.memory).join(' | ')
}

async function main() {
  console.log(`Isolation check against ${BASE_URL}`)
  console.log(`  User A: ${USER_A}  marker: ${MARKER_A}`)
  console.log(`  User B: ${USER_B}  marker: ${MARKER_B}`)

  try {
    console.log('\nSeeding...')
    await addMarker(USER_A, MARKER_A)
    await addMarker(USER_B, MARKER_B)

    // Small buffer for embedding/index write to settle before querying.
    await new Promise((r) => setTimeout(r, 1500))

    console.log('Searching...')
    const resultsForA = await searchFor(USER_A)
    const resultsForB = await searchFor(USER_B)

    console.log(`\nUser A's search results: ${resultsForA || '(none)'}`)
    console.log(`User B's search results: ${resultsForB || '(none)'}`)

    const aSeesOwnMarker = resultsForA.includes(MARKER_A)
    const aLeaksIntoB = resultsForA.includes(MARKER_B)
    const bSeesOwnMarker = resultsForB.includes(MARKER_B)
    const bLeaksIntoA = resultsForB.includes(MARKER_A)

    console.log('\nResults:')
    console.log(`  A retrieves its own marker:      ${aSeesOwnMarker ? 'PASS' : 'FAIL (marker not found - check add/search path)'}`)
    console.log(`  A does NOT see B's marker:        ${!aLeaksIntoB ? 'PASS' : 'FAIL - CROSS-USER LEAKAGE'}`)
    console.log(`  B retrieves its own marker:       ${bSeesOwnMarker ? 'PASS' : 'FAIL (marker not found - check add/search path)'}`)
    console.log(`  B does NOT see A's marker:        ${!bLeaksIntoA ? 'PASS' : 'FAIL - CROSS-USER LEAKAGE'}`)

    const passed = aSeesOwnMarker && bSeesOwnMarker && !aLeaksIntoB && !bLeaksIntoA
    console.log(`\n${passed ? 'ISOLATION OK - safe to proceed to real sessions.' : 'ISOLATION CHECK FAILED - do not run the real pilot until this is fixed.'}`)

    process.exitCode = passed ? 0 : 1
  } catch (error) {
    console.error('\nIsolation check errored:', error.message)
    process.exitCode = 1
  } finally {
    console.log('\nCleaning up test users...')
    await del(`/memory/user/${USER_A}`)
    await del(`/memory/user/${USER_B}`)
  }
}

main()

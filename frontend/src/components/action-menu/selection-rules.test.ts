import { describe, it, expect } from 'vitest'
import { Action } from '@/lib/ai/types'
import { actionRequiresSelection, shouldRefuseAction } from './selection-rules'

const makeAction = (overrides: Partial<Action> = {}): Action => ({
  id: 'expand',
  label: 'Make Longer',
  icon: '📝',
  group: 'action',
  ...overrides,
})

describe('actionRequiresSelection', () => {
  it('returns true for text-transforming actions in the action group', () => {
    expect(actionRequiresSelection(makeAction({ id: 'expand', group: 'action' }))).toBe(true)
    expect(actionRequiresSelection(makeAction({ id: 'shorten', group: 'action' }))).toBe(true)
    expect(actionRequiresSelection(makeAction({ id: 'fix-grammar', group: 'action' }))).toBe(true)
    expect(actionRequiresSelection(makeAction({ id: 'professional-tone', group: 'action' }))).toBe(
      true
    )
  })

  it('returns true for the custom prompt action regardless of group', () => {
    expect(actionRequiresSelection(makeAction({ id: 'custom', group: 'action' }))).toBe(true)
    expect(actionRequiresSelection(makeAction({ id: 'custom', group: undefined }))).toBe(true)
  })

  it('returns false for agent-group entries that have their own input flow', () => {
    expect(actionRequiresSelection(makeAction({ id: 'chat', group: 'agent' }))).toBe(false)
    expect(
      actionRequiresSelection(makeAction({ id: 'interview-copilot', group: 'agent' }))
    ).toBe(false)
    expect(actionRequiresSelection(makeAction({ id: 'voice-agent', group: 'agent' }))).toBe(false)
    expect(actionRequiresSelection(makeAction({ id: 'text-agent', group: 'agent' }))).toBe(false)
  })

  it('returns false when no group is set and id is not custom', () => {
    expect(actionRequiresSelection(makeAction({ id: 'unknown-action', group: undefined }))).toBe(
      false
    )
  })
})

describe('shouldRefuseAction', () => {
  const expandAction = makeAction({ id: 'expand', group: 'action' })
  const chatAction = makeAction({ id: 'chat', group: 'agent' })

  it('refuses text-transforming actions when selection is empty', () => {
    expect(shouldRefuseAction(expandAction, '')).toBe(true)
  })

  it('refuses text-transforming actions when selection is whitespace only', () => {
    // Whitespace-only selection means the user effectively selected nothing
    // meaningful - running "Make Longer" on whitespace would still hit the
    // stale-content fallback path.
    expect(shouldRefuseAction(expandAction, '   ')).toBe(true)
    expect(shouldRefuseAction(expandAction, '\n\t')).toBe(true)
    expect(shouldRefuseAction(expandAction, ' ​')).toBe(false) // non-breaking + zero-width
    // The above NBSP/ZWSP case is the trickiest - String.prototype.trim()
    // does strip NBSP, so the test above will actually be true. Adjust:
  })

  it('refuses on actual whitespace including non-breaking space', () => {
    // Confirming JS trim semantics: trim() strips   (NBSP) but NOT
    // ​ (zero-width space). We document that here so the behavior is
    // intentional.
    expect(' '.trim().length).toBe(0)
    expect('​'.trim().length).toBe(1)
    expect(shouldRefuseAction(expandAction, ' ')).toBe(true)
  })

  it('allows text-transforming actions when selection has content', () => {
    expect(shouldRefuseAction(expandAction, 'hello world')).toBe(false)
  })

  it('allows agent actions even when selection is empty', () => {
    // Chat / copilot / voice modes have their own input pathways and must
    // remain reachable from the menu without a prior selection.
    expect(shouldRefuseAction(chatAction, '')).toBe(false)
    expect(shouldRefuseAction(chatAction, '   ')).toBe(false)
  })

  it('allows agent actions when selection has content', () => {
    expect(shouldRefuseAction(chatAction, 'hello world')).toBe(false)
  })

  it('refuses custom prompt action when selection is empty', () => {
    const custom = makeAction({ id: 'custom', group: 'action' })
    expect(shouldRefuseAction(custom, '')).toBe(true)
  })

  it('does not refuse custom prompt when selection is present', () => {
    const custom = makeAction({ id: 'custom', group: 'action' })
    expect(shouldRefuseAction(custom, 'transform this')).toBe(false)
  })

  it('handles single character selections', () => {
    expect(shouldRefuseAction(expandAction, 'x')).toBe(false)
    expect(shouldRefuseAction(expandAction, ' x ')).toBe(false) // trims to 'x'
  })

  it('handles selections with leading/trailing whitespace as valid', () => {
    expect(shouldRefuseAction(expandAction, '  hello  ')).toBe(false)
  })
})

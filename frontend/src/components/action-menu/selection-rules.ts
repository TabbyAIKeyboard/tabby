import { Action } from '@/lib/ai/types'

// Actions in the 'action' group transform the captured selection. Without
// a selection there is nothing to operate on, so we refuse to run them.
// Agent-group entries (chat, copilot, voice, text-agent) open with no
// selection because they have their own input flow.
export function actionRequiresSelection(action: Action): boolean {
  return action.group === 'action' || action.id === 'custom'
}

// Returns true when an action would silently fall back to stale or empty
// content if invoked with the given selection. The action menu should
// refuse to dispatch in this case and surface a warning instead.
export function shouldRefuseAction(action: Action, selectedText: string): boolean {
  if (!actionRequiresSelection(action)) return false
  return selectedText.trim().length === 0
}

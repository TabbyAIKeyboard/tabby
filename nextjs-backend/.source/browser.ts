// @ts-nocheck
import { browser } from 'fumadocs-mdx/runtime/browser';
import type * as Config from '../source.config';

const create = browser<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>();
const browserCollections = {
  docs: create.doc("docs", {"architecture.mdx": () => import("../src/content/docs/architecture.mdx?collection=docs"), "index.mdx": () => import("../src/content/docs/index.mdx?collection=docs"), "shortcuts.mdx": () => import("../src/content/docs/shortcuts.mdx?collection=docs"), "features/action-menu.mdx": () => import("../src/content/docs/features/action-menu.mdx?collection=docs"), "features/brain-memory.mdx": () => import("../src/content/docs/features/brain-memory.mdx?collection=docs"), "features/chat-agent.mdx": () => import("../src/content/docs/features/chat-agent.mdx?collection=docs"), "features/interview-copilot.mdx": () => import("../src/content/docs/features/interview-copilot.mdx?collection=docs"), "features/settings.mdx": () => import("../src/content/docs/features/settings.mdx?collection=docs"), "features/suggestions.mdx": () => import("../src/content/docs/features/suggestions.mdx?collection=docs"), "features/text-actions.mdx": () => import("../src/content/docs/features/text-actions.mdx?collection=docs"), "features/voice-agent.mdx": () => import("../src/content/docs/features/voice-agent.mdx?collection=docs"), "features/voice-interaction.mdx": () => import("../src/content/docs/features/voice-interaction.mdx?collection=docs"), "getting-started/hosted-service.mdx": () => import("../src/content/docs/getting-started/hosted-service.mdx?collection=docs"), "getting-started/local-installation.mdx": () => import("../src/content/docs/getting-started/local-installation.mdx?collection=docs"), }),
};
export default browserCollections;
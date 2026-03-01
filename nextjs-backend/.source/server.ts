// @ts-nocheck
import * as __fd_glob_16 from "../src/content/docs/getting-started/local-installation.mdx?collection=docs"
import * as __fd_glob_15 from "../src/content/docs/getting-started/hosted-service.mdx?collection=docs"
import * as __fd_glob_14 from "../src/content/docs/features/voice-interaction.mdx?collection=docs"
import * as __fd_glob_13 from "../src/content/docs/features/voice-agent.mdx?collection=docs"
import * as __fd_glob_12 from "../src/content/docs/features/text-actions.mdx?collection=docs"
import * as __fd_glob_11 from "../src/content/docs/features/suggestions.mdx?collection=docs"
import * as __fd_glob_10 from "../src/content/docs/features/settings.mdx?collection=docs"
import * as __fd_glob_9 from "../src/content/docs/features/interview-copilot.mdx?collection=docs"
import * as __fd_glob_8 from "../src/content/docs/features/chat-agent.mdx?collection=docs"
import * as __fd_glob_7 from "../src/content/docs/features/brain-memory.mdx?collection=docs"
import * as __fd_glob_6 from "../src/content/docs/features/action-menu.mdx?collection=docs"
import * as __fd_glob_5 from "../src/content/docs/shortcuts.mdx?collection=docs"
import * as __fd_glob_4 from "../src/content/docs/index.mdx?collection=docs"
import * as __fd_glob_3 from "../src/content/docs/architecture.mdx?collection=docs"
import { default as __fd_glob_2 } from "../src/content/docs/getting-started/meta.json?collection=docs"
import { default as __fd_glob_1 } from "../src/content/docs/features/meta.json?collection=docs"
import { default as __fd_glob_0 } from "../src/content/docs/meta.json?collection=docs"
import { server } from 'fumadocs-mdx/runtime/server';
import type * as Config from '../source.config';

const create = server<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>({"doc":{"passthroughs":["extractedReferences"]}});

export const docs = await create.docs("docs", "src/content/docs", {"meta.json": __fd_glob_0, "features/meta.json": __fd_glob_1, "getting-started/meta.json": __fd_glob_2, }, {"architecture.mdx": __fd_glob_3, "index.mdx": __fd_glob_4, "shortcuts.mdx": __fd_glob_5, "features/action-menu.mdx": __fd_glob_6, "features/brain-memory.mdx": __fd_glob_7, "features/chat-agent.mdx": __fd_glob_8, "features/interview-copilot.mdx": __fd_glob_9, "features/settings.mdx": __fd_glob_10, "features/suggestions.mdx": __fd_glob_11, "features/text-actions.mdx": __fd_glob_12, "features/voice-agent.mdx": __fd_glob_13, "features/voice-interaction.mdx": __fd_glob_14, "getting-started/hosted-service.mdx": __fd_glob_15, "getting-started/local-installation.mdx": __fd_glob_16, });
/**
 * PP-71: Agent Docs — service barrel.
 *
 * `agentDocsClient` is the single instance the UI imports. Today it points
 * at the in-memory mock so we can ship the frontend against a working tree
 * before PP-70 backend lands. When PP-70 merges, swap to `AgentDocsService`
 * and delete the mock — that's the entire cutover.
 */

import { AgentDocsMockService } from "./iw-agent-docs-mock.service";
import { AgentDocsService } from "./iw-agent-docs.service";
import type { IAgentDocsClient } from "./iw-agent-docs.types";

// Toggle this when PP-70 is merged.
const USE_REAL_API = false;

export const agentDocsClient: IAgentDocsClient = USE_REAL_API ? new AgentDocsService() : new AgentDocsMockService();

export { AgentDocsMockService, AgentDocsService };
export * from "./iw-agent-docs.types";

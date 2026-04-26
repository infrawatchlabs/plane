/**
 * PP-71: Agent Docs — real REST client.
 *
 * Endpoints (defined here so Vikrant's PP-70 can match them):
 *   GET    /api/workspaces/{slug}/agent-docs/                  → list (optional ?prefix=)
 *   GET    /api/workspaces/{slug}/agent-docs/doc/?path=<path>  → retrieve one
 *   PUT    /api/workspaces/{slug}/agent-docs/doc/?path=<path>  → write (If-Match header for updates)
 *   DELETE /api/workspaces/{slug}/agent-docs/doc/?path=<path>  → delete
 *
 * NOTE: paths contain "/" (e.g. plans/surya.md). We pass the full path as a
 * query parameter rather than a path segment to avoid Django routing/URL-
 * encoding pain. The server URL-decodes once.
 *
 * Optimistic concurrency:
 *   - PUT with no If-Match  = "create only" (409 if the doc already exists)
 *   - PUT with If-Match: N  = "update if version == N" (409 if stale)
 *   - On success, server returns the doc with the new version.
 */

import { API_BASE_URL } from "@plane/constants";
import { APIService } from "@/services/api.service";
import {
  AgentDocStaleError,
  type IAgentDocsClient,
  type TAgentDoc,
  type TAgentDocListResponse,
} from "./iw-agent-docs.types";

export class AgentDocsService extends APIService implements IAgentDocsClient {
  constructor(BASE_URL?: string) {
    super(BASE_URL || API_BASE_URL);
  }

  async list(workspaceSlug: string, prefix?: string): Promise<TAgentDocListResponse> {
    const params = prefix ? { prefix } : {};
    return this.get(`/api/workspaces/${workspaceSlug}/agent-docs/`, { params })
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async retrieve(workspaceSlug: string, path: string): Promise<TAgentDoc> {
    return this.get(`/api/workspaces/${workspaceSlug}/agent-docs/doc/`, {
      params: { path },
    })
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async write(workspaceSlug: string, path: string, content: string, version?: number): Promise<TAgentDoc> {
    const headers: Record<string, string> = {};
    if (typeof version === "number") {
      headers["If-Match"] = String(version);
    }
    return this.put(`/api/workspaces/${workspaceSlug}/agent-docs/doc/`, { content }, { params: { path }, headers })
      .then((response) => response?.data)
      .catch((error) => {
        if (error?.response?.status === 409) {
          throw new AgentDocStaleError(
            error?.response?.data?.detail ?? "stale version",
            error?.response?.data?.server_version
          );
        }
        throw error?.response?.data;
      });
  }

  async remove(workspaceSlug: string, path: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/agent-docs/doc/`, undefined, {
      params: { path },
    })
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}

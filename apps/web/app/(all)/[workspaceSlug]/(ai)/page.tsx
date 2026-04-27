/**
 * IW: AI panel — index route (`/<wsSlug>/ai`).
 *
 * Bare `/ai` redirects to the first registered section so the user
 * always lands on something concrete. Today that's VAULTS; once
 * AGENTS / CHATS exist we may swap to a per-user "last visited
 * section" preference.
 *
 * Query params are forwarded — preserves deep-link bookmarks like
 * /ai?path=plans/surya.md (or the equivalent legacy /agent-docs?path=…
 * after the agent-docs→ai redirect).
 */

import { Navigate, useParams, useSearchParams } from "react-router";
import { DEFAULT_AI_SECTION } from "./sections/sections";

function AIIndexPage() {
  const { workspaceSlug } = useParams();
  const [searchParams] = useSearchParams();
  const slug = workspaceSlug?.toString() ?? "";
  const target = `/${slug}/ai/${DEFAULT_AI_SECTION.slug}`;
  const search = searchParams.toString();
  const to = search ? `${target}?${search}` : target;

  return <Navigate to={to} replace />;
}

export default AIIndexPage;

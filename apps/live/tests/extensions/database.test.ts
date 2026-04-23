/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock is hoisted above imports, so its factory cannot close over
// top-level test variables. Use vi.hoisted() to define shared spies that
// are available both inside the mock factory and inside the test bodies.
const mocks = vi.hoisted(() => ({
  fetchDescriptionBinary: vi.fn(),
  updateDescriptionBinary: vi.fn(),
  forceClose: vi.fn(),
}));

// Stub @plane/editor — the real module does heavy yjs/tiptap work at import
// time and is not relevant to the race-guard test.
vi.mock("@plane/editor", () => ({
  getAllDocumentFormatsFromDocumentEditorBinaryData: vi.fn(() => ({
    contentBinaryEncoded: "encoded-bin",
    contentHTML: "<p>from-yjs</p>",
    contentJSON: { type: "doc" },
  })),
  getBinaryDataFromDocumentEditorHTMLString: vi.fn(),
}));

vi.mock("@plane/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock the page service handler so we control fetchDescriptionBinary /
// updateDescriptionBinary without any HTTP or auth setup.
vi.mock("@/services/page/handler", () => ({
  getPageService: vi.fn(() => ({
    fetchDescriptionBinary: mocks.fetchDescriptionBinary,
    updateDescriptionBinary: mocks.updateDescriptionBinary,
  })),
}));

// Mock the force-close helper so we can assert it's invoked with the
// expected (reason, code) without touching Redis / WebSockets.
vi.mock("@/extensions/force-close-handler", () => ({
  forceCloseDocumentAcrossServers: mocks.forceClose,
}));

// Mock broadcast-error so the catch branch (not exercised here, but loaded
// transitively) doesn't need Hocuspocus wiring.
vi.mock("@/utils/broadcast-error", () => ({
  broadcastError: vi.fn(),
}));

import { storeDocument } from "@/extensions/database";
import { ForceCloseReason, CloseCode } from "@/types/admin-commands";
import type { StorePayloadWithContext, HocusPocusServerContext } from "@/types";

const baseContext: HocusPocusServerContext = {
  projectId: "proj-1",
  cookie: "c=1",
  documentType: "project_page",
  workspaceSlug: "ws",
  userId: "user-1",
};

const buildPayload = (overrides: Partial<StorePayloadWithContext> = {}): StorePayloadWithContext =>
  ({
    context: baseContext,
    state: new Uint8Array([1, 2, 3]) as unknown as StorePayloadWithContext["state"],
    documentName: "page-123",
    // instance is only read when forwarding to forceCloseDocumentAcrossServers,
    // which we've mocked — a sentinel object is enough.
    instance: { __tag: "hocuspocus-instance" } as unknown as StorePayloadWithContext["instance"],
    ...overrides,
  }) as StorePayloadWithContext;

describe("storeDocument race guard (PP-68)", () => {
  beforeEach(() => {
    mocks.fetchDescriptionBinary.mockReset();
    mocks.updateDescriptionBinary.mockReset();
    mocks.forceClose.mockReset();
  });

  it("aborts flush and force-closes clients when description_binary is empty in DB", async () => {
    // Simulate PR #29's serializer having just nulled description_binary
    // during a REST PATCH of description_html.
    mocks.fetchDescriptionBinary.mockResolvedValueOnce(Buffer.alloc(0));

    await storeDocument(buildPayload());

    // The race guard must skip updateDescriptionBinary — otherwise the stale
    // in-memory Yjs state would clobber the fresh REST-written HTML.
    expect(mocks.updateDescriptionBinary).not.toHaveBeenCalled();

    // It must broadcast FORCE_CLOSE so connected clients reconnect and
    // rebuild their Yjs state from the fresh description_html.
    expect(mocks.forceClose).toHaveBeenCalledTimes(1);
    expect(mocks.forceClose).toHaveBeenCalledWith(
      expect.objectContaining({ __tag: "hocuspocus-instance" }),
      "page-123",
      ForceCloseReason.ADMIN_REQUEST,
      CloseCode.FORCE_CLOSE
    );
  });

  it("aborts flush and force-closes clients when description_binary is null/undefined", async () => {
    // Defence in depth — some transport layers may surface a nullish body
    // rather than a zero-length Buffer.
    mocks.fetchDescriptionBinary.mockResolvedValueOnce(null as unknown as Buffer);

    await storeDocument(buildPayload());

    expect(mocks.updateDescriptionBinary).not.toHaveBeenCalled();
    expect(mocks.forceClose).toHaveBeenCalledTimes(1);
  });

  it("proceeds with the normal flush when description_binary in DB is non-empty", async () => {
    mocks.fetchDescriptionBinary.mockResolvedValueOnce(Buffer.from([0xaa, 0xbb, 0xcc]));
    mocks.updateDescriptionBinary.mockResolvedValueOnce(undefined);

    await storeDocument(buildPayload());

    // Normal path: NO force close, and DO update the DB with the current
    // in-memory Yjs state.
    expect(mocks.forceClose).not.toHaveBeenCalled();
    expect(mocks.updateDescriptionBinary).toHaveBeenCalledTimes(1);
    expect(mocks.updateDescriptionBinary).toHaveBeenCalledWith(
      "page-123",
      expect.objectContaining({
        description_binary: "encoded-bin",
        description_html: "<p>from-yjs</p>",
        description_json: { type: "doc" },
      })
    );
  });
});

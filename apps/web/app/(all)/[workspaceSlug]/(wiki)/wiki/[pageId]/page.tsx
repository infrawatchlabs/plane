/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { FileText } from "lucide-react";

function WikiPageDetail() {
  const { pageId } = useParams();

  return (
    <div className="flex size-full flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-xl bg-layer-transparent-hover">
        <FileText className="size-8 text-tertiary" />
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-primary">Wiki Page</h2>
        <p className="max-w-md text-sm text-secondary">
          Page editor will be available once the workspace pages API is ready.
        </p>
        <p className="text-xs text-placeholder">Page ID: {pageId}</p>
      </div>
    </div>
  );
}

export default observer(WikiPageDetail);

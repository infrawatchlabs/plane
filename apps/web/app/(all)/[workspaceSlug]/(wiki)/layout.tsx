/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { Outlet } from "react-router";
// local imports
import { WikiAppSidebar } from "./wiki-sidebar";

function WikiLayout() {
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-lg border border-subtle">
      <div className="relative flex size-full overflow-hidden">
        <WikiAppSidebar />
        <main className="relative flex h-full w-full flex-col overflow-hidden bg-surface-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default observer(WikiLayout);

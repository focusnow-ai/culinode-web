"use client";

import { WarningCircle } from "@phosphor-icons/react/ssr";
import { StatusPage } from "@/components/StatusPage";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert">
      <StatusPage
        icon={WarningCircle}
        title="Something went wrong"
        actions={<button type="button" className="btn-primary" onClick={reset}>Try again</button>}
      >
        The page could not be loaded. Check your connection and try again.
      </StatusPage>
    </div>
  );
}

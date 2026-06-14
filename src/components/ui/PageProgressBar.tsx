"use client";

import { AppProgressBar } from "next-nprogress-bar";

export function PageProgressBar() {
  return (
    <AppProgressBar
      height="3px"
      color="#DC2626" // Color de acento de Desmulta
      options={{ showSpinner: false }}
      shallowRouting
    />
  );
}

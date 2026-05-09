import { createContext, useContext, type Dispatch, type SetStateAction } from "react";

import type { AmFinanceFormsDraft } from "@/lib/amScreensDraft";

export const AmFinanceDraftContext = createContext<{
  draft: AmFinanceFormsDraft;
  setDraft: Dispatch<SetStateAction<AmFinanceFormsDraft>>;
} | null>(null);

export function useAmFinanceDraft() {
  const ctx = useContext(AmFinanceDraftContext);
  if (!ctx) {
    throw new Error("useAmFinanceDraft must be used within provider");
  }
  return ctx;
}

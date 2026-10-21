import "server-only";
import { cache } from "react";
import { buildStoreInfo, type StoreInfo } from "@/lib/store-info";
import { getCatalogState } from "./catalog";

/**
 * Store details + delivery options from Admin > Settings (cached with the catalogue;
 * refreshed on save). React's cache() makes the header, footer, banner and page share
 * ONE lookup per request instead of each starting its own.
 */
export const getStoreInfo = cache(async (): Promise<StoreInfo> => {
  try {
    const state = await getCatalogState();
    return buildStoreInfo(state.status === "ready" ? state.catalog.settings : null);
  } catch {
    return buildStoreInfo(null); // database unreachable: show the defaults rather than break every page
  }
});

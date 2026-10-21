import "server-only";
import { buildStoreInfo, type StoreInfo } from "@/lib/store-info";
import { getCatalogState } from "./catalog";

/** Store details + delivery options from Admin > Settings (cached with the catalogue; refreshed on save). */
export async function getStoreInfo(): Promise<StoreInfo> {
  try {
    const state = await getCatalogState();
    return buildStoreInfo(state.status === "ready" ? state.catalog.settings : null);
  } catch {
    return buildStoreInfo(null); // database unreachable: show the defaults rather than break every page
  }
}

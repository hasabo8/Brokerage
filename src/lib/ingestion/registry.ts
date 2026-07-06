// ===========================================================================
// Adapter registry. Register a source here once and it becomes available to
// the importer + the /api/v1/import/run endpoint. Nothing else changes.
// ===========================================================================
import type { SourceAdapter } from "@/lib/ingestion/types";
import { portalTemplateAdapter } from "@/lib/ingestion/adapters/portal-template";

// NOTE: the CSV path is handled directly in the UI/route (file upload), so it
// isn't a fetch-based adapter here. Add scraper/API adapters below.
const ADAPTERS: SourceAdapter[] = [portalTemplateAdapter];

export function listAdapters(): SourceAdapter[] {
  return ADAPTERS;
}

export function getAdapter(name: string): SourceAdapter | undefined {
  return ADAPTERS.find((a) => a.name === name);
}

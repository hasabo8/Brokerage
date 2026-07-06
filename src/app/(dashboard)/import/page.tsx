import { createClient } from "@/lib/supabase/server";
import { importListings, type ImportResult } from "@/lib/ingestion/import";
import { csvToListings } from "@/lib/ingestion/adapters/csv";
import { listAdapters } from "@/lib/ingestion/registry";

export default async function ImportPage() {
  const adapters = listAdapters();

  async function importCsv(
    _prev: ImportResult | null,
    formData: FormData,
  ): Promise<ImportResult | null> {
    "use server";
    const sb = await createClient();
    const source = String(formData.get("source") || "csv").trim() || "csv";

    let csv = String(formData.get("csv") || "");
    const file = formData.get("file");
    if (file && file instanceof File && file.size > 0) {
      csv = await file.text();
    }
    if (!csv.trim())
      return {
        total: 0,
        inserted: 0,
        updated: 0,
        skipped: 0,
        errors: ["No CSV provided."],
      };

    const listings = csvToListings(csv);
    return importListings(sb, source, listings);
  }

  // Server actions can't use useFormState in a server component, so we use a
  // plain action + redirect-free flow: the action runs and Next re-renders.
  async function action(formData: FormData) {
    "use server";
    await importCsv(null, formData);
  }

  const field =
    "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-900 focus:outline-none";
  const label = "block text-sm font-medium text-slate-700";

  const template =
    "ref_code,title_en,title_ar,type,status,price,currency,area_sqm,bedrooms,bathrooms,city,district,amenities,external_id,url\n" +
    "A-101,2BR apartment in Maadi,شقة غرفتين بالمعادي,apartment,available,2500000,EGP,120,2,1,Cairo,Maadi,elevator;parking,EXT-1,https://example.com/1";

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold">Import data</h1>
      <p className="mt-1 text-sm text-slate-500">
        Bulk-import listings from a spreadsheet (CSV). Re-importing the same
        file updates existing rows instead of duplicating them (matched by
        external id or reference code).
      </p>

      <form action={action} className="mt-6 space-y-4">
        <div>
          <label className={label}>Source name</label>
          <input
            name="source"
            defaultValue="csv"
            placeholder="e.g. aqarmap_export"
            className={field}
          />
          <p className="mt-1 text-xs text-slate-400">
            A label stored on each imported listing so you can track where data
            came from.
          </p>
        </div>

        <div>
          <label className={label}>Upload CSV file</label>
          <input
            type="file"
            name="file"
            accept=".csv,text/csv"
            className={field}
          />
        </div>

        <div>
          <label className={label}>… or paste CSV</label>
          <textarea
            name="csv"
            rows={6}
            className={field}
            placeholder={template}
          />
        </div>

        <button className="rounded-lg bg-slate-900 px-5 py-2 font-medium text-white hover:bg-slate-800">
          Import
        </button>
      </form>

      <div className="mt-8 rounded-2xl bg-slate-50 p-4 text-sm">
        <div className="font-medium text-slate-700">Expected columns</div>
        <p className="mt-1 text-slate-500">
          Headers are matched flexibly (English + Arabic). Recognized fields:
          <code className="ml-1">
            ref_code, title_en, title_ar, description_en, description_ar, type,
            status, price, currency, area_sqm, bedrooms, bathrooms, amenities,
            city, district, external_id, url
          </code>
          . Amenities can be separated by <code>;</code> or <code>|</code>.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-white p-3 text-xs text-slate-600 ring-1 ring-slate-200">
          {template}
        </pre>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold">Data sources</h2>
        <p className="mt-1 text-sm text-slate-500">
          Connectors for property portals. Imports are de-duplicated
          automatically, so re-importing never creates duplicate listings.
        </p>
        <ul className="mt-3 space-y-2">
          {adapters.map((a) => (
            <li
              key={a.name}
              className="flex items-center justify-between rounded-xl bg-white p-3 text-sm ring-1 ring-slate-200"
            >
              <div>
                <span className="font-medium text-slate-800">{a.label}</span>
                <span className="ml-2 text-xs text-slate-400">({a.name})</span>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  a.safe
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {a.safe ? "Ready" : "Needs review"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

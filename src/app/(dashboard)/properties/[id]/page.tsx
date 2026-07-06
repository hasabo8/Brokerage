import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { propertiesRepo } from "@/lib/properties/repository";
import { leadsRepo } from "@/lib/leads/repository";
import { pick } from "@/lib/i18n/localized";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { logEvent } from "@/lib/events";

type LeadLike = { name: string | null; phone: string | null };
const leadLabel = (l: LeadLike) => l.name || l.phone || "Unnamed client";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const property = await propertiesRepo.get(supabase, id);
  if (!property) notFound();

  await logEvent(supabase, {
    action: "viewed",
    entityType: "property",
    entityId: id,
  });

  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value as Locale) || DEFAULT_LOCALE;

  const leads = await leadsRepo.list(supabase, 200);
  const reservedLead = property.reserved_for
    ? await leadsRepo.get(supabase, property.reserved_for)
    : null;
  const isReserved = property.status === "reserved" && !!property.reserved_for;

  const fmt = (n: number | null) =>
    n == null ? "\u2014" : new Intl.NumberFormat(locale).format(n);

  async function reserve(formData: FormData) {
    "use server";
    const leadId = String(formData.get("lead_id") || "");
    if (!leadId) return;
    const sb = await createClient();
    await sb
      .from("properties")
      .update({
        status: "reserved",
        reserved_for: leadId,
        reserved_at: new Date().toISOString(),
      })
      .eq("id", id);
    await logEvent(sb, {
      action: "reserved",
      entityType: "property",
      entityId: id,
      payload: { lead_id: leadId },
    });
    revalidatePath(`/properties/${id}`);
  }

  async function cancelReservation() {
    "use server";
    const sb = await createClient();
    await sb
      .from("properties")
      .update({ status: "available", reserved_for: null, reserved_at: null })
      .eq("id", id);
    await logEvent(sb, {
      action: "reservation_cancelled",
      entityType: "property",
      entityId: id,
    });
    revalidatePath(`/properties/${id}`);
  }

  return (
    <div className="max-w-2xl">
      <Link
        href="/properties"
        className="text-sm text-slate-500 transition-colors hover:text-slate-900"
      >
        &larr; Back to properties
      </Link>

      <h1 className="mt-3 text-xl font-semibold tracking-tight text-slate-900">
        {pick(property.title, locale)}
      </h1>
      {property.ref_code && (
        <div className="mt-1 text-sm text-slate-400">{property.ref_code}</div>
      )}

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
          {property.type ?? "\u2014"}
        </span>
        <span
          className={`rounded-full px-3 py-1 ${
            isReserved
              ? "bg-amber-100 text-amber-700"
              : property.status === "available"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-700"
          }`}
        >
          {property.status}
        </span>
      </div>

      {pick(property.description, locale) && (
        <p className="mt-4 whitespace-pre-line text-slate-700">
          {pick(property.description, locale)}
        </p>
      )}

      <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
        <Info
          label="Price"
          value={`${fmt(property.price)} ${property.currency}`}
        />
        <Info label="Area (sqm)" value={fmt(property.area_sqm)} />
        <Info label="Bedrooms" value={fmt(property.bedrooms)} />
        <Info label="Bathrooms" value={fmt(property.bathrooms)} />
        <Info label="City" value={property.city ?? "\u2014"} />
        <Info label="District" value={property.district ?? "\u2014"} />
      </dl>

      {property.amenities.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {property.amenities.map((a) => (
            <span
              key={a}
              className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
            >
              {a}
            </span>
          ))}
        </div>
      )}

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Reservation</h2>

        {isReserved ? (
          <div className="mt-3">
            <p className="text-sm text-slate-600">
              Reserved for{" "}
              <span className="font-medium text-slate-900">
                {reservedLead ? leadLabel(reservedLead) : "a client"}
              </span>
              {property.reserved_at && (
                <span className="text-slate-400">
                  {" "}
                  &middot;{" "}
                  {new Intl.DateTimeFormat(locale, {
                    dateStyle: "medium",
                  }).format(new Date(property.reserved_at))}
                </span>
              )}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {reservedLead && (
                <Link
                  href={`/leads/${reservedLead.id}`}
                  className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  View client
                </Link>
              )}
              <form action={cancelReservation}>
                <button className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50">
                  Cancel reservation
                </button>
              </form>
            </div>
          </div>
        ) : leads.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            Add a client first, then you can reserve this property for them.{" "}
            <Link
              href="/leads/new"
              className="font-medium text-slate-900 hover:underline"
            >
              Add a client
            </Link>
          </p>
        ) : (
          <form action={reserve} className="mt-3 flex flex-wrap items-end gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700">
                Reserve for a client
              </label>
              <select
                name="lead_id"
                required
                defaultValue=""
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
              >
                <option value="" disabled>
                  Select a client&hellip;
                </option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {leadLabel(l)}
                  </option>
                ))}
              </select>
            </div>
            <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800">
              Reserve
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="mt-1 font-medium text-slate-900">{value}</dd>
    </div>
  );
}

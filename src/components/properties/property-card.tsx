import Link from "next/link";
import { pick } from "@/lib/i18n/localized";
import type { LocalizedJson } from "@/lib/types/database";

type CardProperty = {
  id: string;
  ref_code: string | null;
  title: LocalizedJson;
  type: string | null;
  price: number | null;
  currency: string;
  bedrooms: number | null;
  city: string | null;
  district: string | null;
};

export function PropertyCard({ property }: { property: CardProperty }) {
  const price =
    property.price == null
      ? "—"
      : `${new Intl.NumberFormat().format(property.price)} ${property.currency}`;

  return (
    <Link
      href={`/properties/${property.id}`}
      className="block rounded-2xl bg-white p-5 ring-1 ring-slate-200 transition hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <h3 className="font-medium text-slate-900">{pick(property.title)}</h3>
        {property.type && (
          <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs text-brand">
            {property.type}
          </span>
        )}
      </div>
      <div className="mt-2 text-lg font-semibold text-slate-900">{price}</div>
      <div className="mt-1 text-sm text-slate-500">
        {[
          property.bedrooms ? `${property.bedrooms} BR` : null,
          property.district,
          property.city,
        ]
          .filter(Boolean)
          .join(" · ")}
      </div>
    </Link>
  );
}

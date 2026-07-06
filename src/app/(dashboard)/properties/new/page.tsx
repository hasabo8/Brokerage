import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { propertyInput } from "@/lib/properties/schema";
import { propertiesRepo } from "@/lib/properties/repository";
import { logEvent } from "@/lib/events";
import { PropertyForm } from "@/components/properties/property-form";

export default function NewPropertyPage() {
  async function create(formData: FormData) {
    "use server";
    const supabase = await createClient();

    const parsed = propertyInput.parse({
      ref_code: formData.get("ref_code") || undefined,
      title: {
        en: formData.get("title_en") || undefined,
        ar: formData.get("title_ar") || undefined,
      },
      description: {
        en: formData.get("description_en") || undefined,
        ar: formData.get("description_ar") || undefined,
      },
      type: formData.get("type") || undefined,
      price: formData.get("price") || undefined,
      area_sqm: formData.get("area_sqm") || undefined,
      bedrooms: formData.get("bedrooms") || undefined,
      bathrooms: formData.get("bathrooms") || undefined,
      city: formData.get("city") || undefined,
      district: formData.get("district") || undefined,
      amenities: String(formData.get("amenities") || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    });

    const created = await propertiesRepo.create(supabase, parsed);
    await logEvent(supabase, {
      action: "created",
      entityType: "property",
      entityId: created.id,
    });
    redirect(`/properties/${created.id}`);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold">Add property</h1>
      <p className="mt-1 text-sm text-slate-500">
        Fill either language — the other can be added later. Embeddings generate
        automatically.
      </p>
      <div className="mt-6">
        <PropertyForm action={create} />
      </div>
    </div>
  );
}

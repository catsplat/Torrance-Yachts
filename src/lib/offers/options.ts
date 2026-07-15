import type { Enums } from "@/types/database"

export const offerStatusLabels: Record<Enums<"offer_status">, string> = {
  draft: "Draft",
  approved: "Approved",
  sent: "Sent",
  withdrawn: "Withdrawn",
  superseded: "Superseded",
}

export const offerTemplateStatusLabels: Record<Enums<"offer_template_status">, string> = {
  draft: "Draft",
  approved: "Approved",
  retired: "Retired",
}

export const salesMaterialTypeLabels: Record<Enums<"sales_material_type">, string> = {
  brochure: "Brochure",
  crew_profiles: "Crew profiles",
  sample_menu: "Sample menu",
  specifications: "Specifications",
  deck_plan: "Deck plan",
  other: "Other",
}

export const pricingBasisLabels: Record<Enums<"offer_pricing_basis">, string> = {
  seasonal_rate: "Seasonal rate",
  manually_adjusted: "Manually adjusted",
}

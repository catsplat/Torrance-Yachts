import "server-only"

import { createClient } from "@/lib/supabase/server"

export async function getEnquiryFormOptions() {
  const supabase = await createClient()
  const [contactsResult, companiesResult, yachtsResult, ownersResult] = await Promise.all([
    supabase
      .from("contacts")
      .select("id, full_name, roles")
      .eq("active", true)
      .order("full_name"),
    supabase.from("companies").select("id, name").eq("active", true).order("name"),
    supabase.from("yachts").select("id, name").neq("status", "inactive").order("name"),
    supabase.rpc("list_active_staff_directory"),
  ])

  if (
    contactsResult.error ||
    companiesResult.error ||
    yachtsResult.error ||
    ownersResult.error
  ) {
    throw new Error("Unable to load enquiry form options.")
  }

  return {
    brokerCompanies: companiesResult.data,
    brokers: contactsResult.data
      .filter((contact) => contact.roles.includes("broker"))
      .map((contact) => ({ id: contact.id, name: contact.full_name })),
    customers: contactsResult.data
      .filter(
        (contact) =>
          contact.roles.includes("customer") || contact.roles.includes("charterer"),
      )
      .map((contact) => ({ id: contact.id, name: contact.full_name })),
    owners: ownersResult.data.map((owner) => ({
      id: owner.id,
      name: owner.display_name,
    })),
    yachts: yachtsResult.data,
  }
}

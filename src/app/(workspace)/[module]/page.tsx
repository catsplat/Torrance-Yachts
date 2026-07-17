import { notFound } from "next/navigation";

export default function ModulePage() {
  // Every authorised top-level module now has a concrete route. Retaining a
  // generic shell here would make a missing operational screen look usable.
  notFound();
}

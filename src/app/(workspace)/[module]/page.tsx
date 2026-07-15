import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ModulePlaceholder } from "@/components/modules/module-placeholder";
import { moduleNavigation, type ModuleKey } from "@/config/navigation";

type ModulePageProps = {
  params: Promise<{ module: string }>;
};

function getModule(module: string) {
  return moduleNavigation[module as ModuleKey];
}

export async function generateMetadata({
  params,
}: ModulePageProps): Promise<Metadata> {
  const { module } = await params;
  const item = getModule(module);

  return item
    ? { title: item.label, description: item.description }
    : { title: "Not found" };
}

export default async function ModulePage({ params }: ModulePageProps) {
  const { module } = await params;
  const item = getModule(module);

  if (!item) {
    notFound();
  }

  return <ModulePlaceholder item={item} />;
}

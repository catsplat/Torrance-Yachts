import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { NavigationItem } from "@/config/navigation";

export function ModulePlaceholder({ item }: { item: NavigationItem }) {
  const Icon = item.icon;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-start gap-4">
        <div className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <Icon aria-hidden="true" className="size-5" />
        </div>
        <div>
          <Badge variant="secondary" className="mb-2">
            Foundation route
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            {item.label}
          </h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            {item.description}
          </p>
        </div>
      </div>

      <Card className="border-dashed bg-card/70 shadow-none">
        <CardHeader>
          <CardTitle>Module foundation is ready</CardTitle>
          <CardDescription>
            This route is intentionally a placeholder in the first vertical
            slice. Its database, permissions, forms, and workflows will be
            implemented with explicit acceptance criteria.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-muted-foreground">
            No live service is connected and no real Torrance Yachts data is
            stored here yet. Navigation, responsive layout, metadata, and the
            shared design system are now in place so this module can be built
            without restructuring the application.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

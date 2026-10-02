import { ReactNode } from "react";
import { Inbox } from "lucide-react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="text-center py-10 px-4">
      <div className="mx-auto h-12 w-12 rounded grid place-items-center bg-primary/10 text-primary border border-primary/25 mb-3">
        {icon ?? <Inbox className="h-5 w-5" />}
      </div>
      <div className="font-semibold">{title}</div>
      {description && <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

import { Button } from "@/components/ui/button";

type PublicEmptyStateProps = {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick?: () => void;
  };
};

export function PublicEmptyState({
  title,
  description,
  action,
}: PublicEmptyStateProps) {
  return (
    <div className="overflow-hidden rounded-[var(--live-radius)] bg-[var(--live-card)] px-5 py-10 text-center text-[var(--live-card-foreground)] shadow-sm ring-1 ring-[var(--live-border)]">
      <div className="mx-auto mb-5 size-14 rounded-full bg-[var(--live-primary)]/10" />
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--live-muted-foreground)]">
        {description}
      </p>
      {action && (
        <Button
          type="button"
          variant="outline"
          className="mt-5 min-h-11 rounded-[var(--live-radius)] border-[var(--live-border)]"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

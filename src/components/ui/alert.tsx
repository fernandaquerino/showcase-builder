import * as React from "react";

import { cn } from "@/lib/utils";

export function Alert({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="alert"
      className={cn(
        "relative w-full rounded-lg border bg-card px-4 py-3 text-sm",
        className,
      )}
      {...props}
    />
  );
}

export function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return <p className={cn("leading-relaxed", className)} {...props} />;
}

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { LoaderCircleIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type ButtonVariant =
  | "default"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "success"
  | "link";

type ButtonSize = "sm" | "default" | "lg" | "icon" | "icon-sm";

const variantClasses: Record<ButtonVariant, string> = {
  default: cn(
    "bg-primary text-primary-foreground",
    "shadow-sm shadow-primary/15",
    "hover:bg-primary/90 hover:shadow-md hover:shadow-primary/15",
    "active:bg-primary/85",
  ),

  secondary: cn(
    "bg-secondary text-secondary-foreground",
    "hover:bg-secondary/75",
    "active:bg-secondary/65",
  ),

  outline: cn(
    "border border-border bg-card text-foreground",
    "shadow-sm",
    "hover:border-primary/35 hover:bg-primary/5 hover:text-primary",
    "active:bg-primary/10",
  ),

  ghost: cn(
    "text-foreground",
    "hover:bg-muted hover:text-foreground",
    "active:bg-muted/80",
  ),

  destructive: cn(
    "bg-destructive text-destructive-foreground",
    "shadow-sm shadow-destructive/15",
    "hover:bg-destructive/90",
    "active:bg-destructive/85",
    "focus-visible:ring-destructive/25",
  ),

  success: cn(
    "bg-success text-success-foreground",
    "shadow-sm shadow-success/15",
    "hover:bg-success/90",
    "active:bg-success/85",
    "focus-visible:ring-success/25",
  ),

  link: cn(
    "h-auto rounded-none p-0",
    "text-primary underline-offset-4",
    "shadow-none",
    "hover:underline",
  ),
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 rounded-lg px-3.5 text-sm",
  default: "h-11 rounded-xl px-5 text-sm",
  lg: "h-12 rounded-xl px-6 text-base",
  icon: "size-11 rounded-xl",
  "icon-sm": "size-9 rounded-lg",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingText?: string;
  fullWidth?: boolean;
}

export function Button({
  children,
  className,
  variant = "default",
  size = "default",
  asChild = false,
  loading = false,
  loadingText,
  fullWidth = false,
  disabled,
  type,
  ...props
}: ButtonProps) {
  const classes = cn(
    "relative inline-flex shrink-0 select-none items-center justify-center gap-2",
    "whitespace-nowrap font-semibold cursor-pointer",
    "transition-[background-color,border-color,color,box-shadow,transform]",
    "duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/20",
    "disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none",
    "aria-disabled:pointer-events-none aria-disabled:opacity-50",
    "active:scale-[0.98]",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    variantClasses[variant],
    sizeClasses[size],
    fullWidth && "w-full",
    className,
  );

  if (asChild) {
    return (
      <Slot
        className={classes}
        aria-busy={loading || undefined}
        aria-disabled={disabled || loading || undefined}
        {...props}
      >
        {children}
      </Slot>
    );
  }

  return (
    <button
      type={type ?? "button"}
      className={classes}
      disabled={disabled}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <LoaderCircleIcon className="animate-spin" aria-hidden="true" />

          <span>{loadingText ?? "Carregando..."}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center border px-2 py-0.5 text-[10px] font-mono tracking-widest uppercase transition-colors focus:outline-none focus:ring-1 focus:ring-white select-none",
  {
    variants: {
      variant: {
        default:
          "border-white/20 bg-black/80 text-white backdrop-blur-sm",
        secondary:
          "border-white/10 bg-neutral-900 text-neutral-300",
        solid:
          "border-white bg-white text-black font-semibold",
        outline:
          "border-white/20 text-neutral-300 bg-transparent hover:border-white/40 hover:text-white",
        muted:
          "border-transparent bg-neutral-900/60 text-neutral-400 text-[9px]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

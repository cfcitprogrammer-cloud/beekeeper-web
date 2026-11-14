import { cn } from "@/lib/utils"

/**
 * Small ASCII bee mark. Used as a brand detail in the shell and auth screen.
 * Kept as plain text so it inherits the current text color and font size.
 */
export function AsciiBee({ className }: { className?: string }) {
  return (
    <pre
      aria-hidden
      className={cn(
        "select-none font-mono text-[0.625rem] leading-[1.05] whitespace-pre",
        className
      )}
    >{String.raw`   | )/ )
\\ |//,' __
(")(_)-"()))=-
   (\\`}</pre>
  )
}

/** Isometric honeycomb cells, used as a quiet background/section motif. */
export function AsciiComb({ className }: { className?: string }) {
  return (
    <pre
      aria-hidden
      className={cn(
        "select-none font-mono text-[0.5625rem] leading-[1.05] whitespace-pre",
        className
      )}
    >{String.raw`      /\        /\
     /  \      /  \
    /    \    /    \
   /      \  /      \
  /        \/        \
  \        /\        /
   \      /  \      /
    \    /    \    /
     \  /      \  /
      \/        \/`}</pre>
  )
}

/** A single hex cell, sized for compact corners and empty states. */
export function AsciiCell({ className }: { className?: string }) {
  return (
    <pre
      aria-hidden
      className={cn(
        "select-none font-mono text-[0.5625rem] leading-[1.05] whitespace-pre",
        className
      )}
    >{String.raw`   /\
  /  \
 /    \
 \    /
  \  /
   \/`}</pre>
  )
}

/** Section rule with a mono index, e.g. `02 // MODULES -------------`. */
export function SectionRule({
  index,
  label,
  trailing,
  className,
}: {
  index: string
  label: string
  trailing?: string
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="size-1 shrink-0 bg-primary" aria-hidden />
      <span className="font-mono text-[0.625rem] font-medium tracking-[0.22em] text-foreground uppercase">
        {`${index} // ${label}`}
      </span>
      <span className="h-px flex-1 bg-border" aria-hidden />
      {trailing ? (
        <span className="font-mono text-[0.5625rem] tracking-[0.16em] text-muted-foreground uppercase">
          {trailing}
        </span>
      ) : null}
    </div>
  )
}

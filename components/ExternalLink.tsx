import * as React from "react"
import { ExternalLink as ExternalLinkIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const REQUIRED_REL_TOKENS = ["noopener", "noreferrer"]

function mergeRel(rel?: string) {
  const tokens = new Set(
    rel
      ?.split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean)
  )

  REQUIRED_REL_TOKENS.forEach((token) => tokens.add(token))

  return Array.from(tokens).join(" ")
}

export interface ExternalLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  showIcon?: boolean
  newTabLabel?: string
  iconClassName?: string
}

const ExternalLink = React.forwardRef<HTMLAnchorElement, ExternalLinkProps>(
  (
    {
      children,
      className,
      iconClassName,
      newTabLabel = "opens in a new tab",
      rel,
      showIcon = true,
      target = "_blank",
      ...props
    },
    ref
  ) => (
    <a
      ref={ref}
      target={target}
      rel={target === "_blank" ? mergeRel(rel) : rel}
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    >
      {children}
      {showIcon ? (
        <ExternalLinkIcon
          aria-hidden="true"
          data-testid="external-link-icon"
          className={cn("h-3.5 w-3.5 shrink-0", iconClassName)}
        />
      ) : null}
      {target === "_blank" ? (
        <span className="sr-only"> {newTabLabel}</span>
      ) : null}
    </a>
  )
)
ExternalLink.displayName = "ExternalLink"

export { ExternalLink, mergeRel as mergeExternalLinkRel }

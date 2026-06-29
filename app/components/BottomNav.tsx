"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type BottomNavItem = {
  /** Route the item links to. */
  href: string;
  /** Visible, human-readable label. */
  label: string;
  /** Count of pending actions; renders a badge when greater than zero. */
  badgeCount?: number;
};

type BottomNavProps = {
  items: BottomNavItem[];
  /** Counts above this are rendered as "N+". */
  maxBadgeCount?: number;
};

/** True when `pathname` is `href` or a descendant route of it. */
function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Accessible mobile bottom navigation.
 *
 * Renders a fixed bottom bar of primary destinations. Each item can show a
 * badge with the number of pending actions; the count is also announced to
 * assistive tech via visually-hidden text so screen-reader users are not left
 * out. The active route is marked with `aria-current="page"`.
 */
export function BottomNav({ items, maxBadgeCount = 9 }: BottomNavProps) {
  const pathname = usePathname() ?? "/";

  return (
    <nav className="bottom-nav" aria-label="Primary">
      <ul className="bottom-nav__list">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const count = item.badgeCount ?? 0;
          const hasBadge = count > 0;
          const badgeLabel = count > maxBadgeCount ? `${maxBadgeCount}+` : String(count);

          return (
            <li className="bottom-nav__item" key={item.href}>
              <Link
                href={item.href}
                className={`bottom-nav__link${active ? " bottom-nav__link--active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <span className="bottom-nav__label">{item.label}</span>

                {hasBadge && (
                  <span className="bottom-nav__badge" aria-hidden="true">
                    {badgeLabel}
                  </span>
                )}
                {hasBadge && (
                  <span className="sr-only">{`${count} pending`}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

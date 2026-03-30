import React from "react";
import Link from "next/link";
import { ChevronRight, ArrowLeft } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
  isCurrentPage?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  backHref?: string;
  onBack?: () => void;
  className?: string;
}

export function Breadcrumbs({ items, backHref, onBack, className = "" }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={`flex flex-col gap-4 mb-6 ${className}`}>
      {/* Mobile Back Button */}
      {(backHref || onBack) && (
        <div className="md:hidden flex items-center">
          {backHref ? (
            <Link href={backHref} className="flex items-center text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="h-5 w-5 mr-1" />
              <span className="text-sm font-medium">Back</span>
            </Link>
          ) : (
             <button onClick={onBack} className="flex items-center text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="h-5 w-5 mr-1" />
              <span className="text-sm font-medium">Back</span>
            </button>
          )}
        </div>
      )}

      {/* Desktop & Tablet Breadcrumbs */}
      <ol className="hidden md:flex items-center gap-2 text-sm text-[#a3aac4]">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          
          return (
            <li key={`breadcrumb-${index}`} className="flex items-center">
              {item.href && !item.isCurrentPage ? (
                <Link
                  href={item.href}
                  className="hover:text-cyan-400 transition-colors uppercase tracking-widest font-medium text-xs"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={`${
                    item.isCurrentPage || isLast ? "text-[#69daff]" : "text-[#a3aac4]"
                  } font-medium tracking-widest text-xs uppercase`}
                  aria-current={item.isCurrentPage || isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
              
              {!isLast && (
                <span className="mx-2 flex text-slate-600">
                  <span className="text-[#a3aac4]/50">/</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

import React from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface HelpBreadcrumbProps {
  items: BreadcrumbItem[];
}

export function HelpBreadcrumb({ items }: HelpBreadcrumbProps) {
  return (
    <nav className="flex items-center space-x-2 text-sm text-slate-400 mb-6">
      <Link 
        href="/dashboard" 
        className="hover:text-white transition-colors flex items-center gap-1"
      >
        <Home className="w-4 h-4" />
        Dashboard
      </Link>
      
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="w-4 h-4" />
          {item.href ? (
            <Link 
              href={item.href}
              className="hover:text-white transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-white font-medium">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
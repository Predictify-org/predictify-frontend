import type { LucideIcon } from "lucide-react";

export interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  gradient: string;
  shadow: string;
}

export interface Step {
  step: string;
  title: string;
  description: string;
  gradient: string;
}

export interface WalletToken {
  name: string;
  icon?: LucideIcon;
  symbol?: string;
  color: string;
}

export interface Stat {
  value: string;
  label: string;
}

export interface SocialLink {
  icon: LucideIcon;
  href: string;
}

export interface NavLink {
  href: string;
  label: string;
}

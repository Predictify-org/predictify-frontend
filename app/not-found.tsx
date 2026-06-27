import Image from "next/image"
import Link from "next/link"
import { ArrowRight, BarChart3, CircleHelp, LayoutDashboard, Mail } from "lucide-react"

import { Button } from "@/components/ui/button"

const recoveryLinks = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Return to your account overview.",
    icon: LayoutDashboard,
  },
  {
    href: "/events",
    label: "Markets",
    description: "Browse live prediction markets.",
    icon: BarChart3,
  },
  {
    href: "/help",
    label: "Help",
    description: "Get support and product guidance.",
    icon: CircleHelp,
  },
]

export default function NotFound() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-10 px-6 py-10 md:flex-row md:items-center md:gap-14 lg:px-8">
        <section className="flex-1 space-y-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            404
          </p>
          <div className="space-y-4">
            <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
              This market slipped out of view.
            </h1>
            <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              The page may have moved, expired, or never existed. These shortcuts
              will get you back to a useful place.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {recoveryLinks.map(({ href, label, description, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group rounded-lg border bg-card p-4 text-card-foreground shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <span className="flex items-center justify-between gap-3">
                  <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  <ArrowRight
                    className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
                <span className="mt-4 block text-sm font-semibold">{label}</span>
                <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                  {description}
                </span>
              </Link>
            ))}
          </div>

          <Button asChild variant="outline">
            <a href="mailto:support@predictify.app?subject=Broken%20link%20report">
              <Mail className="h-4 w-4" aria-hidden="true" />
              Report a broken link
            </a>
          </Button>
        </section>

        <section className="flex flex-1 justify-center md:justify-end" aria-hidden="true">
          <Image
            src="/illustrations/404.svg"
            alt=""
            width={640}
            height={420}
            priority
            className="h-auto w-full max-w-lg"
          />
        </section>
      </div>
    </main>
  )
}

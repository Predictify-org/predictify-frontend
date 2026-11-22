"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LiveRegion } from "@/components/ui/live-region";
import {
  DASHBOARD_SECTIONS,
  moveSection,
  type DashboardSectionId,
  type SectionMoveDirection,
} from "@/lib/dashboard-layout";
import { useDashboardLayoutStore } from "@/app/state/dashboardLayout";

export function CustomizeLayoutPanel() {
  const [announcement, setAnnouncement] = useState("");
  const layout = useDashboardLayoutStore((state) => state.layout);
  const moveUp = useDashboardLayoutStore((state) => state.moveUp);
  const moveDown = useDashboardLayoutStore((state) => state.moveDown);
  const hide = useDashboardLayoutStore((state) => state.hide);
  const show = useDashboardLayoutStore((state) => state.show);
  const reset = useDashboardLayoutStore((state) => state.reset);
  const visibleCount = layout.filter((item) => item.visible).length;

  const move = (id: DashboardSectionId, direction: SectionMoveDirection) => {
    const nextLayout = moveSection(layout, id, direction);
    if (nextLayout === layout) return;

    if (direction === "up") moveUp(id);
    else moveDown(id);

    const section = DASHBOARD_SECTIONS.find((item) => item.id === id);
    const position = nextLayout.findIndex((item) => item.id === id) + 1;
    setAnnouncement(
      `${section?.label ?? "Section"} moved to position ${position} of ${layout.length}.`,
    );
  };

  const setVisibility = (id: DashboardSectionId, visible: boolean) => {
    const section = DASHBOARD_SECTIONS.find((item) => item.id === id);
    if (!section) return;

    if (visible) {
      show(id);
      setAnnouncement(`${section.label} shown.`);
      return;
    }

    if (visibleCount <= 1) return;
    hide(id);
    setAnnouncement(`${section.label} hidden.`);
  };

  const resetLayout = () => {
    reset();
    setAnnouncement("Dashboard layout reset to default.");
  };

  return (
    <>
      <LiveRegion message={announcement} data-testid="dashboard-layout-announcement" />
      <Sheet>
        <SheetTrigger asChild>
          <Button type="button" variant="outline">
            <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
            Customize
          </Button>
        </SheetTrigger>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto motion-reduce:animate-none motion-reduce:transition-none sm:max-w-md"
        >
          <SheetHeader>
            <SheetTitle>Customize dashboard</SheetTitle>
            <SheetDescription>
              Choose which sections appear and change their order.
            </SheetDescription>
          </SheetHeader>

          <ol aria-label="Dashboard sections" className="mt-6 space-y-3">
            {layout.map((item, index) => {
              const section = DASHBOARD_SECTIONS.find(
                (candidate) => candidate.id === item.id,
              );
              if (!section) return null;

              const isLastVisible = item.visible && visibleCount <= 1;
              return (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-md border p-3"
                >
                  <Checkbox
                    id={`dashboard-section-${item.id}`}
                    checked={item.visible}
                    disabled={isLastVisible || (!section.canHide && item.visible)}
                    onCheckedChange={(checked) =>
                      setVisibility(item.id, checked === true)
                    }
                    aria-label={`Show ${section.label}`}
                  />
                  <label
                    htmlFor={`dashboard-section-${item.id}`}
                    className="min-w-0 flex-1 text-sm font-medium"
                  >
                    {section.label}
                  </label>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={`Move ${section.label} up`}
                      disabled={index === 0}
                      onClick={() => move(item.id, "up")}
                    >
                      <ChevronUp aria-hidden="true" className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={`Move ${section.label} down`}
                      disabled={index === layout.length - 1}
                      onClick={() => move(item.id, "down")}
                    >
                      <ChevronDown aria-hidden="true" className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ol>

          <Button
            type="button"
            variant="outline"
            className="mt-6 w-full"
            onClick={resetLayout}
          >
            Reset to default
          </Button>
        </SheetContent>
      </Sheet>
    </>
  );
}

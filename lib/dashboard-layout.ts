export const DASHBOARD_SECTIONS = [
  { id: "notifications", label: "Notifications digest", defaultOrder: 0, canHide: true },
  { id: "metrics", label: "Key metrics", defaultOrder: 1, canHide: true },
  { id: "recently-viewed", label: "Recently viewed", defaultOrder: 2, canHide: true },
  { id: "active-bets", label: "Active bets", defaultOrder: 3, canHide: true },
  { id: "recommendations", label: "Recommendations", defaultOrder: 4, canHide: true },
  { id: "activity", label: "Activity", defaultOrder: 5, canHide: true },
] as const;

export type DashboardSectionId = (typeof DASHBOARD_SECTIONS)[number]["id"];

export interface DashboardLayoutItem {
  id: DashboardSectionId;
  visible: boolean;
}

export type DashboardLayout = DashboardLayoutItem[];
export type SectionMoveDirection = "up" | "down";

const SECTIONS_BY_ID = new Map<string, (typeof DASHBOARD_SECTIONS)[number]>(
  DASHBOARD_SECTIONS.map((section) => [section.id, section]),
);

export const DEFAULT_LAYOUT: DashboardLayout = [...DASHBOARD_SECTIONS]
  .sort((left, right) => left.defaultOrder - right.defaultOrder)
  .map(({ id }) => ({ id, visible: true }));

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeLayout(saved: unknown): DashboardLayout {
  if (!Array.isArray(saved)) {
    return DEFAULT_LAYOUT.map((item) => ({ ...item }));
  }

  const normalized: DashboardLayout = [];
  const seen = new Set<DashboardSectionId>();

  for (const candidate of saved) {
    if (!isRecord(candidate) || typeof candidate.id !== "string") continue;
    const section = SECTIONS_BY_ID.get(candidate.id);
    if (!section || seen.has(section.id)) continue;

    normalized.push({
      id: section.id,
      visible: typeof candidate.visible === "boolean" ? candidate.visible : true,
    });
    seen.add(section.id);
  }

  for (const { id } of [...DASHBOARD_SECTIONS].sort(
    (left, right) => left.defaultOrder - right.defaultOrder,
  )) {
    if (!seen.has(id)) normalized.push({ id, visible: true });
  }

  return normalized;
}

export function moveSection(
  layout: DashboardLayout,
  id: DashboardSectionId,
  direction: SectionMoveDirection,
): DashboardLayout {
  const currentIndex = layout.findIndex((section) => section.id === id);
  const nextIndex = currentIndex + (direction === "up" ? -1 : 1);
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= layout.length) return layout;

  const nextLayout = [...layout];
  [nextLayout[currentIndex], nextLayout[nextIndex]] = [
    nextLayout[nextIndex],
    nextLayout[currentIndex],
  ];
  return nextLayout;
}

export function setSectionVisibility(
  layout: DashboardLayout,
  id: DashboardSectionId,
  visible: boolean,
): DashboardLayout {
  const section = SECTIONS_BY_ID.get(id);
  const index = layout.findIndex((item) => item.id === id);
  if (!section || index < 0 || (!section.canHide && !visible)) return layout;
  if (layout[index].visible === visible) return layout;

  if (!visible && layout.filter((item) => item.visible).length <= 1) return layout;

  return layout.map((item) => (item.id === id ? { ...item, visible } : item));
}

export function toggleSection(
  layout: DashboardLayout,
  id: DashboardSectionId,
): DashboardLayout {
  const section = layout.find((item) => item.id === id);
  return section ? setSectionVisibility(layout, id, !section.visible) : layout;
}

import { cloneLayout, correctBounds, getCompactor } from "react-grid-layout/core";
import { AnyRecord } from "./types";

export const GRID_COLUMNS = 12;
export const GRID_COMPACTOR = getCompactor("vertical", false, false);
export const GRID_BREAKPOINTS: Record<string, number> = {
  lg: 1280,
  md: 1024,
  sm: 720,
  xs: 0,
};
export const GRID_COLUMNS_BY_BREAKPOINT: Record<string, number> = {
  lg: 12,
  md: 8,
  sm: 4,
  xs: 2,
};
export const GRID_ROW_HEIGHT_BY_BREAKPOINT: Record<string, number> = {
  lg: 18,
  md: 17,
  sm: 16,
  xs: 14,
};
export const GRID_RIGHT_SAFETY_GUTTER = 4;
export const GRID_MARGIN_BY_BREAKPOINT: Record<string, [number, number]> = {
  lg: [12, 12],
  md: [10, 10],
  sm: [8, 8],
  xs: [8, 8],
};
export const GRID_BREAKPOINT_ORDER = ["lg", "md", "sm", "xs"];

export const STORAGE_KEYS = {
  credentials: "neo-deck.credentials",
  workspace: "neo-deck.workspace",
  legacyWidgets: "neo-deck.widgets",
  legacyDashboardName: "neo-deck.dashboard-name",
};

export const DEFAULT_CREDENTIALS = {
  uri: "bolt://localhost:7687",
  username: "neo4j",
  password: "",
  database: "neo4j",
  connectionMode: "auto",
};

export const STARTER_QUERIES = [
  {
    title: "Active Projects",
    type: "stat",
    query: "MATCH (p:Project {status: 'active'}) RETURN count(p) AS active_projects",
  },
  {
    title: "Task Backlog",
    type: "table",
    query:
      "MATCH (t:Task) RETURN t.id AS id, t.title AS title, t.status AS status, t.priority AS priority ORDER BY t.id",
  },
  {
    title: "Team Flow Graph",
    type: "graph",
    query:
      "MATCH p=(team:Team)-[:OWNS]->(project:Project)-[:HAS_TASK]->(task:Task)<-[:ASSIGNED_TO]-(person:Person) RETURN p LIMIT 20",
  },
];

export function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createWidget(type = "graph", seed: AnyRecord = {}) {
  const baseLayouts: Record<string, AnyRecord> = {
    stat: { x: 0, y: Infinity, w: 3, h: 4 },
    table: { x: 3, y: Infinity, w: 4, h: 5 },
    graph: { x: 7, y: Infinity, w: 5, h: 7 },
    report: { x: 0, y: Infinity, w: 4, h: 7 },
    placeholder: { x: 0, y: Infinity, w: 4, h: 7 },
  };

  return {
    id: seed.id || createId(),
    title:
      seed.title ||
      (type === "report" ? "Report name..." : type === "placeholder" ? "Add report" : "Untitled Widget"),
    type,
    query:
      seed.query ??
      (type === "report" || type === "placeholder" ? "" : "MATCH p=(n)-[r]->(m) RETURN p LIMIT 20"),
    reportType: seed.reportType ?? "table",
    layout: seed.layout ? { ...seed.layout } : { ...baseLayouts[type] },
    result: null,
    error: "",
    isLoading: false,
    lastRunAt: null,
  };
}

const WIDGET_SIZE_RULES: Record<string, AnyRecord> = {
  stat: { minW: 2, maxW: 6, minH: 3, maxH: 6 },
  table: { minW: 3, maxW: 12, minH: 4, maxH: 10 },
  graph: { minW: 4, maxW: 12, minH: 5, maxH: 12 },
  report: { minW: 3, maxW: 12, minH: 5, maxH: 30 },
  placeholder: { minW: 3, maxW: 12, minH: 5, maxH: 30 },
};

export function getWidgetSizeRule(type = "graph") {
  return WIDGET_SIZE_RULES[type] || WIDGET_SIZE_RULES.graph;
}

export function toLayoutItem(widget: AnyRecord, cols = GRID_COLUMNS) {
  const sizeRule = getWidgetSizeRule(widget.type);
  const maxW = Math.max(1, Math.min(sizeRule.maxW, cols));
  const minW = Math.max(1, Math.min(sizeRule.minW, maxW));
  const maxH = Math.max(sizeRule.minH, sizeRule.maxH);
  const minH = Math.max(1, Math.min(sizeRule.minH, maxH));
  const boundedW = Math.max(minW, Math.min(widget.layout.w, maxW));
  const boundedH = Math.max(minH, Math.min(widget.layout.h, maxH));
  const boundedX = Number.isFinite(widget.layout.x)
    ? Math.max(0, Math.min(widget.layout.x, cols - boundedW))
    : 0;
  const boundedY = Number.isFinite(widget.layout.y) ? Math.max(0, widget.layout.y) : 0;

  return {
    i: widget.id,
    x: boundedX,
    y: boundedY,
    w: boundedW,
    h: boundedH,
    minW,
    maxW,
    minH,
    maxH,
    isDraggable: widget.type !== "placeholder",
    isResizable: widget.type !== "placeholder",
    isBounded: true,
  };
}

export function widgetsToLayout(widgets: AnyRecord[], cols = GRID_COLUMNS) {
  return widgets.map((widget) => toLayoutItem(widget, cols));
}

export function buildInitialWidgets() {
  return [
    createWidget("placeholder", {
      title: "Add report",
      query: "",
      layout: { x: 0, y: 0, w: 4, h: 7 },
    }),
  ];
}

export function ensurePlaceholderWidget(widgets: AnyRecord[] = []) {
  if (widgets.some((widget) => widget.type === "placeholder")) {
    return widgets;
  }

  return [
    ...widgets,
    createWidget("placeholder", {
      title: "Add report",
      query: "",
      layout: { x: 4, y: 0, w: 4, h: 7 },
    }),
  ];
}

export function buildStarterWidgets() {
  return STARTER_QUERIES.map((item, index) =>
    createWidget(item.type, {
      ...item,
      layout:
        index === 0
          ? { x: 0, y: 0, w: 3, h: 4 }
          : index === 1
            ? { x: 3, y: 0, w: 4, h: 5 }
            : { x: 7, y: 0, w: 5, h: 7 },
    })
  );
}

export function createDashboard(seed: AnyRecord = {}) {
  return {
    id: seed.id || createId(),
    name: seed.name || "Summary Dashboard",
    description: seed.description || "Reusable board for Neo4j analytics",
    widgets: (seed.widgets || buildInitialWidgets()).map((widget: AnyRecord) => createWidget(widget.type, widget)),
  };
}

export function buildDefaultWorkspace() {
  const dashboard = createDashboard();
  return {
    dashboards: [dashboard],
    activeDashboardId: dashboard.id,
  };
}

export function stripRuntime(widget: AnyRecord) {
  return {
    id: widget.id,
    title: widget.title,
    type: widget.type,
    query: widget.query,
    reportType: widget.reportType,
    layout: widget.layout,
  };
}

export function getBreakpointForWidth(width: number) {
  return GRID_BREAKPOINT_ORDER.find((breakpoint) => width >= GRID_BREAKPOINTS[breakpoint]) || "xs";
}

export function scaleLayoutAcrossColumns(layout: AnyRecord[], fromCols: number, toCols: number) {
  return layout.map((item) => {
    const nextW = Math.max(1, Math.min(toCols, Math.round((item.w / fromCols) * toCols)));
    const nextX = Math.max(0, Math.min(toCols - nextW, Math.round((item.x / fromCols) * toCols)));

    return {
      ...item,
      x: nextX,
      w: nextW,
    };
  });
}

function getLayoutBottom(layout: AnyRecord[]) {
  return layout.reduce((max, item) => Math.max(max, item.y + item.h), 0);
}

function layoutItemsOverlap(a: AnyRecord, b: AnyRecord) {
  if (a.i === b.i) {
    return false;
  }

  return !(a.x + a.w <= b.x || a.x >= b.x + b.w || a.y + a.h <= b.y || a.y >= b.y + b.h);
}

export function normalizeGridLayout(layout: AnyRecord[], cols = GRID_COLUMNS, pinnedItemId: string | null = null) {
  const pending = cloneLayout(layout as any)
    .map((item, index) => ({ ...item, _index: index }))
    .sort((a, b) => {
      if (pinnedItemId) {
        if (a.i === pinnedItemId && b.i !== pinnedItemId) {
          return -1;
        }

        if (b.i === pinnedItemId && a.i !== pinnedItemId) {
          return 1;
        }
      }

      const aY = Number.isFinite(a.y) ? a.y : Number.MAX_SAFE_INTEGER;
      const bY = Number.isFinite(b.y) ? b.y : Number.MAX_SAFE_INTEGER;
      if (aY !== bY) {
        return aY - bY;
      }

      if (a.x !== b.x) {
        return a.x - b.x;
      }

      return a._index - b._index;
    });

  const placed: AnyRecord[] = [];
  for (const item of pending) {
    const w = Math.max(1, Math.min(item.w ?? 1, cols));
    const h = Math.max(1, item.h ?? 1);
    const nextItem: AnyRecord = {
      ...item,
      w,
      h,
      x: Number.isFinite(item.x) ? Math.max(0, Math.min(item.x, cols - w)) : 0,
      y: Number.isFinite(item.y) ? Math.max(0, item.y) : getLayoutBottom(placed),
    };

    let safety = 0;
    while (true) {
      const collisions = placed.filter((placedItem) => layoutItemsOverlap(nextItem, placedItem));
      if (!collisions.length) {
        break;
      }

      nextItem.y = Math.max(...collisions.map((placedItem) => placedItem.y + placedItem.h));
      safety += 1;
      if (safety > layout.length * 4) {
        break;
      }
    }

    placed.push(nextItem);
  }

  const corrected = correctBounds(
    placed.map(({ _index, ...item }) => item) as any,
    { cols }
  ) as any;
  return GRID_COMPACTOR.compact(corrected as any, cols);
}

function boundGridLayout(layout: AnyRecord[], cols = GRID_COLUMNS) {
  return cloneLayout(layout as any).map((item) => {
    const w = Math.max(1, Math.min(item.w ?? 1, cols));
    const h = Math.max(1, item.h ?? 1);
    const x = Number.isFinite(item.x) ? Math.max(0, Math.min(item.x, cols - w)) : 0;
    const y = Number.isFinite(item.y) ? Math.max(0, item.y) : 0;

    return {
      ...item,
      w,
      h,
      x,
      y,
    };
  });
}

export function applyLayoutToWidgets(
  widgets: AnyRecord[],
  layout: AnyRecord[],
  pinnedItemId: string | null = null,
  cols = GRID_COLUMNS
) {
  void pinnedItemId;
  const boundedLayout = boundGridLayout(layout, cols);

  return widgets.map((widget) => {
    const layoutItem = boundedLayout.find((item) => item.i === widget.id);
    return layoutItem
      ? {
          ...widget,
          layout: {
            x: layoutItem.x,
            y: layoutItem.y,
            w: layoutItem.w,
            h: layoutItem.h,
          },
        }
      : widget;
  });
}

export function sanitizeDashboardWidgets(widgets: AnyRecord[] = []) {
  return applyLayoutToWidgets(widgets, widgetsToLayout(widgets, GRID_COLUMNS), null, GRID_COLUMNS);
}

export function restoreWorkspace(payload: AnyRecord) {
  const dashboards = (payload?.dashboards || []).map((dashboard: AnyRecord) =>
    createDashboard({
      ...dashboard,
      widgets: (dashboard.widgets || []).map((widget: AnyRecord) => createWidget(widget.type, widget)),
    })
  );

  const sanitizedDashboards = dashboards.map((dashboard: AnyRecord) => {
    const widgetsWithPlaceholder = ensurePlaceholderWidget(dashboard.widgets);
    const rawLayout = widgetsToLayout(widgetsWithPlaceholder, GRID_COLUMNS);

    return {
      ...dashboard,
      widgets: applyLayoutToWidgets(widgetsWithPlaceholder, rawLayout, null, GRID_COLUMNS),
    };
  });

  if (!sanitizedDashboards.length) {
    return buildDefaultWorkspace();
  }

  const activeDashboardId =
    payload.activeDashboardId && sanitizedDashboards.some((dashboard: AnyRecord) => dashboard.id === payload.activeDashboardId)
      ? payload.activeDashboardId
      : sanitizedDashboards[0].id;

  return {
    dashboards: sanitizedDashboards,
    activeDashboardId,
  };
}

export function formatValue(value: any) {
  if (value === null || value === undefined) {
    return "—";
  }

  if (typeof value === "number") {
    return new Intl.NumberFormat("id-ID").format(value);
  }

  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value);
}

export function getStatData(result: AnyRecord) {
  const firstRow = result?.rows?.[0];
  if (!firstRow) {
    return null;
  }

  const [key, value] = Object.entries(firstRow)[0] || [];
  if (!key) {
    return null;
  }

  return {
    label: key.replace(/_/g, " "),
    value: formatValue(value),
  };
}


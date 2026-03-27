"use client";

import clsx from "clsx";
import { tw } from "@/lib/tw";
import dynamic from "next/dynamic";
import GridLayout from "react-grid-layout";
import { cloneLayout, correctBounds, getCompactor } from "react-grid-layout/core";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  Cable,
  ChevronDown,
  CircleHelp,
  CirclePlay,
  Copy,
  Database,
  GripVertical,
  LayoutGrid,
  LogOut,
  MonitorSmartphone,
  MoreHorizontal,
  PencilLine,
  Plus,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  Trash2,
  Workflow,
  X,
  PlusSquare,
} from "lucide-react";

type AnyRecord = Record<string, any>;
type VoidFn = () => void;

type WidgetBodyProps = {
  widget: AnyRecord;
  onAddReport: VoidFn;
  reportSettingsOpen?: boolean;
  onToggleReportSettings?: VoidFn;
  onDeleteWidget?: VoidFn;
  onReportQueryChange?: (query: string) => void;
};

type EditorModalProps = {
  draft: AnyRecord | null;
  onChange: (nextDraft: AnyRecord) => void;
  onClose: VoidFn;
  onSave: VoidFn;
};


const GraphWidget = dynamic(() => import("@/components/graph-widget"), {
  ssr: false,
  loading: () => <div className={tw("graph-empty")}>Menyiapkan visual graph...</div>,
});
const GRID_COLUMNS = 12;
const GRID_COMPACTOR = getCompactor("vertical", false, false);
const GRID_BREAKPOINTS = {
  lg: 1280,
  md: 1024,
  sm: 720,
  xs: 0,
};
const GRID_COLUMNS_BY_BREAKPOINT = {
  lg: 12,
  md: 8,
  sm: 4,
  xs: 2,
};
const GRID_ROW_HEIGHT_BY_BREAKPOINT = {
  lg: 18,
  md: 17,
  sm: 16,
  xs: 14,
};
const GRID_RIGHT_SAFETY_GUTTER = 4;
const GRID_MARGIN_BY_BREAKPOINT = {
  lg: [12, 12],
  md: [10, 10],
  sm: [8, 8],
  xs: [8, 8],
};
const GRID_BREAKPOINT_ORDER = ["lg", "md", "sm", "xs"];

const STORAGE_KEYS = {
  credentials: "neo-deck.credentials",
  workspace: "neo-deck.workspace",
  legacyWidgets: "neo-deck.widgets",
  legacyDashboardName: "neo-deck.dashboard-name",
};

const DEFAULT_CREDENTIALS = {
  uri: "bolt://localhost:7687",
  username: "neo4j",
  password: "",
  database: "neo4j",
  connectionMode: "auto",
};

const STARTER_QUERIES = [
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

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createWidget(type = "graph", seed: AnyRecord = {}) {
  const baseLayouts = {
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
    query: seed.query ?? (type === "report" || type === "placeholder" ? "" : "MATCH p=(n)-[r]->(m) RETURN p LIMIT 20"),
    layout: seed.layout ? { ...seed.layout } : { ...baseLayouts[type] },
    result: null,
    error: "",
    isLoading: false,
    lastRunAt: null,
  };
}

const WIDGET_SIZE_RULES = {
  stat: { minW: 2, maxW: 6, minH: 3, maxH: 6 },
  table: { minW: 3, maxW: 12, minH: 4, maxH: 10 },
  graph: { minW: 4, maxW: 12, minH: 5, maxH: 12 },
  report: { minW: 3, maxW: 12, minH: 5, maxH: 30 },
  placeholder: { minW: 3, maxW: 12, minH: 5, maxH: 30 },
};

function getWidgetSizeRule(type = "graph") {
  return WIDGET_SIZE_RULES[type] || WIDGET_SIZE_RULES.graph;
}

function toLayoutItem(widget: AnyRecord, cols = GRID_COLUMNS) {
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
  const boundedY = Number.isFinite(widget.layout.y)
    ? Math.max(0, widget.layout.y)
    : 0;

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

function widgetsToLayout(widgets: AnyRecord[], cols = GRID_COLUMNS) {
  return widgets.map((widget) => toLayoutItem(widget, cols));
}

function buildInitialWidgets() {
  return [
    createWidget("placeholder", {
      title: "Add report",
      query: "",
      layout: { x: 0, y: 0, w: 4, h: 7 },
    }),
  ];
}

function ensurePlaceholderWidget(widgets: AnyRecord[] = []) {
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

function buildStarterWidgets() {
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

function createDashboard(seed: AnyRecord = {}) {
  return {
    id: seed.id || createId(),
    name: seed.name || "Summary Dashboard",
    description: seed.description || "Reusable board for Neo4j analytics",
    widgets: (seed.widgets || buildInitialWidgets()).map((widget) =>
      createWidget(widget.type, widget)
    ),
  };
}

function buildDefaultWorkspace() {
  const dashboard = createDashboard();
  return {
    dashboards: [dashboard],
    activeDashboardId: dashboard.id,
  };
}

function stripRuntime(widget: AnyRecord) {
  return {
    id: widget.id,
    title: widget.title,
    type: widget.type,
    query: widget.query,
    layout: widget.layout,
  };
}

function getBreakpointForWidth(width: number) {
  return GRID_BREAKPOINT_ORDER.find(
    (breakpoint) => width >= GRID_BREAKPOINTS[breakpoint]
  ) || "xs";
}

function scaleLayoutAcrossColumns(layout: AnyRecord[], fromCols: number, toCols: number) {
  return layout.map((item) => {
    const nextW = Math.max(1, Math.min(toCols, Math.round((item.w / fromCols) * toCols)));
    const nextX = Math.max(
      0,
      Math.min(toCols - nextW, Math.round((item.x / fromCols) * toCols))
    );

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

  return !(
    a.x + a.w <= b.x ||
    a.x >= b.x + b.w ||
    a.y + a.h <= b.y ||
    a.y >= b.y + b.h
  );
}

function normalizeGridLayout(layout: AnyRecord[], cols = GRID_COLUMNS, pinnedItemId: string | null = null) {
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

  const placed = [];
  for (const item of pending) {
    const w = Math.max(1, Math.min(item.w ?? 1, cols));
    const h = Math.max(1, item.h ?? 1);
    const nextItem = {
      ...item,
      w,
      h,
      x: Number.isFinite(item.x)
        ? Math.max(0, Math.min(item.x, cols - w))
        : 0,
      y: Number.isFinite(item.y) ? Math.max(0, item.y) : getLayoutBottom(placed),
    };

    let safety = 0;
    while (true) {
      const collisions = placed.filter((placedItem) =>
        layoutItemsOverlap(nextItem, placedItem)
      );
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
    placed.map(({ _index, ...item }) => item),
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

function applyLayoutToWidgets(
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

function sanitizeDashboardWidgets(widgets: AnyRecord[] = []) {
  return applyLayoutToWidgets(
    widgets,
    widgetsToLayout(widgets, GRID_COLUMNS),
    null,
    GRID_COLUMNS
  );
}

function restoreWorkspace(payload: AnyRecord) {
  const dashboards = (payload?.dashboards || []).map((dashboard) =>
    createDashboard({
      ...dashboard,
      widgets: (dashboard.widgets || []).map((widget) =>
        createWidget(widget.type, widget)
      ),
    })
  );

  const sanitizedDashboards = dashboards.map((dashboard) => {
    const widgetsWithPlaceholder = ensurePlaceholderWidget(dashboard.widgets);
    const rawLayout = widgetsToLayout(widgetsWithPlaceholder, GRID_COLUMNS);

    return {
      ...dashboard,
      widgets: applyLayoutToWidgets(
        widgetsWithPlaceholder,
        rawLayout,
        null,
        GRID_COLUMNS
      ),
    };
  });

  if (!sanitizedDashboards.length) {
    return buildDefaultWorkspace();
  }

  const activeDashboardId =
    payload.activeDashboardId &&
    sanitizedDashboards.some((dashboard) => dashboard.id === payload.activeDashboardId)
      ? payload.activeDashboardId
      : sanitizedDashboards[0].id;

  return {
    dashboards: sanitizedDashboards,
    activeDashboardId,
  };
}

function formatValue(value: any) {
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

function getStatData(result: AnyRecord) {
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

async function postJson(url: string, body: AnyRecord) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Request gagal.");
  }

  return payload;
}

function WidgetBody({
  widget,
  onAddReport,
  reportSettingsOpen = false,
  onToggleReportSettings = () => {},
  onDeleteWidget = () => {},
  onReportQueryChange = () => {},
}: WidgetBodyProps) {
  if (widget.type === "placeholder") {
    return (
      <div className={tw("add-report-shell")}>
        <button className={tw("add-report-button")} type="button" onClick={onAddReport}>
          <PlusSquare size={34} />
        </button>
      </div>
    );
  }

  if (widget.type === "report") {
    return (
      <div className={tw("report-template")}>
        {reportSettingsOpen ? (
          <div className={tw("report-settings-panel")}>
            <div className={tw("report-settings-toolbar")}>
              <div className={tw("report-settings-left")}>
                <span className={`rgl-drag-handle ${tw("widget-drag report-drag")}`}>
                  <GripVertical size={16} />
                </span>
                <button className={tw("report-icon ghost")} type="button" aria-label="Help">
                  <CircleHelp size={18} />
                </button>
                <button
                  className={tw("report-icon danger")}
                  type="button"
                  aria-label="Delete"
                  onClick={onDeleteWidget}
                >
                  <Trash2 size={18} />
                </button>
                <button className={tw("report-icon success")} type="button" aria-label="Copy">
                  <Copy size={18} />
                </button>
              </div>
              <button
                className={tw("report-play-button")}
                type="button"
                aria-label="Run"
                onClick={onToggleReportSettings}
              >
                <CirclePlay size={18} />
              </button>
            </div>

            <div className={tw("report-settings-grid")}>
              <label className={tw("report-field")}>
                <span>Type</span>
                <button type="button" className={tw("report-select")}>
                  <span>Table</span>
                  <ChevronDown size={20} />
                </button>
              </label>
            </div>

            <div className={tw("report-query-box")}>
              <textarea
                value={widget.query || ""}
                onChange={(event) => onReportQueryChange(event.target.value)}
                spellCheck="false"
                aria-label="Query"
              />
              <div className={tw("report-query-hint")}>A table will contain all returned data.</div>
            </div>

            <div className={tw("report-advanced-row")}>
              <button className={tw("report-switch")} type="button" aria-label="Advanced settings">
                <span />
              </button>
              <span>Advanced settings</span>
            </div>
          </div>
        ) : (
          <>
            <div className={tw("report-template-head")}>
              <span className={`rgl-drag-handle ${tw("widget-drag report-drag")}`}>
                <GripVertical size={16} />
              </span>
              <span>{widget.title || "Report name..."}</span>
              <button
                className={tw("report-more-button")}
                type="button"
                onClick={onToggleReportSettings}
                aria-label="Open report settings"
              >
                <MoreHorizontal size={16} />
              </button>
            </div>
            <p>
              No query specified.
              <br />
              Use the{" "}
              <button type="button" onClick={onToggleReportSettings}>
                Report Settings
              </button>{" "}
              button to get started.
            </p>
          </>
        )}
      </div>
    );
  }

  if (widget.error) {
    return <div className={tw("widget-error")}>{widget.error}</div>;
  }

  if (!widget.result && !widget.isLoading) {
    return (
      <div className={tw("widget-empty")}>
        Jalankan query untuk melihat hasil widget ini.
      </div>
    );
  }

  if (widget.isLoading) {
    return <div className={tw("widget-empty")}>Menjalankan query...</div>;
  }

  if (widget.type === "stat") {
    const stat = getStatData(widget.result);
    return stat ? (
      <div className={tw("stat-card")}>
        <div className={tw("stat-value")}>{stat.value}</div>
        <div className={tw("stat-label")}>{stat.label}</div>
      </div>
    ) : (
      <div className={tw("widget-empty")}>Query stat tidak mengembalikan nilai tunggal.</div>
    );
  }

  if (widget.type === "table") {
    return (
      <div className={tw("table-shell")}>
        <table>
          <thead>
            <tr>
              {widget.result.columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {widget.result.rows.slice(0, 16).map((row, index) => (
              <tr key={`${widget.id}-${index}`}>
                {widget.result.columns.map((column) => (
                  <td key={`${index}-${column}`}>{formatValue(row[column])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return <GraphWidget graph={widget.result.graph} />;
}

function EditorModal({ draft, onChange, onClose, onSave }: EditorModalProps) {
  if (!draft) {
    return null;
  }

  return (
    <div className={tw("modal-backdrop")}>
      <div className={tw("editor-modal")}>
        <div className={tw("modal-head")}>
          <div>
            <div className={tw("eyebrow")}>Widget Editor</div>
            <h3>{draft.isNew ? "Create widget" : "Refine widget"}</h3>
          </div>
          <button className={tw("icon-button")} onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        <div className={tw("editor-grid")}>
          <label>
            <span>Title</span>
            <input
              value={draft.title}
              onChange={(event) => onChange({ ...draft, title: event.target.value })}
              placeholder="Contoh: Nilai Tender per Tahun"
            />
          </label>

          <label>
            <span>Widget type</span>
            <select
              value={draft.type}
              onChange={(event) => onChange({ ...draft, type: event.target.value })}
            >
              <option value="stat">Stat</option>
              <option value="table">Table</option>
              <option value="graph">Graph</option>
            </select>
          </label>
        </div>

        <label className={tw("editor-query")}>
          <span>Cypher query</span>
          <textarea
            value={draft.query}
            onChange={(event) => onChange({ ...draft, query: event.target.value })}
            spellCheck="false"
            placeholder="MATCH p=(n)-[r]->(m) RETURN p LIMIT 20"
          />
        </label>

        <div className={tw("recipe-strip")}>
          {STARTER_QUERIES.map((preset) => (
            <button
              key={preset.title}
              className={tw("recipe-card")}
              type="button"
              onClick={() =>
                onChange({
                  ...draft,
                  title: preset.title,
                  type: preset.type,
                  query: preset.query,
                })
              }
            >
              <strong>{preset.title}</strong>
              <span>{preset.type}</span>
            </button>
          ))}
        </div>

        <div className={tw("modal-actions")}>
          <button className={tw("ghost-button")} onClick={onClose} type="button">
            Batal
          </button>
          <button className={tw("primary-button")} onClick={onSave} type="button">
            Simpan Widget
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BuilderApp() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [gridWidth, setGridWidth] = useState(1280);
  const initialWorkspace = useMemo(() => buildDefaultWorkspace(), []);
  const [credentials, setCredentials] = useState<AnyRecord>(DEFAULT_CREDENTIALS);
  const [dashboards, setDashboards] = useState<AnyRecord[]>(initialWorkspace.dashboards);
  const [activeDashboardId, setActiveDashboardId] = useState(
    initialWorkspace.activeDashboardId
  );
  const [editorDraft, setEditorDraft] = useState<AnyRecord | null>(null);
  const [dashboardSearch, setDashboardSearch] = useState("");
  const [connected, setConnected] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState<AnyRecord | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [bannerError, setBannerError] = useState("");
  const [activeBreakpoint, setActiveBreakpoint] = useState("lg");
  const [reportSettingsByWidget, setReportSettingsByWidget] = useState<AnyRecord>({});
  const autoScrollFrameRef = useRef(0);

  useEffect(() => {
    const storedCredentials = window.localStorage.getItem(STORAGE_KEYS.credentials);
    const storedWorkspace = window.localStorage.getItem(STORAGE_KEYS.workspace);
    const legacyWidgets = window.localStorage.getItem(STORAGE_KEYS.legacyWidgets);
    const legacyDashboardName = window.localStorage.getItem(
      STORAGE_KEYS.legacyDashboardName
    );

    if (storedCredentials) {
      const parsed = JSON.parse(storedCredentials);
      setCredentials((current) => ({
        ...current,
        ...parsed,
        connectionMode: parsed.connectionMode || "auto",
        password: "",
      }));
    }

    if (storedWorkspace) {
      const workspace = restoreWorkspace(JSON.parse(storedWorkspace));
      setDashboards(workspace.dashboards);
      setActiveDashboardId(workspace.activeDashboardId);
      return;
    }

    if (legacyWidgets || legacyDashboardName) {
      const widgets = legacyWidgets
        ? JSON.parse(legacyWidgets).map((widget) => createWidget(widget.type, widget))
        : buildStarterWidgets();

      const migrated = restoreWorkspace({
        dashboards: [
          {
            name: legacyDashboardName || "Summary Dashboard",
            widgets,
          },
        ],
      });

      setDashboards(migrated.dashboards);
      setActiveDashboardId(migrated.activeDashboardId);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !connected) {
      return;
    }

    const updateBreakpoint = () => {
      setActiveBreakpoint(getBreakpointForWidth(window.innerWidth));
    };

    updateBreakpoint();
    window.addEventListener("resize", updateBreakpoint);
    return () => window.removeEventListener("resize", updateBreakpoint);
  }, [connected]);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEYS.credentials,
      JSON.stringify({
        uri: credentials.uri,
        username: credentials.username,
        database: credentials.database,
        connectionMode: credentials.connectionMode,
      })
    );
  }, [
    credentials.uri,
    credentials.username,
    credentials.database,
    credentials.connectionMode,
  ]);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEYS.workspace,
      JSON.stringify({
        activeDashboardId,
        dashboards: dashboards.map((dashboard) => ({
          id: dashboard.id,
          name: dashboard.name,
          description: dashboard.description,
          widgets: dashboard.widgets.map(stripRuntime),
        })),
      })
    );
  }, [dashboards, activeDashboardId]);

  const activeDashboard = useMemo(
    () =>
      dashboards.find((dashboard) => dashboard.id === activeDashboardId) ||
      dashboards[0] ||
      null,
    [dashboards, activeDashboardId]
  );

  const filteredDashboards = useMemo(() => {
    const term = dashboardSearch.trim().toLowerCase();
    if (!term) {
      return dashboards;
    }

    return dashboards.filter((dashboard) =>
      dashboard.name.toLowerCase().includes(term)
    );
  }, [dashboardSearch, dashboards]);

  const dashboardStats = useMemo(() => {
    const widgets = activeDashboard?.widgets || [];
    const totalRows = widgets.reduce(
      (sum, widget) => sum + (widget.result?.rows?.length || 0),
      0
    );

    return {
      widgets: widgets.length,
      loaded: widgets.filter((widget) => widget.result).length,
      rows: totalRows,
    };
  }, [activeDashboard]);

  function updateDashboard(dashboardId, updater) {
    setDashboards((current) =>
      current.map((dashboard) => {
        if (dashboard.id !== dashboardId) {
          return dashboard;
        }

        const nextDashboard = typeof updater === "function"
          ? updater(dashboard)
          : { ...dashboard, ...updater };

        return {
          ...nextDashboard,
          widgets: sanitizeDashboardWidgets(nextDashboard.widgets || []),
        };
      })
    );
  }

  function updateWidget(dashboardId, widgetId, updater) {
    updateDashboard(dashboardId, (dashboard) => ({
      ...dashboard,
      widgets: dashboard.widgets.map((widget) =>
        widget.id === widgetId
          ? typeof updater === "function"
            ? updater(widget)
            : { ...widget, ...updater }
          : widget
      ),
    }));
  }

  async function handleConnect(event) {
    event.preventDefault();
    setBannerError("");
    setIsConnecting(true);

    try {
      const payload = await postJson("/api/neo4j/test", credentials);
      setConnected(true);
      setConnectionInfo(payload);
      if (activeDashboard?.widgets?.length) {
        await Promise.all(
          activeDashboard.widgets
            .filter((widget) => widget.type !== "placeholder" && widget.type !== "report")
            .map((widget) => runWidget(activeDashboard.id, widget))
        );
      }
    } catch (error) {
      setBannerError(error.message);
      setConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }

  async function runWidget(dashboardId, widgetInput) {
    const widget =
      typeof widgetInput === "string"
        ? dashboards
            .find((dashboard) => dashboard.id === dashboardId)
            ?.widgets.find((item) => item.id === widgetInput)
        : widgetInput;

    if (!widget) {
      return;
    }

    if (widget.type === "placeholder" || widget.type === "report") {
      return;
    }

    updateWidget(dashboardId, widget.id, { isLoading: true, error: "" });

    try {
      const payload = await postJson("/api/neo4j/query", {
        credentials,
        query: widget.query,
      });

      startTransition(() => {
        updateWidget(dashboardId, widget.id, {
          isLoading: false,
          error: "",
          result: payload.result,
          lastRunAt: new Date().toISOString(),
        });
      });

      if (payload.resolvedUri) {
        setConnectionInfo((current) => ({
          ...(current || {}),
          resolvedUri: payload.resolvedUri,
        }));
      }
    } catch (error) {
      startTransition(() => {
        updateWidget(dashboardId, widget.id, {
          isLoading: false,
          error: error.message,
        });
      });
    }
  }

  async function runAllWidgets() {
    if (!activeDashboard) {
      return;
    }

    setBannerError("");
    await Promise.all(
      activeDashboard.widgets
        .filter((widget) => widget.type !== "placeholder" && widget.type !== "report")
        .map((widget) => runWidget(activeDashboard.id, widget))
    );
  }

  function addReportFromPlaceholder(dashboardId, placeholderId) {
    updateDashboard(dashboardId, (dashboard) => {
      const placeholderWidget = dashboard.widgets.find(
        (widget) => widget.id === placeholderId
      );
      if (!placeholderWidget) {
        return dashboard;
      }

      const nextWidgets = dashboard.widgets.filter((widget) => widget.id !== placeholderId);
      const placeholderLayout = placeholderWidget.layout;
      const report = createWidget("report", {
        title: "Report name...",
        query: "",
        layout: {
          x: placeholderLayout.x,
          y: placeholderLayout.y,
          w: placeholderLayout.w,
          h: placeholderLayout.h,
        },
      });

      const nextPlaceholderX = placeholderLayout.x + placeholderLayout.w;
      const nextPlaceholderFits = nextPlaceholderX + placeholderLayout.w <= GRID_COLUMNS;
      const placeholder = createWidget("placeholder", {
        title: "Add report",
        query: "",
        layout: nextPlaceholderFits
          ? {
              x: nextPlaceholderX,
              y: placeholderLayout.y,
              w: placeholderLayout.w,
              h: placeholderLayout.h,
            }
          : {
              x: 0,
              y: placeholderLayout.y + placeholderLayout.h,
              w: placeholderLayout.w,
              h: placeholderLayout.h,
            },
      });

      const merged = [report, ...nextWidgets, placeholder];
      const nextLayout = widgetsToLayout(merged, GRID_COLUMNS);

      return {
        ...dashboard,
        widgets: applyLayoutToWidgets(merged, nextLayout),
      };
    });
  }

  function openCreateWidget(type, preset = null) {
    const nextWidget = createWidget(type, preset || {});
    setEditorDraft({
      ...nextWidget,
      dashboardId: activeDashboardId,
      isNew: true,
    });
  }

  function addDashboard() {
    const nextDashboard = createDashboard({
      name: `Dashboard ${dashboards.length + 1}`,
      widgets: buildInitialWidgets(),
    });
    setDashboards((current) => [...current, nextDashboard]);
    setActiveDashboardId(nextDashboard.id);
  }

  function removeWidget(dashboardId, widgetId) {
    updateDashboard(dashboardId, (dashboard) => ({
      ...dashboard,
      widgets: applyLayoutToWidgets(
        dashboard.widgets.filter((widget) => widget.id !== widgetId),
        widgetsToLayout(
          dashboard.widgets.filter((widget) => widget.id !== widgetId),
          GRID_COLUMNS
        )
      ),
    }));
  }

  function saveDraft() {
    if (!editorDraft) {
      return;
    }

    const dashboardId = editorDraft.dashboardId || activeDashboardId;

    updateDashboard(dashboardId, (dashboard) => {
      const nextWidgets = dashboard.widgets.some(
        (widget) => widget.id === editorDraft.id
      )
        ? dashboard.widgets.map((widget) =>
            widget.id === editorDraft.id
              ? {
                  ...widget,
                  title: editorDraft.title,
                  type: editorDraft.type,
                  query: editorDraft.query,
                }
              : widget
          )
        : [
            ...dashboard.widgets,
            createWidget(editorDraft.type, {
              id: editorDraft.id,
              title: editorDraft.title,
              query: editorDraft.query,
              layout: editorDraft.layout,
            }),
          ];

      const nextLayouts = widgetsToLayout(nextWidgets, GRID_COLUMNS);

      return {
        ...dashboard,
        widgets: applyLayoutToWidgets(nextWidgets, nextLayouts, editorDraft.id),
      };
    });

    setEditorDraft(null);
  }

  function syncDashboardLayout(nextLayout, _oldItem = null, activeItem = null) {
    if (!activeDashboard) {
      return;
    }

    const activeCols = GRID_COLUMNS_BY_BREAKPOINT[activeBreakpoint];
    const boundedActiveLayout = correctBounds(nextLayout as any, { cols: activeCols });
    const desktopLayout =
      activeCols === GRID_COLUMNS
        ? boundedActiveLayout
        : correctBounds(
            scaleLayoutAcrossColumns(boundedActiveLayout as any, activeCols, GRID_COLUMNS) as any,
            { cols: GRID_COLUMNS }
          ) as any;

    updateDashboard(activeDashboard.id, (dashboard) => ({
      ...dashboard,
      widgets: applyLayoutToWidgets(
        dashboard.widgets,
        desktopLayout,
        activeItem?.i || null,
        GRID_COLUMNS
      ),
    }));
  }

  function handleLayoutChange(nextLayout) {
    // GridLayout already manages the active drag/resize placeholder internally.
    // We only persist to dashboard state on stop handlers to avoid visual drift.
    void nextLayout;
  }

  function queueViewportAutoScroll(nativeEvent) {
    if (typeof window === "undefined") {
      return;
    }

    const pointer =
      nativeEvent?.touches?.[0] ||
      nativeEvent?.changedTouches?.[0] ||
      nativeEvent;

    if (!pointer || typeof pointer.clientY !== "number") {
      return;
    }

    const threshold = 120;
    const bottomEdge = window.innerHeight - threshold;
    const topEdge = threshold;
    let deltaY = 0;

    if (pointer.clientY > bottomEdge) {
      deltaY = Math.min(40, Math.ceil((pointer.clientY - bottomEdge) / 2.2));
    } else if (pointer.clientY < topEdge) {
      deltaY = -Math.min(40, Math.ceil((topEdge - pointer.clientY) / 2.2));
    }

    if (!deltaY || autoScrollFrameRef.current) {
      return;
    }

    autoScrollFrameRef.current = window.requestAnimationFrame(() => {
      window.scrollBy(0, deltaY);
      autoScrollFrameRef.current = 0;
    });
  }

  function handleGridPointerMove(_layout, _oldItem, _newItem, _placeholder, event) {
    queueViewportAutoScroll(event);
  }

  useEffect(
    () => () => {
      if (typeof window !== "undefined" && autoScrollFrameRef.current) {
        window.cancelAnimationFrame(autoScrollFrameRef.current);
      }
    },
    []
  );

  const widgets = activeDashboard?.widgets || [];
  function toggleReportSettings(widgetId) {
    setReportSettingsByWidget((current) => ({
      ...current,
      [widgetId]: !current[widgetId],
    }));
  }

  const activeGridCols = GRID_COLUMNS_BY_BREAKPOINT[activeBreakpoint];
  const activeRowHeight = GRID_ROW_HEIGHT_BY_BREAKPOINT[activeBreakpoint];
  const activeGridMargin = GRID_MARGIN_BY_BREAKPOINT[activeBreakpoint];
  const effectiveGridWidth = Math.max(0, Math.floor(gridWidth));
  const gridRenderKey = `${activeBreakpoint}-${activeGridCols}-${effectiveGridWidth}`;
  const renderedLayout = useMemo(
    () => {
      const desktopLayout = widgetsToLayout(widgets, GRID_COLUMNS);

      const responsiveLayout =
        activeGridCols === GRID_COLUMNS
          ? desktopLayout
          : scaleLayoutAcrossColumns(desktopLayout, GRID_COLUMNS, activeGridCols);

      return correctBounds(responsiveLayout as any, { cols: activeGridCols });
    },
    [widgets, activeGridCols]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!connected) {
      return;
    }

    const node = containerRef.current;
    if (!node) {
      return;
    }

    const measure = () => {
      const nextWidth = Math.max(
        0,
        Math.floor(node.clientWidth - GRID_RIGHT_SAFETY_GUTTER)
      );
      setGridWidth((prev) => (prev !== nextWidth ? nextWidth : prev));
    };

    measure();

    const observer = new ResizeObserver(() => {
      measure();
    });
    observer.observe(node);
    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [connected]);

  if (!connected) {
    return (
      <main className={tw("login-shell")}>
        <section className={tw("hero-panel")}>
          <div className={tw("eyebrow")}>NeoDeck Builder</div>
          <h1>Siap connect ke Neo4j local maupun instance remote lain.</h1>
          <p>
            Aplikasi ini tidak terkunci ke localhost. Selama backend Next.js ini bisa
            reach host Neo4j tujuan, Anda bisa connect ke `bolt://192.168.18.16:7687`,
            domain publik, atau instance lainnya.
          </p>

          <div className={tw("feature-grid")}>
            <article>
              <Sparkles size={18} />
              <strong>Modern NeoDash Feel</strong>
              <span>Dark chrome, sidebar dashboard, tabs, dan grid workspace modern.</span>
            </article>
            <article>
              <LayoutGrid size={18} />
              <strong>Drag, Resize, Organize</strong>
              <span>Widget tetap bisa drag and drop dan resize supaya layout rapih.</span>
            </article>
            <article>
              <Workflow size={18} />
              <strong>Remote Instance Ready</strong>
              <span>Support direct bolt:// maupun routed neo4j:// dengan fallback otomatis.</span>
            </article>
          </div>

          <div className={tw("hero-metrics")}>
            <div>
              <span>Single instance</span>
              <strong>`bolt://192.168.18.16:7687` + Direct</strong>
            </div>
            <div>
              <span>Cluster routing</span>
              <strong>`neo4j://host:7687` + Routed</strong>
            </div>
            <div>
              <span>Public app note</span>
              <strong>Server app harus bisa reach host target</strong>
            </div>
          </div>
        </section>

        <section className={tw("login-panel")}>
          <form className={tw("login-card")} onSubmit={handleConnect}>
            <div className={tw("login-head")}>
              <div>
                <div className={tw("eyebrow")}>Connect</div>
                <h2>Masuk ke Neo4j</h2>
              </div>
              <div className={tw("security-pill")}>
                <ShieldCheck size={16} />
                Password tidak disimpan di local storage.
              </div>
            </div>

            <label>
              <span>Neo4j URI</span>
              <input
                value={credentials.uri}
                onChange={(event) =>
                  setCredentials((current) => ({
                    ...current,
                    uri: event.target.value,
                  }))
                }
                placeholder="bolt://192.168.18.16:7687"
              />
            </label>

            <div className={tw("dual-grid")}>
              <label>
                <span>Username</span>
                <input
                  value={credentials.username}
                  onChange={(event) =>
                    setCredentials((current) => ({
                      ...current,
                      username: event.target.value,
                    }))
                  }
                  placeholder="neo4j"
                />
              </label>

              <label>
                <span>Database</span>
                <input
                  value={credentials.database}
                  onChange={(event) =>
                    setCredentials((current) => ({
                      ...current,
                      database: event.target.value,
                    }))
                  }
                  placeholder="neo4j"
                />
              </label>
            </div>

            <div className={tw("dual-grid")}>
              <label>
                <span>Connection Mode</span>
                <select
                  value={credentials.connectionMode}
                  onChange={(event) =>
                    setCredentials((current) => ({
                      ...current,
                      connectionMode: event.target.value,
                    }))
                  }
                >
                  <option value="auto">Auto</option>
                  <option value="direct">Direct</option>
                  <option value="routing">Routed</option>
                </select>
              </label>

              <label>
                <span>Password</span>
                <input
                  type="password"
                  value={credentials.password}
                  onChange={(event) =>
                    setCredentials((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  placeholder="Masukkan password Neo4j"
                />
              </label>
            </div>

            <div className={tw("remote-callout-grid")}>
              <div className={tw("callout-card")}>
                <Cable size={16} />
                <div>
                  <strong>Direct mode</strong>
                  <span>Pakai untuk IP / single instance agar tidak kena error routing table.</span>
                </div>
              </div>
              <div className={tw("callout-card")}>
                <MonitorSmartphone size={16} />
                <div>
                  <strong>Public deployment</strong>
                  <span>App server ini harus punya akses jaringan ke host Neo4j yang dipilih.</span>
                </div>
              </div>
            </div>

            {bannerError ? <div className={tw("inline-error")}>{bannerError}</div> : null}

            <button className={tw("primary-button login-button")} type="submit">
              {isConnecting ? "Connecting..." : "Connect & Open Builder"}
              <ArrowRight size={18} />
            </button>

            <div className={tw("hint-row")}>
              <Database size={16} />
              Untuk screenshot error routing table seperti NeoDash, biasanya cukup ganti ke
              `bolt://...` atau pilih Direct mode.
            </div>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className={tw("chrome-shell")}>
      <header className={tw("chrome-topbar")}>
        <div className={tw("chrome-brand")}>
          <div className={tw("brand-mark")}>N</div>
          <div>
            <strong>NeoDeck Studio</strong>
            <span>Neo4j dashboard workspace</span>
          </div>
        </div>

        <div className={tw("chrome-connection")}>
          <Server size={16} />
          <span>{connectionInfo?.resolvedUri || credentials.uri}</span>
          <em>{connectionInfo?.resolvedMode || credentials.connectionMode}</em>
        </div>

        <div className={tw("chrome-actions")}>
          <button className={tw("ghost-button")} type="button" onClick={runAllWidgets}>
            <RefreshCw size={16} />
            Refresh Widgets
          </button>
          <button
            className={tw("ghost-button")}
            type="button"
            onClick={() => {
              setConnected(false);
              setCredentials((current) => ({ ...current, password: "" }));
            }}
          >
            <LogOut size={16} />
            Disconnect
          </button>
        </div>
      </header>

      <div className={tw("workspace-shell")}>
        <aside className={tw("neo-sidebar")}>
          <div className={tw("sidebar-head")}>
            <div>
              <span className={tw("sidebar-caption")}>Dashboards</span>
              <strong>{dashboards.length} workspace</strong>
            </div>

            <div className={tw("sidebar-head-actions")}>
              <button className={tw("icon-button")} type="button" onClick={addDashboard}>
                <Plus size={16} />
              </button>
              <button className={tw("icon-button")} type="button" onClick={runAllWidgets}>
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          <label className={tw("sidebar-search")}>
            <Search size={16} />
            <input
              value={dashboardSearch}
              onChange={(event) => setDashboardSearch(event.target.value)}
              placeholder="Search dashboard..."
            />
          </label>

          <div className={tw("dashboard-list")}>
            {filteredDashboards.map((dashboard) => (
              <button
                key={dashboard.id}
                type="button"
                className={tw(clsx("dashboard-row", { "dashboard-row-active": dashboard.id === activeDashboardId }))}
                onClick={() => setActiveDashboardId(dashboard.id)}
              >
                <div className={tw("dashboard-row-copy")}>
                  <strong>{dashboard.name}</strong>
                  <span>{dashboard.widgets.length} widgets</span>
                </div>
                <MoreHorizontal size={16} />
              </button>
            ))}
          </div>

          <div className={tw("sidebar-summary-card")}>
            <div className={tw("sidebar-summary-head")}>
              <Database size={16} />
              <strong>Connection</strong>
            </div>
            <div className={tw("meta-list compact")}>
              <div>
                <span>URI</span>
                <strong>{connectionInfo?.resolvedUri || credentials.uri}</strong>
              </div>
              <div>
                <span>DB</span>
                <strong>{connectionInfo?.database || credentials.database}</strong>
              </div>
              <div>
                <span>User</span>
                <strong>{credentials.username}</strong>
              </div>
            </div>
          </div>
        </aside>

        <section className={tw("neo-main")}>
          <div className={tw("main-hero")}>
            <div className={tw("main-hero-copy")}>
              <div className={tw("eyebrow")}>Workspace Builder</div>
              <div className={tw("title-row")}>
                <PencilLine size={18} />
                <input
                  className={tw("main-title-input")}
                  value={activeDashboard?.name || ""}
                  onChange={(event) =>
                    updateDashboard(activeDashboard.id, {
                      ...activeDashboard,
                      name: event.target.value,
                    })
                  }
                />
              </div>
              <p>
                Tambahkan widget langsung dari tile plus di canvas, lalu drag/resize sesuai kebutuhan.
              </p>
            </div>
          </div>

          <div className={tw("dashboard-tabs")}>
            {dashboards.map((dashboard) => (
              <button
                key={dashboard.id}
                type="button"
                className={tw(clsx("dashboard-tab", { "dashboard-tab-active": dashboard.id === activeDashboardId }))}
                onClick={() => setActiveDashboardId(dashboard.id)}
              >
                {dashboard.name}
              </button>
            ))}
            <button className={tw("dashboard-tab add")} type="button" onClick={addDashboard}>
              <Plus size={16} />
            </button>
          </div>

          {bannerError ? <div className={tw("banner-error")}>{bannerError}</div> : null}

          <div className={tw("workspace-headline")}>
            <div className={tw("headline-card")}>
              <Activity size={16} />
              {dashboardStats.widgets} widgets aktif
            </div>
            <div className={tw("headline-card")}>
              <LayoutGrid size={16} />
              Drag, resize, dan simpan layout per dashboard
            </div>
            <div className={tw("headline-card")}>
              <Workflow size={16} />
              Query graph, table, atau stat dari instance mana pun yang reachable
            </div>
          </div>

          {widgets.length ? (
            <div ref={containerRef} className={tw("grid-shell")}>
              {effectiveGridWidth > 0 ? (
                <GridLayout
                  key={gridRenderKey}
                  className={tw("layout")}
                  width={effectiveGridWidth}
                  gridConfig={{
                    cols: activeGridCols,
                    rowHeight: activeRowHeight,
                    margin: activeGridMargin,
                    containerPadding: activeGridMargin,
                  }}
                  compactor={GRID_COMPACTOR}
                  dragConfig={{
                    enabled: true,
                    bounded: true,
                    handle: ".rgl-drag-handle",
                    cancel:
                      ".react-resizable-handle,button,input,textarea,select,a,table,th,td",
                    threshold: 0,
                  }}
                  resizeConfig={{
                    enabled: true,
                    handles: ["se"],
                  }}
                  layout={renderedLayout}
                  onDrag={handleGridPointerMove}
                  onResize={handleGridPointerMove}
                  onLayoutChange={handleLayoutChange}
                  onDragStop={syncDashboardLayout}
                  onResizeStop={syncDashboardLayout}
                >
                  {widgets.map((widget) => (
                    <section
                      key={widget.id}
                      className={tw(clsx("widget-card", `widget-${widget.type}`))}
                    >
                      {widget.type !== "placeholder" && widget.type !== "report" ? (
                        <>
                          <header className={tw("widget-head")}>
                            <div className={`rgl-drag-handle ${tw("widget-drag")}`}>
                              <GripVertical size={15} />
                            </div>
                            <div className={tw("widget-title-block")}>
                              <div className={tw("widget-kicker")}>{widget.type}</div>
                              <h3>{widget.title}</h3>
                            </div>
                            <div className={tw("widget-actions")}>
                              <button
                                className={tw("icon-button")}
                                type="button"
                                onClick={() => runWidget(activeDashboard.id, widget)}
                              >
                                <CirclePlay size={16} />
                              </button>
                              <button
                                className={tw("icon-button")}
                                type="button"
                                onClick={() =>
                                  setEditorDraft({
                                    ...widget,
                                    dashboardId: activeDashboard.id,
                                    isNew: false,
                                  })
                                }
                              >
                                <PencilLine size={16} />
                              </button>
                              <button
                                className={tw("icon-button danger")}
                                type="button"
                                onClick={() => removeWidget(activeDashboard.id, widget.id)}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </header>
                          <div className={tw("query-chip")}>{widget.query}</div>
                        </>
                      ) : null}
                      <div className={tw("widget-body")}>
                        <WidgetBody
                          widget={widget}
                          onAddReport={() => addReportFromPlaceholder(activeDashboard.id, widget.id)}
                          reportSettingsOpen={Boolean(reportSettingsByWidget[widget.id])}
                          onToggleReportSettings={() => toggleReportSettings(widget.id)}
                          onDeleteWidget={() => removeWidget(activeDashboard.id, widget.id)}
                          onReportQueryChange={(nextQuery) =>
                            updateWidget(activeDashboard.id, widget.id, { query: nextQuery })
                          }
                        />
                      </div>
                    </section>
                  ))}
                </GridLayout>
              ) : null}
            </div>
          ) : (
            <div className={tw("empty-dashboard")}>
              <div className={tw("empty-dashboard-card")}>
                <Sparkles size={18} />
                <strong>Dashboard ini masih kosong</strong>
                <span>Tambahkan widget baru dari tombol stat, table, atau graph.</span>
              </div>
            </div>
          )}
        </section>
      </div>

      <EditorModal
        draft={editorDraft}
        onChange={setEditorDraft}
        onClose={() => setEditorDraft(null)}
        onSave={saveDraft}
      />
    </main>
  );
}



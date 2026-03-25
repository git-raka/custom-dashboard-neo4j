"use client";

import clsx from "clsx";
import dynamic from "next/dynamic";
import GridLayout, { WidthProvider } from "react-grid-layout/legacy";
import { cloneLayout, correctBounds, getCompactor } from "react-grid-layout/core";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Cable,
  CirclePlay,
  Database,
  GripVertical,
  LayoutGrid,
  LineChart,
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
  Table2,
  Trash2,
  Workflow,
  X,
} from "lucide-react";

const AutoWidthGrid = WidthProvider(GridLayout);
const GraphWidget = dynamic(() => import("@/components/graph-widget"), {
  ssr: false,
  loading: () => <div className="graph-empty">Menyiapkan visual graph...</div>,
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
  lg: 34,
  md: 32,
  sm: 30,
  xs: 28,
};
const GRID_MARGIN_BY_BREAKPOINT = {
  lg: [18, 18],
  md: [16, 16],
  sm: [14, 14],
  xs: [12, 12],
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

function createWidget(type = "graph", seed = {}) {
  const baseLayouts = {
    stat: { x: 0, y: Infinity, w: 3, h: 4 },
    table: { x: 3, y: Infinity, w: 5, h: 8 },
    graph: { x: 0, y: Infinity, w: 8, h: 11 },
  };

  return {
    id: seed.id || createId(),
    title: seed.title || "Untitled Widget",
    type,
    query: seed.query || "MATCH p=(n)-[r]->(m) RETURN p LIMIT 20",
    layout: seed.layout || baseLayouts[type],
    result: null,
    error: "",
    isLoading: false,
    lastRunAt: null,
  };
}

function buildStarterWidgets() {
  return STARTER_QUERIES.map((item, index) =>
    createWidget(item.type, {
      ...item,
      layout:
        index === 0
          ? { x: 0, y: 0, w: 3, h: 4 }
          : index === 1
            ? { x: 3, y: 0, w: 4, h: 8 }
            : { x: 7, y: 0, w: 5, h: 12 },
    })
  );
}

function createDashboard(seed = {}) {
  return {
    id: seed.id || createId(),
    name: seed.name || "Summary Dashboard",
    description: seed.description || "Reusable board for Neo4j analytics",
    widgets: (seed.widgets || buildStarterWidgets()).map((widget) =>
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

function stripRuntime(widget) {
  return {
    id: widget.id,
    title: widget.title,
    type: widget.type,
    query: widget.query,
    layout: widget.layout,
  };
}

function getBreakpointForWidth(width) {
  return GRID_BREAKPOINT_ORDER.find(
    (breakpoint) => width >= GRID_BREAKPOINTS[breakpoint]
  ) || "xs";
}

function scaleLayoutAcrossColumns(layout, fromCols, toCols) {
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

function getLayoutBottom(layout) {
  return layout.reduce((max, item) => Math.max(max, item.y + item.h), 0);
}

function layoutItemsOverlap(a, b) {
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

function normalizeGridLayout(layout, cols = GRID_COLUMNS, pinnedItemId = null) {
  const pending = cloneLayout(layout)
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
  );
  return GRID_COMPACTOR.compact(corrected, cols);
}

function applyLayoutToWidgets(
  widgets,
  layout,
  pinnedItemId = null,
  cols = GRID_COLUMNS
) {
  const normalizedLayout = normalizeGridLayout(layout, cols, pinnedItemId);

  return widgets.map((widget) => {
    const layoutItem = normalizedLayout.find((item) => item.i === widget.id);
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

function restoreWorkspace(payload) {
  const dashboards = (payload?.dashboards || []).map((dashboard) =>
    createDashboard({
      ...dashboard,
      widgets: (dashboard.widgets || []).map((widget) =>
        createWidget(widget.type, widget)
      ),
    })
  );

  if (!dashboards.length) {
    return buildDefaultWorkspace();
  }

  const activeDashboardId =
    payload.activeDashboardId && dashboards.some((dashboard) => dashboard.id === payload.activeDashboardId)
      ? payload.activeDashboardId
      : dashboards[0].id;

  return {
    dashboards,
    activeDashboardId,
  };
}

function formatValue(value) {
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

function getStatData(result) {
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

async function postJson(url, body) {
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

function WidgetBody({ widget }) {
  if (widget.error) {
    return <div className="widget-error">{widget.error}</div>;
  }

  if (!widget.result && !widget.isLoading) {
    return (
      <div className="widget-empty">
        Jalankan query untuk melihat hasil widget ini.
      </div>
    );
  }

  if (widget.isLoading) {
    return <div className="widget-empty">Menjalankan query...</div>;
  }

  if (widget.type === "stat") {
    const stat = getStatData(widget.result);
    return stat ? (
      <div className="stat-card">
        <div className="stat-value">{stat.value}</div>
        <div className="stat-label">{stat.label}</div>
      </div>
    ) : (
      <div className="widget-empty">Query stat tidak mengembalikan nilai tunggal.</div>
    );
  }

  if (widget.type === "table") {
    return (
      <div className="table-shell">
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

function EditorModal({ draft, onChange, onClose, onSave }) {
  if (!draft) {
    return null;
  }

  return (
    <div className="modal-backdrop">
      <div className="editor-modal">
        <div className="modal-head">
          <div>
            <div className="eyebrow">Widget Editor</div>
            <h3>{draft.isNew ? "Create widget" : "Refine widget"}</h3>
          </div>
          <button className="icon-button" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        <div className="editor-grid">
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

        <label className="editor-query">
          <span>Cypher query</span>
          <textarea
            value={draft.query}
            onChange={(event) => onChange({ ...draft, query: event.target.value })}
            spellCheck="false"
            placeholder="MATCH p=(n)-[r]->(m) RETURN p LIMIT 20"
          />
        </label>

        <div className="recipe-strip">
          {STARTER_QUERIES.map((preset) => (
            <button
              key={preset.title}
              className="recipe-card"
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

        <div className="modal-actions">
          <button className="ghost-button" onClick={onClose} type="button">
            Batal
          </button>
          <button className="primary-button" onClick={onSave} type="button">
            Simpan Widget
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BuilderApp() {
  const initialWorkspace = useMemo(() => buildDefaultWorkspace(), []);
  const [credentials, setCredentials] = useState(DEFAULT_CREDENTIALS);
  const [dashboards, setDashboards] = useState(initialWorkspace.dashboards);
  const [activeDashboardId, setActiveDashboardId] = useState(
    initialWorkspace.activeDashboardId
  );
  const [editorDraft, setEditorDraft] = useState(null);
  const [dashboardSearch, setDashboardSearch] = useState("");
  const [connected, setConnected] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [bannerError, setBannerError] = useState("");
  const [activeBreakpoint, setActiveBreakpoint] = useState("lg");
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
    const updateBreakpoint = () => {
      setActiveBreakpoint(getBreakpointForWidth(window.innerWidth));
    };

    updateBreakpoint();
    window.addEventListener("resize", updateBreakpoint);
    return () => window.removeEventListener("resize", updateBreakpoint);
  }, []);

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

        return typeof updater === "function"
          ? updater(dashboard)
          : { ...dashboard, ...updater };
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
          activeDashboard.widgets.map((widget) => runWidget(activeDashboard.id, widget))
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
      activeDashboard.widgets.map((widget) => runWidget(activeDashboard.id, widget))
    );
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
      widgets: [],
    });
    setDashboards((current) => [...current, nextDashboard]);
    setActiveDashboardId(nextDashboard.id);
  }

  function removeWidget(dashboardId, widgetId) {
    updateDashboard(dashboardId, (dashboard) => ({
      ...dashboard,
      widgets: applyLayoutToWidgets(
        dashboard.widgets.filter((widget) => widget.id !== widgetId),
        dashboard.widgets
          .filter((widget) => widget.id !== widgetId)
          .map((widget) => ({
            i: widget.id,
            x: widget.layout.x,
            y: widget.layout.y,
            w: widget.layout.w,
            h: widget.layout.h,
          }))
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

      const nextLayouts = nextWidgets.map((widget) => ({
        i: widget.id,
        x: widget.layout.x,
        y: widget.layout.y,
        w: widget.layout.w,
        h: widget.layout.h,
      }));

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
    const normalizedLayout = normalizeGridLayout(
      nextLayout,
      activeCols,
      activeItem?.i || null
    );
    const desktopLayout =
      activeCols === GRID_COLUMNS
        ? normalizedLayout
        : normalizeGridLayout(
            scaleLayoutAcrossColumns(normalizedLayout, activeCols, GRID_COLUMNS),
            GRID_COLUMNS,
            activeItem?.i || null
          );

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
    if (GRID_COLUMNS_BY_BREAKPOINT[activeBreakpoint] === GRID_COLUMNS) {
      syncDashboardLayout(nextLayout);
    }
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
  const activeGridCols = GRID_COLUMNS_BY_BREAKPOINT[activeBreakpoint];
  const activeRowHeight = GRID_ROW_HEIGHT_BY_BREAKPOINT[activeBreakpoint];
  const activeGridMargin = GRID_MARGIN_BY_BREAKPOINT[activeBreakpoint];
  const renderedLayout = useMemo(
    () => {
      const desktopLayout = widgets.map((widget) => ({
        i: widget.id,
        x: widget.layout.x,
        y: widget.layout.y,
        w: widget.layout.w,
        h: widget.layout.h,
      }));

      const responsiveLayout =
        activeGridCols === GRID_COLUMNS
          ? desktopLayout
          : scaleLayoutAcrossColumns(desktopLayout, GRID_COLUMNS, activeGridCols);

      return normalizeGridLayout(responsiveLayout, activeGridCols);
    },
    [widgets, activeGridCols]
  );

  if (!connected) {
    return (
      <main className="login-shell">
        <section className="hero-panel">
          <div className="eyebrow">NeoDeck Builder</div>
          <h1>Siap connect ke Neo4j local maupun instance remote lain.</h1>
          <p>
            Aplikasi ini tidak terkunci ke localhost. Selama backend Next.js ini bisa
            reach host Neo4j tujuan, Anda bisa connect ke `bolt://192.168.18.16:7687`,
            domain publik, atau instance lainnya.
          </p>

          <div className="feature-grid">
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

          <div className="hero-metrics">
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

        <section className="login-panel">
          <form className="login-card" onSubmit={handleConnect}>
            <div className="login-head">
              <div>
                <div className="eyebrow">Connect</div>
                <h2>Masuk ke Neo4j</h2>
              </div>
              <div className="security-pill">
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

            <div className="dual-grid">
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

            <div className="dual-grid">
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

            <div className="remote-callout-grid">
              <div className="callout-card">
                <Cable size={16} />
                <div>
                  <strong>Direct mode</strong>
                  <span>Pakai untuk IP / single instance agar tidak kena error routing table.</span>
                </div>
              </div>
              <div className="callout-card">
                <MonitorSmartphone size={16} />
                <div>
                  <strong>Public deployment</strong>
                  <span>App server ini harus punya akses jaringan ke host Neo4j yang dipilih.</span>
                </div>
              </div>
            </div>

            {bannerError ? <div className="inline-error">{bannerError}</div> : null}

            <button className="primary-button login-button" type="submit">
              {isConnecting ? "Connecting..." : "Connect & Open Builder"}
              <ArrowRight size={18} />
            </button>

            <div className="hint-row">
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
    <main className="chrome-shell">
      <header className="chrome-topbar">
        <div className="chrome-brand">
          <div className="brand-mark">N</div>
          <div>
            <strong>NeoDeck Studio</strong>
            <span>Neo4j dashboard workspace</span>
          </div>
        </div>

        <div className="chrome-connection">
          <Server size={16} />
          <span>{connectionInfo?.resolvedUri || credentials.uri}</span>
          <em>{connectionInfo?.resolvedMode || credentials.connectionMode}</em>
        </div>

        <div className="chrome-actions">
          <button className="ghost-button" type="button" onClick={runAllWidgets}>
            <RefreshCw size={16} />
            Refresh Widgets
          </button>
          <button
            className="ghost-button"
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

      <div className="workspace-shell">
        <aside className="neo-sidebar">
          <div className="sidebar-head">
            <div>
              <span className="sidebar-caption">Dashboards</span>
              <strong>{dashboards.length} workspace</strong>
            </div>

            <div className="sidebar-head-actions">
              <button className="icon-button" type="button" onClick={addDashboard}>
                <Plus size={16} />
              </button>
              <button className="icon-button" type="button" onClick={runAllWidgets}>
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          <label className="sidebar-search">
            <Search size={16} />
            <input
              value={dashboardSearch}
              onChange={(event) => setDashboardSearch(event.target.value)}
              placeholder="Search dashboard..."
            />
          </label>

          <div className="dashboard-list">
            {filteredDashboards.map((dashboard) => (
              <button
                key={dashboard.id}
                type="button"
                className={clsx("dashboard-row", {
                  active: dashboard.id === activeDashboardId,
                })}
                onClick={() => setActiveDashboardId(dashboard.id)}
              >
                <div className="dashboard-row-copy">
                  <strong>{dashboard.name}</strong>
                  <span>{dashboard.widgets.length} widgets</span>
                </div>
                <MoreHorizontal size={16} />
              </button>
            ))}
          </div>

          <div className="sidebar-summary-card">
            <div className="sidebar-summary-head">
              <Database size={16} />
              <strong>Connection</strong>
            </div>
            <div className="meta-list compact">
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

        <section className="neo-main">
          <div className="main-hero">
            <div className="main-hero-copy">
              <div className="eyebrow">Workspace Builder</div>
              <div className="title-row">
                <PencilLine size={18} />
                <input
                  className="main-title-input"
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
                Layout sekarang sudah mengikuti pola NeoDash: sidebar kiri, tab dashboard,
                dan grid builder yang tetap bisa drag and resize.
              </p>
            </div>

            <div className="main-hero-actions">
              <button className="ghost-button" type="button" onClick={() => openCreateWidget("stat")}>
                <BarChart3 size={16} />
                Stat
              </button>
              <button className="ghost-button" type="button" onClick={() => openCreateWidget("table")}>
                <Table2 size={16} />
                Table
              </button>
              <button className="ghost-button" type="button" onClick={() => openCreateWidget("graph")}>
                <LineChart size={16} />
                Graph
              </button>
            </div>
          </div>

          <div className="dashboard-tabs">
            {dashboards.map((dashboard) => (
              <button
                key={dashboard.id}
                type="button"
                className={clsx("dashboard-tab", {
                  active: dashboard.id === activeDashboardId,
                })}
                onClick={() => setActiveDashboardId(dashboard.id)}
              >
                {dashboard.name}
              </button>
            ))}
            <button className="dashboard-tab add" type="button" onClick={addDashboard}>
              <Plus size={16} />
            </button>
          </div>

          {bannerError ? <div className="banner-error">{bannerError}</div> : null}

          <div className="workspace-headline">
            <div className="headline-card">
              <Activity size={16} />
              {dashboardStats.widgets} widgets aktif
            </div>
            <div className="headline-card">
              <LayoutGrid size={16} />
              Drag, resize, dan simpan layout per dashboard
            </div>
            <div className="headline-card">
              <Workflow size={16} />
              Query graph, table, atau stat dari instance mana pun yang reachable
            </div>
          </div>

          {widgets.length ? (
            <AutoWidthGrid
              className="layout"
              cols={activeGridCols}
              rowHeight={activeRowHeight}
              margin={activeGridMargin}
              containerPadding={[0, 0]}
              compactType="vertical"
              allowOverlap={false}
              preventCollision={false}
              resizeHandles={["n", "s", "e", "w", "ne", "nw", "se", "sw"]}
              draggableHandle=".widget-drag"
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
                  className={clsx("widget-card", `widget-${widget.type}`)}
                >
                  <header className="widget-head">
                    <div className="widget-drag">
                      <GripVertical size={15} />
                    </div>
                    <div className="widget-title-block">
                      <div className="widget-kicker">{widget.type}</div>
                      <h3>{widget.title}</h3>
                    </div>
                    <div className="widget-actions">
                      <button
                        className="icon-button"
                        type="button"
                        onClick={() => runWidget(activeDashboard.id, widget)}
                      >
                        <CirclePlay size={16} />
                      </button>
                      <button
                        className="icon-button"
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
                        className="icon-button danger"
                        type="button"
                        onClick={() => removeWidget(activeDashboard.id, widget.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </header>

                  <div className="query-chip">{widget.query}</div>
                  <div className="widget-body">
                    <WidgetBody widget={widget} />
                  </div>
                </section>
              ))}
            </AutoWidthGrid>
          ) : (
            <div className="empty-dashboard">
              <div className="empty-dashboard-card">
                <Sparkles size={18} />
                <strong>Dashboard ini masih kosong</strong>
                <span>Tambahkan widget baru dari tombol stat, table, atau graph.</span>
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => openCreateWidget("graph")}
                >
                  <Plus size={16} />
                  Add First Widget
                </button>
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

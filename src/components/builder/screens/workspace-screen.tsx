"use client";

import clsx from "clsx";
import { correctBounds } from "react-grid-layout/core";
import GridLayout from "react-grid-layout";
import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  CirclePlay,
  Database,
  GripVertical,
  LayoutGrid,
  LogOut,
  MoreHorizontal,
  PencilLine,
  Plus,
  RefreshCw,
  Search,
  Server,
  Sparkles,
  Trash2,
  Workflow,
} from "lucide-react";
import { tw } from "@/lib/tw";
import EditorModal from "@/components/builder/modals/editor-modal";
import WidgetBody from "@/components/builder/widgets/widget-body";
import {
  GRID_COLUMNS,
  GRID_COMPACTOR,
  GRID_COLUMNS_BY_BREAKPOINT,
  GRID_MARGIN_BY_BREAKPOINT,
  GRID_RIGHT_SAFETY_GUTTER,
  GRID_ROW_HEIGHT_BY_BREAKPOINT,
  STARTER_QUERIES,
  applyLayoutToWidgets,
  scaleLayoutAcrossColumns,
  widgetsToLayout,
} from "@/components/builder/core/builder-helpers";
import { AnyRecord } from "@/components/builder/core/types";

type WorkspaceScreenProps = {
  credentials: AnyRecord;
  setCredentials: Dispatch<SetStateAction<AnyRecord>>;
  dashboards: AnyRecord[];
  activeDashboardId: string;
  setActiveDashboardId: Dispatch<SetStateAction<string>>;
  editorDraft: AnyRecord | null;
  setEditorDraft: Dispatch<SetStateAction<AnyRecord | null>>;
  dashboardSearch: string;
  setDashboardSearch: Dispatch<SetStateAction<string>>;
  connectionInfo: AnyRecord | null;
  bannerError: string;
  activeBreakpoint: string;
  reportSettingsByWidget: AnyRecord;
  setReportSettingsByWidget: Dispatch<SetStateAction<AnyRecord>>;
  activeDashboard: AnyRecord | null;
  filteredDashboards: AnyRecord[];
  dashboardStats: AnyRecord;
  updateDashboard: (dashboardId: string, updater: any) => void;
  updateWidget: (dashboardId: string, widgetId: string, updater: any) => void;
  runWidget: (dashboardId: string, widgetInput: AnyRecord | string) => Promise<void>;
  runAllWidgets: () => Promise<void>;
  addReportFromPlaceholder: (dashboardId: string, placeholderId: string) => void;
  addDashboard: () => void;
  removeWidget: (dashboardId: string, widgetId: string) => void;
  saveDraft: () => void;
  toggleReportSettings: (widgetId: string) => void;
  setConnected: Dispatch<SetStateAction<boolean>>;
};

export default function WorkspaceScreen({
  credentials,
  setCredentials,
  dashboards,
  activeDashboardId,
  setActiveDashboardId,
  editorDraft,
  setEditorDraft,
  dashboardSearch,
  setDashboardSearch,
  connectionInfo,
  bannerError,
  activeBreakpoint,
  reportSettingsByWidget,
  setReportSettingsByWidget,
  activeDashboard,
  filteredDashboards,
  dashboardStats,
  updateDashboard,
  updateWidget,
  runWidget,
  runAllWidgets,
  addReportFromPlaceholder,
  addDashboard,
  removeWidget,
  saveDraft,
  toggleReportSettings,
  setConnected,
}: WorkspaceScreenProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const autoScrollFrameRef = useRef(0);
  const [gridWidth, setGridWidth] = useState(1280);

  const widgets = activeDashboard?.widgets || [];
  const activeGridCols = GRID_COLUMNS_BY_BREAKPOINT[activeBreakpoint];
  const activeRowHeight = GRID_ROW_HEIGHT_BY_BREAKPOINT[activeBreakpoint];
  const activeGridMargin = GRID_MARGIN_BY_BREAKPOINT[activeBreakpoint];
  const effectiveGridWidth = Math.max(0, Math.floor(gridWidth));
  const gridRenderKey = `${activeBreakpoint}-${activeGridCols}-${effectiveGridWidth}`;
  const renderedLayout = useMemo(() => {
    const desktopLayout = widgetsToLayout(widgets, GRID_COLUMNS);
    const responsiveLayout =
      activeGridCols === GRID_COLUMNS
        ? desktopLayout
        : scaleLayoutAcrossColumns(desktopLayout, GRID_COLUMNS, activeGridCols);

    return correctBounds(responsiveLayout as any, { cols: activeGridCols });
  }, [widgets, activeGridCols]);

  function syncDashboardLayout(nextLayout: any, _oldItem: any = null, activeItem: any = null) {
    if (!activeDashboard) {
      return;
    }

    const activeCols = GRID_COLUMNS_BY_BREAKPOINT[activeBreakpoint];
    const boundedActiveLayout = correctBounds(nextLayout as any, { cols: activeCols });
    const desktopLayout =
      activeCols === GRID_COLUMNS
        ? boundedActiveLayout
        : (correctBounds(scaleLayoutAcrossColumns(boundedActiveLayout as any, activeCols, GRID_COLUMNS) as any, {
            cols: GRID_COLUMNS,
          }) as any);

    updateDashboard(activeDashboard.id, (dashboard: AnyRecord) => ({
      ...dashboard,
      widgets: applyLayoutToWidgets(dashboard.widgets, desktopLayout, activeItem?.i || null, GRID_COLUMNS),
    }));
  }

  function handleLayoutChange(nextLayout: any) {
    void nextLayout;
  }

  function queueViewportAutoScroll(nativeEvent: any) {
    if (typeof window === "undefined") {
      return;
    }

    const pointer = nativeEvent?.touches?.[0] || nativeEvent?.changedTouches?.[0] || nativeEvent;
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

  function handleGridPointerMove(_layout: any, _oldItem: any, _newItem: any, _placeholder: any, event: any) {
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

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }

    const measure = () => {
      const nextWidth = Math.max(0, Math.floor(node.clientWidth - GRID_RIGHT_SAFETY_GUTTER));
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
  }, []);

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
              <p>Tambahkan widget langsung dari tile plus di canvas, lalu drag/resize sesuai kebutuhan.</p>
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
                    cancel: ".react-resizable-handle,button,input,textarea,select,a,table,th,td",
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
                    <section key={widget.id} className={tw(clsx("widget-card", `widget-${widget.type}`))}>
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
                              <button className={tw("icon-button")} type="button" onClick={() => runWidget(activeDashboard.id, widget)}>
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
                          onRunReport={async () => {
                            setReportSettingsByWidget((current) => ({
                              ...current,
                              [widget.id]: false,
                            }));
                            await runWidget(activeDashboard.id, widget);
                          }}
                          onAutoRunReport={async () => {
                            await runWidget(activeDashboard.id, widget);
                          }}
                          onDeleteWidget={() => removeWidget(activeDashboard.id, widget.id)}
                          onReportQueryChange={(nextQuery) => updateWidget(activeDashboard.id, widget.id, { query: nextQuery })}
                          onReportTypeChange={(reportType) => updateWidget(activeDashboard.id, widget.id, { reportType })}
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
        starterQueries={STARTER_QUERIES}
      />
    </main>
  );
}

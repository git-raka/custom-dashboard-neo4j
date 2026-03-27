"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { postJson } from "@/components/builder/services/post-json";
import {
  DEFAULT_CREDENTIALS,
  GRID_COLUMNS,
  GRID_COLUMNS_BY_BREAKPOINT,
  STARTER_QUERIES,
  STORAGE_KEYS,
  applyLayoutToWidgets,
  buildDefaultWorkspace,
  buildInitialWidgets,
  buildStarterWidgets,
  createDashboard,
  createWidget,
  getBreakpointForWidth,
  restoreWorkspace,
  sanitizeDashboardWidgets,
  stripRuntime,
  widgetsToLayout,
} from "@/components/builder/core/builder-helpers";
import { AnyRecord } from "@/components/builder/core/types";

export function useBuilderWorkspace() {
  const initialWorkspace = useMemo(() => buildDefaultWorkspace(), []);
  const [credentials, setCredentials] = useState<AnyRecord>(DEFAULT_CREDENTIALS);
  const [dashboards, setDashboards] = useState<AnyRecord[]>(initialWorkspace.dashboards);
  const [activeDashboardId, setActiveDashboardId] = useState(initialWorkspace.activeDashboardId);
  const [editorDraft, setEditorDraft] = useState<AnyRecord | null>(null);
  const [dashboardSearch, setDashboardSearch] = useState("");
  const [connected, setConnected] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState<AnyRecord | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [bannerError, setBannerError] = useState("");
  const [activeBreakpoint, setActiveBreakpoint] = useState("lg");
  const [reportSettingsByWidget, setReportSettingsByWidget] = useState<AnyRecord>({});

  useEffect(() => {
    const storedCredentials = window.localStorage.getItem(STORAGE_KEYS.credentials);
    const storedWorkspace = window.localStorage.getItem(STORAGE_KEYS.workspace);
    const legacyWidgets = window.localStorage.getItem(STORAGE_KEYS.legacyWidgets);
    const legacyDashboardName = window.localStorage.getItem(STORAGE_KEYS.legacyDashboardName);

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
        ? JSON.parse(legacyWidgets).map((widget: AnyRecord) => createWidget(widget.type, widget))
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
  }, [credentials.uri, credentials.username, credentials.database, credentials.connectionMode]);

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
    () => dashboards.find((dashboard) => dashboard.id === activeDashboardId) || dashboards[0] || null,
    [dashboards, activeDashboardId]
  );

  const filteredDashboards = useMemo(() => {
    const term = dashboardSearch.trim().toLowerCase();
    if (!term) {
      return dashboards;
    }

    return dashboards.filter((dashboard) => dashboard.name.toLowerCase().includes(term));
  }, [dashboardSearch, dashboards]);

  const dashboardStats = useMemo(() => {
    const widgets = activeDashboard?.widgets || [];
    const totalRows = widgets.reduce((sum: number, widget: AnyRecord) => sum + (widget.result?.rows?.length || 0), 0);

    return {
      widgets: widgets.length,
      loaded: widgets.filter((widget: AnyRecord) => widget.result).length,
      rows: totalRows,
    };
  }, [activeDashboard]);

  function updateDashboard(dashboardId: string, updater: any) {
    setDashboards((current) =>
      current.map((dashboard) => {
        if (dashboard.id !== dashboardId) {
          return dashboard;
        }

        const nextDashboard = typeof updater === "function" ? updater(dashboard) : { ...dashboard, ...updater };

        return {
          ...nextDashboard,
          widgets: sanitizeDashboardWidgets(nextDashboard.widgets || []),
        };
      })
    );
  }

  function updateWidget(dashboardId: string, widgetId: string, updater: any) {
    updateDashboard(dashboardId, (dashboard: AnyRecord) => ({
      ...dashboard,
      widgets: dashboard.widgets.map((widget: AnyRecord) =>
        widget.id === widgetId ? (typeof updater === "function" ? updater(widget) : { ...widget, ...updater }) : widget
      ),
    }));
  }

  async function handleConnect(event: any) {
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
            .filter((widget: AnyRecord) => widget.type !== "placeholder" && widget.type !== "report")
            .map((widget: AnyRecord) => runWidget(activeDashboard.id, widget))
        );
      }
    } catch (error: any) {
      setBannerError(error.message);
      setConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }

  async function runWidget(dashboardId: string, widgetInput: AnyRecord | string) {
    const widget =
      typeof widgetInput === "string"
        ? dashboards.find((dashboard) => dashboard.id === dashboardId)?.widgets.find((item: AnyRecord) => item.id === widgetInput)
        : widgetInput;

    if (!widget) {
      return;
    }

    if (widget.type === "placeholder") {
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
    } catch (error: any) {
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
        .filter((widget: AnyRecord) => widget.type !== "placeholder" && widget.type !== "report")
        .map((widget: AnyRecord) => runWidget(activeDashboard.id, widget))
    );
  }

  function addReportFromPlaceholder(dashboardId: string, placeholderId: string) {
    updateDashboard(dashboardId, (dashboard: AnyRecord) => {
      const placeholderWidget = dashboard.widgets.find((widget: AnyRecord) => widget.id === placeholderId);
      if (!placeholderWidget) {
        return dashboard;
      }

      const nextWidgets = dashboard.widgets.filter((widget: AnyRecord) => widget.id !== placeholderId);
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

  function addDashboard() {
    const nextDashboard = createDashboard({
      name: `Dashboard ${dashboards.length + 1}`,
      widgets: buildInitialWidgets(),
    });
    setDashboards((current) => [...current, nextDashboard]);
    setActiveDashboardId(nextDashboard.id);
  }

  function removeWidget(dashboardId: string, widgetId: string) {
    updateDashboard(dashboardId, (dashboard: AnyRecord) => ({
      ...dashboard,
      widgets: applyLayoutToWidgets(
        dashboard.widgets.filter((widget: AnyRecord) => widget.id !== widgetId),
        widgetsToLayout(
          dashboard.widgets.filter((widget: AnyRecord) => widget.id !== widgetId),
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

    updateDashboard(dashboardId, (dashboard: AnyRecord) => {
      const nextWidgets = dashboard.widgets.some((widget: AnyRecord) => widget.id === editorDraft.id)
        ? dashboard.widgets.map((widget: AnyRecord) =>
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

  function toggleReportSettings(widgetId: string) {
    setReportSettingsByWidget((current) => ({
      ...current,
      [widgetId]: !current[widgetId],
    }));
  }

  return {
    credentials,
    setCredentials,
    dashboards,
    activeDashboardId,
    setActiveDashboardId,
    editorDraft,
    setEditorDraft,
    dashboardSearch,
    setDashboardSearch,
    connected,
    setConnected,
    connectionInfo,
    setConnectionInfo,
    isConnecting,
    bannerError,
    activeBreakpoint,
    reportSettingsByWidget,
    setReportSettingsByWidget,
    activeDashboard,
    filteredDashboards,
    dashboardStats,
    updateDashboard,
    updateWidget,
    handleConnect,
    runWidget,
    runAllWidgets,
    addReportFromPlaceholder,
    addDashboard,
    removeWidget,
    saveDraft,
    toggleReportSettings,
  };
}

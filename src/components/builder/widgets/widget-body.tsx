"use client";

import clsx from "clsx";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  CircleHelp,
  CirclePlay,
  Copy,
  GripVertical,
  MoreHorizontal,
  PlusSquare,
  Trash2,
} from "lucide-react";
import { tw } from "@/lib/tw";
import ReportTableView from "@/components/builder/chart/table/report-table-view";
import WidgetTableView from "@/components/builder/chart/table/widget-table-view";
import { getStatData } from "@/components/builder/core/builder-helpers";
import { AnyRecord, VoidFn } from "@/components/builder/core/types";

type WidgetBodyProps = {
  widget: AnyRecord;
  onAddReport: VoidFn;
  reportSettingsOpen?: boolean;
  onToggleReportSettings?: VoidFn;
  onRunReport?: VoidFn;
  onAutoRunReport?: VoidFn;
  onDeleteWidget?: VoidFn;
  onReportQueryChange?: (query: string) => void;
  onReportTypeChange?: (reportType: string) => void;
};

const GraphWidget = dynamic(() => import("@/components/graph-widget"), {
  ssr: false,
  loading: () => <div className={tw("graph-empty")}>Menyiapkan visual graph...</div>,
});

export default function WidgetBody({
  widget,
  onAddReport,
  reportSettingsOpen = false,
  onToggleReportSettings = () => {},
  onRunReport = () => {},
  onAutoRunReport = () => {},
  onDeleteWidget = () => {},
  onReportQueryChange = () => {},
  onReportTypeChange = () => {},
}: WidgetBodyProps) {
  const REPORT_TYPE_OPTIONS = [
    { label: "Table", value: "table" },
    { label: "Graph", value: "graph" },
    { label: "Bar Chart", value: "bar" },
    { label: "Pie Chart", value: "pie" },
  ];
  const [reportTypeMenuOpen, setReportTypeMenuOpen] = useState(false);
  const selectedReportType =
    REPORT_TYPE_OPTIONS.find((option) => option.value === widget.reportType) ||
    REPORT_TYPE_OPTIONS[0];
  const autoRunRef = useRef(onAutoRunReport);
  const lastAutoRunKeyRef = useRef("");

  useEffect(() => {
    autoRunRef.current = onAutoRunReport;
  }, [onAutoRunReport]);

  useEffect(() => {
    lastAutoRunKeyRef.current = "";
  }, [widget.id]);

  useEffect(() => {
    if (widget.type !== "report") {
      return;
    }

    const query = (widget.query || "").trim();
    if (!query) {
      lastAutoRunKeyRef.current = "";
      return;
    }

    // Auto-run once per widget+query (useful after refresh when result is not persisted)
    const autoRunKey = `${widget.id}:${query}`;
    if (lastAutoRunKeyRef.current === autoRunKey) {
      return;
    }

    if (widget.result || widget.isLoading) {
      return;
    }

    const timer = window.setTimeout(() => {
      lastAutoRunKeyRef.current = autoRunKey;
      autoRunRef.current();
    }, 550);

    return () => {
      window.clearTimeout(timer);
    };
  }, [widget.id, widget.type, widget.query, widget.result, widget.isLoading]);

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
              <button className={tw("report-play-button")} type="button" aria-label="Run" onClick={onRunReport}>
                <CirclePlay size={18} />
              </button>
            </div>

            <div className={tw("report-settings-grid")}>
              <label className={tw("report-field")}>
                <span>Type</span>
                <div className={tw("report-select-shell")}>
                  <button
                    type="button"
                    className={tw("report-select")}
                    onClick={() => setReportTypeMenuOpen((open) => !open)}
                    aria-haspopup="listbox"
                    aria-expanded={reportTypeMenuOpen}
                  >
                    <span>{selectedReportType.label}</span>
                    <ChevronDown size={20} />
                  </button>
                  {reportTypeMenuOpen ? (
                    <div className={tw("report-select-menu")} role="listbox" aria-label="Type options">
                      {REPORT_TYPE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={tw(
                            clsx("report-select-option", {
                              "report-select-option-active": selectedReportType.value === option.value,
                            })
                          )}
                          onClick={() => {
                            onReportTypeChange(option.value);
                            setReportTypeMenuOpen(false);
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
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
            {widget.error ? <div className={tw("widget-error")}>{widget.error}</div> : null}
            {widget.isLoading ? <div className={tw("widget-empty")}>Menjalankan query...</div> : null}
            {!widget.isLoading && !widget.error && widget.result && widget.reportType === "table" ? (
              <ReportTableView widget={widget} />
            ) : null}
            {!widget.isLoading && !widget.error && !widget.result && !(widget.query || "").trim() ? (
              <p>
                No query specified.
                <br />
                Use the <button type="button" onClick={onToggleReportSettings}>Report Settings</button> button to get started.
              </p>
            ) : null}
          </>
        )}
      </div>
    );
  }

  if (widget.error) {
    return <div className={tw("widget-error")}>{widget.error}</div>;
  }

  if (!widget.result && !widget.isLoading) {
    return <div className={tw("widget-empty")}>Jalankan query untuk melihat hasil widget ini.</div>;
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
    return <WidgetTableView widget={widget} />;
  }

  return <GraphWidget graph={widget.result.graph} />;
}

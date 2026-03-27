"use client";

import { useEffect, useState } from "react";
import { tw } from "@/lib/tw";
import { formatValue } from "@/components/builder/core/builder-helpers";
import { AnyRecord } from "@/components/builder/core/types";

type ReportTableViewProps = {
  widget: AnyRecord;
};

export default function ReportTableView({ widget }: ReportTableViewProps) {
  const REPORT_ROWS_PER_PAGE_OPTIONS = [5, 10, 25, 50, 100];
  const [reportPage, setReportPage] = useState(1);
  const [reportRowsPerPage, setReportRowsPerPage] = useState(5);

  const reportRows = widget.result?.rows || [];
  const reportTotalRows = reportRows.length;
  const reportTotalPages = Math.max(1, Math.ceil(reportTotalRows / reportRowsPerPage));
  const safeReportPage = Math.min(reportPage, reportTotalPages);
  const reportStartIndex = reportTotalRows ? (safeReportPage - 1) * reportRowsPerPage + 1 : 0;
  const reportEndIndex = Math.min(safeReportPage * reportRowsPerPage, reportTotalRows);
  const reportVisibleRows = reportRows.slice(
    (safeReportPage - 1) * reportRowsPerPage,
    safeReportPage * reportRowsPerPage
  );

  useEffect(() => {
    setReportPage(1);
  }, [widget.id, widget.result]);

  return (
    <div className={tw("report-result-shell")}>
      <div className={tw("report-table-scroll")}>
        <table className={tw("report-table")}>
          <thead>
            <tr>
              {widget.result.columns.map((column: string) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reportVisibleRows.map((row: AnyRecord, index: number) => (
              <tr key={`${widget.id}-report-${index}`}>
                {widget.result.columns.map((column: string) => (
                  <td key={`${index}-${column}`}>{formatValue(row[column])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={tw("report-table-footer")}>
        <div className={tw("report-table-footer-meta")}>
          <span>Rows per page:</span>
          <select
            className={tw("report-table-footer-select")}
            value={reportRowsPerPage}
            onChange={(event) => {
              setReportRowsPerPage(Number(event.target.value));
              setReportPage(1);
            }}
          >
            {REPORT_ROWS_PER_PAGE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
        <div className={tw("report-table-footer-meta")}>
          <span>
            {reportStartIndex}-{reportEndIndex} of {reportTotalRows}
          </span>
        </div>
        <div className={tw("report-table-pager")}>
          <button
            type="button"
            aria-label="Previous page"
            disabled={safeReportPage <= 1}
            onClick={() => setReportPage((current) => Math.max(1, current - 1))}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next page"
            disabled={safeReportPage >= reportTotalPages}
            onClick={() => setReportPage((current) => Math.min(reportTotalPages, current + 1))}
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}


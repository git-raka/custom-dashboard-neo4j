"use client";

import { tw } from "@/lib/tw";
import { formatValue } from "@/components/builder/core/builder-helpers";
import { AnyRecord } from "@/components/builder/core/types";

type WidgetTableViewProps = {
  widget: AnyRecord;
  limit?: number;
};

export default function WidgetTableView({ widget, limit = 16 }: WidgetTableViewProps) {
  return (
    <div className={tw("table-shell")}>
      <table>
        <thead>
          <tr>
            {widget.result.columns.map((column: string) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {widget.result.rows.slice(0, limit).map((row: AnyRecord, index: number) => (
            <tr key={`${widget.id}-${index}`}>
              {widget.result.columns.map((column: string) => (
                <td key={`${index}-${column}`}>{formatValue(row[column])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


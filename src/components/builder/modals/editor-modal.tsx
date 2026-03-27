"use client";

import { X } from "lucide-react";
import { tw } from "@/lib/tw";
import { AnyRecord, VoidFn } from "@/components/builder/core/types";

type EditorModalProps = {
  draft: AnyRecord | null;
  onChange: (nextDraft: AnyRecord) => void;
  onClose: VoidFn;
  onSave: VoidFn;
  starterQueries: AnyRecord[];
};

export default function EditorModal({ draft, onChange, onClose, onSave, starterQueries }: EditorModalProps) {
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
            <select value={draft.type} onChange={(event) => onChange({ ...draft, type: event.target.value })}>
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
          {starterQueries.map((preset) => (
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

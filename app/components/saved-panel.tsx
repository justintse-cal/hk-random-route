"use client";

import { useRef, useState } from "react";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import type { Bookmark, HistoryEntry } from "@/lib/storage";
import { CloseIcon, EditIcon } from "./icons";

interface SavedViewProps {
  lang: Lang;
  bookmarks: Bookmark[];
  history: HistoryEntry[];
  onOpenBookmark: (origin: { lat: number; lon: number }) => void;
  onRemoveBookmark: (id: string) => void;
  onRenameBookmark: (id: string, name: string) => void;
  onOpenHistory: (entry: HistoryEntry) => void;
  onDeleteHistory: (id: string) => void;
  onRenameHistory: (id: string, name: string) => void;
}

function historyLabel(
  lang: Lang,
  entry: HistoryEntry,
): string {
  return (
    entry.name ?? (entry.route.streetNames[0] || t(lang, "app.title"))
  );
}

export default function SavedView({
  lang,
  bookmarks,
  history,
  onOpenBookmark,
  onRemoveBookmark,
  onRenameBookmark,
  onOpenHistory,
  onDeleteHistory,
  onRenameHistory,
}: SavedViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const draftRef = useRef("");

  const beginEdit = (id: string, current: string) => {
    setDraft(current);
    draftRef.current = current;
    setEditingId(id);
  };

  const commitEdit = () => {
    if (editingId === null) return;
    const trimmed = draft.trim();
    if (trimmed.length > 0 && trimmed !== draftRef.current) {
      const editing = bookmarks.some((b) => b.id === editingId)
        ? onRenameBookmark
        : onRenameHistory;
      editing(editingId, trimmed);
    }
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const input = (
    <input
      className="saved-rename-input"
      value={draft}
      placeholder={t(lang, "saved.renamePlaceholder")}
      aria-label={t(lang, "saved.rename")}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commitEdit();
        } else if (e.key === "Escape") {
          cancelEdit();
        }
      }}
      onBlur={commitEdit}
      autoFocus
    />
  );

  return (
    <div className="saved-view">
      {bookmarks.length > 0 && (
        <section className="saved-section">
          <h3>{t(lang, "origin.chooseBookmark")}</h3>
          <ul className="saved-list">
            {bookmarks.map((b) => (
              <li key={b.id} className="saved-item">
                {editingId === b.id ? (
                  input
                ) : (
                  <button
                    type="button"
                    className="saved-open"
                    onClick={() => onOpenBookmark(b.origin)}
                  >
                    {b.name}
                  </button>
                )}
                <button
                  type="button"
                  className="saved-rename"
                  aria-label={t(lang, "saved.rename")}
                  title={t(lang, "saved.rename")}
                  onClick={() => beginEdit(b.id, b.name)}
                >
                  <EditIcon />
                </button>
                <button
                  type="button"
                  className="saved-delete"
                  aria-label={t(lang, "history.delete")}
                  onClick={() => onRemoveBookmark(b.id)}
                >
                  <CloseIcon />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="saved-section">
        <h3>{t(lang, "history.title")}</h3>
        {history.length === 0 ? (
          <p className="empty">{t(lang, "history.empty")}</p>
        ) : (
          <ul className="saved-list">
            {history.map((entry) => (
              <li key={entry.id} className="saved-item">
                {editingId === entry.id ? (
                  input
                ) : (
                  <button
                    type="button"
                    className="saved-open"
                    onClick={() => onOpenHistory(entry)}
                  >
                    {historyLabel(lang, entry)} ·{" "}
                    {new Date(entry.timestamp).toLocaleDateString(lang)}
                  </button>
                )}
                <button
                  type="button"
                  className="saved-rename"
                  aria-label={t(lang, "saved.rename")}
                  title={t(lang, "saved.rename")}
                  onClick={() =>
                    beginEdit(entry.id, historyLabel(lang, entry))
                  }
                >
                  <EditIcon />
                </button>
                <button
                  type="button"
                  className="saved-delete"
                  aria-label={t(lang, "history.delete")}
                  onClick={() => onDeleteHistory(entry.id)}
                >
                  <CloseIcon />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

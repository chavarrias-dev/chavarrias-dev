"use client";

import { PDFDocument } from "pdf-lib";
import { useCallback, useId, useRef, useState } from "react";

type PdfItem = {
  id: string;
  file: File;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function reorder<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [removed] = next.splice(from, 1);
  next.splice(to, 0, removed);
  return next;
}

function isPdfFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return file.type === "application/pdf" || name.endsWith(".pdf");
}

export function MergePdfTool() {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<PdfItem[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeProgress, setMergeProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter(isPdfFile);
    if (files.length === 0) {
      setError("Solo se admiten archivos PDF.");
      return;
    }
    setError(null);
    setItems((prev) => [
      ...prev,
      ...files.map((file) => ({ id: newId(), file })),
    ]);
  }, []);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const moveUp = (index: number) => {
    if (index <= 0) return;
    setItems((prev) => reorder(prev, index, index - 1));
  };

  const moveDown = (index: number) => {
    setItems((prev) => {
      if (index >= prev.length - 1) return prev;
      return reorder(prev, index, index + 1);
    });
  };

  const removeAt = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData("text/plain", String(index));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOverRow = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDropOnRow = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const from = Number.parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (Number.isNaN(from) || from === dropIndex) return;
    setItems((prev) => reorder(prev, from, dropIndex));
  };

  const mergePdfs = async () => {
    if (items.length === 0) {
      setError("Agrega al menos un PDF.");
      return;
    }
    setError(null);
    setIsMerging(true);
    setMergeProgress("Preparando documento…");

    try {
      const merged = await PDFDocument.create();
      const total = items.length;

      for (let i = 0; i < total; i++) {
        setMergeProgress(`Uniendo ${i + 1} de ${total}…`);
        const bytes = await items[i].file.arrayBuffer();
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const copied = await merged.copyPages(doc, doc.getPageIndices());
        copied.forEach((page) => merged.addPage(page));
      }

      setMergeProgress("Generando archivo…");
      const pdfBytes = await merged.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "documentos-unificados.pdf";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMergeProgress(null);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "No se pudo unificar los PDFs.";
      setError(msg);
      setMergeProgress(null);
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div
        role="button"
        tabIndex={0}
        onDragEnter={() => setIsDraggingOver(true)}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsDraggingOver(false);
          }
        }}
        onDragOver={(e) => {
          onDragOver(e);
          setIsDraggingOver(true);
        }}
        onDrop={onDrop}
        className={`rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all duration-200 ${
          isDraggingOver
            ? "border-[#227DE8] bg-[#227DE8]/5 shadow-md"
            : "border-slate-200 bg-slate-50/50 shadow-sm"
        }`}
      >
        <p className="text-sm text-slate-600">
          Arrastra PDFs aquí o usa el botón para elegirlos
        </p>
        <input
          ref={fileInputRef}
          id={inputId}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="sr-only"
          onChange={onInputChange}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-[#227DE8] px-5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#1a6ed4] hover:shadow"
        >
          Subir archivos
        </button>
      </div>

      {error ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {items.length > 0 ? (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-medium text-slate-700">
            Archivos ({items.length}) — orden de unión
          </h3>
          <ul className="space-y-2">
            {items.map((item, index) => (
              <li
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOverRow}
                onDrop={(e) => handleDropOnRow(e, index)}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition-shadow duration-200 hover:shadow-md sm:flex-nowrap"
              >
                <span
                  className="cursor-grab text-slate-400 active:cursor-grabbing"
                  title="Arrastrar para reordenar"
                  aria-hidden
                >
                  ⋮⋮
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">
                  {item.file.name}
                </span>
                <span className="text-xs text-slate-500">
                  {formatSize(item.file.size)}
                </span>
                <div className="ml-auto flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveUp(index)}
                    disabled={index === 0 || isMerging}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 transition-all duration-200 hover:bg-slate-50 disabled:opacity-40"
                    aria-label="Subir en la lista"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(index)}
                    disabled={index === items.length - 1 || isMerging}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 transition-all duration-200 hover:bg-slate-50 disabled:opacity-40"
                    aria-label="Bajar en la lista"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeAt(index)}
                    disabled={isMerging}
                    className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-700 transition-all duration-200 hover:bg-red-50 disabled:opacity-40"
                    aria-label="Quitar archivo"
                  >
                    Quitar
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={mergePdfs}
              disabled={isMerging || items.length === 0}
              className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-[#227DE8] px-5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#1a6ed4] hover:shadow disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {isMerging ? (
                <span className="flex items-center gap-2">
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                    aria-hidden
                  />
                  {mergeProgress ?? "Uniendo…"}
                </span>
              ) : (
                "Unificar"
              )}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

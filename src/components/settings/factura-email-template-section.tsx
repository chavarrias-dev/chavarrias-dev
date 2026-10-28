"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { SettingsAlert } from "@/components/settings/settings-alert";
import { SettingsCard } from "@/components/settings/settings-card";
import {
  DEFAULT_FACTURA_BODY_TEMPLATE,
  FACTURA_EMAIL_TEMPLATE_PLACEHOLDERS,
} from "@/lib/factura-email-template-defaults";

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#227DE8] focus:ring-2 focus:ring-[#227DE8]/20";

const PREVIEW_VARS = {
  empresa: "FRUTAS ESMERALDAS",
  monto: "$900.00",
  tramite: "$900.00",
  referencia: "55250505515",
  tipo_cliente: "PYME",
  nombre: "Arturo González",
  numero: "55250505515",
  fecha: "08/08/2026",
};

function applyPreview(template: string): string {
  let text = template;
  for (const [key, value] of Object.entries(PREVIEW_VARS)) {
    text = text.replaceAll(`{{${key}}}`, value);
  }
  return text;
}

export function FacturaEmailTemplateSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bodyTemplate, setBodyTemplate] = useState("");
  const [signatureUrl, setSignatureUrl] = useState("");
  const [placeholders, setPlaceholders] = useState<string[]>([
    ...FACTURA_EMAIL_TEMPLATE_PLACEHOLDERS,
  ]);
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  const previewText = useMemo(
    () => applyPreview(bodyTemplate),
    [bodyTemplate],
  );

  const applySettings = useCallback(
    (settings: {
      body_template: string;
      signature_url: string;
      placeholders?: string[];
    }) => {
      setBodyTemplate(settings.body_template);
      setSignatureUrl(settings.signature_url);
      if (settings.placeholders?.length) {
        setPlaceholders(settings.placeholders);
      }
    },
    [],
  );

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch("/api/settings/factura-email-template");
        const payload = (await response.json()) as {
          ok?: boolean;
          settings?: {
            body_template: string;
            signature_url: string;
            placeholders?: string[];
          };
          error?: string;
        };
        if (!response.ok || !payload.ok || !payload.settings) {
          throw new Error(payload.error ?? "No se pudo cargar la plantilla");
        }
        applySettings(payload.settings);
      } catch (error) {
        console.error("[settings] factura email template load failed", error);
        setMessage({
          tone: "error",
          text:
            error instanceof Error
              ? error.message
              : "Error al cargar la plantilla",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [applySettings]);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/settings/factura-email-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body_template: bodyTemplate,
          signature_url: signatureUrl,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        storage_fallback?: boolean;
        settings?: {
          body_template: string;
          signature_url: string;
          placeholders?: string[];
        };
      };
      if (!response.ok || !payload.ok || !payload.settings) {
        throw new Error(payload.error ?? "No se pudo guardar");
      }
      applySettings(payload.settings);
      setMessage({
        tone: "success",
        text: payload.storage_fallback
          ? "Plantilla guardada. (Archivo en Storage: ejecuta la migración SQL cuando puedas para usar la tabla en base de datos.)"
          : "Plantilla de facturas guardada.",
      });
    } catch (error) {
      setMessage({
        tone: "error",
        text:
          error instanceof Error ? error.message : "Error al guardar la plantilla",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SettingsCard
        title="Correo de facturas"
        description="Plantilla enviada a los clientes al registrar o reenviar una factura."
      >
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Cargando plantilla…
        </p>
      </SettingsCard>
    );
  }

  return (
    <SettingsCard
      title="Correo de facturas"
      description="Plantilla inicial al crear facturas y firma del email. El mensaje se edita en cada factura."
    >
      {message ? (
        <SettingsAlert tone={message.tone} message={message.text} />
      ) : null}

      <div>
        <label
          htmlFor="factura_body_template"
          className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700"
        >
          <FileText className="size-4 text-slate-400" aria-hidden />
            Plantilla inicial (nuevas facturas)
        </label>
        <textarea
          id="factura_body_template"
          rows={6}
          className={`${fieldClass} min-h-[140px] resize-y font-mono text-[13px]`}
          value={bodyTemplate}
          onChange={(e) => setBodyTemplate(e.target.value)}
        />
        <p className="mt-2 text-xs text-slate-500">
          Se copia al campo «Descripción para correo» al crear una factura. El
          usuario edita el mensaje final ahí. Variables:{" "}
          {placeholders.map((p) => (
            <code
              key={p}
              className="mr-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-700"
            >
              {p}
            </code>
          ))}
        </p>
        <button
          type="button"
          className="mt-2 text-sm font-medium text-[#227DE8] hover:underline"
          onClick={() => setBodyTemplate(DEFAULT_FACTURA_BODY_TEMPLATE)}
        >
          Restaurar texto de ejemplo (con saltos de línea)
        </button>
      </div>

      <div>
        <label
          htmlFor="factura_signature_url"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          URL de la imagen de firma
        </label>
        <input
          id="factura_signature_url"
          type="url"
          className={fieldClass}
          value={signatureUrl}
          onChange={(e) => setSignatureUrl(e.target.value)}
          placeholder="https://…/FACTURAS_.png"
        />
        {signatureUrl.trim() ? (
          <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={signatureUrl.trim()}
              alt="Vista previa de la firma"
              className="max-h-40 w-full object-contain object-left"
            />
          </div>
        ) : null}
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
          Vista previa del texto
        </p>
        <p className="whitespace-pre-wrap text-sm text-slate-800">{previewText}</p>
      </div>

      <div className="flex justify-end pt-1">
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave()}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#227DE8] px-4 text-sm font-medium text-white shadow-sm transition hover:bg-[#1a6ed4] disabled:pointer-events-none disabled:opacity-60"
        >
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Guardando…
            </>
          ) : (
            "Guardar plantilla"
          )}
        </button>
      </div>
    </SettingsCard>
  );
}

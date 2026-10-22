export const TIPOS_RAZON_SOCIAL = [
  { value: "Persona Física", label: "Persona Física" },
  {
    value: "S.A. de C.V.",
    label: "S.A. de C.V. (Sociedad Anónima de Capital Variable)",
  },
  { value: "S.A.", label: "S.A. (Sociedad Anónima)" },
  {
    value: "S. de R.L. de C.V.",
    label:
      "S. de R.L. de C.V. (Sociedad de Responsabilidad Limitada de Capital Variable)",
  },
  {
    value: "S. de R.L.",
    label: "S. de R.L. (Sociedad de Responsabilidad Limitada)",
  },
  {
    value: "S.A.P.I. de C.V.",
    label:
      "S.A.P.I. de C.V. (Sociedad Anónima Promotora de Inversión de Capital Variable)",
  },
  { value: "S.A.P.I.B. de C.V.", label: "S.A.P.I.B. de C.V." },
  { value: "S.A.S.", label: "S.A.S. (Sociedad por Acciones Simplificada)" },
  { value: "S.C.", label: "S.C. (Sociedad Civil)" },
  { value: "A.C.", label: "A.C. (Asociación Civil)" },
  { value: "S. en N.C.", label: "S. en N.C. (Sociedad en Nombre Colectivo)" },
  { value: "S. en C.", label: "S. en C. (Sociedad en Comandita Simple)" },
  {
    value: "S. en C. por A.",
    label: "S. en C. por A. (Sociedad en Comandita por Acciones)",
  },
] as const;

export const TIPO_RAZON_SOCIAL_OTRO = "Otro";

const TIPOS_CONOCIDOS = new Set<string>(
  TIPOS_RAZON_SOCIAL.map((tipo) => tipo.value),
);

function readTrimmed(formData: FormData, key: string): string {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

export function splitTipoRazonSocial(stored: string | null | undefined): {
  tipo: string;
  otro: string;
} {
  const value = stored?.trim() ?? "";
  if (!value) {
    return { tipo: "", otro: "" };
  }
  if (TIPOS_CONOCIDOS.has(value)) {
    return { tipo: value, otro: "" };
  }
  return { tipo: TIPO_RAZON_SOCIAL_OTRO, otro: value };
}

export type ClientCompanyFields = {
  companyName: string;
  tipoRazonSocial: string;
  puesto: string;
};

export function readClientCompanyFields(
  formData: FormData,
): { ok: true; value: ClientCompanyFields } | { ok: false; error: string } {
  const companyName = readTrimmed(formData, "company_name");
  if (!companyName) {
    return { ok: false, error: "Nombre de la empresa requerido" };
  }

  const tipo = readTrimmed(formData, "tipo_razon_social");
  if (!tipo) {
    return { ok: false, error: "Tipo de razón social requerido" };
  }

  let tipoRazonSocial = tipo;
  if (tipo === TIPO_RAZON_SOCIAL_OTRO) {
    const otro = readTrimmed(formData, "tipo_razon_social_otro");
    if (!otro) {
      return { ok: false, error: "Especifica el tipo de razón social" };
    }
    tipoRazonSocial = otro;
  } else if (!TIPOS_CONOCIDOS.has(tipo)) {
    return { ok: false, error: "Tipo de razón social inválido" };
  }

  const puesto = readTrimmed(formData, "puesto");
  if (!puesto) {
    return { ok: false, error: "Puesto en la empresa requerido" };
  }

  return {
    ok: true,
    value: { companyName, tipoRazonSocial, puesto },
  };
}

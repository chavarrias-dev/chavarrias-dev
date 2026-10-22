export type PedimentoNumberParts = {
  anio: string;
  aduana: string;
  agente: string;
  consecutivo: string;
};

const SPACED = /^(\d{2}) (\d{2}) (\d{4}) (\d{6,8})$/;

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function parsePedimentoNumber(value: string): PedimentoNumberParts {
  const compact = value.trim().replace(/\s+/g, " ");
  const spaced = compact.match(SPACED);
  if (spaced) {
    return {
      anio: spaced[1] ?? "",
      aduana: spaced[2] ?? "",
      agente: spaced[3] ?? "",
      consecutivo: spaced[4] ?? "",
    };
  }

  const digits = digitsOnly(value);
  if (digits.length >= 14 && digits.length <= 16) {
    return {
      anio: digits.slice(0, 2),
      aduana: digits.slice(2, 4),
      agente: digits.slice(4, 8),
      consecutivo: digits.slice(8),
    };
  }

  return {
    anio: "",
    aduana: "",
    agente: "",
    consecutivo: "",
  };
}

export function formatPedimentoNumber(value: string): string {
  const parts = parsePedimentoNumber(value);
  if (
    parts.anio &&
    parts.aduana &&
    parts.agente &&
    /^\d{6,8}$/.test(parts.consecutivo)
  ) {
    return `${parts.anio} ${parts.aduana} ${parts.agente} ${parts.consecutivo}`;
  }
  return value.trim();
}

function readDigits(formData: FormData, key: string): string {
  const raw = formData.get(key);
  return typeof raw === "string" ? digitsOnly(raw) : "";
}

export function readPedimentoNumber(
  formData: FormData,
): { ok: true; value: string } | { ok: false; error: string } {
  const anio = readDigits(formData, "pedimento_anio");
  const aduana = readDigits(formData, "pedimento_aduana");
  const agente = readDigits(formData, "pedimento_agente");
  const consecutivo = readDigits(formData, "pedimento_consecutivo");

  if (!/^\d{2}$/.test(anio)) {
    return { ok: false, error: "El año del pedimento debe tener 2 dígitos" };
  }
  if (!/^\d{2}$/.test(aduana)) {
    return {
      ok: false,
      error: "La clave de aduana del pedimento debe tener 2 dígitos",
    };
  }
  if (!/^\d{4}$/.test(agente)) {
    return { ok: false, error: "El agente aduanal debe tener 4 dígitos" };
  }
  if (!/^\d{6,8}$/.test(consecutivo)) {
    return {
      ok: false,
      error: "El número de pedimento debe tener entre 6 y 8 dígitos",
    };
  }

  return {
    ok: true,
    value: `${anio} ${aduana} ${agente} ${consecutivo}`,
  };
}

import type { PedimentoNumberParts } from "@/lib/pedimento-number";
import {
  compactPedimentoDigits,
  formatPedimentoFromParts,
} from "@/lib/pedimento-number";
import type { SupabaseClient } from "@supabase/supabase-js";

export const PEDIMENTO_DUPLICATE_ERROR =
  "Ya existe un pedimento registrado con este número.";

export async function isPedimentoNumberTaken(
  supabase: SupabaseClient,
  parts: PedimentoNumberParts,
  excludePedimentoId?: string,
): Promise<boolean> {
  const formatted = formatPedimentoFromParts(parts);
  if (!formatted) return false;

  const targetCompact = compactPedimentoDigits(formatted);
  const consecutivo = parts.consecutivo.trim();

  const { data, error } = await supabase
    .from("pedimentos")
    .select("id, numero_pedimento")
    .or(
      `numero_pedimento.eq.${formatted},numero_pedimento.ilike.%${consecutivo}`,
    );

  if (error || !data?.length) {
    return false;
  }

  for (const row of data) {
    if (excludePedimentoId && row.id === excludePedimentoId) {
      continue;
    }
    if (compactPedimentoDigits(row.numero_pedimento ?? "") === targetCompact) {
      return true;
    }
  }

  return false;
}

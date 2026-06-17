import "server-only";

import {
  formatDodaWhatsAppReply,
  findClientIdByPhone,
  isSupportedDodaFile,
  runDodaLookupAndSave,
} from "@/lib/doda-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  downloadWhatsAppMedia,
  sendWhatsAppTextMessage,
  type WhatsAppIncomingMedia,
} from "@/lib/whatsapp";

export async function processWhatsAppDodaMedia(
  media: WhatsAppIncomingMedia,
): Promise<void> {
  const supabase = createSupabaseAdminClient();

  try {
    const downloaded = await downloadWhatsAppMedia(media.mediaId);
    const file = new File([Uint8Array.from(downloaded.buffer)], media.filename, {
      type: downloaded.mimeType || media.mimeType,
    });

    if (!isSupportedDodaFile(file)) {
      await sendWhatsAppTextMessage(
        media.from,
        [
          "⚠️ *Formato no soportado*",
          "",
          "Envía tu DODA como imagen (JPG/PNG) o PDF con el código QR visible.",
        ].join("\n"),
      );
      return;
    }

    const clienteId = await findClientIdByPhone(supabase, media.from);

    const { lookup } = await runDodaLookupAndSave({
      supabase,
      file,
      clienteId,
      whatsappPhone: media.from,
      source: "whatsapp",
      notas: `WhatsApp message ${media.messageId}`,
      storagePathPrefix: `dodas/whatsapp/${media.from}`,
    });

    await sendWhatsAppTextMessage(
      media.from,
      formatDodaWhatsAppReply(lookup, Boolean(clienteId)),
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error desconocido al procesar el DODA.";

    console.error("[whatsapp-doda]", media.messageId, message);

    try {
      await sendWhatsAppTextMessage(
        media.from,
        [
          "⚠️ *No pudimos procesar tu archivo*",
          "",
          `Motivo: ${message}`,
          "",
          "Intenta enviar de nuevo una imagen o PDF claro del DODA con el QR visible.",
        ].join("\n"),
      );
    } catch (sendError) {
      console.error("[whatsapp-doda] failed to send error reply", sendError);
    }
  }
}

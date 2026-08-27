import "server-only";

import webpush from "web-push";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type WebPushSubscriptionJson = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

type PushSubscriptionRow = {
  id: string;
  subscription: WebPushSubscriptionJson;
};

/** A specific alert category, gated by its own profiles.notif_*_alert column in addition to the master switch. */
export type PushPreferenceKey =
  | "notif_doda_alert"
  | "notif_docs_alert"
  | "notif_messages_alert";

let vapidConfigured = false;

function configureVapid(publicKey: string, privateKey: string, email: string) {
  if (vapidConfigured) return;
  webpush.setVapidDetails(email, publicKey, privateKey);
  vapidConfigured = true;
}

/** Sends a web push notification to every device the given user has subscribed from. */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  url: string,
  preferenceKey?: PushPreferenceKey,
): Promise<void> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL;

  if (!publicKey || !privateKey || !email) {
    console.error("[web-push] Faltan variables VAPID; se omite el envío");
    return;
  }

  configureVapid(publicKey, privateKey, email);

  const supabase = createSupabaseAdminClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("notif_push_enabled, notif_doda_alert, notif_docs_alert, notif_messages_alert")
    .eq("id", userId)
    .maybeSingle<Record<PushPreferenceKey | "notif_push_enabled", boolean>>();

  if (profileError) {
    console.error("[web-push] failed to load notification preferences", profileError);
    return;
  }

  if (profile && profile.notif_push_enabled === false) {
    return;
  }
  if (profile && preferenceKey && profile[preferenceKey] === false) {
    return;
  }

  const { data: rows, error } = await supabase
    .from("push_subscriptions")
    .select("id, subscription")
    .eq("user_id", userId);

  if (error) {
    console.error("[web-push] failed to load subscriptions", error);
    return;
  }

  const subscriptions = (rows ?? []) as PushSubscriptionRow[];
  if (subscriptions.length === 0) {
    return;
  }

  const payload = JSON.stringify({ title, body, url });

  await Promise.all(
    subscriptions.map(async (row) => {
      try {
        await webpush.sendNotification(row.subscription, payload);
      } catch (sendError) {
        const statusCode = (sendError as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Subscription is gone (browser data cleared, unsubscribed, etc).
          await supabase.from("push_subscriptions").delete().eq("id", row.id);
          return;
        }
        console.error("[web-push] failed to send notification", row.id, sendError);
      }
    }),
  );
}

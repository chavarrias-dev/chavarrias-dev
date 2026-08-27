import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  let subscription: unknown;
  try {
    subscription = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const endpoint = (subscription as { endpoint?: unknown })?.endpoint;
  if (typeof endpoint !== "string" || !endpoint) {
    return NextResponse.json(
      { ok: false, error: "Suscripción inválida" },
      { status: 400 },
    );
  }

  // Replace any existing row for this exact device (endpoint) to avoid duplicates
  // piling up when a browser re-subscribes.
  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("subscription->>endpoint", endpoint);

  const { error } = await supabase.from("push_subscriptions").insert({
    user_id: user.id,
    subscription,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/** Removes one device's subscription (or all of the user's, if no endpoint is given). */
export async function DELETE(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  let endpoint: unknown;
  try {
    const body = (await req.json()) as { endpoint?: unknown };
    endpoint = body?.endpoint;
  } catch {
    endpoint = undefined;
  }

  let query = supabase.from("push_subscriptions").delete().eq("user_id", user.id);
  if (typeof endpoint === "string" && endpoint) {
    query = query.eq("subscription->>endpoint", endpoint);
  }

  const { error } = await query;

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

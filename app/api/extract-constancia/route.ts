import { NextResponse } from "next/server";
import { extractConstanciaData } from "@/lib/extract-constancia";
import { getUserRole } from "@/lib/supabase/profile-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const actorRole = await getUserRole(supabase, user.id);
  if (actorRole !== "admin" && actorRole !== "empleado") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Cuerpo de solicitud inválido" },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Falta el archivo PDF (campo \"file\")" },
      { status: 400 },
    );
  }

  try {
    const data = await extractConstanciaData(file);
    return NextResponse.json({ data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al extraer datos";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

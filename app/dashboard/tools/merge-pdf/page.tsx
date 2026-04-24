import Link from "next/link";
import { MergePdfTool } from "@/components/tools/merge-pdf-tool";

export default function MergePdfPage() {
  return (
    <main className="font-poppins w-full flex-1 px-6 py-8 lg:px-10">
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-[#227DE8] underline-offset-2 transition-colors duration-200 hover:underline"
        >
          ← Volver al dashboard
        </Link>
        <h1 className="mt-4 text-2xl font-medium tracking-tight text-slate-900">
          Unificar PDFs
        </h1>
        <p className="mt-2 max-w-xl text-sm text-slate-500">
          Combina varios archivos PDF en uno solo. El proceso se realiza en tu
          navegador; los archivos no se envían al servidor.
        </p>
      </div>

      <MergePdfTool />
    </main>
  );
}

import { isZipUrl } from "@/lib/archive-file";
import {
  pedimentoArchiveDownloadNameFromUrl,
  pedimentoArchiveKindFromFilename,
} from "@/lib/pedimento-archive";

type ArchiveFileLinkProps = {
  href: string;
  current?: boolean;
  className?: string;
};

function linkLabel(
  href: string,
  current: boolean,
): { label: string; emoji: string; download?: string } {
  const path = href.split("?")[0]?.split("#")[0] ?? href;
  const pedimentoKind = pedimentoArchiveKindFromFilename(path);

  if (pedimentoKind === "rar") {
    return {
      label: current ? "Descargar RAR actual" : "Descargar RAR",
      emoji: "📦",
      download: pedimentoArchiveDownloadNameFromUrl(href),
    };
  }
  if (pedimentoKind === "zip" || isZipUrl(href)) {
    return {
      label: current ? "Descargar ZIP actual" : "Descargar ZIP",
      emoji: "🗜️",
      download: pedimentoArchiveDownloadNameFromUrl(href),
    };
  }
  return {
    label: current ? "Ver PDF actual" : "Ver PDF",
    emoji: "📄",
  };
}

export function ArchiveFileLink({
  href,
  current = false,
  className = "inline-flex items-center gap-1.5 font-medium text-[#227DE8] underline-offset-2 hover:underline",
}: ArchiveFileLinkProps) {
  const meta = linkLabel(href, current);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      download={meta.download}
    >
      <span aria-hidden>{meta.emoji}</span>
      {meta.label}
    </a>
  );
}

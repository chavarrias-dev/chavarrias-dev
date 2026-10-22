import { isZipUrl } from "@/lib/archive-file";

type ArchiveFileLinkProps = {
  href: string;
  current?: boolean;
  className?: string;
};

export function ArchiveFileLink({
  href,
  current = false,
  className = "inline-flex items-center gap-1.5 font-medium text-[#227DE8] underline-offset-2 hover:underline",
}: ArchiveFileLinkProps) {
  const zip = isZipUrl(href);
  const label = current
    ? zip
      ? "Ver ZIP actual"
      : "Ver PDF actual"
    : zip
      ? "Ver ZIP"
      : "Ver PDF";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      <span aria-hidden>{zip ? "🗜️" : "📄"}</span>
      {label}
    </a>
  );
}

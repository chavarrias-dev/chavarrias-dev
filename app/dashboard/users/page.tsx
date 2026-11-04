import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function UsersListPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const error = sp.error ? encodeURIComponent(sp.error) : "";
  redirect(
    error
      ? `/dashboard/settings?tab=usuarios&error=${error}`
      : "/dashboard/settings?tab=usuarios",
  );
}

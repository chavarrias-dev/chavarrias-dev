import { NewClientForm } from "@/components/clients/new-client-form";

type PageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewClientPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const errorMessage = params.error
    ? decodeURIComponent(params.error)
    : undefined;

  return (
    <main className="w-full flex-1 px-6 py-8 lg:px-10">
      <NewClientForm errorMessage={errorMessage} />
    </main>
  );
}

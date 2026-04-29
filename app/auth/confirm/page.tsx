import { InviteConfirmClient } from "./invite-confirm-client";

type PageProps = {
  searchParams: Promise<{ token_hash?: string; type?: string }>;
};

export default async function AuthConfirmPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  return (
    <InviteConfirmClient tokenHash={sp.token_hash} otpType={sp.type} />
  );
}

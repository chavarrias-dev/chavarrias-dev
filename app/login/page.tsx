import { LoginForm } from "@/components/auth/login-form";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const errorMessage = params.error ? decodeURIComponent(params.error) : undefined;

  return <LoginForm errorMessage={errorMessage} />;
}

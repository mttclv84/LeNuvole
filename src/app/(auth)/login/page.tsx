import { Logo } from "@/components/logo";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; disabled?: string; link_error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center bg-muted px-4 py-12">
      <div className="w-full max-w-sm rounded-md border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo />
          <h1 className="mt-4 text-xl font-semibold">Il tuo progetto</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Accedi per seguire l&apos;andamento del tuo cantiere.
          </p>
        </div>
        <LoginForm next={params.next} disabled={params.disabled === "1"} linkError={params.link_error === "1"} />
      </div>
    </div>
  );
}

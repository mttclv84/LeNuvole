import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; disabled?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center bg-muted px-4 py-12">
      <div className="w-full max-w-sm rounded-md border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Le Nuvole Casa&amp;Design
          </p>
          <h1 className="mt-1 text-xl font-semibold">Il tuo progetto</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Accedi per seguire l&apos;andamento del tuo cantiere.
          </p>
        </div>
        <LoginForm next={params.next} disabled={params.disabled === "1"} />
      </div>
    </div>
  );
}

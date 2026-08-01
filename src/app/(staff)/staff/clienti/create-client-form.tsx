"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { createClientRecord, type CreateClientState } from "./actions";
import type { Project } from "@/lib/types";

export function CreateClientForm({ projects }: { projects: Project[] }) {
  const [state, formAction, pending] = useActionState<CreateClientState, FormData>(createClientRecord, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="first_name">Nome</Label>
          <Input id="first_name" name="first_name" required className="w-40" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="last_name">Cognome</Label>
          <Input id="last_name" name="last_name" required className="w-40" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required className="w-64" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password iniziale</Label>
          <Input id="password" name="password" type="text" minLength={8} required className="w-48" />
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">Telefono</Label>
          <Input id="phone" name="phone" type="tel" className="w-48" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="address">Indirizzo</Label>
          <Input id="address" name="address" className="w-64" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="project_id">Cantiere (facoltativo)</Label>
          <select id="project_id" name="project_id" className="h-10 w-56 rounded-md border border-border bg-card px-3 text-sm">
            <option value="">Nessuno per ora</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.client_label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Commenti</Label>
        <Textarea id="notes" name="notes" placeholder="Note facoltative sul cliente" />
      </div>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Creazione…" : "Registra cliente"}
        </Button>
      </div>

      {state?.error && <p className="text-sm text-status-red">{state.error}</p>}
      {state?.success && <p className="text-sm text-status-green">Cliente registrato.</p>}
    </form>
  );
}

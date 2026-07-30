import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/change-password-form";

export default function ImpostazioniPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Impostazioni account</CardTitle>
      </CardHeader>
      <CardContent>
        <ChangePasswordForm />
      </CardContent>
    </Card>
  );
}

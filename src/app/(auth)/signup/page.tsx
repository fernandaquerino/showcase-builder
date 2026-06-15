import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { GoogleSignIn } from "@/components/auth/google-sign-in";
import { SignupForm } from "@/components/auth/signup-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { auth } from "@/lib/auth";
import { isGoogleAuthEnabled } from "@/lib/env";

export const metadata: Metadata = {
  title: "Criar conta",
};

export default async function SignupPage() {
  const session = await auth();

  if (session) {
    redirect("/admin");
  }

  const googleEnabled = isGoogleAuthEnabled();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crie sua conta</CardTitle>
        <CardDescription>
          Prepare seu espaço para organizar as próximas lives.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {googleEnabled && (
          <>
            <GoogleSignIn />
            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs uppercase text-muted-foreground">
                ou
              </span>
              <Separator className="flex-1" />
            </div>
          </>
        )}

        <SignupForm />

        <p className="text-center text-sm text-muted-foreground">
          Já tem uma conta?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Entrar
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

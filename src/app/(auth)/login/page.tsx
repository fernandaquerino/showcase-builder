import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { GoogleSignIn } from "@/components/auth/google-sign-in";
import { LoginForm } from "@/components/auth/login-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  title: "Entrar",
};

type LoginPageProps = {
  searchParams: Promise<{
    registered?: string;
    error?: string;
    callbackUrl?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();

  if (session) {
    redirect("/admin");
  }

  const params = await searchParams;
  const googleEnabled = isGoogleAuthEnabled();
  const hasOAuthLinkingError = params.error === "OAuthAccountNotLinked";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entre na sua conta</CardTitle>
        <CardDescription>
          Continue de onde parou e cuide da sua vitrine.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {params.registered === "1" && (
          <Alert
            aria-live="polite"
            className="border-primary/30 bg-secondary/40"
          >
            <AlertDescription>
              Conta criada. Entre com seu e-mail e senha.
            </AlertDescription>
          </Alert>
        )}

        {hasOAuthLinkingError && (
          <Alert aria-live="polite" className="border-destructive/30">
            <AlertDescription>
              Já existe uma conta com este e-mail. Entre usando o método
              utilizado no cadastro.
            </AlertDescription>
          </Alert>
        )}

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

        <LoginForm callbackUrl={params.callbackUrl} />

        <p className="text-center text-sm text-muted-foreground">
          Ainda não tem conta?{" "}
          <Link
            href="/signup"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Cadastre-se
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

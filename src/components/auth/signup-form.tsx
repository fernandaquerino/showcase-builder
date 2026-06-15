"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { FieldError } from "@/components/auth/field-error";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  signupSchema,
  type SignupData,
  type SignupInput,
} from "@/lib/validations/auth";
import { signupAction } from "@/server/actions/auth/signup";

const fields = [
  {
    name: "name",
    label: "Nome",
    type: "text",
    autoComplete: "name",
    placeholder: "Como você quer ser chamada",
  },
  {
    name: "email",
    label: "E-mail",
    type: "email",
    autoComplete: "email",
    placeholder: "voce@exemplo.com",
  },
  {
    name: "handle",
    label: "Endereço público",
    type: "text",
    autoComplete: "username",
    placeholder: "seu-nome",
  },
  {
    name: "password",
    label: "Senha",
    type: "password",
    autoComplete: "new-password",
    placeholder: "Mínimo de 8 caracteres",
  },
  {
    name: "passwordConfirmation",
    label: "Confirmar senha",
    type: "password",
    autoComplete: "new-password",
    placeholder: "Repita sua senha",
  },
] as const;

export function SignupForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [visiblePasswords, setVisiblePasswords] = useState<
    Partial<Record<"password" | "passwordConfirmation", boolean>>
  >({});
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SignupInput, unknown, SignupData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      handle: "",
      password: "",
      passwordConfirmation: "",
    },
  });

  function onSubmit(data: SignupData) {
    startTransition(async () => {
      const result = await signupAction(data);

      if (result.success) {
        router.push(
          `/login?registered=1&email=${encodeURIComponent(result.data?.email ?? "")}`,
        );
        return;
      }

      setError("root", { message: result.message });

      for (const [field, messages] of Object.entries(
        result.fieldErrors ?? {},
      )) {
        if (field in signupSchema.shape) {
          setError(
            field as keyof SignupInput,
            { message: messages[0] },
            { shouldFocus: true },
          );
        }
      }
    });
  }

  function togglePasswordVisibility(
    field: "password" | "passwordConfirmation",
  ) {
    setVisiblePasswords((current) => ({
      ...current,
      [field]: !current[field],
    }));
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {errors.root?.message && (
        <Alert aria-live="polite" className="border-destructive/30">
          <AlertDescription>{errors.root.message}</AlertDescription>
        </Alert>
      )}

      {fields.map((field) => {
        const error = errors[field.name];
        const errorId = `${field.name}-error`;

        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>{field.label}</Label>
            {field.type === "password" ? (
              <div className="relative">
                <Input
                  id={field.name}
                  type={visiblePasswords[field.name] ? "text" : "password"}
                  autoComplete={field.autoComplete}
                  placeholder={field.placeholder}
                  className="pr-12"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? errorId : undefined}
                  {...register(field.name)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  aria-label={
                    visiblePasswords[field.name]
                      ? `Esconder ${field.label.toLowerCase()}`
                      : `Mostrar ${field.label.toLowerCase()}`
                  }
                  aria-pressed={Boolean(visiblePasswords[field.name])}
                  onClick={() => togglePasswordVisibility(field.name)}
                >
                  {visiblePasswords[field.name] ? (
                    <EyeOff className="size-4" aria-hidden="true" />
                  ) : (
                    <Eye className="size-4" aria-hidden="true" />
                  )}
                </Button>
              </div>
            ) : (
              <Input
                id={field.name}
                type={field.type}
                autoComplete={field.autoComplete}
                placeholder={field.placeholder}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? errorId : undefined}
                {...register(field.name)}
              />
            )}
            <FieldError id={errorId} message={error?.message} />
          </div>
        );
      })}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending && (
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        )}
        {isPending ? "Criando conta..." : "Criar conta"}
      </Button>
    </form>
  );
}

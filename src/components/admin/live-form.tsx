"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { FieldError } from "@/components/auth/field-error";
import { LiveImageUpload } from "@/components/admin/live-image-upload";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { slugify } from "@/lib/slug";
import {
  liveInputSchema,
  type LiveFormData,
  type LiveFormValues,
} from "@/lib/validations/live";
import { createLiveAction, updateLiveAction } from "@/server/actions/lives";


const EMPTY_VALUES: LiveFormValues = {
  title: "",
  // subtitle: "",
  liveDate: "",
  liveTime: "",
  coverImageUrl: "",
  instagramUrl: "",
  slug: "",
};

type LiveFormProps =
  | {
      mode: "create";
      handle: string;
      liveId?: undefined;
      initialValues?: undefined;
    }
  | {
      mode: "edit";
      handle: string;
      liveId: string;
      initialValues: LiveFormValues;
    };

// function resolvePlatformSelect(platform: string): string {
//   if (platform === "") {
//     return "";
//   }
//   return (KNOWN_PLATFORMS as readonly string[]).includes(platform)
//     ? platform
//     : "Outra";
// }

export function LiveForm({
  mode,
  handle,
  liveId,
  initialValues,
}: LiveFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const defaultValues = initialValues ?? EMPTY_VALUES;

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    getValues,
    formState: { errors, isDirty },
  } = useForm<LiveFormValues, unknown, LiveFormData>({
    resolver: zodResolver(liveInputSchema),
    defaultValues,
  });

  // On create the slug tracks the title until the creator edits it by hand.
  const [slugLocked, setSlugLocked] = useState(mode === "edit");
  // const [platformSelect, setPlatformSelect] = useState(() =>
  //   resolvePlatformSelect(defaultValues.platform),
  // );

  const title = useWatch({ control, name: "title" });
  const slug = useWatch({ control, name: "slug" });
  const coverImageUrl = useWatch({ control, name: "coverImageUrl" });
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  useEffect(() => {
    if (mode === "create" && !slugLocked) {
      setValue("slug", title.trim() ? slugify(title) : "");
    }
  }, [title, slugLocked, mode, setValue]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!isDirty) {
      return;
    }

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  function regenerateSlug() {
    setValue("slug", title.trim() ? slugify(title) : "", {
      shouldValidate: true,
      shouldDirty: true,
    });
    setSlugLocked(mode === "edit");
  }

  // function handlePlatformSelect(value: string) {
  //   setPlatformSelect(value);
  //   setValue("platform", value === "Outra" ? "" : value, {
  //     shouldDirty: true,
  //   });
  // }

  function applyResult(
    result: Awaited<ReturnType<typeof createLiveAction>>,
  ): boolean {
    if (result.success) {
      return true;
    }

    setError("root", { message: result.message });
    for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
      if (field in liveInputSchema.shape && messages?.[0]) {
        setError(
          field as keyof LiveFormValues,
          { message: messages[0] },
          { shouldFocus: true },
        );
      }
    }
    return false;
  }

  function onSubmit() {
    const values = getValues();

    startTransition(async () => {
      if (mode === "create") {
        const result = await createLiveAction(values);
        if (applyResult(result) && result.success) {
          toast.success("Live criada com sucesso.");
          router.push(`/admin/lives/${result.data?.liveId}`);
        }
        return;
      }

      const result = await updateLiveAction(liveId, values);
      if (applyResult(result)) {
        toast.success("Alterações salvas.");
        router.refresh();
      }
    });
  }

  const slugPreview = slug.trim() ? slugify(slug) : "slug-da-live";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {errors.root?.message && (
        <Alert aria-live="assertive" className="border-destructive/30">
          <AlertDescription>{errors.root.message}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? "title-error" : undefined}
          {...register("title")}
        />
        <FieldError id="title-error" message={errors.title?.message} />
      </div>

      {/* <div className="space-y-2">
        <Label htmlFor="subtitle">Subtítulo</Label>
        <Textarea
          id="subtitle"
          aria-invalid={Boolean(errors.subtitle)}
          aria-describedby={errors.subtitle ? "subtitle-error" : undefined}
          {...register("subtitle")}
        />
        <FieldError id="subtitle-error" message={errors.subtitle?.message} />
      </div> */}

      <div className="grid gap-6 sm:grid-cols-2">
        {/* <div className="space-y-2">
          <Label htmlFor="store">Loja</Label>
          <Input
            id="store"
            placeholder="C&A"
            aria-invalid={Boolean(errors.store)}
            aria-describedby={errors.store ? "store-error" : undefined}
            {...register("store")}
          />
          <FieldError id="store-error" message={errors.store?.message} />
        </div> */}

        {/* <div className="space-y-2">
          <Label htmlFor="platform">Plataforma</Label>
          <select
            id="platform"
            value={platformSelect}
            onChange={(event) => handlePlatformSelect(event.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <option value="">Selecione (opcional)</option>
            {PLATFORM_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {platformSelect === "Outra" && (
            <Input
              aria-label="Outra plataforma"
              placeholder="Qual plataforma?"
              {...register("platform")}
            />
          )}
          <FieldError id="platform-error" message={errors.platform?.message} />
        </div> */}

        <div className="space-y-2">
          <Label htmlFor="liveDate">Data da live</Label>
          <Input
            id="liveDate"
            type="date"
            aria-invalid={Boolean(errors.liveDate)}
            aria-describedby={errors.liveDate ? "liveDate-error" : undefined}
            {...register("liveDate")}
          />
          <FieldError id="liveDate-error" message={errors.liveDate?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="liveTime">Horário</Label>
          <Input
            id="liveTime"
            type="time"
            aria-invalid={Boolean(errors.liveTime)}
            aria-describedby={errors.liveTime ? "liveTime-error" : undefined}
            {...register("liveTime")}
          />
          <FieldError id="liveTime-error" message={errors.liveTime?.message} />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Imagem da live</Label>
          {/* Keep coverImageUrl registered so the upload value participates in
              validation and submit; the creator never edits this URL by hand. */}
          <input type="hidden" {...register("coverImageUrl")} />
          <LiveImageUpload
            value={coverImageUrl?.trim() ? coverImageUrl : null}
            onChange={(url) =>
              setValue("coverImageUrl", url ?? "", { shouldDirty: true })
            }
            onUploadingChange={setIsUploadingCover}
            disabled={isPending}
            error={errors.coverImageUrl?.message}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="instagramUrl">Link do Instagram</Label>
          <Input
            id="instagramUrl"
            type="url"
            inputMode="url"
            placeholder="https://www.instagram.com/seu-perfil"
            aria-invalid={Boolean(errors.instagramUrl)}
            aria-describedby="instagramUrl-help instagramUrl-error"
            {...register("instagramUrl")}
          />
          <p id="instagramUrl-help" className="text-sm text-muted-foreground">
            Opcional. Vamos mostrar um botão na página pública.
          </p>
          <FieldError
            id="instagramUrl-error"
            message={errors.instagramUrl?.message}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="slug">Endereço da página</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={regenerateSlug}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Gerar do título
          </Button>
        </div>
        <Input
          id="slug"
          aria-invalid={Boolean(errors.slug)}
          aria-describedby="slug-preview slug-error"
          {...register("slug", {
            onChange: () => setSlugLocked(true),
          })}
        />
        <p id="slug-preview" className="text-sm text-muted-foreground">
          Link público depois de publicar:{" "}
          <span className="font-medium text-foreground">
            /{handle}/{slugPreview}
          </span>
        </p>
        <FieldError id="slug-error" message={errors.slug?.message} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row-reverse">
        <Button
          type="submit"
          loading={isPending}
          loadingText="Salvando..."
          disabled={isUploadingCover}
        >
          {mode === "create" ? "Salvar rascunho" : "Salvar alterações"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/admin")}
          disabled={isPending}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}

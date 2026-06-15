"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { ProductImage } from "@/components/admin/product-image";
import {
  ProductLinkExtractor,
  type ApplyExtractionResult,
} from "@/components/admin/product-link-extractor";
import { FieldError } from "@/components/auth/field-error";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBrlPrice, parseBrlPrice } from "@/lib/price";
import { capitalizeFirst } from "@/lib/string";
import { isSafeHttpUrl } from "@/lib/url";
import type { ExtractionSuccessData } from "@/lib/validations/extract";
import {
  normalizeProductCategory,
  productInputSchema,
  type ProductFormData,
  type ProductFormValues,
} from "@/lib/validations/product";
import {
  createProductAction,
  updateProductAction,
} from "@/server/actions/products";

const EMPTY_VALUES: ProductFormValues = {
  name: "",
  category: "",
  size: "",
  color: "",
  imageUrl: "",
  productUrl: "",
  price: "",
  sourceUrl: "",
};

/** Extraction fields mapped to their form targets (price shown in BR form). */
const EXTRACTION_TARGETS: ReadonlyArray<{
  field: "name" | "imageUrl" | "price" | "color" | "category";
  pick: (data: ExtractionSuccessData) => string | null;
}> = [
  { field: "name", pick: (data) => (data.name ? capitalizeFirst(data.name) : null) },
  { field: "imageUrl", pick: (data) => data.imageUrl },
  {
    field: "price",
    pick: (data) => (data.price ? data.price.replace(".", ",") : null),
  },
  { field: "color", pick: (data) => data.color },
  { field: "category", pick: (data) => normalizeProductCategory(data.category) },
];

type ProductFormProps = {
  liveId: string;
  categorySuggestions: string[];
} & (
  | { mode: "create"; productId?: undefined; initialValues?: undefined }
  | { mode: "edit"; productId: string; initialValues: ProductFormValues }
);

function previewPrice(raw: string): string | null {
  const parsed = parseBrlPrice(raw);
  return parsed.kind === "valid" ? formatBrlPrice(parsed.value) : null;
}

export function ProductForm({
  liveId,
  mode,
  productId,
  initialValues,
  categorySuggestions,
}: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDetails, setShowDetails] = useState(mode === "edit");
  const [extractedDetails, setExtractedDetails] =
    useState<ExtractionSuccessData | null>(null);
  const categoryListId = useId();

  const form = useForm<ProductFormValues, unknown, ProductFormData>({
    resolver: zodResolver(productInputSchema),
    defaultValues: initialValues ?? EMPTY_VALUES,
  });
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    getValues,
    getFieldState,
    control,
    formState,
  } = form;
  const { errors } = formState;

  /**
   * Fills only empty, untouched fields from an extraction result, preserving
   * anything the creator already typed (tracked via RHF dirty state). The
   * affiliate link the creator pasted is kept as the buy link and stored as the
   * extraction origin. Never saves or changes the product position.
   */
  function applyExtraction(data: ExtractionSuccessData): ApplyExtractionResult {
    let filled = 0;
    let preserved = 0;

    for (const { field, pick } of EXTRACTION_TARGETS) {
      const value = pick(data);
      if (value === null) {
        continue;
      }

      const current = (getValues(field) ?? "").trim();
      const isDirty = getFieldState(field, formState).isDirty;

      if (current === "" && !isDirty) {
        setValue(field, value, { shouldDirty: false, shouldValidate: false });
        filled += 1;
      } else {
        preserved += 1;
      }
    }

    // Provenance: store the pasted link, and default the buy link to it when the
    // creator has not provided one (preserving the affiliate URL).
    setValue("sourceUrl", data.affiliateUrl, { shouldDirty: true });

    const productUrl = (getValues("productUrl") ?? "").trim();
    if (productUrl === "" && !getFieldState("productUrl", formState).isDirty) {
      setValue("productUrl", data.affiliateUrl, { shouldValidate: true });
    }

    setExtractedDetails(data);
    return { filled, preserved };
  }

  function syncAffiliateUrl(url: string) {
    setValue("sourceUrl", url, { shouldDirty: url !== "" });

    if (!getFieldState("productUrl", formState).isDirty) {
      setValue("productUrl", url, {
        shouldDirty: false,
        shouldValidate: false,
      });
    }
  }

  const preview = useWatch({ control });
  const previewImage =
    preview.imageUrl && isSafeHttpUrl(preview.imageUrl.trim())
      ? preview.imageUrl.trim()
      : null;
  const previewPriceLabel = previewPrice(preview.price ?? "");

  function applyResult(
    result: Awaited<ReturnType<typeof createProductAction>>,
  ): boolean {
    if (result.success) {
      return true;
    }

    setError("root", { message: result.message });
    for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
      if (field in productInputSchema.shape && messages?.[0]) {
        setError(
          field as keyof ProductFormValues,
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
        const result = await createProductAction(liveId, values);
        if (applyResult(result)) {
          toast.success("Produto adicionado à live.");
          router.push(`/admin/lives/${liveId}`);
        }
        return;
      }

      const result = await updateProductAction(liveId, productId, values);
      if (applyResult(result)) {
        toast.success("Produto atualizado.");
        router.push(`/admin/lives/${liveId}`);
      }
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6"
        noValidate
        aria-busy={isPending}
      >
        <input type="hidden" {...register("sourceUrl")} />

        <ProductLinkExtractor
          mode={mode}
          initialUrl={
            initialValues?.sourceUrl || initialValues?.productUrl || ""
          }
          onApply={applyExtraction}
          onUrlChange={syncAffiliateUrl}
          onRevealForm={() => setShowDetails(true)}
        />

        {showDetails && (
          <>
            <div aria-live="assertive">
              {errors.root?.message && (
                <Alert className="border-destructive/30">
                  <AlertDescription>{errors.root.message}</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nome do produto</Label>
              <Input
                id="name"
                placeholder="Jaqueta jeans oversized"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "name-error" : undefined}
                {...register("name")}
              />
              <FieldError id="name-error" message={errors.name?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Input
                id="category"
                list={categoryListId}
                placeholder="Jaquetas"
                aria-invalid={Boolean(errors.category)}
                aria-describedby={
                  errors.category ? "category-error" : undefined
                }
                {...register("category")}
              />
              <datalist id={categoryListId}>
                {categorySuggestions.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
              <FieldError
                id="category-error"
                message={errors.category?.message}
              />
              {extractedDetails?.category && (
                <p className="text-sm text-muted-foreground">
                  Categoria sugerida: {extractedDetails.category}
                </p>
              )}
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="size">Tamanho mostrado na live</Label>
                <Input
                  id="size"
                  placeholder="P, M, G, 38, Tamanho único"
                  aria-invalid={Boolean(errors.size)}
                  aria-describedby={errors.size ? "size-error" : undefined}
                  {...register("size")}
                />
                <FieldError id="size-error" message={errors.size?.message} />
                {extractedDetails?.availableSizes.length ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Tamanhos disponíveis na loja:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {extractedDetails.availableSizes.map((size) => (
                        <Button
                          key={size}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="min-h-11 min-w-11"
                          onClick={() =>
                            setValue("size", size, {
                              shouldDirty: true,
                              shouldValidate: true,
                            })
                          }
                        >
                          {size}
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Escolha somente o tamanho que você mostrou na live.
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Cor mostrada na live</Label>
                <Input
                  id="color"
                  placeholder="Azul claro"
                  aria-invalid={Boolean(errors.color)}
                  aria-describedby={errors.color ? "color-error" : undefined}
                  {...register("color")}
                />
                <FieldError id="color-error" message={errors.color?.message} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl">Link da imagem</Label>
              <Input
                id="imageUrl"
                type="url"
                inputMode="url"
                placeholder="https://..."
                aria-invalid={Boolean(errors.imageUrl)}
                aria-describedby="imageUrl-help imageUrl-error"
                {...register("imageUrl")}
              />
              <p id="imageUrl-help" className="text-sm text-muted-foreground">
                Cole o endereço de uma imagem pública do produto.
              </p>
              <FieldError
                id="imageUrl-error"
                message={errors.imageUrl?.message}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="productUrl">Link para comprar</Label>
              <Input
                id="productUrl"
                type="url"
                inputMode="url"
                placeholder="https://..."
                aria-invalid={Boolean(errors.productUrl)}
                aria-describedby="productUrl-help productUrl-error"
                {...register("productUrl")}
              />
              <p id="productUrl-help" className="text-sm text-muted-foreground">
                Cole o link que suas seguidoras usarão para comprar o produto.
              </p>
              <FieldError
                id="productUrl-error"
                message={errors.productUrl?.message}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Preço, se quiser mostrar</Label>
              <div className="relative">
                <span
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                  aria-hidden="true"
                >
                  R$
                </span>
                <Input
                  id="price"
                  inputMode="decimal"
                  placeholder="99,90"
                  className="pl-9"
                  aria-invalid={Boolean(errors.price)}
                  aria-describedby={errors.price ? "price-error" : undefined}
                  {...register("price")}
                />
              </div>
              <FieldError id="price-error" message={errors.price?.message} />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row-reverse">
              <Button
                type="submit"
                loading={isPending}
                loadingText="Salvando..."
                fullWidth
                className="sm:w-auto"
              >
                {mode === "create" ? "Adicionar à live" : "Salvar alterações"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push(`/admin/lives/${liveId}`)}
                disabled={isPending}
              >
                Cancelar
              </Button>
            </div>
          </>
        )}
      </form>

      {showDetails && (
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <p className="mb-3 text-sm font-medium">
            Veja como o produto está ficando
          </p>
          <div className="overflow-hidden rounded-xl border bg-card">
            <ProductImage
              src={previewImage}
              alt={
                preview.name?.trim()
                  ? `Foto de ${preview.name.trim()}`
                  : "Prévia da imagem do produto"
              }
              className="aspect-square w-full rounded-none border-0"
            />
            <div className="space-y-1 p-4">
              {preview.category?.trim() && (
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {preview.category.trim()}
                </p>
              )}
              <p className="font-medium">
                {preview.name?.trim() || "Nome do produto"}
              </p>
              <p className="text-sm text-muted-foreground">
                {[preview.size?.trim(), preview.color?.trim()]
                  .filter(Boolean)
                  .join(" · ") || "Tamanho e cor aparecem aqui"}
              </p>
              {previewPriceLabel && (
                <p className="pt-1 font-semibold text-foreground">
                  {previewPriceLabel}
                </p>
              )}
              {extractedDetails?.brand && (
                <p className="text-xs text-muted-foreground">
                  Marca: {extractedDetails.brand}
                </p>
              )}
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}

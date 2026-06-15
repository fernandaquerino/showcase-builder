import type { ExtractionErrorCode } from "@/lib/validations/extract";

/** User-facing, friendly messages for each extraction error (never codes). */
const MESSAGES: Record<ExtractionErrorCode, string> = {
  INVALID_URL: "Confira o link e tente novamente.",
  HOST_NOT_ALLOWED: "Este tipo de link ainda não é aceito.",
  RATE_LIMITED:
    "Você fez várias buscas em pouco tempo. Aguarde um momento e tente novamente.",
  TIMEOUT:
    "A loja demorou para responder. Tente novamente ou preencha manualmente.",
  TOO_MANY_REDIRECTS:
    "Não foi possível buscar as informações. Você pode continuar manualmente.",
  UNSUPPORTED_CONTENT:
    "Não foi possível buscar as informações. Você pode continuar manualmente.",
  RESPONSE_TOO_LARGE:
    "Não foi possível buscar as informações. Você pode continuar manualmente.",
  UPSTREAM_BLOCKED:
    "A loja não permitiu buscar as informações agora. Você pode continuar manualmente.",
  NOT_FOUND: "Confira o link e tente novamente.",
  NO_PRODUCT_DATA:
    "Não encontramos nome ou foto nesse link. Complete os campos manualmente.",
  EXTRACTION_FAILED:
    "Não foi possível buscar as informações. Você pode continuar manualmente.",
};

export function extractionErrorMessage(code: ExtractionErrorCode): string {
  return MESSAGES[code];
}

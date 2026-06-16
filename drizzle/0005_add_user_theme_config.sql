ALTER TABLE "users" ADD COLUMN "theme_config" jsonb;

WITH ranked_live_themes AS (
  SELECT
    "user_id",
    "theme_config",
    ROW_NUMBER() OVER (
      PARTITION BY "user_id"
      ORDER BY
        CASE WHEN "status" = 'published' THEN 0 ELSE 1 END,
        "updated_at" DESC,
        "created_at" DESC
    ) AS "theme_rank"
  FROM "lives"
  WHERE "theme_config" IS NOT NULL
)
UPDATE "users"
SET "theme_config" = ranked_live_themes."theme_config"
FROM ranked_live_themes
WHERE "users"."id" = ranked_live_themes."user_id"
  AND ranked_live_themes."theme_rank" = 1
  AND "users"."theme_config" IS NULL;

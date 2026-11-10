-- Canonical format: digits only (strip trailing @g.us) for
-- whatsapp_groups.group_id and dodas.notify_whatsapp_group_id.
-- Idempotent: safe to re-run. Keeps the oldest row per normalized id.
-- No TEMP tables (Supabase SQL editor auto-commits between statements).

BEGIN;

-- c) Reassign pending DODAs from duplicate rows to the keeper's canonical id.
UPDATE dodas d
SET notify_whatsapp_group_id = k.canon
FROM (
  SELECT
    id,
    group_id,
    regexp_replace(group_id, '@g\.us$', '', 'i') AS canon,
    ROW_NUMBER() OVER (
      PARTITION BY regexp_replace(group_id, '@g\.us$', '', 'i')
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS rn
  FROM whatsapp_groups
) du
JOIN (
  SELECT
    id,
    group_id,
    regexp_replace(group_id, '@g\.us$', '', 'i') AS canon,
    ROW_NUMBER() OVER (
      PARTITION BY regexp_replace(group_id, '@g\.us$', '', 'i')
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS rn
  FROM whatsapp_groups
) k
  ON k.canon = du.canon
 AND k.rn = 1
WHERE du.rn > 1
  AND d.is_resolved = false
  AND (
    d.notify_whatsapp_group_id = du.group_id
    OR d.notify_whatsapp_group_id = du.canon
    OR d.notify_whatsapp_group_id = du.canon || '@g.us'
  );

-- Point pending DODAs still on the keeper's non-canonical form to canon.
UPDATE dodas d
SET notify_whatsapp_group_id = k.canon
FROM (
  SELECT
    id,
    group_id,
    regexp_replace(group_id, '@g\.us$', '', 'i') AS canon,
    ROW_NUMBER() OVER (
      PARTITION BY regexp_replace(group_id, '@g\.us$', '', 'i')
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS rn
  FROM whatsapp_groups
) k
WHERE k.rn = 1
  AND d.is_resolved = false
  AND d.notify_whatsapp_group_id IS NOT NULL
  AND d.notify_whatsapp_group_id = k.group_id
  AND k.group_id IS DISTINCT FROM k.canon;

-- d) Remove duplicate catalog rows (keeper = oldest).
DELETE FROM whatsapp_groups wg
WHERE wg.id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY regexp_replace(group_id, '@g\.us$', '', 'i')
        ORDER BY created_at ASC NULLS LAST, id ASC
      ) AS rn
    FROM whatsapp_groups
  ) ranked
  WHERE ranked.rn > 1
);

-- a) Normalize remaining catalog ids to digits-only.
UPDATE whatsapp_groups
SET group_id = regexp_replace(group_id, '@g\.us$', '', 'i')
WHERE group_id ~* '@g\.us$';

-- e) Normalize pending DODA notify targets to digits-only.
UPDATE dodas
SET notify_whatsapp_group_id = regexp_replace(
  notify_whatsapp_group_id,
  '@g\.us$',
  '',
  'i'
)
WHERE is_resolved = false
  AND notify_whatsapp_group_id IS NOT NULL
  AND notify_whatsapp_group_id ~* '@g\.us$';

-- Unique index on the normalized form (blocks digits vs digits@g.us collisions).
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_groups_group_id_normalized_uidx
  ON whatsapp_groups ((regexp_replace(group_id, '@g\.us$', '', 'i')));

COMMIT;

-- Move current CMS pages from /chuyen-trang/<slug> to /<slug> while keeping
-- the old URL as a permanent redirect. Colliding root routes remain untouched.
WITH candidates AS (
  SELECT
    old_route.id AS old_route_id,
    old_route.content_id,
    '/' || node.slug_source AS target_path
  FROM public_routes AS old_route
  JOIN content_nodes AS node ON node.id = old_route.content_id
  WHERE node.kind = 'page'
    AND node.slug_source ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    AND old_route.is_current = TRUE
    AND old_route.path = '/chuyen-trang/' || node.slug_source
), available AS (
  SELECT candidate.*
  FROM candidates AS candidate
  WHERE NOT EXISTS (
    SELECT 1
    FROM public_routes AS existing
    WHERE existing.path = candidate.target_path
      AND existing.content_id <> candidate.content_id
  )
), retired AS (
  UPDATE public_routes AS old_route
  SET is_current = FALSE,
      redirect_status = 308
  FROM available
  WHERE old_route.id = available.old_route_id
  RETURNING old_route.content_id
)
INSERT INTO public_routes (id, content_id, path, is_current, redirect_status, created_at)
SELECT gen_random_uuid(), retired.content_id, '/' || node.slug_source, TRUE, 301, NOW()
FROM retired
JOIN content_nodes AS node ON node.id = retired.content_id
ON CONFLICT (path) DO UPDATE
SET is_current = TRUE,
    redirect_status = 301
WHERE public_routes.content_id = EXCLUDED.content_id;

-- The initial root-route migration must not let a static CMS page claim a
-- Next.js/API/system path, even when that path has no PublicRoute row yet.
-- Restore the old section path when it is available; otherwise leave the page
-- non-current rather than shadowing a system route or another content node.
WITH reserved_roots AS MATERIALIZED (
  SELECT
    root.id AS root_route_id,
    node.id AS content_id,
    node.slug_source,
    '/chuyen-trang/' || node.slug_source AS section_path
  FROM content_nodes AS node
  JOIN public_routes AS root
    ON root.content_id = node.id
   AND root.is_current = TRUE
   AND root.path = '/' || node.slug_source
  WHERE node.kind = 'page'
    AND node.slug_source = ANY (ARRAY[
      'admin', 'api', 'media', '_next', 'static', 'robots', 'sitemap', 'favicon', 'icon',
      'apple-icon', 'opengraph-image', 'twitter-image', 'manifest', 'phong-nghi',
      'combo-du-lich', 'diem-den', 'bai-viet', 'chuyen-trang', 'dat-phong', 'lien-he',
      'tai-khoan', 'tra-cuu'
    ]::text[])
),
available_targets AS MATERIALIZED (
  SELECT reserved.*
  FROM reserved_roots AS reserved
  WHERE NOT EXISTS (
    SELECT 1
    FROM public_routes AS occupied
    WHERE occupied.path = reserved.section_path
      AND occupied.content_id <> reserved.content_id
  )
),
demoted AS (
  UPDATE public_routes AS root
  SET is_current = FALSE,
      redirect_status = 308
  FROM reserved_roots AS reserved
  WHERE root.id = reserved.root_route_id
  RETURNING root.content_id
),
restored AS (
  UPDATE public_routes AS section
  SET is_current = TRUE,
      redirect_status = 301
  FROM available_targets AS available
  JOIN demoted ON demoted.content_id = available.content_id
  WHERE section.path = available.section_path
    AND section.content_id = available.content_id
  RETURNING section.content_id
),
inserted AS (
  INSERT INTO public_routes (id, content_id, path, is_current, redirect_status, created_at)
  SELECT gen_random_uuid(), available.content_id, available.section_path, TRUE, 301, NOW()
  FROM available_targets AS available
  JOIN demoted ON demoted.content_id = available.content_id
  WHERE NOT EXISTS (
    SELECT 1
    FROM public_routes AS existing
    WHERE existing.path = available.section_path
  )
  RETURNING content_id
)
SELECT COUNT(*) FROM demoted;

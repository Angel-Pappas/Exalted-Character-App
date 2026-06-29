-- Drops the legacy ability and sort_order columns from charm_library now that
-- charm_abilities (many-to-many) and page-based table ordering have replaced them.
-- Already applied via Supabase MCP; kept here for the record.

alter table public.charm_library drop column if exists ability;
alter table public.charm_library drop column if exists sort_order;

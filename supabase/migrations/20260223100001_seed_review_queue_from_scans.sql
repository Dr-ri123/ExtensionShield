-- Seed extension_review_queue from existing scan_results (real scanned extensions).
-- Inserts one queue item per completed scan; severity from risk_level.
insert into public.extension_review_queue (extension_id, finding_type, severity, status)
select
  extension_id,
  'Security scan',
  case
    when lower(coalesce(risk_level, '')) in ('high', 'critical') then 'high'
    when lower(coalesce(risk_level, '')) = 'low' then 'low'
    else 'medium'
  end,
  'open'
from public.scan_results
where status = 'completed'
  and extension_id is not null
  and not exists (
    select 1 from public.extension_review_queue q where q.extension_id = scan_results.extension_id
  )
order by scanned_at desc
limit 50;

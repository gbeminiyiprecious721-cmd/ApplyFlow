-- The existing onboarding accepts TXT CVs; keep private storage consistent.
-- Preserve every existing allowed type and the bucket's private visibility.
update storage.buckets
set allowed_mime_types=array_append(allowed_mime_types,'text/plain')
where id='resumes' and allowed_mime_types is not null
and not ('text/plain'=any(allowed_mime_types));

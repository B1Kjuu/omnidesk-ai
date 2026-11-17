create policy "organization admins can update knowledge chunks"
on public.knowledge_chunks for update
to authenticated
using ((select public.is_organization_admin(organization_id)))
with check ((select public.is_organization_admin(organization_id)));

create policy "organization admins can delete knowledge chunks"
on public.knowledge_chunks for delete
to authenticated
using ((select public.is_organization_admin(organization_id)));

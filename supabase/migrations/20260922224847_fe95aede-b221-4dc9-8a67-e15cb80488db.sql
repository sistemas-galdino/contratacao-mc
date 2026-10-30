
REVOKE ALL ON FUNCTION public.is_company_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.bootstrap_current_user(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_company_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.bootstrap_current_user(text) TO authenticated;
REVOKE ALL ON FUNCTION public.apply_to_job(uuid,text,text,text,text,text,text,boolean,text,text,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_to_job(uuid,text,text,text,text,text,text,boolean,text,text,text,text,jsonb) TO anon, authenticated;

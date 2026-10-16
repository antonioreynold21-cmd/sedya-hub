BEGIN;
CREATE TEMP TABLE r(k text, v text) ON COMMIT DROP;
GRANT ALL ON r TO authenticated, anon;
INSERT INTO auth.users(id,email,email_confirmed_at,aud,role) VALUES
 ('00000000-0000-0000-0000-0000000000d1','baru@uji.test',now(),'authenticated','authenticated'),
 ('00000000-0000-0000-0000-0000000000d2','lain@uji.test',now(),'authenticated','authenticated'),
 ('00000000-0000-0000-0000-0000000000d3','belum@uji.test',NULL,'authenticated','authenticated');
INSERT INTO public.tenants(id,slug,name) VALUES('00000000-0000-0000-0000-0000000000b1','uji-b','Uji B');
INSERT INTO public.tenant_settings(tenant_id) VALUES('00000000-0000-0000-0000-0000000000b1');
DO $$ DECLARE t text; t2 text; t3 text; tid uuid; c int; BEGIN
 PERFORM set_config('request.jwt.claims','{"sub":"a1bd9a05-f70a-4a07-929b-c4c4dba914be","role":"authenticated","email":"x"}',true);
 SET LOCAL ROLE authenticated;
 t:=public.create_tenant_invitation('Baru@Uji.test','staff',ARRAY['crm','finance'])->>'token';
 t2:=public.create_tenant_invitation('belum@uji.test','staff','{}')->>'token';
 t3:=public.create_tenant_invitation('exp@uji.test','staff','{}')->>'token';
 INSERT INTO r VALUES('preview',public.preview_tenant_invitation(t)::text);
 BEGIN PERFORM public.preview_tenant_invitation('salah'); INSERT INTO r VALUES('token salah','LOLOS'); EXCEPTION WHEN others THEN INSERT INTO r VALUES('token salah ditolak',SQLERRM); END;
 RESET ROLE;
 UPDATE public.tenant_invitations SET expires_at=now()-interval '1 minute' WHERE email='exp@uji.test';
 -- Master tenant lain tidak bisa mencabut
 UPDATE public.profiles SET active_tenant_id=NULL WHERE id='00000000-0000-0000-0000-0000000000d2';
 PERFORM set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated","email":"lain@uji.test"}',true);
 SET LOCAL ROLE authenticated;
 BEGIN PERFORM public.revoke_tenant_invitation((SELECT id FROM public.tenant_invitations WHERE email='belum@uji.test')); INSERT INTO r VALUES('cabut lintas','LOLOS'); EXCEPTION WHEN others THEN INSERT INTO r VALUES('cabut tanpa Master ditolak',SQLERRM); END;
 BEGIN PERFORM public.create_tenant_invitation('z@uji.test','staff','{}'); INSERT INTO r VALUES('buat non-master','LOLOS'); EXCEPTION WHEN others THEN INSERT INTO r VALUES('buat non-Master ditolak',SQLERRM); END;
 BEGIN PERFORM public.accept_tenant_invitation(t); INSERT INTO r VALUES('email beda','LOLOS'); EXCEPTION WHEN others THEN INSERT INTO r VALUES('email berbeda ditolak',SQLERRM); END;
 BEGIN PERFORM public.accept_tenant_invitation(t3); INSERT INTO r VALUES('kedaluwarsa','LOLOS'); EXCEPTION WHEN others THEN INSERT INTO r VALUES('kedaluwarsa ditolak',SQLERRM); END;
 RESET ROLE;
 PERFORM set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000d3","role":"authenticated","email":"belum@uji.test"}',true);
 SET LOCAL ROLE authenticated;
 BEGIN PERFORM public.accept_tenant_invitation(t2); INSERT INTO r VALUES('belum konfirmasi','LOLOS'); EXCEPTION WHEN others THEN INSERT INTO r VALUES('email belum terkonfirmasi ditolak',SQLERRM); END;
 RESET ROLE;
 PERFORM set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated","email":"baru@uji.test"}',true);
 SET LOCAL ROLE authenticated;
 tid:=public.accept_tenant_invitation(t); tid:=public.accept_tenant_invitation(t);
 INSERT INTO r VALUES('bootstrap',(public.bootstrap_current_user()-'tenants')::text);
 RESET ROLE;
 SELECT count(*) INTO c FROM public.tenant_memberships WHERE user_id='00000000-0000-0000-0000-0000000000d1';
 INSERT INTO r VALUES('membership (harus 1)',c::text);
 SELECT count(*) INTO c FROM public.module_access WHERE user_id='00000000-0000-0000-0000-0000000000d1';
 INSERT INTO r VALUES('modul (harus 2)',c::text);
 PERFORM set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated","email":"lain@uji.test"}',true);
 SET LOCAL ROLE authenticated;
 BEGIN PERFORM public.accept_tenant_invitation(t); INSERT INTO r VALUES('dipakai ulang','LOLOS'); EXCEPTION WHEN others THEN INSERT INTO r VALUES('token terpakai ditolak',SQLERRM); END;
 INSERT INTO r SELECT 'baca undangan non-Master', count(*)::text FROM public.tenant_invitations;
 RESET ROLE;
END $$;
DO $$ BEGIN RAISE EXCEPTION 'HASIL: %', (SELECT string_agg(k||' => '||v, E'\n') FROM r); END $$;
ROLLBACK;

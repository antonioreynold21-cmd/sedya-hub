ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_chat_id bigint;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_telegram_chat_id_uq ON public.profiles(telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;
CREATE OR REPLACE FUNCTION public.guard_telegram_chat_id() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.telegram_chat_id IS DISTINCT FROM OLD.telegram_chat_id AND current_user IN ('authenticated','anon') THEN
  RAISE EXCEPTION 'telegram_chat_id hanya dapat diubah lewat fungsi sistem';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS profiles_guard_telegram ON public.profiles;
CREATE TRIGGER profiles_guard_telegram BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.guard_telegram_chat_id();

CREATE TABLE public.telegram_link_tokens(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 user_id uuid NOT NULL,
 token_hash text NOT NULL UNIQUE,
 expires_at timestamptz NOT NULL DEFAULT now()+interval '15 minutes',
 used_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.telegram_link_tokens TO service_role;
ALTER TABLE public.telegram_link_tokens ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tenant_settings ADD COLUMN IF NOT EXISTS belanja_jam_batas time NOT NULL DEFAULT '15:00',
 ADD COLUMN IF NOT EXISTS telegram_kurir_chat_id bigint,
 ADD COLUMN IF NOT EXISTS telegram_bot_username text CHECK (telegram_bot_username IS NULL OR telegram_bot_username ~ '^[A-Za-z0-9_]{5,32}$');
ALTER TABLE public.daftar_belanja ADD COLUMN IF NOT EXISTS pic_notified_at timestamptz;

CREATE OR REPLACE FUNCTION public.create_telegram_link_token() RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t uuid:=public.active_tenant_id(); tok text;
BEGIN
 IF auth.uid() IS NULL OR t IS NULL OR NOT public.can_access_tenant_module(t,'pembelanjaan') THEN RAISE EXCEPTION 'Tidak berizin'; END IF;
 UPDATE telegram_link_tokens SET expires_at=now() WHERE user_id=auth.uid() AND used_at IS NULL AND expires_at>now();
 tok:=encode(extensions.gen_random_bytes(24),'hex');
 INSERT INTO telegram_link_tokens(tenant_id,user_id,token_hash) VALUES(t,auth.uid(),encode(extensions.digest(tok,'sha256'),'hex'));
 RETURN tok;
END $$;

CREATE OR REPLACE FUNCTION public.get_my_telegram_status() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('terhubung',coalesce((SELECT telegram_chat_id IS NOT NULL FROM profiles WHERE id=auth.uid()),false)) $$;

CREATE OR REPLACE FUNCTION public.disconnect_telegram() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Tidak berizin'; END IF;
 UPDATE profiles SET telegram_chat_id=NULL WHERE id=auth.uid(); END $$;

CREATE OR REPLACE FUNCTION public.get_belanja_settings() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE t uuid:=public.active_tenant_id(); r jsonb;
BEGIN
 IF t IS NULL OR NOT public.can_access_tenant_module(t,'pembelanjaan') THEN RAISE EXCEPTION 'Tidak berizin'; END IF;
 SELECT jsonb_build_object('jam_batas',belanja_jam_batas,'kurir_chat_id',telegram_kurir_chat_id,'bot_username',telegram_bot_username) INTO r FROM tenant_settings WHERE tenant_id=t;
 RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.set_belanja_settings(p_jam_batas time, p_kurir_chat_id bigint, p_bot_username text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t uuid:=public.active_tenant_id(); u text:=nullif(btrim(ltrim(coalesce(p_bot_username,''),'@')),'');
BEGIN
 IF t IS NULL OR NOT public.has_tenant_role(t,'master') THEN RAISE EXCEPTION 'Hanya Master yang dapat mengubah pengaturan'; END IF;
 IF u IS NOT NULL AND u !~ '^[A-Za-z0-9_]{5,32}$' THEN RAISE EXCEPTION 'Username bot tidak valid'; END IF;
 UPDATE tenant_settings SET belanja_jam_batas=coalesce(p_jam_batas,'15:00'), telegram_kurir_chat_id=p_kurir_chat_id, telegram_bot_username=u WHERE tenant_id=t;
END $$;

CREATE OR REPLACE FUNCTION public.bridge_link_telegram(p_token text, p_chat_id bigint) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE k telegram_link_tokens%ROWTYPE; nm text;
BEGIN
 SELECT * INTO k FROM telegram_link_tokens WHERE token_hash=encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex') AND used_at IS NULL AND expires_at>now() FOR UPDATE;
 IF k.id IS NULL THEN RETURN jsonb_build_object('ok',false,'message','Kode tidak valid atau kedaluwarsa'); END IF;
 IF EXISTS(SELECT 1 FROM profiles WHERE telegram_chat_id=p_chat_id AND id<>k.user_id) THEN RETURN jsonb_build_object('ok',false,'message','Akun Telegram ini sudah terhubung ke pengguna lain'); END IF;
 IF NOT EXISTS(SELECT 1 FROM tenant_memberships WHERE tenant_id=k.tenant_id AND user_id=k.user_id AND status='active')
    OR NOT (EXISTS(SELECT 1 FROM user_roles WHERE tenant_id=k.tenant_id AND user_id=k.user_id AND role='master')
            OR EXISTS(SELECT 1 FROM module_access WHERE tenant_id=k.tenant_id AND user_id=k.user_id AND module='pembelanjaan')) THEN
  RETURN jsonb_build_object('ok',false,'message','Akun tidak punya akses Pembelanjaan'); END IF;
 UPDATE profiles SET telegram_chat_id=p_chat_id WHERE id=k.user_id RETURNING coalesce(full_name,email) INTO nm;
 UPDATE telegram_link_tokens SET used_at=now() WHERE id=k.id;
 RETURN jsonb_build_object('ok',true,'message','Telegram berhasil terhubung','nama',nm);
END $$;

CREATE OR REPLACE FUNCTION public.bridge_set_item_status(p_tenant uuid, p_chat_id bigint, p_item_id uuid, p_status text, p_qty_dibeli numeric DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid; r jsonb;
BEGIN
 SELECT p.id INTO u FROM profiles p JOIN tenant_memberships m ON m.user_id=p.id AND m.tenant_id=p_tenant AND m.status='active' WHERE p.telegram_chat_id=p_chat_id;
 IF u IS NULL THEN RETURN jsonb_build_object('ok',false,'message','Akun Telegram belum terhubung','semua_selesai',false); END IF;
 IF NOT EXISTS(SELECT 1 FROM daftar_belanja_item WHERE id=p_item_id AND tenant_id=p_tenant) THEN RETURN jsonb_build_object('ok',false,'message','Item tidak ditemukan','semua_selesai',false); END IF;
 PERFORM set_config('request.jwt.claims',json_build_object('sub',u,'role','authenticated')::text,true);
 IF public.active_tenant_id() IS DISTINCT FROM p_tenant THEN RETURN jsonb_build_object('ok',false,'message','Bisnis aktif akun berbeda','semua_selesai',false); END IF;
 BEGIN
  r:=public.set_item_status(p_item_id,p_status,p_qty_dibeli,'telegram');
 EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('ok',false,'message',SQLERRM,'semua_selesai',false); END;
 RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.bridge_list_notifikasi_pic(p_tenant uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT coalesce(jsonb_agg(x ORDER BY x->>'tanggal_kirim'),'[]') FROM (
  SELECT jsonb_build_object('daftar_id',d.id,'tanggal_kirim',d.tanggal_kirim,
   'penerima',(SELECT coalesce(jsonb_agg(jsonb_build_object('chat_id',p.telegram_chat_id,'nama',coalesce(p.full_name,p.email),'vendor_id',v.id,'vendor_nama',v.nama,
      'items',(SELECT jsonb_agg(jsonb_build_object('item_id',i.id,'item_name',i.item_name,'qty',i.qty,'unit',i.unit,'customer_nama',i.customer_nama,'outlet_nama',i.outlet_nama,'section_nama',i.section_nama) ORDER BY i.item_name)
        FROM daftar_belanja_item i WHERE i.daftar_id=d.id AND i.tenant_id=p_tenant AND i.vendor_id=v.id AND i.deleted_at IS NULL AND i.status_item='belum_dibeli')) ORDER BY v.nama,p.id),'[]')
     FROM vendors v JOIN vendor_pic vp ON vp.vendor_id=v.id AND vp.tenant_id=p_tenant JOIN profiles p ON p.id=vp.user_id AND p.telegram_chat_id IS NOT NULL
     WHERE v.tenant_id=p_tenant AND EXISTS(SELECT 1 FROM daftar_belanja_item i WHERE i.daftar_id=d.id AND i.tenant_id=p_tenant AND i.vendor_id=v.id AND i.deleted_at IS NULL AND i.status_item='belum_dibeli')),
   'vendor_tanpa_pic',(SELECT coalesce(jsonb_agg(jsonb_build_object('vendor_nama',v.nama,'jumlah_item',c) ORDER BY v.nama),'[]') FROM (SELECT i.vendor_id,count(*) c FROM daftar_belanja_item i WHERE i.daftar_id=d.id AND i.tenant_id=p_tenant AND i.deleted_at IS NULL AND i.status_item='belum_dibeli' AND i.vendor_id IS NOT NULL GROUP BY 1) g JOIN vendors v ON v.id=g.vendor_id
     WHERE NOT EXISTS(SELECT 1 FROM vendor_pic vp JOIN profiles p ON p.id=vp.user_id AND p.telegram_chat_id IS NOT NULL WHERE vp.vendor_id=v.id AND vp.tenant_id=p_tenant)),
   'item_tanpa_vendor',(SELECT count(*)::int FROM daftar_belanja_item i WHERE i.daftar_id=d.id AND i.tenant_id=p_tenant AND i.deleted_at IS NULL AND i.status_item='belum_dibeli' AND i.vendor_id IS NULL)) x
  FROM daftar_belanja d WHERE d.tenant_id=p_tenant AND d.deleted_at IS NULL AND d.status='terkirim' AND d.pic_notified_at IS NULL ORDER BY d.tanggal_kirim LIMIT 20) s $$;

CREATE OR REPLACE FUNCTION public.bridge_mark_pic_notified(p_tenant uuid, p_daftar_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM daftar_belanja WHERE id=p_daftar_id AND tenant_id=p_tenant) THEN RETURN jsonb_build_object('ok',false,'message','Daftar tidak ditemukan'); END IF;
 UPDATE daftar_belanja SET pic_notified_at=now() WHERE id=p_daftar_id AND tenant_id=p_tenant AND pic_notified_at IS NULL;
 RETURN jsonb_build_object('ok',true,'message','OK');
END $$;

CREATE OR REPLACE FUNCTION public.bridge_list_ringkasan_kurir(p_tenant uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 WITH k AS (SELECT telegram_kurir_chat_id c FROM tenant_settings WHERE tenant_id=p_tenant)
 SELECT jsonb_build_object('kurir_chat_id',(SELECT c FROM k),'daftar',CASE WHEN (SELECT c FROM k) IS NULL THEN '[]'::jsonb ELSE coalesce((
  SELECT jsonb_agg(jsonb_build_object('daftar_id',d.id,'tanggal_kirim',d.tanggal_kirim,'customer',(
    SELECT jsonb_agg(jsonb_build_object('customer_nama',cu.cn,'outlet',(
      SELECT jsonb_agg(jsonb_build_object('outlet_nama',ou.onm,'items',(
        SELECT jsonb_agg(jsonb_build_object('item_name',i.item_name,'qty',i.qty,'unit',i.unit,'vendor_nama',v.nama,'status_item',i.status_item,'qty_dibeli',i.qty_dibeli) ORDER BY i.item_name)
        FROM daftar_belanja_item i LEFT JOIN vendors v ON v.id=i.vendor_id WHERE i.daftar_id=d.id AND i.tenant_id=p_tenant AND i.deleted_at IS NULL AND i.customer_nama IS NOT DISTINCT FROM cu.cn AND i.outlet_nama IS NOT DISTINCT FROM ou.onm)) ORDER BY ou.onm NULLS LAST)
      FROM (SELECT DISTINCT outlet_nama onm FROM daftar_belanja_item WHERE daftar_id=d.id AND tenant_id=p_tenant AND deleted_at IS NULL AND customer_nama IS NOT DISTINCT FROM cu.cn) ou)) ORDER BY cu.cn NULLS LAST)
    FROM (SELECT DISTINCT customer_nama cn FROM daftar_belanja_item WHERE daftar_id=d.id AND tenant_id=p_tenant AND deleted_at IS NULL) cu)) ORDER BY d.tanggal_kirim)
  FROM daftar_belanja d WHERE d.tenant_id=p_tenant AND d.deleted_at IS NULL AND d.status='terkirim' AND d.ringkasan_terkirim_at IS NULL
   AND EXISTS(SELECT 1 FROM daftar_belanja_item i WHERE i.daftar_id=d.id AND i.tenant_id=p_tenant AND i.deleted_at IS NULL)
   AND NOT EXISTS(SELECT 1 FROM daftar_belanja_item i WHERE i.daftar_id=d.id AND i.tenant_id=p_tenant AND i.deleted_at IS NULL AND i.status_item='belum_dibeli')),'[]') END) $$;

CREATE OR REPLACE FUNCTION public.bridge_mark_ringkasan_terkirim(p_tenant uuid, p_daftar_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM daftar_belanja WHERE id=p_daftar_id AND tenant_id=p_tenant) THEN RETURN jsonb_build_object('ok',false,'message','Daftar tidak ditemukan'); END IF;
 UPDATE daftar_belanja SET ringkasan_terkirim_at=now() WHERE id=p_daftar_id AND tenant_id=p_tenant AND ringkasan_terkirim_at IS NULL;
 UPDATE daftar_belanja d SET status='selesai' WHERE d.id=p_daftar_id AND d.tenant_id=p_tenant AND d.status='terkirim'
  AND NOT EXISTS(SELECT 1 FROM daftar_belanja_item i WHERE i.daftar_id=d.id AND i.deleted_at IS NULL AND i.status_item='belum_dibeli');
 RETURN jsonb_build_object('ok',true,'message','OK');
END $$;

CREATE OR REPLACE FUNCTION public.bridge_list_pengingat(p_tenant uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 WITH it AS (SELECT i.* FROM daftar_belanja_item i JOIN daftar_belanja d ON d.id=i.daftar_id AND d.tenant_id=p_tenant AND d.deleted_at IS NULL AND d.status='terkirim'
   WHERE i.tenant_id=p_tenant AND i.deleted_at IS NULL AND i.status_item='belum_dibeli')
 SELECT jsonb_build_object(
  'jam_batas',(SELECT belanja_jam_batas FROM tenant_settings WHERE tenant_id=p_tenant),
  'master_chat_ids',(SELECT coalesce(jsonb_agg(DISTINCT p.telegram_chat_id),'[]') FROM user_roles r JOIN tenant_memberships m ON m.user_id=r.user_id AND m.tenant_id=p_tenant AND m.status='active' JOIN profiles p ON p.id=r.user_id AND p.telegram_chat_id IS NOT NULL WHERE r.tenant_id=p_tenant AND r.role='master'),
  'penerima',(SELECT coalesce(jsonb_agg(jsonb_build_object('chat_id',p.telegram_chat_id,'nama',coalesce(p.full_name,p.email),'items',(
     SELECT jsonb_agg(jsonb_build_object('item_id',it.id,'item_name',it.item_name,'qty',it.qty,'unit',it.unit,'vendor_nama',v.nama) ORDER BY v.nama,it.item_name)
     FROM it JOIN vendors v ON v.id=it.vendor_id JOIN vendor_pic vp ON vp.vendor_id=it.vendor_id AND vp.tenant_id=p_tenant AND vp.user_id=p.id))),'[]')
    FROM profiles p WHERE p.telegram_chat_id IS NOT NULL AND EXISTS(SELECT 1 FROM it JOIN vendor_pic vp ON vp.vendor_id=it.vendor_id AND vp.tenant_id=p_tenant WHERE vp.user_id=p.id)),
  'total_belum',(SELECT count(*)::int FROM it)) $$;

REVOKE ALL ON FUNCTION public.bridge_link_telegram(text,bigint), public.bridge_set_item_status(uuid,bigint,uuid,text,numeric), public.bridge_list_notifikasi_pic(uuid), public.bridge_mark_pic_notified(uuid,uuid), public.bridge_list_ringkasan_kurir(uuid), public.bridge_mark_ringkasan_terkirim(uuid,uuid), public.bridge_list_pengingat(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bridge_link_telegram(text,bigint), public.bridge_set_item_status(uuid,bigint,uuid,text,numeric), public.bridge_list_notifikasi_pic(uuid), public.bridge_mark_pic_notified(uuid,uuid), public.bridge_list_ringkasan_kurir(uuid), public.bridge_mark_ringkasan_terkirim(uuid,uuid), public.bridge_list_pengingat(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.create_telegram_link_token(), public.get_my_telegram_status(), public.disconnect_telegram(), public.get_belanja_settings(), public.set_belanja_settings(time,bigint,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_telegram_link_token(), public.get_my_telegram_status(), public.disconnect_telegram(), public.get_belanja_settings(), public.set_belanja_settings(time,bigint,text) TO authenticated, service_role;
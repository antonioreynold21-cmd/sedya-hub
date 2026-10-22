BEGIN;
CREATE TEMP TABLE purchasing_results(test text, result text) ON COMMIT DROP;
GRANT ALL ON purchasing_results TO authenticated, anon;
INSERT INTO public.tenants(id,slug,name) VALUES
 ('10000000-0000-0000-0000-000000000001','zz-purchasing-a','ZZ Uji Pembelanjaan A'),
 ('10000000-0000-0000-0000-000000000002','zz-purchasing-b','ZZ Uji Pembelanjaan B');
INSERT INTO public.profiles(id,email,active_tenant_id) VALUES
 ('20000000-0000-0000-0000-000000000001','zz-master-a@uji.test','10000000-0000-0000-0000-000000000001'),
 ('20000000-0000-0000-0000-000000000002','zz-staff-a@uji.test','10000000-0000-0000-0000-000000000001'),
 ('20000000-0000-0000-0000-000000000003','zz-staff-no@uji.test','10000000-0000-0000-0000-000000000001'),
 ('20000000-0000-0000-0000-000000000004','zz-master-b@uji.test','10000000-0000-0000-0000-000000000002');
INSERT INTO public.tenant_memberships(tenant_id,user_id,status) VALUES
 ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','active'),
 ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','active'),
 ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000003','active'),
 ('10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000004','active');
INSERT INTO public.user_roles(tenant_id,user_id,role) VALUES
 ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','master'),
 ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','staff'),
 ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000003','staff'),
 ('10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000004','master');
INSERT INTO public.module_access(tenant_id,user_id,module) VALUES
 ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','pembelanjaan');
INSERT INTO public.pricelist_items(id,tenant_id,name,category,unit,price) VALUES
 ('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','ZZ Item','Uji','kg',1000);
DO $$
DECLARE n int; rejected boolean;
BEGIN
 PERFORM set_config('request.jwt.claims','{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
 SET LOCAL ROLE authenticated;
 IF current_user<>'authenticated' THEN RAISE EXCEPTION 'Uji bukan authenticated'; END IF;
 INSERT INTO public.vendors(id,nama) VALUES('40000000-0000-0000-0000-000000000001','ZZ Vendor'),('40000000-0000-0000-0000-000000000002','ZZ Cadangan');
 UPDATE public.vendors SET kontak='Kontak uji',aktif=false WHERE id='40000000-0000-0000-0000-000000000001';
 SELECT count(*) INTO n FROM public.vendors WHERE id='40000000-0000-0000-0000-000000000001' AND NOT aktif AND kontak='Kontak uji';
 IF n<>1 THEN RAISE EXCEPTION 'Master gagal mengubah'; END IF;
 INSERT INTO purchasing_results VALUES('Master tambah/ubah/nonaktifkan','PASS');
 rejected:=false; BEGIN INSERT INTO public.vendors(nama) VALUES('  zz VENDOR  '); EXCEPTION WHEN unique_violation THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Duplikat nama lolos'; END IF;
 INSERT INTO purchasing_results VALUES('Nama vendor unik normalisasi, termasuk nonaktif','PASS');
 rejected:=false; BEGIN INSERT INTO public.item_vendor_default(item_id,vendor_utama_id,vendor_cadangan_id) VALUES('30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001'); EXCEPTION WHEN check_violation THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Vendor utama=cadangan lolos'; END IF;
 INSERT INTO purchasing_results VALUES('Vendor utama dan cadangan berbeda','PASS');
 INSERT INTO public.item_vendor_default(item_id,vendor_utama_id,vendor_cadangan_id) VALUES('30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000002');
 INSERT INTO public.vendor_pic(vendor_id,user_id,pic_utama) VALUES('40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',true);
 rejected:=false; BEGIN INSERT INTO public.vendor_pic(vendor_id,user_id,pic_utama) VALUES('40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002',true); EXCEPTION WHEN unique_violation THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'PIC utama kedua lolos'; END IF;
 INSERT INTO purchasing_results VALUES('Maksimal satu PIC utama','PASS');
 rejected:=false; BEGIN INSERT INTO public.vendor_pic(vendor_id,user_id) VALUES('40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000004'); EXCEPTION WHEN raise_exception THEN IF SQLERRM='PIC harus anggota aktif bisnis yang sama' THEN rejected:=true; ELSE RAISE; END IF; END;
 IF NOT rejected THEN RAISE EXCEPTION 'PIC non-anggota lolos'; END IF;
 INSERT INTO purchasing_results VALUES('PIC non-anggota ditolak','PASS');
 rejected:=false; BEGIN UPDATE public.vendors SET tenant_id='10000000-0000-0000-0000-000000000002' WHERE id='40000000-0000-0000-0000-000000000001'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='tenant_id tidak boleh diubah' THEN rejected:=true; ELSE RAISE; END IF; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Ubah tenant lolos'; END IF;
 INSERT INTO purchasing_results VALUES('tenant_id tidak dapat diubah','PASS');
 rejected:=false; BEGIN DELETE FROM public.vendors WHERE id='40000000-0000-0000-0000-000000000001'; EXCEPTION WHEN insufficient_privilege THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Hapus permanen lolos'; END IF;
 INSERT INTO purchasing_results VALUES('Vendor tidak dapat dihapus permanen','PASS');
 PERFORM public.admin_set_modules('20000000-0000-0000-0000-000000000002',ARRAY['pembelanjaan']);
 IF NOT EXISTS(SELECT 1 FROM public.module_access WHERE user_id='20000000-0000-0000-0000-000000000002' AND module='pembelanjaan') THEN RAISE EXCEPTION 'Whitelist gagal'; END IF;
 INSERT INTO purchasing_results VALUES('Pengaturan akses menerima modul baru','PASS');
 PERFORM public.create_tenant_invitation('zz-new-purchasing@uji.test','staff',ARRAY['pembelanjaan']);
 INSERT INTO purchasing_results VALUES('Undangan menerima modul baru','PASS');
 PERFORM set_config('request.jwt.claims','{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
 SELECT count(*) INTO n FROM public.vendors;
 IF n<>2 OR (SELECT count(*) FROM public.item_vendor_default)<>1 OR (SELECT count(*) FROM public.vendor_pic)<>1 THEN RAISE EXCEPTION 'Staff gagal baca'; END IF;
 rejected:=false; BEGIN INSERT INTO public.vendors(nama) VALUES('ZZ Staff'); EXCEPTION WHEN insufficient_privilege THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Staff insert lolos'; END IF;
 UPDATE public.vendors SET nama='ZZ Staff' WHERE id='40000000-0000-0000-0000-000000000001'; GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>0 THEN RAISE EXCEPTION 'Staff update lolos'; END IF;
 rejected:=false; BEGIN INSERT INTO public.vendor_pic(vendor_id,user_id) VALUES('40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002'); EXCEPTION WHEN insufficient_privilege THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Staff PIC insert lolos'; END IF;
 DELETE FROM public.item_vendor_default; GET DIAGNOSTICS n=ROW_COUNT; IF n<>0 THEN RAISE EXCEPTION 'Staff delete assignment lolos'; END IF;
 INSERT INTO purchasing_results VALUES('Staff dengan modul baca, tidak bisa tulis','PASS');
 PERFORM set_config('request.jwt.claims','{"sub":"20000000-0000-0000-0000-000000000003","role":"authenticated"}',true);
 IF (SELECT count(*) FROM public.vendors)<>0 OR (SELECT count(*) FROM public.item_vendor_default)<>0 OR (SELECT count(*) FROM public.vendor_pic)<>0 THEN RAISE EXCEPTION 'Staff tanpa modul bisa baca'; END IF;
 INSERT INTO purchasing_results VALUES('Staff tanpa modul tidak bisa baca tiga tabel','PASS');
 PERFORM set_config('request.jwt.claims','{"sub":"20000000-0000-0000-0000-000000000004","role":"authenticated"}',true);
 IF (SELECT count(*) FROM public.vendors)<>0 OR (SELECT count(*) FROM public.item_vendor_default)<>0 OR (SELECT count(*) FROM public.vendor_pic)<>0 THEN RAISE EXCEPTION 'Lintas tenant bisa baca'; END IF;
 UPDATE public.vendors SET nama='ZZ Tenant B' WHERE id='40000000-0000-0000-0000-000000000001'; GET DIAGNOSTICS n=ROW_COUNT; IF n<>0 THEN RAISE EXCEPTION 'Lintas update lolos'; END IF;
 rejected:=false; BEGIN INSERT INTO public.vendors(tenant_id,nama) VALUES('10000000-0000-0000-0000-000000000001','ZZ Tenant B'); EXCEPTION WHEN others THEN IF SQLERRM='Tenant tidak berizin' OR SQLSTATE='42501' THEN rejected:=true; ELSE RAISE; END IF; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Lintas insert lolos'; END IF;
 INSERT INTO public.vendors(id,nama) VALUES('40000000-0000-0000-0000-000000000003','ZZ B');
 rejected:=false; BEGIN INSERT INTO public.item_vendor_default(item_id,vendor_utama_id) VALUES('30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000003'); EXCEPTION WHEN foreign_key_violation THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'FK lintas tenant lolos'; END IF;
 INSERT INTO purchasing_results VALUES('Tenant lain baca/tulis ditolak dan FK gabungan','PASS');
 PERFORM set_config('request.jwt.claims','{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
 DELETE FROM public.vendor_pic; GET DIAGNOSTICS n=ROW_COUNT; IF n<>1 THEN RAISE EXCEPTION 'Master tidak bisa hapus PIC'; END IF;
 DELETE FROM public.item_vendor_default; GET DIAGNOSTICS n=ROW_COUNT; IF n<>1 THEN RAISE EXCEPTION 'Master tidak bisa hapus default'; END IF;
 IF (SELECT count(*) FROM public.audit_logs WHERE entity_type IN ('vendor_pic','item_vendor_default') AND action='delete')<>2 THEN RAISE EXCEPTION 'Audit delete gagal'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.audit_logs WHERE entity_type='vendors' AND action='update' AND entity_id='40000000-0000-0000-0000-000000000001') THEN RAISE EXCEPTION 'Audit vendor gagal'; END IF;
 INSERT INTO purchasing_results VALUES('Master hapus penugasan dan audit tersimpan','PASS');
 RESET ROLE;
 SET LOCAL ROLE anon;
 rejected:=false; BEGIN PERFORM 1 FROM public.vendors; EXCEPTION WHEN insufficient_privilege THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Anon vendors lolos'; END IF;
 rejected:=false; BEGIN PERFORM 1 FROM public.item_vendor_default; EXCEPTION WHEN insufficient_privilege THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Anon default lolos'; END IF;
 rejected:=false; BEGIN PERFORM 1 FROM public.vendor_pic; EXCEPTION WHEN insufficient_privilege THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Anon PIC lolos'; END IF;
 INSERT INTO purchasing_results VALUES('Anon ditolak pada tiga tabel','PASS');
 RESET ROLE;
END $$;
SELECT * FROM purchasing_results ORDER BY test;
ROLLBACK;
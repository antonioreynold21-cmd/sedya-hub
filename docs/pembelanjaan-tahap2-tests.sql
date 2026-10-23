BEGIN;
CREATE TEMP TABLE r2(test text, result text) ON COMMIT DROP;
GRANT ALL ON r2 TO authenticated;
INSERT INTO public.tenants(id,slug,name) VALUES
 ('10000000-0000-0000-0000-000000000001','zz-p2-a','ZZ P2 A'),('10000000-0000-0000-0000-000000000002','zz-p2-b','ZZ P2 B');
INSERT INTO public.profiles(id,email,active_tenant_id) VALUES
 ('20000000-0000-0000-0000-000000000001','zz-m@uji.test','10000000-0000-0000-0000-000000000001'),
 ('20000000-0000-0000-0000-000000000002','zz-s@uji.test','10000000-0000-0000-0000-000000000001'),
 ('20000000-0000-0000-0000-000000000003','zz-n@uji.test','10000000-0000-0000-0000-000000000001'),
 ('20000000-0000-0000-0000-000000000004','zz-b@uji.test','10000000-0000-0000-0000-000000000002');
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
INSERT INTO public.pricelist_items(tenant_id,name,category,unit,price)
 SELECT '10000000-0000-0000-0000-000000000001','ZZ Item '||g,'Uji','kg',1000 FROM generate_series(1,9) g;
INSERT INTO public.vendors(id,tenant_id,nama) VALUES
 ('40000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','ZZ V1'),
 ('40000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','ZZ V2'),
 ('40000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','ZZ V3');
DO $$
DECLARE j jsonb; rows jsonb := '[]'; n int; ok boolean; v uuid := '40000000-0000-0000-0000-000000000001';
BEGIN
 PERFORM set_config('request.jwt.claims','{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
 SET LOCAL ROLE authenticated;
 FOR n IN 1..8 LOOP rows := rows || jsonb_build_object('line',n+1,'nama_item','zz item '||n,'vendor_utama',' zz v1 ','vendor_cadangan',CASE WHEN n%2=0 THEN 'ZZ V2' ELSE '' END); END LOOP;
 rows := rows || '{"line":10,"nama_item":"Tidak Ada","vendor_utama":"ZZ V1"}' || '{"line":11,"nama_item":"ZZ Item 9","vendor_utama":"ZZ Hilang"}';
 j := public.import_item_vendor_defaults(rows,false);
 SELECT count(*) INTO n FROM public.item_vendor_default WHERE tenant_id='10000000-0000-0000-0000-000000000001';
 INSERT INTO r2 VALUES('Dry-run 8 ok/2 gagal + alasan, tidak menulis', CASE WHEN (j->'summary'->>'ok')='8' AND (j->'summary'->>'gagal')='2' AND n=0
  AND j->'rows'->8->>'alasan'='Item tidak ditemukan' AND j->'rows'->9->>'alasan'='Vendor utama tidak ditemukan' THEN 'PASS' ELSE 'FAIL '||j::text END);
 j := public.import_item_vendor_defaults(rows,true);
 SELECT count(*) INTO n FROM public.item_vendor_default WHERE tenant_id='10000000-0000-0000-0000-000000000001';
 INSERT INTO r2 VALUES('Commit tepat 8 baris', CASE WHEN n=8 THEN 'PASS' ELSE 'FAIL '||n END);
 j := public.import_item_vendor_defaults('[{"line":2,"nama_item":"ZZ Item 1","vendor_utama":"ZZ V1","vendor_cadangan":"zz v1"}]',false);
 INSERT INTO r2 VALUES('Cadangan = utama ditolak', CASE WHEN j->'rows'->0->>'alasan'='Vendor cadangan sama dengan utama' THEN 'PASS' ELSE 'FAIL' END);
 ok:=false; BEGIN UPDATE public.item_vendor_default SET vendor_cadangan_id=vendor_utama_id WHERE tenant_id='10000000-0000-0000-0000-000000000001'; EXCEPTION WHEN check_violation THEN ok:=true; END;
 INSERT INTO r2 VALUES('Cadangan = utama ditolak (tabel)', CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END);
 PERFORM public.set_vendor_pic(v,'20000000-0000-0000-0000-000000000001',false);
 PERFORM public.set_vendor_pic(v,'20000000-0000-0000-0000-000000000002',false);
 SELECT count(*) FILTER (WHERE pic_utama AND user_id='20000000-0000-0000-0000-000000000001') INTO n FROM public.vendor_pic WHERE vendor_id=v;
 INSERT INTO r2 VALUES('PIC pertama otomatis utama, 2 PIC', CASE WHEN n=1 THEN 'PASS' ELSE 'FAIL' END);
 PERFORM public.set_vendor_pic(v,'20000000-0000-0000-0000-000000000002',true);
 SELECT count(*) INTO n FROM public.vendor_pic WHERE vendor_id=v AND pic_utama AND user_id='20000000-0000-0000-0000-000000000002';
 INSERT INTO r2 VALUES('Ganti utama atomik (tanpa langgar index)', CASE WHEN n=1 AND (SELECT count(*) FROM public.vendor_pic WHERE vendor_id=v AND pic_utama)=1 THEN 'PASS' ELSE 'FAIL' END);
 PERFORM public.set_vendor_pic(v,'20000000-0000-0000-0000-000000000003',false);
 PERFORM public.remove_vendor_pic(v,'20000000-0000-0000-0000-000000000002');
 SELECT count(*) INTO n FROM public.vendor_pic WHERE vendor_id=v AND pic_utama AND user_id='20000000-0000-0000-0000-000000000001';
 INSERT INTO r2 VALUES('Hapus utama → tertua jadi utama', CASE WHEN n=1 THEN 'PASS' ELSE 'FAIL' END);
 SELECT count(*) INTO n FROM public.list_vendor_pics();
 INSERT INTO r2 VALUES('Master baca daftar PIC', CASE WHEN n=2 THEN 'PASS' ELSE 'FAIL '||n END);
 RESET ROLE;
 -- staff dengan modul
 PERFORM set_config('request.jwt.claims','{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
 SET LOCAL ROLE authenticated;
 SELECT count(*) INTO n FROM public.item_vendor_default;
 ok := n=8 AND (SELECT count(*) FROM public.list_vendor_pics())=2;
 BEGIN PERFORM public.import_item_vendor_defaults('[]',false); ok:=false; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.set_vendor_pic(v,'20000000-0000-0000-0000-000000000002',true); ok:=false; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 UPDATE public.item_vendor_default SET vendor_cadangan_id=NULL; GET DIAGNOSTICS n=ROW_COUNT; ok := ok AND n=0;
 INSERT INTO r2 VALUES('Staff bermodul: baca ya, tulis tidak', CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END);
 RESET ROLE;
 -- staff tanpa modul
 PERFORM set_config('request.jwt.claims','{"sub":"20000000-0000-0000-0000-000000000003","role":"authenticated"}',true);
 SET LOCAL ROLE authenticated;
 ok := (SELECT count(*) FROM public.item_vendor_default)=0;
 BEGIN PERFORM public.import_item_vendor_defaults('[]',false); ok:=false; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.set_vendor_pic(v,'20000000-0000-0000-0000-000000000003',true); ok:=false; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.list_pic_candidates(); ok:=false; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 INSERT INTO r2 VALUES('Staff tanpa modul ditolak (impor/set PIC/kandidat)', CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END);
 RESET ROLE;
 -- tenant lain
 PERFORM set_config('request.jwt.claims','{"sub":"20000000-0000-0000-0000-000000000004","role":"authenticated"}',true);
 SET LOCAL ROLE authenticated;
 ok := (SELECT count(*) FROM public.item_vendor_default)=0 AND (SELECT count(*) FROM public.vendor_pic)=0 AND (SELECT count(*) FROM public.list_vendor_pics())=0;
 BEGIN PERFORM public.set_vendor_pic(v,'20000000-0000-0000-0000-000000000004',true); ok:=false; EXCEPTION WHEN no_data_found THEN NULL; END;
 BEGIN PERFORM public.remove_vendor_pic(v,'20000000-0000-0000-0000-000000000001'); ok:=false; EXCEPTION WHEN no_data_found THEN NULL; END;
 j := public.import_item_vendor_defaults('[{"line":2,"nama_item":"ZZ Item 1","vendor_utama":"ZZ V1"}]',true);
 ok := ok AND (j->'summary'->>'ok')='0';
 INSERT INTO r2 VALUES('Tenant lain tidak bisa lihat/menyentuh', CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END);
 RESET ROLE;
 INSERT INTO r2 VALUES('Anon tanpa EXECUTE', CASE WHEN NOT has_function_privilege('anon','public.import_item_vendor_defaults(jsonb,boolean)','execute')
  AND NOT has_function_privilege('anon','public.set_vendor_pic(uuid,uuid,boolean)','execute') THEN 'PASS' ELSE 'FAIL' END);
 RAISE EXCEPTION 'RESULT: %', (SELECT string_agg(test||' = '||result, ' | ') FROM r2);
END $$;
ROLLBACK;

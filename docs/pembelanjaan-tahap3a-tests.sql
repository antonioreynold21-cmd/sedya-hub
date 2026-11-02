BEGIN;
CREATE TEMP TABLE r3(test text, result text) ON COMMIT DROP;
GRANT ALL ON r3 TO authenticated;
INSERT INTO public.tenants(id,slug,name) VALUES
 ('11000000-0000-0000-0000-000000000001','zz-p3-a','ZZ P3 A'),('11000000-0000-0000-0000-000000000002','zz-p3-b','ZZ P3 B');
INSERT INTO public.profiles(id,email,active_tenant_id) VALUES
 ('21000000-0000-0000-0000-000000000001','zz3-m@uji.test','11000000-0000-0000-0000-000000000001'),
 ('21000000-0000-0000-0000-000000000002','zz3-pic1@uji.test','11000000-0000-0000-0000-000000000001'),
 ('21000000-0000-0000-0000-000000000003','zz3-pic2@uji.test','11000000-0000-0000-0000-000000000001'),
 ('21000000-0000-0000-0000-000000000004','zz3-staf@uji.test','11000000-0000-0000-0000-000000000001'),
 ('21000000-0000-0000-0000-000000000005','zz3-nomod@uji.test','11000000-0000-0000-0000-000000000001'),
 ('21000000-0000-0000-0000-000000000006','zz3-b@uji.test','11000000-0000-0000-0000-000000000002');
INSERT INTO public.tenant_memberships(tenant_id,user_id,status)
 SELECT '11000000-0000-0000-0000-000000000001',('21000000-0000-0000-0000-00000000000'||g)::uuid,'active' FROM generate_series(1,5) g;
INSERT INTO public.tenant_memberships(tenant_id,user_id,status) VALUES('11000000-0000-0000-0000-000000000002','21000000-0000-0000-0000-000000000006','active');
INSERT INTO public.user_roles(tenant_id,user_id,role) VALUES
 ('11000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000001','master'),
 ('11000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000002','staff'),
 ('11000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000003','staff'),
 ('11000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000004','staff'),
 ('11000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000005','staff'),
 ('11000000-0000-0000-0000-000000000002','21000000-0000-0000-0000-000000000006','master');
INSERT INTO public.module_access(tenant_id,user_id,module)
 SELECT '11000000-0000-0000-0000-000000000001',('21000000-0000-0000-0000-00000000000'||g)::uuid,'pembelanjaan' FROM generate_series(2,4) g;
INSERT INTO public.vendors(id,tenant_id,nama) VALUES
 ('41000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','ZZ3 V1'),
 ('41000000-0000-0000-0000-000000000002','11000000-0000-0000-0000-000000000001','ZZ3 V2');
INSERT INTO public.vendor_pic(tenant_id,vendor_id,user_id,pic_utama) VALUES
 ('11000000-0000-0000-0000-000000000001','41000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000002',true),
 ('11000000-0000-0000-0000-000000000001','41000000-0000-0000-0000-000000000002','21000000-0000-0000-0000-000000000003',true);
INSERT INTO public.pricelist_items(id,tenant_id,name,category,unit,price) VALUES
 ('51000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','ZZ Tomat','Uji','kg',1000),
 ('51000000-0000-0000-0000-000000000002','11000000-0000-0000-0000-000000000001','ZZ Ganda','Uji','kg',1000),
 ('51000000-0000-0000-0000-000000000003','11000000-0000-0000-0000-000000000001',' zz ganda ','Uji2','KG',1000);
INSERT INTO public.item_vendor_default(tenant_id,item_id,vendor_utama_id) VALUES
 ('11000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','41000000-0000-0000-0000-000000000001'),
 ('11000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000002','41000000-0000-0000-0000-000000000002');
INSERT INTO public.orders(id,tenant_id,client_name,order_date) VALUES
 ('61000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','ZZ Hotel A',current_date),
 ('61000000-0000-0000-0000-000000000002','11000000-0000-0000-0000-000000000001','ZZ Hotel B',current_date);
INSERT INTO public.order_items(id,tenant_id,order_id,position,item_name,qty,unit,price,outlet_name,section_name) VALUES
 ('71000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000001',1,' zz tomat','10','Kg',1000,'Outlet 1','Kitchen'),
 ('71000000-0000-0000-0000-000000000002','11000000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000001',2,'ZZ Ganda',5,'kg',1000,NULL,NULL),
 ('71000000-0000-0000-0000-000000000003','11000000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000002',1,'ZZ Tidak Ada',3,'kg',1000,NULL,NULL);
DO $$
DECLARE j jsonb; d uuid; n int; ok boolean; i_tomat uuid; i_ganda uuid; i_none uuid;
 m text:='{"sub":"21000000-0000-0000-0000-000000000001","role":"authenticated"}';
 ords uuid[]:=ARRAY['61000000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000002']::uuid[];
BEGIN
 PERFORM set_config('request.jwt.claims',m,true); SET LOCAL ROLE authenticated;
 j:=public.generate_daftar_belanja(current_date+1,ords); d:=(j->>'daftar_id')::uuid;
 SELECT id INTO i_tomat FROM public.daftar_belanja_item WHERE order_item_id='71000000-0000-0000-0000-000000000001';
 SELECT id INTO i_ganda FROM public.daftar_belanja_item WHERE order_item_id='71000000-0000-0000-0000-000000000002';
 SELECT id INTO i_none FROM public.daftar_belanja_item WHERE order_item_id='71000000-0000-0000-0000-000000000003';
 ok:=(j->>'ditambah')='3' AND (j->>'tanpa_vendor')='2'
  AND (SELECT vendor_id FROM public.daftar_belanja_item WHERE id=i_tomat)='41000000-0000-0000-0000-000000000001'
  AND (SELECT vendor_id FROM public.daftar_belanja_item WHERE id=i_ganda) IS NULL
  AND (SELECT customer_nama||outlet_nama||section_nama FROM public.daftar_belanja_item WHERE id=i_tomat)='ZZ Hotel AOutlet 1Kitchen';
 INSERT INTO r3 VALUES('1 Generate: cocok→vendor utama; ganda/tidak cocok→NULL', CASE WHEN ok THEN 'PASS' ELSE 'FAIL '||j END);
 j:=public.generate_daftar_belanja(current_date+1,ords);
 INSERT INTO r3 VALUES('1 Generate ulang tanpa duplikat (draft sama)', CASE WHEN (j->>'daftar_id')::uuid=d AND (j->>'ditambah')='0' AND (j->>'dilewati')='3'
  AND (SELECT count(*) FROM public.daftar_belanja_item WHERE daftar_id=d)=3 THEN 'PASS' ELSE 'FAIL '||j END);
 -- Master set on draft allowed; then reset
 j:=public.set_item_status(i_none,'kosong');
 INSERT INTO r3 VALUES('4 Master boleh ubah saat draft / item tanpa vendor', CASE WHEN (j->>'ok')::boolean THEN 'PASS' ELSE 'FAIL' END);
 RESET ROLE;
 PERFORM set_config('request.jwt.claims','{"sub":"21000000-0000-0000-0000-000000000002","role":"authenticated"}',true); SET LOCAL ROLE authenticated;
 ok:=false; BEGIN PERFORM public.set_item_status(i_tomat,'ada'); EXCEPTION WHEN OTHERS THEN ok:=true; END;
 BEGIN PERFORM public.kirim_daftar_belanja(d); ok:=false; EXCEPTION WHEN OTHERS THEN NULL; END;
 INSERT INTO r3 VALUES('4 Staff PIC ditolak saat draft; staff tidak bisa kirim', CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END);
 RESET ROLE;
 PERFORM set_config('request.jwt.claims',m,true); SET LOCAL ROLE authenticated;
 ok:=false; BEGIN PERFORM public.tutup_daftar_belanja(d); EXCEPTION WHEN OTHERS THEN ok:=true; END;
 j:=public.kirim_daftar_belanja(d);
 ok:=ok AND (j->>'tanpa_vendor')='2' AND (SELECT status='terkirim' AND terkirim_at IS NOT NULL FROM public.daftar_belanja WHERE id=d);
 BEGIN PERFORM public.kirim_daftar_belanja(d); ok:=false; EXCEPTION WHEN OTHERS THEN NULL; END;
 BEGIN PERFORM public.generate_daftar_belanja(current_date+1,ords); EXCEPTION WHEN OTHERS THEN ok:=false; END;
 ok:=ok AND (SELECT count(*) FROM public.daftar_belanja_item WHERE daftar_id=d)=3;
 INSERT INTO r3 VALUES('4 Kirim Master draft→terkirim, peringatan tanpa vendor, kirim ulang ditolak, tak menambah ke daftar terkirim', CASE WHEN ok THEN 'PASS' ELSE 'FAIL '||j END);
 RESET ROLE;
 -- staff modul bukan PIC
 PERFORM set_config('request.jwt.claims','{"sub":"21000000-0000-0000-0000-000000000004","role":"authenticated"}',true); SET LOCAL ROLE authenticated;
 ok:=false; BEGIN PERFORM public.set_item_status(i_tomat,'ada'); EXCEPTION WHEN OTHERS THEN ok:=true; END;
 ok:=ok AND (SELECT count(*) FROM public.daftar_belanja_item)=3;
 INSERT INTO r3 VALUES('2 Staff bermodul bukan PIC ditolak (baca boleh)', CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END);
 RESET ROLE;
 PERFORM set_config('request.jwt.claims','{"sub":"21000000-0000-0000-0000-000000000003","role":"authenticated"}',true); SET LOCAL ROLE authenticated;
 ok:=false; BEGIN PERFORM public.set_item_status(i_tomat,'ada'); EXCEPTION WHEN OTHERS THEN ok:=true; END;
 BEGIN PERFORM public.set_item_status(i_ganda,'ada'); ok:=false; EXCEPTION WHEN OTHERS THEN NULL; END;
 INSERT INTO r3 VALUES('2 PIC vendor lain ditolak; item tanpa vendor hanya Master', CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END);
 RESET ROLE;
 PERFORM set_config('request.jwt.claims','{"sub":"21000000-0000-0000-0000-000000000005","role":"authenticated"}',true); SET LOCAL ROLE authenticated;
 ok:=false; BEGIN PERFORM public.set_item_status(i_tomat,'ada'); EXCEPTION WHEN OTHERS THEN ok:=true; END;
 BEGIN PERFORM public.list_order_untuk_belanja(); ok:=false; EXCEPTION WHEN OTHERS THEN NULL; END;
 ok:=ok AND (SELECT count(*) FROM public.daftar_belanja_item)=0;
 INSERT INTO r3 VALUES('2 Staff tanpa modul ditolak (tulis, list, baca)', CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END);
 RESET ROLE;
 PERFORM set_config('request.jwt.claims','{"sub":"21000000-0000-0000-0000-000000000002","role":"authenticated"}',true); SET LOCAL ROLE authenticated;
 ok:=false; BEGIN PERFORM public.set_item_status(i_tomat,'sebagian'); EXCEPTION WHEN OTHERS THEN ok:=true; END;
 BEGIN PERFORM public.set_item_status(i_tomat,'sebagian',10); ok:=false; EXCEPTION WHEN OTHERS THEN NULL; END;
 INSERT INTO r3 VALUES('3 Sebagian tanpa qty / qty>=qty ditolak', CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END);
 j:=public.set_item_status(i_tomat,'sebagian',4,'telegram');
 ok:=(SELECT qty_dibeli FROM public.daftar_belanja_item WHERE id=i_tomat)=4;
 j:=public.set_item_status(i_tomat,'ada');
 ok:=ok AND (SELECT qty_dibeli FROM public.daftar_belanja_item WHERE id=i_tomat)=10 AND (SELECT qty_dibeli FROM public.daftar_belanja_item WHERE id=i_none)=0;
 INSERT INTO r3 VALUES('2/3 PIC vendor berhasil; sebagian=4, ada=qty, kosong=0', CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END);
 SELECT count(*) INTO n FROM public.belanja_audit WHERE item_id=i_tomat;
 j:=public.set_item_status(i_tomat,'ada');
 INSERT INTO r3 VALUES('3 Panggilan ulang idempoten (audit tetap)', CASE WHEN (j->>'ok')::boolean AND n=2 AND (SELECT count(*) FROM public.belanja_audit WHERE item_id=i_tomat)=2
  AND (SELECT sumber FROM public.belanja_audit WHERE item_id=i_tomat AND status_baru='sebagian')='telegram' THEN 'PASS' ELSE 'FAIL '||n END);
 INSERT INTO r3 VALUES('3 semua_selesai=false selama ada belum_dibeli', CASE WHEN (j->>'semua_selesai')='false' THEN 'PASS' ELSE 'FAIL' END);
 RESET ROLE;
 PERFORM set_config('request.jwt.claims',m,true); SET LOCAL ROLE authenticated;
 ok:=false; BEGIN PERFORM public.tutup_daftar_belanja(d); EXCEPTION WHEN OTHERS THEN ok:=true; END;
 j:=public.set_item_status(i_ganda,'ada');
 ok:=ok AND (j->>'semua_selesai')='true';
 j:=public.tutup_daftar_belanja(d);
 ok:=ok AND (SELECT status='selesai' AND ringkasan_terkirim_at IS NOT NULL FROM public.daftar_belanja WHERE id=d);
 INSERT INTO r3 VALUES('5 Tutup ditolak bila ada belum_dibeli; berhasil setelah semua selesai', CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END);
 SELECT count(*) INTO n FROM public.list_order_untuk_belanja() x WHERE x.sudah_ada_di_daftar;
 INSERT INTO r3 VALUES('list_order_untuk_belanja: 2 order, flag sudah_ada', CASE WHEN n=2 AND (SELECT count(*) FROM public.list_order_untuk_belanja())=2 THEN 'PASS' ELSE 'FAIL '||n END);
 ok:=true;
 DELETE FROM public.daftar_belanja WHERE id=d; GET DIAGNOSTICS n=ROW_COUNT; ok:=n=0;
 BEGIN DELETE FROM public.daftar_belanja_item WHERE id=i_tomat; GET DIAGNOSTICS n=ROW_COUNT; ok:=ok AND n=0; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN UPDATE public.daftar_belanja_item SET qty=1 WHERE id=i_tomat; GET DIAGNOSTICS n=ROW_COUNT; ok:=ok AND n=0; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN UPDATE public.belanja_audit SET sumber='app'; ok:=false; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN DELETE FROM public.belanja_audit; ok:=false; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 RESET ROLE;
 BEGIN DELETE FROM public.belanja_audit WHERE item_id=i_tomat; ok:=false; EXCEPTION WHEN OTHERS THEN NULL; END;
 BEGIN UPDATE public.belanja_audit SET sumber='app' WHERE item_id=i_tomat; ok:=false; EXCEPTION WHEN OTHERS THEN NULL; END;
 BEGIN DELETE FROM public.daftar_belanja_item WHERE id=i_tomat; ok:=false; EXCEPTION WHEN OTHERS THEN NULL; END;
 BEGIN DELETE FROM public.daftar_belanja WHERE id=d; ok:=false; EXCEPTION WHEN OTHERS THEN NULL; END;
 INSERT INTO r3 VALUES('7 Tanpa hard delete; item tanpa tulis langsung; belanja_audit append-only (juga sebagai pemilik)', CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END);
 PERFORM set_config('request.jwt.claims','{"sub":"21000000-0000-0000-0000-000000000006","role":"authenticated"}',true); SET LOCAL ROLE authenticated;
 ok:=(SELECT count(*) FROM public.daftar_belanja)=0 AND (SELECT count(*) FROM public.daftar_belanja_item)=0 AND (SELECT count(*) FROM public.belanja_audit)=0;
 BEGIN PERFORM public.set_item_status(i_tomat,'kosong'); ok:=false; EXCEPTION WHEN OTHERS THEN NULL; END;
 BEGIN PERFORM public.generate_daftar_belanja(current_date+1,ords); ok:=false; EXCEPTION WHEN OTHERS THEN NULL; END;
 BEGIN PERFORM public.tutup_daftar_belanja(d); ok:=false; EXCEPTION WHEN OTHERS THEN NULL; END;
 INSERT INTO r3 VALUES('6 Tenant lain tidak bisa baca/tulis', CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END);
 RESET ROLE;
 INSERT INTO r3 VALUES('Anon tanpa EXECUTE/SELECT', CASE WHEN NOT has_function_privilege('anon','public.set_item_status(uuid,text,numeric,text)','execute')
  AND NOT has_function_privilege('anon','public.generate_daftar_belanja(date,uuid[])','execute') AND NOT has_table_privilege('anon','public.daftar_belanja','select') THEN 'PASS' ELSE 'FAIL' END);
 SELECT md5(string_agg(o.id::text||coalesce(o.order_number,'')||coalesce(o.invoice_number,'')||coalesce(o.approved_fingerprint,'')||coalesce(o.section,''),'|' order by o.id)) INTO j
  FROM (SELECT * FROM public.orders WHERE deleted_at IS NULL AND tenant_id<>'11000000-0000-0000-0000-000000000001') o;
 INSERT INTO r3 VALUES('8 Hash order lama', CASE WHEN j#>>'{}'='75a04fe6dc0954ddbf709991e1cb0c1a' THEN 'PASS' ELSE 'FAIL' END);
 RAISE EXCEPTION 'RESULT: %', (SELECT string_agg(test||' = '||result, ' | ') FROM r3);
END $$;
ROLLBACK;

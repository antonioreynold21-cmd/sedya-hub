BEGIN;
CREATE TEMP TABLE outlet_results(test text,result text) ON COMMIT DROP;
GRANT ALL ON outlet_results TO authenticated;
CREATE TEMP TABLE legacy_before AS SELECT
 (SELECT md5(jsonb_agg(t ORDER BY id)::text) FROM (SELECT id,order_number,invoice_number,approved_fingerprint,section FROM public.orders) t) oh,
 (SELECT md5(jsonb_agg(t ORDER BY id)::text) FROM (SELECT id,item_name,qty,price,discount_value FROM public.order_items WHERE deleted_at IS NULL) t) ih;
INSERT INTO public.tenants(id,slug,name) VALUES
 ('11000000-0000-0000-0000-000000000001','zz-outlet-a','ZZ Outlet A'),('11000000-0000-0000-0000-000000000002','zz-outlet-b','ZZ Outlet B');
INSERT INTO public.tenant_settings(tenant_id) VALUES ('11000000-0000-0000-0000-000000000001'),('11000000-0000-0000-0000-000000000002');
INSERT INTO public.profiles(id,email,active_tenant_id) VALUES
 ('21000000-0000-0000-0000-000000000001','zz-outlet-master@uji.test','11000000-0000-0000-0000-000000000001'),
 ('21000000-0000-0000-0000-000000000002','zz-outlet-orders@uji.test','11000000-0000-0000-0000-000000000001'),
 ('21000000-0000-0000-0000-000000000003','zz-outlet-none@uji.test','11000000-0000-0000-0000-000000000001'),
 ('21000000-0000-0000-0000-000000000004','zz-outlet-other@uji.test','11000000-0000-0000-0000-000000000002');
INSERT INTO public.tenant_memberships(tenant_id,user_id,status) SELECT active_tenant_id,id,'active' FROM public.profiles WHERE email LIKE 'zz-outlet-%@uji.test';
INSERT INTO public.user_roles(tenant_id,user_id,role) SELECT active_tenant_id,id,CASE WHEN email LIKE '%master%' OR email LIKE '%other%' THEN 'master'::public.app_role ELSE 'staff'::public.app_role END FROM public.profiles WHERE email LIKE 'zz-outlet-%@uji.test';
INSERT INTO public.module_access(tenant_id,user_id,module) VALUES ('11000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000002','orders');
DO $$
DECLARE tid uuid:='11000000-0000-0000-0000-000000000001'; cid uuid; cid2 uuid; a uuid; b uuid; x uuid; oid uuid; iid uuid; j jsonb; its jsonb; ok boolean; n int; number_a text; number_b text;
BEGIN
 PERFORM set_config('request.jwt.claims','{"sub":"21000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
 SET LOCAL ROLE authenticated;
 INSERT INTO public.clients(tenant_id,name,wajib_no_po) VALUES(tid,'ZZ Required',true) RETURNING id INTO cid;
 INSERT INTO public.clients(tenant_id,name) VALUES(tid,'ZZ Other') RETURNING id INTO cid2;
 INSERT INTO public.client_outlets(tenant_id,client_id,nama) VALUES(tid,cid,'Outlet A') RETURNING id INTO a;
 INSERT INTO public.client_outlets(tenant_id,client_id,nama) VALUES(tid,cid,'Outlet B') RETURNING id INTO b;
 INSERT INTO public.client_outlets(tenant_id,client_id,nama) VALUES(tid,cid2,'Other Outlet') RETURNING id INTO x;
 j:=jsonb_build_object('client_id',cid,'client_name','ZZ Required','document_date','2026-10-25');
 its:='[{"item_name":"ZZ Item","qty":1,"price":100,"unit":"kg","discount_type":"percent","discount_value":0}]';
 ok:=false; BEGIN PERFORM public.save_sales_document('orders',NULL,j,its); EXCEPTION WHEN others THEN ok:=SQLERRM='Client ini mewajibkan Customer PO No.'; END;
 INSERT INTO outlet_results VALUES('PO kosong ditolak',CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END);
 ok:=false; BEGIN PERFORM public.save_sales_document('orders',NULL,j||'{"po_number":"   "}',its); EXCEPTION WHEN others THEN ok:=SQLERRM='Client ini mewajibkan Customer PO No.'; END;
 INSERT INTO outlet_results VALUES('PO spasi ditolak',CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END);
 j:=j||'{"po_number":"PO Customer"}';
 oid:=public.save_sales_document('orders',NULL,j,its);
 INSERT INTO outlet_results VALUES('PO valid diterima',CASE WHEN oid IS NOT NULL THEN 'PASS' ELSE 'FAIL' END);
 PERFORM public.save_sales_document('orders',NULL,j-'client_id'-'po_number',its);
 INSERT INTO outlet_results VALUES('Tanpa client_id dan PO diterima','PASS');
 its:='[]';
 FOR n IN 1..4 LOOP its:=its||jsonb_build_object('item_name','ZZ Item '||n,'qty',1,'price',100,'unit','kg','discount_type','percent','discount_value',0,'outlet_id',CASE WHEN n=4 THEN b ELSE a END,'outlet_name','PALSU','section_name',CASE n WHEN 1 THEN ' Kitchen ' WHEN 2 THEN 'bAr' WHEN 3 THEN 'OTHERS' ELSE 'Bakery' END); END LOOP;
 oid:=public.save_sales_document('orders',NULL,j,its);
 SELECT count(*) INTO n FROM public.order_items WHERE order_id=oid AND section_rank=position AND outlet_name=CASE WHEN position=4 THEN 'Outlet B' ELSE 'Outlet A' END;
 INSERT INTO outlet_results VALUES('Dua outlet snapshot DB dan rank 1/2/3/4',CASE WHEN n=4 THEN 'PASS' ELSE 'FAIL' END);
 ok:=false; BEGIN PERFORM public.save_sales_document('orders',NULL,j,jsonb_build_array(its->0||jsonb_build_object('outlet_id',x))); EXCEPTION WHEN others THEN ok:=SQLERRM='Outlet tidak valid untuk client ini'; END;
 INSERT INTO outlet_results VALUES('Outlet client lain ditolak',CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END);
 UPDATE public.client_outlets SET aktif=false,nama='Outlet A Baru' WHERE id=a;
 ok:=false; BEGIN PERFORM public.save_sales_document('orders',NULL,j,jsonb_build_array(its->0)); EXCEPTION WHEN others THEN ok:=SQLERRM='Outlet tidak valid untuk client ini'; END;
 INSERT INTO outlet_results VALUES('Outlet nonaktif item baru ditolak',CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END);
 SELECT jsonb_agg(to_jsonb(i) ORDER BY position) INTO its FROM public.order_items i WHERE order_id=oid AND deleted_at IS NULL;
 PERFORM public.save_sales_document('orders',oid,j,its);
 SELECT count(*) INTO n FROM public.order_items WHERE order_id=oid AND outlet_id=a AND outlet_name='Outlet A';
 INSERT INTO outlet_results VALUES('Outlet lama nonaktif diterima dan snapshot tetap',CASE WHEN n=3 THEN 'PASS' ELSE 'FAIL' END);
 ok:=false; BEGIN PERFORM public.save_sales_document('orders',NULL,j,jsonb_build_array(((its->3)-'id')||jsonb_build_object('section_name',repeat('x',41)))); EXCEPTION WHEN others THEN ok:=SQLERRM='Nama section maksimal 40 karakter'; END;
 INSERT INTO outlet_results VALUES('Section 41 karakter ditolak',CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END);
 ok:=false; BEGIN PERFORM public.save_sales_document('orders',NULL,j,jsonb_build_array(((its->3)-'id')||'{"section_rank":0}')); EXCEPTION WHEN others THEN ok:=SQLERRM='Urutan section minimal 1'; END;
 INSERT INTO outlet_results VALUES('Rank 0 ditolak',CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END);
 PERFORM public.save_sales_document('orders',NULL,j,'[{"item_name":"ZZ Empty","qty":1,"price":100,"section_name":"   ","section_rank":4}]');
 SELECT count(*) INTO n FROM public.order_items WHERE item_name='ZZ Empty' AND outlet_id IS NULL AND outlet_name IS NULL AND section_name IS NULL AND section_rank IS NULL;
 INSERT INTO outlet_results VALUES('Metadata kosong tetap NULL',CASE WHEN n=1 THEN 'PASS' ELSE 'FAIL' END);
 RESET ROLE;
 PERFORM set_config('request.jwt.claims','{"sub":"21000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
 SET LOCAL ROLE authenticated;
 SELECT count(*) INTO n FROM public.clients;
 SELECT to_jsonb(c) INTO j FROM public.list_order_clients() c WHERE id=cid;
 INSERT INTO outlet_results VALUES('Staff orders saja: RPC terbatas, clients langsung tidak terbaca',CASE WHEN n=0 AND j IS NOT NULL AND (SELECT count(*) FROM jsonb_object_keys(j))=6 AND NOT j ?| ARRAY['phone','notes','pic','contact_person'] AND jsonb_array_length(j->'outlets')=1 AND (SELECT count(*) FROM jsonb_object_keys(j->'outlets'->0))=3 THEN 'PASS' ELSE 'FAIL' END);
 RESET ROLE;
 PERFORM set_config('request.jwt.claims','{"sub":"21000000-0000-0000-0000-000000000003","role":"authenticated"}',true);
 SET LOCAL ROLE authenticated;
 ok:=false; BEGIN PERFORM public.list_order_clients(); EXCEPTION WHEN others THEN ok:=SQLERRM='Tidak berizin'; END;
 INSERT INTO outlet_results VALUES('Staff tanpa modul ditolak',CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END);
 RESET ROLE;
 PERFORM set_config('request.jwt.claims','{"sub":"21000000-0000-0000-0000-000000000004","role":"authenticated"}',true);
 SET LOCAL ROLE authenticated;
 SELECT count(*) INTO n FROM public.list_order_clients();
 INSERT INTO outlet_results VALUES('Tenant B tidak melihat client A',CASE WHEN n=0 THEN 'PASS' ELSE 'FAIL' END);
 ok:=false; BEGIN PERFORM public.save_sales_document('orders',NULL,jsonb_build_object('client_id',cid,'client_name','ZZ Required','po_number','PO'), '[{"item_name":"X","qty":1,"price":1}]'); EXCEPTION WHEN others THEN ok:=SQLERRM='Client tidak berizin'; END;
 INSERT INTO outlet_results VALUES('Client tenant A ditolak tenant B',CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END);
 RESET ROLE;
 -- next_sales_number tidak di-grant authenticated; panggil sebagai owner dengan JWT Master,
 -- dua subtransaksi rollback agar nilai counter awal identik; bukan tes RLS.
 PERFORM set_config('request.jwt.claims','{"sub":"21000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
 BEGIN number_a:=public.next_sales_number('ZZ Required','order','2026-10-25',NULL); RAISE EXCEPTION 'rollback counter'; EXCEPTION WHEN raise_exception THEN NULL; END;
 BEGIN number_b:=public.next_sales_number('ZZ Required','order','2026-10-25',cid); RAISE EXCEPTION 'rollback counter'; EXCEPTION WHEN raise_exception THEN NULL; END;
 INSERT INTO outlet_results VALUES('Nomor nama sama dengan/tanpa client_id',CASE WHEN number_a=number_b AND number_a IS NOT NULL THEN 'PASS '||number_a ELSE 'FAIL' END);
 INSERT INTO outlet_results VALUES('Anon RPC ditolak',CASE WHEN NOT has_function_privilege('anon','public.list_order_clients()','execute') THEN 'PASS' ELSE 'FAIL' END);
 INSERT INTO outlet_results SELECT 'Hash legacy sebelum/sesudah uji (serialisasi JSONB)',CASE WHEN oh=(SELECT md5(jsonb_agg(t ORDER BY id)::text) FROM (SELECT id,order_number,invoice_number,approved_fingerprint,section FROM public.orders WHERE tenant_id<>tid) t) AND ih=(SELECT md5(jsonb_agg(t ORDER BY id)::text) FROM (SELECT id,item_name,qty,price,discount_value FROM public.order_items WHERE deleted_at IS NULL AND tenant_id<>tid) t) THEN 'PASS' ELSE 'FAIL' END FROM legacy_before;
 RAISE EXCEPTION 'RESULT: %',(SELECT jsonb_agg(r) FROM outlet_results r);
END $$;
ROLLBACK;

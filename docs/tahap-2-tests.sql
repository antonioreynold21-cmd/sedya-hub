-- Execute with a privileged maintenance connection. Every synthetic row rolls back.
BEGIN;
INSERT INTO public.tenants(id,slug,name) VALUES('22222222-2222-4222-8222-222222222222','rollback-phase2-a','Uji A'),('33333333-3333-4333-8333-333333333333','rollback-phase2-b','Uji B');
INSERT INTO public.tenant_settings(tenant_id) VALUES('22222222-2222-4222-8222-222222222222'),('33333333-3333-4333-8333-333333333333');
INSERT INTO public.profiles(id,email,active_tenant_id) VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','synthetic-master-a@invalid.test','22222222-2222-4222-8222-222222222222'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','synthetic-staff-a@invalid.test','22222222-2222-4222-8222-222222222222'),('cccccccc-cccc-4ccc-8ccc-cccccccccccc','synthetic-other-a@invalid.test','22222222-2222-4222-8222-222222222222'),('dddddddd-dddd-4ddd-8ddd-dddddddddddd','synthetic-master-b@invalid.test','33333333-3333-4333-8333-333333333333');
INSERT INTO public.tenant_memberships(tenant_id,user_id) SELECT active_tenant_id,id FROM public.profiles WHERE id IN ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','cccccccc-cccc-4ccc-8ccc-cccccccccccc','dddddddd-dddd-4ddd-8ddd-dddddddddddd');
INSERT INTO public.user_roles(tenant_id,user_id,role) VALUES('22222222-2222-4222-8222-222222222222','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','master'),('22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','staff'),('22222222-2222-4222-8222-222222222222','cccccccc-cccc-4ccc-8ccc-cccccccccccc','staff'),('33333333-3333-4333-8333-333333333333','dddddddd-dddd-4ddd-8ddd-dddddddddddd','master');
INSERT INTO public.module_access(tenant_id,user_id,module) VALUES('22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','orders'),('22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','quotations'),('22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','finance'),('22222222-2222-4222-8222-222222222222','cccccccc-cccc-4ccc-8ccc-cccccccccccc','workflow');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}',true);
DO $$ DECLARE q uuid; o uuid; o2 uuid; n text; n2 text; p uuid; r uuid; t jsonb; failed boolean; BEGIN
 IF current_user<>'authenticated' THEN RAISE EXCEPTION 'Role simulation failed'; END IF;
 q:=public.save_sales_document('quotations',NULL,'{"client_name":"TEST CLIENT","document_date":"2026-10-07"}','[{"item_name":"Beras","qty":2,"price":100000,"unit":"kg","discount_type":"percent","discount_value":0}]');
 PERFORM public.set_quotation_status(q,'disetujui'); o:=public.convert_quotation(q);
 failed:=false; BEGIN PERFORM public.convert_quotation(q); EXCEPTION WHEN OTHERS THEN failed:=true; END; IF NOT failed THEN RAISE EXCEPTION 'FAIL duplicate conversion'; END IF;
 n:=public.issue_invoice(o); IF n<>'INV/TESTCLIENT/2026/10/1' THEN RAISE EXCEPTION 'FAIL client numbering: %',n; END IF;
 o2:=public.save_sales_document('orders',NULL,'{"client_name":"TEST CLIENT","document_date":"2026-10-07"}','[{"item_name":"Beras","qty":1,"price":100000}]'); n2:=public.issue_invoice(o2); IF n2<>'INV/TESTCLIENT/2026/10/2' OR n=n2 THEN RAISE EXCEPTION 'FAIL sequence'; END IF;
 failed:=false; BEGIN PERFORM public.record_payment(o,200001,'2026-10-07','transfer'); EXCEPTION WHEN OTHERS THEN failed:=true; END; IF NOT failed THEN RAISE EXCEPTION 'FAIL overpayment'; END IF;
 p:=public.record_payment(o,50000,'2026-10-07','transfer'); t:=public.sales_totals('orders',o); IF (t->>'balance')::numeric<>150000 OR t->>'state'<>'sebagian dibayar' THEN RAISE EXCEPTION 'FAIL partial'; END IF;
 PERFORM public.record_payment(o,150000,'2026-10-07','tunai'); t:=public.sales_totals('orders',o); IF (t->>'balance')::numeric<>0 OR t->>'state'<>'lunas' THEN RAISE EXCEPTION 'FAIL settled'; END IF;
 IF (SELECT count(*) FROM public.receivables WHERE order_id=o)<>1 OR (SELECT amount FROM public.receivables WHERE order_id=o)<>0 THEN RAISE EXCEPTION 'FAIL receivable sync'; END IF;
 PERFORM public.void_payment(p,'Koreksi uji'); IF (public.sales_totals('orders',o)->>'balance')::numeric<>50000 THEN RAISE EXCEPTION 'FAIL void'; END IF;
 o2:=public.save_sales_document('orders',NULL,'{"client_name":"DISKON","document_date":"2026-10-07","discount_type":"percent","discount_value":10}','[{"item_name":"Beras","qty":1,"price":100000}]');
 failed:=false; BEGIN PERFORM public.issue_invoice(o2); EXCEPTION WHEN OTHERS THEN failed:=true; END; IF NOT failed THEN RAISE EXCEPTION 'FAIL unapproved discount'; END IF;
 SELECT id INTO r FROM public.approval_requests WHERE entity_id=o2 AND type='discount' AND status='pending'; PERFORM public.decide_approval(r,true,'Disetujui eksplisit oleh Master'); PERFORM public.issue_invoice(o2); IF (public.sales_totals('orders',o2)->>'total')::numeric<>90000 THEN RAISE EXCEPTION 'FAIL discount total'; END IF;
 r:=public.request_invoice_cancel(o2,'Uji pembatalan'); PERFORM public.decide_approval(r,true,'Setuju'); IF (public.sales_totals('orders',o2)->>'state')<>'dibatalkan' THEN RAISE EXCEPTION 'FAIL cancel'; END IF;
 failed:=false; BEGIN PERFORM public.save_sales_document('orders',NULL,'{"tenant_id":"33333333-3333-4333-8333-333333333333","client_name":"PALSU"}','[{"item_name":"Beras","qty":1,"price":1}]'); EXCEPTION WHEN OTHERS THEN failed:=true; END; IF NOT failed THEN RAISE EXCEPTION 'FAIL forged tenant'; END IF;
 failed:=false; BEGIN UPDATE public.orders SET tenant_id='33333333-3333-4333-8333-333333333333' WHERE id=o; EXCEPTION WHEN OTHERS THEN failed:=true; END; IF NOT failed THEN RAISE EXCEPTION 'FAIL direct update'; END IF;
 failed:=false; BEGIN DELETE FROM public.orders WHERE id=o; EXCEPTION WHEN OTHERS THEN failed:=true; END; IF NOT failed THEN RAISE EXCEPTION 'FAIL hard delete'; END IF;
 PERFORM set_config('phase2.test_order',o::text,true); PERFORM set_config('phase2.test_quote',q::text,true);
 PERFORM set_config('phase2.master','PASS',true);
END $$;
SELECT set_config('request.jwt.claims','{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}',true);
DO $$ DECLARE failed boolean:=false; r uuid; BEGIN
 IF NOT public.can_access('orders') OR public.is_master() THEN RAISE EXCEPTION 'FAIL staff permissions'; END IF;
 BEGIN PERFORM public.decide_approval(gen_random_uuid(),true,'Staff decision'); EXCEPTION WHEN OTHERS THEN failed:=true; END; IF NOT failed THEN RAISE EXCEPTION 'FAIL staff approval'; END IF;
 failed:=false; BEGIN PERFORM public.save_sales_document('orders',NULL,'{"client_name":"STAFF","number":"MANUAL","number_reason":"Test"}','[{"item_name":"Beras","qty":1,"price":1}]'); EXCEPTION WHEN OTHERS THEN failed:=true; END; IF NOT failed THEN RAISE EXCEPTION 'FAIL staff manual number'; END IF;
 IF EXISTS(SELECT 1 FROM public.tasks WHERE tenant_id='33333333-3333-4333-8333-333333333333') THEN RAISE EXCEPTION 'FAIL staff cross read'; END IF;
 PERFORM set_config('phase2.staff','PASS',true); END $$;
SELECT set_config('request.jwt.claims','{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","role":"authenticated"}',true);
DO $$ DECLARE failed boolean:=false; BEGIN
 IF EXISTS(SELECT 1 FROM public.orders) OR EXISTS(SELECT 1 FROM public.quotations) OR EXISTS(SELECT 1 FROM public.payments) THEN RAISE EXCEPTION 'FAIL other module read'; END IF;
 BEGIN PERFORM public.save_sales_document('orders',NULL,'{"client_name":"OTHER"}','[{"item_name":"Beras","qty":1,"price":1}]'); EXCEPTION WHEN OTHERS THEN failed:=true; END; IF NOT failed THEN RAISE EXCEPTION 'FAIL other module write'; END IF;
 failed:=false; BEGIN PERFORM public.archive_entity('orders',current_setting('phase2.test_order')::uuid,'Other module'); EXCEPTION WHEN OTHERS THEN failed:=true; END; IF NOT failed THEN RAISE EXCEPTION 'FAIL other module archive'; END IF;
 failed:=false; BEGIN PERFORM public.record_payment(current_setting('phase2.test_order')::uuid,1,current_date,'tunai'); EXCEPTION WHEN OTHERS THEN failed:=true; END; IF NOT failed THEN RAISE EXCEPTION 'FAIL other module payment'; END IF;
 PERFORM set_config('phase2.other','PASS',true); END $$;
SELECT set_config('request.jwt.claims','{"sub":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","role":"authenticated"}',true);
DO $$ DECLARE failed boolean:=false; BEGIN
 IF EXISTS(SELECT 1 FROM public.orders WHERE tenant_id='22222222-2222-4222-8222-222222222222') OR EXISTS(SELECT 1 FROM public.quotations WHERE tenant_id='22222222-2222-4222-8222-222222222222') THEN RAISE EXCEPTION 'FAIL cross tenant read'; END IF;
 BEGIN PERFORM public.issue_invoice(current_setting('phase2.test_order')::uuid); EXCEPTION WHEN OTHERS THEN failed:=true; END; IF NOT failed THEN RAISE EXCEPTION 'FAIL cross tenant issue'; END IF;
 failed:=false; BEGIN PERFORM public.archive_entity('orders',current_setting('phase2.test_order')::uuid,'Cross tenant'); EXCEPTION WHEN OTHERS THEN failed:=true; END; IF NOT failed THEN RAISE EXCEPTION 'FAIL cross tenant archive'; END IF;
 failed:=false; BEGIN PERFORM public.save_sales_document('orders',current_setting('phase2.test_order')::uuid,'{"client_name":"Cross"}','[{"item_name":"Beras","qty":1,"price":1}]'); EXCEPTION WHEN OTHERS THEN failed:=true; END; IF NOT failed THEN RAISE EXCEPTION 'FAIL cross tenant write'; END IF;
 PERFORM set_config('phase2.b','PASS',true); END $$;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims','{"role":"anon"}',true);
DO $$ DECLARE failed boolean:=false; BEGIN
 BEGIN PERFORM 1 FROM public.orders; EXCEPTION WHEN insufficient_privilege THEN failed:=true; END; IF NOT failed THEN RAISE EXCEPTION 'FAIL anon read'; END IF;
 failed:=false; BEGIN PERFORM public.save_sales_document('orders',NULL,'{}','[]'); EXCEPTION WHEN insufficient_privilege THEN failed:=true; END; IF NOT failed THEN RAISE EXCEPTION 'FAIL anon write'; END IF;
 PERFORM set_config('phase2.anon','PASS',true); END $$;
SELECT current_setting('phase2.master') AS master_transaction,current_setting('phase2.staff') AS staff,current_setting('phase2.other') AS other_module,current_setting('phase2.b') AS cross_tenant,current_setting('phase2.anon') AS anonymous;
ROLLBACK;

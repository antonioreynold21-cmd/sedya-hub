import { createFileRoute } from '@tanstack/react-router';
import { SalesDocument } from '@/components/sales-document';
export const Route=createFileRoute('/_authenticated/penawaran/$quotationId')({head:()=>({meta:[{title:'Dokumen Penawaran — Sedyain Hub'},{name:'description',content:'Penawaran harga A4 dengan identitas bisnis dan rincian diskon.'},{property:'og:title',content:'Dokumen Penawaran — Sedyain Hub'},{property:'og:description',content:'Dokumen penawaran client siap cetak.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:Page});
function Page(){const {quotationId}=Route.useParams();return <SalesDocument entity="quotations" id={quotationId}/>;}

export type SalesEntity = 'orders' | 'quotations';
export type SalesItem = { id?: string; item_name: string; qty: number; unit: string; price: number; discount_type: 'percent'|'amount'; discount_value: number };
export type SalesTotals = { subtotal:number; item_discount:number; document_discount:number; discount:number; effective_discount_pct:number; tax:number; total:number; paid:number; balance:number; fingerprint:string; state:string };
export function jakartaDate() { return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()); }
/** Jumlah baris invoice: qty×harga dikurangi diskon item (sama dengan kolom Jumlah di invoice). */
export function calculateItemTotal(it:{qty:number|string;price:number|string;discount_type:string;discount_value:number|string}) { const base=Number(it.qty)*Number(it.price); const discount=it.discount_type==='percent'?base*Number(it.discount_value)/100:Number(it.discount_value); return base-discount; }
export function calculateSales(items: SalesItem[], type:string,value:number,tax:boolean,rate:number) {
 const subtotal=items.reduce((s,i)=>s+i.qty*i.price,0);
 const itemDiscount=items.reduce((s,i)=>s+(i.discount_type==='percent'?i.qty*i.price*i.discount_value/100:i.discount_value),0);
 const net=subtotal-itemDiscount; const discount=type==='percent'?net*value/100:value;
 const vat=tax?Math.round((net-discount)*rate)/100:0;
 return {subtotal,itemDiscount,documentDiscount:discount,tax:vat,total:Math.round((net-discount+vat)*100)/100};
}
export function validateSales(items:SalesItem[],type:string,value:number) {
 if(!items.length) throw new Error('Minimal satu item wajib');
 for(const i of items) if(!i.item_name.trim()||!Number.isFinite(i.qty)||i.qty<=0||!Number.isFinite(i.price)||i.price<0||!Number.isFinite(i.discount_value)||i.discount_value<0||(i.discount_type==='percent'?i.discount_value>100:i.discount_value>i.qty*i.price)) throw new Error('Nama, qty, harga atau diskon item tidak valid');
 if(!Number.isFinite(value)||value<0||(type==='percent'&&value>100)||calculateSales(items,type,value,false,0).total<0) throw new Error('Diskon dokumen tidak valid');
}

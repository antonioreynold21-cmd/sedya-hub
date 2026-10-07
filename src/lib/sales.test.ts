import {calculateSales,validateSales} from './sales';
import {strict as a} from 'node:assert';
const i={item_name:'Beras',qty:2,price:100000,unit:'kg',discount_type:'percent' as const,discount_value:10};
a.equal(calculateSales([i],'percent',10,true,11).total,179820);
a.equal(calculateSales([i],'amount',10000,false,11).total,170000);
a.throws(()=>validateSales([{...i,qty:-1}],'percent',0));
a.throws(()=>validateSales([{...i,discount_value:101}],'percent',0));
a.throws(()=>validateSales([i],'amount',180001));
console.log('PASS: item/document percent and amount, optional VAT, negative qty, excessive discount');

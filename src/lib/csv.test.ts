import { strict as a } from "node:assert";
import { escapeCsvCell, parseCsv, parseIdNumber, toCsv } from "./csv";
import { parsePricelistCsv } from "./pricelist-csv";

// BOM + semicolon + quotes
a.deepEqual(parseCsv('﻿a;b\r\n"x;y";"he said ""hi"""\r\n\r\n'), [["a", "b"], ["x;y", 'he said "hi"']]);
// comma delimiter detected
a.deepEqual(parseCsv("a,b\n1,2"), [["a", "b"], ["1", "2"]]);
// price formats
a.equal(parseIdNumber("15000"), 15000);
a.equal(parseIdNumber("15.000"), 15000);
a.equal(parseIdNumber("15.000,50"), 15000.5);
a.equal(parseIdNumber("15000.5"), 15000.5);
a.equal(parseIdNumber("1.234.567"), 1234567);
a.ok(Number.isNaN(parseIdNumber("abc")));
a.ok(Number.isNaN(parseIdNumber("")));
// formula injection escaped on export
a.equal(escapeCsvCell("=SUM(A1)"), "'=SUM(A1)");
a.equal(escapeCsvCell("+1"), "'+1");
a.equal(escapeCsvCell("@x"), "'@x");
a.equal(escapeCsvCell(-5), "-5");
a.ok(toCsv(["a"], [["b"]]).startsWith("﻿a"));
// pricelist: shuffled header, defaults, apostrophe, negative
const r = parsePricelistCsv("HARGA,Satuan,NAMA,aktif\n\"15.000,50\",kg,'=Beras,\n-1,kg,Gula,tidak\n10,kg,,ya");
a.equal(r.error, undefined);
a.equal(r.rows[0]?.line, 2);
a.equal(r.rows[0]?.name, "=Beras");
a.equal(r.rows[0]?.unit, "kg");
a.equal(r.rows[0]?.price, 15000.5);
a.equal(r.rows[0]?.category, "Umum");
a.equal(r.rows[0]?.is_active, true);
a.equal(r.rows[1]?.error, "Harga tidak boleh negatif");
a.equal(r.rows[2]?.error, "Nama wajib diisi");
// pricelist: missing required column rejected
a.ok(parsePricelistCsv("nama;kategori\nA;B").error?.includes("satuan"));

console.log("PASS: csv + pricelist parser");

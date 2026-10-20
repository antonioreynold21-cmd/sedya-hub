import { describe, expect, test } from "bun:test";
import { escapeCsvCell, parseCsv, parseIdNumber, toCsv } from "./csv";
import { parsePricelistCsv } from "./pricelist-csv";

describe("csv", () => {
  test("BOM + semicolon + quotes", () => {
    expect(parseCsv('\uFEFFa;b\r\n"x;y";"he said ""hi"""\r\n\r\n')).toEqual([["a", "b"], ["x;y", 'he said "hi"']]);
  });
  test("comma delimiter detected", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([["a", "b"], ["1", "2"]]);
  });
  test("price formats", () => {
    expect(parseIdNumber("15000")).toBe(15000);
    expect(parseIdNumber("15.000")).toBe(15000);
    expect(parseIdNumber("15.000,50")).toBe(15000.5);
    expect(parseIdNumber("15000.5")).toBe(15000.5);
    expect(parseIdNumber("1.234.567")).toBe(1234567);
    expect(parseIdNumber("abc")).toBeNaN();
    expect(parseIdNumber("")).toBeNaN();
  });
  test("formula injection escaped on export", () => {
    expect(escapeCsvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(escapeCsvCell("+1")).toBe("'+1");
    expect(escapeCsvCell("@x")).toBe("'@x");
    expect(escapeCsvCell(-5)).toBe("-5");
    expect(toCsv(["a"], [["b"]]).startsWith("\uFEFFa")).toBe(true);
  });
  test("pricelist: shuffled header, defaults, apostrophe, negative", () => {
    const r = parsePricelistCsv("HARGA,Satuan,NAMA,aktif\n\"15.000,50\",kg,'=Beras,\n-1,kg,Gula,tidak\n10,kg,,ya");
    expect(r.error).toBeUndefined();
    expect(r.rows[0]).toMatchObject({ line: 2, name: "=Beras", unit: "kg", price: 15000.5, category: "Umum", is_active: true });
    expect(r.rows[1].error).toBe("Harga tidak boleh negatif");
    expect(r.rows[2].error).toBe("Nama wajib diisi");
  });
  test("pricelist: missing required column rejected", () => {
    expect(parsePricelistCsv("nama;kategori\nA;B").error).toContain("satuan");
  });
});

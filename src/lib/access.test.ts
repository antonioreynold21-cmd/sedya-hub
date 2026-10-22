import { strict as assert } from "node:assert";
import { MODULES, moduleForPath } from "./access";

assert.deepEqual(MODULES.find(m => m.key === "pembelanjaan"), { key: "pembelanjaan", label: "Pembelanjaan", url: "/pembelanjaan" });
assert.equal(moduleForPath("/pembelanjaan"), "pembelanjaan");
assert.equal(moduleForPath("/pembelanjaan/vendor-default"), "pembelanjaan");
assert.equal(moduleForPath("/pembelanjaan-lain"), null);
console.log("PASS: modul Pembelanjaan dan batas pemetaan akses");
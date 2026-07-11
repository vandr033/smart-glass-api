import assert from "node:assert/strict";
import test from "node:test";
import { buildSimplePdf, paginatePdfLines, wrapPdfText } from "./simple-pdf.js";
test("envuelve descripciones largas sin perder palabras", () => {
    const lines = wrapPdfText("Una descripción extensa de producto para una cotización comercial", 24);
    assert.ok(lines.length > 1);
    assert.equal(lines.join(" "), "Una descripción extensa de producto para una cotización comercial");
});
test("genera un PDF válido con varias páginas y pies numerados", () => {
    const pages = paginatePdfLines(Array.from({ length: 100 }, (_, index) => `Línea ${index + 1}`), { header: ["Documento comercial"] });
    const pdf = buildSimplePdf(pages).toString("latin1");
    assert.ok(pdf.startsWith("%PDF-1.4"));
    assert.match(pdf, /\/Count 2/);
    assert.match(pdf, /P\xE1gina 1 de 2/);
    assert.match(pdf, /P\xE1gina 2 de 2/);
});
//# sourceMappingURL=simple-pdf.test.js.map
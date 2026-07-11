import { Buffer } from "node:buffer";

type PdfPage = {
  lines: string[];
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const LEFT_MARGIN = 42;
const TOP_MARGIN = 48;
const BOTTOM_MARGIN = 42;
const LINE_HEIGHT = 13;

const WIN_ANSI_SPECIAL_CHARACTERS: Record<string, number> = {
  Á: 0xc1,
  É: 0xc9,
  Í: 0xcd,
  Ó: 0xd3,
  Ú: 0xda,
  á: 0xe1,
  é: 0xe9,
  í: 0xed,
  ó: 0xf3,
  ú: 0xfa,
  Ñ: 0xd1,
  ñ: 0xf1,
  Ü: 0xdc,
  ü: 0xfc,
  "¿": 0xbf,
  "¡": 0xa1,
};

const toWinAnsi = (value: string): Buffer => {
  const bytes: number[] = [];

  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 32;
    bytes.push(
      WIN_ANSI_SPECIAL_CHARACTERS[character] ??
        (codePoint >= 32 && codePoint <= 126 ? codePoint : 32),
    );
  }

  return Buffer.from(bytes);
};

const escapePdfBytes = (value: string): Buffer => {
  const source = toWinAnsi(value);
  const escaped: number[] = [];

  for (const byte of source) {
    if (byte === 0x28 || byte === 0x29 || byte === 0x5c) {
      escaped.push(0x5c);
    }

    escaped.push(byte);
  }

  return Buffer.from(escaped);
};

const createTextStream = (page: PdfPage, pageNumber: number, totalPages: number): Buffer => {
  const chunks: Buffer[] = [];
  const push = (value: string | Buffer) => {
    chunks.push(typeof value === "string" ? Buffer.from(value, "ascii") : value);
  };

  push("q 0.08 0.16 0.28 rg 42 790 511 1 re f Q\n");
  push("BT /F1 8 Tf 42 26 Td ");
  push(escapePdfBytes(`Vidriera Sebitas ERP · Página ${pageNumber} de ${totalPages}`));
  push(" Tj ET\n");

  let y = PAGE_HEIGHT - TOP_MARGIN;

  for (const line of page.lines) {
    const isHeading = line.startsWith("## ");
    const text = isHeading ? line.slice(3) : line;
    const fontSize = isHeading ? 11 : 9;
    const color = isHeading ? "0.08 0.16 0.28" : "0.12 0.12 0.12";

    push(`BT /F1 ${fontSize} Tf ${color} rg ${LEFT_MARGIN} ${y} Td `);
    push(escapePdfBytes(text));
    push(" Tj ET\n");
    y -= isHeading ? LINE_HEIGHT + 5 : LINE_HEIGHT;
  }

  return Buffer.concat(chunks);
};

const createPdfObject = (body: Buffer | string): Buffer => {
  return typeof body === "string" ? Buffer.from(body, "ascii") : body;
};

export const buildSimplePdf = (pages: PdfPage[]): Buffer => {
  const objects: Buffer[] = [];
  const addObject = (body: Buffer | string): number => {
    objects.push(createPdfObject(body));
    return objects.length;
  };

  const catalogId = addObject("<< /Type /Catalog /Pages 2 0 R >>");
  const pagesId = addObject("");
  const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const pageIds: number[] = [];

  pages.forEach((page, index) => {
    const stream = createTextStream(page, index + 1, pages.length);
    const contentId = addObject(
      Buffer.concat([
        Buffer.from(`<< /Length ${stream.length} >>\nstream\n`, "ascii"),
        stream,
        Buffer.from("endstream", "ascii"),
      ]),
    );
    pageIds.push(
      addObject(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`,
      ),
    );
  });

  objects[pagesId - 1] = createPdfObject(
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`,
  );

  const header = Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "binary");
  const bodyChunks: Buffer[] = [header];
  const offsets: number[] = [0];
  let offset = header.length;

  objects.forEach((object, index) => {
    offsets.push(offset);
    const objectHeader = Buffer.from(`${index + 1} 0 obj\n`, "ascii");
    const objectFooter = Buffer.from("\nendobj\n", "ascii");
    bodyChunks.push(objectHeader, object, objectFooter);
    offset += objectHeader.length + object.length + objectFooter.length;
  });

  const xrefOffset = offset;
  bodyChunks.push(Buffer.from(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`, "ascii"));
  offsets.slice(1).forEach((objectOffset) => {
    bodyChunks.push(Buffer.from(`${String(objectOffset).padStart(10, "0")} 00000 n \n`, "ascii"));
  });
  bodyChunks.push(
    Buffer.from(
      `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
      "ascii",
    ),
  );

  return Buffer.concat(bodyChunks);
};

export const wrapPdfText = (value: string, width: number): string[] => {
  const words = value.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return [""];
  }

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (word.length > width) {
      if (current) {
        lines.push(current);
        current = "";
      }

      for (let index = 0; index < word.length; index += width) {
        lines.push(word.slice(index, index + width));
      }

      continue;
    }

    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > width) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
};

export const paginatePdfLines = (
  lines: string[],
  options: { header: string[]; linesPerPage?: number },
): PdfPage[] => {
  const linesPerPage = options.linesPerPage ?? Math.floor((PAGE_HEIGHT - TOP_MARGIN - BOTTOM_MARGIN) / LINE_HEIGHT);
  const pages: PdfPage[] = [];

  for (let index = 0; index < lines.length; index += linesPerPage) {
    pages.push({
      lines: [...options.header, ...lines.slice(index, index + linesPerPage - options.header.length)],
    });
  }

  return pages.length > 0 ? pages : [{ lines: options.header }];
};

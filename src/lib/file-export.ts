/**
 * Geração de arquivos no navegador a partir da resposta da IA.
 */

export type ParsedBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullet"; text: string }
  | { type: "table"; rows: string[][] };

const cleanInline = (text: string) =>
  text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .trim();

export function parseMarkdown(markdown: string): ParsedBlock[] {
  const lines = markdown.split("\n");
  const blocks: ParsedBlock[] = [];
  let paragraph: string[] = [];
  let table: string[][] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: "paragraph", text: cleanInline(paragraph.join(" ")) });
      paragraph = [];
    }
  };
  const flushTable = () => {
    if (table.length) {
      blocks.push({ type: "table", rows: table });
      table = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.startsWith("|") && line.endsWith("|")) {
      flushParagraph();
      const cells = line
        .slice(1, -1)
        .split("|")
        .map((c) => cleanInline(c));
      const isSeparator = cells.every((c) => /^:?-{2,}:?$/.test(c.replace(/\s/g, "")));
      if (!isSeparator) table.push(cells);
      continue;
    }
    flushTable();

    if (!line) {
      flushParagraph();
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      blocks.push({
        type: "heading",
        level: heading[1]!.length,
        text: cleanInline(heading[2]!),
      });
      continue;
    }

    if (/^([-*+]|\d+\.)\s+/.test(line)) {
      flushParagraph();
      blocks.push({ type: "bullet", text: cleanInline(line.replace(/^([-*+]|\d+\.)\s+/, "")) });
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  flushTable();
  return blocks;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function baseName(blocks: ParsedBlock[]) {
  const heading = blocks.find((b) => b.type === "heading") as
    | { type: "heading"; text: string }
    | undefined;
  const raw = heading?.text ?? "infinity-ai";
  return (
    raw
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "infinity-ai"
  );
}

export function downloadTxt(content: string) {
  const blocks = parseMarkdown(content);
  const text = blocks
    .map((b) => {
      if (b.type === "table") return b.rows.map((r) => r.join("\t")).join("\n");
      if (b.type === "bullet") return `- ${b.text}`;
      if (b.type === "heading") return `\n${b.text.toUpperCase()}\n`;
      return b.text;
    })
    .join("\n");
  download(new Blob([text], { type: "text/plain;charset=utf-8" }), `${baseName(blocks)}.txt`);
}

export async function downloadDocx(content: string) {
  const blocks = parseMarkdown(content);
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } =
    await import("docx");

  const headingFor = (level: number) =>
    level <= 1
      ? HeadingLevel.HEADING_1
      : level === 2
        ? HeadingLevel.HEADING_2
        : HeadingLevel.HEADING_3;

  const children: object[] = [];
  for (const block of blocks) {
    if (block.type === "heading") {
      children.push(
        new Paragraph({
          heading: headingFor(block.level),
          children: [new TextRun({ text: block.text, bold: true })],
        }),
      );
    } else if (block.type === "bullet") {
      children.push(
        new Paragraph({ bullet: { level: 0 }, children: [new TextRun(block.text)] }),
      );
    } else if (block.type === "table") {
      const columns = Math.max(...block.rows.map((r) => r.length));
      const width = Math.floor(9360 / Math.max(columns, 1));
      children.push(
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: Array.from({ length: columns }, () => width),
          rows: block.rows.map(
            (row, rowIndex) =>
              new TableRow({
                children: Array.from({ length: columns }, (_, i) => i).map(
                  (i) =>
                    new TableCell({
                      width: { size: width, type: WidthType.DXA },
                      margins: { top: 80, bottom: 80, left: 120, right: 120 },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: row[i] ?? "", bold: rowIndex === 0 }),
                          ],
                        }),
                      ],
                    }),
                ),
              }),
          ),
        }),
      );
      children.push(new Paragraph({ children: [new TextRun("")] }));
    } else {
      children.push(new Paragraph({ children: [new TextRun(block.text)] }));
    }
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: "Arial", size: 24 } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        children: children as any,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  download(blob, `${baseName(blocks)}.docx`);
}

export async function downloadXlsx(content: string) {
  const blocks = parseMarkdown(content);
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Infinity AI");

  const tables = blocks.filter((b) => b.type === "table") as Extract<
    ParsedBlock,
    { type: "table" }
  >[];

  if (tables.length > 0) {
    for (const table of tables) {
      table.rows.forEach((row, index) => {
        const added = sheet.addRow(row);
        if (index === 0) added.font = { bold: true };
      });
      sheet.addRow([]);
    }
  } else {
    sheet.addRow(["Conteúdo"]).font = { bold: true };
    for (const block of blocks) {
      if (block.type === "table") continue;
      if (block.type === "heading") sheet.addRow([block.text]).font = { bold: true };
      else sheet.addRow([block.text]);
    }

  }

  sheet.columns.forEach((column) => {
    let max = 12;
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      max = Math.max(max, String(cell.value ?? "").length + 2);
    });
    column.width = Math.min(max, 60);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  download(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${baseName(blocks)}.xlsx`,
  );
}

export async function downloadPptx(content: string) {
  const blocks = parseMarkdown(content);
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";

  type Slide = { title: string; lines: string[] };
  const slides: Slide[] = [];
  let current: Slide | null = null;

  for (const block of blocks) {
    if (block.type === "heading") {
      current = { title: block.text, lines: [] };
      slides.push(current);
      continue;
    }
    if (!current) {
      current = { title: "Infinity AI", lines: [] };
      slides.push(current);
    }
    if (block.type === "table") {
      for (const row of block.rows) current.lines.push(row.join(" • "));
    } else {
      current.lines.push(block.text);
    }
  }

  if (slides.length === 0) slides.push({ title: "Infinity AI", lines: [content] });

  for (const slide of slides) {
    // Divide slides muito longos em partes sequenciais.
    const chunks: string[][] = [];
    for (let i = 0; i < Math.max(slide.lines.length, 1); i += 6) {
      chunks.push(slide.lines.slice(i, i + 6));
    }
    chunks.forEach((chunk, index) => {
      const s = pptx.addSlide();
      s.background = { color: "12141C" };
      s.addText(index === 0 ? slide.title : `${slide.title} (${index + 1})`, {
        x: 0.5,
        y: 0.4,
        w: 9,
        h: 0.9,
        fontSize: 28,
        bold: true,
        color: "7CC7FF",
      });
      if (chunk.length) {
        s.addText(
          chunk.map((line) => ({ text: line, options: { bullet: true, breakLine: true } })),
          { x: 0.6, y: 1.5, w: 8.8, h: 3.6, fontSize: 16, color: "FFFFFF" },
        );
      }
    });
  }

  const blob = (await pptx.write({ outputType: "blob" })) as Blob;
  download(blob, `${baseName(blocks)}.pptx`);
}

const DOC_KEYWORDS = [
  "relatório",
  "relatorio",
  "documento",
  "tabela",
  "planilha",
  "excel",
  "word",
  "powerpoint",
  "apresentação",
  "apresentacao",
  "slides",
  "slide",
  "pptx",
  "docx",
  "xlsx",
  "csv",
  "cronograma",
  "plano",
  "resumo",
  "proposta",
  "orçamento",
  "orcamento",
];

/** Decide se a barra de downloads deve aparecer abaixo da resposta. */
export function shouldOfferDownloads(userPrompt: string, answer: string) {
  const prompt = userPrompt.toLowerCase();
  if (DOC_KEYWORDS.some((k) => prompt.includes(k))) return true;
  if (/^\s*\|.*\|/m.test(answer)) return true;
  return /^#{1,3}\s+/m.test(answer) && answer.length > 400;
}

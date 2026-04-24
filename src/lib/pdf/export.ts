import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function createCaseBundlePdf(input: {
  caseTitle: string;
  summary: string;
  timeline: Array<{ title: string; date: string }>;
  deadlines: Array<{ title: string; date: string }>;
}) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 790;
  page.drawText("MIZAN Case Bundle", {
    x: 40,
    y,
    size: 20,
    font: bold,
    color: rgb(0.09, 0.16, 0.31)
  });

  y -= 32;
  page.drawText(`Case: ${input.caseTitle}`, { x: 40, y, size: 12, font: bold });

  y -= 26;
  page.drawText("Summary", { x: 40, y, size: 14, font: bold });
  y -= 18;
  page.drawText(input.summary.slice(0, 850), {
    x: 40,
    y,
    size: 10,
    font,
    maxWidth: 510,
    lineHeight: 13
  });

  y -= 130;
  page.drawText("Timeline", { x: 40, y, size: 14, font: bold });
  y -= 18;
  input.timeline.slice(0, 6).forEach((item) => {
    page.drawText(`• ${item.date} — ${item.title}`, { x: 50, y, size: 10, font });
    y -= 15;
  });

  y -= 18;
  page.drawText("Deadlines", { x: 40, y, size: 14, font: bold });
  y -= 18;
  input.deadlines.slice(0, 6).forEach((item) => {
    page.drawText(`• ${item.date} — ${item.title}`, { x: 50, y, size: 10, font });
    y -= 15;
  });

  const bytes = await pdfDoc.save();
  const outputDir = path.join(process.cwd(), "public", "exports");
  await fs.mkdir(outputDir, { recursive: true });
  const fileName = `case-bundle-${Date.now()}.pdf`;
  const absolutePath = path.join(outputDir, fileName);
  await fs.writeFile(absolutePath, bytes);

  return {
    absolutePath,
    publicPath: `/exports/${fileName}`
  };
}

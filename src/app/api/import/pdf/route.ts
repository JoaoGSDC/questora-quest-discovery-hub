import { NextResponse } from "next/server";
import { importPdfBuffer } from "@/services/pdfImportService";
import { seedIfEmpty } from "@/db/seed";

export const runtime = "nodejs";

export async function POST(req: Request) {
  await seedIfEmpty();
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo PDF obrigatório" }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
    return NextResponse.json({ error: "Envie um arquivo .pdf" }, { status: 400 });
  }
  const buffer = await file.arrayBuffer();
  const result = await importPdfBuffer(buffer);
  return NextResponse.json(result);
}

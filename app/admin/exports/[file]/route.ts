import { NextResponse, type NextRequest } from "next/server";
import { getAdmin } from "@/lib/admin/auth";
import { buildExport } from "@/lib/admin/exports";

/** CSV download (admin session required). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  if (!(await getAdmin())) return NextResponse.redirect(new URL("/admin/login", request.url), 303);
  const { file } = await params;
  const out = await buildExport(file.replace(/\.csv$/, ""));
  if (!out) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(out.csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${out.name}"`,
      "Cache-Control": "no-store",
    },
  });
}

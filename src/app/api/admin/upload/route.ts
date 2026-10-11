import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadImage } from "@/lib/cloudinary";
import { canUploadMedia } from "@/lib/permissions";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !canUploadMedia((session.user as any).role)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { dataUrl, folder } = await req.json();
  const url = await uploadImage(dataUrl, folder ?? "articles");
  return NextResponse.json({ url });
}

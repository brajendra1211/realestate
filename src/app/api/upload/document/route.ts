import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { saveUploadedDocument, UploadValidationError } from "@/lib/upload";

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  try {
    const result = await saveUploadedDocument(file);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Document upload failed", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveAgentListingImage, UploadValidationError } from "@/lib/upload";

// Photos for the owner's details form. The owner has no account — the one-time
// link token (only valid once a partner has accepted the request) is the credential.
export async function POST(request: Request) {
  const formData = await request.formData();
  const token = String(formData.get("token") ?? "");
  const file = formData.get("file");

  const req = token ? await prisma.listingRequest.findUnique({ where: { formToken: token }, select: { status: true } }) : null;
  if (!req || (req.status !== "DETAILS_PENDING" && req.status !== "ACCEPTED" && req.status !== "LINK_SENT")) {
    return NextResponse.json({ error: "This link is not active." }, { status: 401 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  try {
    return NextResponse.json(await saveAgentListingImage(file), { status: 201 });
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Owner listing image upload failed", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

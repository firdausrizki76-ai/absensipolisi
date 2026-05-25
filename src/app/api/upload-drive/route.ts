import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { nrp, image } = await req.json();

    if (!nrp || !image) {
      return NextResponse.json({ error: "Missing nrp or image" }, { status: 400 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    // Check if Google credentials are fully configured
    const isGoogleConfigured = clientId && clientSecret && refreshToken;

    if (!isGoogleConfigured) {
      console.warn(
        "Google Drive credentials not fully configured in .env.local. Falling back to Supabase database storage."
      );
      
      // Direct update to Supabase (base64 image storage)
      const { error: dbError } = await supabase
        .from("personel")
        .update({ foto_url: image })
        .eq("nrp", nrp);

      if (dbError) {
        return NextResponse.json(
          { error: `Database fallback failed: ${dbError.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        url: image,
        fallback: true,
        message: "Stored directly in database (Google Drive not configured)."
      });
    }

    // 1. Get access token from refresh token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      return NextResponse.json(
        { error: `Failed to exchange refresh token: ${errorText}` },
        { status: 500 }
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Access token is missing from Google token response" },
        { status: 500 }
      );
    }

    // 2. Prepare upload payload
    const boundary = "foo_boundary_marker";
    const metadata = {
      name: `foto_nrp_${nrp}_${Date.now()}.png`,
      mimeType: "image/png",
      ...(folderId ? { parents: [folderId] } : {}),
    };

    // Extract base64 content
    const base64Data = image.includes(",") ? image.split(",")[1] : image;

    const multipartBody = 
      `\r\n--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      JSON.stringify(metadata) +
      `\r\n--${boundary}\r\n` +
      `Content-Type: image/png\r\n` +
      `Content-Transfer-Encoding: base64\r\n\r\n` +
      base64Data +
      `\r\n--${boundary}--`;

    // 3. Upload file to Google Drive
    const uploadResponse = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body: multipartBody,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      return NextResponse.json(
        { error: `Google Drive file upload failed: ${errorText}` },
        { status: 500 }
      );
    }

    const uploadData = await uploadResponse.json();
    const fileId = uploadData.id;

    if (!fileId) {
      return NextResponse.json(
        { error: "Failed to retrieve uploaded file ID from Google Drive" },
        { status: 500 }
      );
    }

    // 4. Update permissions to public (anyone can read)
    const permissionResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: "reader",
          type: "anyone",
        }),
      }
    );

    if (!permissionResponse.ok) {
      const errorText = await permissionResponse.text();
      return NextResponse.json(
        { error: `Failed to set Google Drive file permissions to public: ${errorText}` },
        { status: 500 }
      );
    }

    // 5. Construct public link
    const publicUrl = `https://lh3.googleusercontent.com/d/${fileId}`;

    // 6. Save public link to Supabase
    const { error: dbError } = await supabase
      .from("personel")
      .update({ foto_url: publicUrl })
      .eq("nrp", nrp);

    if (dbError) {
      return NextResponse.json(
        { error: `Database update with Google Drive URL failed: ${dbError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileId: fileId,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

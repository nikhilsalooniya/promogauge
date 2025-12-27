export async function handleFaviconUpload(request: Request, env: any): Promise<Response> {
  try {
    // Verify admin access
    const authHeader = request.headers.get("Cookie");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("favicon") as File;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate file type
    const allowedTypes = ["image/x-icon", "image/vnd.microsoft.icon", "image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: "Invalid file type. Please upload ICO, PNG, JPG, or SVG" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "File size must be less than 2MB" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.name.split(".").pop() || "ico";
    const filename = `favicon-${timestamp}.${extension}`;

    // Upload to R2
    const arrayBuffer = await file.arrayBuffer();
    await env.R2_BUCKET.put(filename, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // Generate public URL - use the files API endpoint for consistency
    const url = `/api/files/${filename}`;

    return new Response(JSON.stringify({ url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Favicon upload error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to upload favicon" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

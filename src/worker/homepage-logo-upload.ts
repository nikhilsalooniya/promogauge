// Homepage logo upload endpoint handler
import { Context } from "hono";

export async function handleHomepageLogoUpload(c: Context<{ Bindings: Env }>) {
  try {
    const formData = await c.req.formData();
    const file = formData.get("logo");

    if (!file || !(file instanceof File)) {
      return c.json({ error: "No file provided" }, 400);
    }

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: "Invalid file type. Only images are allowed." }, 400);
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return c.json({ error: "File size must be less than 5MB." }, 400);
    }

    // Generate a unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split(".").pop();
    const filename = `${timestamp}.${fileExtension}`;
    const key = `homepage/logo/${filename}`;

    // Upload to R2 with optimization metadata
    await c.env.R2_BUCKET.put(key, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: {
        optimized: "true",
        uploadedAt: new Date().toISOString(),
      },
    });

    // Generate public URL
    const publicUrl = `/api/files/${key}`;

    return c.json({ url: publicUrl });
  } catch (error) {
    console.error("Homepage logo upload error:", error);
    return c.json({ error: "Failed to upload logo" }, 500);
  }
}

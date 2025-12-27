// Benefit image upload endpoint handler
import { Context } from "hono";

export async function handleBenefitImageUpload(c: Context<{ Bindings: Env }>) {
  try {
    const formData = await c.req.formData();
    const file = formData.get("image");

    if (!file || !(file instanceof File)) {
      return c.json({ error: "No file provided" }, 400);
    }

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: "Invalid file type. Only images are allowed." }, 400);
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return c.json({ error: "File size must be less than 10MB." }, 400);
    }

    // Generate a unique filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const fileExtension = file.name.split(".").pop();
    const filename = `${timestamp}-${random}.${fileExtension}`;
    const key = `homepage/benefits/${filename}`;

    // Upload to R2
    await c.env.R2_BUCKET.put(key, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: {
        uploadedAt: new Date().toISOString(),
        recommendedDimensions: "600x400",
      },
    });

    // Generate public URL
    const publicUrl = `/api/files/${key}`;

    return c.json({ url: publicUrl });
  } catch (error) {
    console.error("Benefit image upload error:", error);
    return c.json({ error: "Failed to upload image" }, 500);
  }
}

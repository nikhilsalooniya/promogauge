// Template background image upload handler

export async function handleTemplateBackgroundUpload(
  templateId: string,
  file: File,
  R2_BUCKET: R2Bucket
): Promise<{ url: string }> {
  // Validate file type
  const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "image/svg+xml"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Invalid file type. Only images are allowed.");
  }

  // Validate file size (10MB for backgrounds)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("File size must be less than 10MB.");
  }

  // Generate a unique filename
  const timestamp = Date.now();
  const fileExtension = file.name.split(".").pop();
  const filename = `${timestamp}.${fileExtension}`;
  const key = `templates/${templateId}/background/${filename}`;

  // Upload to R2
  await R2_BUCKET.put(key, await file.arrayBuffer(), {
    httpMetadata: {
      contentType: file.type,
    },
  });

  // Generate public URL
  const publicUrl = `/api/files/${key}`;

  return { url: publicUrl };
}

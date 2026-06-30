export function getAttachmentContentDisposition(filePath: string): string {
  const rawFileName = filePath.split(/[\\/]/).filter(Boolean).pop() || "file"
  const safeFileName = rawFileName.replace(/["\r\n\\]/g, "_").trim() || "file"

  return `attachment; filename="${safeFileName}"`
}

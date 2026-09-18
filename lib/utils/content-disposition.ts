export const formatDownloadContentDisposition = (filePath: string): string => {
  const rawFilename = filePath.split("/").pop() ?? "download"
  const sanitizedAscii = rawFilename.replace(/[\r\n"]/g, "_")
  return `attachment; filename="${sanitizedAscii}"`
}

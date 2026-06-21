const encodeRfc5987Value = (value: string): string =>
  encodeURIComponent(value).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  )

export const getAttachmentContentDisposition = (fileName: string): string => {
  const asciiFallback =
    fileName
      .replace(/[^\x20-\x7e]/g, "_")
      .replace(/["\\]/g, "_")
      .replace(/[\r\n]/g, "_") || "file"

  const fallback = `attachment; filename="${asciiFallback}"`

  if (asciiFallback === fileName) {
    return fallback
  }

  return `${fallback}; filename*=UTF-8''${encodeRfc5987Value(fileName)}`
}

/** Inspect dimensions before asking Electron to allocate decoded pixels. */
export function validateArtwork(bytes: Buffer, pngOnly = false) {
  if (bytes.length > 5 * 1024 * 1024 || bytes.length < 24)
    throw Error('Choose artwork up to 5 MB.')
  let width = 0,
    height = 0
  if (bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') {
    width = bytes.readUInt32BE(16)
    height = bytes.readUInt32BE(20)
  } else if (!pngOnly && bytes[0] === 255 && bytes[1] === 216) {
    let offset = 2
    while (offset + 4 <= bytes.length) {
      if (bytes[offset++] !== 255) throw Error('Invalid JPEG image.')
      while (bytes[offset] === 255) offset++
      const marker = bytes[offset++]
      if (marker === 217 || marker === 218) break
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue
      if (offset + 2 > bytes.length) break
      const length = bytes.readUInt16BE(offset)
      if (length < 2 || offset + length > bytes.length) break
      if (
        [
          192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207,
        ].includes(marker) &&
        length >= 8
      ) {
        height = bytes.readUInt16BE(offset + 3)
        width = bytes.readUInt16BE(offset + 5)
        break
      }
      offset += length
    }
  }
  if (!width || !height || width > 4096 || height > 4096)
    throw Error('Choose PNG or JPEG artwork up to 4096 pixels per side.')
  return { width, height }
}

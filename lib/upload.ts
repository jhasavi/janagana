/**
 * Cloudinary file upload helper.
 * Used by server actions for avatar and document uploads.
 *
 * Required env vars (one of):
 *   CLOUDINARY_URL  (e.g. cloudinary://api_key:api_secret@cloud_name) — preferred
 *   OR separately: CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET
 */
import { v2 as cloudinary } from 'cloudinary'

function isCloudinaryConfigured(): boolean {
  return !!(process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME)
}

function configure() {
  if (process.env.CLOUDINARY_URL) {
    // SDK auto-reads CLOUDINARY_URL when no explicit config is passed
    cloudinary.config(true)
  } else {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    })
  }
}

/**
 * Upload a File object to Cloudinary.
 * Returns the Cloudinary upload result (secure_url, public_id, etc.)
 */
export async function uploadFile(
  file: File,
  folder = 'janagana'
): Promise<{ secure_url: string; public_id: string }> {
  if (!isCloudinaryConfigured()) {
    throw new Error('[uploadFile] Cloudinary is not configured — set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME')
  }
  configure()

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder, resource_type: 'auto' }, (error, result) => {
        if (error || !result) return reject(error ?? new Error('Empty Cloudinary result'))
        resolve({ secure_url: result.secure_url, public_id: result.public_id })
      })
      .end(buffer)
  })
}

/**
 * Delete a file from Cloudinary by its public_id.
 */
export async function deleteFile(publicId: string): Promise<void> {
  if (!isCloudinaryConfigured()) {
    throw new Error('[deleteFile] Cloudinary is not configured — set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME')
  }
  configure()
  await cloudinary.uploader.destroy(publicId)
}

import type { AttachmentInput } from './types'

export async function uploadAttachment(
  file: File | Blob,
  fileName: string,
  mimeType: string,
  onProgress?: (percent: number) => void
): Promise<AttachmentInput> {
  const formData = new FormData()
  formData.append('file', file, fileName)
  formData.append('mimeType', mimeType)
  formData.append('fileName', fileName)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as AttachmentInput)
        } catch {
          reject(new Error('Invalid server response.'))
        }
      } else {
        try {
          const data = JSON.parse(xhr.responseText)
          reject(new Error(data.error || 'Upload failed.'))
        } catch {
          reject(new Error('Upload failed.'))
        }
      }
    })

    xhr.addEventListener('error', () => reject(new Error('Network error during upload.')))

    xhr.open('POST', '/api/attachments/upload')
    xhr.send(formData)
  })
}
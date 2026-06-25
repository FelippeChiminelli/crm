import { supabase } from './supabaseClient'
import { updateBookingCalendar, updateBookingType } from './bookingService'

const BUCKET = 'booking-images'
const MAX_FILE_SIZE = 2 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function validateBookingImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Formato inválido. Use JPEG, PNG ou WebP.'
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'A imagem deve ter no máximo 2 MB.'
  }
  return null
}

export async function deleteBookingImageFromStorage(imageUrl: string): Promise<void> {
  try {
    const url = new URL(imageUrl)
    const pathParts = url.pathname.split(`/${BUCKET}/`)
    if (pathParts.length < 2) return
    await supabase.storage.from(BUCKET).remove([pathParts[1]])
  } catch (error) {
    console.error('Erro ao deletar imagem do storage:', error)
  }
}

export async function uploadCalendarCover(
  empresaId: string,
  calendarId: string,
  file: File,
  previousUrl?: string | null
): Promise<string> {
  const validationError = validateBookingImageFile(file)
  if (validationError) throw new Error(validationError)

  const fileExt = file.name.split('.').pop() || 'jpg'
  const fileName = `${empresaId}/calendars/${calendarId}/cover.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, file, { cacheControl: '3600', upsert: true })

  if (uploadError) throw uploadError

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName)
  const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`

  await updateBookingCalendar(calendarId, { cover_image_url: publicUrl })

  if (previousUrl) {
    await deleteBookingImageFromStorage(previousUrl)
  }

  return publicUrl
}

export async function removeCalendarCover(
  calendarId: string,
  currentUrl?: string | null
): Promise<void> {
  if (currentUrl) {
    await deleteBookingImageFromStorage(currentUrl)
  }
  await updateBookingCalendar(calendarId, { cover_image_url: null })
}

export async function uploadBookingTypeImage(
  empresaId: string,
  typeId: string,
  file: File,
  previousUrl?: string | null
): Promise<string> {
  const validationError = validateBookingImageFile(file)
  if (validationError) throw new Error(validationError)

  const fileExt = file.name.split('.').pop() || 'jpg'
  const fileName = `${empresaId}/types/${typeId}/${Date.now()}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, file, { cacheControl: '3600', upsert: false })

  if (uploadError) throw uploadError

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName)
  const publicUrl = urlData.publicUrl

  await updateBookingType(typeId, { image_url: publicUrl })

  if (previousUrl) {
    await deleteBookingImageFromStorage(previousUrl)
  }

  return publicUrl
}

export async function removeBookingTypeImage(
  typeId: string,
  currentUrl?: string | null
): Promise<void> {
  if (currentUrl) {
    await deleteBookingImageFromStorage(currentUrl)
  }
  await updateBookingType(typeId, { image_url: null })
}

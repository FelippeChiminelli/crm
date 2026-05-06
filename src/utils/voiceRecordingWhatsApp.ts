import lamejs from 'lamejs'

function baseAudioMime(m: string): string {
  return m.split(';')[0].trim().toLowerCase()
}

/** Tipos MIME comuns aceitos pela API WhatsApp Cloud (Meta). WebM não está na lista. */
function isWhatsAppFriendlyMime(mime: string): boolean {
  const b = baseAudioMime(mime)
  return (
    b === 'audio/ogg' ||
    b === 'audio/mpeg' ||
    b === 'audio/mp3' ||
    b === 'audio/mp4' ||
    b === 'audio/aac' ||
    b === 'audio/amr' ||
    b === 'audio/opus' ||
    b === 'audio/x-m4a'
  )
}

function floatTo16(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length)
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]))
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return out
}

function downmixMono(buffer: AudioBuffer): Int16Array {
  const len = buffer.length
  const ch0 = buffer.getChannelData(0)
  if (buffer.numberOfChannels === 1) return floatTo16(ch0)
  const mix = new Float32Array(len)
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const ch = buffer.getChannelData(c)
    for (let i = 0; i < len; i++) mix[i] += ch[i] / buffer.numberOfChannels
  }
  return floatTo16(mix)
}

async function resampleBuffer(buffer: AudioBuffer, targetRate: number): Promise<AudioBuffer> {
  if (buffer.sampleRate === targetRate) return buffer
  const ratio = targetRate / buffer.sampleRate
  const outLength = Math.max(1, Math.ceil(buffer.length * ratio))
  const offline = new OfflineAudioContext(buffer.numberOfChannels, outLength, targetRate)
  const src = offline.createBufferSource()
  src.buffer = buffer
  src.connect(offline.destination)
  src.start(0)
  return offline.startRendering()
}

function nearestMp3SampleRate(rate: number): number {
  const allowed = [48000, 44100, 32000] as const
  return allowed.reduce((best, r) =>
    Math.abs(r - rate) < Math.abs(best - rate) ? r : best
  )
}

async function decodeBlobToAudioBuffer(blob: Blob): Promise<AudioBuffer> {
  const arrayBuffer = await blob.arrayBuffer()
  const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new AudioContextCtor()
  try {
    return await ctx.decodeAudioData(arrayBuffer.slice(0))
  } finally {
    await ctx.close()
  }
}

async function blobToMp3File(blob: Blob): Promise<File> {
  const audioBuffer = await decodeBlobToAudioBuffer(blob)
  const targetRate = nearestMp3SampleRate(audioBuffer.sampleRate)
  const prepared = await resampleBuffer(audioBuffer, targetRate)
  const samples = downmixMono(prepared)
  const kbps = 96
  const enc = new lamejs.Mp3Encoder(1, targetRate, kbps)
  const blockSize = 1152
  const parts: BlobPart[] = []
  for (let i = 0; i < samples.length; i += blockSize) {
    const chunk = samples.subarray(i, i + blockSize)
    const buf = enc.encodeBuffer(chunk)
    if (buf.length > 0) parts.push(buf)
  }
  const tail = enc.flush()
  if (tail.length > 0) parts.push(tail)
  const mp3Blob = new Blob(parts, { type: 'audio/mpeg' })
  return new File([mp3Blob], `gravacao-${Date.now()}.mp3`, { type: 'audio/mpeg' })
}

/**
 * Preferir tipos já aceitos pelo WhatsApp (OGG/Opus nativo da gravação, MP4/M4A, MP3…).
 * Se vier WebM (Chrome), decodifica e exporta MP3 (audio/mpeg).
 */
export async function recordingBlobToWhatsAppAudioFile(blob: Blob, recorderMime: string): Promise<File> {
  const fullType = (recorderMime || blob.type || 'audio/webm').trim()

  if (isWhatsAppFriendlyMime(fullType)) {
    const b = baseAudioMime(fullType)
    const ext =
      b.includes('ogg') || b === 'audio/opus' ? 'ogg'
        : (b === 'audio/mpeg' || b === 'audio/mp3') ? 'mp3'
          : 'm4a'
    const typeAttr = blob.type || fullType.split(';')[0].trim()
    return new File([blob], `gravacao-${Date.now()}.${ext}`, { type: typeAttr || 'audio/ogg' })
  }

  return blobToMp3File(blob)
}

"use client"

const SOUND_ENABLED_KEY = "predictify-sound-enabled"

const SOUND_NAMES = ["confirm", "success"] as const
type SoundName = (typeof SOUND_NAMES)[number]

const audioCache = new Map<string, HTMLAudioElement>()

function getAudioElement(name: SoundName): HTMLAudioElement {
  let audio = audioCache.get(name)
  if (!audio) {
    audio = new Audio(`/sounds/${name}.wav`)
    audio.preload = "auto"
    audioCache.set(name, audio)
  }
  return audio
}

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return false
  try {
    return localStorage.getItem(SOUND_ENABLED_KEY) === "true"
  } catch {
    return false
  }
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(SOUND_ENABLED_KEY, enabled ? "true" : "false")
  } catch {
    /* noop */
  }
}

export function playSound(name: SoundName): void {
  if (!isSoundEnabled()) return

  try {
    const audio = getAudioElement(name)
    audio.volume = 0.5
    audio.currentTime = 0
    audio.play().catch(() => {
      /* autoplay blocked – user gesture required */
    })
  } catch {
    /* ignore audio errors */
  }
}

export interface TTSOptions {
  rate?: number   // 0.5 – 2.0
  lang?: string   // e.g. 'en-US'
  onBoundary?: (charIndex: number, charLength: number) => void
}

export interface TTSEngine {
  speak(text: string, options?: TTSOptions): Promise<void>
  stop(): void
  isAvailable(): Promise<boolean>
}

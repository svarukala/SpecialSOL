export interface AccommodationState {
  tts_enabled: boolean
  tts_speed: number           // 0.5 – 2.0
  high_contrast: boolean
  large_text: 0 | 1 | 2      // 0=18px, 1=24px, 2=30px
  dyslexia_font: boolean
  reduce_distractions: boolean
  extended_time: boolean
  hints_enabled: boolean
  positive_reinforcement: boolean
}

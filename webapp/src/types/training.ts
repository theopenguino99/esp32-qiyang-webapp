// Placeholder types for future training protocol implementation (Feature #1)

export interface RepeaterConfig {
  sets: number
  repsPerSet: number
  workDurationMs: number
  restDurationMs: number
  setRestDurationMs: number
  targetForceKg?: number
}

export interface RFDConfig {
  measureDurationMs: number
  restBetweenAttemptsMs: number
  attempts: number
}

export interface TrainingSession {
  id: string
  startedAt: number
  endedAt?: number
  type: 'free_hang' | 'repeaters' | 'rfd'
  config?: RepeaterConfig | RFDConfig
  // TODO (Feature #4): cloud sync
  // syncStatus?: 'pending' | 'synced' | 'failed'
}

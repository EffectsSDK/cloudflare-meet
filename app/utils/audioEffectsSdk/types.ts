import type { ModelType } from 'audio-effects-sdk'

export type AudioEffectsSdkConfig = {
	customerId?: string
	preset: ModelType
	sampleRate: number
	sdkUrl?: string
	wasmPaths?: Partial<Record<'ort-wasm.wasm' | 'ort-wasm-simd.wasm', string>>
}

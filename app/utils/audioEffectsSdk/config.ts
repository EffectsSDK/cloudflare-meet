import type { AudioEffectsSdkConfig } from './types'

const validPresets = new Set(['speed', 'balanced', 'quality'])
const validSampleRates = new Set([16000, 32000, 44100, 48000])
const defaultCustomerId = 'CUSROMER_ID_CLOUDFLARE_MEET'

export function normalizeAudioEffectsSdkConfig(input: {
	customerId?: string | null
	preset?: string | null
	sampleRate?: string | number | null
	sdkUrl?: string | null
	ortWasmPath?: string | null
	ortWasmSimdPath?: string | null
}): AudioEffectsSdkConfig {
	const sampleRate =
		typeof input.sampleRate === 'number'
			? input.sampleRate
			: Number(input.sampleRate)

	const wasmPaths = {
		'ort-wasm.wasm': input.ortWasmPath ?? undefined,
		'ort-wasm-simd.wasm': input.ortWasmSimdPath ?? undefined,
	}

	return {
		customerId: input.customerId?.trim() || defaultCustomerId,
		preset: validPresets.has(input.preset ?? '')
			? (input.preset as AudioEffectsSdkConfig['preset'])
			: 'balanced',
		sampleRate: validSampleRates.has(sampleRate) ? sampleRate : 32000,
		sdkUrl: input.sdkUrl?.trim() || undefined,
		wasmPaths: Object.values(wasmPaths).some(Boolean) ? wasmPaths : undefined,
	}
}

export function hasAudioEffectsSdkConfig(config?: AudioEffectsSdkConfig) {
	return Boolean(config?.customerId)
}

import type { VideoEffectsSdkConfig, VideoEffectsState } from './types'

const validProviders = new Set(['auto', 'wasm', 'webgpu'])
const validPresets = new Set(['speed', 'balanced', 'quality', 'lightning'])
const defaultCustomerId = 'CUSROMER_ID_CLOUDFLARE_MEET'
const defaultSdkVersion = '3.8.0'
const defaultSdkBaseUrl = `https://effectssdk.ai/sdk/web/${defaultSdkVersion}/`

export const defaultVideoEffectsState: VideoEffectsState = {
	backgroundMode: 'none',
	blurPower: 0.5,
	beautificationPower: 0,
	lowLightPower: 0,
}

export function clampUnitInterval(value: number) {
	if (Number.isNaN(value)) return 0
	return Math.max(0, Math.min(1, value))
}

export function normalizeVideoEffectsState(
	input?: Partial<VideoEffectsState> | null
): VideoEffectsState {
	return {
		backgroundMode:
			input?.backgroundMode === 'blur' || input?.backgroundMode === 'asset'
				? input.backgroundMode
				: 'none',
		blurPower: clampUnitInterval(
			input?.blurPower ?? defaultVideoEffectsState.blurPower
		),
		backgroundAssetId: input?.backgroundAssetId || undefined,
		beautificationPower: clampUnitInterval(input?.beautificationPower ?? 0),
		lowLightPower: clampUnitInterval(input?.lowLightPower ?? 0),
	}
}

export function hasActiveVideoEffects(state: VideoEffectsState) {
	return (
		(state.backgroundMode === 'blur' && state.blurPower > 0) ||
		(state.backgroundMode === 'asset' && Boolean(state.backgroundAssetId)) ||
		state.beautificationPower > 0 ||
		state.lowLightPower > 0
	)
}

export function normalizeVideoEffectsSdkConfig(input: {
	customerId?: string | null
	preset?: string | null
	provider?: string | null
	sdkUrl?: string | null
	ortWasmPath?: string | null
	ortWasmSimdPath?: string | null
	ortWasmThreadedPath?: string | null
	ortWasmSimdThreadedPath?: string | null
}): VideoEffectsSdkConfig {
	const wasmPaths = {
		'ort-wasm.wasm': input.ortWasmPath ?? `${defaultSdkBaseUrl}ort-wasm.wasm`,
		'ort-wasm-simd.wasm':
			input.ortWasmSimdPath ?? `${defaultSdkBaseUrl}ort-wasm-simd.wasm`,
		'ort-wasm-threaded.wasm':
			input.ortWasmThreadedPath ?? `${defaultSdkBaseUrl}ort-wasm-threaded.wasm`,
		'ort-wasm-simd-threaded.wasm':
			input.ortWasmSimdThreadedPath ??
			`${defaultSdkBaseUrl}ort-wasm-simd-threaded.wasm`,
	}

	return {
		customerId: input.customerId?.trim() || defaultCustomerId,
		preset: validPresets.has(input.preset ?? '')
			? (input.preset as VideoEffectsSdkConfig['preset'])
			: 'balanced',
		provider: validProviders.has(input.provider ?? '')
			? (input.provider as VideoEffectsSdkConfig['provider'])
			: 'auto',
		wasmPaths,
	}
}

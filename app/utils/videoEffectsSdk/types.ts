export type VideoEffectsSdkConfig = {
	customerId?: string
	preset: 'speed' | 'balanced' | 'quality' | 'lightning'
	provider: 'auto' | 'wasm' | 'webgpu'
	sdkUrl?: string
	wasmPaths?: Partial<
		Record<
			| 'ort-wasm.wasm'
			| 'ort-wasm-simd.wasm'
			| 'ort-wasm-threaded.wasm'
			| 'ort-wasm-simd-threaded.wasm',
			string
		>
	>
}

export type VideoBackgroundMode = 'none' | 'blur' | 'asset'

export type VideoEffectsState = {
	backgroundMode: VideoBackgroundMode
	blurPower: number
	backgroundAssetId?: string
	beautificationPower: number
	lowLightPower: number
}

export type StoredVideoBackgroundAsset = {
	id: string
	name: string
	kind: 'image' | 'video'
	mimeType: string
	createdAt: string
}

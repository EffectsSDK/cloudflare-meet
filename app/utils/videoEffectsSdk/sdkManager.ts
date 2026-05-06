import type { ErrorObject, tsvb } from 'effects-sdk'
import { readStoredVideoBackgroundAssetBlob } from './backgroundAssetStore'
import { hasActiveVideoEffects } from './config'
import type {
	StoredVideoBackgroundAsset,
	VideoEffectsSdkConfig,
	VideoEffectsState,
} from './types'

type VideoEffectsSdkInstance = tsvb
type TrackListener = (track: MediaStreamTrack) => void

let sdkPromise: Promise<VideoEffectsSdkInstance> | undefined
let configuredKey: string | undefined
let configuredPayload: Record<string, unknown> | undefined
let currentOutputTrack: MediaStreamTrack | undefined
let currentInputTrack: MediaStreamTrack | undefined
let sdkReady = false
let pendingRunAfterReady = false
let activeSubscriptions = 0
let desiredState: VideoEffectsState | undefined
let desiredAssets: StoredVideoBackgroundAsset[] = []
let currentBackgroundCleanup: (() => void) | undefined
let applyGeneration = 0
const listeners = new Set<TrackListener>()

function getSdkConfigPayload(config: VideoEffectsSdkConfig) {
	return {
		preset: config.preset,
		provider: config.provider,
		effects: ['virtual_background', 'color_correction', 'low_light'],
		cache_models: true,
		...(config.sdkUrl ? { sdk_url: config.sdkUrl } : {}),
		...(config.wasmPaths ? { wasmPaths: config.wasmPaths } : {}),
	}
}

function notifyTrackListeners(track: MediaStreamTrack) {
	currentOutputTrack = track
	for (const listener of listeners) listener(track)
}

function logVideoSdkEvent(event: ErrorObject) {
	if (event.type === 'error') {
		console.error('[VideoEffectsSDK] onError()', event)
		return
	}
	console.info('[VideoEffectsSDK] onError()', event)
}

async function resolveBackgroundSource(asset: StoredVideoBackgroundAsset) {
	const blob = await readStoredVideoBackgroundAssetBlob(asset.id)
	if (!blob) throw new Error(`Background asset ${asset.id} was not found.`)

	const objectUrl = URL.createObjectURL(blob)
	if (asset.kind === 'video') {
		const video = document.createElement('video')
		video.src = objectUrl
		video.loop = true
		video.muted = true
		video.playsInline = true
		await video.play()
		return {
			source: video,
			cleanup: () => {
				video.pause()
				video.removeAttribute('src')
				video.load()
				URL.revokeObjectURL(objectUrl)
			},
		}
	}

	return {
		source: objectUrl,
		options: { type: asset.mimeType },
		cleanup: () => URL.revokeObjectURL(objectUrl),
	}
}

async function applyDesiredState(sdk: VideoEffectsSdkInstance) {
	const generation = ++applyGeneration
	const state = desiredState
	if (!state) return

	currentBackgroundCleanup?.()
	currentBackgroundCleanup = undefined

	if (state.backgroundMode === 'blur' && state.blurPower > 0) {
		sdk.clearBackground()
		sdk.setBlur(state.blurPower)
	} else {
		sdk.clearBlur()
		if (state.backgroundMode === 'asset' && state.backgroundAssetId) {
			const asset = desiredAssets.find(
				(item) => item.id === state.backgroundAssetId
			)
			if (asset) {
				const resolved = await resolveBackgroundSource(asset)
				if (generation !== applyGeneration) {
					resolved.cleanup()
					return
				}
				currentBackgroundCleanup = resolved.cleanup
				sdk.setBackground(resolved.source, resolved.options)
			} else {
				sdk.clearBackground()
			}
		} else {
			sdk.clearBackground()
		}
	}

	if (state.beautificationPower > 0) {
		sdk.enableBeautification()
		sdk.setBeautificationLevel(state.beautificationPower)
	} else {
		sdk.disableBeautification()
	}

	if (state.lowLightPower > 0) {
		sdk.enableLowLightEffect()
		sdk.setLowLightEffectPower(state.lowLightPower)
	} else {
		sdk.disableLowLightEffect()
	}
}

async function getSdk(config: VideoEffectsSdkConfig) {
	const nextPayload = getSdkConfigPayload(config)
	const nextKey = JSON.stringify({
		customerId: config.customerId,
		...nextPayload,
	})

	if (configuredKey && configuredKey !== nextKey) {
		console.warn(
			'[VideoEffectsSDK] singleton already configured, ignoring new config',
			{
				active: configuredPayload,
				ignored: nextPayload,
			}
		)
	}

	if (!sdkPromise) {
		sdkPromise = import('effects-sdk').then(async ({ tsvb }) => {
			const sdk = new tsvb(config.customerId as string)
			configuredKey = nextKey
			configuredPayload = nextPayload

			console.info('[VideoEffectsSDK] create singleton')
			console.info('[VideoEffectsSDK] config()', nextPayload)

			sdk.onError(logVideoSdkEvent)
			sdk.config(nextPayload)
			sdk.onReady = () => {
				sdkReady = true
				void applyDesiredState(sdk)
					.then(() => {
						if (pendingRunAfterReady) {
							console.info('[VideoEffectsSDK] run()', { source: 'onReady' })
							sdk.run()
							pendingRunAfterReady = false
						}
						const track = sdk.getStream()?.getVideoTracks()[0]
						if (track) notifyTrackListeners(track)
					})
					.catch((error) => {
						console.error('Video Effects SDK failed to apply effects.', error)
					})
			}

			await sdk.preload()
			await sdk.cache()
			return sdk
		})
	}

	return sdkPromise
}

export async function syncSingletonVideoEffectsState(options: {
	config: VideoEffectsSdkConfig
	state: VideoEffectsState
	backgroundAssets: StoredVideoBackgroundAsset[]
}) {
	desiredState = options.state
	desiredAssets = options.backgroundAssets
	if (!sdkPromise || !sdkReady) return
	const sdk = await getSdk(options.config)
	await applyDesiredState(sdk)
	if (hasActiveVideoEffects(options.state) && currentInputTrack) {
		const track = sdk.getStream()?.getVideoTracks()[0]
		if (track) notifyTrackListeners(track)
	}
}

export async function useSingletonVideoEffectsSdkStream(
	config: VideoEffectsSdkConfig,
	track: MediaStreamTrack
) {
	const sdk = await getSdk(config)
	console.info('[VideoEffectsSDK] useStream()', {
		id: track.id,
		label: track.label,
		enabled: track.enabled,
		readyState: track.readyState,
		settings: track.getSettings(),
	})

	if (sdkReady && currentInputTrack === track) {
		console.info('[VideoEffectsSDK] run()', {
			source: 'resume-existing-stream',
		})
		sdk.run()
		const outputTrack = sdk.getStream()?.getVideoTracks()[0]
		if (outputTrack) notifyTrackListeners(outputTrack)
		return sdk
	}

	currentInputTrack = track
	sdkReady = false
	pendingRunAfterReady = true
	const stream = new MediaStream()
	stream.addTrack(track)
	sdk.useStream(stream)
	return sdk
}

export function subscribeToSingletonVideoEffectsSdkTrack(
	listener: TrackListener
) {
	listeners.add(listener)
	activeSubscriptions += 1

	if (currentOutputTrack) {
		listener(currentOutputTrack)
	}

	return async () => {
		listeners.delete(listener)
		activeSubscriptions = Math.max(0, activeSubscriptions - 1)
		if (activeSubscriptions > 0) return
		try {
			const sdk = await sdkPromise
			console.info('[VideoEffectsSDK] stop()')
			sdk?.stop()
		} catch (error) {
			console.error('Video Effects SDK failed to stop cleanly.', error)
		}
	}
}

import type { ErrorObject } from 'audio-effects-sdk'
import type { AudioEffectsSdkConfig } from './types'

type AudioEffectsSdkInstance = {
	config: (config: Record<string, unknown>) => void
	onReady?: () => void
	onError: (callback: (error: unknown) => void) => void
	preload: () => Promise<void>
	useStream: (stream: MediaStream) => void
	getAudioTrack: () => MediaStreamTrack | undefined
	run: () => void
	stop: () => void
	clear: () => void
}

type TrackListener = (track: MediaStreamTrack) => void

let sdkPromise: Promise<AudioEffectsSdkInstance> | undefined
let configuredKey: string | undefined
let configuredPayload: Record<string, unknown> | undefined
let currentProcessedTrack: MediaStreamTrack | undefined
let currentInputTrack: MediaStreamTrack | undefined
let activeSubscriptions = 0
let sdkReady = false
let pendingRunAfterReady = false
const listeners = new Set<TrackListener>()

function getSdkConfigPayload(config: AudioEffectsSdkConfig) {
	return {
		preset: config.preset,
		sample_rate: config.sampleRate,
		...(config.sdkUrl ? { sdk_url: config.sdkUrl } : {}),
		...(config.wasmPaths ? { wasmPaths: config.wasmPaths } : {}),
	}
}

async function getSdk(config: AudioEffectsSdkConfig) {
	const nextPayload = getSdkConfigPayload(config)
	const nextKey = JSON.stringify({
		customerId: config.customerId,
		...nextPayload,
	})

	if (configuredKey && configuredKey !== nextKey) {
		console.warn(
			'[AudioEffectsSDK] singleton already configured, ignoring new config',
			{
				active: configuredPayload,
				ignored: nextPayload,
			}
		)
	}

	if (!sdkPromise) {
		sdkPromise = import('audio-effects-sdk').then(({ atsvb }) => {
			const sdk = new atsvb(config.customerId)
			configuredKey = nextKey
			configuredPayload = nextPayload

			console.info('[AudioEffectsSDK] create singleton')
			console.info('[AudioEffectsSDK] config()', nextPayload)

			sdk.onError((event: ErrorObject) => {
				if (event?.type === 'error') {
					console.error('[AudioEffectsSDK] onError()', event)
					return
				}
				console.info('[AudioEffectsSDK] onError()', event)
			})

			sdk.config(nextPayload)

			sdk.onReady = () => {
				try {
					sdkReady = true
					if (pendingRunAfterReady) {
						console.info('[AudioEffectsSDK] run()', { source: 'onReady' })
						sdk.run()
						pendingRunAfterReady = false
					}
					const processedTrack = sdk.getAudioTrack()
					if (!processedTrack) return
					currentProcessedTrack = processedTrack
					for (const listener of listeners) listener(processedTrack)
				} catch (error) {
					console.error('Effects SDK failed to start audio processing.', error)
				}
			}

			void sdk.preload().catch((error) => {
				console.error('Effects SDK preload failed.', error)
			})

			return sdk
		})
	}

	return sdkPromise
}

export async function useSingletonAudioEffectsSdkStream(
	config: AudioEffectsSdkConfig,
	track: MediaStreamTrack
) {
	const sdk = await getSdk(config)
	console.info('[AudioEffectsSDK] useStream()', {
		id: track.id,
		label: track.label,
		enabled: track.enabled,
		readyState: track.readyState,
		settings: track.getSettings(),
	})
	if (sdkReady && currentInputTrack === track) {
		console.info('[AudioEffectsSDK] run()', {
			source: 'resume-existing-stream',
		})
		sdk.run()
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

export function subscribeToSingletonAudioEffectsSdkTrack(
	listener: TrackListener
) {
	listeners.add(listener)
	activeSubscriptions += 1

	if (currentProcessedTrack) {
		listener(currentProcessedTrack)
	}

	return async () => {
		listeners.delete(listener)
		activeSubscriptions = Math.max(0, activeSubscriptions - 1)
		if (activeSubscriptions > 0) return
		try {
			const sdk = await sdkPromise
			console.info('[AudioEffectsSDK] stop()')
			sdk?.stop()
		} catch (error) {
			console.error('Effects SDK failed to stop cleanly.', error)
		}
	}
}

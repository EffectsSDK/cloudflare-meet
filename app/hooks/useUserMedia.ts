import { getCamera, getMic, getScreenshare } from 'partytracks/client'
import { useObservable, useObservableAsValue } from 'partytracks/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocalStorage } from 'react-use'
import {
	getNoiseSuppressionTransform,
	type AudioEffectsSdkConfig,
} from '~/utils/audioEffectsSdk'
import { mode } from '~/utils/mode'
import {
	createVideoEffectsTrackTransform,
	defaultVideoEffectsState,
	hasActiveVideoEffects,
	normalizeVideoEffectsState,
	syncSingletonVideoEffectsState,
	type VideoEffectsSdkConfig,
	type VideoEffectsState,
} from '~/utils/videoEffectsSdk'
import { useVideoBackgroundAssets } from './useVideoBackgroundAssets'

export const errorMessageMap = {
	NotAllowedError:
		'Permission was denied. Grant permission and reload to enable.',
	NotFoundError: 'No device was found.',
	NotReadableError: 'Device is already in use.',
	OverconstrainedError: 'No device was found that meets constraints.',
	DevicesExhaustedError: 'All devices failed to initialize.',
	UnknownError: 'An unknown error occurred.',
}

type UserMediaError = keyof typeof errorMessageMap

const broadcastByDefault = mode === 'production'
export const mic = getMic({ broadcasting: broadcastByDefault })
export const camera = getCamera({
	broadcasting: true,
	constraints: { width: { ideal: 1280 }, height: { ideal: 720 } },
})
export const screenshare = getScreenshare({ audio: false })

function useNoiseSuppression(audioEffectsConfig?: AudioEffectsSdkConfig) {
	const [suppressNoise, setSuppressNoise] = useLocalStorage(
		'suppress-noise',
		false
	)
	const noiseSuppression = useMemo(
		() => getNoiseSuppressionTransform(audioEffectsConfig),
		[audioEffectsConfig]
	)
	useEffect(() => {
		if (suppressNoise) mic.addTransform(noiseSuppression)
		return () => {
			mic.removeTransform(noiseSuppression)
		}
	}, [noiseSuppression, suppressNoise])

	return [suppressNoise, setSuppressNoise] as const
}

function useVideoEffects(videoEffectsConfig: VideoEffectsSdkConfig) {
	const [storedState, setStoredState] = useLocalStorage<VideoEffectsState>(
		'video-effects',
		defaultVideoEffectsState
	)
	const videoEffects = useMemo(
		() => normalizeVideoEffectsState(storedState),
		[storedState]
	)
	const videoEffectsTransform = useMemo(
		() => createVideoEffectsTrackTransform(videoEffectsConfig),
		[videoEffectsConfig]
	)
	const backgroundAssets = useVideoBackgroundAssets()
	const videoEffectsEnabled = hasActiveVideoEffects(videoEffects)

	useEffect(() => {
		if (videoEffectsEnabled) camera.addTransform(videoEffectsTransform)
		return () => {
			camera.removeTransform(videoEffectsTransform)
		}
	}, [videoEffectsEnabled, videoEffectsTransform])

	useEffect(() => {
		void syncSingletonVideoEffectsState({
			config: videoEffectsConfig,
			state: videoEffects,
			backgroundAssets: backgroundAssets.assets,
		})
	}, [backgroundAssets.assets, videoEffects, videoEffectsConfig])

	const setVideoEffects = useCallback(
		(
			nextState:
				| VideoEffectsState
				| ((prev: VideoEffectsState) => VideoEffectsState)
		) =>
			setStoredState((currentValue) => {
				const previousState = normalizeVideoEffectsState(currentValue)
				const resolvedState =
					typeof nextState === 'function' ? nextState(previousState) : nextState
				return normalizeVideoEffectsState(resolvedState)
			}),
		[setStoredState]
	)

	return {
		videoEffects,
		setVideoEffects,
		videoEffectsEnabled,
		videoBackgroundAssets: backgroundAssets.assets,
		addVideoBackgroundAsset: backgroundAssets.addAsset,
		deleteVideoBackgroundAsset: backgroundAssets.deleteAsset,
	}
}

function useScreenshare() {
	const screenShareIsBroadcasting = useObservableAsValue(
		screenshare.video.isBroadcasting$,
		false
	)
	const startScreenShare = useCallback(() => {
		screenshare.startBroadcasting()
	}, [])
	const endScreenShare = useCallback(() => {
		screenshare.stopBroadcasting()
	}, [])

	return {
		screenShareEnabled: screenShareIsBroadcasting,
		startScreenShare,
		endScreenShare,
		screenShareVideoTrack$: screenshare.video.broadcastTrack$,
		screenShareVideoTrack: useObservableAsValue(
			screenshare.video.broadcastTrack$
		),
	}
}

export default function useUserMedia(options: {
	micDeviceId?: string
	cameraDeviceId?: string
	audioEffectsConfig?: AudioEffectsSdkConfig
	videoEffectsConfig: VideoEffectsSdkConfig
}) {
	useEffect(() => {
		if (!options.micDeviceId) return
		navigator.mediaDevices
			.enumerateDevices()
			.then((ds) => ds.find((d) => d.deviceId === options.micDeviceId))
			.then((d) => {
				d && mic.setPreferredDevice(d)
			})
	}, [options.micDeviceId])
	useEffect(() => {
		if (!options.cameraDeviceId) return
		navigator.mediaDevices
			.enumerateDevices()
			.then((ds) => ds.find((d) => d.deviceId === options.cameraDeviceId))
			.then((d) => {
				d && camera.setPreferredDevice(d)
			})
	}, [options.cameraDeviceId])

	const [suppressNoise, setSuppressNoise] = useNoiseSuppression(
		options.audioEffectsConfig
	)
	const {
		videoEffects,
		setVideoEffects,
		videoEffectsEnabled,
		videoBackgroundAssets,
		addVideoBackgroundAsset,
		deleteVideoBackgroundAsset,
	} = useVideoEffects(options.videoEffectsConfig)

	const [videoUnavailableReason, setVideoUnavailableReason] =
		useState<UserMediaError>()
	const [audioUnavailableReason, setAudioUnavailableReason] =
		useState<UserMediaError>()

	const {
		endScreenShare,
		startScreenShare,
		screenShareEnabled,
		screenShareVideoTrack,
		screenShareVideoTrack$,
	} = useScreenshare()

	const micDevices = useObservableAsValue(mic.devices$, [])
	const cameraDevices = useObservableAsValue(camera.devices$, [])

	useObservable(mic.error$, (e) => {
		const reason =
			e.name in errorMessageMap ? (e.name as UserMediaError) : 'UnknownError'
		if (reason === 'UnknownError') {
			console.error('Unknown error getting audio track: ', e)
		}
		setAudioUnavailableReason(reason)
		mic.stopBroadcasting()
	})

	useObservable(camera.error$, (e) => {
		const reason =
			e.name in errorMessageMap ? (e.name as UserMediaError) : 'UnknownError'
		if (reason === 'UnknownError') {
			console.error('Unknown error getting video track: ', e)
		}
		setVideoUnavailableReason(reason)
		camera.stopBroadcasting()
	})

	return {
		turnMicOn: mic.startBroadcasting,
		turnMicOff: mic.stopBroadcasting,
		audioStreamTrack: useObservableAsValue(mic.broadcastTrack$),
		audioMonitorStreamTrack: useObservableAsValue(mic.localMonitorTrack$),
		audioEnabled: useObservableAsValue(mic.isBroadcasting$, broadcastByDefault),
		audioUnavailableReason,
		publicAudioTrack$: mic.broadcastTrack$,
		privateAudioTrack$: mic.localMonitorTrack$,
		audioDeviceId: useObservableAsValue(mic.activeDevice$)?.deviceId,
		setAudioDeviceId: (deviceId: string) => {
			const found = micDevices.find((d) => d.deviceId === deviceId)
			if (found) mic.setPreferredDevice(found)
		},

		setVideoDeviceId: (deviceId: string) => {
			const found = cameraDevices.find((d) => d.deviceId === deviceId)
			if (found) camera.setPreferredDevice(found)
		},
		videoDeviceId: useObservableAsValue(camera.activeDevice$)?.deviceId,
		turnCameraOn: camera.startBroadcasting,
		turnCameraOff: camera.stopBroadcasting,
		videoEnabled: useObservableAsValue(camera.isBroadcasting$, true),
		videoUnavailableReason,
		videoEffects,
		setVideoEffects,
		videoEffectsEnabled,
		videoBackgroundAssets,
		addVideoBackgroundAsset,
		deleteVideoBackgroundAsset,
		suppressNoise,
		setSuppressNoise,
		videoTrack$: camera.broadcastTrack$,
		videoStreamTrack: useObservableAsValue(camera.broadcastTrack$),

		startScreenShare,
		endScreenShare,
		screenShareVideoTrack,
		screenShareEnabled,
		screenShareVideoTrack$,
	}
}

export type UserMedia = ReturnType<typeof useUserMedia>

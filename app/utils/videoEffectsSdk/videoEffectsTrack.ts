import { Observable } from 'rxjs'
import {
	subscribeToSingletonVideoEffectsSdkTrack,
	useSingletonVideoEffectsSdkStream,
} from './sdkManager'
import type { VideoEffectsSdkConfig } from './types'

export function createVideoEffectsTrackTransform(
	config: VideoEffectsSdkConfig
) {
	return function videoEffectsTrackTransform(
		originalVideoStreamTrack: MediaStreamTrack
	): Observable<MediaStreamTrack> {
		return new Observable<MediaStreamTrack>((subscriber) => {
			subscriber.next(originalVideoStreamTrack)

			if (!config.customerId) return

			let isDisposed = false
			const unsubscribe = subscribeToSingletonVideoEffectsSdkTrack(
				(processedTrack) => {
					if (isDisposed) return
					processedTrack.enabled = originalVideoStreamTrack.enabled
					subscriber.next(processedTrack)
				}
			)

			void useSingletonVideoEffectsSdkStream(
				config,
				originalVideoStreamTrack
			).catch((error) => {
				console.error('Video Effects SDK failed to initialize.', error)
			})

			subscriber.add(() => {
				isDisposed = true
				void unsubscribe()
			})
		})
	}
}

import { Observable } from 'rxjs'
import {
	subscribeToSingletonAudioEffectsSdkTrack,
	useSingletonAudioEffectsSdkStream,
} from './sdkManager'
import type { AudioEffectsSdkConfig } from './types'

export function createEffectsSdkNoiseSuppression(
	config: AudioEffectsSdkConfig
) {
	return function effectsSdkNoiseSuppression(
		originalAudioStreamTrack: MediaStreamTrack
	): Observable<MediaStreamTrack> {
		return new Observable<MediaStreamTrack>((subscriber) => {
			subscriber.next(originalAudioStreamTrack)

			if (!config.customerId) return

			let isDisposed = false
			const unsubscribe = subscribeToSingletonAudioEffectsSdkTrack(
				(processedTrack) => {
					if (isDisposed) return
					processedTrack.enabled = originalAudioStreamTrack.enabled
					subscriber.next(processedTrack)
				}
			)

			void useSingletonAudioEffectsSdkStream(
				config,
				originalAudioStreamTrack
			).catch((error) => {
				console.error('Effects SDK failed to initialize.', error)
			})

			subscriber.add(() => {
				isDisposed = true
				void unsubscribe()
			})
		})
	}
}

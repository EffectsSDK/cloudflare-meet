import legacyNoiseSuppression from '~/utils/noiseSuppression'
import { hasAudioEffectsSdkConfig } from './config'
import { createEffectsSdkNoiseSuppression } from './effectsSdkNoiseSuppression'
import type { AudioEffectsSdkConfig } from './types'

export {
	hasAudioEffectsSdkConfig,
	normalizeAudioEffectsSdkConfig,
} from './config'
export type { AudioEffectsSdkConfig } from './types'

export function getNoiseSuppressionTransform(config?: AudioEffectsSdkConfig) {
	if (!hasAudioEffectsSdkConfig(config)) return legacyNoiseSuppression
	return createEffectsSdkNoiseSuppression(config as AudioEffectsSdkConfig)
}

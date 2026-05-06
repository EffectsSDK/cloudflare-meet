import { useCallback, useEffect, useState } from 'react'
import {
	deleteStoredVideoBackgroundAsset,
	listStoredVideoBackgroundAssets,
	saveVideoBackgroundAsset,
	type StoredVideoBackgroundAsset,
} from '~/utils/videoEffectsSdk'

export function useVideoBackgroundAssets() {
	const [assets, setAssets] = useState<StoredVideoBackgroundAsset[]>([])

	const refreshAssets = useCallback(async () => {
		setAssets(await listStoredVideoBackgroundAssets())
	}, [])

	useEffect(() => {
		void refreshAssets()
	}, [refreshAssets])

	const addAsset = useCallback(
		async (file: File) => {
			const asset = await saveVideoBackgroundAsset(file)
			await refreshAssets()
			return asset
		},
		[refreshAssets]
	)

	const deleteAsset = useCallback(
		async (id: string) => {
			await deleteStoredVideoBackgroundAsset(id)
			await refreshAssets()
		},
		[refreshAssets]
	)

	return {
		assets,
		refreshAssets,
		addAsset,
		deleteAsset,
	}
}

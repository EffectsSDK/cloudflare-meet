import type { ChangeEvent, FC, ReactNode } from 'react'
import { useRef } from 'react'
import { useRoomContext } from '~/hooks/useRoomContext'
import { AudioInputSelector } from './AudioInputSelector'
import { Button } from './Button'
import {
	Dialog,
	DialogContent,
	DialogOverlay,
	DialogTitle,
	Portal,
	Trigger,
} from './Dialog'
import { Icon } from './Icon/Icon'
import { Label } from './Label'
import { Option, Select } from './Select'
import { Slider } from './Slider'
import { Toggle } from './Toggle'
import { Tooltip } from './Tooltip'
import { VideoInputSelector } from './VideoInputSelector'

interface SettingsDialogProps {
	onOpenChange?: (open: boolean) => void
	open?: boolean
	children?: ReactNode
}

export const SettingsButton = () => {
	return (
		<SettingsDialog>
			<Tooltip content="Settings">
				<Trigger asChild>
					<Button className="text-sm" displayType="secondary">
						<Icon type="cog" />
					</Button>
				</Trigger>
			</Tooltip>
		</SettingsDialog>
	)
}

export const SettingsDialog: FC<SettingsDialogProps> = ({
	onOpenChange,
	open,
	children,
}) => {
	const {
		userMedia: {
			videoEffects,
			setVideoEffects,
			videoBackgroundAssets,
			addVideoBackgroundAsset,
			deleteVideoBackgroundAsset,
			suppressNoise,
			setSuppressNoise,
		},
	} = useRoomContext()
	const backgroundUploadRef = useRef<HTMLInputElement>(null)

	function setSliderValue(
		key: 'blurPower' | 'beautificationPower' | 'lowLightPower',
		value: number
	) {
		setVideoEffects((current) => ({ ...current, [key]: value }))
	}

	async function onUploadBackground(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0]
		if (!file) return
		const asset = await addVideoBackgroundAsset(file)
		setVideoEffects((current) => ({
			...current,
			backgroundMode: 'asset',
			backgroundAssetId: asset.id,
		}))
		event.target.value = ''
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{children}
			<Portal>
				<DialogOverlay />
				<DialogContent>
					<DialogTitle>Settings</DialogTitle>
					<div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4 mt-8 items-center">
						<Label
							className="text-base -mb-2 md:mb-0 text-left md:text-right"
							htmlFor="camera"
						>
							Camera
						</Label>
						<VideoInputSelector id="camera" />
						<Label
							className="text-base -mb-2 md:mb-0 text-left md:text-right"
							htmlFor="mic"
						>
							Mic
						</Label>
						<AudioInputSelector id="mic" />
						<Label
							className="text-base -mb-2 md:mb-0 text-left md:text-right"
							htmlFor="backgroundMode"
						>
							Background Effect
						</Label>
						<Select
							id="backgroundMode"
							value={videoEffects.backgroundMode}
							onValueChange={(value) =>
								setVideoEffects((current) => ({
									...current,
									backgroundMode: value as typeof current.backgroundMode,
								}))
							}
						>
							<Option value="none">None</Option>
							<Option value="blur">Blur</Option>
							<Option value="asset">Virtual Background</Option>
						</Select>
						{videoEffects.backgroundMode === 'blur' ? (
							<>
								<Label
									className="text-base -mb-2 md:mb-0 text-left md:text-right"
									htmlFor="blurStrength"
								>
									Blur Strength
								</Label>
								<div className="flex items-center gap-3">
									<Slider
										id="blurStrength"
										min="0"
										max="1"
										step="0.01"
										value={videoEffects.blurPower}
										onChange={(event) =>
											setSliderValue('blurPower', Number(event.target.value))
										}
									/>
									<span className="w-12 text-right text-sm">
										{videoEffects.blurPower.toFixed(2)}
									</span>
								</div>
							</>
						) : null}
						{videoEffects.backgroundMode === 'asset' ? (
							<>
								<Label
									className="text-base -mb-2 md:mb-0 text-left md:text-right"
									htmlFor="backgroundAsset"
								>
									Background Asset
								</Label>
								<div className="space-y-3">
									<Select
										id="backgroundAsset"
										value={videoEffects.backgroundAssetId}
										placeholder="Select background"
										onValueChange={(value) =>
											setVideoEffects((current) => ({
												...current,
												backgroundAssetId: value,
											}))
										}
									>
										{videoBackgroundAssets.map((asset) => (
											<Option key={asset.id} value={asset.id}>
												{asset.name}
											</Option>
										))}
									</Select>
									<input
										ref={backgroundUploadRef}
										type="file"
										accept="image/*,video/*"
										className="hidden"
										onChange={onUploadBackground}
									/>
									<div className="flex flex-wrap gap-2">
										<Button
											type="button"
											displayType="secondary"
											className="text-xs"
											onClick={() => backgroundUploadRef.current?.click()}
										>
											Upload
										</Button>
										<Button
											type="button"
											displayType="secondary"
											className="text-xs"
											onClick={() =>
												setVideoEffects((current) => ({
													...current,
													backgroundAssetId: undefined,
												}))
											}
											disabled={!videoEffects.backgroundAssetId}
										>
											Clear
										</Button>
										<Button
											type="button"
											displayType="danger"
											className="text-xs"
											disabled={!videoEffects.backgroundAssetId}
											onClick={async () => {
												if (!videoEffects.backgroundAssetId) return
												await deleteVideoBackgroundAsset(
													videoEffects.backgroundAssetId
												)
												setVideoEffects((current) => ({
													...current,
													backgroundAssetId: undefined,
													backgroundMode: 'none',
												}))
											}}
										>
											Delete
										</Button>
									</div>
								</div>
							</>
						) : null}
						<Label
							className="text-base -mb-2 md:mb-0 text-left md:text-right"
							htmlFor="beautificationStrength"
						>
							Beautification
						</Label>
						<div className="flex items-center gap-3">
							<Slider
								id="beautificationStrength"
								min="0"
								max="1"
								step="0.01"
								value={videoEffects.beautificationPower}
								onChange={(event) =>
									setSliderValue(
										'beautificationPower',
										Number(event.target.value)
									)
								}
							/>
							<span className="w-12 text-right text-sm">
								{videoEffects.beautificationPower.toFixed(2)}
							</span>
						</div>
						<Label
							className="text-base -mb-2 md:mb-0 text-left md:text-right"
							htmlFor="lowLightStrength"
						>
							Low Light Correction
						</Label>
						<div className="flex items-center gap-3">
							<Slider
								id="lowLightStrength"
								min="0"
								max="1"
								step="0.01"
								value={videoEffects.lowLightPower}
								onChange={(event) =>
									setSliderValue('lowLightPower', Number(event.target.value))
								}
							/>
							<span className="w-12 text-right text-sm">
								{videoEffects.lowLightPower.toFixed(2)}
							</span>
						</div>
						<Label
							className="text-base -mb-2 md:mb-0 text-left md:text-right"
							htmlFor="suppressNoise"
						>
							Suppress Noise
						</Label>
						<div>
							<Toggle
								id="suppressNoise"
								checked={suppressNoise}
								onCheckedChange={setSuppressNoise}
							/>
						</div>
					</div>
				</DialogContent>
			</Portal>
		</Dialog>
	)
}

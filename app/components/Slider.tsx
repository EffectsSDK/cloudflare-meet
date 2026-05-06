import { cn } from '~/utils/style'

export function Slider(props: JSX.IntrinsicElements['input']) {
	return (
		<input
			{...props}
			type="range"
			className={cn(
				'w-full',
				'accent-orange-500',
				'cursor-pointer',
				props.disabled && 'opacity-60 cursor-not-allowed',
				props.className
			)}
		/>
	)
}

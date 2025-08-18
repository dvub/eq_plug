import { usePluginListener } from '@/hooks/usePluginListener';
import { sendToPlugin } from '@/lib';
import { useRef, useState } from 'react';
import Draggable, { DraggableEvent } from 'react-draggable';
import { LABEL_MARGIN } from '../Equalizer';

// TODO: fix bounds
// TODO: fix linear/log scaling mismatch with control

export function EqControls() {
	const parentRef = useRef<HTMLDivElement>(null);

	const [position, setPosition] = useState({ x: 0, y: 0 });

	usePluginListener((message) => {
		if (message.type !== 'initResponse') return;

		const width = parentRef.current!.offsetWidth;
		const height = parentRef.current!.offsetHeight;
		let x = 0;
		let y = 0;

		message.data.initParams.forEach((parameterUpdate) => {
			if (parameterUpdate.parameterId === 'lowpass_freq') {
				x = parameterUpdate.value * width;
			}
			if (parameterUpdate.parameterId === 'lowpass_q') {
				y = (1 - parameterUpdate.value) * height;
				console.log(y);
			}
		});

		setPosition({ x, y });
	});

	const ref = useRef<HTMLDivElement>(null);

	// TODO: should we debounce this in any way?
	function handleDrag(e: DraggableEvent) {
		const castEvent = e as React.MouseEvent<HTMLElement>;

		const width = parentRef.current!.offsetWidth;
		const height = parentRef.current!.offsetHeight;

		const scaledX = castEvent.clientX;
		const scaledY = height - castEvent.clientY;

		const normalizedX = clamp(scaledX / width, 0, 1);
		const normalizedY = clamp(scaledY / height, 0, 1);

		sendToPlugin({
			type: 'parameterUpdate',
			data: {
				parameterId: 'lowpass_freq',
				value: normalizedX,
			},
		});

		sendToPlugin({
			type: 'parameterUpdate',
			data: {
				parameterId: 'lowpass_q',
				value: normalizedY,
			},
		});

		setPosition({ x: castEvent.clientX, y: castEvent.clientY });
	}
	const nodeRef = useRef<HTMLElement>({} as any);
	return (
		<div
			className='h-full absolute'
			ref={parentRef}
			style={{ width: `${600 - LABEL_MARGIN}px` }}
		>
			<Draggable
				position={position}
				nodeRef={nodeRef}
				onStart={(e) => console.log(e)}
				// onDrag={handleDrag}
				bounds={'parent'}
			>
				<div
					className='h-5 w-5  bg-red-400 rounded-xl hover:cursor-pointer'
					ref={nodeRef}
					onDrag={handleDrag}
				/>
			</Draggable>
		</div>
	);
}

function clamp(input: number, min: number, max: number) {
	return Math.min(Math.max(input, min), max);
}

import { sendToPlugin } from '@/lib';
import { Parameter } from '@/lib/parameters';
import { useRef } from 'react';
import Draggable, { DraggableEvent } from 'react-draggable';

export function EqControls() {
	console.log('hi i rendered');

	const parentRef = useRef<HTMLDivElement>(null);

	const ref = useRef<HTMLDivElement>(null);

	// TODO: should we debounce this in any way?
	function handleDrag(e: DraggableEvent) {
		const width = parentRef.current!.offsetWidth;
		const height = parentRef.current!.offsetHeight;

		const castEvent = e as React.MouseEvent<HTMLElement>;

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
	}

	return (
		<div className='w-full h-full absolute' ref={parentRef}>
			<Draggable
				nodeRef={ref as unknown as React.RefObject<HTMLElement>}
				onDrag={handleDrag}
				bounds={'parent'} // TODO: dont allow this to go into the label margin
			>
				<div className='h-5 w-5  bg-red-500 rounded-lg' ref={ref}>
					HI
				</div>
			</Draggable>
		</div>
	);
}

function valueToNormalized(value: number, min: number, max: number) {
	const minl = Math.log2(min);
	const range = Math.log2(max) - minl;
	return (Math.log2(value) - minl) / range;
}
function clamp(input: number, min: number, max: number) {
	return Math.min(Math.max(input, min), max);
}

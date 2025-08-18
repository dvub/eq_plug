import { Message } from '@/bindings/Message';
import { usePluginListener } from '@/hooks/usePluginListener';
import { sendToPlugin } from '@/lib';
import { Parameter } from '@/lib/parameters';
import { useState, useRef, useCallback } from 'react';
import Draggable, { DraggableEvent } from 'react-draggable';

// TODO: fix control vs. response mismatch
// fix callback list not properly clearing

export function EqControlNode(props: {
	containerWidth: number;
	containerHeight: number;
	horizontalParam: Parameter;
	verticalParam: Parameter;
}) {
	const COMPONENT_SIZE = 20;

	const { containerWidth, containerHeight, horizontalParam, verticalParam } =
		props;

	const width = containerWidth - COMPONENT_SIZE;
	const height = containerHeight - COMPONENT_SIZE;

	const [dragging, setDragging] = useState(false);
	const [position, setPosition] = useState({ x: 0, y: 0 });

	const nodeRef = useRef<HTMLElement>(null);

	const handlePluginMessage = useCallback(
		(message: Message) => {
			if (!dragging && message.type === 'parameterUpdate') {
				const parameterUpdate = message.data;

				let x = position.x;
				let y = position.y;
				if (parameterUpdate.parameterId === horizontalParam) {
					x = parameterUpdate.value * width;
				}
				if (parameterUpdate.parameterId === verticalParam) {
					y = (1 - parameterUpdate.value) * height;
				}

				setPosition({ x, y });
			}

			if (message.type === 'initResponse') {
				let x = position.x;
				let y = position.y;
				message.data.initParams.forEach((parameterUpdate) => {
					if (parameterUpdate.parameterId === horizontalParam) {
						console.log('got init response, width:', width);
						x = parameterUpdate.value * width;
					}
					if (parameterUpdate.parameterId === verticalParam) {
						y = (1 - parameterUpdate.value) * height;
					}
				});

				setPosition({ x, y });
			}
		},
		[
			dragging,
			position.x,
			position.y,
			horizontalParam,
			verticalParam,
			width,
			height,
			containerWidth,
			containerHeight,
		]
	);

	usePluginListener((message) => {
		handlePluginMessage(message);
	});

	// TODO: should we debounce this in any way?
	function handleDrag(event: DraggableEvent) {
		const e = event as React.MouseEvent<HTMLElement>;

		const newX = e.clientX;
		const newY = height - e.clientY;

		const normalizedX = clamp(newX / width, 0, 1);
		const normalizedY = clamp(newY / height, 0, 1);

		sendToPlugin({
			type: 'parameterUpdate',
			data: {
				parameterId: horizontalParam,
				value: normalizedX,
			},
		});
		sendToPlugin({
			type: 'parameterUpdate',
			data: {
				parameterId: verticalParam,
				value: normalizedY,
			},
		});

		const x = clamp(e.clientX, 0, width);
		const y = clamp(e.clientY, 0, height);
		setPosition({ x, y });
	}

	return (
		<Draggable
			position={position}
			nodeRef={nodeRef}
			bounds={'parent'}
			onDrag={handleDrag}
			onStop={() => setDragging(false)}
			onStart={() => setDragging(true)}
		>
			<div className='h-5 w-5  bg-red-400 rounded-xl' ref={nodeRef} />
		</Draggable>
	);
}

function clamp(input: number, min: number, max: number) {
	return Math.min(Math.max(input, min), max);
}

function norm(plain: number, min: number, max: number, factor: number) {
	return Math.pow(
		(Math.min(Math.max(plain, min), max) - min) / (max - min),
		factor
	);
}

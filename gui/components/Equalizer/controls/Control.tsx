import { Message } from '@/bindings/Message';
import { usePluginListener } from '@/hooks/usePluginListener';
import { sendToPlugin } from '@/lib';
import { Parameter } from '@/lib/parameters';
import { useState, useRef, useCallback, useEffect } from 'react';
import Draggable, { DraggableEvent } from 'react-draggable';

// TODO: fix control vs. response mismatch
const COMPONENT_SIZE = 20;

export function EqControlNode(props: {
	containerWidth: number;
	containerHeight: number;
	horizontalParam: Parameter;
	verticalParam: Parameter;
}) {
	const { containerWidth, containerHeight, horizontalParam, verticalParam } =
		props;

	const width = containerWidth - COMPONENT_SIZE;
	const height = containerHeight;

	const nodeRef = useRef<HTMLElement>(null);

	// const [dragging, setDragging] = useState(false);

	const [normalizedPositions, setNormalizedPositions] = useState({
		x: 0,
		y: 0,
	});

	const position = {
		x: normalizedPositions.x * width,
		y: normalizedPositions.y * height,
	};

	useEffect(() => {
		const unsubscribe = window.plugin.listen((m) => {
			const message: Message = JSON.parse(m);
			if (message.type === 'parameterUpdate') {
				const parameterUpdate = message.data;

				if (parameterUpdate.parameterId === horizontalParam) {
					const x = parameterUpdate.value;
					setNormalizedPositions((prevState) => ({
						...prevState,
						x,
					}));
				}
				if (parameterUpdate.parameterId === verticalParam) {
					const y = 1 - parameterUpdate.value;
					setNormalizedPositions((prevState) => ({
						...prevState,
						y,
					}));
				}
			}

			if (message.type === 'initResponse') {
				message.data.initParams.forEach((parameterUpdate) => {
					if (parameterUpdate.parameterId === horizontalParam) {
						const x = parameterUpdate.value;
						setNormalizedPositions((prevState) => ({
							x,
							y: prevState.y,
						}));
					}
					if (parameterUpdate.parameterId === verticalParam) {
						const y = 1 - parameterUpdate.value;
						setNormalizedPositions((prevState) => ({
							x: prevState.x,
							y,
						}));
					}
				});
			}
		});
		return () => {
			unsubscribe();
		};
	}, [height, horizontalParam, verticalParam, width]);

	// TODO: should we debounce this in any way?
	function handleDrag(event: DraggableEvent) {
		const e = event as React.MouseEvent<HTMLElement>;

		const newX = e.clientX;
		const newY = height - e.clientY;

		const normalizedX = clamp(newX / width, 0, 1);
		const normalizedY = clamp(newY / height, 0, 1);

		/*
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
		});*/

		const x = clamp(e.clientX, 0, width);
		const y = clamp(e.clientY, 0, height);
		// setPosition({ x, y });
	}

	return (
		<Draggable position={position} nodeRef={nodeRef} bounds={'parent'}>
			<div className='h-5 w-5  bg-red-400 rounded-xl' ref={nodeRef} />
		</Draggable>
	);
}

function clamp(input: number, min: number, max: number) {
	return Math.min(Math.max(input, min), max);
}

/*
function norm(plain: number, min: number, max: number, factor: number) {
	return Math.pow(
		(Math.min(Math.max(plain, min), max) - min) / (max - min),
		factor
	);
}
*/

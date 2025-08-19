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
	const height = containerHeight - COMPONENT_SIZE;

	const nodeRef = useRef<HTMLElement>(null);

	// const [dragging, setDragging] = useState(false);

	const [dragging, setDragging] = useState(false);
	const [normPos, setNormPos] = useState({
		x: 0,
		y: 0,
	});

	const paramUpdateListener = useCallback(
		(message: Message) => {
			if (message.type !== 'parameterUpdate' || dragging) {
				return;
			}
			const parameterUpdate = message.data;
			if (parameterUpdate.parameterId === horizontalParam) {
				const x = parameterUpdate.value;
				setNormPos((prevState) => ({
					...prevState,
					x,
				}));
			}
			if (parameterUpdate.parameterId === verticalParam) {
				const y = 1 - parameterUpdate.value;
				setNormPos((prevState) => ({
					...prevState,
					y,
				}));
			}
		},
		[dragging, horizontalParam, verticalParam]
	);
	const initListener = useCallback(
		(message: Message) => {
			if (message.type !== 'initResponse') {
				return;
			}

			message.data.initParams.forEach((parameterUpdate) => {
				if (parameterUpdate.parameterId === horizontalParam) {
					const x = parameterUpdate.value;
					setNormPos((prevState) => ({
						x,
						y: prevState.y,
					}));
				}
				if (parameterUpdate.parameterId === verticalParam) {
					const y = 1 - parameterUpdate.value;
					setNormPos((prevState) => ({
						x: prevState.x,
						y,
					}));
				}
			});
		},
		[horizontalParam, verticalParam]
	);

	usePluginListener(paramUpdateListener);
	usePluginListener(initListener);

	// TODO: should we debounce this in any way?
	function handleDrag(event: DraggableEvent) {
		const e = event as React.MouseEvent<HTMLElement>;

		const newX = e.clientX;
		const newY = height - e.clientY;

		const normalizedX = clamp(newX / width, 0, 1);
		const normalizedY = clamp(newY / height, 0, 1);
		const realY = 1 - normalizedY;
		if (normalizedX !== normPos.x) {
			sendToPlugin({
				type: 'parameterUpdate',
				data: {
					parameterId: horizontalParam,
					value: normalizedX,
				},
			});
		}

		if (realY !== normPos.y) {
			sendToPlugin({
				type: 'parameterUpdate',
				data: {
					parameterId: verticalParam,
					value: normalizedY,
				},
			});
		}

		setNormPos({ x: normalizedX, y: realY });
	}

	const position = {
		x: normPos.x * width,
		y: normPos.y * height,
	};

	return (
		<Draggable
			position={position}
			nodeRef={nodeRef}
			bounds={'parent'}
			onDrag={handleDrag}
			onStart={() => setDragging(true)}
			onStop={() => setDragging(false)}
		>
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

import { Message } from '@/bindings/Message';
import { usePluginListener } from '@/hooks/usePluginListener';
import { sendToPlugin } from '@/lib';
import { Parameter } from '@/lib/parameters';
import { normalizeLinear, normalizeLog } from '@/lib/utils';
import { useState, useRef, useCallback } from 'react';
import Draggable, { DraggableEvent } from 'react-draggable';
import { MAX_FREQ, MIN_FREQ } from '../Equalizer';
import { skewFactor } from '@/lib/range';

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
	const [f, sf] = useState(0);

	const paramUpdateListener = useCallback(
		(message: Message) => {
			if (message.type !== 'parameterUpdate' || dragging) {
				return;
			}
			const parameterUpdate = message.data;
			if (parameterUpdate.parameterId === horizontalParam) {
				// TODO: optimize these 2 calculations
				const freq = unnorm(
					parameterUpdate.value,
					skewFactor(-2.5),
					MIN_FREQ,
					MAX_FREQ
				);
				const realNormalized = normalizeLog(freq, MIN_FREQ, MAX_FREQ);

				setNormPos((prevState) => ({
					...prevState,
					x: realNormalized,
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
					setNormPos((prevState) => ({
						x: 0.0,
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

		const unnormalizedX = clamp(e.clientX, 0, width);
		sf(unnormalizedX);
		const linearNormalized = normalizeLinear(unnormalizedX, 0, width);

		const freq = logUnnormalize(linearNormalized, MIN_FREQ, MAX_FREQ);
		const normalizedX = norm(freq, MIN_FREQ, MAX_FREQ, skewFactor(-2.5));

		const newY = height - e.clientY;
		const normalizedY = clamp(newY / height, 0, 1);
		const realY = 1 - normalizedY;

		sendToPlugin({
			type: 'parameterUpdate',
			data: {
				parameterId: horizontalParam,
				value: normalizedX,
			},
		});

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
		x: f,
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

function norm(plain: number, min: number, max: number, factor: number) {
	return Math.pow((clamp(plain, min, max) - min) / (max - min), factor);
}
function unnorm(norm: number, factor: number, min: number, max: number) {
	return Math.pow(norm, 1 / factor) * (max - min) + min;
}

function logUnnormalize(norm: number, min: number, max: number) {
	const minl = Math.log2(min);
	const range = Math.log2(max) - minl;
	return Math.pow(2, norm * range + minl);
}

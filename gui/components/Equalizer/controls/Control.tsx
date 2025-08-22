import { Message } from '@/bindings/Message';
import { usePluginListener } from '@/hooks/usePluginListener';
import { sendToPlugin } from '@/lib';
import { Parameter } from '@/lib/parameters';
import { normalizeLinear, normalizeLog } from '@/lib/utils';
import { useState, useRef, useCallback, useEffect } from 'react';
import Draggable, { DraggableEvent } from 'react-draggable';
import { MAX_FREQ, MIN_FREQ } from '../Equalizer';
import { skewFactor } from '@/lib/range';

const COMPONENT_SIZE = 20;

const ALT_INCREMENT = 0.05;

interface EqControlProps {
	containerWidth: number;
	containerHeight: number;
	horizontalParam: Parameter;
	verticalParam: Parameter;
	altParam?: Parameter;
	color: string;
}

export function EqControlNode({
	containerWidth,
	containerHeight,
	horizontalParam,
	verticalParam,
	altParam,
	color,
}: EqControlProps) {
	const width = containerWidth - COMPONENT_SIZE;
	const height = containerHeight - COMPONENT_SIZE;

	const nodeRef = useRef<HTMLDivElement>(null);

	const [posNeedsUpdate, setPosNeedsUpdate] = useState(false);
	const [dragging, setDragging] = useState(false);
	const [altValue, setAltValue] = useState(0);

	const [tempPos, setTempPos] = useState({
		x: 0,
		y: 0,
	});
	const [deltas, setDeltas] = useState({ x: 0, y: 0 });
	const [position, setPosition] = useState({ x: 0, y: 0 });

	const paramUpdateListener = useCallback(
		(message: Message) => {
			if (message.type !== 'parameterUpdate' || dragging) {
				return;
			}

			const parameterUpdate = message.data;
			if (parameterUpdate.parameterId === horizontalParam) {
				// TODO: optimize these 2 calculations
				const freq = unnormalize(
					parameterUpdate.value,
					skewFactor(-2.5),
					MIN_FREQ,
					MAX_FREQ
				);
				const realNormalized = normalizeLog(freq, MIN_FREQ, MAX_FREQ);

				setPosition((prevState) => ({
					...prevState,
					x: realNormalized * width,
				}));
			}
			if (parameterUpdate.parameterId === verticalParam) {
				const y = 1 - parameterUpdate.value;
				setPosition((prevState) => ({
					...prevState,
					y: y * height,
				}));
			}
			if (parameterUpdate.parameterId === altParam) {
				setAltValue(parameterUpdate.value);
			}
		},
		[altParam, dragging, horizontalParam, verticalParam, width, height]
	);
	const initListener = useCallback(
		(message: Message) => {
			if (message.type !== 'initResponse') {
				return;
			}
			console.log('received init params, setting now');

			// TODO: fix nesting issues
			message.data.initParams.forEach((parameterUpdate) => {
				if (parameterUpdate.parameterId === horizontalParam) {
					const x = normFreqParamToNormPosition(
						parameterUpdate.value
					);
					setTempPos((prevState) => ({
						x,
						y: prevState.y,
					}));
				}
				if (parameterUpdate.parameterId === verticalParam) {
					const y = 1 - parameterUpdate.value;
					setTempPos((prevState) => ({
						x: prevState.x,
						y,
					}));
				}
				if (parameterUpdate.parameterId === altParam) {
					setAltValue(parameterUpdate.value);
				}
			});

			setPosNeedsUpdate(true);
		},
		[horizontalParam, verticalParam, altParam]
	);

	useEffect(() => {
		if (posNeedsUpdate) {
			console.log('setting from temp');
			const newPosition = {
				x: tempPos.x * width,
				y: tempPos.y * height,
			};
			setPosition(newPosition);
			setPosNeedsUpdate(false);
		}
	}, [posNeedsUpdate, tempPos, width, height]);

	usePluginListener(paramUpdateListener);
	usePluginListener(initListener);

	// TODO: should we debounce this in any way?
	function handleDrag(event: DraggableEvent) {
		// TODO: fix this hack
		const e = event as React.MouseEvent<HTMLElement>;

		const x = clamp(e.clientX + deltas.x, 0, width);
		const y = clamp(e.clientY + deltas.y, 0, height);

		const normalizedX = normalizeLinear(x, 0, width);
		const normalizedY = normalizeLinear(y, 0, height);

		const horizontalParamVal = normPositionToNormFreqParam(normalizedX);
		const verticalParamVal = 1 - normalizedY;

		sendToPlugin({
			type: 'parameterUpdate',
			data: {
				parameterId: horizontalParam,
				value: horizontalParamVal,
			},
		});
		sendToPlugin({
			type: 'parameterUpdate',
			data: {
				parameterId: verticalParam,
				value: verticalParamVal,
			},
		});

		setPosition({ x, y });
	}
	function handleDragStart(event: DraggableEvent) {
		const e = event as React.MouseEvent<HTMLElement>;

		const deltas = { x: position.x - e.clientX, y: position.y - e.clientY };
		setDragging(true);
		setDeltas(deltas);
	}
	function handleDragEnd() {
		setDragging(false);
	}
	function handleWheel(e: React.WheelEvent<HTMLDivElement>) {
		console.log(altValue);

		if (!altParam) return;

		const increment = -Math.sign(e.deltaY) * ALT_INCREMENT;
		const newValue = clamp(altValue + increment, 0, 1);

		setAltValue(newValue);
		sendToPlugin({
			type: 'parameterUpdate',
			data: {
				parameterId: altParam,
				value: newValue,
			},
		});
	}

	return (
		<Draggable
			position={position}
			nodeRef={nodeRef}
			bounds={'parent'}
			onDrag={handleDrag}
			onStart={handleDragStart}
			onStop={handleDragEnd}

			// positionOffset={{ x: '-50%', y: '-50%' }}
		>
			<div
				className={`h-6 w-6 rounded-[12px]`}
				style={{ backgroundColor: color }}
				ref={nodeRef}
				onWheel={handleWheel}
			/>
		</Draggable>
	);
}

// TODO: rewrite allllll of this
function clamp(input: number, min: number, max: number) {
	return Math.min(Math.max(input, min), max);
}

function norm(plain: number, min: number, max: number, factor: number) {
	return Math.pow((clamp(plain, min, max) - min) / (max - min), factor);
}
function unnormalize(norm: number, factor: number, min: number, max: number) {
	return Math.pow(norm, 1 / factor) * (max - min) + min;
}

function unnormalizeLog(norm: number, min: number, max: number) {
	const minl = Math.log2(min);
	const range = Math.log2(max) - minl;
	return Math.pow(2, norm * range + minl);
}

const SKEW_FACTOR = skewFactor(-2.5);

function normPositionToNormFreqParam(normalized: number) {
	const frequency = unnormalizeLog(normalized, MIN_FREQ, MAX_FREQ);

	return norm(frequency, MIN_FREQ, MAX_FREQ, SKEW_FACTOR);
}

function normFreqParamToNormPosition(param: number) {
	const freq = unnormalize(param, SKEW_FACTOR, MIN_FREQ, MAX_FREQ);
	return normalizeLog(freq, MIN_FREQ, MAX_FREQ);
}

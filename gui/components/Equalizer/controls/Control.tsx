import { Message } from '@/bindings/Message';
import { usePluginListener } from '@/hooks/usePluginListener';
import { sendToPlugin } from '@/lib';
import { Parameter } from '@/lib/parameters';
import { normalizeLinear, normalizeLog } from '@/lib/utils';
import { useState, useRef, useCallback, useEffect, useContext } from 'react';
import Draggable, { DraggableEvent } from 'react-draggable';
import { MAX_FREQ, MIN_FREQ } from '../Equalizer';
import { skewFactor } from '@/lib/range';
import { EqControlContainerContext } from './EqControls';
import clsx from 'clsx';

// TODO: ensure proper centering
// TODO: add keyboard handler

const COMPONENT_SIZE = 20;

const KEY_DOWN_INCREMENT = 2.5;
const ALT_INCREMENT = 0.05;

type EqControlProps = {
	horizontalParam: Parameter;
	verticalParam: Parameter;
	altParam?: Parameter;
	color: string;
};

export function EqControlNode({
	horizontalParam,
	verticalParam,
	altParam,
	color,
}: EqControlProps) {
	const { width: cw, height: ch } = useContext(EqControlContainerContext)!;

	const width = cw - COMPONENT_SIZE;
	const height = ch - COMPONENT_SIZE;

	// necessary patch for react-draggable
	const nodeRef = useRef<HTMLDivElement>(null);

	const [deltas, setDeltas] = useState({ x: 0, y: 0 });
	const [position, setPosition] = useState({ x: 0, y: 0 });
	const [tempPos, setTempPos] = useState({
		x: 0,
		y: 0,
	});
	const [posNeedsUpdate, setPosNeedsUpdate] = useState(false);

	// prevent jittering from receiving old parameter updates
	const [dragging, setDragging] = useState(false);
	const [altValue, setAltValue] = useState(0);

	// TODO: refactor
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

	usePluginListener(paramUpdateListener);
	usePluginListener(initListener);

	useEffect(() => {
		if (posNeedsUpdate) {
			const newPosition = {
				x: tempPos.x * width,
				y: tempPos.y * height,
			};
			setPosition(newPosition);
			setPosNeedsUpdate(false);
		}
	}, [posNeedsUpdate, tempPos, width, height]);

	// TODO: should we debounce this in any way?
	function handleDrag(event: DraggableEvent) {
		// TODO: fix this hack
		const e = event as React.MouseEvent<HTMLElement>;

		const x = clamp(e.clientX + deltas.x, 0, width);
		const y = clamp(e.clientY + deltas.y, 0, height);

		if (x !== position.x) {
			sendHorizontalParamUpdate(horizontalParam, x, width);
		}
		if (y !== position.y) {
			sendVerticalParamUpdate(verticalParam, y, height);
		}

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
		if (!altParam) return;

		const direction = -Math.sign(e.deltaY);
		const newValue = sendAltParamUpdate(altParam, altValue, direction);
		setAltValue(newValue);
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
		const newPosition = { ...position };
		let increment = KEY_DOWN_INCREMENT;

		if (e.shiftKey) {
			increment *= 2;
		}
		switch (e.key) {
			case 'ArrowUp':
				if (e.altKey && altParam) {
					sendAltParamUpdate(altParam, altValue, -1);
				} else {
					newPosition.y = clamp(newPosition.y - increment, 0, height);
					sendVerticalParamUpdate(
						verticalParam,
						newPosition.y,
						height
					);
				}
				break;
			case 'ArrowDown':
				if (e.altKey && altParam) {
					sendAltParamUpdate(altParam, altValue, 1);
				} else {
					newPosition.y = clamp(newPosition.y + increment, 0, height);
					sendVerticalParamUpdate(
						verticalParam,
						newPosition.y,
						height
					);
				}

				break;
			case 'ArrowLeft':
				newPosition.x = clamp(newPosition.x - increment, 0, width);
				sendHorizontalParamUpdate(
					horizontalParam,
					newPosition.x,
					width
				);
				break;
			case 'ArrowRight':
				newPosition.x = clamp(newPosition.x + increment, 0, width);
				sendHorizontalParamUpdate(
					horizontalParam,
					newPosition.x,
					width
				);
				break;
		}
		setPosition(newPosition);
	}

	return (
		<Draggable
			position={position}
			nodeRef={nodeRef}
			bounds={'parent'}
			onDrag={handleDrag}
			onStart={handleDragStart}
			onStop={handleDragEnd}
		>
			<div
				tabIndex={0} // TODO: fix
				className='rounded-full border-3 border-white w-min h-min flex'
				ref={nodeRef}
				onWheel={handleWheel}
				onKeyDown={handleKeyDown}
				role={'eqcontrol'}
			>
				<div
					className={clsx(
						'rounded-full bg-radial from-45% to-white',
						color
					)}
					style={{
						//backgroundColor: color,
						width: `${COMPONENT_SIZE}px`,
						height: `${COMPONENT_SIZE}px`,
					}}
				></div>
			</div>
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

// TODO: generalize horizontal/parameter updates to one single function with a normalization parameter
function sendHorizontalParamUpdate(
	horizontalParam: Parameter,
	x: number,
	width: number
) {
	const normalizedX = normalizeLinear(x, 0, width);
	const horizontalParamVal = normPositionToNormFreqParam(normalizedX);

	sendToPlugin({
		type: 'parameterUpdate',
		data: {
			parameterId: horizontalParam,
			value: horizontalParamVal,
		},
	});
}

function sendVerticalParamUpdate(
	verticalParam: Parameter,
	y: number,
	height: number
) {
	const normalizedY = normalizeLinear(y, 0, height);
	const verticalParamVal = 1 - normalizedY;

	sendToPlugin({
		type: 'parameterUpdate',
		data: {
			parameterId: verticalParam,
			value: verticalParamVal,
		},
	});
}

function sendAltParamUpdate(
	altParam: Parameter,
	currentValue: number,
	direction: number
) {
	const increment = -direction * ALT_INCREMENT;
	const newValue = clamp(currentValue + increment, 0, 1);

	sendToPlugin({
		type: 'parameterUpdate',
		data: {
			parameterId: altParam,
			value: newValue,
		},
	});
	return newValue;
}

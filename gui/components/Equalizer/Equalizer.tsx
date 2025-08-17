'use client';

import { Message } from '@/bindings/Message';
import { usePluginListener } from '@/hooks/usePluginListener';

import { useCallback, useRef } from 'react';
import { Canvas } from '../Canvas';

import { drawRuler } from './ruler';
import { drawSpectrum } from './spectrum';
import { gainToDb, normalizeLinear, normalizeLog } from '@/lib/utils';
import { curve } from '@/lib/curve_func';
import { Meter, Monitor } from '@/lib/monitor';

// TODO: make configurable
// specifically tie this to real backend sample rate
export const MAX_FREQ = 20000;
export const MIN_FREQ = 20;

export const DEFAULT_MIN_DB = -78;
export const DEFAULT_MAX_DB = 24;

export const MIN_FREQ_RESPONSE_DB = -24;
export const MAX_FREQ_RESPONSE_DB = 24;
export const SLOPE = 4.5;

export function Equalizer(props: {
	fps: number;
	width?: number;
	height?: number;
	className?: string;
}) {
	const { width, height, fps } = props;

	// TODO: refactor into one ref object

	const preSpectrum = useRef<number[]>([]);
	const postSpectrum = useRef<number[]>([]);
	const frequencyResponse = useRef<[number, number][]>([]);

	const listener = useCallback((m: Message) => {
		if (m.type !== 'drawData') {
			return;
		}
		if (m.data.drawType === 'spectrum') {
			const data = m.data.drawData;
			preSpectrum.current = data.dry;
			postSpectrum.current = data.wet;
		}
		if (m.data.drawType === 'frequencyResponse') {
			const data = m.data.drawData;
			frequencyResponse.current = data;
		}
	}, []);
	usePluginListener(listener);

	function draw(ctx: CanvasRenderingContext2D) {
		const drawRequest: Message = {
			type: 'drawRequest',
			data: {
				requestType: 'spectrum',
			},
		};
		window.plugin.send(JSON.stringify(drawRequest));

		const height = ctx.canvas.height;
		const width = ctx.canvas.width;
		ctx.clearRect(0, 0, width, height);

		drawRuler(ctx);

		// --- render dry ---

		// TODO: dont create gradient every frame
		const gradient = ctx.createLinearGradient(0, height, 0, 0);
		gradient.addColorStop(0, 'rgba(25,25,25, 0.5)'); // at 0%
		gradient.addColorStop(1, 'rgba(143, 143, 143, 0.5)'); // at 54%

		ctx.strokeStyle = 'rgba(150,150,150,0.5)';
		ctx.fillStyle = gradient;
		drawSpectrum(
			preSpectrum.current,
			ctx,
			true,
			DEFAULT_MAX_DB,
			DEFAULT_MIN_DB
		);

		// --- render wet ---
		ctx.lineWidth = 1;
		ctx.strokeStyle = 'white';
		drawSpectrum(
			postSpectrum.current,
			ctx,
			true,
			DEFAULT_MAX_DB,
			DEFAULT_MIN_DB
		);

		// render freq response
		ctx.strokeStyle = 'red';
		ctx.lineWidth = 2;
		const freqR = frequencyResponse.current;
		ctx.beginPath();
		const coords = [];

		for (let i = 0; i < freqR.length; i++) {
			const [freq, responseDb] = freqR[i];
			const x = normalizeLog(freq, MIN_FREQ, MAX_FREQ);
			const y = normalizeLinear(
				responseDb,
				MIN_FREQ_RESPONSE_DB,
				MAX_FREQ_RESPONSE_DB
			);
			const scaledX = x * width;
			const scaledY = (1.0 - y) * height;

			coords.push(scaledX, scaledY);
		}
		curve(ctx, coords, 0.5, 100, false);
		ctx.stroke();
	}

	return (
		<Canvas
			draw={draw}
			fps={fps}
			width={width}
			height={height}
			className={props.className}
		/>
	);
}

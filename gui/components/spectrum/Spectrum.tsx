'use client';

import { Message } from '@/bindings/Message';
import { usePluginListener } from '@/hooks/usePluginListener';

import { useCallback, useRef } from 'react';
import { Canvas } from '../Canvas';

import { drawRuler } from './ruler';
import { drawSpectrum } from './draw';

// TODO: make configurable
// specifically tie this to real backend sample rate
export const MAX_FREQ = 20000;
export const MIN_FREQ = 20;
export const SLOPE = 4.5;

export const MIN_DB = -78;
export const MAX_DB = -18;

export function Spectrum(props: {
	fps: number;
	width?: number;
	height?: number;
	className?: string;
}) {
	const { width, height, fps } = props;

	// TODO: refactor into one ref object
	const preSpectrum = useRef<number[]>([]);
	const postSpectrum = useRef<number[]>([]);
	const freqCoords = useRef<[number, number][]>([]);

	const listener = useCallback((m: Message) => {
		if (m.type !== 'drawData') {
			return;
		}
		if (m.data.type === 'spectrum') {
			const data = m.data.data;
			preSpectrum.current = data.dry;
			postSpectrum.current = data.wet;
		}
		if (m.data.type === 'frequencyResponse') {
			const data = m.data.data;
			freqCoords.current = data;
		}
	}, []);
	usePluginListener(listener);

	function draw(ctx: CanvasRenderingContext2D) {
		const drawRequest: Message = {
			type: 'drawRequest',
			data: {
				type: 'spectrum',
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
		drawSpectrum(preSpectrum.current, ctx, true);

		// --- render wet ---
		ctx.lineWidth = 1;
		ctx.strokeStyle = 'white';
		drawSpectrum(postSpectrum.current, ctx, true);

		// render freq response
		ctx.strokeStyle = 'white';
		const freqR = freqCoords.current;
		ctx.beginPath();
		for (let i = 0; i < freqR.length; i++) {
			const [x, y] = freqR[i];

			const scaledX = x * width;
			const scaledY = (1.0 - y) * height;

			ctx.lineTo(scaledX, scaledY);
		}
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

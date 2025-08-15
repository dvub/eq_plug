'use client';

import { Message } from '@/bindings/Message';
import { usePluginListener } from '@/hooks/usePluginListener';

import { useCallback, useRef } from 'react';
import { Canvas } from './Canvas';

export function Spectrum(props: {
	fps: number;
	width?: number;
	height?: number;
	antiAliasing: boolean;
	className?: string;
}) {
	const { antiAliasing, width, height, fps } = props;

	const dryCoords = useRef<[number, number][]>([]);
	const wetCoords = useRef<[number, number][]>([]);
	const freqCoords = useRef<[number, number][]>([]);

	const listener = useCallback((m: Message) => {
		if (m.type !== 'drawData') {
			return;
		}
		if (m.data.type === 'spectrum') {
			const data = m.data.data;
			dryCoords.current = data.dry;
			wetCoords.current = data.wet;

		}
		if (m.data.type === 'frequencyResponse') {
			const data = m.data.data;
			freqCoords.current = data;
		}
	}, []);
	usePluginListener(listener);

	// TODO: refactor this
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

		ctx.lineWidth = 1;

		// render dry
		ctx.strokeStyle = 'gray';
		ctx.fillStyle = 'gray';
		const drySpectrum = dryCoords.current;

		ctx.beginPath();
		for (let i = 0; i < drySpectrum.length; i++) {
			const [x, y] = drySpectrum[i];

			let scaledX = x * width;
			let scaledY = (1.0 - y) * height;

			if (!antiAliasing) {
				scaledX = Math.floor(scaledX);
				scaledY = Math.floor(scaledY);
			}
			ctx.lineTo(scaledX, scaledY);
		}

		ctx.lineTo(width, height);
		ctx.lineTo(0, height);

		ctx.fill();
		ctx.stroke();

		// render wet
		ctx.strokeStyle = 'white';
		const wetSpectrum = wetCoords.current;

		ctx.beginPath();
		for (let i = 0; i < wetSpectrum.length; i++) {
			const [x, y] = wetSpectrum[i];

			let scaledX = x * width;
			let scaledY = (1.0 - y) * height;

			if (!antiAliasing) {
				scaledX = Math.floor(scaledX);
				scaledY = Math.floor(scaledY);
			}
			ctx.lineTo(scaledX, scaledY);
		}

		ctx.stroke();

		// render freq response
		ctx.strokeStyle = 'blue';
		const freqR = freqCoords.current;

		ctx.beginPath();
		for (let i = 0; i < freqR.length; i++) {
			const [x, y] = freqR[i];

			let scaledX = x * width;
			let scaledY = (1.0 - y) * height;

			if (!antiAliasing) {
				scaledX = Math.floor(scaledX);
				scaledY = Math.floor(scaledY);
			}
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

'use client';

import { Message } from '@/bindings/Message';
import { usePluginListener } from '@/hooks/usePluginListener';

import { useCallback, useRef } from 'react';
import { Canvas } from './Canvas';
import { curve } from '@/lib/curve_func';

// TODO: make configurable
// specifically tie this to real backend sample rate
const MAX_FREQ = 20000;
const MIN_FREQ = 20;
const SLOPE = 4.5;

const MIN_DB = -78;
const MAX_DB = -18;

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

function drawSpectrum(
	input: number[],
	ctx: CanvasRenderingContext2D,
	fill: boolean
) {
	const width = ctx.canvas.width;
	const height = ctx.canvas.height;

	// note: this is [x1,y1,x2,y2,...];

	ctx.beginPath();

	// initial point
	const [x, y] = getScaledSpectrumCoords(input, 0, width, height);
	ctx.moveTo(x, y);

	// interpolated component
	// NOTE: it would probably be good to figure out a more "correct" value
	// 25 is a guess
	const interpolateLength = 40;
	const coordinates = [];
	for (let i = 1; i <= interpolateLength; i++) {
		const [x, y] = getScaledSpectrumCoords(input, i, width, height);
		coordinates.push(x);
		coordinates.push(y);
	}
	curve(ctx, coordinates);

	// non-interpolated portion
	for (let i = interpolateLength; i < input.length; i++) {
		const [x, y] = getScaledSpectrumCoords(input, i, width, height);
		ctx.lineTo(x, y);
	}

	if (fill) {
		ctx.lineTo(width, height);
		ctx.lineTo(0, height);
		ctx.fill();
	}

	ctx.stroke();
}

function getScaledSpectrumCoords(
	input: number[],
	i: number,
	width: number,
	height: number
): [number, number] {
	const linearFreq = (i / input.length) * MAX_FREQ;
	const x = normalizeLog(linearFreq, MIN_FREQ, MAX_FREQ);

	// TODO: refactpr probably
	const magnitudeSlopeDivisor = Math.pow(Math.log2(MAX_FREQ), SLOPE) / SLOPE;
	const linearSlopeFactor =
		Math.pow(Math.log2(linearFreq), SLOPE) / magnitudeSlopeDivisor;
	const slopedLinearValue = input[i] * linearSlopeFactor;

	const y = normalizeLinear(gainToDb(slopedLinearValue), MIN_DB, MAX_DB);

	const scaledX = x * width;
	const scaledY = (1.0 - y) * height;

	return [scaledX, scaledY];
}

// TODO: optimize..?
function normalizeLog(value: number, min: number, max: number) {
	const minl = Math.log2(min);
	const range = Math.log2(max) - minl;
	return (Math.log2(value) - minl) / range;
}

const MINUS_INFINITY_GAIN = 1e-5;
function gainToDb(gain: number) {
	return Math.log10(Math.max(gain, MINUS_INFINITY_GAIN)) * 20;
}

function normalizeLinear(value: number, min: number, max: number) {
	return (value - min) / (max - min);
}

const FREQ_LINES = [
	20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 400, 500, 600, 700, 800, 900,
	1_000, 2_000, 3_000, 4_000, 5_000, 6_000, 7_000, 8_000, 9_000, 10_000,
];
const DB_LINES = [-72, -66, -60, -54, -48, -42, -36, -30, -24, -18];

function drawRuler(ctx: CanvasRenderingContext2D) {
	const width = ctx.canvas.width;
	const height = ctx.canvas.height;

	ctx.lineWidth = 1;
	ctx.strokeStyle = 'rgba(100,100,100,0.33)';

	ctx.beginPath();
	FREQ_LINES.forEach((value) => {
		const normalizedValue = normalizeLog(value, MIN_FREQ, MAX_FREQ);
		const scaledX = Math.floor(normalizedValue * width);
		ctx.moveTo(scaledX + 0.5, 0);
		ctx.lineTo(scaledX + 0.5, height);
	});
	ctx.stroke();

	ctx.beginPath();
	DB_LINES.forEach((value) => {
		const normalizedValue = normalizeLinear(value, MIN_DB, MAX_DB);
		const scaledY = Math.floor(normalizedValue * height);
		ctx.moveTo(0, scaledY + 0.5);
		ctx.lineTo(width, scaledY + 0.5);
	});
	ctx.stroke();
}

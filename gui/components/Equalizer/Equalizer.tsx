'use client';

import { Message } from '@/bindings/Message';
import { usePluginListener } from '@/hooks/usePluginListener';

import { useCallback, useRef } from 'react';
import { Canvas } from '../Canvas';

import { RulerCanvas } from './ruler/RulerCanvas';
import { drawSpectrum } from './spectrum';
import { sendToPlugin } from '@/lib';
import { FrequencyResponse } from './freq_response/FrequencyResponse';
import { EqControls } from './controls/EqControls';

const FPS = 45;

export const MAX_FREQ = 22050;
export const MIN_FREQ = 20;

export const SPECTRUM_MIN_DB = -78;
export const SPECTRUM_MAX_DB = 6;

export const FREQ_RESPONSE_MIN_DB = -24;
export const FREQ_RESPONSE_MAX_DB = 24;
export const SLOPE = 4.5;

export const FREQUENCY_RESPONSE_STYLE = 'rgb(229, 199, 104)';

// NOTE: we provide a margin on the right side for labels
// this way, spectrums/freq response will not cover labels
export const LABEL_MARGIN = 60;

export function Equalizer(props: {
	width?: number;
	height?: number;
	className?: string;
}) {
	const { width, height } = props;

	// TODO: refactor into one ref object
	const preSpectrum = useRef<number[]>([]);
	const postSpectrum = useRef<number[]>([]);

	const listener = useCallback((m: Message) => {
		if (m.type !== 'drawData') {
			return;
		}
		if (m.data.drawType === 'spectrum') {
			const data = m.data.drawData;
			preSpectrum.current = data.dry;
			postSpectrum.current = data.wet;
		}
	}, []);
	usePluginListener(listener);

	function draw(ctx: CanvasRenderingContext2D) {
		sendToPlugin({
			type: 'drawRequest',
			data: {
				requestType: 'spectrum',
			},
		});

		const height = ctx.canvas.height;
		const width = ctx.canvas.width;

		const effectiveWidth = width - LABEL_MARGIN;
		ctx.clearRect(0, 0, width, height);

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
			SPECTRUM_MAX_DB,
			SPECTRUM_MIN_DB,
			effectiveWidth,
			height
		);

		// --- render wet ---
		ctx.lineWidth = 1;
		ctx.strokeStyle = 'white';
		drawSpectrum(
			postSpectrum.current,
			ctx,
			true,
			SPECTRUM_MAX_DB,
			SPECTRUM_MIN_DB,
			effectiveWidth,
			height
		);
	}

	return (
		<>
			<RulerCanvas className={`${props.className} absolute`} />
			<Canvas // NOTE: this renders spectrum(s)
				draw={draw}
				fps={FPS} // we should probably just leave this as a constant
				width={width}
				height={height}
				className={`${props.className} absolute`}
			/>
			<FrequencyResponse className={`${props.className} absolute`} />
			<EqControls />
		</>
	);
}

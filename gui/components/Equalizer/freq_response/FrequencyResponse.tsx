import { Message } from '@/bindings/Message';
import { usePluginListener } from '@/hooks/usePluginListener';
import { curve } from '@/lib/curve_func';
import { normalizeLog, normalizeLinear } from '@/lib/utils';
import { useRef, useEffect, useCallback } from 'react';
import {
	FREQUENCY_RESPONSE_STYLE,
	MIN_FREQ,
	MAX_FREQ,
	FREQ_RESPONSE_MIN_DB,
	FREQ_RESPONSE_MAX_DB,
	LABEL_MARGIN,
} from '../Equalizer';

export function FrequencyResponse(props: { className: string | undefined }) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const frequencyResponse = useRef<[number, number][]>([]);
	const lastRenderedFrequencyResponse = useRef<[number, number][]>([]);

	usePluginListener((message: Message) => {
		if (
			message.type === 'drawData' &&
			message.data.drawType === 'frequencyResponse'
		) {
			const newFrequencyResponse = message.data.drawData;
			frequencyResponse.current = newFrequencyResponse;
		}
	});
	useEffect(() => {
		let animationFrameId = 0;
		const canvas = canvasRef.current!;
		if (!canvas) return;

		canvas.width = canvas.offsetWidth;
		canvas.height = canvas.offsetHeight;

		const ctx = canvas.getContext('2d')!;
		const width = ctx.canvas.width;
		const height = ctx.canvas.height;

		function render() {
			// TODO: is it particularly expensive to do this comparison?
			if (
				frequencyResponse.current !==
				lastRenderedFrequencyResponse.current
			) {
				ctx.clearRect(0, 0, width, height);
				renderFrequencyResponse(
					frequencyResponse.current,
					ctx,
					width - LABEL_MARGIN,
					height
				);
			}

			lastRenderedFrequencyResponse.current = frequencyResponse.current;

			animationFrameId = requestAnimationFrame(render);
		}
		render();
		return () => {
			cancelAnimationFrame(animationFrameId);
		};
	}, []);

	return <canvas className={props.className} ref={canvasRef} />;
}

function renderFrequencyResponse(
	frequencyResponse: [number, number][],
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number
) {
	// render freq response
	ctx.strokeStyle = FREQUENCY_RESPONSE_STYLE;
	ctx.lineWidth = 2;
	ctx.beginPath();
	const coords = [];

	// TODO: fix this -1 hack
	for (let i = 0; i < frequencyResponse.length - 1; i++) {
		const [freq, responseDb] = frequencyResponse[i];
		const x = normalizeLog(freq, MIN_FREQ, MAX_FREQ);
		const y = normalizeLinear(
			responseDb,
			FREQ_RESPONSE_MIN_DB,
			FREQ_RESPONSE_MAX_DB
		);
		const scaledX = x * width;
		const scaledY = (1.0 - y) * height;

		coords.push(scaledX, scaledY);
	}
	curve(ctx, coords);
	ctx.stroke();
}

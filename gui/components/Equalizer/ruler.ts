import {
	MAX_FREQ,
	MAX_FREQ_RESPONSE_DB,
	MIN_FREQ,
	MIN_FREQ_RESPONSE_DB,
} from './Equalizer';
import { normalizeLinear, normalizeLog } from '@/lib/utils';
const FREQ_LINES = [
	20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 400, 500, 600, 700, 800, 900,
	1_000, 2_000, 3_000, 4_000, 5_000, 6_000, 7_000, 8_000, 9_000, 10_000,
];
// const DB_LINES = [-72, -66, -60, -54, -48, -42, -36, -30, -24, -18];
const DB_LINES = [-20, -10, 0, 10, 20];
export function drawRuler(ctx: CanvasRenderingContext2D) {
	const width = ctx.canvas.width;
	const height = ctx.canvas.height;

	ctx.lineWidth = 1;
	ctx.strokeStyle = 'rgba(100,100,100,0.33)';

	// FREQ
	ctx.beginPath();
	FREQ_LINES.forEach((value) => {
		const normalizedValue = normalizeLog(value, MIN_FREQ, MAX_FREQ);
		const scaledX = Math.floor(normalizedValue * width);
		ctx.moveTo(scaledX + 0.5, 0);
		ctx.lineTo(scaledX + 0.5, height);
	});
	ctx.stroke();

	// DB
	ctx.beginPath();
	DB_LINES.forEach((value) => {
		const normalizedValue = normalizeLinear(
			value,
			MIN_FREQ_RESPONSE_DB,
			MAX_FREQ_RESPONSE_DB
		);
		const scaledY = Math.floor(normalizedValue * height);
		ctx.moveTo(0, scaledY + 0.5);
		ctx.lineTo(width, scaledY + 0.5);
	});
	ctx.stroke();
}

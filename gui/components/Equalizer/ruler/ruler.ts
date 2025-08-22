import {
	SPECTRUM_MAX_DB,
	SPECTRUM_MIN_DB,
	FREQUENCY_RESPONSE_STYLE,
	LABEL_MARGIN,
	MAX_FREQ,
	FREQ_RESPONSE_MAX_DB,
	MIN_FREQ,
	FREQ_RESPONSE_MIN_DB,
} from '../Equalizer';
import { normalizeLinear, normalizeLog } from '@/lib/utils';

// should we ever make these configurable?
const FREQ_LINES = [
	30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 400, 500, 600, 700, 800, 900,
	1_000, 2_000, 3_000, 4_000, 5_000, 6_000, 7_000, 8_000, 9_000, 10_000,
]; // hz

const SPECTRUM_LINES = [
	-72, -66, -60, -54, -48, -42, -36, -30, -24, -18, -12, -6, 0,
]; // +/- dB
const FREQ_RESPONSE_LINES = [-20, -10, 0, 10, 20]; // +/- dB

const GRADIENT_SIZE = 25; //px

export function drawRuler(ctx: CanvasRenderingContext2D) {
	const mainStrokeStyle = 'rgba(100,100,100,0.33)';

	ctx.lineWidth = 1;
	ctx.strokeStyle = mainStrokeStyle;
	ctx.font = '15px inter';
	ctx.textAlign = 'right';

	// we cache scaled Y positions since we need them twice:
	// once for drawing lines
	// once again for labels
	// note: text is drawn AFTER gradients are applied
	const height = ctx.canvas.height;
	const dBCoordinates = SPECTRUM_LINES.map((currentDb) => {
		const normalizedValue = normalizeLinear(
			currentDb,
			SPECTRUM_MAX_DB,
			SPECTRUM_MIN_DB
		);
		return Math.floor(normalizedValue * height);
	});

	ctx.beginPath();
	drawFreqLines(ctx);
	drawSpectrumDbLines(ctx, dBCoordinates);
	ctx.stroke();

	applyGradients(ctx);
	// NOTE: we make sure to do this after gradients
	// this way, text is never hidden by gradients
	drawLabels(ctx, mainStrokeStyle, dBCoordinates);
}

function drawSpectrumDbLines(
	ctx: CanvasRenderingContext2D,
	scaledYCoordinates: number[]
) {
	const width = ctx.canvas.width;

	scaledYCoordinates.forEach((scaledY) => {
		ctx.moveTo(0, scaledY + 0.5);
		ctx.lineTo(width, scaledY + 0.5);
	});
}

function drawFreqLines(ctx: CanvasRenderingContext2D) {
	const width = ctx.canvas.width;
	const height = ctx.canvas.height;

	FREQ_LINES.forEach((value) => {
		const normalizedValue = normalizeLog(value, MIN_FREQ, MAX_FREQ);
		const scaledX = Math.floor(normalizedValue * (width - LABEL_MARGIN));
		ctx.moveTo(scaledX + 0.5, 0);
		ctx.lineTo(scaledX + 0.5, height);
	});
}

function drawLabels(
	ctx: CanvasRenderingContext2D,
	mainStrokeStyle: string,
	scaledYCoordinates: number[]
) {
	const width = ctx.canvas.width;
	const height = ctx.canvas.height;

	ctx.fillStyle = mainStrokeStyle;
	scaledYCoordinates.forEach((scaledY, i) => {
		const currentDb = SPECTRUM_LINES[i];
		ctx.fillText(`${currentDb}`, width - 5, scaledY - 5);
	});

	ctx.fillStyle = FREQUENCY_RESPONSE_STYLE;
	FREQ_RESPONSE_LINES.forEach((frequency) => {
		const normalizedValue = normalizeLinear(
			frequency,
			FREQ_RESPONSE_MAX_DB,
			FREQ_RESPONSE_MIN_DB
		);
		const scaledY = Math.floor(normalizedValue * height);
		// TODO: probably fix magic numbers
		ctx.fillText(`${frequency}`, width - 35, scaledY - 5);
	});
}

function applyGradients(ctx: CanvasRenderingContext2D) {
	const width = ctx.canvas.width;
	const height = ctx.canvas.height;

	// apply gradients
	const finalStop = 'rgba(0,0,0,0)';

	const vlGradient = ctx.createLinearGradient(0, 0, GRADIENT_SIZE, 0);
	vlGradient.addColorStop(0, 'rgb(0,0,0)'); // TODO: set to whatever bg color we choose
	vlGradient.addColorStop(1, finalStop);
	ctx.fillStyle = vlGradient;
	ctx.fillRect(0, 0, GRADIENT_SIZE, height);

	const vrGradient = ctx.createLinearGradient(
		width,
		0,
		width - GRADIENT_SIZE,
		0
	);
	vrGradient.addColorStop(0, 'rgb(0,0,0)'); // TODO: set to whatever bg color we choose
	vrGradient.addColorStop(1, finalStop);
	ctx.fillStyle = vrGradient;
	ctx.fillRect(width - GRADIENT_SIZE, 0, width, height);

	const htGradient = ctx.createLinearGradient(0, 0, 0, GRADIENT_SIZE);
	htGradient.addColorStop(0, 'rgb(0,0,0)');
	htGradient.addColorStop(1, finalStop);
	ctx.fillStyle = htGradient;
	ctx.fillRect(0, 0, width, GRADIENT_SIZE);

	// for now, the spectrum analyzer will render this
	/*
	const hbGradient = ctx.createLinearGradient(
		0,
		height,
		0,
		height - GRADIENT_SIZE
	);
	hbGradient.addColorStop(0, 'rgb(0,0,0)');
	hbGradient.addColorStop(1, finalStop);
	ctx.fillStyle = hbGradient;
	ctx.fillRect(0, height - GRADIENT_SIZE, width, GRADIENT_SIZE);
	*/
}

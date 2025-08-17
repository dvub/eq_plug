import { curve } from '@/lib/curve_func';
import { normalizeLog, gainToDb, normalizeLinear } from '@/lib/utils';
import { MAX_FREQ, MIN_FREQ, SLOPE } from './Equalizer';

// NOTE: it would probably be good to figure out a more "correct" value
const NUM_INTERPOLATED_POINTS = 50;

export function drawSpectrum(
	spectrum: number[],
	ctx: CanvasRenderingContext2D,
	fill: boolean,
	maxDb: number,
	minDb: number,
	width: number,
	height: number
) {
	// note: this is [x1,y1,x2,y2,...];

	ctx.beginPath();

	// initial point
	const x = getScaledX(0, spectrum.length, width);
	const y = getScaledY(0, spectrum, height, minDb, maxDb);
	ctx.moveTo(x, y);

	// explanation: really, we only need to interpolate the first few bins.
	// after that, due to log scaling, interpolation isn't necessary for better visuals
	// even though our interpolation is fairly optimized, we can skip interpolation altogether for performance.
	const coordinates = [];
	for (let i = 1; i <= NUM_INTERPOLATED_POINTS; i++) {
		const x = getScaledX(i, spectrum.length, width);
		const y = getScaledY(i, spectrum, height, minDb, maxDb);

		coordinates.push(x);
		coordinates.push(y);
	}
	curve(ctx, coordinates);

	// non-interpolated portion

	// at a certain point with our log scaling,
	// multiple bins will fall on one x-coordinate.
	// we want to make sure we render ONLY the bin w/ max amplitude for each x-coordinate.

	// NOTE: we keep the level in this object for convenient comparing.
	type FFTBin = {
		xCoordinate: number;
		index: number;
		level: number;
	};
	const bins: FFTBin[] = new Array(width);

	for (let i = NUM_INTERPOLATED_POINTS; i < spectrum.length; i++) {
		const x = getScaledX(i, spectrum.length, width);
		const roundedX = Math.floor(x);

		const newBin: FFTBin = {
			xCoordinate: x,
			index: i,
			level: spectrum[i],
		};

		const currentBand = bins[roundedX];
		if (!currentBand || newBin.level > currentBand.level) {
			bins[roundedX] = newBin;
		}
	}

	for (const max of bins) {
		if (max) {
			const y = getScaledY(max.index, spectrum, height, minDb, maxDb);
			ctx.lineTo(max.xCoordinate, y);
		}
	}

	if (fill) {
		ctx.lineTo(width, height);
		ctx.lineTo(0, height);
		ctx.fill();
	}

	ctx.stroke();
}

function getScaledX(i: number, length: number, width: number) {
	const linearFreq = (i / length) * MAX_FREQ;
	return normalizeLog(linearFreq, MIN_FREQ, MAX_FREQ) * width;
}

function getScaledY(
	i: number,
	input: number[],
	height: number,
	minDb: number,
	maxDb: number
) {
	const linearFreq = (i / input.length) * MAX_FREQ;

	const magnitudeSlopeDivisor = Math.pow(Math.log2(MAX_FREQ), SLOPE) / SLOPE;
	const linearSlopeFactor =
		Math.pow(Math.log2(linearFreq), SLOPE) / magnitudeSlopeDivisor;

	const slopedLinearValue = input[i] * linearSlopeFactor;

	const slopedDb = gainToDb(slopedLinearValue);

	const normY = normalizeLinear(slopedDb, minDb, maxDb);

	return (1 - normY) * height;
}

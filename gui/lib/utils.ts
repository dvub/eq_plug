// TODO: optimize..?
export function normalizeLog(value: number, min: number, max: number) {
	const minl = Math.log2(min);
	const range = Math.log2(max) - minl;
	return (Math.log2(value) - minl) / range;
}

const MINUS_INFINITY_GAIN = 1e-5;
export function gainToDb(gain: number) {
	return Math.log10(Math.max(gain, MINUS_INFINITY_GAIN)) * 20;
}

export function normalizeLinear(value: number, min: number, max: number) {
	return (value - min) / (max - min);
}

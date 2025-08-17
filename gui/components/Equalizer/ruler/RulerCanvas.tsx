import { useRef, useEffect } from 'react';
import { drawRuler } from './ruler';

export function RulerCanvas(props: { className: string | undefined }) {
	const staticCanvasRef = useRef<HTMLCanvasElement | null>(null);

	useEffect(() => {
		const canvas = staticCanvasRef.current;
		if (!canvas) return;

		canvas.width = canvas.offsetWidth;
		canvas.height = canvas.offsetHeight;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		drawRuler(ctx);
	}, []);

	return <canvas className={props.className} ref={staticCanvasRef} />;
}

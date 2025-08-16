import { Spectrum } from '@/components/Spectrum';

// NOTE: for reference, ableton's spectrum has a maximum refresh rate of 40ms, which is roughly 25 FPS
// so 30 FPS is already doing better in that regard

export default function Home() {
	return (
		<div className='w-screen h-screen overflow-hidden bg-black'>
			<Spectrum fps={60} className='w-full h-full' />
		</div>
	);
}

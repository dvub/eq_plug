// NOTE: for reference, ableton's spectrum has a maximum refresh rate of 40ms, which is roughly 25 FPS
// so 30 FPS is already doing better in that regard

import { Equalizer } from '@/components/equalizer/Equalizer';

export default function Home() {
	return (
		<div className='w-screen h-screen overflow-hidden bg-black'>
			<Equalizer className='w-full h-full' />
		</div>
	);
}

'use client';

import { Equalizer } from '@/components/equalizer/Equalizer';
import { Resize } from '@/components/Resize';
import { sendToPlugin } from '@/lib';
import { useEffect } from 'react';

// TODO:
// refactor top bar
// fix font loading in canvas elements
// ensure *everything* resizes properly
// improve look/feel of eq nodes
// -- add keyboard handlers
// add actual knobs - need to think on design
// add more filters/bands (more bells, shelves, etc.)
// eventually.. make configurable

// accessibility as well
// optimize
export default function Home() {
	useEffect(() => {
		sendToPlugin({ type: 'init' });
	}, []);

	return (
		<div className='w-screen h-screen bg-black text-white overflow-hidden'>
			<div className='w-full h-[5%] flex items-center text-lg justify-between px-5'>
				<h1>EQ-6</h1>
				<h1>DVUB</h1>
			</div>
			<Equalizer className='w-full h-[95%]' />

			<Resize />
		</div>
	);
}

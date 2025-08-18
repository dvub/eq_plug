'use client';

import { Equalizer } from '@/components/equalizer/Equalizer';

import { sendToPlugin } from '@/lib';
import { useEffect } from 'react';

export default function Home() {
	useEffect(() => {
		sendToPlugin({ type: 'init' });
	}, []);

	return (
		<div className='w-screen h-screen overflow-hidden bg-black'>
			<Equalizer className='w-full h-full' />
		</div>
	);
}

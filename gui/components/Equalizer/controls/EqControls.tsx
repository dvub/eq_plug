import { createContext, RefObject, useEffect, useRef, useState } from 'react';
import { LABEL_MARGIN } from '../Equalizer';
import { EqControlNode } from './Control';

export type Dimensions = {
	width: number;
	height: number;
};
export const EqControlContainerContext = createContext<Dimensions | null>(null);

export function EqControls() {
	const containerRef = useRef<HTMLDivElement>(null);
	const { width, height } = useContainerDimensions(containerRef);

	return (
		<div
			className='absolute overflow-hidden h-full'
			ref={containerRef}
			style={{ width: `calc(100% - ${LABEL_MARGIN}px)` }} // TODO: make more elegant
		>
			<EqControlContainerContext value={{ width, height }}>
				<EqControlNode
					horizontalParam={'lowpass_freq'}
					verticalParam={'lowpass_q'}
					color='rgb(100,100,100)'
				/>
				<EqControlNode
					horizontalParam={'bell_freq'}
					verticalParam={'bell_gain'}
					altParam='bell_q'
					color='rgb(100,100,100)'
				/>
				<EqControlNode
					horizontalParam={'highpass_freq'}
					verticalParam={'highpass_q'}
					color='rgb(100,100,100)'
				/>
			</EqControlContainerContext>
		</div>
	);
}

const useContainerDimensions = (myRef: RefObject<HTMLElement | null>) => {
	const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

	useEffect(() => {
		const getDimensions = () => ({
			width: myRef.current!.offsetWidth,
			height: myRef.current!.offsetHeight,
		});

		const handleResize = () => {
			setDimensions(getDimensions());
		};

		if (myRef.current) {
			setDimensions(getDimensions());
		}

		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
		};
	}, [myRef]);

	return dimensions;
};

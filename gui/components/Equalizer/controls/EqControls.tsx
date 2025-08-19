import { Ref, RefObject, useEffect, useRef, useState } from 'react';
import { LABEL_MARGIN } from '../Equalizer';
import { Draggable, EqControlNode } from './Control';
import { DndContext } from '@dnd-kit/core';

// TODO: fix initial positioning

// TODO: provide width and height as a context
export function EqControls() {
	console.log('rendered control container');

	const containerRef = useRef<HTMLDivElement>(null);
	const { width, height } = useContainerDimensions(containerRef);

	return (
		<div
			className='h-[100%] absolute overflow-hidden'
			ref={containerRef}
			style={{ width: `calc(100% - ${LABEL_MARGIN}px)` }} // TODO: make more elegant
		>
			<DndContext>
				<Draggable />
			</DndContext>
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

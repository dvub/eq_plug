import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

export function Draggable() {
	console.log('render');
	const { attributes, listeners, setNodeRef, transform } = useDraggable({
		id: 'unique-id',
	});
	const style = {
		transform: CSS.Translate.toString(transform),
	};

	// TODO: use button for accessibility (or whatever is best)
	return (
		<div
			ref={setNodeRef}
			style={style}
			{...listeners}
			{...attributes}
			className='bg-red-500 w-5 h-5'
		/>
	);
}

import { Message } from '@/bindings/Message';

export function sendToPlugin(message: Message) {
	window.plugin.send(JSON.stringify(message));
}

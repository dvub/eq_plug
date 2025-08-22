import type { Metadata } from 'next';
import './globals.css';

import localFont from 'next/font/local';
export const metadata: Metadata = {
	title: 'EQ',
};

// TODO: fonts are still broken on release builds
const inter = localFont({
	src: '../public/inter.ttf',
	variable: '--inter',
});

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang='en' className={inter.variable}>
			<body className='antialiased overflow-hidden w-screen h-screen bg-black text-white'>
				{children}
			</body>
		</html>
	);
}

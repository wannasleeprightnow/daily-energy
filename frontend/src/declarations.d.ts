/// <reference types="vite/client" />

interface ImportMetaEnv {
	/** Backend base URL (overrides the default in constants.ts). */
	readonly VITE_API_URL?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

declare module "*.png" {
	const value: string;
	export default value;
}

declare module "*.svg" {
	const value: string;
	export default value;
}

declare module "*.jpg" {
	const value: string;
	export default value;
}

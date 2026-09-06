import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type ServerOptions } from 'vite';
import { Config } from '@ncu-courses/shared/config';

const serverOptions: ServerOptions = {
	allowedHosts: [Config.hostname],
	port: Config.clientPort,
	strictPort: true
};

export default defineConfig({
	server: serverOptions,
	preview: serverOptions,
	plugins: [
		tailwindcss(),
		sveltekit({
			paths: {
				base: "/ncu-courses"
			},
			compilerOptions: {
				runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter()
		})
	]
});

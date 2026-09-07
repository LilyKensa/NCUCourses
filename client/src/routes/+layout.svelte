<script lang="ts">
	import "./layout.css";

	let { children } = $props();
</script>

<svelte:head>
	<link rel="apple-touch-icon" sizes="180x180" href="/ncu-courses/apple-touch-icon.png">
	<link rel="icon" type="image/png" sizes="32x32" href="/ncu-courses/favicon-32x32.png">
	<link rel="icon" type="image/png" sizes="16x16" href="/ncu-courses/favicon-16x16.png">
	<link rel="manifest" href="/ncu-courses/site.webmanifest">
	
  <title>中央大學破爛系統超可憐</title>
</svelte:head>

{@render children()}

<script lang="ts">
	let { hours, children, ...restProps } = $props();
</script>

<div 
	class="flex-1 relative cursor-crosshair" 
	role="button"
	tabindex="0"
	{...restProps}
>
	<!-- Horizontal hour lines -->
	{#each hours as h}
		<div class="absolute w-full border-t border-stone-800/20" style="top: {h * 60}px;"></div>
	{/each}

	{@render children()}
</div>

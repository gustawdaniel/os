<script lang="ts">
	let { hours } = $props();
</script>

<div class="w-14 shrink-0 relative border-r border-stone-800/40 bg-stone-950/50">
	{#each hours as h}
		<div class="absolute w-full" style="top: {h * 60}px; height: 60px;">
			<span class="absolute top-0 right-2 -translate-y-1/2 text-[10px] font-mono text-stone-700 leading-none">{String(h).padStart(2,'0')}:00</span>
		</div>
	{/each}
</div>

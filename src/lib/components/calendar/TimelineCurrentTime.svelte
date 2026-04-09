<script lang="ts">
	let { nowPx } = $props();
</script>

<div class="absolute w-full flex items-center z-20 pointer-events-none" style="top: {nowPx}px;">
	<div class="w-2 h-2 rounded-full bg-red-500 -ml-1 shrink-0"></div>
	<div class="flex-1 border-t border-red-500/60 shadow-[0_0_10px_rgba(239,68,68,0.3)]"></div>
</div>

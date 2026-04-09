<script lang="ts">
	// GTD Workflow Page
</script>

<svelte:head>
	<title>GTD Workflow - Personal OS</title>
</svelte:head>

<div class="h-full flex flex-col p-8 lg:p-12">
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-white tracking-tight mb-2">GTD Workflow</h1>
		<p class="text-stone-400 text-sm">Getting Things Done - Diagram przepływu pracy</p>
	</div>

	<div class="flex-1 bg-stone-900/40 border border-stone-800/40 rounded-[2.5rem] p-8 overflow-y-auto custom-scrollbar flex items-center justify-center">
		<img 
			src="/gtd-workflow.gif" 
			alt="Getting Things Done Workflow Diagram" 
			class="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl bg-white p-4"
		/>
	</div>
</div>

<style>
	.custom-scrollbar::-webkit-scrollbar {
		width: 8px;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: #27272a;
		border-radius: 10px;
	}
</style>

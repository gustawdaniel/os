<script lang="ts">
	import { enhance } from '$app/forms';
	import { Trash2, Play, CheckSquare } from 'lucide-svelte';

	let { task, type = 'inbox', onEdit } = $props();

	const isInbox = $derived.by(() => type === 'inbox');
	const isNext = $derived.by(() => type === 'next');
</script>

<div class="group flex items-center gap-3 p-3 rounded-xl transition-all
	{isInbox ? 'bg-stone-900/40 border border-stone-800/40 hover:border-indigo-500/30' : 'bg-indigo-500/5 border border-indigo-500/20 hover:border-indigo-500/40'}">
	
	{#if isInbox}
		<div class="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-0.5"></div>
	{:else if isNext}
		<form method="POST" action="?/completeTask" use:enhance>
			<input type="hidden" name="taskId" value={task.todoistId || task.id} />
			<button type="submit" class="w-3.5 h-3.5 rounded-full border border-indigo-500/30 hover:bg-emerald-500/20 transition-colors flex items-center justify-center">
				<CheckSquare size={10} class="opacity-0 group-hover:opacity-50 text-emerald-400" />
			</button>
		</form>
	{/if}

	<button 
		class="flex-1 min-w-0 text-left focus:outline-none"
		onclick={() => onEdit(task, 'task')}
	>
		<p class="text-xs truncate {isInbox ? 'text-stone-300' : 'text-stone-200'}">{task.title}</p>
		{#if isInbox && task.estimate}
			<p class="text-[9px] text-stone-600 font-mono italic">{task.estimate}m</p>
		{/if}
	</button>

	<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
		{#if isInbox}
			<form method="POST" action="?/startTimer" use:enhance>
				<input type="hidden" name="description" value={task.title} />
				<button type="submit" class="p-1 text-stone-600 hover:text-emerald-400" title="Start Activity">
					<Play size={10} />
				</button>
			</form>
		{/if}
		<form method="POST" action="?/deleteGtdTask" use:enhance>
			<input type="hidden" name="id" value={task.id} />
			<button type="submit" class="p-1 text-stone-600 hover:text-red-400" title="Delete">
				<Trash2 size={10} />
			</button>
		</form>
	</div>
</div>

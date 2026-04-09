<script lang="ts">
	import { enhance } from '$app/forms';
	import { format, differenceInMinutes } from 'date-fns';
	import { History, Play, Trash2, Clock } from 'lucide-svelte';

	let { 
		timeEntries = [],
		onEdit = (entry: any) => {}
	} = $props();

	const finishedEntries = $derived(
		timeEntries
			.filter(e => e.endAt)
			.sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())
	);

	function formatDuration(start: string, end: string) {
		const mins = differenceInMinutes(new Date(end), new Date(start));
		if (mins < 60) return `${mins}m`;
		return `${Math.floor(mins / 60)}h ${mins % 60}m`;
	}
</script>

<div class="mt-8 space-y-4">
	<h3 class="text-[10px] font-bold text-stone-600 uppercase tracking-[0.3em] flex items-center gap-2 px-1">
		<History size={10} /> Daily Logs
	</h3>

	<div class="space-y-2">
		{#each finishedEntries as entry}
			<div class="group flex items-center gap-3 p-3 rounded-xl bg-stone-900/40 border border-stone-800/20 hover:border-emerald-500/20 transition-all">
				<button 
					class="flex-1 min-w-0 text-left focus:outline-none"
					onclick={() => onEdit(entry)}
				>
					<p class="text-[11px] text-stone-300 truncate">{entry.description || '(no description)'}</p>
					<div class="flex items-center gap-2 mt-1">
						<span class="text-[9px] text-stone-600 font-mono">
							{format(new Date(entry.startAt), 'HH:mm')} - {format(new Date(entry.endAt), 'HH:mm')}
						</span>
						<span class="text-[9px] text-emerald-500/60 font-medium bg-emerald-500/5 px-1.5 rounded-full border border-emerald-500/10">
							{formatDuration(entry.startAt, entry.endAt)}
						</span>
					</div>
				</button>
				
				<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
					<form method="POST" action="?/startTimer" use:enhance>
						<input type="hidden" name="description" value={entry.description} />
						<button type="submit" class="p-1 text-stone-600 hover:text-emerald-400" title="Restart">
							<Play size={10} />
						</button>
					</form>
					<form method="POST" action="?/deleteEntry" use:enhance>
						<input type="hidden" name="id" value={entry.id} />
						<button type="submit" class="p-1 text-stone-600 hover:text-red-400" title="Delete">
							<Trash2 size={10} />
						</button>
					</form>
				</div>
			</div>
		{:else}
			<div class="text-center py-8 border border-dashed border-stone-800/40 rounded-2xl">
				<Clock size={16} class="mx-auto text-stone-800 mb-2" />
				<p class="text-[10px] text-stone-700 italic">No logs today yet</p>
			</div>
		{/each}
	</div>
</div>

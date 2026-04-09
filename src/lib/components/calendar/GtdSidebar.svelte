<script lang="ts">
	import { enhance } from '$app/forms';
	import { Inbox, Zap, Folder } from 'lucide-svelte';
	import ActivityLog from './ActivityLog.svelte';
	import GtdTaskItem from './GtdTaskItem.svelte';

	let { 
		inboxTasks = [], 
		nextTasks = [], 
		projects = [],
		timeEntries = [],
		onEdit = (item: any, type: 'task' | 'entry') => {}
	} = $props();

	let quickTask = $state('');
</script>

<div class="w-80 shrink-0 flex flex-col border-r border-stone-800/40 h-full bg-stone-950">
	<!-- Quick Capture -->
	<div class="p-5 border-b border-stone-800/40 space-y-4">
		<h2 class="text-[10px] font-bold text-stone-600 uppercase tracking-[0.3em] flex items-center gap-2">
			<Inbox size={12} /> Inbox
		</h2>
		
		<form method="POST" action="?/quickAddTask" use:enhance={() => {
			return async ({ update }) => {
				quickTask = '';
				await update();
			};
		}} class="relative">
			<input
				type="text"
				name="title"
				bind:value={quickTask}
				placeholder="Capture thought..."
				class="w-full bg-stone-900 border border-stone-800 text-white text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 transition-all placeholder-stone-700"
			/>
		</form>
	</div>

	<!-- Lists -->
	<div class="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
		<!-- Inbox Items -->
		<section class="space-y-2">
			{#each inboxTasks as task}
				<GtdTaskItem {task} type="inbox" {onEdit} />
			{/each}
			{#if inboxTasks.length === 0}
				<p class="text-[10px] text-stone-700 text-center py-4 italic">Inbox is empty</p>
			{/if}
		</section>

		<!-- Next Actions -->
		<section class="space-y-3">
			<h3 class="text-[10px] font-bold text-stone-600 uppercase tracking-[0.3em] flex items-center gap-2 px-1">
				<Zap size={10} /> Next Actions
			</h3>
			{#each nextTasks as task}
				<GtdTaskItem {task} type="next" {onEdit} />
			{/each}
		</section>

		<!-- Projects -->
		<section class="space-y-3">
			<h3 class="text-[10px] font-bold text-stone-600 uppercase tracking-[0.3em] flex items-center gap-2 px-1">
				<Folder size={10} /> Projects
			</h3>
			{#each projects as project}
				<div class="flex items-center gap-2 px-2 py-1.5 text-xs text-stone-400 hover:text-stone-200 cursor-pointer transition-colors">
					<div class="w-1 h-1 rounded-full bg-stone-700"></div>
					{project.title}
				</div>
			{:else}
				<p class="text-[10px] text-stone-800 px-2 italic">No projects active</p>
			{/each}
		</section>

		<!-- Activity Logs -->
		<ActivityLog {timeEntries} onEdit={(entry) => onEdit(entry, 'entry')} />
	</div>
</div>

<style>
	.custom-scrollbar::-webkit-scrollbar { width: 4px; }
	.custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 10px; }
</style>

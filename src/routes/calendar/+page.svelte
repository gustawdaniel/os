<script lang="ts">
	import { enhance } from '$app/forms';
	import { format, parseISO, differenceInMinutes, startOfDay } from 'date-fns';
	import { Calendar, Play, Square, Clock, ListTodo } from 'lucide-svelte';
	import Timeline from '$lib/components/calendar/Timeline.svelte';
	import GtdSidebar from '$lib/components/calendar/GtdSidebar.svelte';
	import QuickAddOverlay from '$lib/components/calendar/QuickAddOverlay.svelte';
	import QuickAddEntryOverlay from '$lib/components/calendar/QuickAddEntryOverlay.svelte';
	import EditOverlay from '$lib/components/calendar/EditOverlay.svelte';

	let { data } = $props();

	// --- Timer (Real spend time) ---
	let elapsed = $state(0); // seconds
	let isStopping = $state(false);
	
	const activeEntry = $derived(data.timeEntries.find((e: any) => !e.endAt));
	let activeDescription = $state('');

	$effect(() => {
		if (activeEntry) {
			activeDescription = activeEntry.description || '';
			const updateElapsed = () => {
				const start = new Date(activeEntry.startAt).getTime();
				elapsed = Math.max(0, Math.floor((Date.now() - start) / 1000));
			};
			
			updateElapsed();
			const interval = setInterval(updateElapsed, 1000);
			return () => clearInterval(interval);
		} else {
			elapsed = 0;
			activeDescription = '';
		}
	});

	function formatElapsed(s: number) {
		const h = Math.floor(s / 3600);
		const m = Math.floor((s % 3600) / 60);
		const sec = s % 60;
		return [h, m, sec].map(v => String(v).padStart(2, '0')).join(':');
	}

	let quickAdd = $state<{ date: Date, duration: number } | null>(null);
	let quickAddEntry = $state<{ date: Date, duration: number } | null>(null);

	const inboxTasks = $derived(data.gtdTasks.filter(t => t.status === 'INBOX'));
	const nextTasks = $derived(data.gtdTasks.filter(t => t.status === 'NEXT'));

	let editingItem = $state<{ item: any, type: 'task' | 'entry' } | null>(null);

	function openEdit(item: any, type: 'task' | 'entry') {
		editingItem = { item, type };
	}

	// Mobile tabs: 'gtd' | 'timeline'
	let mobileTab = $state<'gtd' | 'timeline'>('timeline');
</script>

<!-- Desktop layout -->
<div class="hidden md:flex h-full overflow-hidden bg-stone-950">
	<!-- GTD SIDEBAR -->
	<div class="flex flex-col h-full border-r border-stone-800/40 w-80 shrink-0">
		<!-- Manual Timer Bar (Toggl-style) - Always at top -->
		<div class="p-5 border-b border-stone-800/40 bg-indigo-500/[0.02]">
			<h2 class="text-[10px] font-bold text-stone-600 uppercase tracking-[0.3em] flex items-center gap-2 mb-3">
				<Play size={12} class="text-emerald-500" /> Quick Start
			</h2>
			<form 
				method="POST" 
				action="?/startTimer" 
				use:enhance={() => {
					return async ({ update }) => {
						await update();
					};
				}}
				class="relative group"
			>
				<div class="relative">
					<input
						type="text"
						name="description"
						placeholder="What are you doing now?"
						class="w-full bg-stone-950 border border-stone-800 text-white text-xs rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 transition-all placeholder-stone-800 font-medium"
					/>
					<button 
						type="submit"
						class="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all"
					>
						<Play size={14} fill="currentColor" />
					</button>
				</div>
			</form>
		</div>

		<!-- Timer / Active Entry -->
		{#if activeEntry}
			<div class="p-5 border-b border-emerald-500/10 bg-emerald-500/[0.03]">
				<h2 class="text-[10px] font-bold text-emerald-500/60 uppercase tracking-[0.3em] flex items-center gap-2 mb-3">
					<Clock size={12} /> Currently Tracking
				</h2>
				<div class="space-y-3">
					<div class="flex items-center gap-3 p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
						<div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>
						<div class="flex-1 min-w-0">
							<form 
								method="POST" 
								action="?/updateDescription" 
								use:enhance 
								onfocusout={(e) => {
									if (activeDescription !== activeEntry.description) {
										e.currentTarget.requestSubmit();
									}
								}}
							>
								<input type="hidden" name="id" value={activeEntry.id} />
								<input
									type="text"
									name="description"
									bind:value={activeDescription}
									class="w-full bg-transparent text-sm text-white focus:outline-none font-medium"
								/>
							</form>
							<p class="text-lg font-mono font-bold text-emerald-400 tabular-nums">{formatElapsed(elapsed)}</p>
						</div>
					</div>
					<form
						method="POST"
						action="?/stopTimer"
						use:enhance={() => {
							isStopping = true;
							return async ({ update }) => {
								await update();
								isStopping = false;
							};
						}}
					>
						<input type="hidden" name="id" value={activeEntry.id} />
						<button
							type="submit"
							disabled={isStopping}
							class="w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-400 hover:text-red-400 hover:border-red-500/30 transition-all text-xs font-medium"
						>
							{#if isStopping}
								<div class="w-3 h-3 border-2 border-stone-400 border-t-transparent rounded-full animate-spin"></div>
							{:else}
								<Square size={12} /> Stop Activity
							{/if}
						</button>
					</form>
				</div>
			</div>
		{/if}

		<GtdSidebar 
			{inboxTasks} 
			{nextTasks} 
			projects={[]} 
			timeEntries={data.timeEntries} 
			onEdit={openEdit}
		/>
	</div>

	<!-- TIMELINE -->
	<Timeline 
		calendarEvents={data.calendarEvents} 
		gtdTasks={data.gtdTasks} 
		timeEntries={data.timeEntries} 
		onQuickAdd={(date, duration = 30) => {
			quickAdd = { date, duration };
		}}
		onQuickAddEntry={(date, duration = 30) => {
			quickAddEntry = { date, duration };
		}}
		onEdit={openEdit}
	/>
</div>

<!-- Mobile layout -->
<div class="flex md:hidden flex-col h-full overflow-hidden bg-stone-950">
	<!-- Mobile Tab Bar -->
	<div class="flex shrink-0 border-b border-stone-800/50 bg-stone-900/30">
		<button
			onclick={() => mobileTab = 'timeline'}
			class="flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-widest transition-all
				{mobileTab === 'timeline' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-stone-600'}"
		>
			<Calendar size={14} /> Kalendarz
		</button>
		<button
			onclick={() => mobileTab = 'gtd'}
			class="flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-widest transition-all
				{mobileTab === 'gtd' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-stone-600'}"
		>
			<ListTodo size={14} /> Timer / GTD
		</button>
	</div>

	<!-- Timeline Panel -->
	<div class="{mobileTab === 'timeline' ? 'flex' : 'hidden'} flex-1 flex-col overflow-hidden">
		<Timeline 
			calendarEvents={data.calendarEvents} 
			gtdTasks={data.gtdTasks} 
			timeEntries={data.timeEntries} 
			onQuickAdd={(date, duration = 30) => {
				quickAdd = { date, duration };
			}}
			onQuickAddEntry={(date, duration = 30) => {
				quickAddEntry = { date, duration };
			}}
			onEdit={openEdit}
		/>
	</div>

	<!-- GTD / Timer Panel -->
	<div class="{mobileTab === 'gtd' ? 'flex' : 'hidden'} flex-1 flex-col overflow-y-auto">
		<!-- Quick Start Timer -->
		<div class="p-4 border-b border-stone-800/40 bg-indigo-500/[0.02]">
			<h2 class="text-[10px] font-bold text-stone-600 uppercase tracking-[0.3em] flex items-center gap-2 mb-3">
				<Play size={12} class="text-emerald-500" /> Quick Start
			</h2>
			<form 
				method="POST" 
				action="?/startTimer" 
				use:enhance={() => {
					return async ({ update }) => {
						await update();
					};
				}}
			>
				<div class="relative">
					<input
						type="text"
						name="description"
						placeholder="What are you doing now?"
						class="w-full bg-stone-950 border border-stone-800 text-white text-xs rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 transition-all placeholder-stone-800 font-medium"
					/>
					<button 
						type="submit"
						class="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all"
					>
						<Play size={14} fill="currentColor" />
					</button>
				</div>
			</form>
		</div>

		<!-- Active Entry -->
		{#if activeEntry}
			<div class="p-4 border-b border-emerald-500/10 bg-emerald-500/[0.03]">
				<h2 class="text-[10px] font-bold text-emerald-500/60 uppercase tracking-[0.3em] flex items-center gap-2 mb-3">
					<Clock size={12} /> Currently Tracking
				</h2>
				<div class="flex items-center gap-3 p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 mb-3">
					<div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>
					<div class="flex-1 min-w-0">
						<form 
							method="POST" 
							action="?/updateDescription" 
							use:enhance
							onfocusout={(e) => {
								if (activeDescription !== activeEntry.description) {
									e.currentTarget.requestSubmit();
								}
							}}
						>
							<input type="hidden" name="id" value={activeEntry.id} />
							<input
								type="text"
								name="description"
								bind:value={activeDescription}
								class="w-full bg-transparent text-sm text-white focus:outline-none font-medium"
							/>
						</form>
						<p class="text-xl font-mono font-bold text-emerald-400 tabular-nums">{formatElapsed(elapsed)}</p>
					</div>
				</div>
				<form
					method="POST"
					action="?/stopTimer"
					use:enhance={() => {
						isStopping = true;
						return async ({ update }) => {
							await update();
							isStopping = false;
						};
					}}
				>
					<input type="hidden" name="id" value={activeEntry.id} />
					<button
						type="submit"
						disabled={isStopping}
						class="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-400 hover:text-red-400 hover:border-red-500/30 transition-all text-sm font-medium"
					>
						{#if isStopping}
							<div class="w-3 h-3 border-2 border-stone-400 border-t-transparent rounded-full animate-spin"></div>
						{:else}
							<Square size={14} /> Stop Activity
						{/if}
					</button>
				</form>
			</div>
		{/if}

		<GtdSidebar 
			{inboxTasks} 
			{nextTasks} 
			projects={[]} 
			timeEntries={data.timeEntries} 
			onEdit={openEdit}
		/>
	</div>
</div>

{#if quickAdd}
	<QuickAddOverlay 
		date={quickAdd.date} 
		defaultDuration={quickAdd.duration}
		onCancel={() => quickAdd = null}
		onSuccess={() => quickAdd = null}
	/>
{/if}
{#if quickAddEntry}
	<QuickAddEntryOverlay 
		date={quickAddEntry.date} 
		defaultDuration={quickAddEntry.duration}
		onCancel={() => quickAddEntry = null}
		onSuccess={() => quickAddEntry = null}
	/>
{/if}
{#if editingItem}
	<EditOverlay 
		item={editingItem.item} 
		type={editingItem.type} 
		onCancel={() => editingItem = null}
		onSuccess={() => editingItem = null}
	/>
{/if}

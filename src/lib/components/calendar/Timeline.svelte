<script lang="ts">
	import { format, parseISO, differenceInMinutes, startOfDay } from 'date-fns';
	import { Calendar } from 'lucide-svelte';
	import { enhance } from '$app/forms';
	
	import TimelineGrid from './TimelineGrid.svelte';
	import TimelineHourAxis from './TimelineHourAxis.svelte';
	import TimelineCurrentTime from './TimelineCurrentTime.svelte';
	import TimelineItem from './TimelineItem.svelte';

	let { 
		calendarEvents = [], 
		gtdTasks = [], 
		timeEntries = [],
		onScheduleTask = (id: string, time: Date) => {},
		onQuickAdd = (time: Date) => {},
		onQuickAddEntry = (time: Date) => {},
		onEdit = (item: any, type: 'task' | 'entry') => {}
	} = $props();

	const hours = Array.from({ length: 25 }, (_, i) => i);
	const nowPx = $derived(differenceInMinutes(new Date(), startOfDay(new Date())));

	// Drag & Drop State
	let dragging = $state<{
		id: string;
		type: 'task' | 'entry' | 'gcal';
		mode: 'move' | 'resize-top' | 'resize-bottom';
		initialY: number;
		offset: number;
		item: any;
	} | null>(null);

	let dragDelta = $state(0);
	const dragDeltaSnapped = $derived(Math.round(dragDelta / 5) * 5);

	function getTopPercent(dateStr: string | Date) {
		const date = new Date(dateStr);
		const start = startOfDay(date);
		return (differenceInMinutes(date, start) / 1440) * 100;
	}

	function getHeightPercent(startStr: string | Date, endStr: string | Date | null, durationMinutes?: number) {
		const start = new Date(startStr);
		let end: Date;
		if (endStr) {
			end = new Date(endStr);
		} else if (durationMinutes) {
			end = new Date(start.getTime() + durationMinutes * 60000);
		} else {
			end = new Date();
		}
		const duration = Math.max(differenceInMinutes(end, start), 5);
		return (duration / 1440) * 100;
	}

	function handleTimelineClick(e: MouseEvent) {
		if (e.target !== e.currentTarget) return;
		if (dragging) return;
		const target = e.currentTarget as HTMLDivElement;
		const rect = target.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const isActual = x > rect.width / 2;
		const y = e.clientY - rect.top;
		const minutesPerPixel = 1440 / rect.height;
		let totalMinutes = Math.round((y * minutesPerPixel) / 5) * 5;
		const date = startOfDay(new Date());
		date.setMinutes(totalMinutes);
		if (isActual) onQuickAddEntry(date);
		else onQuickAdd(date);
	}

	function handleDragStart(e: PointerEvent, item: any, type: 'task' | 'entry' | 'gcal', mode: 'move' | 'resize-top' | 'resize-bottom' = 'move') {
		e.stopPropagation();
		const target = e.currentTarget as HTMLElement;
		const rect = target.getBoundingClientRect();
		dragging = { id: item.id, type, mode, initialY: e.clientY, offset: e.clientY - rect.top, item };
		target.setPointerCapture(e.pointerId);
	}

	function handleDragMove(e: PointerEvent) {
		if (!dragging) return;
		dragDelta = e.clientY - dragging.initialY;
	}

	async function handleDragEnd(e: PointerEvent) {
		if (!dragging) return;
		
		const deltaMins = dragDeltaSnapped;
		if (Math.abs(deltaMins) >= 1) {
			const { item, mode, type, id } = dragging;
			const initialStart = new Date(item.startAt || item.scheduledAt || item.start?.dateTime || item.start?.date);
			let newStart = new Date(initialStart.getTime());
			
			// Fix: Initial duration should be based on real item data, not default 30 for entries
			let newDuration = item.duration;
			if (type === 'entry') {
				const endAt = item.endAt ? new Date(item.endAt) : new Date();
				newDuration = differenceInMinutes(endAt, initialStart);
			} else if (!newDuration) {
				newDuration = 30; // Fallback for tasks without duration
			}

			if (mode === 'move') newStart = new Date(newStart.getTime() + deltaMins * 60000);
			else if (mode === 'resize-top') {
				newStart = new Date(newStart.getTime() + deltaMins * 60000);
				newDuration = Math.max(5, newDuration - deltaMins);
			} else if (mode === 'resize-bottom') newDuration = Math.max(5, newDuration + deltaMins);

			newStart.setMinutes(Math.round(newStart.getMinutes() / 5) * 5);
			newStart.setSeconds(0);
			newStart.setMilliseconds(0);
			newDuration = Math.max(5, Math.round(newDuration / 5) * 5);

			const formData = new FormData();
			formData.append('id', id);
			
			if (type === 'entry') {
				const finalEnd = new Date(newStart.getTime() + newDuration * 60000);
				formData.append('startAt', newStart.toISOString());
				if (item.endAt || mode.startsWith('resize')) formData.append('endAt', finalEnd.toISOString());
				await fetch('?/updateTimeEntry', { method: 'POST', body: formData });
			} else if (type === 'task') {
				formData.append('scheduledAt', newStart.toISOString());
				formData.append('duration', String(newDuration));
				await fetch('?/updateGtdTask', { method: 'POST', body: formData });
			} else if (type === 'gcal') {
				const finalEnd = new Date(newStart.getTime() + newDuration * 60000);
				const gcalFormData = new FormData();
				gcalFormData.append('id', id);
				gcalFormData.append('calendarId', item.calendarId || 'primary');
				gcalFormData.append('startAt', newStart.toISOString());
				gcalFormData.append('endAt', finalEnd.toISOString());
				await fetch('?/updateGCalEvent', { method: 'POST', body: gcalFormData });
			}
		}
		dragging = null;
		dragDelta = 0;
	}
</script>

<div class="flex-1 flex flex-col h-full min-w-0 bg-stone-950 select-none">
	<!-- Header -->
	<div class="px-6 py-4 border-b border-stone-800/40 flex items-center justify-between bg-stone-900/20 backdrop-blur-sm sticky top-0 z-30">
		<div>
			<p class="text-[10px] font-bold text-stone-600 uppercase tracking-[0.3em]">
				<Calendar class="inline w-3 h-3 mr-1" />
				Timeline — {format(new Date(), 'EEEE, d MMMM')}
			</p>
		</div>
		<div class="flex items-center gap-5 text-[10px] font-bold uppercase tracking-widest text-stone-600">
			<span class="flex items-center gap-1.5"><div class="w-2 h-2 rounded bg-indigo-500/30 border border-indigo-500/40 inline-block"></div> Plan</span>
			<span class="flex items-center gap-1.5"><div class="w-2 h-2 rounded bg-emerald-500/30 border border-emerald-500/40 inline-block"></div> Actual</span>
		</div>
	</div>

	<!-- Scroll Area -->
	<div class="flex-1 overflow-y-auto custom-scrollbar">
		<div 
			class="relative flex" style="height: 1440px;" 
			onpointermove={handleDragMove} onpointerup={handleDragEnd}
			role="region" 
			aria-label="Timeline interaction area"
		>
			<TimelineHourAxis {hours} />
			
			<TimelineGrid {hours} onclick={handleTimelineClick} onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onQuickAdd(new Date())}>
				<TimelineCurrentTime {nowPx} />

				<!-- Plan Layer -->
				<div class="absolute inset-0 z-10 pointer-events-none">
					{#each [...calendarEvents, ...gtdTasks.filter(t => t.scheduledAt)] as event}
						{@const start = event.start?.dateTime || event.start?.date || event.scheduledAt}
						{@const end = event.end?.dateTime || event.end?.date || null}
						{@const duration = event.duration || 30}
						{#if start}
							<TimelineItem 
								item={event} type={event.status ? 'task' : 'gcal'}
								isDragging={dragging?.id === event.id} dragDelta={dragDeltaSnapped} dragMode={dragging?.mode}
								left="2%" width="44%" 
								top={getTopPercent(start) * 14.4} 
								height={getHeightPercent(start, end, duration) * 14.4}
								onDragStart={handleDragStart}
								onclick={(e) => { e.stopPropagation(); onEdit(event, event.status ? 'task' : 'gcal'); }}
							/>
						{/if}
					{/each}
				</div>

				<!-- Actual Layer -->
				<div class="absolute inset-0 z-10 pointer-events-none">
					{#each timeEntries as entry}
						<TimelineItem 
							item={entry} type="entry"
							isDragging={dragging?.id === entry.id} dragDelta={dragDeltaSnapped} dragMode={dragging?.mode}
							left="52%" width="44%" 
							top={getTopPercent(entry.startAt) * 14.4} 
							height={getHeightPercent(entry.startAt, entry.endAt) * 14.4}
							onDragStart={handleDragStart}
							onclick={(e) => { e.stopPropagation(); onEdit(entry, 'entry'); }}
						/>
					{/each}
				</div>
			</TimelineGrid>
		</div>
	</div>
</div>

<style>
	.custom-scrollbar::-webkit-scrollbar { width: 6px; }
	.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
	.custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 10px; }
	.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
</style>

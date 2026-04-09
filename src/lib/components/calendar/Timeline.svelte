<script lang="ts">
	import { format, parseISO, differenceInMinutes, startOfDay } from 'date-fns';
	import { Calendar } from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	
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

	let justDragged = $state(false);

	let creating = $state<{ startY: number, currentY: number, isActual: boolean, active: boolean } | null>(null);

	const creationStartMins = $derived(
		creating ? Math.round((Math.min(creating.startY, creating.currentY) * (1440 / 1440)) / 5) * 5 : 0
	);
	const creationDurationMins = $derived(
		creating ? Math.max(15, Math.round((Math.abs(creating.startY - creating.currentY) * (1440 / 1440)) / 5) * 5) : 30
	);

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

	function handleGridPointerDown(e: PointerEvent) {
		console.log('[DRAG-CREATE] Pointer down');
		if (e.target !== e.currentTarget) return;
		if (dragging) return;
		const target = e.currentTarget as HTMLDivElement;
		const rect = target.getBoundingClientRect();
		const y = e.clientY - rect.top;
		const x = e.clientX - rect.left;
		creating = { startY: y, currentY: y, isActual: x > rect.width / 2, active: true };
		target.setPointerCapture(e.pointerId);
	}

	function handleGridPointerMove(e: PointerEvent) {
		if (!creating || !creating.active) return;
		const target = e.currentTarget as HTMLDivElement;
		const rect = target.getBoundingClientRect();
		creating.currentY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
	}

	function handleGridPointerUp(e: PointerEvent) {
		if (!creating || !creating.active) return;
		console.log(`[DRAG-CREATE] Pointer up. Duration: ${creationDurationMins}m, Start: ${creationStartMins}m`);
		
		const startDate = startOfDay(new Date());
		startDate.setMinutes(creationStartMins);
		
		const isActual = creating.isActual;
		const duration = creationDurationMins;
		
		creating = null;

		if (isActual) onQuickAddEntry(startDate, duration);
		else onQuickAdd(startDate, duration);
	}

	function handleItemClick(e: MouseEvent, item: any, type: 'task' | 'entry' | 'gcal') {
		e.stopPropagation();
		console.log(`[ITEM-CLICK] Called on item ${item.id}. justDragged=${justDragged}`);
		if (justDragged) {
			console.log(`[ITEM-CLICK] Blocked edit modal because justDragged is true`);
			return;
		}
		onEdit(item, type);
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
		
		console.log(`[DRAG-RESIZE] End triggered. DeltaMins: ${dragDeltaSnapped}`);
		const deltaMins = dragDeltaSnapped;
		const wasDragging = dragging !== null && Math.abs(dragDelta) > 0;
		const currentDragging = { ...dragging }; // Capture to process fetch safely
		
		// Synchronous reset before any async yield so the subsequent click event sees that we just dragged
		dragging = null;
		dragDelta = 0;
		if (wasDragging) {
			justDragged = true;
			console.log(`[DRAG-RESIZE] Setting justDragged to true`);
			setTimeout(() => {
				justDragged = false;
				console.log(`[DRAG-RESIZE] justDragged timeout ended`);
			}, 200);
		}

		if (Math.abs(deltaMins) >= 1) {
			console.log(`[DRAG-RESIZE] Committing save for id: ${currentDragging.id}`);
			const { item, mode, type, id } = currentDragging;
			const initialStart = new Date(item.startAt || item.scheduledAt || item.start?.dateTime || item.start?.date);
			let newStart = new Date(initialStart.getTime());
			
			let newDuration = item.duration;
			if (type === 'entry') {
				const endAt = item.endAt ? new Date(item.endAt) : new Date();
				newDuration = differenceInMinutes(endAt, initialStart);
			} else if (type === 'gcal') {
				const endAt = new Date(item.end?.dateTime || item.end?.date || initialStart);
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
				await fetch('?/updateTimeEntry', { method: 'POST', body: formData, headers: { 'x-sveltekit-action': 'true' } });
			} else if (type === 'task') {
				formData.append('scheduledAt', newStart.toISOString());
				formData.append('duration', String(newDuration));
				await fetch('?/updateGtdTask', { method: 'POST', body: formData, headers: { 'x-sveltekit-action': 'true' } });
			} else if (type === 'gcal') {
				const finalEnd = new Date(newStart.getTime() + newDuration * 60000);
				const gcalFormData = new FormData();
				gcalFormData.append('id', id);
				gcalFormData.append('calendarId', item.calendarId || 'primary');
				gcalFormData.append('startAt', newStart.toISOString());
				gcalFormData.append('endAt', finalEnd.toISOString());
				
				console.log(`[DRAG-RESIZE] Fetching updateGCalEvent...`);
				const res = await fetch('?/updateGCalEvent', { 
					method: 'POST', 
					body: gcalFormData,
					headers: { 'x-sveltekit-action': 'true' }
				});
				const text = await res.text();
				console.log(`[DRAG-RESIZE] Server response for GCal:`, text);
			}
			await invalidateAll();
		}
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
			
			<TimelineGrid 
				{hours} 
				onpointerdown={handleGridPointerDown}
				onpointermove={handleGridPointerMove}
				onpointerup={handleGridPointerUp}
				onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onQuickAdd(new Date(), 30)}
			>
				<TimelineCurrentTime {nowPx} />
				
				<!-- Ghost Drag-to-Create Box -->
				{#if creating}
					<div 
						class="absolute rounded-xl px-2 py-1 bg-stone-500/20 border-2 border-dashed border-stone-500/50 pointer-events-none z-40 transition-all flex items-start justify-center"
						style="left: {creating.isActual ? '52%' : '2%'}; width: 44%; top: {(creationStartMins / 1440) * 100}%; height: {(creationDurationMins / 1440) * 100}%;"
					>
						<span class="text-[10px] font-bold text-stone-300 mt-1">{creationDurationMins}m</span>
					</div>
				{/if}

				<!-- Plan Layer -->
				<div class="absolute inset-0 z-10 pointer-events-none">
					{#each [...calendarEvents, ...gtdTasks.filter(t => t.scheduledAt)] as event}
						{@const start = event.start?.dateTime || event.start?.date || event.scheduledAt}
						{@const end = event.end?.dateTime || event.end?.date || null}
						{@const duration = event.duration || 30}
						{#if start}
							<TimelineItem 
								item={event} type={event.calendarName ? 'gcal' : 'task'}
								isDragging={dragging?.id === event.id} dragDelta={dragDeltaSnapped} dragMode={dragging?.mode}
								left="2%" width="44%" 
								top={getTopPercent(start) * 14.4} 
								height={getHeightPercent(start, end, duration) * 14.4}
								onDragStart={handleDragStart}
								onclick={(e) => handleItemClick(e, event, event.calendarName ? 'gcal' : 'task')}
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
							onclick={(e) => handleItemClick(e, entry, 'entry')}
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

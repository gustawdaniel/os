<script lang="ts">
	import { format, parseISO } from 'date-fns';

	let { 
		item, 
		type, 
		isDragging, 
		dragDelta, 
		dragMode,
		left, 
		width, 
		top, 
		height,
		onDragStart,
		onclick
	} = $props();

	const isGtd = $derived.by(() => type === 'task');
	const isEntry = $derived.by(() => type === 'entry');
	const isGcal = $derived.by(() => type === 'gcal');

	// GCal Color Mapping helper
	const gcalColors: Record<string, string> = {
		"1": "#a4bdfc", "2": "#7ae7bf", "3": "#dbadff", "4": "#ff887c", "5": "#fbd75b",
		"6": "#ffb878", "7": "#46d6db", "8": "#e1e1e1", "9": "#5484ed", "10": "#51b886", "11": "#dc2127"
	};

	const baseColor = $derived(
		isEntry ? '#10b981' : 
		(item.backgroundColor || item.color || (item.colorId ? gcalColors[item.colorId] : '#6366f1'))
	);

	// Helper for colors
	const bgColor = $derived(
		isEntry ? (item.endAt ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.25)') :
		`${baseColor}35`
	);
	const borderColor = $derived(
		isEntry ? (item.endAt ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.6)') :
		`${baseColor}80`
	);
	const textColor = $derived(isEntry ? 'text-emerald-300' : 'text-indigo-100');
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="absolute rounded-xl px-2.5 py-1.5 transition-all group pointer-events-auto shadow-md border
		{isDragging ? 'z-50 opacity-80 scale-[1.02] shadow-2xl' : ''}"
	style="left: {left}; width: {width}; 
		top: {top + (isDragging && dragMode === 'resize-top' ? dragDelta : (isDragging && dragMode === 'move' ? dragDelta : 0))}px; 
		height: {Math.max(height + (isDragging && dragMode === 'resize-bottom' ? dragDelta : (isDragging && dragMode === 'resize-top' ? -dragDelta : 0)), 24)}px;
		background-color: {bgColor};
		border-color: {borderColor};
	"
	{onclick}
>
	<!-- Move handle -->
	<div 
		class="absolute inset-x-0 inset-y-1 cursor-ns-resize"
		onpointerdown={(e) => onDragStart(e, item, type, 'move')}
	></div>

	<!-- Resize handles -->
	<div 
		class="absolute top-0 inset-x-0 h-2 cursor-ns-resize hover:bg-white/20 z-10"
		onpointerdown={(e) => onDragStart(e, item, type, 'resize-top')}
	></div>
	<div 
		class="absolute bottom-0 inset-x-0 h-2 cursor-ns-resize hover:bg-white/20 z-10"
		onpointerdown={(e) => onDragStart(e, item, type, 'resize-bottom')}
	></div>

	<p class="relative z-0 text-[10px] font-bold {textColor} truncate leading-tight pointer-events-none">
		{item.summary || item.title || item.description || '(no description)'}
	</p>
	<p class="relative z-0 text-[9px] {isEntry ? 'text-emerald-500/70' : 'text-indigo-500/70'} pointer-events-none">
		{#if isEntry}
			{format(new Date(item.startAt), 'HH:mm')}
		{:else}
			{item.start?.dateTime ? format(parseISO(item.start.dateTime), 'HH:mm') : 
			 item.scheduledAt ? format(new Date(item.scheduledAt), 'HH:mm') : 'All Day'}
		{/if}
	</p>
</div>

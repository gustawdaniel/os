<script lang="ts">
	import { enhance } from '$app/forms';
	import { X, Save, Trash2, Clock, Calendar as CalendarIcon, Tag } from 'lucide-svelte';
	import { fade, scale } from 'svelte/transition';
	import { format } from 'date-fns';

	let { item, type, onCancel, onSuccess } = $props();

	let title = $state('');
	let description = $state('');
	let startAt = $state('');
	let endAt = $state('');
	let scheduledAt = $state('');
	let duration = $state(30);
	
	$effect(() => {
		// Initialization logic
		const isGcal = type === 'gcal';
		title = item.summary || item.title || item.description || '';
		description = item.description || '';
		
		const rawStart = isGcal 
			? (item.start?.dateTime || item.start?.date) 
			: (item.startAt || item.scheduledAt);
		const rawEnd = isGcal 
			? (item.end?.dateTime || item.end?.date) 
			: item.endAt;

		if (rawStart) startAt = format(new Date(rawStart), "yyyy-MM-dd'T'HH:mm");
		if (rawEnd) endAt = format(new Date(rawEnd), "yyyy-MM-dd'T'HH:mm");
		if (item.scheduledAt) scheduledAt = format(new Date(item.scheduledAt), "yyyy-MM-dd'T'HH:mm");
		duration = item.duration || 30;
	});
	
	let isSubmitting = $state(false);
	let isDeleting = $state(false);

	const action = $derived(
		type === 'entry' ? '?/updateTimeEntry' : 
		type === 'gcal' ? '?/updateGCalEvent' : 
		'?/updateGtdTask'
	);
	const deleteAction = $derived(
		type === 'entry' ? '?/deleteEntry' : 
		type === 'gcal' ? '?/deleteGCalEvent' : 
		'?/deleteGtdTask'
	);
</script>

<div 
	class="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/60 backdrop-blur-md px-4"
	transition:fade={{ duration: 200 }}
	onmousedown={onCancel}
	role="presentation"
>
	<div 
		class="w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-[2rem] shadow-2xl flex flex-col overflow-hidden outline-none"
		transition:scale={{ duration: 300, start: 0.95 }}
		onmousedown={(e) => e.stopPropagation()}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		aria-labelledby="modal-title"
	>
		<!-- Header -->
		<div class="p-6 border-b border-stone-800 flex items-center justify-between bg-stone-950/20">
			<div class="flex items-center gap-3">
				<div class="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
					{#if type === 'entry'}
						<Clock size={18} />
					{:else}
						<Tag size={18} />
					{/if}
				</div>
				<div>
					<h3 id="modal-title" class="text-sm font-bold text-white leading-tight">
						Edit {type === 'entry' ? 'Time Entry' : type === 'gcal' ? 'Calendar Event' : 'Task'}
					</h3>
					<p class="text-[10px] text-stone-500 uppercase tracking-widest font-mono mt-1">{item.id}</p>
				</div>
			</div>
			<button onclick={onCancel} class="p-2 hover:bg-stone-800 rounded-full transition-all text-stone-600 hover:text-white">
				<X size={20} />
			</button>
		</div>

		<form 
			id="edit-form"
			method="POST" 
			{action}
			use:enhance={() => {
				isSubmitting = true;
				return async ({ update }) => {
					await update();
					isSubmitting = false;
					onSuccess();
				};
			}}
			class="p-8 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar"
		>
			<input type="hidden" name="id" value={item.id} />

			<!-- Title / Description -->
			<div class="space-y-4">
				<div class="space-y-2">
					<label for="edit-title" class="text-[10px] font-bold text-stone-600 uppercase tracking-wider ml-1">
						{type === 'entry' ? 'Description' : 'Title'}
					</label>
					<input
						id="edit-title"
						name={type === 'entry' ? 'description' : 'title'}
						type="text"
						bind:value={title}
						class="w-full bg-stone-950 border border-stone-800 text-white rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-lg placeholder-stone-800"
						placeholder="What is this?"
						readonly={type === 'gcal'}
					/>
				</div>

				{#if type === 'task'}
					<div class="space-y-2">
						<label for="edit-desc" class="text-[10px] font-bold text-stone-600 uppercase tracking-wider ml-1">Notes</label>
						<textarea
							id="edit-desc"
							name="description"
							bind:value={description}
							rows="3"
							class="w-full bg-stone-950 border border-stone-800 text-stone-300 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm placeholder-stone-800 resize-none"
							placeholder="Add context..."
						></textarea>
					</div>
				{/if}
			</div>

			<!-- Time & Planning -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-3xl bg-stone-950/40 border border-stone-800/40">
				{#if type === 'entry' || type === 'gcal'}
					<div class="space-y-2">
						<label for="startAt" class="text-[10px] font-bold text-stone-600 uppercase tracking-wider ml-1">Started At</label>
						<input
							id="startAt"
							name="startAt"
							type="datetime-local"
							bind:value={startAt}
							class="w-full bg-stone-900 border border-stone-800 text-white rounded-xl px-5 py-3.5 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 transition-all font-mono text-xs color-scheme-dark"
						/>
					</div>
					<div class="space-y-2">
						<label for="endAt" class="text-[10px] font-bold text-stone-600 uppercase tracking-wider ml-1">Ended At</label>
						<input
							id="endAt"
							name="endAt"
							type="datetime-local"
							bind:value={endAt}
							class="w-full bg-stone-900 border border-stone-800 text-white rounded-xl px-5 py-3.5 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 transition-all font-mono text-xs color-scheme-dark"
						/>
					</div>
					{#if type === 'gcal'}
						<input type="hidden" name="calendarId" value={item.calendarId || 'primary'} />
					{/if}
				{:else}
					<div class="space-y-2">
						<label for="scheduledAt" class="text-[10px] font-bold text-stone-600 uppercase tracking-wider ml-1">Schedule</label>
						<input
							id="scheduledAt"
							name="scheduledAt"
							type="datetime-local"
							bind:value={scheduledAt}
							class="w-full bg-stone-900 border border-stone-800 text-white rounded-xl px-5 py-3.5 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 transition-all font-mono text-xs color-scheme-dark"
						/>
					</div>
					<div class="space-y-2">
						<label for="duration" class="text-[10px] font-bold text-stone-600 uppercase tracking-wider ml-1">Duration (min)</label>
						<input
							id="duration"
							name="duration"
							type="number"
							bind:value={duration}
							class="w-full bg-stone-900 border border-stone-800 text-white rounded-xl px-5 py-3.5 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 transition-all font-mono text-xs"
						/>
					</div>
				{/if}
			</div>

		</form>

		<!-- Footer Actions (Separate from main form to avoid nesting) -->
		<div class="px-8 pb-8 flex items-center justify-between">
			<form
				method="POST"
				action={deleteAction}
				use:enhance={() => {
					if (!confirm('Are you sure you want to delete this?')) return;
					isDeleting = true;
					return async ({ update }) => {
						await update();
						isDeleting = false;
						onSuccess();
					};
				}}
			>
				<input type="hidden" name="id" value={item.id} />
				<button 
					type="submit"
					disabled={isDeleting}
					class="flex items-center gap-2 text-xs font-bold text-stone-600 hover:text-red-400 transition-colors px-2 py-1"
				>
					<Trash2 size={14} /> Delete
				</button>
			</form>

			<div class="flex gap-3">
				<button 
					type="button"
					class="px-6 py-3 rounded-2xl bg-stone-800 text-stone-400 text-xs font-bold hover:bg-stone-700 transition-all"
					onclick={onCancel}
				>
					Cancel
				</button>
				<button 
					type="submit"
					form="edit-form"
					disabled={isSubmitting}
					class="flex items-center gap-2 px-8 py-3 rounded-2xl bg-indigo-500 text-white text-xs font-bold hover:bg-indigo-400 disabled:opacity-50 transition-all shadow-xl shadow-indigo-500/20"
				>
					{#if isSubmitting}
						<div class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
						Saving...
					{:else}
						<Save size={14} /> Save Changes
					{/if}
				</button>
			</div>
		</div>
	</div>
</div>


<style>
	.color-scheme-dark {
		color-scheme: dark;
	}
	.custom-scrollbar::-webkit-scrollbar {
		width: 4px;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: #27272a;
		border-radius: 10px;
	}
</style>

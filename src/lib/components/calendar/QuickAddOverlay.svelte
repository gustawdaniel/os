<script lang="ts">
	import { enhance } from '$app/forms';
	import { X, Zap, Clock } from 'lucide-svelte';
	import { fade, scale } from 'svelte/transition';

	let { date, onCancel, onSuccess } = $props();

	let title = $state('');
	let estimate = $state(30);
	let isSubmitting = $state(false);

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onCancel();
	}

	function focus(node: HTMLInputElement) {
		node.focus();
	}
</script>

<div 
	class="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/40 backdrop-blur-sm px-4"
	transition:fade={{ duration: 150 }}
	onmousedown={onCancel}
	role="presentation"
>
	<div 
		class="w-full max-w-sm bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl p-6 space-y-6"
		transition:scale={{ duration: 200, start: 0.95 }}
		onmousedown={(e) => e.stopPropagation()}
		role="dialog"
		aria-modal="true"
	>
		<div class="flex items-center justify-between">
			<h3 class="text-xs font-bold text-stone-500 uppercase tracking-[0.2em] flex items-center gap-2">
				<Zap size={12} class="text-indigo-400" /> Plan New Task
			</h3>
			<button onclick={onCancel} class="p-1 hover:bg-stone-800 rounded-full transition-colors">
				<X size={14} class="text-stone-600" />
			</button>
		</div>

		<form 
			method="POST" 
			action="?/quickAddTask" 
			use:enhance={() => {
				isSubmitting = true;
				return async ({ update }) => {
					await update();
					isSubmitting = false;
					onSuccess();
				};
			}}
			class="space-y-5"
		>
			<input type="hidden" name="scheduledAt" value={date.toISOString()} />
			
			<div class="space-y-1.5">
				<label for="title" class="text-[10px] font-bold text-stone-600 uppercase ml-1">What to do?</label>
				<input
					id="title"
					name="title"
					type="text"
					bind:value={title}
					placeholder="Task title..."
					class="w-full bg-stone-950 border border-stone-800 text-white rounded-2xl px-5 py-3 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 transition-all font-medium"
					use:focus
				/>
			</div>

			<div class="flex items-center gap-4">
				<div class="flex-1 space-y-1.5">
					<label for="estimate" class="text-[10px] font-bold text-stone-600 uppercase ml-1">Estimate (mins)</label>
					<div class="relative">
						<Clock size={12} class="absolute left-4 top-1/2 -translate-y-1/2 text-stone-700" />
						<input
							id="estimate"
							name="estimate"
							type="number"
							bind:value={estimate}
							class="w-full bg-stone-950 border border-stone-800 text-white rounded-2xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 transition-all font-mono text-sm"
						/>
					</div>
				</div>
				
				<div class="pt-5 flex gap-2">
					<button 
						type="button"
						class="px-4 py-2.5 rounded-2xl bg-stone-800 text-stone-400 text-xs font-bold hover:bg-stone-700 transition-all"
						onclick={onCancel}
					>
						Cancel
					</button>
					<button 
						type="submit"
						disabled={!title || isSubmitting}
						class="px-6 py-2.5 rounded-2xl bg-indigo-500 text-white text-xs font-bold hover:bg-indigo-400 disabled:opacity-50 disabled:hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20"
					>
						{isSubmitting ? 'Adding...' : 'Add to Plan'}
					</button>
				</div>
			</div>
		</form>
	</div>
</div>

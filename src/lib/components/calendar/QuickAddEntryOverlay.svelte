<script lang="ts">
	import { enhance } from '$app/forms';
	import { X, History, Clock } from 'lucide-svelte';
	import { fade, scale } from 'svelte/transition';

	let { date, defaultDuration = 30, onCancel, onSuccess } = $props();

	let description = $state('');
	let duration = $state(defaultDuration);
	let isSubmitting = $state(false);

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
				<History size={12} class="text-emerald-400" /> Log Actual Activity
			</h3>
			<button onclick={onCancel} class="p-1 hover:bg-stone-800 rounded-full transition-colors">
				<X size={14} class="text-stone-600" />
			</button>
		</div>

		<form 
			method="POST" 
			action="?/quickAddEntry" 
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
			<input type="hidden" name="startAt" value={date.toISOString()} />
			
			<div class="space-y-1.5">
				<label for="description" class="text-[10px] font-bold text-stone-600 uppercase ml-1">What happened?</label>
				<input
					id="description"
					name="description"
					type="text"
					bind:value={description}
					placeholder="Activity description..."
					class="w-full bg-stone-950 border border-stone-800 text-white rounded-2xl px-5 py-3 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 transition-all font-medium"
					use:focus
				/>
			</div>

			<div class="flex items-center gap-4">
				<div class="flex-1 space-y-1.5">
					<label for="duration" class="text-[10px] font-bold text-stone-600 uppercase ml-1">Duration (mins)</label>
					<div class="relative">
						<Clock size={12} class="absolute left-4 top-1/2 -translate-y-1/2 text-stone-700" />
						<input
							id="duration"
							name="duration"
							type="number"
							bind:value={duration}
							class="w-full bg-stone-950 border border-stone-800 text-white rounded-2xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 transition-all font-mono text-sm"
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
						disabled={!description || isSubmitting}
						class="px-6 py-2.5 rounded-2xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/20"
					>
						{isSubmitting ? 'Logging...' : 'Log Activity'}
					</button>
				</div>
			</div>
		</form>
	</div>
</div>

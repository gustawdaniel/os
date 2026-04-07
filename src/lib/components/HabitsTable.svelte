<script lang="ts">
	import { enhance } from '$app/forms';
	import { getDaysInMonth, startOfMonth, format, addDays, isSameDay, isToday } from 'date-fns';
	import { Plus, Edit2, Trash2, X, GripVertical } from 'lucide-svelte';

	let { habits = $bindable([]), currentMonth = new Date().toISOString(), readonly = false } = $props();

	let isModalOpen = $state(false);
	let editingHabit = $state<{id: string, name: string, target: number} | null>(null);

	let currentDate = $derived(new Date(currentMonth));
	let daysInMonth = $derived(getDaysInMonth(currentDate));
	let monthStart = $derived(startOfMonth(currentDate));
	let days = $derived(Array.from({ length: daysInMonth }, (_, i) => addDays(monthStart, i)));

	function getLogForDate(logs: any[], date: Date) {
		return logs.find(l => isSameDay(new Date(l.date), date));
	}

	function openCreateModal() { if(readonly) return; editingHabit = null; isModalOpen = true; }
	function openEditModal(h: any) { if(readonly) return; editingHabit = { id: h.id, name: h.name, target: h.goalTarget }; isModalOpen = true; }
	function closeModal() { isModalOpen = false; editingHabit = null; }

	// --- Drag & Drop ---
	let dragIndex = $state<number | null>(null);
	let overIndex = $state<number | null>(null);

	function onDragStart(e: DragEvent, index: number) {
		if(readonly) return;
		dragIndex = index;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', String(index));
		}
	}

	function onDragOver(e: DragEvent, index: number) {
		if(readonly) return;
		e.preventDefault();
		overIndex = index;
	}

	function onDrop(e: DragEvent, dropIndex: number) {
		if(readonly) return;
		e.preventDefault();
		if (dragIndex === null || dragIndex === dropIndex) {
			dragIndex = null; overIndex = null; return;
		}
		const reordered = [...habits];
		const [moved] = reordered.splice(dragIndex, 1);
		reordered.splice(dropIndex, 0, moved);
		habits = reordered;
		dragIndex = null; overIndex = null;
 
		if (import.meta.env.SSR) return;
		const form = new FormData();
		form.append('orderedIds', JSON.stringify(reordered.map(h => h.id)));
		fetch('?/reorder', { method: 'POST', body: form });
	}
</script>

<div class="bg-stone-900 border border-stone-800/80 rounded-2xl shadow-xl overflow-hidden shadow-black/40">
	<div class="overflow-x-auto custom-scrollbar">
		<table class="w-full text-left border-collapse" style="min-width: max-content;">
			<thead>
				<tr>
					<th class="sticky left-0 z-20 bg-stone-900/95 backdrop-blur border-b border-stone-800/80 px-3 py-2" style="min-width:180px; width:180px;">
						<span class="text-[10px] font-semibold uppercase tracking-wider text-stone-500">Nawyk</span>
					</th>
					{#each days as day}
						<th class="border-b border-stone-800/80 py-2 text-center" style="min-width:30px; width:30px;">
							<div class="flex flex-col items-center gap-0.5">
								<span class="text-[9px] uppercase font-medium leading-none {isToday(day) ? 'text-indigo-400' : 'text-stone-600'}">
									{format(day, 'EEEEE')}
								</span>
								<span class="text-[10px] font-semibold w-5 h-5 flex items-center justify-center rounded-full leading-none {isToday(day) ? 'bg-indigo-500/20 text-indigo-400' : 'text-stone-500'}">
									{format(day, 'd')}
								</span>
							</div>
						</th>
					{/each}
					<th class="border-b border-stone-800/80 px-3 py-2 text-right" style="min-width:72px; width:72px;">
						<span class="text-[10px] font-semibold uppercase tracking-wider text-stone-500">Cel</span>
					</th>
				</tr>
			</thead>

			<tbody class="divide-y divide-stone-800/40">
				{#each habits as habit, i}
					<tr
						draggable={!readonly}
						ondragstart={(e) => onDragStart(e, i)}
						ondragover={(e) => onDragOver(e, i)}
						ondrop={(e) => onDrop(e, i)}
						ondragend={() => { dragIndex = null; overIndex = null; }}
						class="group transition-colors
							{overIndex === i && dragIndex !== i ? 'bg-indigo-500/5' : 'hover:bg-stone-800/20'}
							{dragIndex === i ? 'opacity-40' : ''}"
					>
						<td class="sticky left-0 z-10 bg-stone-900 group-hover:bg-stone-800/80 transition-colors border-r border-stone-800/40" style="min-width:180px; width:180px;">
							<div class="flex items-center gap-1 px-2 py-1.5">
								{#if !readonly}
									<span class="text-stone-600 cursor-grab hover:text-stone-400 transition-colors shrink-0">
										<GripVertical size={13} />
									</span>
								{/if}
								<p class="text-xs font-medium text-stone-200 truncate flex-1" title={habit.name}>{habit.name}</p>
								
								{#if !readonly}
									<div class="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-0.5 text-stone-500 shrink-0">
										<button onclick={() => openEditModal(habit)} class="p-0.5 hover:text-white transition-colors">
											<Edit2 size={11} />
										</button>
										<form method="POST" action="?/deleteHabit" use:enhance class="inline-flex">
											<input type="hidden" name="id" value={habit.id} />
											<button type="submit" class="p-0.5 hover:text-red-400 transition-colors" onclick={(e) => !confirm('Usunąć?') && e.preventDefault()}>
												<Trash2 size={11} />
											</button>
										</form>
									</div>
								{/if}
							</div>
						</td>

						{#each days as day}
							{@const log = getLogForDate(habit.logs, day)}
							{@const isFuture = day > new Date()}
							<td class="p-0.5 text-center" style="width:30px; min-width:30px;">
								{#if !readonly}
									<form method="POST" action="?/toggleLog" use:enhance>
										<input type="hidden" name="habitId" value={habit.id} />
										<input type="hidden" name="date" value={day.toISOString()} />
										<button
											type="submit"
											disabled={isFuture}
											class="w-[26px] h-[26px] rounded flex items-center justify-center transition-all duration-150 mx-auto
												{isFuture ? 'opacity-20 cursor-default' : 'cursor-pointer hover:scale-110 active:scale-95'}
												{log ? 'bg-indigo-500/25 border border-indigo-500/50' : 'bg-stone-800/50 border border-stone-700/40 hover:border-stone-500/60'}"
										>
											{#if log}
												<div class="w-2 h-2 rounded-sm bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.7)]"></div>
											{/if}
										</button>
									</form>
								{:else}
									<div class="w-[26px] h-[26px] rounded flex items-center justify-center mx-auto
										{log ? 'bg-indigo-500/25 border border-indigo-500/50' : 'bg-stone-800/50 border border-stone-700/40'}">
										{#if log}
											<div class="w-2 h-2 rounded-sm bg-indigo-400"></div>
										{/if}
									</div>
								{/if}
							</td>
						{/each}

						<td class="px-3 py-1.5 text-right" style="min-width:72px; width:72px;">
							<div class="flex flex-col items-end gap-1">
								<span class="text-xs font-medium text-stone-300">{habit.logs.length}<span class="text-stone-600">/{habit.goalTarget}</span></span>
								<div class="w-10 h-0.5 bg-stone-800 rounded-full overflow-hidden">
									<div class="h-full rounded-full {habit.logs.length >= habit.goalTarget ? 'bg-emerald-500' : 'bg-indigo-500'}"
										style="width: {Math.min(100, (habit.logs.length / habit.goalTarget) * 100)}%"></div>
								</div>
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

{#if isModalOpen && !readonly}
	<div class="fixed inset-0 z-50 flex items-center justify-center px-4 bg-stone-950/80 backdrop-blur-sm">
		<div class="bg-stone-900 border border-stone-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl relative">
			<button onclick={closeModal} class="absolute top-4 right-4 text-stone-500 hover:text-white">
				<X size={18} />
			</button>
			<h2 class="text-base font-semibold text-white mb-5">{editingHabit ? 'Edytuj' : 'Nowy'} nawyk</h2>
			<form method="POST" action="?/{editingHabit ? 'editHabit' : 'createHabit'}" use:enhance={() => {
				return async ({ update }) => { await update(); closeModal(); };
			}}>
				<input type="hidden" name="id" value={editingHabit?.id} />
				<div class="space-y-3">
					<input type="text" name="name" required value={editingHabit?.name || ''} class="w-full bg-stone-950 border border-stone-800 text-white text-sm rounded-lg px-3 py-2" placeholder="Nazwa" />
					<input type="number" name="target" required min="1" max="31" value={editingHabit?.target || 10} class="w-full bg-stone-950 border border-stone-800 text-white text-sm rounded-lg px-3 py-2" placeholder="Cel" />
					<div class="pt-3 flex gap-2">
						<button type="button" onclick={closeModal} class="flex-1 px-3 py-2 bg-stone-800 text-white rounded-lg">Anuluj</button>
						<button type="submit" class="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg">{editingHabit ? 'Zapisz' : 'Dodaj'}</button>
					</div>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.custom-scrollbar::-webkit-scrollbar { height: 6px; }
	.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
	.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(87,83,78,0.4); border-radius: 3px; }
</style>

<script lang="ts">
	import { enhance } from '$app/forms';
	import Editor from '$lib/components/Editor.svelte';
	import { Plus, Trash2, GripVertical, FileText, Check, ArrowLeft } from 'lucide-svelte';
	import { flip } from 'svelte/animate';
	import { dndzone, type DndEvent } from 'svelte-dnd-action';

	interface Note {
		id: string;
		title: string;
		content: string;
		order: number;
	}

	let { 
		notes = $bindable([]), 
		readonly = false,
		onUpdate = (id: string, content: string) => {},
		onUpdateTitle = (id: string, title: string) => {}
	} = $props();

	let activeNoteId = $state<string | null>(null);
	let activeNote = $derived(notes.find((n: Note) => n.id === activeNoteId) || null);
	
	let saveStatus = $state<'idle' | 'saving' | 'saved'>('idle');
	let saveTimeout = $state<NodeJS.Timeout | null>(null);

	function debouncedSave(content: string) {
		if (readonly || !activeNoteId) return;
		saveStatus = 'saving';
		if (saveTimeout) clearTimeout(saveTimeout);
		saveTimeout = setTimeout(async () => {
			onUpdate(activeNoteId!, content);
			saveStatus = 'saved';
			setTimeout(() => { if (saveStatus === 'saved') saveStatus = 'idle'; }, 2000);
		}, 1000);
	}

	const flipDurationMs = 200;
	function handleDndConsider(e: CustomEvent<DndEvent<Note>>) {
		if (readonly) return;
		notes = e.detail.items;
	}
	async function handleDndFinalize(e: CustomEvent<DndEvent<Note>>) {
		if (readonly) return;
		notes = e.detail.items;
 
		if (import.meta.env.SSR) return;
		const form = new FormData();
		form.append('orderedIds', JSON.stringify(notes.map((n: Note) => n.id)));
		fetch('?/reorderNotes', { method: 'POST', body: form });
	}
</script>

<div class="flex h-full bg-stone-950 overflow-hidden font-light rounded-2xl border border-stone-800/40 shadow-2xl">
	{#if !activeNoteId}
		<div class="flex-1 flex flex-col bg-stone-950 w-full">
			<div class="p-6 border-b border-stone-800/40 flex items-center justify-between h-20">
				<div>
					<h2 class="text-[10px] font-bold text-stone-500 uppercase tracking-[0.3em] mb-1">Kolekcja</h2>
					<h1 class="text-xl font-light text-white tracking-tight">Twoje Notatki</h1>
				</div>
				{#if !readonly}
					<form method="POST" action="?/createNote" use:enhance>
						<button type="submit" class="flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black hover:bg-stone-200 transition-all text-xs font-medium">
							<Plus size={16} />
							<span>Nowa</span>
						</button>
					</form>
				{/if}
			</div>

			<div 
				class="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-1"
				use:dndzone={{ items: notes, flipDurationMs, disabled: readonly }}
				onconsider={handleDndConsider}
				onfinalize={handleDndFinalize}
			>
				{#each notes as note (note.id)}
					<div animate:flip={{ duration: flipDurationMs }}>
						<button
							onclick={() => activeNoteId = note.id}
							class="w-full text-left px-4 py-2.5 rounded-xl transition-all flex items-center gap-3 bg-stone-900/30 border border-stone-800/40 hover:border-stone-700/60 hover:bg-stone-900/80 group"
						>
							{#if !readonly}
								<span class="text-stone-700 group-hover:text-stone-500 transition-colors cursor-grab shrink-0">
									<GripVertical size={14} />
								</span>
							{/if}
							<p class="text-sm font-light text-stone-200 truncate flex-1">{note.title || 'Bez tytułu'}</p>
							<FileText size={14} class="text-stone-700 opacity-0 group-hover:opacity-100 transition-opacity" />
						</button>
					</div>
				{/each}
			</div>
		</div>
	{:else if activeNote}
		<main class="flex-1 flex flex-col min-w-0 bg-stone-950">
			<div class="h-20 border-b border-stone-800/40 flex items-center justify-between px-8 shrink-0 bg-stone-950/80 backdrop-blur-md">
				<div class="flex items-center gap-6 flex-1 min-w-0">
					<button onclick={() => activeNoteId = null} class="p-2 -ml-2 rounded-full hover:bg-stone-900 text-stone-500 hover:text-white transition-all">
						<ArrowLeft size={20} /> 
					</button>

					<input 
						type="text" 
						bind:value={activeNote.title}
						readonly={readonly}
						onblur={() => activeNote && !readonly && onUpdateTitle(activeNote.id, activeNote.title)}
						class="bg-transparent border-none text-xl font-light text-white focus:outline-none focus:ring-0 placeholder-stone-800 truncate w-full tracking-tight"
						placeholder="Tytuł..."
					/>
				</div>

				<div class="flex items-center gap-8 shrink-0">
					{#if !readonly}
						<div class="text-[9px] uppercase tracking-[0.3em] font-medium flex items-center gap-3">
							{#if saveStatus === 'saving'}
								<span class="text-indigo-400">Saving</span>
							{:else if saveStatus === 'saved'}
								<span class="text-emerald-500">Saved</span>
							{:else}
								<span class="text-stone-700">Idle</span>
							{/if}
						</div>
						<form method="POST" action="?/deleteNote" use:enhance>
							<input type="hidden" name="id" value={activeNote.id} />
							<button type="submit" class="p-2 text-stone-700 hover:text-red-400/80 transition-colors" onclick={(e) => !confirm('Usunąć?') && e.preventDefault()}>
								<Trash2 size={18} />
							</button>
						</form>
					{:else}
						<span class="text-[9px] uppercase tracking-[0.3em] text-stone-600">Preview Mode</span>
					{/if}
				</div>
			</div>

			<div class="flex-1 overflow-y-auto custom-scrollbar p-10">
				<div class="max-w-2xl mx-auto">
					<Editor 
						bind:content={activeNote.content} 
						onSave={(c: string) => debouncedSave(c)}
					/>
				</div>
			</div>
		</main>
	{/if}
</div>

<style>
	.custom-scrollbar::-webkit-scrollbar { width: 4px; }
	.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(120, 113, 108, 0.2); border-radius: 2px; }
</style>

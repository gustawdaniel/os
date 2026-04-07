<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Editor from '$lib/components/Editor.svelte';
	import { Plus, Trash2, GripVertical, FileText, Check, ArrowLeft } from 'lucide-svelte';
	import { flip } from 'svelte/animate';
	import { dndzone, type DndEvent } from 'svelte-dnd-action';

	let { data } = $props();

	// Typy dla notatek
	interface Note {
		id: string;
		title: string;
		content: string;
		order: number;
		createdAt: Date | string;
		updatedAt: Date | string;
	}

	// Stan notatek - inicjalizujemy pustą tablicą i synchronizujemy w $effect
	let notes = $state<Note[]>([]);
	
	// Synchronizacja z danymi z serwera (pozbywamy się ostrzeżenia)
	$effect(() => { 
		if (data.notes) {
			notes = [...data.notes];
		}
	});

	// Aktywna notatka
	let activeNoteId = $state<string | null>(null);
	
	let activeNote = $derived(notes.find((n: Note) => n.id === activeNoteId) || null);

	// Stan zapisu
	let saveStatus = $state<'idle' | 'saving' | 'saved'>('idle');
	let saveTimeout = $state<NodeJS.Timeout | null>(null);

	// Funkcja autozapisu
	function debouncedSave(content: string) {
		if (!activeNoteId) return;
		saveStatus = 'saving';

		if (saveTimeout) clearTimeout(saveTimeout);

		saveTimeout = setTimeout(async () => {
			const form = new FormData();
			form.append('id', activeNoteId!);
			form.append('content', content);

			await fetch('?/updateNote', {
				method: 'POST',
				body: form
			});

			saveStatus = 'saved';
			setTimeout(() => { if (saveStatus === 'saved') saveStatus = 'idle'; }, 2000);
		}, 1000);
	}

	async function updateTitle(id: string, title: string) {
		const form = new FormData();
		form.append('id', id);
		form.append('title', title);
		await fetch('?/updateNote', { method: 'POST', body: form });
	}

	// --- DND Logic ---
	const flipDurationMs = 200;
	function handleDndConsider(e: CustomEvent<DndEvent<Note>>) {
		notes = e.detail.items;
	}
	async function handleDndFinalize(e: CustomEvent<DndEvent<Note>>) {
		notes = e.detail.items;
		const form = new FormData();
		form.append('orderedIds', JSON.stringify(notes.map((n: Note) => n.id)));
		await fetch('?/reorderNotes', { method: 'POST', body: form });
	}

	function createNewNote() {
		const form = document.querySelector('#createNoteForm') as HTMLFormElement;
		if (form) form.requestSubmit();
	}
</script>

<div class="flex h-full bg-stone-950 overflow-hidden font-light">
	{#if !activeNoteId}
		<!-- Lista notatek (Pełny widok gdy brak aktywnej) -->
		<div class="flex-1 flex flex-col bg-stone-950 max-w-4xl mx-auto w-full border-x border-stone-900/50">
			<div class="p-6 border-b border-stone-800/40 flex items-center justify-between h-20">
				<div>
					<h2 class="text-[10px] font-bold text-stone-500 uppercase tracking-[0.3em] mb-1">Kolekcja</h2>
					<h1 class="text-2xl font-light text-white tracking-tight">Twoje Notatki</h1>
				</div>
				<form id="createNoteForm" method="POST" action="?/createNote" use:enhance={() => {
					return async ({ result }) => {
						await invalidateAll();
						if (result.type === 'success' && (result.data as any)?.note) {
							activeNoteId = (result.data as any).note.id;
						}
					};
				}}>
					<button type="submit" class="flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black hover:bg-stone-200 transition-all text-xs font-medium">
						<Plus size={16} />
						<span>Nowa notatka</span>
					</button>
				</form>
			</div>

			<div 
				class="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-1"
				use:dndzone={{ items: notes, flipDurationMs }}
				onconsider={handleDndConsider}
				onfinalize={handleDndFinalize}
			>
				{#each notes as note (note.id)}
					<div 
						animate:flip={{ duration: flipDurationMs }}
						class="group"
					>
						<button
							onclick={() => activeNoteId = note.id}
							class="w-full text-left px-4 py-2.5 rounded-xl transition-all flex items-center gap-3 bg-stone-900/30 border border-stone-800/40 hover:border-stone-700/60 hover:bg-stone-900/80 group/btn"
						>
							<span class="text-stone-700 group-hover/btn:text-stone-500 transition-colors cursor-grab shrink-0">
								<GripVertical size={14} />
							</span>
							<p class="text-sm font-light text-stone-200 truncate flex-1">{note.title || 'Bez tytułu'}</p>
							<div class="opacity-0 group-hover/btn:opacity-100 transition-opacity">
								<FileText size={14} class="text-stone-700" />
							</div>
						</button>
					</div>
				{/each}

				{#if notes.length === 0}
					<div class="flex flex-col items-center justify-center p-20 text-center opacity-40">
						<FileText size={48} strokeWidth={1} class="text-stone-500 mb-4" />
						<p class="text-xs uppercase tracking-widest">Twoja lista jest pusta</p>
					</div>
				{/if}
			</div>
		</div>
	{:else if activeNote}
		<!-- Edytor (Pełna szerokość) -->
		<main class="flex-1 flex flex-col min-w-0 bg-stone-950">
			<!-- Nagłówek edytora -->
			<div class="h-20 border-b border-stone-800/40 flex items-center justify-between px-8 shrink-0 bg-stone-950/80 backdrop-blur-md z-10">
				<div class="flex items-center gap-6 flex-1 min-w-0">
					<button 
						onclick={() => activeNoteId = null}
						class="p-2 -ml-2 rounded-full hover:bg-stone-900 text-stone-500 hover:text-white transition-all"
						title="Wróć do listy"
					>
						<ArrowLeft size={20} /> 
					</button>

					<input 
						type="text" 
						bind:value={activeNote.title}
						onblur={() => activeNote && updateTitle(activeNote.id, activeNote.title)}
						class="bg-transparent border-none text-2xl font-light text-white focus:outline-none focus:ring-0 placeholder-stone-800 truncate w-full tracking-tight"
						placeholder="Tytuł..."
					/>
				</div>

				<div class="flex items-center gap-8 shrink-0">
					<div class="text-[9px] uppercase tracking-[0.3em] font-medium flex items-center gap-3 transition-all">
						{#if saveStatus === 'saving'}
							<span class="text-indigo-400 flex items-center gap-2">
								<div class="w-1 h-1 rounded-full bg-indigo-400 animate-pulse"></div>
								Saving
							</span>
						{:else if saveStatus === 'saved'}
							<span class="text-emerald-500 flex items-center gap-1">
								<Check size={12} />
								Saved
							</span>
						{:else}
							<span class="text-stone-700">Idle</span>
						{/if}
					</div>

					<form method="POST" action="?/deleteNote" use:enhance={() => {
						return async ({ update }) => {
							await update();
							activeNoteId = null;
						};
					}}>
						<input type="hidden" name="id" value={activeNote.id} />
						<button type="submit" class="p-2 text-stone-700 hover:text-red-400/80 transition-colors" title="Usuń" onclick={(e) => !confirm('Na pewno usunąć tę notatkę?') && e.preventDefault()}>
							<Trash2 size={18} />
						</button>
					</form>
				</div>
			</div>

			<!-- Obszar edycji -->
			<div class="flex-1 overflow-y-auto custom-scrollbar p-10 lg:p-20">
				<div class="max-w-3xl mx-auto">
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
	.custom-scrollbar::-webkit-scrollbar {
		width: 4px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: transparent;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: rgba(87, 83, 78, 0.2);
		border-radius: 2px;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb:hover {
		background: rgba(120, 113, 108, 0.4);
	}
</style>

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import Placeholder from '@tiptap/extension-placeholder';

	let { content = $bindable(), disabled = false, onSave = () => {} } = $props();
	let element = $state<HTMLElement>();
	let editor = $state<Editor | null>(null);

	onMount(() => {
		if (!element) return;

		editor = new Editor({
			element: element,
			extensions: [
				StarterKit,
				Placeholder.configure({
					placeholder: 'Zacznij pisać swoje rutyny lub cele...'
				})
			],
			content: content,
			editorProps: {
				attributes: {
					class: 'prose prose-invert max-w-none focus:outline-none min-h-[400px] outline-none text-stone-200'
				}
			},
			onUpdate: ({ editor }) => {
				const html = editor.getHTML();
				if (content !== html) {
					content = html;
					onSave(html);
				}
			},
			editable: !disabled
		});
	});

	// Synchronizacja tylko gdy content zmieni się "z góry" (np. zmiana notatki)
	// a nie w wyniku pisania w edytorze (gdy edytor ma focus).
	$effect(() => {
		if (editor && !editor.isFocused && content !== editor.getHTML()) {
			editor.commands.setContent(content);
		}
	});

	$effect(() => {
		if (editor) {
			editor.setEditable(!disabled);
		}
	});

	onDestroy(() => {
		if (editor) editor.destroy();
	});
</script>

<div bind:this={element} class="tiptap-editor"></div>

<style>
	:global(.tiptap p.is-editor-empty:first-child::before) {
		content: attr(data-placeholder);
		float: left;
		color: #57534e;
		pointer-events: none;
		height: 0;
	}

	/* Podstawowe style dla edytora by wyglądał czysto */
	:global(.prose strong) {
		font-weight: 800;
		color: white;
	}
	:global(.prose h1) {
		font-size: 1.5rem;
		margin-top: 1.5rem;
		margin-bottom: 0.75rem;
		font-weight: 700;
		color: white;
	}
	:global(.prose h2) {
		font-size: 1.25rem;
		margin-top: 1.25rem;
		margin-bottom: 0.5rem;
		font-weight: 600;
		color: #e7e5e4;
	}
	:global(.prose p) {
		margin-bottom: 0.75rem;
		line-height: 1.6;
	}
	:global(.prose ul) {
		list-style-type: disc;
		padding-left: 1.5rem;
		margin-bottom: 1rem;
	}
	:global(.prose ol) {
		list-style-type: decimal;
		padding-left: 1.5rem;
		margin-bottom: 1rem;
	}
</style>

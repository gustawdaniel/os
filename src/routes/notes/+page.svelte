<script lang="ts">
	import NotesView from '$lib/components/NotesView.svelte';

	let { data } = $props();

	let notes = $state<any[]>([]);
	$effect(() => { 
		if (data.notes) notes = [...data.notes]; 
	});

	async function onUpdate(id: string, content: string) {
		if (import.meta.env.SSR) return;
		const form = new FormData();
		form.append('id', id);
		form.append('content', content);
		await fetch('?/updateNote', { method: 'POST', body: form });
	}

	async function onUpdateTitle(id: string, title: string) {
		if (import.meta.env.SSR) return;
		const form = new FormData();
		form.append('id', id);
		form.append('title', title);
		await fetch('?/updateNote', { method: 'POST', body: form });
	}
</script>

<NotesView 
	bind:notes={notes}
	{onUpdate}
	{onUpdateTitle}
/>

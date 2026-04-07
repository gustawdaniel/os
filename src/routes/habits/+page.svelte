<script lang="ts">
	import HabitsTable from '$lib/components/HabitsTable.svelte';
	import { Plus } from 'lucide-svelte';
	import { format } from 'date-fns';

	let { data } = $props();

	let habits = $state<any[]>([]);
	$effect(() => { habits = data.habits; });

	let currentDate = $derived(new Date(data.currentMonth));
</script>

<div class="px-4 py-6 lg:px-8 max-w-screen-2xl mx-auto">
	
	<div class="flex items-end justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold tracking-tight text-white mb-1">Nawyki</h1>
			<p class="text-sm text-stone-500">{format(currentDate, 'MMMM yyyy')}</p>
		</div>
		
		<!-- Przycisk "Nowy Nawyk" wyzwalający modal wewnątrz HabitsTable (poprzez ref byśmy to robili, 
		 ale dla uproszczenia przekażemy funkcję lub HabitsTable będzie miało własny guziczek). 
		 Dodajmy guziczek bezpośrednio w HabitsTable dla spójności i wywołajmy go stąd jeśli trzeba.
		 Na razie HabitsTable ma swój mechanizm otwierania modali.
		-->
	</div>

	<HabitsTable 
		bind:habits={habits} 
		currentMonth={data.currentMonth} 
	/>

</div>

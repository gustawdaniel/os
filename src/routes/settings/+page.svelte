<script lang="ts">
	import { enhance } from '$app/forms';
	import { Settings, Link2, Trash2, CheckCircle2, ExternalLink } from 'lucide-svelte';

	let { data } = $props();

	function getInt(p: string) {
		return data.integrations.find((i: { provider: string }) => i.provider === p);
	}

	const providers = [
		{ 
			id: 'todoist', 
			name: 'Todoist', 
			desc: 'Zadania i listy projektów', 
			helpUrl: 'https://app.todoist.com/app/settings/integrations/developer',
			placeholder: 'Twoje API Token...'
		}
	];
</script>

<div class="px-6 py-10 max-w-4xl mx-auto space-y-12">
	<header>
		<p class="text-[10px] font-bold text-stone-500 uppercase tracking-[0.3em] mb-2 font-mono">Preferences</p>
		<h1 class="text-4xl font-extralight text-white tracking-tight flex items-center gap-4">
			<Settings class="text-stone-700" size={32} />
			Ustawienia
		</h1>
	</header>

	<section class="space-y-6">
		<div class="border-b border-stone-800/40 pb-4">
			<h2 class="text-xl font-light text-stone-200">Integracje zewnętrzne</h2>
			<p class="text-sm text-stone-500">Połącz Todoist, aby synchronizować zadania. Śledzenie czasu jest wbudowane w Personal OS.</p>
		</div>

		<div class="grid grid-cols-1 gap-6">
			{#each providers as provider}
				{@const existing = getInt(provider.id)}
				<div class="p-8 rounded-3xl bg-stone-900/40 border {existing ? 'border-indigo-500/20 shadow-lg shadow-indigo-500/5' : 'border-stone-800/50'} relative overflow-hidden transition-all">
					<div class="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
						<div class="space-y-1">
							<div class="flex items-center gap-3">
								<h3 class="text-lg font-medium text-white">{provider.name}</h3>
								{#if existing}
									<span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[9px] uppercase tracking-wider font-bold border border-emerald-500/20 flex items-center gap-1">
										<CheckCircle2 size={10} /> Połączono
									</span>
								{/if}
							</div>
							<p class="text-sm text-stone-500">{provider.desc}</p>
						</div>

						<div class="flex items-center gap-3">
							<a href={provider.helpUrl} target="_blank" class="text-xs text-stone-600 hover:text-stone-400 transition-colors flex items-center gap-1 bg-stone-950 px-3 py-1.5 rounded-full border border-stone-800">
								Gdzie znajdę klucz? <ExternalLink size={12} />
							</a>
							{#if existing}
								<form method="POST" action="?/deleteIntegration" use:enhance>
									<input type="hidden" name="provider" value={provider.id} />
									<button type="submit" class="p-2 text-stone-600 hover:text-red-400 transition-colors">
										<Trash2 size={18} />
									</button>
								</form>
							{/if}
						</div>
					</div>

					<form method="POST" action="?/saveIntegration" use:enhance class="mt-8">
						<input type="hidden" name="provider" value={provider.id} />
						<div class="flex flex-col sm:flex-row gap-3">
							<div class="relative flex-1">
								<input 
									type="password" 
									name="apiKey" 
									required
									placeholder={provider.placeholder}
									value={existing?.apiKey || ''}
									class="w-full bg-stone-950 border {existing ? 'border-indigo-500/20' : 'border-stone-800'} text-white text-sm rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all font-mono"
								/>
							</div>
							<button type="submit" class="px-8 py-3.5 rounded-2xl font-bold text-sm transition-all {existing ? 'bg-stone-800 text-stone-300 hover:bg-stone-700' : 'bg-white text-black hover:scale-105 active:scale-95 shadow-xl shadow-white/5'}">
								{existing ? 'Zaktualizuj' : 'Połącz'}
							</button>
						</div>
					</form>
				</div>
			{/each}

			<!-- Google Calendar Info -->
			<div class="p-8 rounded-3xl bg-indigo-500/5 border border-indigo-500/10">
				<div class="flex items-start gap-5">
					<div class="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
						<Link2 size={24} />
					</div>
					<div class="space-y-2">
						<h3 class="text-lg font-medium text-white italic">Google Calendar</h3>
						<p class="text-sm text-stone-400 leading-relaxed max-w-xl">
							Integracja z kalendarzem działa automatycznie przez Twoje konto Google. Jeśli nie widzisz wydarzeń, spróbuj się przelogować, aby zaakceptować nowe uprawnienia.
						</p>
					</div>
				</div>
			</div>
		</div>
	</section>
</div>

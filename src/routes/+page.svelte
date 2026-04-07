<script lang="ts">
	import { ArrowRight, ShieldCheck, Zap, Sparkles } from 'lucide-svelte';
	import { page } from '$app/state';
	import { signIn } from "@auth/sveltekit/client";

	let session = $derived(page.data.session);

	const features = [
		{ title: 'Habit Tracking', desc: 'Buduj trwałe nawyki z precyzją.', icon: Zap },
		{ title: 'Notes & Goals', desc: 'Twoje centrum planowania i rutyn.', icon: Sparkles },
		{ title: 'Data Privacy', desc: 'Twoje dane, Twoje zasady.', icon: ShieldCheck },
	];
</script>

{#if !session}
	<div class="min-h-full flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-1000">
		<!-- Hero Section -->
		<div class="max-w-3xl space-y-8 mt-12">
			<div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] uppercase tracking-[0.2em] font-bold mb-4">
				<Sparkles size={12} />
				<span>Personal OS v0.1</span>
			</div>
			
			<h1 class="text-5xl md:text-7xl font-extralight text-white tracking-tighter leading-none mb-4">
				Zaprojektuj swój <span class="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent font-normal italic">dzień.</span>
			</h1>
			
			<p class="text-stone-400 text-lg md:text-xl font-light max-w-xl mx-auto leading-relaxed">
				Minimalistyczny system do zarządzania życiem, rutynami i celami. Skup się na tym, co naprawdę ważne.
			</p>

			<div class="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
				<button 
					onclick={() => signIn('google')}
					class="group relative flex items-center gap-3 px-8 py-4 bg-white text-black rounded-full font-bold text-sm transition-all hover:scale-105 active:scale-95 shadow-xl shadow-white/10"
				>
					<img src="https://authjs.dev/img/providers/google.svg" alt="Google" class="w-5 h-5" />
					Zaloguj przez Google
					<ArrowRight size={16} class="transition-transform group-hover:translate-x-1" />
				</button>
			</div>
		</div>

		<!-- Features Grid -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mt-24 mb-12">
			{#each features as feature}
				<div class="p-8 rounded-3xl bg-stone-900/40 border border-stone-800/50 text-left hover:border-stone-700 transition-all group">
					<div class="w-10 h-10 rounded-xl bg-stone-800 flex items-center justify-center mb-6 group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-colors">
						<feature.icon size={20} />
					</div>
					<h3 class="text-white font-medium mb-2">{feature.title}</h3>
					<p class="text-stone-500 text-sm leading-relaxed">{feature.desc}</p>
				</div>
			{/each}
		</div>
	</div>
{:else}
	<!-- Dashboard dla zalogowanych -->
	<div class="p-8 md:p-12 animate-in slide-in-from-bottom-4 duration-700">
		<header class="mb-12">
			<p class="text-[10px] font-bold text-stone-500 uppercase tracking-[0.3em] mb-2">Dashboard</p>
			<h1 class="text-4xl font-extralight text-white tracking-tight">
				Witaj ponownie, <span class="font-normal">{session.user?.name?.split(' ')[0]}</span>.
			</h1>
		</header>

		<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
			<!-- Quick Stats / Shortcuts -->
			<a href="/habits" class="group p-8 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 hover:border-indigo-500/30 transition-all flex items-center justify-between">
				<div>
					<h2 class="text-xl font-light text-white mb-1">Nawyki</h2>
					<p class="text-stone-500 text-sm">Sprawdź swoje dzisiejsze cele.</p>
				</div>
				<div class="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
					<ArrowRight size={20} />
				</div>
			</a>

			<a href="/notes" class="group p-8 rounded-3xl bg-stone-900/40 border border-stone-800/50 hover:border-stone-700 transition-all flex items-center justify-between">
				<div>
					<h2 class="text-xl font-light text-white mb-1">Notatki</h2>
					<p class="text-stone-500 text-sm">Przejrzyj swoje rutyny i plany.</p>
				</div>
				<div class="w-12 h-12 rounded-full bg-stone-800 flex items-center justify-center text-stone-400 group-hover:bg-stone-700 group-hover:text-white transition-all">
					<ArrowRight size={20} />
				</div>
			</a>
		</div>
	</div>
{/if}

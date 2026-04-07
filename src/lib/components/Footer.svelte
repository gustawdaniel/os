<script lang="ts">
	import { ExternalLink } from 'lucide-svelte';

	const projects = [
		{ name: 'VaultTrack', desc: 'Wydatki', url: 'https://vaulttrack.org' },
		{ name: 'LexiDrift', desc: 'Języki', url: 'https://lexidrift.com' },
		{ name: 'MyHealth', desc: 'Badania', url: 'https://health.gustawdaniel.com' },
		{ name: 'Blog', desc: 'Wpisy', url: 'https://gustawdaniel.com' },
		{ name: 'GitHub', desc: 'Open Source', url: 'https://github.com/gustawdaniel/os' },
	];
</script>

<footer class="w-full py-12 border-t border-stone-800/40 bg-stone-950">
	<div class="max-w-5xl mx-auto px-6">
		<div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
			<div class="space-y-2">
				<h3 class="text-white font-medium text-sm">Personal OS</h3>
				<p class="text-stone-500 text-xs font-light">
					Designed to simplify your digital life.
				</p>
			</div>

			<div class="grid grid-cols-2 sm:grid-cols-4 gap-8">
				{#each projects as project}
					<a 
						href={project.url} 
						target="_blank" 
						rel="noopener noreferrer"
						class="group flex flex-col gap-1"
					>
						<span class="text-stone-300 text-xs font-medium group-hover:text-indigo-400 transition-colors flex items-center gap-1">
							{project.name}
							<ExternalLink size={10} class="opacity-0 group-hover:opacity-100 transition-opacity" />
						</span>
						<span class="text-stone-600 text-[10px] uppercase tracking-wider">{project.desc}</span>
					</a>
				{/each}
			</div>
		</div>

		<div class="mt-12 pt-8 border-t border-stone-800/20 text-center">
			<p class="text-stone-700 text-[10px] uppercase tracking-[0.2em]">
				&copy; {new Date().getFullYear()} Gustaw Daniel. All rights reserved.
			</p>
		</div>
	</div>
</footer>

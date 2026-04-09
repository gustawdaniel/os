<script lang="ts">
	import '../app.css';
	import { LayoutGrid, CheckSquare, PanelLeft, StickyNote, LogOut, Settings, Calendar as CalendarIcon, GitBranch } from 'lucide-svelte';
	import { page } from '$app/state';
	import { signOut } from "@auth/sveltekit/client";

	let { children } = $props();

	let sidebarOpen = $state(true);
	let session = $derived(page.data.session);

	const navigation = [
		{ name: 'Dashboard', href: '/', icon: LayoutGrid },
		{ name: 'Planowanie', href: '/calendar', icon: CalendarIcon },
		{ name: 'Nawyki', href: '/habits', icon: CheckSquare },
		{ name: 'Notatki', href: '/notes', icon: StickyNote },
		{ name: 'GTD Workflow', href: '/gtd', icon: GitBranch },
		{ name: 'Ustawienia', href: '/settings', icon: Settings },
	];
</script>

<div class="flex h-screen bg-stone-950 text-stone-100 overflow-hidden font-light">
	
	<!-- Sidebar: Tylko dla zalogowanych -->
	{#if session}
		<aside class="flex flex-col border-r border-stone-800/50 bg-stone-950 transition-all duration-300 ease-in-out z-30 {sidebarOpen ? 'w-64' : 'w-16'}">
			<!-- Header: Logo + Toggle -->
			<div class="flex items-center h-14 border-b border-stone-800/50 {sidebarOpen ? 'px-4 justify-between' : 'justify-center'}">
				{#if sidebarOpen}
					<div class="flex items-center gap-3 overflow-hidden">
						<div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
							<span class="text-white font-bold text-sm">P</span>
						</div>
						<span class="font-semibold tracking-tight text-sm text-white truncate uppercase tracking-[0.2em]">OS</span>
					</div>
				{/if}
				<button
					onclick={() => sidebarOpen = !sidebarOpen}
					class="p-2 rounded-lg text-stone-500 hover:text-white hover:bg-stone-800/50 transition-all flex items-center justify-center shrink-0"
					title={sidebarOpen ? 'Zwiń sidebar' : 'Rozwiń sidebar'}
				>
					<PanelLeft size={20} class="transition-transform duration-300 {sidebarOpen ? '' : 'rotate-180'}" />
				</button>
			</div>

			<!-- Nav -->
			<nav class="flex flex-col gap-1 p-2 flex-1">
				{#each navigation as item}
					{@const isActive = page.url.pathname === item.href || (item.href !== '/' && page.url.pathname.startsWith(item.href))}
					<a
						href={item.href}
						class="flex items-center gap-3 px-2 py-2 rounded-lg transition-all text-xs group uppercase tracking-widest
							{isActive
								? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
								: 'text-stone-500 hover:text-white hover:bg-stone-800/50'}"
						title={!sidebarOpen ? item.name : undefined}
					>
						<item.icon size={16} class="shrink-0 transition-transform group-hover:scale-110" />
						{#if sidebarOpen}
							<span class="truncate font-medium">{item.name}</span>
						{/if}
					</a>
				{/each}
			</nav>

			<!-- User info & Logout -->
			<div class="p-2 border-t border-stone-800/50 bg-stone-900/10">
				<div class="flex items-center gap-2 px-1 py-1.5 rounded-lg mb-1">
					{#if session.user?.image}
						<img src={session.user.image} alt="Avatar" class="w-7 h-7 rounded-full shrink-0 border border-stone-800" />
					{:else}
						<div class="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
							{session.user?.name?.charAt(0) || session.user?.email?.charAt(0) || '?'}
						</div>
					{/if}
					
					{#if sidebarOpen}
						<div class="overflow-hidden flex-1">
							<p class="text-[11px] font-medium text-white truncate">{session.user?.name || 'Użytkownik'}</p>
							<p class="text-[9px] text-stone-600 truncate">{session.user?.email}</p>
						</div>
					{/if}
				</div>
				
				<button 
					onclick={() => signOut()}
					class="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-stone-600 hover:text-red-400 hover:bg-red-400/5 transition-all text-[10px] uppercase tracking-widest font-bold"
				>
					<LogOut size={14} />
					{#if sidebarOpen}
						<span>Wyloguj</span>
					{/if}
				</button>
			</div>
		</aside>
	{/if}

	<!-- Main -->
	<main class="flex-1 relative overflow-y-auto">
		<div class="absolute top-0 right-0 w-[600px] h-[400px] bg-indigo-600/5 rounded-full blur-3xl pointer-events-none -translate-y-1/3 translate-x-1/3"></div>
		<div class="h-full relative z-10">
			{@render children()}
		</div>
	</main>
</div>


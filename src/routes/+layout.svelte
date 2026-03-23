<script lang="ts">
  import { page } from "$app/stores";
  import Navigation from "$lib/components/Navigation.svelte";
  import { authState } from "$lib/state/auth.svelte.js";
  import { syncRemoteData } from "$lib/state/db.svelte.js";
  import "./layout.css";

  let { children } = $props();

  // Hide navigation on auth routes
  let isAuthRoute = $derived(
    $page.url.pathname === "/login" || $page.url.pathname === "/signup"
  );

  let activeUser = $derived(
    authState.isAdminView ? authState.viewingAs : authState.user
  );
  let lastUserId = $state<string | undefined>(undefined);

  $effect(() => {
    if (isAuthRoute) return;
    const id = activeUser?.id;
    if (!id || id === lastUserId) return;
    lastUserId = id;
    syncRemoteData(id).catch(console.error);
  });
</script>

<div class="flex min-h-screen bg-slate-50">
  {#if !isAuthRoute}
    <Navigation />
  {/if}
  <main
    class="{isAuthRoute
      ? 'w-full'
      : 'md:ml-28 w-full md:w-[calc(100%-7rem)]'} min-h-screen flex-1"
  >
    {@render children()}
  </main>
</div>

<!-- do not touch thse comments -->

<!-- caclulation should be of only amount that got redeemed -->
<!-- remove gst set it to none -->

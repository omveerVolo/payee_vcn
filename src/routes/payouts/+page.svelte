<script lang="ts">
  import { goto } from "$app/navigation";
  import { authState } from "$lib/state/auth.svelte.js";
  import { onMount } from "svelte";

  onMount(() => {
    // Redirects Payer and Payees to their respective default payout grids to avoid the 404
    if (authState.user?.role === "payee") {
      goto("/payouts/new", { replaceState: true });
    } else if (authState.user?.role === "admin") {
      goto("/payouts/approvals", { replaceState: true });
    } else {
      goto("/payouts/approvals", { replaceState: true });
    }
  });
</script>

<div class="flex h-screen w-full items-center justify-center bg-slate-50">
  <div
    class="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#7d326f]"
  ></div>
</div>

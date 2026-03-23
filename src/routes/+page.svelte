<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { authState } from "$lib/state/auth.svelte.js";
  import { dbStore } from "$lib/state/db.svelte.js";
  import { Loader2 } from "@lucide/svelte";

  import DashboardView from "$lib/components/dashboard/DashboardView.svelte";
  import OnboardingView from "$lib/components/onboarding/OnboardingView.svelte";
  import AdminJourney from "$lib/components/admin/AdminJourney.svelte";

  let isCheckingData = $state(true);
  let isCreatingProgram = $state(false);

  // React to URL query params
  $effect(() => {
    if (
      $page.url.searchParams.has("createProgram") ||
      $page.url.searchParams.has("editProgram")
    ) {
      isCreatingProgram = true;
    }
  });

  let editId = $derived($page.url.searchParams.get("editProgram"));

  // Derived state to check if payer actually has programs
  const payerHasPrograms = $derived.by(() => {
    if (!authState.user) return false;
    if (authState.user.hasData) return true;
    return authState.user.role === "payer"
      ? dbStore.programs.some((p: any) => p.payerId === authState.user?.id)
      : true; // For payees, logic is handled in DashboardView via TermsModal
  });

  $effect(() => {
    // Basic auth protection
    if (!authState.isLoggedIn) {
      goto("/login");
      return;
    }
  });

  onMount(() => {
    // Simulate an API call determining data presence
    setTimeout(() => {
      isCheckingData = false;
    }, 800);
  });

  function handleCancel() {
    isCreatingProgram = false;

    const url = new URL($page.url);
    if (
      url.searchParams.has("createProgram") ||
      url.searchParams.has("editProgram")
    ) {
      url.searchParams.delete("createProgram");
      url.searchParams.delete("editProgram");
      goto(url.pathname, { replaceState: true });
    }
  }
</script>

{#if isCheckingData}
  <div
    class="flex h-[calc(100vh-6rem)] w-full flex-col items-center justify-center gap-4"
  >
    <Loader2 class="h-8 w-8 animate-spin text-[#7d326f]" />
    <p class="text-[13px] font-medium text-slate-500">
      Loading your workspace...
    </p>
  </div>
{:else if isCreatingProgram}
  <OnboardingView
    initialStep={3}
    editProgramId={editId}
    on:complete={() => {
      if (authState.user) authState.user.hasData = true;
      handleCancel();
    }}
    on:cancel={handleCancel}
  />
{:else if authState.user?.role === "admin" && !authState.isAdminView}
  <AdminJourney />
{:else if authState.isAdminView}
  <!-- Bypass all onboarding flows and strictly render the interactive Dashboard sandbox when Impersonating -->
  <DashboardView on:createProgram={() => (isCreatingProgram = true)} />
{:else if authState.user?.role === "payer" && !payerHasPrograms}
  <OnboardingView
    initialStep={2}
    on:complete={() => {
      if (authState.user) authState.user.hasData = true;
      handleCancel();
    }}
    on:cancel={handleCancel}
  />
{:else}
  <DashboardView on:createProgram={() => (isCreatingProgram = true)} />
{/if}

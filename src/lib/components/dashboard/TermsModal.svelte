<script lang="ts">
  import { authState } from "$lib/state/auth.svelte.js";
  const currentTheme = $derived(authState.theme);

  let activeUser = $derived(
    authState.isAdminView ? authState.viewingAs : authState.user
  );
  let accepted = $state(true);

  function handleAccept() {
    if (accepted && activeUser) {
      activeUser.hasAcceptedTerms = true;
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300"
>
  <div
    class="relative w-full max-w-[500px] rounded-[24px] bg-white p-8 md:p-10 shadow-2xl animate-in fade-in zoom-in-95 duration-300"
  >
    <h2 class="text-[26px] font-semibold text-slate-900 leading-tight mb-2">
      Terms & Conditions
    </h2>
    <p class="text-[14px] text-slate-500 mb-6 font-medium">
      Please review and accept our terms
    </p>

    <div class="rounded-xl border border-slate-200 p-6 mb-8 bg-white shadow-sm">
      <div class="mb-6 flex flex-col gap-1">
        <h3 class="text-[15px] font-semibold text-slate-900">payout Terms</h3>
        <p class="text-[12px] text-slate-500 leading-relaxed font-medium">
          By accepting these terms, you agree to receive payouts through our
          platform. All transactions will be processed securely and in
          accordance with applicable regulations.
        </p>
      </div>
      <div class="flex flex-col gap-1">
        <h3 class="text-[15px] font-semibold text-slate-900">Data Privacy</h3>
        <p class="text-[12px] text-slate-500 leading-relaxed font-medium">
          Your personal and business information will be handled with the utmost
          care and in compliance with data protection laws.
        </p>
      </div>
    </div>

    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <label class="flex items-start gap-4 cursor-pointer mb-8 group">
      <input
        type="checkbox"
        class="hidden"
        bind:checked={accepted}
      />
      <div
        class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] border transition-colors shadow-sm"
        style="border-color: {accepted ? currentTheme.colors.primary : 'rgb(203 213 225)'}; background-color: {accepted ? currentTheme.colors.primary : 'white'}"
      >
        {#if accepted}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
            ><polyline points="20 6 9 17 4 12"></polyline></svg
          >
        {/if}
      </div>
      <span class="text-[12px] text-slate-500 font-medium leading-relaxed"
        >I have read and agree to the terms and conditions, privacy policy, and
        consent to data processing</span
      >
    </label>

    <button
      class="w-full rounded-xl h-[52px] text-[15px] font-semibold text-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      style="background-color: {currentTheme.colors.primary}"
      onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.filter = 'brightness(0.9)'; }}
      onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
      onclick={handleAccept}
      disabled={!accepted}
    >
      Accept & Continue to Dashboard
    </button>
  </div>
</div>

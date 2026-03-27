<script lang="ts">
  // Example data model built from the reference image + new requested fields
  import { CheckCircle2, Clock, Download, ArrowRight } from "lucide-svelte";
  import { authState } from "$lib/state/auth.svelte.js";

  let { payouts = [], isPayee = false, onredeem = () => {} } = $props();
  const currentTheme = $derived(authState.theme);

  const isToday = (value: any) => {
    if (!value) return false;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return false;
    const now = new Date();
    return (
      parsed.getFullYear() === now.getFullYear() &&
      parsed.getMonth() === now.getMonth() &&
      parsed.getDate() === now.getDate()
    );
  };
</script>

<div
  class="mt-8 flex w-full flex-col rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden"
>
  <div
    class="border-b border-slate-200 bg-[#f8f9fa] px-6 py-4 flex items-center justify-between"
  >
    <h2 class="text-[15px] font-semibold text-slate-800">Recent Payouts</h2>
  </div>

  <div class="flex flex-col divide-y divide-slate-100">
    {#each payouts as payout}
      <div
        class="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer group"
      >
        <!-- Col 1: Name & Meta -->
        <div class="flex items-start gap-4 flex-[1.2]">
          <!-- Status Indicator Dot -->
          <div
            class="mt-1.5 flex h-2 w-2 shrink-0 rounded-full {payout.status ===
              'Ready to redeem' || payout.status === 'Ready to Redeem'
              ? isToday(payout.createdAt)
                ? 'bg-[#ea540e]'
                : 'bg-transparent'
              : 'bg-transparent'}"
          ></div>

          <div class="flex flex-col gap-0.5">
            <span class="text-[14px] font-semibold text-slate-800"
              >{payout.name || payout.provider}</span
            >
            <div
              class="flex items-center text-[12px] text-slate-400 font-medium"
            >
              <span>{payout.createdAt}</span>
            </div>
          </div>
        </div>

        <!-- Col 2: Category -->
        <div class="flex-[0.8] text-[13px] text-slate-400 font-medium">
          {payout.category || payout.program}
        </div>

        <!-- Col 3: ID -->
        <div class="flex-[0.8] text-[13px] text-slate-400 font-medium">
          {payout.id}
        </div>

        <!-- Col 4: Amount -->
        <div
          class="flex-[0.6] text-right lg:text-left text-[15px] font-semibold text-slate-900"
        >
          {payout.amount || payout.payableAmount}
        </div>

        <!-- Col 5: Actions / Status -->
        <div class="w-32 flex justify-end lg:justify-start">
          {#if isPayee}
            {#if (payout.status === "Ready to redeem" || payout.status === "Ready to Redeem") && (authState.user?.role === "payee" || authState.user?.role === "admin")}
              <button
                class="text-white w-full py-1.5 rounded-md text-[13px] font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5 border border-transparent"
                style="background-color: {currentTheme.colors.secondary}"
                onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.filter = 'brightness(0.9)'; }}
                onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
                onclick={() => onredeem(payout)}
              >
                <Download class="h-3.5 w-3.5" />
                Redeem
              </button>
            {:else if (payout.status === "Ready to redeem" || payout.status === "Ready to Redeem") && authState.isAdminView}
              <button
                disabled
                class="bg-slate-100 text-slate-400 w-full py-1.5 rounded-md text-[13px] font-medium flex items-center justify-center gap-1.5 border border-slate-200 cursor-not-allowed"
                title="Action disabled in Admin View"
              >
                <Download class="h-3.5 w-3.5" />
                Redeem
              </button>
            {:else}
              <div
                class="w-full py-1.5 rounded-md text-[13px] font-semibold flex items-center justify-center gap-1.5 cursor-default border"
                style="
                  background-color: {currentTheme.colors.statusSuccessBg};
                  color: {currentTheme.colors.statusSuccessText};
                  border-color: {currentTheme.colors.statusSuccessBorder};
                "
              >
                <CheckCircle2 class="h-4 w-4 stroke-[2.5]" />
                {payout.status || "Redeemed"}
              </div>
            {/if}
          {:else}
            <!-- Payer Mode Status -->
            <span class="text-[13px] text-slate-800 font-medium"
              >{payout.status === "Pending"
                ? "Ready to redeem"
                : payout.status || "Completed"}</span
            >
          {/if}
        </div>
      </div>
    {:else}
      <div class="flex flex-col items-center justify-center py-12 px-6">
        <div
          class="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3"
        >
          <Clock class="h-6 w-6 text-slate-400" />
        </div>
        <p class="text-[14px] font-semibold text-slate-700">
          No recent payouts
        </p>
        <p class="text-[13px] text-slate-500 mt-1 text-center max-w-[250px]">
          There are currently no active payouts mapped to your account.
        </p>
      </div>
    {/each}
  </div>
</div>

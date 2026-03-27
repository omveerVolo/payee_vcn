<script lang="ts">
  import { Search, CheckCircle2, Download, Clock } from "@lucide/svelte";
  import RedeemModal from "$lib/components/payouts/RedeemModal.svelte";

  import {
    apiCall,
    dbStore,
    approvePayerPayout
  } from "$lib/state/db.svelte.js";
  import { authState } from "$lib/state/auth.svelte.js";

  // Identify if the actual logged-in user is an admin
  let isInternalAdmin = $derived(authState.user?.role === "admin");

  // activeUser represents the "Identity" we are currently presenting (the payee if impersonating)
  let activeUser = $derived(
    authState.isAdminView ? authState.viewingAs : authState.user
  );
  
  const currentTheme = $derived(authState.theme);

  let selectedPayoutIds = $state<string[]>([]);
  let selectedPayout = $state<any>(null);

  let searchQuery = $state("");
  let isAllSelected = $state(false);
  let showSuccessModal = $state(false);

  let currentPage = $state(1);
  const itemsPerPage = 10;

  // Reset page when search query changes
  $effect(() => {
    if (searchQuery !== undefined) {
      currentPage = 1;
    }
  });

  // Derived state reading exclusively payloads that need action
  let filteredPayouts = $derived(
    [...dbStore.payouts]
      .sort((a: any, b: any) => {
        const db = new Date(b.createdAt || b.date).getTime();
        const da = new Date(a.createdAt || a.date).getTime();
        return db - da;
      })
      .filter((p: any) => {
        // ADMIN MODE: Show redeemable items evaluated against workflows
        if (isInternalAdmin) {
          // Admin should only review/see items that trigger a payee's workflow
          const cleanAmount = String(p.amount || "0").replace(/[₹,]/g, "");
          const amountValue = parseInt(cleanAmount, 10) || 0;

          // Evaluate against active Payee workflows
          const matchingWf = dbStore.workflows?.find((wf: any) => {
            if (wf.payeeId !== p.payeeId) return false;

            const wfAmount = Number(wf.amount) || 0;
            if (wf.compareKey === "More than" && amountValue > wfAmount)
              return true;
            if (wf.compareKey === "Less than" && amountValue < wfAmount)
              return true;
            if (wf.compareKey === "Equals" && amountValue === wfAmount)
              return true;

            return false;
          });

          // If it doesn't match a payee-defined workflow, Admin doesn't need to approve it
          if (!matchingWf) return false;

          // If impersonating a specific payee, restrict to their items
          if (authState.isAdminView && authState.viewingAs) {
            return p.userId === authState.viewingAs.id;
          }

          return true;
        }

        // PAYER MODE: Show pending items for their programs
        if (p.status !== "Pending") return false;

        if (activeUser?.role === "payee") {
          return p.userId === activeUser?.id;
        } else {
          // Payer can only approve payouts strictly mapping into Programs they explicitly own
          const matchingProgram = dbStore.programs.find(
            (prog: any) => prog.id === p.programId
          );
          return matchingProgram && matchingProgram.payerId === activeUser?.id;
        }
      })
      .filter((p: any) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          p.providerName.toLowerCase().includes(q) ||
          (p.transactionId || p.trackingId || p.claimNo || "")
            .toLowerCase()
            .includes(q)
        );
      })
      .map((p: any) => {
        // Find the payer name from the program
        const program = dbStore.programs.find(
          (prog: any) => prog.id === p.programId
        );
        const payerUser = dbStore.users.find(
          (u: any) => u.id === program?.payerId
        );
        const payerName = payerUser
          ? payerUser.businessName || payerUser.name
          : program?.createdBy ||
            program?.payerName ||
            p.payerName ||
            "Unknown Payer";

        const cleanAmt = String(p.amount || "0").replace(/[₹,\s]/g, "");
        const baseAmt = parseFloat(cleanAmt) || 0;
        const tdsNum = parseFloat(p.tds) || 0;
        const finalPayable = baseAmt - (baseAmt * tdsNum) / 100;
        const formattedPayable = finalPayable.toLocaleString("en-IN", {
          maximumFractionDigits: 2
        });

        return {
          dbId: p.id || p.payoutId, // Keep a reference to the global mutable ID
          payoutId: p.payoutId,
          id: p.transactionId || p.trackingId || p.claimNo,
          program: program?.name || "Medical Payouts 2026",
          provider:
            activeUser?.role === "payee"
              ? payerName
              : p.providerName || p.businessName,
          patientName: p.patientName,
          createdAt: p.date,
          approvedAmount: `₹${p.amount}`,
          tds: p.tds ? `${p.tds}%` : "0%",
          payableAmount: `₹${formattedPayable}`,
          transactionId: p.transactionId || "-",
          trackingId: p.trackingId || "-",
          status: p.status
        };
      })
  );

  let paginatedPayouts = $derived(
    filteredPayouts.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    )
  );

  let totalPages = $derived(
    Math.ceil(filteredPayouts.length / itemsPerPage) || 1
  );

  function toggleSelectAll() {
    isAllSelected = !isAllSelected;
    if (isAllSelected) {
      selectedPayoutIds = filteredPayouts.map((p: any) => p.payoutId);
    } else {
      selectedPayoutIds = [];
    }
  }

  async function handleApprove() {
    if (selectedPayoutIds.length > 0) {
      // Payer approves via API
      const res = await apiCall("/payouts/status", "PUT", {
        payoutIds: selectedPayoutIds,
        status: "Ready to redeem"
      });
      if (res !== null) {
        for (const payoutId of selectedPayoutIds) {
          const local = filteredPayouts.find(
            (p: any) => p.payoutId === payoutId
          );
          if (local) approvePayerPayout(local.dbId);
        }
        showSuccessModal = true;
      }
    }
  }

  function handleRedeemClick(payout: any) {
    selectedPayout = payout;
  }

  function handleDone() {
    // Clear visual state
    selectedPayoutIds = [];
    isAllSelected = false;
    showSuccessModal = false;
  }

  function handleModalClose() {
    selectedPayout = null;
  }
</script>

<svelte:head>
  <title>{isInternalAdmin ? "Approved" : "Approve"} payouts - HDFC Bank</title>
</svelte:head>

<div
  class="flex h-full w-full flex-col p-8 lg:p-12 relative overflow-y-auto min-h-screen"
>
  <!-- Global Search Bar centered at top -->
  <div class="absolute top-8 left-1/2 -translate-x-1/2 w-full max-w-lg z-10">
    <div
      class="flex h-12 w-full items-center overflow-hidden rounded-full border border-slate-200 bg-white px-2 shadow-sm transition-shadow"
    >
      <input
        type="text"
        placeholder="Start Typing....."
        bind:value={searchQuery}
        class="h-full flex-1 bg-transparent px-4 text-sm text-slate-800 outline-none placeholder:text-slate-400"
      />
      <button
        class="flex h-9 items-center justify-center gap-1.5 rounded-full bg-[#ebddef] px-4 text-[13px] font-semibold text-[#7d326f] transition-colors hover:bg-[#d8c3df] cursor-pointer"
      >
        <Search
          class="h-3.5 w-3.5"
          strokeWidth={2.5}
        />
        Search
      </button>
    </div>
  </div>

  <!-- Primary Wrapper box -->
  <div
    class="mt-20 w-full rounded-2xl border border-slate-100 bg-white p-8 lg:p-12 shadow-sm flex flex-col overflow-hidden relative min-h-[600px]"
  >
    <div class="flex justify-between items-center mb-8">
      <h1 class="text-2xl tracking-tight text-slate-800">
        {#if isInternalAdmin}
          <span class="text-[#3b2b73]">Manage</span> and
          <span class="text-[#3b2b73]">redeem</span> your approved claims
        {:else}
          <span class="text-[#3b2b73]">Approve</span> your
          <span class="text-[#3b2b73]">Payouts</span>
        {/if}
      </h1>

      {#if !isInternalAdmin}
        <button
          onclick={toggleSelectAll}
          class="border border-slate-300 rounded-lg px-6 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          Select All
        </button>
      {/if}
    </div>

    <div class="w-full overflow-x-auto pb-4">
      <div class="min-w-[1000px] flex flex-col">
        <!-- Grid Header -->
        <div
          class="grid grid-cols-[1fr_1.5fr_1fr_1.5fr_1.5fr_1fr_1.5fr_1.5fr_1.5fr] gap-4 rounded-xl bg-[#e6dbf3] px-6 py-4 text-[13px] text-[#5b4897] font-semibold"
        >
          <div class="col-span-1 whitespace-nowrap">Program</div>
          <div class="col-span-1 whitespace-nowrap">Payer</div>
          <div class="col-span-1 whitespace-nowrap">Tx id</div>
          <div class="col-span-1 whitespace-nowrap">Tracking id</div>
          <div class="col-span-1 text-center whitespace-nowrap">
            Approved Amount
          </div>
          <div class="col-span-1 text-center whitespace-nowrap">TDS</div>
          <div class="col-span-1 text-center whitespace-nowrap">
            Payable Amount
          </div>
          <div class="col-span-1 text-left whitespace-nowrap">Status</div>
          <div class="col-span-1 text-right whitespace-nowrap">Action</div>
        </div>

        <!-- Grid Rows -->
        <div class="mt-3 flex flex-col gap-3">
          {#each paginatedPayouts as payout}
            <div
              class="grid grid-cols-[1fr_1.5fr_1fr_1.5fr_1.5fr_1fr_1.5fr_1.5fr_1.5fr] items-center gap-4 rounded-xl border border-transparent bg-slate-50 px-6 py-4 transition-all hover:shadow-sm cursor-default"
            >
              <div
                class="col-span-1 text-[13px] font-semibold text-slate-600 truncate"
              >
                {payout.program}
              </div>

              <div class="col-span-1 flex flex-col items-start xl:truncate">
                <span class="text-[13px] font-semibold text-slate-700"
                  >{payout.provider}</span
                >
                <div
                  class="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400 font-medium"
                >
                  <Clock class="h-3 w-3" />
                  <span>{payout.createdAt}</span>
                </div>
              </div>

              <div
                class="col-span-1 font-mono text-slate-500 text-[12px] whitespace-nowrap"
              >
                {payout.transactionId || "-"}
              </div>

              <div
                class="col-span-1 font-mono text-slate-500 text-[12px] whitespace-nowrap"
              >
                {payout.trackingId || "-"}
              </div>

              <div
                class="col-span-1 text-center font-semibold text-slate-900 text-[13px] whitespace-nowrap"
              >
                {payout.approvedAmount}
              </div>

              <div
                class="col-span-1 text-center text-[13px] text-slate-600 whitespace-nowrap"
              >
                {payout.tds}
              </div>

              <div
                class="col-span-1 text-center font-semibold text-slate-900 text-[13px] whitespace-nowrap"
              >
                {payout.payableAmount}
              </div>

              <div class="col-span-1 flex items-center text-left">
                <div
                  class="px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide flex items-center justify-center gap-1.5 border transition-all duration-300"
                  style="
                    background-color: {payout.status === 'Pending' ? currentTheme.colors.statusPendingBg : currentTheme.colors.statusSuccessBg};
                    color: {payout.status === 'Pending' ? currentTheme.colors.statusPendingText : currentTheme.colors.statusSuccessText};
                    border-color: {payout.status === 'Pending' ? currentTheme.colors.statusPendingBorder : currentTheme.colors.statusSuccessBorder};
                  "
                >
                  {#if payout.status === 'Pending'}
                    <Clock class="h-3.5 w-3.5 stroke-[2.5]" />
                  {:else}
                    <CheckCircle2 class="h-3.5 w-3.5 stroke-[2.5]" />
                  {/if}
                  {payout.status}
                </div>
              </div>

              <div
                class="col-span-1 flex items-center justify-end whitespace-nowrap"
              >
                {#if isInternalAdmin}
                  <button
                    class="bg-[#0066cc] hover:bg-[#0052a3] text-white w-28 py-1.5 rounded-md text-[13px] font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm border border-transparent"
                    onclick={() => handleRedeemClick(payout)}
                  >
                    <Download class="h-3.5 w-3.5" />
                    Redeem
                  </button>
                {:else}
                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                  <label
                    class="cursor-pointer flex items-center justify-center group"
                  >
                    <input
                      type="checkbox"
                      class="hidden"
                      checked={selectedPayoutIds.includes(payout.payoutId)}
                      onchange={(e) => {
                        if (e.currentTarget.checked) {
                          selectedPayoutIds = [
                            ...selectedPayoutIds,
                            payout.payoutId
                          ];
                        } else {
                          selectedPayoutIds = selectedPayoutIds.filter(
                            (id) => id !== payout.payoutId
                          );
                        }
                      }}
                    />
                    <div
                      class="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border {selectedPayoutIds.includes(
                        payout.payoutId
                      )
                        ? 'border-[#1a7f71] bg-white'
                        : 'border-slate-300 bg-white group-hover:border-[#1a7f71]'} transition-colors"
                    >
                      {#if selectedPayoutIds.includes(payout.payoutId)}
                        <CheckCircle2
                          class="h-[22px] w-[22px] text-[#1a7f71]"
                        />
                      {/if}
                    </div>
                  </label>
                {/if}
              </div>
            </div>
          {:else}
            <div
              class="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-slate-100 shadow-sm mt-4 w-full"
            >
              <div
                class="h-16 w-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-4"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="text-slate-400"
                  ><path
                    d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                  /><line
                    x1="16"
                    y1="13"
                    x2="8"
                    y2="13"
                  /><line
                    x1="16"
                    y1="17"
                    x2="8"
                    y2="17"
                  /><polyline points="10 9 9 9 8 9" /></svg
                >
              </div>
              <p class="text-[15px] font-semibold text-slate-700">
                No items available
              </p>
              <p
                class="text-[13px] text-slate-500 mt-1 text-center max-w-[300px]"
              >
                There are no relevant payouts currently available in this view.
              </p>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <!-- Pagination Controls -->
    {#if filteredPayouts.length > itemsPerPage}
      <div
        class="mt-6 flex items-center justify-between border-t border-slate-100 pt-6 pb-24"
      >
        <span class="text-[13px] font-medium text-slate-500">
          Showing <span class="text-slate-900 font-semibold"
            >{(currentPage - 1) * itemsPerPage + 1}</span
          >
          to
          <span class="text-slate-900 font-semibold"
            >{Math.min(
              currentPage * itemsPerPage,
              filteredPayouts.length
            )}</span
          >
          of
          <span class="text-slate-900 font-semibold"
            >{filteredPayouts.length}</span
          > entries
        </span>
        <div class="flex items-center gap-2">
          <button
            class="flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            onclick={() => currentPage > 1 && currentPage--}
            disabled={currentPage === 1}
          >
            Prev
          </button>
          <span class="px-2 text-[13px] font-semibold text-slate-700">
            Page {currentPage} of {totalPages}
          </span>
          <button
            class="flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            onclick={() => currentPage < totalPages && currentPage++}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>
    {/if}

    <!-- Floating Action Bar (Only for Payer with selection) -->
    {#if !isInternalAdmin && selectedPayoutIds.length > 0}
      <div
        class="fixed bottom-0 left-0 md:left-28 right-0 flex items-center justify-center border-t border-slate-100 bg-white/80 backdrop-blur-lg shadow-[0_-15px_30px_-5px_rgba(0,0,0,0.05)] z-40 py-4 px-8 animate-in slide-in-from-bottom duration-300"
      >
        <div class="flex items-center justify-between w-full max-w-[1400px]">
          <div class="flex items-center gap-3">
            <div
              class="flex h-9 w-9 items-center justify-center rounded-full font-bold text-sm shadow-inner"
              style="background-color: {currentTheme.colors.statusSuccessBg}; color: {currentTheme.colors.statusSuccessText};"
            >
              {selectedPayoutIds.length}
            </div>
            <div class="flex flex-col">
              <span class="text-sm font-bold text-slate-800 leading-tight"
                >Selected Payouts</span
              >
              <span class="text-[11px] text-slate-500 font-medium">Ready to approve for payment</span>
            </div>
          </div>
          <button
            onclick={handleApprove}
            class="hover:opacity-90 text-white px-10 py-2.5 rounded-xl text-[14px] font-bold border-none shadow-lg transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
            style="background-color: {currentTheme.colors.primary};"
          >
            Approve {selectedPayoutIds.length} Payouts
          </button>
        </div>
      </div>
    {/if}

    <!-- Success Modal Overlay (Payer) -->
    {#if showSuccessModal}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div
        class="fixed inset-0 z-[100] flex items-center justify-center bg-white/60 backdrop-blur-sm p-4 animate-in fade-in duration-300"
      >
        <div
          class="relative w-[320px] rounded-[24px] bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col items-center justify-center border border-slate-100 ring-1 ring-black/5"
          onclick={(e) => e.stopPropagation()}
        >
          <h2 class="text-[17px] font-semibold text-[#3b2b73] mb-6 text-center">
            All payouts Approved
          </h2>
          <button
            class="w-full py-2.5 rounded-lg bg-[#5b4897] text-white text-[13px] font-semibold shadow-sm hover:bg-[#433177] transition-colors cursor-pointer"
            onclick={handleDone}
          >
            Done
          </button>
        </div>
      </div>
    {/if}
  </div>

  {#if selectedPayout}
    <RedeemModal
      payout={selectedPayout}
      onClose={handleModalClose}
    />
  {/if}
</div>

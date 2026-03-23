<script lang="ts">
  import { Search, Download, CheckCircle2, Clock } from "@lucide/svelte";
  import RedeemModal from "$lib/components/payouts/RedeemModal.svelte";

  import { dbStore } from "$lib/state/db.svelte.js";
  import { authState } from "$lib/state/auth.svelte.js";
  import { page } from "$app/stores";

  // Derive target identity securely
  let activeUser = $derived(
    authState.isAdminView ? authState.viewingAs : authState.user
  );

  let searchQuery = $state("");
  let selectedPayout = $state<any>(null);

  let currentPage = $state(1);
  const itemsPerPage = 10;

  // Reset page when search query changes
  $effect(() => {
    if (searchQuery !== undefined) {
      currentPage = 1;
    }
  });

  let focusId = $derived($page.url.searchParams.get("focus"));

  $effect(() => {
    if (focusId) {
      setTimeout(() => {
        const el = document.getElementById(`payout-${focusId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
    }
  });

  // Reactive derived state feeding off the global Database Store for "Approved" payloads
  let filteredPayouts = $derived(
    [...dbStore.payouts].sort((a: any, b: any) => {
      const db = new Date(b.createdAt || b.date).getTime();
      const da = new Date(a.createdAt || a.date).getTime();
      return db - da;
    })
      .filter((p: any) => {
        // Only show payouts ready to redeem (or pending for the payer to see)
        if (activeUser?.role === "payee") {
          return p.status === "Ready to redeem";
        }
        return p.status === "Ready to redeem" || p.status === "Pending";
      })
      .filter((p: any) => {
        // Admin should not see payouts here anymore, they have their own "Approved payouts" page
        if (activeUser?.role === "admin") return false;

        if (activeUser?.role === "payee") {
          return p.userId === activeUser.id;
        } else {
          // Payers only see payouts tied to programs they explicitly own
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
          dbId: p.id,
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

  $effect(() => {
    if (focusId && filteredPayouts.length > 0) {
      const index = filteredPayouts.findIndex(
        (p: any) => p.id === focusId || p.dbId === focusId
      );
      if (index !== -1) {
        const targetPage = Math.floor(index / itemsPerPage) + 1;
        if (currentPage !== targetPage) {
          currentPage = targetPage;
        }
      }
    }
  });

  function handleRedeemClick(payout: any) {
    selectedPayout = payout;
  }

  function handleModalClose() {
    selectedPayout = null;
  }
</script>

<svelte:head>
  <title>Manage Claims - HDFC Bank</title>
</svelte:head>

<div
  class="flex h-full w-full flex-col p-8 lg:p-12 relative overflow-y-auto min-h-screen"
>
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

  <!-- Primary Wrapper box with blue border mimicking wireframes -->
  <div
    class="mt-20 w-full rounded-2xl border border-slate-100 bg-white p-8 lg:p-12 shadow-sm flex flex-col overflow-hidden"
  >
    <h1 class="text-2xl tracking-tight text-[#3b2b73] mb-8">Redeem payouts</h1>

    <div class="w-full overflow-x-auto pb-4">
      <div class="min-w-[1000px] flex flex-col">
        <!-- Grid Header -->
        <div
          class="grid grid-cols-[1fr_1.5fr_1fr_1.5fr_1.5fr_1fr_1.5fr_1.5fr_1.5fr] gap-4 rounded-xl bg-[#e6dbf3] px-6 py-4 text-[13px] text-[#5b4897]"
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
              id="payout-{payout.id}"
              class="grid grid-cols-[1fr_1.5fr_1fr_1.5fr_1.5fr_1fr_1.5fr_1.5fr_1.5fr] items-center gap-4 rounded-xl border bg-slate-50 px-6 py-4 transition-all {focusId ===
              payout.id
                ? 'border-[#0066cc] ring-2 ring-inset ring-[#0066cc]/30 shadow-md z-10 relative bg-blue-50/30'
                : 'border-transparent hover:-translate-y-0.5 hover:shadow-sm'}"
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
                  class="{payout.status === 'Pending' &&
                  activeUser?.role === 'payee'
                    ? 'bg-amber-50 text-amber-600 border-amber-200'
                    : 'bg-blue-50 text-blue-600 border-blue-200'} px-2.5 py-1 rounded-md border text-[11px] font-semibold tracking-wide flex items-center justify-center gap-1"
                >
                  <Clock class="h-3 w-3 stroke-[2.5]" />
                  {payout.status === "Pending" && activeUser?.role !== "payee"
                    ? "Ready to redeem"
                    : payout.status}
                </div>
              </div>

              <div
                class="col-span-1 flex items-center justify-end whitespace-nowrap"
              >
                {#if payout.status === "Ready to redeem"}
                  {#if activeUser?.role === "payee"}
                    <button
                      class="bg-[#0066cc] hover:bg-[#0052a3] text-white w-28 py-1.5 rounded-md text-[13px] font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm border border-transparent"
                      onclick={() => handleRedeemClick(payout)}
                    >
                      <Download class="h-3.5 w-3.5" />
                      Redeem
                    </button>
                  {:else}
                    <div
                      class="bg-blue-50 text-blue-700 w-28 py-1.5 rounded-md text-[12px] font-medium tracking-wide flex items-center justify-center gap-1.5 cursor-default border border-blue-200 text-center leading-tight px-1"
                    >
                      Sent to Payee
                    </div>
                  {/if}
                {:else if payout.status === "Pending"}
                  {#if activeUser?.role === "payee"}
                    <div
                      class="bg-amber-50 text-amber-600 w-28 py-1.5 rounded-md text-[12px] font-medium tracking-wide flex items-center justify-center gap-1.5 cursor-default border border-amber-200 text-center leading-tight px-1"
                    >
                      Needs Approval
                    </div>
                  {:else}
                    <div
                      class="bg-blue-50 text-blue-700 w-28 py-1.5 rounded-md text-[12px] font-medium tracking-wide flex items-center justify-center gap-1.5 cursor-default border border-blue-200 text-center leading-tight px-1"
                    >
                      Sent to Payee
                    </div>
                  {/if}
                {:else}
                  <div
                    class="bg-[#e8f8f5] text-[#1a7f71] w-28 py-1.5 rounded-md text-[13px] font-semibold tracking-wide flex items-center justify-center gap-1.5 cursor-default border border-[#8cdccb]"
                  >
                    <CheckCircle2 class="h-3.5 w-3.5 stroke-[2.5]" />
                    Redeemed
                  </div>
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
                No new payouts
              </p>
              <p
                class="text-[13px] text-slate-500 mt-1 text-center max-w-[300px]"
              >
                You have no pending payouts ready to redeem at this time.
              </p>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <!-- Pagination Controls -->
    {#if filteredPayouts.length > itemsPerPage}
      <div class="mt-6 flex items-center justify-between border-t border-slate-100 pt-6 pb-24">
        <span class="text-[13px] font-medium text-slate-500">
          Showing <span class="text-slate-900 font-semibold"
            >{(currentPage - 1) * itemsPerPage + 1}</span
          >
          to
          <span class="text-slate-900 font-semibold"
            >{Math.min(currentPage * itemsPerPage, filteredPayouts.length)}</span
          >
          of <span class="text-slate-900 font-semibold">{filteredPayouts.length}</span> entries
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
  </div>

  {#if selectedPayout}
    <RedeemModal
      payout={selectedPayout}
      onClose={handleModalClose}
    />
  {/if}
</div>

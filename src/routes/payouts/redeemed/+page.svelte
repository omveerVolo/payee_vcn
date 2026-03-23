<script lang="ts">
  import { Search, CheckCircle2 } from "lucide-svelte";

  import { dbStore } from "$lib/state/db.svelte.js";
  import { authState } from "$lib/state/auth.svelte.js";

  // Derive target identity securely
  let activeUser = $derived(
    authState.isAdminView ? authState.viewingAs : authState.user
  );

  let searchQuery = $state("");

  let currentPage = $state(1);
  const itemsPerPage = 10;

  // Reset page when search query changes
  $effect(() => {
    if (searchQuery !== undefined) {
      currentPage = 1;
    }
  });

  // Feed redeemed payouts from the reactive mock database
  let filteredPayouts = $derived(
    [...dbStore.payouts].sort((a: any, b: any) => {
      const db = new Date(b.createdAt || b.date).getTime();
      const da = new Date(a.createdAt || a.date).getTime();
      return db - da;
    })
      .filter((p: any) => p.status === "Redeemed" || p.status === "Settled")
      .filter((p: any) =>
        activeUser?.role === "payee" ? p.userId === activeUser.id : true
      )
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
          id: p.transactionId || p.trackingId || p.claimNo,
          trackingId: p.trackingId || "-",
          program: program?.name || "Medical Payouts 2026",
          provider: activeUser?.role === "payee" ? payerName : p.providerName,
          approvedAmount: `₹${p.amount}`,
          tds: p.tds ? `${p.tds}%` : "0%",
          payableAmount: `₹${formattedPayable}`,
          transactionId: p.transactionId || "-",
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
</script>

<svelte:head>
  <title>Manage Claims - HDFC Bank</title>
</svelte:head>

<div
  class="flex h-full w-full flex-col p-8 lg:p-12 relative overflow-y-auto min-h-screen"
>
  <!-- Global Search Bar centered at top mimicking the wireframe -->
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
    <h1 class="text-2xl tracking-tight text-[#3b2b73] mb-8">
      Redeemed payouts
    </h1>

    <div class="w-full overflow-x-auto pb-4">
      <div class="min-w-[1000px] flex flex-col">
        <!-- Grid Header -->
        <div
          class="grid grid-cols-[1fr_2fr_1.5fr_1.5fr_1.5fr_1fr_1.5fr_1.5fr] gap-4 rounded-xl bg-[#e6dbf3] px-6 py-4 text-[13px] text-[#5b4897] font-semibold"
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
        </div>

        <!-- Grid Rows -->
        <div class="mt-3 flex flex-col gap-3">
          {#each paginatedPayouts as payout}
            <div
              class="grid grid-cols-[1fr_2fr_1.5fr_1.5fr_1.5fr_1fr_1.5fr_1.5fr] items-center gap-4 rounded-xl border border-transparent bg-slate-50 px-6 py-4 transition-all hover:-translate-y-0.5 hover:shadow-sm cursor-default"
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

              <div
                class="col-span-1 flex items-center justify-start whitespace-nowrap"
              >
                <div
                  class="bg-[#e8f8f5] text-[#1a7f71] px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide flex items-center justify-center gap-1 border border-[#8cdccb]"
                >
                  <CheckCircle2 class="h-3 w-3 stroke-[2.5]" />
                  {payout.status || "Redeemed"}
                </div>
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
                  ><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline
                    points="22 4 12 14.01 9 11.01"
                  /></svg
                >
              </div>
              <p class="text-[15px] font-semibold text-slate-700">
                No redeemed payouts
              </p>
              <p
                class="text-[13px] text-slate-500 mt-1 text-center max-w-[300px]"
              >
                You haven't pulled any claims from the master pending array yet.
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
</div>

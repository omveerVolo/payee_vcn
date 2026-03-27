<script lang="ts">
  import { authState } from "$lib/state/auth.svelte.js";
  import TopBar from "$lib/components/dashboard/TopBar.svelte";
  import CustomSelect from "$lib/components/ui/CustomSelect.svelte";
  import MetricCard from "$lib/components/dashboard/MetricCard.svelte";
  import RecentPayouts from "$lib/components/dashboard/RecentPayouts.svelte";
  import RedeemModal from "$lib/components/payouts/RedeemModal.svelte";
  import TermsModal from "$lib/components/dashboard/TermsModal.svelte";
  import { createEventDispatcher, onMount } from "svelte";
  import { goto } from "$app/navigation";
  import {
    dbStore,
    redeemPayout,
    syncRemoteData
  } from "$lib/state/db.svelte.js";

  interface Payout {
    id: string;
    payoutId: string;
    transactionId?: string;
    trackingId?: string;
    claimNo?: string;
    userId: string;
    programId: string;
    amount: number | string;
    status: string;
    date: string;
    createdAt?: string;
    providerName?: string;
    businessName?: string;
    payerName?: string;
    tds?: string | number;
    createdBy?: string;
    payerId?: string | number;
  }

  interface Program {
    id: string;
    name: string;
    payerId: string;
    enrolledPayees: string[];
    createdBy?: string;
    payerName?: string;
  }

  const dispatch = createEventDispatcher();
  const currentTheme = $derived(authState.theme);

  let programFilter = $state("All Program");
  let timeFilter = $state("All Time");

  let isLoading = $state(false);
  let selectedPayout = $state<any>(null);
  let lastUserId = $state<string | undefined>(undefined);

  const formatCurrency = (val: number) => {
    return "₹" + Math.round(val).toLocaleString("en-IN", { maximumFractionDigits: 0 });
  };

  // Resolve the target token context explicitly mapping Admin logic vs standard access
  let activeUser = $derived(
    authState.isAdminView ? authState.viewingAs : authState.user
  );

  const isOwnedByActivePayer = (p: any) => {
    if (!activeUser?.id) return false;
    if (p?.payerId != null) {
      return String(p.payerId) === String(activeUser.id);
    }
    if (activeUser?.name && p?.createdBy) {
      return (
        String(p.createdBy).toLowerCase() ===
        String(activeUser.name).toLowerCase()
      );
    }
    return false;
  };

  $effect(() => {
    const id = activeUser?.id;
    if (!id || id === lastUserId) return;
    lastUserId = id;
    isLoading = true;
    syncRemoteData(id).finally(() => {
      isLoading = false;
    });
  });

  // Combine active user's accessible programs for the filter
  let accessiblePrograms = $derived(
    activeUser?.role === "payer"
      ? (dbStore.programs as Program[]).filter((p) => isOwnedByActivePayer(p))
      : activeUser?.role === "admin" && !authState.isAdminView
        ? (dbStore.programs as Program[])
        : (dbStore.programs as Program[]).filter((p) =>
            p.enrolledPayees.includes(activeUser?.id || "")
          )
  );

  let programOptions = $derived([
    "All Program",
    ...accessiblePrograms.map((p: any) => p.name)
  ]);

  // Map Recent Payouts globally from the Mock DB to track Redemption Mutability instantly across the Dashboard view
  let mappedPayouts = $derived(
    [...(dbStore.payouts as Payout[])].sort((a, b) => {
      const db = new Date(b.createdAt || b.date).getTime();
      const da = new Date(a.createdAt || a.date).getTime();
      return db - da;
    })
      .filter((p) => {
        const authMatch =
          activeUser?.role === "admin" && !authState.isAdminView
            ? true
            : activeUser?.role === "payee"
              ? p.userId === activeUser?.id
              : accessiblePrograms.some((prog: any) => prog.id === p.programId);
        if (!authMatch) return false;

        const statusMatch =
          activeUser?.role === "admin" && !authState.isAdminView
            ? p.status === "Ready to redeem"
            : activeUser?.role === "payee"
              ? p.status === "Settled" || p.status === "Redeemed"
              : p.status === "Ready to redeem" ||
                p.status === "Redeemed" ||
                p.status === "Pending";

        // Program filter
        let programMatch = true;
        if (programFilter !== "All Program") {
          // Find the program ID for the selected name
          const selectedProg = (dbStore.programs as Program[]).find(
            (prog) => prog.name === programFilter
          );
          if (selectedProg) {
            programMatch = p.programId === selectedProg.id;
          }
        }

        return statusMatch && programMatch;
      })
      .map((p) => {
        // Find the payer name from the program
        const program = (dbStore.programs as Program[]).find(
          (prog) => prog.id === p.programId
        );
        const payerUser = (dbStore.users as any[]).find(
          (u) => u.id === program?.payerId
        );
        const payerName = payerUser
          ? payerUser.businessName || payerUser.name
          : program?.createdBy ||
            program?.payerName ||
            p.payerName ||
            "Unknown Payer";

        return {
          dbId: (p as any).id,
          payoutId: p.payoutId,
          id: p.transactionId || p.trackingId || p.claimNo,
          name:
            activeUser?.role === "payee"
              ? payerName
              : p.providerName || p.businessName,
          provider:
            activeUser?.role === "payee"
              ? payerName
              : p.providerName || p.businessName, // Fallback for the modal
          category: program?.name || "Unknown Program",
          amount: "₹" + p.amount,
          payableAmount: "₹" + p.amount, // Fallback for the modal
          status: p.status,
          createdBy: "System",
          createdAt: p.date
        };
      })
      .slice(0, 7)
  );

  // Dynamic metrics based on dbStore
  let filteredAccessiblePrograms = $derived(
    accessiblePrograms.filter((p: any) =>
      programFilter === "All Program" ? true : p.name === programFilter
    )
  );

  let dynamicMetrics = $derived({
    totalPayout: (dbStore.payouts as Payout[]).reduce((sum, p) => {
      const isRedeemed = p.status === "Redeemed";
      const programMatch =
        programFilter === "All Program"
          ? true
          : p.programId ===
            (dbStore.programs as Program[]).find((pr) => pr.name === programFilter)?.id;
      const isAuthorized =
        activeUser?.role === "payer"
          ? (filteredAccessiblePrograms as Program[]).some(
              (prog) => prog.id === p.programId
            )
          : activeUser?.role === "admin" && !authState.isAdminView
            ? true
            : p.userId === activeUser?.id;

      if (isRedeemed && isAuthorized && programMatch) {
        const cleanAmt = String(p.amount || "0").replace(/[₹,\s]/g, "");
        const baseAmt = parseFloat(cleanAmt) || 0;
        const tdsVal = (p as any).tds;
        const tdsNum = typeof tdsVal === 'number' ? tdsVal : parseFloat(String(tdsVal || "0")) || 0;
        const finalPayable = baseAmt - (baseAmt * tdsNum) / 100;
        return sum + finalPayable;
      }
      return sum;
    }, 0),
    activePayee:
      activeUser?.role === "payer"
        ? new Set(
            filteredAccessiblePrograms.flatMap((p: any) => p.enrolledPayees)
          ).size || 0
        : 3,
    totalCardsRedeemed: (dbStore.payouts as Payout[]).filter((p) => {
      const isRedeemed = p.status === "Redeemed";
      const programMatch =
        programFilter === "All Program"
          ? true
          : p.programId ===
            (dbStore.programs as Program[]).find((pr) => pr.name === programFilter)?.id;
      const isAuthorized =
        activeUser?.role === "payer"
          ? (filteredAccessiblePrograms as Program[]).some(
              (prog) => prog.id === p.programId
            )
          : activeUser?.role === "admin" && !authState.isAdminView
            ? true
            : p.userId === activeUser?.id;
      return isRedeemed && isAuthorized && programMatch;
    }).length,
    totalPrograms: filteredAccessiblePrograms.length
  });

  let payeeMetrics = $derived({
    totalPayout: (dbStore.payouts as Payout[]).reduce((sum, p) => {
      const isRedeemed = p.status === "Redeemed";
      const programMatch =
        programFilter === "All Program"
          ? true
          : p.programId ===
            (dbStore.programs as Program[]).find((pr) => pr.name === programFilter)?.id;
      const isAuthorized =
        (activeUser?.role === "admin" && !authState.isAdminView) ||
        p.userId === activeUser?.id;

      if (isRedeemed && isAuthorized && programMatch) {
        const cleanAmt = String(p.amount || "0").replace(/[₹,\s]/g, "");
        const baseAmt = parseFloat(cleanAmt) || 0;
        const tdsVal = (p as any).tds;
        const tdsNum = typeof tdsVal === 'number' ? tdsVal : parseFloat(String(tdsVal || "0")) || 0;
        const finalPayable = baseAmt - (baseAmt * tdsNum) / 100;
        return sum + finalPayable;
      }
      return sum;
    }, 0),
    // Only payee needs to total pending and settled explicitly like this here
    newPayouts: (dbStore.payouts as Payout[]).filter(
      (p) =>
        ((activeUser?.role === "admin" && !authState.isAdminView) ||
          p.userId === activeUser?.id) &&
        p.status === "Ready to redeem" &&
        (programFilter === "All Program" ||
          p.programId ===
            (dbStore.programs as Program[]).find((pr) => pr.name === programFilter)?.id)
    ).length,
    settledPayouts: (dbStore.payouts as Payout[]).filter(
      (p) =>
        ((activeUser?.role === "admin" && !authState.isAdminView) ||
          p.userId === activeUser?.id) &&
        p.status === "Settled" &&
        (programFilter === "All Program" ||
          p.programId ===
            (dbStore.programs as Program[]).find((pr) => pr.name === programFilter)?.id)
    ).length,
    activePrograms: filteredAccessiblePrograms.length
  });

  const pctChange = (current: number, previous: number) => {
    if (previous === 0 && current === 0) return 0;
    if (previous === 0) return 100;
    return Math.round(((current - previous) / previous) * 100);
  };

  const parseDate = (value: any) => {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const inWindow = (d: Date, start: Date, end: Date) =>
    d.getTime() >= start.getTime() && d.getTime() <= end.getTime();

  let payeeTrends = $derived.by(() => {
    const now = new Date();
    const startCurrent = new Date(now);
    startCurrent.setDate(startCurrent.getDate() - 29);
    const endCurrent = now;
    const startPrev = new Date(startCurrent);
    startPrev.setDate(startPrev.getDate() - 30);
    const endPrev = new Date(startCurrent);
    endPrev.setDate(endPrev.getDate() - 1);

    const relevant = (dbStore.payouts as Payout[]).filter(
      (p) =>
        ((activeUser?.role === "admin" && !authState.isAdminView) ||
          p.userId === activeUser?.id) &&
        (programFilter === "All Program" ||
          p.programId ===
            (dbStore.programs as Program[]).find((pr) => pr.name === programFilter)?.id)
    );

    let currentTotal = 0;
    let prevTotal = 0;
    let currentNew = 0;
    let prevNew = 0;
    let currentSettled = 0;
    let prevSettled = 0;
    const currentPayers = new Set<string>();
    const prevPayers = new Set<string>();

    relevant.forEach((p) => {
      const d = parseDate(p.date);
      if (!d) return;
      const cleanAmt = String(p.amount || "0").replace(/[₹,\s]/g, "");
      const amt = parseInt(cleanAmt) || 0;
      const program = (dbStore.programs as Program[]).find(
        (prog) => prog.id === p.programId
      );
      const payerId = String(p.payerId || program?.payerId || "");

      if (inWindow(d, startCurrent, endCurrent)) {
        if (p.status === "Redeemed" || p.status === "Settled")
          currentTotal += amt;
        if (p.status === "Ready to redeem") currentNew += 1;
        if (p.status === "Settled") currentSettled += 1;
        if (payerId) currentPayers.add(payerId);
      } else if (inWindow(d, startPrev, endPrev)) {
        if (p.status === "Redeemed" || p.status === "Settled") prevTotal += amt;
        if (p.status === "Ready to redeem") prevNew += 1;
        if (p.status === "Settled") prevSettled += 1;
        if (payerId) prevPayers.add(payerId);
      }
    });

    return {
      totalPayout: pctChange(currentTotal, prevTotal),
      newPayouts: pctChange(currentNew, prevNew),
      settledPayouts: pctChange(currentSettled, prevSettled),
      activePayers: pctChange(currentPayers.size, prevPayers.size)
    };
  });

  // Top payers metric (only for payee view)
  let topPayers = $derived.by(() => {
    if (activeUser?.role === "payer") return [];

    // Group payouts by payer name where possible
    const payerTotals: Record<string, number> = {};
    let totalAll = 0;

    (dbStore.payouts as Payout[]).forEach((p) => {
      if (
        (activeUser?.role === "admin" && !authState.isAdminView) ||
        p.userId === activeUser?.id
      ) {
        if (p.status !== "Redeemed" && p.status !== "Settled") return;

        const program = (dbStore.programs as Program[]).find(
          (prog) => prog.id === p.programId
        );
        const payerLabel =
          p.payerName ||
          program?.createdBy ||
          program?.payerName ||
          p.providerName ||
          "Unknown Payer";
        const cleanAmt = String(p.amount || "0").replace(/[₹,\s]/g, "");
        const amt = parseInt(cleanAmt) || 0;
        payerTotals[payerLabel] = (payerTotals[payerLabel] || 0) + amt;
        totalAll += amt;
      }
    });

    return Object.entries(payerTotals)
      .map(([name, amount]) => ({
        name,
        amount: formatCurrency(amount),
        pct: totalAll > 0 ? Math.round((amount / totalAll) * 100) : 0,
        rawAmt: amount
      }))
      .sort((a, b) => b.rawAmt - a.rawAmt)
      .slice(0, 4);
  });
</script>

<div
  class="flex w-full flex-col min-h-screen {activeUser?.role === 'payer'
    ? 'bg-white'
    : 'bg-slate-50'} relative"
>
  {#if false}
    <TermsModal />
  {/if}

  <TopBar />

  {#if isLoading}
    <div class="flex w-full flex-1 flex-col items-center justify-center p-20">
      <div
        class="h-10 w-10 animate-spin rounded-full border-4 border-slate-200"
        style="border-top-color: {currentTheme.colors.primary}"
      ></div>
    </div>
  {:else}
    <div class="flex w-full flex-col items-center p-8 pt-6 pb-20">
      <!-- White Container Card to stop full-width stretch -->
      <div
        class="w-full max-w-[1400px] bg-white rounded-[32px] p-8 md:p-10 shadow-sm border border-slate-200 flex flex-col"
      >
        <div class="mb-8">
          <h1 class="text-[22px] font-semibold tracking-tight" style="color: {currentTheme.colors.primary}">
            Welcome back!
          </h1>
          <p class="mt-1 text-[13px] font-medium text-slate-500">
            {activeUser?.role === "payer"
              ? "Track your Payouts"
              : "Track your earnings"}
          </p>
        </div>

        <!-- ======================= -->
        <!-- PAYER DASHBOARD CONTENT -->
        <!-- ======================= -->
        {#if activeUser?.role === "payer"}
          <!-- Filters & Actions Row -->
          <div
            class="mb-6 flex w-full flex-wrap items-center justify-between gap-4"
          >
            <div class="flex items-center gap-3">
              <!-- Selectors omitted for brevity relative -->
              <div class="w-[180px] relative">
                <CustomSelect
                  id="programFilter"
                  bind:value={programFilter}
                  options={programOptions}
                />
              </div>
              <div class="w-[160px] relative">
                <CustomSelect
                  id="timeFilter"
                  bind:value={timeFilter}
                  options={["All Time", "Last 30 Days", "Last 3 Months"]}
                />
              </div>
            </div>

            <div class="flex items-center gap-3">
              <button
                onclick={() => goto("/create-payout")}
                class="flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 cursor-pointer"
              >
                + Create Payout
              </button>
              <button
                onclick={() => dispatch("createProgram")}
                class="flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 cursor-pointer"
              >
                + New Program
              </button>
              <button
                onclick={() => goto("/reports")}
                class="flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 cursor-pointer"
              >
                Export Report
              </button>
            </div>
          </div>

          <!-- Metrics Row -->
          <div class="flex w-full gap-4 flex-wrap lg:flex-nowrap">
            <MetricCard
              title="Total Payout"
              value={formatCurrency(dynamicMetrics.totalPayout)}
              variant="primary"
              width="w-full lg:w-[25%]"
            />
            <MetricCard
              title="Active Programs"
              value={dynamicMetrics.totalPrograms}
              width="w-full lg:w-[25%]"
            />
            <MetricCard
              title="Total Cards Redeemed"
              value={dynamicMetrics.totalCardsRedeemed}
              width="w-full lg:w-[25%]"
            />
            <MetricCard
              title="Active Payee"
              value={dynamicMetrics.activePayee}
              width="w-full lg:w-[25%]"
            />
          </div>

          <div class="w-full mt-2">
            <RecentPayouts
              payouts={mappedPayouts}
              onredeem={(payout: any) => (selectedPayout = payout)}
            />
          </div>

          <!-- ======================= -->
          <!-- PAYEE DASHBOARD CONTENT -->
          <!-- ======================= -->
        {:else if activeUser?.role === "payee" || (activeUser?.role === "admin" && !authState.isAdminView)}
          <!-- Payee Filters Row -->
          <div
            class="mb-6 flex w-full flex-wrap items-center justify-start gap-4"
          >
            <div class="w-[180px] relative">
              <CustomSelect
                id="programFilterAdmin"
                bind:value={programFilter}
                options={programOptions}
              />
            </div>
            <div class="w-[160px] relative">
              <CustomSelect
                id="timeFilterPayee"
                bind:value={timeFilter}
                options={["All Time", "Last 30 Days", "Last 3 Months"]}
              />
            </div>
          </div>

          <!-- Payee Metrics Row -->
          <div class="flex w-full gap-4 flex-wrap lg:flex-nowrap">
            <MetricCard
              title="Total Payout"
              value={formatCurrency(payeeMetrics.totalPayout)}
              variant="primary"
              width="w-full lg:w-[25%]"
            />
            <MetricCard
              title="New Payout"
              value={payeeMetrics.newPayouts}
              width="w-full lg:w-[20%]"
            />
            <MetricCard
              title="Settled Payouts"
              value={payeeMetrics.settledPayouts}
              width="w-full lg:w-[20%]"
            />
            <MetricCard
              title={activeUser?.role === "admin"
                ? "Total Programs"
                : "Active Programs"}
              value={activeUser?.role === "admin"
                ? accessiblePrograms.length
                : payeeMetrics.activePrograms}
              width="w-full lg:w-[20%]"
            />
          </div>

          <!-- Payee Split View -->
          <div class="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div class="lg:col-span-2">
              <!-- We pass isPayee to customize the styling of RecentPayouts inherently -->
              <RecentPayouts
                payouts={mappedPayouts}
                isPayee={true}
                onredeem={(payout: any) =>
                  goto(`/payouts/new?focus=${payout.id}`)}
              />
            </div>

            <div class="lg:col-span-1">
              <div
                class="mt-8 flex w-full flex-col rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden"
              >
                <div
                  class="border-b border-slate-200 bg-[#f8f9fa] px-6 py-4 flex items-center justify-between"
                >
                  <h2 class="text-[15px] font-semibold" style="color: {currentTheme.colors.primary}">
                    Top Payers
                  </h2>
                </div>
                <div class="flex flex-col divide-y divide-slate-100">
                  <!-- Top Payers Dynamic Loop -->
                  {#each topPayers as payer}
                    <div
                      class="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer group"
                    >
                      <span
                        class="w-1/3 text-[13px] font-semibold text-slate-800"
                        >{payer.name}</span
                      >
                      <!-- Fake progress bar -->
                      <div class="w-1/3 flex items-center px-4">
                        <div
                          class="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden"
                        >
                          <div
                            class="h-full rounded-full"
                            style="width: {payer.pct}%; background-color: {currentTheme.colors.primary}"
                          ></div>
                        </div>
                      </div>
                      <span
                        class="w-1/3 text-right text-[14px] font-semibold text-slate-900"
                        >{payer.amount}</span
                      >
                    </div>
                  {:else}
                    <div
                      class="flex flex-col items-center justify-center py-10 px-6"
                    >
                      <div
                        class="h-10 w-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-3 text-slate-400 font-semibold text-lg"
                      >
                        ₹
                      </div>
                      <p class="text-[13px] font-semibold text-slate-600">
                        No active payers
                      </p>
                      <p class="text-[12px] text-slate-400 mt-0.5 text-center">
                        You have not received any payouts yet.
                      </p>
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  {#if selectedPayout}
    <RedeemModal
      payout={selectedPayout}
      onClose={() => (selectedPayout = null)}
    />
  {/if}
</div>

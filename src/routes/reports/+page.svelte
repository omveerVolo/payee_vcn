<script lang="ts">
  import TopBar from "$lib/components/dashboard/TopBar.svelte";
  import CustomSelect from "$lib/components/ui/CustomSelect.svelte";
  import {
    RefreshCw,
    FileText,
    Download,
    Clock,
    CheckCircle2
  } from "lucide-svelte";
  import { authState } from "$lib/state/auth.svelte.js";
  import { dbStore, requestReport, apiCall } from "$lib/state/db.svelte.js";

  let activeUser = $derived(
    authState.isAdminView ? authState.viewingAs : authState.user
  );

  let entityTabName = $derived(
    activeUser?.role === "payee" ? "Payer" : "Payee"
  );
  let activeTab = $state("Program");
  let timeFilter = $state("All Time");
  let reportType = $state("All Status");
  let customStartDate = $state("");
  let customEndDate = $state("");

  let allPayees = $state<any[]>([]);
  let selectedTargetIds = $state<string[]>(["all"]);

  function toggleSelection(id: string) {
    if (id === "all") {
      selectedTargetIds = ["all"];
      return;
    }

    let current = selectedTargetIds.filter((x) => x !== "all");
    if (current.includes(id)) {
      current = current.filter((x) => x !== id);
    } else {
      current.push(id);
    }

    if (current.length === 0) current = ["all"];
    selectedTargetIds = current;
  }

  $effect(() => {
    if (!activeUser?.id) return;
    if (activeUser.role === "payer") {
      apiCall(`/payees?payerId=${activeUser.id}`)
        .then((res) => {
          allPayees = Array.isArray(res) ? res : res?.payees || [];
        })
        .catch(() => (allPayees = []));
    }
  });

  let enrolledPayeeIds = $derived(
    Array.from(
      new Set(dbStore.programs.flatMap((p: any) => p.enrolledPayees || []))
    )
  );

  let displayList = $derived.by(() => {
    if (activeTab === "Program") {
      return dbStore.programs;
    }
    if (activeUser?.role === "payee") {
      const payers = new Map();
      dbStore.programs.forEach((p: any) => {
        if (!payers.has(p.payerId)) {
          payers.set(p.payerId, {
            id: p.payerId,
            name: p.createdBy || p.payerName || "Unknown Payer"
          });
        }
      });
      return Array.from(payers.values());
    }
    return allPayees.filter((payee) => enrolledPayeeIds.includes(payee.id));
  });

  let showHistory = $state(false);
  let isRequesting = $state(false);

  function handleGenerateReport() {
    isRequesting = true;

    let actualIds: string[] = [];
    let targetName = "";

    if (selectedTargetIds.includes("all")) {
      actualIds = displayList.map((i) => i.id);
      targetName =
        activeTab === "Program" ? "All Programs" : `All ${entityTabName}s`;
    } else {
      actualIds = selectedTargetIds;
      if (selectedTargetIds.length === 1) {
        const selectedItem = displayList.find(
          (i) => i.id === selectedTargetIds[0]
        );
        targetName = selectedItem
          ? selectedItem.businessName || selectedItem.name
          : "";
      } else {
        targetName = `${selectedTargetIds.length} Selected`;
      }
    }

    requestReport(
      activeUser?.id,
      activeTab === "Program" ? "program" : "payee",
      actualIds,
      targetName,
      timeFilter === "Custom Range" ? customStartDate : timeFilter,
      timeFilter === "Custom Range" ? customEndDate : "",
      reportType
    );
    showHistory = true;

    // Reset loader visually
    setTimeout(() => {
      isRequesting = false;
    }, 600);
  }
</script>

<svelte:head>
  <title>Manage Reports - HDFC Bank</title>
</svelte:head>

<div class="flex h-full w-full flex-col bg-slate-50">
  <TopBar />

  <div class="flex w-full flex-col p-8 pt-4 pb-20">
    <div
      class="mb-8 w-full rounded-lg bg-white shadow-sm border border-slate-200 min-h-[600px] flex flex-col overflow-hidden"
    >
      <!-- Header Row -->
      <div
        class="border-b border-slate-200 bg-[#f8f9fa] px-6 py-5 flex items-center justify-between"
      >
        <h2 class="text-[17px] font-semibold text-[#003366]">Reports</h2>
      </div>

      <div class="px-6 pb-6 w-full">
        <!-- Filters & Action Row -->
        <div class="mt-6 flex flex-wrap items-center justify-between gap-4">
          <!-- Tabs and Toggles -->
          <div class="flex items-center gap-4">
            <div class="flex rounded-lg bg-slate-100 p-1">
              <button
                onclick={() => {
                  activeTab = "Program";
                  selectedTargetIds = ["all"];
                }}
                class="rounded-md px-8 py-2 text-sm font-semibold transition-all {activeTab ===
                'Program'
                  ? 'bg-white text-[#0066cc] shadow-sm ring-1 ring-slate-200 cursor-default'
                  : 'text-slate-500 hover:text-slate-700 cursor-pointer'}"
              >
                Program
              </button>
              <button
                onclick={() => {
                  activeTab = "Entity";
                  selectedTargetIds = ["all"];
                }}
                class="rounded-md px-8 py-2 text-sm font-semibold transition-all {activeTab ===
                'Entity'
                  ? 'bg-white text-[#0066cc] shadow-sm ring-1 ring-slate-200 cursor-default'
                  : 'text-slate-500 hover:text-slate-700 cursor-pointer'}"
              >
                {entityTabName}
              </button>
            </div>

            <div class="w-[140px] relative">
              <CustomSelect
                id="timeFilter"
                bind:value={timeFilter}
                options={[
                  "All Time",
                  "Last 30 Days",
                  "Last 3 Months",
                  "This Year",
                  "Custom Range"
                ]}
              />

              {#if timeFilter === "Custom Range"}
                <div
                  class="absolute top-[calc(100%+8px)] left-0 z-50 flex flex-col gap-3 rounded-[16px] border border-slate-200 bg-white p-4 shadow-xl animate-in fade-in zoom-in-95 w-[280px]"
                >
                  <h4 class="text-xs font-semibold text-slate-800">
                    Select Date Range
                  </h4>
                  <div class="flex flex-col gap-3">
                    <div class="flex flex-col gap-1.5">
                      <span class="text-[11px] font-medium text-slate-500"
                        >From Date</span
                      >
                      <input
                        type="date"
                        bind:value={customStartDate}
                        title="Start Date"
                        aria-label="Start Date"
                        class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-[#0066cc] focus:ring-1 focus:ring-[#0066cc] cursor-pointer bg-slate-50 hover:bg-white transition-colors"
                      />
                    </div>
                    <div class="flex flex-col gap-1.5">
                      <span class="text-[11px] font-medium text-slate-500"
                        >To Date</span
                      >
                      <input
                        type="date"
                        bind:value={customEndDate}
                        title="End Date"
                        aria-label="End Date"
                        class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-[#0066cc] focus:ring-1 focus:ring-[#0066cc] cursor-pointer bg-slate-50 hover:bg-white transition-colors"
                      />
                    </div>
                  </div>
                </div>
              {/if}
            </div>

            <div class="w-[180px] relative">
              <CustomSelect
                id="reportType"
                bind:value={reportType}
                options={["All Status", "Redeemed", "Settled", "Pending"]}
              />
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center gap-3">
            <button
              onclick={handleGenerateReport}
              disabled={isRequesting}
              class="flex h-11 items-center justify-center gap-2 rounded-xl border border-transparent bg-[#0066cc] px-5 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#0052a3] cursor-pointer hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {#if isRequesting}
                <RefreshCw class="h-4 w-4 animate-spin" />
                Generating...
              {:else}
                <Download class="h-4 w-4" />
                Download Report
              {/if}
            </button>
            <button
              onclick={() => (showHistory = true)}
              class="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 cursor-pointer hover:-translate-y-0.5 relative"
            >
              <Clock class="h-4 w-4" />
              History
              {#if dbStore.reportsHistory.filter((r) => r.status === "ready").length > 0}
                <span
                  class="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm"
                >
                  {dbStore.reportsHistory.filter((r) => r.status === "ready")
                    .length}
                </span>
              {/if}
            </button>
          </div>
        </div>

        <!-- Data Table -->
        <div
          class="mt-8 w-full border border-slate-100 shadow-sm sm:rounded-2xl overflow-hidden"
        >
          <div
            class="grid grid-cols-4 bg-slate-100 p-4 border-b border-slate-200 text-xs font-semibold text-slate-800"
          >
            <div class="col-span-3">
              {activeTab === "Program" ? "Program" : entityTabName}
            </div>
          </div>

          <div class="flex flex-col">
            <!-- "All" Selection Row -->
            <div
              class="grid grid-cols-4 items-center border-b border-slate-100 bg-white p-4 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer"
              onclick={() => toggleSelection("all")}
              onkeydown={(e) => e.key === "Enter" && toggleSelection("all")}
              tabindex="0"
              role="button"
            >
              <div class="col-span-3 text-sm font-semibold text-slate-800 mt-1">
                All {activeTab === "Program" ? "Programs" : entityTabName + "s"}
              </div>
              <div class="col-span-1 flex justify-end px-2">
                <input
                  type="checkbox"
                  checked={selectedTargetIds.includes("all")}
                  class="h-5 w-5 rounded border-slate-300 accent-[#0066cc] cursor-pointer"
                  onchange={() => toggleSelection("all")}
                  onclick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            {#each displayList as item}
              <div
                class="grid grid-cols-4 items-center border-b border-slate-100 bg-white p-4 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer"
                onclick={() => toggleSelection(item.id)}
                onkeydown={(e) => e.key === "Enter" && toggleSelection(item.id)}
                tabindex="0"
                role="button"
              >
                <div
                  class="col-span-3 text-sm font-semibold text-[#003366] mt-1"
                >
                  {item.businessName || item.name}
                </div>
                <div class="col-span-1 flex justify-end px-2">
                  <input
                    type="checkbox"
                    checked={selectedTargetIds.includes(item.id)}
                    class="h-5 w-5 rounded border-slate-300 accent-[#0066cc] cursor-pointer"
                    onchange={() => toggleSelection(item.id)}
                    onclick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Report History Modal/Slide-over -->
{#if showHistory}
  <div
    class="fixed inset-0 z-[100] flex justify-end bg-slate-900/20 backdrop-blur-sm"
  >
    <div
      class="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right"
    >
      <div
        class="flex items-center justify-between p-6 border-b border-slate-100"
      >
        <h2 class="text-xl font-bold text-slate-900">Report History</h2>
        <button
          onclick={() => (showHistory = false)}
          class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
        >
          ✕
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
        {#if dbStore.reportsHistory.length === 0}
          <div
            class="flex flex-col items-center justify-center h-40 text-center gap-3 opacity-60"
          >
            <FileText class="h-8 w-8 text-slate-400" />
            <p class="text-sm font-medium text-slate-500">
              No reports generated yet.
            </p>
          </div>
        {:else}
          {#each dbStore.reportsHistory as report}
            <div
              class="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 shadow-sm bg-white"
            >
              <div class="flex items-center justify-between">
                <span
                  class="text-xs font-semibold text-slate-500 uppercase tracking-wider"
                >
                  {report.id}
                </span>
                <span class="text-[11px] font-medium text-slate-400">
                  {new Date(report.requestedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </span>
              </div>

              <div class="flex flex-col gap-1">
                <h4 class="text-sm font-bold text-slate-900">
                  {report.programId}
                </h4>
                <p class="text-xs font-medium text-slate-600">
                  Filters: {report.dateRange}
                  {#if report.statusFilter && report.statusFilter !== "All Status"}
                    • {report.statusFilter}
                  {/if}
                </p>
              </div>

              <div
                class="mt-2 flex items-center justify-between border-t border-slate-100 pt-3"
              >
                {#if report.status === "loading"}
                  <div class="flex items-center gap-2 text-[#0066cc]">
                    <RefreshCw class="h-4 w-4 animate-spin" />
                    <span class="text-xs font-semibold">Generating...</span>
                  </div>
                {:else if report.status === "ready"}
                  <div class="flex items-center gap-2 text-emerald-600">
                    <CheckCircle2 class="h-4 w-4" />
                    <span class="text-xs font-semibold">Ready</span>
                  </div>
                  <a
                    href={report.downloadUrl}
                    download={`report_${report.id}.csv`}
                    class="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-slate-800"
                  >
                    <Download class="h-3.5 w-3.5" />
                    Download CSV
                  </a>
                {/if}
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </div>
{/if}

<script lang="ts">
  import TopBar from "$lib/components/dashboard/TopBar.svelte";
  import { goto } from "$app/navigation";
  import {
    User,
    AlertCircle,
    X,
    CheckCircle2,
    Eye,
    Copy,
    ChevronLeft,
    ChevronRight
  } from "lucide-svelte";
  import { authState } from "$lib/state/auth.svelte.js";
  import { dbStore, cancelEnrollment, apiCall } from "$lib/state/db.svelte.js";

  // Derive target identity securely
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

  // Derive programs from global state, filtering for the current user's role mapping
  let programs = $derived(
    dbStore.programs.filter((p: any) => {
      if (!activeUser) return false;
      if (activeUser.role === "admin") return true;
      if (activeUser.role === "payer") return isOwnedByActivePayer(p);
      // Payees see programs they are enrolled in
      return (
        p.enrolledPayees.includes(activeUser.id) ||
        p.enrolledPayees.length === 0
      );
    })
  );

  // Helper to count payouts for a specific user within a specific program
  const getPayoutCountForUser = (programId: string) => {
    if (!activeUser?.id) return 0;
    return dbStore.payouts.filter(
      (p: any) => p.programId === programId && p.userId === activeUser?.id
    ).length;
  };

  // Helper to count total unique payees in a program
  const getPayeeCountForProgram = (program: any) => {
    return program.enrolledPayees?.length || 0;
  };

  let activeCancelId = $state<string | null>(null);

  function confirmCancel(id: string) {
    if (activeUser?.id) {
      cancelEnrollment(id, activeUser.id);
    }
    activeCancelId = null;
  }

  // Payee Dropdown State & Pagination
  let expandedProgramId = $state<string | null>(null);
  let programPayees = $state<any[]>([]);
  let isFetchingPayees = $state(false);
  let payeePage = $state(1);
  const payeesPerPage = 5;

  let paginatedPayees = $derived.by(() => {
    const start = (payeePage - 1) * payeesPerPage;
    const end = start + payeesPerPage;
    return programPayees.slice(start, end);
  });

  async function togglePayees(programId: string) {
    if (expandedProgramId === programId) {
      expandedProgramId = null;
      programPayees = [];
      return;
    }
    expandedProgramId = programId;
    isFetchingPayees = true;
    payeePage = 1;
    programPayees = [];

    try {
      const res = await apiCall(`/programs/payees?programId=${programId}`);
      if (res && res.payees) {
        programPayees = res.payees;
      }
    } catch (e) {
      console.error("Failed to load payees", e);
    } finally {
      isFetchingPayees = false;
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }
</script>

<svelte:head>
  <title>Programs - HDFC Bank</title>
</svelte:head>

<div class="flex min-h-screen w-full flex-col bg-slate-50 relative">
  <TopBar />

  <div class="flex w-full flex-col items-center justify-start p-8 pt-6 pb-20">
    <div
      class="w-full max-w-[1400px] flex flex-col bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden"
    >
      <!-- Header Row -->
      <div
        class="border-b border-slate-200 bg-[#f8f9fa] px-6 py-5 flex items-start flex-col"
      >
        <h1 class="text-[17px] font-semibold text-[#003366]">Programs</h1>
        <p class="mt-0.5 text-[12px] font-medium text-slate-500">
          Manage your payout programs
        </p>
      </div>

      <div class="p-6 md:p-8 flex flex-col w-full">
        <!-- Action Row -->
        <div class="mb-6 flex w-full">
          <!-- Navigates back to home to invoke onboarding explicitly. Hidden for payees -->
          {#if activeUser?.role !== "payee"}
            <button
              onclick={() => goto("/?createProgram=true")}
              class="flex h-11 items-center justify-center rounded-xl border border-slate-800 bg-white px-5 text-sm font-semibold text-slate-800 shadow-sm transition-all hover:bg-slate-50 cursor-pointer"
            >
              + New Program
            </button>
          {/if}
        </div>

        <!-- Program List -->
        <div class="flex flex-col gap-6">
          {#each programs as program}
            <div
              class="w-full rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm flex flex-col pt-6 pb-4"
            >
              <!-- Top Section -->
              <div class="flex justify-between items-start px-6 mb-5">
                <div class="flex flex-col">
                  <h3 class="text-[17px] font-semibold text-[#003366]">
                    {program.name}
                  </h3>
                  <span class="text-[13px] font-medium text-slate-400 mt-1">
                    {program.category}
                    <span class="mx-1.5">•</span>
                    Added on {program.createdAt} by {program.createdBy}
                  </span>
                </div>

                <div class="flex items-center gap-2 mt-1">
                  <div
                    class="bg-[#e8f8f5] text-[#1a7f71] px-3 py-1.5 rounded-md text-[13px] font-semibold flex items-center justify-center gap-1.5 cursor-default border border-[#8cdccb]"
                  >
                    <CheckCircle2 class="h-4 w-4 stroke-[2.5]" />
                    {program.status}
                  </div>
                </div>
              </div>

              <!-- Divider & Bottom Section -->
              <div class="w-full px-5 pb-1 relative">
                <div
                  class="bg-[#f5f0f3] rounded-xl p-3.5 flex justify-between items-center"
                >
                  <!-- Context Switcher based on Role -->
                  {#if activeUser?.role === "payee"}
                    <div
                      class="flex items-center px-4 font-semibold text-slate-800 text-[14px]"
                    >
                      <span class="text-[15px] mr-1"
                        >{getPayoutCountForUser(program.id)}</span
                      > payouts received
                    </div>

                    <!-- Payee specific action -->
                    <div class="relative">
                      <button
                        onclick={() => (activeCancelId = program.id)}
                        class="text-[13px] font-semibold text-slate-600 bg-white shadow-sm transition-colors rounded-xl flex items-center gap-1.5 px-4 py-2 cursor-pointer hover:bg-slate-50 border border-slate-200"
                      >
                        Cancel Enrollment <X
                          class="h-4 w-4 rounded bg-slate-200 text-slate-600 p-0.5"
                          strokeWidth={3}
                        />
                      </button>
                    </div>
                  {:else}
                    <!-- Payer specific view -->
                    <div class="flex items-center gap-3 px-2">
                      <User class="h-5 w-5 text-slate-600" />
                      <span class="text-[13px] font-medium text-slate-600"
                        >{getPayeeCountForProgram(program)} payees enrolled</span
                      >
                    </div>

                    <div class="flex items-center gap-3">
                      <button
                        onclick={() => goto(`/?editProgram=${program.id}`)}
                        class="text-[13px] font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-[#7d326f] shadow-sm transition-colors rounded-xl flex items-center gap-1.5 px-4 py-2 cursor-pointer"
                      >
                        Manage
                      </button>
                      <button
                        onclick={() => togglePayees(program.id)}
                        class="text-[13px] font-semibold text-[#0066cc] bg-blue-50/50 hover:bg-blue-50 transition-colors rounded-xl flex items-center gap-2 px-4 py-2 cursor-pointer border border-blue-100"
                      >
                        <Eye class="h-4 w-4" /> View All Payees
                      </button>
                    </div>
                  {/if}
                </div>

                <!-- Expanded Payees Area -->
                {#if expandedProgramId === program.id}
                  <div
                    class="mt-4 w-full rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2"
                  >
                    {#if isFetchingPayees}
                      <div class="flex items-center justify-center p-8">
                        <div
                          class="h-6 w-6 animate-spin rounded-full border-2 border-[#0066cc] border-t-transparent"
                        ></div>
                      </div>
                    {:else if programPayees.length === 0}
                      <div
                        class="flex items-center justify-center p-8 text-sm text-slate-500 font-medium"
                      >
                        No payees found for this program.
                      </div>
                    {:else}
                      <div class="max-h-[300px] overflow-y-auto">
                        <table class="w-full text-left text-[13px]">
                          <thead
                            class="bg-slate-50 sticky top-0 z-10 border-b border-slate-200"
                          >
                            <tr>
                              <th class="px-5 py-3 font-semibold text-slate-600"
                                >Payee Name</th
                              >
                              <th class="px-5 py-3 font-semibold text-slate-600"
                                >City</th
                              >
                              <th class="px-5 py-3 font-semibold text-slate-600"
                                >State</th
                              >
                              <th class="px-5 py-3 font-semibold text-slate-600"
                                >Email Address</th
                              >
                            </tr>
                          </thead>
                          <tbody class="divide-y divide-slate-100">
                            {#each paginatedPayees as payee}
                              <tr class="hover:bg-slate-50 transition-colors">
                                <td
                                  class="px-5 py-3.5 font-semibold text-[#003366]"
                                >
                                  {payee.businessName || payee.name || "N/A"}
                                </td>
                                <td
                                  class="px-5 py-3.5 font-semibold text-[#003366]"
                                >
                                  {payee.city || "N/A"}
                                </td>
                                <td
                                  class="px-5 py-3.5 font-semibold text-[#003366]"
                                >
                                  {payee.state || "N/A"}
                                </td>
                                <td class="px-5 py-3.5">
                                  <div class="flex items-center gap-3">
                                    <span class="text-slate-600 font-medium"
                                      >{payee.email}</span
                                    >
                                    {#if payee.email}
                                      <button
                                        onclick={() =>
                                          copyToClipboard(payee.email)}
                                        class="text-slate-400 hover:text-[#0066cc] transition-colors cursor-pointer"
                                        title="Copy Email"
                                      >
                                        <Copy class="h-3.5 w-3.5" />
                                      </button>
                                    {/if}
                                  </div>
                                </td>
                              </tr>
                            {/each}
                          </tbody>
                        </table>
                      </div>

                      <!-- Pagination Controls -->
                      {#if programPayees.length > payeesPerPage}
                        <div
                          class="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-3"
                        >
                          <span class="text-[12px] font-medium text-slate-500">
                            Showing {(payeePage - 1) * payeesPerPage + 1} to {Math.min(
                              payeePage * payeesPerPage,
                              programPayees.length
                            )} of {programPayees.length}
                          </span>
                          <div class="flex items-center gap-2">
                            <button
                              disabled={payeePage === 1}
                              onclick={() => payeePage--}
                              class="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                              <ChevronLeft class="h-4 w-4" />
                            </button>
                            <span
                              class="text-[13px] font-semibold text-slate-700 px-2"
                              >{payeePage}</span
                            >
                            <button
                              disabled={payeePage * payeesPerPage >=
                                programPayees.length}
                              onclick={() => payeePage++}
                              class="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                              <ChevronRight class="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      {/if}
                    {/if}
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Global Cancel Enrollment Modal -->
{#if activeCancelId !== null}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300"
    onclick={() => (activeCancelId = null)}
  >
    <div
      class="relative w-full max-w-[400px] rounded-[24px] bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-300"
      onclick={(e) => e.stopPropagation()}
    >
      <div class="flex items-start gap-5 mb-8">
        <div
          class="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center shrink-0"
        >
          <AlertCircle class="h-6 w-6 text-red-600" />
        </div>
        <div class="flex flex-col pt-1">
          <h2
            class="text-[20px] font-semibold text-slate-900 leading-tight mb-1"
          >
            Cancel Enrollment?
          </h2>
          <p class="text-[13px] text-slate-500 leading-relaxed font-medium">
            Are you sure you want to cancel your enrollment in this program?
            This action cannot be undone.
          </p>
        </div>
      </div>

      <div class="flex items-center justify-end gap-3 w-full">
        <button
          class="px-6 py-3 rounded-xl bg-slate-100 text-slate-700 text-[14px] font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
          onclick={() => (activeCancelId = null)}
        >
          Nevermind
        </button>
        <button
          class="px-6 py-3 rounded-xl bg-[#0066cc] text-white text-[14px] font-semibold shadow-sm hover:bg-[#0052a3] transition-colors cursor-pointer flex items-center justify-center"
          onclick={() => {
            activeCancelId = null;
          }}
        >
          Confirm Cancellation
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Global Cancel Enrollment Modal -->
{#if activeCancelId !== null}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300"
    onclick={() => (activeCancelId = null)}
  >
    <div
      class="relative w-full max-w-[400px] rounded-[24px] bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-300"
      onclick={(e) => e.stopPropagation()}
    >
      <div class="flex items-start gap-5 mb-8">
        <div
          class="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center shrink-0"
        >
          <AlertCircle class="h-6 w-6 text-red-600" />
        </div>
        <div class="flex flex-col pt-1">
          <h2
            class="text-[20px] font-semibold text-slate-900 leading-tight mb-1"
          >
            Cancel Enrollment?
          </h2>
          <p class="text-[13px] text-slate-500 leading-relaxed font-medium">
            Are you sure you want to cancel your enrollment in this program?
            This action cannot be undone.
          </p>
        </div>
      </div>

      <div class="flex items-center justify-end gap-3 w-full">
        <button
          class="px-6 py-3 rounded-xl bg-slate-100 text-slate-700 text-[14px] font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
          onclick={() => (activeCancelId = null)}
        >
          Nevermind
        </button>
        <button
          class="px-6 py-3 rounded-xl bg-[#0066cc] text-white text-[14px] font-semibold shadow-sm hover:bg-[#0052a3] transition-colors cursor-pointer flex items-center justify-center"
          onclick={() => {
            activeCancelId = null;
          }}
        >
          Confirm Cancellation
        </button>
      </div>
    </div>
  </div>
{/if}

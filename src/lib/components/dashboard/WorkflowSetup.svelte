<script lang="ts">
  import {
    Users,
    UserPlus,
    Trash2,
    PlusCircle,
    CheckCircle,
    ArrowLeft
  } from "lucide-svelte";
  import CustomSelect from "$lib/components/ui/CustomSelect.svelte";
  import { createEventDispatcher } from "svelte";
  import { dbStore, createWorkflow, deleteWorkflow } from "$lib/state/db.svelte.js";
  import { authState } from "$lib/state/auth.svelte.js";

  const dispatch = createEventDispatcher();

  // View States
  let manuallyViewingCreate = $state(false);
  let displayedWorkflows = $derived(
    dbStore.workflows.filter((w: any) => {
      if (authState.user?.role === "payer") return w.payerId === authState.user.id;
      if (authState.user?.role === "payee") return w.payeeId === authState.user.id;
      return true;
    })
  );
  let showCreateForm = $derived(displayedWorkflows.length === 0 || manuallyViewingCreate);

  // Accordion & View State
  let isApprovalAlwaysExpanded = $state(false);
  let isAmountExceptionExpanded = $state(false);
  let isSuccess = $state(false);

  // Form State
  let availablePrograms = $derived([
    "All Programs",
    ...dbStore.programs.map((p: any) => p.name)
  ]);
  let selectedProgram = $state("All Programs");
  let firstApprovalBy = $state("Manager");
  let conditionOperator = $state("Select");
  let conditionValue = $state("0");
  let redeemEntity = $state("Insurer");
  let redeemRole = $state("Ops");

  function handleSave() {
    let matchedProgramId = "all";
    if (selectedProgram !== "All Programs") {
      const prog = dbStore.programs.find((p: any) => p.name === selectedProgram);
      if (prog) matchedProgramId = prog.id;
    }

    const payload = {
      role: firstApprovalBy,
      amount: parseInt(conditionValue || "0", 10),
      workflowId: `wf_${Math.floor(Math.random() * 100000)}`,
      programId: matchedProgramId,
      compareKey: conditionOperator,
      payerId: authState.user?.role === "payer" ? authState.user?.id : null,
      payeeId: authState.user?.role === "payee" ? authState.user?.id : null,
    };

    createWorkflow(payload);
    isSuccess = true;
    setTimeout(() => {
      isSuccess = false;
      manuallyViewingCreate = false;
    }, 1500);
  }

  function handleDelete(wf: any) {
    const id = wf.id || wf.workflowId;
    if (id) deleteWorkflow(id);
  }
</script>

<div
  class="flex items-center justify-center min-h-[calc(100vh-8rem)] w-full transition-all p-6"
>
  {#if isSuccess}
    <!-- SUCCESS SCREEN -->
    <div
      class="relative w-full max-w-[500px] rounded-[32px] bg-white p-16 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-200 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-300"
    >
      <div
        class="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 border-4 border-white shadow-[0_0_15px_rgba(0,102,204,0.15)] bg-gradient-to-tr from-blue-50 to-white"
      >
        <CheckCircle
          class="h-10 w-10 text-[#0066cc]"
          strokeWidth={2.5}
        />
      </div>
      <h2
        class="text-[28px] font-semibold tracking-tight text-[#003366] leading-tight"
      >
        Approval workflow<br />configured successfully.
      </h2>
    </div>
  {:else if showCreateForm}
    <!-- SETUP SCREEN -->
    <div
      class="relative w-full max-w-[750px] rounded-[32px] bg-white p-10 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-200 min-h-[500px] flex flex-col animate-in fade-in"
    >
      <!-- Header -->
      <div class="mb-8 w-full relative">
        {#if displayedWorkflows.length > 0}
          <button
            onclick={() => (manuallyViewingCreate = false)}
            class="absolute -top-6 -left-2 flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <ArrowLeft class="h-3.5 w-3.5" /> Back to List
          </button>
        {/if}
        <h2
          class="text-[24px] font-bold tracking-tight text-slate-900 leading-none mt-2"
        >
          New Workflow Rule
        </h2>
        <p class="mt-2.5 text-[13px] font-semibold text-slate-400">
          Set approval workflow rules below
        </p>
      </div>

      <div class="flex-1 w-full flex flex-col">
        <!-- Program Selector -->
        <div class="mb-8 flex flex-col gap-2 relative z-[60]">
          <h3 class="font-bold text-[13px] text-slate-900">Select Program</h3>
          <CustomSelect
            id="programSelect"
            bind:value={selectedProgram}
            options={availablePrograms}
          />
        </div>

        <h3 class="font-bold text-[13px] text-slate-900 mb-3">
          Set Approval Workflow
        </h3>

        <!-- Accordion container -->
        <div
          class="flex flex-col gap-3 rounded-[12px] border border-slate-300 overflow-hidden bg-white"
        >
          <!-- Always Needed Selection Item -->
          <div
            class="flex flex-col w-full transition-all {isApprovalAlwaysExpanded
              ? 'pb-2'
              : ''}"
          >
            <button
              onclick={() =>
                (isApprovalAlwaysExpanded = !isApprovalAlwaysExpanded)}
              class="flex w-full items-center gap-4 bg-white p-4 transition-all text-left cursor-pointer"
            >
              <div
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black text-white"
              >
                <Users
                  class="h-6 w-6"
                  strokeWidth={2}
                />
              </div>
              <span class="text-[15px] font-bold text-slate-900">
                Approval always needed
              </span>
            </button>

            <!-- Expanded Config -->
            {#if isApprovalAlwaysExpanded}
              <div
                class="px-5 pt-2 pb-4 animate-in slide-in-from-top-2 duration-200"
              >
                <div class="flex items-center gap-4">
                  <div
                    class="flex h-[42px] items-center rounded-xl border border-slate-300 px-4 text-[13px] font-medium text-slate-800 bg-white min-w-[140px]"
                  >
                    1st Approval by
                  </div>
                  <div class="h-[42px] flex-1 relative z-[50]">
                    <CustomSelect
                      id="firstApproval"
                      bind:value={firstApprovalBy}
                      options={["Admin", "Manager", "Ops"]}
                    />
                  </div>
                </div>

                <div class="mt-4 flex flex-col gap-2 text-[13px] font-semibold">
                  <button
                    class="flex items-center gap-2 text-[#0066cc] hover:text-[#0052a3] w-max transition-colors cursor-pointer"
                  >
                    <PlusCircle class="h-4 w-4" /> Add another level of approval
                  </button>
                  <button
                    onclick={() =>
                      (isAmountExceptionExpanded = !isAmountExceptionExpanded)}
                    class="flex items-center gap-2 text-slate-700 hover:text-slate-900 w-max transition-colors cursor-pointer"
                  >
                    <PlusCircle class="h-4 w-4" /> Add amount exception
                  </button>
                </div>

                <!-- Exception Block -->
                {#if isAmountExceptionExpanded}
                  <div
                    class="mt-5 rounded-2xl bg-slate-100 border border-slate-200 p-5 relative animate-in fade-in duration-200"
                  >
                    <button
                      onclick={() => (isAmountExceptionExpanded = false)}
                      class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-rose-500 transition-colors p-1.5 cursor-pointer"
                    >
                      <Trash2 class="h-5 w-5" />
                    </button>

                    <div class="flex flex-col gap-0 w-[calc(100%-24px)]">
                      <!-- If Condition -->
                      <div class="flex items-center gap-6 w-full h-[68px]">
                        <span
                          class="w-[40px] text-[15px] font-bold text-slate-800"
                          >If</span
                        >
                        <div class="flex flex-1 gap-6 items-center w-full">
                          <div class="flex-1 h-[46px] relative z-[45]">
                            <CustomSelect
                              id="amountCondition"
                              bind:value={conditionOperator}
                              options={[
                                "Select",
                                "More than",
                                "Less than",
                                "Equals"
                              ]}
                            />
                          </div>
                          <div class="flex-1 h-[46px]">
                            <input
                              type="text"
                              bind:value={conditionValue}
                              class="w-full h-full bg-white border border-slate-300 rounded-[10px] px-4 text-[14px] font-medium text-slate-800 outline-none focus:border-[#7d326f] focus:ring-1 focus:ring-[#7d326f]"
                            />
                          </div>
                        </div>
                      </div>

                      <div
                        class="w-full border-t border-slate-200/60 my-5 mt-6 mb-3"
                      ></div>

                      <!-- Then Condition -->
                      <div class="flex items-center gap-6 w-full min-h-[68px]">
                        <span
                          class="w-[40px] text-[15px] font-bold text-slate-800 pt-[18px]"
                          >Then</span
                        >
                        <div
                          class="flex flex-1 gap-6 items-center flex-wrap sm:flex-nowrap w-full"
                        >
                          <div
                            class="text-[15px] font-bold text-[#1f2937] whitespace-nowrap min-w-[140px] pt-[18px]"
                          >
                            Redeem by
                          </div>

                          <div
                            class="flex-1 flex flex-col gap-1.5 w-full relative z-[40]"
                          >
                            <label
                              for="redeemEntity"
                              class="text-[13px] font-semibold text-[#64748b]"
                              >Entity</label
                            >
                            <div class="h-[46px]">
                              <CustomSelect
                                id="redeemEntity"
                                bind:value={redeemEntity}
                                options={["Insurer", "External", "Partner"]}
                              />
                            </div>
                          </div>

                          <div
                            class="flex-1 flex flex-col gap-1.5 w-full relative z-[35]"
                          >
                            <label
                              for="redeemRole"
                              class="text-[13px] font-semibold text-[#64748b]"
                              >Role</label
                            >
                            <div class="h-[46px]">
                              <CustomSelect
                                id="redeemRole"
                                bind:value={redeemRole}
                                options={["Ops", "Admin", "Reviewer"]}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                {/if}
              </div>
            {/if}
          </div>

          <div class="h-px w-full bg-slate-200"></div>

          <!-- Auto Limit Selection -->
          <button
            class="flex w-full items-center gap-4 bg-white p-4 transition-all text-left cursor-pointer"
          >
            <div
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black text-white"
            >
              <UserPlus
                class="h-6 w-6"
                strokeWidth={2}
              />
            </div>
            <span class="text-[15px] font-bold text-slate-900">
              Auto approve up to a limit, then seek approval
            </span>
          </button>
        </div>
      </div>

      <!-- Footer Action -->
      <div class="mt-8 flex justify-end">
        <button
          onclick={handleSave}
          class="h-11 w-[120px] rounded-[10px] bg-[#5b4897] text-[14px] font-medium text-white shadow-sm transition-all hover:bg-[#4a3a7c] cursor-pointer"
        >
          Save
        </button>
      </div>
    </div>
  {:else}
     <!-- LIST VIEW SCREEN -->
     <div class="relative w-full max-w-[800px] rounded-[32px] bg-white p-8 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-200 min-h-[500px] flex flex-col animate-in fade-in zoom-in-[0.98]">
       <div class="mb-8 w-full flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
         <div>
           <h2 class="text-[24px] font-bold tracking-tight text-slate-900 leading-none">Your Workflows</h2>
           <p class="mt-2.5 text-[13px] font-semibold text-slate-400">Manage your approval workflow rules</p>
         </div>
         <button
           onclick={() => manuallyViewingCreate = true}
           class="flex items-center gap-2 rounded-xl bg-[#0066cc] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#0052a3] hover:-translate-y-0.5 cursor-pointer"
         >
           <PlusCircle class="h-4.5 w-4.5" /> Create Workflow
         </button>
       </div>
       
       <div class="flex flex-col gap-4 overflow-y-auto w-full">
          {#each displayedWorkflows as wf}
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:shadow-md hover:border-slate-300 group">
               <div class="flex items-start gap-4">
                 <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-600 border border-slate-100 group-hover:bg-[#0066cc]/5 group-hover:text-[#0066cc] transition-colors">
                   <Users class="h-6 w-6" strokeWidth={2} />
                 </div>
                 <div class="flex flex-col gap-1.5 text-left">
                   <h3 class="text-[15px] font-bold text-slate-900 leading-tight">
                     If Amount {wf.compareKey} {Number(wf.amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                   </h3>
                   <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-medium text-slate-500">
                     <span class="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                       <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                       {Number(wf.amount) === 0 ? "Global Limit" : (wf.programId === 'all' ? 'All Programs' : (dbStore.programs.find(p => p.id === wf.programId)?.name || wf.programId))}
                     </span>
                     <span class="text-slate-300">•</span>
                     <span>Approve by {wf.role}</span>
                   </div>
                 </div>
               </div>
               
               <button
                 onclick={() => handleDelete(wf)}
                 class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400 border border-slate-100 transition-colors hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200 cursor-pointer"
                 title="Delete this workflow"
               >
                 <Trash2 class="h-5 w-5" />
               </button>
            </div>
          {/each}
       </div>
     </div>
  {/if}
</div>

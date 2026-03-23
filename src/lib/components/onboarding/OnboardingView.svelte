<script lang="ts">
  import { authState } from "$lib/state/auth.svelte.js";
  import {
    Check,
    CheckCircle2,
    Building2,
    ArrowLeft,
    User,
    Shield,
    Loader2,
    X
  } from "lucide-svelte";
  import { createEventDispatcher } from "svelte";
  import { slide } from "svelte/transition";
  import CustomSelect from "$lib/components/ui/CustomSelect.svelte";
  import {
    createProgram,
    updateProgram,
    dbStore,
    apiCall
  } from "$lib/state/db.svelte.js";

  let { initialStep = 1, editProgramId = null } = $props();

  const dispatch = createEventDispatcher();
  let step = $state(1);

  let initialized = false;
  let loadedProgramId: string | null = null;
  // Sync initialStep prop cleanly when mounted/changed, and prepopulate if editing
  $effect(() => {
    if (initialStep) {
      step = initialStep;
    }
    if (editProgramId && !initialized) {
      const existing: any = dbStore.programs.find(
        (p: any) => p.id === editProgramId
      );
      if (existing) {
        programName = existing.name;
        businessCategory = existing.category;

        if (existing.additionalFields && existing.additionalFields.length > 0) {
          customFields = existing.additionalFields.map((f: any) => ({
            key: f.key,
            type: "string",
            required: f.required,
            isExisting: true
          }));
        }

        initialized = true;
      }
    }
  });

  // Forms data
  let programName = $state("");
  let businessType = $state("Healthcare");
  let businessCategory = $state("Hospital");
  let requestPhysicalCard = $state(false);
  let manualEmail = $state(""); // Stores manual email input
  let customFields = $state<
    { key: string; type: string; required: boolean; isExisting?: boolean }[]
  >([]);

  // Used for UI feedback
  let addedPayees = $state<string[]>([]); // This now holds selected payee IDs
  let isInviting = $state(false);
  let showInvitationSuccess = $state(false);
  let showProviderDropdown = $state(false);
  let hasSubmitted = $state(false);
  let errorMessage = $state("");

  let allPayees = $state<any[]>([]);
  let availableTrustedPayees = $derived(
    allPayees
      .filter((u: any) => !businessType || u.category === businessType)
      .map((u: any) => ({
        id: u.id,
        name: u.businessName || u.name,
        email: u.email,
        city: u.city || "",
        state: u.state || ""
      }))
  );

  $effect(() => {
    if (!authState.user?.id) return;

    apiCall(`/payees?payerId=${authState.user.id}`)
      .then((res) => {
        allPayees = Array.isArray(res) ? res : res?.payees || [];
      })
      .catch(() => {
        allPayees = [];
      });
  });

  $effect(() => {
    if (!editProgramId || loadedProgramId === editProgramId) return;
    loadedProgramId = editProgramId;
    apiCall(`/programs/payees?programId=${editProgramId}`)
      .then((res) => {
        const enrolledIds = res?.payees?.map((p: any) => p.id) || [];
        addedPayees = enrolledIds;
      })
      .catch(() => {
        // keep as-is if request fails
      });
  });

  function togglePayee(id: string) {
    if (addedPayees.includes(id)) {
      addedPayees = addedPayees.filter((e) => e !== id);
    } else {
      addedPayees = [...addedPayees, id];
    }
  }

  async function handleManualAdd() {
    if (manualEmail && manualEmail.includes("@")) {
      isInviting = true;
      showInvitationSuccess = false;

      // Simulate invitation spin
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // As requested, this is now a showcase/dummy. We don't affect actual state.
      manualEmail = "";
      isInviting = false;
      showInvitationSuccess = true;

      // Hide success message after 10 seconds
      setTimeout(() => {
        showInvitationSuccess = false;
      }, 10000);
    }
  }

  function nextStep() {
    errorMessage = "";
    if (step === 3 && !programName.trim()) {
      errorMessage = "Program Name is required to proceed.";
      return;
    }

    if (step === 4) {
      const hasEmptyKeys = customFields.some((f) => !f.key.trim());
      if (hasEmptyKeys) {
        errorMessage =
          "Please fill in all custom field names or remove empty fields.";
        return;
      }

      const hasSpaces = customFields.some((f) => f.key.trim().includes(" "));
      if (hasSpaces) {
        errorMessage = "Field name could not contain spaces.";
        return;
      }
    }

    if (step === 5 && !hasSubmitted) {
      hasSubmitted = true;
      // addedPayees holds the true list of payee IDs selected via checkboxes
      if (editProgramId) {
        updateProgram(
          editProgramId,
          programName,
          businessType,
          businessCategory,
          addedPayees,
          customFields
        );
      } else {
        createProgram(
          programName,
          businessType,
          businessCategory,
          addedPayees,
          customFields
        );
      }
    }
    step += 1;
  }

  function finishOnboarding() {
    // Dispatch complete event to parent to trigger view change
    dispatch("complete");
  }

  function handleBack() {
    if (step > initialStep) {
      step -= 1;
    } else {
      dispatch("cancel");
    }
  }
</script>

<div class="flex min-h-screen w-full flex-col bg-slate-50 p-8 pt-4">
  <!-- Onboarding Content Area -->
  <div class="flex h-full w-full items-center justify-center pt-10">
    <!-- STEP 1: Choose Your Journey -->
    {#if step === 1}
      <div class="flex flex-col items-center">
        <h1 class="text-4xl font-black text-slate-900 tracking-tight">
          Choose Your Journey
        </h1>
        <p class="mt-3 text-[15px] font-medium text-slate-500">
          Select your role to get started with our platform
        </p>

        <div class="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          <!-- Payee Card -->
          <div
            class="flex w-[320px] flex-col items-center rounded-3xl border border-slate-100 bg-white px-6 py-10 shadow-sm transition-all hover:shadow-md hover:border-slate-200"
          >
            <div
              class="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-400"
            >
              <User
                class="h-6 w-6"
                strokeWidth={1.5}
              />
            </div>
            <h2 class="text-[20px] font-semibold text-slate-900">Payee</h2>
            <p
              class="mt-2 text-center text-[13px] font-medium text-slate-500 leading-relaxed px-2"
            >
              Receive payouts from payers and manage your earnings seamlessly
            </p>
            <ul
              class="mt-8 flex flex-col gap-3.5 text-[13px] font-medium text-slate-600 w-full px-4"
            >
              <li class="flex items-start gap-2.5">
                <CheckCircle2
                  class="h-[18px] w-[18px] text-[#0066cc] mt-0.5 shrink-0"
                  strokeWidth={2}
                />
                <span>Accept payer recommendations</span>
              </li>
              <li class="flex items-start gap-2.5">
                <CheckCircle2
                  class="h-[18px] w-[18px] text-[#0066cc] mt-0.5 shrink-0"
                  strokeWidth={2}
                />
                <span>Track your Payouts in real-time</span>
              </li>
              <li class="flex items-start gap-2.5">
                <CheckCircle2
                  class="h-[18px] w-[18px] text-[#0066cc] mt-0.5 shrink-0"
                  strokeWidth={2}
                />
                <span>Manage multiple payers</span>
              </li>
            </ul>
            <button
              class="mt-10 w-full rounded-2xl bg-slate-100 px-6 py-3.5 text-[15px] font-semibold text-slate-500 cursor-not-allowed"
              >Select Payee</button
            >
          </div>

          <!-- Payer Card (Active for demo) -->
          <div
            class="flex w-[320px] flex-col items-center rounded-3xl border-2 border-slate-100 bg-white px-6 py-10 shadow-xl shadow-slate-200/50 scale-105 relative"
          >
            <!-- Badge overlay -->
            <div
              class="absolute -top-3 bg-[#0066cc] text-white text-[10px] uppercase tracking-wider font-bold py-1 px-3 rounded-full shadow-sm"
            >
              Recommended
            </div>
            <div
              class="mb-5 flex h-14 w-14 items-center justify-center rounded-full border-4 border-blue-50 bg-[#0066cc] text-white shadow-md shadow-[#0066cc]/20"
            >
              <Building2
                class="h-6 w-6"
                strokeWidth={2}
              />
            </div>
            <h2 class="text-[20px] font-semibold text-slate-900">Payer</h2>
            <p
              class="mt-2 text-center text-[13px] font-medium text-slate-500 leading-relaxed px-2"
            >
              Set up payout programs and manage payees efficiently
            </p>
            <ul
              class="mt-8 flex flex-col gap-3.5 text-[13px] font-medium text-slate-600 w-full px-4"
            >
              <li class="flex items-start gap-2.5">
                <CheckCircle2
                  class="h-[18px] w-[18px] text-[#0066cc] mt-0.5 shrink-0"
                  strokeWidth={2}
                />
                <span>Configure payout programs</span>
              </li>
              <li class="flex items-start gap-2.5">
                <CheckCircle2
                  class="h-[18px] w-[18px] text-[#0066cc] mt-0.5 shrink-0"
                  strokeWidth={2}
                />
                <span>Recommend and onboard payees</span>
              </li>
              <li class="flex items-start gap-2.5">
                <CheckCircle2
                  class="h-[18px] w-[18px] text-[#0066cc] mt-0.5 shrink-0"
                  strokeWidth={2}
                />
                <span>Manage deductions and cards</span>
              </li>
            </ul>
            <button
              onclick={nextStep}
              class="mt-10 w-full rounded-2xl bg-[#0066cc] px-6 py-3.5 text-[15px] font-semibold text-white shadow-md transition-all hover:bg-[#0052a3] active:scale-[0.98] cursor-pointer"
              >Select Payer</button
            >
          </div>

          <!-- Admin Card -->
          <div
            class="flex w-[320px] flex-col items-center rounded-3xl border border-slate-100 bg-white px-6 py-10 shadow-sm transition-all hover:shadow-md hover:border-slate-200"
          >
            <div
              class="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-400"
            >
              <Shield
                class="h-6 w-6"
                strokeWidth={1.5}
              />
            </div>
            <h2 class="text-[20px] font-semibold text-slate-900">Admin</h2>
            <p
              class="mt-2 text-center text-[13px] font-medium text-slate-500 leading-relaxed px-2"
            >
              Manage system configuration and user permissions securely
            </p>
            <ul
              class="mt-8 flex flex-col gap-3.5 text-[13px] font-medium text-slate-600 w-full px-4"
            >
              <li class="flex items-start gap-2.5">
                <CheckCircle2
                  class="h-[18px] w-[18px] text-[#0066cc] mt-0.5 shrink-0"
                  strokeWidth={2}
                />
                <span>Manage user roles</span>
              </li>
              <li class="flex items-start gap-2.5">
                <CheckCircle2
                  class="h-[18px] w-[18px] text-[#0066cc] mt-0.5 shrink-0"
                  strokeWidth={2}
                />
                <span>Give permissions across modules</span>
              </li>
            </ul>
            <!-- Spacer to align buttons since fewer bullets -->
            <div class="flex-1"></div>
            <button
              class="mt-6 w-full rounded-2xl bg-slate-100 px-6 py-3.5 text-[15px] font-semibold text-slate-500 cursor-not-allowed"
              >Select Admin</button
            >
          </div>
        </div>
      </div>

      <!-- STEP 2: Welcome Payer Modal -->
    {:else if step === 2}
      <div
        class="flex w-full max-w-md flex-col items-center justify-center rounded-[32px] bg-white p-12 shadow-2xl"
      >
        <div class="flex w-full items-start justify-between">
          <div>
            <h2 class="text-3xl font-semibold text-slate-900">
              Welcome <span class="text-[#0066cc]">Payer!</span>
            </h2>
            <!-- <p class="mt-2 text-[15px] font-medium text-slate-600">
              {authState.user?.businessName ||
                authState.user?.name ||
                "Acme Insurance"}
            </p> -->
          </div>
          <Building2
            class="h-10 w-10 text-slate-800"
            strokeWidth={1}
          />
        </div>
        <button
          onclick={nextStep}
          class="mt-12 w-full rounded-2xl bg-[#0066cc] py-4 text-[15px] font-semibold text-white shadow-md transition-colors hover:bg-[#0052a3] active:scale-[0.98] cursor-pointer"
        >
          Start Program Setup
        </button>
      </div>

      <!-- STEP 3: Program Configuration Form -->
    {:else if step === 3}
      <!-- This will be a wide card matching the 3rd wireframe -->
      <div
        class="w-full max-w-4xl rounded-[32px] bg-white p-12 shadow-xl relative mt-12"
      >
        <button
          onclick={handleBack}
          class="absolute top-8 right-8 flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900"
        >
          <ArrowLeft class="h-4 w-4" /> Back
        </button>

        <h2 class="text-2xl font-semibold text-slate-900 mt-6 md:mt-0">
          {editProgramId
            ? "Edit Program Configuration"
            : "Program Configuration"}
        </h2>
        <p class="mt-1 text-sm font-medium text-slate-500">Setup details</p>

        <!-- ... input fields block ... -->
        <div class="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 md:grid-cols-3">
          <!-- Text Inputs -->
          <div class="flex flex-col gap-2">
            <label
              for="programName"
              class="text-xs font-semibold text-slate-700">Program Name*</label
            >
            <input
              id="programName"
              type="text"
              bind:value={programName}
              placeholder="Medical Program"
              disabled={!!editProgramId}
              class="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-[#0066cc] focus:ring-1 focus:ring-[#0066cc] disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
            />
          </div>
          <div class="flex flex-col gap-2 relative">
            <label
              for="businessType"
              class="text-xs font-semibold text-slate-700"
              >Business Type *</label
            >
            <CustomSelect
              id="businessType"
              bind:value={businessType}
              disabled={!!editProgramId}
              options={[
                "Healthcare",
                "Insurance",
                "Transport",
                "Pharmacy",
                "Logistics",
                "Retail",
                "Manufacturing"
              ]}
            />
          </div>
          <div class="flex flex-col gap-2 relative">
            <label
              for="businessCategory"
              class="text-xs font-semibold text-slate-700"
              >Business Category *</label
            >
            <CustomSelect
              id="businessCategory"
              bind:value={businessCategory}
              disabled={!!editProgramId}
              options={[
                "Hospital",
                "Clinic",
                "Diagnostic Center",
                "Emergency Services",
                "Wellness Center",
                "Life Insurance",
                "General Insurance",
                "Health Insurance"
              ]}
            />
          </div>
        </div>

        <div class="mt-8">
          <span class="block text-xs font-semibold text-slate-700"
            >Primary Card Configuration *</span
          >
          <div class="mt-4 flex gap-6">
            <!-- Simulated Blue Virtual Card -->
            <div
              class="flex h-48 w-80 flex-col justify-between rounded-2xl bg-gradient-to-br from-[#003366] to-[#004a99] p-6 shadow-lg relative cursor-pointer ring-2 ring-offset-2 ring-[#0066cc]"
            >
              <div class="flex justify-between w-full text-white/90">
                <span class="text-xs font-medium">Virtual card</span>
                <div
                  class="h-6 w-10 rounded-sm bg-orange-400 opacity-80 mix-blend-multiply relative"
                >
                  <div
                    class="absolute -left-3 h-6 w-6 rounded-full bg-red-500/80 mix-blend-multiply"
                  ></div>
                  <div
                    class="absolute h-6 w-6 rounded-full bg-yellow-500/80 mix-blend-multiply"
                  ></div>
                </div>
              </div>
              <div class="flex justify-between w-full text-white/90 mt-auto">
                <span class="font-mono text-[13px] tracking-widest"
                  >**** **** **** 1289</span
                >
                <span class="font-mono text-xs">09/25</span>
              </div>
            </div>

            <!-- Simulated White Virtual Card -->
            <div
              class="flex h-48 w-80 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm cursor-pointer hover:border-slate-300"
            >
              <div class="flex justify-between w-full text-slate-500">
                <span class="text-xs font-medium">Virtual card</span>
                <div
                  class="h-6 w-10 rounded-sm bg-orange-400 mix-blend-multiply relative"
                >
                  <div
                    class="absolute -left-3 h-6 w-6 rounded-full bg-red-500 mix-blend-multiply"
                  ></div>
                  <div
                    class="absolute h-6 w-6 rounded-full bg-yellow-500 mix-blend-multiply"
                  ></div>
                </div>
              </div>
              <div class="flex justify-between w-full text-slate-700 mt-auto">
                <span class="font-mono text-[13px] tracking-widest"
                  >**** **** **** ****</span
                >
                <span class="font-mono text-xs">00/00</span>
              </div>
            </div>
          </div>

          <div class="mt-4 flex gap-12 text-xs font-medium text-slate-600">
            <label class="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="cardType"
                checked
                class="accent-[#7d326f] mt-1 hover:scale-110 transition-transform cursor-pointer"
              />
              <div class="flex flex-col">
                <span class="font-semibold text-slate-800 text-[13px]"
                  >Attach Existing Primary Card</span
                >
                <span class="text-[11px] text-slate-400 mt-0.5"
                  >Link an existing card for program funding</span
                >
              </div>
            </label>
            <label class="flex items-start gap-3 cursor-pointer opacity-50">
              <input
                type="radio"
                name="cardType"
                disabled
                class="mt-1"
              />
              <div class="flex flex-col">
                <span class="font-semibold text-slate-800 text-[13px]"
                  >Request New Primary Card</span
                >
                <span class="text-[11px] text-slate-400 mt-0.5"
                  >Request a new card to be issued for this program</span
                >
              </div>
            </label>
          </div>
        </div>

        <div class="mt-10 flex flex-col items-start gap-4">
          {#if errorMessage}
            <div
              class="text-sm font-semibold text-rose-500 flex items-center gap-2 mb-2 bg-rose-50 px-4 py-2 rounded-lg border border-rose-100"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                ><circle
                  cx="12"
                  cy="12"
                  r="10"
                /><line
                  x1="12"
                  y1="8"
                  x2="12"
                  y2="12"
                /><line
                  x1="12"
                  y1="16"
                  x2="12.01"
                  y2="16"
                /></svg
              >
              {errorMessage}
            </div>
          {/if}
          <button
            onclick={nextStep}
            class="h-14 w-[220px] rounded-2xl bg-[#0066cc] text-[15px] font-semibold text-white shadow-md transition-all hover:bg-[#0052a3] active:scale-[0.98] cursor-pointer"
          >
            Next Step
          </button>
        </div>
      </div>

      <!-- STEP 4: Custom Fields Configuration -->
    {:else if step === 4}
      <div
        class="w-full max-w-4xl rounded-[32px] bg-white p-12 shadow-xl relative mt-12"
      >
        <button
          onclick={handleBack}
          class="absolute top-8 right-8 flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900"
        >
          <ArrowLeft class="h-4 w-4" /> Back
        </button>

        <h2 class="text-2xl font-semibold text-slate-900 mt-6 md:mt-0">
          Program Custom Fields
        </h2>
        <p class="mt-1 text-sm font-medium text-slate-500">
          define your unique transactions
        </p>

        <div class="mt-8 flex flex-col gap-6 w-full">
          <!-- Default Mandatory Fields -->
          <div class="flex flex-col gap-4 mb-2 relative px-1">
            <h3
              class="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1"
            >
              Standard Fields
            </h3>
            <div class="flex flex-col gap-4">
              {#each [{ key: "Program Name", type: "string", required: true }, { key: "Business Name", type: "string", required: true }, { key: "Email", type: "string", required: true }, { key: "Transaction ID", type: "string", required: true }, { key: "Tracking ID", type: "string", required: false }, { key: "Amount", type: "number", required: true }, { key: "TDS", type: "number", required: false }] as field, index (index)}
                <div
                  class="flex flex-col md:flex-row items-end gap-4 bg-slate-50/50 p-6 rounded-2xl border border-slate-200 opacity-80"
                >
                  <div class="flex flex-col gap-2 w-full md:w-1/3 relative">
                    <label class="text-xs font-semibold text-slate-700"
                      >Field Name<span class="text-red-500">*</span></label
                    >
                    <div class="relative">
                      <input
                        type="text"
                        value={field.key}
                        disabled
                        class="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none bg-slate-100 text-slate-500 cursor-not-allowed pl-10"
                      />
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="lucide lucide-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        ><rect
                          width="18"
                          height="11"
                          x="3"
                          y="11"
                          rx="2"
                          ry="2"
                        /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg
                      >
                    </div>
                  </div>

                  <div class="flex flex-col gap-2 w-full md:w-1/3 relative">
                    <label class="text-xs font-semibold text-slate-700"
                      >Data Type<span class="text-red-500">*</span></label
                    >
                    <input
                      type="text"
                      value={field.type}
                      disabled
                      class="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none bg-slate-100 text-slate-500 cursor-not-allowed"
                    />
                  </div>

                  <div
                    class="flex items-center gap-3 w-full md:w-auto h-12 flex-1 pt-1 md:pt-0"
                  >
                    <label
                      class="flex items-center gap-2 h-full px-2 opacity-70 cursor-not-allowed"
                    >
                      <input
                        type="checkbox"
                        checked={field.required}
                        disabled
                        class="accent-[#0066cc] w-4 h-4 rounded border-slate-300 cursor-not-allowed"
                      />
                      <span class="text-xs font-semibold text-slate-700"
                        >Mandatory</span
                      >
                    </label>
                  </div>

                  <div class="h-12 flex items-center shrink-0 w-10">
                    <!-- Invisible spacer identical to delete button to maintain width -->
                  </div>
                </div>
              {/each}
            </div>
            <p class="text-[11px] text-slate-400 mt-2">
              These data fields are permanently baked into every transaction via
              system API and cannot be modified.
            </p>
          </div>

          <h3
            class="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1 mt-4 px-1"
          >
            Program Custom Fields
          </h3>
          {#each customFields as field, index (index)}
            <div
              class="flex flex-col md:flex-row items-end gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-200 transition-all"
            >
              <div class="flex flex-col gap-2 w-full md:w-1/3">
                <label
                  for={`fieldKey-${index}`}
                  class="text-xs font-semibold text-slate-700"
                  >Field Name<span class="text-red-500">*</span></label
                >
                <input
                  id={`fieldKey-${index}`}
                  type="text"
                  bind:value={field.key}
                  disabled={field.isExisting}
                  oninput={() => (errorMessage = "")}
                  placeholder="e.g. Invoice Number"
                  class="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-[#0066cc] focus:ring-1 focus:ring-[#0066cc] disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                />
              </div>

              <div class="flex flex-col gap-2 w-full md:w-1/3 relative">
                <label
                  for={`fieldType-${index}`}
                  class="text-xs font-semibold text-slate-700"
                  >Data Type<span class="text-red-500">*</span></label
                >
                <CustomSelect
                  id={`fieldType-${index}`}
                  bind:value={field.type}
                  disabled={field.isExisting}
                  options={["string", "number", "float", "double", "boolean"]}
                />
              </div>

              <div
                class="flex items-center gap-3 w-full md:w-auto h-12 flex-1 pt-1 md:pt-0"
              >
                <label
                  class="flex items-center gap-2 h-full px-2 {field.isExisting
                    ? 'opacity-50 cursor-not-allowed'
                    : 'cursor-pointer'}"
                >
                  <input
                    type="checkbox"
                    bind:checked={field.required}
                    disabled={field.isExisting}
                    class="accent-[#0066cc] w-4 h-4 rounded border-slate-300 {field.isExisting
                      ? 'cursor-not-allowed'
                      : 'cursor-pointer'}"
                  />
                  <span class="text-xs font-semibold text-slate-700"
                    >Mandatory</span
                  >
                </label>
              </div>

              <div class="h-12 flex items-center shrink-0">
                {#if !field.isExisting}
                  <button
                    aria-label="Remove Field"
                    onclick={() => {
                      customFields = customFields.filter((_, i) => i !== index);
                    }}
                    class="h-10 w-10 flex items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      ><path d="M3 6h18" /><path
                        d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"
                      /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg
                    >
                  </button>
                {/if}
              </div>
            </div>
          {/each}

          {#if customFields.length === 0}
            <div
              class="py-10 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center bg-slate-50 text-slate-500"
            >
              <span class="text-sm font-medium"
                >No custom fields defined yet.</span
              >
              <span class="text-xs mt-1"
                >Add fields to enforce specific transaction payloads.</span
              >
            </div>
          {/if}

          <div class="flex border-t border-slate-200 pt-6 mt-2 pb-2">
            <button
              onclick={() => {
                customFields = [
                  ...customFields,
                  { key: "", type: "string", required: false }
                ];
              }}
              disabled={!!editProgramId}
              class="flex items-center gap-2 text-sm font-semibold text-[#0066cc] hover:text-[#0052a3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-[#0066cc]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                ><path d="M12 5v14" /><path d="M5 12h14" /></svg
              >
              Add New Field
            </button>
          </div>
        </div>

        <div class="mt-8 flex flex-col items-start gap-4">
          {#if errorMessage}
            <div
              class="text-sm font-semibold text-rose-500 flex items-center gap-2 mb-2 bg-rose-50 px-4 py-2 rounded-lg border border-rose-100"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                ><circle
                  cx="12"
                  cy="12"
                  r="10"
                /><line
                  x1="12"
                  y1="8"
                  x2="12"
                  y2="12"
                /><line
                  x1="12"
                  y1="16"
                  x2="12.01"
                  y2="16"
                /></svg
              >
              {errorMessage}
            </div>
          {/if}
          <button
            onclick={nextStep}
            class="h-14 w-[220px] rounded-2xl bg-[#0066cc] text-[15px] font-semibold text-white shadow-md transition-all hover:bg-[#0052a3] active:scale-[0.98] cursor-pointer"
          >
            Next Step
          </button>
        </div>
      </div>

      <!-- STEP 5: Add Payees -->
    {:else if step === 5}
      <div
        class="w-full max-w-4xl rounded-[32px] bg-white p-12 shadow-xl relative mt-12"
      >
        <button
          onclick={handleBack}
          class="absolute top-8 right-8 flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900"
        >
          <ArrowLeft class="h-4 w-4" /> Back
        </button>

        <h2 class="text-2xl font-semibold text-slate-900 mt-8 md:mt-2">
          Add Payee
        </h2>
        <p class="mt-1 text-sm font-medium text-slate-500">
          Select from our trusted network
        </p>

        <div class="mt-6 w-full mb-10">
          <div
            class="flex flex-col gap-4 rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-200 h-full relative"
          >
            <div class="mt-2 w-full flex flex-col gap-3">
              {#if availableTrustedPayees.length === 0}
                <div class="py-6 text-center text-[12px] text-slate-400">
                  No payees available
                </div>
              {:else}
                <div
                  class="flex flex-col gap-3 max-h-[260px] overflow-y-auto custom-scrollbar pr-1"
                >
                  {#each availableTrustedPayees as payee}
                    <label
                      class="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 transition-colors"
                    >
                      <div class="relative flex items-center justify-center">
                        <input
                          type="checkbox"
                          class="peer appearance-none h-[18px] w-[18px] border-2 border-slate-300 rounded cursor-pointer checked:bg-[#0066cc] checked:border-[#0066cc] transition-colors"
                          checked={addedPayees.includes(payee.id)}
                          onchange={() => togglePayee(payee.id)}
                        />
                        <svg
                          class="absolute w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="3.5"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                      <div class="flex flex-col">
                        <span class="text-[13px] font-semibold text-slate-800">
                          {payee.name}
                        </span>

                        <span class="text-[11px] text-slate-500 mt-0.5">
                          {payee.city || "City"}, {payee.state || "State"}
                        </span>
                      </div>
                    </label>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        </div>
        <div
          class="mb-8 flex flex-col gap-4 rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200 relative w-full mt-6 md:mt-0"
        >
          <div class="flex gap-4">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white shadow-sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="text-slate-700"
              >
                <rect
                  width="20"
                  height="16"
                  x="2"
                  y="4"
                  rx="2"
                />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
            <div class="flex flex-col">
              <span class="font-semibold text-slate-800 text-[14px]"
                >Recommend payee</span
              >
              <span class="text-[11px] font-medium text-slate-500 mt-0.5"
                >Optional, adds new payees directly</span
              >
            </div>
          </div>

          <div class="mt-2 flex flex-col gap-2">
            <div class="flex items-center gap-2">
              <input
                type="email"
                bind:value={manualEmail}
                placeholder="Enter email address"
                class="h-10 flex-1 rounded-xl border border-slate-200 px-3 text-[13px] outline-none focus:border-[#0066cc] focus:ring-1 focus:ring-[#0066cc]"
              />
              <button
                onclick={handleManualAdd}
                disabled={isInviting}
                class="h-10 px-5 rounded-xl bg-[#7d326f] text-white text-[13px] font-semibold hover:bg-[#68285c] cursor-pointer shadow-sm transition-all whitespace-nowrap flex items-center justify-center min-w-[80px]"
              >
                {#if isInviting}
                  <Loader2 class="h-4 w-4 animate-spin" />
                {:else}
                  Add
                {/if}
              </button>
            </div>
            {#if showInvitationSuccess}
              <div
                class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
              >
                <style>
                  @keyframes shrinkBar {
                    from {
                      width: 100%;
                    }
                    to {
                      width: 0%;
                    }
                  }
                  .animate-ticker {
                    animation: shrinkBar 10s linear forwards;
                  }
                </style>
                <div
                  class="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-300"
                >
                  <button
                    onclick={() => (showInvitationSuccess = false)}
                    class="absolute right-4 top-4 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    <X class="h-5 w-5" />
                  </button>
                  <div
                    class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-600"
                  >
                    <CheckCircle2 class="h-6 w-6" />
                  </div>
                  <h3 class="text-lg font-bold text-slate-900">
                    Thanks for recommending!
                  </h3>
                  <p
                    class="mt-2 text-[13px] font-medium text-slate-500 leading-relaxed"
                  >
                    We will reach out to the business shortly. Once they are
                    onboarded and verified, you will be automatically notified!
                  </p>

                  <!-- Timer Bar -->
                  <div class="absolute bottom-0 left-0 h-1 w-full bg-slate-100">
                    <div class="h-full bg-green-500 animate-ticker"></div>
                  </div>
                </div>
              </div>
            {/if}
          </div>
        </div>
        <div class="mt-10 flex flex-col items-start gap-4">
          <button
            onclick={nextStep}
            class="h-14 w-[260px] rounded-2xl bg-[#0066cc] text-[15px] font-semibold text-white shadow-md transition-all hover:bg-[#0052a3] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
          >
            <CheckCircle2 class="h-4 w-4" />
            Complete Setup
          </button>
        </div>
      </div>

      <!-- STEP 6: Success Modal -->
    {:else if step === 6}
      <div
        class="w-full max-w-[420px] rounded-[24px] bg-white p-6 md:p-8 shadow-2xl relative mt-16 mx-auto border border-slate-100 ring-1 ring-slate-900/5"
      >
        <button
          onclick={handleBack}
          class="absolute top-4 left-4 flex h-8 items-center justify-center gap-1.5 rounded-lg bg-slate-50 px-3 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 border border-slate-100 z-20"
        >
          <ArrowLeft class="h-3.5 w-3.5" /> Back
        </button>

        <div class="relative pt-10 pb-2">
          <!-- Diamond Icon -->
          <div
            class="absolute left-1/2 -top-16 -translate-x-1/2 z-10 flex h-20 w-20 items-center justify-center"
          >
            <div
              class="absolute inset-0 rotate-45 rounded-[18px] bg-[#0066cc] shadow-xl shadow-blue-500/20"
            ></div>
            <div
              class="relative flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white bg-[#0066cc] z-10 box-content"
            >
              <Check
                class="h-6 w-6 text-white"
                strokeWidth={4.5}
              />
            </div>
          </div>

          <!-- Content Card -->
          <div
            class="rounded-[20px] overflow-hidden border border-slate-200 shadow-sm relative w-full mb-6"
          >
            <div class="bg-[#0066cc] pt-10 pb-4 text-center px-4">
              <h2 class="text-[22px] font-bold text-white tracking-tight">
                Program Configured!
              </h2>
            </div>
            <div
              class="bg-blue-50/50 px-6 py-6 text-left border-t border-blue-100/50"
            >
              <h3 class="text-[14px] font-semibold text-[#003366] mb-4">
                What happens now?
              </h3>
              <ul
                class="flex flex-col gap-3.5 text-[13px] font-medium text-slate-600 list-disc pl-4 marker:text-blue-300"
              >
                <li>
                  We will proceed with activating the program limits in your
                  core system
                </li>
                <li>
                  Your chosen payees will begin receiving onboarding invitations
                </li>
                <li>
                  The program bounds will be active and ready to use within 48
                  hours
                </li>
              </ul>
            </div>
          </div>

          <button
            onclick={finishOnboarding}
            class="w-full rounded-[14px] border-2 border-[#0066cc] bg-transparent py-3.5 text-[15px] font-bold text-[#0066cc] transition-all hover:bg-[#0066cc] hover:text-white"
          >
            Go Ahead
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>

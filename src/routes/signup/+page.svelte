<script lang="ts">
  import { goto } from "$app/navigation";
  import SignupNavigation from "$lib/components/SignupNavigation.svelte";
  import CustomSelect from "$lib/components/ui/CustomSelect.svelte";
  import { CheckCircle2, UploadCloud, FileText } from "lucide-svelte";
  import { authState, login } from "$lib/state/auth.svelte.js";
  import { apiCall } from "$lib/state/db.svelte.js";

  let step = $state(1);

  // Step 1: Contact Info
  let contactName = $state("");
  let email = $state("");
  let phone = $state("");

  // Step 2: Business Overview
  let category = $state("");
  let subCategory = $state("");
  let payoutMethod = $state("without"); // without, with

  // Step 3: Business Details
  let businessName = $state("");
  let panNumber = $state("");
  let payeeName = $state("");
  let billingName = $state("");
  let businessAddress = $state("");
  let stateInput = $state("");
  let cityInput = $state("");
  let pinCode = $state("");
  let sameAsAbove = $state(true);
  let hasGSTIN = $state("yes");
  let gstin = $state("");

  // Step 4: Bank Account
  let beneficiaryName = $state("");
  let ifsc = $state("");
  let accountNumber = $state("");
  let reAccountNumber = $state("");

  // Step 5: Document Verification
  let docsChecked = $state(true);

  function handleNext() {
    if (step < 6) step++;
  }

  function handleBack() {
    if (step > 1) {
      step--;
    } else {
      goto("/login"); // Go back to login if on step 1
    }
  }

  async function handleSubmit() {
    try {
      await apiCall("/add-payees", "POST", {
        name: contactName || businessName,
        email: email,
        password: "password123", // Default for demo as specified
        businessName: businessName,
        category: category || "Other",
        hasAcceptedTerms: docsChecked
      });
    } catch (err) {
      console.error("Signup failed", err);
    }
    step = 6;
  }

  function handleFinish() {
    goto("/login");
  }
</script>

<svelte:head>
  <title>Sign Up - HDFC Bank</title>
</svelte:head>

<div class="flex min-h-screen w-full bg-[#f4f4f5]">
  <SignupNavigation currentStep={step} />

  <!-- Main Content Area -->
  <div
    class="ml-[100px] flex w-full flex-col p-8 md:p-12 lg:p-16 h-screen overflow-y-auto"
  >
    <div class="mx-auto w-full max-w-[900px]">
      {#if step < 6}
        <div
          class="rounded-2xl border border-slate-200 bg-white p-8 md:p-12 shadow-sm"
        >
          {#if step === 1}
            <!-- STEP 1: CONTACT INFORMATION -->
            <h2 class="mb-8 text-[20px] font-semibold text-[#231a4a]">
              Contact Information
            </h2>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div class="flex flex-col gap-2">
                <label class="text-[13px] font-semibold text-slate-700"
                  >Contact Name*</label
                >
                <input
                  type="text"
                  bind:value={contactName}
                  placeholder="Payee Sharma"
                  class="h-11 rounded-xl border border-slate-200 px-4 text-[14px] text-slate-800 outline-none transition-colors focus:border-[#7d326f] focus:ring-1 focus:ring-[#7d326f]"
                />
              </div>

              <div class="flex flex-col gap-2">
                <label class="text-[13px] font-semibold text-slate-700"
                  >Email*</label
                >
                <input
                  type="email"
                  bind:value={email}
                  placeholder="payeesharma@gmail.com"
                  class="h-11 rounded-xl border border-slate-200 px-4 text-[14px] text-slate-800 outline-none transition-colors focus:border-[#7d326f] focus:ring-1 focus:ring-[#7d326f]"
                />
              </div>

              <div class="flex flex-col gap-2">
                <label class="text-[13px] font-semibold text-slate-700"
                  >Phone Number*</label
                >
                <input
                  type="text"
                  bind:value={phone}
                  placeholder="+91 8076944185"
                  class="h-11 rounded-xl border border-slate-200 px-4 text-[14px] text-slate-800 outline-none transition-colors focus:border-[#7d326f] focus:ring-1 focus:ring-[#7d326f]"
                />
              </div>
            </div>
          {:else if step === 2}
            <!-- STEP 2: BUSINESS OVERVIEW -->
            <h2 class="mb-8 text-[20px] font-semibold text-[#231a4a]">
              Business Overview
            </h2>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div class="flex w-full">
                <CustomSelect
                  id="category"
                  bind:value={category}
                  options={[
                    "Insurance",
                    "Healthcare",
                    "Pharma",
                    "Medical Devices",
                    "Other"
                  ]}
                />
              </div>
              <div class="flex w-full">
                <CustomSelect
                  id="subCategory"
                  bind:value={subCategory}
                  options={["Broker", "Hospital", "Clinic", "Other"]}
                />
              </div>
            </div>

            <div class="mb-8 flex flex-col gap-4">
              <p class="text-[14px] font-semibold text-slate-800">
                How do you wish to accepts payouts
              </p>
              <div class="flex items-center gap-8">
                <label class="flex items-center gap-2 cursor-pointer group">
                  <div
                    class="flex h-4 w-4 items-center justify-center rounded-full border {payoutMethod ===
                    'without'
                      ? 'border-[#00c04b] bg-white'
                      : 'border-slate-300'} transition-colors"
                  >
                    {#if payoutMethod === "without"}
                      <div class="h-2 w-2 rounded-full bg-[#00c04b]"></div>
                    {/if}
                  </div>
                  <input
                    type="radio"
                    value="without"
                    bind:group={payoutMethod}
                    class="hidden"
                  />
                  <span
                    class="text-[14px] font-medium {payoutMethod === 'without'
                      ? 'text-slate-800'
                      : 'text-slate-400'}">Without Website/App</span
                  >
                </label>

                <label class="flex items-center gap-2 cursor-pointer group">
                  <div
                    class="flex h-4 w-4 items-center justify-center rounded-full border {payoutMethod ===
                    'with'
                      ? 'border-[#00c04b] bg-white'
                      : 'border-slate-300'} transition-colors"
                  >
                    {#if payoutMethod === "with"}
                      <div class="h-2 w-2 rounded-full bg-[#00c04b]"></div>
                    {/if}
                  </div>
                  <input
                    type="radio"
                    value="with"
                    bind:group={payoutMethod}
                    class="hidden"
                  />
                  <span
                    class="text-[14px] font-medium {payoutMethod === 'with'
                      ? 'text-slate-800'
                      : 'text-slate-400'}">On my Website/App</span
                  >
                </label>
              </div>
            </div>
          {:else if step === 3}
            <!-- STEP 3: BUSINESS DETAILS -->
            <h2 class="mb-8 text-[20px] font-semibold text-[#231a4a]">
              Business Details*
            </h2>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div class="flex flex-col gap-2">
                <label class="text-[13px] font-semibold text-slate-700"
                  >Enter Business Name*</label
                >
                <input
                  type="text"
                  bind:value={businessName}
                  placeholder="Dummy Business"
                  class="h-11 rounded-xl border border-slate-200 px-4 text-[14px] text-slate-800 outline-none transition-colors"
                />
              </div>
              <div class="flex flex-col gap-2">
                <label class="text-[13px] font-semibold text-slate-700"
                  >Enter Pan Number*</label
                >
                <input
                  type="password"
                  bind:value={panNumber}
                  placeholder="********"
                  class="h-11 rounded-xl border border-slate-200 px-4 text-[14px] text-slate-800 outline-none transition-colors"
                />
              </div>
              <div class="flex flex-col gap-2">
                <label class="text-[13px] font-semibold text-slate-700"
                  >Enter Payee Name*</label
                >
                <input
                  type="text"
                  bind:value={payeeName}
                  placeholder="Payee Sharma"
                  class="h-11 rounded-xl border border-slate-200 px-4 text-[14px] text-slate-800 outline-none transition-colors"
                />
              </div>
              <div class="flex flex-col gap-2">
                <label class="text-[13px] font-semibold text-slate-700"
                  >Enter Billing Name*</label
                >
                <input
                  type="text"
                  bind:value={billingName}
                  placeholder="Dummy Business"
                  class="h-11 rounded-xl border border-slate-200 px-4 text-[14px] text-slate-800 outline-none transition-colors"
                />
              </div>
            </div>

            <div class="flex flex-col gap-2 mb-6 w-full md:w-[70%]">
              <label class="text-[13px] font-semibold text-slate-700"
                >Enter Business Address*</label
              >
              <input
                type="text"
                bind:value={businessAddress}
                placeholder="45, Green Valley Apartments, Sector 12, New Delhi"
                class="h-11 rounded-xl border border-slate-200 px-4 text-[14px] text-slate-800 outline-none transition-colors"
              />
            </div>

            <div
              class="grid grid-cols-1 md:grid-cols-3 gap-6 w-full md:w-[70%] mb-8"
            >
              <div class="flex w-full">
                <CustomSelect
                  id="stateInput"
                  bind:value={stateInput}
                  options={["New Delhi", "Maharashtra", "Karnataka"]}
                />
              </div>
              <div class="flex flex-col">
                <input
                  type="text"
                  bind:value={cityInput}
                  placeholder="New Delhi"
                  class="h-12 rounded-xl border border-slate-200 px-4 text-[14px] text-slate-800 outline-none transition-colors"
                />
              </div>
              <div class="flex flex-col">
                <input
                  type="text"
                  bind:value={pinCode}
                  placeholder="110089"
                  class="h-12 rounded-xl border border-slate-200 px-4 text-[14px] text-slate-800 outline-none transition-colors"
                />
              </div>
            </div>

            <!-- Address Checkbox -->
            <div class="mb-8 flex flex-col gap-1">
              <label class="flex items-center gap-2 cursor-pointer">
                <div
                  class="flex h-4 w-4 shrink-0 items-center justify-center rounded border {sameAsAbove
                    ? 'border-[#00c04b] bg-[#00c04b]'
                    : 'border-slate-300 bg-white'}"
                >
                  {#if sameAsAbove}
                    <svg
                      class="h-3 w-3 text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="3"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      ><polyline points="20 6 9 17 4 12"></polyline></svg
                    >
                  {/if}
                </div>
                <input
                  type="checkbox"
                  bind:checked={sameAsAbove}
                  class="hidden"
                />
                <span class="text-[13px] font-semibold text-[#231a4a]"
                  >Operational Address same as above</span
                >
              </label>
              <span class="text-[11px] text-slate-400 pl-6"
                >Physical Verification may take place at this address</span
              >
            </div>

            <div class="mb-4 flex items-center gap-8">
              <label class="flex items-center gap-2 cursor-pointer group">
                <div
                  class="flex h-4 w-4 items-center justify-center rounded-full border {hasGSTIN ===
                  'yes'
                    ? 'border-[#00c04b] bg-white'
                    : 'border-slate-300'} transition-colors"
                >
                  {#if hasGSTIN === "yes"}
                    <div class="h-2 w-2 rounded-full bg-[#00c04b]"></div>
                  {/if}
                </div>
                <input
                  type="radio"
                  value="yes"
                  bind:group={hasGSTIN}
                  class="hidden"
                />
                <span
                  class="text-[14px] font-medium {hasGSTIN === 'yes'
                    ? 'text-[#231a4a]'
                    : 'text-slate-400'}">We have registered GSTIN</span
                >
              </label>

              <label class="flex items-center gap-2 cursor-pointer group">
                <div
                  class="flex h-4 w-4 items-center justify-center rounded-full border {hasGSTIN ===
                  'no'
                    ? 'border-[#00c04b] bg-white'
                    : 'border-slate-300'} transition-colors"
                >
                  {#if hasGSTIN === "no"}
                    <div class="h-2 w-2 rounded-full bg-[#00c04b]"></div>
                  {/if}
                </div>
                <input
                  type="radio"
                  value="no"
                  bind:group={hasGSTIN}
                  class="hidden"
                />
                <span
                  class="text-[14px] font-medium {hasGSTIN === 'no'
                    ? 'text-[#231a4a]'
                    : 'text-slate-400'}">On my Website/App</span
                >
              </label>
            </div>

            {#if hasGSTIN === "yes"}
              <div class="flex flex-col gap-2 w-full md:w-1/3 mb-4">
                <input
                  type="text"
                  bind:value={gstin}
                  placeholder="Enter GSTIN"
                  class="h-11 rounded-xl border border-slate-200 px-4 text-[14px] text-slate-800 outline-none transition-colors"
                />
              </div>
            {/if}
          {:else if step === 4}
            <!-- STEP 4: BANK ACCOUNT -->
            <div class="flex items-center justify-between mb-8">
              <h2 class="text-[20px] font-semibold text-[#231a4a]">
                Bank Account*
              </h2>
              <!-- Simulated success block inside wireframe -->
              <div
                class="flex items-center gap-2 rounded-full border border-[#00c04b] bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-[#00c04b]"
              >
                Bank account details verified
                <CheckCircle2 class="h-3.5 w-3.5" />
              </div>
            </div>

            <p class="text-[11px] text-slate-500 mb-6 w-1/2">
              Enter Bank Account details of your company or authorized
              signatory.<br />
              We will deposit a small amount of money in your account to verify the
              account.
            </p>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 w-[80%]">
              <div class="flex flex-col gap-2">
                <label class="text-[13px] font-semibold text-slate-700"
                  >Enter Beneficiary Name</label
                >
                <input
                  type="text"
                  bind:value={beneficiaryName}
                  placeholder="Dummy Beneficiary Name"
                  class="h-11 rounded-xl border border-slate-200 px-4 text-[14px] text-slate-800 outline-none"
                />
              </div>
              <div class="flex flex-col gap-2">
                <label class="text-[13px] font-semibold text-slate-700"
                  >Enter Branch IFSC Code*</label
                >
                <input
                  type="text"
                  bind:value={ifsc}
                  placeholder="******"
                  class="h-11 rounded-xl border border-slate-200 px-4 text-[14px] text-slate-800 outline-none"
                />
              </div>
              <div class="flex flex-col gap-2">
                <label class="text-[13px] font-semibold text-slate-700"
                  >Enter Account Number</label
                >
                <input
                  type="password"
                  bind:value={accountNumber}
                  placeholder="***************"
                  class="h-11 rounded-xl border border-slate-200 px-4 text-[14px] text-slate-800 outline-none"
                />
              </div>
              <div class="flex flex-col gap-2">
                <label class="text-[13px] font-semibold text-slate-700"
                  >Re-Enter Account Number</label
                >
                <input
                  type="password"
                  bind:value={reAccountNumber}
                  placeholder="***************"
                  class="h-11 rounded-xl border border-slate-200 px-4 text-[14px] text-slate-800 outline-none"
                />
              </div>
            </div>
          {:else if step === 5}
            <!-- STEP 5: DOCUMENT VERIFICATION -->
            <div class="flex items-center justify-between mb-8">
              <h2 class="text-[20px] font-semibold text-[#231a4a]">
                Document Verification*
              </h2>
              <!-- Repetitive success block -->
              <div
                class="flex items-center gap-2 rounded-full border border-[#00c04b] bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-[#00c04b]"
              >
                Bank account details verified
                <CheckCircle2 class="h-3.5 w-3.5" />
              </div>
            </div>

            <p class="text-[11px] text-slate-500 mb-6">
              You can upload JPG/PNG of max. size 2MB or PDF of max. size 2MB.
            </p>

            <div class="flex flex-col gap-5 w-[80%]">
              <!-- Row 1 -->
              <div class="flex flex-col gap-2">
                <label class="text-[13px] font-semibold text-slate-700"
                  >Authorized Signatory's Address proof</label
                >
                <div class="flex gap-4">
                  <div
                    class="h-11 flex-1 rounded-xl border border-slate-200 px-4 flex items-center justify-between text-[13px] font-medium text-slate-700 cursor-pointer hover:bg-slate-50"
                  >
                    Aadhar .jpeg
                    <FileText class="h-4 w-4 text-[#7d326f]" />
                  </div>
                  <div
                    class="h-11 flex-1 rounded-xl border border-slate-200 px-4 flex items-center justify-between text-[13px] font-medium text-slate-700 cursor-pointer hover:bg-slate-50"
                  >
                    Aadhar .jpeg
                    <FileText class="h-4 w-4 text-[#7d326f]" />
                  </div>
                </div>
              </div>

              <!-- Row 2 -->
              <div class="flex flex-col gap-2">
                <label class="text-[13px] font-semibold text-slate-700"
                  >Business Registration Proof*</label
                >
                <div
                  class="h-11 w-full rounded-xl border border-slate-200 px-4 flex items-center justify-between text-[13px] font-medium text-slate-400"
                >
                  <!-- Empty placeholder -->
                </div>
              </div>

              <!-- Row 3 -->
              <div class="flex w-full flex-col gap-2">
                <p class="text-[11px] text-slate-500">
                  Upload the scan of GST Certificate
                </p>
                <div class="flex gap-4">
                  <div
                    class="h-11 w-1/3 rounded-xl border border-slate-200 px-4 flex items-center justify-between text-[13px] font-medium text-slate-700 cursor-pointer hover:bg-slate-50"
                  >
                    GST Certificate*
                    <UploadCloud class="h-4 w-4 text-[#7d326f]" />
                  </div>
                  <div
                    class="h-11 w-1/3 rounded-xl border border-slate-200 px-4 flex items-center justify-between text-[13px] font-medium text-slate-700 cursor-pointer hover:bg-slate-50"
                  >
                    Personal PAN*
                    <FileText class="h-4 w-4 text-[#7d326f]" />
                  </div>
                  <div
                    class="h-11 w-1/3 rounded-xl border border-slate-200 px-4 flex items-center justify-between text-[13px] font-medium text-slate-700 cursor-pointer hover:bg-slate-50"
                  >
                    Consent Letter*
                    <FileText class="h-4 w-4 text-[#7d326f]" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Address Checkbox again -->
            <div class="mt-8 mb-6 flex flex-col gap-1">
              <label class="flex items-center gap-2 cursor-pointer">
                <div
                  class="flex h-4 w-4 shrink-0 items-center justify-center rounded border {docsChecked
                    ? 'border-[#00c04b] bg-[#00c04b]'
                    : 'border-slate-300 bg-white'}"
                >
                  {#if docsChecked}
                    <svg
                      class="h-3 w-3 text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="3"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      ><polyline points="20 6 9 17 4 12"></polyline></svg
                    >
                  {/if}
                </div>
                <input
                  type="checkbox"
                  bind:checked={docsChecked}
                  class="hidden"
                />
                <span class="text-[13px] font-semibold text-[#231a4a]"
                  >Operational Address same as above</span
                >
              </label>
            </div>
          {/if}

          <!-- Global Buttons Line -->
          <div class="mt-6 flex items-center gap-4">
            <button
              class="h-10 rounded-lg bg-[#5b4897] px-8 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-[#433177] active:scale-95 cursor-pointer"
              onclick={() => {
                step === 5 ? handleSubmit() : handleNext();
              }}
            >
              {step === 5 ? "Submit" : "Continue"}
            </button>
            <button
              class="h-10 rounded-lg border border-[#231a4a] bg-white px-8 text-[13px] font-semibold text-[#231a4a] transition-colors hover:bg-slate-50 active:scale-95 cursor-pointer"
              onclick={handleBack}
            >
              Back
            </button>
          </div>
        </div>
      {:else}
        <!-- FINAL SUCCESS STATE -->
        <div
          class="rounded-[32px] border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col items-center pt-20 pb-16 px-10 max-w-xl mx-auto mt-20"
        >
          <div
            class="bg-[#5b4897] text-white p-3 rounded-2xl rotate-45 mb-10 shadow-lg"
          >
            <CheckCircle2
              class="h-14 w-14 -rotate-45"
              strokeWidth={3}
            />
          </div>

          <div
            class="w-full bg-[#5b4897] py-4 px-8 rounded-t-xl text-center shadow-sm z-10"
          >
            <h2 class="text-2xl font-semibold text-white tracking-tight">
              Onboarding Complete!
            </h2>
          </div>

          <div
            class="w-full bg-[#f3f0fc] rounded-b-xl px-10 py-8 border border-[#d6cbf5]"
          >
            <p class="font-semibold text-slate-800 text-[14px] mb-3">
              What happens now?
            </p>
            <ul
              class="flex flex-col gap-2.5 text-[13px] font-medium text-slate-700 list-inside list-disc"
            >
              <li>
                We will proceed with physical verification of the establishment
              </li>
              <li>Our team will reach out if we need any additional details</li>
              <li>Your account will be ready to use within 48 hours</li>
            </ul>
          </div>

          <button
            class="mt-10 h-11 w-full max-w-xs rounded-lg border-2 border-[#5b4897] bg-white font-semibold text-[#5b4897] hover:bg-[#5b4897] hover:text-white transition-colors cursor-pointer"
            onclick={handleFinish}
          >
            Go Ahead
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>

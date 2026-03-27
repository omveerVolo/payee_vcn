<script lang="ts">
  import {
    X,
    ShieldCheck,
    FileText,
    CheckCircle2,
    Lock,
    Navigation as LucideNavigation,
    User,
    ArrowUpRight,
    ArrowRight
  } from "@lucide/svelte";
  import { authState } from "$lib/state/auth.svelte.js";
  import { apiCall, redeemPayout } from "$lib/state/db.svelte.js";

  let { payout, onClose }: { payout: any; onClose: () => void } = $props();
  import { goto } from "$app/navigation";
  const currentTheme = $derived(authState.theme);

  let step = $state(1);
  let isProcessing = $state(false);
  let acceptedTerms = $state(true);
  let saveCardChecked = $state(true);
  let otpValues = $state(["", "", "", "", "", ""]);

  // Derive today's date
  let todayDate = new Date().toLocaleDateString("en-IN");

  async function handleNext() {
    isProcessing = true;
    console.log("Advancing from step:", step);

    // Simulate slight network delay for transitions
    await new Promise((resolve) => setTimeout(resolve, 600));

    if (step < 6) {
      step += 1;
      // When transitioning to Success (Step 5), mutate the mock DB state universally
      if (step === 6) {
        const payoutId = payout.payoutId;
        if (payoutId) {
          const res = await apiCall("/payouts/status", "PUT", {
            payoutIds: [payoutId],
            status: "Redeemed"
          });
          if (res !== null) {
            redeemPayout(payout.dbId || payout.id);
          }
        }
      }
    }
    isProcessing = false;
  }

  function formatCurrency(rawAmount: any) {
    if (!rawAmount) return "0";
    if (typeof rawAmount === "number") return rawAmount.toLocaleString("en-IN");
    return String(rawAmount).replace("₹", "");
  }

  function handleReturnDashboard() {
    onClose();
    goto("/");
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity p-4"
>
  <div
    class="relative w-full max-w-[440px] rounded-3xl bg-slate-50 shadow-2xl overflow-hidden scale-100 transition-transform"
  >
    <!-- Close Button (Only show if not verifying/processing) -->
    {#if !isProcessing && step < 6}
      <button
        class="absolute right-4 top-4 z-10 flex h-7 w-7 items-center justify-center rounded bg-[#e82525] text-white transition-transform hover:scale-110 hover:bg-red-700 cursor-pointer"
        onclick={onClose}
      >
        <X
          class="h-4 w-4"
          strokeWidth={3}
        />
      </button>
    {/if}

    <div class="p-8">
      {#if step === 1}
        <!-- STEP 1: NDC Approval Document (Shifted from Step 2) -->
        <div class="flex flex-col">
          <h2
            class="text-[28px] font-semibold mb-1 tracking-tight"
            style="color: {currentTheme.colors.primary}"
          >
            NDC Approval Document
          </h2>
          <p class="text-[15px] font-semibold text-slate-700 mb-6 mt-1">
            Review and authorize payout
          </p>

          <div
            class="w-full bg-[#f8f9fa] border border-slate-200/80 rounded-2xl p-6 h-[400px] overflow-y-auto mb-6 shadow-sm"
          >
            <div class="mb-6 text-[13px] text-slate-800 font-medium">
              (On Hospital letter head)
            </div>
            <div
              class="flex items-center justify-center font-semibold text-[18px] text-black mb-6 tracking-tight"
            >
              No Due Certificate
            </div>
            <div
              class="space-y-4 text-[13px] text-slate-800 leading-relaxed font-normal pr-2"
            >
              <p>Date – {todayDate}</p>
              <p>
                <span class="font-semibold">Payer Name and address –</span>
                <span class="font-semibold"
                  >{payout.provider}; 123 Healthcare Avenue, Mumbai</span
                >
              </p>
              <p>
                To,<br />
                Star Health and Allied Insurance Co. Ltd.
              </p>
              <p>
                Subject – No dues again cashless claim no. <span
                  class="font-semibold">{payout.id}</span
                > intimated to Star Health and Allied Insurance Co. Ltd.
              </p>
              <p>
                We wish to inform you that outstanding payout for cashless claim
                no. <span class="font-semibold">{payout.id}</span> with Star Health
                & Allied Insurance Co. Ltd. has been cleared/paid and settled.
              </p>
              <p>
                We acknowledge that there are no further dues/fees/charges
                pending from Star Health and Allied Insurance Co. Ltd.
                pertaining to aforementioned transactions and acknowledge the
                receipt of payouts thereof.
              </p>
              <div class="pt-4 space-y-0.5">
                <p>Yours' Sincerely</p>
                <p class="text-slate-400 font-medium">({payout.provider})</p>
              </div>
              <div class="pt-8">
                <p>Seal & signature to be placed here</p>
              </div>
              <div class="pt-6 space-y-0.5">
                <p>
                  Authorized Signatory - <span class="font-semibold"
                    >{authState.user?.name || "Dr. Jane Smith"}</span
                  >
                </p>
                <p>
                  Authorized Signatory – <span class="font-semibold"
                    >Head of Billing</span
                  >
                </p>
              </div>
            </div>
          </div>

          <label class="flex items-center gap-3 cursor-pointer mb-6 group">
            <input
              type="checkbox"
              class="hidden"
              bind:checked={acceptedTerms}
            />
            <div
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors"
              style="border-color: {acceptedTerms ? currentTheme.colors.primary : 'rgb(203 213 225)'}; background-color: {acceptedTerms ? currentTheme.colors.primary : 'white'};"
            >
              {#if acceptedTerms}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  stroke-width="3.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  ><polyline points="20 6 9 17 4 12"></polyline></svg
                >
              {/if}
            </div>
            <span class="text-[15px] font-[600] text-slate-400"
              >Term and condition</span
            >
          </label>

          <button
            class="w-full h-[52px] rounded-xl text-[16px] font-semibold text-white shadow-sm transition-transform active:scale-[0.98] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            style="background-color: {currentTheme.colors.primary}"
            onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.filter = 'brightness(0.9)'; }}
            onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
            onclick={handleNext}
            disabled={isProcessing || !acceptedTerms}
          >
            {isProcessing ? "Processing..." : "Proceed to payout"}
          </button>
        </div>
      {:else if step === 2}
        <!-- STEP 2: payout Gateway (Virtual Card) (Shifted from Step 3) -->
        <div class="flex flex-col items-center">
          <h2
            class="text-[18px] font-semibold w-full text-left mb-1"
            style="color: {currentTheme.colors.primary}"
          >
            payout Gateway
          </h2>
          <p
            class="text-[12px] font-medium text-slate-500 w-full text-left mb-6"
          >
            Payvider virtual card information
          </p>

          <div
            class="w-full aspect-[1.586/1] rounded-2xl p-6 shadow-xl mb-6 flex flex-col justify-between text-white relative overflow-hidden"
            style="background-color: {currentTheme.colors.primary}; background-image: linear-gradient(to bottom right, {currentTheme.colors.primary}, {currentTheme.colors.sidebarBg})"
          >
            <div
              class="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl"
            ></div>
            <div
              class="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-blue-400/20 blur-2xl"
            ></div>

            <div
              class="flex justify-between items-center relative z-10 opacity-90"
            >
              <span
                class="text-[14px] font-semibold tracking-widest text-blue-200"
                >VIRTUAL CARD</span
              >
              <div class="flex gap-1 items-center">
                <div
                  class="h-6 w-6 rounded-full bg-orange-500/80 mix-blend-multiply"
                ></div>
                <div
                  class="h-6 w-6 -ml-3 rounded-full bg-amber-400/80 mix-blend-multiply"
                ></div>
              </div>
            </div>

            <div class="flex flex-col relative z-10 w-full mt-4">
              <span class="font-mono text-xl tracking-widest text-white/90"
                >4859 2928 **** 5829</span
              >
            </div>

            <div
              class="flex w-full justify-between items-end relative z-10 mt-2"
            >
              <div class="flex flex-col">
                <span
                  class="text-[8px] uppercase tracking-widest text-indigo-200"
                  >Valid Thru</span
                >
                <span class="font-semibold font-mono">11/26</span>
              </div>
              <div class="flex flex-col text-right">
                <span
                  class="text-[8px] uppercase tracking-widest text-indigo-200"
                  >CVV</span
                >
                <span
                  class="font-semibold font-mono text-white bg-white/20 px-2 rounded backdrop-blur"
                  >***</span
                >
              </div>
            </div>
          </div>

          <div
            class="w-full rounded-xl bg-slate-100 border border-slate-200 p-4 mb-4 flex gap-3 text-slate-700"
          >
            <div class="mt-0.5 text-slate-500">
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
                ><path
                  d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
                /><path d="M12 9v4" /><path d="M12 17h.01" /></svg
              >
            </div>
            <div class="flex flex-col">
              <span class="text-[13px] font-bold text-black mb-1"
                >Security Note:</span
              >
              <span class="text-[12px] leading-relaxed">
                Please keep your security code handy. You'll need it in the next
                step. Your card number and expiry date will be auto-filled
                automatically.
              </span>
            </div>
          </div>

          <div
            class="w-full rounded-xl bg-white border border-slate-200 p-4 mb-6 flex items-center justify-between shadow-sm"
          >
            <div class="flex flex-col">
              <span class="text-[12px] font-medium text-slate-500 mb-0.5"
                >Payer Details</span
              >
              <span class="text-[16px] font-bold" style="color: {currentTheme.colors.primary}"
                >{payout.program || "Acme Insurance"}</span
              >
            </div>
            <div class="text-[26px] font-bold" style="color: {currentTheme.colors.primary}">
              {"₹" + formatCurrency(payout.payableAmount)}
            </div>
          </div>

          <button
            class="w-full h-11 rounded-xl text-[14px] font-semibold text-white shadow-sm transition-all cursor-pointer flex items-center justify-center disabled:opacity-50"
            style="background-color: {currentTheme.colors.primary}"
            onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.filter = 'brightness(0.9)'; }}
            onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
            onclick={handleNext}
            disabled={isProcessing}
          >
            {isProcessing ? "Processing..." : "Continue to payout"}
          </button>
        </div>
      {:else if step === 3}
        <!-- STEP 3: Complete payout (Add a new card modal) -->
        <div class="flex flex-col items-center">
          <h2
            class="text-[18px] font-semibold w-full text-left mb-1"
            style="color: {currentTheme.colors.primary}"
          >
            Complete payout
          </h2>
          <p
            class="text-[12px] font-medium text-slate-500 w-full text-left mb-6"
          >
            Add a new card
          </p>

          <div
            class="w-full rounded-xl bg-slate-100 p-4 flex items-center gap-3 mb-6 border border-slate-200"
          >
            <div
              class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-600"
            >
              <User class="h-4 w-4" />
            </div>
            <span class="text-[14px] font-semibold" style="color: {currentTheme.colors.secondary}"
              >Using as +91 8076******</span
            >
          </div>

          <div class="w-full flex flex-col gap-4 mb-4">
            <div class="flex flex-col gap-1.5 w-full">
              <label class="text-[12px] font-medium text-slate-600" for="cardNumber"
                >Card Number</label
              >
              <input
                id="cardNumber"
                type="text"
                readonly
                value="9553  4254  6354  1289"
                class="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-4 text-[14px] font-mono font-medium text-slate-700 focus:border-[#0066cc] focus:bg-white outline-none shadow-sm"
              />
            </div>

            <div class="flex gap-4 w-full">
              <div class="flex flex-col gap-1.5 flex-1 w-full">
                <label class="text-[12px] font-medium text-slate-600" for="expiryDate"
                  >Expiry Date</label
                >
                <input
                  id="expiryDate"
                  type="text"
                  readonly
                  value="12 / 30"
                  class="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-4 text-[14px] font-mono font-medium text-slate-700 focus:border-[#0066cc] focus:bg-white outline-none shadow-sm"
                />
              </div>
              <div class="flex flex-col gap-1.5 flex-1 w-full">
                <label class="text-[12px] font-medium text-slate-600" for="cvv">CVV</label
                >
                <input
                  id="cvv"
                  type="text"
                  value="955"
                  class="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-4 text-[14px] font-mono font-medium text-slate-700 focus:border-[#0066cc] focus:bg-white outline-none shadow-sm"
                />
              </div>
            </div>
          </div>

          <label
            class="flex items-center gap-3 cursor-pointer mb-8 w-full group"
          >
            <input
              type="checkbox"
              class="hidden"
              bind:checked={saveCardChecked}
            />
            <div
              class="flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors"
               style="border-color: {saveCardChecked ? currentTheme.colors.secondary : 'rgb(203 213 225)'}; background-color: {saveCardChecked ? currentTheme.colors.secondary : 'white'};"
            >
              {#if saveCardChecked}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  stroke-width="3.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  ><polyline points="20 6 9 17 4 12"></polyline></svg
                >
              {/if}
            </div>
            <span class="text-[13px] font-medium text-slate-500"
              >Save this card as per RBI guidelines</span
            >
          </label>

          <button
            class="w-full h-11 rounded-xl flex items-center justify-between px-6 text-[14px] font-semibold text-white shadow-sm transition-all cursor-pointer disabled:opacity-50"
            style="background-color: {currentTheme.colors.primary}"
            onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.filter = 'brightness(0.9)'; }}
            onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
            onclick={handleNext}
            disabled={isProcessing}
          >
            <span>Complete payout</span>
            <span>₹{formatCurrency(payout.payableAmount)}</span>
          </button>
        </div>
      {:else if step === 4}
        <!-- STEP 3: Complete payout (Shifted from Step 4) -->
        <div class="flex flex-col">
          <h2 class="text-[18px] font-semibold mb-1" style="color: {currentTheme.colors.primary}">
            Complete payout
          </h2>
          <p class="text-[12px] font-medium text-slate-500 mb-6">
            Review claim details before deduction
          </p>

          <div
            class="w-full rounded-xl bg-white border border-slate-200 mb-6 overflow-hidden shadow-sm"
          >
            <div
              class="flex items-center gap-3 p-4 border-b border-slate-100 bg-slate-50"
            >
              <div
                class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-600"
              >
                <User class="h-5 w-5" />
              </div>
              <div class="flex flex-col">
                <!-- <span class="text-[14px] font-semibold text-slate-800"
                  >Sanjay Singh</span
                > -->
                <span class="text-[11px] font-medium text-slate-500"
                  >**** **** **** 1989</span
                >
              </div>
            </div>

            <div class="p-5 flex flex-col gap-4">
              <div class="flex justify-between items-center text-[12px]">
                <span class="font-medium text-slate-500">Tracking id</span>
                <span class="font-semibold text-slate-800 font-mono"
                  >{payout.trackingId}</span
                >
              </div>
              <div class="flex justify-between items-center text-[12px]">
                <span class="font-medium text-slate-500">Tx id</span>
                <span class="font-semibold text-slate-800 font-mono"
                  >{payout.id}</span
                >
              </div>
              <div class="flex justify-between items-center text-[12px]">
                <span class="font-medium text-slate-500">Base Amount</span>
                <span class="font-semibold text-slate-800"
                  >₹{formatCurrency(payout.approvedAmount)}</span
                >
              </div>
              <div class="flex justify-between items-center text-[12px]">
                <span class="font-medium text-slate-500">Applicable TDS</span>
                <span class="font-semibold text-slate-800 mt-0">
                  {payout.tds || "0%"}</span
                >
              </div>
              <!-- Dotted divider -->
              <div
                class="w-full border-t border-dashed border-slate-200 my-1"
              ></div>
              <div class="flex justify-between items-center">
                <span class="font-semibold text-slate-800 text-[14px]"
                  >Total</span
                >
                <span class="font-semibold text-[18px]" style="color: {currentTheme.colors.secondary}"
                  >₹{formatCurrency(payout.payableAmount)}</span
                >
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 mb-6">
            <Lock class="h-3 w-3 text-slate-400" />
            <span class="text-[10px] font-medium text-slate-400"
              >Secured via HDFC payout Systems</span
            >
          </div>

          <button
            class="w-full h-11 rounded-xl flex items-center justify-between px-6 text-[14px] font-semibold text-white shadow-sm transition-all cursor-pointer disabled:opacity-50"
            style="background-color: {currentTheme.colors.primary}"
            onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.filter = 'brightness(0.9)'; }}
            onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
            onclick={handleNext}
            disabled={isProcessing}
          >
            <span
              >{isProcessing
                ? "Processing Transaction..."
                : "Proceed to Verify"}</span
            >
            {#if !isProcessing}
              <ArrowRight class="h-4 w-4" />
            {/if}
          </button>
        </div>
      {:else if step === 5}
        <!-- STEP 4: OTP Verification (Second Last Flow - Shifted from Step 1) -->
        <div class="flex flex-col items-center">
          <h2 class="text-[20px] font-semibold mb-1" style="color: {currentTheme.colors.primary}">
            OTP Verification
          </h2>
          <p class="text-[12px] font-medium text-slate-500 mb-8 tracking-tight">
            Enter the OTP sent to <strong>+91 8076******</strong>
          </p>

          <div class="flex gap-2 mb-6">
            {#each otpValues as value, i}
              <input
                type="text"
                maxlength="1"
                class="h-12 w-10 text-center rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:border-[#0066cc] outline-none shadow-sm"
                bind:value={otpValues[i]}
                oninput={(e) => {
                  // Only allow numbers
                  const val = e.currentTarget.value.replace(/[^0-9]/g, "");
                  otpValues[i] = val;

                  // Auto-focus next input
                  if (val && i < 5) {
                    const nextInput = e.currentTarget.nextElementSibling;
                    if (nextInput) (nextInput as HTMLInputElement).focus();
                  }
                }}
                onkeydown={(e) => {
                  // Handle backspace to focus previous input
                  if (e.key === "Backspace" && !otpValues[i] && i > 0) {
                    const prevInput = e.currentTarget.previousElementSibling;
                    if (prevInput) {
                      (prevInput as HTMLInputElement).focus();
                      // Small delay to ensure cursor is at end and it deletes correctly
                      setTimeout(() => {
                        otpValues[i - 1] = "";
                      }, 0);
                    }
                  }
                }}
              />
            {/each}
          </div>

          <p class="text-[10px] font-medium text-slate-400 mb-1">
            I didn't receive the code
          </p>
          <button
            class="text-[11px] font-semibold hover:underline cursor-pointer mb-8"
            style="color: {currentTheme.colors.secondary}"
            >Resend OTP</button
          >

          <button
            class="w-full h-11 rounded-xl text-[14px] font-semibold text-white shadow-sm transition-all cursor-pointer flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            style="background-color: {currentTheme.colors.secondary}"
            onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.filter = 'brightness(0.9)'; }}
            onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
            onclick={handleNext}
            disabled={isProcessing || otpValues.join("").length < 6}
          >
            {isProcessing ? "Verifying..." : "Verify & Complete payout"}
          </button>
        </div>
      {:else if step === 6}
        <!-- STEP 5: Success Modal (Themed Blue as requested) -->
        <div class="flex flex-col items-center py-4">
          <div
            class="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 border-4 border-white shadow-[0_0_15px_rgba(0,102,204,0.15)] bg-gradient-to-tr from-blue-50 to-white"
          >
            <CheckCircle2
              class="h-8 w-8"
              style="color: {currentTheme.colors.primary}"
              strokeWidth={2.5}
            />
          </div>

          <h2
            class="text-[22px] font-semibold text-slate-800 tracking-tight leading-none mb-1"
          >
            payout Successful
          </h2>
          <p class="text-[12px] font-medium text-slate-500 mb-8">
            Your claim has been redeemed
          </p>

          <!-- Receipt Block -->
          <div
            class="w-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm mb-6 flex items-center justify-between"
          >
            <div class="flex flex-col gap-1">
              <span class="text-[13px] font-semibold text-slate-800"
                >{payout.provider}</span
              >
              <span class="text-[10px] font-medium text-slate-400"
                >Nov 28, 2026, 12:30 PM</span
              >
              <span class="font-mono text-[9px] text-slate-300"
                >Txn: {payout.id}</span
              >
            </div>
            <div
              class="text-[24px] font-semibold tracking-tight"
              style="color: {currentTheme.colors.primary}"
            >
              ₹{formatCurrency(payout.payableAmount)}
            </div>
          </div>

          <!-- Timeline box -->
          <div
            class="w-full rounded-lg bg-slate-50 border border-slate-100 px-4 py-3 flex items-start gap-3 mb-8"
          >
            <div class="mt-0.5">
              <FileText class="h-4 w-4 text-slate-400" />
            </div>
            <div class="flex flex-col">
              <span class="text-[11px] font-semibold text-slate-700"
                >Settlement Timeline</span
              >
              <span class="text-[10px] font-medium text-slate-500"
                >The transaction will be settled by PG in T+1 business days.</span
              >
            </div>
          </div>

          <!-- Final Button - Professional Blue -->
          <button
            class="w-full h-11 rounded-xl flex items-center justify-between px-6 text-[14px] font-semibold text-white transition-all cursor-pointer shadow-sm"
            style="background-color: {currentTheme.colors.secondary}"
            onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.filter = 'brightness(0.9)'; }}
            onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
            onclick={handleReturnDashboard}
          >
            <span>₹{formatCurrency(payout.payableAmount)}</span>
            <div class="flex items-center">
              <span>Return to Dashboard</span>
              <ArrowRight class="h-4 w-4 ml-1.5" />
            </div>
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>

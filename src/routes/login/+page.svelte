<script lang="ts">
  import { goto } from "$app/navigation";
  import { login, logout } from "$lib/state/auth.svelte.js";
  import {
    apiCall,
    dbStore,
    syncRemoteData,
    upsertUser
  } from "$lib/state/db.svelte.js";
  import { Loader2 } from "lucide-svelte";
  import { onMount } from "svelte";

  let emailOrPhone = $state("");
  let step = $state(1);
  let isLoading = $state(false);
  let errorMessage = $state("");

  onMount(() => {
    logout();
  });

  let pendingUser: any = $state(null);

  let otp = $state(["", "", "", ""]);
  let otpInputs = $state<HTMLInputElement[]>([]);

  function handleSendOtp() {
    if (!emailOrPhone) return;

    isLoading = true;
    errorMessage = "";

    apiCall(`/user?email=${encodeURIComponent(emailOrPhone)}`)
      .then((apiUser) => {
        if (!apiUser) throw new Error("Not found");
        const user = {
          id: apiUser.id || emailOrPhone,
          email: apiUser.email || emailOrPhone,
          role: apiUser.role || "payer",
          name: apiUser.name || "API User",
          ...apiUser
        };

        pendingUser = user;
        step = 2;
        setTimeout(() => otpInputs[0]?.focus(), 50);
      })
      .catch(() => {
        errorMessage = "Account not found in remote system. Please sign up.";
      })
      .finally(() => {
        isLoading = false;
      });
  }

  function handleVerifyOtp() {
    const fullOtp = otp.join("");
    if (fullOtp.length === 4 && pendingUser) {
      isLoading = true;
      errorMessage = "";
      setTimeout(async () => {
        const { password, ...sessionUser } = pendingUser;
        login(sessionUser);
        upsertUser(sessionUser);
        if (sessionUser.id) {
          await syncRemoteData(sessionUser.id);
        }
        goto("/");
      }, 800);
    }
  }

  function handleOtpInput(
    e: Event & { currentTarget: EventTarget & HTMLInputElement },
    index: number
  ) {
    const val = e.currentTarget.value;
    if (val && !/^\d+$/.test(val)) {
      otp[index] = "";
      return;
    }
    if (val) {
      otp[index] = val.slice(-1);
      if (index < 3) {
        otpInputs[index + 1]?.focus();
      }
    }
  }

  function handleOtpKeydown(e: KeyboardEvent, index: number) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputs[index - 1]?.focus();
    }
  }

  function handleOtpPaste(
    e: ClipboardEvent & { currentTarget: EventTarget & HTMLInputElement }
  ) {
    e.preventDefault();
    if (!e.clipboardData) return;

    const pastedData = e.clipboardData.getData("text");
    const digits = pastedData.replace(/\D/g, "").slice(0, 4);

    if (digits) {
      for (let i = 0; i < digits.length; i++) {
        otp[i] = digits[i];
      }
      const nextFocusIndex = Math.min(digits.length, 3);
      otpInputs[nextFocusIndex]?.focus();
    }
  }
</script>

<!-- Outer Container matching the light gray background -->
<div class="flex h-screen w-full bg-[#f4f4f5] p-6 lg:p-8">
  <div
    class="flex h-full w-full max-w-[1400px] mx-auto overflow-hidden rounded-[32px] bg-white shadow-sm ring-1 ring-slate-200"
  >
    <!-- Left Side: Dark Purple Rounded Box -->
    <div class="hidden lg:flex w-1/2 p-4">
      <div
        class="relative h-full w-full flex items-center justify-center rounded-[32px] bg-[#231a4a] overflow-hidden"
      >
        <img
          src="/two.png"
          alt="Login Dashboard"
          class="absolute left-1/2 -translate-x-1/2 h-full transition-all hover:scale-[1.02] duration-700 ease-in-out z-10"
        />
      </div>
    </div>

    <!-- Right Side: Login Form Area (Centered) -->
    <div
      class="flex w-full lg:w-1/2 items-center justify-center bg-[#f4f4f5] lg:bg-transparent p-6"
    >
      <!-- White Floating Card -->
      <div
        class="w-full max-w-[420px] rounded-[32px] bg-white p-10 md:p-14 shadow-xl lg:shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative"
      >
        {#if step === 1}
          <div class="mb-10 text-center">
            <p class="text-[15px] font-medium text-slate-600 tracking-tight">
              Please enter your details to sign in.
            </p>
          </div>

          <form
            class="flex flex-col gap-6"
            onsubmit={(e) => {
              e.preventDefault();
              handleSendOtp();
            }}
          >
            {#if errorMessage}
              <div
                class="rounded-lg bg-slate-50 p-3 text-sm text-slate-600 font-medium text-center border border-slate-200 animate-in fade-in duration-300"
              >
                {errorMessage}
              </div>
            {/if}

            <div>
              <input
                type="text"
                bind:value={emailOrPhone}
                placeholder="Email or Phone Number"
                required
                class="w-full rounded-xl border border-slate-200 px-5 py-3.5 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-[#7d326f] focus:ring-1 focus:ring-[#7d326f]"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !emailOrPhone}
              class="w-full rounded-xl bg-[#7d326f] mt-2 py-3.5 text-[15px] flex justify-center items-center font-semibold text-white shadow-sm transition-colors hover:bg-[#68295c] active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none cursor-pointer"
            >
              {#if isLoading}
                <Loader2 class="h-5 w-5 animate-spin" />
              {:else}
                Get OTP
              {/if}
            </button>
          </form>
        {:else}
          <div class="mb-8 text-center relative">
            <button
              onclick={() => {
                step = 1;
                errorMessage = "";
              }}
              class="absolute -top-1 -left-4 md:-left-8 text-slate-400 hover:text-slate-600 p-2 cursor-pointer transition-colors"
              aria-label="Go back"
            >
              ← Back
            </button>
            <p class="text-[15px] font-medium text-slate-600 tracking-tight">
              Verify OTP
            </p>
            <p class="mt-2 text-xs text-slate-400">
              Sent to {emailOrPhone}
            </p>
          </div>

          <form
            class="flex flex-col gap-8"
            onsubmit={(e) => {
              e.preventDefault();
              handleVerifyOtp();
            }}
          >
            {#if errorMessage}
              <div
                class="col-span-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600 font-medium text-center border border-slate-200 animate-in fade-in duration-300"
              >
                {errorMessage}
              </div>
            {/if}

            <!-- OTP Inputs -->
            <div class="flex justify-center gap-3 md:gap-4">
              {#each otp as digit, i}
                <input
                  type="text"
                  inputmode="numeric"
                  maxlength="1"
                  bind:value={otp[i]}
                  bind:this={otpInputs[i]}
                  oninput={(e) => handleOtpInput(e, i)}
                  onkeydown={(e) => handleOtpKeydown(e, i)}
                  onpaste={handleOtpPaste}
                  class="h-12 w-12 md:h-14 md:w-14 rounded-xl border border-slate-200 text-center text-xl font-medium text-slate-800 outline-none transition-all focus:border-[#7d326f] focus:ring-1 focus:ring-[#7d326f]"
                />
              {/each}
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.join("").length < 4}
              class="w-full rounded-xl bg-[#7d326f] py-3.5 text-[15px] flex justify-center items-center font-semibold text-white shadow-sm transition-colors hover:bg-[#68295c] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {#if isLoading}
                <Loader2 class="h-5 w-5 animate-spin" />
              {:else}
                Verify & Login
              {/if}
            </button>
          </form>
        {/if}

        <div class="mt-10 text-center text-[13px] font-medium text-slate-500">
          Don't have an account yet?
          <a
            href="/signup"
            class="font-semibold text-slate-800 transition-colors hover:text-[#7d326f]"
          >
            Sign up
          </a>
        </div>
      </div>
    </div>
  </div>
</div>

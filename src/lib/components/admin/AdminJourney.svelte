<script lang="ts">
  import { Search, CheckCircle2 } from "lucide-svelte";
  import { goto } from "$app/navigation";

  let searchQuery = $state("");
</script>

<div class="flex min-h-screen w-full flex-col bg-[#f5f6f8] relative">
  <!-- Top Bar Layout (similar to Dashboard but stripped down for landing) -->
  <div class="absolute top-8 left-1/2 -translate-x-1/2 w-full max-w-lg z-10">
    <div
      class="flex h-12 w-full items-center overflow-hidden rounded-full border border-slate-200 bg-white px-2 shadow-sm transition-shadow hover:shadow-md"
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

  <div
    class="flex w-full flex-col items-center justify-center px-4 pt-32 pb-20 mt-12"
  >
    <!-- Header -->
    <div class="mb-12 text-center">
      <h1 class="mb-2 text-4xl font-bold tracking-tight text-slate-900">
        Choose Your Journey
      </h1>
      <p class="text-[15px] font-medium text-slate-600">
        Select your role to get started with our platform
      </p>
    </div>

    <!-- Cards Container -->
    <div class="grid w-full max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
      <!-- Payee Card -->
      <div
        class="relative flex flex-col rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
      >
        <div class="mb-4">
          <h2
            class="text-xl font-semibold text-slate-900 flex items-center gap-1.5"
          >
            View All <span class="text-[#5b4897]">Payee</span>
          </h2>
          <p class="text-[13px] leading-relaxed text-slate-500 mt-2">
            Receive payouts from payers and manage your earnings seamlessly
          </p>
        </div>

        <ul class="mb-8 flex flex-col gap-3">
          <li
            class="flex items-start gap-2.5 text-[13px] font-medium text-slate-700"
          >
            <CheckCircle2
              class="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
              strokeWidth={2}
            />
            Accept payer recommendations
          </li>
          <li
            class="flex items-start gap-2.5 text-[13px] font-medium text-slate-700"
          >
            <CheckCircle2
              class="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
              strokeWidth={2}
            />
            Track your Payouts in real-time
          </li>
          <li
            class="flex items-start gap-2.5 text-[13px] font-medium text-slate-700"
          >
            <CheckCircle2
              class="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
              strokeWidth={2}
            />
            Manage multiple payers
          </li>
        </ul>

        <button
          class="mt-auto w-fit rounded-lg bg-[#5b4897] px-8 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-[#4a397a]"
          onclick={() => goto("/admin/users?role=payee")}
        >
          Get Started
        </button>
      </div>

      <!-- Payer Card -->
      <div
        class="relative flex flex-col rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
      >
        <div class="mb-4">
          <h2
            class="text-xl font-semibold text-slate-900 flex items-center gap-1.5"
          >
            View All <span class="text-[#7d326f]">Payer</span>
          </h2>
          <p class="text-[13px] leading-relaxed text-slate-500 mt-2">
            Set up payout programs and manage payees efficiently
          </p>
        </div>

        <ul class="mb-8 flex flex-col gap-3">
          <li
            class="flex items-start gap-2.5 text-[13px] font-medium text-slate-700"
          >
            <CheckCircle2
              class="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
              strokeWidth={2}
            />
            Configure payout programs
          </li>
          <li
            class="flex items-start gap-2.5 text-[13px] font-medium text-slate-700"
          >
            <CheckCircle2
              class="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
              strokeWidth={2}
            />
            Recommend and onboard payees
          </li>
          <li
            class="flex items-start gap-2.5 text-[13px] font-medium text-slate-700"
          >
            <CheckCircle2
              class="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
              strokeWidth={2}
            />
            Manage deductions and cards
          </li>
        </ul>

        <button
          class="mt-auto w-fit rounded-lg bg-[#7d326f] px-8 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-[#632757]"
          onclick={() => goto("/admin/users?role=payer")}
        >
          Get Started
        </button>
      </div>

      <!-- Admin Card -->
      <div
        class="relative flex flex-col rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
      >
        <div class="mb-4">
          <h2 class="text-xl font-semibold text-[#0066cc]">Admin</h2>
          <p class="text-[13px] leading-relaxed text-slate-500 mt-2">
            Add or edit users
          </p>
        </div>

        <ul class="mb-8 flex flex-col gap-3">
          <li
            class="flex items-start gap-2.5 text-[13px] font-medium text-slate-700"
          >
            <CheckCircle2
              class="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
              strokeWidth={2}
            />
            Manage roles
          </li>
          <li
            class="flex items-start gap-2.5 text-[13px] font-medium text-slate-700"
          >
            <CheckCircle2
              class="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
              strokeWidth={2}
            />
            Give permissions across modules
          </li>
        </ul>

        <button
          class="mt-auto w-fit rounded-lg bg-[#0066cc] px-8 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-[#0052a3]"
        >
          Get Started
        </button>
      </div>
    </div>
  </div>
</div>

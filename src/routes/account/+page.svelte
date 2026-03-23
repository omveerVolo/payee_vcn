<script lang="ts">
  import { authState } from "$lib/state/auth.svelte.js";
  import { UploadCloud, User } from "lucide-svelte";

  let showContact = $state(false);
</script>

<svelte:head>
  <title>Profile Settings - HDFC Bank</title>
</svelte:head>

<div
  class="flex h-full w-full flex-col p-8 lg:p-12 relative overflow-y-auto min-h-screen bg-[#f3f4f6]"
>
  <div
    class="mt-8 w-full max-w-5xl mx-auto bg-white rounded-2xl shadow-sm p-10 flex flex-col relative"
  >
    <div class="flex items-start justify-between w-full mb-10">
      <div class="w-1/2">
        <h2 class="text-xl font-semibold text-slate-900 mb-6">
          Profile Settings
        </h2>
        <div class="grid grid-cols-2 gap-6 w-full max-w-md">
          <div class="flex flex-col gap-2">
            <label
              for="profileName"
              class="text-[13px] font-semibold text-slate-700">Name</label
            >
            <input
              id="profileName"
              type="text"
              value={authState.user?.name || "Rahul Sharma"}
              readonly
              disabled
              class="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 outline-none cursor-not-allowed"
            />
          </div>
          <div class="flex flex-col gap-2">
            <label
              for="profilePhone"
              class="text-[13px] font-semibold text-slate-700"
              >Phone Number</label
            >
            <input
              id="profilePhone"
              type="text"
              value="+91 9876543210"
              readonly
              disabled
              class="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 outline-none cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      <!-- Profile Picture -->
      <div class="flex items-center gap-4 mt-8">
        <div
          class="h-20 w-20 rounded-full bg-slate-200 overflow-hidden ring-4 ring-white shadow-md shrink-0"
        >
          <div
            class="h-full w-full bg-slate-100 flex items-center justify-center"
          >
            <User
              class="h-10 w-10 text-slate-400"
              strokeWidth={1.5}
            />
          </div>
        </div>
        <div class="flex flex-col">
          <span class="text-sm font-medium text-slate-500 mb-1"
            >Update your profile picture</span
          >
          <button
            class="text-[13px] font-semibold text-[#7d326f] hover:text-[#5b2451] transition-colors text-left cursor-pointer"
          >
            Upload Photo
          </button>
        </div>
      </div>
    </div>

    <!-- Organization Details -->
    <div class="flex flex-col w-full max-w-xl mb-24">
      <h3 class="text-[15px] font-semibold text-slate-900 mb-4">
        Organization Details
      </h3>
      <div class="bg-slate-100 rounded-xl p-6 flex flex-col gap-4">
        <input
          type="text"
          value="Acme Healthcare Solutions"
          readonly
          disabled
          class="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 outline-none cursor-not-allowed"
        />
        <input
          type="email"
          value={authState.user?.email || "finance@acmehealthcare.in"}
          readonly
          disabled
          class="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 outline-none cursor-not-allowed"
        />
        <label
          for="orgAddress"
          class="text-[13px] font-semibold text-slate-700 mt-2"
          >Organization Address</label
        >
        <input
          id="orgAddress"
          type="text"
          value="123 Business Tower, Lower Parel, Mumbai, Maharashtra 400013"
          readonly
          disabled
          class="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 outline-none cursor-not-allowed"
        />
      </div>
    </div>

    <!-- Contact Us Floating Card Overlay -->
    {#if showContact}
      <!-- Click-away background -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="fixed inset-0 z-40 bg-transparent"
        onclick={() => (showContact = false)}
        aria-hidden="true"
      ></div>

      <div
        class="absolute bottom-28 right-10 bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-slate-200 p-5 w-72 flex flex-col gap-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
      >
        <h4 class="text-[14px] font-semibold text-[#7d326f]">Contact Us</h4>
        <div class="grid grid-cols-2 gap-3 w-full">
          <button
            onclick={() =>
              (window.location.href = "mailto:support@hdfcbank.com")}
            class="rounded-full border border-slate-300 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors w-full cursor-pointer"
          >
            Email Us
          </button>
          <button
            onclick={() => (window.location.href = "tel:18001234567")}
            class="rounded-full border border-slate-300 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors w-full cursor-pointer"
          >
            Call Us
          </button>
        </div>
      </div>
    {/if}

    <!-- Need Help Footer -->
    <div
      class="mt-auto w-full bg-slate-100 rounded-xl p-5 flex items-center justify-between"
    >
      <div class="flex flex-col gap-0.5">
        <h4 class="text-[15px] font-semibold text-slate-900">Need Help?</h4>
        <span class="text-[12px] text-slate-500"
          >Contact our support team for assistance</span
        >
      </div>
      <button
        onclick={() => (showContact = !showContact)}
        class="bg-[#7d326f] hover:bg-[#5b2451] transition-colors rounded-lg px-6 py-2.5 text-white text-[13px] font-semibold shadow-sm cursor-pointer relative z-50"
      >
        Contact Support
      </button>
    </div>
  </div>
</div>

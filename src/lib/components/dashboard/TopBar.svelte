<script lang="ts">
  let { showSearch = true } = $props();
  import { Search, Bell } from "lucide-svelte";
  import { authState } from "$lib/state/auth.svelte.js";
  import {
    dbStore,
    acceptInvitation,
    rejectInvitation,
    syncRemoteData
  } from "$lib/state/db.svelte.js";
  import { goto } from "$app/navigation";
  import { Check, X } from "lucide-svelte";

  let isDropdownOpen = $state(false);

  let userNotifications = $derived(
    [
      ...dbStore.notifications.filter(
        (n: any) => n.userId === authState.user?.id
      )
    ].reverse()
  );

  let unreadCount = $derived(
    userNotifications.filter((n: any) => !n.read).length
  );

  function toggleRole() {
    if (!authState.user) return;

    // Toggle role between payer and payee
    const newRole = authState.user.role === "payer" ? "payee" : "payer";
    authState.user.role = newRole;

    // Refresh context and fetch appropriate data payload
    syncRemoteData(authState.user.id).then(() => {
      goto(`/?role=${newRole}`, { invalidateAll: true });
    });
  }
</script>

<div class="flex h-24 w-full items-center justify-between px-8 bg-slate-50">
  <!-- Left Side: Search Bar -->
  <div class="flex w-full max-w-xl items-center">
    {#if showSearch}
      <div class="relative w-full max-w-md">
        <div
          class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4"
        >
          <Search class="h-4 w-4 text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="Start Typing...."
          class="h-11 w-full rounded-2xl border-none bg-white pl-11 pr-4 text-sm text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-[#7d326f]/20 transition-all"
        />
        <button
          class="absolute inset-y-1.5 right-1.5 flex items-center gap-1.5 rounded-xl bg-[#e8e4f4] px-4 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-[#d8d2ec] cursor-pointer"
        >
          <Search class="h-3.5 w-3.5" />
          Search
        </button>
      </div>
    {/if}
  </div>

  <!-- Right Side: Role Switcher & Notifications -->
  <div class="flex items-center gap-6">
    <!-- Role Switcher (Hidden for Admin Impersonation to prevent profile mutation) -->
    {#if !authState.isAdminView}
      <button
        onclick={toggleRole}
        class="flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-[14px] font-medium text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300 cursor-pointer"
      >
        Switch to <span class="ml-1 font-semibold text-[#7d326f] capitalize"
          >{authState.user?.role === "payer" ? "Payee" : "Payer"}</span
        >
      </button>
    {/if}

    <!-- Notification Bell -->
    <div class="relative">
      <button
        onclick={() => (isDropdownOpen = !isDropdownOpen)}
        class="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 border border-slate-100 cursor-pointer"
      >
        <Bell
          class="h-[22px] w-[22px]"
          strokeWidth={1.5}
        />
        <!-- Notification Badge -->
        {#if unreadCount > 0}
          <span
            class="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white shadow-sm"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        {/if}
      </button>

      <!-- Notification Dropdown -->
      {#if isDropdownOpen}
        <div
          class="absolute right-0 top-14 z-50 w-80 rounded-2xl border border-slate-100 bg-white p-4 shadow-xl ring-1 ring-black/5"
        >
          <div class="mb-3 flex items-center justify-between px-1">
            <h3 class="font-semibold text-slate-800">Notifications</h3>
            {#if userNotifications.length > 0}
              <button
                class="text-xs font-medium text-[#7d326f] hover:underline cursor-pointer"
                >Mark all read</button
              >
            {/if}
          </div>

          <!-- Stacked Notification Container -->
          <div
            class="relative flex flex-col gap-2 max-h-[400px] overflow-y-auto px-1 pt-2 pb-4 scrollbar-hide"
          >
            {#if userNotifications.length === 0}
              <div
                class="py-10 text-center flex flex-col items-center justify-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200"
              >
                <Bell
                  class="h-8 w-8 text-slate-300 mb-2"
                  strokeWidth={1}
                />
                <p class="text-[13px] font-medium text-slate-500">
                  No new notifications
                </p>
              </div>
            {:else}
              <div class="flex flex-col space-y-[-12px]">
                {#each userNotifications as notification, i}
                  <!-- Dynamic Notification Item with "stack" feel -->
                  <div
                    class="group flex items-start gap-3 rounded-xl bg-white p-4 border border-slate-200 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-300 cursor-default relative"
                    style="z-index: {userNotifications.length -
                      i}; margin-bottom: 4px;"
                  >
                    <div
                      class="mt-1.5 h-2 w-2 shrink-0 rounded-full {notification.read
                        ? 'bg-slate-200'
                        : 'bg-[#7d326f] shadow-[0_0_0_3px_rgba(125,50,111,0.1)]'}"
                    ></div>
                    <div class="flex-1 min-w-0">
                      <p
                        class="text-[13px] font-bold text-slate-800 leading-tight truncate group-hover:whitespace-normal"
                      >
                        {notification.title}
                      </p>
                      <p
                        class="text-[12px] text-slate-500 mt-1.5 leading-relaxed"
                      >
                        {notification.message}
                      </p>
                      <div class="mt-3 flex items-center justify-between">
                        <p
                          class="text-[10px] font-bold text-slate-400 flex items-center gap-1.5"
                        >
                          <span class="h-1.5 w-1.5 rounded-full bg-slate-200"
                          ></span>
                          JUST NOW
                        </p>
                        {#if !notification.read}
                          <span
                            class="text-[9px] font-black text-[#7d326f] uppercase tracking-widest bg-[#7d326f]/5 px-1.5 py-0.5 rounded"
                            >New</span
                          >
                        {/if}
                      </div>
                    </div>

                    {#if notification.type === "invitation" && !notification.read}
                      <div
                        class="ml-auto flex flex-col gap-2 self-center pl-3 border-l border-slate-100"
                      >
                        <button
                          onclick={(e) => {
                            e.stopPropagation();
                            acceptInvitation(
                              notification.id,
                              notification.programId,
                              authState.user?.id || ""
                            );
                          }}
                          class="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7d326f]/5 text-[#7d326f] transition-all hover:bg-[#7d326f] hover:text-white cursor-pointer border border-[#7d326f]/10 shadow-sm"
                          title="Accept Invitation"
                        >
                          <Check
                            class="h-4 w-4"
                            strokeWidth={3}
                          />
                        </button>
                        <button
                          onclick={(e) => {
                            e.stopPropagation();
                            rejectInvitation(
                              notification.id,
                              notification.programId,
                              authState.user?.id || ""
                            );
                          }}
                          class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-400 transition-all hover:bg-slate-200 hover:text-slate-600 cursor-pointer border border-slate-200 shadow-sm"
                          title="Decline Invitation"
                        >
                          <X
                            class="h-4 w-4"
                            strokeWidth={3}
                          />
                        </button>
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
</style>

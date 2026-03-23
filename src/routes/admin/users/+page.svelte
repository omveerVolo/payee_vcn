<script lang="ts">
  import { Search, ChevronLeft, UserCog } from "lucide-svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { apiCall, dbStore } from "$lib/state/db.svelte.js";
  import { startViewing } from "$lib/state/auth.svelte.js";

  let searchQuery = $state("");
  let roleFilter = $derived($page.url.searchParams.get("role") || "payee");

  let payeeUsers = $state<any[]>([]);

  $effect(() => {
    if (roleFilter !== "payee") return;
    apiCall("/payees")
      .then((res) => {
        payeeUsers = Array.isArray(res) ? res : res?.payees || [];
      })
      .catch(() => {
        payeeUsers = [];
      });
  });

  let filteredUsers = $derived(
    (roleFilter === "payee" ? payeeUsers : dbStore.users)
      .filter((u: any) => u.role === roleFilter)
      .filter((u: any) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.businessName && u.businessName.toLowerCase().includes(q))
        );
      })
  );

  function handleUserSelect(user: any) {
    startViewing(user);
    goto("/");
  }
</script>

<svelte:head>
  <title>User Directory - Admin</title>
</svelte:head>

<div
  class="flex h-full w-full flex-col p-8 lg:p-12 relative overflow-y-auto min-h-screen bg-[#f5f6f8]"
>
  <button
    onclick={() => goto("/")}
    class="absolute top-8 left-8 flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900 z-20 cursor-pointer"
  >
    <ChevronLeft
      class="h-4 w-4"
      strokeWidth={2.5}
    />
    Back to Journey
  </button>

  <!-- Global Search Bar centered at top mimicking the wireframe -->
  <div class="absolute top-8 left-1/2 -translate-x-1/2 w-full max-w-lg z-10">
    <div
      class="flex h-12 w-full items-center overflow-hidden rounded-full border border-slate-200 bg-white px-2 shadow-sm transition-shadow hover:shadow-md"
    >
      <input
        type="text"
        placeholder="Search for {roleFilter === 'payer'
          ? 'Payers'
          : 'Payees'}..."
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
    class="mt-20 w-full rounded-2xl bg-white p-8 lg:p-12 shadow-sm flex flex-col overflow-hidden relative min-h-[500px]"
  >
    <h1
      class="text-2xl font-semibold tracking-tight text-slate-900 mb-8 capitalize flex items-center gap-2"
    >
      Select <span
        class={roleFilter === "payer" ? "text-[#8cdccb]" : "text-[#5b4897]"}
        >{roleFilter}</span
      > to View
    </h1>

    <div class="w-full overflow-x-auto pb-4">
      <div class="min-w-[800px] flex flex-col">
        <!-- Grid Header -->
        <div
          class="grid grid-cols-[1fr_2fr_2fr_1.5fr_1fr] gap-4 rounded-xl bg-[#e6dbf3] px-6 py-4 text-[13px] text-[#5b4897] font-semibold"
        >
          <div class="col-span-1 whitespace-nowrap">ID</div>
          <div class="col-span-1 whitespace-nowrap">Name / Business</div>
          <div class="col-span-1 whitespace-nowrap">Email</div>
          <div class="col-span-1 whitespace-nowrap">Role</div>
          <div class="col-span-1 whitespace-nowrap text-right">Action</div>
        </div>

        <!-- Grid Rows -->
        <div class="mt-3 flex flex-col gap-3">
          {#each filteredUsers as user}
            <div
              class="grid grid-cols-[1fr_2fr_2fr_1.5fr_1fr] items-center gap-4 rounded-xl border border-transparent bg-slate-50 px-6 py-4 transition-all hover:-translate-y-0.5 hover:shadow-sm"
            >
              <div
                class="col-span-1 font-mono text-slate-500 text-[12px] whitespace-nowrap truncate"
              >
                {user.id}
              </div>

              <div class="col-span-1 flex flex-col items-start xl:truncate">
                <span class="text-[14px] font-semibold text-slate-800"
                  >{user.name}</span
                >
                {#if user.businessName}
                  <span
                    class="text-[11px] text-slate-500 font-medium tracking-wide mt-0.5"
                    >{user.businessName}</span
                  >
                {/if}
              </div>

              <div class="col-span-1 text-[13px] text-slate-600 truncate">
                {user.email}
              </div>

              <div class="col-span-1">
                <span
                  class="inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-semibold tracking-wide border {user.role ===
                  'payer'
                    ? 'bg-[#e0f2fe] text-[#0ea5e9] border-[#bae6fd]'
                    : 'bg-[#f1f5f9] text-[#64748b] border-[#e2e8f0]'} capitalize"
                >
                  {user.role}
                </span>
              </div>

              <div class="col-span-1 flex justify-end">
                <button
                  onclick={() => handleUserSelect(user)}
                  class="flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-5 py-2 text-[12px] font-semibold tracking-wide text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 focus:outline-none cursor-pointer"
                >
                  <UserCog
                    class="h-4 w-4 text-[#7d326f]"
                    strokeWidth={2.5}
                  />
                  Handle User
                </button>
              </div>
            </div>
          {:else}
            <!-- Empty State -->
            <div
              class="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-slate-100 shadow-sm mt-4 w-full"
            >
              <div
                class="h-16 w-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-4"
              >
                <Search class="h-7 w-7 text-slate-400" />
              </div>
              <p class="text-[15px] font-semibold text-slate-700">
                No users found
              </p>
              <p
                class="text-[13px] text-slate-500 mt-1 text-center max-w-[300px]"
              >
                Search query yielded zero results for this role category.
              </p>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
</div>

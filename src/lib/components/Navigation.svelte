<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { authState, logout, stopViewing } from "$lib/state/auth.svelte.js";
  import { ShieldAlert } from "lucide-svelte";
  import {
    Home,
    CreditCard,
    FileText,
    Grid,
    Settings,
    User,
    LogOut,
    Menu,
    ArrowUpRight,
    X
  } from "@lucide/svelte";

  let isMobileMenuOpen = $state(false);
  let isSettingsOpen = $state(false);
  let isPayoutsOpen = $state(false);
  let hoverStates = $state({ payouts: false, profile: false });

  function toggleMobileMenu() {
    isMobileMenuOpen = !isMobileMenuOpen;
  }

  function closeMobileMenu() {
    isMobileMenuOpen = false;
  }

  function handleNavClick(e: MouseEvent, path: string) {
    if (path === "/logout") {
      e.preventDefault();
      logout();
      goto("/login");
    } else if (path === "/" && authState.isAdminView) {
      e.preventDefault();
      stopViewing();
      goto("/");
    }
    closeMobileMenu();
  }

  const mainNav = [
    {
      label: "Home",
      path: "/",
      icon: Home
    },
    {
      label: "Payouts",
      path: "/payouts",
      icon: CreditCard
    },
    {
      label: "Reports",
      path: "/reports",
      icon: FileText
    },
    {
      label: "Programs",
      path: "/programs",
      icon: Grid
    }
  ];

  const bottomNav = [
    {
      id: "settings",
      path: "#",
      icon: Settings
    },
    {
      path: "/account",
      icon: User
    },
    {
      path: "/logout",
      icon: LogOut
    }
  ];
</script>

<!-- Mobile Top Bar -->
<div
  class="md:hidden fixed top-0 left-0 w-full h-16 bg-[#1f1747] border-b border-[#1a133b] z-40 flex items-center justify-between px-4 text-white shadow-md"
>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <img
    src="/logo.png"
    alt="HDFC Bank Logo"
    class="h-12 w-auto object-contain cursor-pointer"
    onclick={() => {
      if (authState.isAdminView) {
        stopViewing();
        goto("/");
      } else {
        goto("/");
      }
    }}
  />
  <button
    onclick={toggleMobileMenu}
    aria-label="Toggle menu"
    class="p-2 -mr-2 text-white"
  >
    <Menu size={28} />
  </button>
</div>

<!-- Mobile Overlay -->
{#if isMobileMenuOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
    onclick={closeMobileMenu}
  ></div>
{/if}

<nav
  class="fixed top-0 left-0 z-50 flex h-screen w-28 flex-col items-center justify-between bg-[#1f1747] border-r border-[#1a133b] py-4 text-white shadow-xl transition-transform duration-300 ease-in-out md:translate-x-0 {isMobileMenuOpen
    ? 'translate-x-0'
    : '-translate-x-full'}"
>
  <div class="flex w-full flex-col items-center">
    <!-- Logo -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="pb-6 flex cursor-pointer flex-col items-center justify-center"
      onclick={() => {
        if (authState.isAdminView) {
          stopViewing();
          goto("/");
        } else {
          goto("/");
        }
      }}
    >
      <img
        src="/logo.png"
        alt="HDFC Bank Logo"
        class="h-36 w-auto object-contain"
      />
    </div>

    <!-- Main Nav -->
    <ul
      class="flex w-full flex-col gap-4 text-white font-thin {authState.isLoggedIn
        ? ''
        : 'opacity-40 pointer-events-none'}"
    >
      {#each mainNav as item}
        {@const isAdminDisabled =
          authState.user?.role?.toLowerCase() === "admin" &&
          (item.label === "Programs" || item.label === "Reports")}
        {@const Icon = item.icon}
        <li
          class="relative flex w-full justify-center group {isAdminDisabled
            ? 'opacity-40 cursor-not-allowed'
            : ''}"
          onmouseenter={() => {
            if (item.path === "/payouts") hoverStates.payouts = true;
          }}
          onmouseleave={() => {
            if (item.path === "/payouts") hoverStates.payouts = false;
          }}
        >
          <a
            href={item.path === "/payouts" && (authState.isAdminView ? authState.viewingAs?.role : authState.user?.role) === "payer" ? "/create-payout" : item.path}
            onclick={(e) => {
              if (isAdminDisabled) {
                e.preventDefault();
                return;
              }
              if (item.path === "/payouts") {
                if ((authState.isAdminView ? authState.viewingAs?.role : authState.user?.role) === "payer") {
                  hoverStates.payouts = false;
                  handleNavClick(e, "/create-payout");
                  return;
                }
                e.preventDefault();
                isPayoutsOpen = !isPayoutsOpen;
                isSettingsOpen = false; // Close others
              } else {
                handleNavClick(e, item.path);
              }
            }}
            class="group flex flex-col items-center justify-center w-[68px] h-[68px] rounded-2xl border-2 transition-all duration-200
              {$page.url.pathname === item.path ||
            (item.path === '/payouts' &&
              $page.url.pathname.startsWith('/payouts'))
              ? 'border-[#6e56cf] bg-[#2b2166] text-white shadow-sm'
              : 'border-transparent text-slate-400 hover:border-[#6e56cf]/60 hover:bg-[#2b2166]/50 hover:text-white'} {isAdminDisabled
              ? 'pointer-events-none'
              : ''}"
          >
            <span
              class="mb-1.5 flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
            >
              <Icon
                size={24}
                strokeWidth={1.5}
              />
            </span>
            <span class="text-[11px] leading-none font-medium tracking-wide">
              {item.label}
            </span>
          </a>

          <!-- Payouts Submenu Overlay (Payee Only or Admin Impersonating Payee) -->
          {#if item.path === "/payouts" && (authState.isAdminView ? authState.viewingAs?.role : authState.user?.role) === "payee"}
            <div
              class="absolute left-full ml-4 top-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl w-56 z-50 flex flex-col pointer-events-auto border border-slate-100 overflow-visible transition-all duration-200 {hoverStates.payouts
                ? 'opacity-100 visible'
                : 'opacity-0 invisible'}"
            >
              <div class="flex flex-col p-2 space-y-1 relative">
                <!-- Dropdown options -->
                <!-- Admin Read-Only Restructured Dropdown -->
                {#if authState.isAdminView}
                  <a
                    href="/payouts/approvals"
                    onclick={() => {
                      hoverStates.payouts = false;
                      closeMobileMenu();
                    }}
                    class="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 hover:text-[#0066cc]"
                  >
                    Approve Payouts
                  </a>
                  <a
                    href="/payouts/redeemed"
                    onclick={() => {
                      hoverStates.payouts = false;
                      closeMobileMenu();
                    }}
                    class="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 hover:text-[#0066cc]"
                  >
                    Redeemed Cards
                  </a>
                  <a
                    href="/payouts/settled"
                    onclick={() => {
                      hoverStates.payouts = false;
                      closeMobileMenu();
                    }}
                    class="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 hover:text-[#0066cc]"
                  >
                    Settled Payouts
                  </a>
                {:else}
                  <!-- Standard Payee Dropdown -->
                  <a
                    href="/payouts/new"
                    onclick={() => {
                      hoverStates.payouts = false;
                      closeMobileMenu();
                    }}
                    class="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 hover:text-[#0066cc]"
                  >
                    New Payout
                  </a>
                  <a
                    href="/payouts/redeemed"
                    onclick={() => {
                      hoverStates.payouts = false;
                      closeMobileMenu();
                    }}
                    class="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 hover:text-[#0066cc]"
                  >
                    Redeemed Cards
                  </a>
                  <a
                    href="/payouts/settled"
                    onclick={() => {
                      hoverStates.payouts = false;
                      closeMobileMenu();
                    }}
                    class="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 hover:text-[#0066cc]"
                  >
                    Settled Payouts
                  </a>
                  <a
                    href="/payouts/approvals"
                    onclick={() => {
                      hoverStates.payouts = false;
                      closeMobileMenu();
                    }}
                    class="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 hover:text-[#0066cc]"
                  >
                    Approve payouts
                  </a>
                {/if}
              </div>
            </div>
          {/if}

          <!-- Payouts Submenu Overlay removed for Payer as they now use direct click -->
        </li>
      {/each}
    </ul>
  </div>

  <!-- Bottom Section -->
  <div
    class="mt-auto w-full pt-8 {authState.isLoggedIn
      ? ''
      : 'opacity-40 pointer-events-none'}"
  >
    <ul class="flex w-full flex-col items-center gap-7 pb-4">
      {#each bottomNav as item}
        {@const Icon = item.icon}
        <li
          class="relative flex w-full justify-center group"
          onmouseenter={() => {
            if (item.id === "account" || item.path === "/account")
              hoverStates.profile = true;
            if (item.id === "settings") isSettingsOpen = true;
          }}
          onmouseleave={() => {
            if (item.id === "account" || item.path === "/account")
              hoverStates.profile = false;
            if (item.id === "settings") isSettingsOpen = false;
          }}
        >
          <a
            href={item.path}
            onclick={(e) => {
              if (item.id === "settings") {
                e.preventDefault();
              } else {
                hoverStates.profile = false;
                handleNavClick(e, item.path);
              }
            }}
            class="flex flex-col items-center text-white transition-colors hover:text-slate-300 {item.path ===
            '/logout'
              ? 'hover:text-rose-400'
              : ''} {item.id === 'settings' && isSettingsOpen
              ? 'text-indigo-300'
              : ''}"
          >
            <span
              class="flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
            >
              <Icon
                size={22}
                strokeWidth={1.5}
              />
            </span>
          </a>

          {#if item.id === "settings"}
            {#if isSettingsOpen}
              <!-- Settings Menu Popover Bridge -->
              <div
                class="absolute left-full top-1/2 -translate-y-1/2 pl-4 py-4 z-50"
              >
                <div
                  class="bg-white rounded-2xl shadow-xl w-56 flex flex-col pointer-events-auto border border-slate-100 overflow-visible"
                >
                  <div class="flex flex-col p-2 space-y-1 relative">
                    <!-- Dropdown options -->
                    <a
                      href="/settings/workflow"
                      onclick={() => (isSettingsOpen = false)}
                      class="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 hover:text-[#0066cc]"
                    >
                      Workflow
                      <ArrowUpRight
                        class="h-4 w-4 text-slate-900"
                        strokeWidth={2.5}
                      />
                    </a>
                    <a
                      href="/settings/users"
                      onclick={() => (isSettingsOpen = false)}
                      class="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 hover:text-[#0066cc]"
                    >
                      Users and roles
                      <ArrowUpRight
                        class="h-4 w-4 text-slate-900"
                        strokeWidth={2.5}
                      />
                    </a>
                  </div>
                </div>
              </div>
            {/if}
          {:else if item.path === "/account" && authState.user}
            <!-- User Tooltip -->
            <div
              class="absolute left-full ml-1 top-1/2 -translate-y-1/2 transition-all duration-200 bg-slate-800 p-3 rounded-xl shadow-2xl border border-slate-700/80 w-52 z-[60] flex flex-col gap-0.5 pointer-events-auto text-left {hoverStates.profile
                ? 'visible opacity-100 translate-x-2'
                : 'invisible opacity-0 translate-x-0'}"
            >
              <!-- Arrow -->
              <div
                class="absolute w-2.5 h-2.5 bg-slate-800 border-l border-b border-slate-700/80 -left-[5px] top-1/2 -translate-y-1/2 rotate-45 rounded-[2px]"
              ></div>

              <div class="font-semibold text-sm text-slate-100 truncate pr-2">
                {authState.user.name}
              </div>
              <div class="text-xs text-slate-400 truncate pr-2">
                {authState.user.email}
              </div>
              <div
                class="text-[10px] text-slate-500 font-mono mt-1.5 pt-1.5 border-t border-slate-700/50 truncate flex flex-col gap-1"
              >
                <span>ID: {authState.user.id}</span>
                {#if authState.isAdminView}
                  <span
                    class="text-rose-400/80 uppercase tracking-widest font-black text-[9px] mt-0.5"
                    >Admin Impersonating</span
                  >
                {/if}
              </div>

              <!-- Role Switcher -->
              <button
                class="mt-2 w-full py-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors border border-slate-600/50 cursor-pointer"
                onclick={(e) => {
                  e.stopPropagation();
                  if (authState.user) {
                    authState.user.role =
                      authState.user.role === "payer" ? "payee" : "payer";
                    goto(`/?role=${authState.user.role}`, {
                      invalidateAll: true
                    });
                  }
                }}
              >
                Switch to {authState.user.role === "payer" ? "Payee" : "Payer"}
              </button>
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  </div>
</nav>

<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { authState, logout, stopViewing } from "$lib/state/auth.svelte.js";
  import {
    ArrowUpRight,
    Menu,
  } from "lucide-svelte";

  let isMobileMenuOpen = $state(false);
  let isSettingsOpen = $state(false);
  let isPayoutsOpen = $state(false);
  let hoverStates = $state<Record<string, boolean>>({});

  function toggleMobileMenu() {
    isMobileMenuOpen = !isMobileMenuOpen;
  }

  function closeMobileMenu() {
    isMobileMenuOpen = false;
  }

  function handleNavClick(e: MouseEvent, path: string, id?: string) {
    if (path === "/logout") {
      e.preventDefault();
      logout();
      goto("/login");
    } else if (path === "/" && authState.isAdminView) {
      e.preventDefault();
      stopViewing();
      goto("/");
    } else if (path === "#") {
      e.preventDefault();
    }
    closeMobileMenu();
  }

  const currentTheme = $derived(authState.theme);
  const mainNav = $derived(currentTheme.navigation.main);
  const bottomNav = $derived(currentTheme.navigation.bottom);
</script>

<!-- Mobile Top Bar -->
<div
  class="md:hidden fixed top-0 left-0 w-full h-16 z-40 flex items-center justify-between px-4 text-white shadow-md transition-colors duration-300"
  style="background-color: {currentTheme.colors.sidebarBg}; border-bottom: 1px solid {currentTheme.colors.sidebarBorder};"
>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <img
    src="/logo.png"
    alt="Logo"
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
  class="fixed top-0 left-0 z-50 flex h-screen w-28 flex-col items-center justify-between py-4 text-white shadow-xl transition-all duration-300 ease-in-out md:translate-x-0 {isMobileMenuOpen
    ? 'translate-x-0'
    : '-translate-x-full'}"
  style="background-color: {currentTheme.colors.sidebarBg}; border-right: 1px solid {currentTheme.colors.sidebarBorder};"
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
        alt="Logo"
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
        {@const isActive = $page.url.pathname === item.path || (item.path !== '/' && $page.url.pathname.startsWith(item.path))}
        
        <li
          class="relative flex w-full justify-center group {isAdminDisabled
            ? 'opacity-40 cursor-not-allowed'
            : ''}"
          onmouseenter={() => { if (item.children) hoverStates[item.label] = true; }}
          onmouseleave={() => { if (item.children) hoverStates[item.label] = false; }}
        >
          <a
            href={item.path}
            onclick={(e) => {
              if (isAdminDisabled) {
                e.preventDefault();
                return;
              }
              if (item.children) {
                e.preventDefault();
                // Toggle logic if needed, but currently hover based
              } else {
                handleNavClick(e, item.path);
              }
            }}
            class="group flex flex-col items-center justify-center w-[68px] h-[68px] rounded-2xl border-2 transition-all duration-200
              {isActive
                ? 'text-white shadow-sm'
                : 'border-transparent text-slate-400 hover:text-white'} {isAdminDisabled
                ? 'pointer-events-none'
                : ''}"
            style="
              background-color: {isActive ? currentTheme.colors.navActiveBg : 'transparent'};
              border-color: {isActive ? currentTheme.colors.navActiveBorder : 'transparent'};
            "
            onmouseenter={(e) => {
              if (!isActive) {
                const target = e.currentTarget as HTMLElement;
                target.style.backgroundColor = currentTheme.colors.navHoverBg;
                target.style.borderColor = currentTheme.colors.navHoverBorder;
              }
            }}
            onmouseleave={(e) => {
              if (!isActive) {
                const target = e.currentTarget as HTMLElement;
                target.style.backgroundColor = 'transparent';
                target.style.borderColor = 'transparent';
              }
            }}
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

          <!-- Submenu Overlay Wrapper (The "Bridge") -->
          {#if item.children && hoverStates[item.label]}
            <div
              class="absolute left-full top-1/2 -translate-y-1/2 pl-4 py-8 z-50 pointer-events-auto"
            >
              <div
                class="bg-white rounded-2xl shadow-[0_10px_30px_-5px_rgba(0,0,0,0.15)] w-56 flex flex-col border border-slate-100 overflow-hidden"
              >
                <div class="flex flex-col p-2 space-y-1 relative">
                  {#each item.children as child}
                    <a
                      href={child.path}
                      onclick={() => {
                        hoverStates[item.label] = false;
                        closeMobileMenu();
                      }}
                      class="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 transition-colors"
                      onmouseenter={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = currentTheme.colors.primary + '10';
                        (e.currentTarget as HTMLElement).style.color = currentTheme.colors.primary;
                      }}
                      onmouseleave={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                        (e.currentTarget as HTMLElement).style.color = '';
                      }}
                    >
                      {child.label}
                    </a>
                  {/each}
                </div>
              </div>
            </div>
          {/if}
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
        {@const isItemSettingsOpen = item.id === "settings" && isSettingsOpen}
        
        <li
          class="relative flex w-full justify-center group"
          onmouseenter={() => {
            if (item.id === "account") hoverStates.profile = true;
            if (item.id === "settings") isSettingsOpen = true;
          }}
          onmouseleave={() => {
            if (item.id === "account") hoverStates.profile = false;
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
                handleNavClick(e, item.path, item.id);
              }
            }}
            class="flex flex-col items-center text-white transition-colors hover:text-slate-300 {item.id ===
            'logout'
              ? 'hover:text-rose-400'
              : ''}"
            style="color: {isItemSettingsOpen ? currentTheme.colors.navActiveBorder : 'white'}"
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

          {#if item.id === "settings" && item.children && isSettingsOpen}
            <!-- Settings Menu Popover Bridge -->
            <div
              class="absolute left-full top-1/2 -translate-y-1/2 pl-4 py-4 z-50"
            >
              <div
                class="bg-white rounded-2xl shadow-xl w-56 flex flex-col pointer-events-auto border border-slate-100 overflow-visible"
              >
                <div class="flex flex-col p-2 space-y-1 relative">
                  {#each item.children as child}
                    <a
                      href={child.path}
                      onclick={() => (isSettingsOpen = false)}
                      class="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 transition-colors"
                      onmouseenter={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = currentTheme.colors.primary + '10';
                        (e.currentTarget as HTMLElement).style.color = currentTheme.colors.primary;
                      }}
                      onmouseleave={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                        (e.currentTarget as HTMLElement).style.color = '';
                      }}
                    >
                      {child.label}
                      <ArrowUpRight
                        class="h-4 w-4 text-slate-900"
                        strokeWidth={2.5}
                      />
                    </a>
                  {/each}
                </div>
              </div>
            </div>
          {:else if item.id === "account" && authState.user}
            <!-- User Tooltip Wrapper (The "Bridge") -->
            <div
              class="absolute left-full top-1/2 -translate-y-1/2 pl-2 py-8 z-[60] pointer-events-auto transition-all duration-200
                {hoverStates.profile ? 'visible opacity-100 translate-x-0' : 'invisible opacity-0 -translate-x-2'}"
            >
              <div
                class="p-3 rounded-xl shadow-2xl border w-52 flex flex-col gap-0.5 relative"
                style="background-color: {currentTheme.colors.sidebarBg}; border-color: {currentTheme.colors.sidebarBorder};"
              >
                <!-- Arrow -->
                <div
                  class="absolute w-2.5 h-2.5 border-l border-b -left-[5px] top-1/2 -translate-y-1/2 rotate-45 rounded-[2px]"
                  style="background-color: {currentTheme.colors.sidebarBg}; border-color: {currentTheme.colors.sidebarBorder};"
                ></div>

                <div class="font-semibold text-sm text-white truncate pr-2">
                  {authState.user.name}
                </div>
                <div class="text-xs text-slate-400 truncate pr-2">
                  {authState.user.email}
                </div>
                <div
                  class="text-[10px] text-slate-500 font-mono mt-1.5 pt-1.5 border-t truncate flex flex-col gap-1"
                  style="border-color: {currentTheme.colors.sidebarBorder}"
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
                  class="mt-2 w-full py-2 rounded-lg text-xs font-semibold text-slate-200 transition-colors border cursor-pointer"
                  style="background-color: {currentTheme.colors.navActiveBg}; border-color: {currentTheme.colors.sidebarBorder}"
                  onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = currentTheme.colors.navHoverBg; }}
                  onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = currentTheme.colors.navActiveBg; }}
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
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  </div>
</nav>

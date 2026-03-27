<script lang="ts">
  import { ChevronDown } from "lucide-svelte";
  import { onMount } from "svelte";
  import { authState } from "$lib/state/auth.svelte.js";

  let { 
    id = "", 
    value = $bindable(""), 
    options = [], 
    disabled = false 
  }: { 
    id?: string; 
    value?: string; 
    options?: string[]; 
    disabled?: boolean 
  } = $props();

  let isOpen = $state(false);
  let elementRef: HTMLDivElement | undefined = $state();
  const currentTheme = $derived(authState.theme);

  function toggleDropdown() {
    if (!disabled) {
      isOpen = !isOpen;
    }
  }

  function selectOption(option: string) {
    value = option;
    isOpen = false;
  }

  // Close dropdown on outside click
  onMount(() => {
    function handleClickOutside(event: MouseEvent) {
      if (elementRef && !elementRef.contains(event.target as Node)) {
        isOpen = false;
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  });
</script>

<div
  class="relative w-full"
  bind:this={elementRef}
>
  <input
    type="hidden"
    {id}
    bind:value
  />

  <button
    type="button"
    {disabled}
    class="flex h-12 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 outline-none transition-all hover:border-slate-300 disabled:opacity-50 disabled:bg-slate-50 disabled:cursor-not-allowed disabled:hover:border-slate-200"
    onfocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = currentTheme.colors.primary; (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 1px ${currentTheme.colors.primary}`; }}
    onblur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
    onclick={toggleDropdown}
  >
    <span class="truncate">{value || "Select an option"}</span>
    <ChevronDown
      class="h-4 w-4 text-slate-400 transition-transform duration-200 {isOpen
        ? 'rotate-180'
        : ''}"
      strokeWidth={2}
    />
  </button>

  {#if isOpen}
    <div
      class="absolute left-0 mt-2 w-full z-50 rounded-xl border border-slate-100 bg-white p-1.5 shadow-xl ring-1 ring-black/5"
    >
      <div class="flex max-h-60 flex-col overflow-y-auto">
        {#each options as option}
          <button
            type="button"
            class="flex items-center w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-slate-50"
            style="color: {value === option ? currentTheme.colors.primary : 'rgb(51 65 85)'}; background-color: {value === option ? currentTheme.colors.primary + '10' : 'transparent'}"
            onclick={() => selectOption(option)}
          >
            {option}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>

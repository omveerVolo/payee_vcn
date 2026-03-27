<script lang="ts">
  import { authState } from "$lib/state/auth.svelte.js";
  let {
    title,
    value,
    variant = "default",
    trend = null,
    trendUp = true,
    width = "w-full"
  } = $props();

  const isHighlighted = $derived(variant === "primary");
  const currentTheme = $derived(authState.theme);
  const cardStyles = $derived(isHighlighted 
    ? { 
        bg: currentTheme.colors.cardBgHighlighted, 
        border: currentTheme.colors.cardBorderHighlighted,
        title: currentTheme.colors.cardTitle,
        value: currentTheme.colors.cardValue
      }
    : { 
        bg: currentTheme.colors.cardBg, 
        border: currentTheme.colors.cardBorder,
        title: currentTheme.colors.cardTitle,
        value: currentTheme.colors.cardValue
      }
  );
</script>

<div
  class="flex h-[130px] {width} flex-col justify-between rounded-xl border p-5 shadow-sm transition-all cursor-pointer hover:-translate-y-1"
  style="border-color: {cardStyles.border}; 
         background-color: {cardStyles.bg};"
>
  <div class="flex w-full items-start justify-between">
    <h3 class="text-[13px] font-semibold" style="color: {cardStyles.title}">
      {title}
    </h3>
  </div>
  <div class="flex w-full items-end">
    <p
      class="text-[36px] font-semibold tracking-tight leading-none"
      style="color: {cardStyles.value}"
    >
      {value}
    </p>
  </div>
</div>

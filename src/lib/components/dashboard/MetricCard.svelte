<script lang="ts">
  let {
    title,
    value,
    variant = "default",
    trend = null,
    trendUp = true,
    width = "w-full"
  } = $props();

  const isHighlighted = $derived(variant === "primary");
</script>

<div
  class="flex h-[130px] {width} flex-col justify-between rounded-xl border-2 border-[#5b4897] bg-[#f8f6fc] p-5 shadow-sm transition-all cursor-pointer hover:-translate-y-1"
>
  <div class="flex w-full items-start justify-between">
    <h3 class="text-[13px] font-semibold text-slate-900">
      {title}
    </h3>
  </div>
  <div class="flex w-full items-end">
    <p
      class="text-[36px] font-semibold tracking-tight text-[#5b4897] leading-none"
    >
      {value}
    </p>
  </div>
</div>

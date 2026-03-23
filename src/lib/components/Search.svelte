<script>
  import { Search } from "@lucide/svelte";
</script>

<div class="flex w-full max-w-xl items-center rounded-[32px] bg-white p-1.5 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
  <input
    type="text"
    placeholder="Start Typing....."
    class="flex-1 bg-transparent px-6 py-3 text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400"
  />
  <button
    class="flex items-center gap-2 rounded-full bg-[#e8dbfc] px-6 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-[#dpc9fa]"
  >
    <Search size={18} strokeWidth={2} />
    <span>Search</span>
  </button>
</div>

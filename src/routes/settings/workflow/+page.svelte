<script lang="ts">
  import TopBar from "$lib/components/dashboard/TopBar.svelte";
  import WorkflowSetup from "$lib/components/dashboard/WorkflowSetup.svelte";
  import { goto } from "$app/navigation";
</script>

<svelte:head>
  <title>Settings: Workflow - HDFC Bank</title>
</svelte:head>

<div class="flex min-h-screen w-full flex-col bg-slate-50 relative">
  <TopBar showSearch={false} />

  <div class="flex w-full flex-col items-center justify-start p-8 pt-6 pb-20">
    <div class="w-full max-w-[1400px]">
      <WorkflowSetup
        on:cancel={() => goto("/")}
        on:save={() => goto("/")}
      />
    </div>
  </div>
</div>

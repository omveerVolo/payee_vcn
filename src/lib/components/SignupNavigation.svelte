<script lang="ts">
  import {
    Phone,
    Building2,
    PieChart,
    UserCircle,
    FileCheck
  } from "@lucide/svelte";

  export let currentStep = 1;

  const getStepIconClasses = (stepIndex: number, currentStep: number) => {
    // If the step matches the current step, it's white icon on dark purple, with left border
    // If it's a completed step or pending step, it has different styles.
    // Based on wireframes, active step has a rounded purple square background with white icon,
    // and a blue left border.

    if (stepIndex === currentStep) {
      return "text-white bg-[#3b2b73] rounded-xl ring-2 ring-[#3b2b73]/50";
    }
    return "text-slate-300 hover:text-white";
  };
</script>

<div
  class="fixed top-0 left-0 z-50 flex h-screen w-[100px] flex-col items-center bg-[#1f1747] py-6 text-white shadow-xl"
>
  <!-- Logo -->
  <div class="mb-10 flex cursor-pointer flex-col items-center justify-center">
    <!-- Simplified logo representing HDFC since we need to match design roughly -->
    <div
      class="relative flex h-14 w-14 items-center justify-center bg-[#002169]"
    >
      <div class="absolute inset-2 border-4 border-[#e92b2d]"></div>
      <div class="absolute h-2 w-8 bg-[#002169]"></div>
      <div class="absolute h-8 w-2 bg-[#002169]"></div>
    </div>
    <span
      class="mt-2 text-[8px] font-semibold text-white tracking-widest text-center uppercase leading-tight"
    >
      HDFC BANK
    </span>
  </div>

  <!-- Stepper Icons -->
  <ul class="flex w-full flex-col gap-6 px-4">
    <li class="relative flex w-full justify-center">
      <!-- Active Border -->
      {#if currentStep === 1}
        <div
          class="absolute -left-4 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-md bg-[#0066cc]"
        ></div>
      {/if}
      <div
        class="flex h-12 w-12 items-center justify-center transition-all {getStepIconClasses(
          1,
          currentStep
        )}"
      >
        <Phone
          strokeWidth={2.5}
          size={22}
        />
      </div>
    </li>

    <li class="relative flex w-full justify-center">
      {#if currentStep === 2 || currentStep === 3}
        <div
          class="absolute -left-4 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-md bg-[#0066cc]"
        ></div>
      {/if}
      <div
        class="flex h-12 w-12 items-center justify-center transition-all {getStepIconClasses(
          currentStep === 2 || currentStep === 3 ? currentStep : 2,
          currentStep
        )}"
      >
        <Building2
          strokeWidth={2.5}
          size={22}
        />
      </div>
    </li>

    <li class="relative flex w-full justify-center">
      {#if currentStep === 3}
        <div
          class="absolute -left-4 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-md bg-[#0066cc]"
        ></div>
      {/if}
      <!-- Let's just use PieChart for 3 as placeholder. Wireframe shows building for 2 and search for 3?
           Wait, let's look closer at wireframe 4: Phone, Building, Search/Chart, Person/Building, Document. -->
      <div
        class="flex h-12 w-12 items-center justify-center transition-all {getStepIconClasses(
          3,
          currentStep
        )}"
      >
        <PieChart
          strokeWidth={2.5}
          size={22}
        />
      </div>
    </li>

    <li class="relative flex w-full justify-center">
      {#if currentStep === 4}
        <div
          class="absolute -left-4 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-md bg-[#0066cc]"
        ></div>
      {/if}
      <div
        class="flex h-12 w-12 items-center justify-center transition-all {getStepIconClasses(
          4,
          currentStep
        )}"
      >
        <UserCircle
          strokeWidth={2.5}
          size={22}
        />
      </div>
    </li>

    <li class="relative flex w-full justify-center">
      {#if currentStep === 5}
        <div
          class="absolute -left-4 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-md bg-[#0066cc]"
        ></div>
      {/if}
      <div
        class="flex h-12 w-12 items-center justify-center transition-all {getStepIconClasses(
          5,
          currentStep
        )}"
      >
        <FileCheck
          strokeWidth={2.5}
          size={22}
        />
      </div>
    </li>
  </ul>
</div>

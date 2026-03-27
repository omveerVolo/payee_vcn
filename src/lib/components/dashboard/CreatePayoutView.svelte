<script lang="ts">
  import { ArrowLeft, Upload, Calendar, User, FileUp } from "lucide-svelte";
  import { createEventDispatcher, untrack } from "svelte";
  import { slide } from "svelte/transition";
  import TopBar from "$lib/components/dashboard/TopBar.svelte";
  import CustomSelect from "$lib/components/ui/CustomSelect.svelte";
  import { apiCall, dbStore, createPayout } from "$lib/state/db.svelte.js";
  import { authState } from "$lib/state/auth.svelte.js";

  const dispatch = createEventDispatcher();
  const currentTheme = $derived(authState.theme);

  // Contextual resolver
  let activeUser = $derived(
    authState.isAdminView ? authState.viewingAs : authState.user
  );

  // Form State
  let journey = $state<"selection" | "single" | "bulk">("selection");
  let bulkStep = $state<"program" | "upload">("program");
  let accessiblePrograms = $derived(
    dbStore.programs.filter((p: any) => p.payerId === activeUser?.id)
  );
  let programOptions = $derived(
    accessiblePrograms.length > 0
      ? accessiblePrograms.map((p: any) => p.name)
      : ["No Active Programs"]
  );

  let selectedProgram = $state("");

  // Automatically select the first program so the payee ladder opens correctly
  $effect(() => {
    if (
      programOptions.length > 0 &&
      !programOptions.includes(selectedProgram) &&
      programOptions[0] !== "No Active Programs"
    ) {
      selectedProgram = programOptions[0];
    }
  });

  let realProgram = $derived(
    accessiblePrograms.find((p: any) => p.name === selectedProgram) as any
  );
  let programPayees = $state<any[]>([]);
  let payeeOptions = $derived(
    programPayees.length > 0
      ? programPayees.map((p: any) => p.businessName || p.name || p.email)
      : ["No Payees Available"]
  );

  let selectedPayee = $state("");

  $effect(() => {
    if (payeeOptions.length > 0 && !payeeOptions.includes(selectedPayee)) {
      selectedPayee = payeeOptions[0];
    }
  });

  let selectedPayeeId = $derived.by(() => {
    const match = programPayees.find(
      (p: any) => (p.businessName || p.name || p.email) === selectedPayee
    );
    return match?.id || match?.payeeId || match?.userId || "";
  });

  $effect(() => {
    const programId = realProgram?.id;
    if (!programId) {
      programPayees = [];
      return;
    }
    apiCall(`/programs/payees?programId=${programId}`)
      .then((res) => {
        programPayees = res?.payees || [];
      })
      .catch(() => {
        programPayees = [];
      });
  });
  let currency = $state("INR");
  let amount = $state("10,000");
  let payThroughCard = $state("HDFC pay");
  let validityOptions = ["7 Days", "1 Month", "3 Months"];
  let selectedDateRange = $state("1 Month");
  let showDateDropdown = $state(false);
  let txId = $state("");
  let deductionSetting = $state("None");
  let tdsPercentage = $state("");

  let dynamicFieldValues = $state<Record<string, any>>({});

  $effect(() => {
    // Re-initialize dynamic fields whenever the selected program changes
    if (realProgram?.additionalFields) {
      untrack(() => {
        const newVals: Record<string, any> = {};
        realProgram.additionalFields.forEach((f: any) => {
          // Keep existing values avoiding resets typing on unrelated rerenders
          newVals[f.key] =
            dynamicFieldValues[f.key] !== undefined
              ? dynamicFieldValues[f.key]
              : "";
        });
        dynamicFieldValues = newVals;
      });
    } else {
      dynamicFieldValues = {};
    }
  });

  let computedDateRangeText = $derived.by(() => {
    const start = new Date();
    const end = new Date();

    if (selectedDateRange === "7 Days") {
      end.setDate(start.getDate() + 7);
    } else if (selectedDateRange === "1 Month") {
      end.setMonth(start.getMonth() + 1);
    } else if (selectedDateRange === "3 Months") {
      end.setMonth(start.getMonth() + 3);
    }

    const formatOpts: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      year: "numeric"
    };
    const endStr = end.toLocaleDateString("en-US", formatOpts);

    return `${endStr}`;
  });

  // Modal States
  let showPreview = $state(false);
  let showSuccess = $state(false);
  let isPreviewLoading = $state(false);
  let validationError = $state("");

  // CSV Upload State
  let fileInput = $state<HTMLInputElement>();
  let csvData = $state<any[]>([]);

  let mismatchedRows = $derived.by(() => {
    return csvData.filter((row) => !row.isValid);
  });

  let isUploadingCsv = $state(false);
  let isDraggingFile = $state(false);
  let csvUploadError = $state("");
  // Download Template State
  let isTemplateReady = $state(false);

  function downloadTemplate() {
    isTemplateReady = true;

    // Construct headers: Core fields + any required custom fields from the program
    const coreHeaders = [
      "Program Name",
      "Email",
      "Transaction ID",
      "Tracking ID",
      "Amount",
      "TDS"
    ];
    const customHeaders =
      realProgram?.additionalFields?.map((f: any) => f.key) || [];
    const allHeaders = [...coreHeaders, ...customHeaders];

    // Create simple CSV content with headers row
    let csvContent = allHeaders.join(",") + "\n";

    // Add example row pre-filled with the current Program Name and helpful placeholders
    const exampleRow = [
      realProgram?.name || "Program Name",
      "finance@example.com", // Email
      `TXN${Math.floor(Math.random() * 1000000)}`, // Transaction ID
      `TRK${Math.floor(Math.random() * 1000000)}`, // Tracking ID
      "50000", // Amount
      "10" // TDS
    ];

    // Add hyphens for any remaining custom program fields
    for (let i = exampleRow.length; i < allHeaders.length; i++) {
      exampleRow.push("-");
    }

    csvContent += exampleRow.join(",") + "\n";

    // Trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const cleanProgramName =
      realProgram?.name?.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "payouts";
    link.download = `${cleanProgramName}_template.csv`;
    document.body.appendChild(link);
    link.click();

    // Add a slight delay before cleaning up the DOM and object URL
    // Normal Chrome tabs with heavy extensions can cancel the download if the element is removed synchronously
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 200);

    // We intentionally do NOT set isTemplateReady to false here,
    // otherwise it replaces the button with a permanent loading spinner.
  }
  let payeeSearchTerm = $state("");
  let filteredPayees = $derived.by(() => {
    if (!payeeSearchTerm.trim()) return [];
    const term = payeeSearchTerm.toLowerCase();
    return programPayees
      .filter(
        (p: any) =>
          p.email?.toLowerCase().includes(term) ||
          p.name?.toLowerCase().includes(term) ||
          p.businessName?.toLowerCase().includes(term)
      )
      .slice(0, 5); // Limit to top 5 results for clarity
  });

  function copyToClipboard(text: string) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text);
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "absolute";
      textArea.style.left = "-999999px";
      document.body.prepend(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
      } catch (error) {
        console.error(error);
      } finally {
        textArea.remove();
      }
    }
  }

  $effect(() => {
    if (journey === "bulk" && bulkStep === "program") {
      isTemplateReady = false;
      const t = setTimeout(() => {
        isTemplateReady = true;
      }, 1000);
      return () => clearTimeout(t);
    }
  });

  async function processFile(file: File) {
    if (!file) return;
    csvUploadError = "";

    // Prevent bulk upload if the program has no enrolled payees
    if (programPayees.length === 0) {
      csvUploadError =
        "This program has no enrolled payees. Please invite and ensure payees accept the invitation before performing bulk payouts.";
      return;
    }

    try {
      const text = await file.text();
      const rows = text.split(/\r?\n/);
      if (rows.length > 1) {
        const headers = rows[0].split(",");
        const programNameIndex = headers.findIndex(
          (h) => h.trim().replace(/^"|"$/g, "") === "Program Name"
        );
        if (programNameIndex !== -1) {
          const firstDataRow = rows[1].split(",");
          const csvProgramName = firstDataRow[programNameIndex]
            ?.trim()
            .replace(/^"|"$/g, "");
          if (csvProgramName && csvProgramName !== selectedProgram) {
            csvUploadError = `Warning: The Program Name in the CSV ("${csvProgramName}") does not match the currently selected program ("${selectedProgram}").`;
            return;
          }
        }
      }
    } catch (e) {}

    isUploadingCsv = true;
    bulkStep = "upload"; // Instantly switch UI text to upload state

    const realProgram = (accessiblePrograms as any[]).find(
      (p: any) => p.name === selectedProgram
    );
    const pid = realProgram ? realProgram.id : "prog_med_01";
    const payerId = activeUser?.id || "";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("payerId", payerId);
    formData.append("programId", pid);

    try {
      const response = await apiCall("/bulk-upload", "POST", formData);

      const validRecords = response?.insertedRecords || response?.rows || [];
      const invalidRecords =
        response?.invalidDetails || response?.invalidRows || [];

      // If we have no records at all AND there's an error, block and show error
      if (
        response &&
        (response.success === false || response.error) &&
        validRecords.length === 0 &&
        invalidRecords.length === 0
      ) {
        csvUploadError =
          response.error || response.message || "Failed to process CSV file.";
        bulkStep = "program";
        isUploadingCsv = false;
        if (fileInput) fileInput.value = "";
        return;
      }

      if (validRecords.length > 0 || invalidRecords.length > 0) {
        // Map backend response format to frontend format
        const mappedValid = validRecords.map((r: any, idx: number) => {
          const email = r.Email || r.email || "";
          const isEnrolled = programPayees.some(
            (p) => String(p.email).toLowerCase() === String(email).toLowerCase()
          );
          return {
            id: r.id || r.payeeId || `csv_valid_${idx}`,
            selected: isEnrolled,
            email: email,
            payeeId: r.payeeId || r.id, // Fall back to MongoDB ID or whatever PK the backend sent
            businessName: r.businessName || r["Business Name"] || "",
            amount:
              r.Amount || (r.amount !== undefined && r.amount !== null
                ? r.amount.toString()
                : "0"),
            currency: currency || "INR",
            extraFields: r.extraFields || {},
            validity: r.validity || "1 Month",
            tds: r.TDS || r.tds || 0,
            isValid: isEnrolled,
            error: isEnrolled
              ? ""
              : `Payee with email ${email} is not enrolled in this program.`
          };
        });

        const mappedInvalid = invalidRecords.map(
          (errorDetail: any, idx: number) => {
            const r = errorDetail.data || {};
            return {
              id: `csv_invalid_${idx}`,
              selected: false,
              email: r.Email || r.email || "Unknown",
              payeeId: "",
              businessName: r["Business Name"] || r.businessName || "",
              amount: r.Amount || r.amount || "0",
              currency: currency || "INR",
              extraFields: r.extraFields || {
                invoice_number: r.invoice_number || r.InvoiceNumber || "",
                build: r.Build || r.build || ""
              },
              validity: "1 Month",
              tds: r.TDS || r.tds || 0,
              isValid: false,
              error: errorDetail.error
            };
          }
        );

        csvData = [...mappedValid, ...mappedInvalid];
      } else {
        csvUploadError =
          response?.error ||
          "Invalid CSV format from server or response missing rows";
        bulkStep = "program";
        console.error(
          "Invalid CSV format from server or response missing rows"
        );
      }
    } catch (err) {
      console.error("Error bulk uploading CSV", err);
    } finally {
      isUploadingCsv = false;
      if (fileInput) fileInput.value = ""; // reset input
    }
  }

  async function handleCsvUpload(e: Event) {
    const target = e.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) return;
    await processFile(target.files[0]);
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (selectedProgram !== "No Active Programs") {
      isDraggingFile = true;
    }
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    isDraggingFile = false;
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDraggingFile = false;
    if (selectedProgram === "No Active Programs") return;

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === "text/csv" || file.name.endsWith(".csv")) {
        processFile(file);
      } else {
        validationError = "Please select a valid CSV file.";
      }
    }
  }

  function handleCancel() {
    if (journey === "bulk" && bulkStep === "upload") {
      bulkStep = "program";
      csvData = [];
    } else if (journey !== "selection") {
      journey = "selection";
      bulkStep = "program";
      csvData = [];
      showPreview = false;
    } else {
      dispatch("cancel");
    }
  }

  function handlePreview() {
    validationError = ""; // Clear old errors
    if (csvData.length > 0) {
      isPreviewLoading = true;
      // Mocking an API call
      setTimeout(() => {
        isPreviewLoading = false;
        showPreview = true;
      }, 1500);
    } else {
      // Validate Single Payout
      if (!selectedPayee || selectedPayee === "No Payees Available") {
        validationError = "Please select a valid Business receiving payout.";
        return;
      }

      const parsedAmount = parseFloat(amount.toString().replace(/,/g, ""));
      if (!parsedAmount || parsedAmount <= 0 || isNaN(parsedAmount)) {
        validationError = "Please enter a valid Payable Amount greater than 0.";
        return;
      }

      // Validate Custom Fields
      if (realProgram?.additionalFields?.length > 0) {
        for (const field of realProgram.additionalFields) {
          if (field.required && !dynamicFieldValues[field.key]) {
            validationError = `Please enter the required field: ${field.label || field.key}`;
            return;
          }
        }
      }

      showPreview = true;
    }
  }

  function handleSubmit() {
    // Generate the mocked payout record reacting globally on the Dashboard
    // Find the real program ID so it filters correctly
    const realProgram = (accessiblePrograms as any[]).find(
      (p: any) => p.name === selectedProgram
    );
    const pid = realProgram ? realProgram.id : "prog_med_01";

    if (csvData.length > 0) {
      const payloadArray = csvData.map((row) => {
        // Find if payee exists
        const match = programPayees.find((p: any) => {
          const matchId =
            (p.id && p.id === row.payeeId) ||
            (p.payeeId && p.payeeId === row.payeeId);
          const matchEmail =
            p.email &&
            row.email &&
            String(p.email).toLowerCase() === String(row.email).toLowerCase();
          const pName = String(p.businessName || p.name || "").toLowerCase();
          const rName = String(
            row.businessName || row.name || ""
          ).toLowerCase();
          const matchName = pName && rName && pName === rName;
          return matchId || matchEmail || matchName;
        });
        const pidRow = match?.id || row.payeeId || "";
        return {
          amount: row.amount,
          programId: pid,
          payeeId: pidRow,
          payeeLabel: row.businessName || row.email,
          customTxId: row.txId,
          extraFields: row.extraFields || {},
          tds: row.tds || 0
        };
      });
      createPayout(payloadArray);
    } else {
      createPayout({
        amount,
        programId: pid,
        payeeId: selectedPayeeId,
        payeeLabel: selectedPayee,
        customTxId: txId,
        extraFields: dynamicFieldValues,
        tds: tdsPercentage ? parseFloat(tdsPercentage) : 0
      });
    }

    showPreview = false;
    showSuccess = true;
  }

  function handleFinish() {
    showSuccess = false;
    csvData = []; // clear csv after done
    bulkStep = "program"; // reset bulk step
    dispatch("cancel"); // returns to dashboard
  }
</script>

<div class="flex h-full w-full flex-col bg-slate-50 relative">
  <TopBar showSearch={false} />

  <div class="flex w-full flex-col p-8 pt-4">
    <!-- Main Card Body -->
    <div
      class="relative w-full rounded-2xl bg-white p-10 shadow-sm border border-slate-100 min-h-[600px]"
    >
      <!-- Header Row -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button
            onclick={handleCancel}
            class="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <ArrowLeft class="h-4 w-4" />
          </button>
          <h2 class="text-xl font-semibold text-slate-900">
            {journey === "selection"
              ? "Choose Payout Method"
              : journey === "single"
                ? "Single Payout"
                : "Bulk Upload"}
          </h2>
        </div>

        {#if journey === "bulk" && false}
          <!-- Removed from header: now managed inside the inline views -->
        {/if}
      </div>

      {#if journey === "selection"}
        <!-- Selection Journey UI -->
        <div
          class="mt-16 flex flex-col items-center justify-center w-full gap-8"
        >
          <div class="text-center mb-4">
            <h3 class="text-2xl font-bold text-slate-900">
              How would you like to proceed?
            </h3>
            <p class="text-sm font-medium text-slate-500 mt-2">
              Select a payout method to continue
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
            <!-- Single Payout Card -->
            <button
              onclick={() => (journey = "single")}
              class="group flex flex-col items-start p-8 rounded-3xl border-2 border-slate-100 bg-white hover:shadow-lg transition-all text-left cursor-pointer relative overflow-hidden"
              onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = currentTheme.colors.navActiveBorder; }}
              onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = ''; }}
            >
              <div
                class="absolute -right-12 -top-12 h-40 w-40 rounded-full transition-colors"
                style="background-color: {currentTheme.colors.navActiveBg}08"
              ></div>
              <div
                class="flex h-14 w-14 items-center justify-center rounded-2xl mb-6 group-hover:scale-110 transition-transform"
                style="background-color: {currentTheme.colors.primary}10; color: {currentTheme.colors.primary}"
              >
                <User class="h-7 w-7" />
              </div>
              <h4 class="text-xl font-bold text-slate-900 mb-2">
                Single Payout
              </h4>
              <p class="text-[13px] font-medium text-slate-500 leading-relaxed">
                Create a payout explicitly for one payee. Fill out a simple form
                to specify their unique virtual card amount, validity, and
                details.
              </p>
            </button>

            <!-- Bulk Upload Card -->
            <button
              onclick={() => (journey = "bulk")}
              class="group flex flex-col items-start p-8 rounded-3xl border-2 border-slate-100 bg-white hover:shadow-lg transition-all text-left cursor-pointer relative overflow-hidden"
              onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = currentTheme.colors.navActiveBorder; }}
              onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = ''; }}
            >
              <div
                class="absolute -right-12 -top-12 h-40 w-40 rounded-full transition-colors"
                style="background-color: {currentTheme.colors.navActiveBg}08"
              ></div>
              <div
                class="flex h-14 w-14 items-center justify-center rounded-2xl mb-6 group-hover:scale-110 transition-transform"
                style="background-color: {currentTheme.colors.primary}10; color: {currentTheme.colors.primary}"
              >
                <FileUp class="h-7 w-7" />
              </div>
              <h4 class="text-xl font-bold text-slate-900 mb-2">Bulk Upload</h4>
              <p class="text-[13px] font-medium text-slate-500 leading-relaxed">
                Upload a CSV file to process multiple payouts instantly.
                Automatically maps recipients to payouts, expediting bulk
                processing.
              </p>
            </button>
          </div>
        </div>
      {:else if journey === "single"}
        <!-- Single Payout Form Logic Begins -->
        <!-- Virtual Card Presentation -->
        <div class="mt-8 flex w-full">
          <!-- Virtual Card Node (Widened to w-96 from w-80, ratio maintained) -->
          <div
            class="flex h-60 w-96 flex-col justify-between rounded-3xl p-8 shadow-lg relative ring-2 ring-offset-2 ring-transparent"
            style="background-color: {currentTheme.colors.primary}; background-image: linear-gradient(to bottom right, {currentTheme.colors.primary}, {currentTheme.colors.sidebarBg})"
          >
            <div class="flex justify-between w-full text-white/90">
              <span class="text-sm font-medium">Virtual card</span>
              <div
                class="h-8 w-12 flex text-white relative items-center justify-end"
              >
                <div
                  class="h-8 w-8 rounded-full bg-red-500/80 mix-blend-screen absolute right-5"
                ></div>
                <div
                  class="h-8 w-8 rounded-full bg-yellow-500/80 mix-blend-screen absolute right-0"
                ></div>
              </div>
            </div>
            <div
              class="flex justify-between w-full text-white/90 mt-auto items-end"
            >
              <span class="font-mono text-[15px] tracking-[0.3em]"
                >**** **** **** 1289</span
              >
              <span class="font-mono text-sm font-medium">09/25</span>
            </div>
          </div>
        </div>

        <hr class="mt-10 border-slate-200" />

        <!-- Form Section -->
        <div class="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-2">
          <!-- Left Column: Payee, Expiry, TDS -->
          <div class="flex flex-col gap-10">
            <!-- 1. Payee Details -->
            <div class="flex flex-col gap-4">
              <div class="flex items-center gap-2">
                <span
                  class="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700"
                  >1</span
                >
                <h3 class="text-sm font-semibold text-slate-900">
                  Payee Details
                </h3>
              </div>
              <div class="flex gap-4 pl-7">
                <div class="w-1/2 relative flex flex-col gap-2">
                  <label
                    for="selectProgram"
                    class="text-xs font-medium text-slate-600 flex items-center"
                    >Select Program<span class="text-red-500 ml-1">*</span
                    ></label
                  >
                  <CustomSelect
                    id="selectProgram"
                    bind:value={selectedProgram}
                    options={programOptions}
                  />
                </div>
                <div class="w-1/2 relative flex flex-col gap-2">
                  <label
                    for="selectPayee"
                    class="text-xs font-medium text-slate-600 flex items-center"
                    >Business receiving payout<span class="text-red-500 ml-1"
                      >*</span
                    ></label
                  >
                  <CustomSelect
                    id="selectPayee"
                    bind:value={selectedPayee}
                    options={payeeOptions}
                  />
                </div>
              </div>
            </div>

            <!-- 3. Virtual Card Valid -->
            <div class="flex flex-col gap-4 mt-6">
              <div class="flex items-center gap-2">
                <span
                  class="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700"
                  >3</span
                >
                <h3 class="text-sm font-semibold text-slate-900">Expiry</h3>
              </div>
              <div class="pl-7">
                <label
                  for="dateRange"
                  class="mb-2 flex items-center text-xs font-medium text-slate-600"
                  >Select validty<span class="text-red-500 ml-1">*</span></label
                >
                <!-- Custom Date Range Dropdown -->
                <div class="relative w-[340px] mb-8">
                  <button
                    type="button"
                    onclick={() => {
                      if (csvData.length === 0)
                        showDateDropdown = !showDateDropdown;
                    }}
                    disabled={csvData.length > 0}
                    class="relative flex h-12 w-full items-center justify-between rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-[13px] font-semibold text-slate-700 outline-none hover:border-slate-300 transition-all disabled:opacity-50 disabled:bg-slate-50 disabled:cursor-not-allowed disabled:hover:border-slate-200"
                    onfocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = currentTheme.colors.primary; (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 1px ${currentTheme.colors.primary}`; }}
                    onblur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
                  >
                    <Calendar
                      class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-800"
                      strokeWidth={2.5}
                    />
                    <span class="truncate">{computedDateRangeText}</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="text-slate-800 transition-transform {showDateDropdown
                        ? 'rotate-180'
                        : ''}"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>

                  {#if showDateDropdown}
                    <div
                      class="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-xl border border-slate-100 bg-white py-1 shadow-lg ring-1 ring-slate-900/5"
                    >
                      {#each validityOptions as opt}
                        <button
                          type="button"
                          class="flex w-full items-center px-4 py-2.5 text-sm font-medium transition-colors hover:bg-slate-50"
                          style="color: {selectedDateRange === opt ? currentTheme.colors.primary : 'rgb(71, 85, 105)'}; background-color: {selectedDateRange === opt ? currentTheme.colors.primary + '08' : 'transparent'}"
                          onmouseenter={(e) => { if (selectedDateRange !== opt) (e.currentTarget as HTMLElement).style.color = currentTheme.colors.primary; }}
                          onmouseleave={(e) => { if (selectedDateRange !== opt) (e.currentTarget as HTMLElement).style.color = 'rgb(71, 85, 105)'; }}
                          onclick={() => {
                            selectedDateRange = opt;
                            showDateDropdown = false;
                          }}
                        >
                          {opt}
                        </button>
                      {/each}
                    </div>
                  {/if}
                </div>
              </div>
            </div>

            <!-- 5. TDS -->
            <div class="flex flex-col gap-4">
              <div class="flex items-center gap-2">
                <span
                  class="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700"
                  >5</span
                >
                <h3 class="text-sm font-semibold text-slate-900">TDS</h3>
              </div>
              <div class="pl-7">
                <label
                  for="tds"
                  class="mb-2 block text-xs font-medium text-slate-600"
                  >TDS Percentage (%)</label
                >
                <div class="relative w-[340px]">
                  <input
                    id="tds"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="e.g. 10"
                    bind:value={tdsPercentage}
                    disabled={csvData.length > 0}
                    class="h-12 w-full rounded-xl border border-slate-200 px-4 pr-10 text-sm font-semibold text-slate-900 outline-none focus:border-[#7d326f] focus:ring-1 focus:ring-[#7d326f] disabled:opacity-50 disabled:bg-slate-50 disabled:cursor-not-allowed"
                  />
                  <div
                    class="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-500 font-semibold text-sm"
                  >
                    %
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column: payout Details & Transaction ID -->
          <div class="flex flex-col gap-10">
            <!-- 2. payout Details -->
            <div class="flex flex-col gap-4">
              <div class="flex items-center gap-2">
                <span
                  class="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700"
                  >2</span
                >
                <h3 class="text-sm font-semibold text-slate-900">
                  payout Details
                </h3>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-5 gap-4 pl-7">
                <div class="sm:col-span-1 relative flex flex-col gap-2">
                  <label
                    for="currencyType"
                    class="text-xs font-medium text-slate-600 flex items-center"
                    >Currency<span class="text-red-500 ml-1">*</span></label
                  >
                  <CustomSelect
                    id="currencyType"
                    bind:value={currency}
                    options={["INR", "USD", "EUR"]}
                    disabled={csvData.length > 0}
                  />
                </div>
                <div class="sm:col-span-2 relative flex flex-col gap-2">
                  <label
                    for="payableAmount"
                    class="text-xs font-medium text-slate-600 flex items-center"
                    >Amount<span class="text-red-500 ml-1">*</span></label
                  >
                  <input
                    id="payableAmount"
                    type="text"
                    bind:value={amount}
                    disabled={csvData.length > 0}
                    class="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-[#7d326f] focus:ring-1 focus:ring-[#7d326f] disabled:opacity-50 disabled:bg-slate-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div class="sm:col-span-2 relative flex flex-col gap-2">
                  <label
                    for="payThrough"
                    class="text-xs font-medium text-slate-600 flex items-center"
                    >Pay through card<span class="text-red-500 ml-1">*</span
                    ></label
                  >
                  <div
                    class="relative h-12 w-full rounded-xl border border-slate-200 bg-white transition-colors flex items-center px-4 justify-between"
                    class:hover:border-slate-300={csvData.length === 0}
                    class:cursor-pointer={csvData.length === 0}
                    class:opacity-50={csvData.length > 0}
                    class:bg-slate-50={csvData.length > 0}
                    class:cursor-not-allowed={csvData.length > 0}
                  >
                    <div class="flex items-center gap-2">
                      <div
                        class="flex -space-x-1.5 opacity-80 mix-blend-multiply"
                      >
                        <div class="h-4 w-4 rounded-full bg-red-500"></div>
                        <div class="h-4 w-4 rounded-full bg-yellow-400"></div>
                      </div>
                      <span class="text-sm font-medium text-slate-600"
                        >{payThroughCard}</span
                      >
                    </div>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="text-slate-400"><path d="m6 9 6 6 6-6" /></svg
                    >
                  </div>
                </div>
              </div>
            </div>

            <!-- 4. Tracking ID -->
            <div class="flex flex-col gap-4 mt-6">
              <div class="flex items-center gap-2">
                <span
                  class="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700"
                  >4</span
                >
                <h3 class="text-sm font-semibold text-slate-900">
                  Tracking ID
                </h3>
              </div>
              <div class="pl-7">
                <label
                  for="txId"
                  class="mb-2 block text-xs font-medium text-slate-600"
                  >Tracking ID</label
                >
                <input
                  id="txId"
                  type="text"
                  placeholder="e.g. VAD455648"
                  bind:value={txId}
                  disabled={csvData.length > 0}
                  class="h-12 w-[340px] rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-[#7d326f] focus:ring-1 focus:ring-[#7d326f] disabled:opacity-50 disabled:bg-slate-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        </div>
        <!-- Deduction Settings -->
        <!-- <div class="flex flex-col gap-4 mt-6">
          <div class="flex items-center gap-2 border-t border-slate-200 pt-6">
            <h3 class="text-sm font-semibold text-slate-900">
              Deduction Settings
            </h3>
          </div> -->
        <!-- ["None", "Standard Deduction %", "GST %", "Both"] -->
        <!-- <div class="flex gap-4 pb-4 overflow-x-auto">
            {#each ["None", "GST %"] as setting}
              <button
                onclick={() => (deductionSetting = setting)}
                disabled={csvData.length > 0}
                class="relative h-[84px] flex-1 min-w-[140px] rounded-xl border px-2 py-3 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:bg-slate-50 disabled:cursor-not-allowed
                    {deductionSetting === setting && csvData.length === 0
                  ? 'border-[#7d326f] bg-purple-50/50 text-[#7d326f] flex flex-col items-center justify-center'
                  : 'border-slate-200 text-slate-400 hover:bg-slate-50 flex flex-col items-center justify-center'}"
              >
                <div class="flex items-center gap-2">
                  <div
                    class="h-4 w-4 shrink-0 rounded-full border-2 {deductionSetting ===
                    setting
                      ? 'border-[#0066cc] bg-[#0066cc] outline outline-2 outline-offset-1 outline-[#0066cc]'
                      : 'border-slate-300'}"
                  ></div>
                  <span class="text-center">{setting}</span>
                </div>

                {#if deductionSetting === setting && (setting === "GST %" || setting === "Standard Deduction %")}
                  <div class="h-6 mt-2 w-full flex justify-center">
                    <div
                      class="text-[10px] bg-white border border-slate-200 px-3 py-1 rounded w-3/4 text-center font-semibold text-slate-700 shadow-sm"
                    >
                      {setting === "GST %" ? "0 %" : "0 %"}
                    </div>
                  </div>
                {/if}
              </button>
            {/each}
          </div>
        </div> -->

        <!-- Dynamic Program Fields (Extracted) -->
        {#if realProgram?.additionalFields?.length > 0}
          <div class="flex flex-col gap-4 mt-8 pt-6 border-t border-slate-200">
            <div class="flex items-center gap-2">
              <span
                class="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700"
                >6</span
              >
              <h3 class="text-sm font-semibold text-slate-900">
                Additional Info
              </h3>
            </div>
            <div class="grid grid-cols-1 gap-12 lg:grid-cols-2 mt-2">
              {#each realProgram.additionalFields as field}
                <div class="flex flex-col gap-2">
                  <label
                    for={field.key}
                    class="text-xs font-medium text-slate-600 flex items-center"
                    >{field.key}
                    {#if field.required}<span class="text-red-500 ml-1">*</span
                      >{/if}</label
                  >
                  <input
                    id={field.key}
                    type="text"
                    placeholder={`Enter ${field.key}`}
                    bind:value={dynamicFieldValues[field.key]}
                    required={field.required}
                    disabled={csvData.length > 0}
                    class="h-12 w-[340px] rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-[#7d326f] focus:ring-1 focus:ring-[#7d326f] disabled:opacity-50 disabled:bg-slate-50 disabled:cursor-not-allowed"
                  />
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Action Button & Errors -->
        <div class="mt-12 flex flex-col items-end gap-4 w-full justify-end">
          {#if validationError}
            <div
              class="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm font-medium text-rose-600 flex items-center gap-2 max-w-lg"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                ><circle
                  cx="12"
                  cy="12"
                  r="10"
                /><line
                  x1="12"
                  y1="8"
                  x2="12"
                  y2="12"
                /><line
                  x1="12"
                  y1="16"
                  x2="12.01"
                  y2="16"
                /></svg
              >
              {validationError}
            </div>
          {/if}
          <button
            onclick={handlePreview}
            disabled={isUploadingCsv || isPreviewLoading}
            class="rounded-xl bg-[#7d326f] px-8 py-3.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#68295c] active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {#if isPreviewLoading}
              <div
                class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              ></div>
              Loading Preview...
            {:else}
              Preview Card
            {/if}
          </button>
        </div>
      {:else if journey === "bulk"}
        <!-- Bulk Upload Journey -->
        <div class="mt-8 w-full max-w-4xl">
          <div class="flex flex-col gap-10">
            <!-- Step 1: Program Selection -->
            <div class="flex flex-col gap-4">
              <div class="flex items-center gap-2">
                <span
                  class="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700"
                  >1</span
                >
                <h3 class="text-sm font-semibold text-slate-900">
                  Select Program
                </h3>
              </div>
              <div class="pl-7">
                <div class="w-full flex items-end gap-4">
                  <div class="w-full sm:w-1/2 relative flex flex-col gap-2">
                    <label
                      for="bulkSelectProgram"
                      class="text-xs font-medium text-slate-600"
                    >
                      Select Program <span class="text-red-500">*</span>
                    </label>
                    <CustomSelect
                      id="bulkSelectProgram"
                      bind:value={selectedProgram}
                      options={programOptions}
                      disabled={bulkStep === "upload"}
                    />
                    {#if programPayees.length === 0 && selectedProgram !== "No Active Programs"}
                      <!-- <div class="mt-2 text-xs font-semibold text-rose-500 flex items-center gap-1.5 bg-rose-50 border border-rose-100 p-2 rounded-lg animate-in fade-in slide-in-from-top-1 duration-300">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        <span>This program has 0 enrolled payees. Invitations must be accepted first.</span>
                      </div> -->
                    {/if}
                  </div>
                  {#if journey === "bulk"}
                    <div class="h-12 flex items-center">
                      {#if !isTemplateReady}
                        <div
                          class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-500 blink"
                        >
                          <div
                            class="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-[#7d326f]"
                          ></div>
                          Preparing template...
                        </div>
                      {:else}
                        <button
                          onclick={downloadTemplate}
                          class="flex h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:border-[#7d326f] cursor-pointer"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            class="text-[#7d326f]"
                            ><path
                              d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
                            /><polyline points="7 10 12 15 17 10" /><line
                              x1="12"
                              x2="12"
                              y1="15"
                              y2="3"
                            /></svg
                          >
                          Download Template
                        </button>
                      {/if}
                    </div>
                  {/if}
                </div>

                <!-- Persistent Payee Search Block -->
                <div
                  class="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-4"
                >
                  <!-- Payee Search box for copying exact emails to CSV -->
                  <div class="w-full sm:w-1/2 relative flex flex-col gap-2">
                    <label
                      for="searchPayee"
                      class="text-xs font-medium text-slate-600"
                    >
                      Search Payee
                    </label>
                    <input
                      id="searchPayee"
                      type="text"
                      bind:value={payeeSearchTerm}
                      placeholder="Type business name or email..."
                      class="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-800 outline-none focus:border-[#7d326f] focus:ring-1 focus:ring-[#7d326f] bg-white transition-colors"
                    />
                  </div>

                  <!-- Search Results -->
                  {#if payeeSearchTerm.trim()}
                    <div
                      transition:slide={{ duration: 250 }}
                      class="flex flex-col gap-2 w-full max-w-2xl bg-slate-50 border border-slate-100 rounded-xl p-3"
                    >
                      {#if filteredPayees.length > 0}
                        {#each filteredPayees as payee}
                          <div
                            class="flex items-center justify-between border-b border-slate-200/60 pb-2 last:border-0 last:pb-0"
                          >
                            <div class="flex flex-col">
                              <span class="text-sm font-semibold text-slate-800"
                                >{payee.businessName || payee.name}</span
                              >
                              <div class="flex items-center gap-1.5 mt-0.5">
                                <span class="text-xs font-medium text-slate-500"
                                  >{payee.email}</span
                                >
                                {#if payee.city || payee.state}
                                  <span class="text-slate-300 text-[10px]"
                                    >•</span
                                  >
                                  <span
                                    class="text-xs font-medium text-slate-500"
                                    >{[payee.city, payee.state]
                                      .filter(Boolean)
                                      .join(", ")}</span
                                  >
                                {/if}
                              </div>
                            </div>
                            <button
                              onclick={() => copyToClipboard(payee.email)}
                              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-600 hover:text-[#7d326f] hover:border-[#7d326f] transition-colors cursor-pointer shadow-sm"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                ><rect
                                  width="14"
                                  height="14"
                                  x="8"
                                  y="8"
                                  rx="2"
                                  ry="2"
                                /><path
                                  d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"
                                /></svg
                              >
                              Copy Email
                            </button>
                          </div>
                        {/each}
                        {#if programPayees.length > 5 && filteredPayees.length === 5}
                          <span
                            class="text-[10px] text-center text-slate-400 font-medium italic pt-1"
                            >Showing top 5 matches...</span
                          >
                        {/if}
                      {:else}
                        <span
                          class="text-sm text-slate-500 font-medium py-2 text-center"
                          >No payees found for "{payeeSearchTerm}"</span
                        >
                      {/if}
                    </div>
                  {/if}
                </div>

                {#if bulkStep === "program" && csvData.length === 0}
                  <div class="mt-4">
                    <!-- Drag and Drop Zone -->
                    <button
                      type="button"
                      onclick={() => fileInput?.click()}
                      ondragover={handleDragOver}
                      ondragleave={handleDragLeave}
                      ondrop={handleDrop}
                      disabled={isUploadingCsv ||
                        selectedProgram === "No Active Programs"}
                      class="relative w-full flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-2xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group {isDraggingFile
                        ? 'border-[#7d326f] bg-[#7d326f]/5'
                        : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400'}"
                    >
                      {#if isUploadingCsv}
                        <div
                          class="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#7d326f] mb-4"
                        ></div>
                        <p class="text-sm font-semibold text-slate-700">
                          Uploading and Parsing File...
                        </p>
                      {:else}
                        <div
                          class="h-14 w-14 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-500 mb-4 group-hover:text-[#7d326f] transition-colors"
                        >
                          <Upload class="h-6 w-6" />
                        </div>
                        <p class="text-[15px] font-semibold text-slate-800">
                          Click to upload or drag and drop
                        </p>
                        <p class="text-xs font-medium text-slate-500 mt-1.5">
                          CSV template mapping to program limits
                        </p>
                      {/if}
                    </button>
                    <!-- Move hidden file input out here so it's clickable from step 1 -->
                    <input
                      type="file"
                      accept=".csv"
                      class="hidden"
                      bind:this={fileInput}
                      onchange={handleCsvUpload}
                    />
                    {#if csvUploadError}
                      <div
                        class="mt-4 flex items-center gap-3 rounded-xl bg-orange-50 border border-orange-100 p-4 shadow-sm animate-in fade-in duration-300"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2.5"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          class="lucide lucide-alert-triangle text-orange-500 shrink-0"
                          ><path
                            d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
                          /><path d="M12 9v4" /><path d="M12 17h.01" /></svg
                        >
                        <span class="text-[13px] font-semibold text-orange-700"
                          >{csvUploadError}</span
                        >
                      </div>
                    {/if}
                  </div>
                {/if}
              </div>
            </div>

            <!-- Step 2: Upload CSV -->
            {#if bulkStep === "upload"}
              <div class="flex flex-col gap-4 mt-6 fade-in">
                <div class="flex items-center gap-2">
                  <span
                    class="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700"
                    >2</span
                  >
                  <h3 class="text-sm font-semibold text-slate-900">
                    Upload Data
                  </h3>
                </div>

                <div class="pl-7 w-full">
                  {#if csvData.length === 0}
                    <!-- The blank upload area is no longer strictly needed if we jump straight to file select, but keeping it visible as a loading state if needed -->
                    <div
                      class="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-10 bg-slate-50"
                    >
                      <div
                        class="h-8 w-8 animate-spin rounded-full border-2 border-slate-500 border-t-transparent"
                      ></div>
                      <p class="text-sm font-medium text-slate-600 mt-4">
                        Processing CSV...
                      </p>
                    </div>
                  {:else}
                    <!-- Inline Data Layout -->
                    <div class="flex flex-col gap-6 w-full fade-in">
                      <div
                        class="flex items-center justify-between bg-slate-50 rounded-xl p-4 border border-slate-200"
                      >
                        <div class="flex items-center gap-4">
                          <div
                            class="flex h-10 w-10 items-center justify-center rounded-lg"
                            style="background-color: {currentTheme.colors.primary}20; color: {currentTheme.colors.primary}"
                          >
                            <FileUp class="h-5 w-5" />
                          </div>
                          <div>
                            <h4 class="text-sm font-bold text-slate-900">
                              CSV Imported Successfully
                            </h4>
                            <p
                              class="text-xs font-medium text-slate-500 mt-0.5"
                            >
                              {csvData.length} Valid Records Ready
                            </p>
                          </div>
                        </div>
                        <button
                          onclick={() => {
                            csvData = [];
                            bulkStep = "program";
                            if (fileInput) fileInput.value = "";
                          }}
                          class="text-sm font-semibold text-slate-500 hover:text-rose-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-rose-50 cursor-pointer"
                        >
                          Remove File
                        </button>
                      </div>

                      <!-- Internal Data Grid -->
                      <div
                        class="w-full overflow-hidden border border-slate-200 rounded-2xl shadow-sm"
                      >
                        <div class="max-h-[350px] overflow-auto">
                          <table
                            class="w-full text-left text-[13px] whitespace-nowrap"
                          >
                            <thead
                              class="bg-[#f8f9fa] text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10 shadow-sm"
                            >
                              <tr>
                                <th class="p-4 border-r border-slate-100"
                                  >Email</th
                                >
                                <th class="p-4 border-r border-slate-100"
                                  >Amount</th
                                >
                                <th class="p-4 border-r border-slate-100"
                                  >Extra Info</th
                                >
                                <th class="p-4 border-r border-slate-100"
                                  >TDS</th
                                >
                                <th class="p-4">Validity</th>
                              </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 bg-white">
                              {#each csvData as row (row.id)}
                                <tr
                                  class="hover:bg-slate-50 transition-colors"
                                  class:bg-slate-50={!row.isValid}
                                >
                                  <td
                                    class="p-4 font-semibold border-r border-slate-100 text-slate-600"
                                  >
                                    <div class="flex flex-col">
                                      <div class="flex items-center gap-1.5">
                                        {#if !row.isValid}
                                          <div
                                            class="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0"
                                          ></div>
                                        {/if}
                                        <span>{row.email}</span>
                                      </div>
                                      {#if !row.isValid}
                                        <span
                                          class="text-[10px] font-medium text-slate-400 italic mt-0.5"
                                          class:ml-3={!row.isValid}
                                          >{row.error}</span
                                        >
                                      {/if}
                                    </div>
                                  </td>
                                  <td
                                    class="p-4 font-semibold text-slate-800 border-r border-slate-100"
                                    >{row.amount} {row.currency}</td
                                  >
                                  <td
                                    class="p-4 border-r border-slate-100 align-middle"
                                  >
                                    {#if row.extraFields && Object.keys(row.extraFields).length > 0}
                                      <div class="flex flex-wrap gap-1">
                                        {#each Object.entries(row.extraFields).slice(0, 2) as [key, val]}
                                          <span
                                            class="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10"
                                            title={`${key}: ${val}`}
                                          >
                                            <span class="font-semibold mr-1"
                                              >{key}:</span
                                            >
                                            {val}
                                          </span>
                                        {/each}
                                        {#if Object.keys(row.extraFields).length > 2}
                                          <span
                                            class="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 ring-1 ring-inset ring-slate-500/10"
                                            title={Object.entries(
                                              row.extraFields
                                            )
                                              .slice(2)
                                              .map(([k, v]) => `${k}: ${v}`)
                                              .join("\n")}
                                          >
                                            +{Object.keys(row.extraFields)
                                              .length - 2} more
                                          </span>
                                        {/if}
                                      </div>
                                    {:else}
                                      <span
                                        class="text-slate-400 italic text-[11px]"
                                        >N/A</span
                                      >
                                    {/if}
                                  </td>
                                  <td
                                    class="p-4 font-medium text-slate-600 border-r border-slate-100"
                                    >{row.tds ? `${row.tds}%` : "-"}</td
                                  >
                                  <td class="p-4 font-medium text-slate-600"
                                    >{row.validity}</td
                                  >
                                </tr>
                              {/each}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <!-- Action Button specific to Bulk Submits -->
                      <div
                        class="flex flex-col gap-4 mt-2 border-t border-slate-100 pt-6"
                      >
                        {#if mismatchedRows.length > 0}
                          <div
                            class="flex w-full items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 shadow-sm"
                          >
                            <div class="flex items-center gap-3">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2.5"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                class="text-rose-600 shrink-0"
                                ><path
                                  d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
                                /><path d="M12 9v4" /><path
                                  d="M12 17h.01"
                                /></svg
                              >
                              <span
                                class="text-[13px] font-medium text-rose-800"
                              >
                                {mismatchedRows.length} email(s) not found in enrolled
                                payees or contain faults.
                              </span>
                            </div>
                            <button
                              class="flex items-center gap-2 rounded-lg bg-white border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 shadow-sm pointer-events-none"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2.5"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                ><path
                                  d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
                                /><path d="M12 9v4" /><path
                                  d="M12 17h.01"
                                /></svg
                              >
                              Invalidated Records
                            </button>
                          </div>
                        {/if}

                        <div class="flex w-full justify-end gap-4">
                          <button
                            onclick={handleCancel}
                            class="rounded-xl border border-slate-200 px-6 py-3.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onclick={() => {
                              handleSubmit();
                            }}
                            disabled={mismatchedRows.length > 0}
                            class="rounded-xl px-8 py-3.5 text-sm font-semibold text-white shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                            style="background-color: {currentTheme.colors.primary}"
                            onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.filter = 'brightness(0.9)'; }}
                            onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
                          >
                            Submit Payouts
                          </button>
                        </div>
                      </div>
                    </div>
                  {/if}
                </div>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>

  <!-- Preview Modal Overlay -->
  {#if showPreview}
    <div
      class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
    >
      <div
        class="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl max-h-[90vh] flex flex-col"
      >
        <button
          onclick={() => (showPreview = false)}
          class="absolute top-4 right-4 flex h-6 w-6 items-center justify-center rounded-sm bg-rose-500 text-white hover:bg-rose-600 transition-colors cursor-pointer"
        >
          ✕
        </button>
        <p class="text-sm font-semibold text-slate-600 mb-2">Paying from</p>
        <div class="flex items-center gap-4 mb-6 shrink-0">
          <div
            class="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-50 shadow-sm border border-slate-100"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="text-slate-700"
            >
              <rect
                width="18"
                height="18"
                x="3"
                y="4"
                rx="2"
                ry="2"
              />
              <line
                x1="16"
                x2="16"
                y1="2"
                y2="6"
              />
              <line
                x1="8"
                x2="8"
                y1="2"
                y2="6"
              />
              <line
                x1="3"
                x2="21"
                y1="10"
                y2="10"
              />
              <path d="M8 14h.01" />
              <path d="M12 14h.01" />
              <path d="M16 14h.01" />
              <path d="M8 18h.01" />
              <path d="M12 18h.01" />
              <path d="M16 18h.01" />
            </svg>
          </div>
          <h2 class="text-2xl font-bold text-slate-900">{selectedProgram}</h2>
        </div>

        <div class="flex flex-col gap-6 overflow-y-auto pr-2 pb-2 flex-1">
          <!-- CSV Flow -->
          {#if csvData.length > 0}
            <div class="flex flex-col gap-4">
              <div
                class="flex items-center justify-between border-b border-slate-100 pb-2"
              >
                <span class="text-sm font-semibold text-slate-800"
                  >CSV Payouts</span
                >
                <span
                  class="text-xs font-medium px-2 py-1 rounded-md"
                  style="background-color: {currentTheme.colors.primary}10; color: {currentTheme.colors.primary}"
                  >{csvData.length} records</span
                >
              </div>

              <div class="flex flex-col gap-3">
                {#each csvData as row}
                  <div
                    class="flex flex-col gap-2 p-3 rounded-xl border border-slate-100 bg-slate-50/50"
                  >
                    <div class="flex justify-between items-start">
                      <div class="flex flex-col">
                        <!-- <span
                          class="font-semibold text-slate-900 text-sm truncate max-w-[150px]"
                          >{row.businessName}</span
                        > -->
                        <span class="font-medium text-slate-500 text-xs mt-0.5"
                          >{row.email}</span
                        >
                      </div>
                      <span class="font-bold text-sm" style="color: {currentTheme.colors.primary}"
                        >{row.currency === "INR" ? "₹" : row.currency}
                        {row.amount}</span
                      >
                    </div>
                    <div class="flex justify-between items-center text-xs">
                      <span class="font-medium text-slate-500"
                        >Validity: {row.validity}</span
                      >
                      {#if row.tds > 0}
                        <span class="font-medium text-slate-500"
                          >TDS: {row.tds}%</span
                        >
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            </div>
            <!-- Normal Flow -->
          {:else}
            <div class="flex flex-col gap-1 text-[13px]">
              <span class="font-semibold text-slate-800">Paying To</span>
              <span class="font-medium text-slate-700 text-base"
                >{selectedPayee}</span
              >
            </div>

            <div class="flex flex-col gap-1 text-[13px]">
              <span class="font-semibold text-slate-800">Card Validity</span>
              <span class="font-medium text-slate-500"
                >{computedDateRangeText}</span
              >
            </div>

            {#if tdsPercentage && !isNaN(parseFloat(tdsPercentage)) && parseFloat(tdsPercentage) > 0}
              <div class="flex flex-col gap-1 text-[13px] -mt-1">
                <span class="font-semibold text-slate-800">Applicable TDS</span>
                <span class="font-medium text-slate-500">{tdsPercentage}%</span>
              </div>
            {/if}

            <div class="flex flex-col gap-1 mt-2">
              <span class="text-xs font-semibold text-slate-500"
                >Total Amount{tdsPercentage &&
                !isNaN(parseFloat(tdsPercentage)) &&
                parseFloat(tdsPercentage) > 0
                  ? " (After TDS)"
                  : ""}</span
              >
              <span class="text-3xl font-semibold text-slate-900">
                {currency === "INR" ? "₹" : currency}
                {#if tdsPercentage && !isNaN(parseFloat(tdsPercentage)) && parseFloat(tdsPercentage) > 0}
                  {(
                    parseFloat(amount.toString().replace(/,/g, "")) *
                    (1 - parseFloat(tdsPercentage) / 100)
                  ).toLocaleString()}
                {:else}
                  {amount}
                {/if}
              </span>
            </div>

            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-slate-500"
                >Tracking ID</span
              >
              <span class="font-medium text-slate-700">{txId ? txId : "-"}</span
              >
            </div>
          {/if}

          <!-- Common Bottom Element -->
          <div
            class="flex flex-col gap-2 text-[13px] pt-4 border-t border-slate-100 mt-2 shrink-0"
          >
            <span class="font-semibold text-slate-800">Pay through card</span>
            <div
              class="flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <div class="flex -space-x-1.5 opacity-80 mix-blend-multiply">
                <div class="h-4 w-4 rounded-full bg-red-500"></div>
                <div class="h-4 w-4 rounded-full bg-yellow-400"></div>
              </div>
              <span class="font-semibold text-slate-700">{payThroughCard}</span>
            </div>
          </div>
        </div>

        <div class="mt-6 shrink-0 pt-2 bg-white sticky bottom-0">
          <button
            onclick={handleSubmit}
            class="w-full rounded-2xl py-4 text-[15px] font-semibold text-white shadow-md transition-all active:scale-[0.98] cursor-pointer"
            style="background-color: {currentTheme.colors.primary}"
            onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.filter = 'brightness(0.9)'; }}
            onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Success Modal Overlay -->
  {#if showSuccess}
    <div
      class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
    >
      <div
        class="relative w-full max-w-[400px] border border-slate-200 bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center"
      >
        <div class="flex flex-col items-center mt-4 text-center">
          <div
            class="mb-4 flex h-16 w-16 items-center justify-center rounded-full border-4 border-slate-50 bg-[#7d326f] text-white shadow-lg"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 class="text-[26px] font-semibold tracking-tight text-[#7d326f]">
            Card Generated
          </h2>
        </div>

        <div
          class="mt-6 w-full rounded-xl border border-slate-200 p-4 max-h-[300px] overflow-y-auto"
        >
          {#if csvData.length > 0}
            <div class="flex flex-col gap-4">
              <div
                class="flex justify-between items-center text-sm font-semibold text-slate-800 px-2"
              >
                <span>{csvData.length} Payouts Processed</span>
              </div>
              <div class="flex flex-col gap-3">
                {#each csvData as row}
                  <div
                    class="flex items-start justify-between border-b border-slate-100 pb-3 last:border-0"
                  >
                    <div class="flex flex-col">
                      <span class="text-sm font-semibold text-slate-800"
                        >{row.businessName}</span
                      >
                      <p class="text-[12px] font-medium text-slate-500 mt-0.5">
                        {row.email}
                      </p>
                      <span class="text-[10px] font-medium text-slate-400 mt-1"
                        >Validity: <span class="text-slate-600 font-semibold"
                          >{row.validity}</span
                        ></span
                      >
                      {#if row.tds > 0}
                        <span
                          class="text-[10px] font-medium text-slate-400 mt-0.5"
                          >TDS: <span class="text-slate-600 font-semibold"
                            >{row.tds}%</span
                          ></span
                        >
                      {/if}
                    </div>
                    <span class="text-md font-bold" style="color: {currentTheme.colors.primary}"
                      >{row.currency === "INR" ? "₹" : row.currency}
                      {row.amount}</span
                    >
                  </div>
                {/each}
              </div>
            </div>
          {:else}
            <div class="flex items-start justify-between">
              <div class="flex flex-col">
                <span class="text-sm font-semibold text-slate-800"
                  >{selectedPayee}</span
                >
                <p class="text-[13px] font-semibold text-slate-900 mt-1">
                  {computedDateRangeText}
                </p>
                {#if tdsPercentage && !isNaN(parseFloat(tdsPercentage)) && parseFloat(tdsPercentage) > 0}
                  <span class="text-[11px] font-medium text-slate-500 mt-0.5">
                    TDS Deduction: {tdsPercentage}%
                  </span>
                {/if}
                <span
                  class="text-[9px] font-medium text-slate-400 mt-1 bg-[#7d326f]/5 px-2 py-0.5 rounded"
                  >Tracking ID: <span class="text-slate-600 font-semibold"
                    >{txId ? txId : "-"}</span
                  ></span
                >
              </div>
              <span class="text-xl font-semibold text-slate-900"
                >{currency === "INR" ? "₹" : currency}{amount}</span
              >
            </div>
          {/if}
        </div>

        <button
          onclick={handleFinish}
          class="mt-6 w-full rounded-xl py-3.5 text-sm font-semibold text-white shadow-md transition-all active:scale-[0.98] cursor-pointer"
          style="background-color: {currentTheme.colors.primary}"
          onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.filter = 'brightness(0.9)'; }}
          onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
        >
          Done
        </button>
      </div>
    </div>
  {/if}
</div>

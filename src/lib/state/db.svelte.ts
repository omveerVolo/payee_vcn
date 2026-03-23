import { authState } from "./auth.svelte.js";

// const API_BASE = "http://13.203.158.71:8080/api";
const API_BASE = "https://staging-backend.finnova.health";


const X_API_KEY = import.meta.env.VITE_X_API_KEY || "";
const X_AUTH_CODE = import.meta.env.VITE_X_AUTH_CODE || "";

// Internal fetch wrapper for JSON calls
export async function apiCall(
  endpoint: string,
  method = "GET",
  body: any = null,
) {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
  };

  if (body && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (X_AUTH_CODE) headers["x-auth-code"] = X_AUTH_CODE;

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = body instanceof FormData ? body : JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const text = await response.text();
    
    // Explicitly handle no-content or bad responses gracefully
    if (!response.ok) {
      console.warn(`API error on ${endpoint}: ${response.status}`);
      // Return the parsed error JSON if available, otherwise null
      return text ? JSON.parse(text) : null;
    }
    return text ? JSON.parse(text) : null;
  } catch (error) {
    console.error(`Network error on ${endpoint}: `, error);
    return null;
  }
}

export const dbStore = $state({
  users: [],
  programs: [],
  notifications: [],
  payouts: [],
  workflows: [],
  reportsHistory: [] as any[], // New Reports Tracker
  isLoading: false,
});

// Sync data remotely when user context changes
export async function syncRemoteData(userId: string) {
  dbStore.isLoading = true;
  try {
    const role = authState.isAdminView
      ? authState.viewingAs?.role
      : authState.user?.role;
    const payoutsQuery =
      role === "payer"
        ? `payerId=${userId}`
        : role === "payee"
          ? `payeeId=${userId}`
          : `userId=${userId}`;
    const [progRes, poyRes, notifRes, wfRes] = await Promise.all([
      apiCall(`/programs?userId=${userId}`),
      apiCall(`/payouts?${payoutsQuery}`),
      apiCall(`/notifications?userId=${userId}`),
      apiCall(`/workflow`),
    ]);

    const rawProg = progRes?.programs || progRes?.data || progRes;
    if (rawProg && Array.isArray(rawProg)) dbStore.programs = rawProg;
    
    const rawPoy = poyRes?.payouts || poyRes?.data || poyRes;
    if (rawPoy && Array.isArray(rawPoy)) dbStore.payouts = rawPoy;
    
    const rawNotif = notifRes?.notifications || notifRes?.data || notifRes;
    if (rawNotif && Array.isArray(rawNotif)) dbStore.notifications = rawNotif;
    
    const rawWf = wfRes?.workflows || wfRes?.workflow || wfRes?.data || wfRes;
    if (rawWf && Array.isArray(rawWf)) {
      // @ts-ignore
      dbStore.workflows = rawWf;
    }
  } catch (err) {
    console.error("Failed to sync remote data", err);
  } finally {
    dbStore.isLoading = false;
  }
}

function saveDb() {
  // Persistence disabled per user request to reset on refresh/restart
}

export function redeemPayout(payoutId: string) {
  // Reassign the array to securely trigger Svelte 5 reactivity across derived trackers
  dbStore.payouts = dbStore.payouts.map((p: any) =>
    (p.id || p.payoutId) === payoutId ? { ...p, status: "Redeemed" } : p,
  );
  saveDb();
}

export function upsertUser(user: any) {
  const exists = dbStore.users.some(
    (u: any) => u.id === user.id || (u.email && u.email === user.email),
  );
  if (!exists) {
    dbStore.users = [user, ...dbStore.users];
  }
  saveDb();
}

export function approvePayerPayout(payoutId: string) {
  const payout = dbStore.payouts.find((p: any) => (p.id || p.payoutId) === payoutId);
  if (!payout) return;

  dbStore.payouts = dbStore.payouts.map((p: any) =>
    (p.id || p.payoutId) === payoutId ? { ...p, status: "Ready to redeem" } : p,
  );

  // Provide a notification to the actual payee account about the approved payout
  const newNotif = {
    id: `notif_${Math.floor(Math.random() * 10000)}`,
    userId: payout.userId,
    title: "payout Approved",
    message: `Your payout for Claim No. ${payout.claimNo} has been approved and is ready to redeem.`,
    read: false,
    date: new Date().toISOString(),
  };

  dbStore.notifications = [newNotif, ...dbStore.notifications];
  saveDb();
}

export function createPayout(payload: any | any[]) {
  // Check if we are handling an array of payouts (Bulk Upload)
  const isBulk = Array.isArray(payload);
  const items = isBulk ? payload : [payload];

  const newPayouts: any[] = [];
  const newNotifications: any[] = [];

  items.forEach((item) => {
    const { amount, programId, payeeId, payeeLabel, customTxId, extraFields, tds } = item;

    // Remove currency symbol and commas before parsing
    const cleanAmount = String(amount).replace(/[₹,]/g, "");
    const amountNumber = parseInt(cleanAmount, 10);

    let targetId = payeeId;
    const payeeRef = payeeLabel || payeeId || "";
    const cleanPayee = String(payeeRef).trim().toLowerCase();
    const targetUser = dbStore.users.find(
      (u: any) =>
        (u.name && u.name.toLowerCase() === cleanPayee) ||
        (u.businessName && u.businessName.toLowerCase() === cleanPayee) ||
        (u.email && u.email.toLowerCase() === cleanPayee),
    );
    if (!targetId) {
      // If we can't strictly match the UI name to a DB user, we create a phantom ID tied to the string name
      targetId = targetUser
        ? targetUser.id
        : `usr_pending_${cleanPayee.replace(/[^a-z0-9]/g, "")}`;
    }

    // Evaluate workflows to determine initial status dynamically
    let initialStatus = "Ready to redeem";
    
    // @ts-ignore
    const matchingWorkflow = dbStore.workflows?.find((wf: any) => {
      // Must exactly match the payee and program constraints
      if (wf.payeeId !== targetId) return false;
      if (wf.programId !== "all" && wf.programId !== programId) return false;

      const wfAmount = Number(wf.amount) || 0;
      if (wf.compareKey === "More than" && amountNumber > wfAmount) return true;
      if (wf.compareKey === "Less than" && amountNumber < wfAmount) return true;
      if (wf.compareKey === "Equals" && amountNumber === wfAmount) return true;
      
      return false;
    });

    if (matchingWorkflow) {
      initialStatus = "Pending";
    }

    const newPayout = {
      id: `clm_${Math.floor(Math.random() * 10000)}`,
      userId: targetId,
      payeeId: targetId,
      payerId: authState.user?.id || "",
      programId: programId,
      date: new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      providerName:
        payeeLabel || targetUser?.businessName || targetUser?.name || payeeId,
      patientName: "Newly Assigned",
      claimNo:
        customTxId?.trim() || `VADE${Math.floor(Math.random() * 1000000)}`,
      transactionId: `VADE${Math.floor(Math.random() * 1000000)}`,
      trackingId: customTxId?.trim() || "",
      payoutId: `ACME${Math.floor(Math.random() * 100000000)}`,
      amount: cleanAmount,
      status: initialStatus,
      extraFields: extraFields || {},
      tds: tds || 0,
      createdAt: new Date().toISOString(),
    };

    newPayouts.push(newPayout);

    // Provide a notification to the actual payee account about the new payout
    const newNotif = {
      id: `notif_${Math.floor(Math.random() * 10000)}`,
      userId: targetId, // The targeted payee ID
      title: "New payout Created",
      message: `A new payout of ₹${formatCurrency(amount)} mapped to Claim No. ${newPayout.claimNo} has been created for you.`,
      read: false,
      date: new Date().toISOString(), // We can use ISO strings for robust sorting
    };

    newNotifications.push(newNotif);
  });

  // API POST Dispatch (Send array for bulk, object for single)
  const apiPayload = isBulk ? newPayouts : newPayouts[0];
  apiCall("/payouts", "POST", apiPayload).catch(console.error);

  newNotifications.forEach((notif) => {
    apiCall("/notifications", "POST", notif).catch(console.error);
  });

  // @ts-ignore
  dbStore.payouts = [...newPayouts, ...dbStore.payouts];
  // @ts-ignore
  dbStore.notifications = [...newNotifications, ...dbStore.notifications];

  saveDb();
}

export async function createWorkflow(payload: any) {
  const res = await apiCall("/workflow", "POST", payload);
  if (res) {
    // @ts-ignore
    dbStore.workflows = [...dbStore.workflows, payload];
  }
}

export async function deleteWorkflow(id: string) {
  const res = await apiCall(`/workflow/${id}`, "DELETE");
  if (res) {
    // @ts-ignore
    dbStore.workflows = dbStore.workflows.filter(
      (w: any) => w.id !== id && w.workflowId !== id
    );
  }
}

export function createProgram(
  name: string,
  type: string,
  category: string,
  payeeIds: string[] = [],
  customFields: Array<{key: string, type: string, required: boolean}> = []
) {
  if (!authState.user?.id) return;

  const targetIds = payeeIds;

  const newProgram = {
    id: `prog_med_${Math.floor(Math.random() * 10000)}`,
    name: name,
    payerId: authState.user.id,
    status: "Active",
    category: category,
    createdAt: new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    createdBy: authState.user.name || "System",
    payoutsReceived: 0,
    enrolledPayees: [],
    invitedPayees: [],
    selectedPayees: targetIds,
    additionalFields: customFields.map(f => ({ key: f.key, required: f.required })),
  };

  // Also push a demo notification allowing the Payer to see they made a program
  const newNotif = {
    id: `notif_${Math.floor(Math.random() * 10000)}`,
    userId: authState.user.id,
    title: "Program Configured Successfully",
    message: `payout Program "${name}" for ${type} (${category}) is now active.`,
    read: false,
    date: new Date().toISOString(),
  };

  // Dispatch remotely
  apiCall("/programs", "POST", newProgram)
    .then((res) => {
      if (res) console.log("Program saved remotely:", res);
    })
    .catch((err) => console.error(err));

  apiCall("/notifications", "POST", newNotif).catch(console.error);

  // Optimistic UI updates
  // @ts-ignore
  dbStore.programs = [newProgram, ...dbStore.programs];
  // @ts-ignore
  dbStore.notifications = [newNotif, ...dbStore.notifications];

  targetIds.forEach((targetId) => {
    const payeeNotif = {
      id: `notif_${Math.floor(Math.random() * 10000)}`,
      userId: targetId,
      payeeId: targetId,
      title: "New Program Invitation",
      message: `You have been added to the "${name}" payout program by your payer. Do you wish to accept?`,
      read: false,
      type: "invitation",
      programId: newProgram.id,
      date: new Date().toISOString(),
    };

    apiCall("/notifications", "POST", payeeNotif).catch(console.error);
    dbStore.notifications = [payeeNotif, ...dbStore.notifications];
  });
  saveDb();
}

export async function acceptInvitation(
  notificationId: string,
  programId: string,
  payeeId: string,
) {
  const res = await apiCall("/programs/activate-payees", "PUT", {
    programId,
    payeeId,
    notificationId,
    isRejected: false,
  }).catch(console.error);
  // Add payee to program
  dbStore.programs = dbStore.programs.map((p: any) => {
    if (p.id === programId && !p.enrolledPayees.includes(payeeId)) {
      const updatedInvited = (p.invitedPayees || []).filter(
        (id: string) => id !== payeeId,
      );
      const updatedSelected = (p.selectedPayees || []).filter(
        (id: string) => id !== payeeId,
      );
      return {
        ...p,
        enrolledPayees: [...p.enrolledPayees, payeeId],
        invitedPayees: updatedInvited,
        selectedPayees: updatedSelected,
      };
    }
    return p;
  });

  // Reconcile pending payouts assigned to phantom IDs for this program
  dbStore.payouts = dbStore.payouts.map((p: any) => {
    if (
      p.programId === programId &&
      String(p.userId).startsWith("usr_pending_")
    ) {
      return { ...p, userId: payeeId };
    }
    return p;
  });

  // Mark notification as read instead of removing
  dbStore.notifications = dbStore.notifications.map((n: any) =>
    n.id === notificationId ? { ...n, read: true } : n,
  );
  const notifRes = await apiCall(`/notifications?userId=${payeeId}`).catch(
    () => null,
  );
  if (notifRes && Array.isArray(notifRes)) dbStore.notifications = notifRes;
  if (res !== null) {
    await syncRemoteData(payeeId);
  }
  saveDb();
}

export async function rejectInvitation(
  notificationId: string,
  programId: string,
  payeeId: string,
) {
  await apiCall("/programs/activate-payees", "PUT", {
    programId,
    payeeId,
    notificationId,
    isRejected: true,
  }).catch(console.error);

  dbStore.programs = dbStore.programs.map((p: any) => {
    if (p.id === programId) {
      return {
        ...p,
        invitedPayees: (p.invitedPayees || []).filter(
          (id: string) => id !== payeeId,
        ),
        selectedPayees: (p.selectedPayees || []).filter(
          (id: string) => id !== payeeId,
        ),
      };
    }
    return p;
  });

  // Mark notification as read instead of removing
  dbStore.notifications = dbStore.notifications.map((n: any) =>
    n.id === notificationId ? { ...n, read: true } : n,
  );
  const notifRes = await apiCall(`/notifications?userId=${payeeId}`).catch(
    () => null,
  );
  if (notifRes && Array.isArray(notifRes)) dbStore.notifications = notifRes;
  saveDb();
}

export function updateProgram(
  id: string,
  name: string,
  type: string,
  category: string,
  payeeIds: string[] = [],
  customFields: Array<{key: string, type: string, required: boolean}> = []
) {
  const targetIds = payeeIds;

  dbStore.programs = dbStore.programs.map((p: any) => {
    if (p.id === id) {
      const updated = {
        ...p,
        name,
        category,
        additionalFields: customFields.map(f => ({ key: f.key, required: f.required }))
      };
      updated.selectedPayees = [
        ...new Set([...(updated.selectedPayees || []), ...targetIds]),
      ];

      // Add all new IDs that aren't already enrolled
      targetIds.forEach((targetId) => {
        if (
          !updated.enrolledPayees.includes(targetId) &&
          !updated.invitedPayees?.includes(targetId)
        ) {
          updated.invitedPayees = [...(updated.invitedPayees || []), targetId];
        }
      });

      // Hit the explicit update API endpoint as requested by user
      apiCall("/programs/add-payees", "PUT", {
        programId: p.id,
        payerId: authState.user?.id || p.payerId,
        payeeIds: targetIds,
      }).catch((err) => console.error("Failed to add payees to program:", err));

      return updated;
    }
    return p;
  });

  targetIds.forEach((targetId) => {
    const alreadyInvited = dbStore.notifications.some(
      (n: any) => n.userId === targetId && n.programId === id,
    );

    const programToUpdate = dbStore.programs.find((p: any) => p.id === id);
    const alreadyEnrolled = programToUpdate?.enrolledPayees.includes(targetId);

    if (!alreadyInvited && !alreadyEnrolled) {
      const payeeNotif = {
        id: `notif_${Math.floor(Math.random() * 10000)}`,
        userId: targetId,
        payeeId: targetId,
        title: "New Program Invitation",
        message: `You have been added to the "${name}" payout program by your payer. Do you wish to accept?`,
        read: false,
        type: "invitation",
        programId: id,
        date: new Date().toISOString(),
      };
      dbStore.notifications = [payeeNotif, ...dbStore.notifications];
    }
  });
  saveDb();
}

export function cancelEnrollment(programId: string, payeeId: string) {
  // Removes the payee ID from the program's enrolled array
  dbStore.programs = dbStore.programs.map((program: any) => {
    if (program.id === programId) {
      return {
        ...program,
        enrolledPayees: program.enrolledPayees.filter(
          (id: string) => id !== payeeId,
        ),
      };
    }
    return program;
  });
  saveDb();
}

function formatCurrency(rawAmount: any) {
  if (!rawAmount) return "0";
  if (typeof rawAmount === "number") return rawAmount.toLocaleString("en-IN");
  return String(rawAmount).replace("₹", "");
}

// --------------------------------------------------------------------------
// Report APIs
// --------------------------------------------------------------------------

export async function requestReport(
  payerId: string | undefined,
  targetType: "program" | "payee",
  targetIds: string[],
  targetName: string,
  startDate: string,
  endDate: string,
  statusFilter: string
) {
  const reportId = `rep_${Math.random().toString(36).substring(2, 9)}`;

  const parsedTargetName = !targetName 
    ? (targetType === "program" ? "All Programs" : "All Payees") 
    : targetName;

  const newReport = {
    id: reportId,
    requestedAt: new Date().toISOString(),
    programId: parsedTargetName,
    dateRange: startDate && endDate ? `${startDate} to ${endDate}` : 'All Time',
    statusFilter,
    status: "loading",
    downloadUrl: ""
  };

  dbStore.reportsHistory = [newReport, ...dbStore.reportsHistory];

  try {
    const role = authState.isAdminView ? authState.viewingAs?.role : authState.user?.role;
    const endpoint = role === "payee" ? "/reports/payees" : "/reports/programs";
    const params = new URLSearchParams();
    
    if (payerId) {
      if (role === "payee") {
        params.append("payeeId", payerId);
      } else {
        params.append("payerId", payerId);
      }
    }
    
    if (targetIds && targetIds.length > 0) {
       if (targetType === "program") {
         targetIds.forEach(id => params.append("programIds", id));
       } else {
         if (role === "payee") {
           targetIds.forEach(id => params.append("payerIds", id));
         } else {
           targetIds.forEach(id => params.append("payeeIds", id));
         }
       }
    }
    
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    params.append("format", "csv");

    const headers: Record<string, string> = {
      "Access-Control-Allow-Origin": "*",
    };
    if (X_AUTH_CODE) headers["x-auth-code"] = X_AUTH_CODE;

    const response = await fetch(`${API_BASE}${endpoint}?${params.toString()}`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch report: ${response.status}`);
    }

    let csvText = await response.text();
    
    // Attempt to parse JSON and convert to perfect CSV if backend returned JSON
    try {
      const data = JSON.parse(csvText);
      const arr = Array.isArray(data) ? data : data.rows || [];
      
      if (arr.length > 0) {
        // Extract headers from the first object
        const headers = Object.keys(arr[0]);
        const csvRows = [];
        
        // Push headers row
        csvRows.push(headers.join(","));
        
        // Push data rows
        for (const row of arr) {
          const values = headers.map(header => {
            const val = row[header];
            if (val === null || val === undefined) return "";
            if (typeof val === "object") {
              // Extract sub-fields from objects like fieldUsage/extraFields
              return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
            }
            return `"${String(val).replace(/"/g, '""')}"`;
          });
          csvRows.push(values.join(","));
        }
        
        csvText = csvRows.join("\n");
      }
    } catch (e) {
      // If it's already a CSV string, JSON.parse will fail and we just use the raw text
    }

    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    // Update history record
    const idx = dbStore.reportsHistory.findIndex((r) => r.id === reportId);
    if (idx !== -1) {
      dbStore.reportsHistory[idx].status = "ready";
      dbStore.reportsHistory[idx].downloadUrl = url;
    }
  } catch (err) {
    console.error("Report generation failed:", err);
    const idx = dbStore.reportsHistory.findIndex((r) => r.id === reportId);
    if (idx !== -1) {
      dbStore.reportsHistory[idx].status = "error";
    }
  }

  return reportId;
}

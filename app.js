"use strict";

const OPS_TOKEN_KEY = "islaapp_ops_token";
const OPS_SESSION_TOKEN_KEY = "islaapp_session_token";

(function initSite() {
  setYear();
  initOnboardingChecklist();
  initOnboardingPlan();
  initOnboardingAICoach();
  initGuidePage();
  initAppBuilder();
  initProjectsPage();
  initProviderSetupPage();
  initServicesPage();
  initOpsPage();
  initPricing();
  initSupportForm();
})();

function setYear() {
  const yearNodes = document.querySelectorAll("[data-year]");
  const currentYear = String(new Date().getFullYear());
  yearNodes.forEach((node) => {
    node.textContent = currentYear;
  });
}

function initOnboardingChecklist() {
  const checklist = document.querySelector("#onboardingChecklist");
  const fill = document.querySelector("#onboardingProgressFill");
  const text = document.querySelector("#onboardingProgressText");

  if (!checklist || !fill || !text) return;

  const checkboxes = Array.from(checklist.querySelectorAll("input[type='checkbox'][data-check-id]"));
  const storageKey = "islaapp_onboarding_checks";
  const saved = parseChecklistState(localStorage.getItem(storageKey));

  checkboxes.forEach((box) => {
    if (saved[box.dataset.checkId]) {
      box.checked = true;
    }
    box.addEventListener("change", () => {
      const state = {};
      checkboxes.forEach((item) => {
        state[item.dataset.checkId] = item.checked;
      });
      localStorage.setItem(storageKey, JSON.stringify(state));
      renderChecklistProgress(checkboxes, fill, text);
      emitOnboardingStateChanged();
    });
  });

  renderChecklistProgress(checkboxes, fill, text);
  emitOnboardingStateChanged();
}

function parseChecklistState(rawValue) {
  if (!rawValue) return {};
  try {
    const parsed = JSON.parse(rawValue);
    if (parsed && typeof parsed === "object") return parsed;
  } catch (error) {
    return {};
  }
  return {};
}

function renderChecklistProgress(checkboxes, fill, text) {
  const total = checkboxes.length;
  const done = checkboxes.filter((box) => box.checked).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  fill.style.width = `${pct}%`;
  text.textContent = `${done} of ${total} complete`;
}

function initOnboardingPlan() {
  const intakeForm = document.querySelector("#projectIntake");
  const output = document.querySelector("#planOutput");

  if (!intakeForm || !output) return;

  const intakeStorageKey = "islaapp_onboarding_intake";
  const trackedInputs = Array.from(
    intakeForm.querySelectorAll("input, select, textarea")
  );

  const collectIntake = () => ({
    studentName: valueOf("#studentName"),
    studentEmail: valueOf("#studentEmail"),
    projectType: valueOf("#projectType"),
    launchGoal: valueOf("#launchGoal"),
    timeline: valueOf("#timeline"),
  });

  const saveIntake = () => {
    localStorage.setItem(intakeStorageKey, JSON.stringify(collectIntake()));
  };

  const savedIntake = parseChecklistState(localStorage.getItem(intakeStorageKey));
  setInputValue("#studentName", typeof savedIntake.studentName === "string" ? savedIntake.studentName : "");
  setInputValue("#studentEmail", typeof savedIntake.studentEmail === "string" ? savedIntake.studentEmail : "");
  setSelectValue("#projectType", typeof savedIntake.projectType === "string" ? savedIntake.projectType : "");
  setSelectValue("#launchGoal", typeof savedIntake.launchGoal === "string" ? savedIntake.launchGoal : "");
  setSelectValue("#timeline", typeof savedIntake.timeline === "string" ? savedIntake.timeline : "");

  trackedInputs.forEach((node) => {
    node.addEventListener("input", () => {
      saveIntake();
      emitOnboardingStateChanged();
    });
    node.addEventListener("change", () => {
      saveIntake();
      emitOnboardingStateChanged();
    });
  });

  intakeForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveIntake();

    if (!intakeForm.checkValidity()) {
      showStatus(output, "error", "Missing onboarding details", [
        "Complete all required fields before generating your launch plan.",
      ]);
      emitOnboardingStateChanged();
      return;
    }

    const studentName = valueOf("#studentName");
    const studentEmail = valueOf("#studentEmail");
    const projectType = valueOf("#projectType");
    const launchGoal = valueOf("#launchGoal");
    const timeline = valueOf("#timeline");

    const planLines = [
      `Owner: ${studentName} (${studentEmail})`,
      `Project: ${projectType} focused on ${launchGoal}`,
      `Target timeline: ${timeline}`,
      "Next step: Build your app brief in the App Builder page.",
      "Then select your plan on the pricing page.",
      "Finally, submit support ticket for kickoff scheduling.",
    ];

    showStatus(output, "success", "Launch plan generated", planLines);
    localStorage.setItem("islaapp_launch_plan_generated_at", new Date().toISOString());
    emitOnboardingStateChanged();
  });
}

function emitOnboardingStateChanged() {
  document.dispatchEvent(new Event("onboarding:state-changed"));
}

function initOnboardingAICoach() {
  const summaryRoot = document.querySelector("#onboardingAiSummary");
  const requirementsRoot = document.querySelector("#onboardingAiRequirements");
  const actionsRoot = document.querySelector("#onboardingAiActions");
  const refreshButton = document.querySelector("#onboardingAiRefresh");

  if (!summaryRoot || !requirementsRoot || !actionsRoot) return;

  let providerHealthById = {};

  const checklistState = () => {
    const boxes = Array.from(document.querySelectorAll("#onboardingChecklist input[type='checkbox'][data-check-id]"));
    const state = {};
    boxes.forEach((box) => {
      state[String(box.dataset.checkId || "")] = Boolean(box.checked);
    });
    return state;
  };

  const intakeState = () => {
    const name = valueOf("#studentName");
    const email = valueOf("#studentEmail");
    const projectType = valueOf("#projectType");
    const launchGoal = valueOf("#launchGoal");
    const timeline = valueOf("#timeline");
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const complete = Boolean(name && email && validEmail && projectType && launchGoal && timeline);
    return { name, email, projectType, launchGoal, timeline, complete };
  };

  const builderDraftState = () => {
    const saved = parseChecklistState(localStorage.getItem("islaapp_builder_draft"));
    const stack = typeof saved.stack === "string" ? saved.stack : "";
    const target = typeof saved.target === "string" ? saved.target : "";
    const features = Array.isArray(saved.features) ? saved.features : [];
    const hasDraft = Boolean(stack || target || features.length > 0 || saved.template);
    return {
      stack,
      target,
      features,
      template: typeof saved.template === "string" ? saved.template : "",
      hasDraft,
    };
  };

  const stageLabel = (checks, intakeComplete, missingProviderCount, hasBuilderDraft) => {
    if (!checks.idea) return "Stage 1: Define the idea";
    if (!checks.content || !checks.features) return "Stage 2: Gather requirements";
    if (!intakeComplete) return "Stage 3: Complete intake form";
    if (!hasBuilderDraft || !checks.builder) return "Stage 4: Build app plan";
    if (missingProviderCount > 0) return "Stage 5: Connect provider accounts";
    if (!checks.pricing) return "Stage 6: Pricing and kickoff";
    return "Stage 7: Ready to launch";
  };

  const render = () => {
    const checks = checklistState();
    const intake = intakeState();
    const draft = builderDraftState();
    const requirements = deriveBuilderRequirements({
      stack: draft.stack,
      features: draft.features,
      target: draft.target,
      providerHealthById,
    });

    const requiredMissing = requirements.filter((item) => item.required && !item.ready);
    const label = stageLabel(checks, intake.complete, requiredMissing.length, draft.hasDraft);
    const checklistDone = Object.values(checks).filter(Boolean).length;
    const checklistTotal = Object.keys(checks).length;

    summaryRoot.innerHTML = `
      <h3>${escapeHtml(label)}</h3>
      <ul>
        <li>Checklist progress: ${checklistDone}/${checklistTotal}</li>
        <li>Intake form: ${intake.complete ? "Complete" : "Missing fields"}</li>
        <li>App Builder draft: ${draft.hasDraft ? "Detected" : "Not started"}</li>
        <li>Required services connected: ${requirements.filter((item) => item.required && item.ready).length}/${requirements.filter((item) => item.required).length}</li>
      </ul>
    `;

    if (!draft.hasDraft || requirements.length === 0) {
      requirementsRoot.innerHTML = "<li>After selecting stack/features in App Builder, AI will list database, hosting, GitHub, domain, and more.</li>";
    } else {
      requirementsRoot.innerHTML = requirements
        .map((item) => {
          const stateClass = item.ready ? "status-active" : item.required ? "status-provision-failed" : "status-provisioning";
          const stateText = item.ready ? "Ready" : item.required ? "Missing" : "Optional";
          return `
            <li class="ai-requirement-item">
              <strong>${escapeHtml(item.title)}</strong>
              <span class="status-chip ${stateClass}">${escapeHtml(stateText)}</span>
              <p>${escapeHtml(item.reason || "")}</p>
            </li>
          `;
        })
        .join("");
    }

    const actions = [];
    if (!checks.idea) actions.push(`Define project idea and user type in checklist.`);
    if (!checks.content) actions.push(`Gather logo, colors, and key content.`);
    if (!checks.features) actions.push(`List required features (auth, billing, admin, reports).`);
    if (!intake.complete) {
      actions.push(`Complete the intake form with name, email, project type, launch goal, and timeline.`);
    } else {
      actions.push(`Intake complete. Move to App Builder.`);
    }
    if (!draft.hasDraft || !checks.builder) {
      actions.push(`Open App Builder, choose stack/features, and save draft.`);
    }
    if (requiredMissing.length > 0) {
      actions.push(`Open Setup Wizard and connect required providers.`);
    }
    if (draft.hasDraft && requiredMissing.length === 0) {
      actions.push(`Open Services and submit provisioning request.`);
    }
    if (!checks.pricing) {
      actions.push(`Review pricing and submit kickoff support ticket.`);
    }
    if (actions.length === 0) {
      actions.push(`All onboarding stages are complete. Proceed to launch operations in Ops.`);
    }

    actionsRoot.innerHTML = actions.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  };

  const loadProviderHealth = async () => {
    try {
      const response = await fetch("/api/provider-health");
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Provider health unavailable");
      const providers = Array.isArray(payload.providers) ? payload.providers : [];
      providerHealthById = {};
      providers.forEach((provider) => {
        const id = String(provider.id || "").trim().toLowerCase();
        if (!id) return;
        providerHealthById[id] = Boolean(provider.configured);
      });
    } catch (_error) {
      providerHealthById = {};
    } finally {
      render();
    }
  };

  document.addEventListener("onboarding:state-changed", render);
  window.addEventListener("storage", render);

  if (refreshButton) {
    refreshButton.addEventListener("click", async () => {
      await loadProviderHealth();
    });
  }

  render();
  loadProviderHealth();
}

function initGuidePage() {
  const summaryRoot = document.querySelector("#guideSummary");
  const requirementsRoot = document.querySelector("#guideRequirements");
  const actionsRoot = document.querySelector("#guideActions");
  const journeyRoot = document.querySelector("#guideJourney");
  const primaryAction = document.querySelector("#guidePrimaryAction");
  const refreshButton = document.querySelector("#guideRefresh");

  if (!summaryRoot || !requirementsRoot || !actionsRoot || !journeyRoot || !primaryAction) return;

  let providerHealthById = {};
  let requests = [];
  let projectCount = 0;
  let authState = {
    signedIn: false,
    username: "",
    role: "",
    bootstrapRequired: false,
    requiresAdminToken: false,
  };

  const readChecklist = () => {
    const saved = parseChecklistState(localStorage.getItem("islaapp_onboarding_checks"));
    const keys = ["idea", "content", "features", "builder", "pricing"];
    const state = {};
    keys.forEach((key) => {
      state[key] = Boolean(saved[key]);
    });
    return state;
  };

  const readIntake = () => {
    const saved = parseChecklistState(localStorage.getItem("islaapp_onboarding_intake"));
    const studentName = typeof saved.studentName === "string" ? saved.studentName.trim() : "";
    const studentEmail = typeof saved.studentEmail === "string" ? saved.studentEmail.trim() : "";
    const projectType = typeof saved.projectType === "string" ? saved.projectType.trim() : "";
    const launchGoal = typeof saved.launchGoal === "string" ? saved.launchGoal.trim() : "";
    const timeline = typeof saved.timeline === "string" ? saved.timeline.trim() : "";
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentEmail);
    const complete = Boolean(studentName && studentEmail && validEmail && projectType && launchGoal && timeline);
    return {
      studentName,
      studentEmail,
      projectType,
      launchGoal,
      timeline,
      complete,
      planGeneratedAt: String(localStorage.getItem("islaapp_launch_plan_generated_at") || ""),
    };
  };

  const readBuilderDraft = () => {
    const saved = parseChecklistState(localStorage.getItem("islaapp_builder_draft"));
    const stack = typeof saved.stack === "string" ? saved.stack : "";
    const target = typeof saved.target === "string" ? saved.target : "";
    const features = Array.isArray(saved.features) ? saved.features : [];
    const template = typeof saved.template === "string" ? saved.template : "";
    const hasDraft = Boolean(stack || target || features.length > 0 || template);
    return { stack, target, features, template, hasDraft };
  };

  const summarizeRequests = () => {
    const summary = {
      total: requests.length,
      active: 0,
      failed: 0,
      pending: 0,
      latestStatus: "none",
    };

    const sorted = requests
      .slice()
      .sort((a, b) => new Date(String(b.updatedAt || b.createdAt || 0)).getTime() - new Date(String(a.updatedAt || a.createdAt || 0)).getTime());

    sorted.forEach((request) => {
      const status = String(request.status || "submitted").toLowerCase();
      if (status === "active" || status === "partially_active") {
        summary.active += 1;
      } else if (status === "provision_failed") {
        summary.failed += 1;
      } else if (["submitted", "reviewing", "approved", "provisioning"].includes(status)) {
        summary.pending += 1;
      }
    });

    if (sorted[0] && sorted[0].status) {
      summary.latestStatus = String(sorted[0].status).toLowerCase();
    }

    return summary;
  };

  const setPrimaryAction = (label, href) => {
    primaryAction.textContent = label;
    primaryAction.setAttribute("href", href);
  };

  const stageLabel = ({ checks, intake, draft, requiredMissing, requestSummary }) => {
    if (!checks.idea) return "Stage 1: Define the idea";
    if (!checks.content || !checks.features) return "Stage 2: Complete onboarding checklist";
    if (!intake.complete) return "Stage 3: Complete intake details";
    if (!draft.hasDraft || !checks.builder) return "Stage 4: Build app plan";
    if (requiredMissing.length > 0) return "Stage 5: Connect required providers";
    if (requestSummary.total === 0) return "Stage 6: Submit service request";
    if (requestSummary.failed > 0) return "Stage 7: Fix failed provisioning";
    if (requestSummary.pending > 0) return "Stage 8: Provisioning in progress";
    if (!checks.pricing) return "Stage 9: Confirm pricing and support";
    return "Stage 10: Live and operating";
  };

  const render = () => {
    const checks = readChecklist();
    const intake = readIntake();
    const draft = readBuilderDraft();
    const requirements = deriveBuilderRequirements({
      stack: draft.stack,
      features: draft.features,
      target: draft.target,
      providerHealthById,
    });
    const required = requirements.filter((item) => item.required);
    const requiredMissing = required.filter((item) => !item.ready);
    const requiredReady = required.filter((item) => item.ready).length;
    const requestSummary = summarizeRequests();
    const checksDone = Object.values(checks).filter(Boolean).length;
    const checksTotal = Object.keys(checks).length;
    const currentStage = stageLabel({ checks, intake, draft, requiredMissing, requestSummary });
    const latestStatusClass = `status-chip status-${escapeAttribute(String(requestSummary.latestStatus).replaceAll("_", "-"))}`;

    summaryRoot.innerHTML = `
      <h3>${escapeHtml(currentStage)}</h3>
      <ul>
        <li>Checklist: ${checksDone}/${checksTotal}</li>
        <li>Intake form: ${intake.complete ? "Complete" : "Missing fields"}</li>
        <li>App Builder draft: ${draft.hasDraft ? "Detected" : "Not started"}</li>
        <li>Required services ready: ${requiredReady}/${required.length}</li>
        <li>Service requests: ${requestSummary.total} total (${requestSummary.pending} pending, ${requestSummary.failed} failed, ${requestSummary.active} active)</li>
        <li>Latest request status: <span class="${latestStatusClass}">${escapeHtml(String(requestSummary.latestStatus || "none"))}</span></li>
        <li>Projects scaffolded: ${projectCount}</li>
      </ul>
    `;

    if (!draft.hasDraft || requirements.length === 0) {
      requirementsRoot.innerHTML = "<li>Open App Builder and save a draft to see exact required services.</li>";
    } else {
      requirementsRoot.innerHTML = requirements
        .map((item) => {
          const stateClass = item.ready ? "status-active" : item.required ? "status-provision-failed" : "status-provisioning";
          const stateText = item.ready ? "Ready" : item.required ? "Missing" : "Optional";
          return `
            <li class="ai-requirement-item">
              <strong>${escapeHtml(item.title)}</strong>
              <span class="status-chip ${stateClass}">${escapeHtml(stateText)}</span>
              <p>${escapeHtml(item.reason || "")}</p>
            </li>
          `;
        })
        .join("");
    }

    const actions = [];
    if (!checks.idea) actions.push("Start in Onboarding and define the app idea.");
    if (!checks.content) actions.push("Add logo, colors, and copy in your project planning.");
    if (!checks.features) actions.push("List core features like auth, billing, and reports.");
    if (!intake.complete) actions.push("Complete intake fields in Onboarding.");
    if (!draft.hasDraft || !checks.builder) actions.push("Open App Builder and save a full draft.");
    if (requiredMissing.length > 0) actions.push(`Open Setup Wizard and connect: ${requiredMissing.map((item) => item.title).join(", ")}.`);
    if (requestSummary.total === 0 && draft.hasDraft && requiredMissing.length === 0) {
      actions.push("Open Services, add plans to cart, and submit the first service request.");
    }
    if (requestSummary.failed > 0) actions.push("Open Ops and use Retry Failed after fixing provider keys.");
    if (requestSummary.pending > 0) actions.push("Open Ops and monitor provisioning until requests are active.");
    if (!authState.signedIn && authState.bootstrapRequired) actions.push("In Ops, create the first owner account.");
    if (!authState.signedIn && authState.requiresAdminToken) actions.push("In Ops, sign in or add a legacy admin token to run provisioning actions.");
    if (!checks.pricing) actions.push("Review Pricing and submit Support kickoff ticket.");
    if (actions.length === 0) actions.push("Everything looks ready. Keep monitoring Ops and support users.");

    actionsRoot.innerHTML = actions.map((item) => `<li>${escapeHtml(item)}</li>`).join("");

    if (!checks.idea || !intake.complete) {
      setPrimaryAction("Continue Onboarding", "onboarding.html");
    } else if (!draft.hasDraft || !checks.builder) {
      setPrimaryAction("Open App Builder", "app-builder.html");
    } else if (requiredMissing.length > 0) {
      setPrimaryAction("Connect Providers", "setup.html");
    } else if (requestSummary.total === 0) {
      setPrimaryAction("Submit Service Request", "services.html");
    } else if (requestSummary.failed > 0 || requestSummary.pending > 0) {
      setPrimaryAction("Run Ops Provisioning", "ops.html");
    } else if (!checks.pricing) {
      setPrimaryAction("Review Pricing", "pricing.html");
    } else {
      setPrimaryAction("Open Projects", "projects.html");
    }

    const steps = [
      {
        title: "Onboarding Checklist",
        detail: `${checksDone}/${checksTotal} complete`,
        href: "onboarding.html",
        ready: checksDone === checksTotal && checksTotal > 0,
        working: checksDone > 0 && checksDone < checksTotal,
      },
      {
        title: "Intake + Launch Plan",
        detail: intake.complete ? "Complete" : "Missing required fields",
        href: "onboarding.html",
        ready: intake.complete,
        working: !intake.complete && Boolean(intake.studentName || intake.studentEmail || intake.projectType || intake.launchGoal || intake.timeline),
      },
      {
        title: "App Builder Draft",
        detail: draft.hasDraft ? "Draft saved" : "Not started",
        href: "app-builder.html",
        ready: draft.hasDraft,
        working: false,
      },
      {
        title: "Provider Setup",
        detail: required.length === 0 ? "Waiting for builder selections" : `${requiredReady}/${required.length} ready`,
        href: "setup.html",
        ready: required.length > 0 && requiredReady === required.length,
        working: requiredReady > 0 && requiredReady < required.length,
      },
      {
        title: "Service Request",
        detail: requestSummary.total > 0 ? `${requestSummary.total} request(s)` : "No requests submitted",
        href: "services.html",
        ready: requestSummary.total > 0,
        working: false,
      },
      {
        title: "Ops Provisioning",
        detail: requestSummary.active > 0 ? `${requestSummary.active} active` : requestSummary.failed > 0 ? `${requestSummary.failed} failed` : "Waiting for active status",
        href: "ops.html",
        ready: requestSummary.active > 0 && requestSummary.failed === 0 && requestSummary.pending === 0,
        working: requestSummary.pending > 0,
      },
    ];

    journeyRoot.innerHTML = steps
      .map((step) => {
        const statusClass = step.ready ? "status-active" : step.working ? "status-provisioning" : "status-provision-failed";
        const statusLabel = step.ready ? "Done" : step.working ? "In Progress" : "Next";
        return `
          <article class="journey-step">
            <div class="journey-step-head">
              <h3>${escapeHtml(step.title)}</h3>
              <span class="status-chip ${statusClass}">${escapeHtml(statusLabel)}</span>
            </div>
            <p>${escapeHtml(step.detail)}</p>
            <a class="btn btn-ghost btn-inline" href="${escapeAttribute(step.href)}">Open</a>
          </article>
        `;
      })
      .join("");
  };

  const loadProviderHealth = async () => {
    try {
      const response = await fetch("/api/provider-health");
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Provider health unavailable");
      const providers = Array.isArray(payload.providers) ? payload.providers : [];
      providerHealthById = {};
      providers.forEach((provider) => {
        const id = String(provider.id || "").toLowerCase();
        if (!id) return;
        providerHealthById[id] = Boolean(provider.configured);
      });
    } catch (_error) {
      providerHealthById = {};
    }
  };

  const loadRequests = async () => {
    try {
      const response = await fetch("/api/service-requests");
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Requests unavailable");
      requests = Array.isArray(payload.requests) ? payload.requests : [];
    } catch (_error) {
      requests = [];
    }
  };

  const loadProjects = async () => {
    try {
      const response = await fetch("/api/projects");
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Projects unavailable");
      const projects = Array.isArray(payload.projects) ? payload.projects : [];
      projectCount = projects.length;
    } catch (_error) {
      projectCount = 0;
    }
  };

  const loadAuth = async () => {
    authState = {
      signedIn: false,
      username: "",
      role: "",
      bootstrapRequired: false,
      requiresAdminToken: false,
    };

    try {
      const configResponse = await fetch("/api/auth-config");
      const configPayload = await configResponse.json();
      if (configResponse.ok && configPayload.ok) {
        authState.bootstrapRequired = Boolean(configPayload.bootstrapRequired);
        authState.requiresAdminToken = Boolean(configPayload.requiresAdminToken);
      }
    } catch (_error) {
      // Keep defaults.
    }

    try {
      const sessionResponse = await fetch("/api/auth-session", {
        method: "GET",
        headers: buildAdminHeaders(),
      });
      const sessionPayload = await sessionResponse.json();
      if (sessionResponse.ok && sessionPayload.ok && sessionPayload.authenticated && sessionPayload.user) {
        authState.signedIn = true;
        authState.username = String(sessionPayload.user.username || "");
        authState.role = String(sessionPayload.user.role || "");
      }
    } catch (_error) {
      // Keep defaults.
    }
  };

  const refreshAll = async () => {
    await Promise.all([loadProviderHealth(), loadRequests(), loadProjects(), loadAuth()]);
    render();
  };

  if (refreshButton) {
    refreshButton.addEventListener("click", async () => {
      await refreshAll();
    });
  }

  document.addEventListener("onboarding:state-changed", render);
  window.addEventListener("storage", render);

  render();
  refreshAll();
}

function initAppBuilder() {
  const form = document.querySelector("#builderForm");
  const output = document.querySelector("#builderOutput");
  const saveDraftBtn = document.querySelector("#saveDraftBtn");
  const submitBtn = form ? form.querySelector("button[type='submit']") : null;
  const aiSummary = document.querySelector("#builderAiSummary");
  const aiRequirementsList = document.querySelector("#builderRequirementsList");
  const aiNextActions = document.querySelector("#builderNextActions");
  const fastForm = document.querySelector("#builderFastForm");
  const fastPromptInput = document.querySelector("#builderFastPrompt");
  const fastOwnerInput = document.querySelector("#builderFastOwner");
  const fastSubmitButton = document.querySelector("#builderFastSubmit");
  const fastClearButton = document.querySelector("#builderFastClear");
  const chatLog = document.querySelector("#builderChatLog");
  const chatThinking = document.querySelector("#builderChatThinking");
  const fastPreviewFrame = document.querySelector("#builderFastPreviewFrame");
  const growthPanel = document.querySelector("#builderGrowthPanel");
  const growthList = document.querySelector("#builderGrowthList");

  if (!form || !output) return;

  const stepButtons = Array.from(document.querySelectorAll("[data-step-target]"));
  const stepPanels = Array.from(document.querySelectorAll("[data-step-panel]"));
  const templateInputs = Array.from(form.querySelectorAll("input[name='appTemplate']"));
  const featureInputs = Array.from(form.querySelectorAll("input[name='appFeature']"));
  const storageKey = "islaapp_builder_draft";
  const fastStorageKey = "islaapp_builder_fast_prompt";
  let providerHealthById = {};

  const readFastPromptState = () => parseChecklistState(localStorage.getItem(fastStorageKey));

  const writeFastPromptState = () => {
    if (!(fastPromptInput instanceof HTMLTextAreaElement) || !(fastOwnerInput instanceof HTMLInputElement)) return;
    localStorage.setItem(
      fastStorageKey,
      JSON.stringify({
        prompt: String(fastPromptInput.value || "").trim(),
        owner: String(fastOwnerInput.value || "").trim(),
      })
    );
  };

  const titleWords = (input) =>
    String(input || "")
      .trim()
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());

  const suggestProjectName = (prompt) => {
    const cleaned = String(prompt || "")
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!cleaned) return "My AI App";
    const stopWords = new Set(["build", "create", "make", "app", "website", "site", "for", "with", "the", "a", "an", "to", "and"]);
    const words = cleaned
      .split(" ")
      .filter((word) => word.length > 2 && !stopWords.has(word.toLowerCase()))
      .slice(0, 3);
    const base = words.length > 0 ? titleWords(words.join(" ")).join(" ") : "My AI App";
    return base.endsWith("App") ? base : `${base} App`;
  };

  const inferDraftFromPrompt = (prompt, ownerName) => {
    const rawPrompt = String(prompt || "").trim();
    const normalized = rawPrompt.toLowerCase();

    let template = "SaaS Dashboard";
    if (/(marketplace|ecommerce|store|shop|listing|booking)/.test(normalized)) {
      template = "Marketplace";
    } else if (/(community|social|forum|members|group)/.test(normalized)) {
      template = "Community Platform";
    } else if (/(client|portal|agency|crm|internal|service desk)/.test(normalized)) {
      template = "Client Portal";
    }

    const features = [];
    const maybeAddFeature = (feature, pattern) => {
      if (pattern.test(normalized)) features.push(feature);
    };
    maybeAddFeature("User authentication", /(login|log in|sign in|auth|account|user profile|register)/);
    maybeAddFeature("Team collaboration", /(team|workspace|member|collaborat|multi user|organization)/);
    maybeAddFeature("Payments and billing", /(payment|billing|checkout|subscription|invoice|charge)/);
    maybeAddFeature("Notifications", /(notification|email|sms|alert|reminder|message)/);
    maybeAddFeature("Admin dashboard", /(admin|dashboard|manage|management|backoffice|back office)/);
    maybeAddFeature("Analytics reports", /(analytics|report|kpi|insight|metrics|tracking)/);
    if (features.length === 0) {
      features.push("Admin dashboard", "User authentication");
    }

    let stack = "React + Supabase";
    if (/(landing page|portfolio|simple site|static|html css js)/.test(normalized)) {
      stack = "HTML/CSS/JS";
    } else if (/(next\.?js|nextjs)/.test(normalized)) {
      stack = "Next.js + PostgreSQL";
    } else if (/(node api|express|backend api|rest api)/.test(normalized)) {
      stack = "Node API + React Frontend";
    }

    let target = "MVP in 1 month";
    if (/(today|asap|quick|fast|two weeks|2 weeks|prototype|beta)/.test(normalized)) {
      target = "Beta in 2 weeks";
    } else if (/(production|launch|public)/.test(normalized)) {
      target = "Production in 2 months";
    } else if (/(scale|scaling|enterprise|global)/.test(normalized)) {
      target = "Scale in 3+ months";
    }

    return {
      prompt: rawPrompt,
      projectName: suggestProjectName(rawPrompt),
      owner: String(ownerName || "").trim() || "Founder",
      template,
      features,
      stack,
      target,
      signals: {
        team: /(team|workspace|member|organization|staff|company)/.test(normalized),
        enterprise: /(enterprise|compliance|sso|governance|soc 2|hipaa|sla)/.test(normalized),
        highUsage: /(high traffic|scale|many users|thousands|global)/.test(normalized),
      },
    };
  };

  const quickPreviewHtml = ({ projectName, template, target, features, owner }) => {
    const featureItems = features.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(projectName)} Preview</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Manrope", sans-serif;
        color: #1d2233;
        background: linear-gradient(145deg, #efe7dc, #ddd4c5);
      }
      main {
        width: min(900px, 94vw);
        margin: 1.4rem auto;
        background: #fffaf2;
        border: 1px solid rgba(35, 80, 213, 0.18);
        border-radius: 14px;
        padding: 1rem 1.1rem;
      }
      .badge {
        display: inline-flex;
        border-radius: 999px;
        padding: 0.2rem 0.55rem;
        font-size: 0.75rem;
        font-weight: 700;
        background: linear-gradient(130deg, #2350d5, #e72a6f);
        color: white;
      }
      h1 { margin: 0.6rem 0 0.2rem; font-size: 1.5rem; }
      p { margin: 0.35rem 0; color: #3a4561; }
      ul {
        margin: 0.7rem 0 0;
        padding-left: 1.2rem;
      }
      li + li { margin-top: 0.25rem; }
      .proof {
        margin-top: 1rem;
        border-radius: 10px;
        border: 1px solid rgba(18, 95, 68, 0.35);
        background: #f2faf6;
        padding: 0.65rem 0.75rem;
        color: #125f44;
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <main>
      <span class="badge">${escapeHtml(template)}</span>
      <h1>${escapeHtml(projectName)}</h1>
      <p><strong>Owner:</strong> ${escapeHtml(owner)}</p>
      <p><strong>Launch target:</strong> ${escapeHtml(target)}</p>
      <p><strong>AI generated first working draft:</strong></p>
      <ul>${featureItems}</ul>
      <div class="proof">Preview is live. Next, AI will ask only what is needed to launch.</div>
    </main>
  </body>
</html>`;
  };

  const applyInferredDraftToWizard = (inferred) => {
    const templateMatch = templateInputs.find((input) => input.value === inferred.template);
    if (templateMatch) templateMatch.checked = true;
    featureInputs.forEach((input) => {
      input.checked = inferred.features.includes(input.value);
    });
    setInputValue("#builderProjectName", inferred.projectName);
    setInputValue("#builderOwner", inferred.owner);
    setSelectValue("#builderStack", inferred.stack);
    setSelectValue("#builderTarget", inferred.target);
    updateTemplateUI();
    renderAiGuide();
    setActiveStep(4);
  };

  const scrollChatToBottom = () => {
    if (!(chatLog instanceof HTMLElement)) return;
    chatLog.scrollTop = chatLog.scrollHeight;
  };

  const appendChatMessage = (role, text) => {
    if (!(chatLog instanceof HTMLElement)) return;
    const article = document.createElement("article");
    article.className = `ai-msg ${role === "user" ? "ai-msg-user" : "ai-msg-assistant"}`;
    const paragraph = document.createElement("p");
    paragraph.textContent = String(text || "");
    article.appendChild(paragraph);
    chatLog.appendChild(article);
    scrollChatToBottom();
  };

  const appendChatMessageHtml = (role, htmlContent) => {
    if (!(chatLog instanceof HTMLElement)) return;
    const article = document.createElement("article");
    article.className = `ai-msg ${role === "user" ? "ai-msg-user" : "ai-msg-assistant"}`;
    article.innerHTML = String(htmlContent || "");
    chatLog.appendChild(article);
    scrollChatToBottom();
  };

  const setThinking = (isThinking) => {
    if (!(chatThinking instanceof HTMLElement)) return;
    chatThinking.classList.toggle("hidden", !isThinking);
    if (isThinking) scrollChatToBottom();
  };

  const renderGrowthRecommendations = (inferred) => {
    if (!growthPanel || !growthList) return;
    const requirements = deriveBuilderRequirements({
      stack: inferred.stack,
      features: inferred.features,
      target: inferred.target,
      providerHealthById,
    });
    const missing = requirements.filter((item) => item.required && !item.ready);
    const recommendations = [];

    recommendations.push(
      `AI proved the first build. Next, save this app and continue in <a href="${escapeAttribute("services.html")}">Services</a> when ready.`
    );

    if (missing.length > 0) {
      recommendations.push(
        `Required launch setup detected: ${escapeHtml(missing.map((item) => item.title).join(", "))}. Connect in <a href="${escapeAttribute(
          "setup.html"
        )}">Setup Wizard</a>.`
      );
    }

    if (inferred.signals.enterprise) {
      recommendations.push(
        `Enterprise signal detected (compliance/SSO/governance). Offer <a href="${escapeAttribute(
          "support.html"
        )}">Enterprise contract</a>.`
      );
    } else if (inferred.signals.team || inferred.features.includes("Team collaboration")) {
      recommendations.push(
        `Team workflow detected. Recommend <a href="${escapeAttribute(
          "pricing.html"
        )}">Teams plan</a> for per-user billing and shared controls.`
      );
    } else {
      recommendations.push(
        `For solo builders, start on Free and upgrade to <a href="${escapeAttribute(
          "pricing.html"
        )}">Pro</a> when faster builds and more AI credits are needed.`
      );
    }

    if (inferred.signals.highUsage || inferred.features.length >= 4) {
      recommendations.push(
        `High-usage app detected. Offer credit add-ons from <a href="${escapeAttribute("pricing.html")}">Pricing</a> as usage grows.`
      );
    }

    growthList.innerHTML = recommendations.map((line) => `<li>${line}</li>`).join("");
    growthPanel.classList.remove("hidden");
  };

  const renderFastIdleState = () => {
    if (chatLog instanceof HTMLElement) {
      chatLog.innerHTML = "";
      appendChatMessage(
        "assistant",
        "Tell me what you want to build. I will think, generate the first draft, and then guide your next steps."
      );
    }
    if (fastPreviewFrame instanceof HTMLIFrameElement) {
      fastPreviewFrame.src = "about:blank";
      fastPreviewFrame.srcdoc = "";
    }
    setThinking(false);
    if (growthPanel) growthPanel.classList.add("hidden");
  };

  const inferPreviewUrlFromScaffold = (scaffold, stack) => {
    const pathValue = String(scaffold.projectDir || "");
    if (!pathValue) return "";
    const parts = pathValue.split(/[/\\]/).filter(Boolean);
    const slug = parts.length > 0 ? parts[parts.length - 1] : "";
    if (!slug) return "";
    if (stack === "HTML/CSS/JS") {
      return `/projects/${slug}/index.html`;
    }
    if (stack === "Node API + React Frontend") {
      return `/projects/${slug}/web/index.html`;
    }
    return "";
  };

  const renderAiGuide = () => {
    if (!aiSummary || !aiRequirementsList || !aiNextActions) return;
    const selectedTemplate = form.querySelector("input[name='appTemplate']:checked");
    const selectedFeatures = featureInputs.filter((item) => item.checked).map((item) => item.value);
    const stack = valueOf("#builderStack");
    const target = valueOf("#builderTarget");
    const requirements = deriveBuilderRequirements({
      stack,
      features: selectedFeatures,
      target,
      providerHealthById,
    });
    renderBuilderAiGuide({
      rootSummary: aiSummary,
      rootRequirements: aiRequirementsList,
      rootActions: aiNextActions,
      template: selectedTemplate ? selectedTemplate.value : "",
      stack,
      target,
      requirements,
    });
  };

  const loadProviderHealth = async () => {
    try {
      const response = await fetch("/api/provider-health");
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Provider health unavailable");
      const providers = Array.isArray(payload.providers) ? payload.providers : [];
      providerHealthById = {};
      providers.forEach((provider) => {
        const id = String(provider.id || "").trim().toLowerCase();
        if (!id) return;
        providerHealthById[id] = Boolean(provider.configured);
      });
    } catch (_error) {
      providerHealthById = {};
    } finally {
      renderAiGuide();
    }
  };

  const setActiveStep = (step) => {
    stepButtons.forEach((btn) => {
      const isActive = btn.dataset.stepTarget === String(step);
      btn.classList.toggle("is-active", isActive);
    });
    stepPanels.forEach((panel) => {
      const isActive = panel.dataset.stepPanel === String(step);
      panel.classList.toggle("is-active", isActive);
    });
  };

  const updateTemplateUI = () => {
    const cards = Array.from(form.querySelectorAll(".template-card"));
    cards.forEach((card) => {
      const radio = card.querySelector("input[name='appTemplate']");
      card.classList.toggle("is-selected", Boolean(radio && radio.checked));
    });
  };

  stepButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      setActiveStep(Number(btn.dataset.stepTarget || "1"));
    });
  });

  templateInputs.forEach((input) => {
    input.addEventListener("change", updateTemplateUI);
    input.addEventListener("change", renderAiGuide);
  });

  featureInputs.forEach((input) => {
    input.addEventListener("change", renderAiGuide);
  });

  const stackInput = form.querySelector("#builderStack");
  const targetInput = form.querySelector("#builderTarget");
  if (stackInput) {
    stackInput.addEventListener("change", renderAiGuide);
  }
  if (targetInput) {
    targetInput.addEventListener("change", renderAiGuide);
  }

  const saveDraft = (showSavedMessage) => {
    const selectedTemplate = form.querySelector("input[name='appTemplate']:checked");
    const selectedFeatures = featureInputs.filter((item) => item.checked).map((item) => item.value);

    const draft = {
      template: selectedTemplate ? selectedTemplate.value : "",
      features: selectedFeatures,
      projectName: valueOf("#builderProjectName"),
      owner: valueOf("#builderOwner"),
      stack: valueOf("#builderStack"),
      target: valueOf("#builderTarget"),
    };

    localStorage.setItem(storageKey, JSON.stringify(draft));

    if (showSavedMessage) {
      showStatus(output, "success", "Draft saved", [
        "Your app builder selections were saved in this browser.",
        "You can return later and continue from this draft.",
      ]);
    }
  };

  const savedDraft = parseChecklistState(localStorage.getItem(storageKey));
  if (savedDraft.template) {
    const match = templateInputs.find((input) => input.value === savedDraft.template);
    if (match) match.checked = true;
  }
  if (Array.isArray(savedDraft.features)) {
    featureInputs.forEach((input) => {
      input.checked = savedDraft.features.includes(input.value);
    });
  }
  setInputValue("#builderProjectName", savedDraft.projectName);
  setInputValue("#builderOwner", savedDraft.owner);
  setSelectValue("#builderStack", savedDraft.stack);
  setSelectValue("#builderTarget", savedDraft.target);

  const savedFast = readFastPromptState();
  if (fastPromptInput instanceof HTMLTextAreaElement && typeof savedFast.prompt === "string") {
    fastPromptInput.value = savedFast.prompt;
  }
  if (fastOwnerInput instanceof HTMLInputElement && typeof savedFast.owner === "string") {
    fastOwnerInput.value = savedFast.owner;
  }

  updateTemplateUI();
  setActiveStep(1);
  renderAiGuide();
  loadProviderHealth();
  renderFastIdleState();

  if (saveDraftBtn) {
    saveDraftBtn.addEventListener("click", () => {
      saveDraft(true);
    });
  }

  if (fastPromptInput instanceof HTMLTextAreaElement) {
    fastPromptInput.addEventListener("input", writeFastPromptState);
  }
  if (fastOwnerInput instanceof HTMLInputElement) {
    fastOwnerInput.addEventListener("input", writeFastPromptState);
  }

  if (fastClearButton instanceof HTMLButtonElement) {
    fastClearButton.addEventListener("click", () => {
      if (fastPromptInput instanceof HTMLTextAreaElement) fastPromptInput.value = "";
      if (fastOwnerInput instanceof HTMLInputElement) fastOwnerInput.value = "";
      localStorage.removeItem(fastStorageKey);
      renderFastIdleState();
    });
  }

  if (fastForm) {
    fastForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const prompt = valueOf("#builderFastPrompt");
      const ownerName = valueOf("#builderFastOwner");
      if (!prompt) {
        appendChatMessage("assistant", "Please type your app idea first, then click Send To AI.");
        return;
      }

      appendChatMessage("user", prompt);
      if (fastPromptInput instanceof HTMLTextAreaElement) {
        fastPromptInput.value = "";
      }
      writeFastPromptState();
      if (fastSubmitButton instanceof HTMLButtonElement) {
        fastSubmitButton.disabled = true;
        fastSubmitButton.textContent = "Thinking...";
      }
      setThinking(true);

      try {
        await new Promise((resolve) => window.setTimeout(resolve, 850));
        const inferred = inferDraftFromPrompt(prompt, ownerName);
        applyInferredDraftToWizard(inferred);
        saveDraft(false);
        renderGrowthRecommendations(inferred);

        if (fastPreviewFrame instanceof HTMLIFrameElement) {
          fastPreviewFrame.src = "about:blank";
          fastPreviewFrame.srcdoc = quickPreviewHtml(inferred);
        }

        appendChatMessageHtml(
          "assistant",
          `
            <p>I built your first draft for <strong>${escapeHtml(inferred.projectName)}</strong>.</p>
            <ul>
              <li>Template: ${escapeHtml(inferred.template)}</li>
              <li>Stack: ${escapeHtml(inferred.stack)}</li>
              <li>Target: ${escapeHtml(inferred.target)}</li>
            </ul>
            <p>Preview is now shown on the right.</p>
          `
        );

        const scaffold = await createStarterProject({
          projectName: inferred.projectName,
          owner: inferred.owner,
          template: inferred.template,
          features: inferred.features,
          stack: inferred.stack,
          target: inferred.target,
        });

        if (scaffold.ok) {
          const previewUrl = inferPreviewUrlFromScaffold(scaffold, inferred.stack);
          if (previewUrl && fastPreviewFrame instanceof HTMLIFrameElement) {
            fastPreviewFrame.src = previewUrl;
          }
          const projectDir = escapeHtml(String(scaffold.projectDir || ""));
          const previewLink = previewUrl
            ? `<a href="${escapeAttribute(previewUrl)}" target="_blank" rel="noopener noreferrer">open the preview in a new tab</a>`
            : "review the preview on this page";
          appendChatMessageHtml(
            "assistant",
            `
              <p>Proof complete. I also created your project scaffold at <code>${projectDir}</code>.</p>
              <p>You can ${previewLink}.</p>
              <p>Next: follow the AI Next Steps panel below and connect required providers in <a href="${escapeAttribute(
                "setup.html"
              )}">Setup Wizard</a>.</p>
            `
          );
        } else {
          appendChatMessageHtml(
            "assistant",
            `
              <p>Your AI draft and preview are ready, but project scaffolding failed.</p>
              <p>Reason: ${escapeHtml(scaffold.error || "Unknown error")}.</p>
              <p>Run <code>python3 dev_server.py</code> in this project folder, then try again.</p>
            `
          );
        }
      } catch (error) {
        appendChatMessage("assistant", `I hit an error while building the draft: ${error instanceof Error ? error.message : "Unknown error"}`);
      } finally {
        setThinking(false);
        if (fastSubmitButton instanceof HTMLButtonElement) {
          fastSubmitButton.disabled = false;
          fastSubmitButton.textContent = "Send To AI";
        }
      }
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const template = form.querySelector("input[name='appTemplate']:checked");
    const selectedFeatures = featureInputs.filter((item) => item.checked).map((item) => item.value);
    const projectName = valueOf("#builderProjectName");
    const owner = valueOf("#builderOwner");
    const stack = valueOf("#builderStack");
    const target = valueOf("#builderTarget");

    if (!template || selectedFeatures.length === 0 || !projectName || !owner || !stack || !target) {
      showStatus(output, "error", "Brief not generated", [
        "Select one template, at least one feature, and complete all stack details.",
      ]);
      return;
    }

    saveDraft(false);
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Creating...";
    }

    const briefLines = [
      `Project: ${projectName}`,
      `Owner: ${owner}`,
      `Template: ${template.value}`,
      `Core features: ${selectedFeatures.join(", ")}`,
      `Stack: ${stack}`,
      `Launch target: ${target}`,
    ];

    const scaffold = await createStarterProject({
      projectName,
      owner,
      template: template.value,
      features: selectedFeatures,
      stack,
      target,
    });

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Generate Brief + Create Project";
    }

    if (scaffold.ok) {
      const successLines = briefLines.concat([
        `Project folder created: ${scaffold.projectDir}`,
        `Files: ${(scaffold.files || []).join(", ")}`,
        "Open Projects dashboard: projects.html",
        "Next action: Confirm pricing and submit support kickoff ticket.",
      ]);
      showStatus(output, "success", "App project brief generated", successLines);
    } else {
      const errorLines = briefLines.concat([
        "Could not create folder automatically.",
        `Reason: ${scaffold.error}`,
        "Run: python3 dev_server.py, then submit again.",
      ]);
      showStatus(output, "error", "Brief generated but project not created", errorLines);
    }

    setActiveStep(4);
  });
}

function deriveBuilderRequirements({ stack, features, target, providerHealthById }) {
  const normalizedStack = String(stack || "").toLowerCase();
  const normalizedTarget = String(target || "").toLowerCase();
  const normalizedFeatures = new Set((Array.isArray(features) ? features : []).map((item) => String(item).toLowerCase()));
  const health = providerHealthById && typeof providerHealthById === "object" ? providerHealthById : {};
  const requirements = new Map();

  const addRequirement = (item) => {
    const id = String(item.id || "");
    if (!id) return;
    const existing = requirements.get(id);
    if (!existing) {
      requirements.set(id, { ...item });
      return;
    }
    existing.required = Boolean(existing.required || item.required);
    if (item.reason && !existing.reason.includes(item.reason)) {
      existing.reason = `${existing.reason}; ${item.reason}`;
    }
    if (!existing.providerId && item.providerId) {
      existing.providerId = item.providerId;
    }
  };

  const providerReady = (providerId) => Boolean(health[String(providerId || "").toLowerCase()]);

  if (normalizedStack) {
    addRequirement({
      id: "hosting",
      title: "Hosting (Render)",
      reason: "Needed to deploy your app so users can open it online.",
      actionLabel: "Open Setup Wizard",
      actionHref: "setup.html",
      providerId: "render",
      required: true,
    });
    addRequirement({
      id: "github",
      title: "GitHub Account + Repository",
      reason: "Render deploys from a Git repository.",
      actionLabel: "Create GitHub Account",
      actionHref: "https://github.com/signup",
      providerId: "",
      required: true,
    });
  }

  if (normalizedStack.includes("supabase")) {
    addRequirement({
      id: "database",
      title: "Database (Supabase)",
      reason: "This stack expects Supabase for data and auth services.",
      actionLabel: "Open Setup Wizard",
      actionHref: "setup.html",
      providerId: "supabase",
      required: true,
    });
  } else if (normalizedStack.includes("postgresql") || normalizedStack.includes("node api")) {
    addRequirement({
      id: "database",
      title: "Database (Neon or Supabase)",
      reason: "Backend stack needs a production database.",
      actionLabel: "Open Setup Wizard",
      actionHref: "setup.html",
      providerId: "neon",
      required: true,
    });
  }

  if (normalizedFeatures.has("user authentication")) {
    addRequirement({
      id: "auth",
      title: "Authentication Provider",
      reason: "User login, signup, and sessions need auth configuration.",
      actionLabel: "Use Supabase Auth",
      actionHref: "setup.html",
      providerId: "supabase",
      required: true,
    });
  }

  if (normalizedFeatures.has("team collaboration") || normalizedFeatures.has("analytics reports")) {
    addRequirement({
      id: "database",
      title: "Database (Neon or Supabase)",
      reason: "Collaboration and analytics features require persistent data storage.",
      actionLabel: "Open Setup Wizard",
      actionHref: "setup.html",
      providerId: requirements.has("database") && requirements.get("database").providerId ? requirements.get("database").providerId : "supabase",
      required: true,
    });
  }

  if (normalizedFeatures.has("payments and billing")) {
    addRequirement({
      id: "payments",
      title: "Payment Gateway (Stripe)",
      reason: "Billing features require a payment processor account and API keys.",
      actionLabel: "Open Stripe",
      actionHref: "https://dashboard.stripe.com/register",
      providerId: "",
      required: true,
    });
  }

  if (normalizedFeatures.has("notifications")) {
    addRequirement({
      id: "notifications",
      title: "Email / Notification Service",
      reason: "Notification features require outbound delivery for email or SMS.",
      actionLabel: "Plan Notification Provider",
      actionHref: "support.html",
      providerId: "",
      required: true,
    });
  }

  if (normalizedTarget.includes("mvp") || normalizedTarget.includes("production") || normalizedTarget.includes("scale")) {
    addRequirement({
      id: "domain",
      title: "Domain (Dynadot)",
      reason: "Production launch should use a branded domain.",
      actionLabel: "Open Setup Wizard",
      actionHref: "setup.html",
      providerId: "dynadot",
      required: true,
    });
  } else if (normalizedTarget.includes("beta")) {
    addRequirement({
      id: "domain",
      title: "Domain (Dynadot)",
      reason: "Optional for beta. Required before public launch.",
      actionLabel: "Open Setup Wizard",
      actionHref: "setup.html",
      providerId: "dynadot",
      required: false,
    });
  }

  const output = Array.from(requirements.values()).map((item) => {
    const ready = item.providerId ? providerReady(item.providerId) : false;
    return { ...item, ready };
  });

  output.sort((a, b) => Number(b.required) - Number(a.required));
  return output;
}

function renderBuilderAiGuide({ rootSummary, rootRequirements, rootActions, template, stack, target, requirements }) {
  const items = Array.isArray(requirements) ? requirements : [];
  const requiredItems = items.filter((item) => item.required);
  const readyRequired = requiredItems.filter((item) => item.ready).length;
  const missingRequired = requiredItems.filter((item) => !item.ready);

  if (!template && !stack && !target && items.length === 0) {
    rootSummary.innerHTML = "<h3>Waiting For Your Selections</h3><ul><li>Select stack and features to get live launch requirements.</li></ul>";
    rootRequirements.innerHTML = "<li>Pick a template and at least one feature to see requirements.</li>";
    rootActions.innerHTML = "<li>Complete your selections in the Build Wizard above.</li>";
    return;
  }

  rootSummary.innerHTML = `
    <h3>AI Readiness Summary</h3>
    <ul>
      <li>Template: ${escapeHtml(template || "Not selected yet")}</li>
      <li>Stack: ${escapeHtml(stack || "Not selected yet")}</li>
      <li>Launch target: ${escapeHtml(target || "Not selected yet")}</li>
      <li>Required services ready: ${readyRequired}/${requiredItems.length}</li>
    </ul>
  `;

  if (items.length === 0) {
    rootRequirements.innerHTML = "<li>Select stack and launch target to generate service requirements.</li>";
  } else {
    rootRequirements.innerHTML = items
      .map((item) => {
        const stateClass = item.ready ? "status-active" : item.required ? "status-provision-failed" : "status-provisioning";
        const stateLabel = item.ready ? "Ready" : item.required ? "Missing" : "Optional";
        const link = String(item.actionHref || "").startsWith("http")
          ? `<a class="btn btn-ghost btn-inline" href="${escapeAttribute(item.actionHref)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.actionLabel || "Open")}</a>`
          : `<a class="btn btn-ghost btn-inline" href="${escapeAttribute(item.actionHref || "#")}">${escapeHtml(item.actionLabel || "Open")}</a>`;
        return `
          <li class="ai-requirement-item">
            <strong>${escapeHtml(item.title)}</strong>
            <span class="status-chip ${stateClass}">${escapeHtml(stateLabel)}</span>
            <p>${escapeHtml(item.reason || "")}</p>
            ${link}
          </li>
        `;
      })
      .join("");
  }

  const actionLines = [];
  actionLines.push("Finalize your app selections (template, features, stack, launch target).");
  if (missingRequired.length > 0) {
    const providers = missingRequired.filter((item) => item.providerId).map((item) => item.title);
    if (providers.length > 0) {
      actionLines.push(`Open Setup Wizard and connect: ${providers.join(", ")}.`);
    }
    const external = missingRequired.filter((item) => !item.providerId).map((item) => item.title);
    if (external.length > 0) {
      actionLines.push(`Create required external accounts: ${external.join(", ")}.`);
    }
  } else if (requiredItems.length > 0) {
    actionLines.push("All required services look ready. Continue to Services and provision.");
  }
  actionLines.push("Generate project brief, then open Services to submit provisioning request.");

  rootActions.innerHTML = actionLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
}

async function createStarterProject(payload) {
  try {
    const response = await fetch("/api/create-project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const parsed = await response.json();
    if (!response.ok) {
      return { ok: false, error: parsed.error || "Request failed" };
    }

    return {
      ok: true,
      projectDir: parsed.projectDir || "",
      files: Array.isArray(parsed.files) ? parsed.files : [],
      stack: parsed.stack || "",
    };
  } catch (error) {
    return { ok: false, error: "Server unavailable or page is not served from dev_server.py" };
  }
}

async function initProjectsPage() {
  const list = document.querySelector("#projectsList");
  const status = document.querySelector("#projectsStatus");
  const refreshButton = document.querySelector("#projectsRefresh");

  if (!list || !status) return;

  const loadProjects = async () => {
    status.textContent = "Loading projects...";
    list.innerHTML = "";

    try {
      const response = await fetch("/api/projects");
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Failed to load projects");
      }

      const projects = Array.isArray(payload.projects) ? payload.projects : [];
      if (projects.length === 0) {
        status.textContent = "No projects yet. Generate one in App Builder.";
        return;
      }

      status.textContent = `${projects.length} project(s) found`;
      list.innerHTML = projects
        .map((project) => {
          const title = escapeHtml(String(project.projectName || project.slug || "Untitled"));
          const stack = escapeHtml(String(project.stack || "Unknown"));
          const owner = escapeHtml(String(project.owner || "Unknown"));
          const path = escapeHtml(String(project.path || ""));
          const createdAt = escapeHtml(formatIsoDate(String(project.createdAt || "")));
          const previewUrl = String(project.previewUrl || "");
          const previewAction = previewUrl
            ? `<a class="btn btn-ghost btn-inline" href="${escapeAttribute(previewUrl)}" target="_blank" rel="noopener noreferrer">Preview</a>`
            : "";
          return `
            <article class="project-card">
              <h3>${title}</h3>
              <p><strong>Stack:</strong> ${stack}</p>
              <p><strong>Owner:</strong> ${owner}</p>
              <p><strong>Created:</strong> ${createdAt}</p>
              <p><strong>Path:</strong> <code>${path}</code></p>
              ${previewAction}
            </article>
          `;
        })
        .join("");
    } catch (_error) {
      status.textContent = "Projects unavailable. Run python3 dev_server.py and refresh.";
    }
  };

  if (refreshButton) {
    refreshButton.addEventListener("click", () => {
      loadProjects();
    });
  }

  await loadProjects();
}

async function initOpsPage() {
  const list = document.querySelector("#opsRequestsList");
  const statusNode = document.querySelector("#opsStatus");
  const refreshButton = document.querySelector("#opsRefresh");
  const aiSummary = document.querySelector("#opsAiSummary");
  const aiActions = document.querySelector("#opsAiActions");
  const aiRefreshButton = document.querySelector("#opsAiRefresh");
  const domainInput = document.querySelector("#opsDomainName");
  const regionInput = document.querySelector("#opsRegion");
  const dbPasswordInput = document.querySelector("#opsDbPassword");
  const bootstrapCard = document.querySelector("#opsAuthBootstrapCard");
  const bootstrapForm = document.querySelector("#opsBootstrapForm");
  const loginCard = document.querySelector("#opsAuthLoginCard");
  const loginForm = document.querySelector("#opsLoginForm");
  const logoutButton = document.querySelector("#opsLogoutBtn");
  const authStatus = document.querySelector("#opsAuthStatus");
  const sessionSummary = document.querySelector("#opsSessionSummary");
  const ownerTools = document.querySelector("#opsOwnerTools");
  const createUserForm = document.querySelector("#opsCreateUserForm");
  const createUserStatus = document.querySelector("#opsCreateUserStatus");
  const usersList = document.querySelector("#opsUsersList");
  const tokenInput = document.querySelector("#opsAdminToken");
  const tokenSave = document.querySelector("#opsTokenSave");
  const tokenClear = document.querySelector("#opsTokenClear");
  const tokenStatus = document.querySelector("#opsTokenStatus");

  if (!list || !statusNode) return;

  let authConfig = { bootstrapRequired: false, requiresAdminToken: false };
  let currentUser = null;
  let providerHealthById = {};
  let queueRequests = [];

  const setAuthStatus = (message) => {
    if (authStatus) authStatus.textContent = message;
  };

  const setCreateUserStatus = (message) => {
    if (createUserStatus) createUserStatus.textContent = message;
  };

  const getBuilderDraftState = () => {
    const saved = parseChecklistState(localStorage.getItem("islaapp_builder_draft"));
    const stack = typeof saved.stack === "string" ? saved.stack : "";
    const target = typeof saved.target === "string" ? saved.target : "";
    const features = Array.isArray(saved.features) ? saved.features : [];
    const hasDraft = Boolean(stack || target || features.length > 0 || saved.template);
    return { stack, target, features, hasDraft };
  };

  const summarizeQueue = () => {
    const summary = {
      total: queueRequests.length,
      active: 0,
      failed: 0,
      pending: 0,
      latestStatus: "none",
    };

    const sorted = queueRequests
      .slice()
      .sort((a, b) => new Date(String(b.updatedAt || b.createdAt || 0)).getTime() - new Date(String(a.updatedAt || a.createdAt || 0)).getTime());

    sorted.forEach((request) => {
      const status = String(request.status || "submitted").toLowerCase();
      if (status === "active" || status === "partially_active") {
        summary.active += 1;
      } else if (status === "provision_failed") {
        summary.failed += 1;
      } else if (["submitted", "reviewing", "approved", "provisioning"].includes(status)) {
        summary.pending += 1;
      }
    });

    if (sorted[0] && sorted[0].status) {
      summary.latestStatus = String(sorted[0].status).toLowerCase();
    }

    return summary;
  };

  const renderOpsAICoach = () => {
    if (!aiSummary || !aiActions) return;

    const draft = getBuilderDraftState();
    const requirements = deriveBuilderRequirements({
      stack: draft.stack,
      features: draft.features,
      target: draft.target,
      providerHealthById,
    });
    const required = requirements.filter((item) => item.required);
    const requiredReady = required.filter((item) => item.ready).length;
    const requiredMissing = required.filter((item) => !item.ready);
    const queue = summarizeQueue();

    const isSignedIn = Boolean(currentUser);
    const role = isSignedIn ? String(currentUser.role || "viewer") : "none";
    const hasLegacyToken = Boolean(getOpsToken());
    const canProvision = role === "owner" || role === "admin" || (!isSignedIn && hasLegacyToken);

    const providerIdsInQueue = new Set();
    queueRequests.forEach((request) => {
      const items = Array.isArray(request.items) ? request.items : [];
      items.forEach((item) => {
        const providerId = String(item.providerId || "").toLowerCase();
        if (providerId) providerIdsInQueue.add(providerId);
      });
    });
    const missingQueueProviders = Array.from(providerIdsInQueue).filter((id) => !providerHealthById[id]);

    const latestStatusClass = `status-chip status-${escapeAttribute(String(queue.latestStatus).replaceAll("_", "-"))}`;
    const authLine = isSignedIn
      ? `Signed in as ${escapeHtml(String(currentUser.username || "user"))} (${escapeHtml(role)}).`
      : authConfig.bootstrapRequired
        ? "Not signed in. Bootstrap is required."
        : authConfig.requiresAdminToken
          ? "Not signed in. Admin token or session is required for ops actions."
          : "Not signed in.";

    aiSummary.innerHTML = `
      <h3>Ops AI Launch Control</h3>
      <ul>
        <li>${authLine}</li>
        <li>Queue: ${queue.total} total, ${queue.pending} pending, ${queue.failed} failed, ${queue.active} active</li>
        <li>Latest queue status: <span class="${latestStatusClass}">${escapeHtml(String(queue.latestStatus || "none"))}</span></li>
        <li>Required launch services ready: ${requiredReady}/${required.length}</li>
      </ul>
    `;

    const actions = [];
    if (authConfig.bootstrapRequired && !isSignedIn) {
      actions.push("Create the first owner account in Bootstrap Owner.");
    } else if (!isSignedIn && authConfig.requiresAdminToken && !hasLegacyToken) {
      actions.push("Sign in or paste a legacy admin token to run provisioning actions.");
    }
    if (!draft.hasDraft) {
      actions.push("Open App Builder and save a draft so AI can verify full launch requirements.");
    }
    if (requiredMissing.length > 0) {
      actions.push(`Open Setup Wizard and connect: ${requiredMissing.map((item) => item.title).join(", ")}.`);
    }
    if (missingQueueProviders.length > 0) {
      actions.push(`Queue references unconfigured providers: ${missingQueueProviders.join(", ")}. Fix these first in Setup Wizard.`);
    }
    if (queue.total === 0) {
      actions.push("No requests in queue. Open Services and submit your first service request.");
    } else if (queue.failed > 0) {
      actions.push("Select failed requests and click Retry Failed after confirming keys in Setup Wizard.");
    }
    if (queue.pending > 0) {
      if (canProvision) {
        actions.push("For pending requests, click Provision Now to run live provider actions.");
      } else {
        actions.push("Pending requests need admin or owner access before you can click Provision Now.");
      }
    }
    if (queue.active > 0 && queue.pending === 0 && queue.failed === 0) {
      actions.push("Queue is healthy. Continue monitoring and support users as they onboard.");
    }
    if (actions.length === 0) {
      actions.push("Ops is ready. Keep monitoring queue updates and provider health.");
    }

    aiActions.innerHTML = actions.map((action) => `<li>${escapeHtml(action)}</li>`).join("");
  };

  const renderUsers = (users) => {
    if (!usersList) return;
    if (!Array.isArray(users) || users.length === 0) {
      usersList.innerHTML = "<li>No users yet.</li>";
      return;
    }
    usersList.innerHTML = users
      .map((user) => {
        const username = escapeHtml(String(user.username || ""));
        const role = escapeHtml(String(user.role || "viewer"));
        const createdAt = escapeHtml(formatIsoDate(String(user.createdAt || "")));
        return `<li><strong>${username}</strong> (${role}) - created ${createdAt}</li>`;
      })
      .join("");
  };

  const loadUsers = async () => {
    if (!currentUser || currentUser.role !== "owner") {
      renderUsers([]);
      return;
    }
    try {
      const response = await fetch("/api/auth-users", {
        method: "GET",
        headers: buildAdminHeaders(),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Could not load users");
      renderUsers(Array.isArray(result.users) ? result.users : []);
    } catch (_error) {
      renderUsers([]);
      setCreateUserStatus("Could not load users.");
    }
  };

  const renderAuthUI = async () => {
    const signedIn = Boolean(currentUser);
    const needsBootstrap = Boolean(authConfig.bootstrapRequired);
    if (bootstrapCard) bootstrapCard.classList.toggle("hidden", !needsBootstrap || signedIn);
    if (loginCard) loginCard.classList.toggle("hidden", needsBootstrap || signedIn);
    if (logoutButton) logoutButton.classList.toggle("hidden", !signedIn);
    if (ownerTools) ownerTools.classList.toggle("hidden", !signedIn || currentUser.role !== "owner");

    if (sessionSummary) {
      if (signedIn) {
        const userName = String(currentUser.username || "unknown");
        const userRole = String(currentUser.role || "viewer");
        const source = String(currentUser.source || "session");
        sessionSummary.textContent = `Signed in as ${userName} (${userRole}) via ${source}.`;
      } else {
        sessionSummary.textContent = "Not signed in.";
      }
    }

    if (signedIn && currentUser.role === "owner") {
      await loadUsers();
    } else {
      renderUsers([]);
    }
  };

  const loadRequests = async () => {
    statusNode.textContent = "Loading request queue...";
    list.innerHTML = "";
    try {
      const response = await fetch("/api/service-requests");
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Queue unavailable");
      const requests = Array.isArray(payload.requests) ? payload.requests : [];
      queueRequests = requests;
      if (requests.length === 0) {
        statusNode.textContent = "No requests in queue.";
        renderOpsAICoach();
        return;
      }

      statusNode.textContent = `${requests.length} request(s) in queue`;
      list.innerHTML = requests
        .slice(0, 40)
        .map((request) => {
          const requestId = String(request.requestId || "");
          const currentStatus = String(request.status || "submitted").toLowerCase();
          const statusClass = `status-chip status-${escapeAttribute(currentStatus.replaceAll("_", "-"))}`;
          const items = Array.isArray(request.items)
            ? request.items.map((item) => `${item.providerName}: ${item.planLabel}`).join(", ")
            : "No items";

          const statusOptions = getRequestStatusOptions()
            .map((status) => `<option value="${status}" ${status === currentStatus ? "selected" : ""}>${status}</option>`)
            .join("");

          return `
            <article class="ops-request-card" data-request-id="${escapeAttribute(requestId)}">
              <div class="ops-request-header">
                <h3>${escapeHtml(requestId)}</h3>
                <span class="${statusClass}">${escapeHtml(currentStatus)}</span>
              </div>
              <p><strong>Project:</strong> ${escapeHtml(String(request.projectName || ""))}</p>
              <p><strong>Customer:</strong> ${escapeHtml(String(request.customerName || ""))} (${escapeHtml(String(request.email || ""))})</p>
              <p><strong>Items:</strong> ${escapeHtml(items)}</p>
              <p><strong>Total:</strong> $${Number(request.total || 0).toFixed(2)}</p>
              <p><strong>Updated:</strong> ${escapeHtml(formatIsoDate(String(request.updatedAt || request.createdAt || "")))}</p>
              <div class="ops-actions">
                <label class="form-field">
                  Status
                  <select data-status-select>${statusOptions}</select>
                </label>
                <button class="btn btn-ghost btn-inline" type="button" data-ops-action="set-status">Update Status</button>
                <button class="btn btn-primary btn-inline" type="button" data-ops-action="provision-all">Provision Now</button>
                <button class="btn btn-ghost btn-inline" type="button" data-ops-action="retry-failed">Retry Failed</button>
              </div>
            </article>
          `;
        })
        .join("");
      renderOpsAICoach();
    } catch (_error) {
      queueRequests = [];
      statusNode.textContent = "Queue unavailable. Run python3 dev_server.py.";
      renderOpsAICoach();
    }
  };

  const submitProvision = async (requestId, retryFailed) => {
    const payload = {
      requestId,
      retryFailed,
      domainName: domainInput ? valueOf("#opsDomainName") : "",
      region: regionInput ? valueOf("#opsRegion") : "",
      dbPassword: dbPasswordInput ? valueOf("#opsDbPassword") : "",
    };
    return await provisionServiceRequest(payload);
  };

  const refreshAdminHealth = async () => {
    if (!tokenStatus) return;
    tokenStatus.textContent = "Checking ops authorization...";
    try {
      const response = await fetch("/api/admin-health", {
        method: "GET",
        headers: buildAdminHeaders(),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Health check failed");
      if (result.authorized) {
        const role = String(result.role || "viewer");
        const username = String(result.username || "user");
        tokenStatus.textContent = `Authorized as ${username} (${role}).`;
      } else if (result.requiresAdminToken) {
        tokenStatus.textContent = "Not authorized. Sign in or provide a valid admin token.";
      } else {
        tokenStatus.textContent = "Sign in as admin/owner to run status and provisioning actions.";
      }
    } catch (_error) {
      tokenStatus.textContent = "Admin health unavailable. Run python3 dev_server.py.";
    } finally {
      renderOpsAICoach();
    }
  };

  const loadProviderHealth = async () => {
    try {
      const response = await fetch("/api/provider-health");
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Provider health unavailable");
      const providers = Array.isArray(payload.providers) ? payload.providers : [];
      providerHealthById = {};
      providers.forEach((provider) => {
        const id = String(provider.id || "").toLowerCase();
        if (!id) return;
        providerHealthById[id] = Boolean(provider.configured);
      });
    } catch (_error) {
      providerHealthById = {};
    } finally {
      renderOpsAICoach();
    }
  };

  const refreshAuthState = async () => {
    try {
      const configResponse = await fetch("/api/auth-config");
      const configPayload = await configResponse.json();
      if (configResponse.ok && configPayload.ok) {
        authConfig = {
          bootstrapRequired: Boolean(configPayload.bootstrapRequired),
          requiresAdminToken: Boolean(configPayload.requiresAdminToken),
        };
      }
    } catch (_error) {
      // Keep defaults.
    }

    try {
      const sessionResponse = await fetch("/api/auth-session", {
        method: "GET",
        headers: buildAdminHeaders(),
      });
      const sessionPayload = await sessionResponse.json();
      if (sessionResponse.ok && sessionPayload.ok && sessionPayload.authenticated && sessionPayload.user) {
        currentUser = sessionPayload.user;
      } else {
        currentUser = null;
      }
    } catch (_error) {
      currentUser = null;
    }

    await renderAuthUI();
    if (authConfig.bootstrapRequired) {
      setAuthStatus("Bootstrap required. Create the first owner account.");
    } else if (currentUser) {
      setAuthStatus("Session active.");
    } else {
      setAuthStatus("Sign in with username/password or use a legacy admin token.");
    }
    await refreshAdminHealth();
    renderOpsAICoach();
  };

  list.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest("[data-ops-action]");
    if (!(button instanceof HTMLButtonElement)) return;
    const card = button.closest("[data-request-id]");
    if (!(card instanceof HTMLElement)) return;
    const requestId = card.dataset.requestId || "";
    const action = button.dataset.opsAction || "";
    if (!requestId) return;

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "Working...";

    try {
      if (action === "set-status") {
        const select = card.querySelector("[data-status-select]");
        if (!(select instanceof HTMLSelectElement)) throw new Error("Missing status selector");
        const response = await fetch("/api/service-request-status", {
          method: "POST",
          headers: buildAdminHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            requestId,
            status: select.value,
            reason: "ops dashboard update",
          }),
        });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.error || "Status update failed");
      } else if (action === "provision-all") {
        await submitProvision(requestId, false);
      } else if (action === "retry-failed") {
        await submitProvision(requestId, true);
      }

      await loadRequests();
    } catch (error) {
      statusNode.textContent = error instanceof Error ? error.message : "Action failed";
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  });

  if (refreshButton) {
    refreshButton.addEventListener("click", async () => {
      await loadRequests();
      await loadProviderHealth();
    });
  }

  if (aiRefreshButton) {
    aiRefreshButton.addEventListener("click", async () => {
      await loadRequests();
      await loadProviderHealth();
      await refreshAdminHealth();
    });
  }

  if (tokenInput) {
    tokenInput.value = getOpsToken();
  }
  if (tokenSave) {
    tokenSave.addEventListener("click", async () => {
      if (!tokenInput) return;
      setOpsToken(tokenInput.value.trim());
      await refreshAdminHealth();
    });
  }
  if (tokenClear) {
    tokenClear.addEventListener("click", async () => {
      setOpsToken("");
      if (tokenInput) tokenInput.value = "";
      await refreshAdminHealth();
    });
  }

  if (bootstrapForm) {
    bootstrapForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const usernameField = bootstrapForm.querySelector("#opsBootstrapUsername");
      const passwordField = bootstrapForm.querySelector("#opsBootstrapPassword");
      const submitButton = bootstrapForm.querySelector("button[type='submit']");
      const username = usernameField instanceof HTMLInputElement ? usernameField.value.trim() : "";
      const password = passwordField instanceof HTMLInputElement ? passwordField.value : "";

      if (!username || !password) {
        setAuthStatus("Username and password are required.");
        return;
      }

      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = true;
        submitButton.textContent = "Creating...";
      }
      try {
        const response = await fetch("/api/auth-bootstrap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.error || "Bootstrap failed");
        setOpsSessionToken(String(result.sessionToken || ""));
        currentUser = result.user || null;
        authConfig.bootstrapRequired = false;
        if (usernameField instanceof HTMLInputElement) usernameField.value = "";
        if (passwordField instanceof HTMLInputElement) passwordField.value = "";
        setAuthStatus("Owner account created and signed in.");
        await renderAuthUI();
        await refreshAdminHealth();
      } catch (error) {
        setAuthStatus(error instanceof Error ? error.message : "Bootstrap failed");
      } finally {
        if (submitButton instanceof HTMLButtonElement) {
          submitButton.disabled = false;
          submitButton.textContent = "Create Owner + Sign In";
        }
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const usernameField = loginForm.querySelector("#opsLoginUsername");
      const passwordField = loginForm.querySelector("#opsLoginPassword");
      const submitButton = loginForm.querySelector("button[type='submit']");
      const username = usernameField instanceof HTMLInputElement ? usernameField.value.trim() : "";
      const password = passwordField instanceof HTMLInputElement ? passwordField.value : "";

      if (!username || !password) {
        setAuthStatus("Username and password are required.");
        return;
      }

      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = true;
        submitButton.textContent = "Signing In...";
      }
      try {
        const response = await fetch("/api/auth-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.error || "Login failed");
        setOpsSessionToken(String(result.sessionToken || ""));
        currentUser = result.user || null;
        if (usernameField instanceof HTMLInputElement) usernameField.value = "";
        if (passwordField instanceof HTMLInputElement) passwordField.value = "";
        setAuthStatus("Signed in.");
        await renderAuthUI();
        await refreshAdminHealth();
      } catch (error) {
        setAuthStatus(error instanceof Error ? error.message : "Login failed");
      } finally {
        if (submitButton instanceof HTMLButtonElement) {
          submitButton.disabled = false;
          submitButton.textContent = "Sign In";
        }
      }
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      const sessionToken = getOpsSessionToken();
      try {
        await fetch("/api/auth-logout", {
          method: "POST",
          headers: buildAdminHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ sessionToken }),
        });
      } catch (_error) {
        // Ignore logout network issues and clear local state.
      }
      setOpsSessionToken("");
      currentUser = null;
      setAuthStatus("Signed out.");
      await renderAuthUI();
      await refreshAdminHealth();
    });
  }

  if (createUserForm) {
    createUserForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const usernameField = createUserForm.querySelector("#opsCreateUsername");
      const passwordField = createUserForm.querySelector("#opsCreatePassword");
      const roleField = createUserForm.querySelector("#opsCreateRole");
      const submitButton = createUserForm.querySelector("button[type='submit']");

      const username = usernameField instanceof HTMLInputElement ? usernameField.value.trim() : "";
      const password = passwordField instanceof HTMLInputElement ? passwordField.value : "";
      const role = roleField instanceof HTMLSelectElement ? roleField.value : "viewer";

      if (!username || !password) {
        setCreateUserStatus("Username and password are required.");
        return;
      }

      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = true;
        submitButton.textContent = "Creating...";
      }
      try {
        const response = await fetch("/api/auth-users", {
          method: "POST",
          headers: buildAdminHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ username, password, role }),
        });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.error || "User creation failed");
        setCreateUserStatus(`User ${username} created as ${role}.`);
        if (usernameField instanceof HTMLInputElement) usernameField.value = "";
        if (passwordField instanceof HTMLInputElement) passwordField.value = "";
        await loadUsers();
      } catch (error) {
        setCreateUserStatus(error instanceof Error ? error.message : "User creation failed");
      } finally {
        if (submitButton instanceof HTMLButtonElement) {
          submitButton.disabled = false;
          submitButton.textContent = "Create User";
        }
      }
    });
  }

  await loadRequests();
  await loadProviderHealth();
  await refreshAuthState();
  renderOpsAICoach();
}

async function initServicesPage() {
  const catalogRoot = document.querySelector("#servicesCatalog");
  const cartRoot = document.querySelector("#servicesCartList");
  const totalNode = document.querySelector("#servicesCartTotal");
  const providerHealthRoot = document.querySelector("#providerHealthList");
  const aiSummary = document.querySelector("#servicesAiSummary");
  const aiActions = document.querySelector("#servicesAiActions");
  const aiRefreshButton = document.querySelector("#servicesAiRefresh");
  const form = document.querySelector("#serviceRequestForm");
  const statusNode = document.querySelector("#serviceRequestStatus");
  const requestsRoot = document.querySelector("#serviceRequestsList");
  const requestsStatus = document.querySelector("#serviceRequestsStatus");
  const refreshButton = document.querySelector("#serviceRequestsRefresh");

  if (!catalogRoot || !cartRoot || !totalNode || !form || !statusNode || !requestsRoot || !requestsStatus) return;

  let catalog = null;
  let cart = [];
  let providerHealthById = {};
  let serviceRequests = [];

  const getBuilderDraftState = () => {
    const saved = parseChecklistState(localStorage.getItem("islaapp_builder_draft"));
    const stack = typeof saved.stack === "string" ? saved.stack : "";
    const target = typeof saved.target === "string" ? saved.target : "";
    const features = Array.isArray(saved.features) ? saved.features : [];
    const hasDraft = Boolean(stack || target || features.length > 0 || saved.template);
    return { stack, target, features, hasDraft };
  };

  const summarizeRequestStates = () => {
    const summary = {
      total: serviceRequests.length,
      active: 0,
      failed: 0,
      pending: 0,
      latestStatus: "none",
    };

    const sorted = serviceRequests
      .slice()
      .sort((a, b) => new Date(String(b.updatedAt || b.createdAt || 0)).getTime() - new Date(String(a.updatedAt || a.createdAt || 0)).getTime());

    sorted.forEach((request) => {
      const status = String(request.status || "submitted").toLowerCase();
      if (status === "active" || status === "partially_active") {
        summary.active += 1;
      } else if (status === "provision_failed") {
        summary.failed += 1;
      } else if (["submitted", "reviewing", "approved", "provisioning"].includes(status)) {
        summary.pending += 1;
      }
    });

    if (sorted[0] && sorted[0].status) {
      summary.latestStatus = String(sorted[0].status).toLowerCase();
    }

    return summary;
  };

  const renderServicesAICoach = () => {
    if (!aiSummary || !aiActions) return;

    const draft = getBuilderDraftState();
    const requirements = deriveBuilderRequirements({
      stack: draft.stack,
      features: draft.features,
      target: draft.target,
      providerHealthById,
    });
    const required = requirements.filter((item) => item.required);
    const requiredReady = required.filter((item) => item.ready).length;
    const requiredMissing = required.filter((item) => !item.ready);
    const queue = summarizeRequestStates();
    const latestStatusClass = `status-chip status-${escapeAttribute(String(queue.latestStatus).replaceAll("_", "-"))}`;

    aiSummary.innerHTML = `
      <h3>AI Service Readiness</h3>
      <ul>
        <li>Selected services in cart: ${cart.length}</li>
        <li>Required launch services ready: ${requiredReady}/${required.length}</li>
        <li>Requests: ${queue.total} total, ${queue.pending} pending, ${queue.failed} failed, ${queue.active} active</li>
        <li>Latest status: <span class="${latestStatusClass}">${escapeHtml(String(queue.latestStatus || "none"))}</span></li>
      </ul>
    `;

    const actions = [];
    if (!draft.hasDraft) {
      actions.push("Open App Builder and save a draft so AI can map required services automatically.");
    }
    if (requiredMissing.length > 0) {
      actions.push(`Open Setup Wizard and connect: ${requiredMissing.map((item) => item.title).join(", ")}.`);
    }
    if (cart.length === 0) {
      actions.push("Select at least one plan from the Provider Catalog.");
    }

    const customerName = valueOf("#serviceCustomerName");
    const email = valueOf("#serviceEmail");
    const projectName = valueOf("#serviceProjectName");
    if (!customerName || !email || !projectName) {
      actions.push("Complete Full Name, Email, and Project Name in Service Request Builder.");
    }

    if (serviceRequests.length === 0) {
      actions.push("Submit your first service request.");
    } else if (queue.failed > 0) {
      actions.push("Open Ops and click Retry Failed after fixing provider keys in Setup Wizard.");
    } else if (queue.pending > 0) {
      actions.push("Open Ops to monitor pending requests and run Provision Now if needed.");
    } else if (queue.active > 0) {
      actions.push("Core services are active. Continue with launch testing and support handoff.");
    }

    if (actions.length === 0) {
      actions.push("Services are ready. Continue scaling by adding additional provider plans as needed.");
    }

    aiActions.innerHTML = actions.map((action) => `<li>${escapeHtml(action)}</li>`).join("");
  };

  const renderCart = () => {
    if (cart.length === 0) {
      cartRoot.innerHTML = "<li>No services selected yet.</li>";
      totalNode.textContent = "$0.00";
      renderServicesAICoach();
      return;
    }

    const itemRows = cart
      .map((item, index) => {
        const label = `${item.providerName} - ${item.serviceName} (${item.planLabel}, ${item.billingCycle})`;
        return `
          <li>
            <span>${escapeHtml(label)}</span>
            <div class="cart-item-actions">
              <strong>$${Number(item.price).toFixed(2)}</strong>
              <button type="button" class="btn btn-ghost btn-inline" data-remove-item="${index}">Remove</button>
            </div>
          </li>
        `;
      })
      .join("");

    cartRoot.innerHTML = itemRows;
    const total = cart.reduce((sum, item) => sum + Number(item.price), 0);
    totalNode.textContent = `$${total.toFixed(2)}`;
    renderServicesAICoach();
  };

  const addToCart = (item) => {
    const existing = cart.find(
      (entry) =>
        entry.providerId === item.providerId &&
        entry.serviceId === item.serviceId &&
        entry.planId === item.planId &&
        entry.billingCycle === item.billingCycle
    );
    if (existing) return;
    cart.push(item);
    renderCart();
  };

  const renderCatalog = () => {
    if (!catalog || !Array.isArray(catalog.providers) || catalog.providers.length === 0) {
      catalogRoot.innerHTML = "<p class='muted'>No providers available.</p>";
      return;
    }

    catalogRoot.innerHTML = catalog.providers
      .map((provider) => {
        const services = Array.isArray(provider.services) ? provider.services : [];
        const serviceCards = services
          .map((service) => {
            const plans = Array.isArray(service.plans) ? service.plans : [];
            const planButtons = plans
              .flatMap((plan) => {
                const billing = plan.billing && typeof plan.billing === "object" ? plan.billing : {};
                return Object.entries(billing).map(([cycle, price]) => {
                  const normalizedCycle = String(cycle).toLowerCase();
                  const cycleLabel = normalizedCycle === "monthly" ? "/mo" : normalizedCycle === "yearly" ? "/yr" : `/${normalizedCycle}`;
                  return `
                    <button
                      type="button"
                      class="plan-choice"
                      data-add-service="true"
                      data-provider-id="${escapeAttribute(String(provider.id || ""))}"
                      data-provider-name="${escapeAttribute(String(provider.name || ""))}"
                      data-service-id="${escapeAttribute(String(service.id || ""))}"
                      data-service-name="${escapeAttribute(String(service.name || ""))}"
                      data-plan-id="${escapeAttribute(String(plan.id || ""))}"
                      data-plan-label="${escapeAttribute(String(plan.label || ""))}"
                      data-billing-cycle="${escapeAttribute(normalizedCycle)}"
                      data-price="${escapeAttribute(String(price))}"
                    >
                      <span>${escapeHtml(String(plan.label || ""))}</span>
                      <strong>$${Number(price).toFixed(2)}${escapeHtml(cycleLabel)}</strong>
                    </button>
                  `;
                });
              })
              .join("");

            return `
              <article class="service-block">
                <h3>${escapeHtml(String(service.name || ""))}</h3>
                <p>${escapeHtml(String(service.description || ""))}</p>
                <div class="plan-choice-grid">
                  ${planButtons}
                </div>
              </article>
            `;
          })
          .join("");

        return `
          <section class="provider-card">
            <header>
              <h3>${escapeHtml(String(provider.name || ""))}</h3>
              <span class="provider-type">${escapeHtml(String(provider.category || "service"))}</span>
            </header>
            <p>${escapeHtml(String(provider.description || ""))}</p>
            ${serviceCards}
          </section>
        `;
      })
      .join("");
  };

  const loadCatalog = async () => {
    catalogRoot.innerHTML = "<p class='muted'>Loading provider catalog...</p>";
    try {
      const response = await fetch("/api/providers");
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Catalog unavailable");
      catalog = payload.catalog || { providers: [] };
      renderCatalog();
    } catch (_error) {
      catalog = fallbackProviderCatalog();
      renderCatalog();
      const fallbackNote = document.createElement("p");
      fallbackNote.className = "muted";
      fallbackNote.textContent = "Using built-in catalog. Start python3 dev_server.py for live API mode.";
      catalogRoot.prepend(fallbackNote);
    }
  };

  const loadProviderHealth = async () => {
    if (!providerHealthRoot) return;
    providerHealthRoot.innerHTML = "<p class='muted'>Checking provider API configuration...</p>";
    try {
      const response = await fetch("/api/provider-health");
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Provider health unavailable");
      const providers = Array.isArray(payload.providers) ? payload.providers : [];
      providerHealthById = {};
      providers.forEach((provider) => {
        const id = String(provider.id || "").toLowerCase();
        if (!id) return;
        providerHealthById[id] = Boolean(provider.configured);
      });
      providerHealthRoot.innerHTML = providers
        .map((provider) => {
          const configured = Boolean(provider.configured);
          const required = Array.isArray(provider.required) ? provider.required.join(", ") : "";
          const note = String(provider.note || "");
          return `
            <div class="provider-health-item ${configured ? "is-ready" : "is-missing"}">
              <strong>${escapeHtml(String(provider.id || "provider"))}</strong>
              <span>${configured ? "Configured" : "Missing keys"}</span>
              <small>${escapeHtml(required)}</small>
              ${note ? `<small>${escapeHtml(note)}</small>` : ""}
            </div>
          `;
        })
        .join("");
    } catch (_error) {
      providerHealthById = {};
      providerHealthRoot.innerHTML =
        "<p class='muted'>Provider health unavailable. Start python3 dev_server.py and set API env keys.</p>";
    } finally {
      renderServicesAICoach();
    }
  };

  const loadRequests = async () => {
    requestsStatus.textContent = "Loading service requests...";
    requestsRoot.innerHTML = "";
    try {
      const response = await fetch("/api/service-requests");
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Requests unavailable");
      const requests = Array.isArray(payload.requests) ? payload.requests : [];
      serviceRequests = requests;
      if (requests.length === 0) {
        requestsStatus.textContent = "No service requests yet.";
        renderServicesAICoach();
        return;
      }

      requestsStatus.textContent = `${requests.length} request(s) found`;
      requestsRoot.innerHTML = requests
        .slice(0, 12)
        .map((request) => {
          const items = Array.isArray(request.items)
            ? request.items
                .map((item) => `${item.providerName}: ${item.serviceName} (${item.planLabel}, ${item.billingCycle})`)
                .join(" | ")
            : "No items";
          return `
            <article class="request-card">
              <h3>${escapeHtml(String(request.requestId || "Request"))}</h3>
              <p><strong>Project:</strong> ${escapeHtml(String(request.projectName || ""))}</p>
              <p><strong>Customer:</strong> ${escapeHtml(String(request.customerName || ""))}</p>
              <p><strong>Total:</strong> $${Number(request.total || 0).toFixed(2)}</p>
              <p><strong>Items:</strong> ${escapeHtml(items)}</p>
              <p><strong>Status:</strong> ${escapeHtml(String(request.status || "submitted"))}</p>
              <p><strong>Updated:</strong> ${escapeHtml(formatIsoDate(String(request.updatedAt || request.createdAt || "")))}</p>
            </article>
          `;
        })
        .join("");
      renderServicesAICoach();
    } catch (_error) {
      serviceRequests = [];
      requestsStatus.textContent = "Request history unavailable. Run python3 dev_server.py.";
      renderServicesAICoach();
    }
  };

  catalogRoot.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest("[data-add-service='true']");
    if (!(button instanceof HTMLElement)) return;

    addToCart({
      providerId: button.dataset.providerId || "",
      providerName: button.dataset.providerName || "",
      serviceId: button.dataset.serviceId || "",
      serviceName: button.dataset.serviceName || "",
      planId: button.dataset.planId || "",
      planLabel: button.dataset.planLabel || "",
      billingCycle: button.dataset.billingCycle || "",
      price: Number(button.dataset.price || 0),
    });
  });

  cartRoot.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest("[data-remove-item]");
    if (!(button instanceof HTMLElement)) return;
    const index = Number(button.dataset.removeItem);
    if (!Number.isInteger(index) || index < 0 || index >= cart.length) return;
    cart = cart.filter((_, idx) => idx !== index);
    renderCart();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const customerName = valueOf("#serviceCustomerName");
    const email = valueOf("#serviceEmail");
    const projectName = valueOf("#serviceProjectName");
    const domainName = valueOf("#serviceDomainName");
    const region = valueOf("#serviceRegion");
    const dbPassword = valueOf("#serviceDbPassword");
    const notes = valueOf("#serviceNotes");
    const autoProvision = Boolean(document.querySelector("#serviceAutoProvision:checked"));

    if (!customerName || !email || !projectName) {
      showStatus(statusNode, "error", "Request not submitted", ["Complete name, email, and project fields."]);
      return;
    }
    if (cart.length === 0) {
      showStatus(statusNode, "error", "Request not submitted", ["Select at least one external service plan."]);
      return;
    }

    const payload = {
      customerName,
      email,
      projectName,
      notes,
      items: cart.map((item) => ({
        providerId: item.providerId,
        serviceId: item.serviceId,
        planId: item.planId,
        billingCycle: item.billingCycle,
      })),
    };

    try {
      const response = await fetch("/api/service-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Submission failed");

      const request = result.request || {};
      const lines = [
        `Request ID: ${request.requestId || "N/A"}`,
        `Total estimate: $${Number(request.total || 0).toFixed(2)}`,
      ];

      if (autoProvision && request.requestId) {
        const provisionResult = await provisionServiceRequest({
          requestId: String(request.requestId),
          domainName,
          region,
          dbPassword,
        });
        if (provisionResult.ok) {
          const summary = provisionResult.summary || {};
          lines.push(
            `Provisioning complete: ${Number(summary.success || 0)} success, ${Number(summary.failed || 0)} failed`,
            `Final status: ${String((provisionResult.request || {}).status || "unknown")}`
          );
        } else {
          lines.push(`Provisioning failed: ${provisionResult.error || "Unknown error"}`);
        }
      } else {
        lines.push("Provisioning skipped. You can run it later from this dashboard.");
      }

      showStatus(statusNode, "success", "Service request submitted", lines);

      form.reset();
      cart = [];
      renderCart();
      if (providerHealthRoot) await loadProviderHealth();
      await loadRequests();
    } catch (error) {
      showStatus(statusNode, "error", "Request not submitted", [error instanceof Error ? error.message : "Server unavailable"]);
      renderServicesAICoach();
    }
  });

  const trackedFields = Array.from(form.querySelectorAll("input, select, textarea"));
  trackedFields.forEach((field) => {
    field.addEventListener("input", renderServicesAICoach);
    field.addEventListener("change", renderServicesAICoach);
  });

  if (refreshButton) {
    refreshButton.addEventListener("click", async () => {
      await loadRequests();
      await loadProviderHealth();
    });
  }

  if (aiRefreshButton) {
    aiRefreshButton.addEventListener("click", async () => {
      await loadProviderHealth();
      await loadRequests();
    });
  }

  renderCart();
  renderServicesAICoach();
  await loadCatalog();
  await loadProviderHealth();
  await loadRequests();
}

async function initProviderSetupPage() {
  const form = document.querySelector("#providerSetupForm");
  const statusNode = document.querySelector("#providerSetupStatus");
  const savedKeysRoot = document.querySelector("#providerSetupSavedKeys");
  const healthRoot = document.querySelector("#providerSetupHealth");
  const refreshButton = document.querySelector("#providerSetupTest");

  if (!form || !statusNode || !savedKeysRoot || !healthRoot) return;

  const fieldMap = {
    RENDER_API_KEY: "#setupRenderApiKey",
    RENDER_SERVICE_REPO: "#setupRenderRepo",
    RENDER_OWNER_ID: "#setupRenderOwnerId",
    DYNADOT_API_KEY: "#setupDynadotApiKey",
    DYNADOT_AUTO_REGISTER: "#setupDynadotAutoRegister",
    DYNADOT_REGISTRATION_YEARS: "#setupDynadotYears",
    SUPABASE_ACCESS_TOKEN: "#setupSupabaseAccessToken",
    SUPABASE_ORG_ID: "#setupSupabaseOrgId",
    SUPABASE_DB_PASS: "#setupSupabaseDbPass",
    NEON_API_KEY: "#setupNeonApiKey",
    DEFAULT_REGION: "#setupDefaultRegion",
    DEFAULT_DB_PASSWORD: "#setupDefaultDbPassword",
  };

  const fieldLabels = {
    RENDER_API_KEY: "Render API Key",
    RENDER_SERVICE_REPO: "Render Repo URL",
    RENDER_OWNER_ID: "Render Owner ID",
    DYNADOT_API_KEY: "Dynadot API Key",
    DYNADOT_AUTO_REGISTER: "Dynadot Auto Register",
    DYNADOT_REGISTRATION_YEARS: "Dynadot Registration Years",
    SUPABASE_ACCESS_TOKEN: "Supabase Access Token",
    SUPABASE_ORG_ID: "Supabase Org ID",
    SUPABASE_DB_PASS: "Supabase DB Password",
    NEON_API_KEY: "Neon API Key",
    DEFAULT_REGION: "Default Region",
    DEFAULT_DB_PASSWORD: "Default DB Password",
  };

  const collectValues = () => {
    const values = {};
    Object.entries(fieldMap).forEach(([key, selector]) => {
      const input = document.querySelector(selector);
      if (!(input instanceof HTMLInputElement || input instanceof HTMLSelectElement || input instanceof HTMLTextAreaElement)) {
        return;
      }
      values[key] = String(input.value || "").trim();
    });
    return values;
  };

  const renderSavedKeys = (savedKeys, maskedValues) => {
    const keys = Array.isArray(savedKeys) ? savedKeys : [];
    if (keys.length === 0) {
      savedKeysRoot.innerHTML = "<li>No provider keys saved yet.</li>";
      return;
    }
    savedKeysRoot.innerHTML = keys
      .map((key) => {
        const label = fieldLabels[key] || key;
        const masked = maskedValues && maskedValues[key] ? ` (${maskedValues[key]})` : "";
        return `<li><strong>${escapeHtml(label)}</strong>${escapeHtml(masked)}</li>`;
      })
      .join("");
  };

  const renderHealth = (providers) => {
    const items = Array.isArray(providers) ? providers : [];
    if (items.length === 0) {
      healthRoot.innerHTML = "<p class='muted'>Health check not available.</p>";
      return;
    }
    healthRoot.innerHTML = items
      .map((provider) => {
        const isReady = Boolean(provider.configured);
        const className = `provider-health-item ${isReady ? "is-ready" : "is-missing"}`;
        const required = Array.isArray(provider.required) ? provider.required.join(", ") : "";
        const note = provider.note ? `<small>${escapeHtml(String(provider.note))}</small>` : "";
        return `
          <article class="${className}">
            <span>${escapeHtml(String(provider.id || "").toUpperCase())}</span>
            <small>${isReady ? "Connected" : "Missing setup values"}</small>
            <small>Required: ${escapeHtml(required)}</small>
            ${note}
          </article>
        `;
      })
      .join("");
  };

  const refreshHealth = async () => {
    try {
      const response = await fetch("/api/provider-health");
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Health check failed");
      renderHealth(payload.providers);
    } catch (_error) {
      renderHealth([]);
    }
  };

  const loadSavedConfig = async () => {
    try {
      const response = await fetch("/api/provider-config", {
        method: "GET",
        headers: buildAdminHeaders(),
      });
      const payload = await response.json();
      if (response.status === 401 || response.status === 403) {
        showStatus(statusNode, "error", "Sign in required", [
          "Open Ops page and sign in as admin or owner first.",
          "Then return here to save provider settings.",
        ]);
        renderSavedKeys([], {});
        return;
      }
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Failed to load saved settings");
      renderSavedKeys(payload.savedKeys, payload.values);
    } catch (_error) {
      renderSavedKeys([], {});
      showStatus(statusNode, "error", "Settings unavailable", ["Could not load saved provider settings."]);
    }
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector("button[type='submit']");
    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = true;
      submitButton.textContent = "Saving...";
    }

    try {
      const response = await fetch("/api/provider-config", {
        method: "POST",
        headers: buildAdminHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ values: collectValues() }),
      });
      const payload = await response.json();
      if (response.status === 401 || response.status === 403) {
        showStatus(statusNode, "error", "Sign in required", [
          "Open Ops page and sign in as admin or owner first.",
          "Then retry saving provider settings.",
        ]);
        return;
      }
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Save failed");

      renderSavedKeys(payload.savedKeys, payload.values);
      showStatus(statusNode, "success", "Provider settings saved", [
        "Your provider keys are stored in this local workspace.",
        "Use Test Connections to confirm all providers are ready.",
      ]);
      await refreshHealth();
    } catch (error) {
      showStatus(statusNode, "error", "Could not save settings", [
        error instanceof Error ? error.message : "Unknown save error.",
      ]);
    } finally {
      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = false;
        submitButton.textContent = "Save Provider Settings";
      }
    }
  });

  if (refreshButton) {
    refreshButton.addEventListener("click", async () => {
      await refreshHealth();
      showStatus(statusNode, "success", "Connection test complete", [
        "Review each provider card below to confirm connected status.",
      ]);
    });
  }

  await loadSavedConfig();
  await refreshHealth();
}

async function provisionServiceRequest(payload) {
  try {
    const response = await fetch("/api/provision-request", {
      method: "POST",
      headers: buildAdminHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      return { ok: false, error: result.error || "Provisioning request failed" };
    }
    return { ok: true, request: result.request || {}, summary: result.summary || {} };
  } catch (_error) {
    return { ok: false, error: "Provisioning endpoint unavailable" };
  }
}

function fallbackProviderCatalog() {
  return {
    currency: "USD",
    providers: [
      {
        id: "render",
        name: "Render",
        category: "hosting",
        description: "Managed hosting for web services and APIs.",
        services: [
          {
            id: "managed-web-hosting",
            name: "Managed Web Hosting",
            description: "Deploy frontend and backend apps with managed infrastructure.",
            plans: [
              { id: "starter", label: "Starter", billing: { monthly: 7 } },
              { id: "pro", label: "Pro", billing: { monthly: 25 } },
              { id: "team", label: "Team", billing: { monthly: 85 } },
            ],
          },
        ],
      },
      {
        id: "dynadot",
        name: "Dynadot",
        category: "domain",
        description: "Domain registration and DNS management with API access.",
        services: [
          {
            id: "domain-registration",
            name: "Domain Registration",
            description: "Register and connect a domain with DNS controls.",
            plans: [
              { id: "dot-com", label: "Single Domain", billing: { yearly: 14 } },
              { id: "dot-net", label: "Business Domain", billing: { yearly: 16 } },
              { id: "dot-org", label: "Organization Domain", billing: { yearly: 13 } },
            ],
          },
        ],
      },
      {
        id: "supabase",
        name: "Supabase",
        category: "database",
        description: "Postgres database, auth, and storage backend.",
        services: [
          {
            id: "managed-postgres",
            name: "Managed Postgres",
            description: "Hosted Postgres with auth and API helpers.",
            plans: [
              { id: "free", label: "Free", billing: { monthly: 0 } },
              { id: "pro", label: "Pro", billing: { monthly: 25 } },
              { id: "team", label: "Team", billing: { monthly: 99 } },
            ],
          },
        ],
      },
      {
        id: "neon",
        name: "Neon",
        category: "database",
        description: "Serverless PostgreSQL for production apps.",
        services: [
          {
            id: "serverless-postgres",
            name: "Serverless PostgreSQL",
            description: "Auto-scaling Postgres with branching workflows.",
            plans: [
              { id: "launch", label: "Launch", billing: { monthly: 19 } },
              { id: "scale", label: "Scale", billing: { monthly: 69 } },
            ],
          },
        ],
      },
    ],
  };
}

function initPricing() {
  const toggleButtons = Array.from(document.querySelectorAll("[data-billing]"));
  const planCards = Array.from(document.querySelectorAll("[data-plan]"));
  const hint = document.querySelector("#billingHint");

  if (toggleButtons.length > 0 && planCards.length > 0) {
    let activeBilling = "monthly";

    toggleButtons.forEach((button) => {
      button.addEventListener("click", () => {
        activeBilling = button.dataset.billing === "yearly" ? "yearly" : "monthly";
        toggleButtons.forEach((btn) => btn.classList.toggle("is-active", btn === button));
        updatePlanCardPrices(planCards, activeBilling);
        if (hint) {
          hint.textContent =
            activeBilling === "yearly"
              ? "Yearly billing selected. Pro and Teams are discounted."
              : "Monthly billing selected. Switch to yearly to lower recurring cost.";
        }
      });
    });

    updatePlanCardPrices(planCards, activeBilling);
  }

  const seatInput = document.querySelector("#calcSeats");
  const seatLabel = document.querySelector("#seatCountLabel");
  const planSelect = document.querySelector("#calcPlan");
  const creditsSelect = document.querySelector("#calcCredits");
  const billingSelect = document.querySelector("#calcBilling");
  const result = document.querySelector("#calcResult");

  if (!seatInput || !seatLabel || !planSelect || !creditsSelect || !billingSelect || !result) return;

  const recalc = () => {
    const seats = Number(seatInput.value);
    const plan = planSelect.value;
    const credits = Number(creditsSelect.value);
    const billing = billingSelect.value;
    const isYearly = billing === "yearly";
    const creditCostByPack = { 0: 0, 250: 10, 1000: 40, 5000: 180 };
    const creditCost = creditCostByPack[credits] || 0;

    seatLabel.textContent = String(seats);

    if (plan === "enterprise") {
      result.textContent = `Enterprise is custom. Add-on credits estimate: $${creditCost}/month + contract pricing`;
      return;
    }

    let monthlyTotal = 0;
    if (plan === "free") {
      monthlyTotal = creditCost;
    } else if (plan === "pro") {
      const proBase = isYearly ? 12 : 15;
      const extraSeats = Math.max(0, seats - 1);
      monthlyTotal = proBase + extraSeats * proBase + creditCost;
    } else if (plan === "teams") {
      const effectiveSeats = Math.max(3, seats);
      const teamSeatRate = isYearly ? 24 : 30;
      monthlyTotal = effectiveSeats * teamSeatRate + creditCost;
    }

    result.textContent = isYearly
      ? `$${Math.round(monthlyTotal)}/month estimated total (billed yearly)`
      : `$${Math.round(monthlyTotal)}/month estimated total`;
  };

  seatInput.addEventListener("input", recalc);
  planSelect.addEventListener("change", recalc);
  creditsSelect.addEventListener("change", recalc);
  billingSelect.addEventListener("change", recalc);
  recalc();
}

function updatePlanCardPrices(planCards, billing) {
  planCards.forEach((card) => {
    const monthly = Number(card.dataset.priceMonthly || 0);
    const yearly = Number(card.dataset.priceYearly || 0);
    const priceNode = card.querySelector("[data-price]");
    const cycleNode = card.querySelector("[data-cycle]");

    if (!priceNode || !cycleNode) return;

    const cycleMonthly = String(card.dataset.cycleMonthly || "/mo");
    const cycleYearly = String(card.dataset.cycleYearly || "/mo (yearly)");

    if (billing === "yearly") {
      priceNode.textContent = String(yearly);
      cycleNode.textContent = cycleYearly;
    } else {
      priceNode.textContent = String(monthly);
      cycleNode.textContent = cycleMonthly;
    }
  });
}

function initSupportForm() {
  const form = document.querySelector("#supportForm");
  const status = document.querySelector("#supportStatus");

  if (!form || !status) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const email = valueOf("#supportEmail");
    const message = valueOf("#supportMessage");
    const urgency = valueOf("#supportUrgency");
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!form.checkValidity() || !validEmail || message.length < 25) {
      showStatus(status, "error", "Support request not submitted", [
        "Complete all required fields.",
        "Use a valid email and include at least 25 characters in your message.",
      ]);
      return;
    }

    const ticketId = createTicketId();
    const responseWindow =
      urgency === "high" ? "within 4 business hours" : urgency === "normal" ? "within 1 business day" : "within 2 business days";

    showStatus(status, "success", "Support ticket submitted", [
      `Ticket ID: ${ticketId}`,
      `Expected first response: ${responseWindow}`,
      "A copy of this request will be sent to your email.",
    ]);

    form.reset();
  });
}

function createTicketId() {
  const date = new Date();
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const random = Math.floor(1000 + Math.random() * 9000);
  return `IA-${stamp}-${random}`;
}

function showStatus(container, type, title, lines) {
  const listItems = lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
  container.classList.remove("hidden", "success", "error");
  container.classList.add(type === "error" ? "error" : "success");
  container.innerHTML = `<h3>${escapeHtml(title)}</h3><ul>${listItems}</ul>`;
}

function valueOf(selector) {
  const node = document.querySelector(selector);
  return node ? String(node.value || "").trim() : "";
}

function setInputValue(selector, value) {
  const node = document.querySelector(selector);
  if (!node || typeof value !== "string") return;
  node.value = value;
}

function setSelectValue(selector, value) {
  const node = document.querySelector(selector);
  if (!node || typeof value !== "string") return;
  const options = Array.from(node.options || []);
  const hasValue = options.some((option) => option.value === value || option.text === value);
  if (hasValue) {
    node.value = value;
  }
}

function formatIsoDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
}

function getRequestStatusOptions() {
  return [
    "submitted",
    "reviewing",
    "approved",
    "provisioning",
    "active",
    "partially_active",
    "provision_failed",
    "on_hold",
    "cancelled",
  ];
}

function escapeHtml(input) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(input) {
  return input.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

function getOpsToken() {
  try {
    return String(localStorage.getItem(OPS_TOKEN_KEY) || "");
  } catch (_error) {
    return "";
  }
}

function getOpsSessionToken() {
  try {
    return String(localStorage.getItem(OPS_SESSION_TOKEN_KEY) || "");
  } catch (_error) {
    return "";
  }
}

function setOpsToken(token) {
  try {
    if (!token) {
      localStorage.removeItem(OPS_TOKEN_KEY);
    } else {
      localStorage.setItem(OPS_TOKEN_KEY, token);
    }
  } catch (_error) {
    // Ignore storage limitations.
  }
}

function setOpsSessionToken(token) {
  try {
    if (!token) {
      localStorage.removeItem(OPS_SESSION_TOKEN_KEY);
    } else {
      localStorage.setItem(OPS_SESSION_TOKEN_KEY, token);
    }
  } catch (_error) {
    // Ignore storage limitations.
  }
}

function buildAdminHeaders(baseHeaders = {}) {
  const headers = { ...baseHeaders };
  const token = getOpsToken();
  if (token) {
    headers["X-Admin-Token"] = token;
  }
  const sessionToken = getOpsSessionToken();
  if (sessionToken) {
    headers.Authorization = `Bearer ${sessionToken}`;
    return headers;
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

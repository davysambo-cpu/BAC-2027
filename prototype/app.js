(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const loginView = $("#login-view");
  const studentShell = $("#student-shell");
  const adminShell = $("#admin-shell");
  const toast = $("#toast");

  const state = {
    online: true,
    studentView: "dashboard",
    resourceTab: "personal",
    adminView: "admin-dashboard",
    quizIndex: 0,
    quizAnswers: [],
    toastTimer: null,
    syncTimer: null,
  };

  const quizQuestions = [
    {
      text: "Quelle est la limite de 1/x lorsque x tend vers +∞ ?",
      options: ["+∞", "1", "0", "Elle n'existe pas"],
      correct: 2,
    },
    {
      text: "Une fonction continue en a vérifie nécessairement quelle relation ?",
      options: ["f(a) = 0", "lim f(x) quand x tend vers a = f(a)", "f est croissante", "f est dérivable partout"],
      correct: 1,
    },
    {
      text: "Si une suite converge, laquelle de ces affirmations est toujours vraie ?",
      options: ["Elle est constante", "Elle tend vers +∞", "Elle est bornée", "Tous ses termes sont positifs"],
      correct: 2,
    },
  ];

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function showToast(message, type = "default") {
    clearTimeout(state.toastTimer);
    toast.textContent = message;
    toast.classList.toggle("toast-error", type === "error");
    toast.hidden = false;
    state.toastTimer = window.setTimeout(() => {
      toast.hidden = true;
    }, 3600);
  }

  function setShell(shell) {
    loginView.hidden = shell !== "login";
    studentShell.hidden = shell !== "student";
    adminShell.hidden = shell !== "admin";
    document.body.classList.toggle("in-app", shell !== "login");
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function setStudentView(view, { focus = true } = {}) {
    if (!$("#view-" + view)) return;
    state.studentView = view;
    setShell("student");

    $$("[data-page]", studentShell).forEach((page) => {
      const active = page.dataset.page === view;
      page.classList.toggle("active", active);
      page.hidden = !active;
    });

    $$('[data-view]', studentShell).forEach((button) => {
      const active = button.dataset.view === view;
      button.classList.toggle("active", active);
      if (button.closest("nav")) {
        if (active) button.setAttribute("aria-current", "page");
        else button.removeAttribute("aria-current");
      }
    });

    if (view !== "quiz") resetQuizPanels();
    history.replaceState(null, "", `#${view}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (focus) $("#main-content")?.focus({ preventScroll: true });
  }

  function setAdminView(view) {
    if (!$("#" + view)) return;
    state.adminView = view;
    setShell("admin");

    $$(".admin-view", adminShell).forEach((page) => {
      const active = page.id === view;
      page.classList.toggle("active", active);
      page.hidden = !active;
    });

    $$('[data-admin-view]', adminShell).forEach((button) => {
      const active = button.dataset.adminView === view;
      button.classList.toggle("active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });

    history.replaceState(null, "", `#${view}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
    $(".admin-content")?.focus({ preventScroll: true });
  }

  function showLogin() {
    setShell("login");
    history.replaceState(null, "", "#connexion");
    window.setTimeout(() => $("#username")?.focus(), 50);
  }

  function openDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function closeDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  function setResourceTab(tab) {
    state.resourceTab = tab;
    $$('[data-resource-tab]').forEach((button) => {
      const active = button.dataset.resourceTab === tab;
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
    });
    $$(".resource-panel").forEach((panel) => {
      panel.hidden = panel.id !== `resources-${tab}`;
    });
    const search = $("#resource-search");
    if (search) search.value = "";
    filterResources("");
  }

  function filterResources(query) {
    const panel = $(`#resources-${state.resourceTab}`);
    if (!panel) return;
    const normalized = query.trim().toLocaleLowerCase("fr");
    let visibleCount = 0;
    $$(".searchable", panel).forEach((card) => {
      const matches = !normalized || (card.dataset.search || card.textContent).toLocaleLowerCase("fr").includes(normalized);
      card.hidden = !matches;
      if (matches) visibleCount += 1;
    });
    const noResults = $("#resource-no-results");
    if (noResults) noResults.hidden = state.resourceTab !== "personal" || visibleCount > 0;
  }

  function iconIdForType(type) {
    const icons = { Note: "note", Document: "file", Image: "image", Audio: "audio", "Vidéo": "video" };
    return icons[type] || "file";
  }

  function iconClassForType(type) {
    const classes = { Note: "note", Document: "pdf", Image: "image", Audio: "audio", "Vidéo": "video" };
    return classes[type] || "pdf";
  }

  function addResource(form) {
    if (!form.reportValidity()) return false;
    const data = new FormData(form);
    const title = data.get("title");
    const subject = data.get("subject");
    const chapter = data.get("chapter") || "Non classé";
    const type = data.get("resource-type") || "Note";
    const safeTitle = escapeHtml(title);
    const safeSubject = escapeHtml(subject);
    const safeChapter = escapeHtml(chapter);
    const safeType = escapeHtml(type);
    const icon = iconIdForType(type);
    const iconClass = iconClassForType(type);
    const syncClass = state.online ? "status-success" : "status-warning pending-status";
    const syncIcon = state.online ? "check" : "refresh";
    const syncText = state.online ? "Synchronisé" : "À synchroniser";

    const card = document.createElement("article");
    card.className = "resource-card searchable";
    card.dataset.search = `${safeTitle} ${safeSubject} ${safeChapter} ${safeType}`.toLocaleLowerCase("fr");
    card.innerHTML = `
      <button class="resource-card-main" type="button" data-resource-detail data-title="${safeTitle}" data-meta="${safeType} · ${safeSubject} · ${safeChapter}">
        <span class="resource-type-icon file-icon-${iconClass}"><svg class="icon"><use href="#icon-${icon}"></use></svg></span>
        <span class="resource-card-copy"><span class="subject-tag">${safeSubject}</span><strong>${safeTitle}</strong><small>${safeType} · Ajoutée maintenant</small></span>
      </button>
      <div class="resource-card-footer"><span class="status ${syncClass}"><svg class="icon"><use href="#icon-${syncIcon}"></use></svg>${syncText}</span><button class="icon-button" type="button" aria-label="Plus d'actions" data-demo-message="Les actions Modifier, Télécharger et Supprimer seront regroupées ici.">•••</button></div>`;
    $("#personal-resource-grid")?.prepend(card);

    const counter = $("#resource-count");
    if (counter) counter.textContent = String(Number.parseInt(counter.textContent, 10) + 1);
    form.reset();
    const noteType = $('input[name="resource-type"][value="Note"]', form);
    if (noteType) noteType.checked = true;
    $("#note-content-field").hidden = false;
    closeDialog($("#resource-dialog"));
    setStudentView("resources", { focus: false });
    setResourceTab("personal");
    showToast(state.online ? "Ressource ajoutée et synchronisée." : "Ressource enregistrée sur cet appareil. Elle sera synchronisée plus tard.");
    return true;
  }

  function addSession(form) {
    if (!form.reportValidity()) return false;
    const data = new FormData(form);
    const title = escapeHtml(data.get("title"));
    const subject = escapeHtml(data.get("subject"));
    const duration = escapeHtml(data.get("duration"));
    const time = escapeHtml(data.get("time"));
    const group = document.createElement("div");
    group.className = "day-group";
    group.innerHTML = `
      <div class="day-label"><span>NOUV.</span><strong>17</strong></div>
      <div class="day-sessions"><article class="session-card"><span class="session-color math"></span><div><span class="subject-tag">${subject}</span><h3>${title}</h3><p><svg class="icon"><use href="#icon-clock"></use></svg>${time} · ${duration}</p></div><button class="session-check" type="button" aria-label="Marquer cette séance comme terminée"><svg class="icon"><use href="#icon-check"></use></svg></button></article></div>`;
    $("#session-list")?.prepend(group);
    form.reset();
    $("#session-date").value = "2026-10-17";
    $("#session-time").value = "16:00";
    closeDialog($("#session-dialog"));
    setStudentView("planning", { focus: false });
    showToast(state.online ? "Séance ajoutée au planning." : "Séance enregistrée hors ligne et placée en attente.");
    return true;
  }

  function updateConnectionUI() {
    document.body.classList.toggle("is-offline", !state.online);
    const toggle = $("#connection-toggle");
    const banner = $("#offline-banner");
    if (toggle) toggle.setAttribute("aria-pressed", String(!state.online));
    if (banner) banner.hidden = state.online;
    const label = $(".connection-label");
    if (label) label.textContent = state.online ? "Synchronisé" : "Hors ligne";
  }

  function setOnline(online) {
    clearTimeout(state.syncTimer);
    state.online = online;
    updateConnectionUI();
    if (!online) {
      showToast("Mode hors ligne simulé. Votre travail restera sur cet appareil.");
      return;
    }

    const label = $(".connection-label");
    if (label) label.textContent = "Synchronisation…";
    showToast("Connexion retrouvée. Synchronisation en cours…");
    state.syncTimer = window.setTimeout(() => {
      if (!state.online) return;
      if (label) label.textContent = "Synchronisé";
      $$(".pending-status").forEach((status) => {
        status.classList.remove("status-warning", "pending-status");
        status.classList.add("status-success");
        status.innerHTML = '<svg class="icon"><use href="#icon-check"></use></svg>Synchronisé';
      });
      const syncTitle = $(".sync-card h2");
      if (syncTitle) syncTitle.textContent = "Tout est synchronisé";
      $$(".sync-card li .status").forEach((status) => {
        status.className = "status status-success";
        status.textContent = "Synchronisé";
      });
      showToast("Toutes les modifications sont synchronisées.");
    }, 1100);
  }

  function downloadResource(button) {
    if (!state.online) {
      showToast("Cette ressource n'est pas encore sur l'appareil. Reconnectez-vous pour la télécharger.", "error");
      return;
    }
    const original = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<svg class="icon"><use href="#icon-refresh"></use></svg>Téléchargement…';
    window.setTimeout(() => {
      button.innerHTML = '<svg class="icon"><use href="#icon-check"></use></svg>Disponible hors ligne';
      showToast("Ressource disponible hors ligne.");
      button.disabled = false;
      button.dataset.downloaded = "true";
    }, 850);
    button.dataset.original = original;
  }

  function resetQuizPanels() {
    $("#quiz-listing").hidden = false;
    $("#quiz-player").hidden = true;
    $("#quiz-result").hidden = true;
  }

  function startQuiz() {
    state.quizIndex = 0;
    state.quizAnswers = [];
    $("#quiz-listing").hidden = true;
    $("#quiz-player").hidden = false;
    $("#quiz-result").hidden = true;
    renderQuizQuestion();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderQuizQuestion() {
    const question = quizQuestions[state.quizIndex];
    $("#quiz-progress-label").textContent = `Question ${state.quizIndex + 1} sur ${quizQuestions.length}`;
    $("#quiz-progress-bar").style.width = `${((state.quizIndex + 1) / quizQuestions.length) * 100}%`;
    $("#quiz-question").textContent = question.text;
    $("#quiz-options").innerHTML = question.options.map((option, index) => {
      const checked = state.quizAnswers[state.quizIndex] === index ? " checked" : "";
      return `<label class="answer-option"><input type="radio" name="answer" value="${index}"${checked}><span>${escapeHtml(option)}</span></label>`;
    }).join("");
    $("#quiz-previous").disabled = state.quizIndex === 0;
    $("#quiz-next").textContent = state.quizIndex === quizQuestions.length - 1 ? "Terminer le quiz" : "Question suivante";
    $("#quiz-question").focus({ preventScroll: true });
  }

  function submitQuizAnswer() {
    const selected = $('input[name="answer"]:checked', $("#quiz-answer-form"));
    if (!selected) {
      showToast("Choisissez une réponse avant de continuer.", "error");
      return;
    }
    state.quizAnswers[state.quizIndex] = Number(selected.value);
    if (state.quizIndex < quizQuestions.length - 1) {
      state.quizIndex += 1;
      renderQuizQuestion();
      return;
    }
    finishQuiz();
  }

  function finishQuiz() {
    const score = quizQuestions.reduce((total, question, index) => total + (state.quizAnswers[index] === question.correct ? 1 : 0), 0);
    const percent = Math.round((score / quizQuestions.length) * 100);
    $("#result-score").textContent = `${score}/${quizQuestions.length}`;
    $("#result-percent").textContent = `${percent} % de bonnes réponses`;
    $("#quiz-player").hidden = true;
    $("#quiz-result").hidden = false;
    showToast(state.online ? "Résultat enregistré dans votre progression." : "Résultat conservé sur cet appareil jusqu'à la synchronisation.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function addInvitedStudent(form) {
    if (!form.reportValidity()) return false;
    const data = new FormData(form);
    const name = escapeHtml(data.get("name"));
    const username = escapeHtml(data.get("username"));
    const row = document.createElement("tr");
    row.innerHTML = `<td><strong>${name}</strong><small>Série D</small></td><td>@${username}</td><td><span class="status status-warning">Invitation</span></td><td>Jamais</td><td><button class="text-button small" type="button" data-demo-message="L'invitation peut être renouvelée ou annulée.">Gérer</button></td>`;
    $("#student-table-body")?.prepend(row);
    form.reset();
    closeDialog($("#invite-dialog"));
    setAdminView("admin-students");
    showToast(`Invitation créée pour ${name}.`);
    return true;
  }

  // Connexion et changement d'espace
  $("#login-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const username = $("#username");
    const password = $("#password");
    let valid = true;
    if (!username.value.trim()) {
      username.setAttribute("aria-invalid", "true");
      $("#username-error").hidden = false;
      valid = false;
    } else {
      username.removeAttribute("aria-invalid");
      $("#username-error").hidden = true;
    }
    if (!password.value) {
      password.setAttribute("aria-invalid", "true");
      $("#password-error").hidden = false;
      valid = false;
    } else {
      password.removeAttribute("aria-invalid");
      $("#password-error").hidden = true;
    }
    if (!valid) return;
    setStudentView("dashboard");
    showToast("Bienvenue dans votre espace, Awa.");
  });

  $(".password-toggle")?.addEventListener("click", (event) => {
    const button = event.currentTarget;
    const input = $("#password");
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    button.setAttribute("aria-pressed", String(show));
    button.setAttribute("aria-label", show ? "Masquer le mot de passe" : "Afficher le mot de passe");
  });

  $("#open-admin")?.addEventListener("click", () => setAdminView("admin-dashboard"));
  $("#switch-admin")?.addEventListener("click", () => setAdminView("admin-dashboard"));
  $("#switch-student")?.addEventListener("click", () => setStudentView(state.studentView || "dashboard"));
  $("#access-help")?.addEventListener("click", () => showToast("Dans le MVP, l'administration vérifiera votre identité puis réinitialisera votre accès."));
  $$('[data-logout]').forEach((button) => button.addEventListener("click", () => {
    showLogin();
    showToast("Vous êtes déconnecté du prototype.");
  }));

  // Navigation déléguée
  document.addEventListener("click", (event) => {
    const studentNav = event.target.closest("[data-view]");
    if (studentNav && studentShell.contains(studentNav)) {
      setStudentView(studentNav.dataset.view);
      return;
    }

    const adminNav = event.target.closest("[data-admin-view]");
    if (adminNav && adminShell.contains(adminNav)) {
      setAdminView(adminNav.dataset.adminView);
      return;
    }

    const demo = event.target.closest("[data-demo-message]");
    if (demo) {
      showToast(demo.dataset.demoMessage);
      return;
    }

    const closeButton = event.target.closest("[data-close-dialog]");
    if (closeButton) {
      closeDialog(closeButton.closest("dialog"));
      return;
    }

    const detailButton = event.target.closest("[data-resource-detail]");
    if (detailButton) {
      $("#detail-title").textContent = detailButton.dataset.title || "Ressource";
      $("#detail-meta").textContent = detailButton.dataset.meta || "Informations de la ressource";
      openDialog($("#resource-detail-dialog"));
      return;
    }

    const downloadButton = event.target.closest("[data-download-resource]");
    if (downloadButton) {
      downloadResource(downloadButton);
      return;
    }

    const sessionCheck = event.target.closest(".session-check");
    if (sessionCheck) {
      const card = sessionCheck.closest(".session-card");
      const completed = !card.classList.contains("completed");
      card.classList.toggle("completed", completed);
      sessionCheck.classList.toggle("checked", completed);
      sessionCheck.setAttribute("aria-pressed", String(completed));
      showToast(completed ? "Séance marquée comme terminée." : "Séance replacée dans les tâches à faire.");
    }
  });

  $$('[data-open-resource]').forEach((button) => button.addEventListener("click", () => openDialog($("#resource-dialog"))));
  $$('[data-open-session]').forEach((button) => button.addEventListener("click", () => openDialog($("#session-dialog"))));
  $$('[data-open-progress]').forEach((button) => button.addEventListener("click", () => openDialog($("#progress-dialog"))));
  $$('[data-open-invite]').forEach((button) => button.addEventListener("click", () => openDialog($("#invite-dialog"))));

  $("#resource-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    addResource(event.currentTarget);
  });
  $("#session-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    addSession(event.currentTarget);
  });
  $("#invite-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    addInvitedStudent(event.currentTarget);
  });

  $$('input[name="resource-type"]').forEach((input) => input.addEventListener("change", () => {
    const isNote = input.value === "Note" && input.checked;
    $("#note-content-field").hidden = !isNote;
  }));

  $("#resource-file")?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (file) showToast(`Fichier sélectionné : ${file.name}`);
  });

  $$('[data-resource-tab]').forEach((button) => button.addEventListener("click", () => setResourceTab(button.dataset.resourceTab)));
  $("#resource-search")?.addEventListener("input", (event) => filterResources(event.target.value));
  $$('[data-library-link]').forEach((button) => button.addEventListener("click", () => {
    setStudentView("resources", { focus: false });
    setResourceTab(button.closest(".storage-card") ? "offline" : "library");
  }));

  $("#connection-toggle")?.addEventListener("click", () => setOnline(!state.online));
  $("#sync-now")?.addEventListener("click", () => {
    if (!state.online) {
      showToast("Connexion absente. Les éléments restent en sécurité sur cet appareil.", "error");
      return;
    }
    setOnline(true);
  });

  $("[data-complete-dashboard-session]")?.addEventListener("click", (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    button.innerHTML = '<svg class="icon"><use href="#icon-check"></use></svg>Séance terminée';
    showToast("Séance terminée. Votre progression est mise à jour.");
  });

  // Quiz
  $$('[data-start-quiz]').forEach((button) => button.addEventListener("click", startQuiz));
  $("#quiz-answer-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    submitQuizAnswer();
  });
  $("#quiz-previous")?.addEventListener("click", () => {
    const selected = $('input[name="answer"]:checked', $("#quiz-answer-form"));
    if (selected) state.quizAnswers[state.quizIndex] = Number(selected.value);
    if (state.quizIndex > 0) {
      state.quizIndex -= 1;
      renderQuizQuestion();
    }
  });
  $("[data-close-quiz]")?.addEventListener("click", () => {
    resetQuizPanels();
    showToast("Quiz quitté. Ce prototype ne conserve pas une tentative incomplète.");
  });
  $("[data-back-to-quizzes]")?.addEventListener("click", resetQuizPanels);

  // Fermeture des dialogues avec clic sur l'arrière-plan
  $$("dialog").forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) closeDialog(dialog);
    });
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeDialog(dialog);
    });
  });

  // Navigation clavier des onglets Ressources
  $(".segmented-control")?.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    const tabs = $$('[data-resource-tab]');
    const index = tabs.indexOf(document.activeElement);
    if (index < 0) return;
    event.preventDefault();
    const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : (index - 1 + tabs.length) % tabs.length;
    tabs[next].focus();
    setResourceTab(tabs[next].dataset.resourceTab);
  });

  // Initialisation
  updateConnectionUI();
  setResourceTab("personal");
  showLogin();
})();

/* =========================================================
   Student Depression Prediction: front-end behaviour
   Backend contract (unchanged):
     GET  /model-info
     POST /predict  ->  { prediction, label, probability, message }
   ========================================================= */

(() => {
    "use strict";

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* -----------------------------------------------------
       Elements
    ----------------------------------------------------- */
    const header = document.getElementById("site-header");
    const menuToggle = document.getElementById("menu-toggle");
    const navLinks = [...document.querySelectorAll(".site-nav .nav-link")];

    const form = document.getElementById("prediction-form");
    const submitButton = document.getElementById("submit-btn");
    const errorMessage = document.getElementById("error-message");

    const resultCard = document.getElementById("result-card");
    const resultLabel = document.getElementById("result-label");
    const resultProbability = document.getElementById("result-probability");
    const resultMessage = document.getElementById("result-message");
    const resultExplainer = document.getElementById("result-explainer");
    const resultMeter = document.getElementById("result-meter");
    const newAssessmentButton = document.getElementById("new-assessment");

    const modelStatus = document.getElementById("model-status");
    const modelStatusDot = document.getElementById("model-status-dot");

    const progressBar = document.getElementById("progress-bar");
    const progressText = document.getElementById("progress-text");
    const progressTrack = document.getElementById("progress-track");

    // Fields the backend expects as numbers
    const NUMERIC_FIELDS = [
        "age",
        "academic_pressure",
        "cgpa",
        "study_satisfaction",
        "work_study_hours",
        "financial_stress",
        "degree_level",
    ];


    /* -----------------------------------------------------
       Constellation: twelve answers, twelve stars
    ----------------------------------------------------- */
    const STARS = [
        { field: "academic_pressure",  group: "academic",  x: 330, y: 70 },
        { field: "study_satisfaction", group: "academic",  x: 440, y: 130 },
        { field: "cgpa",               group: "academic",  x: 410, y: 225 },
        { field: "degree_level",       group: "academic",  x: 305, y: 170 },
        { field: "gender",             group: "personal",  x: 175, y: 80 },
        { field: "age",                group: "personal",  x: 75,  y: 165 },
        { field: "suicidal_thoughts",  group: "personal",  x: 60,  y: 295 },
        { field: "family_history",     group: "personal",  x: 165, y: 235 },
        { field: "sleep_duration",     group: "lifestyle", x: 210, y: 440 },
        { field: "work_study_hours",   group: "lifestyle", x: 335, y: 465 },
        { field: "dietary_habits",     group: "lifestyle", x: 440, y: 375 },
        { field: "financial_stress",   group: "lifestyle", x: 325, y: 345 },
    ];

    const HUB = { x: 255, y: 270 };

    const LINKS = [
        ["academic_pressure", "study_satisfaction"],
        ["study_satisfaction", "cgpa"],
        ["cgpa", "degree_level"],
        ["degree_level", "academic_pressure"],
        ["gender", "age"],
        ["age", "suicidal_thoughts"],
        ["suicidal_thoughts", "family_history"],
        ["family_history", "gender"],
        ["sleep_duration", "work_study_hours"],
        ["work_study_hours", "dietary_habits"],
        ["dietary_habits", "financial_stress"],
        ["financial_stress", "sleep_duration"],
        ["degree_level", "hub"],
        ["family_history", "hub"],
        ["financial_stress", "hub"],
    ];

    const LABELS = [
        { text: "Academic", cls: "academic", x: 318, y: 44, anchor: "start" },
        { text: "Personal", cls: "personal", x: 104, y: 52, anchor: "start" },
        { text: "Lifestyle", cls: "lifestyle", x: 118, y: 486, anchor: "start" },
        { text: "Estimated result", cls: "hub", x: 232, y: 308, anchor: "end" },
    ];

    function pointFor(id) {
        if (id === "hub") {
            return HUB;
        }
        return STARS.find((star) => star.field === id);
    }

    function buildConstellation(svg, { withLabels = false, scale = 1 } = {}) {
        if (!svg) {
            return;
        }

        const lines = LINKS.map(([a, b], index) => {
            const from = pointFor(a);
            const to = pointFor(b);
            return `<path class="c-line" pathLength="1" style="--i:${index}"
                data-a="${a}" data-b="${b}"
                d="M${from.x} ${from.y} L${to.x} ${to.y}"/>`;
        }).join("");

        // Outer group holds the position, inner group holds the animation,
        // so CSS transforms never overwrite the SVG translate.
        const stars = STARS.map((star, index) => `
            <g transform="translate(${star.x} ${star.y})">
                <g class="c-star c-star--${star.group}" data-field="${star.field}" style="--i:${index}">
                    <circle class="c-halo" r="${15 * scale}"/>
                    <circle class="c-core" r="${5.5 * scale}"/>
                </g>
            </g>`).join("");

        const hub = `
            <g class="c-hub" transform="translate(${HUB.x} ${HUB.y})">
                <circle class="c-hub-ring" r="${17 * scale}"/>
                <circle class="c-hub-dot" r="${4 * scale}"/>
            </g>`;

        const labels = withLabels
            ? LABELS.map((label) => `<text class="c-label c-label--${label.cls}"
                x="${label.x}" y="${label.y}" text-anchor="${label.anchor}">${label.text}</text>`).join("")
            : "";

        svg.innerHTML = lines + hub + stars + labels;
    }

    const heroConstellation = document.getElementById("hero-constellation");
    const progressConstellation = document.getElementById("progress-constellation");

    buildConstellation(heroConstellation, { withLabels: true, scale: 1.35 });
    buildConstellation(progressConstellation, { scale: 1.55 });


    /* -----------------------------------------------------
       Navigation: scrolled state, mobile menu, scroll spy
    ----------------------------------------------------- */
    function updateHeaderState() {
        header.classList.toggle("is-scrolled", window.scrollY > 24);
    }

    function setMenu(open) {
        header.classList.toggle("is-open", open);
        menuToggle.setAttribute("aria-expanded", String(open));
        menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }

    menuToggle.addEventListener("click", () => {
        setMenu(!header.classList.contains("is-open"));
    });

    navLinks.forEach((link) => {
        link.addEventListener("click", () => setMenu(false));
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && header.classList.contains("is-open")) {
            setMenu(false);
            menuToggle.focus();
        }
    });

    document.addEventListener("click", (event) => {
        if (header.classList.contains("is-open") && !header.contains(event.target)) {
            setMenu(false);
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 860) {
            setMenu(false);
        }
    });

    window.addEventListener("scroll", updateHeaderState, { passive: true });
    updateHeaderState();

    // Scroll spy
    const spyTargets = navLinks
        .map((link) => document.querySelector(link.getAttribute("href")))
        .filter(Boolean);

    if ("IntersectionObserver" in window) {
        const spy = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) {
                        return;
                    }
                    navLinks.forEach((link) => {
                        const active = link.getAttribute("href") === `#${entry.target.id}`;
                        if (active) {
                            link.setAttribute("aria-current", "true");
                        } else {
                            link.removeAttribute("aria-current");
                        }
                    });
                });
            },
            { rootMargin: "-45% 0px -50% 0px" }
        );

        spyTargets.forEach((target) => spy.observe(target));
    }


    /* -----------------------------------------------------
       Reveal on scroll
    ----------------------------------------------------- */
    const revealTargets = document.querySelectorAll(".reveal, [data-reveal]");

    if ("IntersectionObserver" in window && !prefersReducedMotion) {
        const revealObserver = new IntersectionObserver(
            (entries, observer) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("is-visible");
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.15, rootMargin: "0px 0px -6% 0px" }
        );

        revealTargets.forEach((target) => revealObserver.observe(target));
    } else {
        revealTargets.forEach((target) => target.classList.add("is-visible"));
    }


    /* -----------------------------------------------------
       Team photos: placeholder stays until an image loads
    ----------------------------------------------------- */
    document.querySelectorAll(".portrait img").forEach((img) => {
        const markLoaded = () => img.classList.add("is-loaded");

        if (img.complete && img.naturalWidth > 0) {
            markLoaded();
        } else {
            img.addEventListener("load", markLoaded, { once: true });
        }
    });


    /* -----------------------------------------------------
       Survey: progress
    ----------------------------------------------------- */
    const questions = [...form.querySelectorAll(".question[data-field]")];

    function isAnswered(question) {
        const control = form.elements[question.dataset.field];

        if (!control) {
            return false;
        }

        // Radio groups
        if (typeof RadioNodeList !== "undefined" && control instanceof RadioNodeList) {
            return control.value !== "";
        }

        // Number inputs and selects
        return control.value.trim() !== "" && control.checkValidity();
    }

    function updateProgress() {
        const litFields = new Set();
        const sectionCounts = {};

        questions.forEach((question) => {
            const section = question.closest("[data-section]")?.dataset.section;
            sectionCounts[section] ??= { done: 0, total: 0 };
            sectionCounts[section].total += 1;

            if (isAnswered(question)) {
                litFields.add(question.dataset.field);
                sectionCounts[section].done += 1;
            }
        });

        const total = questions.length;
        const done = litFields.size;
        const percent = Math.round((done / total) * 100);

        progressBar.style.width = `${percent}%`;
        progressText.textContent = `${done} of ${total} answered`;
        progressTrack.setAttribute("aria-valuenow", String(percent));

        Object.entries(sectionCounts).forEach(([section, count]) => {
            const el = document.querySelector(`[data-progress-section="${section}"]`);
            if (el) {
                el.textContent = `${count.done}/${count.total}`;
            }
        });

        // Light the stars and the lines between lit stars
        if (progressConstellation) {
            progressConstellation.querySelectorAll(".c-star").forEach((star) => {
                star.classList.toggle("is-lit", litFields.has(star.dataset.field));
            });

            const complete = done === total;

            progressConstellation.querySelectorAll(".c-line").forEach((line) => {
                const a = line.dataset.a;
                const b = line.dataset.b;
                const aLit = a === "hub" ? complete : litFields.has(a);
                const bLit = b === "hub" ? complete : litFields.has(b);
                line.classList.toggle("is-lit", aLit && bLit);
            });

            progressConstellation.classList.toggle("is-complete", complete);
        }
    }


    /* -----------------------------------------------------
       Survey: validation
    ----------------------------------------------------- */
    function clearValidationState() {
        questions.forEach((question) => question.classList.remove("is-invalid"));
        form.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));
    }

    function validateForm() {
        clearValidationState();

        let firstInvalid = null;

        questions.forEach((question) => {
            if (isAnswered(question)) {
                return;
            }

            question.classList.add("is-invalid");

            const focusTarget = question.querySelector("input, select");
            focusTarget?.setAttribute("aria-invalid", "true");
            firstInvalid ??= focusTarget;
        });

        if (!firstInvalid) {
            return true;
        }

        firstInvalid.scrollIntoView({
            behavior: prefersReducedMotion ? "auto" : "smooth",
            block: "center",
        });
        firstInvalid.focus({ preventScroll: true });

        errorMessage.textContent = "Please complete the highlighted questions with valid values.";
        errorMessage.classList.remove("hidden");

        return false;
    }

    function handleFieldEdit(event) {
        const question = event.target.closest(".question");

        if (question && question.classList.contains("is-invalid") && isAnswered(question)) {
            question.classList.remove("is-invalid");
            question.querySelector("[aria-invalid]")?.removeAttribute("aria-invalid");
        }

        updateProgress();
    }

    form.addEventListener("input", handleFieldEdit);
    form.addEventListener("change", handleFieldEdit);


    /* -----------------------------------------------------
       Loading state
    ----------------------------------------------------- */
    function setLoading(loading) {
        submitButton.disabled = loading;
        submitButton.querySelector("span").textContent = loading ? "Estimating…" : "Get my estimate";
    }


    /* -----------------------------------------------------
       Model status
    ----------------------------------------------------- */
    function setModelStatus(state, text) {
        modelStatus.textContent = text;
        modelStatusDot.dataset.state = state;
    }

    async function checkModelStatus() {
        try {
            const response = await fetch("/model-info");

            if (!response.ok) {
                throw new Error("Model info unavailable");
            }

            const info = await response.json();

            if (info.mode === "model") {
                setModelStatus("ready", "Trained model ready");
            } else {
                setModelStatus("demo", "Demo mode: model pending");
            }
        } catch {
            setModelStatus("error", "Model status unavailable");
        }
    }


    /* -----------------------------------------------------
       Result
    ----------------------------------------------------- */
    let countUpFrame = null;

    function animateNumber(target) {
        cancelAnimationFrame(countUpFrame);

        const finalText = `${target.toFixed(1)}%`;

        if (prefersReducedMotion) {
            resultProbability.textContent = finalText;
            return;
        }

        const duration = 1200;
        const start = performance.now();

        function tick(now) {
            const progress = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - progress, 3);

            resultProbability.textContent = `${(target * eased).toFixed(1)}%`;

            if (progress < 1) {
                countUpFrame = requestAnimationFrame(tick);
            } else {
                resultProbability.textContent = finalText;
            }
        }

        countUpFrame = requestAnimationFrame(tick);
    }

    function showResult(result) {
        const probability = Math.max(0, Math.min(1, Number(result.probability)));
        const isHigh = result.prediction === 1;

        resultCard.dataset.outcome = isHigh ? "high" : "low";
        resultLabel.textContent = result.label;
        resultMessage.textContent = result.message || "";

        resultExplainer.textContent = isHigh
            ? "This is a statistical estimate from patterns in earlier survey data, not a statement about you. If you're feeling low or overwhelmed, talking with someone you trust or a mental-health professional can help."
            : "This is a statistical estimate from patterns in earlier survey data, not a guarantee. A lower estimate doesn't mean everything is fine. If you're struggling, support is always worth reaching for.";

        // Reset the marker, reveal, then move it so the transition plays
        resultMeter.style.left = "0%";
        resultProbability.textContent = "0.0%";

        resultCard.classList.remove("hidden", "is-entering");
        void resultCard.offsetWidth;
        resultCard.classList.add("is-entering");

        requestAnimationFrame(() => {
            resultMeter.style.left = `${probability * 100}%`;
        });

        animateNumber(probability * 100);

        // Centre the card when it fits; otherwise align it under the header
        const fits = resultCard.offsetHeight < window.innerHeight - 120;

        resultCard.scrollIntoView({
            behavior: prefersReducedMotion ? "auto" : "smooth",
            block: fits ? "center" : "start",
        });

        resultCard.focus({ preventScroll: true });
    }


    /* -----------------------------------------------------
       Submit
    ----------------------------------------------------- */
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        errorMessage.classList.add("hidden");
        resultCard.classList.add("hidden");

        if (!validateForm()) {
            return;
        }

        const data = Object.fromEntries(new FormData(form).entries());

        NUMERIC_FIELDS.forEach((key) => {
            data[key] = Number(data[key]);
        });

        setLoading(true);

        try {
            const response = await fetch("/predict", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (!response.ok) {
                if (Array.isArray(result.detail)) {
                    throw new Error("Some values are invalid. Please check the survey and try again.");
                }

                throw new Error(result.detail || "The estimate could not be created.");
            }

            showResult(result);
        } catch (error) {
            errorMessage.textContent =
                error instanceof TypeError || !error.message
                    ? "Could not reach the server. Please check your connection and try again."
                    : error.message;
            errorMessage.classList.remove("hidden");
        } finally {
            setLoading(false);
        }
    });


    /* -----------------------------------------------------
       New assessment
    ----------------------------------------------------- */
    newAssessmentButton.addEventListener("click", () => {
        form.reset();
        clearValidationState();

        resultCard.classList.add("hidden");
        errorMessage.classList.add("hidden");

        updateProgress();

        document.getElementById("get-started")?.scrollIntoView({
            behavior: prefersReducedMotion ? "auto" : "smooth",
            block: "start",
        });
    });


    /* -----------------------------------------------------
       Init
    ----------------------------------------------------- */
    updateProgress();
    checkModelStatus();
})();

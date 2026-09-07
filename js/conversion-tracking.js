/*
 * Conversion events: cta_click, contact_form_start,
 * contact_form_submit_attempt, and generate_lead (after the success redirect).
 * GA4 enhanced measurement remains the sole owner of file_download events.
 */
(function () {
    "use strict";

    var pendingLeadKey = "zonge_pending_contact_lead";
    var maxAttributeLength = 300;
    var trackingScript = document.currentScript || document.querySelector("script[data-zonge-conversion-tracking]");
    var configuredThanksPath = "/thanks";

    if (trackingScript && trackingScript.getAttribute("data-thanks-url")) {
        try {
            configuredThanksPath = new URL(trackingScript.getAttribute("data-thanks-url"), window.location.origin).pathname;
        } catch (error) {
            configuredThanksPath = "/thanks";
        }
    }

    function cleanValue(value, maxLength) {
        if (typeof value !== "string") {
            return "";
        }

        return value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, maxLength || maxAttributeLength);
    }

    function analyticsOptOutEnabled() {
        var dnt = navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack;
        return dnt === "1" || dnt === "yes";
    }

    function sendAnalyticsEvent(name, parameters) {
        if (analyticsOptOutEnabled()) {
            return;
        }

        var eventParameters = parameters || {};

        if (typeof window.gtag === "function") {
            window.gtag("event", name, eventParameters);
            return;
        }

        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push(Object.assign({ event: name }, eventParameters));
    }

    function safeSessionGet(key) {
        try {
            return window.sessionStorage.getItem(key);
        } catch (error) {
            return null;
        }
    }

    function safeSessionSet(key, value) {
        try {
            window.sessionStorage.setItem(key, value);
        } catch (error) {
            // Attribution still reaches Formspree when storage is unavailable.
        }
    }

    function safeSessionRemove(key) {
        try {
            window.sessionStorage.removeItem(key);
        } catch (error) {
            // Nothing else is required when storage is unavailable.
        }
    }

    function sameSitePath(value) {
        var candidate = cleanValue(value, maxAttributeLength);

        if (!candidate || candidate.indexOf("/") !== 0 || candidate.indexOf("//") === 0) {
            return "";
        }

        try {
            var parsed = new URL(candidate, window.location.origin);
            return parsed.origin === window.location.origin ? parsed.pathname.slice(0, maxAttributeLength) : "";
        } catch (error) {
            return "";
        }
    }

    function normalizedPath(value) {
        return (value || "/").replace(/\/+$/, "") || "/";
    }

    document.addEventListener("click", function (event) {
        var link = event.target.closest ? event.target.closest("[data-zonge-cta]") : null;

        if (!link) {
            return;
        }

        sendAnalyticsEvent("cta_click", {
            cta_id: cleanValue(link.getAttribute("data-cta-id"), 80),
            cta_context: cleanValue(link.getAttribute("data-cta-context"), 40),
            cta_source: sameSitePath(link.getAttribute("data-cta-source")) || window.location.pathname,
            link_url: cleanValue(link.href, maxAttributeLength),
            transport_type: "beacon"
        });
    });

    var form = document.getElementById("zonge-contact-form");

    if (form) {
        var intentMap = {
            "instrument-sales": "Instruments & Equipment - Sales & Training",
            "instrument-support": "Instruments & Equipment - Service & Repair",
            "survey-planning": "Geophysics Survey Expertise - Project Planning",
            "mineral-geothermal": "Geophysics Survey Expertise - Mineral & Geothermal",
            "groundwater": "Geophysics Survey Expertise - Groundwater",
            "software-support": "Software & Data - Software Support"
        };
        var query = new URLSearchParams(window.location.search);
        var requestedIntent = cleanValue(query.get("intent"), 40);
        var selectedIntent = Object.prototype.hasOwnProperty.call(intentMap, requestedIntent) ? requestedIntent : "";
        var sourcePath = sameSitePath(query.get("source"));
        var sourceChannel = "Direct or external visit";

        if (!sourcePath && document.referrer) {
            try {
                var referrer = new URL(document.referrer);

                if (referrer.origin === window.location.origin && referrer.pathname !== window.location.pathname) {
                    sourcePath = referrer.pathname.slice(0, maxAttributeLength);
                    sourceChannel = "Internal navigation";
                }
            } catch (error) {
                sourcePath = "";
            }
        } else if (sourcePath) {
            sourceChannel = "Contextual website CTA";
        }

        var inquiryType = document.getElementById("contact-inquiry-type");
        var sourcePageInput = document.getElementById("contact-source-page");
        var sourceIntentInput = document.getElementById("contact-source-intent");
        var sourceChannelInput = document.getElementById("contact-source-channel");
        var submissionIdInput = document.getElementById("contact-submission-id");

        if (selectedIntent && inquiryType) {
            inquiryType.value = intentMap[selectedIntent];
        }

        if (sourcePageInput) {
            sourcePageInput.value = sourcePath || "Not available";
        }

        if (sourceIntentInput) {
            sourceIntentInput.value = selectedIntent || "Not specified";
        }

        if (sourceChannelInput) {
            sourceChannelInput.value = sourceChannel;
        }

        var formStarted = false;
        var recordFormStart = function (event) {
            if (formStarted || !event.target || !event.target.matches("input:not([type='hidden']), select, textarea")) {
                return;
            }

            formStarted = true;
            sendAnalyticsEvent("contact_form_start", {
                form_id: "zonge-contact-form",
                inquiry_type: cleanValue(inquiryType ? inquiryType.value : "", 100),
                source_page: sourcePath || "not_available"
            });
        };

        form.addEventListener("focusin", recordFormStart);
        form.addEventListener("input", recordFormStart);
        form.addEventListener("submit", function () {
            if (form.getAttribute("data-form-ready") !== "true") {
                return;
            }

            var submissionId = "contact-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
            if (submissionIdInput) {
                submissionIdInput.value = submissionId;
            }
            var leadContext = {
                submission_id: submissionId,
                inquiry_type: cleanValue(inquiryType ? inquiryType.value : "", 100),
                source_page: sourcePath || "not_available",
                created_at: Date.now()
            };

            safeSessionSet(pendingLeadKey, JSON.stringify(leadContext));
            sendAnalyticsEvent("contact_form_submit_attempt", {
                form_id: "zonge-contact-form",
                submission_id: submissionId,
                inquiry_type: leadContext.inquiry_type,
                source_page: leadContext.source_page,
                transport_type: "beacon"
            });
        });
    }

    if (normalizedPath(window.location.pathname) === normalizedPath(configuredThanksPath)) {
        var storedLead = safeSessionGet(pendingLeadKey);

        if (storedLead) {
            try {
                var lead = JSON.parse(storedLead);
                var age = Date.now() - Number(lead.created_at || 0);

                if (age >= 0 && age <= 2 * 60 * 60 * 1000) {
                    sendAnalyticsEvent("generate_lead", {
                        form_id: "zonge-contact-form",
                        submission_id: cleanValue(lead.submission_id, 80),
                        inquiry_type: cleanValue(lead.inquiry_type, 100),
                        source_page: sameSitePath(lead.source_page) || "not_available"
                    });
                }
            } catch (error) {
                // Invalid session data is discarded below without emitting an event.
            }

            safeSessionRemove(pendingLeadKey);
        }
    }
}());

# Theme verification

Updated the connected app using the six design references supplied on 30 October 2026. The primary green is sampled from the references (#8BAE41).

- Compact white cards, muted labels, soft shadows, outlined fields, tinted reading icons, and rounded bottom sheets.
- Equal-height device reading tiles; secondary metadata stays available under More details.
- Projects-first navigation, the main-output-only device list, row-based Analytics, History/Logs, organization switching, and the 22-second polling interval are retained.
- No API service, authentication, environment selection, map gesture calculation, or downlink payload code changed.

Validation:

- TypeScript check and all 84 existing tests passed.
- Expo exports passed for Android, iOS, and web.
- Actual connected web components rendered with intercepted test API responses at 320, 390, 768, 1024, and 1440 pixels, plus 667 x 390 landscape. No page errors or horizontal document overflow were detected.
- Visually reviewed sign-in, projects, devices, device details, downlink, locations, selected map card, notifications, Analytics, profile, edit profile, and organization picker against the references.
- Exercised expanded/compact list filters, detail expansion, History/Logs, downlink validation and cancellation, map selection and zoom controls, and organization picker dismissal.
- Also inspected Projects and the live device list on the connected Android tablet. Other native screens and physical downlink delivery were not retested in this theme change.

Web visual checks used synthetic data and local map imagery; they sent no hardware commands. Local verification captures are in .preview/theme-qa (ignored by Git). Additional live features remain visible, so layouts are adapted from the references rather than pixel-identical copies.

/* Site settings.
   ocmKey: free Open Charge Map API key (openchargemap.org → sign in → My profile → API keys).
     It is a public client key and safe to publish. Leave empty to show Open Charge Map's embedded map instead.
   surveyEndpoint: the Google Apps Script web app URL that saves survey answers to the Google Sheet
     (see "Surveys" in README.md). Until it is set, the surveys say they aren't accepting answers yet. */
window.OHMPERE_CONFIG = { ocmKey: "", surveyEndpoint: "" };

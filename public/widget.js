/*!
 * OmniDesk AI website widget.
 *
 *   <script src="https://omnidesk-ai-one.vercel.app/widget.js" data-desk="your-org" async></script>
 *
 * Options (attributes on the script tag):
 *   data-desk      required  the organization's chat handle (from Dashboard > Organizations)
 *   data-color     optional  brand colour as hex, e.g. "#0f62fe"
 *   data-position  optional  "right" (default) or "left"
 *   data-label     optional  button text, default "Help"
 *
 * JavaScript API: window.OmniDesk.open(), .close(), .toggle()
 * The chat runs in an iframe from the OmniDesk domain; styles are isolated in a shadow root.
 */
(function () {
  "use strict";
  if (window.OmniDesk && window.OmniDesk.__loaded) return;

  var script =
    document.currentScript ||
    document.querySelector('script[data-desk][src*="widget.js"]');
  if (!script) return;

  var desk = (script.getAttribute("data-desk") || "").trim().toLowerCase();
  if (!/^[a-z0-9-]{1,40}$/.test(desk) && !/^[0-9a-f-]{36}$/.test(desk)) {
    console.warn("[OmniDesk] Add data-desk=\"your-org\" to the widget script tag.");
    return;
  }

  var origin = new URL(script.src, location.href).origin;
  var colorAttribute = (script.getAttribute("data-color") || "").trim().replace(/^#/, "");
  var color = /^[0-9a-f]{6}$/i.test(colorAttribute) ? colorAttribute.toLowerCase() : "d0261d";
  var side = script.getAttribute("data-position") === "left" ? "left" : "right";
  var label = (script.getAttribute("data-label") || "Help").slice(0, 24);

  // Pick black or white text for the button so any brand colour stays readable (WCAG relative luminance).
  function luminance(hex) {
    var channels = [0, 2, 4].map(function (index) {
      var value = parseInt(hex.slice(index, index + 2), 16) / 255;
      return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  }
  var ink = luminance(color) > 0.4 ? "#15171a" : "#ffffff";

  var host = document.createElement("div");
  host.setAttribute("data-omnidesk-widget", "");
  var root = host.attachShadow({ mode: "open" });

  root.innerHTML =
    "<style>" +
    ":host{all:initial}" +
    ".launcher{position:fixed;bottom:20px;" + side + ":20px;z-index:2147483000;display:inline-flex;align-items:center;gap:8px;" +
    "padding:12px 18px;border:0;border-radius:999px;background:#" + color + ";color:" + ink + ";" +
    "font:700 16px/1 system-ui,-apple-system,'Segoe UI',sans-serif;cursor:pointer;" +
    "box-shadow:0 2px 6px rgba(21,23,26,.2),0 10px 28px rgba(21,23,26,.2);transition:transform .15s ease}" +
    ".launcher:hover{transform:translateY(-2px)}" +
    ".launcher:focus-visible{outline:3px solid #" + color + ";outline-offset:3px}" +
    ".launcher svg{width:20px;height:20px}" +
    ".panel{position:fixed;bottom:84px;" + side + ":20px;z-index:2147483000;width:380px;height:min(640px,calc(100vh - 112px));" +
    "border-radius:6px;overflow:hidden;background:#f1f2f4;box-shadow:0 4px 12px rgba(21,23,26,.18),0 24px 60px rgba(21,23,26,.24);" +
    "opacity:0;transform:translateY(12px);pointer-events:none;visibility:hidden;transition:opacity .18s ease,transform .18s ease,visibility 0s .18s}" +
    ".panel.open{opacity:1;transform:none;pointer-events:auto;visibility:visible;transition:opacity .18s ease,transform .18s ease}" +
    "iframe{width:100%;height:100%;border:0;display:block}" +
    "@media (max-width:480px){.panel{inset:0;width:auto;height:auto;bottom:0;border-radius:0}.panel.open + .launcher,.launcher[aria-expanded=true]{display:none}}" +
    "@media (prefers-reduced-motion:reduce){.launcher,.panel,.panel.open{transition:none}.launcher:hover{transform:none}}" +
    "</style>" +
    '<div class="panel" role="dialog" aria-label="Chat with us" aria-hidden="true"></div>' +
    '<button class="launcher" type="button" aria-expanded="false" aria-haspopup="dialog">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-5A8 8 0 1 1 21 12z"/></svg>' +
    "<span></span></button>";

  var panel = root.querySelector(".panel");
  var launcher = root.querySelector(".launcher");
  launcher.querySelector("span").textContent = label;
  var iframe = null;
  var isOpen = false;

  function open() {
    if (!iframe) {
      // Loaded on first open, so the widget costs the host page almost nothing until it is used.
      iframe = document.createElement("iframe");
      iframe.title = "Chat with us";
      iframe.src = origin + "/embed/" + encodeURIComponent(desk) + "?accent=" + color;
      iframe.setAttribute("allow", "clipboard-write");
      panel.appendChild(iframe);
    }
    isOpen = true;
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
    launcher.setAttribute("aria-expanded", "true");
    setTimeout(function () { iframe.focus(); }, 50);
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
    launcher.setAttribute("aria-expanded", "false");
    launcher.focus();
  }

  function toggle() {
    if (isOpen) close();
    else open();
  }

  launcher.addEventListener("click", toggle);
  document.addEventListener("keydown", function (event) { if (event.key === "Escape") close(); });
  window.addEventListener("message", function (event) {
    if (event.origin !== origin || !iframe || event.source !== iframe.contentWindow) return;
    if (event.data && event.data.type === "omnidesk:close") close();
  });

  function mount() { document.body.appendChild(host); }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);

  window.OmniDesk = {
    __loaded: true,
    open: open,
    close: close,
    toggle: toggle,
  };
})();

/* Milano Home come app nativa Tizen (pacchetto .wgt): caricato da index.html prima del bootstrap.
   Segnala al launcher che non c'è TizenBrew sotto (window.MH_NATIVE), registra i tasti canale e avvia il servizio del pacchetto.
   Senza `tizen` (anteprima in un browser) non fa nulla: il launcher parte in modalità demo. ES5 per Chromium 76. */
(function () {
  if (!window.tizen || !tizen.application) return;
  var info = { error: null, startedAt: null };
  function startService() {
    try {
      var pkg = tizen.application.getCurrentApplication().appInfo.packageId;
      tizen.application.launchAppControl(new tizen.ApplicationControl('http://tizen.org/appcontrol/operation/service'), pkg + '.Service',
        function () { info.startedAt = Date.now(); info.error = null; }, function (e) { info.error = (e && e.message) || 'avvio del servizio rifiutato'; });
    } catch (e) { info.error = e.message; }
  }
  window.MH_NATIVE = { startService: startService, service: info };
  try { ['ChannelUp', 'ChannelDown'].forEach(function (k) { try { tizen.tvinputdevice.registerKey(k); } catch (e) {} }); } catch (e) {}
  startService();
})();

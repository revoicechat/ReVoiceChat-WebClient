import Swal from '../lib/sweetalert2.esm.all.min.js';
import {SpinnerOnButton} from "../component/button.spinner.component.js";

export class ServerSettingsOverviewController {

  /**
   * @param {ServerSettingsController} serverSettings
   * @param {Fetcher} fetcher
   */
  constructor(serverSettings, fetcher) {
    this.serverSettings = serverSettings
    this.fetcher = fetcher
  }

  load() {
    document.getElementById('server-setting-overview-uuid').innerText = this.serverSettings.server.id;
    document.getElementById('server-setting-overview-name').innerText = this.serverSettings.server.name;
    document.getElementById('server-setting-overview-name-input').value = this.serverSettings.server.name;
  }

  /**
   * @param {string[]} flattenRisks
   * @param {boolean} isAdmin
   */
  handleRisks(isAdmin, flattenRisks) {
    const overviewRisks = new Set(['SERVER_UPDATE']);
    if (isAdmin || flattenRisks.some(elem => overviewRisks.has(elem))) {
      this.#addOverviewEventHandler();
    } else {
      this.#removeOverviewEventHandler();
    }
  }

  #addOverviewEventHandler() {
    document.getElementById('server-setting-overview-name').classList.add('hidden');
    document.getElementById('server-setting-overview-name-input').classList.remove('hidden');
    const button = document.getElementById(`server-setting-overview-save`);
    button.classList.remove('hidden');
    button.onclick = () => this.#overviewSave();
  }

  #removeOverviewEventHandler() {
    document.getElementById('server-setting-overview-name').classList.remove('hidden');
    document.getElementById('server-setting-overview-name-input').classList.add('hidden');
    const button = document.getElementById(`server-setting-overview-save`);
    button.classList.add('hidden');
    button.onclick = null;
  }

  async #overviewSave() {
    const spinner = new SpinnerOnButton("server-setting-overview-save")
    spinner.run()
    await this.#nameUpdate(spinner)
    spinner.success()
  }

  async #nameUpdate(spinner) {
    const serverName = document.getElementById("server-setting-overview-name-input").value;

    if (!serverName) {
      spinner.error();
      Swal.fire({
        icon: 'error',
        title: i18n.translateOne("server.settings.name.error"),
        animation: false,
        customClass: SwalCustomClass,
        showCancelButton: false,
        confirmButtonText: "OK",
        allowOutsideClick: false,
      });
      return;
    }

    /** @type {ServerRepresentation} */
    const result = await this.fetcher.fetchCore(`/server/${this.serverSettings.server.id}`, 'PATCH', { name: serverName })
    if (result) {
      this.serverSettings.server.name = result.name;
      this.load();
    }
  }
}
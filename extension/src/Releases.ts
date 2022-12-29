import { DeploymentStatusUtil } from "./DeploymentStatusUtil";
import { DeploymentStatus, Release, ReleaseDefinition, ReleaseExpands, ReleaseStatus } from "ReleaseManagement/Core/Contracts";
import TFS_RM_Client = require("ReleaseManagement/Core/RestClient");
import Services_Navigation = require("VSS/SDK/Services/Navigation");
import Utils from "./Utils";

VSS.require(["TFS/Dashboards/WidgetHelpers"], (WidgetHelpers) => {
	WidgetHelpers.IncludeWidgetStyles();

	VSS.register("BARSI-Releases-Widget", () => new ReleasesWidget(WidgetHelpers));
	VSS.notifyLoadSucceeded();
});

export class ReleasesWidget {
	constructor(public WidgetHelpers) { }

	public async load(widgetSettings) {
		this.showData(widgetSettings);
		return this.WidgetHelpers.WidgetStatusHelper.Success();
	}

	public async reload(widgetSettings) {
		this.showData(widgetSettings);
		return this.WidgetHelpers.WidgetStatusHelper.Success();
	}

	public async showData(widgetSettings) {
		const data = await this.getDefinitions(widgetSettings);
		const btn = $("#refresh-button");
		btn.attr("disabled", "disabled");
		$("#title").text(widgetSettings.name);
		$("#refresh-button").on("click", (event) => {
			const target = $(event.target);
			target.attr("disabled", "disabled");
			this.getDefinitions(widgetSettings)
				.then((result) => {
					this.renderReleases(result);
					target.removeAttr("disabled");
				});
		});
		await this.renderReleases(data);
		btn.removeAttr("disabled");
	}

	private async getDefinitions(widgetSettings) {
		const releaseClient = TFS_RM_Client.getClient();
		const context = VSS.getWebContext();
		const customSettings = JSON.parse(widgetSettings.customSettings.data) as ISettings;
		let definitions = await releaseClient.getReleaseDefinitions(context.project.name);

		if (!!customSettings && !!customSettings.selectedDefinitionIds && customSettings.selectedDefinitionIds.length > 0) {
			definitions = definitions.filter((def) => customSettings.selectedDefinitionIds.indexOf(def.id) !== -1);
		}

		const result = [];
		for (const def of definitions) {
			let releasesForDef = await releaseClient.getReleases(context.project.id,
				def.id, null, null, null, null, null, null, null, null, null, null,
				// tslint:disable-next-line:no-bitwise
				ReleaseExpands.Approvals | ReleaseExpands.Environments);

			releasesForDef = releasesForDef.sort((a, b) => a.createdOn > b.createdOn ? -1 : a.createdOn < b.createdOn ? 1 : 0);

			result.push({
				definition: def,
				releases: releasesForDef,
			});
		}

		result.sort((a, b) => {
			if (b.releases.length <= 0) {
				return -1;
			}
			if (a.releases.length <= 0) {
				return 1;
			}
			const aRelease = a.releases[0];
			const bRelease = b.releases[0];
			return aRelease.createdOn > bRelease.createdOn ? -1 : aRelease.createdOn < bRelease.createdOn ? 1 : 0;
		});

		return result;
	}

	private renderReleases(data) {
		const dataContainer = $("div#data-container");
		dataContainer.empty();
		if (data.length <= 0) {
			$("<div/>")
				.text("Definition not found")
				.addClass("definition-not-found")
				.appendTo(dataContainer);
		} else {
			const sortData = data.sort((defA, defB) => {
				const releasAStatus = defA.releases.length > 0 ? DeploymentStatusUtil.getStatus(defA.releases[0]) : -1;

				const releasBStatus = defB.releases.length > 0 ? DeploymentStatusUtil.getStatus(defB.releases[0]) : -1;

				return releasAStatus > releasBStatus ? -1 : releasAStatus < releasBStatus ? 1 : 0;
			});
			for (const item of sortData) {
				const definition = item.definition;
				const releases = item.releases;
				const rootDiv = $("<div/>")
					.addClass("row-container")
					.attr("definition", definition.id);

				if (releases.length <= 0) {
					this.generateCommonInfo(definition, null).appendTo(rootDiv);
					this.generateStatus(null).appendTo(rootDiv);
					this.generateDeploymentStatus(null).appendTo(rootDiv);
				} else {
					const release = releases[0];
					this.generateCommonInfo(definition, release).appendTo(rootDiv);
					this.generateStatus(release.status).appendTo(rootDiv);
					const status: DeploymentStatus = DeploymentStatusUtil.getStatus(release);
					this.generateDeploymentStatus(status).appendTo(rootDiv);
				}
				rootDiv.appendTo(dataContainer);
			}
		}
	}

	private createLink(title: string, link: string): JQuery<HTMLElement> {
		const aLink = $("<a/>").text(title);
		aLink.attr("target", "_blank");
		VSS.getService(VSS.ServiceIds.Navigation).then((navigationService: Services_Navigation.HostNavigationService) => {
			aLink.on("click", (e) => {
				e.preventDefault();
				navigationService.openNewWindow(link, "");
			});
		});
		return aLink;
	}

	private generateCommonInfo(definition: ReleaseDefinition, release: Release): JQuery<HTMLElement> {
		const commonInfoDiv = $("<div/>");
		commonInfoDiv.addClass("common-info-container");

		const linksDiv = $("<div/>");
		linksDiv.addClass("links-container");

		const definitionInfoDIv = $("<div/>");
		const linkDdefinition = this.createLink(`${Utils.correctTitleLength(definition.name)}:`, definition._links.web.href);
		linkDdefinition.addClass("definition-link");
		linkDdefinition.appendTo(definitionInfoDIv);
		definitionInfoDIv.appendTo(linksDiv);

		const releaseInfoDIv = $("<div/>");
		if (release === null) {
			$("<span/>").text("Release not found").appendTo(releaseInfoDIv);
		} else {
			const linkRelease = this.createLink(`#${release.name}`, release._links.web.href);
			linkRelease.appendTo(releaseInfoDIv);
		}
		releaseInfoDIv.appendTo(linksDiv);
		linksDiv.appendTo(commonInfoDiv);

		const createdByDiv = $("<div/>");
		createdByDiv.addClass("created");
		if (release !== null) {
			$("<b/>").text(`${Utils.correctTitleLength(release.createdBy.displayName)}`).appendTo(createdByDiv);
			$("<span/>").text(" created ").appendTo(createdByDiv);
			$("<span/>").text(`${release.createdOn.toLocaleString("ru-RU")}`).appendTo(createdByDiv);
		}
		createdByDiv.appendTo(commonInfoDiv);

		return commonInfoDiv;
	}

	private generateStatus(status: number): JQuery<HTMLElement> {
		const resultDiv = $("<div/>");
		resultDiv.addClass("result-container");

		let resultText = "";
		let resultClassName = "";

		switch (status) {
			case ReleaseStatus.Abandoned:
				resultText = "Abandoned";
				resultClassName = "result-abandoned";
				break;
			case ReleaseStatus.Active:
				resultText = "Active";
				resultClassName = "result-active";
				break;
			case ReleaseStatus.Draft:
				resultText = "Draft";
				resultClassName = "result-draft";
				break;
			case ReleaseStatus.Undefined:
			default:
				resultText = "Undefined";
				resultClassName = "result-undefined";
		}

		$("<div/>")
			.addClass("circle")
			.addClass(resultClassName)
			.appendTo(resultDiv);

		$("<span/>")
			.text(resultText)
			.appendTo(resultDiv);

		return resultDiv;
	}

	private generateDeploymentStatus(status: DeploymentStatus): JQuery<HTMLElement> {
		const statusDiv = $("<div/>");
		statusDiv.addClass("status-container");

		let statusText = "";
		let statusClassName = "";

		switch (status) {
			case DeploymentStatus.All:
				statusText = "All";
				statusClassName = "status-all";
				break;
			case DeploymentStatus.Failed:
				statusText = "Failed";
				statusClassName = "status-failed";
				break;
			case DeploymentStatus.NotDeployed:
				statusText = "Not Deployed";
				statusClassName = "status-notdeployed";
				break;
			case DeploymentStatus.InProgress:
				statusText = "In Progress";
				statusClassName = "status-inprogress";
				break;
			case DeploymentStatus.PartiallySucceeded:
				statusText = "Partially Succeeded";
				statusClassName = "status-partiallysucceeded";
				break;
			case DeploymentStatus.Succeeded:
				statusText = "Succeeded";
				statusClassName = "status-succeeded";
				break;
			case DeploymentStatus.Undefined:
			default:
				statusText = "Undefined";
				statusClassName = "status-undefined";
		}

		$("<div/>")
			.addClass("circle")
			.addClass(statusClassName)
			.appendTo(statusDiv);

		$("<span/>")
			.text(statusText)
			.appendTo(statusDiv);

		return statusDiv;
	}
}

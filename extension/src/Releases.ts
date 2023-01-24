import { DeploymentStatusUtil } from "./DeploymentStatusUtil";
import { DeploymentStatus, Release, ReleaseDefinition, ReleaseExpands, ReleaseStatus } from "ReleaseManagement/Core/Contracts";
import StatusInfo from "./Models/StatusInfo";
import TFS_RM_Client = require("ReleaseManagement/Core/RestClient");
import Services_Navigation = require("VSS/SDK/Services/Navigation");
import Utils from "./Utils";

VSS.require(["TFS/Dashboards/WidgetHelpers"], (WidgetHelpers) => {
	WidgetHelpers.IncludeWidgetStyles();

	VSS.register("BARSI-Releases-Widget", () => new ReleasesWidget(WidgetHelpers));
	VSS.notifyLoadSucceeded();
});

export class ReleasesWidget {
	private readonly releaseClient: TFS_RM_Client.ReleaseHttpClient4_1;
	private readonly vssContext: WebContext;

	constructor(public WidgetHelpers) {
		this.releaseClient = TFS_RM_Client.getClient();
		this.vssContext = VSS.getWebContext();
	}

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

		$("span.header-title").text(widgetSettings.name);

		const btn = $("#refresh-button");
		btn.attr("disabled", "disabled");
		btn.on("click", (event) => {
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
		const customSettings = JSON.parse(widgetSettings.customSettings.data) as ISettings;
		let definitions = await this.releaseClient.getReleaseDefinitions(this.vssContext.project.name);

		if (!!customSettings && !!customSettings.selectedDefinitionIds && customSettings.selectedDefinitionIds.length > 0) {
			definitions = definitions.filter((def) => customSettings.selectedDefinitionIds.indexOf(def.id) !== -1);
		}

		const result = [];
		for (const def of definitions) {
			let releasesForDef = await this.releaseClient.getReleases(this.vssContext.project.id,
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
		const dataContainer = $("div.data-container");
		dataContainer.empty();
		if (data.length <= 0) {
			$("<div/>")
				.addClass("definition-not-found")
				.text("Definition not found")
				.appendTo(dataContainer);
		} else {
			const sortData = data.sort((defA, defB) => Utils.sortReleaseProvider(defA, defB));
			for (const item of sortData) {
				const definition = item.definition;
				const releases = item.releases;

				if (releases.length <= 0) {
					this.generateRowContainer(definition, null).appendTo(dataContainer);
				} else {
					this.generateRowContainer(definition, releases[0]).appendTo(dataContainer);
				}
			}
		}
	}

	private generateRowContainer(definition: ReleaseDefinition, release: Release): JQuery<HTMLElement> {
		const rowContainerDiv = $("<div/>");
		rowContainerDiv.addClass("row-container");
		Utils.addTfsLink(rowContainerDiv, definition._links.web.href, false);

		if (release === null) {
			this.generateStatusContainer(-1, -1).appendTo(rowContainerDiv);
			this.generatePiplineContainer(definition).appendTo(rowContainerDiv);
		} else {
			const status: DeploymentStatus = DeploymentStatusUtil.getStatus(release);
			this.generateStatusContainer(release.status, status).appendTo(rowContainerDiv);
			this.generatePiplineContainer(definition).appendTo(rowContainerDiv);
			this.generateTriggerContainer(release).appendTo(rowContainerDiv);
			this.generateLastRunContainer(release).appendTo(rowContainerDiv);
			// this.generateMoreWrapper(release, definition).appendTo(rowContainerDiv);
		}

		return rowContainerDiv;
	}

	private generateStatusContainer(status: number, deploymentStatus: number): JQuery<HTMLElement> {
		const statusInfo = StatusInfo.getReleaseStatusInfo(status, deploymentStatus);
		const statusContainerDiv = $("<div/>");
		statusContainerDiv.addClass("status-container");
		statusContainerDiv.addClass("parent-tooltip");

		const spanRound = $("<span/>");
		spanRound.addClass("round");
		spanRound.addClass("trigger-tooltip");
		spanRound.addClass(statusInfo.className);
		spanRound.html(statusInfo.svgNode);
		spanRound.appendTo(statusContainerDiv);

		const spanTooltip = $("<span/>");
		spanTooltip.addClass("tooltip");
		spanTooltip.addClass("left");
		spanTooltip.text(statusInfo.tooltip);
		spanTooltip.appendTo(statusContainerDiv);

		return statusContainerDiv;
	}

	private generatePiplineContainer(definition: ReleaseDefinition): JQuery<HTMLElement> {
		const piplineDiv = $("<div/>");
		piplineDiv.addClass("pipeline-container");

		const span = $("<span/>");
		span.addClass("pipeline-name");
		span.text(definition.name);
		span.appendTo(piplineDiv);

		return piplineDiv;
	}

	private generateTriggerContainer(release: Release): JQuery<HTMLElement> {
		const triggerContainerDiv = $("<div/>");
		triggerContainerDiv.addClass("trigger-container");

		const buildNumberDiv = $("<div/>");
		buildNumberDiv.addClass("buildnumber-container");
		Utils.addTfsLink(buildNumberDiv, release._links.web.href, true);

		const spanBuildNumber = $("<span/>");
		spanBuildNumber.text(`#${release.name}`);
		spanBuildNumber.appendTo(buildNumberDiv);

		buildNumberDiv.appendTo(triggerContainerDiv);

		const triggerInfoDiv = $("<div/>");
		triggerInfoDiv.addClass("trigger-info-container");

		const triggerSourceSpan = $("<span/>");
		triggerSourceSpan.addClass("trigger-source-container");
		triggerSourceSpan.appendTo(triggerInfoDiv);

		const triggerAutorSpan = $("<span/>");
		triggerAutorSpan.addClass("trigger-autor");
		triggerAutorSpan.appendTo(triggerInfoDiv);
		triggerAutorSpan.text(release.createdBy.displayName);

		triggerInfoDiv.appendTo(triggerContainerDiv);

		return triggerContainerDiv;
	}

	private generateLastRunContainer(release: Release): JQuery<HTMLElement> {
		const queueTime: Date = release.createdOn;

		let finishTime: Date = null;
		let startTime: Date = null;

		if (release.environments.length > 0 && release.environments[0].deploySteps.length > 0) {
			startTime = release.environments[0].deploySteps[0].queuedOn;

			if (release.environments[0].deploySteps[0].status === DeploymentStatus.InProgress) {
				finishTime = null;
			} else {
				finishTime = release.environments[0].deploySteps[0].lastModifiedOn;
			}
		}

		const lastRunContainerDiv = $("<div/>");
		lastRunContainerDiv.addClass("lastrun-container");

		const parentTooltipDateDiv = $("<div/>");
		parentTooltipDateDiv.addClass("parent-tooltip");

		let triggerTooltipDateSpan = $("<span/>");
		triggerTooltipDateSpan.addClass("trigger-tooltip");
		triggerTooltipDateSpan.text(Utils.getDateTimeString(queueTime));
		triggerTooltipDateSpan.appendTo(parentTooltipDateDiv);

		triggerTooltipDateSpan = $("<span/>");
		triggerTooltipDateSpan.addClass("tooltip");
		triggerTooltipDateSpan.addClass("right");
		triggerTooltipDateSpan.text(`Last run: ${queueTime.toLocaleString("ru")}`);
		triggerTooltipDateSpan.appendTo(parentTooltipDateDiv);

		parentTooltipDateDiv.appendTo(lastRunContainerDiv);

		const parentTooltipTimeDiv = $("<div/>");
		parentTooltipTimeDiv.addClass("parent-tooltip");

		let inQueueTime = "";
		let inQueueTimeTooltip = "";

		if (startTime === null || typeof startTime === "undefined") {
			inQueueTime = "0.00s";
			inQueueTimeTooltip = "";
		} else if (finishTime === null || typeof finishTime === "undefined") {
			inQueueTime = Utils.getDiffDateTimeString(startTime, new Date());
			inQueueTimeTooltip = startTime.toLocaleString("ru");
		} else {
			inQueueTime = Utils.getDiffDateTimeString(startTime, finishTime);
			inQueueTimeTooltip = startTime.toLocaleString("ru");
		}

		let triggerTooltipTimeSpan = $("<span/>");
		triggerTooltipTimeSpan.addClass("trigger-tooltip");
		triggerTooltipTimeSpan.text(inQueueTime);
		triggerTooltipTimeSpan.appendTo(parentTooltipTimeDiv);

		triggerTooltipTimeSpan = $("<span/>");
		triggerTooltipTimeSpan.addClass("tooltip");
		triggerTooltipTimeSpan.addClass("right");
		triggerTooltipTimeSpan.text(`Started: ${inQueueTimeTooltip}`);
		triggerTooltipTimeSpan.appendTo(parentTooltipTimeDiv);

		parentTooltipTimeDiv.appendTo(lastRunContainerDiv);

		return lastRunContainerDiv;
	}
}

import TFS_Build_Client = require("TFS/Build/RestClient");
import VSS_Service = require("VSS/Service");
import { Build, BuildDefinitionReference, BuildReason, BuildResult, BuildStatus } from "TFS/Build/Contracts";
import TFS_Build_Extension_Contracts = require("TFS/Build/ExtensionContracts");
import StatusInfo from "./Models/StatusInfo";
import Utils from "./Utils";

VSS.require(["TFS/Dashboards/WidgetHelpers"], (WidgetHelpers) => {
	WidgetHelpers.IncludeWidgetStyles();
	VSS.register("BARSI-Builds-Widget", () => new BuildsWidget(WidgetHelpers));
	VSS.notifyLoadSucceeded();
});

export class BuildsWidget {
	private readonly buildClient: TFS_Build_Client.BuildHttpClient4_1;
	private readonly vssContext: WebContext;
	// private readonly sharedConfig: TFS_Build_Extension_Contracts.IBuildResultsViewExtensionConfig;

	constructor(public WidgetHelpers) {
		this.buildClient = TFS_Build_Client.getClient();
		this.vssContext = VSS.getWebContext();
		// this.sharedConfig = VSS.getConfiguration();
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
					this.renderBuilds(result);
					target.removeAttr("disabled");
				});
		});
		await this.renderBuilds(data);
		btn.removeAttr("disabled");
		// if (this.sharedConfig) {
		// 	this.sharedConfig.onBuildChanged((build: Build) => {
		// 		const buildId = build.id;
		// 	});
		// }
	}

	private async getDefinitions(widgetSettings) {
		const customSettings = JSON.parse(widgetSettings.customSettings.data) as ISettings;
		let definitions = await this.buildClient.getDefinitions(this.vssContext.project.name);

		if (!!customSettings && !!customSettings.selectedDefinitionIds && customSettings.selectedDefinitionIds.length > 0) {
			definitions = definitions.filter((def) => customSettings.selectedDefinitionIds.indexOf(def.id) !== -1);
		}
		const ids = definitions.map((value) => value.id);
		const builds = await this.buildClient.getBuilds(this.vssContext.project.name, ids);

		const result = definitions.map((def) => {
			const buildsForDef = builds
				.filter((item) => item.definition.id === def.id);
			return {
				definition: def,
				builds: buildsForDef,
			};
		})
			.sort((a, b) => {
				if (b.builds.length <= 0) {
					return -1;
				}
				if (a.builds.length <= 0) {
					return 1;
				}
				return a.builds[0].startTime > b.builds[0].startTime ? -1 : a.builds[0].startTime < b.builds[0].startTime ? 1 : 0;
			});

		return result;
	}

	private renderBuilds(data) {
		const dataContainer = $("div.data-container");
		dataContainer.empty();
		if (data.length <= 0) {
			$("<div/>")
				.addClass("definition-not-found")
				.text("Definition not found")
				.appendTo(dataContainer);
		} else {
			const sortData = data.sort((defA, defB) => Utils.sortBuildProvider(defA, defB));
			for (const item of sortData) {
				const definition = item.definition;
				const builds = item.builds;

				if (builds.length <= 0) {
					this.generateRowContainer(definition, null).appendTo(dataContainer);
				} else {
					this.generateRowContainer(definition, builds[0]).appendTo(dataContainer);
				}
			}
		}
	}

	private generateRowContainer(definition: BuildDefinitionReference, build: Build): JQuery<HTMLElement> {
		const rowContainerDiv = $("<div/>");
		rowContainerDiv.addClass("row-container");
		Utils.addTfsLink(rowContainerDiv, definition._links.web.href, false);

		if (build === null) {
			this.generateStatusContainer(-1, -1).appendTo(rowContainerDiv);
			this.generatePiplineContainer(definition).appendTo(rowContainerDiv);
		} else {
			this.generateStatusContainer(build.status, build.result).appendTo(rowContainerDiv);
			this.generatePiplineContainer(definition).appendTo(rowContainerDiv);
			this.generateTriggerContainer(build).appendTo(rowContainerDiv);
			this.generateLastRunContainer(build).appendTo(rowContainerDiv);
			// this.generateMoreWrapper(build, definition).appendTo(rowContainerDiv);
		}
		return rowContainerDiv;
	}

	private generateStatusContainer(status: number, result: number): JQuery<HTMLElement> {
		const statusInfo = StatusInfo.getBuildStatusInfo(status, result);
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

	private generatePiplineContainer(definition: BuildDefinitionReference): JQuery<HTMLElement> {
		const piplineDiv = $("<div/>");
		piplineDiv.addClass("pipeline-container");

		const span = $("<span/>");
		span.addClass("pipeline-name");
		span.text(definition.name);
		span.appendTo(piplineDiv);

		return piplineDiv;
	}

	private generateTriggerContainer(build: Build): JQuery<HTMLElement> {
		const triggerContainerDiv = $("<div/>");
		triggerContainerDiv.addClass("trigger-container");

		const buildNumberDiv = $("<div/>");
		buildNumberDiv.addClass("buildnumber-container");
		Utils.addTfsLink(buildNumberDiv, build._links.web.href, true);

		const spanBuildNumber = $("<span/>");
		spanBuildNumber.text(`#${build.buildNumber}`);
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
		triggerAutorSpan.text(build.requestedFor.displayName);

		triggerInfoDiv.appendTo(triggerContainerDiv);

		return triggerContainerDiv;
	}

	private generateLastRunContainer(build: Build): JQuery<HTMLElement> {
		const lastRunContainerDiv = $("<div/>");
		lastRunContainerDiv.addClass("lastrun-container");

		const parentTooltipDateDiv = $("<div/>");
		parentTooltipDateDiv.addClass("parent-tooltip");

		let triggerTooltipDateSpan = $("<span/>");
		triggerTooltipDateSpan.addClass("trigger-tooltip");
		triggerTooltipDateSpan.text(Utils.getDateTimeString(build.queueTime));
		triggerTooltipDateSpan.appendTo(parentTooltipDateDiv);

		triggerTooltipDateSpan = $("<span/>");
		triggerTooltipDateSpan.addClass("tooltip");
		triggerTooltipDateSpan.addClass("right");
		triggerTooltipDateSpan.text(`Last run: ${build.queueTime.toLocaleString("ru")}`);
		triggerTooltipDateSpan.appendTo(parentTooltipDateDiv);

		parentTooltipDateDiv.appendTo(lastRunContainerDiv);

		const parentTooltipTimeDiv = $("<div/>");
		parentTooltipTimeDiv.addClass("parent-tooltip");

		let inQueueTime = "";
		let inQueueTimeTooltip = "";

		if (build.startTime === null || typeof build.startTime === "undefined") {
			inQueueTime = "0.00s";
			inQueueTimeTooltip = "";
		} else if (build.finishTime === null || typeof build.finishTime === "undefined") {
			inQueueTime = Utils.getDiffDateTimeString(build.startTime, new Date());
			inQueueTimeTooltip = build.startTime.toLocaleString("ru");
		} else {
			inQueueTime = Utils.getDiffDateTimeString(build.startTime, build.finishTime);
			inQueueTimeTooltip = build.startTime.toLocaleString("ru");
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

	private generateMoreWrapper(build: Build, definition: BuildDefinitionReference): JQuery<HTMLElement> {
		const wrapperDiv = $("<div/>");
		wrapperDiv.addClass("more-wrapper");

		const containerDiv = $("<div/>");
		containerDiv.addClass("more-container");
		// containerDiv.on("click", (event) => {
		// 	this.buildClient.queueBuild(newBuild, build.definition.project.id)
		// 		.then((newBuildResult) => {
		// 			const id = newBuildResult;
		// 		});
		// 	event.stopPropagation();
		// });
		containerDiv.appendTo(wrapperDiv);

		return wrapperDiv;
	}
}

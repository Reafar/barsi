import { Build, BuildDefinitionReference, BuildResult, BuildStatus } from "TFS/Build/Contracts";
import TFS_Build_Client = require("TFS/Build/RestClient");
import Services_Navigation = require("VSS/SDK/Services/Navigation");
import Utils from "./Utils";

VSS.require(["TFS/Dashboards/WidgetHelpers"], (WidgetHelpers) => {
	WidgetHelpers.IncludeWidgetStyles();
	VSS.register("BARSI-Builds-Widget", () => new BuildsWidget(WidgetHelpers));
	VSS.notifyLoadSucceeded();
});

export class BuildsWidget {
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
					this.renderBuilds(result);
					target.removeAttr("disabled");
				});
		});
		await this.renderBuilds(data);
		btn.removeAttr("disabled");
	}

	private async getDefinitions(widgetSettings) {
		const buildClient = TFS_Build_Client.getClient();
		const context = VSS.getWebContext();
		const customSettings = JSON.parse(widgetSettings.customSettings.data) as ISettings;
		let definitions = await buildClient.getDefinitions(context.project.name);

		if (!!customSettings && !!customSettings.selectedDefinitionIds && customSettings.selectedDefinitionIds.length > 0) {
			definitions = definitions.filter((def) => customSettings.selectedDefinitionIds.indexOf(def.id) !== -1);
		}
		const ids = definitions.map((value) => value.id);
		const builds = await buildClient.getBuilds(context.project.name, ids, null, null, null, null,
			null, null, null, null, null, null, null, null, 1);

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
		const dataContainer = $("div#data-container");
		dataContainer.empty();
		if (data.length <= 0) {
			$("<div/>")
				.text("Definition not found")
				.addClass("definition-not-found")
				.appendTo(dataContainer);
		} else {
			const sortData = data.sort((defA, defB) => {
				const buildAResult = defA.builds.length > 0 ? defA.builds[0].result : -1;

				const buildBResult = defB.builds.length > 0 ? defB.builds[0].result : -1;

				return buildAResult > buildBResult ? -1 : buildAResult < buildBResult ? 1 : 0;
			});
			for (const item of sortData) {
				const definition = item.definition;
				const builds = item.builds;
				const rootDiv = $("<div/>")
					.addClass("row-container")
					.attr("definition", definition.id);

				if (builds.length <= 0) {
					this.generateCommonInfo(definition, null).appendTo(rootDiv);
					this.generateStatus(null).appendTo(rootDiv);
					this.generateResult(null).appendTo(rootDiv);
				} else {
					const build = builds[0];
					this.generateCommonInfo(definition, build).appendTo(rootDiv);
					this.generateStatus(build.status).appendTo(rootDiv);
					this.generateResult(build.result).appendTo(rootDiv);
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

	private generateCommonInfo(definition: BuildDefinitionReference, build: Build): JQuery<HTMLElement> {
		const commonInfoDiv = $("<div/>");
		commonInfoDiv.addClass("common-info-container");

		const linksDiv = $("<div/>");
		linksDiv.addClass("links-container");

		const definitionInfoDIv = $("<div/>");
		const linkDdefinition = this.createLink(`${Utils.correctTitleLength(definition.name)}:`, definition._links.web.href);
		linkDdefinition.addClass("definition-link");
		linkDdefinition.appendTo(definitionInfoDIv);
		definitionInfoDIv.appendTo(linksDiv);

		const buildInfoDIv = $("<div/>");
		if (build === null) {
			$("<span/>").text("Build not found").appendTo(buildInfoDIv);
		} else {
			const linkBuild = this.createLink(`#${build.buildNumber}`, build._links.web.href);
			linkBuild.appendTo(buildInfoDIv);
		}
		buildInfoDIv.appendTo(linksDiv);
		linksDiv.appendTo(commonInfoDiv);

		const requestedForDiv = $("<div/>");
		requestedForDiv.addClass("requested-container");
		if (build === null) {
			$("<span/>").text("Build not found").appendTo(requestedForDiv);
		} else {
			$("<b/>").text(`${Utils.correctTitleLength(build.requestedFor.displayName)}`).appendTo(requestedForDiv);
			$("<span/>").text(" requested ").appendTo(requestedForDiv);
			$("<span/>").text(`${build.queueTime.toLocaleString("ru-RU")}`).appendTo(requestedForDiv);
		}
		requestedForDiv.appendTo(commonInfoDiv);

		return commonInfoDiv;
	}

	private generateResult(result: number): JQuery<HTMLElement> {
		const resultDiv = $("<div/>");
		resultDiv.addClass("result-container");

		let resultText = "";
		let resultClassName = "";

		switch (result) {
			case BuildResult.Canceled:
				resultText = "Canceled";
				resultClassName = "result-canceled";
				break;
			case BuildResult.Failed:
				resultText = "Failed";
				resultClassName = "result-failed";
				break;
			case BuildResult.PartiallySucceeded:
				resultText = "Partially Succeeded";
				resultClassName = "result-partiallysucceeded";
				break;
			case BuildResult.Succeeded:
				resultText = "Succeeded";
				resultClassName = "result-succeeded";
				break;
			case BuildResult.None:
			default:
				resultText = "None";
				resultClassName = "result-none";
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

	private generateStatus(status: number): JQuery<HTMLElement> {
		const statusDiv = $("<div/>");
		statusDiv.addClass("status-container");

		let statusText = "";
		let statusClassName = "";

		switch (status) {
			case BuildStatus.All:
				statusText = "All";
				statusClassName = "status-all";
				break;
			case BuildStatus.Cancelling:
				statusText = "Cancelling";
				statusClassName = "status-cancelling";
				break;
			case BuildStatus.Completed:
				statusText = "Completed";
				statusClassName = "status-completed";
				break;
			case BuildStatus.InProgress:
				statusText = "In Progress";
				statusClassName = "status-inprogress";
				break;
			case BuildStatus.NotStarted:
				statusText = "Not Started";
				statusClassName = "status-notstarted";
				break;
			case BuildStatus.Postponed:
				statusText = "Postponed";
				statusClassName = "status-postponed";
				break;
			case BuildStatus.None:
			default:
				statusText = "None";
				statusClassName = "status-none";
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

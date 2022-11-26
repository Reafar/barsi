﻿import TFS_RM_Client = require("ReleaseManagement/Core/RestClient");
import { IMultySelectData, MultySelect } from "./MultySelect";

VSS.require(["TFS/Dashboards/WidgetHelpers"], (WidgetHelpers) => {
	WidgetHelpers.IncludeWidgetConfigurationStyles();
	VSS.register("BARSI-Releases-Widget-Configuration",
		() => new ReleasesConfigurationWidget(WidgetHelpers));
	VSS.notifyLoadSucceeded();
});

export class ReleasesConfigurationWidget {
	private multySelect: MultySelect;

	constructor(public WidgetHelpers) { }

	public async load(widgetSettings, widgetConfigurationContext) {
		const releaseClient = TFS_RM_Client.getClient();
		const context = VSS.getWebContext();

		const settings: ISettings = JSON.parse(widgetSettings.customSettings.data);
		let selectedDefinitionIds: number[] = [];

		if (!!settings) {
			selectedDefinitionIds = settings.selectedDefinitionIds;
		}

		const definitions = await releaseClient.getReleaseDefinitions(context.project.id);

		definitions.sort((a, b) => {
			return a.name.localeCompare(b.name);
		});

		const source: IMultySelectData[] = definitions.map((item) => {
			return {
				name: item.name,
				value: item.id,
				checked: selectedDefinitionIds.indexOf(item.id) >= 0,
			};
		});

		this.multySelect = new MultySelect(".multyselect");
		this.multySelect.create(source);

		this.multySelect.change.on(() => {
			widgetConfigurationContext.notify(this.WidgetHelpers.WidgetEvent.ConfigurationChange,
				this.WidgetHelpers.WidgetEvent.Args(this.getCustomSettings()));
		});

		return this.WidgetHelpers.WidgetStatusHelper.Success();
	}

	private getCustomSettings() {
		const selectedOptions = this.multySelect.getValues();
		const data: ISettings = { selectedDefinitionIds: selectedOptions };
		return { data: JSON.stringify(data) };
	}

	private onSave() {
		return this.WidgetHelpers.WidgetConfigurationSave.Valid(this.getCustomSettings());
	}
}

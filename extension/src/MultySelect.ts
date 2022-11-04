import ChangeEvent from "./ChangeEvent";

interface IMultySelectData {
	name: string;
	value: number;
	checked: boolean;
}

class MultySelect {
	private readonly onChange = new ChangeEvent<string>();

	public get change() { return this.onChange.expose(); }

	private selector: string = "";
	private values: number[] = [];

	constructor(selector: string) {
		this.selector = selector;
	}

	public create(source: IMultySelectData[]): JQuery<HTMLElement> {
		const multySelect = $(this.selector);
		multySelect.empty();

		const titleContainer = $("<div/>");
		$("<div/>")
			.text("Select definition(s)")
			.addClass("multyselect-control")
			.on("click", () => {
				$("div.multyselect-data-container").toggleClass("multyselect-hide");
			})
			.appendTo(titleContainer);

		titleContainer.appendTo(multySelect);

		const optionsContainer = $("<div/>")
			.addClass("multyselect-data-container")
			.addClass("multyselect-hide");

		for (const item of source) {
			const label = $("<label/>")
				.addClass("multyselect-data-row");

			const input = $("<input>")
				.attr("type", "checkbox")
				.attr("value", item.value)
				.on("click", (event) => {
					const target = $(event.target) as JQuery<HTMLInputElement>;
					const definitionId = parseInt(target.val() as string, 10);

					const index = this.values.indexOf(definitionId);

					if (index >= 0 && !target.prop("checked")) {
						this.values.splice(index, 1);
					} else if (index < 0 && target.prop("checked")) {
						this.values.push(definitionId);
					}
					this.onChange.trigger();
				});
			if (item.checked) {
				this.values.push(item.value);
				input.attr("checked", "checked");
			}
			input.appendTo(label);

			$("<span>")
				.text(item.name)
				.appendTo(label);

			label.appendTo(optionsContainer);
		}

		optionsContainer.appendTo(multySelect);

		return multySelect;
	}

	public getValues(): number[] {
		return this.values;
	}
}

export {
	MultySelect,
	IMultySelectData,
};

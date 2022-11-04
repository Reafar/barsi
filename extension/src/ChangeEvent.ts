import IMouseEvent from "./IMouseEvent";

export default class ChangeEvent<T> implements IMouseEvent<T> {
	private handlers: Array<(data?: T) => void> = [];

	public on(handler: (data?: T) => void): void {
		this.handlers.push(handler);
	}

	public off(handler: (data?: T) => void): void {
		this.handlers = this.handlers.filter((h) => h !== handler);
	}

	public trigger(data?: T) {
		this.handlers.slice(0).forEach((h) => h(data));
	}

	public expose(): IMouseEvent<T> {
		return this;
	}
}

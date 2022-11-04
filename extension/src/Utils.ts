export default class Utils {

	public static correctTitleLength(title: string): string {
		const applyLength: number = 30;
		if (title.length <= applyLength) {
			return title;
		}
		let sliced = title.slice(0, applyLength);
		sliced += "...";
		return sliced;
	}
}

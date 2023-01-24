import Services_Navigation = require("VSS/SDK/Services/Navigation");
import StatusInfo from "./Models/StatusInfo";
import { DeploymentStatusUtil } from "./DeploymentStatusUtil";
import { DeploymentStatus } from "ReleaseManagement/Core/Contracts";

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

	public static getDateTimeString(dateTime: Date): string {
		const customStringData = [
			{
				check(otherDate) {
					const current = new Date();
					if (current.getFullYear() !== otherDate.getFullYear()) {
						return false;
					} else if (current.getMonth() !== otherDate.getMonth()) {
						return false;
					} else if (current.getDate() !== otherDate.getDate()) {
						return false;
					} else {
						return true;
					}
				},
				result: "Today",
			},
			{
				check(otherDate) {
					const current = new Date();
					current.setDate(current.getDate() - 1);
					if (otherDate.getFullYear() !== current.getFullYear()) {
						return false;
					} else if (otherDate.getMonth() !== current.getMonth()) {
						return false;
					} else if (otherDate.getDate() !== current.getDate()) {
						return false;
					} else {
						return true;
					}
				},
				result: "Yesterday",
			},
			{
				check(otherDate) {
					const msInWeek = 1000 * 60 * 60 * 24 * 7;
					const currentWeek = Math.round(Math.abs(new Date().getTime() / msInWeek));

					const otherWeek = Math.round(Math.abs(otherDate.getTime() / msInWeek));

					return currentWeek - otherWeek === 0;
				},
				result: "Current week",
			},
			{
				check(otherDate) {
					const msInWeek = 1000 * 60 * 60 * 24 * 7;
					const currentWeek = Math.round(Math.abs(new Date().getTime() / msInWeek));

					const otherWeek = Math.round(Math.abs(otherDate.getTime() / msInWeek));

					return currentWeek - otherWeek === 1;
				},
				result: "Last week",
			},
			{
				check(otherDate) {
					const current = new Date();
					if (otherDate.getFullYear() !== current.getFullYear()) {
						return false;
					} else if (otherDate.getMonth() !== current.getMonth()) {
						return false;
					} else {
						return true;
					}
				},
				result: "Current month",
			},
			{
				check(otherDate) {
					const current = new Date();
					current.setMonth(current.getMonth() - 1);
					if (otherDate.getFullYear() !== current.getFullYear()) {
						return false;
					} else if (otherDate.getMonth() !== current.getMonth()) {
						return false;
					} else {
						return true;
					}
				},
				result: "Last month",
			},
			{
				check(otherDate) {
					const current = new Date();
					current.setFullYear(current.getFullYear() - 1);
					if (otherDate.getFullYear() !== current.getFullYear()) {
						return false;
					} else {
						return true;
					}
				},
				result: "Last year",
			},
		];

		for (const item of customStringData) {
			if (item.check(dateTime)) {
				return item.result;
			}
		}
		return dateTime.toLocaleDateString();
	}

	public static getDiffDateTimeString(start: Date, finish: Date): string {
		const timeDiff = finish.getTime() - start.getTime();

		const seconds = Math.floor(timeDiff / 1000);
		if (seconds < 60) {
			return `${seconds}s`;
		}

		const secondsResidual = seconds % 60;
		const minutes = (seconds - secondsResidual) / 60;
		if (minutes < 60) {
			return `${minutes}m ${secondsResidual}s`;
		}

		const minutesResidual = minutes % 60;
		const hours = (minutes - minutesResidual) / 60;
		if (hours < 24) {
			return `${hours}h ${minutesResidual}m ${secondsResidual}s`;
		}

		const hoursResidual = hours % 24;
		const days = (hours - hoursResidual) / 24;

		return `${days}d ${hours}h ${minutesResidual}m ${secondsResidual}s`;
	}

	public static addTfsLink(element: JQuery<HTMLElement>, link: string, stopPropagation: boolean) {
		VSS.getService(VSS.ServiceIds.Navigation).then((navigationService: Services_Navigation.HostNavigationService) => {
			element.on("click", (e) => {
				e.preventDefault();
				navigationService.openNewWindow(link, "");
				if (stopPropagation) {
					e.stopPropagation();
				}
			});
		});
	}

	public static sortBuildProvider(defA, defB): number {
		const buildAPriority = defA.builds.length > 0
			? StatusInfo.getBuildStatusInfo(defA.builds[0].status, defA.builds[0].result).priority : -1;
		const buildBPriority = defB.builds.length > 0
			? StatusInfo.getBuildStatusInfo(defB.builds[0].status, defB.builds[0].result).priority : -1;
		return buildAPriority > buildBPriority ? -1 : buildAPriority < buildBPriority ? 1 : 0;
	}

	public static sortReleaseProvider(defA, defB): number {
		let releaseAPriority = -1;
		if (defA.releases.length > 0) {
			const release = defA.releases[0];
			const deploymentStatus: DeploymentStatus = DeploymentStatusUtil.getStatus(release);
			releaseAPriority = StatusInfo.getReleaseStatusInfo(release.status, deploymentStatus).priority;
		}
		let releaseBPriority = -1;
		if (defB.releases.length > 0) {
			const release = defB.releases[0];
			const deploymentStatus: DeploymentStatus = DeploymentStatusUtil.getStatus(release);
			releaseBPriority = StatusInfo.getReleaseStatusInfo(release.status, deploymentStatus).priority;
		}

		return releaseAPriority > releaseBPriority ? -1 : releaseAPriority < releaseBPriority ? 1 : 0;
	}
}

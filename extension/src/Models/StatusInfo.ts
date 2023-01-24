import { DeploymentStatus, ReleaseStatus } from "ReleaseManagement/Core/Contracts";
import { BuildResult, BuildStatus } from "TFS/Build/Contracts";

export default class StatusInfo {

	public static getReleaseStatusInfo(status: number, deploymentStatus: number) {
		switch (status) {
			case ReleaseStatus.Abandoned:
				return this.statusInfo.Canceled;
			case ReleaseStatus.Active:
				switch (deploymentStatus) {
					case DeploymentStatus.Failed:
						return this.statusInfo.Failed;
					case DeploymentStatus.NotDeployed:
						return this.statusInfo.Queued;
					case DeploymentStatus.InProgress:
						return this.statusInfo.Running;
					case DeploymentStatus.PartiallySucceeded:
						return this.statusInfo.Warning;
					case DeploymentStatus.Succeeded:
						return this.statusInfo.Success;
					case DeploymentStatus.All:
					case DeploymentStatus.Undefined:
					default:
						return this.statusInfo.None;
				}
			case ReleaseStatus.Draft:
			case ReleaseStatus.Undefined:
			default:
				return this.statusInfo.None;
		}
	}

	public static getBuildStatusInfo(status: number, result: number) {
		switch (status) {
			case BuildStatus.Cancelling:
			case BuildStatus.InProgress:
				return this.statusInfo.Running;
			case BuildStatus.NotStarted:
				return this.statusInfo.Queued;
			case BuildStatus.All:
			case BuildStatus.Postponed:
			case BuildStatus.None:
			case BuildStatus.Completed:
				switch (result) {
					case BuildResult.Canceled:
						return this.statusInfo.Canceled;
					case BuildResult.Failed:
						return this.statusInfo.Failed;
					case BuildResult.PartiallySucceeded:
						return this.statusInfo.Warning;
					case BuildResult.Succeeded:
						return this.statusInfo.Success;
					case BuildResult.None:
					default:
						return this.statusInfo.None;
				}
			default:
				return this.statusInfo.None;
		}
	}

	private static statusInfo = {
		Success: {
			className: "success",
			tooltip: "Success",
			svgNode:
				"<svg height='23' viewBox='0 0 32 32' width='23'>" +
				"<path d='M12.799 20.83l-.005-.003L9.94 17.97a1.5 1.5 0 1 1 2.121-2.12l1.8 1.798 6.209-6.21a1.5 1.5 0 1 1 2.12 2.122l-7.264 7.264-.005.006a1.5 1.5 0 0 1-2.121 0z'" +
				"fill='#fff'></path>" +
				"</svg>",
			priority: 2,
		},
		Failed: {
			className: "failed",
			tooltip: "Failed",
			svgNode:
				"<svg height='23' viewBox='0 0 32 32' width='23'>" +
				"<path d='M21.99 9.99a1.5 1.5 0 0 0-2.122 0L16 13.856 12.132 9.99a1.5 1.5 0 0 0-2.121 2.122l3.868 3.868-3.89 3.889a1.5 1.5 0 0 0 2.122 2.121L16 18.1l3.89 3.89a1.5 1.5 0 0 0 2.12-2.122l-3.889-3.89 3.868-3.867a1.5 1.5 0 0 0 0-2.122z'" +
				"fill='#fff'></path>" +
				"</svg>",
			priority: 16,
		},
		None: {
			className: "none",
			tooltip: "No runs yet",
			svgNode: "",
			priority: 0,
		},
		Canceled: {
			className: "canceled",
			tooltip: "Canceled",
			svgNode:
				"<svg height='23' viewBox='0 0 32 32' width='23'>" +
				"<path fill-rule='evenodd' clip-rule='evenodd' d='M32 16c0 8.837-7.163 16-16 16S0 24.837 0 16 7.163 0 16 0s16 7.163 16 16zm-2 0c0 7.732-6.268 14-14 14S2 23.732 2 16 8.268 2 16 2s14 6.268 14 14zm-17.618-5.81a1.5 1.5 0 1 0-2.121 2.12l9.192 9.193a1.5 1.5 0 1 0 2.121-2.121l-9.192-9.193z'>" +
				"</path>" +
				"</svg>",
			priority: 4,
		},
		Queued: {
			className: "queued",
			tooltip: "Queued",
			svgNode:
				"<svg height='22' viewBox='0 0 16 16' width='22'>" +
				"<path d='M8 3.5a.9.9 0 0 1 .9.9v3.325l2.002 2.001A.9.9 0 1 1 9.629 11L7.408 8.778A.898.898 0 0 1 7.1 8.1V4.4a.9.9 0 0 1 .9-.9z'" +
				"fill='#fff'></path>" +
				"</svg>",
			priority: 32,
		},
		Running: {
			className: "running",
			tooltip: "Running",
			svgNode:
				"<svg height='23' viewBox='0 0 32 32' width='23'>" +
				"<path d='M23 16c0 .325-.022.645-.065.959-.07.509.137 1.031.582 1.289.622.36 1.42.058 1.545-.65a9.204 9.204 0 0 0-6.27-10.367c-.664-.21-1.292.324-1.292 1.02 0 .532.374.982.873 1.162A7.003 7.003 0 0 1 23 16zM9 16a7.003 7.003 0 0 1 4.627-6.587c.5-.18.873-.63.873-1.161 0-.697-.628-1.232-1.292-1.02a9.204 9.204 0 0 0-6.27 10.367c.124.707.924 1.008 1.545.649.445-.258.652-.78.582-1.29A7.062 7.062 0 0 1 9 16zm7 7a6.975 6.975 0 0 0 4.728-1.838c.403-.37.999-.484 1.472-.21.586.339.744 1.121.261 1.597A9.17 9.17 0 0 1 16 25.2a9.17 9.17 0 0 1-6.461-2.65c-.482-.477-.325-1.26.261-1.599.473-.273 1.069-.159 1.472.21A6.975 6.975 0 0 0 16 23z'" +
				"fill='#fff'></path>" +
				"</svg>",
			priority: 64,
		},
		Warning: {
			className: "warning",
			tooltip: "Warning",
			svgNode:
				"<svg height='23' viewBox='0 0 32 32' width='23'>" +
				"<path d='M16 7a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-3 0v-9A1.5 1.5 0 0 1 16 7zm-1.5 16a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0z'" +
				"fill='#fff'></path>" +
				"</svg>",
			priority: 8,
		},
	};
}

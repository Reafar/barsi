import { DeploymentAttempt, DeploymentOperationStatus, DeploymentStatus, Release } from "ReleaseManagement/Core/Contracts";

export class DeploymentStatusUtil {

	public static getStatus(release: Release): DeploymentStatus {

		let status: DeploymentStatus = DeploymentStatus.Succeeded;

		for (const environment of release.environments) {
			for (const step of environment.deploySteps) {
				if (step.status === DeploymentStatus.Succeeded) {
					continue;
				}

				status = step.status;
				break;
			}

			if (status === DeploymentStatus.Succeeded) {
				continue;
			}
			break;
		}

		return status;
	}
}

import { Stack, StackProps, RemovalPolicy, Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as logs from "aws-cdk-lib/aws-logs";

export class EventStack extends Stack {
    public readonly eventBus: events.EventBus;

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        this.eventBus = new events.EventBus(this, "DomainEventBus", {
            eventBusName: "nook-dev-domain-events",
        });

        const debugLogGroup = new logs.LogGroup(this, "EventBusDebugLog", {
            logGroupName: "/nook/dev/event-bus/all-events",
            retention: logs.RetentionDays.TWO_WEEKS,
            removalPolicy: RemovalPolicy.DESTROY, // dev only
        });

        new events.Rule(this, "CatchAllDebugRule", {
            eventBus: this.eventBus,
            ruleName: "nook-dev-catch-all-debug",
            eventPattern: { account: [Stack.of(this).account] }, // matches literally everything
            description: "Logs every event on the bus for local debugging",
            targets: [new targets.CloudWatchLogGroup(debugLogGroup)],
        });
    }
}


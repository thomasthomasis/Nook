import { Stack, StackProps, Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as cw_actions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as events from "aws-cdk-lib/aws-events";
import * as sns from "aws-cdk-lib/aws-sns";
import * as sns_subs from "aws-cdk-lib/aws-sns-subscriptions";

export interface MonitoringStackProps extends StackProps {
    eventBus: events.EventBus;
}

export class MonitoringStack extends Stack {
    constructor(scope: Construct, id: string, props: MonitoringStackProps) {
        super(scope, id, props);

        const alarmTopic = new sns.Topic(this, "PlatformAlarms", {
            topicName: "nook-dev-platform-alarms",
        });
        // Subscribe your own email so alarms actually reach you.
        alarmTopic.addSubscription(new sns_subs.EmailSubscription("thomas.i.sloane@gmail.com"));

        const dashboard = new cloudwatch.Dashboard(this, "PlatformDashboard", {
            dashboardName: "nook-dev-platform-overview",
        });

        dashboard.addWidgets(
            new cloudwatch.GraphWidget({
                title: "Event Bus - Invocations vs Failed Invocations",
                left: [
                    new cloudwatch.Metric({
                        namespace: "AWS/Events",
                        metricName: "Invocations",
                        dimensionsMap: { EventBusName: props.eventBus.eventBusName },
                        statistic: "Sum",
                    }),
                ],
                right: [
                    new cloudwatch.Metric({
                        namespace: "AWS/Events",
                        metricName: "FailedInvocations",
                        dimensionsMap: { EventBusName: props.eventBus.eventBusName },
                        statistic: "Sum",
                    }),
                ],
            })
        );

        new cloudwatch.Alarm(this, "EventBusFailedInvocationsAlarm", {
            alarmName: "nook-dev-event-bus-failed-invocations",
            metric: new cloudwatch.Metric({
                namespace: "AWS/Events",
                metricName: "FailedInvocations",
                dimensionsMap: { EventBusName: props.eventBus.eventBusName },
                statistic: "Sum",
                period: Duration.minutes(5),
            }),
            threshold: 1,
            evaluationPeriods: 1,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        }).addAlarmAction(new cw_actions.SnsAction(alarmTopic));

    }
}
import { Component, NgZone, OnDestroy, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { HubConnection } from "@aspnet/signalr-client";
import { TdLoadingService } from "@covalent/core";

import { ICheckDetail } from "../app.interfaces";
import { AppService, MessageService, UtilService } from "../services";

import { CheckResultStatus } from "../app.enums";
import { RunCheckComponent } from "../components";

@Component({
    templateUrl: "./details.template.html",
    styleUrls: ["./details.style.scss"],
})
export class DetailsComponent implements OnInit, OnDestroy {
    public check: ICheckDetail;
    public chart: Array<{
        name: string;
        series: Array<{ value: number, name: string | Date }>
    }> = [];
    public customColors: Array<{
        name: string;
        value: string;
    }> = [];
    public dateMin: Date;
    public dateMax: Date;
    public dateFrom: Date = new Date();
    public dateTo: Date = new Date();
    public loadingId = "details-chart-loading";
    private hub = new HubConnection("hub/details");
    private hubReady: boolean = false;
    private checkID?: number;
    private selectedKey?: number;
    private loading: boolean = false;
    constructor(
        private appService: AppService, private messageService: MessageService, private ngZone: NgZone, private activatedRoute: ActivatedRoute,
        private utilService: UtilService, private loadingService: TdLoadingService) {
        this.hub.on("check", (id: number) => {
            if (id !== this.checkID || this.loading) { return; }
            // Because this is a call from the server, Angular change detection won't detect it so we must force ngZone to run
            this.ngZone.run(async () => {
                await this.loadCheck();
            });
        });
    }
    public async ngOnInit() {
        try {
            const params = await this.activatedRoute.params.first().toPromise();
            this.checkID = parseInt(params.id);
            await this.loadCheck();
            await this.hub.start();
            this.hubReady = true;
        } catch (e) {
            this.messageService.error("Failed to load", e.toString());
        }
    }
    public ngOnDestroy() {
        if (this.hubReady) {
            this.hub.stop();
        }
    }
    public async loadCheck() {
        try {
            if (!this.checkID) { return; }
            if (this.loading) { return; }
            this.loading = true;
            this.loadingService.register(this.loadingId);
            this.check = await this.appService.getDetails(this.checkID, true);
            this.updateCharts();
        } catch (e) {
            this.messageService.error("Failed to load checks", e.toString());
        } finally {
            this.loading = false;
            this.loadingService.resolve(this.loadingId);
        }
    }
    public changeDateTo() {
        this.dateTo = new Date(this.dateFrom.valueOf());
    }
    public updateCharts() {
        if (!this.check.Results || this.check.Results.length === 0) { return; }
        this.dateMin = new Date(this.check.Results[0].DTS);
        this.dateMax = new Date(this.check.Results[this.check.Results.length - 1].DTS);
        if (this.dateFrom < this.dateMin) {
            this.dateFrom = new Date(this.dateMin.valueOf());
        } else if (this.dateFrom > this.dateMax) {
            this.dateFrom = new Date(this.dateMax.valueOf());
        }
        if (this.dateTo < this.dateMin) {
            this.dateTo = new Date(this.dateMin.valueOf());
        } else if (this.dateTo > this.dateMax) {
            this.dateTo = new Date(this.dateMax.valueOf());
        }
        this.dateFrom.setHours(0);
        this.dateFrom.setMinutes(0);
        this.dateFrom.setSeconds(0);
        this.dateTo.setHours(23);
        this.dateTo.setMinutes(59);
        this.dateTo.setSeconds(59);
        const results = this.check.Results.filter(x => {
            const date = new Date(x.DTS);
            return date >= this.dateFrom && date < this.dateTo;
        });
        let groups = this.utilService.group(results, x => x.Status);
        if (this.selectedKey) {
            const key = this.selectedKey.toString();
            groups = groups.filter(x => x.key === key);
        }
        this.customColors = groups.map(group => ({
            name: CheckResultStatus[group.key],
            value: this.getColorForStatus(parseInt(group.key) as CheckResultStatus),
        }));
        this.chart = groups.map(group => ({
            name: CheckResultStatus[group.key],
            series: group.data.map(x => ({
                value: x.TimeMS,
                name: new Date(x.DTS),
            })),
        }));
    }
    public async run() {
        await this.appService.run(RunCheckComponent, this.check);
    }
    public back() {
        this.utilService.back();
    }
    public select(event: any) {
        if (typeof event === "string") {
            this.selectedKey = CheckResultStatus[event];
            const group = this.chart.find(x => x.name === event);
            if (group) {
                this.chart = [group];
            }
        }
    }
    public reset() {
        delete this.selectedKey;
        this.updateCharts();
    }
    private getColorForStatus(status: CheckResultStatus) {
        if (status > CheckResultStatus.Success) {
            return "#FFEE58";
        } else if (status === CheckResultStatus.Success) {
            return "#66BB6A";
        } else {
            return "#EF5350";
        }
    }
}

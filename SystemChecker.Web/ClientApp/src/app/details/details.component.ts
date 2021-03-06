import { Component, NgZone, OnDestroy, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { HttpTransportType, HubConnectionBuilder } from "@aspnet/signalr";
import { TdLoadingService } from "@covalent/core";
import * as moment from "moment";
import { PageVisibilityService } from "ngx-page-visibility";
import { Subscription } from "rxjs";
import { first } from "rxjs/operators";

import { ResultType } from "../app.enums";
import { ICheck, ICheckResults, IResultStatus, IResultType } from "../app.interfaces";
import { RunCheckComponent } from "../components";
import { AppService, MessageService, UtilService } from "../services";

@Component({
    templateUrl: "./details.template.html",
    styleUrls: ["./details.style.scss"],
})
export class DetailsComponent implements OnInit, OnDestroy {
    public check?: ICheck;
    public results?: ICheckResults;
    public newResults = false;
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
    public checkID?: number;
    private hub = new HubConnectionBuilder()
        .withUrl("hub/details", { transport: HttpTransportType.WebSockets })
        .build();
    private hubReady = false;
    private selectedKey?: IResultStatus;
    private loading = false;
    private subscriptions: Subscription[] = [];
    private resultStatuses: IResultStatus[] = [];
    private resultStatusLookup: {
        [key: number]: IResultStatus,
    };
    private resultTypes: IResultType[] = [];
    private resultTypeLookup: {
        [key: number]: IResultType,
    };
    constructor(
        private appService: AppService, private messageService: MessageService, private ngZone: NgZone, private activatedRoute: ActivatedRoute,
        private utilService: UtilService, private loadingService: TdLoadingService, private pageVisibilityService: PageVisibilityService) {
        this.hub.on("check", (id: number) => {
            if (id !== this.checkID || this.loading || !moment(this.dateTo).isSameOrAfter(moment(), "day")) { return; }
            if (!this.pageVisibilityService.isPageVisible()) { this.newResults = true; return; }
            // Because this is a call from the server, Angular change detection won't detect it so we must force ngZone to run
            this.ngZone.run(async () => {
                await this.loadResults();
            });
        });
    }
    public async ngOnInit() {
        try {
            const params = await this.activatedRoute.params.pipe(first()).toPromise();
            this.checkID = parseInt(params.id);
            this.check = await this.appService.get(this.checkID);

            this.resultStatuses = await this.appService.getResultStatuses();
            delete this.resultStatusLookup;
            this.resultStatusLookup = {};
            this.resultStatuses.map(x => {
                this.resultStatusLookup[x.ID] = x;
            });

            this.resultTypes = await this.appService.getResultTypes();
            delete this.resultTypeLookup;
            this.resultTypeLookup = {};
            this.resultTypes.map(x => {
                this.resultTypeLookup[x.ID] = x;
            });

            await this.loadResults();
            await this.hub.start();
            this.hubReady = true;
            this.subscriptions = [
                this.pageVisibilityService.$onPageVisible.subscribe(() => this.ngZone.run(this.onPageVisible.bind(this))),
            ];
        } catch (e) {
            this.messageService.error("Failed to load", e.toString());
        }
    }

    public ngOnDestroy() {
        if (this.hubReady) {
            this.hub.stop();
        }
        if (this.subscriptions) {
            this.subscriptions.forEach(x => x.unsubscribe());
            this.subscriptions = [];
        }
    }

    public async loadResults() {
        try {
            if (!this.checkID) { return; }
            if (this.loading) { return; }
            this.loading = true;
            this.loadingService.register(this.loadingId);
            this.results = await this.appService.getResults(this.checkID, this.dateFrom, this.dateTo);
            this.updateMinMax();
            this.updateCharts();
        } catch (e) {
            this.messageService.error("Failed to load checks", e.toString());
        } finally {
            this.loading = false;
            this.loadingService.resolve(this.loadingId);
        }
    }
    public async changeDateFrom() {
        if (this.dateFrom < this.dateMin) {
            this.dateFrom = new Date(this.dateMin.valueOf());
        } else if (this.dateFrom > this.dateMax) {
            this.dateFrom = new Date(this.dateMax.valueOf());
        }
        this.dateTo = new Date(this.dateFrom.valueOf());
        this.changeDateTo();
        await this.loadResults();
    }
    public async changeDateTo() {
        if (this.dateTo < this.dateMin) {
            this.dateTo = new Date(this.dateMin.valueOf());
        } else if (this.dateTo > this.dateMax) {
            this.dateTo = new Date(this.dateMax.valueOf());
        }
        await this.loadResults();
    }
    public updateCharts() {
        if (!this.results || !this.results.Results || this.results.Results.length === 0) { return; }
        let groups = this.utilService.group(this.results.Results, x => x.StatusID);
        if (this.selectedKey) {
            const key = this.selectedKey.ID.toString();
            groups = groups.filter(x => x.key === key);
        }
        this.customColors = groups.map(group => ({
            name: this.resultStatusLookup[parseInt(group.key)].Name,
            value: this.getColorForStatus(this.resultStatusLookup[parseInt(group.key)]),
        }));
        this.chart = groups.map(group => ({
            name: this.resultStatusLookup[parseInt(group.key)].Name,
            series: group.data.map(x => ({
                value: x.TimeMS,
                name: new Date(x.DTS),
            })),
        }));
    }
    public async run() {
        if (!this.check) { return; }
        await this.appService.run(RunCheckComponent, this.check);
    }
    public back() {
        this.utilService.back();
    }
    public select(event: any) {
        if (typeof event === "string") {
            this.selectedKey = this.resultStatuses.find(x => x.Name === event);
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
    private getColorForStatus(status: IResultStatus) {
        const type = this.resultTypeLookup[status.TypeID];
        if (type.Name === ResultType[ResultType.Warning]) {
            return "#FFEE58";
        } else if (type.Name === ResultType[ResultType.Success]) {
            return "#66BB6A";
        } else {
            return "#EF5350";
        }
    }
    private updateMinMax() {
        if (!this.results) { return; }
        this.dateMin = new Date(this.results.MinDate);
        this.dateMax = new Date(this.results.MaxDate);
    }
    private async onPageVisible() {
        if (this.newResults) {
            this.newResults = false;
            await this.loadResults();
        }
    }
}

// Your code
import './main.css';

import angular from 'angular';
import ngMaterial from 'angular-material';
import uiRouter from 'angular-ui-router';

import Chartist from 'chartist';

import 'chartist/dist/chartist.min.css';

import "angular-material/angular-material.min.css";

import "chartist-plugin-fill-donut";

import io from 'socket.io-client';

import moment from 'moment';

const app = angular.module('SpeedTest', [ngMaterial, uiRouter]);

app.controller('Main', function ($scope, Socket) {

});

app.service('Socket', function ($rootScope, $mdToast) {
    const _this = this;
    this.socket = io('//:3001');
    this.socket.on('PushData', payload => {
        if (payload.doc && payload.doc.finished) {
            console.log(`New speedtest result.`);
            $mdToast.showSimple("Added new speedtest result!");
            console.log(payload.doc);
            this.FinishedSpeedTests.push(payload.doc);
            this.FinishedSpeedTests = this.FinishedSpeedTests.sortByDateGetBiggerGerman();
            this.makeChartData();
            this.updateChart();

        } else if (payload.doc && !payload.doc.finished) {
            console.log(`New speedtest started... Waiting for results...`);
            $mdToast.showSimple("New speedtest started!");
            console.log(payload.doc);
        } else {
            console.log(`I don't know what this is.`);
            console.log(payload);
        }
    });
    this.Data = false;
    this.FinishedSpeedTests = [];
    this.socket.on('AllData', payload => {
        this.Data = true;
        for (let i = 0; i < payload.rows.length; i++) {
            if (payload.rows[i].doc && payload.rows[i].doc.finished) {
                _this.FinishedSpeedTests.push(payload.rows[i].doc);
            }
        }
        _this.FinishedSpeedTests = _this.FinishedSpeedTests.sortByDateGetBiggerGerman();
        console.log(payload);
        console.log(_this.FinishedSpeedTests);
        this.makeChartData();
        $rootScope.$emit('AllData');
    });
    this.ChartData = [];
    this.updateChart = function () {
        $rootScope.$emit('updateChart');
    };
    this.createChart = function () {
        $rootScope.$emit('createChart');
    };
    this.makeChartData = function () {
        const labels = [];
        const Upload = [];
        const Download = [];
        const Ping = [];
        for (let i = 0; i < this.FinishedSpeedTests.length; i++) {
            Upload.push({
                meta: this.FinishedSpeedTests[i].upload,
                value: (this.FinishedSpeedTests[i].uploadBytes / (1024*1024)).toFixed(2),
                org: this.FinishedSpeedTests[i].uploadBytes
            });
            Download.push({
                meta: this.FinishedSpeedTests[i].download,
                value: (this.FinishedSpeedTests[i].downloadBytes / (1024*1024)).toFixed(2),
                org: this.FinishedSpeedTests[i].downloadBytes
            });
            Ping.push({
                meta: this.FinishedSpeedTests[i].ping,
                value: this.FinishedSpeedTests[i].ping
            });
            const d = new Date(this.FinishedSpeedTests[i].createdAt);
            //labels.push(`${d.getHours() < 10 ? "0" + d.getHours() : d.getHours()}:${d.getMinutes() < 10 ? "0" + d.getMinutes() : d.getMinutes()}`);
            labels.push(d.getTime());
        }
        this.labels = labels;
        this.Download = Download;
        this.Upload = Upload;
        this.Ping = Ping;
    };
});

app.controller('loading', function ($scope, Socket, $state, $rootScope) {
    if (Socket.Data) {
        $state.go('home');
    } else {
        benchmark((next) => {
            $rootScope.$on('AllData', (e) => {
                next(function (start, end, difference) {
                    if (difference.ms < 1400) {
                        setTimeout(function () {
                            $state.go('home');
                        }, 1400 - difference.ms);
                        console.log("Wait " + (1400 - difference.ms) + "ms");
                    } else {
                        $state.go('home');
                    }
                });
            });
        });
    }
});

app.controller('home', function ($scope, Socket, $rootScope, $state) {
    if (!Socket.Data) {
        $state.go('loading');
        return;
    }
    $scope.safeApply = function(fn) {
        var phase = this.$root.$$phase;
        if(phase == '$apply' || phase == '$digest') {
            if(fn && (typeof(fn) === 'function')) {
                fn();
            }
        } else {
            this.$apply(fn);
        }
    };
    const DLch = new Chartist.Line('#DownloadChart', {
        labels: Socket.labels,
        series: [Socket.Download]
    }, {
        axisX: {
            showLabel: false,
            showGrid: false
        },
        plugins: [
        ]
    });
    const UPch = new Chartist.Line('#UploadChart', {
        labels: Socket.labels,
        series: [Socket.Upload]
    }, {
        axisX: {
            showLabel: false,
            showGrid: false
        },
        plugins: [
        ]
    });
    const Pingch = new Chartist.Line('#PingChart', {
        labels: Socket.labels,
        series: [Socket.Ping]
    }, {
        axisX: {
            showLabel: false,
            showGrid: false
        },
        plugins: [
        ]
    });
    const LastDownloadChart = new Chartist.Pie('#LastDownloadChart', {
        series: [Socket.Download[Socket.Download.length > 0 ? Socket.Download.length - 1 : 0].value || 0 ],
        labels: ['', '']
    }, {
        donut: true,
        donutWidth: 20,
        startAngle: 210,
        total: Socket.Download[Socket.Download.length > 0 ? Socket.Download.length - 1 : 0].value < 5 ? 5 : 125,
        showLabel: false,
        plugins: [
            Chartist.plugins.fillDonut({
                items: [{
                    content: '<i class="fa fa-tachometer"></i>',
                    position: 'bottom',
                    offsetY : 10,
                    offsetX: -2
                }, {
                    content: '<h3 id="LastDownloadChartH3">'+ Socket.Download[Socket.Download.length > 0 ? Socket.Download.length - 1 : 0].meta || 0 +'</h3>'
                }]
            })
        ],
    });
    const LastUploadChart = new Chartist.Pie('#LastUploadChart', {
        series: [Socket.Upload[Socket.Upload.length > 0 ? Socket.Upload.length - 1 : 0].value || 0 ],
        labels: ['', '']
    }, {
        donut: true,
        donutWidth: 20,
        startAngle: 210,
        total: Socket.Upload[Socket.Upload.length > 0 ? Socket.Upload.length - 1 : 0].value < 5 ? 5 : 125,
        showLabel: false,
        plugins: [
            Chartist.plugins.fillDonut({
                items: [{
                    content: '<i class="fa fa-tachometer"></i>',
                    position: 'bottom',
                    offsetY : 10,
                    offsetX: -2
                }, {
                    content: '<h3 id="LastUploadChartH3">'+ Socket.Upload[Socket.Upload.length > 0 ? Socket.Upload.length - 1 : 0].meta || 0 +'</h3>'
                }]
            })
        ],
    });
    $scope.LastPing = Socket.Ping[Socket.Ping.length > 0 ? Socket.Ping.length - 1 : 0].value || 0;
    let d = new Date(Socket.labels[Socket.labels.length > 0 ? Socket.labels.length - 1 : 0] || 0);
    $scope.LastTest = moment(d).format("DD MMM YYYY kk:mm");
    $scope.safeApply();
    $rootScope.$on('updateChart', () => {
        DLch.update({
            labels: Socket.labels,
            series: [Socket.Download]
        });
        UPch.update({
            labels: Socket.labels,
            series: [Socket.Upload]
        });
        Pingch.update({
            labels: Socket.labels,
            series: [Socket.Ping]
        });
        LastDownloadChart.update({
            series: [Socket.Download[Socket.Download.length > 0 ? Socket.Download.length - 1 : 0].value || 0 ],
            labels: ['', '']
        }, {
            donut: true,
            donutWidth: 20,
            startAngle: 210,
            total: Socket.Download[Socket.Download.length > 0 ? Socket.Download.length - 1 : 0].value < 5 ? 5 : 125,
            showLabel: false,
            plugins: [
                Chartist.plugins.fillDonut({
                    items: [{
                        content: '<i class="fa fa-tachometer"></i>',
                        position: 'bottom',
                        offsetY : 10,
                        offsetX: -2
                    }, {
                        content: '<h3 id="LastDownloadChartH3">'+ Socket.Download[Socket.Download.length > 0 ? Socket.Download.length - 1 : 0].meta || 0 +'</h3>'
                    }]
                })
            ],
        });
        document.getElementById('LastDownloadChartH3').innerHTML = Socket.Download[Socket.Download.length > 0 ? Socket.Download.length - 1 : 0].meta || 0;
        LastUploadChart.update({
            series: [Socket.Upload[Socket.Upload.length > 0 ? Socket.Upload.length - 1 : 0].value || 0 ],
            labels: ['', '']
        }, {
            donut: true,
            donutWidth: 20,
            startAngle: 210,
            total: Socket.Upload[Socket.Upload.length > 0 ? Socket.Upload.length - 1 : 0].value < 5 ? 5 : 125,
            showLabel: false,
            plugins: [
                Chartist.plugins.fillDonut({
                    items: [{
                        content: '<i class="fa fa-tachometer"></i>',
                        position: 'bottom',
                        offsetY : 10,
                        offsetX: -2
                    }, {
                        content: '<h3 id="LastUploadChartH3">'+ Socket.Upload[Socket.Upload.length > 0 ? Socket.Upload.length - 1 : 0].meta || 0 +'</h3>'
                    }]
                })
            ],
        });
        document.getElementById('LastUploadChartH3').innerHTML = Socket.Upload[Socket.Upload.length > 0 ? Socket.Upload.length - 1 : 0].meta || 0;
        $scope.LastPing = Socket.Ping[Socket.Ping.length > 0 ? Socket.Ping.length - 1 : 0].value || 0;
        let d = new Date(Socket.labels[Socket.labels.length > 0 ? Socket.labels.length - 1 : 0] || 0);
        $scope.LastTest = moment(d).format("DD MMM YYYY kk:mm");
        $scope.safeApply();
        console.log("Chart updated.");
    });
});

app.config(function ($stateProvider, $urlRouterProvider, $mdThemingProvider) {

    $urlRouterProvider.otherwise('/loading');
    $stateProvider.state({
        name: "loading",
        url: "/loading",
        controller: 'loading',
        template: require('./loading.html')
    });
    $stateProvider.state({
        name: "home",
        url: "/",
        controller: "home",
        template: require('./home.html')
    });

    $mdThemingProvider.theme('default').dark();
});

function benchmark(method) {
    const start = +(new Date);
    method && method(function (callback) {
        const end = +(new Date);
        const difference = end - start;
        callback && callback(start, end, {
            milliseconds: difference,
            ms: difference,
            seconds: (difference / 1000) % 60,
            minutes: (difference / (1000 * 60)) % 60,
            hours: (difference / (1000 * 60 * 60)) % 24
        });
    });
}


Array.prototype.sortByDateGetBiggerGerman = function () {
    return this.sort(function (a, b) {
        if (new Date(a.createdAt).getTime() > new Date(b.createdAt).getTime()) return 1;
        if (new Date(a.createdAt).getTime() < new Date(b.createdAt).getTime()) return -1;
        return 0;
    });
};

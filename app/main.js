// Your code
import './main.css';

import angular from 'angular';
import ngMaterial from 'angular-material';
import uiRouter from 'angular-ui-router';

import "angular-material/angular-material.min.css";

import io from 'socket.io-client';

import moment from 'moment';

window.moment = moment;

import 'ng-material-datetimepicker/dist/angular-material-datetimepicker.min';
import "ng-material-datetimepicker/dist/material-datetimepicker.min.css";

const app = angular.module('SpeedTest', [ngMaterial, uiRouter, 'ngMaterialDatePicker']);

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
            this.OriginalFinishedSpeedTest.push(payload.doc);
            this.OriginalFinishedSpeedTest = this.OriginalFinishedSpeedTest.sortByDateGetBiggerGerman();
            this.FinishedSpeedTests = OriginalFinishedSpeedTest;
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
        _this.OriginalFinishedSpeedTest = _this.FinishedSpeedTests;
        console.log(payload);
        console.log(_this.FinishedSpeedTests);
        google.charts.load('current', {'packages': ['line', 'gauge']});
        google.charts.setOnLoadCallback(() => {
            _this.makeChartData();
            $rootScope.$emit('AllData');
        });
    });
    this.ChartData = [];
    this.updateChart = function () {
        $rootScope.$emit('updateChart');
    };
    this.createChart = function () {
        $rootScope.$emit('createChart');
    };
    this.makeChartData = function () {

        if (_this.Start || (_this.End && _this.Start)){
            _this.FinishedSpeedTests = [];
            for (let i = 0; i < _this.OriginalFinishedSpeedTest.length; i++){
                if (moment(_this.OriginalFinishedSpeedTest[i].createdAt).isBetween(_this.Start, _this.End || moment())){
                    _this.FinishedSpeedTests.push(_this.OriginalFinishedSpeedTest[i]);
                }
            }
            _this.FinishedSpeedTests = _this.FinishedSpeedTests.sortByDateGetBiggerGerman();
        }

        /**
         *
         * Download Chart
         *
         */

        _this.DownloadData = new google.visualization.DataTable();
        _this.DownloadData.addColumn('date', 'Time');
        _this.DownloadData.addColumn('number', 'Speed');
        const DLArray = [];
        for (let i = 0; i < _this.FinishedSpeedTests.length; i++) {
            DLArray.push([moment(_this.FinishedSpeedTests[i].createdAt).toDate(), parseFloat((_this.FinishedSpeedTests[i].downloadBytes / (1000 * 1000)).toFixed(2))]);
        }
        _this.DownloadData.addRows(DLArray);

        /**
         *
         * Upload Chart
         *
         */

        _this.UploadData = new google.visualization.DataTable();
        _this.UploadData.addColumn('date', 'Time');
        _this.UploadData.addColumn('number', 'Speed');
        const UPArray = [];
        for (let i = 0; i < _this.FinishedSpeedTests.length; i++) {
            UPArray.push([moment(_this.FinishedSpeedTests[i].createdAt).toDate(), parseFloat((_this.FinishedSpeedTests[i].uploadBytes / (1000 * 1000)).toFixed(2))]);
        }
        _this.UploadData.addRows(UPArray);

        /**
         *
         * Ping Chart
         *
         */

        _this.PingData = new google.visualization.DataTable();
        _this.PingData.addColumn('date', 'Time');
        _this.PingData.addColumn('number', 'Time');
        const PIArray = [];
        for (let i = 0; i < _this.FinishedSpeedTests.length; i++) {
            PIArray.push([moment(_this.FinishedSpeedTests[i].createdAt).toDate(), _this.FinishedSpeedTests[i].ping]);
        }
        _this.PingData.addRows(PIArray);

        /**
         *
         * Last Download Gauge
         * Last Upload Gauge
         * Last Ping Gauge
         *
         */

        _this.LastDownloadGaugeData = google.visualization.arrayToDataTable([
            ['Label', 'Value'],
            ['Download', _this.FinishedSpeedTests.length > 0 ? parseFloat((_this.FinishedSpeedTests[_this.FinishedSpeedTests.length - 1].downloadBytes / (1000 * 1000)).toFixed(2)) : 0]
        ]);
        for (let i = 5; i < Number.MAX_SAFE_INTEGER; i + 5){
            if (_this.FinishedSpeedTests.length > 0 ? parseFloat((_this.FinishedSpeedTests[_this.FinishedSpeedTests.length - 1].downloadBytes / (1000 * 1000)).toFixed(2)) : 0 < i){
                _this.LastDownloadGaugeMax = i;
                break;
            }
        }
        if (!_this.LastDownloadGaugeMax){
            _this.LastDownloadGaugeMax = Number.MAX_SAFE_INTEGER;
        }

        _this.LastUploadGaugeData = google.visualization.arrayToDataTable([
            ['Label', 'Value'],
            ['Upload', _this.FinishedSpeedTests.length > 0 ? parseFloat((_this.FinishedSpeedTests[_this.FinishedSpeedTests.length - 1].uploadBytes / (1000 * 1000)).toFixed(2)) : 0]
        ]);
        for (let i = 5; i < Number.MAX_SAFE_INTEGER; i + 5){
            if (_this.FinishedSpeedTests.length > 0 ? parseFloat((_this.FinishedSpeedTests[_this.FinishedSpeedTests.length - 1].uploadBytes / (1000 * 1000)).toFixed(2)) : 0 < i){
                _this.LastUploadGaugeMax = i;
                break;
            }
        }
        if (!_this.LastUploadGaugeMax){
            _this.LastUploadGaugeMax = Number.MAX_SAFE_INTEGER;
        }

        _this.LastPingGaugeData = google.visualization.arrayToDataTable([
            ['Label', 'Value'],
            ['Ping', _this.FinishedSpeedTests.length > 0 ? _this.FinishedSpeedTests[_this.FinishedSpeedTests.length - 1].ping : -1]
        ]);
        for (let i = 100; i < Number.MAX_SAFE_INTEGER; i + 5){
            if (_this.FinishedSpeedTests.length > 0 ? _this.FinishedSpeedTests[_this.FinishedSpeedTests.length - 1].ping : -1 < i){
                _this.LastPingGaugeMax = i;
                break;
            }
        }
        if (!_this.LastPingGaugeMax){
            _this.LastPingGaugeMax = Number.MAX_SAFE_INTEGER;
        }

        /**
         *
         * LastDate
         *
         */

        _this.LastDate = moment(_this.FinishedSpeedTests.length > 0 ? _this.FinishedSpeedTests[_this.FinishedSpeedTests.length - 1].createdAt : 0).format("dd Do MMM kk:mm");
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

app.controller('home', function ($scope, Socket, $rootScope, $state, $window, mdcDateTimeDialog) {
    if (!Socket.Data) {
        $state.go('loading');
        return;
    }
    $scope.safeApply = function (fn) {
        var phase = this.$root.$$phase;
        if (phase == '$apply' || phase == '$digest') {
            if (fn && (typeof(fn) === 'function')) {
                fn();
            }
        } else {
            this.$apply(fn);
        }
    };
    $window.onresize = function () {
        if ($scope.rsto){
            clearTimeout($scope.rsto);
        }
        const windowHeight = window.innerHeight,windowWidth  = window.innerWidth;
        $scope.rsto = setTimeout(function () {
            const newwindowHeight = window.innerHeight,newwindowWidth  = window.innerWidth;
            if (windowHeight == newwindowHeight && windowWidth == newwindowWidth){
                console.log("Redraw!");
                $scope.drawCharts();
            } else {
                console.log("Not the same");
            }
        }, 1000);
        //$scope.drawCharts();
    };

    $scope.DisplayTime = function (what) {
        mdcDateTimeDialog.show({
            time: true
        }).then(date => {
            Socket[what] = date;
            Socket.makeChartData();
            Socket.updateChart();
        }).catch(() => {
            Socket[what] = null;
            Socket.makeChartData();
            Socket.updateChart();
        });
    };

    $rootScope.$on('updateChart', () => {
        $scope.drawCharts();
    });

    const DLChart = new google.charts.Line(document.getElementById('DLChart'));
    const UPChart = new google.charts.Line(document.getElementById('UPChart'));
    const PIChart = new google.charts.Line(document.getElementById('PIChart'));
    const LastDownloadGauge = new google.visualization.Gauge(document.getElementById('LastDownloadGauge'));
    const LastUploadGauge = new google.visualization.Gauge(document.getElementById('LastUploadGauge'));
    const LastPingGauge = new google.visualization.Gauge(document.getElementById('LastPingGauge'));

    $scope.drawCharts = function () {
        $scope.safeApply(() => {
            $scope.LastDate = Socket.LastDate;
            DLChart.draw(Socket.DownloadData, google.charts.Line.convertOptions({
                chart: {
                    title: 'Download',
                    subtitle: 'in MB/s'
                },
                chartArea: {
                    backgroundColor: "transparent"
                },
                animation: {
                    duration: 1000,
                    startup: true
                },
                legend: {
                    position: "none"
                },
                backgroundColor: "transparent",
                curveType: 'function',
                explorer: {
                    actions: ['dragToZoom', 'rightClickToReset'],
                    maxZoomIn: 10
                }
            }));
            UPChart.draw(Socket.UploadData, google.charts.Line.convertOptions({
                chart: {
                    title: 'Upload',
                    subtitle: 'in MB/s'
                },
                chartArea: {
                    backgroundColor: "transparent"
                },
                animation: {
                    duration: 1000,
                    startup: true
                },
                legend: {
                    position: "none"
                },
                backgroundColor: "transparent",
                curveType: 'function',
                explorer: {
                    actions: ['dragToZoom', 'rightClickToReset'],
                    maxZoomIn: 10
                }
            }));
            PIChart.draw(Socket.PingData, google.charts.Line.convertOptions({
                chart: {
                    title: 'Ping',
                    subtitle: 'in ms'
                },
                chartArea: {
                    backgroundColor: "transparent"
                },
                animation: {
                    duration: 1000,
                    startup: true
                },
                legend: {
                    position: "none"
                },
                backgroundColor: "transparent",
                curveType: 'function',
                explorer: {
                    actions: ['dragToZoom', 'rightClickToReset'],
                    maxZoomIn: 10
                }
            }));
            LastDownloadGauge.draw(Socket.LastDownloadGaugeData, {max: Socket.LastDownloadGaugeMax});
            LastUploadGauge.draw(Socket.LastUploadGaugeData, {max: Socket.LastUploadGaugeMax});
            LastPingGauge.draw(Socket.LastPingGaugeData, {max: Socket.LastPingGaugeMax});
            $scope.safeApply();
        });
    };


    $scope.drawCharts();

    $scope.openMenu = function ($mdMenu, ev) {
        $mdMenu.open(ev);
    };
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

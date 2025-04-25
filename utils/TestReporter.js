import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { Trend, Rate, Counter } from 'k6/metrics';

export class TestReporter {
    constructor() {
        this.metrics = {
            navigationTime: new Trend('navigation_time'),
            loginTime: new Trend('login_time'),
            pageLoadTime: new Trend('page_load_time'),
            errorRate: new Rate('errors'),
            requestCount: new Counter('requests'),
            successRate: new Rate('successful_requests')
        };
    }

    addNavigationTime(time) {
        this.metrics.navigationTime.add(time);
    }

    addLoginTime(time) {
        this.metrics.loginTime.add(time);
    }

    addPageLoadTime(time) {
        this.metrics.pageLoadTime.add(time);
    }

    incrementRequestCount() {
        this.metrics.requestCount.add(1);
    }

    addSuccess() {
        this.metrics.successRate.add(true);
    }

    addError() {
        this.metrics.errorRate.add(true);
        this.metrics.successRate.add(false);
    }

    generateReport(data) {
        return {
            "./reports/test-report.html": htmlReport(data),
            "./reports/summary.json": JSON.stringify(data, null, 2)
        };
    }

    getMetrics() {
        return this.metrics;
    }

    static formatDuration(ms) {
        if (ms < 1000) return `${ms}ms`;
        const seconds = Math.floor(ms / 1000);
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        return `${minutes}m ${seconds % 60}s`;
    }
} 
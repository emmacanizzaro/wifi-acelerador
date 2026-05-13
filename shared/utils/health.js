"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeHealthStatus = computeHealthStatus;
exports.computeHealthScore = computeHealthScore;
function computeHealthStatus(score) {
    if (score >= 85)
        return 'excellent';
    if (score >= 70)
        return 'good';
    if (score >= 45)
        return 'warning';
    return 'critical';
}
function computeHealthScore(metrics) {
    const pingPenalty = Math.min(metrics.pingMs * 0.8, 35);
    const jitterPenalty = Math.min(metrics.jitterMs * 1.1, 20);
    const crowdPenalty = Math.max(0, metrics.connectedDevices - 10) * 1.6;
    const throughputReward = Math.min((metrics.downloadMbps + metrics.uploadMbps) * 0.2, 25);
    const raw = 78 - pingPenalty - jitterPenalty - crowdPenalty + throughputReward;
    return Math.max(1, Math.min(100, Math.round(raw)));
}

import { Module, Global } from '@nestjs/common';
import { PrometheusModule, makeCounterProvider, makeHistogramProvider, makeGaugeProvider } from '@willsoto/nestjs-prometheus';

const customMetricsProviders = [
  makeCounterProvider({
    name: 'bizsaathi_invoices_created_total',
    help: 'Total number of invoices generated',
    labelNames: ['status', 'tenant_id'],
  }),
  makeCounterProvider({
    name: 'bizsaathi_revenue_collected_total',
    help: 'Total revenue collected in minor units',
    labelNames: ['currency', 'tenant_id'],
  }),
  makeHistogramProvider({
    name: 'bizsaathi_ai_latency_seconds',
    help: 'Latency of AI assistant queries in seconds',
    labelNames: ['action'],
    buckets: [0.1, 0.3, 0.5, 1, 2, 5, 10, 30],
  }),
  makeGaugeProvider({
    name: 'bizsaathi_active_websocket_connections',
    help: 'Number of currently active WebSocket connections in this instance',
  }),
];

@Global()
@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
      },
    }),
  ],
  providers: [...customMetricsProviders],
  exports: [PrometheusModule, ...customMetricsProviders],
})
export class MetricsModule {}

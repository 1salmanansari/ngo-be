import autocannon from 'autocannon';
import app from '../dist/app.js';
import { connectDB } from '../dist/config/db.js';
import mongoose from 'mongoose';
import http from 'http';

const PORT = 8002;

async function runLoadBenchmark() {
  console.log('====================================================');
  console.log(' Starting High-Throughput Load Benchmark (100+ req/s)');
  console.log('====================================================');

  await connectDB();
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(PORT, '127.0.0.1', resolve));

  const url = `http://127.0.0.1:${PORT}/api/v1/health`;
  console.log(`Targeting URL: ${url}`);

  try {
    const result = await autocannon({
      url,
      connections: 50,
      duration: 5,
      pipelining: 1,
    });

    console.log(autocannon.printResult(result));

    console.log(`----------------------------------------------------`);
    console.log(`Average Requests Per Second: ${result.requests.average}`);
    console.log(`Average Latency:             ${result.latency.average} ms`);
    console.log(`2.5% Latency:                ${result.latency.p2_5} ms`);
    console.log(`97.5% Latency:               ${result.latency.p97_5} ms`);
    console.log(`Total Requests Handled:      ${result.requests.total}`);
    console.log(`----------------------------------------------------`);

    if (result.requests.average >= 100) {
      console.log(`\n>>> SUCCESS: System handled ${Math.round(result.requests.average)} req/sec (Target: 100 req/sec) <<<\n`);
    } else {
      console.warn(`\nWarning: Throughput was ${result.requests.average} req/sec`);
    }
  } finally {
    server.close();
    await mongoose.connection.close();
  }
}

runLoadBenchmark().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});

// measure-performance.js
import axios from "axios";
async function measureREST() {
  console.log("📊 Measuring REST response...");
  const start = Date.now();
  const response = await axios.get("http://localhost:5000/api/posts");
  const end = Date.now();

  const dataSize = JSON.stringify(response.data).length;
  const responseTime = end - start;

  console.log(
    `REST - Size: ${dataSize} bytes (${(dataSize / 1024).toFixed(2)} KB)`,
  );
  console.log(`REST - Time: ${responseTime}ms`);

  return { size: dataSize, time: responseTime };
}

async function measureGraphQL() {
  console.log("📊 Measuring GraphQL response...");
  const query = `
    query {
      getFeed(userId: "16") {
        post_id
        content
        total_likes
        username
        created_at
      }
    }
  `;

  const start = Date.now();
  const response = await axios.post("http://localhost:5000/api/graphql", {
    query,
  });
  const end = Date.now();

  const dataSize = JSON.stringify(response.data).length;
  const responseTime = end - start;

  console.log(
    `GraphQL - Size: ${dataSize} bytes (${(dataSize / 1024).toFixed(2)} KB)`,
  );
  console.log(`GraphQL - Time: ${responseTime}ms`);

  return { size: dataSize, time: responseTime };
}

async function measureGraphQLMinimal() {
  console.log("📊 Measuring GraphQL (minimal fields)...");
  const query = `
    query {
      getFeed(userId: "16") {
        content
        total_likes
      }
    }
  `;

  const start = Date.now();
  const response = await axios.post("http://localhost:5000/api/graphql", {
    query,
  });
  const end = Date.now();

  const dataSize = JSON.stringify(response.data).length;
  const responseTime = end - start;

  console.log(
    `GraphQL Minimal - Size: ${dataSize} bytes (${(dataSize / 1024).toFixed(2)} KB)`,
  );
  console.log(`GraphQL Minimal - Time: ${responseTime}ms`);

  return { size: dataSize, time: responseTime };
}

async function runBenchmark() {
  console.log("🚀 Starting API Performance Benchmark\n");

  const rest = await measureREST();
  console.log("");
  const graphql = await measureGraphQL();
  console.log("");
  const graphqlMinimal = await measureGraphQLMinimal();

  console.log("\n📈 RESULTS:");
  console.log("=".repeat(50));

  const sizeReduction = (
    ((rest.size - graphql.size) / rest.size) *
    100
  ).toFixed(1);
  const timeReduction = (
    ((rest.time - graphql.time) / rest.time) *
    100
  ).toFixed(1);
  const minSizeReduction = (
    ((rest.size - graphqlMinimal.size) / rest.size) *
    100
  ).toFixed(1);

  console.log(`Size reduction (standard query): ${sizeReduction}%`);
  console.log(`Time reduction: ${timeReduction}%`);
  console.log(`Size reduction (minimal query): ${minSizeReduction}%`);

  console.log("\n💡 Usage in CV:");
  console.log(
    `"Implemented GraphQL API reducing response size by ${sizeReduction}% compared to REST"`,
  );
}

runBenchmark().catch(console.error);

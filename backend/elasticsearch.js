// elasticsearch.js
import { Client } from "@elastic/elasticsearch";

// Use API key OR username/password (choose one)
const client = new Client({
  node: "https://my-elasticsearch-project-aa83ed.es.us-central1.gcp.elastic.cloud:443",
  auth: {
    apiKey: "NDV1RlRKa0JWam40dEtUMkdhQkw6Qk1IcXpnYXVLeVlKUXkyVHN3VVAwUQ==", // paste the one you showed me

  },
});

export default client;

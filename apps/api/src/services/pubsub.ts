import { RedisPubSub } from "graphql-redis-subscriptions";
import { env } from "../env.js";

// Create Redis PubSub instance for GraphQL subscriptions
export const pubsub = new RedisPubSub({
  connection: {
    host: env.REDIS_HOST || "localhost",
    port: env.REDIS_PORT || 6380,
  },
});

// Event types
export const CELL_UPDATED = "CELL_UPDATED";
export const PROJECT_UPDATED = "PROJECT_UPDATED";

// Helper to publish cell updates
export function publishCellUpdate(projectId: string, cell: any) {
  const topic = `${CELL_UPDATED}_${projectId}`;
  const payload = {
    cellUpdated: cell,
  };
  pubsub.publish(topic, payload);
}

// Helper to publish project updates
export function publishProjectUpdate(project: any) {
  pubsub.publish(`${PROJECT_UPDATED}_${project.id}`, {
    projectUpdated: project,
  });
}

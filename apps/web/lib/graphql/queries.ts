import { gql } from "@apollo/client/core";

export const GET_PROJECTS = gql`
  query GetProjects {
    projects {
      id
      name
      description
      updatedAt
    }
  }
`;

export const GET_PROJECT = gql`
  query GetProject($id: ID!) {
    project(id: $id) {
      id
      name
      description
      autoExecute
      cells {
        id
        type
        code
        outputs {
          type
          data
        }
        order
        reads
        writes
        executionState
        lastExecutedAt
      }
    }
  }
`;

export const CELL_UPDATED_SUBSCRIPTION = gql`
  subscription CellUpdated($projectId: ID!) {
    cellUpdated(projectId: $projectId) {
      id
      type
      code
      outputs {
        type
        data
      }
      order
      reads
      writes
      executionState
      lastExecutedAt
      queuedAt
      executionDuration
    }
  }
`;
